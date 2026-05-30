"use client";

import { useEffect, useState } from "react";

export function CollectionSlugSelect({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (slug: string | undefined) => void;
}) {
  const [options, setOptions] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    void fetch("/api/admin/collections/options")
      .then((r) => r.json())
      .then((d: { collections?: { slug: string; title: string }[] }) => {
        setOptions(d.collections ?? []);
      })
      .catch(() => setOptions([]));
  }, []);

  return (
    <select
      className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm text-white"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">Tüm ürünler (slug boş)</option>
      {options.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.title} ({c.slug})
        </option>
      ))}
    </select>
  );
}
