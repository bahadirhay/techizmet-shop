"use client";

import type { StoreInstagramPost } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

function strField(v: string | null | undefined) {
  return v ?? "";
}

function PostRow({
  post: p,
  onTogglePublished,
  onRemove,
  onSaved,
}: {
  post: StoreInstagramPost;
  onTogglePublished: (post: StoreInstagramPost, published: boolean) => void;
  onRemove: (id: string) => void;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(strField(p.title));
  const [linkHref, setLinkHref] = useState(strField(p.linkHref));
  const [linkLabel, setLinkLabel] = useState(strField(p.linkLabel));
  const [coverImage, setCoverImage] = useState(strField(p.coverImage));
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rowMsg, setRowMsg] = useState<string | null>(null);

  const thumb = p.coverImage || p.thumbnailUrl || p.mediaUrl;

  async function saveVitrin() {
    setSaving(true);
    setRowMsg(null);
    const res = await fetch(`/api/admin/instagram/posts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || null,
        linkHref: linkHref.trim() || null,
        linkLabel: linkLabel.trim() || null,
        coverImage: coverImage.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setRowMsg("Kaydedilemedi");
      return;
    }
    setRowMsg("Kaydedildi");
    onSaved();
  }

  async function refreshOembed() {
    setRefreshing(true);
    setRowMsg(null);
    const res = await fetch(`/api/admin/instagram/posts/${p.id}`, { method: "POST" });
    setRefreshing(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setRowMsg(data.error ?? "Yenilenemedi");
      return;
    }
    setRowMsg("Kapak güncellendi");
    onSaved();
  }

  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex gap-3">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-20 w-14 shrink-0 rounded object-cover bg-zinc-100" />
        ) : (
          <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-500">
            Kapak yok
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">
            {p.title?.trim() || p.caption?.split("\n")[0]?.trim() || "Instagram gönderisi"}
          </p>
          <a
            href={p.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-xs text-emerald-700 hover:underline"
          >
            {p.permalink}
          </a>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="flex items-center gap-1.5 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={p.published}
                onChange={(e) => onTogglePublished(p, e.target.checked)}
              />
              Vitrinde göster
            </label>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-zinc-600 underline"
            >
              {open ? "Kapat" : "Düzenle"}
            </button>
            <button
              type="button"
              onClick={() => void refreshOembed()}
              disabled={refreshing}
              className="text-xs text-zinc-600 underline disabled:opacity-50"
            >
              {refreshing ? "Yenileniyor…" : "Kapağı yenile"}
            </button>
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              className="text-xs text-red-600 underline"
            >
              Sil
            </button>
          </div>
          {rowMsg ? <p className="mt-1 text-xs text-zinc-500">{rowMsg}</p> : null}
        </div>
      </div>
      {open ? (
        <div className="mt-3 grid gap-2 border-t border-zinc-100 pt-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="text-zinc-600">Başlık</span>
            <input
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-600">Kapak görseli URL</span>
            <input
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-600">Buton linki</span>
            <input
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
              value={linkHref}
              onChange={(e) => setLinkHref(e.target.value)}
              placeholder="Ürün veya sayfa URL"
            />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-600">Buton metni</span>
            <input
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="İncele"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => void saveVitrin()}
              disabled={saving}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function InstagramAdminClient({ initialPosts }: { initialPosts: StoreInstagramPost[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [permalink, setPermalink] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    router.refresh();
    void fetch("/api/admin/instagram/posts")
      .then((r) => r.json())
      .then((d: { posts?: StoreInstagramPost[] }) => {
        if (d.posts) setPosts(d.posts);
      })
      .catch(() => {});
  }, [router]);

  async function addPost() {
    setAdding(true);
    setMsg(null);
    const res = await fetch("/api/admin/instagram/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permalink }),
    });
    setAdding(false);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Eklenemedi");
      return;
    }
    setPermalink("");
    setMsg("Eklendi — vitrinde göstermek için kutuyu işaretleyin");
    reload();
  }

  async function togglePublished(post: StoreInstagramPost, published: boolean) {
    const res = await fetch(`/api/admin/instagram/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published }),
    });
    if (!res.ok) return;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, published } : p)));
  }

  async function remove(id: string) {
    if (!window.confirm("Bu gönderi silinsin mi?")) return;
    const res = await fetch(`/api/admin/instagram/posts/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Gönderi ekle</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Instagram gönderi veya reel bağlantısı yapıştırın. Kapak otomatik çekilir.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded border border-zinc-200 px-3 py-2 text-sm"
            placeholder="https://www.instagram.com/p/…"
            value={permalink}
            onChange={(e) => setPermalink(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void addPost()}
            disabled={adding || !permalink.trim()}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {adding ? "Ekleniyor…" : "Ekle"}
          </button>
        </div>
        {msg ? <p className="mt-2 text-sm text-zinc-600">{msg}</p> : null}
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-zinc-500">Henüz gönderi yok.</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <PostRow
              key={p.id}
              post={p}
              onTogglePublished={togglePublished}
              onRemove={remove}
              onSaved={reload}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
