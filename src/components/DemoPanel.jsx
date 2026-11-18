import React, { useEffect, useState } from "react";
import { db, session } from "../db.js";
import { DEMO } from "../seed.js";
import { navigate } from "../router.js";
import { toast } from "./ui.jsx";
import { replayHomeLoading } from "../pages/home.jsx";
import { replayModule3Loading } from "../pages/purchases.jsx";
import { seed } from "../seed.js";
import { m4, setM4, startDraft } from "../pages/invoices.jsx";
import { LINE, SELLER } from "../data/module4.js";

// Prototype-only controls. Not part of the product design.
// Toggle with the "Demo" button or Shift + D.
const JUMPS = [
  ["Sign up", "/signup"], ["Sign in", "/login"],
  ["1 Business", "/onboarding/business"], ["2 Your data", "/onboarding/data"], ["3 Reading", "/onboarding/reading"],
  ["4 Finding", "/onboarding/finding"], ["5 PIN card", "/onboarding/pin-card"], ["Home", "/home"],
  ["Deadlines", "/home/deadlines"],
];
const JUMPS_M3 = [
  ["Purchases", "/purchases"], ["Covered (Bidco)", "/purchases/exp_bidco"], ["Needs fixing", "/purchases/exp_kenya"], ["At risk", "/purchases/exp_total"],
  ["Waiting on seller", "/purchases/exp_njeri"], ["Declared", "/purchases/exp_chebet"], ["Tracker", "/purchases/tracker"], ["Tracker timeline", "/purchases/tracker?view=timeline"],
  ["Batch review", "/purchases/batch"], ["Suppliers", "/suppliers"], ["Profile: Mama Njeri", "/suppliers/sup_njeri"], ["Profile: Not on eTIMS", "/suppliers/sup_otieno"],
  ["Profile: VAT-registered", "/suppliers/sup_kenya"], ["Confirm a payee", "/suppliers/confirm"], ["Remind seller", "/suppliers/sup_njeri/remind"],
  ["Setup guide", "/suppliers/sup_otieno/guide"], ["Add supplier", "/suppliers/new"],
];
function resetModule3() {
  ["purchases", "suppliers", "trackerDone", "deadlines"].forEach((c) => { db.collection(c).find({}).forEach((d) => db.collection(c).remove(d._id)); seed.collections[c].forEach((d) => db.collection(c).insert(structuredClone(d))); });
  ["q_batch", "q_supplier", "q_remind"].forEach((id) => db.collection("queue").get(id) && db.collection("queue").update(id, { status: "open" }));
  db.set("batch", { status: "ready", selected: null }); db.set("m3", { scenario: "live" });
}

// Module 4: put the builder in a given state, or open a sent invoice in a given state
const L4 = (k, x = {}) => ({ ...LINE[k], origin: "rafiki", ...x });
function builderAt(stage) {
  ensureUser();
  const base = startDraft("chat");
  const q = { ...base, stage: "question", sellerFrom: "matched", lines: [L4("sukuma"), L4("nyanya"), L4("vitunguu", { price: null, origin: "needs" })] };
  const d = stage === "reading" ? base : stage === "question" ? q : stage === "suggestion" ? { ...q, stage: "suggestion", answer: "Vegetables for the shop" }
    : stage === "accepted" ? { ...q, stage: "accepted", pin: SELLER.pin, pinFrom: "last", lines: [L4("sukuma"), L4("nyanya"), L4("vitunguu")] } : startDraft("repeat");
  setM4({ draft: d }); navigate("/invoices/build");
}
function sentAt(status) {
  ensureUser();
  const col = db.collection("invoices");
  let inv = col.find({}).slice(-1)[0];
  if (!inv) {
    const d = { ...startDraft("repeat") };
    inv = col.insert({ ref: "BII-2026-0417", seller: SELLER.name, pin: SELLER.pin, date: "14/11/2026", lines: d.lines, total: 2500, status: "waiting", supplierId: null, draft: d });
  }
  col.update(inv._id, { status }); navigate(`/invoices/sent/${inv._id}`);
}
function addPayFail() {
  const n = db.collection("notifications");
  if (!n.get("n_payfail")) n.insert({ _id: "n_payfail", group: "today", order: 0, icon: "wallet", title: "Payment to Mama Wanjiku failed", detail: "KSh 2,500 via M-Pesa. Check the balance, then retry.", time: "1 h ago", action: "Retry", to: null, read: false });
}
function resetModule4() {
  ["invoiceTemplates", "invoices"].forEach((c) => { db.collection(c).find({}).forEach((d) => db.collection(c).remove(d._id)); seed.collections[c].forEach((d) => db.collection(c).insert(structuredClone(d))); });
  db.collection("deadlines").find({}).filter((d) => d.no?.startsWith("BII-")).forEach((d) => db.collection("deadlines").remove(d._id));
  if (db.collection("suppliers").get("sup_mamawanjiku")) db.collection("suppliers").remove("sup_mamawanjiku");
  if (db.collection("notifications").get("n_payfail")) db.collection("notifications").remove("n_payfail");
  db.set("m4", structuredClone(seed.kv.m4));
}

