"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SocialLoginButtons } from "@/components/store/SocialLoginButtons";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  useAccount,
  type AccountDrawerMode,
} from "@/components/store/account/AccountContext";

type Strings = Record<string, string>;

const TR: Strings = {
  loginTitle: "Giriş yap",
  registerTitle: "Kayıt ol",
  forgotTitle: "Şifremi unuttum",
  accountTitle: "Hesabım",
  email: "E-posta",
  password: "Şifre",
  firstName: "Ad",
  lastName: "Soyad",
  signIn: "Giriş",
  register: "Kayıt ol",
  sendReset: "Sıfırlama bağlantısı gönder",
  forgotLink: "Şifremi unuttum",
  toRegister: "Hesabınız yok mu? Kayıt olun",
  toLogin: "Zaten üye misiniz? Giriş yapın",
  backToLogin: "Girişe dön",
  welcome: "Hoş geldiniz",
  dashboard: "Hesap bilgilerim",
  favorites: "Favorilerim",
  trackOrder: "Sipariş takip",
  logout: "Çıkış yap",
  close: "Kapat",
  loading: "…",
  loginFail: "Giriş başarısız",
  registerFail: "Kayıt başarısız",
  forgotDone: "E-posta adresiniz kayıtlıysa sıfırlama bağlantısı gönderildi.",
  b2bPending: "Kaydınız alındı. Bayi başvurunuz onay bekliyor.",
};

const EN: Strings = {
  loginTitle: "Sign in",
  registerTitle: "Register",
  forgotTitle: "Reset password",
  accountTitle: "My account",
  email: "Email",
  password: "Password",
  firstName: "First name",
  lastName: "Last name",
  signIn: "Sign in",
  register: "Register",
  sendReset: "Send reset link",
  forgotLink: "Forgot password",
  toRegister: "No account? Register",
  toLogin: "Already a member? Sign in",
  backToLogin: "Back to sign in",
  welcome: "Welcome",
  dashboard: "Account details",
  favorites: "Favorites",
  trackOrder: "Track order",
  logout: "Log out",
  close: "Close",
  loading: "…",
  loginFail: "Sign in failed",
  registerFail: "Registration failed",
  forgotDone: "If your email is registered, a reset link has been sent.",
  b2bPending: "Registration received. Your dealer application is pending approval.",
};

export function AccountDrawer({ locale }: { locale: ShopLocale }) {
  const { customer, isOpen, mode, setMode, closeAccount, refreshSession } = useAccount();
  const router = useRouter();
  const t = locale === "en" ? EN : TR;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAccount();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeAccount]);

  if (!isOpen) return null;

  const title = customer
    ? t.accountTitle
    : mode === "register"
      ? t.registerTitle
      : mode === "forgot"
        ? t.forgotTitle
        : t.loginTitle;

  async function onAuthed() {
    await refreshSession();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="kn-account-overlay"
        aria-label={t.close}
        onClick={closeAccount}
      />
      <aside className="kn-account-drawer" role="dialog" aria-label={title}>
        <div className="kn-account-drawer__head">
          <h2>{title}</h2>
          <button
            type="button"
            className="kn-account-drawer__close"
            onClick={closeAccount}
            aria-label={t.close}
          >
            ×
          </button>
        </div>
        <div className="kn-account-drawer__body">
          {customer ? (
            <LoggedInView t={t} customer={customer} onClose={closeAccount} onAuthed={onAuthed} />
          ) : mode === "register" ? (
            <RegisterView t={t} setMode={setMode} onAuthed={onAuthed} />
          ) : mode === "forgot" ? (
            <ForgotView t={t} setMode={setMode} />
          ) : (
            <LoginView t={t} setMode={setMode} onAuthed={onAuthed} />
          )}
        </div>
      </aside>
    </>
  );
}

