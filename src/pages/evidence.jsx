import React, { useMemo, useRef, useState } from "react";
import { Button, Icon, Spinner, StatusBadge, TextField, TextLink, toast, useDb, wait } from "../components/ui.jsx";
import { AgentSuggestion, EmptyState, Facts, Tabs, ksh } from "../components/patterns.jsx";
import { FilterMenu, Modal, SelectionBar, Table, TableFooter } from "../components/table.jsx";
import { db } from "../db.js";
import { navigate, query } from "../router.js";
import { EvidencePackModal, PageTitle, fmtDate } from "./purchases.jsx";
import { EXTRA, VIEWS, evidenceFor } from "../data/module5.js";

// Every evidence record is a purchase (Purchases is the source of truth)
const supplierFor = (p) => db.collection("suppliers").find({}).find((s) => s.purchase === p._id || (p.deadline && s.deadline === p.deadline)) || null;
export const evidenceList = () => (db.get("m5")?.scenario === "empty" || db.get("m3")?.scenario === "empty" ? [] : db.collection("purchases").find({}).map((p) => evidenceFor(p, supplierFor(p))));
const m5 = () => db.get("m5") || {};
const setM5 = (patch) => db.set("m5", { ...m5(), ...patch });
function getEvidence(id, view) {
  const p = db.collection("purchases").get(id);
  let e = EXTRA[id] ? structuredClone(EXTRA[id]) : p ? evidenceFor(p, supplierFor(p)) : null;
  if (!e) return null;
  if (id === "unread" && m5().reread) e = { ...e, status: "pending", summary: "Rafiki is reading the new photo. Nothing needs you yet.", cta: "See evidence", ctaAction: null, banner: null, suggestion: null,
    steps: e.steps.map((s, i) => (i === 0 ? { ...s, sub: `Photo ${m5().reread}` } : i === 1 ? { ...s, state: "running", sub: "Reading the new photo" } : s)) };
  const v = VIEWS[view];
  if (v && !(view === "retry" && (m5().retried || []).includes(id))) {
    e = { ...e, ...v };
    if (v.stepPatch) e.steps = e.steps.map((s, i) => (v.stepPatch[i] ? { ...s, ...v.stepPatch[i] } : s));
    if (v.recordPatch) e.records = e.records.map((r, i) => (v.recordPatch[i] ? { ...r, ...v.recordPatch[i] } : r));
    if (v.recordsSoFar) e.records = e.records.slice(0, v.recordsSoFar);
    if (v.steps) e.steps = v.steps; // running has its own steps
  }
  if (view === "paths") e.steps = getEvidence(id).steps;
  return e;
}
const STATUS_LABEL = { exempt: "Exempt", waiting: "Waiting", validated: "Validated", declared: "Declared", "at-risk": "At risk", "needs-fixing": "Needs fixing", lookup: "Lookup failed", draft: "Draft", pending: "Pending" };
const E_TABS = [["all", "All"], ["complete", "Complete"], ["fixing", "Needs fixing"], ["risk", "At risk"], ["declared", "Declared"]];
const IN_TAB = { all: () => true, complete: (e) => e.status === "validated" || e.status === "exempt", fixing: (e) => e.status === "needs-fixing" || e.status === "lookup",
  risk: (e) => e.status === "at-risk", declared: (e) => e.status === "declared" || e.status === "draft" };
const amountText = (e) => (e.amount == null ? "Amount not read" : ksh(e.amount));
// Evidence pack (shared with Purchases) expects purchase-shaped items
const asPack = (e) => ({ ...e, seller: e.seller, ref: e.ref, invoiceNo: e.ref, amount: e.amount || 0,
  records: e.records.map((r) => ({ title: r.title, sub: r.sub, status: r.status, missing: !!r.missing })) });

function Badge({ status }) { return <StatusBadge status={status} label={STATUS_LABEL[status]} />; }

