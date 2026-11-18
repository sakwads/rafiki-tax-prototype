import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ICONS, LOGO_GLYPH } from "../icons.js";
import { db } from "../db.js";

/* ───────── Store hook: re-render when the data store changes ───────── */
export function useDb() {
  return useSyncExternalStore(db.subscribe, db.version);
}

/* ───────── Icon ───────── */
export function Icon({ name, size = 24, className = "", fixedStroke = false, title }) {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title && <title>{title}</title>}
      {paths.map((d, i) =>
        d.startsWith("F:") ? <path key={i} d={d.slice(2)} fill="currentColor" /> :
        <path key={i} d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          vectorEffect={fixedStroke ? "non-scaling-stroke" : undefined} />
      )}
    </svg>
  );
}

export function Spinner({ size = 20 }) {
  return <Icon name="loader-2" size={size} className="spin" />;
}

/* ───────── Buttons ───────── */
export function Button({ type = "primary", size, block, icon, loading, disabled, children, className = "", htmlType = "button", ...rest }) {
  const cls = ["btn", `btn--${type}`, size === "sm" && "btn--sm", block && "btn--block", loading && "btn--loading", className].filter(Boolean).join(" ");
  return (
    <button type={htmlType} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner size={20} /> : icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, type = "tertiary", size = 40, className = "", ...rest }) {
  return (
    <button type="button" className={`icon-btn icon-btn--${size} icon-btn--${type} ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={20} />
    </button>
  );
}

export function TextLink({ children, onClick, size = 2, ...rest }) {
  return (
    <button type="button" className={`link ${size === 3 ? "t-body3" : "t-body2"}`} onClick={onClick} {...rest}>{children}</button>
  );
}

/* ───────── Surface ───────── */
export function Surface({ children, className = "", bodyClass = "" }) {
  return <div className={`surface ${className}`}><div className={`surface__body ${bodyClass}`}>{children}</div></div>;
}

/* ───────── Fields ───────── */
export function ErrorText({ children }) {
  return (
    <div className="error-text" role="alert">
      <Icon name="alert-circle" size={16} />
      <span className="t-body3">{children}</span>
    </div>
  );
}

let fieldCount = 0;
export function useId(prefix = "f") {
  const ref = useRef(null);
  if (!ref.current) ref.current = `${prefix}-${++fieldCount}`;
  return ref.current;
}

export function TextField({ label, required, value, onChange, placeholder, helper, error, prefix, leadingIcon,
  readOnly, inputMode, autoFocus, maxLength, type = "text", onEnter, autoComplete, compact, inputRef, ...rest }) {
  const id = useId();
  const filled = value && String(value).length > 0;
  const cls = ["input", filled && "input--filled", error && "input--error", readOnly && "input--readonly", compact && "input--compact"].filter(Boolean).join(" ");
  return (
    <div className="field">
      {label && (
        <label className="field__label t-label" htmlFor={id}>
          {label}{required && <span className="req">*</span>}
        </label>
      )}
      <div className={cls} onClick={(e) => e.currentTarget.querySelector("input")?.focus()}>
        {leadingIcon && <Icon name={leadingIcon} size={20} />}
        {prefix && (
          <div className="input__prefix">
            <span>{prefix}</span><span className="input__prefix-divider" />
          </div>
        )}
        <input id={id} ref={inputRef} className="input__control" value={value} placeholder={placeholder} type={type}
          readOnly={readOnly} inputMode={inputMode} autoFocus={autoFocus} maxLength={maxLength} autoComplete={autoComplete}
          aria-invalid={error ? true : undefined} aria-describedby={`${id}-help`}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }} {...rest} />
      </div>
      {(error || helper) && (
        <div className="field__helper" id={`${id}-help`}>
          {error ? <ErrorText>{error}</ErrorText> : <span className="t-body3">{helper}</span>}
        </div>
      )}
    </div>
  );
}

/* Six-box SMS / email code */
export function OtpInput({ value, onChange, error, label = "6-digit code", onComplete, autoFocus = true }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const digits = value.split("");
  const active = Math.min(value.length, 5);
  return (
    <div className="field">
      <label className="field__label t-label" htmlFor="otp">{label}</label>
      <div className="otp__row">
        <div className="otp__digits" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => {
            const isFocus = !error && focused && i === active && value.length < 6;
            const cls = ["otp__digit", error && "otp__digit--error", isFocus && "otp__digit--focus"].filter(Boolean).join(" ");
            return <div key={i} className={cls}>{digits[i] || (isFocus ? <span className="otp__caret" /> : "")}</div>;
          })}
        </div>
        <input id="otp" ref={ref} className="otp__input" inputMode="numeric" autoComplete="one-time-code" value={value}
          maxLength={6} aria-invalid={error ? true : undefined}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            onChange(v);
            if (v.length === 6 && onComplete) onComplete(v);
          }} />
      </div>
    </div>
  );
}

export function Radio({ checked }) { return <span className={`radio ${checked ? "radio--on" : ""}`} aria-hidden="true" />; }

export function RadioGroup({ label, options, value, onChange, helper, name }) {
  const id = useId("rg");
  return (
    <div className="radio-group">
      <p className="field__label t-label" id={id}>{label}</p>
      <div className="radio-group__options" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input type="radio" className="sr-only" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
            <Radio checked={value === o.value} />
            <span className="choice__text t-medium2 c-primary">{o.label}</span>
          </label>
        ))}
      </div>
      {helper && <p className="t-body3 c-tertiary">{helper}</p>}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, helper }) {
  return (
    <label className="choice">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`checkbox ${checked ? "checkbox--on" : ""}`} aria-hidden="true">{checked && <Icon name="check" size={14} />}</span>
      <span className="choice__text">
        <span className="t-medium2 c-primary">{label}</span>
        {helper && <span className="t-body3 c-tertiary">{helper}</span>}
      </span>
    </label>
  );
}

/* ───────── Feedback ───────── */
const ALERT_ICON = { info: "info-circle", warning: "alert-triangle", danger: "alert-circle" };
export function Alert({ tone = "info", title, children }) {
  return (
    <div className={`alert alert--${tone}`} role={tone === "info" ? "note" : "alert"}>
      <Icon name={ALERT_ICON[tone]} size={24} />
      <div className="alert__text">
        {title && <p className="alert__title">{title}</p>}
        <p>{children}</p>
      </div>
    </div>
  );
}

const BADGES = {
  covered: { icon: "shield-check", label: "Covered" },
  exempt: { icon: "circle-minus", label: "Exempt" },
  "at-risk": { icon: "alert-circle", label: "At risk" },
  "needs-fixing": { icon: "tool", label: "Needs fixing" },
  validated: { icon: "circle-check", label: "Validated" },
  pending: { icon: "clock-hour-3", label: "Pending" },
  draft: { icon: "pencil", label: "Draft" },
  warning: { icon: "alert-triangle", label: "Warning" },
  expiring: { icon: "clock-hour-3", label: "Expiring" },
  ready: { icon: "pencil", label: "Ready to send" },
  confirm: { icon: "clock-hour-3", label: "Confirm" },
  // Module 3
  waiting: { icon: "clock-hour-3", label: "Waiting" },
  declared: { icon: "file-text", label: "Declared" },
  sent: { icon: "send", label: "Sent to seller" },
  approved: { icon: "circle-check", label: "Approved" },
  expired: { icon: "hourglass-off", label: "Expired" },
  rejected: { icon: "circle-x", label: "Rejected" },
  "on-etims": { icon: "circle-check", label: "On eTIMS" },
  "not-etims": { icon: "alert-triangle", label: "Not on eTIMS" },
  vat: { icon: "alert-triangle", label: "VAT-registered" },
  "not-vat": { icon: null, label: "Not VAT-registered" },
  "not-invoiced": { icon: "clock-hour-3", label: "Not invoiced" },
  "file-ready": { icon: "circle-check", label: "Ready" },
  lookup: { icon: "refresh", label: "Lookup failed" },
};
export function StatusBadge({ status, label, outline }) {
  const b = BADGES[status] || BADGES.draft;
  return (
    <span className={`badge badge--${status} ${outline ? "badge--outline" : ""}`}>
      {b.icon && <Icon name={b.icon} size={16} />}{label || b.label}
    </span>
  );
}

export function ConfidenceBadge({ level = "High" }) {
  return <StatusBadge status="validated" outline label={`${level} confidence`} />;
}

export function OriginTag() {
  return <span className="origin-tag t-body3"><Icon name="sparkles-2" size={16} />Filled by Rafiki</span>;
}

/* ───────── Brand ───────── */
export function LogoMark() {
  return (
    <span className="logo__mark" aria-hidden="true">
      <svg viewBox="0 0 20 20" width="20" height="20"><path d={LOGO_GLYPH} fill="#fff" /></svg>
    </span>
  );
}
export function Logo({ variant }) {
  return (
    <span className={`logo ${variant === "sidebar" ? "logo--sidebar" : ""}`}>
      <LogoMark />
      <span className="logo__word">
        <span className="logo__name t-h5">RafikiTax AI</span>
        <span className="logo__tag t-overline">Tax-ready purchases</span>
      </span>
    </span>
  );
}

export function TrustChip({ children, icon = "shield-check" }) {
  return <span className="trust-chip t-medium2 c-primary"><Icon name={icon} size={20} />{children}</span>;
}

export function PinCard({ name, pin, subtitle = "Business card", onCopy }) {
  return (
    <div className="pin-card">
      <div className="pin-card__header">
        <Icon name="building-store" size={24} />
        <div className="pin-card__text">
          <p className="t-semi2 c-primary">{name}</p>
          <p className="t-body3 c-secondary">{subtitle}</p>
        </div>
      </div>
      <p className="t-mono-lg c-primary" aria-label={`KRA PIN ${pin.split("").join(" ")}`}>{pin}</p>
      <div className="pin-card__qr" role="img" aria-label="QR code for the PIN"><Icon name="qrcode" size={152} fixedStroke /></div>
      <p className="pin-card__note t-body3 c-secondary">Read the PIN or scan the code at the till, before the receipt prints.</p>
      <Button type="olive" icon="copy" block onClick={onCopy}>Copy PIN</Button>
    </div>
  );
}

/* Prototype-only tip: tells testers which values to use. Not part of the design. */
export function ProtoHint({ children }) {
  return <p className="proto-hint" role="note"><span className="proto-hint__tag">Prototype</span><span>{children}</span></p>;
}

/* ───────── Toasts ───────── */
const toastListeners = new Set();
let toasts = [];
const emit = () => toastListeners.forEach((fn) => fn(toasts));
export function dismissToast(id) { toasts = toasts.filter((x) => x.id !== id); emit(); }
// toast("Saved") or toast("Invoice received", "circle-check", { tone: "success", action: { label: "View", onClick } })
export function toast(message, icon = "circle-check", opts = {}) {
  const t = { id: Math.random(), message, icon, ...opts };
  toasts = [...toasts, t]; emit();
  setTimeout(() => dismissToast(t.id), opts.duration || (opts.action ? 9000 : 3200));
}
export function ToastStack() {
  const [list, setList] = useState(toasts);
  useEffect(() => { toastListeners.add(setList); return () => toastListeners.delete(setList); }, []);
  return (
    <div className="toast-stack" aria-live="polite">
      {list.map((t) => t.tone ? (
        <div key={t.id} className={`toast toast--${t.tone}`} role={t.tone === "warning" ? "alert" : "status"}>
          <Icon name={t.icon} size={20} /><span>{t.message}</span>
          {t.action && <Button type="tertiary" size="sm" onClick={() => { dismissToast(t.id); t.action.onClick(); }}>{t.action.label}</Button>}
          <IconButton icon="x" label="Close" onClick={() => dismissToast(t.id)} />
        </div>
      ) : (
        <div key={t.id} className="toast" role="status"><Icon name={t.icon} size={20} />{t.message}</div>
      ))}
    </div>
  );
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); } catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (_) {} ta.remove();
  }
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
