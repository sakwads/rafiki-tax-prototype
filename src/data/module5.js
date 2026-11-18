// Module 5: Trace & Evidence. Every evidence record IS a purchase (Purchases is the source of truth).
// The agent trace and the trail are built from the purchase's own records. A few demo views from
// Figma (Running, Two paths, Retry lookup, Chat capture, Unreadable receipt) are kept as overrides.

const st = (kind, state, title, sub, extra = {}) => ({ kind, state, title, sub, ...extra });
const fmt = (n) => Number(n).toLocaleString("en-KE");
const day = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const STATUS = { covered: "validated" };
const SOURCE_KIND = { "Receipt photo": "Receipt", Email: "Email receipt", "M-Pesa": "M-Pesa payment", "Buyer invoice": "Buyer-initiated invoice" };
const FIRST = { "Receipt photo": "Snapped the receipt", Email: "Forwarded the email receipt", "M-Pesa": "Read the M-Pesa payment", "Buyer invoice": "Started a buyer-initiated invoice" };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

export function evidenceFor(p, sup) {
  const status = STATUS[p.status] || p.status;
  const records = (p.records || []).map((r) => ({ icon: r.icon, title: r.title, sub: r.sub, status: p.status === "waiting" && r.missing ? "waiting" : STATUS[r.status] || r.status,
    amount: r.missing ? null : p.amount, missing: !!r.missing, action: r.missing && p.status !== "waiting" ? "Add" : null }));
  const inv = (p.records || []).find((r) => r.icon === "wallet" && /eTIMS/.test(r.title));
  const n = Math.max(1, daysBetween(p.date, "2026-11-17"));
  const RULE = {
    validated: st("rule", "done", "Checked your PIN is on it", "Your PIN is on the invoice", { label: "if PIN" }),
    "at-risk": st("rule", "failed", "Checked your PIN is on it", "Your PIN is missing", { label: "if no PIN" }),
    "needs-fixing": st("rule", "failed", "Checked your PIN is on it", inv ? inv.sub.split("·").pop().trim().replace(/^./, (c) => c.toUpperCase()) : "Something on the invoice is wrong", { label: "if no PIN" }),
    exempt: st("rule", "done", "Checked the seller's VAT status", "Exempt, no eTIMS invoice needed"),
    declared: st("rule", "done", "Checked for a seller PIN", "Seller is not on eTIMS", { label: "if none" }),
    waiting: st("rule", "running", "Waiting for the seller to approve", `Day ${n} of 30`),
  };
  const OUT = {
    validated: ["Counted for your tax return", "done"], "at-risk": ["Ask them to reissue it with your PIN", "needs"], "needs-fixing": ["Ask the seller to correct the invoice", "needs"],
    exempt: ["Counted without an eTIMS invoice", "done"], declared: ["Declared without an eTIMS invoice", "needs"], waiting: ["Approve on *222# within 30 days", "queued"],
  };
  const SUMMARY = {
    validated: "Your PIN is on the invoice, so this purchase is valid.", "at-risk": "Your PIN is missing from this invoice, so the purchase is at risk.",
    "needs-fixing": p.note || "Something on the invoice needs fixing before you claim it.", exempt: "This seller is VAT-exempt, so no eTIMS invoice is needed.",
    declared: "This seller has no eTIMS, so you declared the purchase without an invoice.", waiting: `The seller has not approved the invoice yet. Day ${n} of 30.`,
  };
  const CTA = { validated: ["See evidence"], exempt: ["See evidence"], "at-risk": ["Ask for a reissue", "reissue"], "needs-fixing": ["Ask for a correction", "reissue"],
    declared: ["Start an invoice", null, "/invoices/new"], waiting: [sup ? `Remind ${sup.short || sup.name}` : "View in tracker", null, sup ? `/suppliers/${sup._id}/remind` : "/purchases/tracker"] };
  const third = p.source === "Buyer invoice"
    ? st("agent", "done", "Sent it to the seller", `Sent ${day(p.date)}`)
    : st("agent", "done", "Looked for an eTIMS invoice", status === "exempt" ? "None needed" : status === "declared" ? "None found, seller is not on eTIMS" : inv ? (inv.missing ? "None found with your PIN" : `Found one from ${day(p.date)}`) : "None found");
  const steps = [
    st("action", "done", FIRST[p.source] || "Added the purchase", records[0]?.title || p.seller, { doc: true }),
    st("agent", "done", p.source === "Buyer invoice" ? "Drafted the invoice" : "Read amount and seller", `KSh ${fmt(p.amount)} to ${p.seller}`),
    third, RULE[status] || RULE.validated,
    st("outcome", OUT[status][1], status, OUT[status][0], { badge: status }),
  ];
  const missing = records.filter((r) => r.missing).length;
  const s = p.suggestion;
  const suggestion = s && status !== "validated" && status !== "exempt"
    ? { tone: status === "at-risk" ? "danger" : s.tone === "neutral" ? "draft" : s.tone, title: s.title, body: s.body, label: s.label, value: s.value, why: s.why, accept: s.accept || "Accept" }
    : status === "at-risk" ? { tone: "danger", title: "Invoice is missing your PIN", body: `KSh ${fmt(p.amount)} may be disallowed as a deduction. Ask ${p.seller} to reissue the invoice with your PIN before 30 Nov.`, label: "At risk", value: `KSh ${fmt(p.amount)}.00`, accept: "Accept",
      why: `Rafiki searched eTIMS for an invoice from ${p.seller} to your PIN P051234567Z and found none.` }
    : status === "needs-fixing" ? { tone: "warning", title: "Invoice needs fixing", body: `${p.note || "The invoice is not usable yet."} Ask ${p.seller} to reissue it before you claim the KSh ${fmt(p.amount)}.`, label: "Needs fixing", value: `KSh ${fmt(p.amount)}.00`, accept: "Accept",
      why: "The invoice Rafiki found does not carry your PIN P051234567Z, so KRA would not allow the expense." }
    : null;
  return {
    _id: p._id, seller: p.seller, ref: p.invoiceNo || "No invoice", date: p.date, amount: p.amount, status, kind: SOURCE_KIND[p.source] || "Purchase",
    of: `${records.length - missing} of ${records.length}`, summary: SUMMARY[status], cta: CTA[status][0], ctaAction: CTA[status][1], ctaTo: CTA[status][2],
    banner: missing && status !== "waiting" ? `${missing === 1 ? "1 record needs" : missing + " records need"} fixing. The pack will list the gap.` : null,
    steps, records, suggestion, source: p.source, payment: p.payment,
  };
}

