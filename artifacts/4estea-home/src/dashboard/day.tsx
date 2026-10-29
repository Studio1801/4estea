import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import {
  addDays, clock, daySummary, money2, orderTotal, photoFor, sameDay, startOfDay, useStore, weekStart,
  type Order,
} from '@/lib/store';
import { CountUp, ease, glide, spring } from './ui';

export const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HOURS = ['10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p'];

// Short names so a whole order fits on one line.
export const shortName = (n: string) =>
  n.replace('Grilled ', '').replace(' Bowl', '').replace('Lumpiang Shanghai', 'Lumpia').replace('Garlic Fried Chicken ', '')
    .replace('Classic 4ESTEA Matcha', 'Classic Matcha').replace('Banana ', '');
export const summary = (o: Order) => o.lines.map((l) => `${l.qty} ${shortName(l.name)}`).join(', ');

const hourWord = (i: number) => HOURS[i].replace('a', ' am').replace('p', ' pm');

/* Range the demo keeps: three weeks back, one ahead. */
export const dayRange = () => {
  const mon = weekStart(Date.now());
  return { min: addDays(mon, -21), max: addDays(mon, 13) };
};

export function MiniBars({ values, big = false }: { values: number[]; big?: boolean }) {
  const max = Math.max(...values, 1);
  return (
    <div className={`d-minibars ${big ? 'd-minibars--big' : ''}`} aria-hidden={!big}>
      {values.map((v, i) => (
        <div key={i} className="d-minibar">
          {big && <span className="d-minibar-val">{v ? dollars(v) : ''}</span>}
          <div className="d-minibar-track">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: Math.max(v / max, 0.04) }}
              transition={{ type: 'spring', stiffness: 150, damping: 19, delay: 0.12 + i * 0.035 }}
              className={v === max ? 'peak' : ''}
            />
          </div>
          {big && <span className="d-minibar-label">{HOURS[i]}</span>}
        </div>
      ))}
    </div>
  );
}

export function BestThumb({ name, photo }: { name: string; photo?: string }) {
  return <span className="d-thumb">{photo ? <img src={photo} alt="" /> : <i>{name[0]}</i>}</span>;
}

/* ---------- data for one day ---------- */

function useDay(date: Date) {
  const stored = useStore((s) => s.orders);
  return useMemo(() => {
    const today = startOfDay(Date.now());
    const kind = sameDay(date, today) ? 'today' : date < today ? 'past' : 'future';
    if (kind === 'past') {
      const s = daySummary(date);
      return { kind, orders: s.list, sales: s.sales, hours: s.hours, top: s.top };
    }
    const orders = stored.filter((o) => sameDay(o.pickupAt, date)).sort((a, b) => a.pickupAt - b.pickupAt);
    return { kind, orders, sales: orders.reduce((n, o) => n + orderTotal(o), 0), hours: [] as number[], top: '' };
  }, [stored, date]);
}

