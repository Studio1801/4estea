import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Camera, Plus } from 'lucide-react';
import logoFullInk from '@assets/logo-full-ink_1787167544226.png';
import {
  actions, clock, groups, money, money2, orderTotal, photoFor, resizePhoto, useStore,
  type GroupId, type Item, type Order,
} from '@/lib/store';
import '@/dashboard.css';

type Tab = 'orders' | 'menu' | 'numbers';
const TABS: { id: Tab; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'menu', label: 'Menu' },
  { id: 'numbers', label: 'Numbers' },
];

function useNow(every = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`d-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.slice(1) as Tab;
    return TABS.some((t) => t.id === h) ? h : 'orders';
  });
  const open = useStore((s) => s.open);
  const orders = useStore((s) => s.orders);
  const waiting = orders.filter((o) => o.status !== 'done').length;

  useEffect(() => {
    document.title = 'Dashboard · 4ESTEA';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="dash">
      <header className="d-top">
        <div className="d-top-inner">
          <a className="d-brand" href={import.meta.env.BASE_URL} aria-label="Back to the 4ESTEA website">
            <img src={logoFullInk} alt="" width="859" height="1044" />
            <span><strong>4ESTEA</strong><small>Your dashboard</small></span>
          </a>
          <nav className="d-tabs" aria-label="Dashboard sections">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
                {t.label}
                {t.id === 'orders' && waiting > 0 && <span className="d-count">{waiting}</span>}
              </button>
            ))}
          </nav>
          <label className={`d-open ${open ? '' : 'closed'}`}>
            <span>{open ? 'Open' : 'Closed'}</span>
            <Switch on={open} onChange={actions.setOpen} label="Taking orders today" />
          </label>
        </div>
      </header>

      <main className="d-main">
        {tab === 'orders' && <OrdersView />}
        {tab === 'menu' && <MenuView />}
        {tab === 'numbers' && <NumbersView />}
      </main>

      <footer className="d-foot">
        <span>Demo with sample data. Changes stay in this browser.</span>
        <button type="button" onClick={() => actions.reset()}>Start the demo over</button>
      </footer>
    </div>
  );
}

/* ---------------- Orders ---------------- */

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function OrdersView() {
  const orders = useStore((s) => s.orders);
  const open = useStore((s) => s.open);
  const now = useNow();
  const [fresh, setFresh] = useState<string | null>(null);

  const active = useMemo(
    () => orders.filter((o) => o.status !== 'done').sort((a, b) => a.pickupAt - b.pickupAt),
    [orders],
  );
  const done = useMemo(
    () => orders.filter((o) => o.status === 'done').sort((a, b) => b.pickupAt - a.pickupAt),
    [orders],
  );
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const sendTest = () => {
    const id = actions.testOrder();
    if (id) {
      setFresh(id);
      setTimeout(() => setFresh(null), 2400);
    }
  };

  return (
    <section>
      <div className="d-head">
        <div>
          <p className="d-date">{today}</p>
          <h1>{greeting()}.</h1>
          <p className="d-lede">
            {active.length === 0 ? 'Nothing waiting. Enjoy the quiet.' : `${active.length} ${active.length === 1 ? 'order' : 'orders'} to go.`}
          </p>
        </div>
        <button type="button" className="d-btn d-btn-soft" onClick={sendTest}>
          <Plus size={16} /> Send a test order
        </button>
      </div>

      {!open && <p className="d-banner">You are closed today. The website says so, and new online orders are paused.</p>}

      <div className="d-orders">
        {active.map((o) => (
          <OrderCard key={o.id} order={o} now={now} isNew={o.id === fresh} />
        ))}
      </div>

      {done.length > 0 && (
        <div className="d-done">
          <h2>Picked up today</h2>
          {done.map((o) => (
            <div className="d-done-row" key={o.id}>
              <span className="d-done-time">{clock(o.pickupAt)}</span>
              <span className="d-done-name">{o.name}</span>
              <span className="d-done-items">{o.lines.map((l) => `${l.qty} ${l.name}`).join(', ')}</span>
              <span className="d-done-total">{money2(orderTotal(o))}</span>
              <button type="button" onClick={() => actions.setStatus(o.id, 'ready')}>Undo</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function dueLabel(o: Order, now: number) {
  const mins = Math.round((o.pickupAt - now) / 60_000);
  if (o.status === 'ready') return { text: 'Ready on the counter', tone: 'ready' };
  if (mins < 0) return { text: `${-mins} min late`, tone: 'late' };
  if (mins === 0) return { text: 'Due now', tone: 'soon' };
  return { text: `In ${mins} min`, tone: mins <= 10 ? 'soon' : 'later' };
}

function OrderCard({ order, now, isNew }: { order: Order; now: number; isNew: boolean }) {
  const due = dueLabel(order, now);
  const ready = order.status === 'ready';
  return (
    <article className={`d-order ${ready ? 'is-ready' : ''} ${isNew ? 'is-new' : ''}`}>
      <div className="d-order-top">
        <div className="d-order-time">{clock(order.pickupAt)}</div>
        <div className={`d-due ${due.tone}`}><i />{due.text}</div>
      </div>
      <h3>{order.name} <span>#{order.number}</span></h3>
      <ul>
        {order.lines.map((l, i) => (
          <li key={i}><b>{l.qty}×</b> {l.name}</li>
        ))}
      </ul>
      {order.note && <p className="d-note">“{order.note}”</p>}
      <div className="d-order-foot">
        <span className="d-total">{money2(orderTotal(order))}</span>
        {ready ? (
          <button type="button" className="d-btn d-btn-warm" onClick={() => actions.setStatus(order.id, 'done')}>Picked up</button>
        ) : (
          <button type="button" className="d-btn" onClick={() => actions.setStatus(order.id, 'ready')}>Mark ready</button>
        )}
      </div>
    </article>
  );
}

/* ---------------- Menu ---------------- */

function MenuView() {
  const menu = useStore((s) => s.menu);
  const [focusId, setFocusId] = useState<string | null>(null);
  const soldOut = menu.filter((m) => m.soldOut).length;

  return (
    <section>
      <div className="d-head">
        <div>
          <h1>Your menu.</h1>
          <p className="d-lede">
            Change a price, swap a photo, or switch a dish off when it runs out. The website updates right away.
          </p>
        </div>
        <a className="d-link" href={`${import.meta.env.BASE_URL}#menu`} target="_blank" rel="noopener noreferrer">
          See it on your website <ArrowUpRight size={15} />
        </a>
      </div>

      <p className="d-summary">
        <strong>{menu.length - soldOut}</strong> on the menu
        {soldOut > 0 && <> · <strong className="d-coral">{soldOut}</strong> sold out</>}
      </p>

      {groups.map((g) => (
        <div className="d-group" key={g.id}>
          <div className="d-group-head">
            <h2>{g.name}</h2>
            <button type="button" className="d-add" onClick={() => setFocusId(actions.addItem(g.id as GroupId))}>
              <Plus size={15} /> Add a dish
            </button>
          </div>
          {menu.filter((m) => m.group === g.id).map((item) => (
            <MenuRow key={item.id} item={item} autoFocus={item.id === focusId} />
          ))}
        </div>
      ))}
    </section>
  );
}

