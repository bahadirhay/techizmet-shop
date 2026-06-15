"use client";

import type { WhatsAppBotNodeTree } from "@/lib/whatsapp-bot";
import { appendCustomerDetailToMessage, botPathFromLabels } from "@/lib/whatsapp-bot";
import { useCallback, useEffect, useState } from "react";

type ChatLine = { from: "bot" | "user"; text: string };

type BotConfig = {
  enabled: boolean;
  title?: string;
  welcome?: string;
  tree?: WhatsAppBotNodeTree[];
};

type PendingLeaf = {
  node: WhatsAppBotNodeTree;
  path: string[];
};

const DETAIL_PROMPT =
  "Sipariş numaranız veya e-posta adresinizi yazın; ardından WhatsApp'a devam edin.";

export function WhatsappBotWidget() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [pathLabels, setPathLabels] = useState<string[]>([]);
  const [options, setOptions] = useState<WhatsAppBotNodeTree[]>([]);
  const [pendingLeaf, setPendingLeaf] = useState<PendingLeaf | null>(null);
  const [customerDetail, setCustomerDetail] = useState("");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/whatsapp/bot");
    const data = (await res.json()) as BotConfig;
    setConfig(data);
    if (data.enabled && data.tree) {
      setOptions(data.tree);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  function resetChat(cfg: BotConfig) {
    setLines([]);
    setPathLabels([]);
    setOptions(cfg.tree ?? []);
    setPendingLeaf(null);
    setCustomerDetail("");
    setDetailError(null);
  }

  function openPanel() {
    setOpen(true);
    if (config?.enabled) resetChat(config);
  }

  async function openWhatsApp(message: string, path: string[]) {
    setOpening(true);
    const pagePath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : undefined;
    try {
      const res = await fetch("/api/whatsapp/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "bot",
          pagePath,
          prefilledMessage: message,
          botPath: botPathFromLabels(path),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { waUrl?: string };
      if (data.waUrl) window.open(data.waUrl, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(false);
    }
  }

  function handlePick(node: WhatsAppBotNodeTree) {
    const nextPath = [...pathLabels, node.label];
    setPathLabels(nextPath);
    setLines((prev) => [...prev, { from: "user", text: node.label }]);
    setDetailError(null);

    if (node.botReply?.trim()) {
      setLines((prev) => [...prev, { from: "bot", text: node.botReply!.trim() }]);
    }

    if (node.children.length > 0) {
      setPendingLeaf(null);
      setCustomerDetail("");
      setOptions(node.children);
      return;
    }

    const msg = node.messageTemplate?.trim();
    if (msg) {
      setPendingLeaf({ node, path: nextPath });
      setCustomerDetail("");
      setOptions([]);
      setLines((prev) => [...prev, { from: "bot", text: DETAIL_PROMPT }]);
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        from: "bot",
        text: "Bu seçenek için WhatsApp mesajı tanımlı değil. Lütfen başka bir seçenek deneyin.",
      },
    ]);
  }

  function confirmWhatsApp() {
    if (!pendingLeaf) return;
    const detail = customerDetail.trim();
    if (!detail) {
      setDetailError("Lütfen sipariş numaranızı veya e-posta adresinizi girin.");
      return;
    }

    const template = pendingLeaf.node.messageTemplate?.trim();
    if (!template) return;

    const message = appendCustomerDetailToMessage(template, detail);
    void openWhatsApp(message, pendingLeaf.path);
    setLines((prev) => [
      ...prev,
      { from: "bot", text: "WhatsApp açılıyor… Mesajınız hazır, göndermeniz yeterli." },
    ]);
    setPendingLeaf(null);
    setCustomerDetail("");
    setDetailError(null);
  }

  function goBack() {
    if (!config?.tree) return;

    if (pendingLeaf) {
      const nextLabels = pendingLeaf.path.slice(0, -1);
      setPendingLeaf(null);
      setCustomerDetail("");
      setDetailError(null);
      setPathLabels(nextLabels);
      setLines((prev) => prev.slice(0, Math.max(0, prev.length - 2)));
      restoreOptionsForPath(nextLabels);
      return;
    }

    if (pathLabels.length === 0) return;

    const nextLabels = pathLabels.slice(0, -1);
    setPathLabels(nextLabels);
    setLines((prev) => prev.slice(0, Math.max(0, prev.length - 2)));
    restoreOptionsForPath(nextLabels);
  }

  function restoreOptionsForPath(labels: string[]) {
    if (!config?.tree) return;
    if (labels.length === 0) {
      setOptions(config.tree);
      return;
    }

    let nodes = config.tree;
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const found = nodes.find((n) => n.label === label);
      if (!found) break;
      if (i === labels.length - 1) {
        setOptions(found.children);
      } else {
        nodes = found.children;
      }
    }
  }

  if (!config?.enabled) return null;

  const showBack = pathLabels.length > 0 || pendingLeaf !== null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={openPanel}
          className="fixed bottom-5 left-5 z-[99999] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-white/10 transition hover:scale-105 hover:bg-emerald-700 hover:shadow-xl"
          aria-label="WhatsApp asistan"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
      ) : (
        <div className="fixed bottom-5 left-5 z-[99999] flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-2 bg-emerald-600 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{config.title}</p>
              <p className="mt-0.5 text-xs text-emerald-50/90">{config.welcome}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-1 hover:bg-white/10"
              aria-label="Kapat"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </header>

          <div className="max-h-64 space-y-2 overflow-y-auto px-3 py-3">
            {lines.length === 0 ? (
              <p className="text-xs text-zinc-500">Bir seçenek seçin:</p>
            ) : (
              lines.map((line, i) => (
                <div
                  key={`${line.from}-${i}`}
                  className={`flex ${line.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      line.from === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {line.text}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-zinc-100 px-3 py-3">
            {showBack ? (
              <button
                type="button"
                className="mb-2 text-xs text-zinc-500 hover:text-zinc-800"
                onClick={goBack}
              >
                ← Geri
              </button>
            ) : null}

            {pendingLeaf ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmWhatsApp();
                }}
              >
                <label className="block text-xs text-zinc-600">
                  Sipariş numarası veya e-posta
                  <input
                    type="text"
                    value={customerDetail}
                    onChange={(e) => {
                      setCustomerDetail(e.target.value);
                      if (detailError) setDetailError(null);
                    }}
                    placeholder="ör. AP-12345 veya ad@ornek.com"
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    disabled={opening}
                  />
                </label>
                {detailError ? <p className="text-xs text-red-600">{detailError}</p> : null}
                <button
                  type="submit"
                  disabled={opening}
                  className="w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {opening ? "Açılıyor…" : "WhatsApp'a devam et"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-2">
                {options.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    disabled={opening}
                    onClick={() => handlePick(node)}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {node.label}
                  </button>
                ))}
                {options.length === 0 ? (
                  <p className="text-xs text-zinc-500">Bu menüde seçenek yok.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
