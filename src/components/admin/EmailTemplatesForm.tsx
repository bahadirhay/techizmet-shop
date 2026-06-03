"use client";

import Link from "next/link";
import { useState } from "react";
import { EMAIL_TEMPLATE_PLACEHOLDERS, DEFAULT_EMAIL_TEMPLATES } from "@/lib/email/defaults";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { EmailTemplateKey, SiteSettings } from "@/lib/site-settings";

const TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  orderConfirmation: "Sipariş onayı (checkout sonrası)",
  orderShipped: "Kargoya verildi (durum: kargoda)",
  orderCancelled: "Sipariş iptali (durum: iptal)",
};

export function EmailTemplatesForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [active, setActive] = useState<EmailTemplateKey>("orderConfirmation");
  const [msg, setMsg] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testBusy, setTestBusy] = useState(false);

  const custom = s.email?.templates ?? {};
  const defaults = DEFAULT_EMAIL_TEMPLATES[active];
  const current = {
    subject: custom[active]?.subject?.trim() || defaults.subject,
    bodyHtml: custom[active]?.bodyHtml?.trim() || defaults.bodyHtml,
  };

  function setTemplate(field: "subject" | "bodyHtml", value: string) {
    const prev = custom[active] ?? { subject: "", bodyHtml: "" };
    setS({
      ...s,
      email: {
        ...s.email,
        templates: {
          ...custom,
          [active]: {
            subject: field === "subject" ? value : prev.subject,
            bodyHtml: field === "bodyHtml" ? value : prev.bodyHtml,
          },
        },
      },
    });
  }

  function loadDefault() {
    const d = DEFAULT_EMAIL_TEMPLATES[active];
    setS({
      ...s,
      email: {
        ...s.email,
        templates: { ...custom, [active]: { ...d } },
      },
    });
  }

  async function sendTest() {
    if (!testTo.trim()) {
      setMsg("Test için e-posta adresi girin");
      return;
    }
    setTestBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/integrations/emails/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey: active, to: testTo.trim() }),
    });
    const j = (await res.json()) as { message?: string; error?: string; reason?: string };
    setTestBusy(false);
    setMsg(j.message ?? j.error ?? (res.ok ? "Gönderildi" : "Gönderilemedi"));
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

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <ul className="space-y-1 rounded-xl border bg-white p-2">
        {(Object.keys(TEMPLATE_LABELS) as EmailTemplateKey[]).map((key) => (
          <li key={key}>
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${active === key ? "bg-zinc-100 font-medium" : "hover:bg-zinc-50"}`}
              onClick={() => setActive(key)}
            >
              {TEMPLATE_LABELS[key]}
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">{TEMPLATE_LABELS[active]}</h2>
        <p className="text-xs text-zinc-500">
          Boş bırakılan alanlar varsayılan şablonu kullanır. Gönderen adresi ve hangi olaylarda mail
          gideceği:{" "}
          <Link href="/admin/settings/notifications" className="text-[var(--kn-brand)] underline">
            Bildirim ayarları
          </Link>
          . Sunucu bağlantısı:{" "}
          <Link href="/admin/settings/notifications#smtp" className="text-[var(--kn-brand)] underline">
            E-posta sunucusu (SMTP)
          </Link>
          .
        </p>
        <details className="text-xs text-zinc-600">
          <summary className="cursor-pointer font-medium">Kullanılabilir değişkenler</summary>
          <p className="mt-2 font-mono">{EMAIL_TEMPLATE_PLACEHOLDERS.join(" ")}</p>
        </details>
        <AdminField label="Konu (subject)">
          <input
            className={inputClass}
            value={current.subject}
            placeholder={DEFAULT_EMAIL_TEMPLATES[active].subject}
            onChange={(e) => setTemplate("subject", e.target.value)}
          />
        </AdminField>
        <AdminField label="HTML gövde">
          <textarea
            className={`${inputClass} min-h-[280px] font-mono text-xs`}
            value={current.bodyHtml}
            placeholder="Varsayılanı kullanmak için boş bırakın"
            onChange={(e) => setTemplate("bodyHtml", e.target.value)}
          />
        </AdminField>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={save}>
            Kaydet
          </button>
          <button type="button" className={btnSecondary} onClick={loadDefault}>
            Varsayılanı yükle
          </button>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-medium">Test gönder</p>
          <p className="mt-1 text-xs text-zinc-500">Örnek sipariş verileriyle seçili şablonu gönderir.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className={`${inputClass} max-w-xs`}
              type="email"
              placeholder="test@ornek.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <button type="button" className={btnSecondary} onClick={sendTest} disabled={testBusy}>
              {testBusy ? "Gönderiliyor…" : "Test e-postası gönder"}
            </button>
          </div>
        </div>
        {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      </div>
    </div>
  );
}
