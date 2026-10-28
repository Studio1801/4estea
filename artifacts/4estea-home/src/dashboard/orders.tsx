import { forwardRef, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { actions, clock, money2, orderTotal, useStore, type Order, type OrderStatus } from '@/lib/store';
import { DrawnCheck, ease, glide, rise, useToast } from './ui';

// Orders that are moving lanes keep their place on screen instead of
// fading in again; the new lane picks them up mid-flight.
const moving = new Map<string, number>();
const isMoving = (id: string) => Date.now() - (moving.get(id) ?? 0) < 900;

function move(id: string, status: OrderStatus) {
  moving.set(id, Date.now());
  actions.setStatus(id, status);
}

// Test orders get a short glow when they land.
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

export default function OrdersView() {
  const orders = useStore((s) => s.orders);
  const now = useNow();
  const toast = useToast();

  const making = useMemo(() => orders.filter((o) => o.status === 'new').sort((a, b) => a.pickupAt - b.pickupAt), [orders]);
  const ready = useMemo(() => orders.filter((o) => o.status === 'ready').sort((a, b) => a.pickupAt - b.pickupAt), [orders]);
  const done = useMemo(() => orders.filter((o) => o.status === 'done').sort((a, b) => b.pickupAt - a.pickupAt), [orders]);

  const markReady = (o: Order) => move(o.id, 'ready');
  const pickedUp = (o: Order) => {
    actions.setStatus(o.id, 'done');
    toast({
      text: <><b>{o.name}</b> picked up</>,
      action: { label: 'Undo', run: () => actions.setStatus(o.id, 'ready') },
    });
  };

  return (
    <LayoutGroup>
      <div className="d-lanes">
        <Lane title="To make" count={making.length} empty="All caught up.">
          {making.map((o) => (
            <OrderCard key={o.id} order={o} now={now} onDone={() => markReady(o)} />
          ))}
        </Lane>
        <Lane title="Ready for pickup" count={ready.length} empty="Nothing waiting on the counter." tone="ready">
          {ready.map((o) => (
            <OrderCard key={o.id} order={o} now={now} onDone={() => pickedUp(o)} />
          ))}
        </Lane>
      </div>

      <motion.section className="d-done" variants={rise} layout="position">
        <div className="d-section-head">
          <h2>Picked up today</h2>
          <span>{done.length === 0 ? 'None yet' : `${done.length} ${done.length === 1 ? 'order' : 'orders'}, ${money2(done.reduce((s, o) => s + orderTotal(o), 0))}`}</span>
        </div>
        <div className="d-done-list">
          <AnimatePresence initial={false}>
            {done.map((o) => (
              <motion.div
                key={o.id}
                className="d-done-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.45, ease }}
              >
                <div className="d-done-inner">
                  <span className="d-done-time">{clock(o.pickupAt)}</span>
                  <span className="d-done-name">{o.name}</span>
                  <span className="d-done-items">{o.lines.map((l) => `${l.qty} ${l.name}`).join(', ')}</span>
                  <span className="d-done-total">{money2(orderTotal(o))}</span>
                  <button type="button" onClick={() => actions.setStatus(o.id, 'ready')}>Undo</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.section>
    </LayoutGroup>
  );
}

function Lane({ title, count, empty, tone, children }: { title: string; count: number; empty: string; tone?: 'ready'; children: React.ReactNode[] }) {
  return (
    <motion.section className={`d-lane ${tone === 'ready' ? 'd-lane--ready' : ''}`} variants={rise}>
      <div className="d-section-head">
        <h2>{title}</h2>
        <motion.span key={count} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}>
          {count === 0 ? 'None' : `${count} ${count === 1 ? 'order' : 'orders'}`}
        </motion.span>
      </div>
      <div className="d-lane-body">
        <AnimatePresence mode="popLayout" initial={false}>
          {children}
          {count === 0 && (
            <motion.p
              key="empty"
              className="d-empty"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.25, duration: 0.4 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {empty}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function due(o: Order, now: number) {
  const mins = Math.round((o.pickupAt - now) / 60_000);
  if (o.status === 'ready') {
    return { text: mins < 0 ? `Waiting ${-mins} min` : 'On the counter', tone: 'ready', pct: 1 };
  }
  const pct = Math.min(1, Math.max(0.04, 1 - mins / 30));
  if (mins < 0) return { text: `${-mins} min late`, tone: 'late', pct: 1 };
  if (mins === 0) return { text: 'Due now', tone: 'soon', pct: 1 };
  return { text: `In ${mins} min`, tone: mins <= 10 ? 'soon' : 'later', pct };
}

type CardProps = { order: Order; now: number; onDone: () => void };

// Forwards its node so the lane can lift it out of the flow the instant it leaves.
const OrderCard = forwardRef<HTMLElement, CardProps>(function OrderCard({ order, now, onDone }, ref) {
  const [entering] = useState(() => !isMoving(order.id));
  const [isFresh] = useState(() => fresh.delete(order.id));
  const [confirming, setConfirming] = useState(false);
  const d = due(order, now);
  const isReady = order.status === 'ready';

  const press = () => {
    if (confirming) return;
    setConfirming(true);
    setTimeout(onDone, 420);
  };

  return (
    <motion.article
      ref={ref}
      layout
      layoutId={order.id}
      className={`d-order ${isReady ? 'is-ready' : ''} ${isFresh ? 'is-fresh' : ''}`}
      initial={entering ? { opacity: 0, y: -18, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      variants={{
        // Moving to the other lane: vanish here, the copy there flies in from this spot.
        gone: () => (isMoving(order.id)
          ? { opacity: 0, transition: { duration: 0 } }
          : { opacity: 0, scale: 0.94, filter: 'blur(3px)', transition: { duration: 0.32, ease } }),
      }}
      exit="gone"
      transition={glide}
    >
      <div className="d-order-top">
        <span className="d-order-time">{clock(order.pickupAt)}</span>
        <span className={`d-due ${d.tone}`}><i />{d.text}</span>
      </div>
      <div className={`d-timer ${d.tone}`} aria-hidden="true">
        <motion.span initial={false} animate={{ scaleX: d.pct }} transition={{ duration: 0.9, ease }} />
      </div>

      <h3>{order.name}<span>#{order.number}</span></h3>
      <ul>
        {order.lines.map((l, i) => (
          <li key={i}><b>{l.qty}×</b>{l.name}</li>
        ))}
      </ul>
      {order.note && <p className="d-note">{order.note}</p>}

      <div className="d-order-foot">
        <span className="d-total">{money2(orderTotal(order))}</span>
        <motion.button
          type="button"
          className={`d-btn ${isReady ? 'd-btn--warm' : ''} ${confirming ? 'is-confirming' : ''}`}
          onClick={press}
          whileTap={{ scale: 0.96 }}
          transition={spring}
        >
          <AnimatePresence mode="wait" initial={false}>
            {confirming ? (
              <motion.span key="ok" className="d-btn-icon" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                <DrawnCheck />
              </motion.span>
            ) : (
              <motion.span key="label" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                {isReady ? 'Picked up' : 'Mark ready'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.article>
  );
});

const spring = { type: 'spring' as const, stiffness: 600, damping: 30 };
