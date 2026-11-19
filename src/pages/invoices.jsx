import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, ConfidenceBadge, ProtoHint, Icon, IconButton, Radio, Spinner, StatusBadge, TextLink, toast, useDb, wait } from "../components/ui.jsx";
import { AgentSuggestion, Drawer, Facts, ksh } from "../components/patterns.jsx";
import { Modal } from "../components/table.jsx";
import { db } from "../db.js";
import { navigate, query } from "../router.js";
import { APP_PIN, ATIENO, JUMA, LINE, PAYMENT, SELLER, SOURCES, SOURCE_PANEL } from "../data/module4.js";

/* ───────── Store helpers ───────── */
export const m4 = () => db.get("m4") || {};
export const setM4 = (patch) => db.set("m4", { ...m4(), ...patch });
const tplCol = () => db.collection("invoiceTemplates");
const invCol = () => db.collection("invoices");
const getDraft = () => m4().draft;
const setDraft = (d) => setM4({ draft: d });
const patchDraft = (p) => setDraft({ ...getDraft(), ...p });

const lineSum = (l) => (l.price == null ? 0 : l.qty * l.price);
const total = (lines) => lines.reduce((s, l) => s + lineSum(l), 0);
const PIN_RE = /^[AP]\d{9}[A-Z]$/;
const NOUN = { chat: "message", momo: "M-Pesa line", photo: "receipt photo", voice: "voice note", repeat: "last invoice" };
const L = (key, extra = {}) => ({ ...LINE[key], origin: "rafiki", ...extra });

/* A new draft for a source. Repeat and templates start complete; the others start reading. */
export function startDraft(source, tpl) {
  if (tpl) {
    const lines = tpl.lines ? tpl.lines.map((k) => L(k)) : tpl.custom.map((l) => ({ ...l, origin: "rafiki" }));
    return { source: tpl.source || "repeat", stage: "ready", seller: tpl.seller, sellerFrom: "last", pin: tpl.pin || "", pinFrom: tpl.pin ? "last" : null,
      date: "14/11/2026", lines, answer: null, feedback: null, dismissed: false, chat: [], label: tpl.title };
  }
  if (source === "juma") return { source: "chat", vat: true, stage: "checking", seller: JUMA.name, sellerFrom: "message", pin: JUMA.pin, pinFrom: "message",
    date: JUMA.date, lines: JUMA.lines.map((l) => ({ ...l })), answer: null, feedback: null, dismissed: false, chat: [] };
  if (source === "repeat") return startDraft(null, { title: "Repeat last invoice", seller: SELLER.name, pin: SELLER.pin, lines: ["sukuma", "nyanya", "vitunguu"] });
  return { source, stage: "reading", seller: SELLER.name, sellerFrom: "message", pin: "", pinFrom: null, date: "14/11/2026",
    lines: [], answer: null, feedback: null, dismissed: false, chat: [] };
}
// The draft as Rafiki leaves it after reading (Figma: Builder / Clarifying question): Vitunguu has no price yet
const afterReading = (d) => ({ ...d, stage: "question", sellerFrom: "matched",
  lines: [L("sukuma"), L("nyanya"), L("vitunguu", { price: null, origin: "needs" })] });

function saveAsDraft(d, label) {
  const n = d.lines.length;
  return tplCol().insert({ order: 10 + tplCol().count({}), kind: "draft", title: label || `${d.seller}, ${SOURCE_PANEL[d.source]?.short || "Draft"}, 14 Nov`,
    detail: `Draft · ${n} ${n === 1 ? "line" : "lines"} · ${ksh(total(d.lines), 0)}`, draft: structuredClone(d) });
}

/* ───────── Shared bits ───────── */
function OriginTag({ kind }) {
  if (kind === "needs") return <span className="ib-tag ib-tag--needs t-body3"><Icon name="alert-circle" size={16} />Needs you</span>;
  if (kind === "you") return <span className="ib-tag ib-tag--you t-body3"><Icon name="pencil" size={16} />Edited by you</span>;
  return <span className="ib-tag ib-tag--rafiki t-body3"><Icon name="sparkles-2" size={16} />Filled by Rafiki</span>;
}
function KvRows({ rows, className = "" }) {
  return (
    <dl className={`ib-kv ${className}`}>
      {rows.map(([k, v, cls]) => (
        <div key={k} className="ib-kv__row"><dt className="t-body2 c-secondary">{k}</dt><dd className={`ib-kv__v ${cls || ""}`}>{v}</dd></div>
      ))}
    </dl>
  );
}
function NoteBox({ title, children }) {
  return <div className="ib-note"><p className="t-semi2 c-primary">{title}</p><p className="t-body2 c-secondary">{children}</p></div>;
}

