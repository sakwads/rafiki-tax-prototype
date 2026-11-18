import React, { useState } from "react";
import { Alert, Button, Icon, Radio, StatusBadge, TextField, TextLink, copyText, toast, wait } from "../components/ui.jsx";
import { EmptyState, Tabs, ksh } from "../components/patterns.jsx";
import { FilterMenu, Modal, NetworkTag, Segmented, SelectionBar, Table, TableFooter } from "../components/table.jsx";
import { ExportCsvModal, PageTitle, daysBetween, fmtDate, m3Empty, purchCol, supCol, useFirstLoad } from "./purchases.jsx";
import { db } from "../db.js";
import { TODAY } from "../seed.js";
import { TRACKER_META } from "../data/module3.js";
import { navigate, query } from "../router.js";

const deadlineCol = () => db.collection("deadlines");
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const initials = (name) => name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const statusOf = (s) => (s.vat ? "vat" : !s.etims ? "not-etims" : "on-etims");
const idLabel = (s) => (s.pin ? ["PIN", s.pin] : ["ID", s.idNo]);
const todayLabel = () => fmtDate(TODAY).replace(/^0/, "");
const PAY_VIA = { "M-Pesa": "M-Pesa Pochi", "Airtel Money": "Airtel Money", Bank: "Bank transfer" };

// The open 30-day clock for a supplier, if any
function clockFor(s) {
  const id = s.deadline || Object.keys(TRACKER_META).find((k) => TRACKER_META[k].supplierId === s._id);
  const d = id ? deadlineCol().get(id) : deadlineCol().findOne({ supplierId: s._id });
  if (!d || d.status === "cancelled" || d.point) return null;
  return { d, no: TRACKER_META[d._id]?.no || d.no, day: Math.max(1, daysBetween(d.sent, TODAY)), left: daysBetween(TODAY, d.expires) };
}
const addHistory = (s, item) => supCol().update(s._id, { history: [{ ...item, date: fmtDate(TODAY).replace(/ \d{4}$/, "").replace(/^0/, "") }, ...(s.history || defaultHistory(s))] });

/* ═════════ 1. Suppliers list ═════════ */
const S_TABS = [["all", "All"], ["waiting", "Waiting on sellers"], ["on", "On eTIMS"], ["off", "Not on eTIMS"], ["vat", "VAT-registered"]];
const LAST = { "Last 7 days": 7, "Last 30 days": 30, "Last 90 days": 90 };
const GROUP = { "on-etims": 0, "not-etims": 1, vat: 2 };

