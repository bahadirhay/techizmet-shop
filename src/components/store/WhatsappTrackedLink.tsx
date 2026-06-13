"use client";

import type { CSSProperties, ReactNode } from "react";
import type { WaLeadSource } from "@/lib/whatsapp-lead";
import { buildWaMeUrl, mergePrefilledMessage } from "@/lib/whatsapp-lead";

type Props = {
  phoneDigits: string;
  source: WaLeadSource;
  prefilledMessage?: string;
  siteDefaultMessage?: string | null;
  pagePath?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  children: ReactNode;
  openInNewTab?: boolean;
};

export function WhatsappTrackedLink({
  phoneDigits,
  source,
  prefilledMessage,
  siteDefaultMessage,
  pagePath,
  className,
  style,
  ariaLabel,
  children,
  openInNewTab = true,
}: Props) {
  const digits = phoneDigits.replace(/\D/g, "");
  if (!digits) return null;

  const fallbackText = mergePrefilledMessage(prefilledMessage, siteDefaultMessage);
  const fallbackHref = buildWaMeUrl(digits, fallbackText);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    const path =
      pagePath ??
      (typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : undefined);

    try {
      const res = await fetch("/api/whatsapp/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          pagePath: path,
          prefilledMessage: prefilledMessage ?? siteDefaultMessage ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { waUrl?: string };
      const url = data.waUrl ?? fallbackHref;
      if (openInNewTab) window.open(url, "_blank", "noopener,noreferrer");
      else window.location.href = url;
    } catch {
      if (openInNewTab) window.open(fallbackHref, "_blank", "noopener,noreferrer");
      else window.location.href = fallbackHref;
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      className={className}
      style={style}
      aria-label={ariaLabel}
      {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