/* ═════════ 1. Evidence index ═════════ */
export function EvidenceIndex() {
  useDb();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [network, setNetwork] = useState("");
  const [range, setRange] = useState("");
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [pack, setPack] = useState(null);
  const empty = db.get("m5")?.scenario === "empty";
  const all = empty ? [] : evidenceList().sort((a, b) => b.date.localeCompare(a.date));
  const rows = all.filter(IN_TAB[tab]).filter((e) => !q || `${e.seller} ${e.ref}`.toLowerCase().includes(q.toLowerCase()))
    .filter((e) => !source || e.source === source).filter((e) => !network || e.payment === network)
    .filter((e) => !range || (new Date("2026-11-17") - new Date(e.date)) / 864e5 <= { "Last 7 days": 7, "Last 30 days": 30, "Last 90 days": 90 }[range]);
  const shown = rows.slice((page - 1) * size, page * size);
  const reset = (fn) => (v) => { fn(v); setPage(1); setSelected([]); };
  const columns = [
    { key: "seller", label: "Supplier", flex: 3 },
    { key: "ref", label: "Reference", flex: 2, className: "t-mono-cell" },
    { key: "date", label: "Date", flex: 2, render: (e) => fmtDate(e.date).replace(/^0/, "") },
    { key: "amount", label: "Amount", flex: 2, align: "right", render: (e) => <b>{e.amount == null ? "Not read" : ksh(e.amount)}</b> },
    { key: "of", label: "Records", flex: 1.4 },
    { key: "status", label: "Evidence", width: 170, render: (e) => <Badge status={e.status} /> },
  ];
  const sel = all.filter((e) => selected.includes(e._id));
  return (
    <div className="page">
      <PageTitle title="Evidence" sub="Every purchase and the records behind it. Open one to see what the agent did.">
        <Button type="tertiary" className="btn--lg" icon="hourglass-high" onClick={() => navigate("/purchases/tracker")}>Tracker</Button>
        <Button type="tertiary" className="btn--lg" icon="send" onClick={() => navigate("/purchases/batch")}>Weekly batch</Button>
        <Button type="secondary" className="btn--lg" disabled={!selected.length} onClick={() => setPack(sel)}>Export pack</Button>
      </PageTitle>
      <section className="tcard" aria-label="Evidence">
        <div className="tcard__top">
          <Tabs label="Evidence status" value={tab} onChange={reset(setTab)} tabs={E_TABS} />
          <div className="tcard__tools">
            <div className="tcard__search"><TextField compact leadingIcon="search" placeholder="Search supplier or reference" aria-label="Search supplier or reference" value={q} onChange={reset(setQ)} /></div>
            <div className="tcard__filters">
              {(q || source || network || range) && <Button type="tertiary" size="sm" icon="filter-x" onClick={() => { setQ(""); setSource(""); setNetwork(""); setRange(""); setPage(1); }}>Clear filters</Button>}
              <FilterMenu label="Source" value={source} options={["Receipt photo", "M-Pesa", "Email", "Buyer invoice"]} onChange={reset(setSource)} />
              <FilterMenu label="Network" value={network} options={["M-Pesa", "Airtel Money", "Bank", "Card"]} onChange={reset(setNetwork)} />
              <FilterMenu label="Date range" value={range} options={["Last 7 days", "Last 30 days", "Last 90 days"]} onChange={reset(setRange)} />
            </div>
          </div>
          {selected.length > 0 && (
            <SelectionBar count={selected.length} onClear={() => setSelected([])}>
              <Button type="secondary" size="sm" onClick={() => navigate(`/evidence/${selected[0]}`)}>Review</Button>
              <Button size="sm" onClick={() => setPack(sel)}>Export {selected.length}</Button>
            </SelectionBar>
          )}
        </div>
        <Table label="Evidence" columns={columns} rows={shown} selectable selected={selected} onSelect={setSelected}
          rowLabel={(e) => e.seller} onRowClick={(e) => navigate(`/evidence/${e._id}`)}
          empty={empty
            ? <EmptyState icon="file-search" title="No evidence yet" body="Upload a receipt or forward a supplier invoice and Rafiki will build the evidence trail for you to review." action={<Button className="btn--lg" onClick={() => navigate("/purchases")}>Upload receipt</Button>} />
            : <EmptyState icon="filter-x" title="Nothing matches" body="Try another tab, or clear the filters." action={<Button type="secondary" className="btn--lg" onClick={() => { setTab("all"); setQ(""); setSource(""); setNetwork(""); setRange(""); }}>Clear filters</Button>} />} />
        {rows.length > 0 && <TableFooter total={rows.length} page={page} size={size} onPage={setPage} onSize={setSize} />}
      </section>
      {pack && <EvidencePackModal items={pack.map(asPack)} onClose={() => setPack(null)} />}
    </div>
  );
}

