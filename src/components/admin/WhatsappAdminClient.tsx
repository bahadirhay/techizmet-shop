"use client";

import type { WhatsAppBotNode, WhatsAppLead } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WhatsappBotFlowEditor } from "@/components/admin/WhatsappBotFlowEditor";
import { WhatsappInboxClient } from "@/components/admin/WhatsappInboxClient";
import { AssistantFoundationPanel } from "@/components/admin/AssistantFoundationPanel";
import type { StoreWhatsAppSettings } from "@/lib/whatsapp-settings";
import type { StoreAssistantSettings } from "@/lib/assistant/settings";

type CountRow = { status: string; _count: { _all: number } };

function strForInput(v: string | undefined) {
  return v?.trim() ?? "";
}

export function WhatsappAdminClient({
  initialWhatsapp,
  resolvedNumber,
  initialLeads,
  initialCounts,
  initialBotNodes,
  initialAssistant,
  initialKnowledgeCount,
  siteName,
}: {
  initialWhatsapp: StoreWhatsAppSettings;
  resolvedNumber: string | null;
  initialLeads: WhatsAppLead[];
  initialCounts: CountRow[];
  initialBotNodes: WhatsAppBotNode[];
  initialAssistant: StoreAssistantSettings;
  initialKnowledgeCount: number;
  siteName: string;
}) {
  const router = useRouter();
  const [row, setRow] = useState({
    number: initialWhatsapp.number ?? "",
    defaultMessage: initialWhatsapp.defaultMessage ?? "",
    botEnabled: !!initialWhatsapp.botEnabled,
    botTitle: initialWhatsapp.botTitle ?? "",
    botWelcome: initialWhatsapp.botWelcome ?? "",
    floatingEnabled: initialWhatsapp.floatingEnabled !== false,
  });
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const res = await fetch("/api/admin/whatsapp/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: row.number.trim() || undefined,
        defaultMessage: row.defaultMessage.trim() || undefined,
        botEnabled: row.botEnabled,
        botTitle: row.botTitle.trim() || undefined,
        botWelcome: row.botWelcome.trim() || undefined,
        floatingEnabled: row.floatingEnabled,
      }),
    });
    if (!res.ok) {
      let detail = `Kayıt başarısız (${res.status})`;
      try {
        const j = (await res.json()) as { error?: string };
        if (j.error?.trim()) detail = j.error;
      } catch {
        /* ignore */
      }
      setFeedback({ text: detail, error: true });
      setSaving(false);
      return;
    }
    setFeedback({ text: "Kaydedildi.", error: false });
    setSaving(false);
    router.refresh();
  }

  const displayNumber = row.number.trim() || resolvedNumber;

  return (
    <div className="space-y-10">
      {feedback ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            feedback.error
              ? "border border-red-200 bg-red-50 text-red-900"
              : "border border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <form onSubmit={save} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="grid gap-1 text-sm">
          Numara (ülke kodu ile, örn. 905551112233)
          <input
            className="rounded border border-zinc-300 px-2 py-2 font-mono text-sm"
            value={row.number}
            onChange={(e) => setRow((r) => ({ ...r, number: e.target.value }))}
            placeholder={resolvedNumber ?? "905551112233"}
            autoComplete="off"
          />
          {!row.number.trim() && resolvedNumber ? (
            <span className="text-xs text-zinc-500">
              Boş bırakılırsa mağaza ayarlarındaki telefon kullanılır: {resolvedNumber}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm">
          Varsayılan mesaj (Ref otomatik eklenir)
          <textarea
            className="min-h-[4.5rem] rounded border border-zinc-300 px-2 py-2 text-sm"
            value={row.defaultMessage}
            onChange={(e) => setRow((r) => ({ ...r, defaultMessage: e.target.value }))}
            placeholder="Merhaba, bilgi almak istiyorum."
          />
        </label>

        <div className="border-t border-zinc-100 pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={row.floatingEnabled}
              onChange={(e) => setRow((r) => ({ ...r, floatingEnabled: e.target.checked }))}
            />
            Sol alt sabit WhatsApp balonu (bot kapalıyken)
          </label>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={row.botEnabled}
              onChange={(e) => setRow((r) => ({ ...r, botEnabled: e.target.checked }))}
            />
            Site bot asistanı (sağ alt köşe)
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Açıkken ziyaretçi menüden seçim yapar; son adımda WhatsApp açılır.
          </p>
        </div>

        {row.botEnabled ? (
          <>
            <label className="grid gap-1 text-sm">
              Bot başlığı
              <input
                className="rounded border border-zinc-300 px-2 py-2 text-sm"
                value={strForInput(row.botTitle)}
                onChange={(e) => setRow((r) => ({ ...r, botTitle: e.target.value }))}
                placeholder="Size nasıl yardımcı olabiliriz?"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Karşılama metni
              <textarea
                className="min-h-[3rem] rounded border border-zinc-300 px-2 py-2 text-sm"
                value={strForInput(row.botWelcome)}
                onChange={(e) => setRow((r) => ({ ...r, botWelcome: e.target.value }))}
                placeholder="Bir konu seçin…"
              />
            </label>
          </>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>

      <AssistantFoundationPanel
        initialAssistant={initialAssistant}
        initialKnowledgeCount={initialKnowledgeCount}
        siteName={siteName}
      />

      {row.botEnabled ? (
        <WhatsappBotFlowEditor
          initialNodes={initialBotNodes}
          onRefresh={() => router.refresh()}
        />
      ) : null}

      <WhatsappInboxClient
        initialLeads={initialLeads}
        initialCounts={initialCounts}
        whatsappNumber={displayNumber}
      />
    </div>
  );
}