function ensureUser() {
  if (session.user()) return session.user();
  const u = db.users.insert({ name: "Demo Owner", initials: "DO", phone: "700000001", email: "", businessId: null, onboarded: false });
  session.signIn(u._id); return u;
}
function ensureBusiness() {
  const u = ensureUser();
  if (!u.businessId) {
    const b = db.businesses.insert({ pin: DEMO.pin, name: "Wanjiku Fresh Greens Ltd", vat: false, etims: true });
    db.users.update(u._id, { businessId: b._id });
  }
}
function ensureUpload() {
  const u = ensureUser();
  if (!db.uploads.count({ userId: u._id, status: "uploaded" }))
    db.uploads.insert({ userId: u._id, name: "MPESA_Statement_Aug-Oct_2026.pdf", size: 1800000, kind: "statement", status: "uploaded" });
}

export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const demo = db.get("demo") || {};
  useEffect(() => {
    const k = (e) => { if (e.shiftKey && (e.key === "D" || e.key === "d") && !/input|textarea/i.test(e.target.tagName)) setOpen((o) => !o); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  const setDemo = (patch) => db.set("demo", { ...demo, ...patch });

  function jump(path) {
    if (/^\/(onboarding|home|purchases|suppliers|invoices|evidence|search)/.test(path)) ensureUser();
    if (["/onboarding/data", "/onboarding/reading", "/onboarding/finding", "/onboarding/pin-card"].includes(path)) ensureBusiness();
    if (path === "/onboarding/reading") ensureUpload();
    if (path.startsWith("/signup") || path.startsWith("/login")) session.signOut();
    navigate(path);
  }

  return (
    <div className={`demo ${open ? "demo--open" : ""}`}>
      {open && (
        <div className="demo__panel" role="dialog" aria-label="Prototype controls">
          <div className="demo__head"><strong>Prototype controls</strong><span>Shift + D</span></div>
          <div className="demo__section">
            <p className="demo__label">Test values</p>
            <dl className="demo__codes">
              <dt>SMS / email code</dt><dd>Any 6 digits (000000 fails)</dd>
              <dt>Sign in</dt><dd>Any valid phone or email</dd>
              <dt>KRA PIN (found)</dt><dd>{DEMO.pin}</dd>
              <dt>KRA PIN (not found)</dt><dd>{DEMO.notFoundPin}</dd>
              <dt>Failing upload</dt><dd>any .xlsx file</dd>
            </dl>
          </div>
          <div className="demo__section">
            <p className="demo__label">First finding result</p>
            <div className="demo__seg">
              {[["at-risk", "At risk"], ["all-clear", "All clear"]].map(([v, l]) => (
                <button key={v} aria-pressed={(demo.finding || "at-risk") === v} onClick={() => setDemo({ finding: v })}>{l}</button>
              ))}
            </div>
            <p className="demo__label">Google / Microsoft sign-in</p>
            <div className="demo__seg">
              {[["success", "Succeeds"], ["cancel", "Gets cancelled"]].map(([v, l]) => (
                <button key={v} aria-pressed={(demo.provider || "success") === v} onClick={() => setDemo({ provider: v })}>{l}</button>
              ))}
            </div>
          </div>
          <div className="demo__section">
            <p className="demo__label">Home</p>
            <div className="demo__seg">
              {[["live", "Things to review"], ["all-clear", "All clear"]].map(([v, l]) => (
                <button key={v} aria-pressed={((db.get("home") || {}).scenario || "live") === v} onClick={() => { db.set("home", { scenario: v }); jump("/home"); }}>{l}</button>
              ))}
            </div>
            <div className="demo__row">
              <button onClick={() => { replayHomeLoading(); jump("/home/deadlines"); setTimeout(() => navigate("/home"), 30); }}>Replay loading + toast</button>
              <button onClick={() => { ["queue", "deadlines", "notifications", "expenses"].forEach((c) => { db.collection(c).find({}).forEach((d) => db.collection(c).remove(d._id)); seed.collections[c].forEach((d) => db.collection(c).insert(structuredClone(d))); }); db.set("home", { scenario: "live" }); toast("Home data reset"); }}>Reset Home data</button>
            </div>
          </div>
          <div className="demo__section">
            <p className="demo__label">Purchases + Suppliers data</p>
            <div className="demo__seg">
              {[["live", "Full"], ["empty", "Empty (first visit)"]].map(([v, l]) => (
                <button key={v} aria-pressed={((db.get("m3") || {}).scenario || "live") === v} onClick={() => db.set("m3", { scenario: v })}>{l}</button>
              ))}
            </div>
            <div className="demo__row">
              <button onClick={() => { replayModule3Loading(); const h = window.location.hash.slice(1); navigate("/home"); setTimeout(() => navigate(h.startsWith("/home") ? "/purchases" : h), 30); }}>Replay loading</button>
              <button onClick={() => { resetModule3(); toast("Purchases + Suppliers data reset"); }}>Reset Module 3 data</button>
            </div>
            <div className="demo__jumps">{JUMPS_M3.map(([l, p]) => <button key={p} onClick={() => jump(p)}>{l}</button>)}</div>
          </div>
          <div className="demo__section">
            <p className="demo__label">Evidence + Search</p>
            <div className="demo__seg">
              {[["live", "Full"], ["empty", "Empty (first visit)"]].map(([v, l]) => (
                <button key={v} aria-pressed={((db.get("m5") || {}).scenario || "live") === v} onClick={() => db.set("m5", { scenario: v })}>{l}</button>
              ))}
            </div>
            <div className="demo__jumps">
              {[["Evidence index", "/evidence"], ["Trace: At risk", "/evidence/exp_total"], ["Trace: Valid", "/evidence/exp_naivas"], ["Trace: Declared", "/evidence/exp_chebet"],
                ["Trace: Needs fixing", "/evidence/exp_kenya"], ["Trace: Waiting", "/evidence/exp_njeri"], ["Trace: Exempt", "/evidence/exp_java"],
                ["Trace: Running", "/evidence/exp_total?view=running"], ["Trace: Two paths", "/evidence/exp_total?view=paths"], ["Trace: Chat capture", "/evidence/chat"],
                ["Trace: Unreadable", "/evidence/unread"], ["Trace: Retry lookup", "/evidence/exp_quickmart?view=retry"], ["Trail: At risk", "/evidence/exp_total?tab=trail"],
                ["Full view", "/evidence/exp_total/full"], ["Search results: mama", "/search?q=mama"], ["Search: no results", "/search?q=njeru"]]
                .map(([l, p]) => <button key={p} onClick={() => jump(p)}>{l}</button>)}
              <button onClick={() => { ensureUser(); window.dispatchEvent(new CustomEvent("rafiki:search")); }}>Quick search (⌘K)</button>
              <button onClick={() => { ensureUser(); window.dispatchEvent(new CustomEvent("rafiki:ask", { detail: "Mama Njeri" })); }}>Ask Rafiki panel</button>
            </div>
            <div className="demo__row"><button onClick={() => { db.set("m5", { scenario: "live" }); toast("Evidence data reset"); }}>Reset Module 5 data</button></div>
          </div>
          <div className="demo__section">
            <p className="demo__label">Invoice Builder + Pay sheet</p>
            <div className="demo__jumps">
              {[["Landing", () => jump("/invoices")], ["Choose source", () => jump("/invoices/new")], ["Builder: Reading", () => builderAt("reading")],
                ["Builder: Question", () => builderAt("question")], ["Builder: Suggestion", () => builderAt("suggestion")], ["Builder: Accepted", () => builderAt("accepted")],
                ["Builder: Repeat", () => builderAt("repeat")], ["Sent: Waiting", () => sentAt("waiting")], ["Sent: Expiring", () => sentAt("expiring")],
                ["Sent: Approved", () => sentAt("approved")], ["Sent: Rejected", () => sentAt("rejected")], ["Sent: Expired", () => sentAt("expired")],
                ["Credit note", () => jump("/invoices/credit")], ["Credit note: Needs you", () => jump("/invoices/credit?state=needs")],
                ["Rejected record (side sheet)", () => window.dispatchEvent(new CustomEvent("rafiki:record"))], ["Pay sheet", () => window.dispatchEvent(new CustomEvent("rafiki:pay"))]]
                .map(([l, fn]) => <button key={l} onClick={fn}>{l}</button>)}
            </div>
            <div className="demo__row">
              <button aria-pressed={!!m4().failSend} onClick={() => setM4({ failSend: !m4().failSend })}>Next send fails</button>
              <button aria-pressed={!!m4().payFail} onClick={() => setM4({ payFail: !m4().payFail })}>Next payment fails</button>
              <button aria-pressed={m4().payPermission === false} onClick={() => setM4({ payPermission: m4().payPermission === false })}>M-Pesa pay permission off</button>
            </div>
            <div className="demo__row">
              <button onClick={() => { addPayFail(); toast("Payment-failed notification added to the bell"); }}>Add payment-failed notification</button>
              <button onClick={() => { db.collection("invoiceTemplates").find({}).forEach((d) => db.collection("invoiceTemplates").remove(d._id)); toast("Saved drafts cleared"); }}>Clear saved drafts</button>
              <button onClick={() => { setM4({ toastShown: false }); toast("The mid-draft toast will show again"); }}>Replay mid-draft toast</button>
              <button onClick={() => { resetModule4(); toast("Invoice Builder data reset"); }}>Reset Module 4 data</button>
            </div>
            <p className="demo__label">App PIN for the Pay sheet: 1234</p>
          </div>
          <div className="demo__section">
            <p className="demo__label">Jump to a screen</p>
            <div className="demo__jumps">{JUMPS.map(([l, p]) => <button key={p} onClick={() => jump(p)}>{l}</button>)}</div>
          </div>
          <div className="demo__section demo__row">
            <button onClick={() => { ensureUpload(); toast("Sample statement added"); }}>Add sample statement</button>
            <button onClick={() => { session.signOut(); navigate("/login"); }}>Sign out</button>
            <button className="demo__danger" onClick={() => { db.reset(); try { sessionStorage.clear(); } catch (e) {} navigate("/signup"); toast("Demo data reset"); }}>Reset all data</button>
          </div>
        </div>
      )}
      <button className="demo__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Demo"}</button>
    </div>
  );
}
