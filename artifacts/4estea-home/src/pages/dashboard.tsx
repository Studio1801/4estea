import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { ArrowUpRight, Plus } from 'lucide-react';
import logoMarkCream from '@assets/logo-mark-cream_1787167544225.png';
import { actions, clock, getState, orderTotal, useStore } from '@/lib/store';
import OrdersView, { sendTestOrder } from '@/dashboard/orders';
import MenuView from '@/dashboard/menu';
import NumbersView from '@/dashboard/numbers';
import { CountUp, Switch, ToastProvider, ease, rise, sheet, spring, useToast } from '@/dashboard/ui';
import '@/dashboard.css';

type Tab = 'orders' | 'menu' | 'numbers';
const TABS: { id: Tab; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'menu', label: 'Menu' },
  { id: 'numbers', label: 'Numbers' },
];
const SITE = import.meta.env.BASE_URL;

export default function Dashboard() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </MotionConfig>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.slice(1) as Tab;
    return TABS.some((t) => t.id === h) ? h : 'orders';
  });
  const open = useStore((s) => s.open);
  const orders = useStore((s) => s.orders);
  const toast = useToast();
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
    if (t === tab) return;
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setOpen = (v: boolean) => {
    actions.setOpen(v);
    toast({
      text: v ? <>You are <b>open</b>. The website is taking orders.</> : <>You are <b>closed</b> for today. The website says so.</>,
      action: { label: 'Undo', run: () => actions.setOpen(!v) },
    });
  };

  return (
    <div className="dash">
      <header className="d-band">
        <div className="d-bar-top">
          <a className="d-brand" href={SITE} aria-label="Back to the 4ESTEA website">
            <img src={logoMarkCream} alt="" width="735" height="622" />
            <span><strong>4ESTEA</strong><small>Your dashboard</small></span>
          </a>

          <LayoutGroup id="tabs">
            <nav className="d-tabs" aria-label="Dashboard sections">
              {TABS.map((t) => (
                <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
                  {tab === t.id && <motion.span className="d-tab-pill" layoutId="tab-pill" transition={spring} />}
                  <span className="d-tab-label">{t.label}</span>
                  {t.id === 'orders' && waiting > 0 && (
                    <motion.span key={waiting} className="d-count" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}>
                      {waiting}
                    </motion.span>
                  )}
                </button>
              ))}
            </nav>
          </LayoutGroup>

          <div className="d-status">
            <LiveClock />
            <label className={`d-open ${open ? '' : 'closed'}`}>
              <i aria-hidden="true" />
              <span>{open ? 'Open' : 'Closed'}</span>
              <Switch on={open} onChange={setOpen} label="Open for orders today" tone="cream" />
            </label>
          </div>
        </div>

        <div className="d-hero">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} className="d-hero-inner" initial="hidden" animate="show" exit="exit" variants={heroVariants}>
              <Hero tab={tab} />
            </motion.div>
          </AnimatePresence>
        </div>
      </header>

      <main className="d-sheet">
        <div className="d-sheet-inner">
          <AnimatePresence initial={false}>
            {!open && (
              <motion.div
                className="d-closed"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 28 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.45, ease }}
              >
                <div>
                  <p><b>Closed for today.</b> Your website shows a note and online orders are paused.</p>
                  <button type="button" onClick={() => setOpen(true)}>Open again</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial="hidden" animate="show" exit="exit" variants={sheet}>
              {tab === 'orders' && <OrdersView />}
              {tab === 'menu' && <MenuView />}
              {tab === 'numbers' && <NumbersView />}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="d-foot">
          <span>Demo with sample data. Changes stay in this browser.</span>
          <button type="button" onClick={() => { actions.reset(); toast({ text: 'Demo started over with fresh sample data.' }); }}>Start the demo over</button>
        </footer>
      </main>
    </div>
  );
}

const heroVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease, staggerChildren: 0.06 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.16, ease: 'easeIn' as const } },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function Hero({ tab }: { tab: Tab }) {
  const orders = useStore((s) => s.orders);
  const menu = useStore((s) => s.menu);
  const toast = useToast();
  const making = orders.filter((o) => o.status === 'new').length;
  const ready = orders.filter((o) => o.status === 'ready').length;
  const sales = useMemo(() => orders.reduce((s, o) => s + orderTotal(o), 0), [orders]);
  const out = menu.filter((m) => m.soldOut).length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const test = () => {
    const id = sendTestOrder();
    const o = getState().orders.find((x) => x.id === id);
    if (o) toast({ text: <>New order from <b>{o.name}</b> for {clock(o.pickupAt)}</> });
    else toast({ text: 'Everything is sold out, so no test order.' });
  };

  if (tab === 'orders') {
    return (
      <>
        <div>
          <motion.p className="d-kicker" variants={rise}>{today}</motion.p>
          <motion.h1 variants={rise}>Good <em>{greeting()}</em>.</motion.h1>
          <motion.p className="d-sub" variants={rise}>
            <CountUp value={making} format={(n) => String(Math.round(n))} duration={0.6} /> to make,{' '}
            <CountUp value={ready} format={(n) => String(Math.round(n))} duration={0.6} /> ready,{' '}
            <CountUp value={sales} format={(n) => `$${n.toFixed(2)}`} duration={0.9} /> booked today
          </motion.p>
        </div>
        <motion.button type="button" className="d-cta" variants={rise} onClick={test} whileTap={{ scale: 0.96 }}>
          <Plus size={17} strokeWidth={2.4} /> Send a test order
        </motion.button>
      </>
    );
  }
  if (tab === 'menu') {
    return (
      <>
        <div>
          <motion.p className="d-kicker" variants={rise}>{menu.length - out} available{out > 0 ? `, ${out} sold out` : ''}</motion.p>
          <motion.h1 variants={rise}>Your <em>menu</em>.</motion.h1>
          <motion.p className="d-sub" variants={rise}>Change a price, swap a photo, switch a dish off. Your website updates the moment you do.</motion.p>
        </div>
        <motion.a className="d-hero-link" variants={rise} href={`${SITE}#menu`} target="_blank" rel="noopener noreferrer">
          Open your website <ArrowUpRight size={16} />
        </motion.a>
      </>
    );
  }
  return (
    <>
      <div>
        <motion.p className="d-kicker" variants={rise}>{weekday} so far</motion.p>
        <motion.h1 variants={rise}>Your <em>numbers</em>.</motion.h1>
        <motion.p className="d-sub" variants={rise}>How today is going and how the week is shaping up.</motion.p>
      </div>
      <motion.button type="button" className="d-hero-link" variants={rise} onClick={() => downloadCsv(orders)}>
        Download today’s orders <ArrowUpRight size={16} />
      </motion.button>
    </>
  );
}

function LiveClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const [hm, ap] = clock(now).split(' ');
  const [h, m] = hm.split(':');
  return (
    <span className="d-clock" aria-label={`Time ${clock(now)}`}>
      {h}<b className={new Date(now).getSeconds() % 2 ? 'dim' : ''}>:</b>{m}<small>{ap}</small>
    </span>
  );
}

function downloadCsv(orders: import('@/lib/store').Order[]) {
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
}
