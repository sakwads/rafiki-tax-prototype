import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Icon, IconButton, StatusBadge, TextField, useDb } from "../components/ui.jsx";
import { Drawer, Tabs, ksh } from "../components/patterns.jsx";
import { db } from "../db.js";
import { navigate, query } from "../router.js";
import { evidenceList } from "./evidence.jsx";

/* Literal search over the prototype's own data. Ask Rafiki only finds and explains. */
const short = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const TODAY = "2026-11-17";
const BADGE = { covered: ["validated", "Covered"], "at-risk": ["at-risk", "At risk"], "needs-fixing": ["needs-fixing", "Needs fixing"], declared: ["declared", "Declared"],
  waiting: ["waiting", "Waiting"], exempt: ["exempt", "Exempt"], validated: ["validated", "Complete"], lookup: ["lookup", "Lookup failed"], draft: ["draft", "Draft"], pending: ["pending", "Pending"] };
const SETTINGS = [["Notification settings", "/settings"], ["Connected data", "/settings"], ["Business profile", "/settings"], ["Team and roles", "/settings"]];
const ACTIONS = [["Start a buyer-initiated invoice", "Action · Invoice Builder", "file-invoice", "/invoices/new"], ["Add a supplier", "Action · Suppliers", "user-plus", "/suppliers/new"],
  ["Upload a receipt", "Action · Purchases", "receipt", "/purchases"], ["Export an evidence pack", "Action · Evidence", "download", "/evidence"]];
export const GROUPS = [["suppliers", "Suppliers"], ["purchases", "Purchases"], ["invoices", "Invoices"], ["evidence", "Evidence"], ["settings", "Settings"]];

export function runSearch(q) {
  const s = q.trim().toLowerCase();
  const hit = (...xs) => s && xs.some((x) => String(x || "").toLowerCase().includes(s));
  const sup = db.collection("suppliers").find({}).filter((x) => hit(x.name, x.short, x.phone, x.pin)).map((x) => ({
    id: x._id, icon: "users", title: x.short && x.short !== x.name ? x.name : x.name, sub: `Supplier · ${x.phone || x.pin || ""}`,
    badge: x.etims === false ? ["not-etims", "Not on eTIMS"] : ["on-etims", "On eTIMS"], to: `/suppliers/${x._id}`, s: x }));
  const pur = db.collection("purchases").find({}).filter((x) => hit(x.seller, x.invoiceNo, x.amount)).map((x) => ({
    id: x._id, icon: "shopping-cart", title: x.seller, sub: `Purchase · ${ksh(x.amount)} · ${short(x.date)}`, badge: BADGE[x.status], to: `/purchases/${x._id}` }));
  const inv = [
    ...db.collection("deadlines").find({}).filter((d) => !d.point && hit(d.seller, d.no)).map((d) => {
      const day = Math.max(1, daysBetween(d.sent, TODAY));
      return { id: d._id, icon: "file-invoice", title: `Invoice to ${d.seller}`, sub: `Buyer-initiated · ${ksh(d.amount)} · ${short(d.sent)}`,
        badge: ["waiting", `Day ${day} of 30`], to: d.supplierId ? `/suppliers/${d.supplierId}` : "/purchases/tracker", day, seller: d.seller };
    }),
    ...db.collection("suppliers").find({}).filter((x) => !x.deadline).flatMap((x) => (x.invoices || []).filter((i) => hit(x.name, i.title)).map((i, k) => ({ id: `${x._id}-${k}`, icon: "file-invoice", title: `Invoice to ${x.name}`,
      sub: `Buyer-initiated · ${ksh(i.amount)} · ${(i.sub.match(/sent (\d+ \w+)/) || [])[1] || ""}`, badge: [i.status, i.status === "rejected" ? "Rejected" : "Waiting"], to: `/suppliers/${x._id}` }))),
    ...db.collection("trackerDone").find({}).filter((d) => hit(d.seller, d.no)).map((d) => ({ id: d._id, icon: "file-invoice", title: `Invoice to ${d.seller}`,
      sub: `Buyer-initiated · ${ksh(d.amount)} · ${short(d.sent)}`, badge: [d.status, d.status[0].toUpperCase() + d.status.slice(1)], to: "/purchases/tracker?tab=" + (d.status === "approved" ? "approved" : "closed") })),
  ];
  const ev = evidenceList().filter((x) => hit(x.seller, x.ref)).map((x) => ({
    id: x._id, icon: "file-search", title: `Evidence for ${x.seller}`, sub: `Evidence trail · ${x.records.length} records · ${short(x.date)}`, badge: BADGE[x.status], to: `/evidence/${x._id}` }));
  const set = SETTINGS.filter(([t]) => hit(t)).map(([t, to]) => ({ id: t, icon: "settings", title: t, sub: "Settings", to }));
  return { suppliers: sup, purchases: pur, invoices: inv, evidence: ev, settings: set };
}
const count = (r) => Object.values(r).reduce((n, l) => n + l.length, 0);

