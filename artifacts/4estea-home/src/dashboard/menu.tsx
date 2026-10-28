import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Plus } from 'lucide-react';
import { actions, groups, photoFor, resizePhoto, useStore, type Item } from '@/lib/store';
import { DrawnCheck, Switch, ease, glide, rise, useToast } from './ui';

const priceText = (n: number) => (!n ? '' : Number.isInteger(n) ? String(n) : n.toFixed(2));

export default function MenuView() {
  const menu = useStore((s) => s.menu);
  const [focusId, setFocusId] = useState<string | null>(null);

  return (
    <div className="d-menu">
      {groups.map((g) => {
        const items = menu.filter((m) => m.group === g.id);
        const out = items.filter((m) => m.soldOut).length;
        return (
          <motion.section className="d-group" key={g.id} variants={rise}>
            <div className="d-group-head">
              <div>
                <h2>{g.name}</h2>
                <span>{items.length} {items.length === 1 ? 'dish' : 'dishes'}{out > 0 && <>, <em>{out} sold out</em></>}</span>
              </div>
              <motion.button
                type="button"
                className="d-add"
                whileTap={{ scale: 0.95 }}
                onClick={() => setFocusId(actions.addItem(g.id))}
              >
                <Plus size={16} strokeWidth={2.4} /> Add a dish
              </motion.button>
            </div>
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  className="d-row-wrap"
                  layout="position"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.45, ease }}
                >
                  <MenuRow item={item} autoFocus={item.id === focusId} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.section>
        );
      })}
    </div>
  );
}

function MenuRow({ item, autoFocus }: { item: Item; autoFocus: boolean }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const [price, setPrice] = useState(priceText(item.price));
  const [savedAt, setSavedAt] = useState(0);
  const photo = photoFor(item);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (document.activeElement !== priceRef.current) setPrice(priceText(item.price));
  }, [item.price]);

  // Description grows with its text.
  useEffect(() => {
    const el = descRef.current;
    if (el) { el.style.height = '0px'; el.style.height = `${el.scrollHeight}px`; }
  }, [item.description]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(0), 1600);
    return () => clearTimeout(t);
  }, [savedAt]);

  const saved = () => setSavedAt(Date.now());

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      actions.updateItem(item.id, { photo: await resizePhoto(file) });
      saved();
    } catch {
      /* not an image we can read */
    }
  };

  const setAvailable = (available: boolean) => {
    actions.updateItem(item.id, { soldOut: !available });
    const name = item.name || 'This dish';
    toast({
      text: available ? <><b>{name}</b> is back on the website</> : <><b>{name}</b> shows as sold out</>,
      action: { label: 'Undo', run: () => actions.updateItem(item.id, { soldOut: available }) },
    });
  };

  return (
    <div className={`d-item ${item.soldOut ? 'is-out' : ''}`}>
      <button type="button" className="d-photo" onClick={() => fileRef.current?.click()} aria-label={`Change photo for ${item.name || 'this dish'}`}>
        <AnimatePresence initial={false}>
          {photo ? (
            <motion.img
              key={photo.slice(-32)}
              src={photo}
              alt=""
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease }}
            />
          ) : (
            <motion.span key="empty" className="d-photo-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Camera size={20} />
              <small>Add photo</small>
            </motion.span>
          )}
        </AnimatePresence>
        {photo && <span className="d-photo-hint"><Camera size={16} /> Change</span>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ''; }} />

      <div className="d-item-text">
        <input
          ref={nameRef}
          className="d-item-name"
          value={item.name}
          placeholder="Name the dish"
          aria-label="Dish name"
          onChange={(e) => actions.updateItem(item.id, { name: e.target.value })}
          onBlur={saved}
        />
        <textarea
          ref={descRef}
          className="d-item-desc"
          value={item.description}
          placeholder="One line about it"
          aria-label="Description"
          rows={1}
          onChange={(e) => actions.updateItem(item.id, { description: e.target.value })}
          onBlur={saved}
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
            onBlur={() => { setPrice(priceText(item.price)); saved(); }}
          />
        </label>
        <label className="d-avail">
          <Switch on={!item.soldOut} onChange={setAvailable} label={`${item.name || 'Dish'} available`} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={item.soldOut ? 'out' : 'in'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
            >
              {item.soldOut ? 'Sold out' : 'Available'}
            </motion.span>
          </AnimatePresence>
        </label>
        <AnimatePresence>
          {savedAt > 0 && (
            <motion.span
              className="d-saved"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={glide}
              aria-label="Saved"
            >
              <DrawnCheck size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
