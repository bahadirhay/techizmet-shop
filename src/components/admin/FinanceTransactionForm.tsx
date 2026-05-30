"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import { FINANCE_TX_KINDS } from "@/lib/finance/types";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";

type CategoryOption = { id: string; name: string; kind: string };
type AccountOption = { id: string; name: string; kind: string };

export function FinanceTransactionForm({
  initialKind,
  categories,
  accounts,
  orderId,
  orderNumber,
}: {
  initialKind?: string;
  categories: CategoryOption[];
  accounts: AccountOption[];
  orderId?: string;
  orderNumber?: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState(initialKind ?? "expense");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [invoiceDirection, setInvoiceDirection] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyTaxId, setCounterpartyTaxId] = useState("");
  const [vat, setVat] = useState("");
  const [marketplacePlatform, setMarketplacePlatform] = useState("");
  const [marketplaceRef, setMarketplaceRef] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isExpenseKind = kind === "expense" || kind === "payment_out" || kind === "marketplace_deduction";
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === (isExpenseKind ? "expense" : "income")),
    [categories, isExpenseKind],
  );

  const showInvoiceFields =
    kind === "expense" || kind === "other_income" || kind === "marketplace_deduction";
  const showMarketplaceFields = kind === "marketplace_deduction" || kind === "marketplace_payout";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        txDate,
        amount,
        description: description || undefined,
        categoryId: categoryId || undefined,
        accountId: accountId || undefined,
        orderId: orderId || undefined,
        invoiceDirection: invoiceDirection || undefined,
        invoiceNumber: invoiceNumber || undefined,
        counterpartyName: counterpartyName || undefined,
        counterpartyTaxId: counterpartyTaxId || undefined,
        vat: vat || undefined,
        marketplacePlatform: marketplacePlatform || undefined,
        marketplaceRef: marketplaceRef || undefined,
        notes: notes || undefined,
      }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (res.ok) {
      router.push(orderId ? `/admin/orders/${orderId}` : "/admin/finance/transactions");
      router.refresh();
    } else {
      setMsg(j.error ?? "Kayıt başarısız");
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="admin-card admin-card-pad max-w-2xl space-y-4">
      {orderNumber ? (
        <p className="text-sm text-zinc-600">
          Sipariş: <strong>{orderNumber}</strong>
        </p>
      ) : null}

      <AdminField label="Hareket türü">
        <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
          {FINANCE_TX_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </AdminField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Tarih">
          <input
            type="date"
            className={inputClass}
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Tutar (₺)" hint="KDV dahil veya hariç — tutarlı kullanın">
          <input
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            required
          />
        </AdminField>
      </div>

      <AdminField label="Açıklama">
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kısa açıklama"
        />
      </AdminField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Kategori">
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— Seçin —</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Hesap">
          <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">— Seçin —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </AdminField>
      </div>

      {showInvoiceFields ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Fatura yönü">
              <select
                className={inputClass}
                value={invoiceDirection}
                onChange={(e) => setInvoiceDirection(e.target.value)}
              >
                <option value="">—</option>
                <option value="received">Gelen fatura (gider)</option>
                <option value="issued">Giden fatura (gelir)</option>
              </select>
            </AdminField>
            <AdminField label="Fatura no">
              <input
                className={inputClass}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Karşı taraf">
              <input
                className={inputClass}
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
              />
            </AdminField>
            <AdminField label="VKN / TCKN">
              <input
                className={inputClass}
                value={counterpartyTaxId}
                onChange={(e) => setCounterpartyTaxId(e.target.value)}
              />
            </AdminField>
          </div>
          <AdminField label="KDV tutarı (₺)">
            <input className={inputClass} value={vat} onChange={(e) => setVat(e.target.value)} />
          </AdminField>
        </>
      ) : null}

      {showMarketplaceFields ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Pazaryeri">
            <select
              className={inputClass}
              value={marketplacePlatform}
              onChange={(e) => setMarketplacePlatform(e.target.value)}
            >
              <option value="">— Seçin —</option>
              {MARKETPLACE_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Pazaryeri referans / sipariş no">
            <input
              className={inputClass}
              value={marketplaceRef}
              onChange={(e) => setMarketplaceRef(e.target.value)}
            />
          </AdminField>
        </div>
      ) : null}

      <AdminField label="Notlar">
        <textarea
          className={inputClass}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </AdminField>

      {kind === "marketplace_deduction" && !orderId ? (
        <p className="text-xs text-amber-800">
          Sipariş seçmeden kaydederseniz kesinti &quot;eşleşmemiş&quot; olarak işaretlenir. Mutabakat
          sayfasından siparişe bağlayabilirsiniz.
        </p>
      ) : null}

      <button type="submit" className={btnPrimary} disabled={busy}>
        Kaydet
      </button>
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
    </form>
  );
}
