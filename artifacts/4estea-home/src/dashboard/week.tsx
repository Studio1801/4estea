import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import {
  addDays, clock, daySummary, money2, orderTotal, photoFor, sameDay, startOfDay, useStore, weekStart,
  type Order,
} from '@/lib/store';
import { Drawer, ease, glide } from './ui';

const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p'];

// Short names so a whole order fits on a small slip.
const shortName = (n: string) =>
  n.replace('Grilled ', '').replace(' Bowl', '').replace('Lumpiang Shanghai', 'Lumpia').replace('Garlic Fried Chicken ', '')
    .replace('Classic 4ESTEA Matcha', 'Classic Matcha').replace('Banana ', '');
const summary = (o: Order) => o.lines.map((l) => `${l.qty} ${shortName(l.name)}`).join(', ');

type Kind = 'past' | 'today' | 'future';

export default function WeekBoard({ onZoomToday }: { onZoomToday: () => void }) {
  const orders = useStore((s) => s.orders);
  const menu = useStore((s) => s.menu);
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState(0);
  const [openDay, setOpenDay] = useState<Date | null>(null);

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

  const go = (d: number) => { setDir(d); setOffset((o) => Math.min(1, Math.max(-3, o + d))); };

  const open = (c: (typeof cells)[number]) => (c.kind === 'today' ? onZoomToday() : setOpenDay(c.date));
  const openCell = openDay ? cells.find((c) => sameDay(c.date, openDay)) : undefined;

  return (
    <div className="d-week-board">
      <div className="d-week-bar">
        <div className="d-week-nav">
          <motion.button type="button" className="d-round" onClick={() => go(-1)} disabled={offset <= -3} whileTap={{ scale: 0.9 }} aria-label="Previous week"><ChevronLeft size={18} /></motion.button>
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div key={offset} className="d-week-title" custom={dir} initial={{ opacity: 0, y: dir * 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: dir * -10 }} transition={{ duration: 0.25, ease }}>
              <strong>{label}</strong><span>{range}</span>
            </motion.div>
          </AnimatePresence>
          <motion.button type="button" className="d-round" onClick={() => go(1)} disabled={offset >= 1} whileTap={{ scale: 0.9 }} aria-label="Next week"><ChevronRight size={18} /></motion.button>
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
                transition={{ delay: 0.05 + i * 0.04, duration: 0.45, ease }}
                whileTap={{ scale: 0.98 }}
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

      <Drawer
        open={!!openCell}
        onClose={() => setOpenDay(null)}
        title={openCell ? <>{openCell.date.toLocaleDateString('en-US', { weekday: 'long' })} <em>{openCell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</em></> : ''}
      >
        {openCell && (openCell.kind === 'past' ? <PastDay cell={openCell} /> : <FutureDay orders={openCell.orders} />)}
      </Drawer>
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

function MiniBars({ values, big = false }: { values: number[]; big?: boolean }) {
  const max = Math.max(...values, 1);
  return (
    <div className={`d-minibars ${big ? 'd-minibars--big' : ''}`} aria-hidden={!big}>
      {values.map((v, i) => (
        <div key={i} className="d-minibar">
          {big && <span className="d-minibar-val">{v ? dollars(v) : ''}</span>}
          <div className="d-minibar-track">
            <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: Math.max(v / max, 0.04) }} transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.15 + i * 0.03 }} className={v === max ? 'peak' : ''} />
          </div>
          {big && <span className="d-minibar-label">{HOURS[i]}</span>}
        </div>
      ))}
    </div>
  );
}

function BestThumb({ name, photo }: { name: string; photo?: string }) {
  return <span className="d-thumb">{photo ? <img src={photo} alt="" /> : <i>{name[0]}</i>}</span>;
}

function PastDay({ cell }: { cell: { sales: number; count: number; hours: number[]; top: string } }) {
  const menu = useStore((s) => s.menu);
  const peak = cell.hours.indexOf(Math.max(...cell.hours));
  return (
    <div className="d-dayview">
      <p className="d-dayview-story">
        <mark>{dollars(cell.sales)}</mark> from <mark>{cell.count}</mark> orders, about {money2(cell.sales / cell.count)} a ticket. Busiest around <mark>{HOURS[peak].replace('a', ' am').replace('p', ' pm')}</mark>.
      </p>
      <h3>Hour by hour</h3>
      <MiniBars values={cell.hours} big />
      <h3>Sold most</h3>
      <div className="d-dayview-best">
        <BestThumb name={cell.top} photo={photoFor(menu.find((m) => m.name === cell.top))} />
        <span>{cell.top}</span>
      </div>
    </div>
  );
}

function FutureDay({ orders }: { orders: Order[] }) {
  const prep = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach((o) => o.lines.forEach((l) => m.set(l.name, (m.get(l.name) ?? 0) + l.qty)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [orders]);

  if (!orders.length) return <p className="d-log-empty">Nothing booked for this day yet. Pre-orders from your website will land here.</p>;

  return (
    <div className="d-dayview">
      <h3>Prep list</h3>
      <ul className="d-prep">
        {prep.map(([name, n], i) => (
          <motion.li key={name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.35, ease }}>
            <b>{n}</b><span>{name}</span>
          </motion.li>
        ))}
      </ul>
      <h3>Pre-orders</h3>
      <div className="d-preorders">
        {orders.map((o, i) => (
          <motion.div key={o.id} className="d-preorder" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07, duration: 0.4, ease }}>
            <div className="d-preorder-top"><span>{clock(o.pickupAt)}</span><b>{money2(orderTotal(o))}</b></div>
            <div className="d-preorder-name">{o.name}</div>
            {o.note && <p className="d-ticket-note">{o.note}</p>}
            <ul className="d-ticket-items">
              {o.lines.map((l, k) => <li key={k}><b>{l.qty}</b><span>{l.name}</span></li>)}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

