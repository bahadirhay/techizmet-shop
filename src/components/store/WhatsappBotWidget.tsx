"use client";

import type { WhatsAppBotNodeTree } from "@/lib/whatsapp-bot";
import {
  appendCustomerDetailToMessage,
  botPathFromLabels,
  botPathIsProductRecommend,
  botPathRequiresCustomerDetail,
  DEFAULT_DIRECT_MESSAGE,
  DIRECT_WHATSAPP_LABEL,
  isOrderTopicLabel,
  isProductRecommendTopicLabel,
  ORDER_FORM_HINT,
  ORDER_FORM_TITLE,
  petTypeFromBotPath,
  RECOMMEND_FORM_HINT,
  RECOMMEND_FORM_TITLE,
} from "@/lib/whatsapp-bot";
import {
  formatProductRecommendReply,
  formatRecommendHeadline,
} from "@/lib/whatsapp/product-recommend-reply";
import { useCallback, useEffect, useState } from "react";

type BotConfig = {
  enabled: boolean;
  title?: string;
  welcome?: string;
  defaultMessage?: string | null;
  tree?: WhatsAppBotNodeTree[];
};

type View = "topics" | "subtopics" | "order" | "recommend" | "direct";

type OrderFormState = {
  path: string[];
  topics: WhatsAppBotNodeTree[];
  selected: WhatsAppBotNodeTree;
};

type RecommendFormState = {
  path: string[];
  selected: WhatsAppBotNodeTree;
};

type RecommendProduct = {
  slug: string;
  title: string;
  priceLabel: string;
  url: string;
  reason: string;
};

function resolveOrderTemplate(node: WhatsAppBotNodeTree): string {
  const own = node.messageTemplate?.trim();
  if (own) return own;
  const child = node.children.find((c) => c.messageTemplate?.trim());
  return child?.messageTemplate?.trim() || "Merhaba, siparişim hakkında bilgi almak istiyorum.";
}

function pickDefaultOrderChild(node: WhatsAppBotNodeTree): WhatsAppBotNodeTree {
  const withTemplate = node.children.find((c) => c.messageTemplate?.trim());
  return withTemplate ?? node.children[0] ?? node;
}

