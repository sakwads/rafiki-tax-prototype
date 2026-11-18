import React, { useEffect, useState } from "react";
import {
  Button, ErrorText, Icon, Logo, OtpInput, PinCard, Spinner, Surface, TextField, TextLink,
  TrustChip, copyText, toast, wait, ProtoHint } from "../components/ui.jsx";
import { db, session } from "../db.js";
import { DEMO } from "../seed.js";
import { navigate } from "../router.js";

/* ───────── Auth page template ───────── */
const BRAND = {
  default: {
    title: "Every shilling you spend should count",
    body: "Rafiki reads the statements and receipts you already have, then shows which expenses KRA will accept. You review; nothing is sent without your tap.",
  },
  verify: {
    title: "No passwords to remember",
    body: "Sign in next time the same way: phone, Google, Microsoft or an emailed code. Rafiki sends a fresh code each time, so there is nothing to remember.",
  },
};

export function AuthTemplate({ brand = "default", hint, children }) {
  const b = BRAND[brand];
  return (
    <div className="auth">
      <main className="auth__form">
        <a href="#/" className="auth__home" aria-label="Rafiki Tax home page"><Logo /></a>
        <div className="auth__slot-row">
          <div className="auth__slot"><Surface>{children}</Surface>{hint && <ProtoHint>{hint}</ProtoHint>}</div>
        </div>
        <p className="t-body3 c-secondary">Rafiki Tax is a concept project, not affiliated with KRA.</p>
      </main>
      <aside className="auth__brand" aria-label="About Rafiki">
        <div className="auth__brand-copy">
          <h2 className="t-h2 auth__brand-title">{b.title}</h2>
          <p className="t-body1 auth__brand-body">{b.body}</p>
        </div>
        <div className="auth__snapshot">
          <PinCard name="Wanjiku Fresh Greens Ltd" pin={DEMO.pin}
            onCopy={() => { copyText(DEMO.pin); toast("PIN copied"); }} />
        </div>
        <div className="auth__chips">
          <TrustChip>No M-Pesa login. You upload a statement.</TrustChip>
          <TrustChip>Nothing goes to KRA without your tap.</TrustChip>
        </div>
      </aside>
    </div>
  );
}

function Heading({ title, children }) {
  return (
    <div className="auth-heading">
      <h1 className="t-h2 c-primary">{title}</h1>
      <div className="body-row">{children}</div>
    </div>
  );
}

function AlternateMethods({ alternate, mode }) {
  const base = mode === "login" ? "/login" : "/signup";
  return (
    <div className="auth-col" style={{ gap: 16 }}>
      <div className="or-row t-body3">or</div>
      <Button type="tertiary" icon="brand-google" block onClick={() => navigate(`${base}/google`)}>Continue with Google</Button>
      <Button type="tertiary" icon="brand-windows" block onClick={() => navigate(`${base}/microsoft`)}>Continue with Microsoft</Button>
      {alternate === "email"
        ? <Button type="tertiary" icon="mail" block onClick={() => navigate(`${base}/email`)}>Use email instead</Button>
        : <Button type="tertiary" icon="phone-call" block onClick={() => navigate(base)}>Use phone instead</Button>}
    </div>
  );
}

function AccountRow({ mode }) {
  return mode === "login" ? (
    <div className="account-row t-body3">
      <span>New to Rafiki?</span><TextLink size={3} onClick={() => navigate("/signup")}>Create an account</TextLink>
    </div>
  ) : (
    <div className="account-row t-body3">
      <span>Already have an account?</span><TextLink size={3} onClick={() => navigate("/login")}>Sign in</TextLink>
    </div>
  );
}

const Terms = () => <p className="t-body3 c-secondary">By continuing you agree to Rafiki's Terms and Privacy policy.</p>;

/* ───────── Phone step ───────── */
const formatPhone = (d) => d.replace(/\D/g, "").slice(0, 9).replace(/(\d{3})(?=\d)/g, "$1 ").trim();

