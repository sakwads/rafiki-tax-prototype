import React, { useEffect, useRef, useState } from "react";
import { Button, Icon, IconButton, Radio } from "./ui.jsx";

/* ───────── Checkbox box (table) ───────── */
export function BoxCheck({ checked, mixed, onChange, label }) {
  return (
    <label className="tbl-check" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" className="sr-only" checked={!!checked} aria-label={label}
        ref={(el) => { if (el) el.indeterminate = !!mixed; }} onChange={(e) => onChange(e.target.checked)} />
      <span className={`checkbox ${checked || mixed ? "checkbox--on" : ""}`} aria-hidden="true">
        {checked ? <Icon name="check" size={14} /> : mixed ? <Icon name="minus" size={14} /> : null}
      </span>
    </label>
  );
}

/* ───────── Popover menu (filter chips, page size) ───────── */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const out = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  return { open, setOpen, ref };
}

/* Filter chip: "SOURCE ▾" → pick one option. Shows "Source: Email" when set. */
export function FilterMenu({ label, value, options, onChange, align = "right" }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="pop" ref={ref}>
      <button type="button" className={`chip ${value ? "chip--on" : ""}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        {value ? `${label}: ${value}` : label}<Icon name="chevron-down" size={20} />
      </button>
      {open && (
        <div className={`pop__menu pop__menu--${align}`} role="listbox" aria-label={label}>
          {[["", `Any ${label.toLowerCase()}`], ...options.map((o) => [o, o])].map(([v, l]) => (
            <button key={l} type="button" role="option" aria-selected={value === v} className="pop__item" onClick={() => { onChange(v); setOpen(false); }}>
              <Radio checked={value === v} /><span>{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* "Actions ▾" dropdown: items = [{ label, icon, onClick, disabled }]. Used where phones need several buttons folded into one. */
export function ActionsMenu({ label = "Actions", items, align = "left" }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="pop" ref={ref}>
      <button type="button" className="btn btn--secondary btn--lg" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}<Icon name="chevron-down" size={20} />
      </button>
      {open && (
        <div className={`pop__menu pop__menu--${align}`} role="menu" aria-label={label}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className="pop__item" disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon && <Icon name={it.icon} size={20} />}<span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PageSize({ value, onChange }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="tbl-size">
      <span className="t-body3 c-tertiary" id="rows-per-page">Rows per page</span>
      <div className="pop" ref={ref}>
        <button type="button" className="chip" aria-labelledby="rows-per-page" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
          {value}<Icon name="chevron-down" size={20} />
        </button>
        {open && (
          <div className="pop__menu pop__menu--up" role="listbox" aria-label="Rows per page">
            {[10, 25, 50].map((n) => (
              <button key={n} type="button" role="option" aria-selected={value === n} className="pop__item" onClick={() => { onChange(n); setOpen(false); }}>
                <Radio checked={value === n} /><span>{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* 1 2 3 4 5 … 10 */
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "…", pages];
  if (page >= pages - 3) return [1, "…", pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [1, "…", page - 1, page, page + 1, "…", pages];
}
export function Pagination({ page, pages, onPage }) {
  return (
    <nav className="pager" aria-label="Pages">
      <button type="button" className="pager__btn" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><Icon name="chevron-left" size={16} /></button>
      {pageList(page, pages).map((p, i) => p === "…"
        ? <span key={"e" + i} className="pager__btn pager__btn--gap" aria-hidden="true">…</span>
        : <button key={p} type="button" className={`pager__btn ${p === page ? "pager__btn--on" : ""}`} aria-current={p === page ? "page" : undefined} aria-label={`Page ${p}`} onClick={() => onPage(p)}>{p}</button>)}
      <button type="button" className="pager__btn" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}><Icon name="chevron-right" size={16} /></button>
    </nav>
  );
}

/* ───────── Table ─────────
   columns: [{ key, label, flex, width, align, render(row) }]  */
export function Table({ label, columns, rows, selectable, selected = [], onSelect, onRowClick, rowLabel, empty, loading, skeletonRows = 10 }) {
  const ids = rows.map((r) => r._id);
  const all = ids.length > 0 && ids.every((id) => selected.includes(id));
  const some = !all && ids.some((id) => selected.includes(id));
  const cellStyle = (c) => (c.width ? { width: c.width, minWidth: c.width, flex: "none" } : { flex: `${c.flex || 1} 0 0` });
  return (
    <div className={`tbl ${selectable ? "tbl--sel" : ""}`} role="table" aria-label={label} aria-busy={loading || undefined}>
      <div className="tbl__head" role="row">
        {selectable && <div className="tbl__cell tbl__cell--check" role="columnheader">
          <BoxCheck label="Select all on this page" checked={all} mixed={some} onChange={(v) => onSelect(v ? [...new Set([...selected, ...ids])] : selected.filter((s) => !ids.includes(s)))} />
        </div>}
        {columns.map((c, i) => <div key={c.key} role="columnheader" className={`tbl__cell t-overline ${i === 0 ? "tbl__cell--first" : ""} ${c.align === "right" ? "tbl__cell--right" : ""}`} style={cellStyle(c)}>{c.label}</div>)}
      </div>
      {loading ? Array.from({ length: skeletonRows }, (_, i) => (
        <div key={i} className="tbl__row" role="row" aria-hidden="true">
          {selectable && <div className="tbl__cell tbl__cell--check"><span className="skel" style={{ width: 20, height: 20, borderRadius: 6 }} /></div>}
          {columns.map((c, i) => <div key={c.key} className={`tbl__cell ${i === 0 ? "tbl__cell--first" : ""}`} style={cellStyle(c)}><span className="skel skel--line" style={{ width: c.align === "right" ? "70%" : "80%", marginLeft: c.align === "right" ? "auto" : 0 }} /></div>)}
        </div>
      )) : rows.length === 0 ? empty : rows.map((r) => {
        const on = selected.includes(r._id);
        return (
          <div key={r._id} role="row" className={`tbl__row ${on ? "tbl__row--on" : ""} ${onRowClick ? "tbl__row--click" : ""}`} onClick={onRowClick ? () => onRowClick(r) : undefined}>
            {selectable && <div className="tbl__cell tbl__cell--check" role="cell">
              <BoxCheck label={`Select ${rowLabel ? rowLabel(r) : r._id}`} checked={on} onChange={(v) => onSelect(v ? [...selected, r._id] : selected.filter((s) => s !== r._id))} />
            </div>}
            {columns.map((c, i) => (
              <div key={c.key} role="cell" className={`tbl__cell ${i === 0 ? "tbl__cell--first" : ""} ${c.align === "right" ? "tbl__cell--right" : ""} ${c.className || ""}`} style={cellStyle(c)}>
                {i === 0 && onRowClick
                  ? <button type="button" className="tbl__open" onClick={(e) => { e.stopPropagation(); onRowClick(r); }}>{c.render ? c.render(r) : r[c.key]}</button>
                  : c.render ? c.render(r) : r[c.key]}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function TableFooter({ total, page, size, onPage, onSize, noun = "records", hideSize }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total ? (page - 1) * size + 1 : 0, to = Math.min(total, page * size);
  return (
    <div className="tbl-foot">
      <div className="tbl-foot__left">
        <p className="t-body3 c-tertiary" aria-live="polite">{total === to && from <= 1 && noun === "suppliers" ? `Showing ${total} of ${total} ${noun}` : `Showing ${from} to ${to} of ${total} ${noun}`}</p>
        {!hideSize && <PageSize value={size} onChange={(n) => { onSize(n); onPage(1); }} />}
      </div>
      <Pagination page={page} pages={pages} onPage={onPage} />
    </div>
  );
}

/* "2 selected  CLEAR  REVIEW  EXPORT 2" */
export function SelectionBar({ count, onClear, children }) {
  return (
    <div className="selbar" role="region" aria-label="Selected rows">
      <p className="t-semi2 c-primary" aria-live="polite">{count} selected</p>
      <Button type="tertiary" size="sm" onClick={onClear}>Clear</Button>
      {children}
    </div>
  );
}

/* List / Timeline */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={`seg__btn ${value === v ? "seg__btn--on" : ""}`} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function Progress({ value, label }) {
  return <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><span style={{ width: `${value}%` }} /></div>;
}

/* ───────── Modal ───────── */
export function Modal({ title, icon = "info-circle", onClose, locked, hideClose, children, footer, footClass = "", className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const k = (e) => { if (e.key === "Escape" && !locked) onClose(); };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); prev?.focus?.(); };
  }, [locked]);
  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && !locked) onClose(); }}>
      <div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        <div className="modal__head">
          <Icon name={icon} size={24} />
          <h2 id="modal-title" className="t-h6 c-primary modal__title">{title}</h2>
          {!hideClose && <IconButton icon="x" label="Close" onClick={onClose} disabled={locked} />}
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className={`modal__foot ${footClass}`}>{footer}</div>}
      </div>
    </div>
  );
}

/* Small "M-Pesa" network tag used in the Pays via card */
export function NetworkTag({ network }) {
  return <span className="net-tag t-body3"><Icon name={network === "Bank" ? "building-bank" : "wallet"} size={16} />{network}</span>;
}
