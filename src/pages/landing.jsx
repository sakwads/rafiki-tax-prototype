import { useEffect, useRef, useState } from "react";
import { Button, Icon, Logo, PinCard, StatusBadge, TrustChip, toast } from "../components/ui.jsx";
import { Facts, AgentSuggestion } from "../components/patterns.jsx";
import { navigate } from "../router.js";
import { db, session } from "../db.js";
import { applyTheme } from "./settings.jsx";

// Landing page. Matches Figma 04. Landing and Login, page "01. Landing Page".
// Sample data follows the product story: Mama Wanjiku is not on eTIMS, PIN P051234567A, 0712 345 678.

const start = () => navigate(session.user() ? "/home" : "/signup");
const signIn = () => navigate(session.user() ? "/home" : "/login");
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function Eyebrow({ children }) {
  return <span className="lp-eyebrow t-body2"><span className="lp-eyebrow__dot" aria-hidden="true" />{children}</span>;
}
function SectionHeading({ eyebrow, title, sub, align = "center", id }) {
  return (
    <div className={`lp-head lp-head--${align}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="lp-h2">{title}</h2>
      {sub && <p className="lp-sub">{sub}</p>}
    </div>
  );
}
function Point({ icon, title, children, onBrand }) {
  return (
    <div className={`lp-point ${onBrand ? "lp-point--brand" : ""}`}>
      <span className="lp-point__icon" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <h3 className="lp-point__title">{title}</h3>
      <p className="lp-point__text">{children}</p>
    </div>
  );
}
function Card({ children, className = "" }) { return <div className={`lp-card ${className}`}>{children}</div>; }

/* ───────── Snapshots (static product pictures) ───────── */
function ReceiptChecked({ ok }) {
  return (
    <div className="lp-snap lp-receipt" aria-hidden="true">
      <div className="lp-snap__head"><span className="lp-snap__icon"><Icon name="receipt" size={20} /></span><span className="t-semi2 c-primary">Receipt checked</span><StatusBadge status={ok ? "covered" : "at-risk"} /></div>
      <Facts rows={[["Seller", "Naivas Supermarket, Kisii"], ["Amount", <b key="a">KSh 2,350.00</b>], ["Date", "Sat 14 Nov 2026"], ["eTIMS invoice", ok ? "Found" : "Not found yet"], ["PIN on invoice", ok ? "P051234567Z" : "Missing", ok]]} />
      {ok
        ? <div className="lp-result lp-result--ok"><Icon name="circle-check" size={20} /><span><b>Covered</b><br />The eTIMS invoice has your PIN. This expense counts.</span></div>
        : <div className="lp-result lp-result--bad"><Icon name="circle-x" size={20} /><span><b>Your PIN is missing</b><br />Ask the cashier to reissue the invoice with your PIN before you leave the counter.</span></div>}
      {ok ? <Button block tabIndex={-1}>Done</Button> : <div className="lp-row-end"><Button type="tertiary" size="sm" tabIndex={-1}>Retake photo</Button><Button size="sm" tabIndex={-1}>Show PIN card</Button></div>}
    </div>
  );
}

function SellerSuggestion() {
  const [state, setState] = useState(null);
  return (
    <div className="lp-float lp-float--suggest">
      <AgentSuggestion title="Seller looks like Mama Wanjiku" body="Matched from 6 past M-Pesa payments for vegetables." label="Seller" value="Mama Wanjiku"
        why="The same number, 0712 345 678, was paid for vegetables on six Saturdays."
        applied={state === "ok"} appliedText="Seller set to Mama Wanjiku" onUndo={() => setState(null)}
        onAccept={() => setState("ok")} onDismiss={() => toast("Dismissed. This is only a preview.")} onAlt={() => toast("In the app you could change the seller here.")} />
    </div>
  );
}

function FindingCard() {
  const fixes = [
    ["gas-station", "Fuel receipts missing your PIN", "4 receipts · Total Energies, Rubis", "Ask the stations to reissue with your PIN", "KSh 38,000.00"],
    ["user", "Mama Wanjiku, no invoices yet", "12 M-Pesa payments · not on eTIMS", "Set up buyer-initiated invoices", "KSh 52,000.00"],
    ["plant-2", "Kibet Farm is not on eTIMS", "5 M-Pesa payments", "Send the setup guide, then invoice", "KSh 31,000.00"],
  ];
  return (
    <div className="lp-snap lp-finding" aria-label="Example: your first finding">
      <p className="lp-finding__eyebrow t-body3 c-secondary"><Icon name="sparkles-2" size={16} />Your first finding</p>
      <p className="lp-finding__title">KSh 140,000 of your KSh 820,000 in expenses last quarter is at risk</p>
      <p className="t-body1 c-secondary">These receipts and payments won’t count at tax time yet. Three fixes recover most of it.</p>
      <div className="lp-finding__split">
        {[["covered", "KSh 610,000", "74% of spend"], ["exempt", "KSh 70,000", "9% · no eTIMS needed"], ["at-risk", "KSh 140,000", "17% of spend"]].map(([s, a, t]) => (
          <div key={s} className="lp-finding__tile"><StatusBadge status={s} /><b>{a}</b><span className="t-body3 c-secondary">{t}</span></div>
        ))}
      </div>
      <p className="t-semi2 c-primary">Fix these first</p>
      <ul className="lp-fixes">
        {fixes.map(([i, t, d, w, a]) => (
          <li key={t}><span className="lp-snap__icon"><Icon name={i} size={20} /></span>
            <span className="lp-fixes__text"><b>{t}</b><span className="t-body3 c-secondary">{d}</span><span className="t-body3 c-secondary"><Icon name="arrow-right" size={14} />{w}</span></span>
            <span className="lp-fixes__meta"><b>{a}</b><StatusBadge status="needs-fixing" /></span></li>
        ))}
      </ul>
      <div className="lp-row-end"><Button type="tertiary" size="sm" tabIndex={-1}>See all 23 items</Button><Button size="sm" tabIndex={-1}>Start fixing</Button></div>
      <p className="t-body3 c-secondary">Read from your M-Pesa statement, Aug to Oct 2026. Nothing has been sent to KRA.</p>
    </div>
  );
}

function BuilderSnap() {
  const field = (tag, tone, label, value, help, extra) => (
    <div className={`lp-field lp-field--${tone}`}>
      <span className="lp-field__tag t-body3">{tag}{extra}</span>
      <span className="t-overline c-secondary">{label}</span>
      <span className={`lp-field__box ${tone === "need" ? "lp-field__box--empty" : ""}`}>{value}</span>
      <span className="t-body3 c-secondary">{help}</span>
    </div>
  );
  return (
    <div className="lp-snap lp-builder" aria-hidden="true">
      <div className="lp-snap__head"><b className="t-h5">Buyer-initiated invoice</b><StatusBadge status="draft" /></div>
      <p className="t-body3 c-secondary">Drafted by Rafiki · Sat 14 Nov 2026</p>
      <div className="lp-builder__grid">
        {field(<><Icon name="sparkles-2" size={14} />Filled by Rafiki</>, "agent", "Seller", "Mama Wanjiku", "Matched from 6 past M-Pesa payments", <StatusBadge status="validated" outline label="High confidence" />)}
        {field(<><Icon name="alert-circle" size={14} />Needs you</>, "need", "Seller PIN or ID", "Enter PIN or ID", "We could not find the seller PIN")}
        {field(<><Icon name="pencil" size={14} />Edited by you</>, "user", "Date", "Sat 14 Nov 2026", "Changed by you")}
        {field(<><Icon name="sparkles-2" size={14} />Filled by Rafiki</>, "agent", "Matched payment", "KSh 2,500 to 0712 345 678", "Matched from your M-Pesa line on Sat 14 Nov")}
      </div>
    </div>
  );
}

function SupplierSnap() {
  return (
    <div className="lp-snap lp-supplier" aria-hidden="true">
      <div className="lp-supplier__top">
        <span className="avatar avatar--48">MW</span>
        <div><b className="t-h5">Mama Wanjiku</b><p className="t-body3 c-secondary">PIN <span className="t-mono-sm">P051234567A</span> · 0712 345 678</p>
          <p className="lp-badges"><StatusBadge status="not-etims" /><StatusBadge status="not-vat" /></p></div>
      </div>
      <div className="lp-row-end"><Button type="secondary" size="sm" tabIndex={-1}>Repeat last</Button><Button type="tertiary" size="sm" tabIndex={-1}>Remind</Button><Button size="sm" tabIndex={-1}>Draft invoice</Button></div>
      <p className="t-body3 c-secondary"><b className="c-primary">KSh 6,500.00</b> waiting on her · 2 invoices · next expires in 9 days</p>
      <ul className="lp-list">
        {[["Vegetables, Sat 25 Oct", "Buyer-initiated · sent 28 Oct", "Day 21 of 30 · expires in 9 days", "KSh 4,500.00", "pending"],
          ["Sukuma and nyanya, Sat 14 Nov", "Buyer-initiated · sent 15 Nov", "Day 4 of 30 · SMS delivered", "KSh 2,000.00", "pending"],
          ["Draft from M-Pesa, Sat 7 Nov", "Agent draft · not sent", "Matched from 6 past Saturday payments", "KSh 2,500.00", "needs-fixing"]].map(([t, d, w, a, s]) => (
          <li key={t}><span className="lp-snap__icon"><Icon name="file-text" size={20} /></span><span className="lp-fixes__text"><b>{t}</b><span className="t-body3 c-secondary">{d}</span><span className="t-body3 c-secondary">{w}</span></span><span className="lp-fixes__meta"><b>{a}</b><StatusBadge status={s} /></span></li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceSnap() {
  const rows = [["message-circle", "Message from Mama Wanjiku", "WhatsApp · Sat 14 Nov 2026", "KSh 2,500.00", "validated"],
    ["device-mobile", "M-Pesa to 0712 345 678", "Payment · Sat 14 Nov 2026", "KSh 2,500.00", "validated"],
    ["file-invoice", "Buyer-initiated invoice, Mama Wanjiku", "Not sent to the seller yet", null, "at-risk"],
    ["file-text", "Annual return, purchases", "Purchases line · 2026 return", "KSh 2,500.00", "pending"]];
  return (
    <div className="lp-snap lp-evidence" aria-hidden="true">
      <div className="lp-snap__head"><div><b className="t-h5">Evidence trail</b><p className="t-body3 c-secondary">4 records · oldest first</p></div><Button type="tertiary" size="sm" icon="download" tabIndex={-1}>Export</Button></div>
      <p className="lp-warn t-body3"><Icon name="alert-triangle" size={16} />1 record missing. The pack will list the gap.</p>
      <ol className="lp-trail">
        {rows.map(([i, t, d, a, s]) => (
          <li key={t} className={a ? "" : "lp-trail--gap"}><span className="lp-snap__icon"><Icon name={i} size={20} /></span><span className="lp-fixes__text"><b>{t}</b><span className="t-body3 c-secondary">{d}</span></span>
            <span className="lp-fixes__meta">{a && <b>{a}</b>}<StatusBadge status={s} /></span><Button type="tertiary" size="sm" tabIndex={-1}>{a ? "Open" : "Add"}</Button></li>
        ))}
      </ol>
    </div>
  );
}

function PaySnap() {
  return (
    <div className="lp-snap lp-pay" aria-hidden="true">
      <Facts rows={[["Pay to", "Mama Wanjiku"], ["Network", "M-Pesa"], ["From", "Business account"], ["Invoice", "Draft, 3 lines"], ["Amount", <b key="a">KSh 2,500.00</b>]]} />
      <p className="lp-note t-body3"><Icon name="info-circle" size={16} />Rafiki never pays for you. You confirm this payment with your app PIN, and it goes from your account.</p>
      <div className="lp-pay__opts">
        <div className="lp-opt"><b>See payments</b><span className="t-body3 c-secondary">Rafiki reads payments coming into this account.</span><StatusBadge status="validated" label="M-Pesa" /></div>
        <div className="lp-opt"><b>Pay suppliers</b><span className="t-body3 c-secondary">Rafiki drafts a payment and you confirm each one. Off until you turn it on.</span><StatusBadge status="draft" label="M-Pesa" /></div>
      </div>
    </div>
  );
}

/* ───────── Hero carousel ───────── */
const SLIDES = [
  { label: "Your first finding", el: () => (<><FindingCard /><div className="lp-float lp-float--left"><ReceiptChecked ok /></div><SellerSuggestion /></>) },
  { label: "Invoice builder", el: () => (<><BuilderSnap /><SellerSuggestion /></>) },
  { label: "Supplier profile", el: () => <SupplierSnap /> },
  { label: "Evidence trail", el: () => <EvidenceSnap /> },
];
function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (paused || reduce) return;
    const t = setTimeout(() => setI((i + 1) % SLIDES.length), 7000);
    return () => clearTimeout(t);
  }, [i, paused, reduce]);
  return (
    <div className="lp-carousel" aria-roledescription="carousel" aria-label="What Rafiki shows you" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="lp-stage" aria-live={paused ? "polite" : "off"} aria-roledescription="slide" aria-label={`${i + 1} of ${SLIDES.length}: ${SLIDES[i].label}`}>
        <div className="lp-stage__inner" key={i}>{SLIDES[i].el()}</div>
      </div>
      <div className="lp-dots" role="group" aria-label="Choose a slide">
        {SLIDES.map((s, n) => (
          <button key={s.label} type="button" className={`lp-dot ${n === i ? "lp-dot--on" : ""}`} aria-label={`Show ${s.label}`} aria-pressed={n === i} onClick={() => setI(n)} />
        ))}
      </div>
    </div>
  );
}

/* ───────── Features tabs ───────── */
const FEATURES = [
  { id: "purchases", tab: "Purchases", icon: "receipt", eyebrow: "Purchases", title: "Snap it at the counter", desc: "Show the cashier your PIN card, snap the receipt, and know before you leave whether the expense will count.",
    points: ["A PIN card the cashier can read at a glance", "Know at the till if the receipt counts", "Ask for a reissue before you walk away"], link: "Explore purchases", to: "/purchases",
    snap: () => (<div className="lp-feature__stack"><PinCard name="Wanjiku Fresh Greens Ltd" pin="P051234567Z" onCopy={() => toast("PIN copied")} /><div className="lp-float lp-float--receipt"><ReceiptChecked /></div></div>) },
  { id: "builder", tab: "Invoice builder", icon: "file-text", eyebrow: "Invoice builder", title: "The agent drafts. You confirm.", desc: "Turn an M-Pesa line, a voice note or a shared WhatsApp message into a buyer-initiated invoice. Mixed Swahili and English welcome.",
    points: ["“Nimenunua sukuma ya 2k kwa Mama Wanjiku” becomes a clean draft", "Every agent-filled field shows its confidence and why", "Nothing is sent until you confirm"], link: "See the builder", to: "/invoices", flip: true,
    snap: () => (<div className="lp-feature__stack"><BuilderSnap /><SellerSuggestion /></div>) },
  { id: "suppliers", tab: "Suppliers", icon: "users", eyebrow: "Suppliers", title: "Keep your sellers moving", desc: "Every regular supplier gets a profile: PIN, eTIMS status, the invoices waiting on them and the 30-day countdown.",
    points: ["Spot suppliers from your M-Pesa payments", "Remind a seller with a ready *222# guide", "See what is still waiting on sellers"], link: "Meet supplier profiles", to: "/suppliers", snap: () => <SupplierSnap /> },
  { id: "evidence", tab: "Evidence", icon: "clipboard-search", eyebrow: "Evidence trail", title: "Proof, ready before anyone asks", desc: "Each expense keeps its trail: the chat or receipt, the M-Pesa line, the eTIMS invoice and the line in your return.",
    points: ["See exactly what the agent did and why", "Spot the missing record in the chain", "Export one pack for KRA or your accountant"], link: "See an evidence pack", to: "/evidence", flip: true, snap: () => <EvidenceSnap /> },
  { id: "pay", tab: "Pay with Rafiki", icon: "wallet", eyebrow: "Pay with Rafiki", title: "Pay a supplier and the invoice is ready", desc: "Connect your business account, then pay from Rafiki. The supplier, the amount and the buyer-initiated invoice come together in one step. You confirm every payment.",
    points: ["Reading and paying are separate permissions", "Rafiki never pays for you. You confirm with your app PIN", "Disconnect any time"], link: "Explore paying", to: "/settings?tab=connected", snap: () => <PaySnap /> },
];
function Features() {
  const [cur, setCur] = useState(0);
  const refs = useRef([]);
  const f = FEATURES[cur];
  const onKey = (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const n = (cur + d + FEATURES.length) % FEATURES.length; setCur(n); refs.current[n]?.focus();
  };
  return (
    <>
      <div className="lp-tabs" role="tablist" aria-label="Features" onKeyDown={onKey}>
        {FEATURES.map((x, n) => (
          <button key={x.id} ref={(el) => (refs.current[n] = el)} type="button" role="tab" id={`tab-${x.id}`} aria-controls={`panel-${x.id}`} aria-selected={n === cur} tabIndex={n === cur ? 0 : -1}
            className={`lp-tab t-medium2 ${n === cur ? "lp-tab--on" : ""}`} onClick={() => setCur(n)}>{x.tab}</button>
        ))}
      </div>
      <div className={`lp-feature ${f.flip ? "lp-feature--flip" : ""}`} role="tabpanel" id={`panel-${f.id}`} aria-labelledby={`tab-${f.id}`}>
        <div className="lp-feature__copy">
          <span className="lp-point__icon lp-point__icon--lg" aria-hidden="true"><Icon name={f.icon} size={24} /></span>
          <Eyebrow>{f.eyebrow}</Eyebrow>
          <h3 className="lp-h3">{f.title}</h3>
          <p className="lp-sub lp-sub--left">{f.desc}</p>
          <ul className="lp-checks">{f.points.map((p) => <li key={p}><Icon name="circle-check" size={20} />{p}</li>)}</ul>
          <a className="lp-link t-medium2" href={`#${f.to}`} onClick={(e) => { if (!session.user()) { e.preventDefault(); toast("Sign in first to explore the app. Any phone or email works in the prototype.", "info-circle", { action: { label: "Sign in", onClick: signIn } }); } }}>{f.link}</a>
        </div>
        <div className="lp-feature__stage">{f.snap()}</div>
      </div>
    </>
  );
}

/* ───────── Stay ahead (bento) ───────── */
function NotificationsSnap() {
  const items = [["hourglass", "Invoice expires in 3 days", "Kamau Hardware · Day 27 of 30", "Today, 9:00", "Remind"],
    ["circle-check", "Gathoni Packaging approved your invoice", "Packaging, KSh 14,600 now counts as an expense", "2 min ago", "View"],
    ["sparkles-2", "4 receipts are missing your PIN", "KSh 38,000 at risk · Total Energies, Rubis", "Yesterday", "Review"]];
  return (
    <div className="lp-snap lp-notes" aria-hidden="true">
      <div className="lp-snap__head"><b>Notifications</b><span className="t-body3 c-secondary">3 unread</span><Button type="tertiary" size="sm" tabIndex={-1}>Mark all read</Button></div>
      <p className="t-body3 c-secondary">Today</p>
      <ul className="lp-list">
        {items.map(([i, t, d, w, a]) => (
          <li key={t} className="lp-list__unread"><span className="lp-unread" /><span className="lp-snap__icon"><Icon name={i} size={20} /></span><span className="lp-fixes__text"><b>{t}</b><span className="t-body3 c-secondary">{d}</span><span className="t-body3 c-secondary">{w}</span></span><Button type="tertiary" size="sm" tabIndex={-1}>{a}</Button></li>
        ))}
      </ul>
    </div>
  );
}
function NetworkSnap() {
  const nodes = [["Naivas", "KSh 36k", 18, 22, "ok"], ["Unga Ltd", "KSh 35k", 48, 8, "ok"], ["Safaricom", "KSh 27k", 84, 10, "bad"], ["Bidco", "KSh 18k", 30, 74, "ok"], ["Total Energies", "KSh 19k", 12, 52, "bad"], ["Informal sellers", "12 suppliers", 82, 74, "warn"]];
  return (
    <div className="lp-net" role="img" aria-label="Supplier network: your business in the middle, linked to Naivas, Unga Ltd, Bidco and others. Safaricom and Total Energies have unmatched receipts.">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="lp-net__lines" aria-hidden="true">
        {nodes.map(([n, , x, y, s]) => <line key={n} x1="50" y1="46" x2={x} y2={y} className={s === "warn" ? "lp-net__dash" : ""} />)}
      </svg>
      <div className="lp-net__node lp-net__node--hub" style={{ left: "50%", top: "46%" }}><span className="lp-net__dot lp-net__dot--ok"><Icon name="circle-check" size={20} /></span><b>Your business</b><span>KSh 1.2M</span></div>
      {nodes.map(([n, a, x, y, s]) => (
        <div key={n} className="lp-net__node" style={{ left: `${x}%`, top: `${y}%` }}>
          <span className={`lp-net__dot lp-net__dot--${s}`}><Icon name={s === "bad" ? "circle-x" : s === "warn" ? "alert-triangle" : "circle-check"} size={16} /></span><b>{n}</b><span>{a}</span>
        </div>
      ))}
      <p className="lp-net__take t-body3"><b>Takeaway:</b> two suppliers hold most of your unmatched receipts.</p>
    </div>
  );
}

/* ───────── FAQ ───────── */
const FAQ = [
  ["Do I need to be on eTIMS already?", "No. You need your business KRA PIN. Rafiki checks the invoices sellers send to it, and for small sellers who aren’t on eTIMS it helps you raise a buyer-initiated invoice."],
  ["Does Rafiki send anything to KRA on its own?", "No. Rafiki prepares drafts. Anything going to KRA or to a seller waits for your tap, and a last screen lists exactly what will be sent."],
  ["Can I type in Swahili, or a mix?", "Yes. Type or say what you bought in English, Kiswahili or a mix, like “Nimenunua sukuma ya 2k kwa Mama Wanjiku”. Rafiki reads all three the same way."],
  ["What if a seller doesn’t approve in 30 days?", "The invoice expires. Rafiki tells you before it does and shows your next steps: remind the seller, draft it again, or declare the purchase without eTIMS."],
];
function Faq() {
  const [open, setOpen] = useState(-1);
  return (
    <div className="lp-faq">
      {FAQ.map(([q, a], n) => (
        <div key={q} className="lp-faq__item">
          <h3 className="lp-faq__q"><button type="button" aria-expanded={open === n} aria-controls={`faq-${n}`} onClick={() => setOpen(open === n ? -1 : n)}>
            <span>{q}</span><Icon name="chevron-down" size={20} /></button></h3>
          {open === n && <p id={`faq-${n}`} className="lp-faq__a t-body2 c-secondary">{a}</p>}
        </div>
      ))}
    </div>
  );
}

/* ───────── Page ───────── */
export function LandingPage() {
  const [, force] = useState(0);
  const theme = document.documentElement.dataset.theme;
  const dark = theme === "dark" || theme === "teal";
  const toggleTheme = () => { db.set("m6", { ...(db.get("m6") || {}), theme: dark ? "light" : "dark" }); applyTheme(); force((x) => x + 1); };
  useEffect(() => { document.title = "Rafiki Tax: make every shilling count at tax time"; return () => { document.title = "Rafiki Tax"; }; }, []);
  const link = (id, label) => <a href={`#/`} className="lp-nav__link t-medium2" onClick={(e) => { e.preventDefault(); scrollTo(id); }}>{label}</a>;

  return (
    <div className="lp" id="lp-top">
      <a className="skip-link" href="#/" onClick={(e) => { e.preventDefault(); document.getElementById("lp-main")?.focus(); }}>Skip to content</a>
      <header className="lp-nav-wrap">
        <nav className="lp-nav" aria-label="Main">
          <a href="#/" onClick={(e) => { e.preventDefault(); document.querySelector(".lp")?.scrollTo?.({ top: 0, behavior: "smooth" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Rafiki Tax, top of page"><Logo /></a>
          <div className="lp-nav__links">{link("how", "How it works")}{link("features", "Features")}{link("why", "Why now")}{link("faq", "FAQ")}</div>
          <div className="lp-nav__actions">
            <button type="button" className="icon-btn icon-btn--40 icon-btn--tertiary" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light theme" : "Dark theme"} onClick={toggleTheme}><Icon name={dark ? "moon" : "sun"} size={20} /></button>
            <Button type="tertiary" onClick={signIn}>{session.user() ? "Open the app" : "Sign in"}</Button>
            <Button onClick={start}>Check my expenses</Button>
          </div>
        </nav>
      </header>

      <main id="lp-main" tabIndex={-1}>
        <section className="lp-hero" aria-labelledby="lp-title">
          <div className="lp-hero__copy">
            <Eyebrow>From 1 Jan 2026, KRA checks your expenses against eTIMS</Eyebrow>
            <h1 id="lp-title" className="lp-h1">Make every shilling<br /><span className="lp-highlight">count</span> at tax time</h1>
            <p className="lp-sub lp-sub--hero">Upload an M-Pesa or Airtel Money statement or snap a few receipts. Rafiki finds the expenses KRA won’t accept and drafts the fixes. You review, then you send.</p>
            <div className="lp-ctas"><Button className="btn--lg" onClick={start}>Check my expenses</Button><Button type="tertiary" className="btn--lg" onClick={() => scrollTo("how")}>See how it works</Button></div>
            <div className="lp-chips"><TrustChip icon="shield-check">Start with a statement. Nothing to connect.</TrustChip><TrustChip icon="hand-click">Nothing goes to KRA without your tap</TrustChip><TrustChip icon="circle-check">Free to start</TrustChip></div>
          </div>
          <HeroCarousel />
        </section>

        <section className="lp-section" id="why" aria-labelledby="why-h">
          <SectionHeading id="why-h" eyebrow="Why now?" title={<>A receipt without your PIN<br />no longer counts</>} sub="KRA now checks the expenses in your income tax return against eTIMS invoices. Rafiki makes sure the ones you paid for actually show up." />
          <div className="lp-grid3">
            <Card><Point icon="calendar-event" title="Since 1 January 2026">Expenses in your return are matched against eTIMS invoices received with your business PIN.</Point></Card>
            <Card><Point icon="id" title="Your PIN on every invoice">A till slip or an invoice without your PIN won’t count. Staff spending needs your PIN too.</Point></Card>
            <Card><Point icon="users" title="30 days for informal sellers">Mama mboga or a fundi approve a buyer-initiated invoice within 30 days, or it expires.</Point></Card>
          </div>
        </section>

        <section className="lp-section" id="how" aria-labelledby="how-h">
          <SectionHeading id="how-h" eyebrow="How it works" title="Review, don’t enter" sub="You bring what you already have. The agent does the checking and the drafting. Nothing reaches KRA or a seller until you tap send." />
          <div className="lp-grid3">
            <Card><div className="lp-mini" aria-hidden="true"><div className="lp-mini__card"><div className="lp-snap__head"><span className="lp-snap__icon"><Icon name="receipt" size={20} /></span><b className="t-semi2">Reading your receipt</b></div>
              <div className="lp-mini__read"><span className="lp-mini__photo"><Icon name="photo" size={20} /></span><ul className="lp-steps">
                <li><Icon name="circle-check" size={16} /><span>Read seller and amount<small>Done</small></span></li><li><Icon name="loader-2" size={16} /><span>Looking for your eTIMS invoice<small>Working</small></span></li><li><Icon name="clock-hour-3" size={16} /><span>Checking your PIN<small>Waiting</small></span></li></ul></div></div></div>
              <Point icon="upload" title="1. Bring what you have">An M-Pesa or Airtel Money statement, a bank export or receipt photos. No catalogue, no stock list, no setup.</Point></Card>
            <Card><div className="lp-mini lp-mini--center" aria-hidden="true"><div className="lp-mini__step"><span className="lp-mini__tag t-body3"><Icon name="user" size={14} />Your Action</span><div className="lp-mini__card lp-mini__card--sm"><span className="lp-mini__done t-body3"><Icon name="circle-check" size={14} />Done</span><b className="t-semi2">Snapped the receipt</b><span className="t-body3 c-secondary">Fuel receipt, Total Energies Kitengela</span></div></div></div>
              <Point icon="sparkles-2" title="2. The agent checks">Every expense is matched to an eTIMS invoice and your PIN. You see each step and where it stopped.</Point></Card>
            <Card><div className="lp-mini" aria-hidden="true"><Facts rows={[["Seller", "Mama Wanjiku"], ["Date", "Sat 14 Nov 2026"], ["Lines", "3 lines"], ["Total", <b key="t">KSh 2,500.00</b>]]} />
              <p className="lp-warn lp-warn--box t-body3"><Icon name="info-circle" size={16} />Once sent, you can't withdraw this invoice. The seller has 30 days to accept or reject it.</p></div>
              <Point icon="shield" title="3. You confirm and send">Drafts wait for you. One confirmation lists exactly what will be sent, and to whom.</Point></Card>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="pay-h">
          <SectionHeading id="pay-h" eyebrow="Works with how you already pay" title="Start without connecting anything" sub="Works with M-Pesa and Airtel Money. Upload a statement, forward a message, or connect your business account when you are ready." />
          <div className="lp-grid3">
            <Card><Point icon="upload" title="1. Upload a statement">An M-Pesa or Airtel Money statement is enough for your first finding. Nothing to connect.</Point></Card>
            <Card><Point icon="share" title="2. Forward a message">Forward a deal or receipt to Rafiki on WhatsApp. Rafiki only sees what you forward.</Point></Card>
            <Card><Point icon="wallet" title="3. Connect when ready">Read only first. Pay a supplier from Rafiki and their invoice is ready in the same step.</Point></Card>
          </div>
          <div className="lp-chips"><TrustChip icon="hand-click">No money moves without your tap</TrustChip><TrustChip icon="shield-check">We never see your personal wallet</TrustChip><TrustChip icon="circle-check">Disconnect any time</TrustChip></div>
        </section>

        <section className="lp-section" id="features" aria-labelledby="feat-h">
          <SectionHeading id="feat-h" eyebrow="Features" title={<>Everything you need to keep<br />purchases tax-ready</>} sub="Five features, one job: making sure what your business buys counts at tax time. No catalogue, stock module or ERP to set up." />
          <Features />
        </section>

        <section className="lp-section" aria-labelledby="ahead-h">
          <SectionHeading id="ahead-h" eyebrow="Notifications and Explore" title="Stay ahead of the 30-day clock" sub="Rafiki tells you when a seller approves, when an invoice is about to expire, and where your deductions leak. Go deeper only when you want to." />
          <div className="lp-bento">
            <Card><Point icon="bell" title="Know what moved while you were away">Seller approvals, invoices about to expire and new findings, each with one next step. No marketing, ever.</Point><div className="lp-bento__stage"><NotificationsSnap /></div></Card>
            <Card><Point icon="affiliate" title="See where your deductions leak">Opt-in depth for a slow Friday: a supplier network and a purchases timeline, each with a plain-language takeaway first.</Point><div className="lp-bento__stage"><NetworkSnap /></div></Card>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="trust-h">
          <div className="lp-band">
            <h2 id="trust-h" className="lp-band__title">Built on trust, not on autopilot</h2>
            <p className="lp-band__sub">Tax submissions can’t be taken back. So the agent shows its work and waits for you.</p>
            <div className="lp-grid3 lp-grid3--plain">
              <Point onBrand icon="hand-click" title="You send. Always.">The agent prepares drafts. Anything going to KRA or to a seller waits for your tap.</Point>
              <Point onBrand icon="eye-off" title="Only what you share">Rafiki never reads your chats. It sees only the statements and messages you choose to share.</Point>
              <Point onBrand icon="shield-check" title="Every suggestion explains itself">Confidence and a plain “Why?” on every agent-filled field, so a wrong guess is easy to catch.</Point>
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--faq" id="faq" aria-labelledby="faq-h">
          <SectionHeading id="faq-h" align="left" eyebrow="FAQ" title="Questions owners ask" sub="Still unsure? Start with your M-Pesa statement. The first finding is free and nothing is sent anywhere." />
          <Faq />
        </section>

        <section className="lp-section" aria-labelledby="cta-h">
          <div className="lp-cta">
            <div><h2 id="cta-h" className="lp-cta__title">See what’s at risk in 2 minutes</h2><p className="lp-cta__sub">Just upload a statement. No connection needed. Rafiki shows what counts, what doesn’t, and the top three fixes.</p></div>
            <Button className="btn--lg" onClick={start}>Check my expenses</Button>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer__top">
          <div className="lp-footer__brand"><Logo /><p className="t-body1 c-secondary">Make every shilling count at tax time. The agent prepares; you send.</p></div>
          <div className="lp-footer__cols">
            {[["Product", [["Purchases", () => scrollTo("features")], ["Invoices", () => scrollTo("features")], ["Suppliers", () => scrollTo("features")], ["Evidence", () => scrollTo("features")], ["Explore", () => scrollTo("features")]]],
              ["Company", [["About", null], ["Contact", null], ["Case study", null]]], ["Legal", [["Privacy", null], ["Data protection", null], ["Terms", null]]]].map(([h, ls]) => (
              <div key={h}><h2 className="lp-footer__h">{h}</h2><ul>{ls.map(([l, fn]) => <li key={l}><a href="#/" className="lp-link t-body2" onClick={(e) => { e.preventDefault(); fn ? fn() : toast(`${l} isn't in the prototype.`); }}>{l}</a></li>)}</ul></div>
            ))}
          </div>
        </div>
        <div className="lp-footer__bottom"><p className="t-body2 c-secondary">© 2026 Rafiki Tax. A concept project, not affiliated with KRA.</p><a className="lp-link t-body2" href="#/" onClick={(e) => { e.preventDefault(); toast("The Medium write-up isn't linked in the prototype."); }}>Follow the build on Medium</a></div>
      </footer>
    </div>
  );
}
