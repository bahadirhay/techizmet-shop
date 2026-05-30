"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { DeleteRecordButton } from "@/components/admin/DeleteRecordButton";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { slugify } from "@/lib/admin/slug";

export type BrandFormData = {
  id?: string;
  name: string;
  slug: string;
  logoUrl: string;
};

export function BrandForm({ initial }: { initial: BrandFormData }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof BrandFormData>(key: K, val: BrandFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const url = form.id ? `/api/admin/brands/${form.id}` : "/api/admin/brands";
    const res = await fetch(url, {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    router.push("/admin/brands");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{form.id ? "Marka düzenle" : "Yeni marka"}</h1>
        <div className="flex gap-2">
          {form.id ? (
            <DeleteRecordButton apiUrl={`/api/admin/brands/${form.id}`} redirectTo="/admin/brands" />
          ) : null}
          <button type="button" className={btnSecondary} onClick={() => router.back()}>
            Geri
          </button>
        </div>
      </div>
      <div className="admin-card admin-card-pad space-y-4">
        <AdminField label="Marka adı *">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!form.id && !form.slug) set("slug", slugify(e.target.value));
            }}
            required
          />
        </AdminField>
        <AdminField label="URL slug">
          <input className={inputClass} value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </AdminField>
        <ImageUploadField
          label="Logo"
          value={form.logoUrl}
          onChange={(url) => set("logoUrl", url)}
          aspectRatio={3}
          outputWidth={400}
          outputHeight={133}
        />
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
