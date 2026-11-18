// Module 4: Invoice Builder + Pay sheet sample data.
// Story (must agree everywhere): seller Mama Wanjiku, PIN P051234567A, invoice 14/11/2026 (Sat).
// Sukuma wiki 10 bunches × 50, Nyanya 10 kg × 120, Vitunguu 5 kg × 160 = KSh 2,500.00, no VAT.
// Sent 14 Nov, ends 14 Dec, reference BII-2026-0417.

export const SELLER = { name: "Mama Wanjiku", pin: "P051234567A", phone: "0712 345 678" };

export const LINE = {
  sukuma: { id: "sukuma", name: "Sukuma wiki", qty: 10, unit: "bunches", price: 50 },
  nyanya: { id: "nyanya", name: "Nyanya", qty: 10, unit: "kg", price: 120 },
  vitunguu: { id: "vitunguu", name: "Vitunguu", qty: 5, unit: "kg", price: 160 },
};

// The five ways in (Choose a source). Copy from LC / Invoice Builder / Choose Source, Direction=Buyer-initiated.
export const SOURCES = [
  { id: "momo", icon: "device-mobile", title: "Mobile money line", body: "M-Pesa or Airtel Money. Pick a payment from your statement." },
  { id: "photo", icon: "camera", title: "Photo of a receipt or note", body: "Snap or upload. Rafiki reads the items and the seller." },
  { id: "voice", icon: "microphone", title: "Voice or text note", body: "Say or type what you bought, in Swahili or English." },
  { id: "chat", icon: "brand-whatsapp", title: "Shared or forwarded chat", body: "A WhatsApp message you shared, or one you forwarded to Rafiki." },
  { id: "repeat", icon: "repeat", title: "Repeat last invoice", body: "Start from the last invoice you sent to the same seller." },
];

// What the Source panel shows for each source (LC / Invoice Builder / Source Panel, Type variants).
export const SOURCE_PANEL = {
  chat: { icon: "message-circle", title: "WhatsApp message", meta: "Forwarded Sat 14 Nov, 10:41 AM", label: "WhatsApp message", short: "WhatsApp message" },
  momo: { icon: "device-mobile-message", title: "M-Pesa statement line", meta: "Exported Sat 14 Nov, 9:30 AM", label: "M-Pesa line", short: "M-Pesa line",
    text: "UC4PQ7K2LM Confirmed. KSh2,500.00 sent to MAMA WANJIKU 0712 345 678 on 14/11/26 at 9:14 AM. M-PESA balance is KSh8,420.00. Transaction cost, KSh0.00." },
  photo: { icon: "camera", title: "Receipt photo", meta: "Shared Sat 14 Nov, 10:20 AM", label: "Receipt photo", short: "Receipt photo",
    text: "Vegetables, Mama Wanjiku, Kitengela market" },
  voice: { icon: "microphone", title: "Voice note", meta: "Shared Sat 14 Nov, 8:30 AM", label: "Voice note", short: "Voice note",
    text: "Nimenunua sukuma, nyanya na vitunguu kwa Mama Wanjiku, elfu mbili mia tano." },
  repeat: { icon: "repeat", title: "Last invoice", meta: "Sent Sat 14 Nov to Mama Wanjiku", label: "Last invoice", short: "Last invoice",
    text: "BII-2026-0417 · Sukuma wiki, Nyanya, Vitunguu · KSh 2,500.00" },
};

// Saved drafts and templates (Landing: Saved drafts)
export const TEMPLATES = [
  { _id: "t_weekly", order: 1, title: "Mboga ya wiki, Mama Wanjiku", detail: "Weekly · 3 lines · KSh 2,500", kind: "template",
    seller: "Mama Wanjiku", pin: "P051234567A", lines: ["sukuma", "nyanya", "vitunguu"] },
  { _id: "t_fuel", order: 2, title: "Mafuta kila Ijumaa", detail: "Every Friday · 1 line · KSh 4,200", kind: "template",
    seller: "Baraka Fuel Point", pin: "", custom: [{ id: "diesel", name: "Diesel for the generator", qty: 20, unit: "litres", price: 210 }] },
  { _id: "t_fundi", order: 3, title: "Fundi wa maji, plumbing", detail: "Once · 2 lines · KSh 5,000", kind: "template",
    seller: "Otieno Plumbing", pin: "", custom: [{ id: "labour", name: "Fixing the kitchen sink", qty: 1, unit: "job", price: 3500 }, { id: "parts", name: "Pipes and fittings", qty: 1, unit: "lot", price: 1500 }] },
];

// The rejected invoice that arrives while building (Flow 7)
export const ATIENO = {
  name: "Mama Atieno", amount: 3000, sub: "Fish · sent 11 Nov 2026 · buyer-initiated", pin: "P051987654C",
  reason: "Quantity is wrong", sent: "11 Nov 2026", next: "Fix and resend",
  note: "I have corrected the quantity to 2 kg. Please approve again.",
};

// The payment that failed (Payment failed notification and Pay sheet)
export const PAYMENT = { to: "Mama Wanjiku", network: "M-Pesa", from: "Business account", invoice: "Draft, 3 lines", charge: "None known", amount: 2500, ref: "UKB7X2P9TD" };
export const APP_PIN = "1234";
