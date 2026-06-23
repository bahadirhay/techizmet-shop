/** Anatolian Paw — varsayılan WhatsApp bot düğümleri (yoksa ekler). */
import { PrismaClient } from "@prisma/client";

const DEFAULT_BOT_SEED = [
  {
    label: "Sipariş durumu",
    botReply: "Aşağıdan konunuzu seçin.",
    children: [
      { label: "Kargom nerede?", messageTemplate: "Merhaba, siparişimin kargo durumunu öğrenmek istiyorum." },
      { label: "Sipariş iptali", messageTemplate: "Merhaba, siparişimi iptal etmek istiyorum." },
    ],
  },
  {
    label: "Ürün önerisi",
    botReply: "Dostunuzun ırkını ve yaşını yazın; size uygun ürünleri listeleyelim.",
    children: [
      {
        label: "Öneri istiyorum",
        messageTemplate: "Merhaba, köpeğim için ürün önerisi almak istiyorum.",
      },
    ],
  },
  {
    label: "İade & değişim",
    messageTemplate: "Merhaba, iade veya değişim hakkında bilgi almak istiyorum.",
  },
  {
    label: "Diğer",
    messageTemplate: "Merhaba, size bir konuda danışmak istiyorum.",
  },
];

const p = new PrismaClient();

(async () => {
  const site = await p.storeSite.findFirst({ where: { slug: "anatolianpaw" } });
  if (!site) {
    console.error("site not found");
    process.exit(1);
  }

  const count = await p.whatsAppBotNode.count({ where: { siteId: site.id } });
  if (count > 0) {
    console.log(`Bot nodes already exist (${count}), skipping`);
    await p.$disconnect();
    return;
  }

  let order = 0;
  for (const root of DEFAULT_BOT_SEED) {
    const parent = await p.whatsAppBotNode.create({
      data: {
        siteId: site.id,
        parentId: null,
        label: root.label,
        botReply: root.botReply ?? null,
        messageTemplate: root.messageTemplate ?? null,
        sortOrder: order++,
        published: true,
      },
    });
    if (root.children?.length) {
      let childOrder = 0;
      for (const child of root.children) {
        await p.whatsAppBotNode.create({
          data: {
            siteId: site.id,
            parentId: parent.id,
            label: child.label,
            messageTemplate: child.messageTemplate,
            sortOrder: childOrder++,
            published: true,
          },
        });
      }
    }
  }

  console.log("Bot nodes seeded");
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
