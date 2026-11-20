import React, { useState } from "react";
import { Alert, Button, Icon, PinCard, Radio, StatusBadge, TextField, copyText, toast, useDb, wait } from "../components/ui.jsx";
import { Facts, Tabs, ksh } from "../components/patterns.jsx";
import { Modal } from "../components/table.jsx";
import { db, session } from "../db.js";
import { navigate, query } from "../router.js";
import { csvBlob, download } from "../files.js";

/* Module 6: Profile (belongs to the person) and Settings (belongs to the business). */
const m6 = () => db.get("m6") || {};
const setM6 = (patch) => db.set("m6", { ...m6(), ...patch });
const fmtPhone = (d) => (d ? `0${String(d).replace(/^0/, "")}`.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3") : "");
const tabLabel = (icon, text) => <span className="set-tab"><Icon name={icon} size={20} />{text}</span>;

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "switch--on" : ""}`} onClick={() => onChange(!on)}>
      <span className="switch__thumb">{on && <Icon name="check" size={12} />}</span>
    </button>
  );
}
/* Option card (Figma: molecules / settings / option card): title, helper, and a switch and/or an action. On = tinted. */
function OptionCard({ title, body, on, onToggle, action, onAction, actionType = "secondary" }) {
  return (
    <div className={`set-opt ${on ? "set-opt--on" : ""}`}>
      <span className="set-opt__text"><span className="t-semi2 c-primary">{title}</span><span className="t-body3 c-secondary">{body}</span></span>
      {action && <Button type={actionType} size="sm" onClick={onAction}>{action}</Button>}
      {onToggle && <Switch label={title} on={on} onChange={onToggle} />}
    </div>
  );
}

export function applyTheme() {
  const t = (db.get("m6") || {}).theme || "system";
  const dark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = t === "system" ? (dark ? "dark" : "light") : t;
}

function Card({ title, sub, children, footer }) {
  return (
    <section className="set-card" aria-label={title}>
      <div className="set-card__head"><h2 className="t-h5 c-primary">{title}</h2><p className="t-body2 c-secondary">{sub}</p></div>
      {children}
      {footer && <div className="set-card__foot">{footer}</div>}
    </section>
  );
}
function Field({ label, children, help, full }) {
  return (
    <div className={"set-field" + (full ? " set-field--full" : "")}>
      <span className="t-overline c-tertiary set-field__label">{label}</span>
      {children}
      {help && <p className="t-body3 c-secondary">{help}</p>}
    </div>
  );
}
function Input({ value, onChange, label, readOnly, inputMode }) {
  return <div className={`input ${value ? "input--filled" : ""} ${readOnly ? "input--readonly" : ""} set-input`}><input className="input__control" aria-label={label} value={value} readOnly={readOnly} inputMode={inputMode} onChange={(e) => onChange && onChange(e.target.value)} /></div>;
}


/* ═════════ Delete data / delete account (shared with the Android design) ═════════ */
function exportMyData() {
  const rows = [["Date", "Supplier", "Reference", "Amount (KSh)", "Status"], ...db.collection("purchases").find({}).map((p) => [p.date, p.seller, p.invoiceNo || "", p.amount.toFixed(2), p.status])];
  download("rafiki-my-data.csv", csvBlob(rows)); toast("Your data downloaded", "download", { tone: "success" });
}
// "Delete my data": you stay signed in and start fresh.
function startFresh() {
  db.staff.find({}).forEach((d) => db.staff.remove(d._id));
  setM6({ sources: { mpesa: false, airtel: false, bank: false } });
  db.set("m3", { scenario: "empty" }); db.set("m5", { scenario: "empty" }); db.set("home", { scenario: "fresh" });
  navigate("/home"); toast("Your data was deleted. You can start again.", "circle-check");
}
// "Delete account": everything goes and you are signed out.
function deleteAccount() {
  db.reset(); session.signOut(); navigate("/signup"); toast("Your account was deleted.", "circle-check");
}

function PinEntry({ title = "Enter your app PIN", sub, onDone, onBack }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const press = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d; setPin(next); setErr("");
    if (next.length === 4) {
      if (next === (m6().appPin || "1234")) onDone();
      else setTimeout(() => { setPin(""); setErr("That PIN is not right. Try again."); }, 200);
    }
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
  return (
    <div className="pinentry">
      <p className="t-h5 c-primary">{title}</p>
      {sub && <p className="t-body2 c-secondary">{sub}</p>}
      <div className="pinentry__dots" role="img" aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`pinentry__dot ${i < pin.length ? "pinentry__dot--on" : ""}`} />)}
      </div>
      <p className="t-body3 pinentry__err" role="alert">{err}</p>
      <div className="pinentry__pad">
        {keys.map((k, i) => k === "" ? <span key={i} /> : k === "back"
          ? <button key={i} type="button" className="pinentry__key" aria-label="Delete last digit" onClick={() => setPin(pin.slice(0, -1))}><Icon name="backspace" size={24} /></button>
          : <button key={i} type="button" className="pinentry__key t-h4" onClick={() => press(k)}>{k}</button>)}
      </div>
      <button type="button" className="pinentry__link t-medium2" onClick={() => toast("In the prototype the app PIN is 1234", "info-circle")}>Forgot PIN?</button>
      {onBack && <Button type="tertiary" onClick={onBack}>Back</Button>}
    </div>
  );
}

function DeleteModal({ account, onClose }) {
  const u = session.user();
  const b = db.businesses.get(u?.businessId || "");
  const name = b?.name || "your business name";
  const [typed, setTyped] = useState("");
  const [step, setStep] = useState("confirm");
  if (step === "pin") {
    return (
      <Modal title="Delete account" icon="trash" onClose={onClose}>
        <PinEntry sub="To delete your account" onDone={deleteAccount} onBack={() => setStep("confirm")} />
      </Modal>
    );
  }
  const ok = typed.trim() === (b?.name || "");
  return (
    <Modal title={account ? "Delete account" : "Delete my data"} icon="alert-triangle" onClose={onClose}
      footer={<>
        <Button type="secondary" onClick={exportMyData}>Export my data first</Button>
        <Button type="danger" disabled={!ok} onClick={() => (account ? setStep("pin") : startFresh())}>{account ? "Delete account" : "Delete everything"}</Button>
      </>}>
      {account
        ? <Alert tone="danger" title="This deletes your account">Your profile, sign-in and all business data are removed, and you are signed out on every device. eTIMS invoices stay with KRA.</Alert>
        : <Alert tone="danger" title="This can't be undone">Your purchases, invoices, evidence, staff and connected sources are removed from Rafiki. You stay signed in and start fresh. eTIMS invoices stay with KRA.</Alert>}
      <TextField label={`Type ${name} to confirm`} value={typed} onChange={setTyped} />
    </Modal>
  );
}

function AccountCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card title="Account" sub="Delete your account and everything with it.">
      <ul className="set-list set-list--plain">
        <li className="set-row"><span><span className="t-semi2 c-primary">Delete account</span><span className="t-body3 c-secondary">Removes your data and profile and signs you out.</span></span>
          <Button type="danger" size="sm" onClick={() => setOpen(true)}>Delete account</Button></li>
      </ul>
      {open && <DeleteModal account onClose={() => setOpen(false)} />}
    </Card>
  );
}

/* ═════════ Profile ═════════ */
const P_TABS = [["details", tabLabel("user", "Personal details")], ["language", tabLabel("language", "Language")], ["notifications", tabLabel("bell", "Notifications")],
  ["security", tabLabel("lock", "Security")], ["appearance", tabLabel("palette", "Appearance")]];

export function ProfilePage() {
  useDb();
  const [tab, setTab] = useState(query().get("tab") || "details");
  const go = (t) => { setTab(t); navigate(`/profile?tab=${t}`, { replace: true }); };
  return (
    <div className="page set-page">
      <Tabs label="Profile" value={tab} onChange={go} tabs={P_TABS} />
      {tab === "details" && <><PersonalDetails /><AccountCard /></>}
      {tab === "language" && <LanguageCard />}
      {tab === "notifications" && <NotificationsCard />}
      {tab === "security" && <SecurityCard />}
      {tab === "appearance" && <AppearanceCard />}
    </div>
  );
}

function PersonalDetails() {
  const u = session.user();
  const init = { name: u?.name || "", phone: fmtPhone(u?.phone), email: u?.email || "" };
  const [f, setF] = useState(init);
  const dirty = JSON.stringify(f) !== JSON.stringify(init);
  const s = m6();
  const save = () => {
    const name = f.name.trim();
    db.users.update(u._id, { name, initials: name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(), phone: f.phone.replace(/\D/g, "").replace(/^0/, ""), email: f.email.trim() });
    toast("Personal details saved", "circle-check", { tone: "success" });
  };
  const method = (key, label, body) => (
    <div className={`set-method ${s[key] ? "set-method--on" : ""}`}>
      <span><span className="t-semi2 c-primary">{label}</span><span className="t-body3 c-secondary">{s[key] ? `Connected. ${body.replace("Use", "You can use")}` : body}</span></span>
      <Button type={s[key] ? "tertiary" : "secondary"} size="sm" onClick={() => { setM6({ [key]: !s[key] }); toast(s[key] ? `${label} disconnected` : `${label} connected`, "circle-check"); }}>{s[key] ? "Disconnect" : "Connect"}</Button>
    </div>
  );
  return (
    <Card title="Personal details" sub="Your name and how you sign in to Rafiki."
      footer={<><Button type="secondary" className="btn--lg" onClick={() => setF(init)}>Cancel</Button><Button className="btn--lg" disabled={!f.name.trim()} onClick={save}>Save changes</Button></>}>
      <div className="set-grid">
        <Field label="Full name"><Input label="Full name" value={f.name} onChange={(v) => setF({ ...f, name: v })} /></Field>
        <Field label="Phone number" help="Sign-in codes are sent here."><Input label="Phone number" inputMode="tel" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} /></Field>
        <div className="set-span"><Field label="Email address"><Input label="Email address" value={f.email} onChange={(v) => setF({ ...f, email: v })} /></Field></div>
      </div>
      <div className="set-block">
        <p className="t-semi2 c-primary">Sign-in methods</p>
        <div className="set-grid">
          <div className="set-method set-method--on set-method--fixed"><span><span className="t-semi2 c-primary">SMS code</span><span className="t-body3 c-secondary">Always on. Codes go to your phone number.</span></span></div>
          {method("google", "Google", "Use your Google account to sign in.")}
          {method("microsoft", "Microsoft", "Use your Microsoft account to sign in.")}
        </div>
      </div>
    </Card>
  );
}

function LanguageCard() {
  const s = m6();
  return (
    <Card title="Language" sub="The language Rafiki uses on screen.">
      <Field label="Language" help="You can type in English, Kiswahili or a mix of both. Rafiki reads all three the same way.">
        <div className="input input--filled set-input set-select"><select aria-label="Language" value={s.language} onChange={(e) => { setM6({ language: e.target.value }); toast(e.target.value === "Kiswahili" ? "Kiswahili saved. Screens in Kiswahili aren't in the prototype yet." : "Language saved", "language"); }}>
          <option>English</option><option>Kiswahili</option></select><Icon name="chevron-down" size={20} /></div>
      </Field>
    </Card>
  );
}

function NotificationsCard() {
  const n = m6().notify || {};
  const rows = [["countdown", "Countdown alerts", "Tell me when a seller's invoice request is about to expire."], ["payment", "Payment alerts", "Tell me when a payment is sent or fails."],
    ["sms", "SMS fallback", "Send an SMS when I haven't opened the app."], ["digest", "Weekly digest", "A Monday summary of purchases waiting for review."]];
  return (
    <Card title="Notifications" sub="Choose which alerts reach you. These apply to you only.">
      <div className="set-grid set-grid--tight">
        {rows.map(([k, t, b]) => <OptionCard key={k} title={t} body={b} on={!!n[k]} onToggle={(v) => { setM6({ notify: { ...n, [k]: v } }); toast(`${t} ${v ? "on" : "off"}`, "bell"); }} />)}
      </div>
    </Card>
  );
}

function SecurityCard() {
  const s = m6();
  const [modal, setModal] = useState(false);
  return (
    <Card title="Security" sub="Keep Rafiki and payments safe on this phone.">
      <div className="set-grid set-grid--tight">
        <OptionCard title="App PIN" body="Needed to open Rafiki and to approve every payment." on action="Change PIN" onAction={() => setModal(true)} />
        <OptionCard title="Fingerprint" body="Open Rafiki with your fingerprint. Payments still ask for your PIN." on={!!s.fingerprint} onToggle={(v) => { setM6({ fingerprint: v }); toast(`Fingerprint ${v ? "on" : "off"}`, "fingerprint"); }} />
      </div>
      <Alert tone="info" title="You approve every payment">Rafiki prepares payments. Nothing is sent until you confirm with your PIN.</Alert>
      {modal && <ChangePinModal onClose={() => setModal(false)} />}
    </Card>
  );
}
function ChangePinModal({ onClose }) {
  const [cur, setCur] = useState(""), [next, setNext] = useState(""), [again, setAgain] = useState("");
  const [err, setErr] = useState(null);
  const digits = (v) => v.replace(/\D/g, "").slice(0, 4);
  function save() {
    if (cur !== (m6().appPin || "1234")) { setErr("That is not your current PIN."); return; }
    if (next !== again) { setErr("The new PINs don't match."); return; }
    if (/^(\d)\1{3}$|^1234$|^0000$/.test(next) && next !== "1234") { setErr("Pick a PIN that is harder to guess."); return; }
    setM6({ appPin: next }); toast("App PIN changed. Use it for payments from now on.", "lock", { tone: "success" }); onClose();
  }
  return (
    <Modal title="Change app PIN" icon="lock" onClose={onClose}
      footer={<><Button type="secondary" onClick={onClose}>Cancel</Button><Button disabled={cur.length < 4 || next.length < 4 || again.length < 4} onClick={save}>Save PIN</Button></>}>
      <TextField label="Current PIN" type="password" inputMode="numeric" value={cur} onChange={(v) => { setCur(digits(v)); setErr(null); }} helper="The 4-digit PIN you use to open Rafiki. In the prototype it's 1234." />
      <TextField label="New PIN" type="password" inputMode="numeric" value={next} onChange={(v) => { setNext(digits(v)); setErr(null); }} helper="4 digits. Avoid 1234 or your birth year." />
      <TextField label="New PIN again" type="password" inputMode="numeric" value={again} onChange={(v) => { setAgain(digits(v)); setErr(null); }} error={err} />
    </Modal>
  );
}

function AppearanceCard() {
  const s = m6();
  const theme = s.theme || "system";
  const opts = [["system", "System default", "Follows your device"], ["light", "Light", "The standard look"], ["dark", "Dark", "Easier in low light"], ["teal", "Rafiki Dark Teal", "Dark with teal"]];
  return (
    <Card title="Appearance" sub="Choose how Rafiki looks on this screen.">
      <div className="set-field" role="radiogroup" aria-label="Theme">
        <p className="t-semi2 c-primary">Theme</p>
        <div className="set-themes">
          {opts.map(([v, t, b]) => (
            <label key={v} className={`set-theme ${theme === v ? "set-theme--on" : ""}`}>
              <input type="radio" className="sr-only" name="theme" checked={theme === v} onChange={() => { setM6({ theme: v }); applyTheme(); toast(`${t} applied`, v === "light" ? "sun" : v === "system" ? "device-desktop" : "moon"); }} />
              <span className={`set-theme__preview set-theme__preview--${v}`} aria-hidden="true">
                <span className="tp-side"><span className="tp-nav" /></span><span className="tp-card"><span className="tp-line" /><span className="tp-line tp-line--short" /><span className="tp-btns"><span className="tp-btn tp-btn--blue" /><span className="tp-btn tp-btn--lime" /></span></span>
              </span>
              <span className="set-theme__foot"><span><span className="t-semi2 c-primary">{t}</span><span className="t-body3 c-secondary">{b}</span></span><Radio checked={theme === v} /></span>
            </label>
          ))}
        </div>
        <p className="t-body3 c-secondary">Changes apply straight away.</p>
      </div>
    </Card>
  );
}

/* ═════════ Settings ═════════ */
const S_TABS = [["business", tabLabel("building-store", "Business profile")], ["staff", tabLabel("users", "Staff and PIN cards")],
  ["connected", tabLabel("plug-connected", "Connected data")], ["privacy", tabLabel("shield-lock", "Data and privacy")]];

export function SettingsPage() {
  useDb();
  const [tab, setTab] = useState(query().get("tab") || "business");
  const go = (t) => { setTab(t); navigate(`/settings?tab=${t}`, { replace: true }); };
  return (
    <div className="page set-page">
      <Tabs label="Settings" value={tab} onChange={go} tabs={S_TABS} />
      {tab === "business" && <BusinessCard />}
      {tab === "staff" && <StaffCard />}
      {tab === "connected" && <ConnectedCard />}
      {tab === "privacy" && <PrivacyCard />}
    </div>
  );
}

function BusinessCard() {
  const u = session.user();
  const b = u?.businessId ? db.businesses.get(u.businessId) : null;
  const init = { name: b?.name || "", vat: b?.vat ? "VAT registered" : "Not VAT registered", address: b?.address || "" };
  const [f, setF] = useState(init);
  const dirty = JSON.stringify(f) !== JSON.stringify(init);
  if (!b) return <Card title="Business profile" sub="Finish setting up your business first."><Button onClick={() => navigate("/onboarding/business")}>Continue setup</Button></Card>;
  return (
    <Card title="Business profile" sub="How your business appears on invoices and in KRA records."
      footer={<><Button type="secondary" className="btn--lg" onClick={() => setF(init)}>Cancel</Button>
        <Button className="btn--lg" disabled={!f.name.trim()} onClick={() => { db.businesses.update(b._id, { name: f.name.trim(), vat: f.vat === "VAT registered", address: f.address.trim() }); toast("Business profile saved", "circle-check", { tone: "success" }); }}>Save changes</Button></>}>
      <div className="set-grid">
        <Field label="Business name"><Input label="Business name" value={f.name} onChange={(v) => setF({ ...f, name: v })} /></Field>
        <Field label="KRA PIN" help="Your PIN is checked with KRA, so it can't be edited here."><Input label="KRA PIN" value={b.pin} readOnly /></Field>
        <Field full label="VAT status" help="Rafiki uses this to work out whether input VAT can be claimed.">
          <div className="input input--filled set-input set-select"><select aria-label="VAT status" value={f.vat} onChange={(e) => setF({ ...f, vat: e.target.value })}><option>Not VAT registered</option><option>VAT registered</option></select><Icon name="chevron-down" size={20} /></div>
        </Field>
        <Field full label="Business address"><Input label="Business address" value={f.address} onChange={(v) => setF({ ...f, address: v })} /></Field>
      </div>
    </Card>
  );
}

function StaffCard() {
  const u = session.user();
  const b = u?.businessId ? db.businesses.get(u.businessId) : null;
  const staff = db.staff.find({});
  const [add, setAdd] = useState(false);
  const [card, setCard] = useState(null);
  const [nf, setNf] = useState({ name: "", phone: "" });
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Card title="Staff and PIN cards" sub="Who can buy for the business, and how sellers verify them.">
      <div className="set-row set-row--head"><span><span className="t-semi2 c-primary">Staff with PIN cards</span><span className="t-body3 c-secondary">Staff buy for the business with their own PIN card. Rafiki links each purchase to the person.</span></span>
        <Button size="sm" onClick={() => setAdd(true)}>Add staff</Button></div>
      <ul className="set-staff">
        <li className="set-person"><span className="avatar avatar--md">{u?.initials}</span><span><span className="t-semi2 c-primary">{u?.name}</span><span className="t-body3 c-secondary">Owner</span></span></li>
        {staff.map((s) => (
          <li key={s._id} className="set-person"><span className="avatar avatar--md">{s.initials}</span>
            <span><span className="t-semi2 c-primary">{s.name}</span><span className="t-body3 c-secondary">Staff · PIN card {s.card ? "issued" : "not issued"}</span></span>
            {s.card ? <Button type="secondary" size="sm" onClick={() => setCard(s)}>View PIN card</Button>
              : <Button type="secondary" size="sm" onClick={async () => { await wait(300); db.staff.update(s._id, { card: true }); toast(`PIN card issued to ${s.name}. Rafiki sent it by SMS.`, "id-badge", { tone: "success" }); }}>Issue PIN card</Button>}
          </li>
        ))}
      </ul>
      {add && (
        <Modal title="Add staff" icon="user-plus" onClose={() => setAdd(false)}
          footer={<><Button type="secondary" onClick={() => setAdd(false)}>Cancel</Button><Button disabled={!nf.name.trim() || nf.phone.replace(/\D/g, "").length < 9}
            onClick={() => { db.staff.insert({ name: nf.name.trim(), initials: initials(nf.name.trim()), phone: nf.phone, card: false }); setAdd(false); setNf({ name: "", phone: "" }); toast("Staff added. Issue a PIN card when they're ready to buy.", "user-plus", { tone: "success" }); }}>Add staff</Button></>}>
          <TextField label="Full name" value={nf.name} onChange={(v) => setNf({ ...nf, name: v })} autoFocus />
          <TextField label="Phone number" prefix="+254" inputMode="numeric" placeholder="711 203 448" value={nf.phone} onChange={(v) => setNf({ ...nf, phone: v })} helper="Their PIN card is sent here by SMS." />
        </Modal>
      )}
      {card && (
        <Modal title={`${card.name}'s PIN card`} icon="id-badge" onClose={() => setCard(null)} footer={<Button type="secondary" onClick={() => setCard(null)}>Close</Button>}>
          <PinCard name={b?.name || "Business"} pin={b?.pin || ""} subtitle={`Staff card · ${card.name}`} onCopy={() => { copyText(b?.pin || ""); toast("PIN copied"); }} />
        </Modal>
      )}
    </Card>
  );
}