export function SuppliersList() {
  const loading = useFirstLoad("suppliers");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [network, setNetwork] = useState("");
  const [last, setLast] = useState("");
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [csv, setCsv] = useState(false);
  const empty = m3Empty();
  const all = empty ? [] : supCol().find({}).sort((a, b) => b.waiting - a.waiting || GROUP[statusOf(a)] - GROUP[statusOf(b)] || b.last.localeCompare(a.last));
  const rows = all.filter((s) => {
    const st = statusOf(s);
    const okTab = tab === "all" || (tab === "waiting" && s.waiting > 0) || (tab === "on" && st === "on-etims") || (tab === "off" && st === "not-etims") || (tab === "vat" && st === "vat");
    const text = `${s.name} ${s.pin || ""} ${s.idNo || ""}`.toLowerCase();
    return okTab && (!q || text.includes(q.trim().toLowerCase())) && (!network || s.network === network) && (!last || daysBetween(s.last, TODAY) <= LAST[last]);
  });
  const filtered = !!(q || network || last);
  const pages = Math.max(1, Math.ceil(rows.length / size)), pg = Math.min(page, pages);
  const reset = (fn) => (v) => { fn(v); setPage(1); };
  const clear = () => { setQ(""); setNetwork(""); setLast(""); setPage(1); };
  const columns = [
    { key: "name", label: "Supplier", flex: 3 },
    { key: "pin", label: "PIN or ID", flex: 2, className: "t-mono-cell", render: (s) => s.pin || s.idNo },
    { key: "last", label: "Last activity", flex: 2, render: (s) => fmtDate(s.last) },
    { key: "waiting", label: "Waiting on seller", flex: 2, align: "right", render: (s) => <b>{ksh(s.waiting)}</b> },
    { key: "payVia", label: "Pays via", flex: 2 },
    { key: "status", label: "Status", width: 200, render: (s) => <StatusBadge status={statusOf(s)} /> },
  ];
  return (
    <div className="page">
      <PageTitle title="Suppliers" sub="Saved suppliers, their eTIMS and VAT status, and the invoices still waiting on each.">
        <Button type="secondary" className="btn--lg" disabled={!all.length} onClick={() => setCsv(true)}>Export CSV</Button>
        <Button className="btn--lg" onClick={() => navigate("/suppliers/new")}>Add supplier</Button>
      </PageTitle>
      <section className="tcard" aria-label="Suppliers">
        <div className="tcard__top">
          <Tabs label="Supplier status" value={tab} onChange={reset(setTab)} tabs={S_TABS} />
          <div className="tcard__tools">
            <div className="tcard__search"><TextField compact leadingIcon="search" placeholder="Search supplier or PIN" aria-label="Search supplier or PIN" value={q} onChange={reset(setQ)} /></div>
            <div className="tcard__filters">
              {filtered && <Button type="tertiary" size="sm" icon="filter-x" onClick={clear}>Clear filters</Button>}
              <FilterMenu label="Network" value={network} options={["M-Pesa", "Airtel Money", "Bank"]} onChange={reset(setNetwork)} />
              <FilterMenu label="Last invoice" value={last} options={Object.keys(LAST)} onChange={reset(setLast)} />
            </div>
          </div>
          {selected.length > 0 && (
            <SelectionBar count={selected.length} onClear={() => setSelected([])}>
              <Button size="sm" onClick={() => setCsv(true)}>Export {selected.length}</Button>
            </SelectionBar>
          )}
        </div>
        <Table label="Suppliers" columns={columns} rows={rows.slice((pg - 1) * size, pg * size)} loading={loading} selectable selected={selected} onSelect={setSelected}
          rowLabel={(s) => s.name} onRowClick={(s) => navigate(`/suppliers/${s._id}`)}
          empty={empty
            ? <EmptyState icon="users" title="No suppliers yet" body="Add a supplier, or let Rafiki find regular payees in your M-Pesa or Airtel Money statement." action={<Button className="btn--lg" onClick={() => navigate("/suppliers/new")}>Add supplier</Button>} />
            : <EmptyState icon="filter-x" title="No suppliers match" body="Try another tab, or clear the filters." action={<Button type="secondary" className="btn--lg" onClick={() => { setTab("all"); clear(); }}>Clear filters</Button>} />} />
        {(loading || rows.length > 0) && <TableFooter total={loading ? 24 : rows.length} page={pg} size={size} onPage={setPage} onSize={setSize} />}
      </section>
      {csv && <ExportCsvModal overline="Suppliers export" noun="suppliers" onClose={() => setCsv(false)}
        summary={(n, total) => `${ksh(total)} still waiting on sellers. Opens in Excel or Google Sheets.`}
        choices={[...(selected.length ? [{ label: "Selected suppliers", rows: all.filter((s) => selected.includes(s._id)).map((s) => ({ ...s, amount: s.waiting })) }] : []),
          { label: "This view", rows: rows.map((s) => ({ ...s, amount: s.waiting })) }, { label: "All suppliers", rows: all.map((s) => ({ ...s, amount: s.waiting })) }]}
        columnsText="Supplier, PIN or ID, phone, last activity, waiting on seller, pays via, status"
        file={() => "rafiki-suppliers-nov-2026.csv"}
        toCsv={(list) => [["Supplier", "PIN or ID", "Phone", "Last activity", "Waiting on seller (KSh)", "Pays via", "Status"], ...list.map((s) => [s.name, s.pin || s.idNo, s.phone, fmtDate(s.last), s.waiting.toFixed(2), s.payVia, statusOf(s)])]} />}
    </div>
  );
}

