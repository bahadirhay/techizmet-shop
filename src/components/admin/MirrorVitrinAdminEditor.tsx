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
import { MirrorCollectionsSortPanel } from "@/components/admin/MirrorCollectionsSortPanel";
import { MirrorSectionFieldsPanel } from "@/components/admin/MirrorSectionFieldsPanel";
import type { EditableFieldDef } from "@/lib/mirror-editable-catalog";
import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import type { VitrinCollectionCard } from "@/lib/mirror-collections-sync";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import type { MirrorElementEdit, MirrorElementPick } from "@/lib/mirror-element-edits";
import type { MirrorPageConfig, MirrorPageSection, MirrorPageSectionEdit } from "@/lib/mirror-home-overlay";
import { getVitrinPage, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { CustomBlocksEditor, toEditorCustomBlocks } from "@/components/editor/CustomBlocksEditor";
import { stripMirrorCustomBlocks, type EditorMirrorCustomBlock } from "@/lib/mirror-custom-block-types";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import { useClientMounted } from "@/hooks/use-client-mounted";
import type { AdminProductOption } from "@/lib/admin-product-options";
import type { BlogPostAdminEditorRow } from "@/lib/blog/blog-posts-server";

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
        className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-sm leading-snug"
        title={type}
        onClick={onSelect}
      >
        <span className={hidden ? "text-zinc-500 line-through" : "text-zinc-100"}>{label}</span>
      </button>
    </div>
  );
}

