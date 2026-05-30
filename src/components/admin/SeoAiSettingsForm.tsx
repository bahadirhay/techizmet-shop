"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import type { SeoAiProvider } from "@/lib/site-settings";

type SeoAiFormState = {
  enabled: boolean;
  provider: SeoAiProvider;
  geminiApiKey: string;
  openaiApiKey: string;
  claudeApiKey: string;
  geminiModel: string;
  openaiModel: string;
  claudeModel: string;
  hasGeminiKey: boolean;
  hasOpenaiKey: boolean;
  hasClaudeKey: boolean;
};

export function SeoAiSettingsForm({ initial }: { initial: SeoAiFormState }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings/seo-ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seoAi: {
          enabled: s.enabled,
          provider: s.provider,
          geminiApiKey: s.geminiApiKey || undefined,
          openaiApiKey: s.openaiApiKey || undefined,
          claudeApiKey: s.claudeApiKey || undefined,
          geminiModel: s.geminiModel,
          openaiModel: s.openaiModel,
          claudeModel: s.claudeModel,
        },
      }),
    });
    const j = (await res.json()) as { seoAi?: SeoAiFormState; error?: string };
    setBusy(false);
    if (res.ok && j.seoAi) {
      setS({ ...s, ...j.seoAi, geminiApiKey: "", openaiApiKey: "", claudeApiKey: "" });
      setMsg("Kaydedildi");
    } else {
      setMsg(j.error ?? "Kayıt başarısız");
    }
  }

  return (
    <div className="admin-card admin-card-pad max-w-2xl">
      <p className="text-sm text-zinc-600">
        Ürün formundaki <strong>SEO çalışması</strong> butonu açıklama ve özellik metinlerini AI ile üretir.
        Anahtarları burada veya <code>.env</code> dosyasında tanımlayabilirsiniz.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.enabled}
          onChange={(e) => setS({ ...s, enabled: e.target.checked })}
        />
        AI metin üretimini etkinleştir
      </label>

      <AdminField label="Sağlayıcı">
        <select
          className={inputClass}
          value={s.provider}
          onChange={(e) => setS({ ...s, provider: e.target.value as SeoAiProvider })}
        >
          <option value="auto">Otomatik (Gemini → Claude → OpenAI)</option>
          <option value="gemini">Yalnızca Google Gemini</option>
          <option value="claude">Yalnızca Claude (Anthropic)</option>
          <option value="openai">Yalnızca OpenAI</option>
        </select>
      </AdminField>

      <div className="mt-4 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
        <p className="text-sm font-semibold text-zinc-800">Google Gemini</p>
        <AdminField label="Gemini API anahtarı">
          <input
            type="password"
            className={inputClass}
            value={s.geminiApiKey}
            onChange={(e) => setS({ ...s, geminiApiKey: e.target.value })}
            placeholder={s.hasGeminiKey ? "Kayıtlı — değiştirmek için yazın" : "AI Studio API key"}
          />
        </AdminField>
        <AdminField label="Gemini model">
          <input
            className={inputClass}
            value={s.geminiModel}
            onChange={(e) => setS({ ...s, geminiModel: e.target.value })}
            placeholder="gemini-2.0-flash"
          />
        </AdminField>
        <p className="text-xs text-zinc-500">
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline">
            Google AI Studio
          </a>{" "}
          · env: <code>GEMINI_API_KEY</code>
        </p>
      </div>

      <div className="mt-4 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
        <p className="text-sm font-semibold text-zinc-800">Claude (Anthropic)</p>
        <AdminField label="Claude API anahtarı">
          <input
            type="password"
            className={inputClass}
            value={s.claudeApiKey}
            onChange={(e) => setS({ ...s, claudeApiKey: e.target.value })}
            placeholder={s.hasClaudeKey ? "Kayıtlı — değiştirmek için yazın" : "sk-ant-..."}
          />
        </AdminField>
        <AdminField label="Claude model">
          <input
            className={inputClass}
            value={s.claudeModel}
            onChange={(e) => setS({ ...s, claudeModel: e.target.value })}
            placeholder="claude-3-5-haiku-latest"
          />
        </AdminField>
        <p className="text-xs text-zinc-500">
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline">
            Anthropic Console
          </a>{" "}
          · env: <code>ANTHROPIC_API_KEY</code>
        </p>
      </div>

      <div className="mt-4 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
        <p className="text-sm font-semibold text-zinc-800">OpenAI</p>
        <AdminField label="OpenAI API anahtarı">
          <input
            type="password"
            className={inputClass}
            value={s.openaiApiKey}
            onChange={(e) => setS({ ...s, openaiApiKey: e.target.value })}
            placeholder={s.hasOpenaiKey ? "Kayıtlı — değiştirmek için yazın" : "sk-..."}
          />
        </AdminField>
        <AdminField label="OpenAI model">
          <input
            className={inputClass}
            value={s.openaiModel}
            onChange={(e) => setS({ ...s, openaiModel: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </AdminField>
        <p className="text-xs text-zinc-500">
          env: <code>OPENAI_API_KEY</code>
        </p>
      </div>

      <button type="button" className={`${btnPrimary} mt-6`} disabled={busy} onClick={() => void save()}>
        Kaydet
      </button>
      {msg ? <p className="mt-2 text-sm text-zinc-600">{msg}</p> : null}

      <p className="mt-4 text-xs text-zinc-500">
        Ürün SEO testi:{" "}
        <Link href="/admin/products/new" className="text-[var(--kn-brand)] underline">
          Yeni ürün
        </Link>
      </p>
    </div>
  );
}
