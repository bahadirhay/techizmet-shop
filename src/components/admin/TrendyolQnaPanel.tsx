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

type KnowledgeEntry = {
  id: string;
  title: string;
  body: string;
  keywords: string | null;
  channel: string;
  updatedAt: string;
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

  const [panelTab, setPanelTab] = useState<"queue" | "library">("queue");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libQuestion, setLibQuestion] = useState("");
  const [libAnswer, setLibAnswer] = useState("");
  const [libKeywords, setLibKeywords] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [libMsg, setLibMsg] = useState("");
  const [libBusy, setLibBusy] = useState(false);

  const loadLibrary = useCallback(async () => {
    setLibLoading(true);
    try {
      const res = await fetch("/api/admin/assistant/knowledge?entryType=faq");
      const json = await res.json();
      setEntries(json.entries ?? []);
    } catch {
      setLibMsg("Kütüphane yüklenemedi");
    } finally {
      setLibLoading(false);
    }
  }, []);

  useEffect(() => {
    if (panelTab === "library") void loadLibrary();
  }, [panelTab, loadLibrary]);

  const resetLibForm = () => {
    setEditingId(null);
    setLibQuestion("");
    setLibAnswer("");
    setLibKeywords("");
  };

  const saveLibEntry = async () => {
    const q = libQuestion.trim();
    const a = libAnswer.trim();
    if (q.length < 3 || a.length < 5) {
      setLibMsg("Soru ve cevap gerekli.");
      return;
    }
    setLibBusy(true);
    setLibMsg("");
    try {
      const res = await fetch("/api/admin/assistant/knowledge", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          entryType: "faq",
          channel: "*",
          title: q,
          body: a,
          keywords: libKeywords.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLibMsg(json.error ?? "Kaydedilemedi");
        return;
      }
      setLibMsg(editingId ? "Güncellendi." : "Eklendi.");
      resetLibForm();
      await loadLibrary();
    } catch {
      setLibMsg("Bağlantı hatası");
    } finally {
      setLibBusy(false);
    }
  };

  const editLibEntry = (e: KnowledgeEntry) => {
    setEditingId(e.id);
    setLibQuestion(e.title);
    setLibAnswer(e.body);
    setLibKeywords(e.keywords ?? "");
  };

  const deleteLibEntry = async (id: string) => {
    setLibBusy(true);
    try {
      await fetch(`/api/admin/assistant/knowledge?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (editingId === id) resetLibForm();
      await loadLibrary();
    } finally {
      setLibBusy(false);
    }
  };

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

      <div className="flex gap-1 border-b border-zinc-200">
        <button
          type="button"
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${
            panelTab === "queue"
              ? "border-zinc-800 font-medium text-zinc-900"
              : "border-transparent text-zinc-500"
          }`}
          onClick={() => setPanelTab("queue")}
        >
          Onay kuyruğu & geçmiş
        </button>
        <button
          type="button"
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${
            panelTab === "library"
              ? "border-zinc-800 font-medium text-zinc-900"
              : "border-transparent text-zinc-500"
          }`}
          onClick={() => setPanelTab("library")}
        >
          Soru kütüphanesi
        </button>
      </div>

      {panelTab === "library" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
            Buraya <strong>soru → cevap</strong> çiftleri ekleyin. Bir müşteri benzer bir soru
            sorduğunda sistem bu cevabı bulur ve (hibrit modda güven eşiğini geçerse) otomatik
            gönderir. Anahtar kelimeler eşleşmeyi güçlendirir (örn. &quot;kargo, teslimat, gönderim&quot;).
          </div>

          <div className="grid gap-3 rounded-xl border bg-white p-4">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-zinc-500">Soru / başlık</span>
              <input
                className={input}
                value={libQuestion}
                onChange={(e) => setLibQuestion(e.target.value)}
                placeholder="Örn. Ürünler ne zaman kargolanır?"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-zinc-500">Cevap</span>
              <textarea
                className={`${input} min-h-[90px]`}
                value={libAnswer}
                onChange={(e) => setLibAnswer(e.target.value)}
                placeholder="Örn. Siparişleriniz 1-2 iş günü içinde kargoya verilir."
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-zinc-500">
                Anahtar kelimeler (opsiyonel, virgülle)
              </span>
              <input
                className={input}
                value={libKeywords}
                onChange={(e) => setLibKeywords(e.target.value)}
                placeholder="kargo, teslimat, gönderim, ne zaman"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={libBusy}
                onClick={() => void saveLibEntry()}
              >
                {editingId ? "Güncelle" : "Kütüphaneye ekle"}
              </button>
              {editingId ? (
                <button type="button" className={btnSecondary} onClick={resetLibForm}>
                  Vazgeç
                </button>
              ) : null}
            </div>
          </div>

          {libMsg ? <p className="text-sm text-zinc-600">{libMsg}</p> : null}

          {libLoading ? (
            <p className="text-sm text-zinc-500">Yükleniyor…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz soru-cevap eklenmedi.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="rounded-xl border bg-white p-3">
                  <p className="text-sm font-medium text-zinc-900">{e.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">{e.body}</p>
                  {e.keywords ? (
                    <p className="mt-1 text-xs text-zinc-400">Anahtar: {e.keywords}</p>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      disabled={libBusy}
                      onClick={() => editLibEntry(e)}
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className={btnSecondary}
                      disabled={libBusy}
                      onClick={() => void deleteLibEntry(e.id)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-4" hidden={panelTab !== "queue"}>
        <label className="flex items-center gap-2 text-sm sm:col-span-4">
          <input
            type="checkbox"
            checked={settings.qnaAuto}
            onChange={(e) => setSettings({ ...settings, qnaAuto: e.target.checked })}
          />
          Otomatik soru-cevap açık (cron günde 1× çalışır; daha sık için harici zamanlayıcı)
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

      {panelTab === "queue" && msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}

      <div className="flex flex-wrap gap-1 border-b border-zinc-200" hidden={panelTab !== "queue"}>
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

      {panelTab !== "queue" ? null : loading ? (
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
