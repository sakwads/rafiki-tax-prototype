// Module 3 fake data: purchases, suppliers, tracker invoices and the weekly batch.
// Every name, PIN and number here is invented.

/* ───────── Purchases ─────────
   status: covered | exempt | needs-fixing | at-risk | waiting | declared
   waiting purchases point at a deadline (Home → Deadlines) so reminders stay in sync. */
const rec = (icon, title, sub, status, extra = {}) => ({ icon, title, sub, status, ...extra });
const nice = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function coveredRecords(p) {
  const d = nice(p.date);
  const first = p.source === "Email" ? rec("mail", `Email receipt, ${p.seller}`, `Email · ${d}`, "validated")
    : rec("receipt", `Receipt, ${p.seller}`, `Photo · ${d}`, "validated");
  return [first, rec("device-mobile-message", `${p.payment} to ${p.seller}`, `Till payment · ${d}`, "validated"),
    rec("wallet", `eTIMS invoice from ${p.seller}`, `Received · ${d}`, "covered")];
}

const P = [
  { _id: "exp_bidco", seller: "Bidco Africa Ltd", invoiceNo: "KRA-INV-2041", date: "2026-11-12", amount: 48200, source: "Receipt photo", payment: "M-Pesa", status: "covered", pin: "P051234567Z" },
  { _id: "exp_naivas", seller: "Naivas Supermarket", invoiceNo: "NVS-88213", date: "2026-11-11", amount: 36750, source: "M-Pesa", payment: "M-Pesa", status: "covered", pin: "P051017633S" },
  { _id: "exp_kenya", seller: "Kenya Power", invoiceNo: "KP-0094412", date: "2026-11-10", amount: 21400, source: "Email", payment: "M-Pesa", status: "needs-fixing", pin: "P052110938M", supplierId: "sup_kenya",
    note: "No eTIMS invoice carries your PIN yet. Ask the seller to reissue it.",
    actions: [["secondary", "View evidence", "pack"], ["primary", "Fix with agent", "fix"]],
    records: [rec("mail", "Email receipt, Kenya Power", "Email · 10 Nov 2026", "validated"), rec("device-mobile-message", "M-Pesa to Kenya Power", "Till payment · 10 Nov 2026", "validated"),
      rec("wallet", "eTIMS invoice from Kenya Power", "Not found · your PIN was not captured", "at-risk", { missing: true })],
    suggestion: { tone: "warning", title: "Your PIN is missing on this invoice", body: "Ask Kenya Power to reissue it with your PIN, or add the PIN yourself.", label: "Buyer PIN", value: "Missing",
      editValue: "P051234567Z", accept: "Accept", done: "Reissue request ready for Kenya Power", why: "The email receipt and M-Pesa payment match, but the eTIMS invoice was issued without a buyer PIN, so KRA cannot link it to you." } },
  { _id: "exp_total", seller: "Total Energies Kenya", invoiceNo: "TE-55102", date: "2026-11-08", amount: 18900, source: "Receipt photo", payment: "M-Pesa", status: "at-risk", pin: "P051662301B",
    note: "No eTIMS invoice found. KRA may disallow this expense for tax.",
    actions: [["secondary", "Mark as declared", "declare"], ["primary", "Ask seller for invoice", "ask"]],
    records: [rec("receipt", "Receipt, Total Energies Kenya", "Photo · 08 Nov 2026", "validated"), rec("device-mobile-message", "M-Pesa to Total Energies Kenya", "Till payment · 08 Nov 2026", "validated"),
      rec("wallet", "eTIMS invoice from Total Energies Kenya", "Not found · your PIN was not captured", "at-risk", { missing: true })],
    suggestion: { tone: "danger", title: "No eTIMS invoice for this purchase", body: "KSh 18,900 may be disallowed as a deduction. Ask the seller for an invoice before 30 Nov.", label: "At risk", value: "KSh 18,900.00",
      accept: "Accept", done: "Invoice request ready for Total Energies Kenya", why: "Rafiki searched eTIMS for an invoice from P051662301B to your PIN between 1 and 15 Nov and found none." } },
  { _id: "exp_njeri", seller: "Mama Njeri Groceries", invoiceNo: "RFK-INV-0118", date: "2026-11-05", amount: 6300, source: "Buyer invoice", payment: "M-Pesa", status: "waiting", deadline: "d_njeri", pin: "P051099412C", supplierId: "sup_njeri", noInvoiceShown: true,
    note: "Request sent to the seller. They have until 5 Dec 2026 to approve it.",
    actions: [["secondary", "Cancel request", "cancel"], ["primary", "Remind seller", "remind"]],
    records: [rec("receipt", "Buyer invoice, Mama Njeri Groceries", "Sent by you · 05 Nov 2026", "validated"),
      rec("wallet", "eTIMS invoice from Mama Njeri Groceries", "Not found · your PIN was not captured", "at-risk", { missing: true })],
    suggestion: { tone: "info", title: "Waiting for Mama Njeri to approve", body: "Remind her on WhatsApp. The invoice expires on day 30.", label: "Next step", value: "Remind seller",
      accept: "Accept", go: "/suppliers/sup_njeri/remind", why: "Sellers who get a reminder in the second week usually approve before day 20." } },
  { _id: "exp_quickfix", seller: "Quick Fix Garage", invoiceNo: "RFK-INV-0131", date: "2026-11-05", amount: 14000, source: "Buyer invoice", payment: "M-Pesa", status: "waiting", deadline: "d_quickfix", pin: "P051455820D", supplierId: "sup_quickfix", noInvoiceShown: true },
  { _id: "exp_chebet", seller: "Chebet Tailoring", invoiceNo: "", date: "2026-11-04", amount: 8500, source: "Receipt photo", payment: "M-Pesa", status: "declared", pin: "P051620377F",
    note: "Declared without an eTIMS invoice. This is weaker evidence and subject to KRA review.",
    actions: [["secondary", "Add evidence", "add"]],
    records: [rec("receipt", "Receipt, Chebet Tailoring", "Photo · 04 Nov 2026", "validated"), rec("wallet", "M-Pesa to Chebet Tailoring", "Till payment · 04 Nov 2026", "covered")],
    suggestion: { tone: "neutral", title: "Declared as a non-eTIMS purchase", body: "Recorded for your return. No seller invoice is needed.", label: "Treatment", value: "Declared",
      applied: true, appliedText: "Saved to your records", why: "Small purchases from sellers who are not on eTIMS can be declared, but KRA may ask for proof." } },
  { _id: "exp_jumia", seller: "Jumia Kenya", invoiceNo: "JMK-77120", date: "2026-11-03", amount: 12600, source: "Email", payment: "Card", status: "covered", pin: "P051877412A" },
  { _id: "exp_java", seller: "Java House", invoiceNo: "JVH-20931", date: "2026-11-02", amount: 3450, source: "Receipt photo", payment: "M-Pesa", status: "exempt", pin: "P051300218K" },
  { _id: "exp_safaricom", seller: "Safaricom PLC", invoiceNo: "SFC-55810", date: "2026-11-01", amount: 7200, source: "Email", payment: "M-Pesa", status: "covered", pin: "P051100001S" },
  { _id: "exp_rubis", seller: "Rubis Energy", invoiceNo: "RB-44120", date: "2026-10-31", amount: 9800, source: "Receipt photo", payment: "M-Pesa", status: "at-risk", pin: "P051556019R" },
  { _id: "exp_carrefour", seller: "Carrefour Two Rivers", invoiceNo: "CRF-10442", date: "2026-10-30", amount: 22180, source: "Receipt photo", payment: "Card", status: "covered", pin: "P051488201C" },
  { _id: "exp_unga", seller: "Unga Ltd", invoiceNo: "UNG-30915", date: "2026-10-28", amount: 31500, source: "Email", payment: "Bank", status: "covered", pin: "P051002741U" },
  { _id: "exp_brookside", seller: "Brookside Dairy", invoiceNo: "BRK-77031", date: "2026-10-27", amount: 15400, source: "M-Pesa", payment: "M-Pesa", status: "covered", pin: "P051210087B" },
  { _id: "exp_tbc", seller: "Text Book Centre", invoiceNo: "TBC-61207", date: "2026-10-25", amount: 4750, source: "Receipt photo", payment: "Card", status: "exempt", pin: "P051099020T" },
  { _id: "exp_chebetd", seller: "Chebet Dairy", invoiceNo: "RFK-INV-0115", date: "2026-10-22", amount: 4100, source: "Buyer invoice", payment: "M-Pesa", status: "waiting", deadline: "d_chebet", pin: "P051703344D", supplierId: "sup_chebetd", noInvoiceShown: true },
  { _id: "exp_kamau", seller: "Kamau Hardware", invoiceNo: "RFK-INV-0121", date: "2026-10-21", amount: 22450, source: "Buyer invoice", payment: "M-Pesa", status: "waiting", deadline: "d_kamau", pin: "P051234567Q", supplierId: "sup_kamau", noInvoiceShown: true },
  { _id: "exp_wanjiku", seller: "Wanjiku Vegetables", invoiceNo: "RFK-INV-0126", date: "2026-10-20", amount: 4800, source: "Buyer invoice", payment: "M-Pesa", status: "waiting", deadline: "d_wanjiku", pin: "P051340218H", supplierId: "sup_wanjiku", noInvoiceShown: true },
  { _id: "exp_davis", seller: "Davis & Shirtliff", invoiceNo: "DS-20877", date: "2026-10-18", amount: 27900, source: "Email", payment: "Bank", status: "needs-fixing", pin: "P051019944D" },
  { _id: "exp_kenchic", seller: "Kenchic Ltd", invoiceNo: "KC-90211", date: "2026-10-16", amount: 11200, source: "M-Pesa", payment: "M-Pesa", status: "covered", pin: "P051230456K" },
  { _id: "exp_quickmart", seller: "Quickmart Kilimani", invoiceNo: "QM-55190", date: "2026-10-14", amount: 8640, source: "Receipt photo", payment: "Airtel Money", status: "covered", pin: "P051667320Q" },
  { _id: "exp_copycat", seller: "Copy Cat Ltd", invoiceNo: "CC-11873", date: "2026-10-11", amount: 5900, source: "Email", payment: "Bank", status: "covered", pin: "P051004417C" },
  { _id: "exp_ola", seller: "Ola Energy Ngong Rd", invoiceNo: "OLA-30028", date: "2026-10-09", amount: 6200, source: "Receipt photo", payment: "M-Pesa", status: "exempt", pin: "P051322190O" },
  { _id: "exp_twiga", seller: "Twiga Foods", invoiceNo: "TWG-81066", date: "2026-10-06", amount: 19300, source: "M-Pesa", payment: "M-Pesa", status: "covered", pin: "P051778023T" },
];