/** Totals by dish, biggest first. */
function tally(orders: Order[]) {
  const m = new Map<string, number>();
  orders.forEach((o) => o.lines.forEach((l) => m.set(l.name, (m.get(l.name) ?? 0) + l.qty)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/* ---------- header text for the page ---------- */

export function DayHead({ date, onBack }: { date: Date; onBack: () => void }) {
  const d = useDay(date);
  const peak = d.hours.length ? d.hours.indexOf(Math.max(...d.hours)) : 0;
  return (
    <>
      <button type="button" className="d-backlink" onClick={onBack}>
        <ChevronLeft size={17} strokeWidth={2.4} /> The week
      </button>
      <h1>{date.toLocaleDateString('en-US', { weekday: 'long' })} <em>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</em></h1>
      <p className="d-page-sub">
        {d.kind === 'past' && <><b>{dollars(d.sales)}</b> from <b>{d.orders.length}</b> orders. Busiest around <b>{hourWord(peak)}</b>.</>}
        {d.kind === 'future' && (d.orders.length
          ? <><b>{d.orders.length}</b> {d.orders.length === 1 ? 'pre-order' : 'pre-orders'} booked, <b>{dollars(d.sales)}</b> so far.</>
          : 'Nothing booked yet. Pre-orders from your website will land here.')}
      </p>
    </>
  );
}

/* ---------- the zoomed-in day ---------- */

export default function DayDetail({ date, dir, onPick, onToday, onBack }: {
  date: Date; dir: number; onPick: (d: Date, dir: number) => void; onToday: () => void; onBack: () => void;
}) {
  const d = useDay(date);
  const menu = useStore((s) => s.menu);
  const [openId, setOpenId] = useState<string | null>(null);

  // Arrow keys step through the days, Escape zooms back out.
  useEffect(() => {
    const { min, max } = dayRange();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (e.key === 'Escape') onBack();
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = addDays(date, step);
      if (next < min || next > max) return;
      sameDay(next, Date.now()) ? onToday() : onPick(next, step);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [date, onBack, onPick, onToday]);

  useEffect(() => setOpenId(null), [date]);

  const prep = useMemo(() => tally(d.orders), [d.orders]);
  const avg = d.orders.length ? d.sales / d.orders.length : 0;
  const stats = d.kind === 'past'
    ? [
        { v: d.sales, f: dollars, l: 'Sales' },
        { v: d.orders.length, f: (n: number) => String(Math.round(n)), l: 'Orders' },
        { v: avg, f: money2, l: 'Average ticket' },
      ]
    : [
        { v: d.sales, f: dollars, l: 'Booked' },
        { v: d.orders.length, f: (n: number) => String(Math.round(n)), l: d.orders.length === 1 ? 'Pre-order' : 'Pre-orders' },
        { v: prep.reduce((n, [, q]) => n + q, 0), f: (n: number) => String(Math.round(n)), l: 'Items to prep' },
      ];

  return (
    <div className="d-focus">
      <Strip date={date} onPick={onPick} onToday={onToday} />

      <AnimatePresence mode="popLayout" custom={dir}>
        <motion.div
          key={date.getTime()}
          className="d-day-body"
          custom={dir}
          variants={{
            enter: (k: number) => ({ opacity: 0, x: k * 56 }),
            center: { opacity: 1, x: 0, transition: { x: glide, opacity: { duration: 0.3 }, staggerChildren: 0.07, delayChildren: 0.04 } },
            leave: (k: number) => ({ opacity: 0, x: k * -56, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }),
          }}
          initial="enter"
          animate="center"
          exit="leave"
        >
          <motion.div className="d-dstats" variants={rise}>
            {stats.map((s) => (
              <div key={s.l}>
                <b><CountUp value={s.v} format={s.f} duration={0.9} delay={0.1} /></b>
                <span>{s.l}</span>
              </div>
            ))}
          </motion.div>

          <div className="d-day-cols">
            <motion.section variants={rise} aria-label="Orders">
              <div className="d-label"><span>{d.kind === 'past' ? 'Picked up' : 'Pre-orders'}</span><small>{d.orders.length} {d.orders.length === 1 ? 'order' : 'orders'}</small></div>
              {d.orders.length === 0 ? (
                <p className="d-day-empty">Nothing booked for this day yet.</p>
              ) : (
                <ul className="d-ol">
                  {d.orders.map((o, i) => (
                    <OrderRow key={o.id} o={o} i={i} open={openId === o.id} onToggle={() => setOpenId(openId === o.id ? null : o.id)} />
                  ))}
                </ul>
              )}
            </motion.section>

            <motion.aside variants={rise} className="d-day-side">
              {d.kind === 'past' ? (
                <>
                  <div className="d-label"><span>Hour by hour</span></div>
                  <MiniBars values={d.hours} big />
                  <div className="d-label d-label--gap"><span>Sold most</span></div>
                  <ul className="d-top3">
                    {prep.slice(0, 3).map(([name, n], i) => (
                      <motion.li key={name} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease }}>
                        <BestThumb name={name} photo={photoFor(menu.find((m) => m.name === name))} />
                        <span>{name}</span>
                        <b>{n}</b>
                      </motion.li>
                    ))}
                  </ul>
                </>
              ) : d.orders.length > 0 ? (
                <>
                  <div className="d-label"><span>Prep list</span><small>all orders added up</small></div>
                  <ul className="d-prep">
                    {prep.map(([name, n], i) => (
                      <motion.li key={name} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06, duration: 0.5, ease }}>
                        <b>{n}</b><span>{name}</span>
                      </motion.li>
                    ))}
                  </ul>
                </>
              ) : null}
            </motion.aside>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const rise = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
  leave: { opacity: 0 },
};

/* Seven days of the week, with a pill that glides to the chosen one. */
function Strip({ date, onPick, onToday }: { date: Date; onPick: (d: Date, dir: number) => void; onToday: () => void }) {
  const mon = weekStart(date);
  const { min, max } = dayRange();
  return (
    <LayoutGroup id="daystrip">
      <nav className="d-dstrip" aria-label="Days of the week">
        {WD.map((w, i) => {
          const day = addDays(mon, i);
          const active = sameDay(day, date);
          const isToday = sameDay(day, Date.now());
          const off = day < min || day > max;
          return (
            <motion.button
              key={w}
              type="button"
              disabled={off}
              className={`${active ? 'active' : ''} ${isToday ? 'is-today' : ''}`}
              aria-current={active ? 'date' : undefined}
              onClick={() => (isToday ? onToday() : !active && onPick(day, day > date ? 1 : -1))}
              whileTap={{ scale: 0.94 }}
              transition={spring}
            >
              {active && <motion.span className="d-filter-pill" layoutId="day-pill" transition={spring} />}
              <small>{w}</small>
              <b>{day.getDate()}</b>
              {isToday && <i aria-hidden="true" />}
            </motion.button>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}

function OrderRow({ o, i, open, onToggle }: { o: Order; i: number; open: boolean; onToggle: () => void }) {
  return (
    <motion.li
      className={`d-orow ${open ? 'is-open' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + Math.min(i, 12) * 0.032, duration: 0.5, ease }}
    >
      <button type="button" className="d-orow-main" onClick={onToggle} aria-expanded={open}>
        <span className="d-orow-time">{clock(o.pickupAt)}</span>
        <span className="d-orow-who"><b>{o.name}</b><small>{summary(o)}</small></span>
        <span className="d-orow-total">{money2(orderTotal(o))}</span>
        <motion.span className="d-orow-chev" animate={{ rotate: open ? 180 : 0 }} transition={spring}><ChevronDown size={18} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="d-orow-more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.45, ease }, opacity: { duration: 0.28 } }}
          >
            <div className="d-orow-inner">
              <ul className="d-ticket-items">
                {o.lines.map((l, k) => (
                  <li key={k}><b>{l.qty}</b><span>{l.name}</span><em>{money2(l.qty * l.price)}</em></li>
                ))}
              </ul>
              {o.note && <p className="d-ticket-note">{o.note}</p>}
              <span className="d-orow-meta">Order {o.number}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
