import type { EmailTemplateKey } from "@/lib/site-settings";

/** Resend API veya konsol (geliştirme) */
export async function sendTemplateEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!params.to?.trim()) return { sent: false, reason: "no_email" };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    params.from?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    "Techizmet Shop <siparis@techizmet.local>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log("[email]", params.subject, "→", params.to);
    }
    return { sent: false, reason: "not_configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.replyTo?.trim() ? { reply_to: params.replyTo.trim() } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend hata:", err);
    return { sent: false, reason: "api_error" };
  }
  return { sent: true };
}

export type { EmailTemplateKey };
