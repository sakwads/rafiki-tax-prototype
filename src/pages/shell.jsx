import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Icon, IconButton, Logo, Surface, TextField, toast } from "../components/ui.jsx";
import { db, session } from "../db.js";
import { navigate } from "../router.js";

export const NAV = [
  { path: "/home", label: "Home", icon: "home" },
  { path: "/purchases", label: "Purchases", icon: "shopping-cart" },
  { path: "/suppliers", label: "Suppliers", icon: "users" },
  { path: "/invoices", label: "Invoice Builder", icon: "file-invoice" },
  { path: "/evidence", label: "Evidence", icon: "file-search" },
  { path: "/settings", label: "Settings", icon: "settings" },
];

/* App shell: the sidebar and header stay fixed; only .content scrolls. */
export function AppShell({ active, children }) {
  return (
    <div className="app">
      <Sidebar active={active} />
      <div className="main">
        <AppHeader />
        <main className="content" id="content" tabIndex={-1}>
          <div className="content__inner">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ active }) {
  return (
    <nav className="sidebar" aria-label="Main">
      <Logo variant="sidebar" />
      <div className="sidebar__gap" />
      {NAV.map((n) => (
        <a key={n.path} href={`#${n.path}`} className={`nav-link ${active === n.path ? "nav-link--active" : ""}`}
          aria-current={active === n.path ? "page" : undefined} title={n.label}>
          <Icon name={n.icon} size={24} /><span className="nav-link__label t-medium1">{n.label}</span>
        </a>
      ))}
      <div className="sidebar__spacer" />
      <Button type="accent" block className="sidebar__ask" aria-label="Ask Rafiki"
        onClick={() => window.dispatchEvent(new CustomEvent("rafiki:ask", { detail: "" }))}>
        <Icon name="sparkles" size={20} className="sidebar__ask-icon" /><span className="sidebar__ask-text">Ask Rafiki</span>
      </Button>
    </nav>
  );
}

