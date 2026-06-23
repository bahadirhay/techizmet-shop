export type WhatsAppBotNodeRow = {
  id: string;
  parentId: string | null;
  label: string;
  botReply: string | null;
  messageTemplate: string | null;
  sortOrder: number;
  published: boolean;
};

export type WhatsAppBotNodeTree = WhatsAppBotNodeRow & {
  children: WhatsAppBotNodeTree[];
};

export function buildBotTree(rows: WhatsAppBotNodeRow[]): WhatsAppBotNodeTree[] {
  const byParent = new Map<string | null, WhatsAppBotNodeRow[]>();
  for (const row of rows) {
    const key = row.parentId;
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "tr"));
  }

  function walk(parentId: string | null): WhatsAppBotNodeTree[] {
    return (byParent.get(parentId) ?? []).map((row) => ({
      ...row,
      children: walk(row.id),
    }));
  }

  return walk(null);
}

export function botPathFromLabels(labels: string[]): string {
  return labels.filter(Boolean).join(" > ");
}

export const DEFAULT_BOT_SEED: Array<{
  label: string;
  botReply?: string;
  messageTemplate?: string;
  children?: Array<{ label: string; messageTemplate: string }>;
}> = [
  {
    label: "Sipariş durumu",
    messageTemplate: "Merhaba, siparişimin durumu hakkında bilgi almak istiyorum.",
  },
  {
    label: "Ürün önerisi",
    botReply: "Dostunuzun ırkını ve yaşını yazın; size uygun ürünleri listeleyelim.",
    messageTemplate: "Merhaba, köpeğim için ürün önerisi almak istiyorum.",
  },
  {
    label: "Kargo / teslimat",
    messageTemplate: "Merhaba, kargo ve teslimat süresi hakkında bilgi almak istiyorum.",
  },
  {
    label: "İade / değişim",
    messageTemplate: "Merhaba, iade veya değişim işlemi hakkında bilgi almak istiyorum.",
  },
];

export function appendCustomerDetailToMessage(template: string, detail: string): string {
  const base = template.trim();
  const extra = detail.trim();
  if (!extra) return base;
  return `${base}\n\nSipariş no / e-posta: ${extra}`;
}

/** Sipariş takibi / iptal gibi konularda müşteri bilgisi istenir; öneri ve genel bilgi için değil. */
export function botPathRequiresCustomerDetail(pathLabels: string[]): boolean {
  const joined = pathLabels.join(" ").toLocaleLowerCase("tr-TR");
  return /sipari[sş]|kargom|iptal/.test(joined);
}

export function isOrderTopicLabel(label: string): boolean {
  return /sipari[sş]|kargom|iptal/.test(label.toLocaleLowerCase("tr-TR"));
}

/** Ürün önerisi — ırk/yaş formu ile otomatik eşleştirme */
export function isProductRecommendTopicLabel(label: string): boolean {
  const l = label.toLocaleLowerCase("tr-TR");
  return /ürün öner|öneri istiyorum|^öneri$/.test(l);
}

export function botPathIsProductRecommend(pathLabels: string[]): boolean {
  const joined = pathLabels.join(" ").toLocaleLowerCase("tr-TR");
  return /ürün öner|öneri istiyorum/.test(joined);
}

export function petTypeFromBotPath(pathLabels: string[]): "dog" | "cat" | null {
  const joined = pathLabels.join(" ").toLocaleLowerCase("tr-TR");
  if (/kedi|cat/.test(joined)) return "cat";
  if (/köpek|dog/.test(joined)) return "dog";
  return null;
}

export const DIRECT_WHATSAPP_LABEL = "Doğrudan WhatsApp'tan yaz";
export const DEFAULT_DIRECT_MESSAGE = "Merhaba, size ulaşmak istiyorum.";

export const ORDER_FORM_TITLE = "Sipariş bilgileri";
export const ORDER_FORM_HINT =
  "Sipariş numaranızı ve e-postanızı girin; durum bilgisini anında gösterelim.";

export const RECOMMEND_FORM_TITLE = "Ürün önerisi";
export const RECOMMEND_FORM_HINT =
  "Dostunuzun ırkını ve yaşını yazın; ürün içeriklerinden size uygun seçenekleri ve linkleri gösterelim.";

export const DETAIL_PROMPT =
  "Sipariş numaranız veya e-posta adresinizi yazın; ardından WhatsApp'a devam edin.";

export const DEFAULT_BOT_TITLE = "Size nasıl yardımcı olabiliriz?";
export const DEFAULT_BOT_WELCOME =
  "Bir konu seçin veya mesajınızı yazıp doğrudan WhatsApp'tan bize ulaşın.";
