"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { InvoiceLineAutocomplete } from "@/components/admin/InvoiceLineAutocomplete";
import type { InvoiceLineSuggestion } from "@/app/api/admin/finance/invoice-lines/suggest/route";

type Line = {
  id: number;
  description: string;
  qty: string;
  unitPriceTl: string;
  vatRate: number;
};

type CustomerSuggestion = {
  id: string;
  source: "customer" | "counterparty";
  name: string;
  email: string;
  phone: string;
  taxId: string;
  taxOffice: string;
  address: string;
  city: string;
};

type Result = {
  ok: boolean;
  message: string;
  invoiceNumber?: string;
  invoiceUuid?: string;
  downloadUrl?: string;
  signed?: boolean;
};

let lineIdSeq = 0;
function newLine(): Line {
  return { id: ++lineIdSeq, description: "", qty: "1", unitPriceTl: "", vatRate: 20 };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function parseTl(s: string) { return parseFloat(s.replace(",", ".")) || 0; }
function fmt(tl: number) {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tl) + " ₺";
}

export function ManuelFaturaKes({ siteUrl }: { siteUrl: string }) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientTaxId, setRecipientTaxId] = useState("");
  const [recipientTaxOffice, setRecipientTaxOffice] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Müşteri arama
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { suggestions: CustomerSuggestion[] };
    setSuggestions(data.suggestions);
    setShowSuggestions(true);
  }, []);

  function onSearchChange(val: string) {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchSuggestions(val), 250);
  }

  function selectCustomer(c: CustomerSuggestion) {
    setRecipientName(c.name);
    setRecipientTaxId(c.taxId);
    setRecipientTaxOffice(c.taxOffice);
    setRecipientEmail(c.email);
    setRecipientPhone(c.phone);
    setRecipientAddress(c.address);
    setRecipientCity(c.city);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  // Dışarı tıklayınca dropdown kapat
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const totals = useMemo(() => {
    let totalNet = 0, totalVat = 0;
    for (const l of lines) {
      const qty = parseTl(l.qty);
      const unit = parseTl(l.unitPriceTl);
      const net = round2(qty * unit);
      const vat = round2(net * l.vatRate / 100);
      totalNet += net;
      totalVat += vat;
    }
    return { totalNet: round2(totalNet), totalVat: round2(totalVat), totalIncl: round2(totalNet + totalVat) };
  }, [lines]);

  function updateLine(id: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function applyLineSuggestion(lineId: number, s: InvoiceLineSuggestion) {
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? { ...l, description: s.description, unitPriceTl: String(s.unitPriceTl), vatRate: s.vatRate }
          : l,
      ),
    );
  }

  async function saveLineAsTemplate(l: Line) {
    const price = parseTl(l.unitPriceTl);
    if (!l.description.trim() || price <= 0) return;
    await fetch("/api/admin/finance/invoice-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: l.description.trim(),
        unitPriceTl: price,
        vatRate: l.vatRate,
      }),
    });
  }

  async function submit() {
    if (!recipientName.trim() || lines.some((l) => !l.description || !parseTl(l.unitPriceTl))) return;
    setSubmitting(true);
    setResult(null);
    try {
      const r = await fetch("/api/admin/finance/invoices/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          recipientTaxId: recipientTaxId.trim() || undefined,
          recipientTaxOffice: recipientTaxOffice.trim() || undefined,
          recipientAddress: recipientAddress.trim() || undefined,
          recipientCity: recipientCity.trim() || undefined,
          recipientEmail: recipientEmail.trim() || undefined,
          recipientPhone: recipientPhone.trim() || undefined,
          invoiceDate: new Date(invoiceDate).toISOString(),
          description: description.trim() || undefined,
          lines: lines.map((l) => ({
            description: l.description,
            qty: parseTl(l.qty) || 1,
            unitPriceTl: parseTl(l.unitPriceTl),
            vatRate: l.vatRate,
          })),
        }),
      });
      const data = (await r.json()) as Result;
      setResult(data);
      if (data.ok) {
        // Reset form after success
        setRecipientName(""); setRecipientTaxId(""); setRecipientTaxOffice("");
        setRecipientAddress(""); setRecipientCity(""); setRecipientEmail(""); setRecipientPhone("");
        setDescription(""); setLines([newLine()]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = recipientName.trim() && lines.every((l) => l.description && parseTl(l.unitPriceTl) > 0);

  return (
    <div className="space-y-6">
      {result && (
        <div
          className={`rounded-xl border px-5 py-4 text-sm ${
            result.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          <div className="font-semibold">{result.ok ? "✓ " : "✗ "}{result.message}</div>
          {result.ok && result.downloadUrl && (
            <div className="mt-2">
              <a
                href={result.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                GİB&apos;den PDF indir →
              </a>
              {!result.signed && (
                <span className="ml-3 text-xs text-amber-700">
                  Fatura henüz imzalanmadı —{" "}
                  <a
                    href="https://earsivportal.efatura.gov.tr"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    GİB portala giderek imzalayın
                  </a>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alıcı bilgileri */}
      <div className="admin-card admin-card-pad">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-zinc-800">Alıcı Bilgileri</h3>
          {/* Müşteri arama */}
          <div ref={searchRef} className="relative w-72">
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm placeholder:text-zinc-400"
              placeholder="Müşteri ara (ad, e-posta, VKN…)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
                {suggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                      onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-800">{c.name || "—"}</span>
                        <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${c.source === "counterparty" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-500"}`}>
                          {c.source === "counterparty" ? "cari" : "üye"}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {[c.email, c.phone, c.taxId].filter(Boolean).join(" · ")}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Alıcı Adı / Ünvanı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="Ahmet Yılmaz veya Şirket A.Ş."
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">VKN / TC</label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="11111111111"
              value={recipientTaxId}
              onChange={(e) => setRecipientTaxId(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Vergi Dairesi</label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="Kadıköy VD"
              value={recipientTaxOffice}
              onChange={(e) => setRecipientTaxOffice(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">E-posta</label>
            <input
              type="email"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="ornek@mail.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Telefon</label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="05xx xxx xx xx"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-600">Adres</label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="Mahalle, Sokak No, İlçe"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Şehir</label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="İstanbul"
              value={recipientCity}
              onChange={(e) => setRecipientCity(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Fatura Tarihi</label>
            <input
              type="date"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              İç Not (isteğe bağlı)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="Danışmanlık hizmeti vb."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Fatura satırları */}
      <div className="admin-card admin-card-pad">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-800">Fatura Satırları</h3>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            + Satır Ekle
          </button>
        </div>

        {/* Header */}
        <div className="mb-2 hidden grid-cols-[1fr_80px_120px_100px_32px] gap-2 text-xs font-medium text-zinc-500 md:grid">
          <span>Açıklama</span><span>Adet</span><span>Birim Fiyat (TL)</span><span>KDV %</span><span></span>
        </div>

        <div className="space-y-2">
          {lines.map((l, idx) => (
            <div key={l.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_80px_120px_100px_32px]">
              <InvoiceLineAutocomplete
                value={l.description}
                onChange={(val) => updateLine(l.id, { description: val })}
                onSelect={(s) => applyLineSuggestion(l.id, s)}
                onSaveAsTemplate={() => void saveLineAsTemplate(l)}
                placeholder={`Satır ${idx + 1} — ürün/hizmet açıklaması`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm w-full"
              />
              <input
                type="text"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                placeholder="1"
                value={l.qty}
                onChange={(e) => updateLine(l.id, { qty: e.target.value })}
              />
              <input
                type="text"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                placeholder="0,00"
                value={l.unitPriceTl}
                onChange={(e) => updateLine(l.id, { unitPriceTl: e.target.value })}
              />
              <select
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                value={l.vatRate}
                onChange={(e) => updateLine(l.id, { vatRate: parseInt(e.target.value) })}
              >
                <option value={0}>%0</option>
                <option value={1}>%1</option>
                <option value={10}>%10</option>
                <option value={20}>%20</option>
              </select>
              <button
                type="button"
                className="text-sm text-red-400 hover:text-red-600 disabled:opacity-30"
                disabled={lines.length === 1}
                onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 border-t border-zinc-200 pt-4">
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Ara Toplam (KDV hariç)</span>
              <span className="font-medium">{fmt(totals.totalNet)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Toplam KDV</span>
              <span className="font-medium">{fmt(totals.totalVat)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-1 font-bold text-zinc-800">
              <span>Genel Toplam</span>
              <span>{fmt(totals.totalIncl)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GİB uyarısı + submit */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
        <strong>Not:</strong> Fatura GİB e-Arşiv portalına gönderilecek. E-Arşiv ayarlarınızın (kullanıcı adı/şifre) doğru girilmiş olması gerekir.{" "}
        <a href="/admin/settings/efatura" className="underline">Ayarlara git →</a>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={submitting || !canSubmit}
          onClick={() => void submit()}
        >
          {submitting ? "GİB&apos;e gönderiliyor…" : "Fatura Kes & GİB&apos;e Gönder"}
        </button>
      </div>

      {/* Google Sheets entegrasyon kodu */}
      <details className="admin-card admin-card-pad">
        <summary className="cursor-pointer font-semibold text-zinc-700 hover:text-zinc-900">
          Google Sheets Entegrasyonu — Apps Script kodu
        </summary>
        <div className="mt-4 space-y-3 text-sm text-zinc-600">
          <p>
            Google Sheets&apos;te fatura girişi yapıp otomatik olarak panele aktarmak için:
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-xs">
            <li>
              <strong>Ayarlar → Ön Muhasebe → Webhook Token</strong> bölümünden bir token oluşturun ve kaydedin.
            </li>
            <li>
              Google Sheets&apos;te <strong>Uzantılar → Apps Script</strong> menüsünü açın.
            </li>
            <li>Aşağıdaki kodu yapıştırın, <code>WEBHOOK_TOKEN</code> ve <code>SITE_URL</code> değerlerini doldurun.</li>
            <li>
              Sheets&apos;te sütun sırası: <strong>Yön | Tarih | Fatura No | Karşı Taraf | Net TL | KDV% | Açıklama</strong>
            </li>
          </ol>
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-green-300 leading-relaxed">
{`const WEBHOOK_TOKEN = "BURAYA_TOKEN_YAZIN";
const SITE_URL = "${siteUrl}";

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Faturalar") return;
  const row = e.range.getRow();
  if (row < 2) return; // header satırını atla

  const r = sheet.getRange(row, 1, 1, 7).getValues()[0];
  const [direction, dateRaw, invoiceNo, counterparty, netTl, kdvRate, description] = r;

  if (!netTl || !dateRaw) return;

  const date = new Date(dateRaw);
  const iso = date.toISOString();

  const payload = {
    direction: direction === "gelen" || direction === "incoming" ? "incoming" : "outgoing",
    invoiceDate: iso,
    invoiceNo: invoiceNo ? String(invoiceNo) : undefined,
    counterparty: counterparty ? String(counterparty) : undefined,
    netTl: parseFloat(String(netTl).replace(",", ".")),
    kdvRate: parseFloat(String(kdvRate)) || 20,
    description: description ? String(description) : undefined,
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + WEBHOOK_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(
    SITE_URL + "/api/finance/webhook/invoice",
    options
  );
  Logger.log(response.getContentText());
}`}
          </pre>
        </div>
      </details>
    </div>
  );
}
