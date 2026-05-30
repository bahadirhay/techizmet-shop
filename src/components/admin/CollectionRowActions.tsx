"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CollectionRowActions({
  id,
  slug,
  published,
}: {
  id: string;
  slug: string;
  published: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>, action: string) {
    setBusy(action);
    const res = await fetch(`/api/admin/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(null);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      alert(json.error ?? "İşlem başarısız");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm(`“${slug}” koleksiyonunu silmek istediğinize emin misiniz? Ürün atamaları kaldırılır.`)) {
      return;
    }
    setBusy("delete");
    const res = await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      alert(json.error ?? "Silinemedi");
      return;
    }
    router.refresh();
  }

  const linkCls = "text-sm hover:underline disabled:opacity-50";
  const isBusy = busy !== null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <Link href={`/admin/collections/${id}/edit`} className={`${linkCls} text-[var(--kn-brand)]`}>
        Düzenle
      </Link>
      {!published ? (
        <button
          type="button"
          className={`${linkCls} text-emerald-700`}
          disabled={isBusy}
          onClick={() => void patch({ published: true }, "published")}
        >
          {busy === "published" ? "…" : "Aktif"}
        </button>
      ) : (
        <button
          type="button"
          className={`${linkCls} text-amber-700`}
          disabled={isBusy}
          onClick={() => void patch({ published: false }, "published")}
        >
          {busy === "published" ? "…" : "Pasif"}
        </button>
      )}
      <button
        type="button"
        className={`${linkCls} text-red-600`}
        disabled={isBusy}
        onClick={() => void remove()}
      >
        {busy === "delete" ? "…" : "Sil"}
      </button>
      <Link href={`/collections/${slug}`} target="_blank" className={`${linkCls} text-zinc-500`}>
        Vitrin
      </Link>
    </div>
  );
}
