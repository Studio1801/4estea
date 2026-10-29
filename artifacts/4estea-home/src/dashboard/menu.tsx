import { forwardRef, useEffect, useMemo, useRef, useState, type ForwardedRef, type ReactElement } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowUpRight, Camera, Plus, Trash2 } from 'lucide-react';
import logoMarkCream from '@assets/logo-mark-cream_1787167544225.png';
import { actions, getState, groups, money, photoFor, resizePhoto, useStore, type GroupId, type Item } from '@/lib/store';
import { Drawer, DrawnCheck, Stamp, Switch, ease, glide, rise, spring, useToast } from './ui';

const SITE = import.meta.env.BASE_URL;
const priceText = (n: number) => (!n ? '' : Number.isInteger(n) ? String(n) : n.toFixed(2));
type Filter = 'all' | GroupId;

export default function MenuView() {
  const menu = useStore((s) => s.menu);
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const visible = useMemo(() => menu.filter((m) => filter === 'all' || m.group === filter), [menu, filter]);
  const out = menu.filter((m) => m.soldOut).length;
  const noPhoto = menu.filter((m) => m.name && !photoFor(m)).length;
  const item = menu.find((m) => m.id === editing);

  const setAvailable = (it: Item, available: boolean) => {
    actions.updateItem(it.id, { soldOut: !available });
    toast({
      text: available ? <><b>{it.name}</b> is back on your website</> : <><b>{it.name}</b> shows as sold out</>,
      action: { label: 'Undo', run: () => actions.updateItem(it.id, { soldOut: available }) },
    });
  };

  const add = () => {
    const id = actions.addItem(filter === 'all' ? 'bowls' : filter);
    setCreated(id);
    setEditing(id);
  };

  const close = () => {
    // A dish added and left blank is dropped quietly.
    const current = getState().menu.find((m) => m.id === editing);
    if (current && !current.name.trim() && current.id === created) actions.removeItem(current.id);
    setEditing(null);
    setCreated(null);
  };

  const remove = (it: Item) => {
    const index = getState().menu.findIndex((m) => m.id === it.id);
    setEditing(null);
    actions.removeItem(it.id);
    toast({ text: <><b>{it.name || 'Dish'}</b> removed from the menu</>, action: { label: 'Undo', run: () => actions.restoreItem(it, index) } });
  };

  return (
    <LayoutGroup id="menu">
      <motion.div className="d-page-head" variants={rise}>
        <div>
          <h1>The <em>menu</em></h1>
          <p className="d-page-sub">
            <b>{menu.length - out}</b> on your website{out > 0 && <>, <b className="d-coral">{out}</b> sold out</>}.
            {noPhoto > 0 ? <> {noPhoto === 1 ? 'One dish needs' : `${noPhoto} dishes need`} a photo.</> : ' Every dish has a photo.'}
          </p>
        </div>
        <div className="d-head-actions">
          <a className="d-link" href={`${SITE}#menu`} target="_blank" rel="noopener noreferrer">See your website <ArrowUpRight size={15} /></a>
          <motion.button type="button" className="d-btn-primary" onClick={add} whileHover={{ y: -2, transition: { type: 'spring', stiffness: 420, damping: 24 } }} whileTap={{ scale: 0.95 }}>
            <Plus size={17} strokeWidth={2.5} /> Add a dish
          </motion.button>
        </div>
      </motion.div>

      <motion.div className="d-filters" variants={rise} role="tablist" aria-label="Filter dishes">
        {([['all', 'Everything'], ...groups.map((g) => [g.id, g.name])] as [Filter, string][]).map(([id, label]) => {
          const n = id === 'all' ? menu.length : menu.filter((m) => m.group === id).length;
          return (
            <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>
              {filter === id && <motion.span className="d-filter-pill" layoutId="filter-pill" transition={spring} />}
              <span>{label}</span><small>{n}</small>
            </button>
          );
        })}
      </motion.div>

      <motion.div className="d-board" variants={rise}>
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.filter((m) => m.name || m.id !== created).map((it, i) => (
            <MenuCard key={it.id} item={it} index={i} onOpen={() => setEditing(it.id)} onAvailable={(v) => setAvailable(it, v)} />
          ))}
        </AnimatePresence>
      </motion.div>

      <Drawer
        open={!!item}
        onClose={close}
        title={item?.id === created && !item?.name ? <>A new <em>dish</em></> : <>Edit <em>dish</em></>}
        footer={item && (
          <>
            <button type="button" className="d-text-btn d-text-btn--danger" onClick={() => remove(item)}><Trash2 size={16} /> Remove dish</button>
            <motion.button type="button" className="d-btn-primary" onClick={close} whileHover={{ y: -2, transition: { type: 'spring', stiffness: 420, damping: 24 } }} whileTap={{ scale: 0.96 }}>Done</motion.button>
          </>
        )}
      >
        {item && <Editor item={item} autoFocus={item.id === created} onAvailable={(v) => setAvailable(item, v)} />}
      </Drawer>
    </LayoutGroup>
  );
}

/* ---------- card ---------- */

