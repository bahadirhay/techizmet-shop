"use client";

import "./cookie-consent-banner.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  parseCookieConsentConfig,
} from "@/lib/cookie-consent/config";
import type { CookieConsentCategory, CookieConsentSource } from "@/lib/cookie-consent/types";

const STORAGE_KEY = "cookie-consent-choice-v1";
const PREFS_KEY = "cookie-consent-prefs-v1";
const DEVICE_KEY = "cookie-consent-device-v1";
const AT_KEY = "cookie-consent-at-v1";
const POLICY_KEY = "cookie-consent-policy-v1";

function categoryHeaderLine(c: CookieConsentCategory): string {
  if (c.summary?.trim()) return c.summary.trim();
  if (c.description?.trim()) {
    const d = c.description.trim();
    if (c.detail?.trim()) return d;
    return d.length > 100 ? `${d.slice(0, 97)}…` : d;
  }
  return "";
}

function categoryDetailText(c: CookieConsentCategory): string {
  if (c.detail?.trim()) return c.detail.trim();
  if (c.description?.trim()) return c.description.trim();
  return "";
}

function needsReconsent(policyVersion: string, reconsentDays: number): boolean {
  try {
    const choice = window.localStorage.getItem(STORAGE_KEY);
    if (!choice) return true;
    const storedPolicy = window.localStorage.getItem(POLICY_KEY);
    if (!storedPolicy || storedPolicy !== policyVersion) return true;
    if (reconsentDays > 0) {
      const at = Number(window.localStorage.getItem(AT_KEY) || "0");
      if (!at || Date.now() - at > reconsentDays * 24 * 60 * 60 * 1000) return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function CookieConsentBanner({ rawConfig }: { rawConfig: string | null | undefined }) {
  const cfg = useMemo(() => parseCookieConsentConfig(rawConfig), [rawConfig]);
  const categories = cfg.categories?.length ? cfg.categories : [];
  const policyVersion = cfg.policyVersion || "2026-09";
  const reconsentDays = cfg.reconsentDays ?? 365;

  const noticeTitle =
    cfg.personalDataNoticeTitle?.trim() || "Çerezler aracılığıyla kişisel veriler şu şekilde toplanır:";
  const noticeItems = cfg.personalDataNoticeItems?.length ? cfg.personalDataNoticeItems : [];

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [readyToPrompt, setReadyToPrompt] = useState(false);
  const [reconsentMode, setReconsentMode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (cfg.enabled === false) {
      setReadyToPrompt(false);
      return;
    }

    const mustAsk = needsReconsent(policyVersion, reconsentDays);
    if (!mustAsk) {
      setReadyToPrompt(false);
      return;
    }
    setReconsentMode(Boolean(window.localStorage.getItem(STORAGE_KEY)));

    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const delayMs = mobile ? 6000 : 2000;
    let timer = 0;

    const arm = () => {
      timer = window.setTimeout(() => setReadyToPrompt(true), delayMs);
    };

    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });

    return () => {
      window.removeEventListener("load", arm);
      if (timer) window.clearTimeout(timer);
    };
  }, [cfg.enabled, policyVersion, reconsentDays]);

  useEffect(() => {
    if (!readyToPrompt || cfg.enabled === false) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [readyToPrompt, cfg.enabled]);

  useEffect(() => {
    const openPrefs = () => {
      setReconsentMode(true);
      setReadyToPrompt(true);
      setOpen(true);
      setSettingsOpen(true);
    };
    window.addEventListener("kn-open-cookie-preferences", openPrefs);
    return () => window.removeEventListener("kn-open-cookie-preferences", openPrefs);
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of categories) {
      if (item.required) initial[item.id] = true;
      else initial[item.id] = item.defaultEnabled !== false;
    }
    return initial;
  });

  if (!open || cfg.enabled === false || !mounted) return null;

  const getDeviceKey = () => {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(DEVICE_KEY, created);
    return created;
  };

  const save = async (
    v: "accepted" | "rejected" | "custom" | "withdrawn",
    nextPrefs?: Record<string, boolean>,
    sourceOverride?: CookieConsentSource,
  ) => {
    const applied = nextPrefs ?? prefs;
    try {
      window.localStorage.setItem(STORAGE_KEY, v === "withdrawn" ? "rejected" : v);
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(applied));
      window.localStorage.setItem(AT_KEY, String(Date.now()));
      window.localStorage.setItem(POLICY_KEY, policyVersion);
      window.dispatchEvent(
        new CustomEvent("kn-cookie-consent", { detail: { decision: v, preferences: applied } }),
      );
      const consentKey = getDeviceKey();
      const source: CookieConsentSource =
        sourceOverride ??
        (reconsentMode ? "reconsent" : settingsOpen && v === "custom" ? "settings" : "banner");
      const locale =
        typeof document !== "undefined"
          ? document.documentElement.lang?.slice(0, 12) || undefined
          : undefined;
      await fetch("/api/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentKey,
          decision: v,
          preferences: applied,
          policyVersion,
          source,
          locale,
        }),
      });
    } catch {
      /* ignore */
    }
    setOpen(false);
    setSettingsOpen(false);
  };

  const panel = (
    <div
      className={`kn-cookie-bar${settingsOpen ? " kn-cookie-bar--expanded" : ""}`}
      role="dialog"
      aria-label="Çerez tercihleri"
      aria-live="polite"
    >
      <div className="kn-cookie-bar__compact">
        <p className="kn-cookie-bar__text">
          <strong>
            {reconsentMode
              ? "Çerez tercihlerinizi güncelleyin"
              : cfg.title || "Çerez kullanıyoruz"}
          </strong>
          {" — "}
          {reconsentMode
            ? "Politika veya süre güncellendi. Tercihlerinizi tekrar seçebilirsiniz."
            : cfg.body || "Deneyiminizi iyileştirmek için çerez kullanıyoruz."}
          {cfg.policyHref ? (
            <>
              {" "}
              <a href={cfg.policyHref}>Detay</a>
            </>
          ) : null}
        </p>
        <div className="kn-cookie-bar__actions">
          <button
            type="button"
            className="kn-cookie-bar__btn kn-cookie-bar__btn--primary"
            onClick={() =>
              save("accepted", Object.fromEntries(categories.map((item) => [item.id, true])))
            }
          >
            {cfg.acceptLabel || "Kabul et"}
          </button>
          <button
            type="button"
            className="kn-cookie-bar__btn kn-cookie-bar__btn--ghost"
            onClick={() =>
              save(
                "rejected",
                Object.fromEntries(categories.map((item) => [item.id, !!item.required])),
              )
            }
          >
            {cfg.rejectLabel || "Reddet"}
          </button>
          <button
            type="button"
            className="kn-cookie-bar__btn kn-cookie-bar__btn--link"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
          >
            {settingsOpen ? "Kapat" : cfg.settingsLabel || "Ayarlar"}
          </button>
        </div>
      </div>

      {settingsOpen ? (
        <div className="kn-cookie-bar__settings">
          <div className="kn-cookie-bar__settings-head">
            <h4>Çerez tercihleri</h4>
            <button
              type="button"
              className="kn-cookie-bar__btn kn-cookie-bar__btn--primary"
              onClick={() => save("custom", undefined, "settings")}
            >
              {cfg.saveSettingsLabel || "Kaydet"}
            </button>
          </div>
          {categories.map((item) => {
            const header = categoryHeaderLine(item);
            const detail = categoryDetailText(item);
            return (
              <div key={item.id} className="kn-cookie-bar__cat">
                <label>
                  <span>
                    {item.label}
                    {item.required ? " (zorunlu)" : ""}
                  </span>
                  {header ? <>{header}</> : detail ? <>{detail}</> : null}
                </label>
                <input
                  type="checkbox"
                  checked={item.required ? true : !!prefs[item.id]}
                  disabled={item.required}
                  aria-label={item.label}
                  onChange={(e) => setPrefs((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                />
              </div>
            );
          })}
          <div className="kn-cookie-bar__notice">
            <p style={{ margin: 0, fontWeight: 600, color: "#3f3f46" }}>{noticeTitle}</p>
            <ul>
              {noticeItems.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#71717a" }}>
              Politika sürümü: {policyVersion}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(panel, document.body);
}