// Demo views from Figma, laid over a real purchase (Total Energies Kenya, Quickmart Kilimani)
export const VIEWS = {
  running: { status: "pending", summary: "Rafiki is still checking this purchase. Nothing needs you yet.", cta: "See evidence", ctaAction: null, meta: "3 steps, still running", suggestion: null, banner: null, recordsSoFar: 2,
    steps: [st("action", "done", "Snapped the receipt", "Receipt, Total Energies Kenya", { doc: true }),
      { kind: "parallel", items: [st("agent", "running", "Check seller PIN", "Against the KRA PIN list"), st("agent", "done", "Match to supplier", "Known supplier, 4 past invoices")] },
      st("outcome", "queued", "Queued", "Waiting for the checks", { badge: "pending" })] },
  paths: { summary: "Your PIN decides the outcome. It is missing, so the purchase is at risk.", meta: "4 steps, 2 paths",
    branches: [
      { label: "PIN found", taken: false, step: st("outcome", "queued", "Covered", "If your PIN is on the invoice", { tag: "Not taken" }) },
      { label: "PIN missing", taken: true, step: st("outcome", "needs", "Ask them to reissue it", "Before you leave the counter", { tag: "Needs you" }) }] },
  retry: { status: "lookup", of: "2 of 3", summary: "KRA did not answer the eTIMS lookup. Nothing was lost, so retry it.", cta: "Retry the lookup", ctaAction: "retry", banner: "KRA did not answer the lookup. Retry it.",
    stepPatch: { 2: { state: "failed", sub: "KRA did not answer", label: "retry" }, 3: { state: "queued", sub: "Waiting for the lookup", label: null }, 4: { state: "needs", title: "Try again", sub: "Retry the lookup, nothing was lost", badge: "lookup" } },
    recordPatch: { 2: { sub: "Lookup failed · KRA did not answer", status: "lookup", amount: null, missing: true, action: "Retry" } },
    suggestion: { tone: "warning", title: "KRA did not answer the lookup", body: "The eTIMS lookup timed out and nothing was lost. Retry now, or wait a few minutes.", label: "Lookup", value: "Timed out", alt: "Remind me", accept: "Retry lookup",
      why: "KRA's eTIMS service took longer than 30 seconds to reply. Rafiki keeps the receipt and payment and only repeats the lookup." } },
};

