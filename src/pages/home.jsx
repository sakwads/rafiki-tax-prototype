import React, { useEffect, useRef, useState } from "react";
import { Button, Icon, StatusBadge, toast, wait } from "../components/ui.jsx";
import { AgentSuggestion, Drawer, EmptyState, Facts, SkelCard, SkelItem, Sparkline, Tabs, ksh } from "../components/patterns.jsx";
import { db } from "../db.js";
import { TODAY } from "../seed.js";
import { navigate } from "../router.js";
import { MobileSyncRow } from "../components/syncrow.jsx";

const queueCol = () => db.collection("queue");
const deadlineCol = () => db.collection("deadlines");

/* ───────── Dates ───────── */
const D = (s) => new Date(s + "T00:00:00Z");
const DAY = 86400000;
const daysBetween = (a, b) => Math.round((D(b) - D(a)) / DAY);
const fmtDay = (s) => D(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const todayLong = () => D(TODAY).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// Home loads once per visit with a short skeleton, then the arrival toast plays once.
let homeLoaded = false;
let arrivalShown = false;
export function replayHomeLoading() { homeLoaded = false; arrivalShown = false; }

/* ───────── Home ───────── */
export function HomePage({ itemId }) {
  const scenario = (db.get("home") || {}).scenario || "live";
  const allClear = scenario === "all-clear";
  const fresh = scenario === "fresh";   // after "Delete my data": nothing yet, still signed in
  const [loading, setLoading] = useState(!homeLoaded);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => { homeLoaded = true; setLoading(false); }, 1100);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (loading || arrivalShown) return;
    const t = setTimeout(() => {
      arrivalShown = true;
      toast("Bidco Africa Ltd invoice received. Now covered.", "circle-check", {
        tone: "success", action: { label: "View", onClick: () => navigate("/purchases/exp_bidco") },
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [loading]);

  const queue = allClear || fresh ? [] : queueCol().find({ status: "open" }).sort((a, b) => a.order - b.order);
  const risky = queue.filter((q) => q.kind === "at-risk" || q.kind === "needs-fixing");
  const waiting = deadlineCol().find({ status: (s) => s === "waiting" || s === "reminded" });
  const FLAT = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  const tiles = fresh
    ? [["alert-triangle", "At risk · 0 purchases", 0, FLAT], ["hourglass-high", "Waiting on 0 sellers", 0, FLAT], ["shield-check", "Covered this month", 0, FLAT]]
    : allClear
    ? [["alert-triangle", "At risk · 0 purchases", 0, [0.7, 0.6, 0.45, 0.4, 0.2, 0.05]], ["hourglass-high", "Waiting on 3 sellers", 27700, [0.6, 0.65, 0.55, 0.5, 0.45, 0.4]], ["shield-check", "Covered this month", 145050, [0.15, 0.3, 0.3, 0.55, 0.7, 0.95]]]
    : [["alert-triangle", `At risk · ${risky.length} purchase${risky.length === 1 ? "" : "s"}`, risky.reduce((s, q) => s + q.amount, 0), [0.2, 0.35, 0.3, 0.55, 0.65, 0.85]],
       ["hourglass-high", `Waiting on ${waiting.length} seller${waiting.length === 1 ? "" : "s"}`, waiting.reduce((s, d) => s + d.amount, 0), [0.45, 0.5, 0.48, 0.5, 0.47, 0.5]],
       ["shield-check", "Covered this month", 104750, [0.2, 0.35, 0.3, 0.55, 0.65, 0.85]]];
  const item = itemId ? queueCol().get(itemId) : null;

  return (
    <div className="page">
      <MobileSyncRow />
      <div className="title-row title-row--home">
        <div className="title-row__text">
          <h1 className="t-h3 c-primary">Home</h1>
          <p className="t-body2 c-secondary">{fresh ? "Your data was deleted. Rafiki starts fresh from your next purchase." : queue.length ? `What needs you today, ${todayLong()}. Rafiki has checked everything else.` : `Nothing needs you today, ${todayLong()}. Rafiki is watching the rest.`}</p>
        </div>
        <div className="title-row__actions">
          <Button type="secondary" className="btn--lg" onClick={() => navigate("/invoices/new")}>Start an invoice</Button>
          <Button className="btn--lg" onClick={() => navigate("/purchases")}>Upload receipt</Button>
        </div>
      </div>

      {loading ? (
        <div className="tiles"><SkelCard /><SkelCard /><SkelCard /></div>
      ) : (
        <div className="tiles">
          {tiles.map(([icon, label, value, spark]) => (
            <div key={icon} className="kpi">
              <div className="kpi__top"><span className="kpi__chip"><Icon name={icon} size={20} /></span><p className="kpi__label t-label">{label}</p><InfoTip id={icon} label={label} text={KPI_TIPS[icon]} end={icon === "shield-check"} /></div>
              <p className="t-h3 c-primary">{ksh(value)}</p>
              <Sparkline points={spark} />
            </div>
          ))}
        </div>
      )}

      <div className="home-main">
        <section className="card" aria-labelledby="queue-h">
          <div className="queue__header">
            <div className="queue__header-text">
              <h2 id="queue-h" className="t-h5 c-primary">Needs you today</h2>
              <p className="t-body2 c-secondary">{loading ? "Checking your purchases…" : queue.length ? `${queue.length} item${queue.length === 1 ? "" : "s"}, most urgent first` : fresh ? "Nothing yet" : "Nothing waiting"}</p>
            </div>
            <Button type="tertiary" className="btn--lg" onClick={() => navigate("/purchases")}>See all in Purchases</Button>
          </div>
          {loading ? (
            <div className="queue__rows">{[0, 1, 2, 3, 4].map((i) => <SkelItem key={i} />)}</div>
          ) : queue.length ? (
            <ul className="queue__rows" style={{ listStyle: "none", margin: 0 }}>
              {queue.map((q) => (
                <li key={q._id}>
                  <button type="button" className="queue-row" onClick={() => navigate(`/home/item/${q._id}`)}>
                    <span className="icon-chip"><Icon name={q.icon} size={20} /></span>
                    <span className="queue-row__text">
                      <span className="t-semi2 c-primary">{q.title}</span>
                      <span className="t-body3 c-secondary">{q.sub}</span>
                      <span className="queue-row__why t-body3"><Icon name="receipt" size={14} />{q.why}</span>
                    </span>
                    <span className="queue-row__meta"><span className="t-figure c-primary">{ksh(q.amount)}</span><StatusBadge status={q.badge} label={q.badgeLabel} /></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: 24 }}>
              {fresh ? <EmptyState icon="file-text" title="No purchases yet" body="Snap a receipt or connect M-Pesa, and Rafiki builds your evidence from here."
                action={<Button className="btn--lg" onClick={() => navigate("/purchases")}>Add purchase</Button>} /> :
              <EmptyState title="Nothing needs you today" body="Every purchase is covered or waiting on a seller. Rafiki will tell you when that changes."
                action={<Button className="btn--lg" onClick={() => navigate("/purchases")}>See all purchases</Button>} />}
            </div>
          )}
        </section>

        <aside className="card" aria-label="Coming up">
          {loading ? (
            <div style={{ padding: 16 }}><SkelCard /></div>
          ) : (
            <div className="rail">
              <h2 className="t-semi2 c-primary">Next 30 days</h2>
              {fresh ? <p className="t-body2 c-secondary">Nothing coming up yet.</p> : railEvents(allClear).map((e) => <RailEvent key={e._id} e={e} />)}
            </div>
          )}
          <div className="rail__footer"><Button type="tertiary" className="btn--lg" onClick={() => navigate("/home/deadlines")}>See timeline</Button></div>
        </aside>
      </div>

      {item && <QueueDetail key={item._id} item={item} onClose={() => navigate("/home")} />}
    </div>
  );
}

/* Right rail: a mix of point events and 30-day spans */
const RAIL_LIVE = [["d_wanjiku", "point"], ["d_kamau", "span"], ["d_chebet", "point"], ["d_total", "point"], ["d_mwangi", "span"]];
const RAIL_CLEAR = [["d_njeri", "span"], ["d_mwangi", "span"], ["d_otieno", "span"]];
function railEvents(allClear) {
  return (allClear ? RAIL_CLEAR : RAIL_LIVE).map(([id, style]) => ({ ...deadlineCol().get(id), style })).filter((e) => e._id);
}
const TONE_STATUS = { warning: ["alert-circle", "Due soon"], rejected: ["circle-x", "At risk"], pending: ["clock-hour-3", "Waiting"] };
function RailEvent({ e }) {
  const tone = e.status === "reminded" ? "pending" : e.tone;
  const [icon, label] = e.status === "reminded" ? ["send", "Reminder sent"] : TONE_STATUS[tone];
  const status = <span className={`tl-status tl-status--${tone}`}><Icon name={icon} size={14} />{label}</span>;
  if (e.style === "span") {
    const day = Math.min(30, daysBetween(e.sent, TODAY));
    return (
      <div className="tl-span">
        <div className="tl-content">
          <p className="t-body3 c-secondary">Sent {fmtDay(e.sent)}, expires {fmtDay(e.expires)}</p>
          <p className="t-semi2 c-primary">{e.seller}</p>{status}
        </div>
        <div className="tl-track" role="progressbar" aria-valuenow={day} aria-valuemin={0} aria-valuemax={30} aria-label={`${e.seller}: day ${day} of 30`}>
          <div className={`tl-track__elapsed tl-track__elapsed--${tone === "warning" ? "warning" : "pending"}`} style={{ width: `${(day / 30) * 100}%` }} />
        </div>
        <p className="t-body3 c-secondary">Day {day} of 30</p>
      </div>
    );
  }
  const title = e.point ? `${e.seller.split(" ")[0]} ${e.seller.split(" ")[1] || ""}`.trim() + ": invoice needed to claim VAT" : `${e.seller} invoice expires`;
  return (
    <div className="tl-point">
      <span className={`tl-marker tl-marker--${tone}`} aria-hidden="true" />
      <div className="tl-content">
        <p className="t-body3 c-secondary">{fmtDay(e.point || e.expires)}</p>
        <p className="t-semi2 c-primary">{title}</p>{status}
      </div>
    </div>
  );
}

/* ───────── Queue item drawer ───────── */
const DETAILS = {
  q_total: {
    title: "Total Energies Kenya", badge: ["at-risk"], sub: "Total Energies Kenya · TE-55102 · 08 Nov 2026",
    facts: [["Seller PIN", "P051662301B", true], ["VAT included", "KSh 2,606.90"], ["eTIMS invoice", "Not found"], ["Ask before", "30 Nov 2026"]],
    tone: "warning", sTitle: "Ask Total Energies for an invoice", body: "No eTIMS invoice matches this receipt, so the KSh 2,606.90 VAT cannot be claimed yet.",
    label: "Message to the seller", value: "Please issue an eTIMS invoice for receipt TE-55102 to my PIN.", accept: "Send request",
    why: "Rafiki searched eTIMS for an invoice from P051662301B to your PIN between 1 and 15 Nov and found none.",
    done: "Request sent to Total Energies Kenya", primary: "Open purchase",
  },
  q_kenya: {
    title: "Kenya Power", badge: ["needs-fixing"], sub: "Kenya Power · KP-0094412 · 10 Nov 2026",
    facts: [["PIN on receipt", "P051099882K", true], ["PIN on invoice", "P051099882X", true], ["VAT included", "KSh 2,951.72"], ["Fix before", "30 Nov 2026"]],
    tone: "warning", sTitle: "Ask Kenya Power to correct the invoice", body: "The seller PIN on the eTIMS invoice is one letter off from the receipt, so KRA may reject this claim.",
    label: "Message to the seller", value: "Please reissue invoice KP-0094412 with seller PIN P051099882K.", accept: "Send request",
    why: "The receipt and the eTIMS invoice match on amount and date but not on the seller PIN.",
    done: "Correction request sent to Kenya Power", primary: "Open purchase",
  },
  q_remind: {
    title: "3 invoices expiring", badge: ["expiring", "Expires in 2 days"], sub: "3 invoices waiting on seller approval",
    facts: [["Wanjiku Vegetables", "KSh 4,800.00 · 19 Nov"], ["Kamau Hardware", "KSh 22,450.00 · 20 Nov"], ["Chebet Dairy", "KSh 4,100.00 · 21 Nov"]],
    tone: "info", sTitle: "Remind 3 sellers today", body: "Each seller approves the invoice on *222#. A short reminder is ready for all three.",
    label: "Message to the sellers", value: "Your invoice is waiting. Please approve it on *222# before it expires.", accept: "Send reminders",
    why: "Each invoice is on day 27 to 29 of 30. Sellers who get a reminder two days out usually approve in time.",
    done: "Reminders sent to 3 sellers", primary: "Open tracker",
  },
  q_batch: {
    title: "Weekly batch", badge: ["ready", "Ready to send"], sub: "Week of 9 Nov · 5 suppliers",
    facts: [["Mama Wanjiku", "KSh 3,200.00"], ["Otieno Fish Supplies", "KSh 3,000.00"], ["Kibet Farm", "KSh 4,600.00"], ["Chebet Dairy", "KSh 4,100.00"], ["Kamau Eggs", "KSh 3,500.00"]],
    tone: "info", sTitle: "Send 5 invoices for approval", body: "Rafiki drafted one buyer-initiated invoice per supplier from last week's M-Pesa payments. Each seller approves on *222#.",
    label: "Invoices", value: "5 drafts · KSh 18,400.00", accept: "Send batch", alt: "Edit", altToast: "Editing drafts opens the Invoice Builder (Module 4).",
    why: "All five suppliers are informal sellers on eTIMS you paid by M-Pesa last week.",
    done: "Batch sent. 5 sellers will approve on *222#", primary: "Review batch",
  },
  q_supplier: {
    title: "Confirm a supplier", badge: ["confirm", "Needs a network"], sub: "Paid every Saturday · last paid 14 Nov 2026",
    tone: "neutral", sTitle: "Which network is 0723 118 940?", body: "You paid this number every Saturday. Rafiki cannot tell if it is M-Pesa, Airtel Money or a bank.",
    label: "Network", value: "M-Pesa", accept: "Use", alt: "Other", choices: ["M-Pesa", "Airtel Money", "Bank"],
    why: "Rafiki never guesses a network from the number prefix. You confirm it once and it's saved to the supplier.",
    primary: "Open suppliers",
  },
};
const PRIMARY_TO = { q_total: "/purchases/exp_total", q_kenya: "/purchases/exp_kenya", q_remind: "/purchases/tracker?tab=expiring", q_batch: "/purchases/batch", q_supplier: "/suppliers/confirm" };

function QueueDetail({ item, onClose }) {
  const d = DETAILS[item._id];
  const [value, setValue] = useState(d.value);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const facts = item._id === "q_supplier" ? [["Phone number", "0723 118 940", true], ["Payment", "KSh 2,500.00 weekly"], ["Network", "Not set"]] : d.facts;

  async function accept() {
    setBusy(true); await wait(700);
    queueCol().update(item._id, { status: "done", resolution: value });
    if (item._id === "q_remind") ["d_wanjiku", "d_kamau", "d_chebet"].forEach((id) => deadlineCol().update(id, { status: "reminded" }));
    toast(item._id === "q_supplier" ? `Saved: 0723 118 940 is ${value}` : d.done, "circle-check");
    onClose();
  }
  function dismiss() { queueCol().update(item._id, { status: "dismissed" }); toast("Dismissed. You'll still find it in Purchases.", "x"); onClose(); }

  return (
    <Drawer title={d.title} onClose={onClose} footer={<>
      <Button type="secondary" className="btn--lg" onClick={onClose}>Close</Button>
      <Button className="btn--lg" onClick={() => navigate(PRIMARY_TO[item._id])}>{d.primary}</Button>
    </>}>
      <div className="summary">
        <StatusBadge status={d.badge[0]} label={d.badge[1]} />
        <p className="t-figure-lg c-primary">{ksh(item.amount)}</p>
        <p className="t-body2 c-secondary">{d.sub}</p>
      </div>
      <Facts rows={facts} />
      <AgentSuggestion tone={d.tone} title={d.sTitle} body={d.body} label={d.label} why={d.why}
        value={value} onValueChange={setValue} editable={!d.choices && !d.altToast}
        choices={d.choices && choosing ? d.choices : null}
        altLabel={d.alt || "Edit"} onAlt={() => { if (d.choices) setChoosing(!choosing); if (d.altToast) toast(d.altToast, "file-invoice"); }}
        acceptLabel={d.choices ? `Use ${value}` : d.accept} onAccept={accept} onDismiss={dismiss} busy={busy} />
    </Drawer>
  );
}

/* ───────── Deadlines ───────── */
const VIEWS = {
  day: { start: "2026-11-16", end: "2026-11-23", major: [["November 2026", "2026-11-16"]],
    minor: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"].map((d) => [D(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }), d]) },
  week: { start: "2026-11-09", end: "2026-12-07", major: [["November 2026", "2026-11-09"]],
    minor: [["W46 · 9 Nov", "2026-11-09"], ["W47 · 16 Nov", "2026-11-16"], ["W48 · 23 Nov", "2026-11-23"], ["W49 · 30 Nov", "2026-11-30"]] },
  month: { start: "2026-09-01", end: "2027-03-01", major: [["2026", "2026-09-01"], ["2027", "2027-01-01"]],
    minor: [["Sep", "2026-09-01"], ["Oct", "2026-10-01"], ["Nov", "2026-11-01"], ["Dec", "2026-12-01"], ["Jan", "2027-01-01"], ["Feb", "2027-02-01"]] },
};
const BARS = [18, 22, 30, 26, 34, 40, 28, 22, 36, 44, 52, 48, 40, 30, 26, 38, 46, 34, 24, 20, 28, 22, 16, 18];

export function DeadlinesPage() {
  const [view, setView] = useState("week");
  const v = VIEWS[view];
  const span = (D(v.end) - D(v.start)) / DAY;
  const pct = (dateStr, plus = 0) => ((D(dateStr) - D(v.start)) / DAY + plus) / span * 100;
  const rows = deadlineCol().find({});
  const remind = queueCol().get("q_remind");

  return (
    <div className="page">
      <div className="title-row">
        <div className="title-row__text">
          <h1 className="t-h3 c-primary">Deadlines</h1>
          <p className="t-body2 c-secondary">Every 30-day clock in one view, so nothing expires unseen. Today is {todayLong()}.</p>
        </div>
        <div className="title-row__actions">
          <Button type="secondary" className="btn--lg" onClick={() => navigate("/home")}>Back to Home</Button>
          <Button className="btn--lg" disabled={remind?.status !== "open"} onClick={() => navigate("/home/item/q_remind")}>{remind?.status === "open" ? "Remind 3 sellers" : "Reminders sent"}</Button>
        </div>
      </div>
      <section className="dl-card" aria-label="Deadlines timeline">
        <div className="dl-tabs"><Tabs label="Time scale" value={view} onChange={setView} tabs={[["day", "Day"], ["week", "Week"], ["month", "Month"]]} /></div>
        <DeadlineChart view={view} rows={rows} />
      </section>
    </div>
  );
}

/* Shared 30-day chart: Home → Deadlines and Purchases → Tracker (Timeline) */
/* Deadlines chart. The tabs set a preset range; the time bar below pans (drag the window) and zooms (drag a handle).
   Both work with the keyboard: Left/Right moves a day, Shift moves a week. */
const DOMAIN = { start: "2026-09-01", end: "2027-03-01" };
const addDays = (s, n) => new Date(D(s).getTime() + n * DAY).toISOString().slice(0, 10);
const daysBetweenD = (a, b) => Math.round((D(b) - D(a)) / DAY);
const isoWeek = (s) => { const d = D(s); const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - (d.getUTCDay() || 7))); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7); };
function scaleFor(start, end) {
  const span = daysBetweenD(start, end), minor = [], major = [];
  const monthStarts = (fmt) => { const out = [[fmt(start), start]]; let d = start.slice(0, 8) + "01"; for (;;) { d = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 1)).toISOString().slice(0, 10); if (d >= end) break; out.push([fmt(d), d]); } return out; };
  if (span <= 14) {
    for (let d = start; d < end; d = addDays(d, 1)) minor.push([D(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }), d]);
    major.push(...monthStarts((d) => D(d).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })));
  } else if (span <= 75) {
    let d = addDays(start, (8 - (D(start).getUTCDay() || 7)) % 7);
    if (d !== start) minor.push(["", start]);
    for (; d < end; d = addDays(d, 7)) minor.push([`W${isoWeek(d)} · ${fmtDay(d)}`, d]);
    major.push(...monthStarts((d) => D(d).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })));
  } else {
    minor.push(...monthStarts((d) => D(d).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })));
    const years = [[start.slice(0, 4), start]]; for (let y = +start.slice(0, 4) + 1; `${y}-01-01` < end; y++) years.push([String(y), `${y}-01-01`]);
    major.push(...years);
  }
  return { start, end, major, minor };
}