/* ═════════ 2–5. One purchase: trace, trail, full view ═════════ */
export function EvidenceDetail({ id, full }) {
  useDb();
  const [tab, setTab] = useState(query().get("tab") || "trace");
  const [pack, setPack] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const view = query().get("view"); // running | paths (demo states)
  const e = getEvidence(id, view);
  if (!e) return <EmptyState icon="file-search" title="Not found" body="This evidence record isn't here any more." action={<Button onClick={() => navigate("/evidence")}>Back to Evidence</Button>} />;

  async function act(kind) {
    if (kind === "retry") {
      setBusy(true); await wait(1500); setBusy(false);
      setM5({ retried: [...(m5().retried || []), e._id] });
      toast("KRA answered. The invoice is found and your PIN is on it.", "circle-check", { tone: "success" });
    } else if (kind === "retake") fileRef.current?.click();
    else if (kind === "reissue") toast(`WhatsApp opened with a reissue request to ${e.seller}. You press send.`, "brand-whatsapp", { tone: "success" });
    else if (e.ctaTo) navigate(e.ctaTo);
    else setTab("trail");
  }
  const pick = (f) => {
    setM5({ reread: f.name });
    toast("New photo added. Rafiki is reading it.", "camera", { tone: "success" });
  };

  const trace = <TraceCard e={e} paths={view === "paths"} onCta={() => act(e.ctaAction)} busy={busy} />;
  const trail = <TrailSection e={e} onExport={() => setPack(true)} onOpen={setOpen} onAct={act} onAdd={() => fileRef.current?.click()} />;
  return (
    <div className={`ev ${full ? "ev--full" : ""}`}>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(x) => { const f = x.target.files?.[0]; x.target.value = ""; if (f) e._id === "unread" ? pick(f) : toast("Invoice added. Rafiki will check your PIN on it.", "file-upload", { tone: "success" }); }} />
      <div className="ev__top">
        <nav className="crumbs t-body2" aria-label="Breadcrumb"><a href="#/evidence" className="c-secondary">Evidence</a><Icon name="chevron-right" size={16} /><span className="t-semi2 c-primary" aria-current="page">{e.seller}</span></nav>
        <Button type="tertiary" size="sm" onClick={() => navigate(full ? `/evidence/${e._id}` : `/evidence/${e._id}/full`)}>{full ? "Exit full view" : "Full view"}</Button>
      </div>
      <div className="ev__head">
        <div><p className="t-h6 c-primary">{e.seller}</p><p className="t-body3 c-secondary">{e.kind} · {fmtDate(e.date).replace(/^0/, "")}</p></div>
        <span className="t-figure-md c-primary">{amountText(e)}</span>
        <Badge status={e.status} />
      </div>
      {full ? <>{trace}{trail}</> : (
        <>
          <Tabs label="View" value={tab} onChange={setTab} tabs={[["trace", "Agent trace"], ["trail", "Evidence trail"]]} />
          {tab === "trace" ? trace : trail}
        </>
      )}
      {pack && <EvidencePackModal items={[asPack(e)]} onClose={() => setPack(false)} />}
      {open && (
        <Modal title={open.title} icon={open.icon} onClose={() => setOpen(null)} footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
          <Facts rows={[["Record", open.sub], ["Amount", open.amount == null ? "Not read" : ksh(open.amount)], ["Status", STATUS_LABEL[open.status] || "Waiting"], ["Purchase", `${e.seller}, ${e.ref}`, true]]} />
          <p className="t-body3 c-secondary">The original file is kept exactly as it arrived. It goes into the evidence pack unchanged.</p>
        </Modal>
      )}
    </div>
  );
}

/* Agent trace: summary, then the steps left to right, scrolling inside the card */
const STATE = { done: ["circle-check", "Done"], failed: ["circle-x", "Failed"], running: ["loader-2", "Running"], queued: ["clock-hour-3", "Queued"], needs: ["alert-circle", "Needs you"] };
const KIND = { action: ["user", "Your Action"], agent: ["sparkles-2", "Agent Step"], rule: ["shield", "Rule"], outcome: ["flag", "Outcome"] };
function Node({ s, tag }) {
  const [icon, label] = STATE[s.state] || STATE.done;
  const [kIcon, kLabel] = KIND[s.kind];
  return (
    <div className={`tr-node tr-node--${s.kind} tr-node--${s.state} ${s.tag === "Not taken" ? "tr-node--dim" : ""}`}>
      <span className={`tr-tag tr-tag--${s.kind}`}><Icon name={kIcon} size={14} />{tag || kLabel}</span>
      <div className="tr-card">
        <p className="tr-state t-body3"><Icon name={icon} size={16} className={s.state === "running" ? "spin" : ""} />{s.tag && s.kind === "outcome" ? s.tag : label}</p>
        {s.kind === "outcome" && s.badge ? <><StatusBadge status={s.badge} label={STATUS_LABEL[s.badge] || s.title} /><p className="t-body3 c-secondary">{s.sub}</p></>
          : <><p className="t-semi2 c-primary">{s.title}</p><p className="t-body3 c-secondary">{s.sub}</p></>}
        {s.doc && <span className="tr-doc" aria-hidden="true"><Icon name="receipt" size={16} /></span>}
      </div>
    </div>
  );
}
function Arrow({ label }) {
  return <span className="tr-arrow" aria-hidden="true">{label && <span className="tr-arrow__label t-body3">{label}</span>}<span className="tr-arrow__line" /></span>;
}
function TraceCard({ e, paths, onCta, busy }) {
  const steps = paths ? e.steps.slice(0, 4) : e.steps;
  const meta = e.meta || (`${e.steps.filter((s) => s.kind !== "parallel").length} steps, read only`);
  return (
    <section className="ev-card" aria-label="Agent trace">
      <div><h2 className="t-h6 c-primary">Agent trace</h2><p className="t-body3 c-secondary">{e.kind} · {e.place || e.seller}{e.amount != null ? ` · KSh ${e.amount.toLocaleString("en-KE")}` : ""} · {meta}</p></div>
      <div className="tr-summary">
        <div><p className="tr-summary__lead t-overline"><Icon name="sparkles-2" size={14} />Agent summary</p><p className="t-h6 c-primary tr-summary__text">{e.summary}</p></div>
        <TextLink onClick={onCta} disabled={busy}>{busy ? <><Spinner size={16} />Checking…</> : <>{e.cta}<Icon name="arrow-right" size={16} /></>}</TextLink>
      </div>
      <ol className="tr-flow" tabIndex={0} aria-label="Steps, left to right">
        {steps.map((s, i) => (
          <li key={i} className="tr-step">
            {i > 0 && <Arrow label={s.label} />}
            {s.kind === "parallel"
              ? <div className="tr-par"><span className="tr-tag tr-tag--agent"><Icon name="sparkles-2" size={14} />Runs together</span>{s.items.map((x, j) => <Node key={j} s={x} tag=" " />)}</div>
              : <Node s={s} />}
          </li>
        ))}
        {paths && (
          <li className="tr-step"><Arrow />
            <div className="tr-par">{e.branches.map((b) => (
              <div key={b.label} className={`tr-branch ${b.taken ? "" : "tr-branch--off"}`}><span className="tr-arrow__label t-body3">{b.label}</span><Node s={b.step} tag={b.taken ? "Outcome" : "Not taken"} /></div>
            ))}</div>
          </li>
        )}
        {paths && <li className="tr-step"><Arrow /><Node s={e.steps[4]} /></li>}
      </ol>
    </section>
  );
}

