"use client";

import { useEffect, useRef } from "react";

/** Kargo etiketi — takip numarasını Code 128 barkoda çevirir */
export function ShippingLabelBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const code = value.trim();

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !code) return;

    let cancelled = false;
    import("jsbarcode")
      .then((mod) => {
        if (cancelled) return;
        el.innerHTML = "";
        try {
          mod.default(el, code, {
            format: "CODE128",
            displayValue: false,
            margin: 0,
            height: 44,
            width: 1.6,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch {
          /* geçersiz karakter — metin yine görünür */
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!code) return null;

  return (
    <svg
      ref={svgRef}
      className="shipping-label__barcode"
      role="img"
      aria-label={`Barkod ${code}`}
    />
  );
}
