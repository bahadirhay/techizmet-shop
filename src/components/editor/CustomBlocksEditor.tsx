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
import {
  MIRROR_WIDGET_TOP,
  type EditorMirrorCustomBlock,
  type MirrorWidgetSectionOption,
} from "@/lib/mirror-custom-block-types";

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
  sectionOptions = [],
  compact = false,
}: {
  blocks: EditorMirrorCustomBlock[];
  onChange: (blocks: EditorMirrorCustomBlock[]) => void;
  hint?: string;
  sectionOptions?: MirrorWidgetSectionOption[];
  /** Orta bilgi paneli gizlenir (yan önizleme ile kullanım) */
  compact?: boolean;
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
    const next: EditorMirrorCustomBlock[] = [
      ...blocks,
      { ...nb, hidden: false, insertAfterSection: MIRROR_WIDGET_TOP },
    ];
    onChange(next);
    setSelectedId(nb.id);
    setLeftTab("structure");
  }

  function patchBlock(id: string, patch: Partial<EditorMirrorCustomBlock>) {
    onChange(
      blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as EditorMirrorCustomBlock) : b,
      ),
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    onChange(arrayMove(blocks, oldIndex, newIndex));
  }

  const gridClass = compact
    ? "shop-page-editor grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,12rem)_minmax(0,16rem)]"
    : "shop-page-editor grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,14rem)_1fr_minmax(0,18rem)]";

  return (
    <div className={gridClass}>
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
                      <div className="flex w-full flex-col gap-1 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className={`min-w-0 flex-1 truncate text-left ${b.hidden ? "text-zinc-500 line-through" : "text-zinc-100"}`}
                            onClick={() => setSelectedId(b.id)}
                          >
                            {blockSummary(b)}
                          </button>
                          <button
                            type="button"
                            className="shrink-0 text-xs text-zinc-400"
                            title={b.hidden ? "Göster" : "Gizle"}
                            onClick={() => patchBlock(b.id, { hidden: !b.hidden })}
                          >
                            {b.hidden ? "Göster" : "Gizle"}
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
                        <p className="text-[10px] text-zinc-500">
                          {placementLabel(b.insertAfterSection, sectionOptions)}
                        </p>
                      </div>
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </aside>

      {!compact ? (
        <div className="ed-panel flex items-center justify-center border-zinc-700 p-6 lg:border-r">
          <p className="max-w-sm text-center text-sm text-zinc-400">
            Widget konumunu sağ panelden seçin. <strong className="text-zinc-200">Tema bölümleri</strong> sekmesinde
            ortadaki önizlemede canlı görünür. Sıra sekmesinde sürükleyerek sıralayın.
          </p>
        </div>
      ) : null}

      <aside className={`ed-panel overflow-y-auto p-4 ${compact ? "border-zinc-700 lg:border-l" : ""}`}>
        <p className="ed-props-title text-sm font-medium text-zinc-200">Blok alanları</p>
        {selected ? (
          <div className="mt-3 space-y-4">
            <label className="grid gap-1.5 text-sm">
              <span className="text-zinc-300">Sayfadaki konum</span>
              <select
                className="ed-input"
                value={selected.insertAfterSection ?? MIRROR_WIDGET_TOP}
                onChange={(e) => patchBlock(selected.id, { insertAfterSection: e.target.value })}
              >
                <option value={MIRROR_WIDGET_TOP}>Sayfa başı (ilk bölümden önce)</option>
                {sectionOptions.map((s) => (
                  <option key={s.key} value={s.key}>
                    “{s.label}” bölümünden sonra
                  </option>
                ))}
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={selected.hidden === true}
                onChange={(e) => patchBlock(selected.id, { hidden: e.target.checked })}
              />
              Vitrinde gizle
            </label>
            <ShopBlockFields
              block={selected}
              onChange={(b) => patchBlock(selected.id, { ...b })}
            />
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">Soldan bir blok seçin veya yeni ekleyin.</p>
        )}
      </aside>
    </div>
  );
}

export { toEditorMirrorCustomBlocks as toEditorCustomBlocks } from "@/lib/mirror-custom-block-types";

function placementLabel(
  insertAfterSection: string | undefined,
  sectionOptions: MirrorWidgetSectionOption[],
): string {
  const key = insertAfterSection ?? MIRROR_WIDGET_TOP;
  if (key === MIRROR_WIDGET_TOP) return "Konum: sayfa başı";
  const match = sectionOptions.find((s) => s.key === key);
  return match ? `Konum: ${match.label} sonrası` : `Konum: ${key} sonrası`;
}
