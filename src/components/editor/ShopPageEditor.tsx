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
import Link from "next/link";
import { useMemo, useState } from "react";
import { serializeBlocks } from "@/lib/blocks/schema";
import { ensureEditorBlocks, stripBlockIds, type EditorShopBlock } from "@/lib/blocks/editor-ids";
import {
  SHOP_PALETTE_CATEGORIES,
  createBlockFromPaletteLabel,
  kingNoorEditorPreset,
} from "@/components/editor/shop-palette";
import { HomePageLivePreview } from "@/components/editor/HomePageLivePreview";
import { ShopBlockFields, blockSummary } from "@/components/editor/ShopBlockFields";
import { ShopEditorPreview } from "@/components/editor/ShopEditorPreview";

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

export function ShopPageEditor({
  pageId,
  pageTitle,
  pageSlug,
  initialBlocks,
  /** Ana sayfa: ortada vitrin teması ile tam önizleme (admin sayfası) */
  storePreview = false,
}: {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  initialBlocks: EditorShopBlock[];
  storePreview?: boolean;
}) {
  const [blocks, setBlocks] = useState<EditorShopBlock[]>(() => ensureEditorBlocks(initialBlocks));
  const [leftTab, setLeftTab] = useState<"widgets" | "structure">("widgets");
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => blocks.map((b) => b.id), [blocks]);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  const vitrinHref = pageSlug === "home" ? "/" : `/pages/${pageSlug}`;

  function appendFromLabel(label: string) {
    const nb = createBlockFromPaletteLabel(label);
    if (!nb) return;
    setBlocks((prev) => [...prev, nb]);
    setSelectedId(nb.id);
    setLeftTab("structure");
    setMessage(`“${label}” eklendi. Kaydet ile yayınlayın.`);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    setBlocks(arrayMove(blocks, oldIndex, newIndex));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ blocks: serializeBlocks(stripBlockIds(blocks)) }),
      });
      if (res.ok) setMessage("Kaydedildi — ana sayfayı yenileyin: /");
      else setMessage("Kayıt başarısız — oturumu kontrol edin.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setSaving(false);
    }
  }

  const statusClass = message?.startsWith("Kaydedildi")
    ? "ed-status ed-status--ok"
    : "ed-status ed-status--info";

  return (
    <div className="shop-page-editor flex min-h-[calc(100vh-5rem)] flex-col gap-4">
      <div className="ed-toolbar flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/pages">← Sayfalar</Link>
          <h1>{pageTitle}</h1>
          <p className="ed-meta">
            Vitrin:{" "}
            <a href={vitrinHref} target="_blank" rel="noreferrer">
              {vitrinHref}
            </a>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ed-btn-secondary"
            onClick={() => {
              setBlocks(kingNoorEditorPreset());
              setMessage("King Noor şablonu yüklendi — Kaydet ile uygulayın.");
            }}
          >
            King Noor şablonu
          </button>
          <button type="button" className="ed-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {message ? <p className={statusClass} role="status">{message}</p> : null}

      <div className="ed-shell grid min-h-0 flex-1 lg:grid-cols-[minmax(0,16rem)_1fr_minmax(0,19rem)] xl:grid-cols-[minmax(0,18rem)_1fr_minmax(0,22rem)]">
        <aside className="ed-sidebar flex max-h-[min(88vh,820px)] min-h-0 flex-col border-b border-zinc-700 lg:max-h-none lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 border-b border-zinc-700">
            <button
              type="button"
              className={`ed-tab ${leftTab === "widgets" ? "ed-tab--active" : ""}`}
              onClick={() => setLeftTab("widgets")}
            >
              Widget&apos;lar
            </button>
            <button
              type="button"
              className={`ed-tab ${leftTab === "structure" ? "ed-tab--active" : ""}`}
              onClick={() => setLeftTab("structure")}
            >
              Yapı ({blocks.length})
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {leftTab === "widgets" ? (
              <div className="space-y-5">
                <p className="ed-hint">
                  Kutuya <strong>tıklayın</strong> — ortadaki önizleme anında güncellenir. Canlı site için{" "}
                  <strong>Kaydet</strong>.
                </p>
                {SHOP_PALETTE_CATEGORIES.map((cat) => (
                  <div key={cat.title}>
                    <div className="ed-cat-title">{cat.title}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {cat.items.map((p) => (
                        <button key={p.label} type="button" className="ed-widget-btn" onClick={() => appendFromLabel(p.label)}>
                          <span className="text-2xl leading-none" aria-hidden>
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
              <div className="space-y-3">
                <p className="ed-structure-hint">
                  <strong>⋮⋮</strong> tutamacından sıralayın. Satıra tıklayınca sağda alanlar açılır.
                </p>
                {blocks.length === 0 ? (
                  <p className="ed-structure-hint">Henüz blok yok — Widget&apos;lar sekmesinden ekleyin.</p>
                ) : null}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                      {blocks.map((b) => (
                        <SortableRow key={b.id} id={b.id} selected={selectedId === b.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 text-left"
                            onClick={() => setSelectedId(b.id)}
                          >
                            <span className="ed-block-title truncate">{blockSummary(b)}</span>
                            <span className="ed-block-type shrink-0">{b.type}</span>
                          </button>
                          <button
                            type="button"
                            className="ed-remove-btn"
                            onClick={() => {
                              setBlocks(blocks.filter((x) => x.id !== b.id));
                              if (selectedId === b.id) setSelectedId(null);
                            }}
                          >
                            Kaldır
                          </button>
                        </SortableRow>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="ed-preview-toolbar">
            <span>{storePreview ? "Ana sayfa önizleme" : "Canlı önizleme"}</span>
            <a
              href={vitrinHref}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-[11px] font-normal normal-case tracking-normal text-zinc-400 underline hover:text-zinc-200"
            >
              Kaydettikten sonra vitrin ↗
            </a>
          </div>
          <div className="ed-preview-frame min-h-[320px] flex-1">
            {storePreview ? (
              <div className="ed-preview-canvas ed-preview-canvas--live max-h-none max-w-none">
                <HomePageLivePreview blocks={blocks} />
              </div>
            ) : (
              <div className="ed-preview-canvas">
                <ShopEditorPreview blocks={blocks} />
              </div>
            )}
          </div>
        </div>

        <aside className="ed-sidebar flex max-h-[min(88vh,820px)] min-h-0 flex-col border-t border-zinc-700 lg:max-h-none lg:border-l lg:border-t-0">
          <div className="ed-props-header">
            <p className="ed-props-title">Özellikler</p>
            {selected ? (
              <p className="ed-props-subtitle">{blockSummary(selected)}</p>
            ) : (
              <p className="ed-props-subtitle" style={{ color: "var(--ed-muted)", fontWeight: 400 }}>
                Blok seçin
              </p>
            )}
          </div>
          <div className="ed-props-body min-h-0 flex-1 overflow-y-auto">
            {selected ? (
              <div className="ed-field">
                <ShopBlockFields
                  block={selected}
                  onChange={(b) => setBlocks(blocks.map((x) => (x.id === b.id ? b : x)))}
                />
              </div>
            ) : (
              <div className="space-y-3 text-sm" style={{ color: "var(--ed-muted)", lineHeight: 1.5 }}>
                <p style={{ color: "var(--ed-text)", fontWeight: 500 }}>Sağ panel = seçili bloğun alanları</p>
                <ol className="list-decimal space-y-2 pl-4 text-[13px]">
                  <li>
                    <strong style={{ color: "var(--ed-text)" }}>Widget&apos;lar</strong> sekmesinden blok ekleyin.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ed-text)" }}>Yapı</strong> sekmesinde sırayı değiştirin.
                  </li>
                  <li>Listeden bloğa tıklayın, alanları düzenleyin, <strong style={{ color: "var(--ed-text)" }}>Kaydet</strong>.</li>
                </ol>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
