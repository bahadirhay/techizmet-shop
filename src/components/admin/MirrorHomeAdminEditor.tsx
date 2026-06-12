"use client";

import "@/components/editor/shop-editor.css";

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
import { useCallback, useEffect, useMemo, useState } from "react";
import { MirrorElementEditPanel } from "@/components/admin/MirrorElementEditPanel";
import { MirrorHomeFrameClient } from "@/components/store/MirrorHomeFrameClient";
import type {
  MirrorElementEdit,
  MirrorElementPick,
} from "@/lib/mirror-element-edits";
import type {
  MirrorHomeConfig,
  MirrorHomeSection,
  MirrorHomeSectionEdit,
} from "@/lib/mirror-home-overlay";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";

import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";

const MIRROR_SRC = toBrandedMirrorSrc("theme/techizmet-shop/mirror/index-tr.html");

function SortableSectionRow({
  id,
  label,
  type,
  hidden,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  type: string;
  hidden?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.85 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ed-block-row flex items-stretch gap-2 ${selected ? "ed-block-row--selected" : ""}`}
    >
      <button type="button" className="ed-drag-handle" aria-label="Sürükle" {...attributes} {...listeners}>
        ⋮⋮
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm"
        onClick={onSelect}
      >
        <span className={hidden ? "text-zinc-500 line-through" : "text-zinc-100"}>{label}</span>
        <span className="mt-0.5 block text-xs text-zinc-500">{type}</span>
      </button>
    </div>
  );
}

export function MirrorHomeAdminEditor({
  catalog,
  initialConfig,
}: {
  catalog: MirrorHomeSection[];
  initialConfig: MirrorHomeConfig;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<MirrorHomeConfig>(() => ({
    ...initialConfig,
    elements: initialConfig.elements ?? {},
  }));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [picked, setPicked] = useState<MirrorElementPick | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const catalogMap = useMemo(() => new Map(catalog.map((s) => [s.key, s])), [catalog]);

  const ordered = useMemo(
    () =>
      config.order
        .map((key) => catalogMap.get(key))
        .filter((s): s is MirrorHomeSection => Boolean(s)),
    [config.order, catalogMap],
  );

  const sortableIds = useMemo(() => ordered.map((s) => s.key), [ordered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedMeta = selectedKey ? catalogMap.get(selectedKey) : null;
  const selectedEdit: MirrorHomeSectionEdit = selectedKey
    ? (config.sections[selectedKey] ?? {})
    : {};

  const onPick = useCallback((event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.type !== "kn-element-pick") return;
    setPicked({
      id: String(data.id),
      kind: data.kind,
      value: String(data.value ?? ""),
      label: String(data.label ?? ""),
    });
  }, []);

  useEffect(() => {
    window.addEventListener("message", onPick);
    return () => window.removeEventListener("message", onPick);
  }, [onPick]);

  function patchElement(edit: MirrorElementEdit) {
    setConfig((prev) => ({
      ...prev,
      elements: { ...prev.elements, [edit.id]: edit },
    }));
  }

  function clearPick() {
    setPicked(null);
  }

  function patchSection(key: string, patch: Partial<MirrorHomeSectionEdit>) {
    setConfig((prev) => {
      const next = { ...prev.sections[key], ...patch };
      const sections = { ...prev.sections };
      const empty = !next.hidden && !next.headingHtml && !next.mediaGridItems?.length;
      if (empty) delete sections[key];
      else sections[key] = next;
      return { ...prev, sections };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setConfig((prev) => {
      const oldIndex = prev.order.indexOf(String(active.id));
      const newIndex = prev.order.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, order: arrayMove(prev.order, oldIndex, newIndex) };
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/theme/mirror-home", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Kaydedilemedi");
        return;
      }
      setMessage("Kaydedildi — vitrin güncellendi.");
      router.refresh();
    } catch {
      setMessage("Ağ hatası");
    } finally {
      setSaving(false);
    }
  }

  const elementCount = Object.keys(config.elements ?? {}).length;

  return (
    <div className="shop-page-editor flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="ed-toolbar mx-4 mt-2 flex flex-wrap items-center justify-between gap-3 md:mx-6">
        <div>
          <Link href="/admin/pages">← Sayfalar</Link>
          <h1>Ana Sayfa — Görsel düzenleyici</h1>
          <p className="ed-meta">
            Ortadaki önizlemede <strong>her metne, her görsele, her butona</strong> tıklayın → sağda
            düzenleyin → <strong>Kaydet</strong>. Bölüm sırası için soldaki liste.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/" target="_blank" rel="noreferrer" className={btnSecondary}>
            Vitrini aç ↗
          </a>
          <button type="button" className={btnPrimary} disabled={saving} onClick={() => void save()}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {message ? (
        <p className="ed-status ed-status--ok mx-4 mt-3 md:mx-6">{message}</p>
      ) : null}

      <div className="ed-vitrin-workspace mx-4 mb-4 mt-3 md:mx-6">
        <aside className="ed-vitrin-sections">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Bölüm sırası</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              {ordered.map((s) => (
                <SortableSectionRow
                  key={s.key}
                  id={s.key}
                  label={s.label}
                  type={s.type}
                  hidden={config.sections[s.key]?.hidden}
                  selected={selectedKey === s.key}
                  onSelect={() => {
                    setSelectedKey(s.key);
                    setPicked(null);
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </aside>

        <div className="ed-vitrin-preview">
          <MirrorHomeFrameClient
            src={MIRROR_SRC}
            title="Ana sayfa önizleme"
            homeConfig={config}
            visualEditMode
          />
        </div>

        <aside className="ed-vitrin-props">
          {picked ? (
            <MirrorElementEditPanel
              pick={picked}
              edit={config.elements?.[picked.id]}
              onChange={patchElement}
              onClear={clearPick}
            />
          ) : (
            <p className="text-sm text-amber-200/90">
              Önizlemede düzenlemek istediğiniz alana tıklayın (turuncu çerçeve).
            </p>
          )}

          {selectedMeta && selectedKey ? (
            <details className="mt-4 border-t border-zinc-700 pt-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-300">
                Bölüm: {selectedMeta.label}
              </summary>
              <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={Boolean(selectedEdit.hidden)}
                  onChange={(e) => patchSection(selectedKey, { hidden: e.target.checked || undefined })}
                />
                Bölümü gizle
              </label>
            </details>
          ) : null}

          <p className="mt-6 text-xs text-zinc-500">
            Kayıtlı özel alan: {elementCount}. Ürünler → Admin → Ürünler. Koleksiyonlar → Admin →
            Koleksiyonlar.
          </p>
        </aside>
      </div>
    </div>
  );
}
