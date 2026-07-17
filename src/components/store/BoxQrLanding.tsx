"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BoxQrPublicConfig } from "@/lib/box-qr/types";
import styles from "./BoxQrLanding.module.css";

type GrantInfo = {
  code: string;
  percentOff: number;
  expiresAt: string;
  alreadyHad?: boolean;
};

export function BoxQrLanding({
  config,
  initialGrant,
  isLoggedIn,
}: {
  config: BoxQrPublicConfig;
  initialGrant: GrantInfo | null;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [grant, setGrant] = useState<GrantInfo | null>(initialGrant);

  async function claimExisting() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/box/claim", { method: "POST" });
    const json = (await res.json()) as GrantInfo & { error?: string; ok?: boolean };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Ödül alınamadı");
      return;
    }
    setGrant({
      code: json.code,
      percentOff: json.percentOff,
      expiresAt: json.expiresAt,
      alreadyHad: json.alreadyHad,
    });
    router.refresh();
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "box_qr" }),
    });
    const json = (await res.json()) as {
      error?: string;
      boxGrant?: GrantInfo;
    };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    if (json.boxGrant) {
      setGrant(json.boxGrant);
    } else {
      await claimExisting();
    }
    router.refresh();
  }

  const expiresLabel = grant
    ? new Date(grant.expiresAt).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className={styles.boxQr}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.inner}>
        <p className={styles.brand}>Anatolian Paw</p>
        <h1 className={styles.headline}>{config.headline}</h1>
        <p className={styles.subhead}>{config.subhead}</p>

        <div className={styles.reward} aria-label="Ödül">
          <span className={styles.percent}>%{config.discountPercent}</span>
          <span className={styles.rewardMeta}>
            kişisel indirim
            <br />
            {config.validityDays} gün geçerli
            {config.firstOrderOnly ? " · ilk sipariş" : ""}
          </span>
        </div>

        <p className={styles.body}>{config.body}</p>

        {grant ? (
          <div className={styles.success}>
            <p className={styles.successTitle}>
              {grant.alreadyHad ? "İndirimin zaten sende" : "Kazandın"}
            </p>
            <p className={styles.successText}>{config.success}</p>
            <p className={styles.code} translate="no">
              {grant.code}
            </p>
            <p className={styles.expires}>Son kullanım: {expiresLabel}</p>
            <div className={styles.actions}>
              <Link href="/collections/all" className={`${styles.btn} ${styles.btnPrimary}`}>
                Alışverişe başla
              </Link>
              <Link href="/cart" className={`${styles.btn} ${styles.btnGhost}`}>
                Sepeti gör
              </Link>
            </div>
          </div>
        ) : isLoggedIn ? (
          <div className={styles.panel}>
            <p className={styles.panelLead}>Hesabın açık — ödülünü tek tıkla yükle.</p>
            {err ? <p className={styles.err}>{err}</p> : null}
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={busy}
              onClick={() => void claimExisting()}
            >
              {busy ? "Yükleniyor…" : `Ödülü al — %${config.discountPercent}`}
            </button>
          </div>
        ) : (
          <form className={styles.panel} onSubmit={(e) => void register(e)}>
            <p className={styles.panelLead}>{config.cta}</p>
            <div className={styles.grid}>
              <label>
                Ad
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  autoComplete="given-name"
                />
              </label>
              <label>
                Soyad
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  autoComplete="family-name"
                />
              </label>
            </div>
            <label>
              E-posta
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </label>
            <label>
              Şifre
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
              />
            </label>
            <label>
              Telefon <span className={styles.opt}>(opsiyonel)</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
              />
            </label>
            {err ? <p className={styles.err}>{err}</p> : null}
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>
              {busy ? "Kaydediliyor…" : config.cta}
            </button>
            <p className={styles.login}>
              Zaten üye misin?{" "}
              <Link href="/account/login?next=%2Fbox&themeShell=1">Giriş yap, ödülü al</Link>
            </p>
          </form>
        )}

        <p className={styles.legal}>{config.legal}</p>
      </div>
    </div>
  );
}
