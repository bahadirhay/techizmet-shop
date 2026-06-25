"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type CookieCategory = {
  id: string;
  label: string;
  summary?: string;
  detail?: string;
  description?: string;
  required?: boolean;
  defaultEnabled?: boolean;
};

type CookieCfg = {
  enabled?: boolean;
  title?: string;
  body?: string;
  policyHref?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  settingsLabel?: string;
  saveSettingsLabel?: string;
  categories?: CookieCategory[];
  personalDataNoticeTitle?: string;
  personalDataNoticeItems?: string[];
};

const STORAGE_KEY = "cookie-consent-choice-v1";
const DEVICE_KEY = "cookie-consent-device-v1";

const DEFAULT_PERSONAL_DATA_ITEMS = [
  "Kullanılan Tarayıcı ve İşletim Sistemi: Tarayıcı ve işletim sistemi bilgileri kaydedilir.",
  "IP Adresi: Kullanıcının IP adresi kaydedilir.",
  "Kullanıcı ID: Benzersiz bir kullanıcı kimliği oluşturulur.",
  "Ziyaret Tarihi ve Saati: Kullanıcının siteye erişim tarihi ve saati kaydedilir.",
  "Etkileşim Durumu: Siteye erişim durumu ve hata uyarıları kaydedilir.",
  "Sitedeki Özelliklerin Kullanımı: Kullanıcıların site içindeki etkileşimleri ve özellikleri kullanımları takip edilir.",
  "Arama İfadeleri: Girilen arama ifadeleri kaydedilir.",
  "Site Ziyaret Sıklığı: Kullanıcının siteyi ne sıklıkta ziyaret ettiği kaydedilir.",
  "Dil Tercihleri: Kullanıcı tercihleri ve dil ayarları kaydedilir.",
  "Sayfa Kaydırma Hareketleri: Sayfalar arasındaki kaydırma hareketleri takip edilir.",
  "Erişilen Sekmeler: Hangi sekmelere erişildiği kaydedilir.",
];

const FUNCTIONAL_DETAIL =
  "Zorunlu çerezler; sitenin güvenli şekilde çalışması, oturumun korunması, tercihlerinizi (ör. dil) hatırlamamız için gereklidir.";

function parseCfg(raw: string | null | undefined): CookieCfg {
  if (!raw?.trim()) {
    return {
      enabled: true,
      title: "Çerez kullanıyoruz",
      body: "Deneyiminizi iyileştirmek için çerez kullanıyoruz.",
      policyHref: "/pages/faq",
      acceptLabel: "Kabul et",
      rejectLabel: "Reddet",
      settingsLabel: "Ayarlar",
      saveSettingsLabel: "Ayarları Kaydet",
      personalDataNoticeTitle: "Çerezler aracılığıyla kişisel veriler şu şekilde toplanır:",
      personalDataNoticeItems: DEFAULT_PERSONAL_DATA_ITEMS,
      categories: [
        {
          id: "functional",
          label: "Fonksiyonel",
          summary: "Her zaman aktif.",
          detail: FUNCTIONAL_DETAIL,
          required: true,
        },
        {
          id: "analytics",
          label: "İstatistik",
          summary: "Anonim analiz çerezleri.",
          detail:
            "Ziyaretçi sayıları ve sayfa görüntülemeleri anonim veya toplu halde analiz için kullanılır.",
          defaultEnabled: true,
        },
        {
          id: "marketing",
          label: "Pazarlama",
          summary: "Reklam ve pazarlama çerezleri.",
          detail: "İlgi alanlarınıza uygun içerik ve reklamlar için kullanılabilir.",
          defaultEnabled: true,
        },
      ],
    };
  }
  try {
    return JSON.parse(raw) as CookieCfg;
  } catch {
    return { enabled: false };
  }
}

function categoryHeaderLine(c: CookieCategory): string {
  if (c.summary?.trim()) return c.summary.trim();
  if (c.description?.trim()) {
    const d = c.description.trim();
    if (c.detail?.trim()) return d;
    return d.length > 100 ? `${d.slice(0, 97)}…` : d;
  }
  return "";
}

function categoryDetailText(c: CookieCategory): string {
  if (c.detail?.trim()) return c.detail.trim();
  if (c.description?.trim()) return c.description.trim();
  return "";
}

export function CookieConsentBanner({ rawConfig }: { rawConfig: string | null | undefined }) {
  const cfg = useMemo(() => parseCfg(rawConfig), [rawConfig]);
  const categories = cfg.categories?.length
    ? cfg.categories
    : [
        {
          id: "functional",
          label: "Fonksiyonel",
          summary: "Her zaman aktif.",
          detail: FUNCTIONAL_DETAIL,
          required: true,
        },
        {
          id: "analytics",
          label: "İstatistik",
          summary: "Anonim analiz çerezleri.",
          detail:
            "Ziyaretçi sayıları ve sayfa görüntülemeleri anonim veya toplu halde analiz için kullanılır.",
          defaultEnabled: true,
        },
        {
          id: "marketing",
          label: "Pazarlama",
          summary: "Reklam ve pazarlama çerezleri.",
          detail: "İlgi alanlarınıza uygun içerik ve reklamlar için kullanılabilir.",
          defaultEnabled: true,
        },
      ];

  const noticeTitle =
    cfg.personalDataNoticeTitle?.trim() || "Çerezler aracılığıyla kişisel veriler şu şekilde toplanır:";
  const noticeItems =
    cfg.personalDataNoticeItems?.length ? cfg.personalDataNoticeItems : DEFAULT_PERSONAL_DATA_ITEMS;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [readyToPrompt, setReadyToPrompt] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (cfg.enabled === false) {
      setReadyToPrompt(false);
      return;
    }
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }

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
  }, [cfg.enabled]);

  useEffect(() => {
    if (!readyToPrompt || cfg.enabled === false) {
      setOpen(false);
      return;
    }
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [readyToPrompt, cfg.enabled]);
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

  const save = async (v: "accepted" | "rejected" | "custom", nextPrefs?: Record<string, boolean>) => {
    const applied = nextPrefs ?? prefs;
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
      window.localStorage.setItem("cookie-consent-prefs-v1", JSON.stringify(applied));
      window.dispatchEvent(new CustomEvent("kn-cookie-consent", { detail: { decision: v, preferences: applied } }));
      const consentKey = getDeviceKey();
      await fetch("/api/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentKey, decision: v, preferences: applied }),
      });
    } catch {
      /* ignore */
    }
    setOpen(false);
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
          <strong>{cfg.title || "Çerez kullanıyoruz"}</strong>
          {" — "}
          {cfg.body || "Deneyiminizi iyileştirmek için çerez kullanıyoruz."}
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
              save("rejected", Object.fromEntries(categories.map((item) => [item.id, !!item.required])))
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
              onClick={() => save("custom")}
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
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(panel, document.body);
}
