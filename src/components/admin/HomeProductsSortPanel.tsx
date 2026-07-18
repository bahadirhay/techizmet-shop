"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import { formatTry } from "@/lib/admin/money";

export type ProductOrderScope = "home" | "collection-all";

export type HomeOrderProduct = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  priceMinor: number;
  sortOrder: number;
  catalogSortOrder: number;
  imageUrl: string | null;
};

function SortRow({ product }: { product: HomeOrderProduct }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border bg-white px-3 py-2 ${
        isDragging ? "z-10 border-violet-400 shadow-md" : "border-zinc-200"
      } ${product.published ? "" : "opacity-60"}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none px-1 text-zinc-400 hover:text-zinc-700"
        aria-label="Sürükle"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
      ) : (
        <div className="h-10 w-10 rounded bg-zinc-100" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{product.title}</p>
        <p className="text-xs text-zinc-500">
          {formatTry(product.priceMinor)}
          {!product.published ? " · yayında değil" : ""}
        </p>
      </div>
      <Link
        href={`/admin/products/${product.id}/edit`}
        className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-800"
      >
        düzenle
      </Link>
    </div>
  );
}

const SCOPE_COPY: Record<
  ProductOrderScope,
  { title: string; help: string; saved: string }
> = {
  home: {
    title: "Ana sayfa",
    help: "Üstteki ürün ana sayfadaki ürün swiper / kartlarında önce görünür. Kaydetmek ana sayfa sıralamasını Manuel moda alır.",
    saved: "Ana sayfa sırası kaydedildi.",
  },
  "collection-all": {
    title: "Tüm ürünler (/collections/all)",
    help: "Üstteki ürün katalog sayfasında önce görünür. Ana sayfa sırasından bağımsızdır.",
    saved: "Katalog (/collections/all) sırası kaydedildi.",
  },
};

export function HomeProductsSortPanel({
  products,
  initialScope = "home",
}: {
  products: HomeOrderProduct[];
  initialScope?: ProductOrderScope;
}) {
  const router = useRouter();
  const mounted = useClientMounted();
  const [scope, setScope] = useState<ProductOrderScope>(initialScope);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const orderedForScope = useMemo(() => {
    const list = [...products];
    if (scope === "collection-all") {
      list.sort(
        (a, b) => a.catalogSortOrder - b.catalogSortOrder || a.title.localeCompare(b.title, "tr"),
      );
    } else {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "tr"));
    }
    return list;
  }, [products, scope]);

  const [ids, setIds] = useState(() => orderedForScope.map((p) => p.id));

  useEffect(() => {
    setIds(orderedForScope.map((p) => p.id));
    setMsg(null);
  }, [orderedForScope]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is HomeOrderProduct => Boolean(p));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setIds((prev) => {
      const o = prev.indexOf(String(active.id));
      const n = prev.indexOf(String(over.id));
      if (o < 0 || n < 0) return prev;
      return arrayMove(prev, o, n);
    });
    setMsg(null);
  }

  async function saveOrder() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/products/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids, scope }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Kayıt başarısız");
      setMsg(SCOPE_COPY[scope].saved);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setBusy(false);
    }
  }

  const copy = SCOPE_COPY[scope];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCOPE_COPY) as ProductOrderScope[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setScope(key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              scope === key
                ? "border-violet-400 bg-violet-50 text-violet-950"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {SCOPE_COPY[key].title}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600">{copy.help}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Yayınlanmamış ürünler de listede; sitede yalnızca yayındaki ürünler gösterilir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/settings/store" className={btnSecondary}>
            Mağaza sıralama ayarı
          </Link>
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => void saveOrder()}>
            {busy ? "Kaydediliyor…" : "Sırayı kaydet"}
          </button>
        </div>
      </div>

      {msg ? (
        <p
          className={`text-sm ${
            msg.includes("Kaydedildi") || msg.includes("kaydedildi") ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {msg}
        </p>
      ) : null}

      {mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {ordered.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-xs tabular-nums text-zinc-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <SortRow product={p} />
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {ordered.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="w-6 text-center text-xs text-zinc-400">{i + 1}</span>
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                <span className="text-zinc-300">⋮⋮</span>
                <span className="truncate text-sm">{p.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
