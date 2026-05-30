"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { useState } from "react";
import {
  SHOP_BLOCK_LABELS,
  serializeBlocks,
  type ShopBlock,
} from "@/lib/blocks/schema";
import { storeHomePreset } from "@/lib/blocks/presets/techizmet-shop-home";
import { nanoid } from "nanoid";

function SortableRow({ id, label, selected, onSelect }: { id: string; label: string; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 text-sm ${selected ? "border-[var(--kn-brand)] bg-blue-50" : "border-zinc-200 bg-white"}`}
      onClick={onSelect}
    >
      <button type="button" className="text-zinc-400" {...attributes} {...listeners}>
        ⋮⋮
      </button>
      <span className="flex-1">{label}</span>
    </div>
  );
}

export function BlockPageEditor({
  pageId,
  initialBlocks,
}: {
  pageId: string;
  initialBlocks: ShopBlock[];
}) {
  const [blocks, setBlocks] = useState<ShopBlock[]>(initialBlocks);
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = blocks.map((_, i) => `block-${i}`);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    setBlocks((b) => arrayMove(b, oldIndex, newIndex));
    setSelected(newIndex);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: serializeBlocks(blocks) }),
    });
    setSaving(false);
    setMsg(res.ok ? "Kaydedildi" : "Hata");
  }

  function addBlock(type: ShopBlock["type"]) {
    const base: ShopBlock =
      type === "text"
        ? { type: "text", props: { content: "Yeni metin" } }
        : type === "announcementBar"
          ? { type: "announcementBar", props: { text: "Kampanya metni" } }
          : type === "heroSlider"
            ? {
                type: "heroSlider",
                props: {
                  slides: [{ id: nanoid(8), headline: "Başlık", subline: "Alt metin" }],
                },
              }
            : type === "productGrid"
              ? { type: "productGrid", props: { title: "Ürünler", limit: 8 } }
              : { type: "promoMarquee", props: { text: "Kampanya" } };
    setBlocks((b) => [...b, base]);
    setSelected(blocks.length);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border px-2 py-1 text-xs"
            onClick={() => setBlocks(storeHomePreset)}
          >
            Techizmet Shop preset
          </button>
          <button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={save} disabled={saving}>
            {saving ? "…" : "Kaydet"}
          </button>
        </div>
        {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {blocks.map((b, i) => (
                <SortableRow
                  key={ids[i]}
                  id={ids[i]}
                  label={SHOP_BLOCK_LABELS[b.type]}
                  selected={selected === i}
                  onSelect={() => setSelected(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <select
          className="w-full rounded-lg border px-2 py-2 text-sm"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as ShopBlock["type"];
            if (v) addBlock(v);
            e.target.value = "";
          }}
        >
          <option value="">+ Blok ekle</option>
          {Object.entries(SHOP_BLOCK_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">
          Önizleme: vitrinde <LinkPreview href="/" /> — seçili blok #{selected + 1} (
          {blocks[selected] ? SHOP_BLOCK_LABELS[blocks[selected].type] : "—"})
        </p>
        <pre className="mt-4 max-h-[60vh] overflow-auto rounded-lg bg-zinc-50 p-3 text-xs">
          {JSON.stringify(blocks[selected] ?? null, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function LinkPreview({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-[var(--kn-brand)] underline">
      ana sayfa
    </a>
  );
}
