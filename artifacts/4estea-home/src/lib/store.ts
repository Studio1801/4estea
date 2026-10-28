import { useSyncExternalStore } from 'react';
import bukoLatte from '@assets/buko-latte_1787167544227.jpg';
import liempoBowl from '@assets/liempo-bowl_1787167544226.jpg';
import originalMatcha from '@assets/original-sticker-matcha_1787167544226.jpg';
import turonBasket from '@assets/turon-basket_1787167544226.jpg';
import adoboCrop from '@assets/crop-adobo.jpg';
import longsilogCrop from '@assets/crop-longsilog.jpg';
import lumpiaCrop from '@assets/crop-lumpia.jpg';
import wingsCrop from '@assets/crop-wings.jpg';

// Demo store. Everything lives in this browser (localStorage), so the
// dashboard and the public page stay in sync without a backend.

export type GroupId = 'bowls' | 'snacks' | 'drinks';
export const groups: { id: GroupId; name: string; short: string; kind: 'food' | 'drinks' }[] = [
  { id: 'bowls', name: 'Rice bowls', short: 'Bowls', kind: 'food' },
  { id: 'snacks', name: 'Snacks', short: 'Snacks', kind: 'food' },
  { id: 'drinks', name: 'Boba, matcha, kape', short: 'Drinks', kind: 'drinks' },
];

export type Item = {
  id: string;
  group: GroupId;
  name: string;
  description: string;
  price: number;
  soldOut: boolean;
  photo?: string;
};

export type OrderLine = { name: string; qty: number; price: number };
export type OrderStatus = 'new' | 'ready' | 'done';
export type Order = {
  id: string;
  number: number;
  name: string;
  lines: OrderLine[];
  note?: string;
  pickupAt: number;
  status: OrderStatus;
};

type State = {
  v: 3;
  day: string;
  open: boolean;
  menu: Item[];
  orders: Order[];
  nextNumber: number;
};

const KEY = '4estea-demo-v3';

const defaultPhotos: Record<string, string> = {
  liempo: liempoBowl,
  longsilog: longsilogCrop,
  adobo: adoboCrop,
  lumpia: lumpiaCrop,
  turon: turonBasket,
  wings: wingsCrop,
  buko: bukoLatte,
  classic: originalMatcha,
};

export const photoFor = (item?: Item) => (item ? item.photo ?? defaultPhotos[item.id] : undefined);

const sampleMenu = (): Item[] => [
  { id: 'liempo', group: 'bowls', name: 'Grilled Liempo Bowl', description: 'Charred pork belly, garlic bits, pickled cucumber and carrot, steamed rice.', price: 14, soldOut: false },
  { id: 'longsilog', group: 'bowls', name: 'Longsilog Bowl', description: 'Garlic fried rice, longganisa, two eggs sunny side up, atchara.', price: 13, soldOut: false },
  { id: 'adobo', group: 'bowls', name: 'Pork Adobo Bowl', description: 'Braised pork, quail eggs, scallions, steamed rice.', price: 13, soldOut: false },
  { id: 'lumpia', group: 'snacks', name: 'Lumpiang Shanghai', description: 'Ten pieces with sweet chili dip.', price: 9, soldOut: false },
  { id: 'turon', group: 'snacks', name: 'Banana Turon', description: 'Banana and jackfruit, fried to a caramel shell.', price: 7, soldOut: false },
  { id: 'wings', group: 'snacks', name: 'Garlic Fried Chicken Wings', description: 'Six pieces, served hot and crisp.', price: 11, soldOut: false },
  { id: 'buko', group: 'drinks', name: 'Buko Latte', description: 'Coconut cream and espresso, over ice.', price: 6.5, soldOut: false },
  { id: 'mango', group: 'drinks', name: 'Mango Matcha', description: 'Ceremonial matcha, mango, coconut milk.', price: 7, soldOut: false },
  { id: 'classic', group: 'drinks', name: 'Classic 4ESTEA Matcha', description: 'Matcha, milk, brown sugar. The one we started with.', price: 6.5, soldOut: false },
];

const todayKey = () => new Date().toDateString();
const MIN = 60_000;

// Small seeded random so the sample day looks the same on every reload.
function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = ['Ana', 'Marco', 'Jess', 'Paolo', 'Lily', 'Bea', 'Carlo', 'Mae', 'Noel', 'Rica', 'Josh', 'Tina', 'Dom', 'Kat', 'Migs', 'Joy', 'Ellie', 'Ben', 'Nina', 'Raf'];
const NOTES = ['Less ice please', 'Extra sweet chili', 'No scallions', 'Extra garlic rice', 'Half sweet', 'Oat milk if you have it'];

