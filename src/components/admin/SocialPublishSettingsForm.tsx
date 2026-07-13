"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { platformLabel, SOCIAL_PLATFORMS } from "@/lib/admin/social-content/types";
import type { StoreSocialPublishSettings } from "@/lib/site-settings";

type SecretsConfigured = {
  metaToken: boolean;
  tiktokToken: boolean;
  youtubeRefresh: boolean;
  linkedinToken: boolean;
};

export function SocialPublishSettingsForm({
  initial,
  secretsConfigured,
}: {
  initial: StoreSocialPublishSettings;
  secretsConfigured: SecretsConfigured;
}) {
  const [sp, setSp] = useState<StoreSocialPublishSettings>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Array<{ platform: string; ok: boolean; message: string }> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [tokenDirty, setTokenDirty] = useState({
    meta: false,
    tiktok: false,
    youtube: false,
    linkedin: false,
  });

  function patchPlatform<K extends keyof StoreSocialPublishSettings>(
    key: K,
    patch: Partial<NonNullable<StoreSocialPublishSettings[K]>>,
  ) {
    setSp((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), ...patch },
    }));
  }

  async function save(): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    const body: StoreSocialPublishSettings = JSON.parse(JSON.stringify(sp)) as StoreSocialPublishSettings;
    if (!tokenDirty.meta && secretsConfigured.metaToken) delete body.meta?.accessToken;
    if (!tokenDirty.tiktok && secretsConfigured.tiktokToken) {
      delete body.tiktok?.accessToken;
      delete body.tiktok?.refreshToken;
      delete body.tiktok?.clientSecret;
    }
    if (!tokenDirty.youtube && secretsConfigured.youtubeRefresh) {
      delete body.youtube?.refreshToken;
      delete body.youtube?.clientSecret;
    }
    if (!tokenDirty.linkedin && secretsConfigured.linkedinToken) delete body.linkedin?.accessToken;

    const res = await fetch("/api/admin/integrations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socialPublish: body }),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg("Kayıt hatası");
      return false;
    }
    setMsg("Kaydedildi");
    return true;
  }

  async function testAll() {
    setTestResults(null);
    if (!(await save())) return;
    const res = await fetch("/api/admin/social-publish/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "all" }),
    });
    const j = (await res.json()) as {
      results?: Array<{ platform: string; ok: boolean; message: string }>;
    };
    setTestResults(j.results ?? []);
  }

  async function testOne(platform: string) {
    if (!(await save())) return;
    const res = await fetch("/api/admin/social-publish/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const j = (await res.json()) as {
      results?: Array<{ platform: string; ok: boolean; message: string }>;
    };
    setTestResults(j.results ?? []);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
        <p className="font-medium">Otomatik yayın (Sprint 3–4)</p>
        <p className="mt-1 text-violet-900/90">
          Instagram, TikTok ve LinkedIn API ile doğrudan yayınlanır. YouTube Shorts video dosyası gerektirdiği
          için yalnızca bağlantı testi ve metin hazırlığı desteklenir. Zamanlanmış yayın için harici cron:{" "}
          <code className="rounded bg-white/80 px-1">GET /api/cron/social/publish</code>
        </p>
        <p className="mt-2">
          <Link href="/admin/marketing/social" className="underline">
            Sosyal içerik stüdyosu →
          </Link>
        </p>
      </div>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="font-semibold">Stüdyo — marka & öğrenme</h2>
        <p className="text-sm text-zinc-600">
          AI görsellerin üzerine logo, ürün adı ve fiyat eklenir. Yayınlanan Instagram gönderilerinin
          metrikleri sonraki üretimlerde brif ve metinlere yansır.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sp.studio?.brandOverlay !== false}
            onChange={(e) =>
              setSp((prev) => ({
                ...prev,
                studio: { ...(prev.studio ?? {}), brandOverlay: e.target.checked },
              }))
            }
          />
          Marka katmanı (logo + fiyat şeridi) açık
        </label>
        <AdminField label="Şerit şablonu">
          <select
            className={inputClass}
            value={sp.studio?.overlayTemplate ?? "hero"}
            onChange={(e) =>
              setSp((prev) => ({
                ...prev,
                studio: {
                  ...(prev.studio ?? {}),
                  overlayTemplate: e.target.value === "minimal" ? "minimal" : "hero",
                },
              }))
            }
          >
            <option value="hero">Hero — tam şerit + rozet</option>
            <option value="minimal">Minimal — ince şerit</option>
          </select>
        </AdminField>
        <AdminField label="Vurgu rengi (hex)">
          <input
            className={inputClass}
            value={sp.studio?.accentColor ?? "#8B5E3C"}
            onChange={(e) =>
              setSp((prev) => ({
                ...prev,
                studio: { ...(prev.studio ?? {}), accentColor: e.target.value },
              }))
            }
            placeholder="#8B5E3C"
          />
        </AdminField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sp.studio?.crossPostFacebook !== false}
            onChange={(e) =>
              setSp((prev) => ({
                ...prev,
                studio: { ...(prev.studio ?? {}), crossPostFacebook: e.target.checked },
              }))
            }
          />
          Instagram yayınından sonra Facebook sayfasına da paylaş
        </label>
      </section>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="font-semibold">Meta — Instagram</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(sp.meta?.enabled)}
            onChange={(e) => patchPlatform("meta", { enabled: e.target.checked })}
          />
          Instagram otomatik yayın açık
        </label>
        <AdminField label="Instagram Business hesap ID">
          <input
            className={inputClass}
            value={sp.meta?.instagramAccountId ?? ""}
            onChange={(e) => patchPlatform("meta", { instagramAccountId: e.target.value })}
            placeholder="178414..."
          />
        </AdminField>
        <AdminField label="Facebook Sayfa ID (isteğe bağlı)">
          <input
            className={inputClass}
            value={sp.meta?.pageId ?? ""}
            onChange={(e) => patchPlatform("meta", { pageId: e.target.value })}
          />
        </AdminField>
        <AdminField
          label={`Sayfa erişim jetonu${secretsConfigured.metaToken && !tokenDirty.meta ? " (kayıtlı)" : ""}`}
        >
          <input
            type="password"
            className={inputClass}
            value={sp.meta?.accessToken ?? ""}
            onChange={(e) => {
              setTokenDirty((d) => ({ ...d, meta: true }));
              patchPlatform("meta", { accessToken: e.target.value });
            }}
            placeholder={secretsConfigured.metaToken ? "Değiştirmek için yazın" : "EAA..."}
          />
        </AdminField>
        <button type="button" className={btnSecondary} onClick={() => void testOne("instagram")}>
          Instagram bağlantısını test et
        </button>
      </section>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="font-semibold">TikTok</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(sp.tiktok?.enabled)}
            onChange={(e) => patchPlatform("tiktok", { enabled: e.target.checked })}
          />
          TikTok otomatik yayın açık
        </label>
        <AdminField label="Client Key">
          <input
            className={inputClass}
            value={sp.tiktok?.clientKey ?? ""}
            onChange={(e) => patchPlatform("tiktok", { clientKey: e.target.value })}
          />
        </AdminField>
        <AdminField label={`Client Secret${secretsConfigured.tiktokToken && !tokenDirty.tiktok ? " (kayıtlı)" : ""}`}>
          <input
            type="password"
            className={inputClass}
            value={sp.tiktok?.clientSecret ?? ""}
            onChange={(e) => {
              setTokenDirty((d) => ({ ...d, tiktok: true }));
              patchPlatform("tiktok", { clientSecret: e.target.value });
            }}
          />
        </AdminField>
        <AdminField label={`Access Token${secretsConfigured.tiktokToken && !tokenDirty.tiktok ? " (kayıtlı)" : ""}`}>
          <input
            type="password"
            className={inputClass}
            value={sp.tiktok?.accessToken ?? ""}
            onChange={(e) => {
              setTokenDirty((d) => ({ ...d, tiktok: true }));
              patchPlatform("tiktok", { accessToken: e.target.value });
            }}
          />
        </AdminField>
        <AdminField label="Open ID">
          <input
            className={inputClass}
            value={sp.tiktok?.openId ?? ""}
            onChange={(e) => patchPlatform("tiktok", { openId: e.target.value })}
          />
        </AdminField>
        <button type="button" className={btnSecondary} onClick={() => void testOne("tiktok")}>
          TikTok bağlantısını test et
        </button>
      </section>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="font-semibold">YouTube Shorts</h2>
        <p className="text-sm text-zinc-600">
          Video yükleme API&apos;si video dosyası gerektirir; otomatik yayın devre dışı. OAuth ile kanal
          bağlantısını doğrulayabilirsiniz.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(sp.youtube?.enabled)}
            onChange={(e) => patchPlatform("youtube", { enabled: e.target.checked })}
          />
          YouTube bağlantısı etkin (yalnızca test)
        </label>
        <AdminField label="OAuth Client ID">
          <input
            className={inputClass}
            value={sp.youtube?.clientId ?? ""}
            onChange={(e) => patchPlatform("youtube", { clientId: e.target.value })}
          />
        </AdminField>
        <AdminField
          label={`Client Secret${secretsConfigured.youtubeRefresh && !tokenDirty.youtube ? " (kayıtlı)" : ""}`}
        >
          <input
            type="password"
            className={inputClass}
            value={sp.youtube?.clientSecret ?? ""}
            onChange={(e) => {
              setTokenDirty((d) => ({ ...d, youtube: true }));
              patchPlatform("youtube", { clientSecret: e.target.value });
            }}
          />
        </AdminField>
        <AdminField
          label={`Refresh Token${secretsConfigured.youtubeRefresh && !tokenDirty.youtube ? " (kayıtlı)" : ""}`}
        >
          <input
            type="password"
            className={inputClass}
            value={sp.youtube?.refreshToken ?? ""}
            onChange={(e) => {
              setTokenDirty((d) => ({ ...d, youtube: true }));
              patchPlatform("youtube", { refreshToken: e.target.value });
            }}
          />
        </AdminField>
        <button type="button" className={btnSecondary} onClick={() => void testOne("youtube")}>
          YouTube OAuth test et
        </button>
      </section>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="font-semibold">LinkedIn</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(sp.linkedin?.enabled)}
            onChange={(e) => patchPlatform("linkedin", { enabled: e.target.checked })}
          />
          LinkedIn otomatik yayın açık
        </label>
        <AdminField label="Yazar URN (ör. urn:li:organization:123)">
          <input
            className={inputClass}
            value={sp.linkedin?.authorUrn ?? ""}
            onChange={(e) => patchPlatform("linkedin", { authorUrn: e.target.value })}
          />
        </AdminField>
        <AdminField
          label={`Access Token${secretsConfigured.linkedinToken && !tokenDirty.linkedin ? " (kayıtlı)" : ""}`}
        >
          <input
            type="password"
            className={inputClass}
            value={sp.linkedin?.accessToken ?? ""}
            onChange={(e) => {
              setTokenDirty((d) => ({ ...d, linkedin: true }));
              patchPlatform("linkedin", { accessToken: e.target.value });
            }}
          />
        </AdminField>
        <button type="button" className={btnSecondary} onClick={() => void testOne("linkedin")}>
          LinkedIn bağlantısını test et
        </button>
      </section>

      {testResults ? (
        <ul className="space-y-2 text-sm">
          {testResults.map((r) => (
            <li key={r.platform} className={r.ok ? "text-green-700" : "text-red-600"}>
              <strong>{platformLabel(r.platform as (typeof SOCIAL_PLATFORMS)[number])}:</strong> {r.message}
            </li>
          ))}
        </ul>
      ) : null}

      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => void testAll()}>
          Tüm platformları test et
        </button>
      </div>
    </div>
  );
}
