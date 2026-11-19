import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/home.css";
import "./styles/purchases.css";
import "./styles/invoices.css";
import "./styles/evidence.css";
import "./styles/settings.css";
import "./styles/help.css";
import "./styles/landing.css";
import "./styles/themes.css";
import "./styles/mobile.css";
import { useRoute, navigate, query } from "./router.js";
import { db, session } from "./db.js";
import { ToastStack, useDb } from "./components/ui.jsx";
import { DemoPanel } from "./components/DemoPanel.jsx";
import { EmailStep, PhoneStep, ProviderStep, VerifyStep } from "./pages/auth.jsx";
import { BusinessStep, DataStep, FindingStep, PinCardStep, ReadingStep } from "./pages/onboarding.jsx";
import { HelpPage } from "./pages/help.jsx";
import { LandingPage } from "./pages/landing.jsx";
import { AppShell, FocusShell, ModulePlaceholder, NAV } from "./pages/shell.jsx";
import { DeadlinesPage, HomePage } from "./pages/home.jsx";
import { BatchPage, PurchaseDetail, PurchasesList, TrackerPage } from "./pages/purchases.jsx";
import { BuilderPage, ChooseSource, ConfirmSend, CreditNote, InvoiceLanding, Module4Overlays, SentPage } from "./pages/invoices.jsx";
import { EvidenceDetail, EvidenceIndex } from "./pages/evidence.jsx";
import { ProfilePage, SettingsPage, applyTheme } from "./pages/settings.jsx";
import { SearchHost, SearchPage } from "./pages/search.jsx";
import { AddSupplierPage, ConfirmSupplierPage, GuidePage, RemindPage, SupplierProfile, SuppliersList } from "./pages/suppliers.jsx";

function Redirect({ to }) {
  useEffect(() => { navigate(to, { replace: true }); }, [to]);
  return null;
}