export function DeadlineChart({ view = "week", rows }) {
  const [range, setRange] = useState({ start: VIEWS[view].start, end: VIEWS[view].end });
  useEffect(() => setRange({ start: VIEWS[view].start, end: VIEWS[view].end }), [view]);
  const v = scaleFor(range.start, range.end);
  const span = daysBetweenD(v.start, v.end);
  const pct = (dateStr, plus = 0) => ((D(dateStr) - D(v.start)) / DAY + plus) / span * 100;
  const inRange = (d) => d >= v.start && d < v.end;
  const sups = db.collection("suppliers").find({});
  const openRow = (r) => {
    const sup = sups.find((x) => x.deadline === r._id) || sups.find((x) => x.name === r.seller);
    if (r.point) navigate("/purchases/exp_total"); else if (sup) navigate(`/suppliers/${sup._id}`); else navigate("/purchases/tracker");
  };
  return (
    <div className="dl-chart">
      <div className="dl-row dl-row--scale"><span className="dl-label" style={{ minHeight: 8 }} /><Scale v={v} pct={pct} /></div>
      <div className="dl-annot-lane">
        {span <= 75 && inRange("2026-11-21") && <div className="dl-annot" style={{ left: `${Math.min(92, Math.max(8, pct("2026-11-21")))}%` }}>
          <span className="dl-annot__box">KSh 31,350 expires 19 to 21 Nov</span><span className="dl-annot__leader" /><span className="dl-annot__dot" />
        </div>}
      </div>
      {rows.map((r) => {
        const out = r.point && (pct(r.point) < 0 || pct(r.point) > 100);
        return (
          <div key={r._id} className="dl-row">
            <button type="button" className="dl-label dl-label--btn" onClick={() => openRow(r)} aria-label={`Open ${r.seller}`}><b className="c-primary">{r.seller}</b><span className="c-secondary">{ksh(r.amount)}{out ? ` · ${fmtDay(r.point)}` : ""}</span></button>
            <div className="dl-track">
              {r.point ? (!out && (
                <button type="button" className="dl-point" style={{ left: `${pct(r.point)}%` }} onClick={() => openRow(r)}>
                  <span className="dl-point__mark"><Icon name="circle-x" size={14} /></span>
                  <span className="t-body3"><b className="t-semi3 c-primary" style={{ display: "block" }}>{r.pointTitle}</b><span className="c-secondary">{fmtDay(r.point)} · At risk</span></span>
                </button>
              )) : (() => {
                const a = Math.max(0, pct(r.sent)), b = Math.min(100, pct(r.expires, 0.5));
                if (b <= 0 || a >= 100) return null;
                const tone = r.status === "reminded" ? "pending" : r.tone;
                return (
                  <button type="button" className={`dl-span dl-span--${tone}`} style={{ left: `${a}%`, width: `${b - a}%` }} onClick={() => openRow(r)}
                    title={`${r.seller}: sent ${fmtDay(r.sent)}, expires ${fmtDay(r.expires)}`} aria-label={`${r.seller}, sent ${fmtDay(r.sent)}, expires ${fmtDay(r.expires)}. Open supplier`}>
                    <Icon name={tone === "warning" ? "alert-circle" : "clock-hour-3"} size={14} />
                  </button>
                );
              })()}
            </div>
          </div>
        );
      })}
      <div className="dl-row dl-row--bar" style={{ paddingTop: 8, paddingBottom: 0 }}><span className="dl-label" style={{ minHeight: 8 }} /><TimeBar range={range} onChange={setRange} /></div>
      <div className="dl-overlay" aria-hidden="true">
        {inRange(TODAY) && <div className="dl-today" style={{ left: `${pct(TODAY, 0.5)}%` }}><span className="dl-today__flag">Today</span><span className="dl-today__line" /></div>}
        {span <= 14 && inRange("2026-11-19") && (
          <div className="dl-marker" style={{ left: `${pct("2026-11-19", 0.5)}%` }}><span className="dl-marker__flag"><Icon name="calendar-due" size={14} />19 Nov</span><span className="dl-marker__line" /></div>
        )}
      </div>
    </div>
  );
}