// Fill in the generic parts so every purchase opens a full detail page.
function complete(p) {
  const d = nice(p.date);
  const vat = Math.round((p.amount * 16 / 116) * 100) / 100;
  const base = { ref: p.invoiceNo ? `Invoice ${p.invoiceNo}` : "No eTIMS invoice", vat, dateLabel: d, ...p };
  if (p.noInvoiceShown && p.invoiceNo) base.ref = `Invoice ${p.invoiceNo}`;
  if (p.records) return base;
  if (p.status === "covered") return { ...base, note: "Matched to an eTIMS invoice and a payment.", records: coveredRecords(p),
    actions: [["secondary", "Export evidence", "pack"]],
    suggestion: { tone: "draft", title: `Seller matched to ${p.seller}`, body: "Matched from the receipt PIN and past purchases.", label: "Seller", value: p.seller, applied: true, why: `The PIN on the receipt matches ${p.seller}'s KRA PIN.` } };
  if (p.status === "exempt") return { ...base, note: "Exempt from VAT. No input VAT to claim, but it still counts as an expense.", records: coveredRecords(p).slice(0, 2),
    actions: [["secondary", "Export evidence", "pack"]],
    suggestion: { tone: "draft", title: "Marked as VAT-exempt", body: "The receipt shows exempt items only.", label: "VAT", value: "Exempt", applied: true, appliedText: "Saved to your records", why: "Every line on the receipt is an exempt supply." } };
  if (p.status === "waiting") return { ...base, note: "Request sent to the seller. They approve it on *222#.",
    actions: [["secondary", "Cancel request", "cancel"], ["primary", "Remind seller", "remind"]],
    records: [rec("receipt", `Buyer invoice, ${p.seller}`, `Sent by you · ${d}`, "validated"),
      rec("wallet", `eTIMS invoice from ${p.seller}`, "Waiting for the seller to approve", "at-risk", { missing: true })],
    suggestion: { tone: "info", title: `Waiting for ${p.seller} to approve`, body: "Remind them on WhatsApp. The invoice expires on day 30.", label: "Next step", value: "Remind seller",
      accept: "Accept", go: p.supplierId ? `/suppliers/${p.supplierId}/remind` : null, why: "A short reminder with the *222# steps is ready." } };
  if (p.status === "at-risk") return { ...base, note: "No eTIMS invoice found. KRA may disallow this expense for tax.",
    actions: [["secondary", "Mark as declared", "declare"], ["primary", "Ask seller for invoice", "ask"]],
    records: [...coveredRecords(p).slice(0, 2), rec("wallet", `eTIMS invoice from ${p.seller}`, "Not found · your PIN was not captured", "at-risk", { missing: true })],
    suggestion: { tone: "danger", title: "No eTIMS invoice for this purchase", body: `${"KSh " + p.amount.toLocaleString("en-KE")} may be disallowed as a deduction. Ask the seller for an invoice.`, label: "At risk", value: "KSh " + p.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 }),
      accept: "Accept", done: `Invoice request ready for ${p.seller}`, why: "Rafiki searched eTIMS and found no invoice to your PIN for this payment." } };
  // needs-fixing
  return { ...base, note: "The eTIMS invoice does not carry your PIN. Ask the seller to reissue it.",
    actions: [["secondary", "View evidence", "pack"], ["primary", "Fix with agent", "fix"]],
    records: [...coveredRecords(p).slice(0, 2), rec("wallet", `eTIMS invoice from ${p.seller}`, "Found · buyer PIN missing", "needs-fixing")],
    suggestion: { tone: "warning", title: "Your PIN is missing on this invoice", body: `Ask ${p.seller} to reissue it with your PIN.`, label: "Buyer PIN", value: "Missing", editValue: "P051234567Z",
      accept: "Accept", done: `Reissue request ready for ${p.seller}`, why: "The invoice was issued without a buyer PIN." } };
}
export const PURCHASES = P.map(complete);

