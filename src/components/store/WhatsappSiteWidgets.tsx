"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WhatsappBotWidget } from "@/components/store/WhatsappBotWidget";
import { WhatsappFloatingButton } from "@/components/store/WhatsappFloatingButton";

export function WhatsappSiteWidgets({
  phoneDigits,
  defaultMessage,
  floatingEnabled,
  botEnabled,
}: {
  phoneDigits: string;
  defaultMessage?: string | null;
  floatingEnabled: boolean;
  botEnabled: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);

  const digits = phoneDigits.replace(/\D/g, "");
  if (!digits || inIframe) return null;

  const widgets = (
    <div className="kn-whatsapp-widgets" style={{ position: "relative", zIndex: 99999 }}>
      {floatingEnabled && !botEnabled ? (
        <WhatsappFloatingButton phoneDigits={digits} defaultMessage={defaultMessage} />
      ) : null}
      {botEnabled ? <WhatsappBotWidget /> : null}
    </div>
  );

  if (!mounted) return null;
  return createPortal(widgets, document.body);
}
