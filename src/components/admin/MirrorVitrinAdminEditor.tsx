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
import { canonicalElementEditId, resolveMirrorElementEdit } from "@/lib/mirror-element-edits";
import { isMirrorHeadingFieldId, isMirrorMarqueeFieldId } from "@/lib/mirror-element-typography";
import { marqueePlainToHtml } from "@/lib/html-plain-text";
import type { MirrorPageConfig, MirrorPageSection, MirrorPageSectionEdit } from "@/lib/mirror-home-overlay";
import { enrichCollectionsTabsFromProductOptions, mergeCollectionsTabEdits } from "@/lib/mirror-collections-tab";
import { mirrorVitrinApiSrc } from "@/lib/mirror-iframe-src";
import { getVitrinPage, vitrinMirrorFileRel, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";
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
  onToggleHidden,
}: {
  id: string;
  label: string;
  type: string;
  hidden?: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggleHidden: () => void;
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
      <button
        type="button"
        className={`shrink-0 rounded-lg px-2 py-1.5 text-xs ${
          hidden ? "text-zinc-500 hover:text-zinc-300" : "text-sky-300 hover:text-sky-200"
        }`}
        title={hidden ? "Bölümü vitrinde göster" : "Bölümü vitrinde gizle"}
        aria-label={hidden ? "Bölümü göster" : "Bölümü gizle"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleHidden();
        }}
      >
        {hidden ? "Göster" : "Gizle"}
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
      if (s.type === "collections-tab" && s.collectionsTabDefaults?.length) {
        const cur = sections[s.key];
        sections[s.key] = {
          ...cur,
          collectionsTabs: enrichCollectionsTabsFromProductOptions(
            mergeCollectionsTabEdits(s.collectionsTabDefaults, cur?.collectionsTabs),
            productOptions,
          ),
        };
      }
    }
    return {
      ...config,
      sections,
      customBlocks: customBlocks.length ? stripMirrorCustomBlocks(customBlocks) : undefined,
    };
  }, [config, catalog, customBlocks, productOptions]);
  const ordered = useMemo(
    () =>
      config.order
        .map((key) => catalogMap.get(key))
        .filter((s): s is MirrorPageSection => Boolean(s)),
    [config.order, catalogMap],
  );

  const sortableIds = useMemo(() => ordered.map((s) => s.key), [ordered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
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
      const sectionKey = id.split("--")[0];
      if (sectionKey && catalogMap.has(sectionKey)) setSelectedKey(sectionKey);
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
  }, [setPicked, setSelectedKey, catalogMap]);

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  function patchElement(edit: MirrorElementEdit) {
    setConfig((prev) => {
      const id = canonicalElementEditId(edit.id);
      const prevEdit = resolveMirrorElementEdit(id, prev.elements);
      const nextElements = { ...prev.elements };
      if (id !== edit.id) delete nextElements[edit.id];
      const next: MirrorPageConfig = {
        ...prev,
        elements: {
          ...nextElements,
          [id]: { ...prevEdit, ...edit, id },
        },
      };
      const sectionKey = id.split("--")[0] ?? "";
      if (sectionKey && catalogMap.has(sectionKey)) {
        if (edit.html?.trim() && isMirrorHeadingFieldId(id)) {
          next.sections = {
            ...prev.sections,
            [sectionKey]: { ...prev.sections[sectionKey], headingHtml: edit.html.trim() },
          };
        } else if (isMirrorMarqueeFieldId(id) && (edit.text?.trim() || edit.html?.trim())) {
          const html = edit.html?.trim() || marqueePlainToHtml(edit.text ?? "");
          next.sections = {
            ...prev.sections,
            [sectionKey]: { ...prev.sections[sectionKey], marqueeHtml: html || undefined },
          };
        }
      }
      return next;
    });
  }

  function toggleSectionHidden(sectionKey: string) {
    setConfig((prev) => {
      const wasHidden = Boolean(prev.sections[sectionKey]?.hidden);
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: { ...prev.sections[sectionKey], hidden: wasHidden ? undefined : true },
        },
      };
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

  /** Önizleme — layoutOrder ile anlık sıra sunucuda uygulanır (soldaki sürükleme) */
  const mirrorSrc = useMemo(
    () =>
      mirrorVitrinApiSrc(vitrinMirrorFileRel(pageKey, locale), pageKey, {
        layoutOrder: config.order.join(","),
      }),
    [pageKey, locale, config.order],
  );
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
            <div className="min-h-[320px] min-w-0 flex-1 overflow-hidden flex flex-col">
              <CustomBlocksEditor
                blocks={customBlocks}
                onChange={setCustomBlocks}
                sectionOptions={widgetSectionOptions}
                compact
                hint="Her vitrin sayfasına ayrı widget ekleyebilirsiniz. Ekle → Özellikler → Özellik kartları. Konum: sağ panel."
              />
              {pageKey === "contact" ? (
                <div className="border-t border-zinc-700 px-4 py-3 text-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Sayfa düzeni</p>
                  <label className="flex cursor-pointer items-center gap-2 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={Boolean(config.contactFormCentered)}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, contactFormCentered: e.target.checked || undefined }))
                      }
                    />
                    Formu ortala (harita kutusunu gizle, form tam genişlik)
                  </label>
                </div>
              ) : null}
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
          <p className="mb-2 text-[11px] leading-snug text-zinc-500">
            Sürükleyerek sıralayın. <strong className="text-zinc-400">Gizle / Göster</strong> ile bölümü vitrinde
            kapatıp açın; sağ paneldeki onay kutusu da aynı işi yapar.
          </p>
          {ordered.length === 0 ? (
            <p className="text-xs text-amber-200/90">
              Bölüm listesi yüklenemedi. Dev sunucuyu yeniden başlatın veya mirror HTML dosyasını kontrol edin.
            </p>
          ) : null}
          {dndReady ? (
            <DndContext
              id="kn-vitrin-sections"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
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
                    onToggleHidden={() => toggleSectionHidden(s.key)}
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
          {picked ? (
            <div className="mb-4 border-b border-zinc-700 pb-4">
              <MirrorElementEditPanel
                pick={picked}
                edit={resolveMirrorElementEdit(picked.id, config.elements)}
                onChange={patchElement}
                onClear={() => setPicked(null)}
              />
            </div>
          ) : null}
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
          <p className="mt-4 text-xs text-zinc-500">Kayıtlı alan: {elementCount}</p>
        </aside>
      </div>
      )}
    </div>
  );
}
