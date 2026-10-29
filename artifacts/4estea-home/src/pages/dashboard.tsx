import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import logoFullInk from '@assets/logo-full-ink_1787167544226.png';
import { actions, clock, isToday, useStore } from '@/lib/store';
import OrdersView from '@/dashboard/orders';
import MenuView from '@/dashboard/menu';
import NumbersView from '@/dashboard/numbers';
import { Switch, ToastProvider, ease, spring, useToast } from '@/dashboard/ui';
import '@/dashboard.css';

type Tab = 'orders' | 'menu' | 'numbers';
const TABS: { id: Tab; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'menu', label: 'Menu' },
  { id: 'numbers', label: 'Numbers' },
];
const SITE = import.meta.env.BASE_URL;

// Pages slide the way the tabs are ordered, and sharpen as they land.
const pageVariants = {
  enter: (d: number) => ({ opacity: 0, x: d * 34, filter: 'blur(5px)' }),
  show: {
    opacity: 1, x: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' },
    transition: { duration: 0.6, ease, delayChildren: 0.05, staggerChildren: 0.08 },
  },
  exit: (d: number) => ({ opacity: 0, x: d * -26, filter: 'blur(4px)', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const } }),
};

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
  const waiting = orders.filter((o) => o.status !== 'done' && isToday(o.pickupAt)).length;

  useEffect(() => {
    document.title = 'Dashboard · 4ESTEA';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const dir = useRef(1);
  const go = (t: Tab) => {
    if (t === tab) return;
    dir.current = TABS.findIndex((x) => x.id === t) > TABS.findIndex((x) => x.id === tab) ? 1 : -1;
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setOpen = (v: boolean) => {
    actions.setOpen(v);
    toast({
      text: v ? <>You are <b>open</b>. The website is taking orders.</> : <>You are <b>closed</b> today. The website says so.</>,
      action: { label: 'Undo', run: () => actions.setOpen(!v) },
    });
  };

  return (
    <div className="dash">
      <motion.header className="d-top" initial={{ y: -76, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease }}>
        <div className="d-top-inner">
          <a className="d-brand" href={SITE} aria-label="Back to the 4ESTEA website">
            <img src={logoFullInk} alt="" width="859" height="1044" />
            <span>Dashboard</span>
          </a>

          <LayoutGroup id="tabs">
            <nav className="d-tabs" aria-label="Dashboard sections">
              {TABS.map((t) => (
                <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
                  <span>{t.label}</span>
                  {t.id === 'orders' && waiting > 0 && (
                    <motion.span key={waiting} className="d-count" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}>
                      {waiting}
                    </motion.span>
                  )}
                  {tab === t.id && (
                    <motion.svg className="d-tab-mark" layoutId="tab-mark" viewBox="0 0 100 10" preserveAspectRatio="none" transition={spring} aria-hidden="true">
                      <motion.path
                        key={t.id}
                        d="M2 6.5 C 20 3.5, 45 3, 62 4.6 S 92 7.2, 98 4.2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </motion.svg>
                  )}
                </button>
              ))}
            </nav>
          </LayoutGroup>

          <div className="d-status">
            <LiveClock />
            <label className={`d-open ${open ? '' : 'closed'}`}>
              <i aria-hidden="true" />
              <span className="d-open-word">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={open ? 'o' : 'c'} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.3, ease }}>
                    {open ? 'Open' : 'Closed'}
                  </motion.span>
                </AnimatePresence>
              </span>
              <Switch on={open} onChange={setOpen} label="Open for orders today" />
            </label>
          </div>
        </div>
      </motion.header>

      <main className="d-main">
        <AnimatePresence mode="wait" initial={false} custom={dir.current}>
          <motion.div key={tab} custom={dir.current} initial="enter" animate="show" exit="exit" variants={pageVariants}>
            {tab === 'orders' && <OrdersView />}
            {tab === 'menu' && <MenuView />}
            {tab === 'numbers' && <NumbersView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="d-foot">
        <span>Demo with sample data. Changes stay in this browser.</span>
        <button type="button" onClick={() => { actions.reset(); toast({ text: 'Demo started over with a fresh sample day.' }); }}>Start the demo over</button>
      </footer>
    </div>
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
