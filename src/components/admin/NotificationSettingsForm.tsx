"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { SiteSettings } from "@/lib/site-settings";

export function NotificationSettingsForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const email = s.notifications?.email ?? {};
  const sms = s.notifications?.sms ?? {};
  const telegram = s.notifications?.telegram ?? {};

  function patchEmail(patch: Partial<NonNullable<SiteSettings["notifications"]>["email"]>) {
    setS({
      ...s,
      notifications: {
        ...s.notifications,
        email: { ...email, ...patch },
      },
    });
  }

  function patchSms(patch: Partial<NonNullable<SiteSettings["notifications"]>["sms"]>) {
    setS({
      ...s,
      notifications: {
        ...s.notifications,
        sms: { ...sms, ...patch, provider: "netgsm" },
      },
    });
  }

  function patchTelegram(
    patch: Partial<NonNullable<SiteSettings["notifications"]>["telegram"]>,
  ) {
    setS({
      ...s,
      notifications: {
        ...s.notifications,
        telegram: { ...telegram, ...patch },
      },
    });
  }

  async function save() {
    setMsg(null);
    const res = await fetch("/api/admin/integrations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setMsg(res.ok ? "Kaydedildi" : "Kayıt başarısız");
  }

  async function testTelegram() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/integrations/telegram/test", { method: "POST" });
    const j = (await res.json()) as { message?: string; error?: string };
    setBusy(false);
    setMsg(j.message ?? j.error ?? (res.ok ? "Telegram mesajı gönderildi" : "Gönderilemedi"));
  }

  async function testSms() {
    if (!testPhone.trim()) {
      setMsg("Test telefonu girin");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/integrations/sms/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testPhone.trim() }),
    });
    const j = (await res.json()) as { message?: string; error?: string };
    setBusy(false);
    setMsg(j.message ?? j.error ?? (res.ok ? "SMS gönderildi" : "Gönderilemedi"));
  }

  return (
    <div className="space-y-8">
      <section id="email" className="scroll-mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">E-posta bildirimleri</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Gönderim için sunucuda <code>RESEND_API_KEY</code> gerekir. Gönderen adresi buradan veya{" "}
          <code>MAIL_FROM</code> (.env) ile ayarlanır. Şablon metinleri:{" "}
          <Link href="/admin/integrations/emails" className="text-[var(--kn-brand)] underline">
            E-posta şablonları
          </Link>
          .
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={email.enabled !== false}
            onChange={(e) => patchEmail({ enabled: e.target.checked })}
          />
          E-posta bildirimleri açık
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Gönderen adı">
            <input
              className={inputClass}
              value={email.fromName ?? ""}
              onChange={(e) => patchEmail({ fromName: e.target.value })}
              placeholder="Anatolian Paw"
            />
          </AdminField>
          <AdminField label="Gönderen e-posta">
            <input
              className={inputClass}
              type="email"
              value={email.fromEmail ?? ""}
              onChange={(e) => patchEmail({ fromEmail: e.target.value })}
              placeholder="siparis@anatolianpaw.com"
            />
          </AdminField>
          <AdminField label="Yanıt adresi (reply-to)">
            <input
              className={inputClass}
              type="email"
              value={email.replyTo ?? ""}
              onChange={(e) => patchEmail({ replyTo: e.target.value })}
            />
          </AdminField>
          <AdminField label="Yönetici bildirimi — alıcılar (virgülle)">
            <input
              className={inputClass}
              value={email.adminRecipients ?? ""}
              onChange={(e) => patchEmail({ adminRecipients: e.target.value })}
              placeholder="admin@anatolianpaw.com, depo@..."
            />
          </AdminField>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={email.orderConfirmation !== false}
              onChange={(e) => patchEmail({ orderConfirmation: e.target.checked })}
            />
            Sipariş onayı (müşteriye)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={email.orderShipped !== false}
              onChange={(e) => patchEmail({ orderShipped: e.target.checked })}
            />
            Kargoya verildi
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={email.orderCancelled !== false}
              onChange={(e) => patchEmail({ orderCancelled: e.target.checked })}
            />
            Sipariş iptali
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={email.adminOnNewOrder === true}
              onChange={(e) => patchEmail({ adminOnNewOrder: e.target.checked })}
            />
            Yeni siparişte yöneticilere e-posta
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className={`${inputClass} max-w-xs`}
            type="email"
            placeholder="Test e-posta"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <Link
            href="/admin/integrations/emails"
            className={`${btnSecondary} inline-flex items-center`}
          >
            Şablon testi →
          </Link>
        </div>
      </section>

      <section id="sms" className="scroll-mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">SMS bildirimleri</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Netgsm hesabı gerekir. Bilgiler bu mağazanın ayarlarında saklanır (site başına ayrı).
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sms.enabled === true}
            onChange={(e) => patchSms({ enabled: e.target.checked })}
          />
          SMS bildirimleri açık
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Netgsm kullanıcı kodu">
            <input
              className={inputClass}
              value={sms.userCode ?? ""}
              onChange={(e) => patchSms({ userCode: e.target.value })}
              autoComplete="off"
            />
          </AdminField>
          <AdminField label="Netgsm şifre">
            <input
              className={inputClass}
              type="password"
              value={sms.password ?? ""}
              onChange={(e) => patchSms({ password: e.target.value })}
              autoComplete="new-password"
            />
          </AdminField>
          <AdminField label="SMS başlık (msgheader)">
            <input
              className={inputClass}
              value={sms.msgHeader ?? ""}
              onChange={(e) => patchSms({ msgHeader: e.target.value })}
            />
          </AdminField>
          <AdminField label="Yönetici telefon (opsiyonel)">
            <input
              className={inputClass}
              value={sms.adminPhone ?? ""}
              onChange={(e) => patchSms({ adminPhone: e.target.value })}
              placeholder="5xx xxx xx xx"
            />
          </AdminField>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sms.orderConfirmation === true}
              onChange={(e) => patchSms({ orderConfirmation: e.target.checked })}
            />
            Sipariş onayı SMS (müşteri telefonu)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sms.orderShipped === true}
              onChange={(e) => patchSms({ orderShipped: e.target.checked })}
            />
            Kargoya verildi SMS
          </label>
        </div>

        <AdminField label="SMS metni şablonu">
          <textarea
            className={`${inputClass} min-h-[80px] font-mono text-xs`}
            value={sms.defaultBody ?? ""}
            onChange={(e) => patchSms({ defaultBody: e.target.value })}
            placeholder="{{storeName}}: Siparis {{orderNumber}} — {{total}}"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Değişkenler: {"{{storeName}} {{orderNumber}} {{total}} {{storeUrl}}"}
          </p>
        </AdminField>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} max-w-xs`}
            placeholder="5xx xxx xx xx"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
          <button type="button" className={btnSecondary} disabled={busy} onClick={testSms}>
            Test SMS gönder
          </button>
        </div>
      </section>

      <section id="telegram" className="scroll-mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Telegram bildirimleri</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Yeni sipariş geldiğinde Telegram grubuna veya kanala mesaj gider.{" "}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--kn-brand)] underline"
          >
            @BotFather
          </a>{" "}
          ile bot oluşturup token alın; chat id için botu gruba ekleyip{" "}
          <code className="text-xs">getUpdates</code> veya{" "}
          <code className="text-xs">@userinfobot</code> kullanabilirsiniz.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={telegram.enabled === true}
            onChange={(e) => patchTelegram({ enabled: e.target.checked })}
          />
          Telegram bildirimleri açık
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Bot token">
            <input
              className={inputClass}
              type="password"
              value={telegram.botToken ?? ""}
              onChange={(e) => patchTelegram({ botToken: e.target.value })}
              placeholder="123456789:ABC..."
              autoComplete="off"
            />
          </AdminField>
          <AdminField label="Chat ID">
            <input
              className={inputClass}
              value={telegram.chatId ?? ""}
              onChange={(e) => patchTelegram({ chatId: e.target.value })}
              placeholder="-1001234567890"
            />
          </AdminField>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={telegram.onNewOrder !== false}
            onChange={(e) => patchTelegram({ onNewOrder: e.target.checked })}
          />
          Yeni siparişte Telegram mesajı gönder
        </label>

        <div className="mt-4">
          <button type="button" className={btnSecondary} disabled={busy} onClick={testTelegram}>
            Test Telegram mesajı gönder
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            Önce ayarları kaydedin; test mevcut kayıtlı token ve chat id ile çalışır.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} onClick={save}>
          Kaydet
        </button>
        {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
      </div>
    </div>
  );
}
