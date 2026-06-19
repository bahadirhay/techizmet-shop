"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor";
import { MirrorImageField } from "@/components/admin/MirrorImageField";
import { PlainHtmlTextarea } from "@/components/admin/PlainHtmlTextarea";

export type BlogPostFormValues = {
  id?: string;
  slug: string;
  titleTr: string;
  titleEn: string;
  excerptTr: string;
  excerptEn: string;
  bodyTr: string;
  bodyEn: string;
  imageUrl: string;
  author: string;
  publishedAt: string;
  published: boolean;
  featuredOnHome: boolean;
  sortOrder: string;
  seoTitle: string;
  seoDescription: string;
};

export function BlogPostForm({ initial }: { initial: BlogPostFormValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const payload = {
      ...v,
      sortOrder: Number(v.sortOrder) || 0,
    };
    const url = v.id ? `/api/admin/blog/${v.id}` : "/api/admin/blog";
    const res = await fetch(url, {
      method: v.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as { error?: string; post?: { id: string } };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kayıt başarısız");
      return;
    }
    setMsg("Kaydedildi");
    if (!v.id && j.post?.id) {
      router.push(`/admin/blog/${j.post.id}/edit`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mt-6 max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Başlık (Türkçe) *">
          <input
            className={inputClass}
            value={v.titleTr}
            onChange={(e) => setV({ ...v, titleTr: e.target.value })}
          />
        </AdminField>
        <AdminField label="Başlık (İngilizce)">
          <input
            className={inputClass}
            value={v.titleEn}
            onChange={(e) => setV({ ...v, titleEn: e.target.value })}
          />
        </AdminField>
        <AdminField label="URL slug">
          <input
            className={inputClass}
            value={v.slug}
            onChange={(e) => setV({ ...v, slug: e.target.value })}
            placeholder="ornek-yazi"
          />
          <p className="mt-1 text-xs text-zinc-500">/blogs/news/{v.slug || "…"}</p>
        </AdminField>
        <AdminField label="Yayın tarihi">
          <input
            className={inputClass}
            type="date"
            value={v.publishedAt}
            onChange={(e) => setV({ ...v, publishedAt: e.target.value })}
          />
        </AdminField>
      </div>

      <MirrorImageField
        editorChrome
        label="Kapak görseli"
        value={v.imageUrl}
        aspectRatio={1180 / 760}
        outputWidth={1180}
        outputHeight={760}
        onChange={(url) => setV({ ...v, imageUrl: url })}
      />

      <AdminField label="Yazar">
        <input
          className={inputClass}
          value={v.author}
          onChange={(e) => setV({ ...v, author: e.target.value })}
        />
      </AdminField>

      <PlainHtmlTextarea
        lightChrome
        label="Özet (Türkçe) — liste ve ana sayfa kartı"
        rows={3}
        valueHtml={v.excerptTr}
        onChangeHtml={(html) => setV({ ...v, excerptTr: html })}
      />
      <PlainHtmlTextarea
        lightChrome
        label="Özet (İngilizce)"
        rows={3}
        valueHtml={v.excerptEn}
        onChangeHtml={(html) => setV({ ...v, excerptEn: html })}
      />

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">İçerik (Türkçe)</h3>
        <AdminRichTextEditor
          label="Yazı gövdesi"
          hint="Biçimlendirme araç çubuğunu kullanın; kaynak kodu için «code» düğmesine tıklayın."
          value={v.bodyTr}
          onChange={(html) => setV({ ...v, bodyTr: html })}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">İçerik (English)</h3>
        <AdminRichTextEditor
          label="Body"
          hint="Use the toolbar to format text. English visitors see this when provided."
          value={v.bodyEn}
          onChange={(html) => setV({ ...v, bodyEn: html })}
        />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="SEO başlık">
          <input
            className={inputClass}
            value={v.seoTitle}
            onChange={(e) => setV({ ...v, seoTitle: e.target.value })}
          />
        </AdminField>
        <AdminField label="Sıra (küçük önce)">
          <input
            className={inputClass}
            type="number"
            value={v.sortOrder}
            onChange={(e) => setV({ ...v, sortOrder: e.target.value })}
          />
        </AdminField>
      </div>

      <AdminField label="SEO açıklama">
        <textarea
          className={`${inputClass} min-h-[72px]`}
          value={v.seoDescription}
          onChange={(e) => setV({ ...v, seoDescription: e.target.value })}
        />
      </AdminField>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.published}
            onChange={(e) => setV({ ...v, published: e.target.checked })}
          />
          Yayında (vitrinde görünür)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.featuredOnHome}
            onChange={(e) => setV({ ...v, featuredOnHome: e.target.checked })}
          />
          Ana sayfada öne çıkar
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
          Kaydet
        </button>
        <Link href="/admin/blog" className={btnSecondary}>
          Listeye dön
        </Link>
        {v.id && v.published ? (
          <a
            href={`/blogs/news/${v.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--kn-brand)] underline"
          >
            Vitrinde aç ↗
          </a>
        ) : null}
        {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
      </div>
    </div>
  );
}
