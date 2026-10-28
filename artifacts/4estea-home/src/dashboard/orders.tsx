import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { actions, clock, getState, isToday, money2, orderTotal, useStore, type Order } from '@/lib/store';
import { CountUp, Drawer, DrawnCheck, Stamp, ease, glide, rise, spring, sway, useMedia, useToast } from './ui';
import WeekBoard from './week';

type Zoom = 'day' | 'week';
// Remembered while switching tabs.
let lastZoom: Zoom = 'day';

/* ---------- motion bookkeeping ---------- */

// A ticket moving from rail to counter vanishes from the rail instantly;
// its twin on the counter flies in from the same spot.
const moving = new Map<string, number>();
const isMoving = (id: string) => Date.now() - (moving.get(id) ?? 0) < 900;
// Where a picked-up ticket should be thrown (the spike).
const tossTo = new Map<string, { x: number; y: number }>();
// Test orders swing in from the side.
const fresh = new Set<string>();

export function sendTestOrder() {
  const id = actions.testOrder();
  if (id) fresh.add(id);
  return id;
}

export function useNow(every = 15_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T) => refs.forEach((r) => {
    if (typeof r === 'function') r(node);
    else if (r) (r as { current: T | null }).current = node;
  });
}

const RAIL_TILT = [-1.4, 1.1, -0.5, 1.6, -1.1, 0.6];
const COUNTER_TILT = [-2.6, 1.8, -1.2, 2.4, -0.6, 1.4];

function partOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/* ---------- view ---------- */