const MenuCard = motionForward(function MenuCard({ item, index, onOpen, onAvailable }: { item: Item; index: number; onOpen: () => void; onAvailable: (v: boolean) => void }, ref) {
  const photo = photoFor(item);
  return (
    <motion.article
      ref={ref}
      layout
      className={`d-dish ${item.soldOut ? 'is-out' : ''}`}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { ...glide, delay: Math.min(index, 8) * 0.03 } }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      whileHover={{ y: -5, transition: { type: 'spring', stiffness: 420, damping: 26 } }}
      transition={glide}
    >
      <button type="button" className="d-dish-open" onClick={onOpen} aria-label={`Edit ${item.name}`}>
        <motion.div className="d-dish-photo" layoutId={`photo-${item.id}`} transition={glide}>
          <DishPhoto item={item} photo={photo} />
          <span className="d-price-tag">{money(item.price)}</span>
          <AnimatePresence>{item.soldOut && <Stamp key="out" label="Sold out" tone="coral" rotate={-10} />}</AnimatePresence>
        </motion.div>
        <div className="d-dish-text">
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
      </button>
      <label className="d-dish-foot">
        <Switch on={!item.soldOut} onChange={onAvailable} label={`${item.name} available`} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={item.soldOut ? 'out' : 'in'} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.16 }}>
            {item.soldOut ? 'Sold out today' : 'On the menu'}
          </motion.span>
        </AnimatePresence>
      </label>
    </motion.article>
  );
});

function DishPhoto({ item, photo }: { item: Item; photo?: string }) {
  return (
    <AnimatePresence initial={false}>
      {photo ? (
        <motion.img key={photo.slice(-40)} src={photo} alt="" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }} />
      ) : (
        // No photo yet: a label in the style of the original 4ESTEA cup sticker.
        <motion.div key="label" className={`d-dish-label d-dish-label--${item.group}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <img src={logoMarkCream} alt="" />
          <span>{item.name || 'New dish'}</span>
          <small><Camera size={13} /> Add a photo</small>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- editor ---------- */

function Editor({ item, autoFocus, onAvailable }: { item: Item; autoFocus: boolean; onAvailable: (v: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const [price, setPrice] = useState(priceText(item.price));
  const [savedAt, setSavedAt] = useState(0);
  const photo = photoFor(item);

  useEffect(() => {
    if (autoFocus) setTimeout(() => nameRef.current?.focus(), 350);
  }, [autoFocus]);
  useEffect(() => {
    if (document.activeElement !== priceRef.current) setPrice(priceText(item.price));
  }, [item.price]);
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(0), 1500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const save = (patch: Partial<Item>) => { actions.updateItem(item.id, patch); setSavedAt(Date.now()); };

  return (
    <div className="d-editor">
      <motion.div className="d-editor-photo" layoutId={`photo-${item.id}`} transition={glide}>
        <DishPhoto item={item} photo={photo} />
        <button type="button" className="d-editor-photo-btn" onClick={() => fileRef.current?.click()}>
          <Camera size={16} /> {photo ? 'Replace photo' : 'Add a photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) { try { save({ photo: await resizePhoto(f) }); } catch { /* unreadable */ } }
        }} />
      </motion.div>

      <motion.div className="d-fields" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.4, ease }}>
        <label className="d-field d-field--name">
          <span>Name</span>
          <input ref={nameRef} value={item.name} placeholder="What is it called?" onChange={(e) => actions.updateItem(item.id, { name: e.target.value })} onBlur={() => setSavedAt(Date.now())} />
        </label>
        <label className="d-field">
          <span>Description</span>
          <textarea rows={3} value={item.description} placeholder="One line that makes someone hungry" onChange={(e) => actions.updateItem(item.id, { description: e.target.value })} onBlur={() => setSavedAt(Date.now())} />
        </label>
        <div className="d-field-row">
          <label className="d-field">
            <span>Price</span>
            <div className="d-money">
              <i>$</i>
              <input ref={priceRef} inputMode="decimal" value={price} placeholder="0" onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                setPrice(v);
                const n = parseFloat(v);
                if (!Number.isNaN(n)) actions.updateItem(item.id, { price: n });
              }} onBlur={() => { setPrice(priceText(item.price)); setSavedAt(Date.now()); }} />
            </div>
          </label>
          <label className="d-field">
            <span>Section</span>
            <select value={item.group} onChange={(e) => save({ group: e.target.value as GroupId })}>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
        </div>
        <label className="d-field-switch">
          <div>
            <strong>{item.soldOut ? 'Sold out today' : 'On the menu'}</strong>
            <span>{item.soldOut ? 'Your website shows it as sold out.' : 'Customers can order it now.'}</span>
          </div>
          <Switch on={!item.soldOut} onChange={onAvailable} label="Available" />
        </label>
        <div className="d-saved-line" aria-live="polite">
          <AnimatePresence>
            {savedAt > 0 && (
              <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <DrawnCheck size={16} /> Saved. Your website is up to date.
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* Function component that hands its node to AnimatePresence (needed for popLayout). */
function motionForward<P>(fn: (props: P, ref: ForwardedRef<HTMLElement>) => ReactElement) {
  return forwardRef<HTMLElement, P>(fn as never);
}