export function PhoneStep({ mode }) {
  const pending = db.get("pending");
  const [digits, setDigits] = useState(pending?.channel === "sms" ? pending.phone : "");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!/^[17]\d{8}$/.test(digits)) { setError("Enter all 9 digits after +254, for example 712 345 678."); return; }
    setSending(true);
    await wait(900);
    db.set("pending", { mode, channel: "sms", phone: digits, sentAt: Date.now() });
    navigate(`/${mode}/verify`);
  }

  return (
    <AuthTemplate hint={mode === "login" ? "Any valid phone number or email signs you in to the demo business. Any 6-digit code works on the next screen." : "Any valid phone number or email works. Any 6-digit code works on the next screen."}>
      <form className="auth-col" onSubmit={(e) => { e.preventDefault(); send(); }} noValidate>
        <Heading title={mode === "login" ? "Welcome back" : "Start with your phone number"}>
          <p className="t-body1 c-secondary">{mode === "login"
            ? "Enter the number you signed up with and we'll text you a code."
            : "We'll text you a 6-digit code. Use the number you run the business on."}</p>
        </Heading>
        <TextField label="Phone number" prefix="+254" placeholder="712 345 678" inputMode="numeric" autoComplete="tel-national"
          value={formatPhone(digits)} readOnly={sending}
          onChange={(v) => { setDigits(v.replace(/\D/g, "").slice(0, 9)); setError(""); }}
          error={error} helper="Kenyan numbers only for now." />
        <Button htmlType="submit" block disabled={!digits} loading={sending}>Send code</Button>
        <AlternateMethods alternate="email" mode={mode} />
        {mode !== "login" && <Terms />}
        <AccountRow mode={mode} />
      </form>
    </AuthTemplate>
  );
}

/* ───────── Email step ───────── */
export function EmailStep({ mode }) {
  const pending = db.get("pending");
  const [email, setEmail] = useState(pending?.channel === "email" ? pending.email : "");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setError("Enter a full email address, like name@business.co.ke."); return; }
    setSending(true);
    await wait(900);
    db.set("pending", { mode, channel: "email", email: v, sentAt: Date.now() });
    navigate(`/${mode}/verify`);
  }

  return (
    <AuthTemplate hint={mode === "login" ? "Any valid phone number or email signs you in to the demo business. Any 6-digit code works on the next screen." : "Any valid phone number or email works. Any 6-digit code works on the next screen."}>
      <form className="auth-col" onSubmit={(e) => { e.preventDefault(); send(); }} noValidate>
        <Heading title={mode === "login" ? "Sign in with your email" : "Start with your email"}>
          <p className="t-body1 c-secondary">We'll email you a 6-digit code. There's no password to remember.</p>
        </Heading>
        <TextField label="Email address" placeholder="name@business.co.ke" type="email" autoComplete="email"
          value={email} readOnly={sending} onChange={(v) => { setEmail(v); setError(""); }}
          error={error} helper="We'll only use it to send your code." />
        <Button htmlType="submit" block disabled={!email} loading={sending}>Send code</Button>
        <AlternateMethods alternate="phone" mode={mode} />
        {mode !== "login" && <Terms />}
        <AccountRow mode={mode} />
      </form>
    </AuthTemplate>
  );
}

/* ───────── Verify code step ───────── */
const RESEND_SECONDS = 42;

