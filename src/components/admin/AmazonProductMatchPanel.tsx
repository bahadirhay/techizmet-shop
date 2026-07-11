"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { amazonBrandApprovalUrl } from "@/lib/marketplace/amazon/errors";

type CategoryOption = { id: string; label: string };

type ProductRow = {
  id: string;
  title: string;
  sku: string | null;
  amazonSku: string | null;
  amazonAsin: string | null;
  barcode: string | null;
  imageUrl: string | null;
  categoryTitle: string | null;
  stockQty: number;
  searchText: string;
  listingStatus: string;
  lastError: string | null;
};

function rowStatusLabel(p: ProductRow): { text: string; cls: string } {
  if (p.listingStatus === "active") {
    return { text: "yayında", cls: "text-green-600" };
  }
  if (p.listingStatus === "pending" && p.amazonAsin) {
    return { text: "Amazon'da (eksik teklif)", cls: "text-amber-600" };
  }
  return STATUS_LABEL[p.listingStatus] ?? STATUS_LABEL.none;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  none: { text: "gönderilmedi", cls: "text-zinc-400" },
  pending: { text: "Amazon onayında", cls: "text-amber-600" },
  active: { text: "yayında", cls: "text-green-600" },
  inactive: { text: "pasif", cls: "text-zinc-500" },
  rejected: { text: "reddedildi", cls: "text-red-600" },
  exported: { text: "gönderildi", cls: "text-blue-600" },
  error: { text: "hata", cls: "text-red-600" },
};

const RESEND_STATUSES = new Set(["pending", "rejected", "exported", "error"]);