// Standalone records that are not purchases yet
export const EXTRA = {
  chat: { _id: "chat", seller: "Mama Wanjiku", ref: "Draft", date: "2026-11-14", amount: 2500, status: "draft", kind: "WhatsApp message", of: "3 of 3",
    summary: "Rafiki drafted an invoice from the chat. Review it, then send.", cta: "Review draft", ctaTo: "/invoices",
    steps: [st("action", "done", "Shared a WhatsApp message", "\"Sawa, mboga ya leo ni 2,500: sukuma, nyanya na vitunguu\"", { doc: true }), st("agent", "done", "Read amount and seller", "3 items, KSh 2,500"),
      st("agent", "done", "Matched an M-Pesa payment", "KSh 2,500 to 0712… on Saturday"), st("agent", "done", "Drafted a buyer-initiated invoice", "Seller: Mama Wanjiku"),
      st("outcome", "needs", "Draft ready", "Review the draft, then send", { badge: "draft" })],
    records: [{ icon: "brand-whatsapp", title: "WhatsApp message from Mama Wanjiku", sub: "Chat · 14 Nov 2026", amount: 2500, status: "validated" },
      { icon: "device-mobile-message", title: "M-Pesa to Mama Wanjiku", sub: "Send money · 14 Nov 2026", amount: 2500, status: "validated" },
      { icon: "file-text", title: "Buyer-initiated invoice, drafted by Rafiki", sub: "Draft · not sent", amount: 2500, status: "draft" }],
    suggestion: { tone: "draft", title: "Draft ready to send", body: "Review the invoice Rafiki drafted from the chat, then send it to KRA as the buyer.", label: "Draft", value: "KSh 2,500.00", accept: "Accept", acceptTo: "/invoices",
      why: "The chat names the goods and the total, and an M-Pesa payment of the same amount went to her number the same day." } },
  unread: { _id: "unread", seller: "Receipt not read", ref: "Not read", date: "2026-11-12", amount: null, status: "needs-fixing", kind: "Photo", of: "1 of 2",
    summary: "The receipt photo was too blurry to read, so nothing was checked yet.", cta: "Retake the photo", ctaAction: "retake", banner: "The receipt cannot be read. Retake the photo to continue.",
    steps: [st("action", "done", "Snapped the receipt", "Photo taken 12 Nov 2026", { doc: true }), st("agent", "failed", "Read amount and seller", "Photo too blurry to read"),
      st("agent", "queued", "Looked for an eTIMS invoice", "Waiting for a readable receipt"), st("rule", "queued", "Checked your PIN is on it", "Not checked yet"),
      st("outcome", "needs", "Needs a new photo", "Retake the receipt photo", { badge: "needs-fixing" })],
    records: [{ icon: "receipt", title: "Receipt photo, not readable", sub: "Photo · 12 Nov 2026", amount: null, status: "needs-fixing" },
      { icon: "wallet", title: "eTIMS invoice not looked for", sub: "Waiting for a readable receipt", amount: null, status: "waiting", missing: true }],
    suggestion: { tone: "warning", title: "Receipt photo is too blurry", body: "Rafiki could not read the amount or the seller. Retake the photo flat, in good light and in focus.", label: "Receipt", value: "Not readable", alt: "Upload file", accept: "Retake photo",
      why: "The text on the photo is below the size Rafiki can read. The till number and total are both cut off." } },
};
