import { MIRROR_LISTING_CART_BRIDGE_JS } from "@/lib/mirror-listing-cart-bridge";

/** Sepete ekle köprüsü — HTML parse sırasında çalışır (useEffect gecikmesi yok) */
export function ThemeShellListingCartBridgeScript() {
  return (
    <script
      id="kn-listing-cart-bridge"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: MIRROR_LISTING_CART_BRIDGE_JS }}
    />
  );
}
