import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import {
  addDays, clock, daySummary, orderTotal, photoFor, sameDay, startOfDay, useStore, weekStart,
  type Order,
} from '@/lib/store';
import { ease, glide } from './ui';
import { BestThumb, MiniBars, WD, dollars, shortName, summary } from './day';

// The week being looked at survives zooming into a day and back out.
let lastOffset = 0;
export const weekOffsetOf = (d: Date) => Math.round((weekStart(d).getTime() - weekStart(Date.now()).getTime()) / (7 * 864e5));
export const rememberWeek = (d: Date) => { lastOffset = weekOffsetOf(d); };
export const resetWeek = () => { lastOffset = 0; };

type Kind = 'past' | 'today' | 'future';

export default function WeekBoard({ onZoomToday, onOpenDay }: { onZoomToday: () => void; onOpenDay: (d: Date) => void }) {
  const orders = useStore((s) => s.orders);
  const menu = useStore((s) => s.menu);
  const [offset, setOffset] = useState(lastOffset);
  const [dir, setDir] = useState(0);

  const today = startOfDay(Date.now());
  const monday = addDays(weekStart(today), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const cells = useMemo(() => days.map((date) => {
    const kind: Kind = sameDay(date, today) ? 'today' : date < today ? 'past' : 'future';
    const dayOrders = orders.filter((o) => sameDay(o.pickupAt, date)).sort((a, b) => a.pickupAt - b.pickupAt);
    if (kind === 'past') {
      const s = daySummary(date);
      return { date, kind, sales: s.sales, count: s.orders, hours: s.hours, top: s.top, orders: [] as Order[] };
    }
    return {
      date, kind,
      sales: dayOrders.reduce((s, o) => s + orderTotal(o), 0),
      count: dayOrders.length,
      hours: [] as number[], top: '',
      orders: dayOrders,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [orders, offset]);

  const earned = cells.filter((c) => c.kind !== 'future').reduce((s, c) => s + c.sales, 0);
  const booked = cells.filter((c) => c.kind === 'future');
  const bookedCount = booked.reduce((s, c) => s + c.count, 0);
  const label = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : offset === 1 ? 'Next week' : `${-offset} weeks ago`;
  const range = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const go = (d: number) => { setDir(d); setOffset((o) => { const n = Math.min(1, Math.max(-3, o + d)); lastOffset = n; return n; }); };

  const open = (c: (typeof cells)[number]) => (c.kind === 'today' ? onZoomToday() : onOpenDay(c.date));

  return (
    <div className="d-week-board">
      <div className="d-week-bar">
        <div className="d-week-nav">
          <motion.button type="button" className="d-round" onClick={() => go(-1)} disabled={offset <= -3} whileHover={{ x: -2 }} whileTap={{ scale: 0.9 }} aria-label="Previous week"><ChevronLeft size={18} /></motion.button>
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div key={offset} className="d-week-title" custom={dir} initial={{ opacity: 0, y: dir * 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: dir * -10 }} transition={{ duration: 0.25, ease }}>
              <strong>{label}</strong><span>{range}</span>
            </motion.div>
          </AnimatePresence>
          <motion.button type="button" className="d-round" onClick={() => go(1)} disabled={offset >= 1} whileHover={{ x: 2 }} whileTap={{ scale: 0.9 }} aria-label="Next week"><ChevronRight size={18} /></motion.button>
          {offset !== 0 && <button type="button" className="d-text-btn" onClick={() => go(-offset)}>Back to this week</button>}
        </div>
        <p className="d-week-sum">
          {earned > 0 && <><b>{dollars(earned)}</b> taken</>}
          {earned > 0 && bookedCount > 0 && ', '}
          {bookedCount > 0 && <><b>{bookedCount}</b> {bookedCount === 1 ? 'pre-order' : 'pre-orders'} booked ahead</>}
          {earned === 0 && bookedCount === 0 && 'Nothing booked yet'}
        </p>
      </div>

      <div className="d-week-viewport">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={offset}
            className="d-week-grid"
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 70 }),
              center: { opacity: 1, x: 0 },
              leave: (d: number) => ({ opacity: 0, x: d * -70 }),
            }}
            initial="enter"
            animate="center"
            exit="leave"
            transition={{ x: glide, opacity: { duration: 0.25 } }}
          >
            {cells.map((c, i) => (
              <motion.button
                key={c.date.toDateString()}
                type="button"
                className={`d-daycard d-daycard--${c.kind}`}
                onClick={() => open(c)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.045, duration: 0.6, ease }}
                whileHover={{ y: -5, transition: { type: 'spring', stiffness: 420, damping: 26 } }} whileTap={{ scale: 0.975 }}
              >
                <div className="d-daycard-head">
                  <span>{WD[i]}</span>
                  <strong>{c.date.getDate()}</strong>
                  {c.kind === 'today' && <em>Today</em>}
                </div>

                {c.kind === 'past' && (
                  <>
                    <div className="d-daycard-figs"><b>{dollars(c.sales)}</b><span>{c.count} orders</span></div>
                    <MiniBars values={c.hours} />
                    <div className="d-daycard-best">
                      <BestThumb name={c.top} photo={photoFor(menu.find((m) => m.name === c.top))} />
                      <span>{shortName(c.top)} sold most</span>
                    </div>
                  </>
                )}

                {c.kind === 'today' && <TodayBody orders={c.orders} />}

                {c.kind === 'future' && (
                  <>
                    <div className="d-daycard-figs">
                      {c.count ? <><b>{dollars(c.sales)}</b><span>{c.count} {c.count === 1 ? 'pre-order' : 'pre-orders'}</span></> : <span className="d-quiet">Nothing booked</span>}
                    </div>
                    <div className="d-minis">
                      {c.orders.map((o) => (
                        <div key={o.id} className="d-mini">
                          <span className="d-mini-time">{clock(o.pickupAt)}</span>
                          <span className="d-mini-name">{o.name}</span>
                          <span className="d-mini-items">{summary(o)}</span>
                          {o.note && <span className="d-mini-note">{o.note}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}

function TodayBody({ orders }: { orders: Order[] }) {
  const making = orders.filter((o) => o.status === 'new');
  const ready = orders.filter((o) => o.status === 'ready').length;
  const done = orders.filter((o) => o.status === 'done').length;
  const sales = orders.reduce((s, o) => s + orderTotal(o), 0);
  const next = making[0];
  return (
    <>
      <div className="d-daycard-figs"><b>{dollars(sales)}</b><span>{orders.length} orders so far</span></div>
      <ul className="d-today-list">
        <li><i className="rail" />{making.length} on the rail</li>
        <li><i className="counter" />{ready} on the counter</li>
        <li><i className="done" />{done} picked up</li>
      </ul>
      {next && (
        <div className="d-mini d-mini--next">
          <span className="d-mini-time">Next up, {clock(next.pickupAt)}</span>
          <span className="d-mini-name">{next.name}</span>
          <span className="d-mini-items">{summary(next)}</span>
        </div>
      )}
      <span className="d-daycard-cta">Open the rail <ArrowUpRight size={14} /></span>
    </>
  );
}
