import type { EmailTemplate, EmailTemplateKey } from "@/lib/site-settings";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email/defaults";

export function resolveEmailTemplate(
  key: EmailTemplateKey,
  custom?: Partial<Record<EmailTemplateKey, EmailTemplate>>,
): EmailTemplate {
  const c = custom?.[key];
  const d = DEFAULT_EMAIL_TEMPLATES[key];
  return {
    subject: c?.subject?.trim() || d.subject,
    bodyHtml: c?.bodyHtml?.trim() || d.bodyHtml,
  };
}

export function renderEmailTemplate(
  template: EmailTemplate,
  vars: Record<string, string>,
): { subject: string; html: string } {
  let subject = template.subject;
  let html = template.bodyHtml;
  for (const [key, value] of Object.entries(vars)) {
    const token = `{{${key}}}`;
    subject = subject.split(token).join(value);
    html = html.split(token).join(value);
  }
  return { subject, html };
}
