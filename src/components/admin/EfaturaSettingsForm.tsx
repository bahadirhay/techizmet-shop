"use client";

import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

type TestResult = {
  ok: boolean;
  message: string;
  environment?: "TEST" | "PROD";
  portalUrl?: string;
  loginOk?: boolean;
  profileOk?: boolean;
  hint?: string;
  debug?: {
    hasUsername: boolean;
    hasPasswordFromEnv: boolean;
    hasPasswordFromDb: boolean;
    hasPasswordFromForm: boolean;
  };
};

type EfaturaFormState = {
  enabled: boolean;
  testMode: boolean;
  sellerTitle: string;
  sellerTaxId: string;
  sellerTaxOffice: string;
  username: string;
  password: string;
  defaultConsumerTaxId: string;
  defaultVatRate: number;
  autoSign: boolean;
  autoSendMarketplace: boolean;
  autoInvoiceOnShip: boolean;
  hasPassword: boolean;
};

export function EfaturaSettingsForm({ initial }: { initial: EfaturaFormState }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/settings/efatura/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: s.username || undefined,
          password: s.password || undefined,
          testMode: s.testMode,
        }),
      });
      const j = (await res.json()) as TestResult;
      setTestResult(j);
    } catch {
      setTestResult({ ok: false, message: "İstek gönderilemedi." });
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings/efatura", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        efatura: {
          enabled: s.enabled,
          testMode: s.testMode,
          sellerTitle: s.sellerTitle,
          sellerTaxId: s.sellerTaxId,
          sellerTaxOffice: s.sellerTaxOffice,
          username: s.username,
          password: s.password || undefined,
          defaultConsumerTaxId: s.defaultConsumerTaxId,
          defaultVatRate: s.defaultVatRate,
          autoSign: s.autoSign,
          autoSendMarketplace: s.autoSendMarketplace,
          autoInvoiceOnShip: s.autoInvoiceOnShip,
        },
      }),
    });
    const j = (await res.json()) as { efatura?: EfaturaFormState; error?: string };
    setBusy(false);
    if (res.ok && j.efatura) {
      setS({ ...s, ...j.efatura, password: "" });
      setMsg("Kaydedildi ✓");
    } else {
      setMsg(j.error ?? "Kayıt başarısız");
    }
  }

  const canTest = !testing && Boolean(s.username) && (Boolean(s.password) || s.hasPassword);

  return (
    // form etiketi — browser "password not in form" uyarısını giderir
    <form className="admin-card admin-card-pad max-w-2xl" onSubmit={(e) => e.preventDefault()}>
      <p className="text-sm text-zinc-600">
        GİB e-Arşiv portalı üzerinden ücretsiz e-Arşiv faturası kesilir. Kullanıcı kodu ve parola{" "}
        <a
          href="https://earsivportal.efatura.gov.tr/intragiris.html"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--kn-brand)] underline"
        >
          İVD / e-Arşiv portal
        </a>{" "}
        giriş bilgilerinizdir.
      </p>

      <h3 className="mt-6 text-sm font-semibold text-zinc-900">Satıcı bilgileri (ön izleme)</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Fatura ön izlemesinde görünür. Resmi kesimde GİB portalındaki hesap bilgileriniz kullanılır.
      </p>
      <div className="mt-3 space-y-3">
        <AdminField label="Satıcı unvanı">
          <input
            className={inputClass}
            value={s.sellerTitle}
            onChange={(e) => setS({ ...s, sellerTitle: e.target.value })}
            placeholder="Örn. Techizmet Shop Kozmetik Ltd. Şti."
            autoComplete="organization"
          />
        </AdminField>
        <AdminField label="Satıcı VKN">
          <input
            className={inputClass}
            value={s.sellerTaxId}
            onChange={(e) => setS({ ...s, sellerTaxId: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            placeholder="10 haneli VKN"
            inputMode="numeric"
            autoComplete="off"
          />
        </AdminField>
        <AdminField label="Vergi dairesi">
          <input
            className={inputClass}
            value={s.sellerTaxOffice}
            onChange={(e) => setS({ ...s, sellerTaxOffice: e.target.value })}
            placeholder="Örn. Kadıköy"
            autoComplete="off"
          />
        </AdminField>
      </div>

      <label className="mt-6 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.enabled}
          onChange={(e) => setS({ ...s, enabled: e.target.checked })}
        />
        e-Arşiv fatura entegrasyonunu etkinleştir
      </label>

      <label className="mt-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.testMode}
          onChange={(e) => setS({ ...s, testMode: e.target.checked })}
        />
        Test ortamı (earsivportaltest.efatura.gov.tr)
      </label>
      {s.testMode ? (
        <p className="mt-1 text-xs text-amber-700">
          Test ortamı açıkken canlı e-Arşiv portalına girdiğiniz bilgiler çalışmayabilir. Canlı fatura
          kesecekseniz bu kutuyu kapatın.
        </p>
      ) : (
        <p className="mt-1 text-xs text-zinc-500">
          Canlı ortam: earsivportal.efatura.gov.tr — İVD kullanıcı kodu ve şifrenizle giriş yapılır.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <AdminField label="GİB kullanıcı kodu">
          <input
            className={inputClass}
            value={s.username}
            onChange={(e) => setS({ ...s, username: e.target.value })}
            placeholder="İVD kullanıcı kodu"
            autoComplete="username"
          />
        </AdminField>
        <AdminField label="GİB parolası">
          <input
            type="password"
            className={inputClass}
            value={s.password}
            onChange={(e) => setS({ ...s, password: e.target.value })}
            placeholder={s.hasPassword ? "Kayıtlı — değiştirmek veya test etmek için yazın" : "Parola girin"}
            autoComplete="current-password"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {s.hasPassword
              ? "Şifre kayıtlı. Test etmek veya değiştirmek için yeniden yazın."
              : "İVD şifrenizi girin ve Kaydet'e tıklayın."}
          </p>
        </AdminField>
        <AdminField label="B2C varsayılan TCKN (VKN/TCKN yoksa)">
          <input
            className={inputClass}
            value={s.defaultConsumerTaxId}
            onChange={(e) => setS({ ...s, defaultConsumerTaxId: e.target.value })}
            autoComplete="off"
          />
        </AdminField>
        <AdminField
          label="Yedek KDV oranı (%) — kargo satırı için"
          hint="Her ürünün kendi KDV oranı Ürünler → düzenle sayfasından ayarlanır ve faturada otomatik kullanılır. Bu alan yalnızca kargo bedeli ve ürüne oran atanmamış istisnai durumlarda devreye girer."
        >
          <input
            type="number"
            min={0}
            max={100}
            className={inputClass}
            value={s.defaultVatRate}
            onChange={(e) => setS({ ...s, defaultVatRate: Number(e.target.value) || 20 })}
          />
        </AdminField>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.autoSign}
            onChange={(e) => setS({ ...s, autoSign: e.target.checked })}
          />
          Faturayı otomatik imzala (SMS doğrulama gerekebilir)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.autoSendMarketplace}
            onChange={(e) => setS({ ...s, autoSendMarketplace: e.target.checked })}
          />
          Pazaryeri siparişlerinde faturayı otomatik Trendyol&apos;a ilet
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.autoInvoiceOnShip}
            onChange={(e) => setS({ ...s, autoInvoiceOnShip: e.target.checked })}
          />
          <span>
            <strong>Oto-fatura:</strong> Sipariş &quot;kargoya verildi&quot; statüsüne geçince otomatik fatura kes
            <span className="ml-1 text-xs text-zinc-400">(KDV takibine de otomatik girer)</span>
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={busy} onClick={() => void save()}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          disabled={!canTest}
          onClick={() => void testConnection()}
          title={!s.password && s.hasPassword ? "Test için şifrenizi tekrar yazın veya kayıtlı şifreyle test edin" : ""}
        >
          {testing ? "Test ediliyor…" : "GİB Bağlantısını Test Et"}
        </button>
      </div>

      {!s.password && s.hasPassword && (
        <p className="mt-2 text-xs text-amber-600">
          ⚠ Test için şifrenizi parola alanına yazın (DB&apos;deki şifreyle de otomatik test edilir).
        </p>
      )}

      {msg ? (
        <p className={`mt-2 text-sm ${msg.includes("✓") ? "text-emerald-700" : "text-zinc-600"}`}>{msg}</p>
      ) : null}

      {testResult && (
        <div
          className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
            testResult.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="font-medium">{testResult.ok ? "✓" : "✗"} {testResult.message}</div>
          {testResult.portalUrl ? (
            <div className="mt-1 text-xs opacity-80">
              Ortam: {testResult.environment === "TEST" ? "Test" : "Canlı"} — {testResult.portalUrl}
              {testResult.loginOk === true && testResult.profileOk === false ? " · Giriş OK, profil eksik" : null}
            </div>
          ) : null}
          {testResult.hint ? (
            <p className="mt-2 text-xs leading-relaxed opacity-90">{testResult.hint}</p>
          ) : null}
          {testResult.debug && (
            <div className="mt-1.5 text-xs opacity-75 space-y-0.5">
              <div>Kullanıcı kodu: {testResult.debug.hasUsername ? "✓ mevcut" : "✗ eksik — girin"}</div>
              <div>Şifre (formdan): {testResult.debug.hasPasswordFromForm ? "✓" : "—"}</div>
              <div>Şifre (DB): {testResult.debug.hasPasswordFromDb ? "✓ kayıtlı" : "✗ DB&apos;de yok — kaydedin"}</div>
              <div>Şifre (ENV GIB_PASSWORD): {testResult.debug.hasPasswordFromEnv ? "✓" : "—"}</div>
              {!testResult.debug.hasPasswordFromDb && !testResult.debug.hasPasswordFromEnv && !testResult.debug.hasPasswordFromForm && (
                <div className="mt-1 font-medium">→ Parola alanını doldurup &quot;Kaydet&quot;e basın, ardından test edin.</div>
              )}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
