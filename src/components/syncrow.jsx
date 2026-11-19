import React from "react";
import { Icon } from "./ui.jsx";
import { runEtimsSync, useSync } from "../sync.js";

/* Mobile only: "Synced with eTIMS at 9:15 AM · Sync now" (the desktop header button is hidden on phones). */
export function MobileSyncRow() {
  const { busy, when } = useSync();
  return (
    <div className="sync-row">
      <Icon name="refresh" size={20} className={busy ? "spin" : ""} />
      <span className="t-body2 c-secondary sync-row__text" aria-live="polite">{busy ? "Syncing with eTIMS" : `Synced with eTIMS ${when}`}</span>
      <button type="button" className="sync-row__btn t-semi2" disabled={busy} onClick={runEtimsSync}>Sync now</button>
    </div>
  );
}
