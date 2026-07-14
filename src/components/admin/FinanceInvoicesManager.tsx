"use client";

import { useMemo, useState } from "react";
import { formatTry } from "@/lib/admin/money";
import { sanitizePublicHtml } from "@/lib/html-sanitize";
import { inputClass, btnPrimary, AdminField } from "@/components/admin/AdminForm";

type Option = { id: string; name: string; kind?: string };
type CustomerLite = { id: string; firstName: string | null; lastName: string | null; email: string | null };
type CounterpartyLite = { id: string; title: string; type: string; taxId: string | null };
type InvoiceLine = { description: string; qty: number; unitPrice: number; vatRate: number };
type InvoiceRow = {
  id: string;
  status: string;
  source: string;
  direction: string;
  issueDate: string | Date;
  title: string | null;
  totalMinor: number;
  firstApprovedByStaffUserId?: string | null;
  secondApprovedByStaffUserId?: string | null;
  customer: CustomerLite | null;
  counterparty: CounterpartyLite | null;
  category: Option | null;
  account: Option | null;
};

function customerLabel(c: CustomerLite): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Müşteri";
}

export function FinanceInvoicesManager({
  initialInvoices,
  categories,
  accounts,
  customers,
  counterparties,
}: {
  initialInvoices: InvoiceRow[];
  categories: Option[];
  accounts: Option[];
  customers: CustomerLite[];
  counterparties: CounterpartyLite[];
}) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    direction: "outgoing",
    customerId: "",
    counterpartyId: "",
    categoryId: "",
    accountId: "",
    title: "",
    description: "",
    issueDate: new Date().toISOString().slice(0, 10),
    sendToApproval: true,
  });
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: "", qty: 1, unitPrice: 0, vatRate: 20 },
  ]);
  const [msg, setMsg] = useState<string | null>(null);
  const [gibBusy, setGibBusy] = useState(false);

  const categoryOptions = useMemo(
    () => categories.filter((c) => c.kind === (form.direction === "incoming" ? "expense" : "income")),
    [categories, form.direction],
  );

  function updateLine(i: number, patch: Partial<InvoiceLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function reloadList() {
    try {
      const res = await fetch("/api/admin/finance/invoices/list");
      const j = (await res.json().catch(() => ({}))) as { invoices?: InvoiceRow[] };
      if (res.ok && Array.isArray(j.invoices)) setInvoices(j.invoices);
    } catch {
      // Liste yenilenemezse mevcut tablo korunur — sayfa çökmesin
    }
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/finance/invoices/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        customerId: form.customerId || undefined,
        counterpartyId: form.counterpartyId || undefined,
        categoryId: form.categoryId || undefined,
        accountId: form.accountId || undefined,
        lines,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(j.error ?? "Fatura kaydedilemedi.");
      return;
    }
    setMsg(
      form.sendToApproval
        ? "Fatura kaydedildi ve onay kuyruğuna eklendi."
        : "Fatura taslak olarak kaydedildi.",
    );
    setLines([{ description: "", qty: 1, unitPrice: 0, vatRate: 20 }]);
    await reloadList();
  }

  async function actInvoice(id: string, action: "approve" | "reject", reason?: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/finance/invoices/${id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(reason ? { reason } : {}),
    });
    const j = (await res.json()) as { error?: string };
    setBusyId(null);
    if (!res.ok) {
      setMsg(j.error ?? "İşlem başarısız.");
      return;
    }
    await reloadList();
  }

  async function openPreview(id: string) {
    const res = await fetch(`/api/admin/finance/invoices/${id}/preview`);
    const j = (await res.json()) as { html?: string; error?: string };
    if (!res.ok) {
      setMsg(j.error ?? "Önizleme alınamadı.");
      return;
    }
    setPreviewHtml(j.html ?? null);
  }

  return (
    <div className="space-y-6">
      <section className="admin-card admin-card-pad">
        <h2 className="text-base font-semibold">Yeni fatura (taslak / onay)</h2>
        <form onSubmit={(e) => void createInvoice(e)} className="mt-4 grid gap-4 md:grid-cols-2">
          <AdminField label="Yön">
            <select className={inputClass} value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}>
              <option value="outgoing">Kesilecek (giden)</option>
              <option value="incoming">Gelen</option>
            </select>
          </AdminField>
          <AdminField label="Tarih">
            <input type="date" className={inputClass} value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
          </AdminField>
          <AdminField label="Site müşterisi">
            <select className={inputClass} value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, counterpartyId: "" }))}>
              <option value="">Seçmedim</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{customerLabel(c)}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Manuel karşı taraf">
            <select className={inputClass} value={form.counterpartyId} onChange={(e) => setForm((f) => ({ ...f, counterpartyId: e.target.value, customerId: "" }))}>
              <option value="">Seçmedim</option>
              {counterparties.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Kategori">
            <select className={inputClass} value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Seçin</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Hesap">
            <select className={inputClass} value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}>
              <option value="">Seçin</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Başlık">
            <input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </AdminField>
          <AdminField label="Açıklama">
            <input className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </AdminField>

          <div className="md:col-span-2 space-y-2">
            <p className="text-sm font-medium">Fatura satırları</p>
            {lines.map((line, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-4">
                <input className={inputClass} placeholder="Açıklama" value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                <input type="number" className={inputClass} placeholder="Miktar" value={line.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} />
                <input type="number" className={inputClass} placeholder="Birim fiyat" value={line.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} />
                <input type="number" className={inputClass} placeholder="KDV %" value={line.vatRate} onChange={(e) => updateLine(i, { vatRate: Number(e.target.value) })} />
              </div>
            ))}
            <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => setLines((v) => [...v, { description: "", qty: 1, unitPrice: 0, vatRate: 20 }])}>
              Satır ekle
            </button>
          </div>

          <label className="md:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.sendToApproval} onChange={(e) => setForm((f) => ({ ...f, sendToApproval: e.target.checked }))} />
            Kaydedince onay kuyruğuna gönder
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <button className={btnPrimary} type="submit">Kaydet</button>
            {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
          </div>
        </form>
      </section>

      <section className="admin-card admin-card-pad overflow-x-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Fatura onay kuyruğu</h2>
          <div className="flex gap-2">
            <button
              className="rounded border px-2 py-1 text-sm"
              disabled={gibBusy}
              onClick={async () => {
                setGibBusy(true);
                setMsg("GİB'den gelen faturalar çekiliyor…");
                try {
                  const res = await fetch("/api/admin/finance/invoices/gib-sync", { method: "POST" });
                  const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
                  setMsg(res.ok ? j.message ?? "GİB senkron tamamlandı." : j.error ?? "GİB senkron başarısız.");
                  await reloadList();
                } catch (e) {
                  setMsg(`GİB senkron hatası: ${e instanceof Error ? e.message : "bağlantı sorunu"}`);
                } finally {
                  setGibBusy(false);
                }
              }}
            >
              {gibBusy ? "Çekiliyor…" : "GİB’den gelenleri çek"}
            </button>
            <button
              className="rounded border px-2 py-1 text-sm"
              onClick={async () => {
                const res = await fetch("/api/admin/finance/invoices/retry", { method: "POST" });
                const j = (await res.json()) as { processed?: number; done?: number; failed?: number; error?: string };
                setMsg(
                  res.ok
                    ? `Retry işlendi: ${j.processed ?? 0} job, ${j.done ?? 0} başarılı, ${j.failed ?? 0} hata.`
                    : j.error ?? "Retry kuyruğu çalıştırılamadı.",
                );
                await reloadList();
              }}
            >
              Retry kuyruğunu çalıştır
            </button>
          </div>
        </div>
        <table className="mt-3 w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b text-zinc-500">
              <th className="py-2 text-left">Tarih</th>
              <th className="text-left">Durum</th>
              <th className="text-left">Yön</th>
              <th className="text-left">Karşı taraf</th>
              <th className="text-left">Kategori/Hesap</th>
              <th className="text-right">Toplam</th>
              <th className="text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-zinc-100">
                <td className="py-2">{new Date(inv.issueDate).toLocaleDateString("tr-TR")}</td>
                <td>{inv.status}</td>
                <td>{inv.direction === "incoming" ? "Gelen" : "Giden"}</td>
                <td>{inv.customer ? customerLabel(inv.customer) : inv.counterparty?.title ?? "—"}</td>
                <td>{inv.category?.name ?? "—"} / {inv.account?.name ?? "—"}</td>
                <td className="text-right tabular-nums">{formatTry(inv.totalMinor)}</td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button className="rounded border px-2 py-1" onClick={() => void openPreview(inv.id)}>Önizleme</button>
                    {inv.status !== "posted" ? (
                      <>
                        <button className="rounded border border-emerald-200 px-2 py-1 text-emerald-700" disabled={busyId === inv.id} onClick={() => void actInvoice(inv.id, "approve")}>
                          {inv.firstApprovedByStaffUserId ? "2. onay / post" : "1. onay"}
                        </button>
                        <button className="rounded border border-rose-200 px-2 py-1 text-rose-700" disabled={busyId === inv.id} onClick={() => {
                          const reason = window.prompt("Red sebebi");
                          if (reason) void actInvoice(inv.id, "reject", reason);
                        }}>Reddet</button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {previewHtml ? (
        <section className="admin-card admin-card-pad">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Kesilecek fatura önizleme</h3>
            <button className="rounded border px-2 py-1 text-sm" onClick={() => setPreviewHtml(null)}>Kapat</button>
          </div>
          <div className="rounded border p-3" dangerouslySetInnerHTML={{ __html: sanitizePublicHtml(previewHtml) }} />
        </section>
      ) : null}
    </div>
  );
}
