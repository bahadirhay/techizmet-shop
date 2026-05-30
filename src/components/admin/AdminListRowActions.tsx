"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminListRowActions({
  editHref,
  previewHref,
  apiUrl,
  enabled,
  flagField,
  deleteConfirmText,
}: {
  editHref: string;
  previewHref?: string;
  apiUrl: string;
  enabled: boolean;
  flagField: "published" | "active";
  deleteConfirmText?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flagField]: !enabled }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      window.alert(json.error ?? "Durum güncellenemedi");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(deleteConfirmText ?? "Bu kaydı silmek istediğinize emin misiniz?")) return;
    setBusy(true);
    const res = await fetch(apiUrl, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      window.alert(json.error ?? "Silme işlemi başarısız");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
      <Link href={editHref} className="text-[var(--kn-brand)]">
        Düzenle
      </Link>
      {previewHref ? (
        <a href={previewHref} target="_blank" rel="noreferrer" className="text-zinc-500">
          Vitrin
        </a>
      ) : null}
      <button
        type="button"
        className={enabled ? "text-amber-700" : "text-emerald-700"}
        disabled={busy}
        onClick={toggle}
      >
        {enabled ? "Pasif yap" : "Aktif yap"}
      </button>
      <button type="button" className="text-red-600" disabled={busy} onClick={remove}>
        Sil
      </button>
    </div>
  );
}
