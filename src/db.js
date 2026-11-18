// RafikiDB: a tiny NoSQL document store that lives in the browser.
// Collections of JSON documents with a MongoDB-style API
// (find, findOne, insert, update, remove). Saved to localStorage so the
// prototype keeps its data between visits on the same browser.
import { seed } from "./seed.js";

const KEY = "rafiki-tax-db-v1";
const listeners = new Set();
let state = load();
let rev = 0;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      // Add any collections or settings that newer builds introduced
      const saved = JSON.parse(raw);
      for (const [k, v] of Object.entries(seed.collections)) if (!saved.collections[k]) saved.collections[k] = structuredClone(v);
      for (const [k, v] of Object.entries(seed.kv)) if (!(k in saved.kv)) saved.kv[k] = structuredClone(v);
      // Seed documents added after this browser first saved (e.g. Quick Fix Garage's 30-day clock)
      const added = saved.kv._added || [];
      for (const [col, ids] of Object.entries({ deadlines: ["d_quickfix"] })) for (const id of ids) {
        if (added.includes(id)) continue;
        if (!saved.collections[col].some((d) => d._id === id)) saved.collections[col].push(structuredClone(seed.collections[col].find((d) => d._id === id)));
        added.push(id);
      }
      // 18 Nov: Mama Wanjiku and Mama Atieno are saved suppliers; the new payee is 0723 118 940 at KSh 2,500
      for (const id of ["sup_mamawanjiku", "sup_mamaatieno"]) if (!added.includes(id)) {
        const cur = saved.collections.suppliers?.find((d) => d._id === id), fresh = seed.collections.suppliers.find((d) => d._id === id);
        if (saved.collections.suppliers && !cur) saved.collections.suppliers.push(structuredClone(fresh));
        else if (cur) Object.assign(cur, { phone: fresh.phone, pin: fresh.pin, etims: false, payments: cur.payments || fresh.payments, history: cur.history || fresh.history });
        added.push(id);
      }
      // 18 Nov: owner phone is 0722 604 118 (Figma Profile); staff and address seeded
      if (!added.includes("m6_owner")) {
        const u = saved.collections.users?.find((d) => d._id === "u_wanjiku"); if (u && u.phone === "712345678") u.phone = "722604118";
        const b = saved.collections.businesses?.find((d) => d._id === "b_fresh"); if (b && !b.address) Object.assign(b, { address: "Kitengela, Kajiado County", till: "123456" });
        if (saved.collections.staff && !saved.collections.staff.length) saved.collections.staff = structuredClone(seed.collections.staff);
        added.push("m6_owner");
      }
      const qs = saved.collections.queue?.find((d) => d._id === "q_supplier");
      if (qs) Object.assign(qs, { sub: "0723 118 940 · paid every Saturday", amount: 2500 });
      const qf = saved.collections.purchases?.find((d) => d._id === "exp_quickfix");
      if (qf && !qf.deadline) qf.deadline = "d_quickfix";
      const sq = saved.collections.suppliers?.find((d) => d._id === "sup_quickfix");
      if (sq && !sq.deadline) sq.deadline = "d_quickfix";
      saved.kv._added = added;
      return saved;
    }
  } catch (e) { /* storage blocked: fall back to memory */ }
  return structuredClone(seed);
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* memory only */ }
  rev++;
  listeners.forEach((fn) => fn());
}
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const matches = (doc, query = {}) =>
  Object.entries(query).every(([k, v]) => (typeof v === "function" ? v(doc[k]) : doc[k] === v));

function collection(name) {
  if (!state.collections[name]) state.collections[name] = [];
  const docs = () => state.collections[name];
  return {
    find: (q) => docs().filter((d) => matches(d, q)),
    findOne: (q) => docs().find((d) => matches(d, q)) || null,
    get: (id) => docs().find((d) => d._id === id) || null,
    insert(doc) {
      const now = new Date().toISOString();
      const d = { _id: uid(), createdAt: now, updatedAt: now, ...doc };
      docs().push(d); persist(); return d;
    },
    update(id, patch) {
      const d = docs().find((x) => x._id === id); if (!d) return null;
      Object.assign(d, patch, { updatedAt: new Date().toISOString() }); persist(); return d;
    },
    remove(id) { state.collections[name] = docs().filter((d) => d._id !== id); persist(); },
    count: (q) => docs().filter((d) => matches(d, q)).length,
  };
}

export const db = {
  collection,
  users: collection("users"),
  businesses: collection("businesses"),
  uploads: collection("uploads"),
  staff: collection("staff"),
  // Key/value bits: session, onboarding progress, demo switches
  get: (k) => state.kv[k],
  set(k, v) { state.kv[k] = v; persist(); },
  reset() { state = structuredClone(seed); persist(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  version: () => rev,
};

// Session helpers
export const session = {
  user: () => (db.get("session")?.userId ? db.users.get(db.get("session").userId) : null),
  signIn(userId) { db.set("session", { userId, at: new Date().toISOString() }); },
  signOut() { db.set("session", null); db.set("pending", null); },
};
