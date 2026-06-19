import Link from "next/link";
import { buildCarrierTrackingUrl } from "@/lib/admin/carrier-tracking";
import {
  formatShippingAddressLines,
  parseShippingAddress,
} from "@/lib/admin/shipping-label";

function addressesDiffer(
  shippingJson: string | null,
  billingJson: string | null,
): boolean {
  if (!billingJson) return false;
  if (!shippingJson) return true;
  try {
    const ship = JSON.parse(shippingJson) as Record<string, unknown>;
    const bill = JSON.parse(billingJson) as Record<string, unknown>;
    const keys = ["line1", "city", "district", "postalCode", "firstName", "lastName"] as const;
    return keys.some((k) => String(ship[k] ?? "").trim() !== String(bill[k] ?? "").trim());
  } catch {
    return shippingJson.trim() !== billingJson.trim();
  }
}

export function OrderDeliveryBlock({
  shippingAddressJson,
  billingAddressJson,
  billingTaxId,
  billingTaxOffice,
  carrierName,
  trackingUrlTemplate,
  trackingNumber,
}: {
  shippingAddressJson: string | null;
  billingAddressJson?: string | null;
  billingTaxId?: string | null;
  billingTaxOffice?: string | null;
  carrierName: string | null;
  trackingUrlTemplate: string | null;
  trackingNumber: string | null;
}) {
  const address = parseShippingAddress(shippingAddressJson);
  const addressLines = formatShippingAddressLines(address);
  const billingAddress = parseShippingAddress(billingAddressJson ?? null);
  const billingLines = formatShippingAddressLines(billingAddress);
  const showBillingAddress =
    billingAddressJson && addressesDiffer(shippingAddressJson, billingAddressJson);
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

      {billingTaxId || billingTaxOffice || showBillingAddress ? (
        <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm">
          <h3 className="font-medium text-zinc-800">Fatura bilgileri</h3>
          {billingTaxId ? (
            <p className="mt-1">
              <span className="text-zinc-600">TCKN/VKN:</span>{" "}
              <span className="font-mono">{billingTaxId}</span>
            </p>
          ) : null}
          {billingTaxOffice ? (
            <p className="mt-1">
              <span className="text-zinc-600">Vergi dairesi:</span> {billingTaxOffice}
            </p>
          ) : null}
          {showBillingAddress ? (
            <div className="mt-2">
              <p className="text-zinc-600">Fatura adresi (teslimattan farklı):</p>
              <address className="mt-1 not-italic text-zinc-700">
                {billingLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
          ) : billingTaxId || billingTaxOffice ? (
            <p className="mt-1 text-zinc-500">Fatura adresi teslimat ile aynı.</p>
          ) : null}
        </div>
      ) : null}

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