/* ───────── Suppliers ───────── */
const S = (o) => ({ waiting: 0, vat: false, etims: true, network: "M-Pesa", confirmedOn: "28 Oct 2026", ...o });
export const SUPPLIERS = [
  // Informal sellers from the Invoice Builder story (added 18 Nov so Search, Invoice Builder and Suppliers agree)
  S({ _id: "sup_mamawanjiku", name: "Mama Wanjiku", short: "Mama Wanjiku", pin: "P051234567A", phone: "0712 345 678", last: "2026-11-14", payVia: "M-Pesa Pochi", etims: false, confirmedOn: "14 Nov 2026", pronoun: "her",
    payments: [{ icon: "brand-whatsapp", title: "Message from Mama Wanjiku", sub: "WhatsApp · Sat 14 Nov 2026", amount: 2500, status: "validated" },
      { icon: "device-mobile-message", title: "M-Pesa to 0712 345 678", sub: "Payment · Sat 14 Nov 2026", amount: 2500, status: "validated" }],
    history: [{ icon: "circle-check", title: "Supplier saved", sub: "Matched from 6 past M-Pesa payments for vegetables", date: "14 Nov" }] }),
  S({ _id: "sup_mamaatieno", name: "Mama Atieno", short: "Mama Atieno", pin: "P051987654C", phone: "0745 118 220", last: "2026-11-11", payVia: "M-Pesa Pochi", etims: false, confirmedOn: "11 Nov 2026", pronoun: "her",
    invoices: [{ icon: "file-text", title: "Fish, 2 kg", sub: "Buyer-initiated · sent 11 Nov", meta: "Rejected: “Quantity is wrong”", metaIcon: "circle-x", amount: 3000, status: "rejected", to: "/invoices" }],
    history: [{ icon: "circle-x", title: "Invoice rejected", sub: "Fish, KSh 3,000.00 · “Quantity is wrong”", date: "17 Nov" }, { icon: "send", title: "Invoice sent for approval", sub: "Fish, KSh 3,000.00", date: "11 Nov" }] }),
  S({ _id: "sup_kamau", name: "Kamau Hardware", pin: "P051234567Q", phone: "0722 118 402", last: "2026-10-28", waiting: 22450, payVia: "M-Pesa till", pronoun: "him", deadline: "d_kamau", purchase: "exp_kamau" }),
  S({ _id: "sup_quickfix", name: "Quick Fix Garage", pin: "P051455820D", phone: "0733 902 114", last: "2026-11-05", waiting: 14000, payVia: "M-Pesa till", pronoun: "them", deadline: "d_quickfix", purchase: "exp_quickfix" }),
  S({ _id: "sup_otienofish", name: "Otieno Fish Supplies", pin: "P051477063B", phone: "0734 556 210", last: "2026-11-14", waiting: 12100, payVia: "Airtel Money", network: "Airtel Money", pronoun: "him", deadline: "d_otieno" }),
  S({ _id: "sup_mwangi", name: "Mwangi Electricals", pin: "P051288140W", phone: "0711 450 987", last: "2026-11-09", waiting: 9300, payVia: "M-Pesa till", pronoun: "him", deadline: "d_mwangi" }),
  S({ _id: "sup_njeri", name: "Mama Njeri Groceries", short: "Mama Njeri", pin: "P051099412C", phone: "0722 410 233", last: "2026-11-05", waiting: 6300, payVia: "M-Pesa Pochi", pronoun: "her", deadline: "d_njeri", purchase: "exp_njeri",
    invoices: [{ icon: "file-text", title: "Groceries for the shop", sub: "Buyer-initiated · RFK-INV-0118 · sent 5 Nov", meta: "Day 12 of 30 · expires in 18 days", metaIcon: "clock-hour-3", amount: 6300, status: "pending", to: "/purchases/exp_njeri" }],
    payments: [{ icon: "device-mobile-message", title: "M-Pesa to 0722 410 233", sub: "Payment · Thu 5 Nov 2026", amount: 6300, status: "validated" },
      { icon: "brand-whatsapp", title: "Message from Mama Njeri", sub: "WhatsApp · Thu 5 Nov 2026", amount: 6300, status: "validated" }],
    history: [{ icon: "bell", title: "Reminder sent", sub: "SMS with the *222# approval steps", date: "10 Nov" }, { icon: "send", title: "Payment matched", sub: "M-Pesa to 0722 410 233, KSh 6,300.00", date: "5 Nov" },
      { icon: "circle-check", title: "Invoice sent for approval", sub: "Groceries, KSh 6,300.00 · RFK-INV-0118", date: "5 Nov" }, { icon: "circle-x", title: "Supplier confirmed", sub: "Network confirmed by you: M-Pesa Pochi", date: "28 Oct" }] }),
  S({ _id: "sup_wanjiku", name: "Wanjiku Vegetables", short: "Wanjiku", pin: "P051340218H", phone: "0712 664 091", last: "2026-10-17", waiting: 4800, payVia: "M-Pesa Pochi", pronoun: "her", deadline: "d_wanjiku", purchase: "exp_wanjiku" }),
  S({ _id: "sup_otieno", name: "Otieno Plumbing", short: "Otieno", idNo: "23456789", phone: "0722 456 789", last: "2026-11-12", payVia: "M-Pesa Pochi", etims: false, confirmedOn: "12 Nov 2026", pronoun: "him",
    invoices: [{ icon: "file-text", title: "Pipe repair, Wed 12 Nov", sub: "M-Pesa Pochi payment · no invoice yet", meta: "Seller is not on eTIMS · send the setup guide", metaIcon: "info-circle", amount: 5000, status: "not-invoiced" }],
    payments: [{ icon: "device-mobile-message", title: "M-Pesa to 0722 456 789", sub: "Payment · Wed 12 Nov 2026", amount: 5000, status: "validated" }],
    history: [{ icon: "send", title: "Payment matched", sub: "M-Pesa to 0722 456 789, KSh 5,000.00", date: "12 Nov" }, { icon: "circle-check", title: "Supplier confirmed", sub: "Network confirmed by you: M-Pesa Pochi", date: "12 Nov" }] }),
  S({ _id: "sup_barasa", name: "Barasa Charcoal Supplies", short: "Barasa", idNo: "31254876", phone: "0745 221 690", last: "2026-11-03", payVia: "M-Pesa Pochi", etims: false, confirmedOn: "3 Nov 2026", pronoun: "him" }),
  S({ _id: "sup_kenya", name: "Kenya Power", pin: "P051119458X", phone: "Paybill 888880", paybill: true, last: "2026-11-10", payVia: "M-Pesa paybill", vat: true, confirmedOn: "10 Nov 2026", pronoun: "them", purchase: "exp_kenya",
    invoices: [{ icon: "file-text", title: "Electricity, Mon 10 Nov", sub: "Receipt KP-0094412 · emailed", meta: "Your PIN is missing · ask for a corrected receipt", metaIcon: "info-circle", amount: 21400, status: "needs-fixing", to: "/purchases/exp_kenya" }],
    payments: [{ icon: "device-mobile-message", title: "M-Pesa to Paybill 888880", sub: "Payment · Mon 10 Nov 2026", amount: 21400, status: "validated" }],
    history: [{ icon: "mail", title: "Receipt received", sub: "Email receipt KP-0094412, KSh 21,400.00", date: "10 Nov" }, { icon: "send", title: "Payment matched", sub: "M-Pesa to Paybill 888880, KSh 21,400.00", date: "10 Nov" }] }),
  S({ _id: "sup_naivas", name: "Naivas Supermarket", pin: "P051017633S", phone: "Till 522 410", last: "2026-11-11", payVia: "M-Pesa till", vat: true, confirmedOn: "11 Nov 2026", pronoun: "them", purchase: "exp_naivas" }),
  S({ _id: "sup_chebetd", name: "Chebet Dairy", short: "Chebet", pin: "P051703344D", phone: "0720 311 845", last: "2026-10-22", waiting: 4100, payVia: "M-Pesa Pochi", pronoun: "her", deadline: "d_chebet", purchase: "exp_chebetd" }),
  S({ _id: "sup_bidco", name: "Bidco Africa Ltd", pin: "P051234567Z", phone: "Paybill 400200", paybill: true, last: "2026-11-12", payVia: "M-Pesa paybill", vat: true, pronoun: "them", purchase: "exp_bidco" }),
  S({ _id: "sup_akinyi", name: "Akinyi Cereals", pin: "P051883012A", phone: "0721 774 302", last: "2026-11-14", payVia: "M-Pesa Pochi", pronoun: "her" }),
  S({ _id: "sup_atieno", name: "Atieno Dairy", pin: "P051883455D", phone: "0716 220 918", last: "2026-11-13", payVia: "M-Pesa Pochi", pronoun: "her" }),
  S({ _id: "sup_barasat", name: "Barasa Timber", pin: "P051776510T", phone: "0731 448 102", last: "2026-11-12", payVia: "Airtel Money", network: "Airtel Money", pronoun: "him" }),
  S({ _id: "sup_kiprop", name: "Kiprop Plumbing", pin: "P051664208K", phone: "0729 330 614", last: "2026-11-11", payVia: "M-Pesa Pochi", pronoun: "him" }),
  S({ _id: "sup_achieng", name: "Achieng Tailoring", pin: "P051552671A", phone: "0738 905 223", last: "2026-11-10", payVia: "Airtel Money", network: "Airtel Money", pronoun: "her" }),
  S({ _id: "sup_safaricom", name: "Safaricom PLC", pin: "P051100001S", phone: "Paybill 200200", paybill: true, last: "2026-11-01", payVia: "M-Pesa paybill", vat: true, pronoun: "them", purchase: "exp_safaricom" }),
  S({ _id: "sup_java", name: "Java House", pin: "P051300218K", phone: "Till 811 300", last: "2026-11-02", payVia: "M-Pesa till", vat: true, pronoun: "them", purchase: "exp_java" }),
  S({ _id: "sup_chebett", name: "Chebet Tailoring", short: "Chebet", idNo: "28807341", phone: "0724 610 552", last: "2026-11-04", payVia: "M-Pesa Pochi", etims: false, pronoun: "her", purchase: "exp_chebet" }),
  S({ _id: "sup_muriuki", name: "Muriuki Fuels", pin: "P051667032M", phone: "0710 225 883", last: "2026-09-14", payVia: "M-Pesa till", pronoun: "him" }),
  S({ _id: "sup_gathoni", name: "Gathoni Packaging", pin: "P051340776G", phone: "0715 803 447", last: "2026-09-08", payVia: "M-Pesa Pochi", pronoun: "her" }),
  S({ _id: "sup_hassan", name: "Hassan Spares", pin: "P051998120H", phone: "0723 117 659", last: "2026-09-02", payVia: "M-Pesa till", pronoun: "him" }),
  S({ _id: "sup_njoroge", name: "Njoroge Tailors", pin: "P051443098N", phone: "0727 664 310", last: "2026-09-20", payVia: "Airtel Money", network: "Airtel Money", pronoun: "him" }),
];

