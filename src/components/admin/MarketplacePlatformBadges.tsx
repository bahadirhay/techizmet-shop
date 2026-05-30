"use client";

import {
  listingStatusStyle,
  marketplaceBadgeStyle,
  marketplacePlatformLabel,
  marketplacePlatformShort,
  MARKETPLACE_LISTING_STATUS_LABELS,
} from "@/lib/admin/marketplace-listing-labels";

export type ProductMarketplaceListing = {
  platform: string;
  status: string;
};

export function MarketplacePlatformBadges({
  listings,
  compact = false,
}: {
  listings: ProductMarketplaceListing[];
  compact?: boolean;
}) {
  if (!listings.length) {
    return compact ? null : <span className="text-xs text-zinc-400">—</span>;
  }

  return (
    <div className="flex max-w-[10rem] flex-wrap gap-1">
      {listings.map((l) => {
        const style = marketplaceBadgeStyle(l.platform);
        const statusLabel = MARKETPLACE_LISTING_STATUS_LABELS[l.status] ?? l.status;
        const title = `${marketplacePlatformLabel(l.platform)} · ${statusLabel}`;

        return (
          <span
            key={l.platform}
            title={title}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${listingStatusStyle(l.status)}`}
            style={{
              color: style.color,
              backgroundColor: style.bg,
              borderColor: style.border,
            }}
          >
            {marketplacePlatformShort(l.platform)}
          </span>
        );
      })}
    </div>
  );
}