function Row({ r, active, onPick, id }) {
  return (
    <button type="button" id={id} role="option" aria-selected={active} className={`sr-row ${active ? "sr-row--on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(r)}>
      <span className="sr-row__icon"><Icon name={r.icon} size={20} /></span>
      <span className="sr-row__text"><span className="t-semi2 c-primary">{r.title}</span><span className="t-body3 c-secondary">{r.sub}</span></span>
      {r.badge && <StatusBadge status={r.badge[0]} label={r.badge[1]} />}
    </button>
  );
}
function AskRow({ q, active, onPick, id }) {
  return (
    <button type="button" id={id} role="option" aria-selected={active} className={`sr-row sr-row--ask ${active ? "sr-row--on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={onPick}>
      <span className="sr-row__icon"><Icon name="sparkles" size={20} /></span>
      <span className="sr-row__text"><span className="t-semi2 c-primary">Ask Rafiki about “{q}”</span><span className="t-body3 c-secondary">Plain-language question · opens Ask Rafiki</span></span>
    </button>
  );
}

/* ═════════ Host: Cmd+K overlay and Ask Rafiki drawer, over any page ═════════ */
export function SearchHost() {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(null);
  useEffect(() => {
    const key = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); } };
    const s = () => setOpen(true), a = (e) => { setOpen(false); setAsk({ q: e.detail || "" }); };
    window.addEventListener("keydown", key); window.addEventListener("rafiki:search", s); window.addEventListener("rafiki:ask", a);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("rafiki:search", s); window.removeEventListener("rafiki:ask", a); };
  }, []);
  return (<>{open && <QuickSearch onClose={() => setOpen(false)} onAsk={(q) => { setOpen(false); setAsk({ q }); }} />}{ask && <AskPanel q0={ask.q} onClose={() => setAsk(null)} />}</>);
}