function ErrorText({ text, muted }: { text: string; muted?: boolean }) {
  const parts = text.split(/(https:\/\/[^\s]+)/g);
  return (
    <p className={`mt-0.5 max-w-[14rem] text-[11px] ${muted ? "text-amber-700" : "text-red-600"}`}>
      {parts.map((part, i) =>
        part.startsWith("https://") ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline">
            {part.length > 48 ? "Onay formunu aç →" : part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function StatusMessage({ msg, errors }: { msg: string; errors: string[] }) {
  const isError =
    msg.startsWith("✗") ||
    msg.toLowerCase().includes("başarısız") ||
    msg.toLowerCase().includes("hata") ||
    msg.toLowerCase().includes("reddedildi");
  const isSuccess = msg.startsWith("✓") || msg.includes("gönderildi");
  const cls = isError
    ? "border-red-300 bg-red-50 text-red-950"
    : isSuccess
      ? "border-green-300 bg-green-50 text-green-950"
      : "border-blue-300 bg-blue-50 text-blue-950";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>
      <p className="font-medium">{msg}</p>
      {errors.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AmazonProductMatchPanel({
  categories,
  tablesReady = true,
}: {
  categories: CategoryOption[];
  tablesReady?: boolean;
}) {
  const [localCategoryId, setLocalCategoryId] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadProducts = useCallback(async (options?: { syncAmazon?: boolean }) => {
    setBusy(true);
    if (options?.syncAmazon) {
      setMsg("Amazon'dan güncel durumlar alınıyor…");
    } else {
      setMsg(null);
      setErrors([]);
    }
    try {
      const qs = new URLSearchParams();
      if (localCategoryId) qs.set("categoryId", localCategoryId);
      if (options?.syncAmazon) qs.set("syncAmazon", "1");
      const res = await fetch(`/api/admin/integrations/marketplaces/amazon/products?${qs}`);
      const json = (await res.json().catch(() => ({}))) as { products?: ProductRow[]; error?: string };
      if (!res.ok) {
        setMsg(`✗ ${json.error ?? "Ürünler yüklenemedi"}`);
        return;
      }
      setProducts(json.products ?? []);
      setSelected(new Set());
      setLoaded(true);
      setMsg(
        options?.syncAmazon
          ? `✓ Amazon durumları güncellendi · ${json.products?.length ?? 0} ürün`
          : `✓ ${json.products?.length ?? 0} ürün listelendi`,
      );
    } catch {
      setMsg("✗ Bağlantı hatası — tekrar deneyin");
    } finally {
      setBusy(false);
    }
  }, [localCategoryId]);

  useEffect(() => {
    if (tablesReady) void loadProducts({ syncAmazon: true });
  }, [tablesReady, loadProducts]);

  async function verifyOnAmazon() {
    setVerifyBusy(true);
    setMsg("Amazon'da ilan durumları kontrol ediliyor…");
    setErrors([]);
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/amazon/verify", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setMsg(`✗ ${json.error ?? "Doğrulama başarısız"}`);
        return;
      }
      setMsg(`✓ ${json.message ?? "Doğrulandı"}`);
      await loadProducts();
    } catch {
      setMsg("✗ Doğrulama hatası");
    } finally {
      setVerifyBusy(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleProducts = products.filter((p) => {
    if (statusFilter !== "all" && p.listingStatus !== statusFilter) return false;
    return search.trim() ? p.searchText.includes(search.trim().toLocaleLowerCase("tr")) : true;
  });

  function toggleAll() {
    if (selected.size === visibleProducts.length) setSelected(new Set());
    else setSelected(new Set(visibleProducts.map((p) => p.id)));
  }

  async function sendProductIds(ids: string[], label: string) {
    if (ids.length === 0) {
      setMsg("⚠️ Gönderilecek ürün yok");
      return;
    }
    setSending(true);
    setErrors([]);
    setMsg(`${label} — ${ids.length} ürün Amazon'a gönderiliyor… (30–120 sn sürebilir)`);
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/amazon/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        result?: { ok: boolean; message: string; errors?: string[] };
        error?: string;
      };
      if (!res.ok) {
        setMsg(`✗ ${json.error ?? "Gönderim başarısız"}`);
        return;
      }
      const r = json.result;
      setErrors(r?.errors ?? []);
      setMsg(`${r?.ok ? "✓" : "✗"} ${r?.message ?? "Gönderildi"}`);
      await loadProducts({ syncAmazon: true });
    } catch {
      setMsg("✗ Gönderim hatası veya zaman aşımı — tekrar deneyin");
    } finally {
      setSending(false);
    }
  }

  async function sendSelected() {
    const ids = [...selected];
    if (ids.length === 0) {
      setMsg("⚠️ Önce listeden ürün seçin (checkbox) veya «Eksik ilanları güncelle» kullanın");
      return;
    }
    await sendProductIds(ids, "Seçili ürünler");
  }

  async function syncOffers(ids: string[], label: string) {
    if (ids.length === 0) {
      setMsg("⚠️ Teklif gönderilecek ürün yok — ASIN'i olan eksik ilan bulunamadı");
      return;
    }
    setOfferBusy(true);
    setErrors([]);
    setMsg(`${label} — ${ids.length} ürün için fiyat/stok Amazon'a gönderiliyor…`);
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/amazon/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        result?: { ok: boolean; message: string };
        error?: string;
      };
      if (!res.ok) {
        setMsg(`✗ ${json.error ?? "Teklif gönderimi başarısız"}`);
        return;
      }
      setMsg(`${json.result?.ok ? "✓" : "✗"} ${json.result?.message ?? "Teklif gönderildi"}`);
      await loadProducts({ syncAmazon: true });
    } catch {
      setMsg("✗ Teklif gönderimi hatası");
    } finally {
      setOfferBusy(false);
    }
  }

  async function syncOffersForIncomplete() {
    const ids = products
      .filter((p) => p.amazonAsin && RESEND_STATUSES.has(p.listingStatus))
      .map((p) => p.id);
    await syncOffers(ids, "Eksik teklifli ilanlar");
  }

  async function syncOffersSelected() {
    const ids = [...selected];
    if (ids.length === 0) {
      setMsg("⚠️ Önce ürün seçin veya «Eksik teklif & stok» kullanın");
      return;
    }
    await syncOffers(ids, "Seçili ürünler");
  }

  async function resendIncomplete() {
    setSending(true);
    setErrors([]);
    setMsg("Amazon'daki eksik/hatalı ilanlar güncelleniyor…");
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/amazon/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resendIncomplete: true }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        result?: { ok: boolean; message: string; errors?: string[] };
        error?: string;
      };
      if (!res.ok) {
        setMsg(`✗ ${json.error ?? "Güncelleme başarısız"}`);
        return;
      }
      const r = json.result;
      setErrors(r?.errors ?? []);
      setMsg(`${r?.ok ? "✓" : "✗"} ${r?.message ?? "Güncellendi"}`);
      await loadProducts({ syncAmazon: true });
    } catch {
      setMsg("✗ Güncelleme hatası veya zaman aşımı");
    } finally {
      setSending(false);
    }
  }

  function selectIncomplete() {
    const ids = products.filter((p) => RESEND_STATUSES.has(p.listingStatus)).map((p) => p.id);
    if (ids.length === 0) {
      setMsg("⚠️ Eksik/hatalı ilan bulunamadı — «Eksik ilanları güncelle» ile doğrudan yeniden gönderebilirsiniz");
      return;
    }
    setSelected(new Set(ids));
    setMsg(`✓ ${ids.length} eksik/hatalı ilan seçildi — «Seçiliyi güncelle» ile gönderin`);
  }

  const selectedRows = products.filter((p) => selected.has(p.id));
  const sendLabel =
    selectedRows.length === 0
      ? "Seçiliyi gönder"
      : selectedRows.every((p) => p.listingStatus === "none")
        ? `Seçiliyi gönder (${selected.size})`
        : selectedRows.every((p) => p.listingStatus !== "none")
          ? `Seçiliyi güncelle (${selected.size})`
          : `Seçiliyi gönder/güncelle (${selected.size})`;

  const counts = {
    none: products.filter((p) => p.listingStatus === "none").length,
    pending: products.filter((p) => p.listingStatus === "pending").length,
    active: products.filter((p) => p.listingStatus === "active").length,
    rejected: products.filter((p) => p.listingStatus === "rejected").length,
  };

  const incompleteCount = products.filter((p) => RESEND_STATUSES.has(p.listingStatus)).length;
  const offerIncompleteCount = products.filter(
    (p) => p.amazonAsin && RESEND_STATUSES.has(p.listingStatus),
  ).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-300 bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-950">Marka onaylandı: Anatolian Paw</p>
        <p className="mt-1 text-xs text-green-900">
          Amazon marka onayınız tamamlandı. Dün gönderilen ilanlar Seller Central&apos;da
          &quot;Eksik bilgi&quot; görünebilir — aşağıdaki <strong>Eksik ilanları güncelle</strong>{" "}
          ile aynı SKU üzerinden yeniden gönderilir (görsel, marka ve PET_FOOD alanları güncellenir).
          Amazon işleme 5–30 dakika sürebilir.
        </p>
        <a
          href={amazonBrandApprovalUrl("Anatolian Paw")}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-green-800 underline"
        >
          Seller Central marka sayfası →
        </a>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-950">Amazon ürün gönderimi</p>
        <p className="mt-1 text-xs text-blue-900">
          Köpek maması/ödülü ürünleri otomatik <strong>PET_FOOD</strong> türüyle gönderilir.
          Daha önce gönderilmiş ürünler aynı SKU ile <strong>güncellenir</strong> (yeni ilan
          oluşturulmaz). Seller Central&apos;da &quot;Eksik bilgi&quot; görünenler için önce{" "}
          <strong>Eksik ilanları güncelle</strong> kullanın.
        </p>
      </div>

      {msg ? <StatusMessage msg={msg} errors={errors} /> : null}

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-semibold">Ürün listesi & gönderim</p>
        {!tablesReady ? (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Pazaryeri tabloları için deploy sonrası hazır olur.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[16rem] flex-1">
            <AdminField label="Kategori (isteğe bağlı)">
              <select
                className={inputClass}
                value={localCategoryId}
                onChange={(e) => setLocalCategoryId(e.target.value)}
              >
                <option value="">Tüm kategoriler</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
          <button type="button" className={btnSecondary} disabled={busy || verifyBusy} onClick={() => void loadProducts({ syncAmazon: true })}>
            {busy ? "Yükleniyor…" : "Amazon'dan güncelle"}
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={sending || verifyBusy}
            onClick={() => void resendIncomplete()}
          >
            {sending ? "Gönderiliyor…" : "Eksik ilanları güncelle"}
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={offerBusy || sending || verifyBusy}
            onClick={() => void syncOffersForIncomplete()}
          >
            {offerBusy ? "Gönderiliyor…" : "Eksik teklif & stok"}
          </button>
        </div>
        {offerIncompleteCount > 0 ? (
          <p className="mt-2 text-xs text-amber-800">
            {offerIncompleteCount} ürün Amazon&apos;da ASIN ile görünüyor ama teklif/stok eksik
            (Seller Central: &quot;Teklif yok&quot;) — «Eksik teklif & stok» ile fiyat ve envanteri
            gönderin.
          </p>
        ) : null}
        {incompleteCount > 0 ? (
          <p className="mt-2 text-xs text-amber-800">
            {incompleteCount} ürün eksik/onayda/hatalı — «Eksik ilanları güncelle» ile hepsini
            yeniden gönderebilirsiniz.
          </p>
        ) : null}
      </div>

      {loaded && products.length > 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b p-3 text-xs text-zinc-600">
            <span>{products.length} ürün</span>
            <span>· gönderilmedi {counts.none}</span>
            <span>· onayda {counts.pending}</span>
            <span>· yayında {counts.active}</span>
            <span>· reddedildi {counts.rejected}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <input
              className={`${inputClass} max-w-[16rem]`}
              placeholder="Ürün ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <AdminField label="Durum filtresi">
              <select
                className={`${inputClass} text-xs`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tümü</option>
                <option value="none">Gönderilmedi</option>
                <option value="pending">Onay bekliyor</option>
                <option value="active">Yayında</option>
                <option value="inactive">Pasif</option>
                <option value="rejected">Reddedildi</option>
              </select>
            </AdminField>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={sending}
                onClick={() => selectIncomplete()}
              >
                Eksikleri seç
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={offerBusy || sending}
                onClick={() => void syncOffersSelected()}
              >
                {offerBusy ? "…" : "Teklif & stok gönder"}
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={verifyBusy || sending || offerBusy}
                onClick={() => void verifyOnAmazon()}
              >
                {verifyBusy ? "…" : "Amazon'da doğrula"}
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={sending || offerBusy}
                onClick={() => void sendSelected()}
              >
                {sending ? "Gönderiliyor…" : sendLabel}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="p-2 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === visibleProducts.length && visibleProducts.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="p-2 text-left">Ürün</th>
                  <th className="p-2 text-left">Kategori</th>
                  <th className="p-2 text-left">SKU / Barkod</th>
                  <th className="p-2 text-left">Stok</th>
                  <th className="p-2 text-left">Durum</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((p) => {
                  const status = rowStatusLabel(p);
                  const warnOnly =
                    Boolean(p.amazonAsin) &&
                    (p.listingStatus === "pending" || p.listingStatus === "inactive");
                  return (
                    <tr key={p.id} className="border-t align-top">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="h-9 w-9 rounded object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded bg-zinc-100" />
                          )}
                          <div className="min-w-[12rem]">
                            <p className="font-medium leading-tight">{p.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-xs text-zinc-600">{p.categoryTitle ?? "—"}</td>
                      <td className="p-2 text-xs text-zinc-600">
                        <p>SKU: {p.amazonSku || p.sku || "—"}</p>
                        {p.amazonAsin ? <p>ASIN: {p.amazonAsin}</p> : null}
                        <p>
                          Barkod:{" "}
                          {p.barcode ? (
                            p.barcode
                          ) : (
                            <span className="text-amber-700">yok — otomatik üretilir</span>
                          )}
                        </p>
                      </td>
                      <td className="p-2 text-xs">{p.stockQty}</td>
                      <td className="p-2">
                        <span className={`text-xs ${status.cls}`}>{status.text}</span>
                        {p.lastError && p.listingStatus !== "active" ? (
                          <ErrorText text={p.lastError} muted={warnOnly} />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleProducts.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Filtreye uyan ürün yok.</p>
          ) : null}
        </div>
      ) : null}

      {loaded && products.length === 0 && !busy ? (
        <p className="text-sm text-zinc-500">Bu kategoride yayında ürün bulunamadı.</p>
      ) : null}
    </div>
  );
}