/* ═════════ 1. Landing: saved drafts ═════════ */
export function InvoiceLanding() {
  useDb();
  const list = tplCol().find({}).sort((a, b) => a.order - b.order);
  const none = list.length === 0;
  const use = (t) => {
    setDraft(t.kind === "draft" ? { ...structuredClone(t.draft) } : startDraft(null, t));
    navigate("/invoices/build");
  };
  return (
    <div className="ib-center">
      <div className="title-row">
        <div className="title-row__text"><h1 className="t-h3 c-primary">Invoice builder</h1>
          <p className="t-body1 c-secondary">Build a buyer-initiated invoice from a payment, receipt, chat or voice note. Rafiki drafts it and you check it.</p></div>
        {!none && <div className="title-row__actions"><Button className="btn--lg" onClick={() => navigate("/invoices/new")}>New invoice</Button></div>}
      </div>
      <div className="ib-bii" role="note">
        <Icon name="info-circle" size={24} />
        <div className="ib-bii__text">
          <p className="t-semi2 c-primary">What is a buyer-initiated invoice (BII)?</p>
          <p className="t-body2 c-primary">An invoice you raise yourself when you buy from a small seller who has no eTIMS invoice, like mama mboga or a fundi. She approves it on her phone with *222# within 30 days, and an approved invoice backs your expense at tax time.</p>
          <p className="t-body2 c-primary">Rafiki drafts it from a payment, receipt, chat or voice note, checks the seller and reminds her to approve. You check it before anything is sent.</p>
        </div>
      </div>
      <section className="ib-saved" aria-labelledby="saved-h">
        <div><h2 id="saved-h" className="t-semi2 c-primary">Start from a saved draft</h2><p className="t-body3 c-secondary">Pick one and check it. Nothing is sent until you confirm.</p></div>
        {none ? (
          <div className="ib-empty">
            <span className="ib-empty__media"><Icon name="file-text" size={24} /></span>
            <p className="t-h5 c-primary">No saved drafts yet</p>
            <p className="t-body2 c-secondary">Send an invoice, then save it as a draft to reuse it.</p>
            <Button className="btn--lg" onClick={() => navigate("/invoices/new")}>Start an invoice</Button>
          </div>
        ) : (
          <>
            <div className="ib-tpl ib-tpl--repeat">
              <span className="ib-tpl__icon"><Icon name="repeat" size={20} /></span>
              <span className="ib-tpl__text"><span className="t-semi2 c-primary">Same as last Saturday?</span><span className="t-body3 c-secondary">Mama Wanjiku · sukuma, nyanya, vitunguu · KSh 2,500</span></span>
              <Button size="sm" onClick={() => { setDraft(startDraft("repeat")); navigate("/invoices/build"); }}>Repeat</Button>
            </div>
            {list.map((t) => (
              <div key={t._id} className="ib-tpl">
                <span className="ib-tpl__icon"><Icon name="file-text" size={20} /></span>
                <span className="ib-tpl__text"><span className="t-semi2 c-primary">{t.title}</span><span className="t-body3 c-secondary">{t.detail}</span></span>
                <Button type="secondary" size="sm" aria-label={`Use ${t.title}`} onClick={() => use(t)}>Use</Button>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}

/* ═════════ 2. Choose a source ═════════ */
export function ChooseSource() {
  const [pick, setPick] = useState(query().get("source") || null);
  function go() {
    setDraft(startDraft(pick));
    navigate("/invoices/build");
  }
  return (
    <div className="ib-center">
      <div className="title-row__text"><h1 className="t-h3 c-primary">New invoice</h1>
        <p className="t-body1 c-secondary">Pick what you already have. Rafiki reads it and prepares the draft. You review and send.</p></div>
      <div className="ib-sources" role="radiogroup" aria-label="Where to start from">
        {SOURCES.map((s) => (
          <label key={s.id} className={`ib-source ${pick === s.id ? "ib-source--on" : ""}`}>
            <input type="radio" className="sr-only" name="source" checked={pick === s.id} onChange={() => setPick(s.id)} />
            <span className="ib-source__icon"><Icon name={s.icon} size={20} /></span>
            <span className="ib-source__text"><span className="t-semi2 c-primary">{s.title}</span><span className="t-body2 c-secondary">{s.body}</span></span>
            <Radio checked={pick === s.id} />
          </label>
        ))}
      </div>
      <div className="ib-foot">
        <p className="t-body3 c-secondary">Nothing is sent until you confirm.</p>
        <Button className="btn--lg" disabled={!pick} onClick={go}>Continue</Button>
      </div>
    </div>
  );
}

/* ═════════ 3. Builder (focus mode) ═════════ */
export function BuilderPage() {
  useDb();
  const d = getDraft();
  const sellerRef = useRef(null);
  const [switching, setSwitching] = useState(false);
  const [original, setOriginal] = useState(false);

  // Reading → clarifying question, as Rafiki works
  useEffect(() => {
    if (!d || d.stage !== "reading") return;
    let alive = true;
    (async () => {
      await wait(900); if (!alive) return;
      patchDraft({ lines: [L("sukuma")] });
      await wait(700); if (!alive) return;
      patchDraft({ lines: [L("sukuma"), L("nyanya")] });
      await wait(1600); if (!alive) return;
      if (getDraft()?.stage === "reading") setDraft(afterReading(getDraft()));
    })();
    return () => { alive = false; };
  }, [d?.stage]);

  // A rejected invoice arrives while the owner is mid-draft (Flow 7): a toast, never a page change
  useEffect(() => {
    if (!d || d.stage !== "accepted" || m4().toastShown) return;
    const t = setTimeout(() => {
      setM4({ toastShown: true });
      toast("Mama Atieno rejected an invoice. Quantity is wrong.", "alert-triangle",
        { tone: "warning", duration: 14000, action: { label: "View", onClick: () => window.dispatchEvent(new CustomEvent("rafiki:record", { detail: "atieno" })) } });
    }, 3500);
    return () => clearTimeout(t);
  }, [d?.stage]);

  if (d?.vat) return <VatBuilder d={d} />;
  if (!d) {
    return (
      <div className="ib-center" style={{ marginTop: 32 }}>
        <div className="ib-empty">
          <span className="ib-empty__media"><Icon name="file-text" size={24} /></span>
          <p className="t-h5 c-primary">No draft open</p>
          <p className="t-body2 c-secondary">Pick what you already have and Rafiki prepares the draft.</p>
          <Button className="btn--lg" onClick={() => navigate("/invoices/new")}>Start an invoice</Button>
        </div>
      </div>
    );
  }

  const reading = d.stage === "reading";
  const pinOk = PIN_RE.test(d.pin);
  const missingPrice = d.lines.some((l) => l.price == null);
  const canSend = !reading && pinOk && !missingPrice && d.lines.length > 0;
  const hasWork = d.stage !== "reading" || d.lines.length > 0;

  function accept() {
    setDraft({ ...d, stage: "accepted", pin: SELLER.pin, pinFrom: "last",
      lines: d.lines.map((l) => (l.id === "vitunguu" && l.price == null ? L("vitunguu") : l)) });
  }
  function undo() {
    setDraft({ ...d, stage: "suggestion", pin: d.pinFrom === "last" ? "" : d.pin, pinFrom: d.pinFrom === "last" ? null : d.pinFrom,
      lines: d.lines.map((l) => (l.id === "vitunguu" && l.origin === "rafiki" ? L("vitunguu", { price: null, origin: "needs" }) : l)) });
  }
  function useDifferent() {
    if (!hasWork) { setDraft(null); navigate("/invoices/new"); return; }
    setSwitching(true);
  }

  return (
    <div className="ib-builder">
      <SourcePanel d={d} onSwitch={useDifferent} onOriginal={() => setOriginal(true)} />
      <DraftPanel d={d} sellerRef={sellerRef} reading={reading} pinOk={pinOk} missingPrice={missingPrice} canSend={canSend} />
      <AgentPanel d={d} onAccept={accept} onUndo={undo} onEdit={() => sellerRef.current?.focus()} />

      {switching && (
        <Modal title="Use a different source?" icon={null} onClose={() => setSwitching(false)}
          footer={<>
            <Button type="secondary" onClick={() => setSwitching(false)}>Keep editing</Button>
            <Button onClick={() => { saveAsDraft(d); setDraft(null); setSwitching(false); toast("Draft saved. Pick it up again from your saved drafts."); navigate("/invoices/new"); }}>Save and switch</Button>
          </>}>
          <p className="t-body2 c-secondary">Your draft so far is saved. You can pick it up again from your saved drafts, then choose a new source to start another.</p>
        </Modal>
      )}
      {original && (
        <Modal title={SOURCE_PANEL[d.source].title} icon={SOURCE_PANEL[d.source].icon} onClose={() => setOriginal(false)}
          footer={<Button onClick={() => setOriginal(false)}>Close</Button>}>
          <p className="t-body3 c-secondary">{SOURCE_PANEL[d.source].meta}</p>
          <div className="ib-bubble"><p className="t-body1 c-primary">{SOURCE_PANEL[d.source].text || "Sawa, mboga ya leo ni 2,500: sukuma, nyanya na vitunguu. Asante, Mama Wanjiku."}</p></div>
          <p className="t-body3 c-secondary">This is the original, exactly as it arrived. Rafiki never changes it.</p>
        </Modal>
      )}
    </div>
  );
}

/* ═════════ Flow 8: VAT-registered seller ═════════
   KRA blocks buyer-initiated invoices for VAT-registered sellers. Rafiki checks the seller's PIN on eTIMS,
   blocks sending and prepares a message asking the seller for a normal eTIMS invoice instead. */
function VatBuilder({ d }) {
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState(false);
  const [trace, setTrace] = useState(false);
  const [msg, setMsg] = useState("");
  const checking = d.stage === "checking";
  useEffect(() => {
    if (!checking) return;
    const t = setTimeout(() => { if (getDraft()?.stage === "checking") patchDraft({ stage: "blocked" }); }, 2200);
    return () => clearTimeout(t);
  }, [checking]);

  function discard() { setDraft(null); toast("Draft discarded. Nothing was sent."); navigate("/invoices"); }
  function sendAsk() {
    const pc = db.collection("purchases");
    if (!pc.get("exp_juma")) pc.insert({ _id: "exp_juma", seller: JUMA.name, invoiceNo: "", date: "2026-11-16", amount: 4850, source: "WhatsApp message", payment: "M-Pesa", status: "at-risk",
      pin: JUMA.pin, supplierId: "sup_juma", ref: "No eTIMS invoice", vat: 668.97, dateLabel: "16 Nov 2026",
      actions: [["secondary", "Mark as declared", "declare"], ["primary", "Ask seller for invoice", "ask"]],
      records: [{ icon: "brand-whatsapp", title: "Message from Juma Building Supplies", amount: 4850, sub: "WhatsApp · Mon 16 Nov 2026", status: "validated" },
        { icon: "wallet", title: "M-Pesa to till 552190", amount: 4850, sub: "Till payment · 16 Nov 2026", status: "validated" },
        { icon: "file-invoice", title: "eTIMS invoice from Juma Building Supplies", sub: "Asked for on 19 Nov · not received yet", status: "at-risk", missing: true }],
      note: "Juma Building Supplies is VAT-registered, so a buyer-initiated invoice isn't allowed. You asked them for an eTIMS invoice on 19 Nov.",
      suggestion: { tone: "neutral", title: "Waiting for Juma's eTIMS invoice", body: "You asked on WhatsApp. Once their eTIMS invoice with your PIN arrives, this purchase is covered.",
        label: "Next step", value: "Wait for the eTIMS invoice", readOnly: true, checked: "Checked on eTIMS",
        why: "VAT-registered sellers must issue the eTIMS invoice themselves. KRA does not accept a buyer-initiated invoice from them." } });
    const sc = db.collection("suppliers"); const sup = sc.get("sup_juma");
    if (sup) sc.update("sup_juma", { purchase: "exp_juma", history: [{ icon: "brand-whatsapp", title: "Asked for an eTIMS invoice", sub: "WhatsApp message prepared · KSh 4,850.00", date: "19 Nov" }, ...(sup.history || [])] });
    setAsking(false); setDraft(null);
    toast("Message ready in WhatsApp. Juma's purchase stays At risk until their eTIMS invoice arrives.", "brand-whatsapp", { tone: "success", duration: 8000 });
    navigate("/purchases/exp_juma");
  }
  const sum = total(d.lines);
  return (
    <div className="ib-builder">
      <aside className="ib-panel ib-panel--side" aria-label="Source">
        <TextLink size={3} onClick={() => navigate("/invoices/new?source=chat")}><Icon name="arrow-left" size={16} />Back to source choice</TextLink>
        <div className="ib-panel__head"><h2 className="t-h6 c-primary">Source</h2><p className="t-body3 c-secondary">What this draft was read from, in the original words.</p></div>
        <div className="ib-src">
          <div className="ib-src__head"><Icon name="message-circle" size={24} /><span><span className="t-semi2 c-primary">WhatsApp message</span><span className="t-body3 c-secondary">{JUMA.forwarded}</span></span></div>
          <p className="ib-src__chip t-body3 c-secondary"><Icon name="message-circle" size={20} />WhatsApp chat</p>
          <div className="ib-bubble"><p className="t-semi2 c-primary">{JUMA.name}</p><p className="t-body2 c-primary">{JUMA.message}</p><p className="ib-bubble__time t-body3 c-secondary">{JUMA.time}</p></div>
          <div className="ib-src__foot"><p className="t-body3 c-secondary">Original wording is kept as the source.</p></div>
        </div>
        <div><Button type="tertiary" size="sm" onClick={() => { setDraft(null); navigate("/invoices/new"); }}>Use a different source</Button></div>
      </aside>

      <div className="ib-vat-col">
        {!checking && (
          <Alert tone="danger" title={`${JUMA.name} is VAT-registered`}>KRA blocks buyer-initiated invoices for VAT-registered sellers. Ask them for a normal eTIMS invoice with your PIN on it.</Alert>
        )}
        <section className="ib-draft" aria-label="Draft invoice" aria-busy={checking || undefined}>
          <div className="ib-draft__head"><h1 className="t-h5 c-primary">Draft invoice</h1><StatusBadge status="draft" label={checking ? "Draft" : "Blocked"} /></div>
          <p className="t-body3 c-secondary">{checking ? "Buyer-initiated. Rafiki is reading your message and checking the seller on eTIMS before anything can be sent." : "Buyer-initiated invoices can't be made for this seller. Nothing has been sent."}</p>
          <div className="ib-fields">
            <div className="ib-field">
              <div className="ib-field__tags"><OriginTag kind="rafiki" /></div>
              <label className="ib-field__label t-overline c-tertiary" htmlFor="vat-seller">Seller</label>
              <div className="input input--filled ib-input"><input id="vat-seller" className="input__control" value={d.seller} readOnly /></div>
              <p className="t-body3 c-secondary">Read from the message.</p>
            </div>
            <div className="ib-field">
              <div className="ib-field__tags">{checking ? <OriginTag kind="rafiki" /> : <span className="ib-tag ib-tag--needs t-body3"><Icon name="alert-circle" size={16} />VAT-registered</span>}</div>
              <label className="ib-field__label t-overline c-tertiary" htmlFor="vat-pin">Seller KRA PIN</label>
              <div className="input input--filled ib-input"><input id="vat-pin" className="input__control" value={d.pin} readOnly /></div>
              <p className="t-body3 c-secondary">{checking ? "Read from the message. Checking it on eTIMS." : "Read from the message. eTIMS shows this PIN as VAT-registered."}</p>
            </div>
          </div>
          <div className="ib-field">
            <label className="ib-field__label t-overline c-tertiary" htmlFor="vat-date">Invoice date</label>
            <div className="input input--filled ib-input"><input id="vat-date" className="input__control" value={d.date} readOnly /><Icon name="calendar" size={20} /></div>
            <p className="t-body3 c-secondary">Read from the message</p>
          </div>
          <div className="ib-items">
            <p className="t-semi2 c-primary">Items</p>
            <ul className="ib-lines">
              {d.lines.map((l) => (
                <li key={l.id} className="ib-line"><span className="ib-line__text"><span className="t-semi2 c-primary">{l.name}</span><span className="t-body3 c-secondary">{l.qty} {l.unit} × {ksh(l.price)}</span></span>
                  <span className="ib-line__end"><OriginTag kind="rafiki" /><span className="ib-line__amt">{ksh(lineSum(l))}</span></span></li>
              ))}
            </ul>
          </div>
          <dl className="ib-totals">
            <div><dt className="t-body2 c-secondary">Subtotal</dt><dd className="t-body1 c-primary">{ksh(sum)}</dd></div>
            <div><dt className="t-body2 c-secondary">VAT</dt><dd className="t-body2 c-primary">{checking ? "None on buyer-initiated invoices" : "Not possible: seller is VAT-registered"}</dd></div>
            <div className="ib-totals__total"><dt className="t-semi2 c-primary">Total</dt><dd className="t-figure-ib c-primary">{ksh(sum)}</dd></div>
          </dl>
          <p className="t-body3 c-warning">{checking ? "Checking the seller's PIN on eTIMS. Nothing can be sent until the check is done." : `Can't send. Ask ${JUMA.name} for an eTIMS invoice instead.`}</p>
          <div className="ib-actions">
            {checking ? <Button type="secondary" className="btn--lg" onClick={() => { saveAsDraft(getDraft(), "Juma Building Supplies, WhatsApp message, 16 Nov"); toast("Draft saved. Find it on the Invoice builder page."); }}>Save draft</Button>
              : <Button type="secondary" className="btn--lg" onClick={discard}>Discard draft</Button>}
            <Button className="btn--lg" disabled>Review and send</Button>
          </div>
        </section>
      </div>

      <aside className="ib-panel ib-panel--side ib-agent" aria-label="Rafiki">
        <div className="ib-panel__head"><h2 className="t-h6 c-primary">Rafiki</h2><p className="t-body3 c-secondary">Suggestions for this draft. You decide every one.</p></div>
        <button type="button" className="ib-trace t-body3 c-secondary" aria-expanded={trace} onClick={() => setTrace(!trace)}>
          {checking ? <Spinner size={20} /> : <Icon name="circle-check" size={20} />}<span>{checking ? `Checking ${JUMA.pin} on eTIMS…` : "Read your message and checked the PIN on eTIMS"}</span><Icon name="chevron-down" size={20} />
        </button>
        {trace && <ul className="ib-trace__steps t-body3 c-secondary"><li>Read the seller, the PIN and 2 items from the message</li><li>{checking ? "Checking the PIN on eTIMS" : `eTIMS: ${JUMA.pin} is VAT-registered`}</li></ul>}
        {!checking && (
          <section className="suggest suggest--neutral" aria-label="Rafiki suggests: Ask for an eTIMS invoice instead">
            <div className="suggest__header"><Icon name="sparkles-2" size={24} /><p className="suggest__title t-semi2 c-primary">Ask for an eTIMS invoice instead</p>
              <StatusBadge status="validated" outline label="Checked on eTIMS" /></div>
            <p className="t-body2 c-secondary">{JUMA.name} is VAT-registered, so KRA won't accept a buyer-initiated invoice. Their own eTIMS invoice with your PIN is what counts for this expense.</p>
            <div className="change-box"><p className="t-body3 c-secondary">Next step</p><p className="t-semi2 c-primary">Ask {JUMA.short} for an eTIMS invoice</p></div>
            {why && <p className="t-body3 c-secondary">eTIMS lists {JUMA.pin} as registered for VAT. VAT-registered sellers must issue the eTIMS invoice themselves. This block can't be dismissed.</p>}
            <div className="suggest__footer"><TextLink size={3} aria-expanded={why} onClick={() => setWhy(!why)}>Why?</TextLink><Button size="sm" onClick={() => setAsking(true)}>Write message</Button></div>
          </section>
        )}
        <div className="ib-compose">
          <textarea className="t-body2" rows={3} aria-label="Tell Rafiki what you bought" placeholder={'Tell Rafiki what you bought, e.g. "Nimenunua mboga kwa Mama Wanjiku, 2,500"'}
            value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="ib-compose__row">
            <IconButton icon="paperclip" label="Attach a file" onClick={() => toast("Attaching files isn't part of the prototype.", "paperclip")} />
            <IconButton icon="photo" label="Add a photo" onClick={() => toast("Adding photos isn't part of the prototype.", "photo")} />
            <IconButton icon="microphone" label="Record a voice note" type="secondary" onClick={() => toast("Voice notes aren't part of the prototype.", "microphone")} />
            <span className="ib-compose__spacer" />
            <IconButton icon="send" label="Send to Rafiki" type="primary" onClick={() => { if (msg.trim()) { toast("Noted. This draft stays blocked because the seller is VAT-registered."); setMsg(""); } }} />
          </div>
        </div>
        <p className="t-body3 c-secondary">Swahili, English or both is fine. You review everything before it is sent.</p>
      </aside>

      {asking && (
        <Modal title={`Ask ${JUMA.name} for an eTIMS invoice`} icon={null} onClose={() => setAsking(false)}
          footer={<><Button type="secondary" onClick={() => setAsking(false)}>Cancel</Button><Button onClick={sendAsk}>Open WhatsApp to send</Button></>}>
          <div className="ib-askmsg">
            <p className="t-overline c-tertiary">Message to seller</p>
            <p className="t-body2 c-primary">WhatsApp · English · to {JUMA.name} · {JUMA.phone}</p>
            <div className="ib-bubble"><p className="t-body2 c-primary">{JUMA.ask}</p></div>
            <p className="t-body2 c-primary">You send this. Rafiki only prepares it.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SourcePanel({ d, onSwitch, onOriginal }) {
  const sp = SOURCE_PANEL[d.source] || SOURCE_PANEL.chat;
  const highlight = d.source === "chat" && (d.stage === "suggestion" || d.stage === "accepted");
  return (
    <aside className="ib-panel ib-panel--side" aria-label="Source">
      <TextLink size={3} onClick={() => navigate(`/invoices/new?source=${d.source}`)}><Icon name="arrow-left" size={16} />Back to source choice</TextLink>
      <div className="ib-panel__head"><h2 className="t-h6 c-primary">Source</h2><p className="t-body3 c-secondary">What this draft was read from, in the original words.</p></div>
      <div className="ib-src">
        <div className="ib-src__head"><Icon name={sp.icon} size={24} /><span><span className="t-semi2 c-primary">{sp.title}</span><span className="t-body3 c-secondary">{sp.meta}</span></span></div>
        {d.source === "chat" ? (
          <>
            <p className="ib-src__chip t-body3 c-secondary"><Icon name="message-circle" size={20} />WhatsApp chat</p>
            <div className="ib-bubble">
              <p className="t-semi2 c-primary">Mama Wanjiku</p>
              {highlight
                ? <p className="t-body2 c-primary">Sawa, mboga ya leo ni <mark className="ib-hl">KSh 2,500</mark>: sukuma, nyanya na vitunguu. Asante, <mark className="ib-hl">Mama Wanjiku</mark>.</p>
                : <p className="t-body2 c-primary">Sawa, mboga ya leo ni 2,500: sukuma, nyanya na vitunguu. Asante, Mama Wanjiku.</p>}
              {highlight && <p className="t-body3 c-secondary">Highlighted words filled the Seller and Amount fields.</p>}
              <p className="ib-bubble__time t-body3 c-secondary">10:41 AM</p>
            </div>
          </>
        ) : d.source === "photo" ? (
          <div className="ib-photo" role="img" aria-label="Photo of a handwritten receipt"><Icon name="receipt" size={40} /><p className="t-body3 c-secondary">{sp.text}</p></div>
        ) : d.source === "voice" ? (
          <div className="ib-bubble">
            <div className="ib-voice"><IconButton icon="microphone" label="Play voice note" type="secondary" /><span className="ib-voice__bar" aria-hidden="true" /><span className="t-body3 c-secondary">0:18</span></div>
            <p className="t-label c-tertiary">Transcript</p>
            <p className="t-body1 c-primary">{sp.text}</p>
          </div>
        ) : (
          <div className="ib-bubble"><p className={`${d.source === "momo" ? "t-mono-sm" : "t-body1"} c-primary`}>{sp.text}</p></div>
        )}
        <div className="ib-src__foot"><p className="t-body3 c-secondary">Original wording is kept as the source.</p><TextLink size={3} onClick={onOriginal}>Open original</TextLink></div>
      </div>
      <div><Button type="tertiary" size="sm" onClick={onSwitch}>Use a different source</Button></div>
    </aside>
  );
}

function DraftPanel({ d, sellerRef, reading, pinOk, missingPrice, canSend }) {
  const [pricing, setPricing] = useState(null);
  const [price, setPrice] = useState("");
  const [why, setWhy] = useState(null);
  const pinErr = d.pin.length >= 11 && !pinOk ? "That doesn't look like a KRA PIN. It is a letter, 9 digits and a letter." : null;
  const matched = d.sellerFrom === "matched" || d.sellerFrom === "last";
  const sellerHelp = d.sellerFrom === "message" ? "Read from the message. Checking your past payments."
    : d.sellerFrom === "last" ? `Copied from your last invoice to ${d.seller}` : d.sellerFrom === "you" ? "Entered by you" : "Matched from 6 past M-Pesa payments for vegetables";
  const pinHelp = d.pinFrom === "last" ? "Read from her last invoice to you" : pinOk ? "Entered by you"
    : reading ? "Not found yet. Rafiki is still checking." : `Not found yet. Ask ${d.seller} for her KRA PIN. Without it she cannot approve this invoice.`;
  const hint = reading ? ["Still reading. Lines and totals update as Rafiki goes.", "c-secondary"]
    : missingPrice && !pinOk ? ["One line needs a price and the seller's PIN is missing. Fix both to send.", "c-warning"]
    : !pinOk ? ["The seller's PIN is missing. Add it to send.", "c-warning"]
    : missingPrice ? ["One line needs a price. Add it to send.", "c-warning"] : null;

  function savePrice(l) {
    const v = Number(String(price).replace(/[^\d.]/g, ""));
    if (!v) return;
    patchDraft({ lines: getDraft().lines.map((x) => (x.id === l.id ? { ...x, price: v, origin: "you" } : x)) });
    setPricing(null); setPrice("");
  }
  return (
    <section className="ib-draft" aria-label="Draft invoice">
      <div className="ib-draft__head">
        <h1 className="t-h5 c-primary">Draft invoice</h1>
        <StatusBadge status="draft" label="Draft" />
      </div>
      <p className="t-body3 c-secondary">{reading ? "Buyer-initiated. Rafiki is reading your message and filling what it finds. The seller has 30 days to approve. No VAT." : "Buyer-initiated. The seller has 30 days to approve. No VAT."}</p>

      <div className="ib-fields">
        <div className="ib-field">
          <div className="ib-field__tags"><OriginTag kind={d.sellerFrom === "you" ? "you" : "rafiki"} />{matched && <ConfidenceBadge />}</div>
          <label className="ib-field__label t-overline c-tertiary" htmlFor="ib-seller">Seller</label>
          <div className="input input--filled ib-input"><input id="ib-seller" ref={sellerRef} className="input__control" value={d.seller}
            onChange={(e) => patchDraft({ seller: e.target.value, sellerFrom: "you" })} /></div>
          <p className="t-body3 c-secondary">{sellerHelp}</p>
          {matched && d.sellerFrom === "matched" && <TextLink size={3} aria-expanded={why === "seller"} onClick={() => setWhy(why === "seller" ? null : "seller")}>Why?</TextLink>}
          {why === "seller" && <p className="t-body3 c-secondary">You paid 0712 345 678 (MAMA WANJIKU) six times since August, always for vegetables.</p>}
        </div>
        <div className="ib-field">
          <div className="ib-field__tags">{d.pinFrom === "last" ? <><OriginTag kind="rafiki" /><ConfidenceBadge /></> : pinOk ? <OriginTag kind="you" /> : <OriginTag kind="needs" />}</div>
          <label className="ib-field__label t-overline c-tertiary" htmlFor="ib-pin">Seller KRA PIN</label>
          <div className={`input ib-input ${d.pin ? "input--filled" : ""} ${pinErr ? "input--error" : ""}`}><input id="ib-pin" className="input__control" value={d.pin} placeholder="Add the seller's PIN" maxLength={11}
            aria-invalid={pinErr ? true : undefined} onChange={(e) => patchDraft({ pin: e.target.value.toUpperCase().replace(/\s/g, ""), pinFrom: null })} /></div>
          <p className={`t-body3 ${pinErr ? "c-danger" : "c-secondary"}`} role={pinErr ? "alert" : undefined}>{pinErr || pinHelp}</p>
          {d.pinFrom === "last" && <TextLink size={3} aria-expanded={why === "pin"} onClick={() => setWhy(why === "pin" ? null : "pin")}>Why?</TextLink>}
          {why === "pin" && <p className="t-body3 c-secondary">Her approved invoice BII-2026-0391 from 7 Nov carries this PIN.</p>}
        </div>
      </div>

      <div className="ib-field">
        <label className="ib-field__label t-overline c-tertiary" htmlFor="ib-date">Invoice date</label>
        <div className="input input--filled ib-input"><input id="ib-date" className="input__control" value={d.date} onChange={(e) => patchDraft({ date: e.target.value })} /><Icon name="calendar" size={20} /></div>
        <p className="t-body3 c-secondary">{d.sellerFrom === "last" ? "Today, you can change it" : "Read from the message"}</p>
      </div>

      <div className="ib-items">
        <p className="t-semi2 c-primary">Items</p>
        <ul className="ib-lines" aria-busy={reading || undefined}>
          {d.lines.map((l) => {
            const needs = l.price == null;
            return (
              <li key={l.id} className={`ib-line ${needs ? "ib-line--needs" : ""}`}>
                <span className="ib-line__text"><span className="t-semi2 c-primary">{l.name}</span>
                  <span className="t-body3 c-secondary">{l.qty} {l.unit} × {needs ? "price missing" : ksh(l.price)}</span></span>
                {pricing === l.id ? (
                  <span className="ib-line__price">
                    <span className="input input--compact ib-price"><span className="t-body3 c-secondary">KSh</span><input className="input__control" autoFocus inputMode="decimal" aria-label={`Price per ${l.unit === "kg" ? "kg" : l.unit} for ${l.name}`}
                      value={price} placeholder="per kg" onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") savePrice(l); if (e.key === "Escape") setPricing(null); }} /></span>
                    <Button size="sm" onClick={() => savePrice(l)}>Save</Button>
                  </span>
                ) : (
                  <span className="ib-line__end">
                    <OriginTag kind={needs ? "needs" : l.origin} />
                    {needs ? <button type="button" className="ib-add t-semi1" onClick={() => { setPricing(l.id); setPrice(""); }}>Add price</button>
                      : <span className="ib-line__amt">{ksh(lineSum(l))}</span>}
                  </span>
                )}
              </li>
            );
          })}
          {reading && <li className="ib-line ib-line--loading"><Spinner size={20} /><span className="t-body3 c-secondary">Reading the next line…</span></li>}
        </ul>
      </div>

      <dl className="ib-totals">
        <div><dt className="t-body2 c-secondary">Subtotal</dt><dd className="t-body1 c-primary">{ksh(total(d.lines))}</dd></div>
        <div><dt className="t-body2 c-secondary">VAT</dt><dd className="t-body2 c-primary">None on buyer-initiated invoices</dd></div>
        <div className="ib-totals__total"><dt className="t-semi2 c-primary">Total</dt><dd className="t-figure-ib c-primary">{ksh(total(d.lines))}</dd></div>
      </dl>
      {hint && <p className={`t-body3 ${hint[1]}`}>{hint[0]}</p>}
      <div className="ib-actions">
        <Button type="secondary" className="btn--lg" onClick={() => { saveAsDraft(getDraft()); toast("Draft saved. Find it on the Invoice builder page."); }}>Save draft</Button>
        <Button className="btn--lg" disabled={!canSend} onClick={() => navigate("/invoices/confirm")}>Review and send</Button>
      </div>
    </section>
  );
}

function AgentPanel({ d, onAccept, onUndo, onEdit }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const noun = NOUN[d.source] || "message";
  const trace = d.stage === "reading" ? `Reading your ${noun}…` : d.stage === "question" ? `Read your ${noun}. One word is unclear`
    : d.sellerFrom === "last" && d.stage === "ready" ? `Copied your last invoice to ${d.seller}` : `Read your ${noun} and 6 past payments`;
  const steps = d.stage === "reading" ? ["Reading the seller and the date", "Reading the items"]
    : [`Read the seller and the date from your ${noun}`, `Found ${d.lines.length} items`, "Matched 6 past M-Pesa payments to 0712 345 678"];
  function send() {
    if (!msg.trim()) return;
    patchDraft({ chat: [...(d.chat || []), { you: msg.trim() }, { rafiki: "Thanks, noted. Rafiki will use this when it checks the draft." }] });
    setMsg("");
  }
  return (
    <aside className="ib-panel ib-panel--side ib-agent" aria-label="Rafiki">
      <div className="ib-panel__head"><h2 className="t-h6 c-primary">Rafiki</h2><p className="t-body3 c-secondary">Suggestions for this draft. You decide every one.</p></div>
      <button type="button" className="ib-trace t-body3 c-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
        {d.stage === "reading" ? <Spinner size={20} /> : <Icon name="circle-check" size={20} />}<span>{trace}</span><Icon name="chevron-down" size={20} />
      </button>
      {open && <ul className="ib-trace__steps t-body3 c-secondary">{steps.map((s) => <li key={s}>{s}</li>)}</ul>}

      {d.stage === "question" && (
        <div className="ib-question">
          <p className="ib-question__lead t-body3 c-secondary"><Icon name="message-circle" size={16} />Rafiki needs one detail</p>
          <p className="t-semi2 c-primary">"Mboga": vegetables for the shop, or staff lunch?</p>
          <div className="ib-chips">
            {["Vegetables for the shop", "Staff lunch", "Something else"].map((c) => (
              <button key={c} type="button" className="ib-chip t-body3" onClick={() => patchDraft({ answer: c, stage: "suggestion" })}>{c}</button>
            ))}
          </div>
        </div>
      )}

      {(d.stage === "suggestion" || d.stage === "accepted") && !d.dismissed && (
        <AgentSuggestion tone="neutral" title="Seller looks like Mama Wanjiku" body="Matched from 6 past M-Pesa payments for vegetables."
          label="Seller" value="Mama Wanjiku" applied={d.stage === "accepted"} appliedText="Applied to the invoice" onUndo={onUndo}
          onAccept={onAccept} onDismiss={() => patchDraft({ dismissed: true })} onAlt={onEdit} altLabel="Edit"
          why="You paid 0712 345 678 (MAMA WANJIKU) six times since August, always for vegetables. Her last invoice to you carries her KRA PIN." />
      )}
      {d.stage === "suggestion" && d.dismissed && (
        <p className="ib-noted t-body3 c-secondary"><Icon name="circle-minus" size={20} />Suggestion dismissed. Fill the PIN and price yourself.<TextLink size={3} onClick={() => patchDraft({ dismissed: false })}>Undo</TextLink></p>
      )}
      {d.stage === "suggestion" && !d.dismissed && !d.feedback && (
        <div className="ib-rate"><span className="t-body3 c-secondary">Is this right?</span>
          <Button type="secondary" size="sm" onClick={() => patchDraft({ feedback: "yes" })}>Yes</Button>
          <Button type="secondary" size="sm" onClick={() => patchDraft({ feedback: "no" })}>Not quite</Button></div>
      )}
      {(d.feedback || d.stage === "accepted") && <p className="ib-noted t-body3 c-secondary"><Icon name="circle-check" size={20} />Thanks, noted.</p>}

      {(d.chat || []).map((m, i) => m.you
        ? <p key={i} className="ib-msg ib-msg--you t-body2 c-primary">{m.you}</p>
        : <p key={i} className="ib-noted t-body3 c-secondary"><Icon name="circle-check" size={20} />{m.rafiki}</p>)}

      <div className="ib-compose">
        <textarea className="t-body2" rows={3} aria-label="Tell Rafiki what you bought" placeholder={'Tell Rafiki what you bought, e.g. "Nimenunua mboga kwa Mama Wanjiku, 2,500"'}
          value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="ib-compose__row">
          <IconButton icon="paperclip" label="Attach a file" onClick={() => toast("Attaching files isn't part of the prototype.", "paperclip")} />
          <IconButton icon="photo" label="Add a photo" onClick={() => toast("Adding photos isn't part of the prototype.", "photo")} />
          <IconButton icon="microphone" label="Record a voice note" type="secondary" onClick={() => toast("Voice notes aren't part of the prototype.", "microphone")} />
          <span className="ib-compose__spacer" />
          <IconButton icon="send" label="Send to Rafiki" type="primary" onClick={send} />
        </div>
      </div>
      <p className="t-body3 c-secondary">Swahili, English or both is fine. You review everything before it is sent.</p>
    </aside>
  );
}

/* ═════════ 4. Confirm and send ═════════ */
export function ConfirmSend() {
  useDb();
  const d = getDraft();
  const [state, setState] = useState("idle"); // idle | sending | failed
  if (!d) return <NoDraft />;
  const n = d.lines.length;
  async function send() {
    setState("sending");
    await wait(1400);
    if (m4().failSend) { setM4({ failSend: false }); setState("failed"); return; }
    const inv = createInvoice(d);
    setDraft(null);
    navigate(`/invoices/sent/${inv._id}`);
  }
  return (
    <div className="ib-center">
      <section className="ib-card" aria-labelledby="cs-h">
        <div className="ib-card__head"><h1 id="cs-h" className="t-h5 c-primary">Check before you send</h1>
          <p className="t-body3 c-secondary">This is exactly what will be sent. Nothing leaves Rafiki until you confirm.</p></div>
        <KvRows rows={[["Seller", d.seller, "ib-kv__v--b"], ["Seller KRA PIN", d.pin, "t-mono-sm"], ["Invoice date", d.date, "ib-kv__v--b"],
          ["Items", `${n} ${n === 1 ? "line" : "lines"}`, "ib-kv__v--b"], ["VAT", "None on buyer-initiated invoices"], ["Total", ksh(total(d.lines)), "t-figure-md"]]} />
        <NoteBox title="What happens next">Rafiki sends this to {d.seller}. She approves it on her phone with *222#. She has 30 days. Nothing is filed with KRA until she approves.</NoteBox>
        <div className="ib-actions">
          <Button type="secondary" className="btn--lg" disabled={state === "sending"} onClick={() => navigate("/invoices/build")}>Back to draft</Button>
          <Button className="btn--lg" disabled={state === "sending"} aria-busy={state === "sending" || undefined} onClick={send}>
            {state === "sending" ? <><Spinner size={20} />Sending…</> : `Send to ${d.seller}`}</Button>
        </div>
      </section>
      {state === "failed" && (
        <div className="alert alert--danger ib-fail" role="alert">
          <Icon name="alert-circle" size={24} />
          <div className="alert__text"><p className="alert__title">Could not send to {d.seller}</p><p>KRA did not respond. Your invoice is saved as a draft and nothing was sent. Try again in a moment.</p></div>
          <Button type="danger" size="sm" onClick={send}>Try again</Button>
        </div>
      )}
    </div>
  );
}

function createInvoice(d) {
  const no = m4().nextRef || 417;
  setM4({ nextRef: no + 1 });
  const ref = `BII-2026-${String(no).padStart(4, "0")}`;
  const supId = d.seller === SELLER.name ? "sup_mamawanjiku" : null;
  const dl = db.collection("deadlines").insert({ seller: d.seller, amount: total(d.lines), sent: "2026-11-14", expires: "2026-12-14", tone: "pending", status: "waiting", no: ref, supplierId: supId });
  if (supId && !db.collection("suppliers").get(supId)) {
    db.collection("suppliers").insert({ _id: supId, name: SELLER.name, short: SELLER.name, pin: SELLER.pin, phone: SELLER.phone, last: "2026-11-14", waiting: total(d.lines),
      vat: false, etims: false, network: "M-Pesa", confirmedOn: "14 Nov 2026", payVia: "M-Pesa Pochi", pronoun: "her", deadline: dl._id });
  } else if (supId) db.collection("suppliers").update(supId, { deadline: dl._id, waiting: total(d.lines) });
  return invCol().insert({ ref, seller: d.seller, pin: d.pin, date: d.date, lines: d.lines, total: total(d.lines), status: "waiting", deadline: dl._id, supplierId: supId, draft: structuredClone(d) });
}

function NoDraft() {
  return (
    <div className="ib-center"><div className="ib-empty">
      <span className="ib-empty__media"><Icon name="file-text" size={24} /></span>
      <p className="t-h5 c-primary">No draft to send</p><p className="t-body2 c-secondary">Start an invoice and Rafiki prepares the draft for you to check.</p>
      <Button className="btn--lg" onClick={() => navigate("/invoices/new")}>Start an invoice</Button>
    </div></div>
  );
}

/* ═════════ 5. Sent and waiting ═════════ */
const SENT = {
  waiting: { badge: ["sent", "Sent to seller"], sub: "Sent 14 Nov 2026. She has until 14 Dec 2026 to approve.", day: "Day 3 of 30",
    note: ["Her next step", (s) => `${s} approves it on her phone: dial *222#, choose buyer-initiated invoices, then approve. Rafiki cannot do this for her, but it can remind you when to nudge her.`] },
  expiring: { badge: ["expiring", "Expiring soon"], sub: "Sent 14 Nov 2026. It expires on 14 Dec 2026, in 3 days.", day: "Day 27 of 30",
    note: ["Time is short", (s) => `${s} has not approved yet. Send a reminder now. If it expires, you can send it again or declare it without eTIMS.`] },
  approved: { badge: ["approved", "Approved"], sub: "Approved on 19 Nov 2026. The eTIMS invoice is saved.",
    note: ["What this means", () => "The expense is covered. The approved invoice is now in your evidence trail with your message and payment."] },
  rejected: { badge: ["rejected", "Rejected"], sub: "Rejected on 19 Nov 2026. Reason given: wrong amount.",
    note: ["Your options", () => "Fix the amount and send again, or declare the purchase without eTIMS. A declaration is weaker evidence and KRA may review it."] },
  expired: { badge: ["expired", "Expired"], sub: "Expired on 14 Dec 2026. She did not approve in 30 days.",
    note: ["Your options", () => "Send it again with a fresh 30 days, or declare the purchase without eTIMS. A declaration is weaker evidence and KRA may review it."] },
};
export function SentPage({ id }) {
  useDb();
  const inv = invCol().get(id);
  if (!inv) return <NoDraft />;
  const st = SENT[inv.status] || SENT.waiting;
  const remind = () => inv.supplierId ? navigate(`/suppliers/${inv.supplierId}/remind`) : toast("Save this seller as a supplier to send reminders.", "info-circle");
  const reopen = () => { setDraft({ ...structuredClone(inv.draft), stage: "ready", sellerFrom: "last" }); navigate("/invoices/build"); };
  const declare = () => { invCol().update(inv._id, { status: "declared" }); toast("Declared without eTIMS. It is kept as weaker evidence.", "file-text", { tone: "success" }); navigate("/purchases/tracker?tab=closed"); };
  const actions = {
    waiting: [["View in Purchases tracker", () => navigate("/purchases/tracker")], [`Remind ${inv.seller}`, remind]],
    expiring: [["View in Purchases tracker", () => navigate("/purchases/tracker?tab=expiring")], [`Remind ${inv.seller}`, remind]],
    approved: [["Raise a credit note", () => navigate("/invoices/credit"), "tertiary"], ["View in Purchases tracker", () => navigate("/purchases/tracker?tab=approved")], ["View evidence", () => navigate("/evidence")]],
    rejected: [["Declare without eTIMS", declare], ["Edit and send again", reopen]],
    expired: [["Declare without eTIMS", declare], ["Send again", () => { setDraft({ ...structuredClone(inv.draft), stage: "ready", sellerFrom: "last" }); navigate("/invoices/confirm"); }]],
  }[inv.status] || [];
  return (
    <div className="ib-center">
      <section className="ib-card" aria-labelledby="sent-h">
        <div className="ib-card__head">
          <div className="ib-card__title"><h1 id="sent-h" className="t-h5 c-primary">Sent to {inv.seller}</h1><StatusBadge status={st.badge[0]} label={st.badge[1]} /></div>
          <p className="t-body3 c-secondary">{st.sub}</p>
        </div>
        {st.day && <div><StatusBadge status="waiting" outline label={st.day} /></div>}
        <KvRows rows={[["Invoice reference", inv.ref, "t-mono-sm"], ["Total", ksh(inv.total), "t-figure-md"]]} />
        <NoteBox title={st.note[0]}>{st.note[1](inv.seller)}</NoteBox>
        <div className="ib-actions">
          {actions.map(([label, fn, type], i) => <Button key={label} type={type || (i === actions.length - 1 ? "primary" : "secondary")} className="btn--lg" onClick={fn}>{label}</Button>)}
        </div>
      </section>
    </div>
  );
}

/* ═════════ 6. Credit note ═════════ */
export function CreditNote() {
  const needs = query().get("state") === "needs";
  const [reason, setReason] = useState(needs ? null : "amount");
  const [why, setWhy] = useState(false);
  const ref = invCol().find({}).slice(-1)[0]?.ref || "BII-2026-0417";
  return (
    <div className="ib-center">
      <section className="ib-card" aria-labelledby="cn-h">
        <div className="ib-card__head">
          <div className="ib-card__title"><h1 id="cn-h" className="t-h5 c-primary">Credit note</h1><StatusBadge status="draft" label="Draft" /></div>
          <p className="t-body3 c-secondary">An approved invoice cannot be edited. A credit note corrects it. Rafiki has pre-filled the reversal for you to check.</p>
        </div>
        <div className="ib-orig">
          <p className="t-semi2 c-primary">Original invoice</p>
          <KvRows rows={[["Invoice reference", ref, "t-mono-sm"], ["Seller", "Mama Wanjiku", "ib-kv__v--b"], ["Approved total", "KSh 2,500.00", "t-body2"]]} />
        </div>
        <fieldset className="ib-reason">
          <div className="ib-field__tags">{needs && !reason ? <OriginTag kind="needs" /> : needs ? <OriginTag kind="you" /> : <><OriginTag kind="rafiki" /><span className="ib-spacer" /><ConfidenceBadge /></>}</div>
          <legend className="t-overline c-tertiary">Reason</legend>
          <div role="radiogroup" aria-label="Reason" className="ib-reason__opts">
            {[["amount", "Wrong amount"], ["item", "Wrong item"]].map(([v, l]) => (
              <label key={v} className="choice"><input type="radio" className="sr-only" name="cn-reason" checked={reason === v} onChange={() => setReason(v)} />
                <Radio checked={reason === v} /><span className="choice__text t-medium2 c-primary">{l}</span></label>
            ))}
          </div>
          {needs && !reason ? <p className="t-body3 c-warning">Rafiki could not tell why. Pick one so KRA accepts the note.</p>
            : !needs && <><p className="t-body3 c-secondary">Matched to Mama Wanjiku's message: nyanya was KSh 100 a kg, not 120</p>
              <TextLink size={3} aria-expanded={why} onClick={() => setWhy(!why)}>Why?</TextLink>
              {why && <p className="t-body3 c-secondary">She wrote on WhatsApp: "Nyanya ilikuwa 100 kwa kilo, si 120." So 10 kg × KSh 20 is reversed.</p>}</>}
        </fieldset>
        <div className="ib-items">
          <p className="t-semi2 c-primary">Lines to reverse</p>
          <ul className="ib-lines"><li className="ib-line"><span className="ib-line__text"><span className="t-semi2 c-primary">Nyanya, price corrected</span><span className="t-body3 c-secondary">10 kg × KSh 20.00 reversed</span></span>
            <span className="ib-line__end"><OriginTag kind="rafiki" /><span className="ib-line__amt">KSh 200.00</span></span></li></ul>
        </div>
        <KvRows rows={[["Invoice after credit", "KSh 2,300.00", "t-body2"], ["Credit total", "KSh 200.00", "t-figure-md"]]} />
        <div className="ib-actions">
          <Button type="secondary" className="btn--lg" onClick={() => window.history.back()}>Cancel</Button>
          <Button className="btn--lg" disabled={!reason} onClick={() => { toast("Credit note for KSh 200.00 sent to Mama Wanjiku to approve on *222#.", "send", { tone: "success" }); navigate("/invoices"); }}>Review credit note</Button>
        </div>
      </section>
    </div>
  );
}

/* ═════════ 7. Over any page: rejected record (side sheet) and the Pay sheet ═════════ */
export function Module4Overlays() {
  const [record, setRecord] = useState(false);
  const [pay, setPay] = useState(false);
  useEffect(() => {
    const r = () => setRecord(true), p = () => setPay(true);
    window.addEventListener("rafiki:record", r); window.addEventListener("rafiki:pay", p);
    return () => { window.removeEventListener("rafiki:record", r); window.removeEventListener("rafiki:pay", p); };
  }, []);
  return (<>{record && <RecordSheet onClose={() => setRecord(false)} />}{pay && <PaySheet onClose={() => setPay(false)} />}</>);
}

function RecordSheet({ onClose }) {
  const [note, setNote] = useState(ATIENO.note);
  const inBuilder = window.location.hash.startsWith("#/invoices/build") && !!getDraft();
  function reopen() {
    const cur = getDraft();
    if (cur && cur.lines.length) saveAsDraft(cur);
    setDraft({ source: "repeat", stage: "ready", seller: ATIENO.name, sellerFrom: "last", pin: ATIENO.pin, pinFrom: "last", date: "17/11/2026",
      lines: [{ id: "fish", name: "Fish (tilapia)", qty: 2, unit: "kg", price: 1500, origin: "you" }], answer: null, feedback: null, dismissed: false, chat: [{ you: note }] });
    onClose();
    toast(cur ? "Your current draft is saved. Mama Atieno's invoice is open as a new draft." : "Mama Atieno's invoice is open as a new draft.", "file-invoice", { tone: "success" });
    navigate("/invoices/build");
  }
  return (
    <Drawer title={ATIENO.name} onClose={onClose}
      footer={<><Button type="secondary" onClick={onClose}>{inBuilder ? "Back to draft" : "Close"}</Button>
        <Button onClick={() => { onClose(); toast("The full record opens in Evidence (Module 5).", "file-search"); }}>Open record</Button></>}>
      <div className="ib-rec">
        <StatusBadge status="at-risk" label="Rejected" />
        <p className="t-figure-xl c-primary">{ksh(ATIENO.amount)}</p>
        <p className="t-body3 c-secondary">{ATIENO.sub}</p>
      </div>
      <Facts rows={[["Seller PIN", ATIENO.pin, true], ["Reason", ATIENO.reason], ["Sent", ATIENO.sent], ["Next step", ATIENO.next]]} />
      <AgentSuggestion tone="warning" title="Fix the quantity and resend" badge={<StatusBadge status="validated" outline label="Suggested fix" />}
        body="Mama Atieno said the quantity is wrong. Rafiki can reopen it as a new draft with the fish line ready to edit. Your current draft stays saved."
        label="Note to Mama Atieno" value={note} onValueChange={setNote} editable acceptLabel="Reopen as draft" onAccept={reopen} onDismiss={onClose}
        why="She replied on *222# with “Quantity is wrong”. Your M-Pesa payment of KSh 3,000 matches 2 kg at KSh 1,500." />
    </Drawer>
  );
}

function PinBoxes({ value, onChange, error }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="pay-pin" onClick={() => ref.current?.focus()}>
      <div className="pay-pin__boxes" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`pay-pin__box ${i === value.length ? "pay-pin__box--focus" : ""} ${error ? "pay-pin__box--error" : ""}`}>{value[i] ? "•" : ""}</span>)}
      </div>
      <input ref={ref} className="otp__input" type="password" inputMode="numeric" autoComplete="off" maxLength={4} aria-label="App PIN, 4 digits"
        aria-invalid={error ? true : undefined} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))} />
    </div>
  );
}

function PaySheet({ onClose }) {
  const allowed = m4().payPermission !== false;
  const [step, setStep] = useState("ready"); // ready | pin | processing | sent | failed
  const [pin, setPin] = useState("");
  const [tries, setTries] = useState(3);
  const [err, setErr] = useState(false);
  const P = PAYMENT;
  async function pay(skipPin) {
    if (!skipPin && pin !== ((db.get("m6") || {}).appPin || APP_PIN)) { const left = tries - 1; setTries(left); setErr(true); setPin(""); return; }
    setStep("processing");
    await wait(2200);
    if (m4().payFail) { setM4({ payFail: false }); setStep("failed"); return; }
    const n = db.collection("notifications").get("n_payfail");
    if (n) db.collection("notifications").remove("n_payfail");
    setStep("sent");
  }
  if (step === "processing") {
    return (
      <Modal title={`Paying ${P.to}`} icon="send" locked hideClose onClose={() => {}}>
        <div className="pay-wait" role="status"><Spinner size={32} /><p className="t-semi2 c-primary">Waiting for {P.network}</p>
          <p className="t-body2 c-secondary">Approve the request on your phone if {P.network} asks. This can take up to a minute.</p></div>
      </Modal>
    );
  }
  if (step === "sent" || step === "failed") {
    const ok = step === "sent";
    return (
      <Modal title="Payment" icon="wallet" onClose={onClose} footClass="modal__foot--split"
        footer={ok ? <><Button type="secondary" onClick={() => { onClose(); navigate("/invoices/build"); }}>View draft invoice</Button><Button onClick={onClose}>Done</Button></>
          : <><Button type="secondary" onClick={onClose}>Close</Button><Button onClick={() => { setStep("ready"); setPin(""); setErr(false); }}>Try again</Button></>}>
        <StatusBadge status={ok ? "validated" : "at-risk"} label={ok ? "Payment sent" : "Payment failed"} />
        {ok ? (
          <>
            <div className="pay-done"><p className="t-figure-xl c-primary">{ksh(P.amount)}</p><p className="t-semi2 c-primary">Sent to {P.to}</p><p className="t-body2 c-secondary">Your draft invoice was created with this payment.</p></div>
            <KvRows rows={[[`${P.network} reference`, P.ref, "t-mono-sm"]]} />
          </>
        ) : (
          <Alert tone="danger" title={`${P.network} could not complete this payment`}>Your {P.network} balance was too low. No money left your account. Top up, then try again.</Alert>
        )}
      </Modal>
    );
  }
  if (step === "pin") {
    return (
      <Modal title="Enter your app PIN" icon="shield" onClose={onClose} footClass="modal__foot--split"
        footer={<><Button type="secondary" onClick={onClose}>Cancel</Button><Button disabled={pin.length < 4 || tries <= 0} onClick={() => pay(false)}>Pay {ksh(P.amount)}</Button></>}>
        <div className="pay-pinwrap">
          <p className="t-semi2 c-primary">App PIN</p>
          <PinBoxes value={pin} onChange={(v) => { setPin(v); if (v) setErr(false); }} error={err} />
          {err ? <p className="t-body3 c-danger" role="alert">{tries > 0 ? `That PIN is wrong. You have ${tries} ${tries === 1 ? "try" : "tries"} left.` : "That PIN is wrong too many times. Pay is locked for 30 minutes."}</p>
            : <p className="t-body3 c-secondary">Enter your 4-digit app PIN.</p>}
          <TextLink size={3} onClick={() => pay(true)}><Icon name="fingerprint" size={16} />Use fingerprint instead</TextLink>
        </div>
        <ProtoHint>The app PIN is {(db.get("m6") || {}).appPin || APP_PIN} (change it in Profile, Security). Any other PIN shows the wrong-PIN message.</ProtoHint>
      </Modal>
    );
  }
  return (
    <Modal title="Confirm payment" icon="send" onClose={onClose} footClass="modal__foot--split"
      footer={<><Button type="secondary" onClick={onClose}>Go back</Button><Button disabled={!allowed} onClick={() => setStep("pin")}>Confirm with PIN</Button></>}>
      <div className="pay-facts">
        <KvRows rows={[["Pay to", P.to], ["Network", <span className="net-tag t-body3"><Icon name="device-mobile" size={16} />{P.network}</span>], ["From", P.from], ["Invoice", P.invoice], ["Provider charge", P.charge], ["Amount", ksh(P.amount), "ib-kv__v--b"]]} />
      </div>
      {allowed
        ? <div className="pay-note" role="note"><Icon name="info-circle" size={20} /><p className="t-body2 c-primary">Rafiki never pays for you. You confirm this payment with your app PIN, and it goes from your account.</p></div>
        : <div className="pay-note" role="alert"><Icon name="alert-triangle" size={20} /><p className="t-body2 c-primary">Pay permission is off for {P.network}. Turn it on in Connected data, then come back to pay.</p></div>}
    </Modal>
  );
}
