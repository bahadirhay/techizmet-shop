"use client";

import { useState } from "react";
import {
  iyzicoConfigStatus,
  paytrConfigStatus,
} from "@/lib/checkout/payment-options";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import type { SiteSettings } from "@/lib/site-settings";
import type { CardProviderId } from "@/lib/payments/card-provider";

type Settings = {
  payment?: {
    cardProvider?: CardProviderId;
    paytr?: { merchantId?: string; merchantKey?: string; merchantSalt?: string; testMode?: boolean };
    iyzico?: { apiKey?: string; secretKey?: string; baseUrl?: string; testMode?: boolean };
    codEnabled?: boolean;
    bankTransferEnabled?: boolean;
    bankAccounts?: { bank: string; iban: string; holder: string }[];
  };
  store?: { freeShippingOverMinor?: number };
};

export function PaymentSettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const paytr = s.payment?.paytr ?? {};
    const iyzicoPatch = s.payment?.iyzico ?? {};
    const payload: Settings = {
      ...s,
      payment: {
        ...s.payment,
        paytr: {
          ...paytr,
          ...(paytr.merchantKey?.trim() ? { merchantKey: paytr.merchantKey.trim() } : {}),
          ...(paytr.merchantSalt?.trim() ? { merchantSalt: paytr.merchantSalt.trim() } : {}),
        },
        iyzico: {
          ...iyzicoPatch,
          ...(iyzicoPatch.secretKey?.trim() ? { secretKey: iyzicoPatch.secretKey.trim() } : {}),
        },
      },
    };
    const res = await fetch("/api/admin/integrations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMsg(res.ok ? "Kaydedildi" : "Hata");
  }

  const paytr = s.payment?.paytr ?? {};
  const paytrStatus = paytrConfigStatus(s as SiteSettings);
  const iyzico = s.payment?.iyzico ?? {};
  const iyzicoStatus = iyzicoConfigStatus(s as SiteSettings);
  const cardProvider = s.payment?.cardProvider === "paytr" ? "paytr" : "iyzico";
  const activeProviderOk =
    cardProvider === "iyzico" ? iyzicoStatus.configured : paytrStatus.configured;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.anatolianpaw.com").replace(
    /\/$/,
    "",
  );

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Kartlı ödeme sağlayıcısı</h2>
        <p className="text-sm text-zinc-600">
          Müşteri ödeme sayfasında yalnızca <strong>seçili</strong> sağlayıcı kullanılır. Diğerinin
          bilgileri kayıtlı kalabilir; seçim değişince geçiş yaparsınız.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="cardProvider"
              checked={cardProvider === "iyzico"}
              onChange={() =>
                setS({ ...s, payment: { ...s.payment, cardProvider: "iyzico" } })
              }
            />
            iyzico
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="cardProvider"
              checked={cardProvider === "paytr"}
              onChange={() =>
                setS({ ...s, payment: { ...s.payment, cardProvider: "paytr" } })
              }
            />
            PayTR
          </label>
        </div>
        <p className={`text-sm ${activeProviderOk ? "text-green-700" : "text-amber-800"}`}>
          {activeProviderOk
            ? `Kartlı ödeme açık — aktif sağlayıcı: ${cardProvider === "iyzico" ? "iyzico" : "PayTR"}`
            : cardProvider === "iyzico"
              ? `iyzico seçili ama eksik: ${iyzicoStatus.missing.join(", ")}`
              : `PayTR seçili ama eksik: ${paytrStatus.missing.join(", ")}`}
        </p>
      </section>

      <section id="iyzico" className="scroll-mt-6 rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">iyzico</h2>
        <p
          className={`text-sm ${iyzicoStatus.configured ? "text-green-700" : "text-amber-800"}`}
        >
          {iyzicoStatus.configured
            ? `Bilgiler tamam${iyzicoStatus.testMode ? " (sandbox/test)" : " (canlı)"}.`
            : `Eksik: ${iyzicoStatus.missing.join(", ")}`}
        </p>
        <AdminField label="API Key">
          <input
            className={inputClass}
            value={iyzico.apiKey ?? ""}
            onChange={(e) =>
              setS({
                ...s,
                payment: { ...s.payment, iyzico: { ...iyzico, apiKey: e.target.value } },
              })
            }
          />
        </AdminField>
        <AdminField label="Secret Key">
          <input
            className={inputClass}
            type="password"
            placeholder={iyzico.secretKey ? "Kayıtlı — değiştirmek için yazın" : ""}
            value={iyzico.secretKey ?? ""}
            onChange={(e) =>
              setS({
                ...s,
                payment: { ...s.payment, iyzico: { ...iyzico, secretKey: e.target.value } },
              })
            }
          />
        </AdminField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={iyzico.testMode ?? true}
            onChange={(e) =>
              setS({
                ...s,
                payment: {
                  ...s.payment,
                  iyzico: { ...iyzico, testMode: e.target.checked },
                },
              })
            }
          />
          Test modu (sandbox-api.iyzipay.com)
        </label>
        <p className="text-xs text-zinc-500">
          Callback URL (iyzico panel):{" "}
          <code className="rounded bg-zinc-100 px-1">{siteUrl}/api/payments/iyzico/callback</code>
        </p>
      </section>

      <section id="paytr" className="scroll-mt-6 rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">PayTR</h2>
        <p
          className={`text-sm ${paytrStatus.configured ? "text-green-700" : "text-amber-800"}`}
        >
          {paytrStatus.configured
            ? "Bilgiler tamam — kartlı ödeme için seçilebilir."
            : `Eksik: ${paytrStatus.missing.join(", ")}`}
        </p>
        <AdminField label="Mağaza no (merchant_id)">
          <input
            className={inputClass}
            value={paytr.merchantId ?? ""}
            onChange={(e) =>
              setS({
                ...s,
                payment: { ...s.payment, paytr: { ...paytr, merchantId: e.target.value } },
              })
            }
          />
        </AdminField>
        <AdminField label="Merchant key">
          <input
            className={inputClass}
            type="password"
            placeholder={paytr.merchantKey ? "Kayıtlı — değiştirmek için yazın" : ""}
            value={paytr.merchantKey ?? ""}
            onChange={(e) =>
              setS({
                ...s,
                payment: { ...s.payment, paytr: { ...paytr, merchantKey: e.target.value } },
              })
            }
          />
        </AdminField>
        <AdminField label="Merchant salt">
          <input
            className={inputClass}
            type="password"
            placeholder={paytr.merchantSalt ? "Kayıtlı — değiştirmek için yazın" : ""}
            value={paytr.merchantSalt ?? ""}
            onChange={(e) =>
              setS({
                ...s,
                payment: { ...s.payment, paytr: { ...paytr, merchantSalt: e.target.value } },
              })
            }
          />
        </AdminField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={paytr.testMode ?? false}
            onChange={(e) =>
              setS({
                ...s,
                payment: { ...s.payment, paytr: { ...paytr, testMode: e.target.checked } },
              })
            }
          />
          Test modu (PayTR sandbox)
        </label>
        <p className="text-xs text-zinc-500">
          Callback URL (PayTR panel):{" "}
          <code className="rounded bg-zinc-100 px-1">{siteUrl}/api/payments/paytr/callback</code>
        </p>
      </section>

      <section id="havale" className="scroll-mt-6 rounded-xl border bg-white p-6 space-y-3">
        <h2 className="font-semibold">Havale & kapıda ödeme</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.payment?.codEnabled ?? false}
            onChange={(e) =>
              setS({ ...s, payment: { ...s.payment, codEnabled: e.target.checked } })
            }
          />
          Kapıda ödeme
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.payment?.bankTransferEnabled ?? false}
            onChange={(e) =>
              setS({ ...s, payment: { ...s.payment, bankTransferEnabled: e.target.checked } })
            }
          />
          Havale / EFT
        </label>
      </section>
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      <button type="button" className={btnPrimary} onClick={save}>
        Kaydet
      </button>
    </div>
  );
}
