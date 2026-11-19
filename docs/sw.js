/* Rafiki Tax prototype service worker. build.mjs fills in VERSION and PRECACHE.
   Offline-first for the app shell; the data lives in localStorage so nothing else is needed. */
const VERSION = "d15068065a";
const PRECACHE = [
  "./",
  "./assets/app.css",
  "./assets/app.js",
  "./assets/fonts.css",
  "./assets/fonts/inter-latin-400-normal.woff2",
  "./assets/fonts/inter-latin-500-normal.woff2",
  "./assets/fonts/inter-latin-600-normal.woff2",
  "./assets/fonts/inter-latin-700-normal.woff2",
  "./assets/fonts/plus-jakarta-sans-latin-600-normal.woff2",
  "./assets/fonts/plus-jakarta-sans-latin-700-normal.woff2",
  "./assets/fonts/plus-jakarta-sans-latin-800-normal.woff2",
  "./assets/fonts/roboto-mono-latin-400-normal.woff2",
  "./assets/fonts/roboto-mono-latin-700-normal.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./index.html",
  "./manifest.webmanifest"
];
const CACHE = "rafiki-" + VERSION;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("rafiki-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Pages: network first so a new deploy shows up, cache when offline. Assets: cache first.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
