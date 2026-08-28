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
    <div className="kn-street-food-fund-bar">
      <div className="kn-street-food-fund-bar__inner">
        <div className="kn-street-food-fund-bar__title">🐾 {data.title}</div>
        <div className="kn-street-food-fund-bar__meter">
          <div className="kn-street-food-fund-bar__counts">
            Toplanan Mama: {data.collectedLabel} / {data.targetLabel}
          </div>
          <div className="kn-street-food-fund-bar__track" aria-hidden>
            <div className="kn-street-food-fund-bar__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="kn-street-food-fund-bar__sub">{data.counterSubtext}</p>
        {data.impactLabel ? (
          <p className="kn-street-food-fund-bar__impact">{data.impactLabel}</p>
        ) : null}
        <Link href={data.detailHref} className="kn-street-food-fund-bar__link">
          Detaylar
        </Link>
      </div>
    </div>
  );
}
