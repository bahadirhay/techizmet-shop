"use client";

import { MirrorImageField } from "@/components/admin/MirrorImageField";
import { PlainHtmlTextarea } from "@/components/admin/PlainHtmlTextarea";
import type { FeaturedBlogPostEdit } from "@/lib/mirror-featured-blog";

export function FeaturedBlogSectionFields({
  posts,
  onChange,
}: {
  posts: FeaturedBlogPostEdit[];
  onChange: (posts: FeaturedBlogPostEdit[]) => void;
}) {
  if (!posts.length) {
    return (
      <p className="mt-3 text-xs text-zinc-500">
        Blog kartı bulunamadı. Önce <code>npm run theme:import</code> çalıştırın.
      </p>
    );
  }

  function patchPost(index: number, patch: Partial<FeaturedBlogPostEdit>) {
    onChange(posts.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <div className="mt-4 space-y-4 border-t border-zinc-700 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Blog yazıları ({posts.length})
      </p>
      <p className="text-xs text-sky-200/90">
        Görseller veritabanında (sayfa ayarları) saklanır. Önizleme + sürükle-bırak ile değiştirin.
      </p>
      {posts.map((post, index) => (
        <details
          key={post.postId}
          className="rounded-lg border border-zinc-700 bg-zinc-950/80 p-3"
          open={index === 0}
        >
          <summary className="cursor-pointer text-sm font-medium text-zinc-200">
            Yazı {index + 1}: {post.titleTr || post.titleEn || post.postId}
          </summary>
          <div className="mt-3 space-y-3">
            <MirrorImageField
              editorChrome
              label="Kapak görseli"
              value={post.imageUrl ?? ""}
              aspectRatio={1180 / 760}
              outputWidth={1180}
              outputHeight={760}
              onChange={(url) => patchPost(index, { imageUrl: url || undefined })}
            />
            <label className="block text-xs text-zinc-400">
              Link (tıklanınca)
              <input
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                value={post.href ?? ""}
                onChange={(e) => patchPost(index, { href: e.target.value || undefined })}
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Başlık (Türkçe)
              <input
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                value={post.titleTr ?? ""}
                onChange={(e) => patchPost(index, { titleTr: e.target.value })}
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Başlık (İngilizce)
              <input
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                value={post.titleEn ?? ""}
                onChange={(e) => patchPost(index, { titleEn: e.target.value })}
              />
            </label>
            <PlainHtmlTextarea
              label="Özet (Türkçe)"
              rows={3}
              valueHtml={post.descTr ?? ""}
              onChangeHtml={(html) => patchPost(index, { descTr: html || undefined })}
            />
            <PlainHtmlTextarea
              label="Özet (İngilizce)"
              rows={3}
              valueHtml={post.descEn ?? ""}
              onChangeHtml={(html) => patchPost(index, { descEn: html || undefined })}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-zinc-400">
                Tarih
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm"
                  value={post.dateLabel ?? ""}
                  onChange={(e) => patchPost(index, { dateLabel: e.target.value || undefined })}
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Yazar
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm"
                  value={post.author ?? ""}
                  onChange={(e) => patchPost(index, { author: e.target.value || undefined })}
                />
              </label>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