function Scale({ v, pct }) {
  const cells = (list, cls) => list.map(([label, d], i) => {
    const l = Math.max(0, pct(d)), next = list[i + 1] ? pct(list[i + 1][1]) : 100;
    return <span key={label + d} className={`dl-cell ${cls}`} style={{ left: `${l}%`, width: `${next - l}%` }}>{label}</span>;
  });
  return (
    <div className="dl-scale">
      <div className="dl-scale__row">{cells(v.major, "dl-cell--major")}</div>
      <div className="dl-scale__row">{cells(v.minor, "dl-cell--minor")}</div>
    </div>
  );
}

function TimeBar({ range, onChange }) {
  const plot = useRef(null);
  const total = daysBetweenD(DOMAIN.start, DOMAIN.end);
  const a = daysBetweenD(DOMAIN.start, range.start), b = daysBetweenD(DOMAIN.start, range.end);
  const pctOf = (n) => (n / total) * 100;
  const set = (s, e) => {
    const len = e - s;
    if (s < 0) { s = 0; e = Math.max(len, 3); } if (e > total) { e = total; s = Math.min(s, total - 3); }
    onChange({ start: addDays(DOMAIN.start, Math.round(s)), end: addDays(DOMAIN.start, Math.round(e)) });
  };
  function drag(kind, e) {
    e.preventDefault();
    const w = plot.current.getBoundingClientRect().width, x0 = e.clientX, a0 = a, b0 = b;
    const move = (ev) => {
      const dd = Math.round(((ev.clientX - x0) / w) * total);
      if (kind === "move") { const len = b0 - a0; const s = Math.min(Math.max(0, a0 + dd), total - len); set(s, s + len); }
      if (kind === "start") set(Math.min(a0 + dd, b0 - 3), b0);
      if (kind === "end") set(a0, Math.max(b0 + dd, a0 + 3));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  const key = (kind) => (e) => {
    const step = e.shiftKey ? 7 : 1, dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!dir) return; e.preventDefault();
    if (kind === "move") { const len = b - a; const s = Math.min(Math.max(0, a + dir * step), total - len); set(s, s + len); }
    if (kind === "start") set(Math.min(a + dir * step, b - 3), b);
    if (kind === "end") set(a, Math.max(b + dir * step, a + 3));
  };
  const months = VIEWS.month;
  const mp = (d) => pctOf(daysBetweenD(DOMAIN.start, d));
  const barDays = total / BARS.length;
  return (
    <div className="timebar">
      <div className="timebar__plot" ref={plot}>
        <div className="timebar__window" role="slider" tabIndex={0} aria-label="Visible dates. Drag or use the arrow keys to move"
          aria-valuemin={0} aria-valuemax={total} aria-valuenow={a} aria-valuetext={`${fmtDay(range.start)} to ${fmtDay(addDays(range.end, -1))}`}
          style={{ left: `${pctOf(a)}%`, width: `${pctOf(b - a)}%` }} onPointerDown={(e) => drag("move", e)} onKeyDown={key("move")} />
        <div className="timebar__bars" aria-hidden="true">{BARS.map((h, i) => <span key={i} className={(i + 1) * barDays > a && i * barDays < b ? "on" : ""} style={{ height: h }} />)}</div>
        <span className="timebar__handle" role="slider" tabIndex={0} aria-label="Start date" aria-valuemin={0} aria-valuemax={total} aria-valuenow={a} aria-valuetext={fmtDay(range.start)}
          style={{ left: `${pctOf(a)}%` }} onPointerDown={(e) => drag("start", e)} onKeyDown={key("start")} />
        <span className="timebar__handle" role="slider" tabIndex={0} aria-label="End date" aria-valuemin={0} aria-valuemax={total} aria-valuenow={b} aria-valuetext={fmtDay(addDays(range.end, -1))}
          style={{ left: `${pctOf(b)}%` }} onPointerDown={(e) => drag("end", e)} onKeyDown={key("end")} />
      </div>
      <div className="dl-scale" aria-hidden="true">
        <div className="dl-scale__row">{[["2026", "2026-09-01", "2027-01-01"], ["2027", "2027-01-01", "2027-03-01"]].map(([l, x, y]) => <span key={l} className="dl-cell dl-cell--major" style={{ left: `${mp(x)}%`, width: `${mp(y) - mp(x)}%` }}>{l}</span>)}</div>
        <div className="dl-scale__row">{months.minor.map(([l, d], i) => <span key={l} className="dl-cell dl-cell--minor" style={{ left: `${mp(d)}%`, width: `${(i < 5 ? mp(months.minor[i + 1][1]) : 100) - mp(d)}%` }}>{l}</span>)}</div>
      </div>
    </div>
  );
}

/* ───────── Expense detail (record opened) ───────── */
export function ExpenseDetail({ id }) {
  const exp = db.collection("expenses").get(id);
  if (!exp) return <EmptyState icon="file-search" title="Purchase not found" body="It may have been removed. Purchases arrive in Module 3." action={<Button onClick={() => navigate("/home")}>Back to Home</Button>} />;
  const applied = exp.match?.applied;
  const setApplied = (v) => db.collection("expenses").update(id, { match: { ...exp.match, applied: v } });

  function exportEvidence() {
    const lines = [["Record", "Detail", "Amount", "Status"], ...exp.records.map((r) => [r.title, r.sub, exp.amount, r.status])];
    const csv = lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `evidence-${exp.ref.replace(/\s+/g, "-")}.csv`; a.click();
    toast("Evidence exported", "download");
  }

  return (
    <div className="page">
      <Button type="tertiary" size="sm" className="back-btn" onClick={() => navigate("/purchases")}>Back to purchases</Button>
      <section className="exp-summary" aria-labelledby="exp-h">
        <div className="exp-summary__head">
          <div className="exp-summary__id"><h1 id="exp-h" className="t-semi1 c-primary">{exp.seller}</h1><p className="t-medium2 c-secondary">{exp.ref}</p></div>
          <StatusBadge status={exp.status} />
        </div>
        <div className="exp-summary__amount">
          <p className="t-overline c-secondary">Total amount</p>
          <p className="t-figure-lg c-primary">{ksh(exp.amount)}</p>
          <p className="t-medium2 c-secondary">Incl. VAT {ksh(exp.vat)}</p>
        </div>
        <p className="t-medium2 c-primary">{exp.note}</p>
        <div className="exp-summary__divider" />
        <div className="exp-facts">
          {[["Supplier PIN", exp.pin, true], ["Source", exp.source], ["Date", exp.date], ["Payment", exp.payment]].map(([k, v, mono]) => (
            <div key={k} className="exp-fact"><p className="t-overline c-secondary">{k}</p><p className={mono ? "t-mono-sm c-primary" : "t-medium2 c-primary"}>{v}</p></div>
          ))}
        </div>
        <div className="actions actions--tight"><Button type="secondary" className="btn--lg" onClick={exportEvidence}>Export evidence</Button></div>
      </section>
      <div className="exp-records">
        <section className="evidence exp-records__main" aria-labelledby="ev-h">
          <div className="evidence__head">
            <div className="evidence__head-text"><h2 id="ev-h" className="t-h6 c-primary">Evidence trail</h2><p className="t-body3 c-secondary">{exp.records.length} records · oldest first</p></div>
            <Button type="tertiary" size="sm" icon="download" onClick={exportEvidence}>Export</Button>
          </div>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {exp.records.map((r, i) => (
              <li key={r.title} className="trail-item">
                <span className="trail-marker" aria-hidden="true">
                  <span className={`trail-marker__line ${i > 0 ? "trail-marker__line--on" : ""}`} />
                  <span className="trail-marker__node" />
                  <span className={`trail-marker__line ${i < exp.records.length - 1 ? "trail-marker__line--on" : ""}`} />
                </span>
                <div className="ev-row">
                  <span className="icon-chip"><Icon name={r.icon} size={20} /></span>
                  <div className="ev-row__text"><p className="t-semi2 c-primary">{r.title}</p><p className="t-body3 c-secondary">{r.sub}</p></div>
                  <div className="queue-row__meta"><p className="t-figure c-primary">{ksh(exp.amount)}</p><StatusBadge status={r.status} /></div>
                  <Button type="tertiary" size="sm" onClick={() => toast("Records open in Evidence (Module 5).", "file-search")}>Open</Button>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div className="exp-records__aside">
          <AgentSuggestion tone="draft" title={exp.match.title} body={exp.match.body} label={exp.match.label} value={exp.match.value}
            applied={applied} onUndo={() => { setApplied(false); toast("Undone. The seller match was removed.", "refresh"); }}
            acceptLabel="Apply" onAccept={() => { setApplied(true); toast("Seller match applied"); }} onDismiss={() => toast("Kept as is", "x")}
            altLabel="Edit" editable onValueChange={() => {}} why="The PIN on the receipt matches Bidco's KRA PIN, and you bought from them 4 times before." />
        </div>
      </div>
    </div>
  );
}

/* "i" next to a stat: explains the term in plain words. Hover, focus or tap to show; Esc closes. */
const KPI_TIPS = {
  "alert-triangle": "At risk means KRA may not accept these purchases as expenses, because no eTIMS invoice with your PIN is on record yet. Fix them before you file to keep the deduction.",
  "hourglass-high": "Invoices you raised for sellers who are not on eTIMS. Each seller has 30 days to approve on *222#. Until they approve, the expense is not covered.",
  "shield-check": "Purchases backed by an eTIMS invoice that carries your PIN. KRA accepts these as expenses when you file.",
};
function InfoTip({ id, label, text, end }) {
  const [open, setOpen] = useState(false);
  const tid = `tip-${id}`;
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open]);
  return (
    <span className={`tip ${end ? "tip--end" : ""}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="tip__btn" aria-label={`What does “${label}” mean?`} aria-describedby={open ? tid : undefined} aria-expanded={open}
        onClick={() => setOpen(!open)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        <Icon name="info-circle" size={20} />
      </button>
      {open && <span role="tooltip" id={tid} className="tip__bubble t-body3">{text}</span>}
    </span>
  );
}
