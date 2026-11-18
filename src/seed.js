import { PURCHASES, SUPPLIERS, TRACKER_DONE } from "./data/module3.js";
import { TEMPLATES } from "./data/module4.js";

// Fake data. Nothing here is real: names, PINs and numbers are invented.
export const DEMO = {
  otp: "123456",            // SMS and email code that always works
  phone: "722604118",       // existing owner (for Sign in)
  email: "wanjiku@freshgreens.co.ke",
  pin: "P051234567Z",       // KRA PIN on the fake register
  notFoundPin: "P000000000X",
};

// The prototype's "today". All Home dates are relative to this.
export const TODAY = "2026-11-17";

// Home review queue: decisions that need the owner, most urgent first.
const QUEUE = [
  { _id: "q_total", order: 1, kind: "at-risk", icon: "gas-station", title: "Total Energies Kenya", sub: "TE-55102 · 08 Nov 2026",
    why: "No eTIMS invoice found. Ask the seller for one before 30 Nov.", amount: 18900, badge: "at-risk", status: "open" },
  { _id: "q_kenya", order: 2, kind: "needs-fixing", icon: "bolt", title: "Kenya Power", sub: "KP-0094412 · 10 Nov 2026",
    why: "Seller PIN does not match the invoice. Fix it before you claim.", amount: 21400, badge: "needs-fixing", status: "open" },
  { _id: "q_remind", order: 3, kind: "expiring", icon: "hourglass-high", title: "Remind 3 sellers", sub: "Kamau, Wanjiku, Chebet Dairy · 3 invoices",
    why: "Their invoices expire on 19, 20 and 21 Nov. A reminder is ready.", amount: 31350, badge: "expiring", badgeLabel: "Expires in 2 days", status: "open" },
  { _id: "q_batch", order: 4, kind: "batch", icon: "send", title: "Weekly batch is ready", sub: "Week of 9 Nov · 5 suppliers",
    why: "Rafiki prepared the invoices. Review them, then send.", amount: 18400, badge: "ready", badgeLabel: "Ready to send", status: "open" },
  { _id: "q_supplier", order: 5, kind: "supplier", icon: "user-question", title: "Confirm a supplier", sub: "0723 118 940 · paid every Saturday",
    why: "Tell Rafiki which network this number uses.", amount: 2500, badge: "confirm", badgeLabel: "Confirm", status: "open" },
];

// Buyer-initiated invoices with 30-day clocks (and one point deadline).
const DEADLINES = [
  { _id: "d_wanjiku", seller: "Wanjiku Vegetables", amount: 4800, sent: "2026-10-20", expires: "2026-11-19", tone: "warning", status: "waiting" },
  { _id: "d_kamau", seller: "Kamau Hardware", amount: 22450, sent: "2026-10-21", expires: "2026-11-20", tone: "warning", status: "waiting" },
  { _id: "d_chebet", seller: "Chebet Dairy", amount: 4100, sent: "2026-10-22", expires: "2026-11-21", tone: "warning", status: "waiting" },
  { _id: "d_total", seller: "Total Energies Kenya", amount: 18900, point: "2026-11-30", pointTitle: "Invoice needed", tone: "rejected", status: "at-risk" },
  { _id: "d_njeri", seller: "Mama Njeri Groceries", amount: 6300, sent: "2026-11-05", expires: "2026-12-05", tone: "pending", status: "waiting" },
  { _id: "d_mwangi", seller: "Mwangi Electricals", amount: 9300, sent: "2026-11-09", expires: "2026-12-09", tone: "pending", status: "waiting" },
  { _id: "d_otieno", seller: "Otieno Fish Supplies", amount: 12100, sent: "2026-11-14", expires: "2026-12-14", tone: "pending", status: "waiting" },
  { _id: "d_quickfix", seller: "Quick Fix Garage", amount: 14000, sent: "2026-11-14", expires: "2026-12-14", tone: "pending", status: "waiting" },
];