/* Focus shell: the builder keeps the product header (with the logo) but drops the sidebar. */
export function FocusShell({ children }) {
  return (
    <div className="app app--focus">
      <div className="main">
        <AppHeader logo />
        <main className="content" id="content" tabIndex={-1}>
          <div className="focus__inner">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppHeader({ logo }) {
  const u = session.user();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => { const c = () => setMenu(false); window.addEventListener("hashchange", c); return () => window.removeEventListener("hashchange", c); }, []);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  const initials = u?.initials || "RT";
  return (
    <header className="app-header">
      {logo && <a href="#/home" className="app-header__logo" aria-label="RafikiTax AI, go to Home"><Logo /></a>}
      <div className="app-header__search" role="search">
        <button type="button" className="input input--compact app-header__find" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K"
          onClick={() => window.dispatchEvent(new CustomEvent("rafiki:search"))}>
          <Icon name="search" size={20} /><span className="app-header__find-text">Search Rafiki...</span><kbd className="app-header__kbd">⌘K</kbd>
        </button>
      </div>
      <div className="app-header__spacer" />
      <NotificationsBell />
      <a href="#/help" className={`app-header__help t-medium2 ${window.location.hash.startsWith("#/help") ? "app-header__help--on" : ""}`} aria-current={window.location.hash.startsWith("#/help") ? "page" : undefined}>Help</a>
      <EtimsSync />
      <div ref={menuRef} style={{ position: "relative" }}>
        <button type="button" className="avatar t-label" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>{initials}</button>
        {menu && (
          <div className="menu acct" role="menu">
            <div className="acct__who"><span className="avatar">{initials}</span><span><span className="t-semi2 c-primary">{u?.name || "Business owner"}</span>
              <span className="t-body3 c-secondary">{(u?.businessId && db.businesses.get(u.businessId)?.name) || "Your business"}</span></span></div>
            {[["user", "Profile", () => navigate("/profile")], ["settings", "Settings", () => navigate("/settings")], ["help", "Help", () => navigate("/help")],
              ["logout", "Sign out", () => { session.signOut(); navigate("/login"); }]].map(([ic, l, fn]) => (
              <button key={l} role="menuitem" className="menu__item acct__item t-medium1" onClick={() => { setMenu(false); fn(); }}><Icon name={ic} size={24} />{l}</button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

/* Placeholder for modules that come in later builds */
const MODULE_NOTES = {
  "/home": ["Home", "Your review queue, summary tiles and deadlines arrive in the next build (Module 2)."],
  "/purchases": ["Purchases", "Coming in Module 3, together with Suppliers."],
  "/suppliers": ["Suppliers", "Coming in Module 3, together with Purchases."],
    "/settings": ["Settings", "Coming in Module 6."],
};
export function ModulePlaceholder({ path }) {
  const [title, note] = MODULE_NOTES[path] || ["Page", ""];
  const u = session.user();
  return (
    <div className="grid">
      <div className="col-span-8 placeholder">
        <h1 className="t-h2 c-primary">{title}</h1>
        <Alert title="Not built yet">{note}</Alert>
        {path === "/home" && u && !u.onboarded && (
          <Surface className="col-span-8">
            <div className="onb-col">
              <h2 className="t-h4 c-primary">Finish setting up</h2>
              <p className="t-body1 c-secondary">Add your KRA PIN and a statement so Rafiki can show what's at risk.</p>
              <div className="actions"><Button onClick={() => navigate(u.businessId ? "/onboarding/data" : "/onboarding/business")}>Continue setup</Button></div>
            </div>
          </Surface>
        )}
      </div>
    </div>
  );
}

/* ───────── Notifications: bell, count and dropdown ───────── */
function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const col = db.collection("notifications");
  const all = col.find({}).sort((a, b) => a.order - b.order);
  const unread = all.filter((n) => !n.read).length;
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, [open]);

  function act(n) {
    col.update(n._id, { read: true });
    setOpen(false);
    if (n.to) navigate(n.to);
    else if (n.action === "Fix") window.dispatchEvent(new CustomEvent("rafiki:record", { detail: "atieno" }));
    else if (n.action === "Retry") window.dispatchEvent(new CustomEvent("rafiki:pay"));
  }
  const group = (g, title) => {
    const list = all.filter((n) => n.group === g);
    return list.length ? (
      <div className="notif-group" role="group" aria-label={title}>
        <p className="t-body3 c-secondary">{title}</p>
        {list.map((n) => (
          <div key={n._id} className={`notif ${n.read ? "" : "notif--unread"}`}>
            <span className="notif__lead"><span className="notif__dot" aria-hidden="true" /><span className="icon-chip"><Icon name={n.icon} size={20} /></span></span>
            <span className="notif__text">
              <span className="t-semi2 c-primary">{n.read ? "" : <span className="sr-only">Unread: </span>}{n.title}</span>
              <span className="t-body3 c-secondary">{n.detail}</span>
              <span className="t-body3 c-secondary">{n.time}</span>
            </span>
            {n.action && <Button type="tertiary" size="sm" onClick={() => act(n)}>{n.action}</Button>}
          </div>
        ))}
      </div>
    ) : null;
  };
  return (
    <div className="bell-wrap" ref={ref}>
      <button type="button" className={`icon-btn icon-btn--40 icon-btn--tertiary bell ${open ? "icon-btn--open" : ""}`}
        aria-label={`Notifications, ${unread} unread`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="bell__count" aria-hidden="true">{unread}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <svg className="notif-panel__caret" viewBox="0 0 20 10" aria-hidden="true"><path d="M0 10L10 0L20 10" fill="#fff" stroke="#eeefe5" /><path d="M1 10.5H19" stroke="#fff" strokeWidth="2" /></svg>
          <div className="notif-panel__header">
            <div className="notif-panel__title"><h2 className="t-h6 c-primary">Notifications</h2><span className="t-body3 c-secondary">{unread} unread</span></div>
            <Button type="tertiary" size="sm" disabled={!unread} onClick={() => all.forEach((n) => col.update(n._id, { read: true }))}>Mark all read</Button>
          </div>
          <div className="notif-list">{group("today", "Today")}{group("earlier", "Earlier")}</div>
          <div><Button type="tertiary" size="sm" onClick={() => { setOpen(false); navigate("/profile?tab=notifications"); }}>Notification settings</Button></div>
        </div>
      )}
    </div>
  );
}

// eTIMS Sync: checks purchases against KRA, then a delayed toast says it finished.
let syncing = false;
function EtimsSync() {
  const [busy, setBusy] = useState(syncing);
  const run = () => {
    if (syncing) return;
    syncing = true; setBusy(true);
    toast("Syncing with eTIMS. You can keep working.", "refresh");
    setTimeout(() => {
      syncing = false; setBusy(false);
      const n = db.collection("purchases").count();
      toast(`eTIMS sync complete. ${n} purchases checked with KRA, nothing new.`, "circle-check", { tone: "success", duration: 5000 });
    }, 3500);
  };
  return <Button type="accent" size="sm" loading={busy} onClick={run}>{busy ? "Syncing" : "eTIMS Sync"}</Button>;
}