function Screen({ path }) {
  const user = session.user();

  // Auth (signed-out) routes
  const auth = path.match(/^\/(signup|login)(?:\/(email|verify|google|microsoft))?$/);
  if (auth) {
    const [, mode, sub] = auth;
    if (!sub) return <PhoneStep key={mode} mode={mode} />;
    if (sub === "email") return <EmailStep key={mode} mode={mode} />;
    if (sub === "verify") return <VerifyStep key={mode} mode={mode} />;
    return <ProviderStep key={mode + sub} mode={mode} provider={sub} />;
  }

  // Public landing page
  if (path === "/" || path === "" || path === "/welcome") return <LandingPage />;

  if (!user) return <Redirect to="/" />;

  // Onboarding
  const onb = { "/onboarding/business": BusinessStep, "/onboarding/data": DataStep, "/onboarding/reading": ReadingStep,
    "/onboarding/finding": FindingStep, "/onboarding/pin-card": PinCardStep }[path];
  if (onb) return React.createElement(onb);

  // Signed-in app
  const home = path.match(/^\/home(?:\/item\/([\w-]+))?$/);
  if (home) return <AppShell active="/home"><HomePage itemId={home[1]} /></AppShell>;
  if (path === "/home/deadlines") return <AppShell active="/home"><DeadlinesPage /></AppShell>;
  // Module 3: Purchases
  const P = (el) => <AppShell active="/purchases">{el}</AppShell>;
  if (path === "/purchases") return P(<PurchasesList />);
  if (path === "/purchases/tracker") return P(<TrackerPage key={window.location.hash} />);
  if (path === "/purchases/batch") return P(<BatchPage />);
  const exp = path.match(/^\/purchases\/([\w-]+)$/);
  if (exp) return P(<PurchaseDetail key={exp[1]} id={exp[1]} />);
  // Module 3: Suppliers
  const S = (el) => <AppShell active="/suppliers">{el}</AppShell>;
  if (path === "/suppliers") return S(<SuppliersList />);
  if (path === "/suppliers/new") return S(<AddSupplierPage />);
  if (path === "/suppliers/confirm") return S(<ConfirmSupplierPage />);
  const sup = path.match(/^\/suppliers\/([\w-]+)(?:\/(remind|guide))?$/);
  if (sup && !sup[2]) return S(<SupplierProfile key={window.location.hash} id={sup[1]} />);
  if (sup?.[2] === "remind") return S(<RemindPage key={window.location.hash} id={sup[1]} />);
  if (sup?.[2] === "guide") return S(<GuidePage id={sup[1]} />);
  // Help: focus mode, opened from the header Help link
  const hlp = path.match(/^\/help(?:\/([\w-]+))?$/);
  if (hlp) return <FocusShell><HelpPage id={hlp[1]} /></FocusShell>;
  // Module 6: Profile (no sidebar item) and Settings
  if (path === "/profile") return <AppShell active={null}><ProfilePage key={window.location.hash} /></AppShell>;
  if (path === "/settings") return <AppShell active="/settings"><SettingsPage key={window.location.hash} /></AppShell>;
  // Module 5: Evidence (full view is a focus mode) and Search
  if (path === "/evidence") return <AppShell active="/evidence"><EvidenceIndex /></AppShell>;
  const evd = path.match(/^\/evidence\/([\w-]+)(\/full)?$/);
  if (evd && evd[2]) return <FocusShell><EvidenceDetail key={window.location.hash} id={evd[1]} full /></FocusShell>;
  if (evd) return <AppShell active="/evidence"><EvidenceDetail key={window.location.hash} id={evd[1]} /></AppShell>;
  if (path === "/search") return <AppShell active={null}><SearchPage key={query().get("q") === null ? "x" : "s"} /></AppShell>;
  // Module 4: Invoice Builder (the builder itself is a focus mode: header, no sidebar)
  const I = (el) => <AppShell active="/invoices">{el}</AppShell>;
  if (path === "/invoices") return I(<InvoiceLanding />);
  if (path === "/invoices/new") return I(<ChooseSource key={window.location.hash} />);
  if (path === "/invoices/build") return <FocusShell><BuilderPage /></FocusShell>;
  if (path === "/invoices/confirm") return I(<ConfirmSend />);
  if (path === "/invoices/credit") return I(<CreditNote key={window.location.hash} />);
  const inv = path.match(/^\/invoices\/sent\/([\w-]+)$/);
  if (inv) return I(<SentPage id={inv[1]} />);

  const nav = NAV.find((n) => path === n.path || path.startsWith(n.path + "/"));
  if (nav) return <AppShell active={nav.path}><ModulePlaceholder path={nav.path} /></AppShell>;

  return <Redirect to={user.onboarded ? "/home" : "/onboarding/business"} />;
}

function App() {
  useDb(); // re-render on any data change
  applyTheme(); // Appearance: light, dark, Rafiki Dark Teal or follow the device
  useEffect(() => { const mq = window.matchMedia("(prefers-color-scheme: dark)"); const on = () => applyTheme(); mq.addEventListener?.("change", on); return () => mq.removeEventListener?.("change", on); }, []);
  const path = useRoute();
  useEffect(() => { window.scrollTo(0, 0); document.getElementById("content")?.scrollTo(0, 0); }, [path]);
  return (
    <>
      <Screen path={path} />
      <ToastStack />
      {session.user() && <Module4Overlays />}
      {session.user() && <SearchHost />}
      <DemoPanel />
    </>
  );
}

// PWA: offline shell. Needs HTTPS (or localhost); skipped quietly otherwise.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

// Platform hook: lets CSS adjust the few pieces that should feel native on iPhone or Android.
(() => {
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  document.documentElement.dataset.platform = ios ? "ios" : /Android/.test(ua) ? "android" : "other";
})();

window.rafikiDB = db; // handy for poking at the data from the browser console
createRoot(document.getElementById("root")).render(<App />);
