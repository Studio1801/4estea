import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, type Transition } from 'framer-motion';

export const ease = [0.16, 1, 0.3, 1] as const;
export const spring: Transition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 };
export const glide: Transition = { type: 'spring', stiffness: 300, damping: 34, mass: 0.9 };

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* Switch: the knob springs across, the track color eases. */
export function Switch({ on, onChange, label, tone = 'leaf' }: { on: boolean; onChange: (v: boolean) => void; label: string; tone?: 'leaf' | 'cream' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`d-switch d-switch--${tone} ${on ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
    >
      <motion.span className="d-knob" layout transition={spring} />
    </button>
  );
}

/* Number that rolls to its new value instead of jumping. */
export function CountUp({ value, format, duration = 1.1, delay = 0 }: { value: number; format: (n: number) => string; duration?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      el.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      delay,
      ease,
      onUpdate: (v) => { el.textContent = format(v); },
    });
    from.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref} className="d-num">{format(0)}</span>;
}

/* Check mark that draws itself. */
export function DrawnCheck({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="M5 12.5l4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.32, ease }}
      />
    </svg>
  );
}

/* Toasts: one at a time, slides up, optional undo. */
type Toast = { id: number; text: ReactNode; action?: { label: string; run: () => void } };
const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((t: Omit<Toast, 'id'>) => {
    clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="d-toast-wrap" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {toast && (
            <motion.div
              key={toast.id}
              className="d-toast"
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.2 } }}
              transition={glide}
            >
              <span>{toast.text}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => { toast.action!.run(); setToast(null); }}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* Page sections enter in sequence, not all at once. */
export const sheet = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease, delayChildren: 0.06, staggerChildren: 0.07 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' as const } },
};
export const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};
