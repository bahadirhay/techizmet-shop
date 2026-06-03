"use client";

import { useState } from "react";
import { paytrConfigStatus } from "@/lib/checkout/payment-options";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import type { SiteSettings } from "@/lib/site-settings";

type Settings = {
  payment?: {
    paytr?: { merchantId?: string; merchantKey?: string; merchantSalt?: string; testMode?: boolean };
    iyzico?: { apiKey?: string; secretKey?: string; baseUrl?: string };
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
    const payload: Settings = {
      ...s,
      payment: {
        ...s.payment,
        paytr: {
          ...paytr,
          ...(paytr.merchantKey?.trim() ? { merchantKey: paytr.merchantKey.trim() } : {}),
          ...(paytr.merchantSalt?.trim() ? { merchantSalt: paytr.merchantSalt.trim() } : {}),
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

  return (
    <div className="max-w-2xl space-y-6">
      <section id="paytr" className="scroll-mt-6 rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">PayTR</h2>
        <p
          className={`text-sm ${paytrStatus.configured ? "text-green-700" : "text-amber-800"}`}
        >
          {paytrStatus.configured
            ? "Kartlı ödeme ödeme sayfasında seçenek olarak görünür (test modu yalnızca etiket içindir)."
            : `Kartlı ödeme kapalı — eksik: ${paytrStatus.missing.join(", ")}. Test modu tek başına yetmez.`}
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
          <code className="rounded bg-zinc-100 px-1">
            {(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5555").replace(/\/$/, "")}
            /api/payments/paytr/callback
          </code>
        </p>
      </section>
      <section id="iyzico" className="scroll-mt-6 rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">iyzico</h2>
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
            value={iyzico.secretKey ?? ""}
            onChange={(e) =>
              setS({
                ...s,
                payment: { ...s.payment, iyzico: { ...iyzico, secretKey: e.target.value } },
              })
            }
          />
        </AdminField>
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
