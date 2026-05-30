"use client";

import "./shop-editor.css";

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
import { useMemo, useState } from "react";
import { SHOP_PALETTE_CATEGORIES, createBlockFromPaletteLabel } from "@/components/editor/shop-palette";
import { ShopBlockFields, blockSummary } from "@/components/editor/ShopBlockFields";
import { ensureEditorBlocks, type EditorShopBlock } from "@/lib/blocks/editor-ids";

function SortableRow({
  id,
  selected,
  children,
}: {
  id: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.9 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ed-block-row flex items-stretch gap-2 ${selected ? "ed-block-row--selected" : ""}`}
    >
      <button type="button" className="ed-drag-handle" aria-label="Sürükle" {...attributes} {...listeners}>
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Randevu PageEditor benzeri — vitrin ek blokları veya gömülü kullanım */
export function CustomBlocksEditor({
  blocks,
  onChange,
  hint,
}: {
  blocks: EditorShopBlock[];
  onChange: (blocks: EditorShopBlock[]) => void;
  hint?: string;
}) {
  const [leftTab, setLeftTab] = useState<"widgets" | "structure">("widgets");
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => blocks.map((b) => b.id), [blocks]);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  function appendFromLabel(label: string) {
    const nb = createBlockFromPaletteLabel(label);
    if (!nb) return;
    const next = [...blocks, nb];
    onChange(next);
    setSelectedId(nb.id);
    setLeftTab("structure");
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    onChange(arrayMove(blocks, oldIndex, newIndex));
  }

  return (
    <div className="shop-page-editor grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,14rem)_1fr_minmax(0,18rem)]">
      <aside className="ed-panel overflow-y-auto border-zinc-700 p-3 lg:border-r">
        <div className="flex border-b border-zinc-700">
          <button
            type="button"
            className={`ed-tab flex-1 ${leftTab === "widgets" ? "ed-tab--active" : ""}`}
            onClick={() => setLeftTab("widgets")}
          >
            Ekle
          </button>
          <button
            type="button"
            className={`ed-tab flex-1 ${leftTab === "structure" ? "ed-tab--active" : ""}`}
            onClick={() => setLeftTab("structure")}
          >
            Sıra ({blocks.length})
          </button>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {hint ? <p className="ed-hint mb-3">{hint}</p> : null}
          {leftTab === "widgets" ? (
            <div className="space-y-4">
              {SHOP_PALETTE_CATEGORIES.map((cat) => (
                <div key={cat.title}>
                  <div className="ed-cat-title">{cat.title}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {cat.items.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="ed-widget-btn"
                        onClick={() => appendFromLabel(p.label)}
                      >
                        <span className="text-xl" aria-hidden>
                          {p.icon}
                        </span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {blocks.length === 0 ? (
                    <p className="text-xs text-zinc-500">Henüz blok yok — Ekle sekmesinden seçin.</p>
                  ) : null}
                  {blocks.map((b) => (
                    <SortableRow key={b.id} id={b.id} selected={selectedId === b.id}>
                      <div className="flex w-full items-center justify-between gap-2 text-sm">
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-zinc-100"
                          onClick={() => setSelectedId(b.id)}
                        >
                          {blockSummary(b)}
                        </button>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-red-400"
                          onClick={() => {
                            const next = blocks.filter((x) => x.id !== b.id);
                            onChange(next);
                            if (selectedId === b.id) setSelectedId(next[0]?.id ?? null);
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </aside>

      <div className="ed-panel flex items-center justify-center border-zinc-700 p-6 lg:border-r">
        <p className="max-w-sm text-center text-sm text-zinc-400">
          Ek bloklar vitrinde <strong className="text-zinc-200">sayfa içeriğinin en üstünde</strong> görünür.
          Ortadaki Techizmet Shop önizlemesinde de aynı sırayla yansır. Değişiklik için üstteki{" "}
          <strong className="text-zinc-200">Kaydet</strong> kullanın.
        </p>
      </div>

      <aside className="ed-panel overflow-y-auto p-4">
        <p className="ed-props-title text-sm font-medium text-zinc-200">Blok alanları</p>
        {selected ? (
          <div className="mt-3">
            <ShopBlockFields
              block={selected}
              onChange={(b) => onChange(blocks.map((x) => (x.id === b.id ? b : x)))}
            />
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">Soldan bir blok seçin veya yeni ekleyin.</p>
        )}
      </aside>
    </div>
  );
}

export function toEditorCustomBlocks(blocks?: import("@/lib/blocks/schema").ShopBlock[]): EditorShopBlock[] {
  return ensureEditorBlocks(blocks ?? []);
}