function ConnectedCard() {
  const s = m6();
  const b = db.businesses.get(session.user()?.businessId || "");
  const src = s.sources || {};
  const pay = db.get("m4")?.payPermission !== false;
  const [limitEdit, setLimitEdit] = useState(false);
  const [limit, setLimit] = useState(String(s.dailyLimit || 50000));
  const [busy, setBusy] = useState(null);
  const SRC = [["mpesa", "M-Pesa", "device-mobile", `${b?.name?.replace(/ Ltd$/, "") || "Your"} till ${b?.till || "123456"}`], ["airtel", "Airtel Money", "device-mobile", "Airtel Money till"], ["bank", "Bank", "building-bank", "Business bank account"]];
  async function connect(k, on) { setBusy(k); await wait(900); setBusy(null); setM6({ sources: { ...src, [k]: on } }); toast(on ? "Connected. Rafiki reads it from now on, read only." : "Disconnected. Nothing is being read.", on ? "plug-connected" : "circle-minus", on ? { tone: "success" } : {}); }
  return (
    <Card title="Connected data" sub="Where Rafiki reads your purchases. Payments stay off until you turn them on.">
      {SRC.map(([k, net, icon, name]) => {
        const on = !!src[k];
        return (
          <React.Fragment key={k}>
            <div className="set-source">
              <div className="set-source__top">
                <span className="set-source__icon"><Icon name="receipt" size={20} /></span>
                <span className="set-source__text"><span className="t-semi2 c-primary">{on ? name : "Not set up"}</span>
                  <span className="set-source__tags"><span className="net-tag t-body3"><Icon name={icon} size={16} />{net}</span><span className="t-body3 c-secondary">Read only</span></span></span>
                <StatusBadge status={on ? "validated" : "draft"} label={on ? "Connected" : "Disconnected"} />
              </div>
              <p className="t-body3 c-secondary">{on ? (k === "mpesa" ? `Last synced ${s.synced || "2 minutes ago"}` : "Last synced just now") : "Not connected. Nothing is being read."}</p>
              <div className="set-source__actions">
                {on ? <>
                  <Button type="tertiary" size="sm" disabled={busy === k} onClick={() => connect(k, false)}>Disconnect</Button>
                  <Button size="sm" loading={busy === "sync" + k} onClick={async () => { setBusy("sync" + k); await wait(1200); setBusy(null); setM6({ synced: "just now" }); toast("Synced. 3 new payments read.", "refresh", { tone: "success" }); }}>Sync now</Button>
                </> : <Button size="sm" loading={busy === k} onClick={() => connect(k, true)}>Connect</Button>}
              </div>
            </div>
            {k === "mpesa" && on && (
              <OptionCard title="Allow payments from M-Pesa" body={`Up to ${ksh(s.dailyLimit || 50000)} a day. Every payment still needs your PIN.`} on={pay}
                onToggle={(v) => { db.set("m4", { ...(db.get("m4") || {}), payPermission: v }); toast(v ? "Payments from M-Pesa allowed" : "Payments from M-Pesa turned off", "wallet"); }}
                action="Change limit" onAction={() => setLimitEdit(true)} />
            )}
          </React.Fragment>
        );
      })}
      <div className="set-row"><span><span className="t-semi2 c-primary">Rafiki on WhatsApp</span><span className="t-body3 c-secondary">{fmtPhone(session.user()?.phone)} is linked. Forward invoices to Rafiki to add purchases.</span></span>
        <Button type="secondary" size="sm" onClick={() => navigate("/profile?tab=details")}>Change</Button></div>
      {limitEdit && (
        <Modal title="Daily payment limit" icon="wallet" onClose={() => setLimitEdit(false)}
          footer={<><Button type="secondary" onClick={() => setLimitEdit(false)}>Cancel</Button><Button disabled={!Number(limit)} onClick={() => { setM6({ dailyLimit: Number(limit) }); setLimitEdit(false); toast("Daily limit saved", "circle-check", { tone: "success" }); }}>Save limit</Button></>}>
          <TextField label="Most Rafiki can send in one day" prefix="KSh" inputMode="numeric" value={limit} onChange={(v) => setLimit(v.replace(/\D/g, ""))} helper="Rafiki can't send more than this in one day, even with your PIN." />
        </Modal>
      )}
    </Card>
  );
}