/* Evidence trail: records oldest first, suggestion beside them */
function TrailSection({ e, onExport, onOpen, onAct, onAdd }) {
  const [hidden, setHidden] = useState(false);
  const [applied, setApplied] = useState(false);
  const s = e.suggestion;
  const records = e.records;
  return (
    <div className={`ev-trail ${s && !hidden ? "" : "ev-trail--solo"}`}>
      <section className="ev-card" aria-label="Evidence trail">
        <div className="ev-trail__head">
          <div><h2 className="t-h6 c-primary">Evidence trail</h2><p className="t-body3 c-secondary">{records.length} records{e.status === "pending" ? " so far" : ""} · oldest first</p>
            {e.banner && <p className="ev-banner t-body3"><Icon name="alert-triangle" size={16} />{e.banner}</p>}</div>
          <Button type="tertiary" size="sm" icon="download" onClick={onExport}>Export</Button>
        </div>
        <ol className="ev-recs">
          {records.map((r, i) => (
            <li key={i} className={`ev-rec ${r.missing ? "ev-rec--gap" : ""}`}>
              <span className="ev-rec__icon"><Icon name={r.icon} size={20} /></span>
              <span className="ev-rec__text"><span className="t-semi2 c-primary">{r.title}</span><span className="t-body3 c-secondary">{r.sub}</span></span>
              <span className="ev-rec__end">{r.amount != null && <b className="t-figure">{ksh(r.amount)}</b>}<StatusBadge status={r.status} label={STATUS_LABEL[r.status] || "Waiting"} /></span>
              {r.action === "Retry" ? <Button type="tertiary" size="sm" onClick={() => onAct("retry")}>Retry</Button>
                : r.action === "Add" ? <Button type="tertiary" size="sm" onClick={onAdd}>Add</Button>
                : r.status !== "waiting" && <Button type="tertiary" size="sm" onClick={() => onOpen(r)} aria-label={`Open ${r.title}`}>Open</Button>}
            </li>
          ))}
        </ol>
      </section>
      {s && !hidden && (
        <AgentSuggestion tone={s.tone} title={s.title} body={s.body} label={s.label} value={s.value} why={s.why}
          altLabel={s.alt || "Edit"} onAlt={() => (s.alt === "Upload file" ? onAdd() : s.alt === "Remind me" ? toast("Rafiki will remind you in an hour.", "clock-hour-3") : null)}
          acceptLabel={s.accept} applied={applied} appliedText={s.acceptTo ? "Opened for you" : "Request ready. You press send."} onUndo={() => setApplied(false)} onDismiss={() => setHidden(true)}
          onAccept={() => { if (s.accept === "Retry lookup") onAct("retry"); else if (s.accept === "Retake photo") onAct("retake"); else if (s.acceptTo) navigate(s.acceptTo); else { setApplied(true); onAct("reissue"); } }} />
      )}
    </div>
  );
}