/* ═════════ 2. Supplier profile ═════════ */
function linkedPurchases(s) { return purchCol().find({}).filter((p) => p.supplierId === s._id || p.seller === s.name); }
function defaultInvoices(s) {
  const c = clockFor(s);
  const list = linkedPurchases(s).map((p) => ({
    icon: "file-text", title: p.source === "Buyer invoice" ? `Purchase, ${fmtDate(p.date).replace(/ \d{4}$/, "")}` : `${p.ref}`,
    sub: `${p.source === "Buyer invoice" ? "Buyer-initiated" : p.source} · ${p.invoiceNo || "no invoice"} · ${fmtDate(p.date).replace(/ \d{4}$/, "")}`,
    meta: p.status === "waiting" && c ? `Day ${c.day} of 30 · expires in ${c.left} days` : null, metaIcon: "clock-hour-3",
    amount: p.amount, status: p.status === "waiting" ? "pending" : p.status, to: `/purchases/${p._id}`,
  }));
  if (!list.length && c) list.push({ icon: "file-text", title: "Buyer-initiated invoice", sub: `Buyer-initiated · ${c.no} · sent ${fmtDate(c.d.sent).replace(/ \d{4}$/, "")}`, meta: `Day ${c.day} of 30 · expires in ${c.left} days`, metaIcon: "clock-hour-3", amount: c.d.amount, status: "pending" });
  return list;
}
function defaultPayments(s) {
  return linkedPurchases(s).map((p) => ({ icon: "device-mobile-message", title: `${p.payment} to ${s.phone}`, sub: `Payment · ${fmtDate(p.date)}`, amount: p.amount, status: "validated", to: `/purchases/${p._id}` }));
}
function defaultHistory(s) {
  return [{ icon: "circle-check", title: "Supplier confirmed", sub: `Network confirmed by you: ${s.payVia}`, date: (s.confirmedOn || "").replace(/ \d{4}$/, "") }];
}

