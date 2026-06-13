/**
 * Anatolian Paw — WhatsApp varsayılanları (numara + bot açık).
 * Kullanım: node scripts/seed-anatolianpaw-whatsapp.mjs
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

function normalizeTurkishMobile(digits) {
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `9${digits}`;
  return digits;
}

(async () => {
  const site = await p.storeSite.findFirst({ where: { slug: "anatolianpaw" } });
  if (!site) {
    console.error("anatolianpaw site not found");
    process.exit(1);
  }

  const settings = JSON.parse(site.settingsJson || "{}");
  const rawPhone =
    settings.whatsapp?.number?.trim() ||
    settings.store?.legal?.phone?.trim() ||
    settings.store?.shipFrom?.phone?.trim() ||
    "";
  const digits = normalizeTurkishMobile(rawPhone.replace(/\D/g, ""));
  if (!digits) {
    console.error("No phone number found in settings");
    process.exit(1);
  }

  settings.whatsapp = {
    ...settings.whatsapp,
    number: digits,
    botEnabled: true,
    floatingEnabled: true,
    botTitle: settings.whatsapp?.botTitle || "Anatolian Paw",
    botWelcome:
      settings.whatsapp?.botWelcome ||
      "Merhaba! Size nasıl yardımcı olabiliriz? Aşağıdan bir konu seçebilirsiniz.",
  };

  await p.storeSite.update({
    where: { id: site.id },
    data: { settingsJson: JSON.stringify(settings) },
  });

  console.log("WhatsApp settings updated:", JSON.stringify(settings.whatsapp, null, 2));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
