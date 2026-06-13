import { NextResponse } from "next/server";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getWhatsAppConfig } from "@/lib/whatsapp-settings";
import {
  buildWaMeUrl,
  buildWhatsAppLeadMessage,
  generateWhatsAppRef,
  mergePrefilledMessage,
  normalizeWaLeadSource,
} from "@/lib/whatsapp-lead";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    source?: string;
    pagePath?: string;
    prefilledMessage?: string;
    botPath?: string;
  };

  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const wa = getWhatsAppConfig(settings);
  if (!wa.digits) {
    return NextResponse.json({ error: "WhatsApp numarası tanımlı değil" }, { status: 503 });
  }

  const source = normalizeWaLeadSource(body.source);
  const pagePath = body.pagePath?.trim().slice(0, 500) || null;
  const botPath = body.botPath?.trim().slice(0, 500) || null;
  const prefilledBase = mergePrefilledMessage(body.prefilledMessage, wa.defaultMessage);

  let ref = generateWhatsAppRef();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const fullText = buildWhatsAppLeadMessage(prefilledBase, ref, botPath);
      await prisma.whatsAppLead.create({
        data: {
          siteId: site.id,
          ref,
          source,
          pagePath,
          botPath,
          prefilledText: fullText,
          status: "new",
        },
      });
      return NextResponse.json({
        ref,
        waUrl: buildWaMeUrl(wa.digits, fullText),
      });
    } catch {
      ref = generateWhatsAppRef();
    }
  }

  return NextResponse.json({ error: "Kayıt oluşturulamadı" }, { status: 500 });
}
