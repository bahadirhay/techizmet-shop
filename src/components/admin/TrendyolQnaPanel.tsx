"use client";

import { useCallback, useEffect, useState } from "react";

type QnaRecord = {
  id: string;
  questionId: string;
  questionText: string;
  customerName: string | null;
  productName: string | null;
  productBarcode: string | null;
  tyStatus: string;
  answerStatus: string;
  answerText: string | null;
  answerSource: string | null;
  confidence: number | null;
  lastError: string | null;
  askedAt: string | null;
  answeredAt: string | null;
  createdAt: string;
};

type QnaSettings = {
  qnaAuto: boolean;
  qnaMode: string;
  qnaAutoThreshold: number;
};

const STATUS_TABS: { id: string; label: string }[] = [
  { id: "needs_review", label: "Onay bekleyen" },
  { id: "sent", label: "Cevaplanan" },
  { id: "failed", label: "Hatalı" },
  { id: "skipped", label: "İnsana bırakılan" },
  { id: "", label: "Tümü" },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  needs_review: { label: "onay bekliyor", cls: "bg-amber-100 text-amber-800" },
  sent: { label: "cevaplandı", cls: "bg-green-100 text-green-700" },
  failed: { label: "hata", cls: "bg-red-100 text-red-700" },
  skipped: { label: "insana bırakıldı", cls: "bg-zinc-100 text-zinc-600" },
  answered_elsewhere: { label: "başka yerde cevaplandı", cls: "bg-zinc-100 text-zinc-600" },
};

const input =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const btn = "rounded-md px-3 py-1.5 text-sm font-medium transition";
const btnPrimary = `${btn} bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50`;
const btnSecondary = `${btn} border border-zinc-300 bg-white hover:border-zinc-400 disabled:opacity-50`;