function LoginView({
  t,
  setMode,
  onAuthed,
}: {
  t: Strings;
  setMode: (m: AccountDrawerMode) => void;
  onAuthed: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(json.error ?? t.loginFail);
        return;
      }
      await onAuthed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kn-account-drawer__form">
      <form onSubmit={submit}>
        <label>
          {t.email}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t.password}
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <p className="kn-account-drawer__hint">
          <button type="button" className="kn-account-drawer__link" onClick={() => setMode("forgot")}>
            {t.forgotLink}
          </button>
        </p>
        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="kn-btn kn-btn--primary kn-btn--block" disabled={busy}>
          {busy ? t.loading : t.signIn}
        </button>
      </form>
      <SocialLoginButtons />
      <p className="kn-account-drawer__footer">
        <button type="button" className="kn-account-drawer__link" onClick={() => setMode("register")}>
          {t.toRegister}
        </button>
      </p>
    </div>
  );
}

function RegisterView({
  t,
  setMode,
  onAuthed,
}: {
  t: Strings;
  setMode: (m: AccountDrawerMode) => void;
  onAuthed: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const json = (await res.json()) as { error?: string; b2bPending?: boolean };
      if (!res.ok) {
        setErr(json.error ?? t.registerFail);
        return;
      }
      if (json.b2bPending) {
        setNotice(t.b2bPending);
        return;
      }
      await onAuthed();
    } finally {
      setBusy(false);
    }
  }

  if (notice) {
    return <p className="kn-account-drawer__notice">{notice}</p>;
  }

  return (
    <div className="kn-account-drawer__form">
      <form onSubmit={submit}>
        <label>
          {t.firstName}
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label>
          {t.lastName}
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label>
          {t.email}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t.password}
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="kn-btn kn-btn--primary kn-btn--block" disabled={busy}>
          {busy ? t.loading : t.register}
        </button>
      </form>
      <p className="kn-account-drawer__footer">
        <button type="button" className="kn-account-drawer__link" onClick={() => setMode("login")}>
          {t.toLogin}
        </button>
      </p>
    </div>
  );
}

function ForgotView({ t, setMode }: { t: Strings; setMode: (m: AccountDrawerMode) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="kn-account-drawer__form">
        <p className="kn-account-drawer__notice">{t.forgotDone}</p>
        <button
          type="button"
          className="kn-btn kn-btn--outline kn-btn--block"
          onClick={() => setMode("login")}
        >
          {t.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <div className="kn-account-drawer__form">
      <form onSubmit={submit}>
        <label>
          {t.email}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit" className="kn-btn kn-btn--primary kn-btn--block" disabled={busy}>
          {busy ? t.loading : t.sendReset}
        </button>
      </form>
      <p className="kn-account-drawer__footer">
        <button type="button" className="kn-account-drawer__link" onClick={() => setMode("login")}>
          {t.backToLogin}
        </button>
      </p>
    </div>
  );
}

function LoggedInView({
  t,
  customer,
  onClose,
  onAuthed,
}: {
  t: Strings;
  customer: { email: string; firstName?: string | null; lastName?: string | null };
  onClose: () => void;
  onAuthed: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email;

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/account/logout", { method: "POST", credentials: "same-origin" });
      await onAuthed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kn-account-drawer__panel">
      <p className="kn-account-drawer__welcome">
        {t.welcome}, <strong>{name}</strong>
      </p>
      <nav className="kn-account-drawer__links">
        <Link href="/account" onClick={onClose}>
          {t.dashboard}
        </Link>
        <Link href="/account/favorites" onClick={onClose}>
          {t.favorites}
        </Link>
        <Link href="/orders/track" onClick={onClose}>
          {t.trackOrder}
        </Link>
      </nav>
      <button
        type="button"
        className="kn-btn kn-btn--outline kn-btn--block"
        onClick={logout}
        disabled={busy}
      >
        {busy ? t.loading : t.logout}
      </button>
    </div>
  );
}

export function AccountTrigger({ label }: { label: string }) {
  const { openAccount } = useAccount();
  return (
    <button type="button" className="kn-account-trigger" onClick={() => openAccount("login")}>
      {label}
    </button>
  );
}