export function WhatsappBotWidget() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("topics");
  const [pathLabels, setPathLabels] = useState<string[]>([]);
  const [options, setOptions] = useState<WhatsAppBotNodeTree[]>([]);
  const [orderForm, setOrderForm] = useState<OrderFormState | null>(null);
  const [recommendForm, setRecommendForm] = useState<RecommendFormState | null>(null);
  const [petBreed, setPetBreed] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petType, setPetType] = useState<"dog" | "cat" | "">("");
  const [recommendNote, setRecommendNote] = useState("");
  const [recommendSummary, setRecommendSummary] = useState<string | null>(null);
  const [recommendProducts, setRecommendProducts] = useState<RecommendProduct[]>([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderEmail, setOrderEmail] = useState("");
  const [orderLookupSummary, setOrderLookupSummary] = useState<string | null>(null);
  const [freeMessage, setFreeMessage] = useState("");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [freeError, setFreeError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [recommendBusy, setRecommendBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

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
    setView("topics");
    setPathLabels([]);
    setOptions(cfg.tree ?? []);
    setOrderForm(null);
    setRecommendForm(null);
    setPetBreed("");
    setPetAge("");
    setPetType("");
    setRecommendNote("");
    setRecommendSummary(null);
    setRecommendProducts([]);
    setOrderNumber("");
    setOrderEmail("");
    setOrderLookupSummary(null);
    setFreeMessage("");
    setDetailError(null);
    setFreeError(null);
    setStatusText(null);
  }

  function openPanel() {
    setOpen(true);
    if (config?.enabled) resetChat(config);
  }

  async function openWhatsApp(message: string, path: string[]) {
    setOpening(true);
    setStatusText(null);
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
      const data = (await res.json().catch(() => ({}))) as { waUrl?: string; error?: string };
      if (data.waUrl) {
        window.open(data.waUrl, "_blank", "noopener,noreferrer");
        setStatusText("WhatsApp açıldı. Mesajı göndermeniz yeterli.");
        return true;
      }
      setStatusText(
        data.error?.trim() || "WhatsApp bağlantısı oluşturulamadı. Lütfen tekrar deneyin.",
      );
      return false;
    } finally {
      setOpening(false);
    }
  }

  function defaultDirectMessage() {
    return config?.defaultMessage?.trim() || DEFAULT_DIRECT_MESSAGE;
  }

  function enterRecommendForm(path: string[], selected: WhatsAppBotNodeTree) {
    setPathLabels(path);
    setRecommendForm({ path, selected });
    setPetBreed("");
    setPetAge("");
    setPetType(petTypeFromBotPath(path) ?? "");
    setRecommendNote("");
    setRecommendSummary(null);
    setRecommendProducts([]);
    setFreeMessage("");
    setDetailError(null);
    setView("recommend");
    setOptions([]);
    setStatusText(null);
  }

  function enterOrderForm(path: string[], topics: WhatsAppBotNodeTree[], selected: WhatsAppBotNodeTree) {
    setPathLabels(path);
    setOrderForm({ path, topics, selected });
    setOrderNumber("");
    setOrderEmail("");
    setOrderLookupSummary(null);
    setFreeMessage("");
    setDetailError(null);
    setView("order");
    setOptions([]);
    setStatusText(null);
  }

  async function sendDirectWhatsApp() {
    const text = freeMessage.trim() || defaultDirectMessage();
    if (!text) {
      setFreeError("Lütfen mesajınızı yazın.");
      return;
    }
    setFreeError(null);
    const ok = await openWhatsApp(text, [DIRECT_WHATSAPP_LABEL]);
    if (ok) setFreeMessage("");
  }

  function handlePick(node: WhatsAppBotNodeTree) {
    const nextPath = [...pathLabels, node.label];
    setDetailError(null);
    setFreeError(null);
    setStatusText(null);

    if (node.children.length > 0 && isOrderTopicLabel(node.label)) {
      const selected = pickDefaultOrderChild(node);
      enterOrderForm(nextPath, node.children, selected);
      return;
    }

    if (node.children.length > 0 && isProductRecommendTopicLabel(node.label)) {
      enterRecommendForm(nextPath, node);
      return;
    }

    if (node.children.length > 0) {
      setPathLabels(nextPath);
      setOptions(node.children);
      setView("subtopics");
      return;
    }

    const msg = node.messageTemplate?.trim();
    if (!msg) {
      setStatusText("Bu seçenek için mesaj tanımlı değil.");
      return;
    }

    if (isProductRecommendTopicLabel(node.label) || botPathIsProductRecommend(pathLabels)) {
      enterRecommendForm(nextPath, node);
      return;
    }

    if (botPathRequiresCustomerDetail(nextPath)) {
      enterOrderForm(nextPath, [node], node);
      return;
    }

    setPathLabels(nextPath);
    setView("topics");
    setOptions([]);
    void openWhatsApp(msg, nextPath);
  }

  async function fetchRecommendations() {
    if (!recommendForm) return;
    const breed = petBreed.trim();
    const age = petAge.trim();
    if (!breed && !age) {
      setDetailError("Irk veya yaş bilgisi girin.");
      return;
    }

    setRecommendBusy(true);
    setDetailError(null);
    setRecommendSummary(null);
    setRecommendProducts([]);
    setStatusText(null);
    try {
      const res = await fetch("/api/whatsapp/product-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breed,
          age,
          petType: petType === "dog" || petType === "cat" ? petType : null,
          note: recommendNote.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: string;
        products?: RecommendProduct[];
        error?: string;
      };
      if (!res.ok) {
        setDetailError(data.error ?? "Öneri oluşturulamadı.");
        return;
      }
      setRecommendSummary(data.summary?.trim() || "Öneriler hazır.");
      setRecommendProducts(Array.isArray(data.products) ? data.products : []);
    } finally {
      setRecommendBusy(false);
    }
  }

  async function continueRecommendToWhatsApp() {
    if (!recommendForm) return;
    const breed = petBreed.trim();
    const age = petAge.trim();
    const petLabel =
      petType === "dog" ? "Köpek" : petType === "cat" ? "Kedi" : undefined;
    const template =
      recommendForm.selected.messageTemplate?.trim() ||
      "Merhaba, köpeğim için ürün önerisi almak istiyorum.";

    const recommendText =
      recommendProducts.length > 0
        ? formatProductRecommendReply({
            breed,
            age,
            petTypeLabel: petLabel,
            hits: recommendProducts,
          })
        : recommendSummary;

    if (!recommendText) return;

    const context = [
      petLabel ? `Tür: ${petLabel}` : "",
      breed ? `Irk: ${breed}` : "",
      age ? `Yaş: ${age}` : "",
      recommendNote.trim() ? `Not: ${recommendNote.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const message = context
      ? `${template}\n\n${context}\n\n${recommendText}`
      : `${template}\n\n${recommendText}`;
    const extra = freeMessage.trim();
    await openWhatsApp(extra ? `${message}\n\n${extra}` : message, recommendForm.path);
  }

  async function lookupOrder() {
    if (!orderForm) return;
    const num = orderNumber.trim();
    const email = orderEmail.trim().toLowerCase();
    if (!num) {
      setDetailError("Sipariş numarası gerekli.");
      return;
    }
    if (!email || !email.includes("@")) {
      setDetailError("Geçerli bir e-posta adresi girin.");
      return;
    }

    setLookupBusy(true);
    setDetailError(null);
    setOrderLookupSummary(null);
    setStatusText(null);
    try {
      const res = await fetch("/api/whatsapp/order-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: num, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
      if (!res.ok) {
        setDetailError(data.error ?? "Sipariş bulunamadı.");
        return;
      }
      setOrderLookupSummary(data.summary?.trim() || "Sipariş bilgileri alındı.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function continueOrderToWhatsApp() {
    if (!orderForm) return;
    const num = orderNumber.trim();
    const email = orderEmail.trim().toLowerCase();
    if (!num || !email) {
      setDetailError("Önce sipariş numarası ve e-posta ile sorgulayın.");
      return;
    }

    const template = resolveOrderTemplate(orderForm.selected);
    const extra = freeMessage.trim();
    const detailLine = `Sipariş no: ${num}\nE-posta: ${email}`;
    const withLookup = orderLookupSummary
      ? `${template}\n\n${orderLookupSummary}\n\n${detailLine}`
      : appendCustomerDetailToMessage(template, `${num} / ${email}`);
    const message = extra ? `${withLookup}\n\n${extra}` : withLookup;
    const leafPath =
      orderForm.topics.length > 1
        ? [...orderForm.path, orderForm.selected.label]
        : orderForm.path;

    await openWhatsApp(message, leafPath);
  }

  function goBack() {
    if (!config?.tree) return;
    setDetailError(null);
    setFreeError(null);
    setStatusText(null);

    if (view === "order") {
      const parentPath = orderForm?.path.slice(0, -1) ?? [];
      setOrderForm(null);
      setOrderNumber("");
      setOrderEmail("");
      setOrderLookupSummary(null);
      setFreeMessage("");
      setPathLabels(parentPath);
      if (parentPath.length === 0) {
        setView("topics");
        setOptions(config.tree);
      } else {
        setView("subtopics");
        restoreOptionsForPath(parentPath);
      }
      return;
    }

    if (view === "recommend") {
      const parentPath = recommendForm?.path.slice(0, -1) ?? [];
      setRecommendForm(null);
      setPetBreed("");
      setPetAge("");
      setPetType("");
      setRecommendNote("");
      setRecommendSummary(null);
      setRecommendProducts([]);
      setFreeMessage("");
      setPathLabels(parentPath);
      if (parentPath.length === 0) {
        setView("topics");
        setOptions(config.tree);
      } else {
        setView("subtopics");
        restoreOptionsForPath(parentPath);
      }
      return;
    }

    if (view === "direct") {
      setView("topics");
      setFreeMessage("");
      return;
    }

    if (view === "subtopics") {
      const parentPath = pathLabels.slice(0, -1);
      setPathLabels(parentPath);
      if (parentPath.length === 0) {
        setView("topics");
        setOptions(config.tree);
      } else {
        restoreOptionsForPath(parentPath);
      }
      return;
    }
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

  const showBack = view !== "topics";
  const subtopicTitle = pathLabels[pathLabels.length - 1];

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
        <div className="fixed bottom-5 left-5 z-[99999] flex w-[min(100vw-2rem,26rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <header className="flex shrink-0 items-start justify-between gap-2 bg-emerald-600 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{config.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-emerald-50/90">
                {view === "order"
                  ? ORDER_FORM_TITLE
                  : view === "recommend"
                    ? RECOMMEND_FORM_TITLE
                    : view === "direct"
                      ? "Doğrudan mesaj"
                      : view === "subtopics"
                        ? subtopicTitle
                        : config.welcome}
              </p>
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

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-4">
            {showBack ? (
              <button
                type="button"
                className="mb-3 self-start text-xs font-medium text-emerald-700 hover:text-emerald-900"
                onClick={goBack}
              >
                ← Geri
              </button>
            ) : null}

            {statusText ? (
              <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{statusText}</p>
            ) : null}

            {view === "topics" ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">Size nasıl yardımcı olalım?</p>
                <div className="grid gap-2">
                  {options.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      disabled={opening}
                      onClick={() => handlePick(node)}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {node.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={opening}
                  onClick={() => {
                    setView("direct");
                    setFreeMessage("");
                    setFreeError(null);
                    setStatusText(null);
                  }}
                  className="w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
                >
                  {DIRECT_WHATSAPP_LABEL}
                </button>
              </div>
            ) : null}

            {view === "subtopics" ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">Lütfen bir seçenek belirleyin:</p>
                <div className="grid gap-2">
                  {options.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      disabled={opening}
                      onClick={() => handlePick(node)}
                      className="rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm font-medium text-zinc-900 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {node.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {view === "order" && orderForm ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-zinc-600">{ORDER_FORM_HINT}</p>

                {orderForm.topics.length > 1 ? (
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Konu
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {orderForm.topics.map((topic) => {
                        const active = orderForm.selected.id === topic.id;
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => {
                              setOrderForm((prev) => (prev ? { ...prev, selected: topic } : prev));
                              setOrderLookupSummary(null);
                            }}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                              active
                                ? "bg-emerald-600 text-white"
                                : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-400"
                            }`}
                          >
                            {topic.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-zinc-900">
                    Sipariş numarası <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => {
                      setOrderNumber(e.target.value);
                      setOrderLookupSummary(null);
                      if (detailError) setDetailError(null);
                    }}
                    placeholder="ör. SHOP-20260521-AB12"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                    disabled={lookupBusy || opening}
                    autoFocus
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-zinc-900">
                    E-posta <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="email"
                    value={orderEmail}
                    onChange={(e) => {
                      setOrderEmail(e.target.value);
                      setOrderLookupSummary(null);
                      if (detailError) setDetailError(null);
                    }}
                    placeholder="checkout sırasında kullandığınız e-posta"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                    disabled={lookupBusy || opening}
                  />
                </label>

                {detailError ? <p className="text-xs text-red-600">{detailError}</p> : null}

                <button
                  type="button"
                  disabled={lookupBusy || opening}
                  onClick={() => void lookupOrder()}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {lookupBusy ? "Sorgulanıyor…" : "Siparişi sorgula"}
                </button>

                {orderLookupSummary ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Otomatik yanıt
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-emerald-950">
                      {orderLookupSummary}
                    </pre>
                  </div>
                ) : null}

                <label className="block space-y-1.5">
                  <span className="text-sm text-zinc-700">Ek not (isteğe bağlı)</span>
                  <textarea
                    value={freeMessage}
                    onChange={(e) => setFreeMessage(e.target.value)}
                    rows={2}
                    placeholder="Eklemek istediğiniz detay"
                    className="w-full resize-none rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                    disabled={opening}
                  />
                </label>

                <button
                  type="button"
                  disabled={opening || !orderLookupSummary}
                  onClick={() => void continueOrderToWhatsApp()}
                  className="w-full rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-40"
                >
                  {opening ? "Açılıyor…" : "WhatsApp'tan devam et"}
                </button>
                {!orderLookupSummary ? (
                  <p className="text-center text-xs text-zinc-500">
                    İnsan desteğe geçmek için önce siparişi sorgulayın.
                  </p>
                ) : null}
              </div>
            ) : null}

            {view === "recommend" && recommendForm ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-zinc-600">{RECOMMEND_FORM_HINT}</p>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-zinc-900">Tür</span>
                  <select
                    value={petType}
                    onChange={(e) => {
                      setPetType(e.target.value as "" | "dog" | "cat");
                      setRecommendSummary(null);
                      setRecommendProducts([]);
                    }}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                    disabled={recommendBusy || opening}
                  >
                    <option value="">Seçin (isteğe bağlı)</option>
                    <option value="dog">Köpek</option>
                    <option value="cat">Kedi</option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-zinc-900">
                    Irk <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={petBreed}
                    onChange={(e) => {
                      setPetBreed(e.target.value);
                      setRecommendSummary(null);
                      setRecommendProducts([]);
                      if (detailError) setDetailError(null);
                    }}
                    placeholder="ör. Golden Retriever, Kangal"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                    disabled={recommendBusy || opening}
                    autoFocus
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-zinc-900">
                    Yaş <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={petAge}
                    onChange={(e) => {
                      setPetAge(e.target.value);
                      setRecommendSummary(null);
                      setRecommendProducts([]);
                      if (detailError) setDetailError(null);
                    }}
                    placeholder="ör. 2 yaşında, 8 ay, yavru"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                    disabled={recommendBusy || opening}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm text-zinc-700">Ek not (isteğe bağlı)</span>
                  <textarea
                    value={recommendNote}
                    onChange={(e) => {
                      setRecommendNote(e.target.value);
                      setRecommendSummary(null);
                      setRecommendProducts([]);
                    }}
                    rows={2}
                    placeholder="Alerji, çiğneme alışkanlığı, hassasiyet vb."
                    className="w-full resize-none rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                    disabled={recommendBusy || opening}
                  />
                </label>

                {detailError ? <p className="text-xs text-red-600">{detailError}</p> : null}

                <button
                  type="button"
                  disabled={recommendBusy || opening}
                  onClick={() => void fetchRecommendations()}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {recommendBusy ? "Öneriler hazırlanıyor…" : "Ürün önerilerini göster"}
                </button>

                {recommendProducts.length > 0 ? (
                  <div className="min-w-0 space-y-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {formatRecommendHeadline({
                        breed: petBreed,
                        age: petAge,
                        petTypeLabel:
                          petType === "dog" ? "Köpek" : petType === "cat" ? "Kedi" : undefined,
                        count: recommendProducts.length,
                      })}
                    </p>
                    <ul className="space-y-2">
                      {recommendProducts.map((product, index) => (
                        <li key={product.slug} className="min-w-0">
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 items-start gap-2.5 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/40"
                          >
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
                              aria-hidden
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
                                {product.title}
                              </p>
                              {product.reason ? (
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-600">
                                  {product.reason}
                                </p>
                              ) : null}
                              <span className="mt-2 inline-flex text-xs font-semibold text-emerald-700">
                                Ürün sayfası →
                              </span>
                            </div>
                            <p className="shrink-0 text-sm font-bold tabular-nums text-emerald-700">
                              {product.priceLabel}
                            </p>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : recommendSummary ? (
                  <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Yanıt
                    </p>
                    <p className="mt-2 break-words text-sm leading-relaxed text-emerald-950">
                      {recommendSummary}
                    </p>
                  </div>
                ) : null}

                <label className="block space-y-1.5">
                  <span className="text-sm text-zinc-700">WhatsApp mesajına ek (isteğe bağlı)</span>
                  <textarea
                    value={freeMessage}
                    onChange={(e) => setFreeMessage(e.target.value)}
                    rows={2}
                    placeholder="Eklemek istediğiniz detay"
                    className="w-full resize-none rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                    disabled={opening}
                  />
                </label>

                <button
                  type="button"
                  disabled={opening || (recommendProducts.length === 0 && !recommendSummary)}
                  onClick={() => void continueRecommendToWhatsApp()}
                  className="w-full rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-40"
                >
                  {opening ? "Açılıyor…" : "WhatsApp'tan devam et"}
                </button>
              </div>
            ) : null}

            {view === "direct" ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">Mesajınızı yazın; WhatsApp'ta hazır olacak.</p>
                <textarea
                  value={freeMessage}
                  onChange={(e) => {
                    setFreeMessage(e.target.value);
                    if (freeError) setFreeError(null);
                  }}
                  rows={4}
                  placeholder={defaultDirectMessage()}
                  className="w-full resize-none rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                  disabled={opening}
                  autoFocus
                />
                {freeError ? <p className="text-xs text-red-600">{freeError}</p> : null}
                <button
                  type="button"
                  disabled={opening}
                  onClick={() => void sendDirectWhatsApp()}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {opening ? "Açılıyor…" : "WhatsApp'a gönder"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