export function TrendyolQnaPanel() {
  const [records, setRecords] = useState<QnaRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<QnaSettings>({
    qnaAuto: false,
    qnaMode: "hybrid",
    qnaAutoThreshold: 0.75,
  });
  const [statusFilter, setStatusFilter] = useState("needs_review");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/integrations/marketplaces/trendyol/qna?status=${encodeURIComponent(statusFilter)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? "Yüklenemedi");
        return;
      }
      setRecords(json.records ?? []);
      setCounts(json.counts ?? {});
      if (json.settings) setSettings(json.settings);
    } catch {
      setMsg("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const runNow = async () => {
    setRunning(true);
    setMsg("Trendyol soruları çekiliyor ve cevaplanıyor…");
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/trendyol/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const json = await res.json();
      setMsg(json.message ?? (res.ok ? "Tamamlandı" : json.error ?? "Hata"));
      await load();
    } catch {
      setMsg("Çalıştırma hatası");
    } finally {
      setRunning(false);
    }
  };

  const saveSettings = async () => {
    setMsg("Ayarlar kaydediliyor…");
    const res = await fetch("/api/admin/integrations/marketplaces/trendyol/qna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveSettings",
        qnaAuto: settings.qnaAuto,
        qnaMode: settings.qnaMode,
        qnaAutoThreshold: settings.qnaAutoThreshold,
      }),
    });
    const json = await res.json();
    setMsg(json.message ?? json.error ?? "Kaydedildi");
  };

  const sendAnswer = async (rec: QnaRecord) => {
    setBusyId(rec.id);
    setMsg("");
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/trendyol/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          recordId: rec.id,
          text: drafts[rec.id] ?? rec.answerText ?? "",
        }),
      });
      const json = await res.json();
      setMsg(json.message ?? json.error ?? "");
      await load();
    } catch {
      setMsg("Gönderim hatası");
    } finally {
      setBusyId(null);
    }
  };

  const discard = async (rec: QnaRecord) => {
    setBusyId(rec.id);
    try {
      await fetch("/api/admin/integrations/marketplaces/trendyol/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard", recordId: rec.id }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
        <p className="font-medium">Trendyol müşteri soruları — otomatik cevaplama</p>
        <p className="mt-1 text-xs text-blue-900">
          Gelen sorular bilgi kütüphanesi + yapay zekâ ile cevaplanır. <strong>Hibrit mod:</strong>{" "}
          yüksek güvenli cevaplar otomatik gönderilir, düşük güvenliler aşağıdaki onay kuyruğuna
          düşer. Trendyol cevabı 3 iş günü içinde verilmezse soru kapanır — kuyruğu takip edin.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-4">
        <label className="flex items-center gap-2 text-sm sm:col-span-4">
          <input
            type="checkbox"
            checked={settings.qnaAuto}
            onChange={(e) => setSettings({ ...settings, qnaAuto: e.target.checked })}
          />
          Otomatik soru-cevap açık (cron 2 saatte bir çalışır)
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Mod</span>
          <select
            className={input}
            value={settings.qnaMode}
            onChange={(e) => setSettings({ ...settings, qnaMode: e.target.value })}
          >
            <option value="hybrid">Hibrit (önerilen)</option>
            <option value="auto">Tam otomatik</option>
            <option value="draft">Sadece taslak</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Otomatik gönderim güven eşiği</span>
          <input
            className={input}
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={settings.qnaAutoThreshold}
            onChange={(e) =>
              setSettings({ ...settings, qnaAutoThreshold: Number(e.target.value) })
            }
          />
        </label>
        <div className="flex items-end">
          <button type="button" className={btnSecondary} onClick={() => void saveSettings()}>
            Ayarları kaydet
          </button>
        </div>
        <div className="flex items-end">
          <button type="button" className={btnPrimary} disabled={running} onClick={() => void runNow()}>
            {running ? "Çalışıyor…" : "Şimdi çek & cevapla"}
          </button>
        </div>
      </div>

      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}

      <div className="flex flex-wrap gap-1 border-b border-zinc-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id || "all"}
            type="button"
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              statusFilter === t.id
                ? "border-zinc-800 font-medium text-zinc-900"
                : "border-transparent text-zinc-500"
            }`}
            onClick={() => setStatusFilter(t.id)}
          >
            {t.label}
            {t.id && counts[t.id] ? ` (${counts[t.id]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-zinc-500">Bu kategoride kayıt yok.</p>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const badge = STATUS_BADGE[rec.answerStatus] ?? {
              label: rec.answerStatus,
              cls: "bg-zinc-100 text-zinc-600",
            };
            const editable = rec.answerStatus === "needs_review" || rec.answerStatus === "failed";
            const draftValue = drafts[rec.id] ?? rec.answerText ?? "";
            return (
              <div key={rec.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>
                    {badge.label}
                    {rec.answerSource ? ` · ${rec.answerSource}` : ""}
                    {rec.confidence != null ? ` · güven ${rec.confidence.toFixed(2)}` : ""}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(rec.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>

                {rec.productName ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Ürün: {rec.productName}
                    {rec.productBarcode ? ` (${rec.productBarcode})` : ""}
                  </p>
                ) : null}

                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {rec.customerName ? `${rec.customerName}: ` : ""}
                  {rec.questionText}
                </p>

                {editable ? (
                  <textarea
                    className={`${input} mt-2 min-h-[80px]`}
                    value={draftValue}
                    placeholder="Cevap metni (10-2000 karakter)"
                    onChange={(e) => setDrafts({ ...drafts, [rec.id]: e.target.value })}
                  />
                ) : rec.answerText ? (
                  <p className="mt-2 rounded-md bg-zinc-50 p-2 text-sm text-zinc-700">
                    {rec.answerText}
                  </p>
                ) : null}

                {rec.lastError ? (
                  <p className="mt-2 text-xs text-red-600">{rec.lastError}</p>
                ) : null}

                {rec.answerStatus !== "sent" ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={busyId === rec.id || draftValue.trim().length < 10}
                      onClick={() => void sendAnswer(rec)}
                    >
                      {busyId === rec.id ? "Gönderiliyor…" : "Onayla & gönder"}
                    </button>
                    {rec.answerStatus !== "skipped" ? (
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={busyId === rec.id}
                        onClick={() => void discard(rec)}
                      >
                        Atla
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
