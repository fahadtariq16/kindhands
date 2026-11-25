import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Copy } from "lucide-react";

type FieldBase = { name: string; label: string; error?: string; hint?: string };

function describedBy(name: string, error?: string, hint?: string) {
  return [error ? `${name}-error` : "", hint ? `${name}-hint` : ""].filter(Boolean).join(" ") || undefined;
}

export function Field({ name, label, error, hint, ...rest }: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="ui-field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy(name, error, hint)} {...rest} />
      {hint && !error && (
        <p id={`${name}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="ui-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({ name, label, error, hint, ...rest }: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="ui-field">
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy(name, error, hint)} {...rest} />
      {hint && !error && (
        <p id={`${name}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="ui-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  name,
  label,
  error,
  hint,
  children,
  ...rest
}: FieldBase & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="ui-field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy(name, error, hint)} {...rest}>
        {children}
      </select>
      {error && (
        <p id={`${name}-error`} className="ui-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="ui-center" role="status">
      <span className="ui-spinner" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="ui-empty">
      <Icon size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="ui-alert" role="alert">
      {message}
    </p>
  );
}

export function SpotsBar({ filled, spots }: { filled: number; spots: number }) {
  const shown = Math.min(spots, 12);
  const on = spots > 12 ? Math.round((filled / spots) * 12) : filled;
  return (
    <span
      className={`ui-spots ${filled >= spots ? "full" : ""}`}
      role="img"
      aria-label={`${filled} of ${spots} spots filled`}
    >
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={i < on ? "on" : ""} />
      ))}
    </span>
  );
}

/** Button that asks "Are you sure?" inline instead of a browser popup. */
export function ConfirmButton({
  children,
  confirmLabel = "Yes, do it",
  onConfirm,
  className = "btn btn-danger btn-sm",
}: {
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking)
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  return (
    <span className="ui-actions" role="group" aria-label="Confirm">
      <button
        type="button"
        className="btn btn-danger btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
      >
        {busy ? "Working…" : confirmLabel}
      </button>
      <button type="button" className="btn btn-glass btn-sm" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ui-copy">
      <input className="ui-input" readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn btn-glass btn-sm"
        onClick={async () => {
          await navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
