"use client";

import { inputClass } from "@/components/admin/AdminForm";
import { TR_VAT_RATES } from "@/lib/tr-vat-rates";

export function VatRateSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (rate: number) => void;
}) {
  const selected = TR_VAT_RATES.find((r) => r.rate === value) ?? TR_VAT_RATES[0]!;

  return (
    <div>
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {TR_VAT_RATES.map((r) => (
          <option key={r.rate} value={r.rate}>
            {r.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-zinc-500">{selected.description}</p>
    </div>
  );
}
