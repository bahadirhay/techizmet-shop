"use client";

import { useEffect } from "react";
import { refreshStreetFoodFundHero } from "@/lib/mirror-street-food-bar";

function heroHostReady(): boolean {
  return !!document.querySelector(
    "#MainContent .section-media-grid:first-of-type .media-grid--wrapper",
  );
}

/** Ana sayfa hero — sol alttaki mama fonu kartı (iframe ile aynı konum) */
export function StreetFoodFundHero() {
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (cancelled || !heroHostReady()) return;
      await refreshStreetFoodFundHero(document);
    };

    const schedule = () => {
      void refresh();
    };

    schedule();
    const timers = [120, 500, 1500, 4000, 8000].map((ms) => window.setTimeout(schedule, ms));
    const interval = window.setInterval(schedule, 60_000);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