function QuickSearch({ onClose, onAsk }) {
  useDb();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); const k = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); window.addEventListener("hashchange", onClose); return () => { window.removeEventListener("keydown", k); window.removeEventListener("hashchange", onClose); }; }, []);
  const res = useMemo(() => runSearch(q), [q]);
  const n = count(res);
  const go = (to) => { onClose(); navigate(to); };
  const recent = [
    { id: "r1", icon: "shopping-cart", title: "Total Energies Kenya", sub: "Purchase · KSh 18,900.00 · 8 Nov", badge: ["at-risk", "At risk"], to: "/purchases/exp_total" },
    { id: "r2", icon: "users", title: "Mama Wanjiku", sub: "Supplier · 0712 345 678", badge: ["not-etims", "Not on eTIMS"], to: db.collection("suppliers").get("sup_mamawanjiku") ? "/suppliers/sup_mamawanjiku" : "/invoices" },
    { id: "r3", icon: "file-search", title: "Evidence for Naivas Supermarket", sub: "Evidence trail · 3 records · 11 Nov", badge: ["validated", "Complete"], to: "/evidence/exp_naivas" },
  ];
  const actions = ACTIONS.slice(0, 2).map(([t, s, i, to]) => ({ id: t, icon: i, title: t, sub: s, to }));
  // Flat list for keyboard movement
  const flat = !q.trim() ? [...recent, ...actions] : n ? [...GROUPS.flatMap(([k]) => res[k].slice(0, 2)), { ask: true }] : [{ ask: true }];
  useEffect(() => setActive(0), [q]);
  function key(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter") { e.preventDefault(); const r = flat[active]; if (!r) return; r.ask ? onAsk(q.trim()) : go(r.to); }
  }
  let i = -1;
  const row = (r) => { i++; return <Row key={r.id} id={`sr-opt-${i}`} r={r} active={active === i} onPick={(x) => go(x.to)} />; };
  return (
    <div className="sr-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sr-panel" role="dialog" aria-modal="true" aria-label="Search Rafiki">
        <div className="sr-input">
          <Icon name="search" size={20} />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Search Rafiki..." aria-label="Search Rafiki"
            role="combobox" aria-expanded="true" aria-controls="sr-list" aria-activedescendant={`sr-opt-${active}`} />
          {q && <IconButton icon="x" label="Clear search" size={32} onClick={() => { setQ(""); ref.current?.focus(); }} />}
        </div>
        <div className="sr-list" id="sr-list" role="listbox" aria-label="Results">
          {!q.trim() ? (
            <>
              <p className="sr-group t-overline c-secondary">Recent</p>{recent.map(row)}
              <p className="sr-group t-overline c-secondary">Actions</p>{actions.map(row)}
            </>
          ) : n ? (
            <>
              {GROUPS.filter(([k]) => res[k].length).map(([k, label]) => (
                <div key={k}>
                  <div className="sr-group sr-group--row"><span className="t-overline c-secondary">{label} <span className="sr-count">{res[k].length}</span></span>
                    <button type="button" className="link t-body3" onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}&tab=${k}`)}>See all</button></div>
                  {res[k].slice(0, 2).map(row)}
                </div>
              ))}
              <p className="sr-group t-overline c-secondary">Ask Rafiki</p>
              <AskRow q={q.trim()} id={`sr-opt-${++i}`} active={active === i} onPick={() => onAsk(q.trim())} />
            </>
          ) : (
            <div className="sr-empty">
              <p className="t-semi2 c-primary">No results for “{q.trim()}”</p>
              <p className="t-body3 c-secondary">Check the spelling, or ask Rafiki in your own words.</p>
              <p className="sr-group t-overline c-secondary">Ask Rafiki</p>
              <AskRow q={q.trim()} id="sr-opt-0" active={active === 0} onPick={() => onAsk(q.trim())} />
            </div>
          )}
        </div>
        <div className="sr-keys t-body3 c-secondary" aria-hidden="true"><kbd>↑↓</kbd> to move <kbd>↵</kbd> to open <kbd>Esc</kbd> to close</div>
      </div>
    </div>
  );
}

/* ═════════ See all page ═════════ */
export function SearchPage() {
  useDb();
  const [q, setQ] = useState(query().get("q") || "");
  const [tab, setTab] = useState(query().get("tab") || "all");
  const res = runSearch(q);
  const n = count(res);
  const kinds = GROUPS.filter(([k]) => res[k].length).map(([, l]) => l);
  const sub = !q.trim() ? "Type a name, an amount or an invoice number." : !n ? "No results."
    : tab === "all" ? `${n} ${n === 1 ? "result" : "results"} in ${kinds.length > 1 ? kinds.slice(0, -1).join(", ") + " and " + kinds.slice(-1) : kinds[0]}.`
    : `${res[tab].length} ${GROUPS.find(([k]) => k === tab)[1].toLowerCase().replace(/s$/, res[tab].length === 1 ? "" : "s")} match.`;
  const shown = tab === "all" ? GROUPS.filter(([k]) => res[k].length) : GROUPS.filter(([k]) => k === tab && res[k].length);
  return (
    <div className="page">
      <div className="title-row"><div className="title-row__text"><h1 className="t-h3 c-primary">Results for “{q}”</h1><p className="t-body2 c-secondary">{sub}</p></div></div>
      <section className="tcard" aria-label="Search results">
        <div className="tcard__top">
          <div className="tcard__search"><TextField compact leadingIcon="search" aria-label="Search Rafiki" value={q} onChange={(v) => { setQ(v); navigate(`/search?q=${encodeURIComponent(v)}&tab=${tab}`, { replace: true }); }} /></div>
          <Tabs label="Result type" value={tab} onChange={(t) => { setTab(t); navigate(`/search?q=${encodeURIComponent(q)}&tab=${t}`, { replace: true }); }}
            tabs={[["all", `All (${n})`], ...GROUPS.map(([k, l]) => [k, `${l} (${res[k].length})`])]} />
        </div>
        <div className="sr-page">
          {n === 0 && q.trim() ? (
            <div className="sr-empty"><p className="t-h6 c-primary">No results for “{q}”</p><p className="t-body2 c-secondary">Check the spelling, or ask Rafiki in your own words.</p>
              <Button type="secondary" icon="sparkles" onClick={() => window.dispatchEvent(new CustomEvent("rafiki:ask", { detail: q }))}>Ask Rafiki about “{q}”</Button></div>
          ) : (
            <>
              {shown.map(([k, l]) => (
                <div key={k} className="sr-block">
                  <p className="sr-group t-overline c-secondary">{l} <span className="sr-count">{res[k].length}</span></p>
                  {res[k].map((r) => <Row key={r.id} r={r} onPick={(x) => navigate(x.to)} />)}
                </div>
              ))}
              {(tab === "all" ? true : res[tab].length === 0) && q.trim() && tab !== "all" && res[tab].length === 0 && <p className="t-body2 c-secondary">Nothing in this tab.</p>}
              {q.trim() && <div className="sr-block"><p className="sr-group t-overline c-secondary">Ask Rafiki</p><AskRow q={q} onPick={() => window.dispatchEvent(new CustomEvent("rafiki:ask", { detail: q }))} /></div>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ═════════ Ask Rafiki (draft panel): finds and explains, never acts ═════════ */
function answer(q) {
  if (!q.trim()) return { text: "Ask about a supplier, an invoice or a purchase, in Swahili or English. Rafiki finds it and explains where it stands.", found: [] };
  const r = runSearch(q);
  const found = [...r.suppliers, ...r.invoices, ...r.purchases, ...r.evidence].slice(0, 4);
  const s = r.suppliers[0];
  if (s) {
    const inv = r.invoices.filter((x) => x.seller === s.s.name && x.day);
    const pro = s.s.pronoun === "him" ? "him" : s.s.pronoun === "her" ? "her" : "them";
    const state = s.s.etims === false ? "a supplier not yet on eTIMS" : "a supplier on eTIMS";
    const open = inv.length === 1 ? ` One invoice to ${pro} is open, at day ${inv[0].day} of 30.` : inv.length > 1 ? ` ${inv.length} invoices to ${pro} are open.` : " No invoice to them is waiting.";
    return { text: `${s.s.name} is ${state}.${open}`, found };
  }
  if (found.length) return { text: `Rafiki found ${found.length} ${found.length === 1 ? "match" : "matches"} for “${q}”. Open one to see where it stands.`, found };
  return { text: `Rafiki could not find “${q}” in your suppliers, purchases, invoices or evidence. Try a name, an amount or an invoice number.`, found };
}
function AskPanel({ q0, onClose }) {
  const [thread, setThread] = useState(q0 ? [q0] : []);
  const [msg, setMsg] = useState("");
  const send = () => { if (!msg.trim()) return; setThread([...thread, msg.trim()]); setMsg(""); };
  const go = (to) => { onClose(); navigate(to); };
  return (
    <Drawer title="Ask Rafiki" onClose={onClose}
      footer={<div className="ask-foot">
        <div className="ask-compose"><input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Ask about a supplier, invoice or purchase" aria-label="Ask Rafiki" />
          <IconButton icon="send" label="Ask" type="primary" onClick={send} /></div>
        <p className="t-body3 c-secondary">Ask Rafiki never sends or pays. You do that yourself.</p></div>}>
      {thread.length === 0 && <p className="t-body2 c-secondary">{answer("").text}</p>}
      {thread.map((q, i) => {
        const a = answer(q);
        return (
          <div key={i} className="ask-turn">
            <p className="ask-q t-body2 c-primary">{q}</p>
            <p className="t-body1 c-primary">{a.text}</p>
            {a.found.length > 0 && (
              <div className="ask-found"><p className="t-overline c-secondary">Found <span className="sr-count">{a.found.length}</span></p>
                {a.found.map((r) => <Row key={r.id} r={r} onPick={(x) => go(x.to)} />)}</div>
            )}
          </div>
        );
      })}
      {thread.length > 0 && <p className="t-body3 c-secondary">Ask Rafiki finds and explains. Open a result to act on it yourself.</p>}
    </Drawer>
  );
}
