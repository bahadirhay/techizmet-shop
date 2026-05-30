import type { StoreSmsNotificationSettings } from "@/lib/site-settings";

function normalizeGsm(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `9${digits}`;
  if (digits.length === 12 && digits.startsWith("90")) return digits;
  return null;
}

/** Netgsm basit GET API — ayarlar site settingsJson içinde */
export async function sendSms(params: {
  to: string;
  message: string;
  config: StoreSmsNotificationSettings;
}): Promise<{ sent: boolean; reason?: string }> {
  const gsm = normalizeGsm(params.to);
  if (!gsm) return { sent: false, reason: "invalid_phone" };

  const usercode = params.config.userCode?.trim();
  const password = params.config.password?.trim();
  const header = params.config.msgHeader?.trim();

  if (!usercode || !password || !header) {
    if (process.env.NODE_ENV === "development") {
      console.log("[sms]", gsm, params.message.slice(0, 80));
    }
    return { sent: false, reason: "not_configured" };
  }

  const url = new URL("https://api.netgsm.com.tr/sms/send/get/");
  url.searchParams.set("usercode", usercode);
  url.searchParams.set("password", password);
  url.searchParams.set("gsmno", gsm);
  url.searchParams.set("message", params.message);
  url.searchParams.set("msgheader", header);
  url.searchParams.set("dil", "TR");

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const text = (await res.text()).trim();
  if (!res.ok) {
    console.error("[sms] Netgsm HTTP", res.status, text);
    return { sent: false, reason: "api_error" };
  }
  if (text.startsWith("00") || text === "0") return { sent: true };
  console.error("[sms] Netgsm yanıt:", text);
  return { sent: false, reason: text || "api_error" };
}

export function renderSmsBody(
  template: string | undefined,
  vars: Record<string, string>,
): string {
  let out =
    template?.trim() ||
    "{{storeName}}: Siparis {{orderNumber}} — {{total}}. Bilgi: {{storeUrl}}";
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}
