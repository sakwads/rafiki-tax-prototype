import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Icon, Radio, StatusBadge, TextField, toast, wait } from "../components/ui.jsx";
import { AgentSuggestion, EmptyState, Tabs, ksh } from "../components/patterns.jsx";
import { FilterMenu, Modal, Progress, Segmented, SelectionBar, Table, TableFooter } from "../components/table.jsx";
import { DeadlineChart } from "./home.jsx";
import { db } from "../db.js";
import { TODAY } from "../seed.js";
import { BATCH, TRACKER_META, TRACKER_ORDER } from "../data/module3.js";
import { navigate, query } from "../router.js";
import { csvBlob, download, pdfBlob, zipBlob } from "../files.js";

/* ───────── Shared helpers (also used by Suppliers) ───────── */
export const purchCol = () => db.collection("purchases");
export const supCol = () => db.collection("suppliers");
const deadlineCol = () => db.collection("deadlines");
const queueCol = () => db.collection("queue");
const D = (s) => new Date(s + "T00:00:00Z");
export const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 86400000);
export const fmtDate = (iso) => D(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
export const addDays = (iso, n) => new Date(D(iso).getTime() + n * 86400000).toISOString().slice(0, 10);
export const m3Empty = () => db.get("m3")?.scenario === "empty";
const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

// Day N of 30 for a waiting purchase (synced to its deadline when it has one).
export function waitDay(p) {
  const d = p.deadline && deadlineCol().get(p.deadline);
  if (d) return Math.max(1, daysBetween(d.sent, TODAY));
  return p.day || 1;
}
export function PurchaseBadge({ p }) {
  if (p.status === "waiting") return <StatusBadge status="waiting" label={`Day ${waitDay(p)} of 30`} />;
  return <StatusBadge status={p.status} />;
}

// Shared first-visit loading (skeleton rows once per session per page)
const seen = new Set();
export function useFirstLoad(key, ms = 900) {
  const [loading, setLoading] = useState(!seen.has(key));
  useEffect(() => { if (!loading) return; const t = setTimeout(() => { seen.add(key); setLoading(false); }, ms); return () => clearTimeout(t); }, []);
  return loading;
}
export function replayModule3Loading() { seen.clear(); }

export function PageTitle({ title, sub, children }) {
  return (
    <div className="title-row">
      <div className="title-row__text"><h1 className="t-h3 c-primary">{title}</h1><p className="t-body2 c-secondary">{sub}</p></div>
      {children && <div className="title-row__actions">{children}</div>}
    </div>
  );
}

// Hidden file input for "Upload receipt" / "Add evidence"
function useFilePick(onPick) {
  const ref = useRef(null);
  const input = <input ref={ref} type="file" accept="image/*,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPick(f); }} />;
  return [input, () => ref.current?.click()];
}

/* ═════════ 1. Purchases list ═════════ */
const P_TABS = [["all", "All"], ["covered", "Covered"], ["exempt", "Exempt"], ["needs-fixing", "Needs fixing"], ["at-risk", "At risk"]];
const SOURCES = ["Receipt photo", "M-Pesa", "Email", "Buyer invoice"];
const NETWORKS = ["M-Pesa", "Airtel Money", "Bank", "Card"];
const RANGES = { "Last 7 days": 7, "Last 30 days": 30, "Last 90 days": 90 };

export function PurchasesList() {
  const loading = useFirstLoad("purchases");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [network, setNetwork] = useState("");
  const [range, setRange] = useState("");
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [modal, setModal] = useState(null);
  const empty = m3Empty();
  const all = empty ? [] : purchCol().find({}).sort((a, b) => b.date.localeCompare(a.date));
  const rows = all.filter((p) => (tab === "all" || p.status === tab)
    && (!q || `${p.seller} ${p.invoiceNo}`.toLowerCase().includes(q.trim().toLowerCase()))
    && (!source || p.source === source) && (!network || p.payment === network)
    && (!range || daysBetween(p.date, TODAY) <= RANGES[range]));
  const filtered = !!(source || network || range || q);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const pg = Math.min(page, pages);
  const shown = rows.slice((pg - 1) * size, pg * size);
  const reset = (fn) => (v) => { fn(v); setPage(1); };

  const [fileInput, pick] = useFilePick(async (f) => {
    toast(`Reading ${f.name}…`, "loader-2");
    await wait(1400);
    const n = purchCol().count({}) + 1;
    const doc = purchCol().insert({ seller: "Unga Farm Care", invoiceNo: `UFC-${4100 + n}`, date: TODAY, amount: 2450, source: "Receipt photo", payment: "M-Pesa", status: "covered",
      pin: "P051882301U", ref: `Invoice UFC-${4100 + n}`, vat: 337.93, note: "Matched to an eTIMS invoice and an M-Pesa payment.",
      actions: [["secondary", "Export evidence", "pack"]],
      records: [{ icon: "receipt", title: "Receipt, Unga Farm Care", sub: `Photo · ${fmtDate(TODAY)}`, status: "validated" }, { icon: "wallet", title: "eTIMS invoice from Unga Farm Care", sub: `Received · ${fmtDate(TODAY)}`, status: "covered" }],
      suggestion: { tone: "draft", title: "Seller matched to Unga Farm Care", body: "Matched from the PIN on your receipt.", label: "Seller", value: "Unga Farm Care", applied: true } });
    if (empty) db.set("m3", { scenario: "live" });
    toast("Receipt read: Unga Farm Care is covered", "circle-check", { tone: "success", action: { label: "View", onClick: () => navigate(`/purchases/${doc._id}`) } });
  });

  const selRows = all.filter((p) => selected.includes(p._id));
  const columns = [
    { key: "seller", label: "Supplier", flex: 3 },
    { key: "invoiceNo", label: "Invoice no", flex: 2, className: "t-mono-cell", render: (p) => p.invoiceNo && p.source !== "Buyer invoice" ? p.invoiceNo : "-" },
    { key: "date", label: "Date", flex: 2, render: (p) => fmtDate(p.date) },
    { key: "amount", label: "Amount", flex: 2, align: "right", render: (p) => <b>{ksh(p.amount)}</b> },
    { key: "source", label: "Source", flex: 2 },
    { key: "status", label: "Status", width: 200, render: (p) => <PurchaseBadge p={p} /> },
  ];

  return (
    <div className="page">
      {fileInput}
      <PageTitle title="Purchases" sub="Every purchase KRA can see, and what still needs you.">
        <Button type="tertiary" className="btn--lg" icon="hourglass-high" onClick={() => navigate("/purchases/tracker")}>Tracker</Button>
        <Button type="tertiary" className="btn--lg" icon="send" onClick={() => navigate("/purchases/batch")}>Weekly batch</Button>
        <Button type="secondary" className="btn--lg" onClick={() => setModal({ type: "csv" })} disabled={!all.length}>Export</Button>
        <Button className="btn--lg" onClick={pick}>Upload receipt</Button>
      </PageTitle>
      <section className="tcard" aria-label="Purchases">
        <div className="tcard__top">
          <Tabs label="Purchase status" value={tab} onChange={reset(setTab)} tabs={P_TABS} />
          <div className="tcard__tools">
            <div className="tcard__search"><TextField compact leadingIcon="search" placeholder="Search supplier or invoice no" aria-label="Search supplier or invoice no" value={q} onChange={reset(setQ)} /></div>
            <div className="tcard__filters">
              {filtered && <Button type="tertiary" size="sm" icon="filter-x" onClick={() => { setQ(""); setSource(""); setNetwork(""); setRange(""); setPage(1); }}>Clear filters</Button>}
              <FilterMenu label="Source" value={source} options={SOURCES} onChange={reset(setSource)} />
              <FilterMenu label="Network" value={network} options={NETWORKS} onChange={reset(setNetwork)} />
              <FilterMenu label="Date range" value={range} options={Object.keys(RANGES)} onChange={reset(setRange)} />
            </div>
          </div>
          {selected.length > 0 && (
            <SelectionBar count={selected.length} onClear={() => setSelected([])}>
              <Button type="secondary" size="sm" onClick={() => navigate(`/purchases/${selected[0]}`)}>Review</Button>
              <Button size="sm" onClick={() => setModal({ type: "pack", ids: selected })}>Export {selected.length}</Button>
            </SelectionBar>
          )}
        </div>
        <Table label="Purchases" columns={columns} rows={shown} loading={loading} selectable selected={selected} onSelect={setSelected}
          rowLabel={(p) => p.seller} onRowClick={(p) => navigate(`/purchases/${p._id}`)}
          empty={empty
            ? <EmptyState icon="file-text" title="No purchases yet" body="Upload a receipt or forward a supplier invoice and it will show up here." action={<Button className="btn--lg" onClick={pick}>Upload receipt</Button>} />
            : <EmptyState icon="filter-x" title="No purchases match" body="Try another tab, or clear the filters." action={<Button type="secondary" className="btn--lg" onClick={() => { setTab("all"); setQ(""); setSource(""); setNetwork(""); setRange(""); }}>Clear filters</Button>} />} />
        {(loading || rows.length > 0) && <TableFooter total={loading ? 128 : rows.length} page={pg} size={size} onPage={setPage} onSize={setSize} />}
      </section>
      {modal?.type === "pack" && <EvidencePackModal items={selRows} onClose={() => setModal(null)} />}
      {modal?.type === "csv" && <ExportCsvModal overline="Purchases export" onClose={() => setModal(null)}
        noun="purchases" summary={(n, total) => `${ksh(total)} in purchases. Opens in Excel or Google Sheets.`}
        choices={[{ label: `This view: ${P_TABS.find((t) => t[0] === tab)[1]}${filtered ? ", filtered" : ""}`, rows }, { label: "All purchases", rows: all }]}
        dateRange columnsText="Supplier, invoice no, date, amount, source, payment, status"
        file={(i) => `rafiki-purchases-${i === 0 ? tab : "all"}-nov-2026.csv`}
        toCsv={(list) => [["Supplier", "Invoice no", "Date", "Amount (KSh)", "Source", "Payment", "Status"], ...list.map((p) => [p.seller, p.invoiceNo, fmtDate(p.date), p.amount.toFixed(2), p.source, p.payment, p.status === "waiting" ? `Day ${waitDay(p)} of 30` : p.status])]} />}
    </div>
  );
}

/* ═════════ 2. Purchase detail ═════════ */
const SUGGEST_ICONS = { "Day": "clock-hour-3" };
export function PurchaseDetail({ id }) {
  const p = purchCol().get(id);
  const [pack, setPack] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [value, setValue] = useState(p?.suggestion?.value);
  const [busy, setBusy] = useState(false);
  const sref = useRef(null);
  useEffect(() => { setValue(p?.suggestion?.value); setHidden(false); }, [id]);
  const [fileInput, pick] = useFilePick(async (f) => {
    if (!p) return;
    toast(`Reading ${f.name}…`, "loader-2");
    await wait(1200);
    const missing = p.records.findIndex((r) => r.missing);
    if (missing >= 0) {
      const records = p.records.map((r, i) => i === missing ? { icon: "wallet", title: `eTIMS invoice from ${p.seller}`, sub: `Added by you · ${fmtDate(TODAY)}`, status: "covered" } : r);
      purchCol().update(id, { records, status: "covered", note: "Matched to an eTIMS invoice and a payment.", suggestion: { ...p.suggestion, applied: true, appliedText: "Invoice added to the trail" } });
      toast(`${p.seller} is now covered`, "circle-check", { tone: "success" });
    } else {
      purchCol().update(id, { records: [...p.records, { icon: "file-text", title: `Delivery note, ${p.seller}`, sub: `Added by you · ${fmtDate(TODAY)}`, status: "validated" }] });
      toast("Evidence added to the trail", "circle-check", { tone: "success" });
    }
  });
  if (!p) return <EmptyState icon="file-search" title="Purchase not found" body="It may have been removed." action={<Button onClick={() => navigate("/purchases")}>Back to purchases</Button>} />;
  const s = p.suggestion;
  const gaps = p.records.filter((r) => r.missing).length;
  const update = (patch) => purchCol().update(id, patch);

  function act(key) {
    if (key === "pack") return setPack(true);
    if (key === "fix") { sref.current?.scrollIntoView({ behavior: "smooth", block: "center" }); sref.current?.focus({ preventScroll: true }); return; }
    if (key === "remind") return navigate(`/suppliers/${p.supplierId || "sup_njeri"}/remind`);
    if (key === "add") return pick();
    if (key === "ask") return toast(`Request ready for ${p.seller}. You send it, Rafiki only prepares it.`, "send");
    if (key === "declare") {
      const before = { status: p.status, note: p.note, actions: p.actions, suggestion: p.suggestion, ref: p.ref };
      update({ status: "declared", note: "Declared without an eTIMS invoice. This is weaker evidence and subject to KRA review.", actions: [["secondary", "Add evidence", "add"]],
        suggestion: { tone: "neutral", title: "Declared as a non-eTIMS purchase", body: "Recorded for your return. No seller invoice is needed.", label: "Treatment", value: "Declared", applied: true, appliedText: "Saved to your records", why: "You chose to declare it without an invoice." } });
      setValue("Declared");
      return toast("Marked as declared", "file-text", { action: { label: "Undo", onClick: () => { update(before); setValue(before.suggestion.value); } } });
    }
    if (key === "cancel") {
      const before = { status: p.status, note: p.note, actions: p.actions, suggestion: p.suggestion };
      update({ status: "at-risk", note: "Request cancelled. No eTIMS invoice yet, so KRA may disallow this expense.", actions: [["secondary", "Mark as declared", "declare"], ["primary", "Ask seller for invoice", "ask"]],
        suggestion: { tone: "danger", title: "No eTIMS invoice for this purchase", body: "Start a new buyer invoice or declare it.", label: "At risk", value: ksh(p.amount), accept: "Accept", done: "Invoice request ready", why: "The request to the seller was cancelled." } });
      if (p.deadline) deadlineCol().update(p.deadline, { status: "cancelled" });
      setValue(ksh(p.amount));
      return toast("Request cancelled", "x", { action: { label: "Undo", onClick: () => { update(before); setValue(before.suggestion.value); if (p.deadline) deadlineCol().update(p.deadline, { status: "waiting" }); } } });
    }
  }
  async function accept() {
    if (s.go) return navigate(s.go);
    setBusy(true); await wait(600); setBusy(false);
    update({ suggestion: { ...s, applied: true, value } });
    toast(s.done || "Applied", "circle-check", { tone: "success" });
  }

  return (
    <div className="page">
      {fileInput}
      <Button type="tertiary" size="sm" className="back-btn" onClick={() => navigate("/purchases")}>Back to purchases</Button>
      <section className="exp-summary" aria-labelledby="exp-h">
        <div className="exp-summary__head">
          <div className="exp-summary__id"><h1 id="exp-h" className="t-semi1 c-primary">{p.seller}</h1><p className="t-medium2 c-secondary">{p.ref}</p></div>
          <PurchaseBadge p={p} />
        </div>
        <div className="exp-summary__amount">
          <p className="t-overline c-secondary">Total amount</p>
          <p className="t-figure-lg c-primary">{ksh(p.amount)}</p>
          <p className="t-medium2 c-secondary">Incl. VAT {ksh(p.vat)}</p>
        </div>
        <p className="t-medium2 c-primary">{p.note}</p>
        <div className="exp-summary__divider" />
        <div className="exp-facts">
          {[["Supplier PIN", p.pin, true], ["Source", p.source], ["Date", fmtDate(p.date)], ["Payment", p.payment]].map(([k, v, mono]) => (
            <div key={k} className="exp-fact"><p className="t-overline c-secondary">{k}</p><p className={mono ? "t-mono-sm c-primary" : "t-medium2 c-primary"}>{v}</p></div>
          ))}
        </div>
        <div className="actions actions--tight">
          {p.actions.map(([type, label, key]) => <Button key={key} type={type} className="btn--lg" onClick={() => act(key)}>{label}</Button>)}
        </div>
      </section>
      <div className="exp-records">
        <section className="evidence exp-records__main" aria-labelledby="ev-h">
          <div className="evidence__head">
            <div className="evidence__head-text">
              <h2 id="ev-h" className="t-h6 c-primary">Evidence trail</h2>
              <p className="t-body3 c-secondary">{plural(p.records.length, "record")} · oldest first</p>
              {gaps > 0 && <p className="gap-chip t-body3"><Icon name="alert-triangle" size={16} />{plural(gaps, "record")} missing. The pack will list the gap.</p>}
            </div>
            <Button type="tertiary" size="sm" icon="download" onClick={() => setPack(true)}>Export</Button>
          </div>
          <ol className="trail">
            {p.records.map((r, i) => (
              <li key={r.title + i} className={`trail-item ${r.missing ? "trail-item--missing" : ""}`}>
                <span className="trail-marker" aria-hidden="true">
                  <span className={`trail-marker__line ${i > 0 ? "trail-marker__line--on" : ""} ${r.missing ? "trail-marker__line--dash" : ""}`} />
                  <span className="trail-marker__node" />
                  <span className={`trail-marker__line ${i < p.records.length - 1 ? "trail-marker__line--on" : ""}`} />
                </span>
                <div className={`ev-row ${r.missing ? "ev-row--missing" : ""}`}>
                  <span className="icon-chip"><Icon name={r.icon} size={20} /></span>
                  <div className="ev-row__text"><p className="t-semi2 c-primary">{r.title}</p><p className="t-body3 c-secondary">{r.sub}</p></div>
                  <div className="queue-row__meta">{!r.missing && <p className="t-figure c-primary">{ksh(p.amount)}</p>}<StatusBadge status={r.status} /></div>
                  {r.missing
                    ? <Button type="tertiary" size="sm" onClick={pick}>Add</Button>
                    : <Button type="tertiary" size="sm" onClick={() => toast("Records open in Evidence (Module 5).", "file-search")}>Open</Button>}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div className="exp-records__aside">
          {s && !hidden && (
            <AgentSuggestion sectionRef={sref} tone={s.tone} title={s.title} body={s.body} label={s.label} value={s.applied ? s.value : value} why={s.why}
              applied={s.applied} appliedText={s.appliedText} editable={!!s.editValue}
              onValueChange={setValue} onAlt={() => { if (s.editValue && value === s.value) setValue(s.editValue); }}
              onUndo={() => { update({ suggestion: { ...s, applied: false } }); toast("Undone", "refresh"); }}
              acceptLabel={s.accept || "Accept"} busy={busy} onAccept={accept}
              onDismiss={() => { setHidden(true); toast("Suggestion dismissed", "x", { action: { label: "Undo", onClick: () => setHidden(false) } }); }} />
          )}
        </div>
      </div>
      {pack && <EvidencePackModal items={[p]} onClose={() => setPack(false)} />}
    </div>
  );
}

/* ═════════ Evidence pack modal (one or several purchases) ═════════ */
export function EvidencePackModal({ items, onClose }) {
  const [phase, setPhase] = useState("preview");
  const [format, setFormat] = useState("PDF");
  const [done, setDone] = useState(0);
  const cancelled = useRef(false);
  const one = items.length === 1 ? items[0] : null;
  const records = items.flatMap((p) => p.records.map((r) => ({ ...r, p })));
  const gaps = records.filter((r) => r.missing).length;
  const total = sum(items);
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const name = `evidence-${one ? `${slug(one.seller)}-${slug(one.invoiceNo || "declared")}` : `${items.length}-purchases`}.${format === "PDF" ? "pdf" : "zip"}`;
  const kb = 120 + records.length * 96;

  async function build() {
    cancelled.current = false; setPhase("building"); setDone(0);
    for (let i = 1; i <= records.length; i++) { await wait(450); if (cancelled.current) return; setDone(i); }
    await wait(300); if (!cancelled.current) setPhase("ready");
  }
  function save() {
    const lines = items.flatMap((p) => [`${p.seller} - ${p.ref} - ${ksh(p.amount)} - ${fmtDate(p.date)}`, ...p.records.map((r, i) => `   ${i + 1}. ${r.title} (${r.sub}) - ${r.missing ? "MISSING" : r.status}`), ""]);
    if (gaps) lines.push(`Gaps listed: ${gaps}. Rafiki could not find these records.`);
    if (format === "PDF") download(name, pdfBlob("Rafiki Tax evidence pack", ["Prepared by Rafiki for Wanjiku Fresh Greens Ltd (P051234567Z)", `Total ${ksh(total)} - ${records.length} records, oldest first`, "", ...lines]));
    else download(name, zipBlob(records.map((r, i) => ({ name: `${String(i + 1).padStart(2, "0")}-${slug(r.title)}.txt`, text: `${r.title}\n${r.sub}\nStatus: ${r.missing ? "MISSING" : r.status}\nPurchase: ${r.p.seller}, ${r.p.ref}, ${ksh(r.p.amount)}\n` }))));
    toast("Pack downloaded", "download", { tone: "success" }); onClose();
  }
  const head = (
    <div className="modal__lead">
      <p className="t-overline c-secondary">Evidence pack</p>
      <p className="t-h4 c-primary">{one ? one.seller : plural(items.length, "purchase")}</p>
      <p className="t-body2 c-secondary">{one ? `${one.ref} · ${ksh(one.amount)}. ${plural(records.length, "record")}, oldest first.` : `${ksh(total)} in total. ${plural(records.length, "record")}, ${gaps ? `${plural(gaps, "gap")} listed` : "all found"}.`}</p>
    </div>
  );
  if (phase === "ready") return (
    <Modal title="Your pack is ready" icon="circle-check" onClose={onClose} footer={<><Button type="secondary" className="btn--lg" onClick={onClose}>Close</Button><Button className="btn--lg" onClick={save}>Download pack</Button></>}>
      <StatusBadge status="file-ready" />
      <div className="file-box"><Icon name={format === "PDF" ? "file-type-pdf" : "file-zip"} size={24} /><div><p className="t-medium2 c-primary">{name}</p><p className="t-body3 c-secondary">{plural(records.length, "record")} · {gaps ? `${plural(gaps, "gap")} listed` : "no gaps"} · {kb} KB</p></div></div>
      <p className="t-body2 c-primary">Hand it to KRA or your accountant. Rafiki does not send it for you.</p>
    </Modal>
  );
  if (phase === "building") return (
    <Modal title="Building the pack" icon="file-export" locked={false} onClose={() => { cancelled.current = true; onClose(); }}
      footer={<><Button type="secondary" className="btn--lg" onClick={() => { cancelled.current = true; setPhase("preview"); }}>Cancel</Button><Button className="btn--lg" loading>Building…</Button></>}>
      {head}
      <Progress value={(done / records.length) * 100} label="Building the pack" />
      <p className="t-body3 c-secondary" aria-live="polite">Building the pack… {done} of {records.length} records</p>
    </Modal>
  );
  return (
    <Modal title="Build evidence pack" icon="file-export" onClose={onClose} footer={<><Button type="secondary" className="btn--lg" onClick={onClose}>Cancel</Button><Button className="btn--lg" onClick={build}>Build pack</Button></>}>
      {head}
      {one ? (
        <ul className="pack-list">
          {one.records.map((r) => (
            <li key={r.title} className={`pack-rec ${r.missing ? "pack-rec--missing" : ""}`}>
              <span className="icon-chip"><Icon name={r.icon} size={20} /></span>
              <div className="ev-row__text"><p className="t-semi2 c-primary">{r.title}</p><p className="t-body3 c-secondary">{r.sub}</p></div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="pack-many">
          <p className="t-overline c-secondary">{plural(items.length, "purchase")}</p>
          {items.map((p) => { const g = p.records.filter((r) => r.missing).length; return (
            <div key={p._id} className="pack-many__row"><p className="t-semi2 c-primary">{p.seller}</p><p className="t-body3 c-secondary">{plural(p.records.length, "record")} · {g ? `${plural(g, "gap")}` : "complete"}</p></div>
          ); })}
        </div>
      )}
      {gaps > 0 && <Alert tone="warning" title={`${plural(gaps, "record")} ${gaps === 1 ? "is" : "are"} missing`}>The pack will list the gap. You can still build it.</Alert>}
      <fieldset className="modal__group">
        <legend className="t-overline c-secondary">Format</legend>
        {[["PDF", "PDF, one file to read or print"], ["ZIP", "ZIP, every record as its own file"]].map(([v, l]) => (
          <label key={v} className="choice"><input type="radio" className="sr-only" name="pack-format" checked={format === v} onChange={() => setFormat(v)} /><Radio checked={format === v} /><span className="t-medium2 c-primary">{l}</span></label>
        ))}
      </fieldset>
    </Modal>
  );
}

/* ═════════ Export CSV modal ═════════ */
const DATE_RANGES = [["Last 30 days", 30], ["Last 90 days", 90], ["This year", 365], ["All time", 9999]];
export function ExportCsvModal({ overline, choices, summary, noun = "invoices", dateField = "date", dateRange, columnsText, toCsv, file, onClose }) {
  const [choice, setChoice] = useState(0);
  const [range, setRange] = useState(1);
  const [phase, setPhase] = useState("options");
  const cancelled = useRef(false);
  const days = DATE_RANGES[range][1];
  const rows = choices[choice].rows.filter((r) => !dateRange || !r[dateField] || daysBetween(r[dateField], TODAY) <= days);
  const from = days > 1000 ? "the start" : D(addDays(TODAY, -days)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const name = file(choice);
  const lead = (
    <div className="modal__lead">
      <p className="t-overline c-secondary">{overline}</p>
      <p className="t-h4 c-primary">{plural(rows.length, noun.replace(/s$/, ""), noun)}</p>
      <p className="t-body2 c-secondary">{summary(rows.length, sum(rows))}</p>
    </div>
  );
  async function prep() { cancelled.current = false; setPhase("preparing"); await wait(1500); if (!cancelled.current) setPhase("ready"); }
  if (phase === "ready") return (
    <Modal title="Your CSV is ready" icon="circle-check" onClose={onClose} footer={<><Button type="secondary" className="btn--lg" onClick={onClose}>Close</Button>
      <Button className="btn--lg" onClick={() => { download(name, csvBlob(toCsv(rows))); toast("CSV downloaded", "download", { tone: "success" }); onClose(); }}>Download CSV</Button></>}>
      <StatusBadge status="file-ready" />
      <div className="file-box"><Icon name="file-type-csv" size={24} /><div><p className="t-medium2 c-primary">{name}</p><p className="t-body3 c-secondary">{plural(rows.length, noun.replace(/s$/, ""), noun)} · {Math.max(1, Math.round(rows.length * 0.45))} KB</p></div></div>
      <p className="t-body2 c-primary">Opens in Excel or Google Sheets. Nothing is sent to KRA.</p>
    </Modal>
  );
  if (phase === "preparing") return (
    <Modal title="Preparing your CSV" icon="file-type-csv" onClose={() => { cancelled.current = true; onClose(); }}
      footer={<><Button type="secondary" className="btn--lg" onClick={() => { cancelled.current = true; setPhase("options"); }}>Cancel</Button><Button className="btn--lg" loading>Preparing…</Button></>}>
      {lead}
      <Progress value={60} label="Preparing" />
      <p className="t-body3 c-secondary" aria-live="polite">Preparing {plural(rows.length, noun.replace(/s$/, ""), noun)}…</p>
    </Modal>
  );
  return (
    <Modal title="Export to CSV" icon="file-type-csv" onClose={onClose} footer={<><Button type="secondary" className="btn--lg" onClick={onClose}>Cancel</Button><Button className="btn--lg" disabled={!rows.length} onClick={prep}>Export CSV</Button></>}>
      {lead}
      <fieldset className="modal__group">
        <legend className="t-overline c-secondary">What to include</legend>
        {choices.map((c, i) => (
          <label key={c.label} className="choice"><input type="radio" className="sr-only" name="csv-choice" checked={choice === i} onChange={() => setChoice(i)} /><Radio checked={choice === i} />
            <span className="t-medium2 c-primary">{c.label} ({plural(c.rows.length, noun.replace(/s$/, ""), noun)})</span></label>
        ))}
      </fieldset>
      {dateRange && (
        <div className="field">
          <label className="field__label t-overline c-secondary" htmlFor="csv-range">{noun === "invoices" ? "Sent on" : "Date"}</label>
          <div className="select"><select id="csv-range" value={range} onChange={(e) => setRange(+e.target.value)}>{DATE_RANGES.map(([l], i) => <option key={l} value={i}>{l}</option>)}</select><Icon name="chevron-down" size={20} /></div>
          <p className="t-body3 c-tertiary">{from} to {D(TODAY).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p>
        </div>
      )}
      <div className="modal__note"><p className="t-overline c-secondary">Columns included</p><p className="t-body2 c-primary">{columnsText}</p></div>
    </Modal>
  );
}

/* ═════════ 3. Purchases tracker ═════════ */
const T_TABS = [["waiting", "Waiting on sellers"], ["expiring", "Expiring soon"], ["approved", "Approved"], ["closed", "Rejected or expired"]];
export function trackerWaiting() {
  if (m3Empty()) return [];
  const docs = deadlineCol().find({}).filter((d) => !d.point && d.status !== "cancelled");
  const rank = (d) => { const i = TRACKER_ORDER.indexOf(d._id); return i < 0 ? -1 : i; };
  return docs.sort((a, b) => rank(a) - rank(b) || b.sent.localeCompare(a.sent)).map((d) => {
    const meta = TRACKER_META[d._id] || {};
    const sup = supCol().get(meta.supplierId || d.supplierId);
    const day = Math.max(1, daysBetween(d.sent, TODAY)), left = daysBetween(TODAY, d.expires);
    const next = d.status === "reminded" ? "Reminded today" : left <= 5 ? `Remind ${sup?.pronoun || "them"} today` : "Approve on *222#";
    return { _id: d._id, seller: d.seller, no: meta.no || d.no, sent: d.sent, amount: d.amount, next, left, day, sentOnly: meta.sentOnly || d.fresh,
      supplierId: meta.supplierId || d.supplierId, purchase: meta.purchase, deadline: d };
  });
}

export function TrackerPage() {
  const loading = useFirstLoad("tracker", 700);
  const [view, setView] = useState(query().get("view") || "list");
  const [tab, setTab] = useState(query().get("tab") || "waiting");
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [csv, setCsv] = useState(false);
  const waiting = trackerWaiting();
  const done = m3Empty() ? [] : db.collection("trackerDone").find({});
  const DONE_NEXT = { approved: "None, invoice is on eTIMS", expired: "Start a new invoice", rejected: "Fix the PIN, then resend" };
  const byTab = {
    waiting, expiring: waiting.filter((r) => r.left <= 5),
    approved: done.filter((r) => r.status === "approved").map((r) => ({ ...r, next: DONE_NEXT.approved })),
    closed: done.filter((r) => r.status !== "approved").map((r) => ({ ...r, next: DONE_NEXT[r.status] })),
  };
  const rows = byTab[tab];
  const SUMMARY = {
    waiting: `still waiting on ${plural(rows.length, "seller")}`, expiring: "expiring within 5 days, remind these sellers today",
    approved: "approved in the last 60 days, all on eTIMS", closed: "needs a new invoice, start again from the purchase",
  };
  const shown = rows.slice((page - 1) * size, page * size);
  const allRows = [...waiting, ...byTab.approved, ...byTab.closed];
  const columns = [
    { key: "seller", label: "Supplier", flex: 3 },
    { key: "no", label: "Invoice no", flex: 2, className: "t-mono-cell" },
    { key: "sent", label: "Sent on", flex: 2, render: (r) => fmtDate(r.sent) },
    { key: "amount", label: "Amount", flex: 2, align: "right", render: (r) => <b>{ksh(r.amount)}</b> },
    { key: "next", label: "Seller's next step", flex: 2 },
    { key: "status", label: "Status", width: 200, render: (r) => r.status ? <StatusBadge status={r.status} /> : r.sentOnly ? <StatusBadge status="sent" /> : <StatusBadge status="waiting" label={`Day ${r.day} of 30`} /> },
  ];
  const open = (r) => r.purchase ? navigate(`/purchases/${r.purchase}`) : r.supplierId ? navigate(`/suppliers/${r.supplierId}`) : toast("This seller is not saved as a supplier yet.", "info-circle");
  const startInvoice = () => navigate("/invoices/new");
  const isEmpty = !loading && waiting.length === 0 && tab === "waiting";

  return (
    <div className="page">
      <PageTitle title="Purchases tracker" sub="Invoices you started for sellers who are not on eTIMS yet, and where each one stands.">
        <Button type="secondary" className="btn--lg" onClick={() => setCsv(true)}>Export CSV</Button>
        <Button className="btn--lg" onClick={startInvoice}>Start an invoice</Button>
      </PageTitle>
      <section className="tcard" aria-label="Tracker">
        <div className="tcard__top">
          <Segmented label="View" value={view} onChange={setView} options={[["list", "List"], ["timeline", "Timeline"]]} />
          <Tabs label="Invoice status" value={tab} onChange={(t) => { setTab(t); setSelected([]); setPage(1); }} tabs={T_TABS} />
          {!isEmpty && !loading && rows.length > 0 && <p className="tcard__sum"><span className="t-figure-md c-primary">{ksh(sum(rows))}</span> <span className="t-body2 c-primary">{SUMMARY[tab]}</span></p>}
          {view === "list" && selected.length > 0 && (
            <SelectionBar count={selected.length} onClear={() => setSelected([])}>
              {(tab === "waiting" || tab === "expiring") && <Button type="secondary" size="sm" onClick={() => { const r = rows.find((x) => x._id === selected[0]); navigate(`/suppliers/${r.supplierId}/remind`); }}>Remind</Button>}
              <Button size="sm" onClick={() => { download("rafiki-tracker-selected.csv", csvBlob([["Supplier", "Invoice no", "Sent on", "Amount (KSh)", "Seller's next step"], ...rows.filter((r) => selected.includes(r._id)).map((r) => [r.seller, r.no, fmtDate(r.sent), r.amount.toFixed(2), r.next])])); toast("CSV downloaded", "download", { tone: "success" }); }}>Export {selected.length}</Button>
            </SelectionBar>
          )}
        </div>
        {view === "timeline" && !loading ? (
          (tab === "waiting" || tab === "expiring") && rows.length
            ? <div className="tcard__chart"><DeadlineChart view="week" rows={rows.map((r) => r.deadline).sort((a, b) => a.expires.localeCompare(b.expires))} /></div>
            : <EmptyState icon="hourglass-off" title={rows.length ? "No clocks running here" : "Nothing to draw"} body={rows.length ? "These invoices are finished, so they have no 30-day clock. Switch to List to see them." : "Invoices you start for a seller show up here with a 30-day countdown."} action={<Button type="secondary" className="btn--lg" onClick={() => setView("list")}>Show list</Button>} />
        ) : (
          <>
            <Table label="Buyer-initiated invoices" columns={columns} rows={shown} loading={loading} skeletonRows={6} selectable selected={selected} onSelect={setSelected} rowLabel={(r) => r.seller} onRowClick={open}
              empty={isEmpty
                ? <EmptyState icon="file-text" title="Nothing waiting on sellers" body="Invoices you start for a seller show up here with a 30-day countdown." action={<Button className="btn--lg" onClick={startInvoice}>Start an invoice</Button>} />
                : <EmptyState icon="circle-check" title="Nothing here" body="No invoices in this tab right now." />} />
            {!loading && rows.length > 0 && <TableFooter total={rows.length} page={page} size={size} onPage={setPage} onSize={setSize} />}
          </>
        )}
      </section>
      {csv && <ExportCsvModal overline="Tracker export" onClose={() => setCsv(false)} dateRange dateField="sent"
        summary={(n, total) => tab === "waiting" ? `${ksh(total)} still waiting on sellers. Opens in Excel or Google Sheets.` : `${ksh(total)} in total. Opens in Excel or Google Sheets.`}
        choices={[{ label: `This tab: ${T_TABS.find((t) => t[0] === tab)[1]}`, rows }, { label: "All invoices, every tab", rows: allRows }]}
        columnsText="Supplier, invoice no, sent on, amount, seller's next step, status"
        file={(i) => `rafiki-tracker-${i === 0 ? tab : "all"}-nov-2026.csv`}
        toCsv={(list) => [["Supplier", "Invoice no", "Sent on", "Amount (KSh)", "Seller's next step", "Status"], ...list.map((r) => [r.seller, r.no, fmtDate(r.sent), r.amount.toFixed(2), r.next, r.status || (r.sentOnly ? "Sent to seller" : `Day ${r.day} of 30`)])]} />}
    </div>
  );
}

/* ═════════ 4. Weekly batch review + 5. Bulk send ═════════ */
export function BatchPage() {
  const b = db.get("batch") || { status: "ready", selected: null };
  const selected = b.selected || BATCH.map((r) => r._id);
  const setSel = (ids) => db.set("batch", { ...b, selected: ids });
  const [sending, setSending] = useState(false);
  const rows = BATCH.filter((r) => selected.includes(r._id));
  const columns = [
    { key: "seller", label: "Supplier", flex: 3 },
    { key: "count", label: "Purchases", flex: 2, render: (r) => plural(r.count, "purchase") },
    { key: "latest", label: "Latest", flex: 2, render: (r) => fmtDate(r.latest) },
    { key: "amount", label: "Amount", flex: 2, align: "right", render: (r) => <b>{ksh(r.amount)}</b> },
    { key: "network", label: "Network", flex: 2 },
    { key: "status", label: "Status", width: 200, render: () => <StatusBadge status="draft" /> },
  ];

  function onSent(items) {
    let n = 132 + deadlineCol().count({ fresh: true });
    items.forEach((r) => deadlineCol().insert({ seller: r.seller, amount: r.amount, sent: TODAY, expires: addDays(TODAY, 30), tone: "pending", status: "waiting", fresh: true, no: `RFK-INV-0${n++}`, supplierId: r.supplierId }));
    db.set("batch", { ...b, status: "sent", sentCount: items.length, sentTotal: sum(items) });
    if (queueCol().get("q_batch")) queueCol().update("q_batch", { status: "done" });
  }

  if (b.status !== "ready") return (
    <div className="page">
      <PageTitle title="Weekly batch review" sub="Rafiki prepared these for the week of 9 Nov. Check them, then send for approval." />
      <section className="tcard">
        {b.status === "sent"
          ? <EmptyState icon="send" title="This week's batch is sent" body={`${plural(b.sentCount, "invoice")}, ${ksh(b.sentTotal)}. Sellers have 30 days to approve them on *222#.`} action={<Button className="btn--lg" onClick={() => navigate("/purchases/tracker")}>Open tracker</Button>} />
          : <EmptyState icon="circle-minus" title="You skipped this week" body="Rafiki will prepare next week's batch on Friday. These purchases stay in your records." action={<Button type="secondary" className="btn--lg" onClick={() => db.set("batch", { status: "ready", selected: null })}>Undo skip</Button>} />}
      </section>
    </div>
  );

  return (
    <div className="page">
      <PageTitle title="Weekly batch review" sub="Rafiki prepared these for the week of 9 Nov. Check them, then send for approval.">
        <Button type="secondary" className="btn--lg" onClick={() => { db.set("batch", { ...b, status: "skipped" }); if (queueCol().get("q_batch")) queueCol().update("q_batch", { status: "dismissed" }); toast("Skipped this week", "circle-minus", { action: { label: "Undo", onClick: () => { db.set("batch", { status: "ready", selected: b.selected }); queueCol().update("q_batch", { status: "open" }); } } }); }}>Skip this week</Button>
      </PageTitle>
      <section className="tcard" aria-label="Batch">
        <div className="tcard__top">
          <p className="tcard__sum"><span className="t-figure-md c-primary">{ksh(sum(rows))}</span> <span className="t-body2 c-primary">{rows.length ? `${plural(rows.length, "supplier")}, ready to send for approval` : "nothing selected yet"}</span></p>
          <SelectionBar count={rows.length} onClear={() => setSel([])}>
            <Button type="secondary" size="sm" onClick={() => toast("Each draft opens in the Invoice Builder (Module 4).", "file-invoice")}>Review</Button>
            <Button size="sm" disabled={!rows.length} onClick={() => setSending(true)}>Send {rows.length}</Button>
          </SelectionBar>
        </div>
        <Table label="Drafts in this batch" columns={columns} rows={BATCH} selectable selected={selected} onSelect={setSel} rowLabel={(r) => r.seller}
          onRowClick={(r) => navigate(`/suppliers/${r.supplierId}`)} />
        <TableFooter total={BATCH.length} page={1} size={10} onPage={() => {}} onSize={() => {}} noun="suppliers" />
      </section>
      {sending && <BulkSendModal items={rows} onClose={() => setSending(false)} onSent={onSent} />}
    </div>
  );
}

export function BulkSendModal({ items, onClose, onSent }) {
  const [phase, setPhase] = useState("default");
  const [count, setCount] = useState(0);
  const total = sum(items);
  async function send() {
    setPhase("sending");
    for (let i = 1; i <= items.length; i++) { await wait(550); setCount(i); }
    await wait(250); onSent(items); setPhase("sent");
  }
  const list = (
    <div className="send-list">
      {items.slice(0, 4).map((r) => <div key={r._id} className="send-list__row"><span className="t-medium2 c-primary">{r.seller}</span><span className="t-body2 c-primary">{ksh(r.amount)}</span></div>)}
      {items.length > 4 && <p className="t-body3 c-secondary">+ {plural(items.length - 4, "more seller")}</p>}
    </div>
  );
  if (phase === "sent") return (
    <Modal title="Sent for approval" icon="send" onClose={onClose} footer={<><Button type="secondary" className="btn--lg" onClick={onClose}>Close</Button><Button className="btn--lg" onClick={() => navigate("/purchases/tracker")}>Open tracker</Button></>}>
      <div className="modal__lead"><p className="t-overline c-secondary">Sent total</p><p className="t-h4 c-primary">{ksh(total)}</p></div>
      <StatusBadge status="approved" label="Sent for approval" />
      <p className="t-body2 c-primary">{plural(items.length, "invoice")} sent. Sellers have 30 days to approve them. Follow them in your tracker.</p>
    </Modal>
  );
  return (
    <Modal title={phase === "sending" ? "Sending for approval" : "Send for approval"} icon="send" locked={phase === "sending"} onClose={onClose}
      footer={<><Button type="secondary" className="btn--lg" disabled={phase === "sending"} onClick={onClose}>Cancel</Button>
        <Button className="btn--lg" loading={phase === "sending"} onClick={send}>{phase === "sending" ? "Sending…" : `Send ${plural(items.length, "invoice")}`}</Button></>}>
      <div className="modal__lead">
        <p className="t-overline c-secondary">Total to send</p><p className="t-h4 c-primary">{ksh(total)}</p>
        <p className="t-body2 c-secondary">{phase === "sending" ? "Sending now. Keep this window open." : `${plural(items.length, "seller")} ${items.length === 1 ? "is" : "are"} ready. Review them, then send for approval.`}</p>
      </div>
      {list}
      {phase === "sending" && <><Progress value={(count / items.length) * 100} label="Sending" /><p className="t-body3 c-secondary" aria-live="polite">Sending {count} of {plural(items.length, "invoice")}</p></>}
    </Modal>
  );
}
