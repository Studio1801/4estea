import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { orderTotal, useStore, type Order } from '@/lib/store';
import { CountUp, ease, rise } from './ui';

// Earlier days this week are sample figures so the chart has a shape.
const SAMPLE_WEEK = [
  { orders: 9, sales: 168 },
  { orders: 7, sales: 131 },
  { orders: 8, sales: 152 },
  { orders: 6, sales: 117 },
  { orders: 11, sales: 214 },
  { orders: 14, sales: 268 },
  { orders: 10, sales: 191 },
];
const SAMPLE_TOP: Record<string, number> = {
  'Grilled Liempo Bowl': 14, 'Buko Latte': 12, 'Lumpiang Shanghai': 9, 'Mango Matcha': 8, 'Classic 4ESTEA Matcha': 7,
};

const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const cents = (n: number) => `$${n.toFixed(2)}`;
const whole = (n: number) => String(Math.round(n));
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString('en-US', { hour: 'numeric' }).toLowerCase().replace(' ', '');

/* Running total of the day, as a smooth line from opening to close. */
function useDayCurve(orders: Order[]) {
  return useMemo(() => {
    const day = new Date();
    const at = (h: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).getTime();
    const times = orders.map((o) => o.pickupAt);
    let start = at(11);
    let end = at(21);
    if (times.length) {
      start = Math.min(start, Math.min(...times) - 3600_000);
      end = Math.max(end, Math.max(...times) + 1800_000);
    }
    const steps = 48;
    const pts: [number, number][] = [];
    const sorted = [...orders].sort((a, b) => a.pickupAt - b.pickupAt);
    for (let i = 0; i <= steps; i++) {
      const t = start + ((end - start) * i) / steps;
      const total = sorted.filter((o) => o.pickupAt <= t).reduce((s, o) => s + orderTotal(o), 0);
      pts.push([i / steps, total]);
    }
    const max = Math.max(...pts.map((p) => p[1]), 1);
    const W = 600, H = 150;
    const xy = pts.map(([x, y]) => [x * W, H - 8 - (y / max) * (H - 24)] as [number, number]);
    // Gentle smoothing so the steps read as a curve.
    let d = `M${xy[0][0]},${xy[0][1]}`;
    for (let i = 1; i < xy.length; i++) {
      const [x0, y0] = xy[i - 1];
      const [x1, y1] = xy[i];
      const cx = (x0 + x1) / 2;
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    const now = Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
    const nowIdx = Math.round(now * steps);
    const ticks = [0, 0.33, 0.66, 1].map((f) => hourLabel(new Date(start + (end - start) * f).getHours()));
    return { d, area: `${d} L${W},${H} L0,${H} Z`, W, H, nowPt: xy[nowIdx], ticks };
  }, [orders]);
}

export default function NumbersView() {
  const orders = useStore((s) => s.orders);
  const curve = useDayCurve(orders);

  const stats = useMemo(() => {
    const sales = orders.reduce((s, o) => s + orderTotal(o), 0);
    const byHour = new Map<number, number>();
    orders.forEach((o) => {
      const h = new Date(o.pickupAt).getHours();
      byHour.set(h, (byHour.get(h) ?? 0) + 1);
    });
    const busiest = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const top = { ...SAMPLE_TOP };
    orders.forEach((o) => o.lines.forEach((l) => { top[l.name] = (top[l.name] ?? 0) + l.qty; }));
    const topList = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { sales, count: orders.length, avg: orders.length ? sales / orders.length : 0, busiest, topList };
  }, [orders]);

  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0
  const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({
    day: d,
    sales: i < todayIdx ? SAMPLE_WEEK[i].sales : i === todayIdx ? stats.sales : 0,
    orders: i < todayIdx ? SAMPLE_WEEK[i].orders : i === todayIdx ? stats.count : 0,
    state: i < todayIdx ? 'past' : i === todayIdx ? 'today' : 'future',
  }));
  const weekSales = week.reduce((s, d) => s + d.sales, 0);
  const weekOrders = week.reduce((s, d) => s + d.orders, 0);
  const maxSales = Math.max(...week.map((d) => d.sales), 1);
  const maxTop = stats.topList[0]?.[1] ?? 1;
  const vsYesterday = todayIdx > 0 ? stats.sales - week[todayIdx - 1].sales : null;

  return (
    <div className="d-numbers">
      <div className="d-num-top">
        <motion.section className="d-sales" variants={rise}>
          <div className="d-sales-head">
            <span>Sales today</span>
            <strong><CountUp value={stats.sales} format={cents} duration={1.3} /></strong>
            {vsYesterday !== null && (
              <motion.em
                className={vsYesterday >= 0 ? 'up' : 'down'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5, ease }}
              >
                {vsYesterday >= 0 ? 'Up' : 'Down'} {dollars(Math.abs(vsYesterday))} on yesterday
              </motion.em>
            )}
          </div>
          <div className="d-curve">
            <svg viewBox={`0 0 ${curve.W} ${curve.H}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="d-curve-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e0c787" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#e0c787" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path d={curve.area} fill="url(#d-curve-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }} />
              <motion.path
                d={curve.d}
                fill="none"
                stroke="#e0c787"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease, delay: 0.15 }}
              />
            </svg>
            {curve.nowPt && (
              <motion.span
                className="d-curve-now"
                style={{ left: `${(curve.nowPt[0] / curve.W) * 100}%`, top: `${(curve.nowPt[1] / curve.H) * 100}%` }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, type: 'spring', stiffness: 400, damping: 18 }}
              >
                <i />
              </motion.span>
            )}
            <div className="d-curve-ticks">{curve.ticks.map((t, i) => <span key={i}>{t}</span>)}</div>
          </div>
        </motion.section>

        <motion.dl className="d-kpis" variants={rise}>
          <div><dt>Orders</dt><dd><CountUp value={stats.count} format={whole} delay={0.1} /></dd></div>
          <div><dt>Average order</dt><dd><CountUp value={stats.avg} format={cents} delay={0.2} /></dd></div>
          <div><dt>Busiest hour</dt><dd className="d-num">{stats.busiest === undefined ? 'None yet' : hourLabel(stats.busiest)}</dd></div>
        </motion.dl>
      </div>

      <div className="d-num-bottom">
        <motion.section className="d-panel" variants={rise}>
          <div className="d-section-head">
            <h2>This week</h2>
            <span>{dollars(weekSales)} from {weekOrders} orders</span>
          </div>
          <div className="d-bars" role="img" aria-label="Sales by day this week">
            {week.map((d, i) => (
              <div className={`d-bar ${d.state}`} key={d.day}>
                <motion.span
                  className="d-bar-val"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: d.state === 'future' ? 0 : 1 }}
                  transition={{ delay: 0.5 + i * 0.06, duration: 0.4 }}
                >
                  {dollars(d.sales)}
                </motion.span>
                <div className="d-bar-track">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: Math.max(d.sales / maxSales, 0.015) }}
                    transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.25 + i * 0.06 }}
                  />
                </div>
                <span className="d-bar-day">{d.state === 'today' ? 'Today' : d.day}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section className="d-panel" variants={rise}>
          <div className="d-section-head">
            <h2>Best sellers</h2>
            <span>This week</span>
          </div>
          <ol className="d-top3">
            {stats.topList.map(([name, n], i) => (
              <li key={name}>
                <span className="d-rank">{i + 1}</span>
                <div>
                  <div className="d-top3-row"><span>{name}</span><b><CountUp value={n} format={whole} delay={0.3 + i * 0.1} /> sold</b></div>
                  <div className="d-top3-bar">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: n / maxTop }}
                      transition={{ duration: 1, ease, delay: 0.35 + i * 0.1 }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>
      </div>
    </div>
  );
}

