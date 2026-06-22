"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import {
  draftToClipboardText,
  platformLabel,
  type SocialContentDraftDTO,
  type SocialPlatform,
  SOCIAL_PLATFORMS,
} from "@/lib/admin/social-content/types";

const PLATFORM_STYLES: Record<SocialPlatform, string> = {
  instagram: "border-pink-200 bg-pink-50/50",
  tiktok: "border-zinc-300 bg-zinc-50",
  youtube: "border-red-200 bg-red-50/40",
  linkedin: "border-blue-200 bg-blue-50/40",
};

function DraftCard({
  draft,
  onSaved,
}: {
  draft: SocialContentDraftDTO;
  onSaved: (d: SocialContentDraftDTO) => void;
}) {
  const [caption, setCaption] = useState(draft.caption ?? "");
  const [hook, setHook] = useState(draft.hook ?? "");
  const [script, setScript] = useState(draft.script ?? "");
  const [body, setBody] = useState(draft.body ?? "");
  const [title, setTitle] = useState(draft.title ?? "");
  const [cta, setCta] = useState(draft.cta ?? "");
  const [hashtags, setHashtags] = useState(draft.hashtags.join(", "));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState(
    draft.scheduledAt ? draft.scheduledAt.slice(0, 16) : "",
  );

  useEffect(() => {
    setCaption(draft.caption ?? "");
    setHook(draft.hook ?? "");
    setScript(draft.script ?? "");
    setBody(draft.body ?? "");
    setTitle(draft.title ?? "");
    setCta(draft.cta ?? "");
    setHashtags(draft.hashtags.join(", "));
    setScheduleAt(draft.scheduledAt ? draft.scheduledAt.slice(0, 16) : "");
  }, [draft]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/social-content/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        caption: caption || null,
        hook: hook || null,
        script: script || null,
        body: body || null,
        cta: cta || null,
        hashtags: hashtags
          .split(/[,\s]+/)
          .map((t) => t.replace(/^#/, "").trim())
          .filter(Boolean),
      }),
    });
    setSaving(false);
    const j = (await res.json()) as { draft?: SocialContentDraftDTO; error?: string };
    if (j.draft) onSaved(j.draft);
  }

  async function publishNow() {
    setPublishing(true);
    setPublishMsg(null);
    await save();
    const res = await fetch(`/api/admin/social-content/${draft.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setPublishing(false);
    const j = (await res.json()) as {
      ok?: boolean;
      error?: string;
      manualOnly?: boolean;
      publishedUrl?: string;
    };
    if (j.ok && j.publishedUrl) {
      setPublishMsg(`Yayınlandı: ${j.publishedUrl}`);
      onSaved({ ...draft, status: "published", publishedUrl: j.publishedUrl, publishError: null });
    } else if (j.manualOnly) {
      setPublishMsg(j.error ?? "Manuel yükleme gerekir");
    } else {
      setPublishMsg(j.error ?? "Yayın başarısız");
      onSaved({ ...draft, status: "failed", publishError: j.error ?? "Yayın başarısız" });
    }
  }

  async function schedulePublish() {
    if (!scheduleAt) {
      setPublishMsg("Zamanlama tarihi seçin");
      return;
    }
    setPublishing(true);
    setPublishMsg(null);
    await save();
    const res = await fetch(`/api/admin/social-content/${draft.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date(scheduleAt).toISOString() }),
    });
    setPublishing(false);
    const j = (await res.json()) as { ok?: boolean; error?: string; scheduledAt?: string };
    if (j.ok) {
      setPublishMsg(`Zamanlandı: ${new Date(scheduleAt).toLocaleString("tr-TR")}`);
      onSaved({
        ...draft,
        status: "scheduled",
        scheduledAt: j.scheduledAt ?? new Date(scheduleAt).toISOString(),
        publishError: null,
      });
    } else {
      setPublishMsg(j.error ?? "Zamanlama başarısız");
    }
  }

  const statusLabel: Record<string, string> = {
    draft: "Taslak",
    approved: "Onaylı",
    scheduled: "Zamanlandı",
    published: "Yayında",
    failed: "Başarısız",
  };

  async function copyAll() {
    const text = draftToClipboardText({
      ...draft,
      title,
      caption,
      hook,
      script,
      body,
      cta,
      hashtags: hashtags.split(/[,\s]+/).filter(Boolean),
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Panoya kopyalandı");
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      setCopyMsg("Kopyalama başarısız");
    }
  }

  const preview = draft.mediaUrls[0];

  return (
    <article className={`rounded-xl border p-4 ${PLATFORM_STYLES[draft.platform]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{platformLabel(draft.platform)}</h3>
          <p className="text-xs text-zinc-500">
            Durum: {statusLabel[draft.status] ?? draft.status}
            {draft.publishedAt
              ? ` · ${new Date(draft.publishedAt).toLocaleString("tr-TR")}`
              : draft.scheduledAt
                ? ` · ${new Date(draft.scheduledAt).toLocaleString("tr-TR")}`
                : ""}
          </p>
          {draft.aiProvider ? (
            <p className="text-xs text-zinc-500">Kaynak: {draft.aiProvider}</p>
          ) : null}
          {draft.publishError ? (
            <p className="text-xs text-red-600">{draft.publishError}</p>
          ) : null}
          {draft.publishedUrl ? (
            <a
              href={draft.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--kn-brand)] underline"
            >
              Yayın linki
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => void copyAll()}>
            Metni kopyala
          </button>
          {draft.platform !== "youtube" ? (
            <button
              type="button"
              className={btnPrimary}
              disabled={publishing || draft.status === "published"}
              onClick={() => void publishNow()}
            >
              {publishing ? "Yayınlanıyor…" : "Şimdi yayınla"}
            </button>
          ) : null}
          <button type="button" className={btnSecondary} disabled={saving} onClick={() => void save()}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {copyMsg ? <p className="mt-2 text-xs text-emerald-700">{copyMsg}</p> : null}
      {publishMsg ? (
        <p className={`mt-2 text-xs ${publishMsg.includes("başarısız") || publishMsg.includes("gerekir") ? "text-amber-700" : "text-emerald-700"}`}>
          {publishMsg}
        </p>
      ) : null}

      {draft.platform !== "youtube" && draft.status !== "published" ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-black/5 pt-3">
          <AdminField label="Zamanla">
            <input
              type="datetime-local"
              className={inputClass}
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </AdminField>
          <button
            type="button"
            className={btnSecondary}
            disabled={publishing || !scheduleAt}
            onClick={() => void schedulePublish()}
          >
            Zamanla
          </button>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr]">
        {preview ? (
          <a href={preview} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt=""
              className="h-28 w-full rounded-lg border object-cover"
            />
          </a>
        ) : (
          <div className="flex h-28 items-center justify-center rounded-lg border bg-white text-xs text-zinc-400">
            Görsel yok
          </div>
        )}
        <div className="space-y-2 text-sm">
          {draft.platform === "youtube" ? (
            <>
              <AdminField label="Başlık">
                <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
              </AdminField>
              <AdminField label="Açıklama">
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </AdminField>
              <AdminField label="Video konuşma metni">
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                />
              </AdminField>
            </>
          ) : draft.platform === "linkedin" ? (
            <AdminField label="Gönderi metni">
              <textarea
                className={`${inputClass} min-h-[100px]`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </AdminField>
          ) : (
            <>
              {draft.platform === "tiktok" ? (
                <AdminField label="Hook (ilk cümle)">
                  <input className={inputClass} value={hook} onChange={(e) => setHook(e.target.value)} />
                </AdminField>
              ) : null}
              <AdminField label="Açıklama / caption">
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </AdminField>
              {draft.platform === "tiktok" ? (
                <AdminField label="Video konuşma metni">
                  <textarea
                    className={`${inputClass} min-h-[80px]`}
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                  />
                </AdminField>
              ) : null}
            </>
          )}
          <AdminField label="Hashtag'ler (virgülle)">
            <input className={inputClass} value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
          </AdminField>
          <AdminField label="CTA">
            <input className={inputClass} value={cta} onChange={(e) => setCta(e.target.value)} />
          </AdminField>
          {draft.productUrl ? (
            <p className="text-xs text-zinc-600 break-all">
              Link:{" "}
              <a href={draft.productUrl} className="underline" target="_blank" rel="noopener noreferrer">
                {draft.productUrl}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ProductSocialContentPanel({
  productId,
  productTitle,
  compact,
}: {
  productId: string;
  productTitle: string;
  compact?: boolean;
}) {
  const [drafts, setDrafts] = useState<SocialContentDraftDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/social-content?productId=${encodeURIComponent(productId)}`);
      const j = (await res.json()) as { drafts?: SocialContentDraftDTO[] };
      setDrafts(j.drafts ?? []);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/social-content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const j = (await res.json()) as {
        error?: string;
        message?: string;
        drafts?: SocialContentDraftDTO[];
      };
      if (!res.ok) {
        setErr(j.error ?? "Üretim başarısız");
        return;
      }
      if (j.drafts) setDrafts(j.drafts);
      setMsg(j.message ?? "4 platform için içerik üretildi");
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setGenerating(false);
    }
  }

  const byPlatform = SOCIAL_PLATFORMS.map(
    (p) => drafts.find((d) => d.platform === p) ?? null,
  ).filter(Boolean) as SocialContentDraftDTO[];

  return (
    <section className={compact ? "mt-6" : "admin-card admin-card-pad mt-6"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Sosyal medya içerikleri</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {productTitle} — Instagram, TikTok, YouTube Shorts ve LinkedIn taslakları. API ayarları:{" "}
          <Link href="/admin/integrations/social" className="underline">
            Sosyal yayın API
          </Link>
        </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!compact ? (
            <Link href="/admin/marketing/social" className={btnSecondary}>
              Tüm stüdyo →
            </Link>
          ) : null}
          <button type="button" className={btnPrimary} disabled={generating} onClick={() => void generate()}>
            {generating ? "Üretiliyor…" : byPlatform.length ? "Yeniden üret" : "4 platform için üret"}
          </button>
        </div>
      </div>

      {msg ? <p className="mt-3 text-sm text-emerald-700">{msg}</p> : null}
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Yükleniyor…</p>
      ) : byPlatform.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Henüz taslak yok. &quot;4 platform için üret&quot; ile AI veya şablon metin oluşturun; ardından
          kopyalayıp ilgili uygulamada paylaşın.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {byPlatform.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              onSaved={(updated) => {
                setDrafts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