const priceText = (n: number) => (!n ? '' : Number.isInteger(n) ? String(n) : n.toFixed(2));

function MenuRow({ item, autoFocus }: { item: Item; autoFocus: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [price, setPrice] = useState(priceText(item.price));
  const [saved, setSaved] = useState(false);
  const photo = photoFor(item);

  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  // Keep the field in step when the price changes elsewhere (another tab, a reset).
  useEffect(() => {
    if (document.activeElement !== priceRef.current) setPrice(priceText(item.price));
  }, [item.price]);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      actions.updateItem(item.id, { photo: await resizePhoto(file) });
      flash();
    } catch {
      /* unreadable image, ignore */
    }
  };

  return (
    <div className={`d-item ${item.soldOut ? 'is-out' : ''}`}>
      <button type="button" className="d-photo" onClick={() => fileRef.current?.click()} aria-label={`Change photo for ${item.name || 'this dish'}`}>
        {photo ? <img src={photo} alt="" /> : <span className="d-photo-empty"><Camera size={18} /></span>}
        <span className="d-photo-hint">{photo ? 'Change' : 'Add photo'}</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />

      <div className="d-item-text">
        <input
          ref={nameRef}
          className="d-item-name"
          value={item.name}
          placeholder="Dish name"
          aria-label="Dish name"
          onChange={(e) => actions.updateItem(item.id, { name: e.target.value })}
          onBlur={flash}
        />
        <textarea
          className="d-item-desc"
          value={item.description}
          placeholder="A short line about it"
          aria-label="Description"
          rows={1}
          onChange={(e) => actions.updateItem(item.id, { description: e.target.value })}
          onBlur={flash}
        />
        {!item.name && !item.description && (
          <button type="button" className="d-remove" onClick={() => actions.removeItem(item.id)}>Remove</button>
        )}
      </div>

      <div className="d-item-side">
        <label className="d-price">
          <span>$</span>
          <input
            ref={priceRef}
            inputMode="decimal"
            value={price}
            placeholder="0"
            aria-label={`Price for ${item.name || 'this dish'}`}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '');
              setPrice(v);
              const n = parseFloat(v);
              if (!Number.isNaN(n)) actions.updateItem(item.id, { price: n });
            }}
            onBlur={flash}
          />
        </label>
        <div className="d-avail">
          <Switch on={!item.soldOut} onChange={(v) => { actions.updateItem(item.id, { soldOut: !v }); flash(); }} label={`${item.name} available`} />
          <span>{item.soldOut ? 'Sold out' : 'Available'}</span>
        </div>
        <span className={`d-saved ${saved ? 'show' : ''}`} aria-live="polite">{saved ? 'Saved' : ''}</span>
      </div>
    </div>
  );
}

