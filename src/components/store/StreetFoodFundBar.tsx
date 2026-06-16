"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StreetFoodFundPublicPayload } from "@/lib/street-food-fund/types";

export function StreetFoodFundBar() {
  const [data, setData] = useState<StreetFoodFundPublicPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/vitrin/street-food-fund", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as StreetFoodFundPublicPayload & { enabled?: boolean };
        if (!cancelled && json.enabled) setData(json);
      } catch {
        /* ignore */
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  if (!data?.enabled) return null;

  const pct = Math.max(0, Math.min(100, data.progressPercent));

  return (
    <div
      className="kn-street-food-fund-bar"
      style={{
        background: "linear-gradient(90deg, #1f4d3a 0%, #2d6a4f 55%, #40916c 100%)",
        color: "#fff",
        fontSize: "12px",
        lineHeight: 1.35,
      }}
    >
      <div
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 sm:gap-4"
      >
        <div className="font-semibold whitespace-nowrap">🐾 {data.title}</div>
        <div className="min-w-[140px] flex-1">
          <div className="font-semibold">
            Toplanan Mama: {data.collectedLabel} / {data.targetLabel}
          </div>
          <div
            className="mt-1 h-1 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.25)" }}
            aria-hidden
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, background: "#b7e4c7" }}
            />
          </div>
        </div>
        <div className="text-[11px] opacity-90">{data.counterSubtext}</div>
        <Link href={data.detailHref} className="text-[11px] underline underline-offset-2">
          Detaylar
        </Link>
      </div>
    </div>
  );
}
