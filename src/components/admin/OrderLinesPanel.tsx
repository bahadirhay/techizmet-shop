import { formatTry } from "@/lib/admin/money";
import {
  PRODUCT_KIND_BUNDLE,
  parseComponentsSnapshotJson,
} from "@/lib/product-bundle";

export type OrderLineRow = {
  id: string;
  title: string;
  qty: number;
  lineMinor: number;
  lineKind?: string | null;
  componentsSnapshotJson?: string | null;
};

export function OrderLinesPanel({ lines }: { lines: OrderLineRow[] }) {
  return (
    <ul className="mt-2 divide-y text-sm">
      {lines.map((line) => {
        const isBundle = line.lineKind === PRODUCT_KIND_BUNDLE;
        const components = isBundle
          ? parseComponentsSnapshotJson(line.componentsSnapshotJson)
          : [];
        return (
          <li key={line.id} className="py-2">
            <div className="flex justify-between gap-3">
              <span>
                {line.title} × {line.qty}
                {isBundle ? (
                  <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                    Paket
                  </span>
                ) : null}
              </span>
              <span className="shrink-0">{formatTry(line.lineMinor)}</span>
            </div>
            {components.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5 border-l-2 border-violet-200 pl-3 text-xs text-zinc-600">
                {components.map((c, i) => (
                  <li key={`${c.productId}-${i}`}>
                    {c.title} × {c.qty}
                    {c.sku ? <span className="text-zinc-400"> · {c.sku}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