const NOTIFICATIONS = [
  { _id: "n_expiring", group: "today", order: 1, icon: "hourglass-high", title: "Invoice expires in 3 days", detail: "Vegetables, Mama Wanjiku · Day 27 of 30", time: "Today, 9:00", action: "Remind", to: "/home/item/q_remind", read: false },
  { _id: "n_bidco", group: "today", order: 2, icon: "circle-check", title: "Bidco Africa Ltd invoice received", detail: "KSh 48,200 now covered · matches your M-Pesa payment", time: "2 min ago", action: "View", to: "/purchases/exp_bidco", read: false },
  { _id: "n_finding", group: "today", order: 3, icon: "sparkles", title: "4 receipts are missing your PIN", detail: "KSh 38,000 at risk · Total Energies, Rubis", time: "Yesterday", action: "Review", to: "/home/item/q_total", read: false },
  { _id: "n_batch", group: "earlier", order: 4, icon: "send", title: "Friday batch is ready", detail: "5 invoices, KSh 18,400 · review and send", time: "Fri, 8:00", action: "Review", to: "/home/item/q_batch", read: true },
  { _id: "n_rejected", group: "earlier", order: 5, icon: "circle-x", title: "Mama Atieno rejected an invoice", detail: "Fish, KSh 3,000 · “Quantity is wrong”", time: "1 h ago", action: "Fix", to: null, read: true },
  { _id: "n_sync", group: "earlier", order: 6, icon: "refresh", title: "M-Pesa statement read", detail: "86 payments, 12 matched to suppliers", time: "Mon", action: null, to: null, read: true },
];

const EXPENSES = [
  { _id: "exp_bidco", seller: "Bidco Africa Ltd", ref: "Invoice KRA-INV-2041", status: "covered", amount: 48200, vat: 6648.28,
    note: "Matched to an eTIMS invoice and an M-Pesa payment.", pin: "P051234567Z", source: "Receipt photo", date: "12 Nov 2026", payment: "M-Pesa",
    records: [
      { icon: "receipt", title: "Receipt, Bidco Africa Ltd", sub: "Photo · 12 Nov 2026", status: "validated" },
      { icon: "device-mobile-message", title: "M-Pesa to Bidco Africa Ltd", sub: "Till payment · 12 Nov 2026", status: "validated" },
      { icon: "wallet", title: "eTIMS invoice from Bidco Africa Ltd", sub: "Received · 12 Nov 2026", status: "covered" },
    ],
    match: { title: "Seller matched to Bidco Africa Ltd", body: "Matched from the receipt PIN and 4 past purchases.", label: "Seller", value: "Bidco Africa Ltd", applied: true } },
];

// Fake KRA PIN register used by "Look up my business"
export const KRA_REGISTER = {
  P051234567Z: { name: "Wanjiku Fresh Greens Ltd", vat: false, etims: true },
  A123456789B: { name: "Baraka Hardware & Supplies", vat: true, etims: true },
  P052468013K: { name: "Otieno Kamau Enterprises", vat: false, etims: false },
};

export const seed = {
  collections: {
    users: [
      {
        _id: "u_wanjiku", name: "Wanjiku Achieng", initials: "WA",
        phone: "722604118", email: "wanjiku@freshgreens.co.ke",
        businessId: "b_fresh", onboarded: true, createdAt: "2026-08-02T09:00:00.000Z",
      },
    ],
    businesses: [
      {
        _id: "b_fresh", pin: "P051234567Z", name: "Wanjiku Fresh Greens Ltd",
        vat: false, etims: true, address: "Kitengela, Kajiado County", till: "123456", createdAt: "2026-08-02T09:05:00.000Z",
      },
    ],
    uploads: [],
    staff: [
      { _id: "st_peter", name: "Peter Otieno", initials: "PO", phone: "0711 203 448", card: true },
      { _id: "st_grace", name: "Grace Wanjiru", initials: "GW", phone: "0729 551 076", card: false },
    ],
    queue: QUEUE,
    deadlines: DEADLINES,
    notifications: NOTIFICATIONS,
    expenses: EXPENSES,
    purchases: PURCHASES,
    suppliers: SUPPLIERS,
    trackerDone: TRACKER_DONE,
    invoiceTemplates: TEMPLATES,
    invoices: [],
  },
  kv: {
    session: null,
    pending: null,
    demo: { finding: "at-risk", provider: "success" },
    home: { scenario: "live" },
    m3: { scenario: "live" },
    batch: { status: "ready", selected: null },
    m5: { scenario: "live" },
    m6: { language: "English", theme: "system", fingerprint: true, notify: { countdown: true, payment: true, sms: false, digest: true },
      google: false, microsoft: false, sources: { mpesa: true, airtel: false, bank: false }, dailyLimit: 50000, appPin: "1234", synced: "2 minutes ago" },
    m4: { draft: null, failSend: false, payFail: false, payPermission: true, toastShown: false, nextRef: 417 },
  },
};
