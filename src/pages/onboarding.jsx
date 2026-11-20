import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Button, Checkbox, ConfidenceBadge, Icon, IconButton, Logo, OriginTag, PinCard, RadioGroup,
  StatusBadge, Surface, TextField, TextLink, copyText, toast, wait, ProtoHint } from "../components/ui.jsx";
import { db, session } from "../db.js";
import { KRA_REGISTER } from "../seed.js";
import { navigate } from "../router.js";

/* ───────── Onboarding template: step header + centred layout ───────── */
const STEPS = [
  ["Business", "Your KRA PIN"], ["Your data", "Statement or receipts"], ["Reading", "Rafiki checks it"],
  ["Finding", "What's at risk"], ["PIN card", "For the till"],
];

function StepHeader({ current }) {
  return (
    <header className="step-header">
      <Logo />
      <ol className="stepper" aria-label="Setup steps">
        {STEPS.map(([title, sub], i) => {
          const n = i + 1;
          const state = n < current ? "complete" : n === current ? "current" : "upcoming";
          return (
            <li key={n} className={`step step--${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="step__circle">{state === "complete" ? <Icon name="check" size={20} /> : n}</span>
              <span className="step__text">
                <span className="step__title t-semi2">{title}<span className="sr-only"> ({state})</span></span>
                <span className="step__sub t-body3">{sub}</span>
              </span>
              {n < STEPS.length && <span className="step__connector" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <Button type="tertiary" size="sm" className="step-header__later" onClick={() => { toast("Saved. Finish setting up from Home any time."); navigate("/home"); }}>Finish later</Button>
      <p className="step-header__label t-body3 c-secondary" aria-hidden="true">Step {current} of {STEPS.length} · {STEPS[current - 1]?.[0]}</p>
    </header>
  );
}

function OnboardingTemplate({ step, large, hint, children }) {
  return (
    <div className="onb">
      <StepHeader current={step} />
      <main className="onb__layout">
        <div className={`onb__slot ${large ? "onb__slot--large" : ""}`}>{children}{hint && <ProtoHint>{hint}</ProtoHint>}</div>
      </main>
    </div>
  );
}

function Heading({ title, body }) {
  return (
    <div className="auth-heading">
      <h1 className="t-h2 c-primary">{title}</h1>
      {body && <p className="t-body1 c-secondary">{body}</p>}
    </div>
  );
}

const userBusiness = () => {
  const u = session.user();
  return u?.businessId ? db.businesses.get(u.businessId) : null;
};

/* ───────── 1. Business ───────── */
export function BusinessStep() {
  const draft = db.get("onbBusiness") || {};
  const [pin, setPin] = useState(draft.pin || "");
  const [phase, setPhase] = useState(draft.phase || "enter"); // enter | looking | notfound | confirm | manual
  const [error, setError] = useState("");
  const [found, setFound] = useState(draft.found || null);
  const [name, setName] = useState(draft.found?.name || "");
  const [vat, setVat] = useState(draft.found ? (draft.found.vat ? "yes" : "no") : "no");
  const [etims, setEtims] = useState(draft.found ? (draft.found.etims ? "yes" : "no") : "yes");

  useEffect(() => { db.set("onbBusiness", { pin, phase: phase === "looking" ? "enter" : phase, found }); }, [pin, phase, found]);

  async function lookUp() {
    const p = pin.trim().toUpperCase();
    if (!/^[AP]\d{9}[A-Z]$/.test(p)) { setError("A KRA PIN has 11 characters: a letter, 9 digits and a letter, e.g. P051234567Z."); return; }
    setPin(p); setPhase("looking");
    await wait(1600);
    const hit = KRA_REGISTER[p];
    if (!hit) { setPhase("notfound"); return; }
    setFound({ ...hit, pin: p }); setName(hit.name); setVat(hit.vat ? "yes" : "no"); setEtims(hit.etims ? "yes" : "no");
    setPhase("confirm");
  }

  function save() {
    const u = session.user();
    const biz = db.businesses.insert({ pin: pin.toUpperCase(), name: name.trim(), vat: vat === "yes", etims: etims === "yes", source: phase === "manual" ? "owner" : "kra-register" });
    db.users.update(u._id, { businessId: biz._id, name: u.name || "", initials: u.initials || initialsOf(name) });
    db.set("onbBusiness", null);
    navigate("/onboarding/data");
  }

  if (phase === "confirm" || phase === "manual") {
    const agent = phase === "confirm";
    return (
      <OnboardingTemplate step={1}>
        <Surface>
          <form className="onb-col" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save(); }}>
            <Heading title={agent ? "Is this your business?" : "Add your business details"}
              body={agent ? "Rafiki found these on KRA's register. Check them, then continue." : "Type them as they appear on your PIN certificate. You can change them later in Settings."} />
            <AgentField agent={agent} why="Rafiki copied the name exactly as it appears on KRA's PIN register.">
              <TextField label="Business name" value={name} onChange={setName}
                helper={agent ? `From KRA's PIN register for ${pin}` : `For KRA PIN ${pin}`} />
            </AgentField>
            <AgentField agent={agent} why="The register shows no VAT obligation for this PIN. Change it if you registered recently.">
              <RadioGroup label="VAT status" name="vat" value={vat} onChange={setVat}
                options={[{ value: "yes", label: "VAT-registered" }, { value: "no", label: "Not VAT-registered" }]}
                helper={agent ? (found?.vat ? "VAT obligation found on the register" : "No VAT obligation on the register") : undefined} />
            </AgentField>
            <AgentField agent={agent} why="This PIN appears on KRA's eTIMS taxpayer list, so sellers can invoice you through eTIMS.">
              <RadioGroup label="eTIMS" name="etims" value={etims} onChange={setEtims}
                options={[{ value: "yes", label: "On eTIMS" }, { value: "no", label: "Not on eTIMS" }]}
                helper={agent ? (found?.etims ? "Found on the eTIMS taxpayer list" : "Not found on the eTIMS taxpayer list") : undefined} />
            </AgentField>
            <div className="actions">
              {agent
                ? <Button type="tertiary" onClick={() => setPhase("manual")}>Something's wrong</Button>
                : <Button type="tertiary" onClick={() => { setPhase("enter"); setFound(null); }}>Back</Button>}
              <Button htmlType="submit" disabled={!name.trim()}>{agent ? "Yes, that's us" : "Save and continue"}</Button>
            </div>
          </form>
        </Surface>
      </OnboardingTemplate>
    );
  }

  const looking = phase === "looking";
  return (
    <OnboardingTemplate step={1} hint="P051234567Z finds the demo business (also A123456789B, P052468013K). Any other valid PIN, e.g. P000000000X, shows the not-found path.">
      <Surface>
        <form className="onb-col" onSubmit={(e) => { e.preventDefault(); phase === "notfound" ? lookUp() : lookUp(); }} noValidate>
          <Heading title="What's your KRA PIN?" body="Rafiki uses it to look up your business name, VAT and eTIMS status. You confirm before anything is saved." />
          <TextField label="KRA PIN" placeholder="e.g. P051234567Z" value={pin} readOnly={looking} autoFocus maxLength={11}
            autoComplete="off" onChange={(v) => { setPin(v.toUpperCase().replace(/[^A-Z0-9]/g, "")); setError(""); if (phase === "notfound") setPhase("enter"); }}
            error={error} helper={looking ? "Checking KRA's PIN register…" : "11 characters, starting with P or A. It's on your PIN certificate."} />
          {phase === "notfound" ? (
            <Alert tone="warning" title="We couldn't find this PIN">Check it against your PIN certificate. A new PIN can take a day to appear on the register.</Alert>
          ) : (
            <Alert title="Why Rafiki asks for it">eTIMS only counts a purchase when your PIN is on the invoice. Your PIN card and receipt checks use it.</Alert>
          )}
          <div className="actions">
            {phase === "notfound" && <Button type="tertiary" onClick={() => { setName(""); setPhase("manual"); }}>Enter details myself</Button>}
            <Button htmlType="submit" disabled={!pin} loading={looking}>{phase === "notfound" ? "Try again" : "Look up my business"}</Button>
          </div>
        </form>
      </Surface>
    </OnboardingTemplate>
  );
}

function AgentField({ agent, why, children }) {
  const [open, setOpen] = useState(false);
  if (!agent) return children;
  return (
    <div className="agent-field">
      <div className="agent-field__meta"><OriginTag /><ConfidenceBadge /></div>
      {children}
      <div>
        <TextLink size={3} aria-expanded={open} onClick={() => setOpen(!open)}>Why?</TextLink>
        {open && <p className="t-body3 c-secondary" style={{ padding: "4px 2px 0" }}>{why}</p>}
      </div>
    </div>
  );
}

const initialsOf = (s) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/* ───────── 2. Your data ───────── */
const IMAGE = /\.(jpe?g|png|heic|webp)$/i;
const OK_DOC = /\.(pdf|csv)$/i;

function fmtSize(bytes) { return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`; }

export function DataStep() {
  const u = session.user();
  const files = db.uploads.find({ userId: u?._id });
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  function addFiles(list) {
    const arr = Array.from(list);
    const images = arr.filter((f) => IMAGE.test(f.name));
    arr.filter((f) => !IMAGE.test(f.name)).forEach((f) => {
      const ok = OK_DOC.test(f.name);
      db.uploads.insert({ userId: u._id, name: f.name, size: f.size, kind: /mpesa|statement/i.test(f.name) || /\.pdf$/i.test(f.name) ? "statement" : "export", status: ok ? "uploaded" : "failed" });
    });
    if (images.length) {
      const existing = db.uploads.findOne({ userId: u._id, kind: "receipts" });
      if (existing) db.uploads.update(existing._id, { count: existing.count + images.length, size: existing.size + images.reduce((s, f) => s + f.size, 0) });
      else db.uploads.insert({ userId: u._id, name: "Receipts", kind: "receipts", count: images.length, size: images.reduce((s, f) => s + f.size, 0), status: "uploaded" });
    }
  }

  async function retry(f) {
    db.uploads.update(f._id, { status: "retrying" });
    await wait(1200);
    db.uploads.update(f._id, { status: "failed" });
    toast("Still couldn't read it. Export it as CSV and add that instead.", "alert-circle");
  }

  const good = files.filter((f) => f.status === "uploaded");
  return (
    <OnboardingTemplate step={2} hint="Any PDF, CSV or photo uploads. An .xlsx file shows the failed-upload message.">
      <Surface>
        <div className="onb-col">
          <Heading title="Bring what you already have" body="An M-Pesa statement, a bank export or a few receipt photos. Three months is enough for a first finding." />
          <div className={`upload-box ${drag ? "upload-box--drag" : ""}`} role="button" tabIndex={0}
            aria-label="Add files: drag and drop, or browse"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}>
            <span className="upload-box__chip"><Icon name="cloud-upload" size={24} /></span>
            <span className="upload-box__prompt"><span className="c-primary">Drag and drop files here, or</span><span className="upload-box__browse">browse</span></span>
            <span className="t-body3 c-tertiary">M-Pesa statement (PDF), bank export (CSV) or receipt photos (JPG, PNG), up to 10 MB each</span>
            <input ref={inputRef} type="file" multiple hidden accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.heic,.webp"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </div>
          {files.map((f) => <FileRow key={f._id} file={f} onRemove={() => db.uploads.remove(f._id)} onRetry={() => retry(f)} />)}
          <Alert title="What Rafiki will and won't see">It reads amounts, dates and who you paid. It never logs in to M-Pesa or your bank, never reads your chats, and sends nothing to KRA.</Alert>
          <div className="actions">
            <Button type="tertiary" onClick={() => navigate("/onboarding/pin-card")}>Skip for now</Button>
            <Button disabled={!good.length} onClick={() => { db.set("reading", { startedAt: Date.now() }); navigate("/onboarding/reading"); }}>Start reading</Button>
          </div>
        </div>
      </Surface>
    </OnboardingTemplate>
  );
}

function FileRow({ file, onRemove, onRetry }) {
  const failed = file.status === "failed" || file.status === "retrying";
  const title = file.kind === "receipts" ? `Receipts (${file.count} photo${file.count === 1 ? "" : "s"})` : file.name;
  return (
    <div className={`file-row ${failed ? "file-row--error" : ""}`}>
      <span className="icon-chip"><Icon name="file-text" size={20} /></span>
      <div className="file-row__data">
        <p className="t-semi2 c-primary file-row__name">{title}</p>
        {failed ? (
          <>
            <p className="t-body3 c-tertiary">Couldn't read this file. Export it as CSV from your bank and try again.</p>
            <p className="file-row__error"><Icon name="alert-circle" size={16} />Upload failed. Check your connection and retry.</p>
          </>
        ) : <p className="t-body3 c-tertiary">{fmtSize(file.size)}, uploaded</p>}
      </div>
      <div className="file-row__actions">
        {failed ? <Button type="secondary" size="sm" loading={file.status === "retrying"} onClick={onRetry}>Retry</Button>
          : <StatusBadge status="validated" label="Uploaded" />}
        <IconButton icon="x" type="secondary" size={32} label={`Remove ${title}`} onClick={onRemove} />
      </div>
    </div>
  );
}

/* ───────── 3. Reading ───────── */
const TOTAL = 142;
export function ReadingStep() {
  const u = session.user();
  const files = db.uploads.find({ userId: u?._id, status: "uploaded" });
  const statement = files.find((f) => f.kind !== "receipts");
  const receipts = files.find((f) => f.kind === "receipts");
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!files.length) { navigate("/onboarding/data", { replace: true }); return; }
    let p = 0;
    const t = setInterval(() => { p = Math.min(100, p + 2); setPct(p); if (p >= 100) clearInterval(t); }, 110);
    return () => clearInterval(t);
  }, []);

  const done = pct >= 100;
  const readDone = pct >= 35;
  const checked = Math.min(TOTAL, Math.round(((pct - 10) / 85) * TOTAL));
  const source = statement
    ? { title: "Uploaded your statement", sub: "M-Pesa statement, Aug to Oct 2026", icon: "receipt" }
    : { title: "Uploaded your receipts", sub: `${receipts?.count || 0} receipt photos`, icon: "receipt" };

  return (
    <OnboardingTemplate step={done ? 3 : 3} large>
      <Surface>
        <div className="onb-split">
          <div className="onb-split__main">
            <ProgressRing value={pct} />
            <Heading title={done ? "Your finding is ready" : `Reading your ${statement ? "statement" : "receipts"}`}
              body={done ? `Rafiki checked ${TOTAL} payments against eTIMS. Nothing has been sent to KRA.`
                : "About a minute. You can leave this page; Rafiki sends a notification when your finding is ready."} />
            <div className="actions">
              {done ? <Button onClick={() => navigate("/onboarding/finding")}>See my finding</Button>
                : <Button type="tertiary" onClick={() => { toast("We'll notify you when your finding is ready.", "bell"); navigate("/home"); }}>Leave and notify me</Button>}
            </div>
          </div>
          <div className="trace" aria-live="polite">
            <FlowNode tag="action" status="done" title={source.title} sub={source.sub} sourceIcon={source.icon} />
            <FlowEdge />
            <div className="flow-group">
              <span className="flow-group__pill">Runs together</span>
              <div className="flow-group__nodes">
                <FlowNode tag="agent" status={readDone ? "done" : "running"} title={`Read ${TOTAL} payments`} sub="Amounts, dates and who you paid" />
                <FlowNode tag="agent" status={done ? "done" : "running"} title="Look for eTIMS invoices" sub={`${Math.max(0, checked)} of ${TOTAL} checked`} />
              </div>
            </div>
            <FlowEdge />
            <FlowNode tag="outcome" status={done ? "done" : "queued"} title="Your first finding" sub="What counts, and what to fix first" />
          </div>
        </div>
      </Surface>
    </OnboardingTemplate>
  );
}

const TAGS = { agent: ["sparkles-2", "Agent Step"], action: ["user", "Your Action"], outcome: ["file-text", "Outcome"] };
const STATUS = { done: ["circle-check", "Done"], running: ["loader-2", "Running"], queued: ["clock-hour-3", "Queued"] };
function FlowNode({ tag, status, title, sub, sourceIcon }) {
  const [ti, tl] = TAGS[tag]; const [si, sl] = STATUS[status];
  return (
    <div className="flow-node">
      <span className={`node-tag node-tag--${tag}`}><Icon name={ti} size={14} />{tl}</span>
      <div className={`flow-card ${status === "running" ? "flow-card--running" : ""}`}>
        <div className={`flow-card__status flow-card__status--${status}`}>
          <Icon name={si} size={14} className={status === "running" ? "spin" : ""} /><span>{sl}</span>
          {sourceIcon && <span className="flow-card__source"><Icon name={sourceIcon} size={18} /></span>}
        </div>
        <p className="t-semi2 c-primary">{title}</p>
        <p className="t-body3 c-secondary">{sub}</p>
      </div>
    </div>
  );
}
function FlowEdge() {
  return (
    <div className="flow-edge" aria-hidden="true">
      <span className="flow-edge__line" />
      <svg className="flow-edge__arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M3 9L8 14L13 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}
function ProgressRing({ value }) {
  const r = 43, c = 2 * Math.PI * r;
  return (
    <div className="ring" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Reading progress">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle className="ring__track" cx="48" cy="48" r={r} fill="none" strokeWidth="10" />
        <circle className="ring__value" cx="48" cy="48" r={r} fill="none" strokeWidth="10" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="ring__label"><span className="t-figure c-primary">{value}%</span><span className="t-body3 c-secondary">complete</span></div>
    </div>
  );
}

/* ───────── 4. Finding ───────── */
const FIXES = [
  { title: "Fuel receipts missing your PIN", sub: "4 receipts · Total Energies, Rubis", why: "Ask the stations to reissue with your PIN", amount: "KSh 38,000.00" },
  { title: "Mama Wanjiku, no invoices yet", sub: "12 M-Pesa payments · on eTIMS", why: "Set up buyer-initiated invoices", amount: "KSh 52,000.00" },
  { title: "Kibet Farm is not on eTIMS", sub: "5 M-Pesa payments", why: "Send the setup guide, then invoice", amount: "KSh 31,000.00" },
];
export function FindingStep() {
  const result = (db.get("demo") || {}).finding || "at-risk";
  const atRisk = result === "at-risk";
  return (
    <OnboardingTemplate step={4}>
      <Surface>
        <section className="finding" aria-labelledby="finding-h">
          <div className="finding__intro">
            <p className="finding__eyebrow t-semi2"><Icon name="sparkles" size={16} />Your first finding</p>
            <h1 id="finding-h" className="t-h4 c-primary">{atRisk ? "KSh 140,000 of your KSh 820,000 in expenses last quarter is at risk" : "All KSh 820,000 we could check is covered or exempt"}</h1>
            <p className="t-body1 c-secondary">{atRisk ? "These receipts and payments won’t count at tax time yet. Three fixes recover most of it." : "Nothing needs fixing right now. Keep snapping receipts and we’ll watch the rest."}</p>
          </div>
          <div className="finding__breakdown">
            <Breakdown status="covered" amount={atRisk ? "KSh 610,000" : "KSh 750,000"} share={atRisk ? "74% of spend" : "91% of spend"} />
            <Breakdown status="exempt" amount="KSh 70,000" share="9% · no eTIMS needed" />
            {atRisk && <Breakdown status="at-risk" amount="KSh 140,000" share="17% of spend" />}
          </div>
          {atRisk && (
            <div className="finding__fixes">
              <h2 className="t-semi2 c-primary">Fix these first</h2>
              {FIXES.map((f) => (
                <div key={f.title} className="queue-row">
                  <span className="icon-chip"><Icon name="file-text" size={20} /></span>
                  <div className="queue-row__text">
                    <p className="t-semi2 c-primary">{f.title}</p>
                    <p className="t-body3 c-secondary">{f.sub}</p>
                    <p className="queue-row__why t-body3"><Icon name="info-circle" size={14} />{f.why}</p>
                  </div>
                  <div className="queue-row__meta"><p className="t-figure c-primary">{f.amount}</p><StatusBadge status="needs-fixing" /></div>
                </div>
              ))}
            </div>
          )}
          <div className="actions actions--tight">
            {atRisk && <Button type="tertiary" onClick={() => navigate("/onboarding/pin-card")}>See all 23 items</Button>}
            {atRisk ? <Button onClick={() => navigate("/onboarding/pin-card")}>Start fixing</Button>
              : <Button onClick={() => { const u = session.user(); db.users.update(u._id, { onboarded: true }); navigate("/home"); }}>Go to Home</Button>}
          </div>
          <p className="finding__trust t-body3"><Icon name="shield-check" size={16} />Read from your M-Pesa statement, Aug to Oct 2026. Nothing has been sent to KRA.</p>
        </section>
      </Surface>
    </OnboardingTemplate>
  );
}
function Breakdown({ status, amount, share }) {
  return (
    <div className="breakdown-item">
      <StatusBadge status={status} />
      <p className="t-figure c-primary">{amount}</p>
      <p className="t-body3 c-secondary">{share}</p>
    </div>
  );
}

/* ───────── 5. PIN card ───────── */
export function PinCardStep() {
  const biz = userBusiness() || { name: "Your business", pin: "P051234567Z" };
  const [staffOn, setStaffOn] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const u = session.user();
  const staff = db.staff.find({ businessId: biz._id });
  const digits = phone.replace(/\D/g, "");

  function addCard() {
    if (!/^[17]\d{8}$/.test(digits)) { setPhoneErr("Enter all 9 digits after +254, for example 712 345 678."); return; }
    db.staff.insert({ businessId: biz._id, name: name.trim(), phone: digits });
    toast(`Card for ${name.trim()} sent by SMS`);
    setName(""); setPhone("");
  }
  function finish() {
    db.users.update(u._id, { onboarded: true });
    toast("You're all set. Here's your review queue.");
    navigate("/home");
  }

  return (
    <OnboardingTemplate step={5} large>
      <Surface>
        <div className="onb-split">
          <div className="onb-split__main">
            <Heading title="Your PIN card is ready" body="Show it at the till so the cashier puts your PIN on the receipt. That's what makes a purchase count." />
            <Checkbox checked={staffOn} onChange={setStaffOn} label="Add staff cards now"
              helper="Each staff member gets their own card. You can also do this later in Settings." />
            {staffOn && (
              <>
                {staff.length > 0 && (
                  <p className="t-body3 c-secondary">Cards sent: {staff.map((s) => s.name).join(", ")}</p>
                )}
                <TextField label="Staff name" placeholder="Full name" value={name} onChange={setName} helper="As it should appear on their card." />
                <TextField label="Staff phone" prefix="+254" placeholder="712 000 111" inputMode="numeric" value={digits.replace(/(\d{3})(?=\d)/g, "$1 ")}
                  onChange={(v) => { setPhone(v.replace(/\D/g, "").slice(0, 9)); setPhoneErr(""); }} error={phoneErr} helper="Their card is sent here by SMS." />
              </>
            )}
            <div className="actions">
              <Button type="tertiary" onClick={() => downloadCard(biz)}>Download card</Button>
              {staffOn && <Button type="secondary" disabled={!name.trim() || !digits} onClick={addCard}>Add card</Button>}
              <Button onClick={finish}>Go to Home</Button>
            </div>
          </div>
          <PinCard name={biz.name} pin={biz.pin} onCopy={() => { copyText(biz.pin); toast("PIN copied"); }} />
        </div>
      </Surface>
    </OnboardingTemplate>
  );
}

function downloadCard(biz) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220" viewBox="0 0 360 220"><rect x="1" y="1" width="358" height="218" rx="24" fill="#fff" stroke="#5a5d6b" stroke-width="2"/><text x="24" y="44" font-family="Inter,Arial" font-weight="600" font-size="14" fill="#1a1c17">${biz.name.replace(/&/g, "&amp;")}</text><text x="24" y="62" font-family="Inter,Arial" font-size="12" fill="#434654">Business card · RafikiTax AI</text><text x="180" y="130" text-anchor="middle" font-family="Roboto Mono,monospace" font-weight="700" font-size="36" fill="#1a1c17">${biz.pin}</text><text x="180" y="186" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#434654">Read the PIN at the till, before the receipt prints.</text></svg>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  a.download = `PIN-card-${biz.pin}.svg`; a.click();
  toast("PIN card downloaded", "download");
}