function PrivacyCard() {
  const [details, setDetails] = useState(false);
  const [del, setDel] = useState(false);
  const b = db.businesses.get(session.user()?.businessId || "");
  const exportData = exportMyData;
  return (
    <Card title="Data and privacy" sub="What Rafiki can see and what you can take with you.">
      <ul className="set-list set-list--plain">
        <li className="set-row"><span><span className="t-semi2 c-primary">What Rafiki can see</span><span className="t-body3 c-secondary">Only the statements and invoices you connect. Rafiki never sees your PIN.</span></span>
          <Button type="secondary" size="sm" onClick={() => setDetails(true)}>See details</Button></li>
        <li className="set-row"><span><span className="t-semi2 c-primary">Export my data</span><span className="t-body3 c-secondary">Download your purchases and invoices as a spreadsheet.</span></span>
          <Button type="secondary" size="sm" onClick={exportData}>Export</Button></li>
        <li className="set-row"><span><span className="t-semi2 c-primary">Delete my data</span><span className="t-body3 c-secondary">Remove your business and everything connected to it. This can't be undone.</span></span>
          <Button type="danger" size="sm" onClick={() => setDel(true)}>Delete data</Button></li>
      </ul>
      {details && (
        <Modal title="What Rafiki can see" icon="shield-lock" onClose={() => setDetails(false)} footer={<Button type="secondary" onClick={() => setDetails(false)}>Close</Button>}>
          <ul className="set-access">{[["M-Pesa statement", "Payments in and out of the till you connect.", "Read only"], ["Receipts and invoices you share", "Photos, PDFs and forwarded chats.", "Read only"], ["eTIMS invoices to your PIN", `Invoices sellers issue to ${b?.pin || "your PIN"}.`, "Read only"], ["Your app PIN", "Checked on this phone only.", "Never"], ["Your M-Pesa PIN", "Payments still need you on M-Pesa.", "Never"]].map(([t, d, a]) => (
            <li key={t} className="set-row"><span><span className="t-semi2 c-primary">{t}</span><span className="t-body3 c-secondary">{d}</span></span><span className="t-semi2 c-primary">{a}</span></li>))}</ul>
          <p className="t-body3 c-secondary">Rafiki keeps this to build your evidence. Disconnect a source in Connected data to stop it being read.</p>
        </Modal>
      )}
      {del && <DeleteModal onClose={() => setDel(false)} />}
    </Card>
  );
}