export function MirrorVitrinAdminEditor({
  pageKey,
  catalog,
  initialConfig,
  branding,
  nav,
  footer,
  locale,
  collectionsFromAdmin,
  productOptions = [],
  editableCatalog = {},
  sectionSwiperMs = {},
  blogPosts,
  initialEditorMode,
}: {
  pageKey: VitrinPageKey;
  catalog: MirrorPageSection[];
  initialConfig: MirrorPageConfig;
  branding: MirrorBranding;
  nav: MirrorNavItem[];
  footer: MirrorFooterData;
  locale: ShopLocale;
  collectionsFromAdmin?: VitrinCollectionCard[];
  productOptions?: AdminProductOption[];
  /** HTML’den çıkarılan tüm metin/görsel alanları */
  editableCatalog?: Record<string, EditableFieldDef[]>;
  sectionSwiperMs?: Record<string, number | null>;
  blogPosts?: BlogPostAdminEditorRow[];
  initialEditorMode?: "sections" | "blocks";
}) {
  const def = getVitrinPage(pageKey)!;
  const router = useRouter();
  const [config, setConfig] = useState<MirrorPageConfig>(() => ({
    ...initialConfig,
    elements: initialConfig.elements ?? {},
    customBlocks: initialConfig.customBlocks,
  }));
  const [editorMode, setEditorMode] = useState<"sections" | "blocks">(
    initialEditorMode === "blocks" ? "blocks" : "sections",
  );
  const [customBlocks, setCustomBlocks] = useState<EditorMirrorCustomBlock[]>(() =>
    toEditorCustomBlocks(initialConfig.customBlocks),
  );
  const widgetSectionOptions = useMemo(
    () => catalog.map((s) => ({ key: s.key, label: s.label })),
    [catalog],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    if (pageKey === "collections") {
      const main = catalog.find((s) => s.type === "main-collection-list");
      return main?.key ?? catalog[0]?.key ?? null;
    }
    if (pageKey === "collections-all") {
      const main = catalog.find((s) => s.type === "main-collection");
      return main?.key ?? catalog[0]?.key ?? null;
    }
    if (pageKey === "home") {
      const tabs = catalog.find((s) => s.type === "collections-tab");
      return tabs?.key ?? catalog[0]?.key ?? null;
    }
    if (pageKey === "blog-news") {
      const blog = catalog.find((s) => s.type === "main-blog");
      return blog?.key ?? catalog[0]?.key ?? null;
    }
    return catalog[0]?.key ?? null;
  });
  const [picked, setPicked] = useState<MirrorElementPick | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const dndReady = useClientMounted();

  const catalogMap = useMemo(() => new Map(catalog.map((s) => [s.key, s])), [catalog]);

  const previewConfig = useMemo(() => {
    const sections = { ...config.sections };
    for (const s of catalog) {
      if (s.type === "main-collection-list" && s.collectionGridDefaults) {
        const cur = sections[s.key];
        if (!cur?.collectionGridColumns) {
          sections[s.key] = { ...cur, collectionGridColumns: s.collectionGridDefaults };
        }
      }
      if (s.type === "main-collection" && s.productGridDefaults) {
        const cur = sections[s.key];
        if (!cur?.productGridColumns) {
          sections[s.key] = { ...cur, productGridColumns: s.productGridDefaults };
        }
      }
    }
    return {
      ...config,
      sections,
      customBlocks: customBlocks.length ? stripMirrorCustomBlocks(customBlocks) : undefined,
    };
  }, [config, catalog, customBlocks]);
  const ordered = useMemo(
    () =>
      config.order
        .map((key) => catalogMap.get(key))
        .filter((s): s is MirrorPageSection => Boolean(s)),
    [config.order, catalogMap],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onMessage = useCallback((event: MessageEvent) => {
    const data = event.data;
    if (!data) return;
    if (data.type === "kn-element-pick") {
      const id = String(data.id);
      setPicked({
        id,
        kind: data.kind,
        value: String(data.value ?? ""),
        label: String(data.label ?? ""),
      });
      const bannerKey = id.match(/^(.+)--banner-(?:title|desc|image)$/)?.[1];
      if (bannerKey) setSelectedKey(bannerKey);
      setMessage(null);
      return;
    }
    if (data.type === "kn-nav-blocked") {
      const reason = String(data.reason ?? "");
      if (reason === "collection-card") {
        setMessage(
          "Koleksiyon kartı linki kapalı. Başlık/görsel için Admin → Koleksiyonlar. Banner metni için kartın üstündeki sayfa başlığı alanına tıklayın.",
        );
      } else {
        setMessage(
          "Linkler düzenleme modunda kapalı. Menü: Ayarlar → Menü & Kategoriler. Footer: Footer & Çerez. Metin alanlarına doğrudan tıklayın.",
        );
      }
    }
  }, [setPicked, setSelectedKey]);

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  function patchElement(edit: MirrorElementEdit) {
    setConfig((prev) => ({
      ...prev,
      elements: { ...prev.elements, [edit.id]: edit },
    }));
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
      const res = await fetch(`/api/admin/theme/mirror-pages/${pageKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          customBlocks: customBlocks.length ? stripMirrorCustomBlocks(customBlocks) : undefined,
        }),
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

  const mirrorSrc = def.mirrorPath("tr");
  const elementCount = Object.keys(config.elements ?? {}).length;
  const selectedSection = selectedKey ? catalogMap.get(selectedKey) : undefined;
  const isCollectionListSection = selectedSection?.type === "main-collection-list";
  const sectionFields = selectedKey ? editableCatalog[selectedKey] ?? [] : [];

  function patchSection(key: string, patch: MirrorPageSectionEdit) {
    setConfig((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: { ...prev.sections[key], ...patch } },
    }));
  }

  return (
    <div className="shop-page-editor flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="ed-toolbar mx-4 mt-2 flex flex-wrap items-center justify-between gap-3 md:mx-6">
        <div>
          <Link href="/admin/pages">← Sayfalar</Link>
          <h1>{def.label}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-zinc-600 p-0.5">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${editorMode === "sections" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
              onClick={() => setEditorMode("sections")}
            >
              Tema bölümleri
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${editorMode === "blocks" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
              onClick={() => setEditorMode("blocks")}
            >
              Widget&apos;lar ({customBlocks.length})
            </button>
          </div>
          <a href={def.route} target="_blank" rel="noreferrer" className={btnSecondary}>
            Vitrini aç ↗
          </a>
          {pageKey === "collections" ? (
            <Link href="/admin/collections" className={btnSecondary}>
              Koleksiyon kartları
            </Link>
          ) : null}
          <button type="button" className={btnPrimary} disabled={saving} onClick={() => void save()}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {message ? (
        <p
          className={`mx-4 mt-3 rounded-lg px-4 py-2 text-sm md:mx-6 ${
            message.includes("Kapalı") || message.includes("kapalı")
              ? "border border-amber-500/40 bg-amber-950/80 text-amber-100"
              : "ed-status ed-status--ok"
          }`}
        >
          {message}
        </p>
      ) : null}

      {pageKey === "collections" ? (
        <p className="mx-4 mb-2 rounded-lg border border-sky-500/30 bg-sky-950/50 px-4 py-2 text-sm text-sky-100 md:mx-6">
          Soldan <strong>Koleksiyon kartları</strong> bölümünü seçin → sağda <strong>3 / 4 / 5 sütun</strong> ve kart
          sırası. Başlık/görsel: <Link href="/admin/collections" className="underline">Admin → Koleksiyonlar</Link>.
          Banner: <strong>Sayfa başlığı</strong> bölümü.
        </p>
      ) : null}

      {editorMode === "blocks" ? (
        <div className="ed-vitrin-workspace mx-4 mb-4 mt-3 md:mx-6">
          <div className="flex min-h-[520px] min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 lg:flex-row">
            <div className="min-h-[320px] min-w-0 flex-1 overflow-hidden">
              <CustomBlocksEditor
                blocks={customBlocks}
                onChange={setCustomBlocks}
                sectionOptions={widgetSectionOptions}
                compact
                hint="Konum: sağ panel. Sıra: Sıra sekmesi. Gizle: sağ paneldeki kutu veya Gizle."
              />
            </div>
            <div className="ed-vitrin-preview min-h-[320px] min-w-0 flex-1 border-t border-zinc-700 lg:border-t-0 lg:border-l">
              <MirrorVitrinFrameClient
                key={`widgets-${previewReloadKey}-${customBlocks.map((b) => b.id).join(",")}`}
                src={mirrorSrc}
                title={`${def.label} widget önizleme`}
                pageConfig={previewConfig}
                sectionCatalog={catalog}
                branding={branding}
                nav={nav}
                footer={footer}
                locale={locale}
              />
            </div>
          </div>
        </div>
      ) : (
      <div className="ed-vitrin-workspace mx-4 mb-4 mt-3 md:mx-6">
        <aside className="ed-vitrin-sections">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Bölümler</p>
          {dndReady ? (
            <DndContext
              id="kn-vitrin-sections"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={config.order} strategy={verticalListSortingStrategy}>
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
          ) : (
            <div className="space-y-1">
              {ordered.map((s) => (
                <div
                  key={s.key}
                  className={`ed-block-row flex items-stretch gap-2 ${selectedKey === s.key ? "ed-block-row--selected" : ""}`}
                >
                  <span className="ed-drag-handle opacity-40" aria-hidden>
                    ⋮⋮
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm"
                    onClick={() => {
                      setSelectedKey(s.key);
                      setPicked(null);
                    }}
                  >
                    <span
                      className={
                        config.sections[s.key]?.hidden ? "text-zinc-500 line-through" : "text-zinc-100"
                      }
                    >
                      {s.label}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <div className="ed-vitrin-preview">
          <MirrorVitrinFrameClient
            key={previewReloadKey}
            src={mirrorSrc}
            title={`${def.label} önizleme`}
            pageConfig={previewConfig}
            sectionCatalog={catalog}
            focusSectionKey={selectedKey}
            branding={branding}
            nav={nav}
            footer={footer}
            locale={locale}
            visualEditMode
            collectionsFromAdmin={collectionsFromAdmin}
          />
        </div>

        <aside className="ed-vitrin-props">
          {selectedKey && selectedSection ? (
            <MirrorSectionFieldsPanel
              section={selectedSection}
              sectionEdit={config.sections[selectedKey]}
              fields={sectionFields}
              productOptions={productOptions}
              elements={config.elements}
              swiperAutoplayMs={sectionSwiperMs[selectedKey] ?? null}
              blogPosts={blogPosts}
              onBlogImageSaved={() => {
                setPreviewReloadKey((k) => k + 1);
                router.refresh();
              }}
              onPatchSection={(patch) => patchSection(selectedKey, patch)}
              onPatchElement={patchElement}
            />
          ) : (
            <p className="text-sm text-amber-200/90">
              Soldan bir bölüm seçin — ayarlar burada, önizleme ortada görünür.
            </p>
          )}
          {pageKey === "collections" && isCollectionListSection && collectionsFromAdmin?.length ? (
            <MirrorCollectionsSortPanel collections={collectionsFromAdmin} />
          ) : null}
          {picked ? (
            <div className="mt-4 border-t border-zinc-700 pt-4">
              <MirrorElementEditPanel
                pick={picked}
                edit={config.elements?.[picked.id]}
                onChange={patchElement}
                onClear={() => setPicked(null)}
              />
            </div>
          ) : null}
          <p className="mt-4 text-xs text-zinc-500">Kayıtlı alan: {elementCount}</p>
        </aside>
      </div>
      )}
    </div>
  );
}
