"use client";

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
  if (!phoneDigits) return null;
  return (
    <>
      {floatingEnabled && !botEnabled ? (
        <WhatsappFloatingButton phoneDigits={phoneDigits} defaultMessage={defaultMessage} />
      ) : null}
      {botEnabled ? <WhatsappBotWidget /> : null}
    </>
  );
}
