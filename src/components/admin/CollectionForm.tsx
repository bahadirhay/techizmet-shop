"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { DeleteRecordButton } from "@/components/admin/DeleteRecordButton";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { slugify } from "@/lib/admin/slug";

export type CollectionFormData = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: string;
};

export function CollectionForm({
  initial,
  imageFromMirrorOnly = false,
}: {
  initial: CollectionFormData;
  /** DB boş; önizleme Techizmet Shop şablonundan */
  imageFromMirrorOnly?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof CollectionFormData>(key: K, val: CollectionFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const url = form.id ? `/api/admin/collections/${form.id}` : "/api/admin/collections";
    const res = await fetch(url, {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sortOrder: parseInt(form.sortOrder, 10) || 0 }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    router.push("/admin/collections");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{form.id ? "Koleksiyon düzenle" : "Yeni koleksiyon"}</h1>
        <div className="flex gap-2">
          {form.id ? (
            <DeleteRecordButton
              apiUrl={`/api/admin/collections/${form.id}`}
              redirectTo="/admin/collections"
            />
          ) : null}
          <button type="button" className={btnSecondary} onClick={() => router.back()}>
            Geri
          </button>
        </div>
      </div>
      <p className="text-sm text-zinc-500">
        Başlık, slug, kapak görseli, sıra ve açıklama{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">shop.collection</code> tablosunda saklanır;
        kayıttan sonra vitrin kartları ve koleksiyon sayfası banner’ı güncellenir.
      </p>
      <div className="admin-card admin-card-pad space-y-4">
        <AdminField label="Başlık *">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!form.id && !form.slug) set("slug", slugify(e.target.value));
            }}
          />
        </AdminField>
        <AdminField label="Slug">
          <input className={inputClass} value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </AdminField>
        <ImageUploadField
          label="Kapak görseli"
          value={form.imageUrl}
          onChange={(url) => set("imageUrl", url)}
          aspectRatio={4 / 3}
          outputWidth={1200}
          outputHeight={900}
          hint={
            imageFromMirrorOnly
              ? "Görsel vitrin şablonundan gösteriliyor. Kaydet’e basınca veritabanına yazılır."
              : "4:3 kırpma — koleksiyon kartları için önerilir."
          }
        />
        <AdminField label="Sıra">
          <input
            type="number"
            className={inputClass}
            value={form.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
          />
        </AdminField>
        <AdminField label="Açıklama">
          <textarea
            className={inputClass}
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </AdminField>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {form.slug ? (
            <a
              href={`/collections/${form.slug.replace(/^\//, "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--kn-brand)] hover:underline"
            >
              Vitrinde önizle ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