/* ───────── Tracker ─────────
   Waiting rows come from the shared "deadlines" collection (Home uses it too).
   This adds the invoice number and the seller's next step. */
export const TRACKER_META = {
  d_njeri: { no: "RFK-INV-0118", supplierId: "sup_njeri", purchase: "exp_njeri" },
  d_kamau: { no: "RFK-INV-0121", supplierId: "sup_kamau", purchase: "exp_kamau" },
  d_wanjiku: { no: "RFK-INV-0126", supplierId: "sup_wanjiku", purchase: "exp_wanjiku" },
  d_otieno: { no: "RFK-INV-0130", supplierId: "sup_otienofish", sentOnly: true },
  d_quickfix: { no: "RFK-INV-0131", supplierId: "sup_quickfix", purchase: "exp_quickfix" },
  d_chebet: { no: "RFK-INV-0115", supplierId: "sup_chebetd", purchase: "exp_chebetd" },
  d_mwangi: { no: "RFK-INV-0127", supplierId: "sup_mwangi" },
};
export const TRACKER_ORDER = ["d_njeri", "d_kamau", "d_wanjiku", "d_otieno", "d_quickfix", "d_chebet", "d_mwangi"];

// Finished buyer-initiated invoices (Approved, Rejected or expired tabs).
export const TRACKER_DONE = [
  { _id: "ti_muriuki", seller: "Muriuki Fuels", no: "RFK-INV-0109", sent: "2026-09-14", amount: 9300, status: "approved", supplierId: "sup_muriuki" },
  { _id: "ti_gathoni", seller: "Gathoni Packaging", no: "RFK-INV-0104", sent: "2026-09-08", amount: 14600, status: "approved", supplierId: "sup_gathoni" },
  { _id: "ti_hassan", seller: "Hassan Spares", no: "RFK-INV-0102", sent: "2026-09-02", amount: 6000, status: "approved", supplierId: "sup_hassan" },
  { _id: "ti_odhiambo", seller: "Odhiambo Timber", no: "RFK-INV-0098", sent: "2026-09-12", amount: 18000, status: "expired" },
  { _id: "ti_njoroge", seller: "Njoroge Tailors", no: "RFK-INV-0101", sent: "2026-09-20", amount: 5500, status: "rejected", supplierId: "sup_njoroge" },
];

/* ───────── Weekly batch (week of 9 Nov) ───────── */
export const BATCH = [
  { _id: "bt_akinyi", supplierId: "sup_akinyi", seller: "Akinyi Cereals", count: 3, latest: "2026-11-14", amount: 6300, network: "M-Pesa" },
  { _id: "bt_atieno", supplierId: "sup_atieno", seller: "Atieno Dairy", count: 4, latest: "2026-11-13", amount: 4800, network: "M-Pesa" },
  { _id: "bt_barasa", supplierId: "sup_barasat", seller: "Barasa Timber", count: 2, latest: "2026-11-12", amount: 3200, network: "Airtel Money" },
  { _id: "bt_kiprop", supplierId: "sup_kiprop", seller: "Kiprop Plumbing", count: 1, latest: "2026-11-11", amount: 2600, network: "M-Pesa" },
  { _id: "bt_achieng", supplierId: "sup_achieng", seller: "Achieng Tailoring", count: 1, latest: "2026-11-10", amount: 1500, network: "Airtel Money" },
];
