"use client";

import { useCallback, useEffect, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { AdminReviewRow, AdminReviewCounts } from "@/lib/admin/reviews/service";

type Tab = "pending" | "approved" | "rejected" | "all";
type ProductOption = { id: string; title: string };

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400";

function Stars({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap" aria-label={`5 üzerinden ${value}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? "text-amber-500" : "text-zinc-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-700",
  };
  const label: Record<string, string> = {
    pending: "Onay bekliyor",
    approved: "Yayında",
    rejected: "Reddedildi",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-zinc-100 text-zinc-700"}`}>
      {label[status] ?? status}
    </span>
  );
}

export function ReviewsModerationPanel() {
  const [tab, setTab] = useState<Tab>("pending");
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [counts, setCounts] = useState<AdminReviewCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      const qs = t === "all" ? "" : `?status=${t}`;
      const res = await fetch(`/api/admin/reviews${qs}`);
      if (!res.ok) throw new Error("Yüklenemedi");
      const data = (await res.json()) as {
        reviews: AdminReviewRow[];
        counts: AdminReviewCounts;
        products: ProductOption[];
      };
      setReviews(data.reviews);
      setCounts(data.counts);
      setProducts(data.products);
    } catch {
      setMsg("Yorumlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  async function act(id: string, action: "approve" | "reject" | "pending") {
    setBusy(`${id}-${action}`);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      await load(tab);
    } catch {
      setMsg("İşlem başarısız.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bu yorum silinsin mi?")) return;
    setBusy(`${id}-del`);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load(tab);
    } catch {
      setMsg("Silinemedi.");
    } finally {
      setBusy(null);
    }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "pending", label: "Onay bekleyen", count: counts.pending },
    { id: "approved", label: "Yayında", count: counts.approved },
    { id: "rejected", label: "Reddedilen", count: counts.rejected },
    { id: "all", label: "Tümü", count: counts.total },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                tab === t.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {t.label}
              {typeof t.count === "number" ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>
        <button type="button" className={btnPrimary} onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Vazgeç" : "Manuel yorum ekle"}
        </button>
      </div>

      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}

      {showAdd ? (
        <AddReviewForm
          products={products}
          onDone={() => {
            setShowAdd(false);
            void load(tab);
          }}
        />
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-zinc-500">Bu sekmede yorum yok.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              {editId === r.id ? (
                <EditReviewForm
                  review={r}
                  onCancel={() => setEditId(null)}
                  onDone={() => {
                    setEditId(null);
                    void load(tab);
                  }}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-medium text-zinc-900">{r.authorName}</span>
                    <StatusBadge status={r.status} />
                    {r.source === "admin" ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        Manuel
                      </span>
                    ) : null}
                    {r.isVerifiedPurchase ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        Doğrulanmış
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-zinc-400">
                      {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ürün: <span className="font-medium text-zinc-700">{r.productTitle}</span>
                  </p>
                  {r.title ? <p className="mt-2 font-medium text-zinc-900">{r.title}</p> : null}
                  <p className="mt-1 whitespace-pre-line text-sm text-zinc-700">{r.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status !== "approved" ? (
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={busy === `${r.id}-approve`}
                        onClick={() => void act(r.id, "approve")}
                      >
                        Onayla
                      </button>
                    ) : null}
                    {r.status !== "rejected" ? (
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={busy === `${r.id}-reject`}
                        onClick={() => void act(r.id, "reject")}
                      >
                        Reddet
                      </button>
                    ) : null}
                    {r.status !== "pending" ? (
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={busy === `${r.id}-pending`}
                        onClick={() => void act(r.id, "pending")}
                      >
                        Beklemeye al
                      </button>
                    ) : null}
                    <button type="button" className={btnSecondary} onClick={() => setEditId(r.id)}>
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      disabled={busy === `${r.id}-del`}
                      onClick={() => void remove(r.id)}
                    >
                      Sil
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={i <= value ? "text-amber-500" : "text-zinc-300"}
          aria-label={`${i} yıldız`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function AddReviewForm({
  products,
  onDone,
}: {
  products: ProductOption[];
  onDone: () => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [verified, setVerified] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          authorName,
          rating,
          title,
          body,
          isVerifiedPurchase: verified,
          status: "approved",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Eklenemedi");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="font-medium text-zinc-900">Manuel yorum ekle</h3>
      <p className="text-xs text-zinc-500">
        Yalnızca gerçek müşteri yorumlarını ekleyin. Uydurma puanlar Google cezasına yol açar.
      </p>
      <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      <RatingPicker value={rating} onChange={setRating} />
      <input
        className={inputCls}
        placeholder="Müşteri adı"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
      />
      <input
        className={inputCls}
        placeholder="Başlık (opsiyonel)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className={inputCls}
        rows={3}
        placeholder="Yorum metni"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        Doğrulanmış alışveriş olarak işaretle
      </label>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button type="button" className={btnPrimary} disabled={busy} onClick={() => void submit()}>
        {busy ? "Ekleniyor…" : "Ekle ve yayınla"}
      </button>
    </div>
  );
}

function EditReviewForm({
  review,
  onCancel,
  onDone,
}: {
  review: AdminReviewRow;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [authorName, setAuthorName] = useState(review.authorName);
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title ?? "");
  const [body, setBody] = useState(review.body);
  const [verified, setVerified] = useState(review.isVerifiedPurchase);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          authorName,
          rating,
          title,
          body,
          isVerifiedPurchase: verified,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Güncellenemedi");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <RatingPicker value={rating} onChange={setRating} />
      <input className={inputCls} value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
      <input
        className={inputCls}
        placeholder="Başlık"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea className={inputCls} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        Doğrulanmış alışveriş
      </label>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}
