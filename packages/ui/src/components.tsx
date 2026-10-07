/* Design-system primitives (UI_UX.md §4). Every primitive:
   - takes className and forwards refs where useful
   - sources every colour/size from tokens
   - 44px minimum touch targets */

import {
  cloneElement, createContext, Fragment, isValidElement, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactElement, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  const cls = ['ft-btn', `ft-btn--${variant}`, size !== 'md' ? `ft-btn--${size}` : '', className ?? '']
    .filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="ft-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/* ---------------- Field wrappers ---------------- */

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;

  /* The hint and the error have to be announced with the control, not just
     rendered near it (UI_UX.md §8). describedBy is still handed to the render
     prop for callers that need to compose it, but it is applied here too so a
     new field cannot forget it — which is what happened at every call site
     when this was the caller's job. An explicit aria-describedby wins. */
  const control = children(id, describedBy);
  const described =
    describedBy && isValidElement(control) && control.type !== Fragment
      && (control.props as { 'aria-describedby'?: string })['aria-describedby'] === undefined
      ? cloneElement(control as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': describedBy })
      : control;

  return (
    <div className="ft-field">
      <label className="ft-label" htmlFor={id}>{label}</label>
      {hint ? <p className="ft-hint" id={hintId}>{hint}</p> : null}
      {described}
      {error ? <p className="ft-error" id={errId} role="alert">{error}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ft-input ${className ?? ''}`} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ft-input ft-textarea ${className ?? ''}`} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ft-input ft-select ${className ?? ''}`} {...rest}>{children}</select>;
}

/* ---------------- Card ---------------- */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.ComponentProps<'div'>) {
  return <div className={`ft-card ${className ?? ''}`} {...rest}>{children}</div>;
}

/* ---------------- Badge ---------------- */

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'accent' | 'success' | 'danger'; children: ReactNode }) {
  return <span className={`ft-badge ft-badge--${tone}`}>{children}</span>;
}

/* ---------------- Avatar ---------------- */

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const init = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return src
    ? <img className="ft-avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />
    : (
      <span className="ft-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {init}
      </span>
    );
}

/* ---------------- Modal (focus-trapping) ---------------- */

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>('input, button, select, textarea, [tabindex]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && node) {
        const els = Array.from(node.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'));
        if (els.length === 0) return;
        const first = els[0]!;
        const last = els[els.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ft-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ft-modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="ft-modal-head">
          <h2>{title}</h2>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>
        <div className="ft-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Toasts ---------------- */

interface Toast { id: number; text: string; tone: 'info' | 'success' | 'danger' }
const ToastCtx = createContext<{ push: (text: string, tone?: Toast['tone']) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = (text: string, tone: Toast['tone'] = 'info') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="ft-toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`ft-toast ft-toast--${t.tone}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- EmptyState ---------------- */

export function EmptyState({ icon, title, body, action }: { icon?: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="ft-empty">
      {icon ? <div className="ft-empty-icon" aria-hidden="true">{icon}</div> : null}
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

/* ---------------- Skeleton ---------------- */

/* Every error offers a retry that does not lose the user's input, and says a
   cause and a next step rather than a code (UI_UX.md §7). Five screens had a
   .then() with no .catch at all, so a rejected load left their skeletons on
   screen indefinitely. */
export function LoadError({
  message = "We couldn't load this.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <Alert tone="danger">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span>{message} Check your connection and try again.</span>
        <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>
      </div>
    </Alert>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`ft-skeleton ${className ?? ''}`} style={style} aria-hidden="true" />;
}

/* ---------------- Spinner ---------------- */

export function Spinner({ size = 20 }: { size?: number }) {
  return <span className="ft-spinner" style={{ width: size, height: size }} role="status" aria-label="Loading" />;
}

/* ---------------- Alert ---------------- */

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'danger' | 'success'; children: ReactNode }) {
  return <div className={`ft-alert ft-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>{children}</div>;
}
