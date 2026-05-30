"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { DeleteRecordButton } from "@/components/admin/DeleteRecordButton";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { slugify } from "@/lib/admin/slug";

export type CategoryFormData = {
  id?: string;
  title: string;
  slug: string;
  parentId: string;
  description: string;
  imageUrl: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
};

export function CategoryForm({
  initial,
  parents,
}: {
  initial: CategoryFormData;
  parents: { id: string; title: string; parentTitle?: string | null }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof CategoryFormData>(key: K, val: CategoryFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const url = form.id ? `/api/admin/categories/${form.id}` : "/api/admin/categories";
    const res = await fetch(url, {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        parentId: form.parentId || null,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{form.id ? "Kategori düzenle" : "Yeni kategori"}</h1>
        <div className="flex gap-2">
          {form.id ? (
            <DeleteRecordButton
              apiUrl={`/api/admin/categories/${form.id}`}
              redirectTo="/admin/categories"
            />
          ) : null}
          <button type="button" className={btnSecondary} onClick={() => router.back()}>
            Geri
          </button>
        </div>
      </div>
      <div className="admin-card admin-card-pad space-y-4">
        <AdminField
          label="Üst alan başlığı / kategori adı *"
          hint="Kategori sayfasındaki büyük başlık bu alandan gelir."
        >
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!form.id && !form.slug) set("slug", slugify(e.target.value));
            }}
            required
          />
        </AdminField>
        <AdminField label="URL slug" hint="Vitrin adresi: /categories/slug">
          <input className={inputClass} value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </AdminField>
        <AdminField label="Üst kategori">
          <select className={inputClass} value={form.parentId} onChange={(e) => set("parentId", e.target.value)}>
            <option value="">— Ana kategori —</option>
            {parents
              .filter((p) => p.id !== form.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parentTitle ? `${p.parentTitle} › ` : ""}
                  {p.title}
                </option>
              ))}
          </select>
        </AdminField>
        <AdminField label="Sıra">
          <input
            type="number"
            className={inputClass}
            value={form.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
          />
        </AdminField>
        <AdminField
          label="Üst alan açıklaması"
          hint="Kategori sayfasında başlığın altındaki kısa açıklama burada görünür. Boş bırakırsanız metin alanı gizlenir."
        >
          <textarea
            className={inputClass}
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </AdminField>
        <ImageUploadField
          label="Kategori üst alan görseli"
          value={form.imageUrl}
          onChange={(url) => set("imageUrl", url)}
          aspectRatio={16 / 6}
          outputWidth={1600}
          outputHeight={600}
          hint="İsteğe bağlıdır. Kategori üst alanında görsel göstermek isterseniz kullanın; yüklemeden de başlık ve açıklamayı yönetebilirsiniz."
        />
        <AdminField label="SEO başlık">
          <input className={inputClass} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
        </AdminField>
        <AdminField label="SEO açıklama">
          <textarea
            className={inputClass}
            rows={2}
            value={form.seoDescription}
            onChange={(e) => set("seoDescription", e.target.value)}
          />
        </AdminField>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {form.slug ? (
          <a
            href={`/collections/all?category=${form.slug.replace(/^\//, "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--kn-brand)] hover:underline"
          >
            Vitrinde önizle ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