/* ---------------- Numbers ---------------- */

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

function NumbersView() {
  const orders = useStore((s) => s.orders);

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

  const hourLabel = (h?: number) =>
    h === undefined ? '–' : new Date(2000, 0, 1, h).toLocaleTimeString('en-US', { hour: 'numeric' }).toLowerCase();

  const downloadCsv = () => {
    const rows = [['Order', 'Name', 'Pickup', 'Items', 'Total', 'Status']];
    orders.forEach((o) => rows.push([
      String(o.number), o.name, clock(o.pickupAt), o.lines.map((l) => `${l.qty} ${l.name}`).join('; '), orderTotal(o).toFixed(2), o.status,
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `4estea-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section>
      <div className="d-head">
        <div>
          <h1>Your numbers.</h1>
          <p className="d-lede">How today is going, and how it stacks up against the rest of the week.</p>
        </div>
      </div>

      <div className="d-today">
        <div className="d-big">
          <span>Sales today</span>
          <strong>{money2(stats.sales)}</strong>
        </div>
        <dl className="d-stats">
          <div><dt>Orders</dt><dd>{stats.count}</dd></div>
          <div><dt>Average order</dt><dd>{money2(stats.avg)}</dd></div>
          <div><dt>Busiest hour</dt><dd>{hourLabel(stats.busiest)}</dd></div>
        </dl>
      </div>

      <div className="d-split">
        <div className="d-panel">
          <div className="d-panel-head">
            <h2>This week</h2>
            <span>${Math.round(weekSales).toLocaleString('en-US')} from {weekOrders} orders</span>
          </div>
          <div className="d-bars" role="img" aria-label="Sales by day this week">
            {week.map((d) => (
              <div className={`d-bar ${d.state}`} key={d.day}>
                <span className="d-bar-val">{d.state === 'future' ? '' : money(Math.round(d.sales))}</span>
                <div className="d-bar-track"><div style={{ height: `${(d.sales / maxSales) * 100}%` }} /></div>
                <span className="d-bar-day">{d.state === 'today' ? 'Today' : d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="d-panel">
          <div className="d-panel-head">
            <h2>Best sellers</h2>
            <span>This week</span>
          </div>
          <ol className="d-top3">
            {stats.topList.map(([name, n], i) => (
              <li key={name}>
                <span className="d-rank">{i + 1}</span>
                <div>
                  <div className="d-top3-row"><span>{name}</span><b>{n} sold</b></div>
                  <div className="d-top3-bar"><div style={{ width: `${(n / maxTop) * 100}%` }} /></div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <button type="button" className="d-link d-csv" onClick={downloadCsv}>Download today’s orders as a spreadsheet</button>
    </section>
  );
}
