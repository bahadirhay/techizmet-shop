"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { GscPanel } from "@/components/admin/GscPanel";
import type { BlogAutomationClientState } from "@/lib/admin/blog-automation/settings";
import type { BlogTopicCandidate } from "@/lib/admin/blog-automation/topics";
import type { GscClientState } from "@/lib/admin/gsc/settings";

type GenerateResult = {
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  topic?: string;
  postId?: string;
  slug?: string;
  published?: boolean;
  aiMessage?: string;
  error?: string;
};

export function BlogAutomationPanel({
  initial,
  gscInitial,
  aiAvailable,
}: {
  initial: BlogAutomationClientState;
  gscInitial: GscClientState;
  aiAvailable: boolean;
}) {
  const [s, setS] = useState(initial);
  const [topics, setTopics] = useState<BlogTopicCandidate[]>([]);
  const [days, setDays] = useState(7);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);

  const loadTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
      const res = await fetch(`/api/admin/blog-automation/topics?days=${days}&limit=20`);
      const j = (await res.json()) as { topics?: BlogTopicCandidate[]; error?: string };
      if (res.ok && j.topics) setTopics(j.topics);
      else setMsg(j.error ?? "Konu listesi alınamadı");
    } finally {
      setLoadingTopics(false);
    }
  }, [days]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/blog-automation/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogAutomation: s }),
    });
    const j = (await res.json()) as { blogAutomation?: BlogAutomationClientState; error?: string };
    setBusy(false);
    if (res.ok && j.blogAutomation) {
      setS(j.blogAutomation);
      setMsg("Ayarlar kaydedildi");
    } else {
      setMsg(j.error ?? "Kayıt başarısız");
    }
  }

  async function generate(keyword?: string) {
    setBusy(true);
    setGenResult(null);
    setMsg(null);
    const res = await fetch("/api/admin/blog-automation/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keyword ? { keyword } : {}),
    });
    const j = (await res.json()) as GenerateResult;
    setBusy(false);
    setGenResult(j);
    if (j.ok && !j.skipped) {
      setMsg(j.published ? "Yazı yayınlandı" : "Taslak oluşturuldu");
      void loadTopics();
    } else if (j.skipped) {
      setMsg(j.reason ?? "Atlandı");
    } else {
      setMsg(j.error ?? j.reason ?? "Üretim başarısız");
    }
  }

  return (
    <div className="space-y-6">
      <GscPanel initial={gscInitial} />

      <section className="rounded-xl border bg-white p-6 space-y-4 max-w-3xl">
        <h2 className="font-semibold">Otomasyon ayarları</h2>
        <p className="text-sm text-zinc-600">
          Çerez onaylı ziyaretçilerin site aramaları ve popüler ürün görüntülemeleri skorlanır; en yüksek
          konulardan blog taslağı veya yayın oluşturulur. AI için{" "}
          <Link href="/admin/settings/seo-ai" className="underline">
            SEO AI
          </Link>{" "}
          ayarlarını kullanır.
        </p>

        {!aiAvailable ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            AI anahtarı tanımlı değil — şablon metin kullanılır. SEO AI sayfasından Gemini/OpenAI/Claude
            ekleyebilirsiniz.
          </p>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => setS({ ...s, enabled: e.target.checked })}
          />
          Otomasyonu etkinleştir (cron ile)
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Yayın modu">
            <select
              className={inputClass}
              value={s.mode}
              onChange={(e) => setS({ ...s, mode: e.target.value as "draft" | "auto" })}
            >
              <option value="draft">Taslak oluştur (önerilen)</option>
              <option value="auto">Doğrudan yayınla</option>
            </select>
          </AdminField>

          <AdminField label="Haftalık max yazı">
            <input
              type="number"
              min={1}
              max={14}
              className={inputClass}
              value={s.maxPostsPerWeek}
              onChange={(e) => setS({ ...s, maxPostsPerWeek: Number(e.target.value) || 2 })}
            />
          </AdminField>

          <AdminField label="Min. arama sayısı">
            <input
              type="number"
              min={1}
              max={100}
              className={inputClass}
              value={s.minSearchCount}
              onChange={(e) => setS({ ...s, minSearchCount: Number(e.target.value) || 2 })}
            />
          </AdminField>

          <AdminField label="Min. konu skoru">
            <input
              type="number"
              min={1}
              max={1000}
              className={inputClass}
              value={s.minTopicScore}
              onChange={(e) => setS({ ...s, minTopicScore: Number(e.target.value) || 4 })}
            />
          </AdminField>

          <AdminField label="Başlangıç tarihi">
            <input
              type="date"
              className={inputClass}
              value={s.dateRangeFrom}
              onChange={(e) => setS({ ...s, dateRangeFrom: e.target.value })}
            />
          </AdminField>

          <AdminField label="Bitiş tarihi">
            <input
              type="date"
              className={inputClass}
              value={s.dateRangeTo}
              onChange={(e) => setS({ ...s, dateRangeTo: e.target.value })}
            />
          </AdminField>

          <AdminField label="Cron ifadesi (bilgi)">
            <input
              className={inputClass}
              value={s.scheduleCron}
              onChange={(e) => setS({ ...s, scheduleCron: e.target.value })}
              placeholder="0 9 * * 1,4"
            />
          </AdminField>

          <AdminField label="Yazar adı">
            <input
              className={inputClass}
              value={s.author}
              onChange={(e) => setS({ ...s, author: e.target.value })}
              placeholder="Anatolian Paw"
            />
          </AdminField>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.linkProducts}
              onChange={(e) => setS({ ...s, linkProducts: e.target.checked })}
            />
            İlgili ürünleri yazıya ekle
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.includeProductViews}
              onChange={(e) => setS({ ...s, includeProductViews: e.target.checked })}
            />
            Popüler ürün görüntülemelerini dahil et
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.featuredOnHome}
              onChange={(e) => setS({ ...s, featuredOnHome: e.target.checked })}
            />
            Ana sayfa blog kartında göster
          </label>
        </div>

        <p className="text-xs text-zinc-500">
          Zamanlayıcı:{" "}
          <code className="rounded bg-zinc-100 px-1">
            GET /api/cron/blog-automation/run?secret=CRON_SECRET
          </code>{" "}
          — Windows Görev Zamanlayıcı veya harici cron ile {s.scheduleCron || "0 9 * * 1,4"} önerilir.
        </p>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
            Ayarları kaydet
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() => void generate()}
          >
            En iyi konudan üret
          </button>
        </div>
        {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
        {genResult?.postId ? (
          <p className="text-sm">
            <Link href={`/admin/blog/${genResult.postId}/edit`} className="font-medium underline">
              Yazıyı düzenle
            </Link>
            {genResult.slug ? (
              <>
                {" "}
                ·{" "}
                <a href={`/blogs/news/${genResult.slug}`} className="underline" target="_blank" rel="noreferrer">
                  Önizle
                </a>
              </>
            ) : null}
            {genResult.aiMessage ? <> — {genResult.aiMessage}</> : null}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-semibold">Konu kuyruğu</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Site araması, Google Search Console ve popüler ürünlerden skorlanmış konular. Yeşil = henüz
              blog yok.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">
              Gün
              <select
                className={`${inputClass} ml-2 w-auto`}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={7}>7</option>
                <option value={14}>14</option>
                <option value={30}>30</option>
              </select>
            </label>
            <button type="button" className={btnSecondary} disabled={loadingTopics} onClick={() => void loadTopics()}>
              Yenile
            </button>
          </div>
        </div>

        {loadingTopics ? (
          <p className="mt-4 text-sm text-zinc-500">Yükleniyor…</p>
        ) : topics.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Henüz yeterli arama verisi yok. Çerez onaylı ziyaretçiler arama yaptıkça burada görünür.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {topics.map((t) => (
              <li key={t.keyword} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{t.keyword}</p>
                  <p className="text-xs text-zinc-500">
                    Skor {t.score} · Arama {t.searchCount} · GSC {t.gscClicks} · Ürün görüntüleme{" "}
                    {t.productViewCount}
                    {t.sources.length ? ` · ${t.sources.join(", ")}` : ""}
                    {t.relatedProducts.length ? ` · ${t.relatedProducts.length} ürün` : ""}
                  </p>
                  {t.alreadyCovered ? (
                    <p className="text-xs text-amber-700">
                      Zaten kapsandı{t.coveredBySlug ? ` (${t.coveredBySlug})` : ""}
                    </p>
                  ) : (
                    <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      Yeni konu
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={busy}
                  onClick={() => void generate(t.keyword)}
                >
                  Taslak üret
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