function line(menu: Item[], id: string, qty = 1): OrderLine {
  // Fall back to the original dish if the owner removed it from the menu.
  const item = menu.find((m) => m.id === id) ?? sampleMenu().find((m) => m.id === id)!;
  return { name: item.name, qty, price: item.price };
}

function sampleOrders(menu: Item[]): Order[] {
  const now = Date.now();
  const rand = seeded(new Date().getDate() * 7919);
  const ids = menu.map((m) => m.id);
  // Popular things show up more often.
  const weighted = [...ids, 'liempo', 'liempo', 'buko', 'buko', 'lumpia', 'classic'];
  const pick = () => weighted[Math.floor(rand() * weighted.length)];

  const past: Order[] = [];
  const count = 18;
  for (let i = 0; i < count; i++) {
    // Spread over the last five hours, bunched around lunch-ish.
    const t = now - (5 * 60 - Math.pow(i / count, 0.85) * (5 * 60 - 35)) * MIN;
    const a = pick();
    const b = pick();
    const lines = [line(menu, a, rand() < 0.2 ? 2 : 1)];
    if (b !== a && rand() < 0.7) lines.push(line(menu, b));
    past.push({
      id: `p${i}`,
      number: 84 + i,
      name: NAMES[(i * 7) % NAMES.length],
      lines,
      note: rand() < 0.25 ? NOTES[Math.floor(rand() * NOTES.length)] : undefined,
      pickupAt: Math.round(t / MIN) * MIN,
      status: 'done',
    });
  }

  const live: Order[] = [
    { id: 'o1', number: 102, name: 'Marco', lines: [line(menu, 'lumpia', 2)], note: 'Extra sweet chili', pickupAt: now - 6 * MIN, status: 'ready' },
    { id: 'o2', number: 103, name: 'Bea', lines: [line(menu, 'buko'), line(menu, 'turon')], pickupAt: now + 2 * MIN, status: 'ready' },
    { id: 'o3', number: 104, name: 'Jess', lines: [line(menu, 'mango'), line(menu, 'turon')], note: 'Less ice please', pickupAt: now + 8 * MIN, status: 'new' },
    { id: 'o4', number: 105, name: 'Paolo', lines: [line(menu, 'longsilog'), line(menu, 'classic')], pickupAt: now + 19 * MIN, status: 'new' },
    { id: 'o5', number: 106, name: 'Lily', lines: [line(menu, 'adobo'), line(menu, 'wings'), line(menu, 'buko', 2)], pickupAt: now + 31 * MIN, status: 'new' },
    { id: 'o6', number: 107, name: 'Carlo', lines: [line(menu, 'liempo')], note: 'No scallions', pickupAt: now + 46 * MIN, status: 'new' },
  ];
  return [...past, ...live];
}

/* ---------- days ---------- */

export const startOfDay = (d: Date | number) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const sameDay = (a: Date | number, b: Date | number) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const isToday = (t: number) => sameDay(t, Date.now());
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
/** Monday of the week containing d. */
export const weekStart = (d: Date | number) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); };

const TOP_ROTATION = ['Grilled Liempo Bowl', 'Buko Latte', 'Lumpiang Shanghai', 'Grilled Liempo Bowl', 'Classic 4ESTEA Matcha', 'Buko Latte', 'Longsilog Bowl'];

/** A finished day in the sample history: totals and how sales spread over the hours (10 am to 8 pm). */
export function daySummary(date: Date) {
  const d = startOfDay(date);
  const rand = seeded(d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate());
  const dow = d.getDay();
  const weekend = dow === 0 || dow === 6 || dow === 5;
  const orders = Math.round((weekend ? 33 : 24) + rand() * 10);
  const avg = 17 + rand() * 2.6;
  const shape = [0.3, 0.7, 1.2, 1.0, 0.55, 0.45, 0.6, 0.95, 1.1, 0.7, 0.35].map((v) => v * (0.75 + rand() * 0.5));
  const sum = shape.reduce((a, b) => a + b, 0);
  const sales = Math.round(orders * avg);
  return {
    orders,
    sales,
    hours: shape.map((v) => Math.round((v / sum) * sales)),
    top: TOP_ROTATION[(d.getDate() + dow) % TOP_ROTATION.length],
  };
}

const PREORDER_TEMPLATES: { name: string; note?: string; h: number; m: number; lines: [string, number][] }[] = [
  { name: 'Rica', note: 'Office lunch for 12', h: 11, m: 30, lines: [['liempo', 6], ['adobo', 6], ['buko', 12]] },
  { name: 'Joy', note: 'Birthday, extra napkins', h: 15, m: 0, lines: [['lumpia', 4], ['turon', 6], ['classic', 8]] },
  { name: 'Ben', note: 'Team meeting', h: 9, m: 30, lines: [['longsilog', 5], ['buko', 5]] },
  { name: 'Mae', h: 14, m: 0, lines: [['mango', 6], ['turon', 6]] },
  { name: 'Dom', note: 'Side door please', h: 18, m: 0, lines: [['wings', 4], ['lumpia', 3]] },
  { name: 'Kat', note: 'Church group', h: 12, m: 30, lines: [['adobo', 8], ['lumpia', 4], ['classic', 8]] },
];

