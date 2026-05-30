"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MirrorImageField } from "@/components/admin/MirrorImageField";
import type { BlogPostAdminEditorRow } from "@/lib/blog/blog-posts-server";

/** King Noor blog kartı (~1180×760) */
const BLOG_COVER_ASPECT = 1180 / 760;

export function BlogPostsDbPanel({
  initialPosts,
  onImageSaved,
}: {
  initialPosts: BlogPostAdminEditorRow[];
  onImageSaved?: () => void;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  async function saveImage(id: string, imageUrl: string) {
    setSavingId(id);
    setError(null);
    setSavedId(null);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageUrl || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Kaydedilemedi");
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, imageUrl: imageUrl || null } : p)),
      );
      setSavedId(id);
      onImageSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSavingId(null);
    }
  }

  if (!posts.length) {
    return (
      <div className="mt-4 space-y-2 border-t border-zinc-700 pt-4">
        <p className="text-xs text-zinc-500">Henüz blog yazısı yok.</p>
        <Link href="/admin/blog/new" className="text-xs text-sky-400 hover:underline">
          Yeni yazı ekle →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 border-t border-zinc-700 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Blog kapak görselleri ({posts.length})
      </p>
      <p className="text-xs text-sky-200/90">
        Görseller veritabanında saklanır. Sürükleyip bırakın veya dosya seçin — yükleme sonrası otomatik
        kaydedilir.
      </p>
      <Link href="/admin/blog" className="inline-block text-xs text-sky-400 hover:underline">
        Başlık, metin ve yayın → Blog yönetimi
      </Link>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {posts.map((post, index) => (
        <details
          key={post.id}
          className="rounded-lg border border-zinc-700 bg-zinc-950/80 p-3"
          open={index === 0}
        >
          <summary className="cursor-pointer text-sm font-medium text-zinc-200">
            {post.titleTr}
            {!post.published ? (
              <span className="ml-2 text-xs font-normal text-amber-400/90">(taslak)</span>
            ) : null}
            {savedId === post.id ? (
              <span className="ml-2 text-xs font-normal text-emerald-400">Kaydedildi</span>
            ) : null}
          </summary>
          <div className="mt-3">
            <MirrorImageField
              editorChrome
              label="Kapak görseli"
              value={post.imageUrl ?? ""}
              aspectRatio={BLOG_COVER_ASPECT}
              outputWidth={1180}
              outputHeight={760}
              onChange={(url) => void saveImage(post.id, url)}
            />
            {savingId === post.id ? (
              <p className="mt-1 text-xs text-zinc-500">Kaydediliyor…</p>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
