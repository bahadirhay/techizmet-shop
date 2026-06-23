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
    botReply: "Hangi ürün grubu ile ilgileniyorsunuz?",
    children: [
      {
        label: "Köpek ödül mamaları",
        messageTemplate: "Merhaba, köpek ödül mamaları hakkında bilgi almak istiyorum.",
      },
      {
        label: "Kedi ödül mamaları",
        messageTemplate: "Merhaba, kedi ödül mamaları hakkında bilgi almak istiyorum.",
      },
    ],
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

export const DIRECT_WHATSAPP_LABEL = "Doğrudan WhatsApp'tan yaz";
export const DEFAULT_DIRECT_MESSAGE = "Merhaba, size ulaşmak istiyorum.";

export const DETAIL_PROMPT =
  "Sipariş numaranız veya e-posta adresinizi yazın; ardından WhatsApp'a devam edin.";

export const DEFAULT_BOT_TITLE = "Size nasıl yardımcı olabiliriz?";
export const DEFAULT_BOT_WELCOME =
  "Bir konu seçin veya mesajınızı yazıp doğrudan WhatsApp'tan bize ulaşın.";