export default function OrdersView() {
  const allOrders = useStore((s) => s.orders);
  const orders = useMemo(() => allOrders.filter((o) => isToday(o.pickupAt)), [allOrders]);
  const open = useStore((s) => s.open);
  const now = useNow();
  const toast = useToast();
  const spikeRef = useRef<HTMLButtonElement>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [zoom, setZoomState] = useState<Zoom>(lastZoom);
  const phone = useMedia('(max-width: 760px)');
  const setZoom = (z: Zoom) => { lastZoom = z; setZoomState(z); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  // Zoom toward today's column in the week grid (a row on phones).
  const col = ((new Date().getDay() + 6) % 7 + 0.5) / 7 * 100;
  const origin = phone ? `50% ${col}%` : `${col}% 0%`;

  const making = useMemo(() => orders.filter((o) => o.status === 'new').sort((a, b) => a.pickupAt - b.pickupAt), [orders]);
  const ready = useMemo(() => orders.filter((o) => o.status === 'ready').sort((a, b) => a.pickupAt - b.pickupAt), [orders]);
  const done = useMemo(() => orders.filter((o) => o.status === 'done').sort((a, b) => b.pickupAt - a.pickupAt), [orders]);
  const booked = useMemo(() => orders.reduce((s, o) => s + orderTotal(o), 0), [orders]);
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const markReady = (o: Order) => {
    moving.set(o.id, Date.now());
    actions.setStatus(o.id, 'ready');
  };

  const pickedUp = (o: Order, from: HTMLElement | null) => {
    const spike = spikeRef.current?.getBoundingClientRect();
    const box = from?.getBoundingClientRect();
    if (spike && box) {
      tossTo.set(o.id, {
        x: spike.left + spike.width / 2 - (box.left + box.width / 2),
        y: spike.top + spike.height * 0.35 - (box.top + box.height / 2),
      });
    }
    actions.setStatus(o.id, 'done');
    toast({ text: <><b>{o.name}</b> picked up</>, action: { label: 'Undo', run: () => actions.setStatus(o.id, 'ready') } });
  };

  const test = () => {
    const id = sendTestOrder();
    const o = getState().orders.find((x) => x.id === id);
    toast({ text: o ? <>New order from <b>{o.name}</b>, pickup {clock(o.pickupAt)}</> : 'Everything is sold out, so no test order.' });
  };

  return (
    <LayoutGroup>
      <motion.div className="d-page-head" variants={rise}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={zoom} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease }}>
            {zoom === 'day' ? (
              <>
                <h1>{weekday} <em>{partOfDay()}</em></h1>
                <p className="d-page-sub">
                  <b><CountUp value={making.length} format={(n) => String(Math.round(n))} duration={0.5} /></b> making,{' '}
                  <b><CountUp value={ready.length} format={(n) => String(Math.round(n))} duration={0.5} /></b> on the counter,{' '}
                  <b><CountUp value={done.length} format={(n) => String(Math.round(n))} duration={0.8} /></b> picked up.{' '}
                  <b><CountUp value={booked} format={(n) => `$${n.toFixed(2)}`} duration={1} /></b> booked today.
                </p>
              </>
            ) : (
              <>
                <h1>The <em>week</em></h1>
                <p className="d-page-sub">Tap a day for its prep list. Tap today to zoom back into the rail.</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="d-head-actions">
          <div className="d-zoom" role="tablist" aria-label="Zoom">
            {(['day', 'week'] as Zoom[]).map((z) => (
              <button key={z} type="button" role="tab" aria-selected={zoom === z} className={zoom === z ? 'active' : ''} onClick={() => setZoom(z)}>
                {zoom === z && <motion.span className="d-filter-pill" layoutId="zoom-pill" transition={spring} />}
                <span>{z === 'day' ? 'Today' : 'Week'}</span>
              </button>
            ))}
          </div>
          <motion.button type="button" className="d-btn-primary" onClick={test} whileTap={{ scale: 0.95 }}>
            <Plus size={17} strokeWidth={2.5} /> Send a test order
          </motion.button>
        </div>
      </motion.div>

      <div className="d-zoom-stage">
        <AnimatePresence mode="popLayout" initial={false}>
          {zoom === 'day' ? (
            <motion.div
              key="day"
              className="d-zoom-layer"
              style={{ transformOrigin: origin }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ scale: { duration: 0.6, ease }, opacity: { duration: 0.35 } }}
            >
          <section className="d-rail-section" aria-label="Orders being made">
            <div className="d-label"><span>On the rail</span><small>{making.length === 0 ? 'nothing to make' : `${making.length} to make`}</small></div>
            <div className={`d-rail ${making.length === 0 && open ? 'is-empty' : ''}`}>
              <AnimatePresence mode="popLayout" initial={false}>
                {!open && <ClosedSign key="closed-sign" />}
                {making.map((o, i) => (
                  <Ticket key={o.id} order={o} now={now} tilt={RAIL_TILT[(o.number + i) % RAIL_TILT.length]} onAction={() => markReady(o)} />
                ))}
                {making.length === 0 && open && (
                  <motion.p key="empty" className="d-rail-empty" layout initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                    Rail is clear. Nice work.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="d-counter-section" aria-label="Orders ready for pickup">
            <div className="d-label"><span>On the counter</span><small>{ready.length === 0 ? 'nothing waiting' : `${ready.length} waiting for pickup`}</small></div>
            <div className="d-counter">
              <div className="d-counter-tickets">
                <AnimatePresence mode="popLayout" initial={false}>
                  {ready.map((o, i) => (
                    <Ticket key={o.id} order={o} now={now} tilt={COUNTER_TILT[(o.number + i) % COUNTER_TILT.length]} onAction={(el) => pickedUp(o, el)} />
                  ))}
                  {ready.length === 0 && (
                    <motion.p key="empty" className="d-counter-empty" layout initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                      Nothing waiting on the counter.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <Spike ref={spikeRef} count={done.length} total={done.reduce((s, o) => s + orderTotal(o), 0)} onOpen={() => setLogOpen(true)} />
            </div>
          </section>
            </motion.div>
          ) : (
            <motion.div
              key="week"
              className="d-zoom-layer"
              style={{ transformOrigin: origin }}
              initial={{ opacity: 0, scale: 1.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ scale: { duration: 0.6, ease }, opacity: { duration: 0.35 } }}
            >
              <WeekBoard onZoomToday={() => setZoom('day')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Drawer open={logOpen} onClose={() => setLogOpen(false)} title={<>Picked up <em>today</em></>}>
        <ul className="d-log">
          <AnimatePresence initial={false}>
            {done.map((o) => (
              <motion.li key={o.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease }}>
                <div className="d-log-row">
                  <span className="d-log-time">{clock(o.pickupAt)}</span>
                  <div>
                    <strong>{o.name}</strong>
                    <span>{o.lines.map((l) => `${l.qty} ${l.name}`).join(', ')}</span>
                  </div>
                  <span className="d-log-total">{money2(orderTotal(o))}</span>
                  <button type="button" onClick={() => actions.setStatus(o.id, 'ready')}>Undo</button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {done.length === 0 && <li className="d-log-empty">Nothing picked up yet today.</li>}
        </ul>
      </Drawer>
    </LayoutGroup>
  );
}

/* ---------- ticket ---------- */

function due(o: Order, now: number) {
  const mins = Math.round((o.pickupAt - now) / 60_000);
  if (o.status === 'ready') return mins < 0 ? { text: `waiting ${-mins} min`, tone: 'wait' } : { text: `pickup in ${mins} min`, tone: 'calm' };
  if (mins < 0) return { text: `${-mins} min late`, tone: 'late' };
  if (mins === 0) return { text: 'due now', tone: 'soon' };
  return { text: `in ${mins} min`, tone: mins <= 10 ? 'soon' : 'calm' };
}

type TicketProps = { order: Order; now: number; tilt: number; onAction: (el: HTMLElement | null) => void };

const Ticket = forwardRef<HTMLDivElement, TicketProps>(function Ticket({ order, now, tilt, onAction }, ref) {
  const slot = useRef<HTMLDivElement>(null);
  const [entering] = useState(() => !isMoving(order.id));
  const [isNew] = useState(() => fresh.delete(order.id));
  const [busy, setBusy] = useState(false);
  const isReady = order.status === 'ready';
  const d = due(order, now);
  const [hm, ap] = clock(order.pickupAt).split(' ');

  const press = useCallback(() => {
    if (busy) return;
    setBusy(true);
    // Let the stamp or the check land before the ticket moves.
    setTimeout(() => onAction(slot.current), isReady ? 380 : 620);
  }, [busy, isReady, onAction]);

  const initial = !entering ? false : isNew ? { opacity: 0, x: 180, rotate: 16 } : { opacity: 0, y: -16 };

  return (
    <motion.div
      ref={mergeRefs(ref, slot)}
      className={`d-slot ${isReady ? 'd-slot--counter' : 'd-slot--rail'}`}
      layout="position"
      variants={{
        gone: () => {
          if (isMoving(order.id)) return { opacity: 0, transition: { duration: 0 } };
          // Framer may resolve this more than once, so the target is cleared later, not here.
          const t = tossTo.get(order.id);
          if (t) setTimeout(() => tossTo.delete(order.id), 1500);
          return t
            ? { x: t.x, y: t.y, scale: 0.16, rotate: 32, zIndex: 20, opacity: [1, 1, 0], transition: { duration: 0.6, ease: [0.55, 0, 0.8, 0.4], opacity: { times: [0, 0.75, 1], duration: 0.6 } } }
            : { opacity: 0, scale: 0.92, transition: { duration: 0.25 } };
        },
      }}
      exit="gone"
    >
      <motion.article
        layoutId={`ticket-${order.id}`}
        className={`d-ticket ${isReady ? 'is-ready' : ''} ${d.tone === 'late' ? 'is-late' : ''} ${isNew ? 'is-new' : ''}`}
        style={{ originX: 0.5, originY: 0 }}
        initial={initial}
        animate={{ opacity: 1, x: 0, y: 0, rotate: tilt }}
        transition={{ layout: glide, rotate: sway, x: { type: 'spring', stiffness: 170, damping: 20 }, y: glide, opacity: { duration: 0.3 } }}
      >
        {!isReady && <span className="d-clip" aria-hidden="true" />}
        <div className="d-ticket-paper">
          <div className="d-ticket-top">
            <span className="d-ticket-no">#{order.number}</span>
            <span className={`d-due d-due--${d.tone}`}>{d.text}</span>
          </div>
          <div className="d-ticket-time">{hm}<small>{ap}</small></div>
          <div className="d-ticket-name">{order.name}</div>
          <ul className="d-ticket-items">
            {order.lines.map((l, i) => (
              <li key={i}><b>{l.qty}</b><span>{l.name}</span></li>
            ))}
          </ul>
          {order.note && <p className="d-ticket-note">{order.note}</p>}
          <div className="d-ticket-total"><span>Total</span><b>{money2(orderTotal(order))}</b></div>
          {(isReady || (busy && !isReady)) && <Stamp label="Ready" tone="leaf" rotate={-14} animateIn={!isReady} />}
          {isNew && <motion.span className="d-new-tag" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 1, 0], scale: 1 }} transition={{ duration: 4.2, times: [0, 0.06, 0.85, 1] }}>new!</motion.span>}
        </div>
        <button type="button" className={`d-stub ${isReady ? 'd-stub--warm' : ''}`} onClick={press} aria-label={isReady ? `${order.name} picked up` : `Mark ${order.name} ready`}>
          <AnimatePresence mode="wait" initial={false}>
            {busy && isReady ? (
              <motion.span key="ok" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.16 }}><DrawnCheck size={20} /></motion.span>
            ) : (
              <motion.span key="label" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
                {isReady ? 'Picked up' : busy ? 'Ready' : 'Mark ready'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.article>
    </motion.div>
  );
});

/* ---------- closed sign and spike ---------- */

const ClosedSign = forwardRef<HTMLDivElement>(function ClosedSign(_, ref) {
  return (
    <motion.div ref={ref} className="d-slot d-slot--rail" layout="position" exit={{ opacity: 0, y: -20, transition: { duration: 0.25 } }}>
      <motion.div
        className="d-closed-sign"
        style={{ originX: 0.5, originY: 0 }}
        initial={{ rotate: 22, y: -30, opacity: 0 }}
        animate={{ rotate: -2, y: 0, opacity: 1 }}
        transition={{ rotate: { type: 'spring', stiffness: 90, damping: 6 }, y: glide, opacity: { duration: 0.2 } }}
      >
        <span className="d-clip" aria-hidden="true" />
        <strong>Closed today</strong>
        <span>Your website says so, and online orders are paused.</span>
      </motion.div>
    </motion.div>
  );
});

function useLagged(value: number, delay: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (value <= v) { setV(value); return; }
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return v;
}

const Spike = forwardRef<HTMLButtonElement, { count: number; total: number; onOpen: () => void }>(function Spike({ count, total, onOpen }, ref) {
  // The count bumps when the thrown ticket lands, not when the button is pressed.
  const shown = useLagged(count, 520);
  const stack = Math.min(shown, 7);
  return (
    <motion.button ref={ref} type="button" className="d-spike" onClick={onOpen} whileTap={{ scale: 0.97 }} aria-label={`${count} picked up today. Open the list.`}>
      <span className="d-spike-art" aria-hidden="true">
        <span className="d-spike-rod" />
        {Array.from({ length: stack }).map((_, i) => (
          <motion.span
            key={i}
            className="d-spike-slip"
            style={{ bottom: 10 + i * 7, rotate: (i % 2 ? 1 : -1) * (6 + (i * 13) % 11) }}
            initial={i === stack - 1 ? { y: -40, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          />
        ))}
        <span className="d-spike-base" />
      </span>
      <motion.strong key={shown} initial={{ scale: 1.35, color: '#d77b2d' }} animate={{ scale: 1, color: '#1e2618' }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
        {shown}
      </motion.strong>
      <span className="d-spike-label">picked up</span>
      <span className="d-spike-total">{money2(total)}</span>
      <span className="d-spike-link">See the list</span>
    </motion.button>
  );
});
