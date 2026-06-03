import Link from "next/link";
import { buildCarrierTrackingUrl } from "@/lib/admin/carrier-tracking";
import {
  formatShippingAddressLines,
  parseShippingAddress,
} from "@/lib/admin/shipping-label";

export function OrderDeliveryBlock({
  shippingAddressJson,
  carrierName,
  trackingUrlTemplate,
  trackingNumber,
}: {
  shippingAddressJson: string | null;
  carrierName: string | null;
  trackingUrlTemplate: string | null;
  trackingNumber: string | null;
}) {
  const address = parseShippingAddress(shippingAddressJson);
  const addressLines = formatShippingAddressLines(address);
  const trackingUrl = buildCarrierTrackingUrl(trackingUrlTemplate, trackingNumber);

  return (
    <div className="mt-6 border-t border-zinc-100 pt-6">
      <h2 className="font-semibold">Teslimat adresi</h2>
      {addressLines.length > 0 ? (
        <address className="mt-2 not-italic text-sm text-zinc-700">
          {addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">Adres kaydı yok.</p>
      )}

      {(carrierName || trackingNumber) && (
        <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm">
          <p>
            <span className="font-medium text-zinc-700">Kargo:</span> {carrierName ?? "—"}
          </p>
          {trackingNumber ? (
            <p className="mt-1">
              <span className="font-medium text-zinc-700">Takip no:</span>{" "}
              {trackingUrl ? (
                <Link
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[var(--kn-brand)] underline"
                >
                  {trackingNumber}
                </Link>
              ) : (
                <span className="font-mono">{trackingNumber}</span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-zinc-500">Takip numarası henüz girilmedi.</p>
          )}
          {trackingUrl ? (
            <p className="mt-2">
              <Link
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[var(--kn-brand)] underline"
              >
                Kargo firmasında sorgula →
              </Link>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
