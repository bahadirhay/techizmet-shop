"use client";

import { waDigits } from "@/lib/whatsapp-url";

type Props = {
  phone: string | null | undefined;
  prefilledMessage?: string;
  label?: string;
  className?: string;
};

export function AdminWhatsAppButton({
  phone,
  prefilledMessage,
  label = "WhatsApp",
  className,
}: Props) {
  const digits = waDigits(phone ?? "");
  if (!digits) return null;
  const msg = prefilledMessage?.trim();
  const href = msg
    ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/${digits}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="WhatsApp ile mesaj (yeni sekme)"
      className={
        className ??
        "inline-flex shrink-0 items-center rounded-full border-2 border-emerald-600 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-950 shadow-sm hover:bg-emerald-100"
      }
    >
      {label}
    </a>
  );
}
