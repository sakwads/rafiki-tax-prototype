import React, { useEffect, useRef, useState } from "react";
import { Button, ConfidenceBadge, Icon, IconButton, Radio, TextLink } from "./ui.jsx";

export const ksh = (n, dp = 2) => "KSh " + Number(n).toLocaleString("en-KE", { minimumFractionDigits: dp, maximumFractionDigits: dp });

/* ───────── Drawer (side sheet) ───────── */
export function Drawer({ title, onClose, footer, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); prev?.focus?.(); };
  }, []);
  return (
    <div className="drawer-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="drawer__header">
          <h2 className="drawer__title c-primary">{title}</h2>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__footer">{footer}</div>}
      </aside>
    </div>
  );
}

/* Key / value list (drawer facts) */
export function Facts({ rows }) {
  return (
    <dl className="facts">
      {rows.map(([k, v, mono]) => (
        <div key={k} className="fact"><dt className="fact__k">{k}</dt><dd className={`fact__v ${mono ? "fact__v--mono" : ""}`} style={{ margin: 0 }}>{v}</dd></div>
      ))}
    </dl>
  );
}

/* ───────── Agent suggestion ─────────
   Rafiki prepares, the owner decides. tone: warning | info | neutral | draft */
export function AgentSuggestion({ tone = "warning", title, body, label, value, onValueChange, editable, choices,
  acceptLabel = "Accept", altLabel = "Edit", onAccept, onDismiss, onAlt, applied, onUndo, busy, why, appliedText = "Applied to this expense", badge, sectionRef, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  return (
    <section ref={sectionRef} tabIndex={sectionRef ? -1 : undefined} className={`suggest suggest--${tone}`} aria-label={`Rafiki suggests: ${title}`}>
      <div className="suggest__header">
        <Icon name="sparkles-2" size={24} />
        <p className="suggest__title t-semi2 c-primary">{title}</p>
        {badge || <ConfidenceBadge />}
      </div>
      <p className="t-body2 c-secondary">{body}</p>
      <div className="change-box">
        <p className="t-body3 c-secondary">{label}</p>
        {choices ? (
          <div className="suggest__choices" role="radiogroup" aria-label={label}>
            {choices.map((c) => (
              <label key={c} className="choice">
                <input type="radio" className="sr-only" name="suggest-choice" checked={value === c} onChange={() => onValueChange(c)} />
                <Radio checked={value === c} /><span className="t-semi2 c-primary">{c}</span>
              </label>
            ))}
          </div>
        ) : editing ? (
          <textarea aria-label={label} value={value} autoFocus onChange={(e) => onValueChange(e.target.value)} />
        ) : (
          <p className="t-semi2 c-primary">{value}</p>
        )}
      </div>
      {showWhy && why && <p className="t-body3 c-secondary">{why}</p>}
      <div className="suggest__footer">
        {applied ? (
          <>
            <Icon name="circle-check" size={24} />
            <p className="t-semi2 c-primary">{appliedText}</p>
            <span className="suggest__spacer" />
            <TextLink size={3} onClick={onUndo}>Undo</TextLink>
          </>
        ) : (
          <>
            <TextLink size={3} aria-expanded={showWhy} onClick={() => setShowWhy(!showWhy)}>Why?</TextLink>
            <span className="suggest__spacer" />
            {!readOnly && <>
            <Button type="tertiary" size="sm" onClick={onDismiss}>Dismiss</Button>
            <Button type="accent" size="sm" onClick={() => { if (editable) setEditing(!editing); if (onAlt) onAlt(); }}>{editing ? "Done" : altLabel}</Button>
            <Button size="sm" loading={busy} onClick={onAccept}>{acceptLabel}</Button>
            </>}
          </>
        )}
      </div>
    </section>
  );
}

/* ───────── Tabs ───────── */
export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map(([v, l]) => (
        <button key={v} role="tab" className="tab" aria-selected={value === v} onClick={() => onChange(v)}>
          <span className="tab__label">{l}</span><span className="tab__ind" />
        </button>
      ))}
    </div>
  );
}

/* ───────── Sparkline ───────── */
export function Sparkline({ points, className = "kpi__spark" }) {
  const w = 120, h = 32, pad = 3;
  // points are 0..1 (bottom..top of the 32px box)
  const xy = points.map((p, i) => [pad + (i * (w - pad * 2)) / (points.length - 1), h - pad - p * (h - pad * 2)]);
  const last = xy[xy.length - 1];
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
    </svg>
  );
}

/* ───────── Skeletons ───────── */
export const SkelItem = () => (
  <div className="skel-item"><span className="skel skel--circle" /><span className="skel-item__lines"><span className="skel skel--line" /><span className="skel skel--line" style={{ width: 120 }} /></span></div>
);
export const SkelCard = () => (
  <div className="skel-card"><span className="skel skel--block" /><span className="skel skel--heading" /><span className="skel skel--line" /><span className="skel skel--line" style={{ width: 200 }} /></div>
);

/* ───────── Empty state ───────── */
export function EmptyState({ icon = "circle-check", title, body, action }) {
  return (
    <div className="empty">
      <span className="empty__media"><Icon name={icon} size={24} /></span>
      <p className="t-h5 c-primary">{title}</p>
      <p className="t-body2 c-secondary">{body}</p>
      {action}
    </div>
  );
}