/** Bigger orders booked for later days, so the week has something to plan around. */
function samplePreorders(menu: Item[]): Order[] {
  const today = startOfDay(Date.now());
  const out: Order[] = [];
  let n = 300;
  for (let i = 1; i <= 13; i++) {
    const day = addDays(today, i);
    const rand = seeded(day.getDate() * 131 + day.getMonth());
    const count = i <= 6 ? (rand() < 0.25 ? 0 : rand() < 0.65 ? 1 : 2) : (rand() < 0.55 ? 0 : 1);
    const used = new Set<number>();
    for (let k = 0; k < count; k++) {
      let t = Math.floor(rand() * PREORDER_TEMPLATES.length);
      while (used.has(t)) t = (t + 1) % PREORDER_TEMPLATES.length;
      used.add(t);
      const tpl = PREORDER_TEMPLATES[t];
      const at = new Date(day); at.setHours(tpl.h, tpl.m, 0, 0);
      out.push({
        id: `pre${i}-${k}`,
        number: n++,
        name: tpl.name,
        note: tpl.note,
        lines: tpl.lines.map(([id, q]) => line(menu, id, q)),
        pickupAt: at.getTime(),
        status: 'new',
      });
    }
  }
  return out;
}

function fresh(menu = sampleMenu()): State {
  return { v: 3, day: todayKey(), open: true, menu, orders: [...sampleOrders(menu), ...samplePreorders(menu)], nextNumber: 108 };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.v === 3 && Array.isArray(parsed.menu)) {
        // New day: keep the menu, start a new set of sample orders.
        if (parsed.day !== todayKey()) return { ...fresh(parsed.menu), open: parsed.open };
        return parsed;
      }
    }
  } catch {
    /* storage unavailable, fall through to sample data */
  }
  return fresh();
}

let state: State = load();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode: keep working in memory */
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      emit();
    }
  });
}

export const getState = () => state;

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => select(state),
  );
}

export const actions = {
  setOpen(open: boolean) {
    commit({ ...state, open });
  },
  updateItem(id: string, patch: Partial<Item>) {
    commit({ ...state, menu: state.menu.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  },
  addItem(group: GroupId) {
    const id = `item-${Date.now().toString(36)}`;
    commit({ ...state, menu: [...state.menu, { id, group, name: '', description: '', price: 0, soldOut: false }] });
    return id;
  },
  removeItem(id: string) {
    commit({ ...state, menu: state.menu.filter((m) => m.id !== id) });
  },
  restoreItem(item: Item, index: number) {
    const menu = [...state.menu];
    menu.splice(Math.min(index, menu.length), 0, item);
    commit({ ...state, menu });
  },
  setStatus(id: string, status: OrderStatus) {
    commit({ ...state, orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)) });
  },
  testOrder() {
    const available = state.menu.filter((m) => !m.soldOut && m.price > 0 && m.name);
    if (!available.length) return null;
    const pick = () => available[Math.floor(Math.random() * available.length)];
    const first = pick();
    const second = pick();
    const lines: OrderLine[] = [{ name: first.name, qty: 1, price: first.price }];
    if (second.id !== first.id) lines.push({ name: second.name, qty: 1, price: second.price });
    const taken = new Set(state.orders.filter((o) => o.status !== 'done').map((o) => o.name));
    const name = NAMES.find((n) => !taken.has(n) && Math.random() < 0.4) ?? NAMES.find((n) => !taken.has(n)) ?? 'Guest';
    const order: Order = {
      id: `t${Date.now()}`,
      number: state.nextNumber,
      name,
      lines,
      note: Math.random() < 0.35 ? NOTES[Math.floor(Math.random() * NOTES.length)] : undefined,
      pickupAt: Date.now() + (12 + Math.floor(Math.random() * 4) * 5) * MIN,
      status: 'new',
    };
    commit({ ...state, orders: [...state.orders, order], nextNumber: state.nextNumber + 1 });
    return order.id;
  },
  reset() {
    commit(fresh());
  },
};

export const orderTotal = (o: Order) => o.lines.reduce((sum, l) => sum + l.qty * l.price, 0);

export const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
export const money2 = (n: number) => `$${n.toFixed(2)}`;

export const clock = (t: number) =>
  new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' AM', ' am').replace(' PM', ' pm');

// Shrinks a phone photo so it stays light enough to keep in the browser.
export function resizePhoto(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
