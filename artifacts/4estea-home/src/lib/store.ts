import { useSyncExternalStore } from 'react';
import bukoLatte from '@assets/buko-latte_1787167544227.jpg';
import liempoBowl from '@assets/liempo-bowl_1787167544226.jpg';
import originalMatcha from '@assets/original-sticker-matcha_1787167544226.jpg';
import turonBasket from '@assets/turon-basket_1787167544226.jpg';
import bowlsSpread from '@assets/bowls-spread_1787167544225.jpg';

// Demo store. Everything lives in this browser (localStorage), so the
// dashboard and the public page stay in sync without a backend.

export type GroupId = 'bowls' | 'snacks' | 'drinks';
export const groups: { id: GroupId; name: string; kind: 'food' | 'drinks' }[] = [
  { id: 'bowls', name: 'Rice bowls', kind: 'food' },
  { id: 'snacks', name: 'Snacks', kind: 'food' },
  { id: 'drinks', name: 'Boba, matcha, kape', kind: 'drinks' },
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
  v: 1;
  day: string;
  open: boolean;
  menu: Item[];
  orders: Order[];
  nextNumber: number;
};

const KEY = '4estea-demo-v1';

const defaultPhotos: Record<string, string> = {
  liempo: liempoBowl,
  turon: turonBasket,
  buko: bukoLatte,
  classic: originalMatcha,
  longsilog: bowlsSpread,
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

function line(menu: Item[], id: string, qty = 1): OrderLine {
  const item = menu.find((m) => m.id === id)!;
  return { name: item.name, qty, price: item.price };
}

function sampleOrders(menu: Item[]): Order[] {
  const now = Date.now();
  return [
    { id: 'o1', number: 101, name: 'Ana', lines: [line(menu, 'liempo'), line(menu, 'buko')], pickupAt: now - 25 * MIN, status: 'done' },
    { id: 'o2', number: 102, name: 'Marco', lines: [line(menu, 'lumpia', 2)], note: 'Extra sweet chili', pickupAt: now - 4 * MIN, status: 'ready' },
    { id: 'o3', number: 103, name: 'Jess', lines: [line(menu, 'mango'), line(menu, 'turon')], note: 'Less ice please', pickupAt: now + 9 * MIN, status: 'new' },
    { id: 'o4', number: 104, name: 'Paolo', lines: [line(menu, 'longsilog'), line(menu, 'classic')], pickupAt: now + 22 * MIN, status: 'new' },
    { id: 'o5', number: 105, name: 'Lily', lines: [line(menu, 'adobo'), line(menu, 'wings')], pickupAt: now + 40 * MIN, status: 'new' },
  ];
}

function fresh(menu = sampleMenu()): State {
  return { v: 1, day: todayKey(), open: true, menu, orders: sampleOrders(menu), nextNumber: 106 };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.v === 1 && Array.isArray(parsed.menu)) {
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
  setStatus(id: string, status: OrderStatus) {
    commit({ ...state, orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)) });
  },
  testOrder() {
    const names = ['Rica', 'Noel', 'Bea', 'Carlo', 'Mae', 'Josh', 'Tina', 'Dom'];
    const available = state.menu.filter((m) => !m.soldOut && m.price > 0 && m.name);
    if (!available.length) return null;
    const pick = () => available[Math.floor(Math.random() * available.length)];
    const first = pick();
    const second = pick();
    const lines: OrderLine[] = [{ name: first.name, qty: 1, price: first.price }];
    if (second.id !== first.id) lines.push({ name: second.name, qty: 1, price: second.price });
    const order: Order = {
      id: `o${Date.now()}`,
      number: state.nextNumber,
      name: names[Math.floor(Math.random() * names.length)],
      lines,
      pickupAt: Date.now() + (15 + Math.floor(Math.random() * 3) * 5) * MIN,
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
