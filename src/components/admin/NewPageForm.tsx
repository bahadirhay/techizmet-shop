"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

export function NewPageForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [usePreset, setUsePreset] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug: slug || undefined, useStoreHomePreset: usePreset }),
    });
    const json = (await res.json()) as { error?: string; page?: { id: string } };
    if (!res.ok) {
      setErr(json.error ?? "Oluşturulamadı");
      return;
    }
    router.push(`/admin/pages/${json.page!.id}/edit`);
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl border bg-white p-6">
      <AdminField label="Sayfa başlığı *">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </AdminField>
      <AdminField label="URL slug" hint="Boş bırakılırsa başlıktan üretilir">
        <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </AdminField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={usePreset} onChange={(e) => setUsePreset(e.target.checked)} />
        Techizmet Shop ana sayfa blok şablonu ile başla
      </label>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button type="submit" className={btnPrimary}>
        Oluştur ve düzenle
      </button>
    </form>
  );
}
