import type { ThemeShellSectionsContent } from "@/lib/theme-shell-sections-content";
import { ThemeShellInjectScript } from "@/components/store/ThemeShellInjectScript";
import { ThemeShellSectionsView } from "@/components/store/ThemeShellSectionsView";

/** Sepet, ödeme, hesap, arama — mirror MainContent + sayfa köprü scriptleri */
export function ThemeShellCommerceView({
  content,
  bridgeScripts = [],
  withListingCart = false,
}: {
  content: ThemeShellSectionsContent;
  bridgeScripts?: string[];
  withListingCart?: boolean;
}) {
  return (
    <>
      <ThemeShellSectionsView content={content} withCartBridge={withListingCart} />
      {bridgeScripts.map((code, index) => (
        <ThemeShellInjectScript
          key={`commerce-bridge-${index}`}
          id={`kn-commerce-bridge-${index}`}
          code={code}
        />
      ))}
    </>
  );
}
