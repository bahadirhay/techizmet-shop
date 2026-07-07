"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { MarketplaceCommissionRulesPanel } from "@/components/admin/MarketplaceCommissionRulesPanel";
import { MarketplaceAttributeMappingPanel } from "@/components/admin/MarketplaceAttributeMappingPanel";
import { TRENDYOL_CARGO_PROVIDERS } from "@/lib/marketplace/trendyol/cargo-providers";
import type { CommissionRuleRow } from "@/lib/marketplace/commission-types";

type SyncLog = {
  id: string;
  platform: string;
  action: string;
  status: string;
  message: string | null;
  itemsCount: number | null;
  createdAt: string;
};

type Row = {
  platform: string;
  label: string;
  active: boolean;
  configJson: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

type CategoryOption = { id: string; label: string };

type CategoryMappingRow = {
  id: string;
  categoryId: string | null;
  categoryTitle: string;
  platformCategoryId: string;
  platformBrandId: string | null;
};

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function resolvePlatform(platform?: string | null) {
  if (platform && MARKETPLACE_PLATFORMS.some((p) => p.id === platform)) return platform;
  return MARKETPLACE_PLATFORMS[0].id;
}

export function MarketplaceIntegrationsClient({
  initial,
  initialPlatform,
  appOrigin = "",
  marketplaceTablesReady = true,
  categories = [],
  categoryMappings = [],
  commissionRules = [],
  commissionTablesReady = true,
}: {
  initial: Row[];
  initialPlatform?: string;
  appOrigin?: string;
  marketplaceTablesReady?: boolean;
  categories?: CategoryOption[];
  categoryMappings?: CategoryMappingRow[];
  commissionRules?: CommissionRuleRow[];
  commissionTablesReady?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows] = useState(initial);
  const [selected, setSelected] = useState(() => resolvePlatform(initialPlatform));
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [active, setActive] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncBusy, setSyncBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [mapCategoryId, setMapCategoryId] = useState("");
  const [mapPlatformCategoryId, setMapPlatformCategoryId] = useState("");
  const [mapPlatformBrandId, setMapPlatformBrandId] = useState("");
  const [mappings, setMappings] = useState(categoryMappings);
  const [trendyolAddresses, setTrendyolAddresses] = useState<
    { id: number; addressType: string; fullAddress: string; isShipment: boolean; isReturning: boolean; isDefault: boolean }[]
  >([]);
  const [addressBusy, setAddressBusy] = useState(false);

  useEffect(() => {
    const p = resolvePlatform(searchParams.get("platform") ?? initialPlatform);
    const row = rows.find((r) => r.platform === p);
    setSelected(p);
    setCfg(parseConfig(row?.configJson ?? null));
    setActive(row?.active ?? false);
  }, [searchParams, initialPlatform, rows]);

  useEffect(() => {
    fetch(`/api/admin/integrations/marketplaces/logs?platform=${selected}`)
      .then((r) => r.json())
      .then((j: { logs?: SyncLog[] }) => setLogs(j.logs ?? []));
  }, [selected, msg]);

  function selectPlatform(p: string) {
    router.replace(`/admin/integrations?platform=${p}`, { scroll: false });
  }

  async function testConnection() {
    setTestBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/integrations/marketplaces/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: selected, config: cfg }),
    });
    const json = (await res.json()) as {
      result?: { ok: boolean; message: string; userAgent?: string };
      message?: string;
      error?: string;
    };
    setTestBusy(false);
    if (!res.ok) {
      setMsg(json.message ?? json.error ?? "Bağlantı testi başarısız");
      return;
    }
    const r = json.result;
    if (!r) {
      setMsg("Beklenmeyen yanıt");
      return;
    }
    setMsg(
      r.ok
        ? `✓ ${r.message}${r.userAgent ? ` (User-Agent: ${r.userAgent})` : ""}`
        : `✗ ${r.message}${r.userAgent ? ` — User-Agent: ${r.userAgent}` : ""}`,
    );
  }

  async function save() {
    setMsg(null);
    const label = MARKETPLACE_PLATFORMS.find((x) => x.id === selected)?.label ?? selected;
    const res = await fetch("/api/admin/integrations/marketplaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: selected,
        label,
        active,
        config: cfg,
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "Kayıt başarısız");
      return;
    }
    setMsg("Kaydedildi");
    window.location.reload();
  }

  useEffect(() => {
    setMappings(categoryMappings);
  }, [categoryMappings]);

  async function runCatalogPullAll() {
    setSyncBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/integrations/marketplaces/catalog/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const json = (await res.json()) as {
      result?: { message: string; ok: boolean; results?: { platform: string; message: string }[] };
      error?: string;
    };
    setSyncBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Katalog çekme başarısız");
      return;
    }
    const details = json.result?.results?.map((r) => `${r.platform}: ${r.message}`).join(" · ");
    setMsg(details ? `${json.result?.message} — ${details}` : (json.result?.message ?? "Tamamlandı"));
    window.location.reload();
  }

  async function runAction(path: string, label: string) {
    setSyncBusy(true);
    setMsg(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: selected }),
    });
    const json = (await res.json()) as { result?: { message: string; ok: boolean }; error?: string };
    setSyncBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? `${label} başarısız`);
      return;
    }
    setMsg(json.result?.message ?? `${label} tamam`);
    window.location.reload();
  }

  async function saveCategoryMapping() {
    if (!mapPlatformCategoryId.trim()) {
      setMsg("Pazaryeri kategori ID girin");
      return;
    }
    const res = await fetch("/api/admin/integrations/marketplaces/mappings/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: selected,
        categoryId: mapCategoryId || null,
        platformCategoryId: mapPlatformCategoryId,
        platformBrandId: mapPlatformBrandId || null,
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMsg(json.error ?? "Eşleme kaydedilemedi");
      return;
    }
    setMsg("Kategori eşlemesi kaydedildi");
    setMapCategoryId("");
    setMapPlatformCategoryId("");
    setMapPlatformBrandId("");
    window.location.reload();
  }

  async function loadTrendyolAddresses() {
    setAddressBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/integrations/marketplaces/trendyol/addresses");
    const json = (await res.json()) as {
      addresses?: typeof trendyolAddresses;
      error?: string;
    };
    setAddressBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Adresler alınamadı");
      return;
    }
    setTrendyolAddresses(json.addresses ?? []);
    setMsg(`${json.addresses?.length ?? 0} adres geldi. Aşağıdan seçin.`);
  }

  async function runSync() {
    setSyncBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/integrations/marketplaces/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: selected }),
    });
    const json = (await res.json()) as { result?: { message: string; ok: boolean }; error?: string };
    setSyncBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Senkron başarısız");
      return;
    }
    setMsg(json.result?.message ?? "Tamam");
    window.location.reload();
  }

  const current = rows.find((r) => r.platform === selected);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Platform değiştirmek için sol menüdeki <strong>Pazaryeri</strong> bölümünü kullanın.
      </p>
      <div className="flex flex-wrap gap-2 lg:hidden">
        {MARKETPLACE_PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs ${selected === p.id ? "border-zinc-800 bg-zinc-800 text-white" : "bg-white"}`}
            onClick={() => selectPlatform(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">
          {MARKETPLACE_PLATFORMS.find((p) => p.id === selected)?.label}
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Entegrasyon aktif
        </label>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
          <p className="font-medium">Otomatik sipariş çekme (ücretsiz)</p>
          <p className="mt-1 text-xs text-blue-900">
            Ek sunucu maliyeti yok — Windows Görev Zamanlayıcı veya cron, mağaza API&apos;nizi
            periyodik çağırır. <code className="text-[11px]">CRON_SECRET</code> ile korunur.
          </p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.orderPullAuto === "true"}
              onChange={(e) => setCfg({ ...cfg, orderPullAuto: e.target.checked ? "true" : "false" })}
            />
            Zamanlanmış sipariş çekmeyi aç
          </label>
          <AdminField label="Aralık (dakika, min. 5)">
            <input
              type="number"
              min={5}
              className={inputClass}
              value={cfg.orderPullMinutes ?? "15"}
              onChange={(e) => setCfg({ ...cfg, orderPullMinutes: e.target.value })}
            />
          </AdminField>
          {cfg.lastOrderPullAt ? (
            <p className="text-xs text-blue-800">
              Son otomatik çekim: {new Date(cfg.lastOrderPullAt).toLocaleString("tr-TR")}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-blue-800">
            Görev URL:{" "}
            <code className="break-all">
              {appOrigin
                ? `${appOrigin}/api/cron/marketplace/orders?secret=CRON_SECRET`
                : "/api/cron/marketplace/orders?secret=CRON_SECRET"}
            </code>
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cfg.stockSyncEnabled !== "false"}
            onChange={(e) => setCfg({ ...cfg, stockSyncEnabled: e.target.checked ? "true" : "false" })}
          />
          Stok değişince diğer pazaryerlerine otomatik gönder
        </label>

        {selected === "trendyol" ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-medium">Trendyol panel → bu alanlar</p>
            <ul className="mt-1 list-inside list-disc text-xs text-amber-900">
              <li>
                <strong>Satıcı ID (Cari ID)</strong> → aşağıdaki Satıcı ID alanı
              </li>
              <li>
                <strong>API Key</strong> ve <strong>API Secret</strong> → aynı isimli alanlar (Basic Auth)
              </li>
              <li>
                <strong>Token</strong> ve <strong>Entegrasyon Referans Kodu</strong> → API&apos;de kullanılmaz,
                girmenize gerek yok
              </li>
            </ul>
          </div>
        ) : null}
        <AdminField label="Satıcı ID / Mağaza kodu">
          <input
            className={inputClass}
            value={cfg.sellerId ?? ""}
            onChange={(e) => setCfg({ ...cfg, sellerId: e.target.value })}
            placeholder={selected === "trendyol" ? "Trendyol Satıcı ID (Cari ID)" : undefined}
          />
        </AdminField>
        <AdminField label="API Key">
          <input
            className={inputClass}
            value={cfg.apiKey ?? ""}
            onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
          />
        </AdminField>
        <AdminField label="API Secret">
          <input
            className={inputClass}
            type="password"
            value={cfg.apiSecret ?? ""}
            onChange={(e) => setCfg({ ...cfg, apiSecret: e.target.value })}
            placeholder="Boş bırakırsanız kayıtlı secret korunur"
          />
        </AdminField>
        <AdminField label="Webhook URL (isteğe bağlı)">
          <input
            className={inputClass}
            value={cfg.webhookUrl ?? ""}
            onChange={(e) => setCfg({ ...cfg, webhookUrl: e.target.value })}
          />
        </AdminField>
        {selected === "trendyol" ? (
          <>
            <AdminField label="Entegrasyon firma adı (User-Agent)">
              <input
                className={inputClass}
                value={cfg.integrationCompany ?? "SelfIntegration"}
                onChange={(e) => setCfg({ ...cfg, integrationCompany: e.target.value })}
                placeholder="SelfIntegration"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Kendi yazılımınız ise <strong>SelfIntegration</strong> bırakın. Aracı firma varsa firma adı
                (alfanumerik, max 30 karakter). Trendyol User-Agent:{" "}
                <code className="text-[11px]">
                  {cfg.sellerId?.trim() || "…"} - {cfg.integrationCompany?.trim() || "SelfIntegration"}
                </code>
              </p>
            </AdminField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cfg.useStage === "true"}
                onChange={(e) => setCfg({ ...cfg, useStage: e.target.checked ? "true" : "false" })}
              />
              Test ortamı (stage API)
            </label>
            <AdminField label="Trendyol marka ID (trendyolBrandId)">
              <input
                className={inputClass}
                value={cfg.trendyolBrandId ?? cfg.brandId ?? ""}
                onChange={(e) => setCfg({ ...cfg, trendyolBrandId: e.target.value })}
              />
            </AdminField>
            <AdminField label="Trendyol kategori ID (trendyolCategoryId)">
              <input
                className={inputClass}
                value={cfg.trendyolCategoryId ?? cfg.categoryId ?? ""}
                onChange={(e) => setCfg({ ...cfg, trendyolCategoryId: e.target.value })}
              />
            </AdminField>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm font-semibold">Gönderim ayarları (ürün onayı için zorunlu)</p>
              <p className="mt-1 text-xs text-zinc-500">
                Trendyol ürün oluşturma bu alanlar olmadan reddedilir. Kargo firma ID ve adres
                ID&apos;lerini Trendyol Satıcı Paneli → Kargo/Adres ayarlarından alın.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <AdminField label="Kargo firması (cargoCompanyId) *">
                  <select
                    className={inputClass}
                    value={cfg.cargoCompanyId ?? ""}
                    onChange={(e) => setCfg({ ...cfg, cargoCompanyId: e.target.value })}
                  >
                    <option value="">Seçin…</option>
                    {TRENDYOL_CARGO_PROVIDERS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (#{c.id})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-zinc-500">
                    Trendyol sözleşmenizde onaylı kargo firmasını seçin, aksi halde ürün yayına çıkmaz.
                  </p>
                </AdminField>
                <AdminField label="Teslim süresi (gün)">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={cfg.deliveryDuration ?? ""}
                    onChange={(e) => setCfg({ ...cfg, deliveryDuration: e.target.value })}
                    placeholder="örn. 2"
                  />
                </AdminField>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={addressBusy}
                    onClick={() => void loadTrendyolAddresses()}
                  >
                    {addressBusy ? "Adresler geliyor…" : "Adresleri Trendyol'dan getir"}
                  </button>
                </div>
                <AdminField label="Sevkiyat adresi (shipmentAddressId)">
                  {trendyolAddresses.length > 0 ? (
                    <select
                      className={inputClass}
                      value={cfg.shipmentAddressId ?? ""}
                      onChange={(e) => setCfg({ ...cfg, shipmentAddressId: e.target.value })}
                    >
                      <option value="">Varsayılan adres</option>
                      {trendyolAddresses
                        .filter((a) => a.isShipment)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            #{a.id} {a.fullAddress}
                            {a.isDefault ? " (varsayılan)" : ""}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      value={cfg.shipmentAddressId ?? ""}
                      onChange={(e) => setCfg({ ...cfg, shipmentAddressId: e.target.value })}
                      placeholder="Boşsa varsayılan adres"
                    />
                  )}
                </AdminField>
                <AdminField label="İade adresi (returningAddressId)">
                  {trendyolAddresses.length > 0 ? (
                    <select
                      className={inputClass}
                      value={cfg.returningAddressId ?? ""}
                      onChange={(e) => setCfg({ ...cfg, returningAddressId: e.target.value })}
                    >
                      <option value="">Varsayılan adres</option>
                      {trendyolAddresses
                        .filter((a) => a.isReturning)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            #{a.id} {a.fullAddress}
                            {a.isDefault ? " (varsayılan)" : ""}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      value={cfg.returningAddressId ?? ""}
                      onChange={(e) => setCfg({ ...cfg, returningAddressId: e.target.value })}
                      placeholder="Boşsa varsayılan adres"
                    />
                  )}
                </AdminField>
                <AdminField label="Varsayılan KDV (%)">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={cfg.vatRate ?? ""}
                    onChange={(e) => setCfg({ ...cfg, vatRate: e.target.value })}
                    placeholder="Ürün KDV&apos;si varsa o kullanılır"
                  />
                </AdminField>
                <AdminField label="Varsayılan desi/hacim ağırlığı">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={cfg.dimensionalWeight ?? ""}
                    onChange={(e) => setCfg({ ...cfg, dimensionalWeight: e.target.value })}
                    placeholder="Üründe desi/ağırlık yoksa"
                  />
                </AdminField>
              </div>
            </div>
          </>
        ) : null}
        {current?.lastSyncAt ? (
          <p className="text-xs text-zinc-500">
            Son senkron: {new Date(current.lastSyncAt).toLocaleString("tr-TR")}
          </p>
        ) : null}
        {current?.lastError ? (
          <p className="text-xs text-red-600">Son hata: {current.lastError}</p>
        ) : null}
        {selected === "hepsiburada" ? (
          <>
            <AdminField label="OMS URL (hepsiburadaOmsBaseUrl, isteğe bağlı)">
              <input
                className={inputClass}
                placeholder="https://oms-external.hepsiburada.com"
                value={cfg.hepsiburadaOmsBaseUrl ?? ""}
                onChange={(e) => setCfg({ ...cfg, hepsiburadaOmsBaseUrl: e.target.value })}
              />
            </AdminField>
            <AdminField label="MpFinance URL (hepsiburadaFinanceBaseUrl, isteğe bağlı)">
              <input
                className={inputClass}
                placeholder="https://mpfinance-external.hepsiburada.com"
                value={cfg.hepsiburadaFinanceBaseUrl ?? ""}
                onChange={(e) => setCfg({ ...cfg, hepsiburadaFinanceBaseUrl: e.target.value })}
              />
            </AdminField>
            <AdminField label="Ürün API URL (hepsiburadaBaseUrl, isteğe bağlı)">
              <input
                className={inputClass}
                placeholder="https://mpop.hepsiburada.com"
                value={cfg.hepsiburadaBaseUrl ?? ""}
                onChange={(e) => setCfg({ ...cfg, hepsiburadaBaseUrl: e.target.value })}
              />
            </AdminField>
            <p className="text-xs text-zinc-500">
              Satıcı ID = merchant. Sipariş çekme OMS API kullanır; hakediş MpFinance API.
            </p>
          </>
        ) : null}
        {selected === "amazon_tr" ? (
          <>
            <AdminField label="LWA Client ID (lwaClientId)">
              <input
                className={inputClass}
                value={cfg.lwaClientId ?? cfg.apiKey ?? ""}
                onChange={(e) => setCfg({ ...cfg, lwaClientId: e.target.value })}
              />
            </AdminField>
            <AdminField label="LWA Client Secret (lwaClientSecret)">
              <input
                className={inputClass}
                type="password"
                value={cfg.lwaClientSecret ?? cfg.apiSecret ?? ""}
                onChange={(e) => setCfg({ ...cfg, lwaClientSecret: e.target.value })}
              />
            </AdminField>
            <AdminField label="Refresh Token (refreshToken)">
              <input
                className={inputClass}
                type="password"
                value={cfg.refreshToken ?? ""}
                onChange={(e) => setCfg({ ...cfg, refreshToken: e.target.value })}
              />
            </AdminField>
            <AdminField label="Marketplace ID (amazonMarketplaceId)">
              <input
                className={inputClass}
                placeholder="A33AVAJ2PDY3EV (Amazon.com.tr)"
                value={cfg.amazonMarketplaceId ?? "A33AVAJ2PDY3EV"}
                onChange={(e) => setCfg({ ...cfg, amazonMarketplaceId: e.target.value })}
              />
            </AdminField>
            <AdminField label="SP-API bölgesi (amazonRegion)">
              <select
                className={inputClass}
                value={cfg.amazonRegion ?? "eu"}
                onChange={(e) => setCfg({ ...cfg, amazonRegion: e.target.value })}
              >
                <option value="eu">EU (Amazon.com.tr)</option>
                <option value="na">NA</option>
                <option value="fe">FE</option>
              </select>
            </AdminField>
            <p className="text-xs text-zinc-500">
              Orders + Finances rolleri gerekir. Seller ID yukarıdaki alanda.
            </p>
          </>
        ) : null}
        <p className="text-xs text-zinc-500">
          <strong>Trendyol:</strong> ürün gönder/çek, stok/fiyat, sipariş, onay, fatura, hakediş.
          <br />
          <strong>Hepsiburada:</strong> ürün gönder/çek, sipariş (OMS), hakediş (MpFinance).
          <br />
          <strong>Amazon:</strong> ürün çek (Listings), sipariş, hakediş, XML dışa aktarım.
          <br />
          <strong>n11, Çiçeksepeti, Pazarama:</strong> ürün gönder ile işaretlenir · XML dışa aktarım.
          <br />
          Ürün listesinde pazaryeri rozetleri: <strong>Katalog çek</strong> sonrası güncellenir.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={save}>
            Ayarları kaydet
          </button>
          {selected === "trendyol" ? (
            <button
              type="button"
              className={btnSecondary}
              disabled={testBusy || syncBusy}
              onClick={() => void testConnection()}
            >
              {testBusy ? "Test ediliyor…" : "Bağlantıyı test et"}
            </button>
          ) : null}
          <button type="button" className={btnSecondary} onClick={runSync} disabled={syncBusy}>
            {syncBusy ? "…" : "Ürün gönder"}
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={syncBusy}
            onClick={() => void runAction("/api/admin/integrations/marketplaces/catalog/pull", "Katalog çek")}
          >
            Katalog çek
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={syncBusy}
            onClick={() => void runCatalogPullAll()}
          >
            Tüm platformlardan çek
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={syncBusy}
            onClick={() => void runAction("/api/admin/integrations/marketplaces/inventory/sync", "Stok/fiyat")}
          >
            Stok & fiyat güncelle
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={syncBusy}
            onClick={() => void runAction("/api/admin/integrations/marketplaces/orders/pull", "Sipariş çek")}
          >
            Siparişleri çek
          </button>
          <a
            href={`/api/admin/integrations/marketplaces/export?platform=${selected}`}
            className={btnSecondary}
            download
          >
            XML dışa aktar
          </a>
        </div>
        {msg ? (
          <p
            className={`text-sm ${msg.startsWith("✗") ? "text-red-700" : msg.startsWith("✓") ? "text-green-700" : "text-green-700"}`}
          >
            {msg}
          </p>
        ) : null}

        {!marketplaceTablesReady ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Kategori eşlemesi tabloları için Prisma client güncellenmeli: dev sunucuyu durdurun,{" "}
            <code className="text-xs">npx prisma generate</code> çalıştırın, sonra yeniden başlatın.
          </p>
        ) : null}

        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="text-sm font-semibold">Kategori eşlemesi</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Yerel kategori → pazaryeri kategori/marka ID. Boş kategori = varsayılan (entegrasyon ayarındaki ID).
          </p>
          {mappings.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs">
              {mappings.map((m) => (
                <li key={m.id} className="rounded border bg-white px-2 py-1">
                  <strong>{m.categoryTitle}</strong> → kat. {m.platformCategoryId}
                  {m.platformBrandId ? ` · marka ${m.platformBrandId}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-zinc-400">Henüz eşleme yok — varsayılan kategori/marka kullanılır.</p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <AdminField label="Yerel kategori">
              <select
                className={inputClass}
                value={mapCategoryId}
                onChange={(e) => setMapCategoryId(e.target.value)}
              >
                <option value="">Varsayılan (tümü)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Pazaryeri kategori ID">
              <input
                className={inputClass}
                value={mapPlatformCategoryId}
                onChange={(e) => setMapPlatformCategoryId(e.target.value)}
              />
            </AdminField>
            {selected === "trendyol" ? (
              <AdminField label="Pazaryeri marka ID (isteğe bağlı)">
                <input
                  className={inputClass}
                  value={mapPlatformBrandId}
                  onChange={(e) => setMapPlatformBrandId(e.target.value)}
                />
              </AdminField>
            ) : null}
          </div>
          <button
            type="button"
            className={`${btnSecondary} mt-2`}
            disabled={!marketplaceTablesReady}
            onClick={() => void saveCategoryMapping()}
          >
            Eşleme kaydet
          </button>
        </div>

        <MarketplaceCommissionRulesPanel
          platform={selected}
          platformLabel={MARKETPLACE_PLATFORMS.find((x) => x.id === selected)?.label ?? selected}
          categories={categories}
          initialRules={commissionRules}
          tablesReady={commissionTablesReady}
        />

        {selected === "trendyol" ? (
          <MarketplaceAttributeMappingPanel
            platform={selected}
            categories={categories}
            tablesReady={marketplaceTablesReady}
          />
        ) : null}

        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold">Senkron geçmişi</h3>
          {logs.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">Henüz log yok.</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-2 overflow-auto text-xs">
              {logs.map((l) => (
                <li key={l.id} className="rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5">
                  <span className={l.status === "success" ? "text-green-700" : "text-red-600"}>
                    {l.status}
                  </span>{" "}
                  · {l.action} · {new Date(l.createdAt).toLocaleString("tr-TR")}
                  {l.itemsCount != null ? ` · ${l.itemsCount} ürün` : null}
                  {l.message ? <span className="block text-zinc-600">{l.message}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
