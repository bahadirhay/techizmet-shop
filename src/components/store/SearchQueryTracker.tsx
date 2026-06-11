"use client";

import { useEffect, useRef } from "react";
import { sendStoreEvents } from "@/lib/analytics/client";

/** /search?q= sayfasında arama terimini bir kez kaydeder */
export function SearchQueryTracker({ query, resultCount }: { query: string; resultCount?: number }) {
  const sent = useRef<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const key = `${term}:${resultCount ?? ""}`;
    if (sent.current === key) return;
    sent.current = key;
    sendStoreEvents([
      {
        type: "search_query",
        payload: {
          query: term,
          source: "page",
          ...(resultCount != null ? { resultCount } : {}),
        },
      },
    ]);
  }, [query, resultCount]);

  return null;
}
