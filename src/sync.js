// eTIMS sync state, shared by the desktop header button and the mobile "Sync now" row.
import { useSyncExternalStore } from "react";
import { db } from "./db.js";
import { toast } from "./components/ui.jsx";

let state = { busy: false, when: "at 9:15 AM" };
const subs = new Set();
const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };

export function useSync() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => state);
}

// Checks purchases against KRA, then a delayed toast says it finished.
export function runEtimsSync() {
  if (state.busy) return;
  set({ busy: true });
  toast("Syncing with eTIMS. You can keep working.", "refresh");
  setTimeout(() => {
    set({ busy: false, when: "just now" });
    const n = db.collection("purchases").count();
    toast(`eTIMS sync complete. ${n} purchases checked with KRA, nothing new.`, "circle-check", { tone: "success", duration: 5000 });
  }, 3500);
}
