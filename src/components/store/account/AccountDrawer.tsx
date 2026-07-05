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
  signIn: "Giriş yap",
  register: "Kayıt ol",
  sendReset: "Sıfırlama bağlantısı gönder",
  forgotLink: "Şifremi unuttum?",
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
  forgotLink: "Forgot password?",
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

function DrawerCloseIcon() {
  return (
    <svg className="close-icon" width="20" height="20" viewBox="0 0 23.691 22.723" aria-hidden>
      <g transform="translate(-126.154 -143.139)">
        <line x2="23" y2="22" transform="translate(126.5 143.5)" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M0,22,23,0" transform="translate(126.5 143.5)" fill="none" stroke="currentColor" strokeWidth="2" />
      </g>
    </svg>
  );
}

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
    document.body.classList.add("overflow-hidden");
    document.documentElement.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
      document.documentElement.classList.remove("overflow-hidden");
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
      <button type="button" className="close-fullwidth" aria-label={t.close} onClick={closeAccount} />
      <aside
        className="side-drawer account--side-drawer scheme-primary kn-react-account-drawer show"
        role="dialog"
        aria-label={title}
        data-drawer="account-drawer"
      >
        <div className="side--drawer-panel">
          <div className="side--drawer-inner">
            <div className="side--drawer-header">
              <h5 className="account--drawer-heading heading-font h5">{title}</h5>
              <button type="button" className="drawer-close" onClick={closeAccount} aria-label={t.close}>
                <DrawerCloseIcon />
              </button>
            </div>
            <div className="side--drawer-body" data-drawer-body="drawer-body">
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
          </div>
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
    <div className="account--login-form" data-form="login">
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="kn-account-email">{t.email}</label>
          <input
            id="kn-account-email"
            className="form-control"
            type="email"
            required
            autoComplete="email"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="kn-account-password">{t.password}</label>
          <input
            id="kn-account-password"
            className="form-control"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="form-group forgot-password text-right">
          <button
            type="button"
            className="text-underline text-small cursor-pointer"
            onClick={() => setMode("forgot")}
          >
            {t.forgotLink}
          </button>
        </div>
        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="button medium-button button-block" disabled={busy}>
          {busy ? t.loading : t.signIn}
        </button>
        <p className="account--text-info text-center text-medium">
          <button type="button" className="text-underline cursor-pointer" onClick={() => setMode("register")}>
            {t.toRegister}
          </button>
        </p>
      </form>
      <SocialLoginButtons />
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
    return <p className="account--text-info text-medium">{notice}</p>;
  }

  return (
    <div className="account--register-form" data-form="create">
      <form onSubmit={submit}>
        <div className="input-form--fields">
          <div className="form-group">
            <label htmlFor="kn-register-first">{t.firstName}</label>
            <input
              id="kn-register-first"
              className="form-control"
              type="text"
              autoComplete="given-name"
              placeholder={t.firstName}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="kn-register-last">{t.lastName}</label>
            <input
              id="kn-register-last"
              className="form-control"
              type="text"
              autoComplete="family-name"
              placeholder={t.lastName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="kn-register-email">{t.email}</label>
          <input
            id="kn-register-email"
            className="form-control"
            type="email"
            required
            autoComplete="email"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="kn-register-password">{t.password}</label>
          <input
            id="kn-register-password"
            className="form-control"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="button medium-button button-block" disabled={busy}>
          {busy ? t.loading : t.register}
        </button>
        <p className="account--text-info text-medium text-center">
          <button type="button" className="text-underline cursor-pointer" onClick={() => setMode("login")}>
            {t.toLogin}
          </button>
        </p>
      </form>
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
      <div className="account--recover-password-form" data-form="reset">
        <p className="account--text-info text-medium">{t.forgotDone}</p>
        <button type="button" className="button medium-button button-block" onClick={() => setMode("login")}>
          {t.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <div className="account--recover-password-form" data-form="reset">
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="kn-forgot-email">{t.email}</label>
          <input
            id="kn-forgot-email"
            className="form-control"
            type="email"
            required
            autoComplete="email"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="button medium-button button-block" disabled={busy}>
          {busy ? t.loading : t.sendReset}
        </button>
        <div className="account--text-info text-medium text-center">
          <button type="button" className="text-underline cursor-pointer" onClick={() => setMode("login")}>
            {t.backToLogin}
          </button>
        </div>
      </form>
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
    <div className="kn-account-logged-in">
      <p className="account--text-info text-medium">
        {t.welcome}, <strong>{name}</strong>
      </p>
      <nav className="kn-account-logged-in__links">
        <Link href="/account" className="text-underline" onClick={onClose}>
          {t.dashboard}
        </Link>
        <Link href="/account/favorites" className="text-underline" onClick={onClose}>
          {t.favorites}
        </Link>
        <Link href="/orders/track" className="text-underline" onClick={onClose}>
          {t.trackOrder}
        </Link>
      </nav>
      <button type="button" className="button medium-button button-block kn-account-logout" onClick={logout} disabled={busy}>
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
