import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu as MenuIcon, X } from 'lucide-react';
import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import { groups, money, photoFor, useStore } from '@/lib/store';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import bowlsSpread from '@assets/bowls-spread_1787167544225.jpg';
import bukoLatte from '@assets/buko-latte_1787167544227.jpg';
import liempoBowl from '@assets/liempo-bowl_1787167544226.jpg';
import originalMatcha from '@assets/original-sticker-matcha_1787167544226.jpg';
import turonBasket from '@assets/turon-basket_1787167544226.jpg';
import logoMarkCream from '@assets/logo-mark-cream_1787167544225.png';
import logoFullCream from '@assets/image_1787172722682.png';
import logoFullInk from '@assets/logo-full-ink_1787167544226.png';

const queryClient = new QueryClient();
const SQUARE_URL = 'https://4estea.square.site/?item=1';
const INSTAGRAM_URL = 'https://www.instagram.com/4estea/';

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`reveal ${className}`}>{children}</div>;
}

function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    document.title = '4ESTEA | Filipino Boba & Cafe in Rancho Cordova';
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12 },
    );
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const menu = useStore((s) => s.menu);
  const open = useStore((s) => s.open);
  const byId = (id: string) => menu.find((m) => m.id === id);
  const liempo = byId('liempo');
  const buko = byId('buko');
  const turon = byId('turon');
  const visibleGroups = groups
    .filter((group) => filter === 'all' || group.kind === filter)
    .map((group) => ({ ...group, items: menu.filter((m) => m.group === group.id && m.name) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="site-shell">
      <header className="hero" id="top">
        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#top" aria-label="4ESTEA home" data-testid="link-home">
            <span className="nav-brand"><img className="nav-logo-lockup" src={logoFullCream} alt="4ESTEA Boba and Café" width="859" height="1044" /></span>
          </a>
          <div className="nav-links">
            <a href="#story" data-testid="link-story">Our story</a>
            <a href="#menu" data-testid="link-menu">Menu</a>
            <a href="#gather" data-testid="link-catering">Catering</a>
            <a href="#visit" data-testid="link-visit">Visit</a>
            <a className="nav-order" href={SQUARE_URL} target="_blank" rel="noopener noreferrer" data-testid="link-order-nav">Order online <ArrowUpRight size={13} /></a>
          </div>
          <button
            className="nav-toggle"
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            data-testid="button-toggle-navigation"
          >
            {mobileOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
          {mobileOpen && (
            <div className="mobile-panel">
              <a href="#story" onClick={() => setMobileOpen(false)} data-testid="link-mobile-story">Our story</a>
              <a href="#menu" onClick={() => setMobileOpen(false)} data-testid="link-mobile-menu">Menu</a>
              <a href="#gather" onClick={() => setMobileOpen(false)} data-testid="link-mobile-catering">Catering</a>
              <a href="#visit" onClick={() => setMobileOpen(false)} data-testid="link-mobile-visit">Visit</a>
              <a href={SQUARE_URL} target="_blank" rel="noopener noreferrer" data-testid="link-mobile-order">Order online <ArrowUpRight size={14} /></a>
            </div>
          )}
        </nav>
        <div className="hero-image">
          <img src={bowlsSpread} alt="A generous table spread of Filipino rice bowls, lumpia and crispy chicken at 4ESTEA" width="768" height="1024" />
        </div>
        <div className="hero-content">
          <div className="hero-kicker eyebrow">Boba · matcha · kape · Filipino flavors</div>
          <h1 className="serif">Rooted in culture, <em>crafted with heart.</em></h1>
          <p className="hero-intro">A warm corner in Rancho Cordova for the flavors we grew up with, made familiar but new, and always meant to be shared.</p>
          <div className="hero-actions">
            <a className="button button-primary" href={SQUARE_URL} target="_blank" rel="noopener noreferrer" data-testid="button-order-hero">Order the good stuff <ArrowUpRight size={15} /></a>
            <a className="button button-ghost" href="#story" data-testid="button-story-hero">Meet 4ESTEA</a>
          </div>
          <div className="hero-note" aria-hidden="true"><span className="hero-note-line" /><span>made to share</span></div>
        </div>
      </header>

      {!open && (
        <div className="closed-note" role="status">
          We are closed today. Check <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a> for when we are back.
        </div>
      )}

      <div className="ticker" aria-label="4ESTEA offerings">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div className="ticker-segment" key={copy}>
              <span className="ticker-item">Rice bowls</span><span className="ticker-dot">·</span>
              <span className="ticker-item">Lumpia for the table</span><span className="ticker-dot">·</span>
              <span className="ticker-item">Matcha made personal</span><span className="ticker-dot">·</span>
              <span className="ticker-item">Kape with a Filipino point of view</span><span className="ticker-dot">·</span>
            </div>
          ))}
        </div>
      </div>

      <main>
        <section className="story" id="story">
          <div className="wrap">
            <Reveal className="story-intro">
              <div>
                <div className="eyebrow">A little background</div>
                <h2 className="serif">Good things take a table.</h2>
              </div>
              <div className="story-intro-copy">
                <strong>Come hungry. Leave with a new favorite.</strong>
                From the first sip to the last grain of garlic rice, 4ESTEA is a gathering place built with generosity in mind.
              </div>
            </Reveal>
            <div className="story-grid">
              <Reveal className="story-photo">
                <img src={originalMatcha} alt="Original 4ESTEA matcha drink with a hand-lettered sticker in sunlight" width="768" height="1024" loading="lazy" />
                <span className="story-stamp script">where it started</span>
              </Reveal>
              <Reveal className="story-copy">
                <img className="story-mark" src={logoFullCream} alt="4ESTEA Boba and Café" width="859" height="1044" loading="lazy" />
                <div className="eyebrow">Our story</div>
                <h3 className="serif">Before the clover, it was a flower drawn in marker.</h3>
                <p>4ESTEA started as a sticker, hand lettered and wrapped around a cup. The name stayed. So did the handwriting, in spirit: every drink and dish still starts from flavors we grew up with, turned into something familiar but new.</p>
                <div className="story-sign script">made with heart</div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="menu-section" id="menu">
          <div className="wrap">
            <Reveal className="menu-heading">
              <div>
                <div className="eyebrow">Pull up a chair</div>
                <h2 className="serif">A menu with something to say.</h2>
              </div>
              <div className="menu-heading-copy">
                <p>Filipino comfort food, bright little surprises, and drinks that make the meal last longer. Browse here, then order online for the full offering.</p>
                <a className="button" href={SQUARE_URL} target="_blank" rel="noopener noreferrer" data-testid="button-order-menu">See the full menu <ArrowUpRight size={15} /></a>
              </div>
            </Reveal>
            <Reveal className="menu-feature">
              <article className="feature-card">
                <img src={photoFor(liempo) ?? liempoBowl} alt="Grilled liempo pork belly bowl with garlic rice and fresh vegetables" width="974" height="768" loading="lazy" />
                <div className="feature-card-copy">
                  <div className="eyebrow">The house favorite</div>
                  <h3>Grilled Liempo Bowl</h3>
                  <p>Charred pork belly, garlic bits, pickles, and steamed rice. The kind of bowl that makes you quiet for a minute.</p>
                </div>
              </article>
              <article className="feature-card feature-card--small">
                <img src={photoFor(buko) ?? bukoLatte} alt="Ice buko latte with coconut cream and espresso surrounded by tropical leaves" width="768" height="1024" loading="lazy" />
                <div className="feature-card-copy">
                  <div className="eyebrow">New on the table</div>
                  <h3>Ice Buko Latte</h3>
                  <p>Coconut cream meets espresso.</p>
                </div>
              </article>
            </Reveal>
            <Reveal className="menu-photo-note">
              <img src={photoFor(turon) ?? turonBasket} alt="Glazed banana turon in a green basket, ready for sharing" width="768" height="1024" loading="lazy" />
              <div><div className="eyebrow">For the sweet tooth</div><p className="serif">Banana Turon</p><span>Caramel shell, soft center, zero leftovers.</span></div>
            </Reveal>
            <div className="menu-categories" aria-label="Filter menu categories">
              {[
                ['all', 'Everything'],
                ['food', 'Food'],
                ['drinks', 'Drinks'],
              ].map(([value, label]) => (
                <button className={`category-pill ${filter === value ? 'active' : ''}`} key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} data-testid={`button-filter-${value}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="menu-list">
              {visibleGroups.map((group) => (
                <Reveal className="menu-group menu-group--visible" key={group.name}>
                  <h3 className="serif">{group.name}<span>{group.kind === 'food' ? 'made to share' : 'made to linger'}</span></h3>
                  {group.items.map((item) => (
                    <div className={`menu-item ${item.soldOut ? 'menu-item--out' : ''}`} key={item.id} data-testid={`menu-item-${item.id}`}>
                      <div><div className="menu-item-name serif">{item.name}</div><div className="menu-item-desc">{item.description}</div></div>
                      <div className="menu-item-price">{item.soldOut ? 'Sold out today' : money(item.price)}</div>
                    </div>
                  ))}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="gather" id="gather">
          <div className="wrap">
            <Reveal className="gather-content">
              <div className="eyebrow">For the whole crew</div>
              <h2 className="serif">Some meals are meant to be shared.</h2>
              <p>Planning a party, office lunch, or a small moment worth making bigger? We pack rice bowls and snacks family style. Send us the headcount and the occasion; we’ll build a spread around it.</p>
              <a className="button" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" data-testid="button-catering-instagram">Ask about catering <ArrowUpRight size={15} /></a>
            </Reveal>
          </div>
        </section>

        <section className="visit" id="visit">
          <div className="wrap">
            <Reveal className="visit-head">
              <div><div className="eyebrow">Come say hi</div><h2 className="serif">Find us in Rancho Cordova.</h2></div>
              <p>Current hours, pop-ups, and the latest good news live on Instagram. Ordering online is the easiest way to find what’s cooking today.</p>
            </Reveal>
            <div className="visit-grid">
              <Reveal className="visit-item"><div className="tiny">Location</div><p>Rancho Cordova,<br />California</p></Reveal>
              <Reveal className="visit-item"><div className="tiny">Before you go</div><p>Check <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" data-testid="link-visit-instagram">Instagram</a> for current hours and updates.</p></Reveal>
              <Reveal className="visit-item"><div className="tiny">Hungry now?</div><p><a href={SQUARE_URL} target="_blank" rel="noopener noreferrer" data-testid="link-visit-order">Order online</a> and we’ll get started.</p></Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-top">
            <a href="#top" className="footer-brand" aria-label="Back to 4ESTEA home" data-testid="link-footer-home"><img className="footer-logo-lockup" src={logoFullInk} alt="4ESTEA Boba and Café" width="859" height="1044" loading="lazy" /></a>
            <nav className="footer-nav" aria-label="Footer navigation">
              <a href="#menu" data-testid="link-footer-menu">Menu</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" data-testid="link-footer-instagram">Instagram <ArrowUpRight size={13} /></a>
              <a href={SQUARE_URL} target="_blank" rel="noopener noreferrer" data-testid="link-footer-order">Order online <ArrowUpRight size={13} /></a>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>4ESTEA, boba and cafe. Rooted in culture, crafted with heart.</span>
            <span>Rancho Cordova, California · © 4ESTEA</span>
            <span className="footer-watermark">Built by Studio 1801</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;