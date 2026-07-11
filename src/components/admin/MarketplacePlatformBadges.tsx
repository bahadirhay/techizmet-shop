"use client";

import {
  listingStatusStyle,
  marketplaceBadgeStyle,
  marketplacePlatformLabel,
  marketplacePlatformShort,
  MARKETPLACE_LISTING_STATUS_LABELS,
} from "@/lib/admin/marketplace-listing-labels";
import {
  marketplaceSyncStateClass,
  marketplaceSyncStateLabel,
  type MarketplaceSyncState,
} from "@/lib/marketplace/listing-sync-state";

export type ProductMarketplaceListing = {
  platform: string;
  status: string;
  syncState?: MarketplaceSyncState;
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
        const syncLabel = l.syncState ? marketplaceSyncStateLabel(l.syncState) : null;
        const title = [marketplacePlatformLabel(l.platform), statusLabel, syncLabel]
          .filter(Boolean)
          .join(" · ");

        const syncRing =
          l.syncState === "stale"
            ? "ring-2 ring-amber-400 ring-offset-1"
            : l.syncState === "needs_attention"
              ? "ring-2 ring-red-400 ring-offset-1"
              : l.syncState === "not_listed"
                ? "opacity-70"
                : "";

        return (
          <span
            key={l.platform}
            title={title}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${listingStatusStyle(l.status)} ${syncRing}`}
            style={{
              color: style.color,
              backgroundColor: style.bg,
              borderColor: style.border,
            }}
          >
            {marketplacePlatformShort(l.platform)}
            {l.syncState === "stale" ? "!" : l.syncState === "needs_attention" ? "⚠" : ""}
          </span>
        );
      })}
    </div>
  );
}

export function MarketplaceSyncLegend() {
  const items: MarketplaceSyncState[] = ["synced", "stale", "not_listed", "needs_attention"];
  return (
    <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500">
      {items.map((state) => (
        <span
          key={state}
          className={`rounded border px-1.5 py-0.5 font-medium ${marketplaceSyncStateClass(state)}`}
        >
          {marketplaceSyncStateLabel(state)}
        </span>
      ))}
    </div>
  );
}