export function SupplierProfile({ id }) {
  const s = supCol().get(id);
  const [tab, setTab] = useState(query().get("tab") || "invoices");
  const [edit, setEdit] = useState(false);
  if (!s) return <EmptyState icon="users" title="Supplier not found" body="It may have been removed." action={<Button onClick={() => navigate("/suppliers")}>Back to suppliers</Button>} />;
  const st = statusOf(s), c = clockFor(s);
  const [idK, idV] = idLabel(s);
  const fix = s.vat && linkedPurchases(s).find((p) => p.status === "needs-fixing");
  const invoices = s.invoices || defaultInvoices(s);
  const payments = s.payments || defaultPayments(s);
  const history = s.history || defaultHistory(s);
  // Keep the Njeri-style invoice row's countdown live
  const inv = invoices.map((i) => (i.meta && i.meta.startsWith("Day") && c ? { ...i, meta: `Day ${c.day} of 30 · expires in ${c.left} days` } : i));

  let amount = s.waiting, line;
  if (st === "not-etims") { amount = 0; line = `nothing waiting · ${plural(payments.length || 1, "payment")}, not yet invoiced`; }
  else if (fix) { amount = fix.amount; line = `1 receipt without your PIN · ${fmtDate(fix.date)}`; }
  else if (c) line = `waiting on ${s.pronoun || "them"} · 1 invoice · expires in ${c.left} days`;
  else line = "nothing waiting";

  const actions = st === "not-etims" ? [["primary", "Send setup guide", () => navigate(`/suppliers/${id}/guide`)]]
    : fix ? [["primary", "Ask for corrected invoice", () => navigate(`/suppliers/${id}/remind?kind=fix`)]]
    : s.vat ? [["primary", "Open last purchase", () => { const p = linkedPurchases(s)[0]; p ? navigate(`/purchases/${p._id}`) : toast("No purchases from this supplier yet.", "info-circle"); }]]
    : [["secondary", "Repeat last", () => navigate("/invoices/new?source=repeat")],
      ...(c ? [["tertiary", "Remind", () => navigate(`/suppliers/${id}/remind`)]] : []),
      ["primary", "Draft invoice", () => navigate("/invoices")]];

  return (
    <div className="page">
      <section className="sup-head" aria-labelledby="sup-h">
        <div className="sup-head__row">
          <span className="avatar avatar--48" aria-hidden="true">{initials(s.name)}</span>
          <div className="sup-head__id">
            <h1 id="sup-h" className="t-h5 c-primary">{s.name}</h1>
            <p className="t-body3 c-secondary">{idK} <span className="t-mono-sm c-primary">{idV}</span> · {s.phone}</p>
            <div className="sup-head__badges"><StatusBadge status={st === "vat" ? "on-etims" : st} />{s.vat ? <StatusBadge status="vat" /> : <StatusBadge status="not-vat" />}</div>
          </div>
          <div className="sup-head__actions">{actions.map(([t, l, fn]) => <Button key={l} type={t} className="btn--lg" onClick={fn}>{l}</Button>)}</div>
        </div>
        <p className="sup-head__sum"><span className="t-semi2 c-primary">{ksh(amount)}</span> <span className="t-body3 c-secondary">{line}</span></p>
        {st === "not-etims" && <Alert tone="warning" title="Not on eTIMS yet">Buyer-initiated invoices need {s.short || s.name} on eTIMS first. Send the setup guide by SMS or WhatsApp; it shows the *222# steps.</Alert>}
        {s.vat && <Alert tone="info" title="Buyer-initiated invoices are blocked">KRA blocks them for VAT-registered sellers. Ask {s.name} for an eTIMS invoice that carries your PIN.</Alert>}
      </section>

      <section className="sup-tabs" aria-label="Supplier records">
        <Tabs label="Supplier records" value={tab} onChange={setTab} tabs={[["invoices", "Invoices"], ["payments", "Payments"], ["history", "History"]]} />
        {tab === "invoices" && (inv.length ? inv.map((i, n) => (
          <div key={n} className="sup-item">
            <span className="icon-chip"><Icon name={i.icon} size={20} /></span>
            <div className="sup-item__text">
              {i.to ? <button type="button" className="sup-item__link t-semi2 c-primary" onClick={() => navigate(i.to)}>{i.title}</button> : <p className="t-semi2 c-primary">{i.title}</p>}
              <p className="t-body3 c-secondary">{i.sub}</p>
              {i.meta && <p className="t-body3 c-secondary sup-item__meta"><Icon name={i.metaIcon} size={16} />{i.meta}</p>}
            </div>
            <div className="queue-row__meta"><p className="t-figure c-primary">{ksh(i.amount)}</p><StatusBadge status={i.status} /></div>
          </div>
        )) : <EmptyState icon="file-text" title="No invoices yet" body="Invoices for this supplier will show up here." />)}
        {tab === "payments" && (payments.length ? payments.map((p, n) => (
          <div key={n} className="sup-item">
            <span className="icon-chip"><Icon name={p.icon} size={20} /></span>
            <div className="sup-item__text"><p className="t-semi2 c-primary">{p.title}</p><p className="t-body3 c-secondary">{p.sub}</p></div>
            <div className="queue-row__meta"><p className="t-figure c-primary">{ksh(p.amount)}</p><StatusBadge status={p.status} /></div>
            <Button type="tertiary" size="sm" onClick={() => p.to ? navigate(p.to) : toast("Records open in Evidence (Module 5).", "file-search")}>Open</Button>
          </div>
        )) : <EmptyState icon="wallet" title="No payments matched yet" body="Payments to this supplier from your statements will show up here." />)}
        {tab === "history" && (
          <ol className="sup-history">
            {history.map((h, n) => (
              <li key={n} className="sup-history__row">
                <Icon name={h.icon} size={20} />
                <div className="sup-item__text"><p className="t-medium2 c-primary">{h.title}</p><p className="t-body3 c-secondary">{h.sub}</p></div>
                <span className="t-body3 c-secondary">{h.date}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <PaysVia s={s} onEdit={() => setEdit(true)} />
      {edit && <EditPaymentModal s={s} onClose={() => setEdit(false)} />}
    </div>
  );
}

function PaysVia({ s, onEdit, confirmedOn }) {
  return (
    <section className="pays-via" aria-label="Payment details">
      <NetworkTag network={s.network} />
      <div className="pays-via__text">
        <p className="t-overline c-secondary">Pays via</p>
        <p className="t-mono-sm c-primary">{s.phone}</p>
        <p className="t-body2 c-primary">{s.payVia} · Confirmed by you on {confirmedOn || s.confirmedOn}</p>
      </div>
      <TextLink size={2} onClick={onEdit}>Edit</TextLink>
    </section>
  );
}

/* ═════════ 7. Edit payment details ═════════ */
function EditPaymentModal({ s, onClose }) {
  const [network, setNetwork] = useState(s.network);
  const [phone, setPhone] = useState(s.phone);
  const changed = network !== s.network || phone.replace(/\s/g, "") !== s.phone.replace(/\s/g, "");
  const netChanged = network !== s.network;
  const valid = s.paybill || phone.replace(/\D/g, "").length === 10;
  function save() {
    const payVia = netChanged ? PAY_VIA[network] : s.payVia;
    supCol().update(s._id, { network, phone, payVia, confirmedOn: todayLabel() });
    addHistory(supCol().get(s._id), { icon: "pencil", title: "Payment details changed", sub: `${payVia} · ${phone}` });
    toast("Payment details saved", "circle-check", { tone: "success" }); onClose();
  }
  return (
    <Modal title="Edit payment details" onClose={onClose} footer={<><Button type="secondary" className="btn--lg" onClick={onClose}>Cancel</Button><Button className="btn--lg" disabled={!changed || !valid} onClick={save}>Save changes</Button></>}>
      <fieldset className="modal__group">
        <legend className="t-overline c-secondary">Network</legend>
        {["M-Pesa", "Airtel Money"].map((n) => (
          <label key={n} className="choice"><input type="radio" className="sr-only" name="edit-net" checked={network === n} onChange={() => setNetwork(n)} /><Radio checked={network === n} /><span className="t-medium2 c-primary">{n}</span></label>
        ))}
        <p className="t-body3 c-secondary">Rafiki never guesses the network from the number. You choose it.</p>
      </fieldset>
      <TextField label="Number" value={phone} onChange={setPhone} inputMode="tel" readOnly={s.paybill}
        helper={changed ? "Not confirmed yet" : `Confirmed by you on ${s.confirmedOn}`} error={!valid ? "Enter a 10-digit phone number" : null} />
      {netChanged && <p className="t-body2 c-primary">Moving to {network} changes where future payments go. Past payments stay as they are.</p>}
    </Modal>
  );
}

/* ═════════ 4. Remind seller ═════════ */
export function RemindPage({ id }) {
  const s = supCol().get(id);
  const [channel, setChannel] = useState(query().get("channel") || "whatsapp");
  const [lang, setLang] = useState("en");
  const [busy, setBusy] = useState(false);
  if (!s) return <EmptyState icon="users" title="Supplier not found" body="" action={<Button onClick={() => navigate("/suppliers")}>Back to suppliers</Button>} />;
  const fixKind = query().get("kind") === "fix";
  const c = clockFor(s);
  const fix = linkedPurchases(s).find((p) => p.status === "needs-fixing");
  const name = s.short || s.name;
  const en = lang === "en";
  const text = fixKind && fix
    ? (en ? `Hello ${s.name}, please reissue receipt ${fix.invoiceNo} for ${ksh(fix.amount)} as an eTIMS invoice that carries my PIN P051234567Z. Thank you.`
      : `Habari ${s.name}, tafadhali toa upya risiti ${fix.invoiceNo} ya ${ksh(fix.amount)} kama ankara ya eTIMS yenye PIN yangu P051234567Z. Asante.`)
    : c ? (en ? `Hello ${name}, please approve invoice ${c.no} for ${ksh(c.d.amount)} by dialling *222# and choosing Buyer-initiated invoices. It expires in ${c.left} days. Thank you.`
      : `Habari ${name}, tafadhali idhinisha ankara ${c.no} ya ${ksh(c.d.amount)} kwa kupiga *222# na kuchagua Buyer-initiated invoices. Itaisha baada ya siku ${c.left}. Asante.`)
    : (en ? `Hello ${name}, this is Wanjiku Fresh Greens. Please send an eTIMS invoice for our last purchase. Thank you.`
      : `Habari ${name}, huyu ni Wanjiku Fresh Greens. Tafadhali tuma ankara ya eTIMS kwa ununuzi wetu wa mwisho. Asante.`);
  const wa = channel === "whatsapp";
  async function send() {
    setBusy(true); await wait(700); setBusy(false);
    if (c && !fixKind) deadlineCol().update(c.d._id, { status: "reminded" });
    addHistory(s, { icon: "bell", title: fixKind ? "Correction requested" : "Reminder sent", sub: `${wa ? "WhatsApp" : "SMS"} · ${en ? "English" : "Swahili"}${fixKind ? " asking for an invoice with your PIN" : " with the *222# approval steps"}` });
    toast(`${wa ? "WhatsApp" : "Messages"} opened with your message. You press send.`, wa ? "brand-whatsapp" : "message", { tone: "success" });
    navigate(`/suppliers/${id}?tab=history`);
  }
  return (
    <div className="page page--center">
      <div className="guide-top">
        <Button type="tertiary" size="sm" onClick={() => navigate(`/suppliers/${id}`)}>Back to {s.name}</Button>
        <Segmented label="Language" value={lang} onChange={setLang} options={[["en", "English"], ["sw", "Kiswahili"]]} />
      </div>
      <MessageCard overline={en ? "Message to seller" : "Ujumbe kwa muuzaji"} meta={en ? `${wa ? "WhatsApp" : "SMS"} · English · to ${s.name} · ${s.phone}` : `${wa ? "WhatsApp" : "SMS"} · Swahili · kwa ${s.name} · ${s.phone}`}
        text={text} foot={en ? "You send this. Rafiki only prepares it." : "Wewe ndiye unayetuma. Rafiki huandaa tu."} />
      <div className="actions actions--end">
        <Button type="secondary" className="btn--lg" onClick={() => setChannel(wa ? "sms" : "whatsapp")}>Switch to {wa ? "SMS" : "WhatsApp"}</Button>
        <Button className="btn--lg" loading={busy} onClick={send}>Open {wa ? "WhatsApp" : "SMS"} to send</Button>
      </div>
    </div>
  );
}

function MessageCard({ overline, meta, text, foot }) {
  return (
    <section className="msg-card" aria-label={overline}>
      <p className="t-overline c-secondary">{overline}</p>
      <p className="t-body2 c-primary">{meta}</p>
      <p className="msg-card__bubble t-body2 c-primary">{text}</p>
      <p className="t-body2 c-primary">{foot}</p>
    </section>
  );
}

/* ═════════ 5. Seller onboarding guide ═════════ */
export function GuidePage({ id }) {
  const s = supCol().get(id);
  const [lang, setLang] = useState("en");
  const [busy, setBusy] = useState(false);
  if (!s) return <EmptyState icon="users" title="Supplier not found" body="" action={<Button onClick={() => navigate("/suppliers")}>Back to suppliers</Button>} />;
  const name = s.short || s.name.split(" ")[0];
  const pay = (s.payments || defaultPayments(s))[0];
  const amt = ksh(pay?.amount || 5000);
  const idNo = s.idNo || s.pin;
  const T = lang === "en" ? {
    over: "Message to seller", meta: `WhatsApp · English · to ${s.name} · ${s.phone}`, foot: "You send this. Rafiki only prepares it.",
    text: `Hello ${name}, KRA needs an eTIMS invoice for your ${s._id === "sup_otieno" ? "pipe repair" : "work"} of ${amt}. Please register on *222# with your ID number. Reply here if you need help.`,
    steps: "Steps for the seller", list: ["On the seller's phone, dial *222#.", "Choose to register as an eTIMS seller.", `Enter the ID number ${idNo}.`, "Reply on WhatsApp when done and Rafiki will prepare the invoice."],
  } : {
    over: "Ujumbe kwa muuzaji", meta: `WhatsApp · Swahili · kwa ${s.name} · ${s.phone}`, foot: "Wewe ndiye unayetuma. Rafiki huandaa tu.",
    text: `Habari ${name}, KRA inahitaji ankara ya eTIMS kwa kazi yako ${s._id === "sup_otieno" ? "ya mabomba " : ""}ya ${amt}. Tafadhali jisajili kupitia *222# ukitumia nambari yako ya kitambulisho. Jibu hapa ukihitaji msaada.`,
    steps: "Hatua kwa muuzaji", list: ["Kwenye simu ya muuzaji, piga *222#.", "Chagua kujisajili kama muuzaji wa eTIMS.", `Weka nambari ya kitambulisho ${idNo}.`, "Jibu kwenye WhatsApp ukimaliza na Rafiki ataandaa ankara."],
  };
  async function send() {
    setBusy(true); await wait(700); setBusy(false);
    addHistory(s, { icon: "send", title: "Setup guide sent", sub: `WhatsApp · ${lang === "en" ? "English" : "Swahili"} · *222# steps` });
    toast("WhatsApp opened with the guide. You press send.", "brand-whatsapp", { tone: "success" });
    navigate(`/suppliers/${id}?tab=history`);
  }
  return (
    <div className="page page--center">
      <div className="guide-top">
        <Button type="tertiary" size="sm" onClick={() => navigate(`/suppliers/${id}`)}>Back to {s.name}</Button>
        <Segmented label="Language" value={lang} onChange={setLang} options={[["en", "English"], ["sw", "Kiswahili"]]} />
      </div>
      <MessageCard overline={T.over} meta={T.meta} text={T.text} foot={T.foot} />
      <section className="msg-card" aria-label={T.steps}>
        <p className="t-overline c-secondary">{T.steps}</p>
        <ol className="guide-steps">{T.list.map((l, i) => <li key={i} className="t-body2 c-primary">{i + 1}. {l}</li>)}</ol>
      </section>
      <div className="actions actions--end">
        <Button type="secondary" className="btn--lg" onClick={() => { copyText(`${T.text}\n\n${T.list.map((l, i) => `${i + 1}. ${l}`).join("\n")}`); toast("Message copied", "copy"); }}>Copy message</Button>
        <Button className="btn--lg" loading={busy} onClick={send}>Open WhatsApp to send</Button>
      </div>
    </div>
  );
}

/* ═════════ 3. Confirm a suggested supplier ═════════ */
const PAYEE = { phone: "0723 118 940", amount: 2500 };
export function ConfirmSupplierPage() {
  const [network, setNetwork] = useState(null);
  const [why, setWhy] = useState(false);
  const [busy, setBusy] = useState(false);
  const qi = db.collection("queue").get("q_supplier");
  const saved = supCol().findOne({ phone: PAYEE.phone });
  if (saved || (qi && qi.status !== "open")) return (
    <div className="page page--center">
      <section className="tcard"><EmptyState icon="circle-check" title="No new payees to confirm" body="Rafiki will tell you when it spots another regular payee in your statements." action={<Button className="btn--lg" onClick={() => navigate(saved ? `/suppliers/${saved._id}` : "/suppliers")}>{saved ? "Open supplier" : "Back to suppliers"}</Button>} /></section>
    </div>
  );
  const draft = { network: network || "M-Pesa", phone: PAYEE.phone, payVia: PAY_VIA[network || "M-Pesa"], confirmedOn: todayLabel() };
  async function save() {
    setBusy(true); await wait(600);
    const doc = supCol().insert({ name: `Payee ${PAYEE.phone}`, idNo: "Not set", phone: PAYEE.phone, network, payVia: PAY_VIA[network], etims: true, vat: false, waiting: 0, last: "2026-11-14", confirmedOn: todayLabel(), pronoun: "them",
      payments: [{ icon: "device-mobile-message", title: `${network} to ${PAYEE.phone}`, sub: "Payment · Sat 14 Nov 2026", amount: PAYEE.amount, status: "validated" }],
      history: [{ icon: "circle-check", title: "Supplier confirmed", sub: `Network confirmed by you: ${PAY_VIA[network]}`, date: "17 Nov" }] });
    if (qi) db.collection("queue").update("q_supplier", { status: "done", resolution: network });
    toast("Supplier saved", "circle-check", { tone: "success" });
    navigate(`/suppliers/${doc._id}`);
  }
  return (
    <div className="page page--center">
      <section className="suggest suggest--info" aria-label="Rafiki suggests a supplier">
        <div className="suggest__header">
          <Icon name="sparkles-2" size={24} />
          <p className="suggest__title t-semi2 c-primary">{network ? "Supplier ready to save" : "New payee found in your M-Pesa statement"}</p>
          <StatusBadge status="validated" outline label="Weekly pattern" />
        </div>
        <p className="t-body2 c-secondary">{network ? "The network is confirmed by you. Save this payee to your suppliers and Rafiki will prepare invoices for it."
          : `You paid ${PAYEE.phone} ${ksh(PAYEE.amount)} every Saturday. Tell Rafiki which network this number uses so future payments go to the right place.`}</p>
        <div className="change-box change-box--row"><p className="t-body3 c-secondary">Number</p><p className="t-semi2 c-primary">{PAYEE.phone}</p></div>
        {why && <p className="t-body3 c-secondary">Rafiki found 6 payments of {ksh(PAYEE.amount)} to this number, each on a Saturday, since 3 Oct.</p>}
        <div className="suggest__footer">
          {network ? <><Icon name="circle-check" size={24} /><p className="t-semi2 c-primary">Network confirmed by you</p><span className="suggest__spacer" /><TextLink size={3} onClick={() => setNetwork(null)}>Change</TextLink></>
            : <TextLink size={3} aria-expanded={why} onClick={() => setWhy(!why)}>Why?</TextLink>}
        </div>
      </section>
      {network ? <PaysVia s={draft} onEdit={() => setNetwork(null)} /> : (
        <section className="msg-card" aria-labelledby="net-q">
          <p id="net-q" className="t-overline c-secondary">Which network is {PAYEE.phone} on?</p>
          <div className="net-chips" role="radiogroup" aria-labelledby="net-q">
            {["M-Pesa", "Airtel Money", "Bank"].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={network === n} className="net-chip" onClick={() => setNetwork(n)}>
                <Icon name={n === "Bank" ? "building-bank" : "wallet"} size={16} />{n}
              </button>
            ))}
          </div>
          <p className="t-body2 c-primary">Rafiki never guesses the network from the number. You choose it.</p>
        </section>
      )}
      <div className="actions actions--end">
        <Button type="secondary" className="btn--lg" onClick={() => navigate("/suppliers")}>Not now</Button>
        <Button className="btn--lg" disabled={!network} loading={busy} onClick={save}>Save supplier</Button>
      </div>
    </div>
  );
}

/* ═════════ 6. Add supplier ═════════ */
export function AddSupplierPage() {
  const [f, setF] = useState({ name: "", idNo: "", phone: "", network: null });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const digits = f.phone.replace(/\D/g, "");
  const idOk = /^[A-Z]\d{9}[A-Z]$/i.test(f.idNo.trim()) || /^\d{7,8}$/.test(f.idNo.trim());
  const ready = f.name.trim().length > 1 && idOk && digits.length === 10 && f.network;
  async function save() {
    setBusy(true); await wait(600);
    const isPin = /^[A-Z]/i.test(f.idNo.trim());
    const phone = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    const doc = supCol().insert({ name: f.name.trim(), ...(isPin ? { pin: f.idNo.trim().toUpperCase() } : { idNo: f.idNo.trim() }), phone, network: f.network, payVia: PAY_VIA[f.network],
      etims: isPin, vat: false, waiting: 0, last: TODAY, confirmedOn: todayLabel(), pronoun: "them", invoices: [], payments: [],
      history: [{ icon: "user-plus", title: "Supplier added", sub: `Network chosen by you: ${PAY_VIA[f.network]}`, date: "17 Nov" }] });
    toast(`${doc.name} saved`, "circle-check", { tone: "success" });
    navigate(`/suppliers/${doc._id}`);
  }
  return (
    <div className="page page--center">
      <form className="msg-card form-card" onSubmit={(e) => { e.preventDefault(); if (ready) save(); }}>
        <p className="t-overline c-secondary">New supplier</p>
        <TextField label="Supplier name" value={f.name} onChange={set("name")} placeholder="e.g. Mama Njeri Groceries" helper="As it appears on their invoices" autoFocus />
        <TextField label="PIN or ID number" value={f.idNo} onChange={set("idNo")} placeholder="PIN, or ID number if they have no PIN" helper="KRA PIN for businesses, ID number for small sellers"
          error={f.idNo.length > 6 && !idOk ? "Enter a KRA PIN (like P051234567Z) or an ID number" : null} />
        <TextField label="Phone number" value={f.phone} onChange={set("phone")} placeholder="07xx xxx xxx" inputMode="tel" helper="Used for reminders and for payment"
          error={digits.length > 10 ? "Use 10 digits, starting 07 or 01" : null} />
        <fieldset className="modal__group">
          <legend className="field__label t-label">Network</legend>
          {["M-Pesa", "Airtel Money"].map((n) => (
            <label key={n} className="choice"><input type="radio" className="sr-only" name="add-net" checked={f.network === n} onChange={() => set("network")(n)} /><Radio checked={f.network === n} /><span className="t-medium2 c-primary">{n}</span></label>
          ))}
          <p className="t-body3 c-secondary">Rafiki never guesses the network from the number. You choose it.</p>
        </fieldset>
        <button type="submit" hidden />
      </form>
      <div className="actions actions--end">
        <Button type="secondary" className="btn--lg" onClick={() => navigate("/suppliers")}>Cancel</Button>
        <Button className="btn--lg" disabled={!ready} loading={busy} onClick={save}>Save supplier</Button>
      </div>
    </div>
  );
}