export function VerifyStep({ mode }) {
  const pending = db.get("pending");
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  const [left, setLeft] = useState(RESEND_SECONDS);

  useEffect(() => { if (!pending) navigate(mode === "login" ? "/login" : "/signup", { replace: true }); }, []);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (!pending) return null;

  const isSms = pending.channel === "sms";
  const target = isSms ? `+254 ${formatPhone(pending.phone)}` : pending.email;

  function resend() {
    setLeft(RESEND_SECONDS); setWrong(false); setCode("");
    toast(isSms ? "New code sent by SMS" : "New code sent to your email");
  }

  async function verify() {
    if (code.length < 6) return;
    setChecking(true);
    await wait(700);
    // Demo: any 6-digit code works; 000000 shows the "didn't match" state
    if (code === "000000") { setChecking(false); setWrong(true); return; }
    finishSignIn({ phone: pending.phone, email: pending.email, mode });
  }

  return (
    <AuthTemplate brand="verify" hint="Type any 6 digits, e.g. 123456. Use 000000 to see the wrong-code message.">
      <form className="auth-col" onSubmit={(e) => { e.preventDefault(); verify(); }} noValidate>
        <Heading title="Enter the code we sent">
          <p className="t-body1 c-secondary">{isSms ? `Sent by SMS to ${target}.` : `Sent to ${target}.`}</p>
          <TextLink onClick={() => navigate(isSms ? `/${mode}` : `/${mode}/email`)}>{isSms ? "Change number" : "Change email"}</TextLink>
        </Heading>
        <div className="field" style={{ gap: 8 }}>
          <OtpInput value={code} error={wrong} onChange={(v) => { setCode(v); setWrong(false); }} />
          <div className="otp__msg">
            {wrong ? (
              <>
                <ErrorText>{isSms ? "That code didn't match. Check the SMS and try again." : "That code didn't match. Check your email and try again."}</ErrorText>
                <TextLink onClick={resend}>Resend code</TextLink>
              </>
            ) : left > 0 ? (
              <p className="t-body2 c-secondary" aria-live="off">Resend code in 0:{String(left).padStart(2, "0")}</p>
            ) : (
              <><p className="t-body2 c-secondary">{isSms ? "Didn't get the SMS?" : "Didn't get the email?"}</p><TextLink onClick={resend}>Resend code</TextLink></>
            )}
          </div>
        </div>
        <Button htmlType="submit" block disabled={code.length < 6} loading={checking}>Verify and continue</Button>
        <p className="t-body3 c-secondary">Codes expire after 10 minutes. Never share this code with anyone, including someone saying they're from Rafiki.</p>
      </form>
    </AuthTemplate>
  );
}

/* After a successful code or provider sign-in */
export function finishSignIn({ phone, email, provider, mode }) {
  let user = (phone && db.users.findOne({ phone })) || (email && db.users.findOne({ email })) || null;
  // Demo: signing in with any valid number or email opens the demo business (Wanjiku Fresh Greens)
  if (!user && mode === "login") user = db.users.findOne({ _id: "u_wanjiku" });
  if (!user) {
    user = db.users.insert({ name: "", initials: "", phone: phone || "", email: email || "", provider: provider || null, businessId: null, onboarded: false });
  }
  session.signIn(user._id);
  db.set("pending", null);
  if (user.onboarded) { toast(`Welcome back${user.name ? ", " + user.name.split(" ")[0] : ""}`); navigate("/home", { replace: true }); }
  else navigate("/onboarding/business", { replace: true });
}

/* ───────── Google / Microsoft ───────── */
export function ProviderStep({ mode, provider }) {
  const name = provider === "google" ? "Google" : "Microsoft";
  const [state, setState] = useState("connecting");

  useEffect(() => {
    if (state !== "connecting") return;
    let live = true;
    (async () => {
      await wait(2600);
      if (!live) return;
      const demo = db.get("demo") || {};
      if (demo.provider === "cancel") { setState("cancelled"); return; }
      finishSignIn({ provider, mode, email: provider === "google" ? (mode === "login" ? DEMO.email : "") : "" });
    })();
    return () => { live = false; };
  }, [state]);

  return (
    <AuthTemplate>
      {state === "connecting" ? (
        <div className="auth-col">
          <Heading title={`Continuing with ${name}`}>
            <p className="t-body1 c-secondary">Finish signing in in the window that opened. Rafiki never sees your {name} password.</p>
          </Heading>
          <div className="waiting-row t-body1" role="status"><Spinner size={20} />Waiting for {name}…</div>
          <Button type="tertiary" block onClick={() => setState("cancelled")}>Cancel</Button>
        </div>
      ) : (
        <div className="auth-col">
          <Heading title="Sign-in was cancelled">
            <p className="t-body1 c-secondary">The {name} window closed before you finished. Nothing was changed. Try again or choose another way.</p>
          </Heading>
          <Button block onClick={() => setState("connecting")}>Try again</Button>
          <Button type="tertiary" block onClick={() => navigate(mode === "login" ? "/login" : "/signup")}>Use another method</Button>
        </div>
      )}
    </AuthTemplate>
  );
}
