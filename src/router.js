import { useEffect, useState } from "react";

// Hash routing (#/path) so the app works from a file and on GitHub Pages.
const current = () => (window.location.hash.replace(/^#/, "") || "/").split("?")[0];

export function navigate(path, { replace = false } = {}) {
  const url = "#" + path;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useRoute() {
  // Track the whole hash (query included) so a new ?tab= or ?q= re-renders the page
  const [hash, setHash] = useState(window.location.hash);
  const path = (hash.replace(/^#/, "") || "/").split("?")[0];
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    window.addEventListener("popstate", on);
    on(); // catch a redirect that fired before we subscribed
    return () => { window.removeEventListener("hashchange", on); window.removeEventListener("popstate", on); };
  }, []);
  return path;
}

// Query string after the hash path, e.g. #/purchases/tracker?tab=expiring
export const query = () => new URLSearchParams((window.location.hash.split("?")[1]) || "");
