import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { clock, orderTotal, photoFor, useStore, type Order } from '@/lib/store';
import { CountUp, ease, rise } from './ui';

// Earlier days this week are sample figures so the week has a shape.
const SAMPLE_WEEK = [
  { orders: 29, sales: 498 },
  { orders: 24, sales: 431 },
  { orders: 27, sales: 476 },
  { orders: 22, sales: 402 },
  { orders: 34, sales: 611 },
  { orders: 41, sales: 742 },
  { orders: 33, sales: 588 },
];
const SAMPLE_TOP: Record<string, number> = {
  'Grilled Liempo Bowl': 31, 'Buko Latte': 27, 'Lumpiang Shanghai': 19, 'Classic 4ESTEA Matcha': 17, 'Mango Matcha': 12, 'Banana Turon': 11,
};

const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const cents = (n: number) => `$${n.toFixed(2)}`;
const whole = (n: number) => String(Math.round(n));
const hourName = (h: number) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
const hourShort = (h: number) => (h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`);

function useHours(orders: Order[]) {
  return useMemo(() => {
    const byHour = new Map<number, { sales: number; count: number }>();
    orders.forEach((o) => {
      const h = new Date(o.pickupAt).getHours();
      const cur = byHour.get(h) ?? { sales: 0, count: 0 };
      cur.sales += orderTotal(o);
      cur.count += 1;
      byHour.set(h, cur);
    });
    const hs = [...byHour.keys()];
    const nowH = new Date().getHours();
    const first = Math.min(nowH, ...hs) - 1;
    const last = Math.max(nowH + 2, ...hs);
    const rows = [];
    for (let h = first; h <= last; h++) rows.push({ h, ...(byHour.get(h) ?? { sales: 0, count: 0 }), state: h < nowH ? 'past' : h === nowH ? 'now' : 'later' });
    const rush = [...byHour.entries()].sort((a, b) => b[1].sales - a[1].sales)[0]?.[0];
    return { rows, rush, max: Math.max(...rows.map((r) => r.sales), 1) };
  }, [orders]);
}

export default function NumbersView() {
  const orders = useStore((s) => s.orders);
  const menu = useStore((s) => s.menu);
  const hours = useHours(orders);

  const stats = useMemo(() => {
    const sales = orders.reduce((s, o) => s + orderTotal(o), 0);
    const names = new Map<string, number>();
    orders.forEach((o) => names.set(o.name, (names.get(o.name) ?? 0) + 1));
    const top = { ...SAMPLE_TOP };
    orders.forEach((o) => o.lines.forEach((l) => { top[l.name] = (top[l.name] ?? 0) + l.qty; }));
    const topList = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { sales, count: orders.length, avg: orders.length ? sales / orders.length : 0, regulars: [...names.values()].filter((n) => n > 1).length, topList };
  }, [orders]);

  const todayIdx = (new Date().getDay() + 6) % 7;
  const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({
    day: d,
    sales: i < todayIdx ? SAMPLE_WEEK[i].sales : i === todayIdx ? stats.sales : 0,
    orders: i < todayIdx ? SAMPLE_WEEK[i].orders : i === todayIdx ? stats.count : 0,
    state: i < todayIdx ? 'past' : i === todayIdx ? 'today' : 'later',
  }));
  const weekSales = week.reduce((s, d) => s + d.sales, 0);
  const weekMax = Math.max(...week.map((d) => d.sales), 1);
  const lastWeekSame = todayIdx > 0 ? SAMPLE_WEEK[todayIdx - 1].sales : null;
  const maxTop = stats.topList[0]?.[1] ?? 1;
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const downloadCsv = () => {
    const rows = [['Order', 'Name', 'Pickup', 'Items', 'Total', 'Status']];
    orders.forEach((o) => rows.push([String(o.number), o.name, clock(o.pickupAt), o.lines.map((l) => `${l.qty} ${l.name}`).join('; '), orderTotal(o).toFixed(2), o.status]));
    const csv = rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `4estea-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="d-numbers">
      <motion.div className="d-page-head" variants={rise}>
        <div>
          <h1>{weekday}, <em>so far</em></h1>
        </div>
        <button type="button" className="d-link" onClick={downloadCsv}>Download today’s orders <ArrowUpRight size={15} /></button>
      </motion.div>

      <motion.p className="d-story" variants={rise}>
        <mark><CountUp value={stats.sales} format={dollars} duration={1.3} /></mark> from{' '}
        <mark><CountUp value={stats.count} format={whole} duration={1.1} /></mark> orders, about{' '}
        <mark><CountUp value={stats.avg} format={cents} duration={1.2} /></mark> a ticket.
        {hours.rush !== undefined && <> The rush hit at <mark>{hourName(hours.rush)}</mark>.</>}
        {lastWeekSame !== null && <> Yesterday finished at {dollars(lastWeekSame)}.</>}
      </motion.p>

      <motion.section className="d-panel d-hours" variants={rise}>
        <div className="d-panel-head">
          <h2>Hour by hour</h2>
          <span><i className="d-key d-key--past" />earlier <i className="d-key d-key--now" />this hour <i className="d-key d-key--later" />booked ahead</span>
        </div>
        <div className="d-hour-bars" role="img" aria-label="Sales by hour today">
          {hours.rows.map((r, i) => (
            <div key={r.h} className={`d-hour d-hour--${r.state} ${r.h === hours.rush ? 'is-rush' : ''}`}>
              <motion.span className="d-hour-val" initial={{ opacity: 0 }} animate={{ opacity: r.sales ? 1 : 0 }} transition={{ delay: 0.5 + i * 0.035 }}>
                {r.sales ? dollars(r.sales) : ''}
              </motion.span>
              <div className="d-hour-track">
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: r.sales ? Math.max(r.sales / hours.max, 0.04) : 0.02 }} transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.15 + i * 0.035 }} />
              </div>
              <span className="d-hour-label">{hourShort(r.h)}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <div className="d-num-grid">
        <motion.section className="d-panel" variants={rise}>
          <div className="d-panel-head">
            <h2>This week</h2>
            <span>{dollars(weekSales)} so far</span>
          </div>
          <div className="d-week" role="img" aria-label="Sales by day this week">
            {week.map((d, i) => (
              <div className={`d-day d-day--${d.state}`} key={d.day}>
                <motion.span className="d-day-val" initial={{ opacity: 0 }} animate={{ opacity: d.state === 'later' ? 0 : 1 }} transition={{ delay: 0.6 + i * 0.05 }}>{dollars(d.sales)}</motion.span>
                <div className="d-day-track">
                  <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: d.state === 'later' ? 1 : Math.max(d.sales / weekMax, 0.03) }} transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.3 + i * 0.05 }} />
                </div>
                <span className="d-day-label">{d.state === 'today' ? 'Today' : d.day}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section className="d-panel" variants={rise}>
          <div className="d-panel-head">
            <h2>Best sellers</h2>
            <span>this week</span>
          </div>
          <ol className="d-best">
            {stats.topList.map(([name, n], i) => {
              const it = menu.find((m) => m.name === name);
              const photo = photoFor(it);
              return (
                <li key={name}>
                  <span className="d-best-photo">{photo ? <img src={photo} alt="" /> : <i>{name[0]}</i>}</span>
                  <div className="d-best-body">
                    <div className="d-best-row"><span>{name}</span><b><CountUp value={n} format={whole} delay={0.3 + i * 0.08} /></b></div>
                    <div className="d-best-bar">
                      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: n / maxTop }} transition={{ duration: 1, ease, delay: 0.35 + i * 0.08 }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </motion.section>
      </div>
    </div>
  );
}
