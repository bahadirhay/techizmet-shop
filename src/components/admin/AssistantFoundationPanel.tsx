"use client";

import type { StoreAssistantSettings } from "@/lib/assistant/settings";
import type { AssistantPipelineResult } from "@/lib/assistant/types";
import { useState } from "react";

type TestTurn = {
  user: string;
  result: AssistantPipelineResult;
};

export function AssistantFoundationPanel({
  initialAssistant,
  initialKnowledgeCount,
  siteName,
}: {
  initialAssistant: StoreAssistantSettings;
  initialKnowledgeCount: number;
  siteName: string;
}) {
  const [settings, setSettings] = useState({
    enabled: initialAssistant.enabled !== false,
    brandName: initialAssistant.brandName ?? siteName,
    aiEnabled: initialAssistant.aiEnabled !== false,
    aiOnlyWhenNoKnowledge: initialAssistant.aiOnlyWhenNoKnowledge !== false,
    knowledgeMinScore:
      typeof initialAssistant.knowledgeMinScore === "number"
        ? initialAssistant.knowledgeMinScore
        : 0.35,
    handoffKeywords: (initialAssistant.handoffKeywords ?? []).join(", "),
    channelWhatsapp: initialAssistant.channels?.whatsapp?.enabled !== false,
    channelTrendyol: initialAssistant.channels?.trendyol?.enabled !== false,
    channelTest: initialAssistant.channels?.test?.enabled !== false,
  });
  const [knowledgeCount, setKnowledgeCount] = useState(initialKnowledgeCount);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [turns, setTurns] = useState<TestTurn[]>([]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const res = await fetch("/api/admin/assistant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: settings.enabled,
        brandName: settings.brandName.trim() || siteName,
        aiEnabled: settings.aiEnabled,
        aiOnlyWhenNoKnowledge: settings.aiOnlyWhenNoKnowledge,
        knowledgeMinScore: settings.knowledgeMinScore,
        handoffKeywords: settings.handoffKeywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        channels: {
          whatsapp: { enabled: settings.channelWhatsapp },
          trendyol: { enabled: settings.channelTrendyol },
          test: { enabled: settings.channelTest },
        },
      } satisfies StoreAssistantSettings),
    });
    setSaving(false);
    if (!res.ok) {
      setFeedback({ text: "Ayarlar kaydedilemedi.", error: true });
      return;
    }
    setFeedback({ text: "Asistan ayarları kaydedildi.", error: false });
  }

  async function syncProducts() {
    setSyncing(true);
    setFeedback(null);
    const res = await fetch("/api/admin/assistant/knowledge/sync-products", { method: "POST" });
    setSyncing(false);
    if (!res.ok) {
      setFeedback({ text: "Ürün senkronu başarısız.", error: true });
      return;
    }
    const data = (await res.json()) as { synced: number; deactivated: number };
    setKnowledgeCount((c) => c + data.synced - data.deactivated);
    setFeedback({
      text: `${data.synced} ürün bilgi tabanına işlendi${data.deactivated ? `, ${data.deactivated} pasifleştirildi` : ""}.`,
      error: false,
    });
  }

  async function runTest(e: React.FormEvent) {
    e.preventDefault();
    const msg = testInput.trim();
    if (!msg) return;
    setTesting(true);
    setFeedback(null);
    const res = await fetch("/api/admin/assistant/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    setTesting(false);
    if (!res.ok) {
      setFeedback({ text: "Test mesajı işlenemedi.", error: true });
      return;
    }
    const result = (await res.json()) as AssistantPipelineResult;
    setTurns((prev) => [...prev, { user: msg, result }]);
    setTestInput("");
  }

  return (
    <div className="space-y-6 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <div>
        <h2 className="text-lg font-semibold text-violet-950">AI İşletme Asistanı</h2>
        <p className="mt-1 text-sm text-violet-900/80">
          Çok kiracılı motor: bilgi tabanı → AI → canlı destek. Şimdilik test kanalı ve ürün
          senkronu; WhatsApp / Trendyol bağlantısı sonraki adım.
        </p>
      </div>

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

      <form onSubmit={saveSettings} className="space-y-4 rounded-lg border border-violet-100 bg-white p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
          />
          Asistan etkin
        </label>

        <label className="grid gap-1 text-sm">
          Marka / işletme adı
          <input
            className="rounded border border-zinc-300 px-2 py-2 text-sm"
            value={settings.brandName}
            onChange={(e) => setSettings((s) => ({ ...s, brandName: e.target.value }))}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.channelTest}
              onChange={(e) => setSettings((s) => ({ ...s, channelTest: e.target.checked }))}
            />
            Test kanalı
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.channelWhatsapp}
              onChange={(e) => setSettings((s) => ({ ...s, channelWhatsapp: e.target.checked }))}
            />
            WhatsApp (hazırlık)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.channelTrendyol}
              onChange={(e) => setSettings((s) => ({ ...s, channelTrendyol: e.target.checked }))}
            />
            Trendyol (hazırlık)
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.aiEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, aiEnabled: e.target.checked }))}
          />
          AI katmanı (SEO AI anahtarları kullanılır)
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.aiOnlyWhenNoKnowledge}
            onChange={(e) =>
              setSettings((s) => ({ ...s, aiOnlyWhenNoKnowledge: e.target.checked }))
            }
          />
          AI yalnızca bilgi tabanında yeterli eşleşme yoksa
        </label>

        <label className="grid gap-1 text-sm">
          Bilgi tabanı minimum skor ({settings.knowledgeMinScore.toFixed(2)})
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={settings.knowledgeMinScore}
            onChange={(e) =>
              setSettings((s) => ({ ...s, knowledgeMinScore: Number(e.target.value) }))
            }
          />
        </label>

        <label className="grid gap-1 text-sm">
          Canlı destek anahtar kelimeleri (virgülle)
          <input
            className="rounded border border-zinc-300 px-2 py-2 text-sm"
            value={settings.handoffKeywords}
            onChange={(e) => setSettings((s) => ({ ...s, handoffKeywords: e.target.value }))}
            placeholder="insan, temsilci, yetkili"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : "Asistan ayarlarını kaydet"}
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void syncProducts()}
            className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
          >
            {syncing ? "Senkron…" : "Ürünleri bilgi tabanına al"}
          </button>
          <span className="text-xs text-zinc-500">Aktif kayıt: {knowledgeCount}</span>
        </div>
      </form>

      <form onSubmit={runTest} className="space-y-3 rounded-lg border border-violet-100 bg-white p-4">
        <h3 className="text-sm font-semibold">Test sohbeti</h3>
        <p className="text-xs text-zinc-500">
          Önce ürün senkronu yapın, sonra örn. ürün adı veya fiyat sorun. Katman (knowledge / ai /
          handoff) aşağıda görünür.
        </p>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-2 text-sm"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Örn: Girtlak spreyi fiyatı nedir?"
          />
          <button
            type="submit"
            disabled={testing}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {testing ? "…" : "Gönder"}
          </button>
        </div>

        {turns.length ? (
          <ul className="max-h-96 space-y-3 overflow-y-auto text-sm">
            {[...turns].reverse().map((turn, i) => (
              <li key={`${turn.user}-${i}`} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <p className="font-medium text-zinc-800">Siz: {turn.user}</p>
                <p className="mt-2 whitespace-pre-wrap text-zinc-700">{turn.result.reply}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Katman: <strong>{turn.result.layer}</strong> · güven:{" "}
                  {turn.result.confidence.toFixed(2)}
                  {turn.result.handoff ? " · canlı destek" : ""}
                </p>
                {turn.result.sources.length ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    Kaynak: {turn.result.sources.map((s) => s.title).join(", ")}
                  </p>
                ) : null}
                {turn.result.trace.length ? (
                  <details className="mt-2 text-xs text-zinc-500">
                    <summary className="cursor-pointer">İz (debug)</summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(turn.result.trace, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </div>
  );
}
