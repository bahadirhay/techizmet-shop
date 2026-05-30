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
import { useState } from "react";
import { useClientMounted } from "@/hooks/use-client-mounted";
import type { VitrinCollectionCard } from "@/lib/mirror-collections-sync";

function SortRow({ slug, title }: { slug: string; title: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slug });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2 py-2"
    >
      <button type="button" className="ed-drag-handle shrink-0" aria-label="Sürükle" {...attributes} {...listeners}>
        ⋮⋮
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">{title}</span>
      <Link href={`/admin/collections`} className="text-xs text-zinc-500 hover:underline">
        düzenle
      </Link>
    </div>
  );
}

export function MirrorCollectionsSortPanel({
  collections,
}: {
  collections: VitrinCollectionCard[];
}) {
  const router = useRouter();
  const [slugs, setSlugs] = useState(() =>
    [...collections]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      .map((c) => c.slug)
      .filter((s) => s !== "all" && s !== "skincare"),
  );
  const [busy, setBusy] = useState(false);
  const mounted = useClientMounted();
  const bySlug = new Map(collections.map((c) => [c.slug, c]));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSlugs((prev) => {
      const o = prev.indexOf(String(active.id));
      const n = prev.indexOf(String(over.id));
      if (o < 0 || n < 0) return prev;
      return arrayMove(prev, o, n);
    });
  }

  async function saveOrder() {
    setBusy(true);
    const res = await fetch("/api/admin/collections/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs }),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Sıra kaydedilemedi");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3 border-t border-zinc-700 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Koleksiyon kartları sırası</p>
      <p className="text-xs text-zinc-500">Sürükleyerek vitrin grid sırasını değiştirin. Başlık/görsel: Admin → Koleksiyonlar.</p>
      {mounted ? (
        <DndContext id="kn-collections-sort" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slugs} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {slugs.map((slug) => (
                <SortRow key={slug} slug={slug} title={bySlug.get(slug)?.title ?? slug} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {slugs.map((slug) => (
            <div
              key={slug}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2 py-2"
            >
              <span className="ed-drag-handle shrink-0 opacity-40" aria-hidden>
                ⋮⋮
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">
                {bySlug.get(slug)?.title ?? slug}
              </span>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveOrder()}
        className="w-full rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
      >
        {busy ? "Kaydediliyor…" : "Kart sırasını kaydet"}
      </button>
    </div>
  );
}
