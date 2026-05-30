"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminHomeManageGuide } from "@/components/admin/AdminHomeManageGuide";
import { ShopPageEditor } from "@/components/editor/ShopPageEditor";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { EditorShopBlock } from "@/lib/blocks/editor-ids";
import type { HomepageMode } from "@/lib/site-settings";

export function AdminHomePageShell({
  pageId,
  pageTitle,
  initialBlocks,
  homepageMode,
}: {
  pageId: string;
  pageTitle: string;
  initialBlocks: EditorShopBlock[];
  homepageMode: HomepageMode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function reloadFromMirror(publish: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}/import-mirror-home`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
      });
      const data = (await res.json()) as { error?: string; blockCount?: number };
      if (!res.ok) {
        setMsg(data.error ?? "İçe aktarma başarısız");
        return;
      }
      setMsg(
        publish
          ? `Gerçek anasayfa yüklendi (${data.blockCount ?? "?"} blok). Vitrin güncellendi — sayfayı yenileyin.`
          : `Bloklar mirror'dan yüklendi (${data.blockCount ?? "?"}).`,
      );
      router.refresh();
    } catch {
      setMsg("Ağ hatası");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <div className="mx-4 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 md:mx-8">
        <p className="font-medium">Gerçek anasayfa — sürükle bırak</p>
        <p className="mt-1">
          Bloklar Techizmet Shop vitrin HTML&apos;inden alındı. Widget ekleyin, <strong>Yapı</strong> sekmesinde
          sıralayın, sağdan düzenleyin, <strong>Kaydet</strong> ile vitrine uygulayın.
          {homepageMode === "blocks"
            ? " Vitrin şu an bu sayfayı gösteriyor."
            : " Vitrin henüz mirror modunda — aşağıdan yayınlayın."}
        </p>
      </div>

      <AdminHomeManageGuide />

      <div className="mx-4 mb-4 flex flex-wrap items-center gap-2 md:mx-8">
        <button
          type="button"
          className={btnSecondary}
          disabled={busy}
          onClick={() => void reloadFromMirror(true)}
        >
          {busy ? "Yükleniyor…" : "Vitrinden yeniden yükle"}
        </button>
        <a href="/" target="_blank" rel="noreferrer" className={btnPrimary}>
          Vitrini kontrol et ↗
        </a>
        <Link href="/admin/theme" className={btnSecondary}>
          Tema
        </Link>
        {msg ? <span className="text-sm text-zinc-700">{msg}</span> : null}
      </div>

      <ShopPageEditor
        pageId={pageId}
        pageTitle={pageTitle}
        pageSlug="home"
        initialBlocks={initialBlocks}
        storePreview
      />
    </div>
  );
}
