"use client";

import { nanoid } from "nanoid";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { CollectionSlugSelect } from "@/components/editor/CollectionSlugSelect";
import type { EditorShopBlock } from "@/lib/blocks/editor-ids";
import { SHOP_BLOCK_LABELS, type ShopBlock } from "@/lib/blocks/schema";

const inp = "ed-input";
const lbl = "grid gap-1.5";

function EnField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className={lbl}>
      <span className="text-xs font-medium text-sky-300/90">{label}</span>
      {multiline ? (
        <textarea
          className={inp}
          rows={multiline === true ? 3 : 2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="English"
        />
      ) : (
        <input className={inp} value={value} onChange={(e) => onChange(e.target.value)} placeholder="English" />
      )}
    </label>
  );
}

export function ShopBlockFields({
  block,
  onChange,
}: {
  block: EditorShopBlock;
  onChange: (b: EditorShopBlock) => void;
}) {
  const set = (next: ShopBlock) => onChange({ ...next, id: block.id } as EditorShopBlock);

  switch (block.type) {
    case "announcementBar":
      return (
        <div className="space-y-4 text-sm">
          <label className={lbl}>
            Metin
            <input className={inp} value={block.props.text} onChange={(e) => set({ ...block, props: { ...block.props, text: e.target.value } })} />
          </label>
          <EnField
            label="Metin (English)"
            value={block.props.textEn ?? ""}
            onChange={(textEn) => set({ ...block, props: { ...block.props, textEn: textEn || undefined } })}
          />
          <label className={lbl}>
            Link metni
            <input className={inp} value={block.props.linkLabel ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, linkLabel: e.target.value } })} />
          </label>
          <EnField
            label="Link metni (English)"
            value={block.props.linkLabelEn ?? ""}
            onChange={(linkLabelEn) => set({ ...block, props: { ...block.props, linkLabelEn: linkLabelEn || undefined } })}
          />
          <label className={lbl}>
            Link URL
            <input className={inp} value={block.props.linkHref ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, linkHref: e.target.value } })} />
          </label>
        </div>
      );
    case "heroSlider": {
      const slides = block.props.slides;
      const patchSlides = (next: typeof slides) => set({ ...block, props: { ...block.props, slides: next } });
      return (
        <div className="space-y-4 text-sm">
          <label className={lbl}>
            Otomatik geçiş (ms, 0=kapalı)
            <input
              type="number"
              className={inp}
              value={block.props.autoplayMs ?? 6000}
              onChange={(e) => set({ ...block, props: { ...block.props, autoplayMs: Number(e.target.value) } })}
            />
          </label>
          {slides.map((s, idx) => (
            <div
              key={s.id}
              className="space-y-3 rounded-lg border p-3"
              style={{ borderColor: "var(--ed-border, #3f3f46)", background: "#27272a" }}
            >
              <div className="flex justify-between text-xs font-medium" style={{ color: "var(--ed-muted, #a1a1aa)" }}>
                Slayt {idx + 1}
                <button
                  type="button"
                  className="text-red-600"
                  disabled={slides.length <= 1}
                  onClick={() => patchSlides(slides.filter((x) => x.id !== s.id))}
                >
                  Sil
                </button>
              </div>
              <ImageUploadField
                label="Görsel"
                value={s.imageUrl ?? ""}
                onChange={(url) => patchSlides(slides.map((x) => (x.id === s.id ? { ...x, imageUrl: url } : x)))}
                editorChrome
              />
              <label className={lbl}>
                Başlık
                <input className={inp} value={s.headline} onChange={(e) => patchSlides(slides.map((x) => (x.id === s.id ? { ...x, headline: e.target.value } : x)))} />
              </label>
              <EnField
                label="Başlık (English)"
                value={s.headlineEn ?? ""}
                onChange={(headlineEn) => patchSlides(slides.map((x) => (x.id === s.id ? { ...x, headlineEn: headlineEn || undefined } : x)))}
              />
              <label className={lbl}>
                Alt metin
                <input className={inp} value={s.subline ?? ""} onChange={(e) => patchSlides(slides.map((x) => (x.id === s.id ? { ...x, subline: e.target.value } : x)))} />
              </label>
              <EnField
                label="Alt metin (English)"
                value={s.sublineEn ?? ""}
                onChange={(sublineEn) => patchSlides(slides.map((x) => (x.id === s.id ? { ...x, sublineEn: sublineEn || undefined } : x)))}
              />
              <label className={lbl}>
                Buton metni
                <input className={inp} value={s.ctaLabel ?? ""} onChange={(e) => patchSlides(slides.map((x) => (x.id === s.id ? { ...x, ctaLabel: e.target.value } : x)))} />
              </label>
              <EnField
                label="Buton metni (English)"
                value={s.ctaLabelEn ?? ""}
                onChange={(ctaLabelEn) => patchSlides(slides.map((x) => (x.id === s.id ? { ...x, ctaLabelEn: ctaLabelEn || undefined } : x)))}
              />
              <label className={lbl}>
                Buton linki
                <input className={inp} value={s.ctaHref ?? ""} onChange={(e) => patchSlides(slides.map((x) => (x.id === s.id ? { ...x, ctaHref: e.target.value } : x)))} />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-medium"
            style={{ color: "#fda4af" }}
            disabled={slides.length >= 8}
            onClick={() =>
              patchSlides([
                ...slides,
                { id: nanoid(8), headline: "Yeni slayt", subline: "", ctaLabel: "Keşfet", ctaHref: "/" },
              ])
            }
          >
            + Slayt ekle
          </button>
        </div>
      );
    }
    case "button":
      return (
        <div className="space-y-3 text-sm">
          <label className={lbl}>
            Buton yazısı
            <input className={inp} value={block.props.label} onChange={(e) => set({ ...block, props: { ...block.props, label: e.target.value } })} />
          </label>
          <EnField
            label="Buton yazısı (English)"
            value={block.props.labelEn ?? ""}
            onChange={(labelEn) => set({ ...block, props: { ...block.props, labelEn: labelEn || undefined } })}
          />
          <label className={lbl}>
            Link
            <input className={inp} value={block.props.href} onChange={(e) => set({ ...block, props: { ...block.props, href: e.target.value } })} placeholder="/collections/all" />
          </label>
          <label className={lbl}>
            Stil
            <select className={inp} value={block.props.variant ?? "primary"} onChange={(e) => set({ ...block, props: { ...block.props, variant: e.target.value as "primary" | "secondary" | "outline" } })}>
              <option value="primary">Dolu</option>
              <option value="outline">Çerçeveli</option>
              <option value="secondary">İkincil</option>
            </select>
          </label>
          <label className={lbl}>
            Hizalama
            <select className={inp} value={block.props.align ?? "center"} onChange={(e) => set({ ...block, props: { ...block.props, align: e.target.value as "left" | "center" | "right" } })}>
              <option value="left">Sol</option>
              <option value="center">Orta</option>
              <option value="right">Sağ</option>
            </select>
          </label>
        </div>
      );
    case "image":
      return (
        <div className="space-y-3 text-sm">
          <ImageUploadField
            label="Görsel"
            value={block.props.src}
            onChange={(url) => set({ ...block, props: { ...block.props, src: url } })}
            editorChrome
          />
          <label className={lbl}>
            Alt metin
            <input className={inp} value={block.props.alt ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, alt: e.target.value } })} />
          </label>
          <label className={lbl}>
            Tıklanınca link (isteğe bağlı)
            <input className={inp} value={block.props.href ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, href: e.target.value || undefined } })} />
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={block.props.rounded !== false} onChange={(e) => set({ ...block, props: { ...block.props, rounded: e.target.checked } })} />
            Yuvarlatılmış köşe
          </label>
        </div>
      );
    case "text":
      return (
        <div className="space-y-3 text-sm">
          <label className={lbl}>
            İçerik
            <textarea className={inp} rows={4} value={block.props.content} onChange={(e) => set({ ...block, props: { ...block.props, content: e.target.value } })} />
          </label>
          <EnField
            label="İçerik (English)"
            value={block.props.contentEn ?? ""}
            onChange={(contentEn) => set({ ...block, props: { ...block.props, contentEn: contentEn || undefined } })}
            multiline
          />
          <label className={lbl}>
            Etiket
            <select className={inp} value={block.props.as ?? "p"} onChange={(e) => set({ ...block, props: { ...block.props, as: e.target.value as "p" | "h1" | "h2" | "h3" } })}>
              <option value="p">Paragraf</option>
              <option value="h1">Başlık 1</option>
              <option value="h2">Başlık 2</option>
              <option value="h3">Başlık 3</option>
            </select>
          </label>
          <label className={lbl}>
            Hizalama
            <select className={inp} value={block.props.align ?? "left"} onChange={(e) => set({ ...block, props: { ...block.props, align: e.target.value as "left" | "center" | "right" } })}>
              <option value="left">Sol</option>
              <option value="center">Orta</option>
              <option value="right">Sağ</option>
            </select>
          </label>
        </div>
      );
    case "imageTextSplit":
      return (
        <div className="space-y-3 text-sm">
          <ImageUploadField
            label="Görsel"
            value={block.props.imageUrl}
            onChange={(url) => set({ ...block, props: { ...block.props, imageUrl: url } })}
            editorChrome
          />
          <label className={lbl}>
            Başlık
            <input className={inp} value={block.props.title} onChange={(e) => set({ ...block, props: { ...block.props, title: e.target.value } })} />
          </label>
          <label className={lbl}>
            Metin
            <textarea className={inp} rows={3} value={block.props.body} onChange={(e) => set({ ...block, props: { ...block.props, body: e.target.value } })} />
          </label>
          <label className={lbl}>
            Görsel konumu
            <select className={inp} value={block.props.imagePosition ?? "left"} onChange={(e) => set({ ...block, props: { ...block.props, imagePosition: e.target.value as "left" | "right" } })}>
              <option value="left">Sol</option>
              <option value="right">Sağ</option>
            </select>
          </label>
          <label className={lbl}>
            Buton / link
            <input className={inp} value={block.props.ctaLabel ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, ctaLabel: e.target.value } })} />
            <input className={inp} value={block.props.ctaHref ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, ctaHref: e.target.value } })} placeholder="URL" />
          </label>
        </div>
      );
    case "collectionGrid": {
      const items = block.props.items;
      const patchItems = (next: typeof items) => set({ ...block, props: { ...block.props, items: next } });
      return (
        <div className="space-y-3 text-sm">
          <label className={lbl}>
            Bölüm başlığı
            <input className={inp} value={block.props.title ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, title: e.target.value } })} />
          </label>
          {items.map((it, idx) => (
            <div key={it.id} className="space-y-2 rounded border p-2">
              <div className="flex justify-between text-xs" style={{ color: "var(--ed-muted, #a1a1aa)" }}>
                Kart {idx + 1}
                <button type="button" className="text-red-600" disabled={items.length <= 1} onClick={() => patchItems(items.filter((x) => x.id !== it.id))}>
                  Sil
                </button>
              </div>
              <label className={lbl}>
                Başlık
                <input className={inp} value={it.title} onChange={(e) => patchItems(items.map((x) => (x.id === it.id ? { ...x, title: e.target.value } : x)))} />
              </label>
              <label className={lbl}>
                Link
                <input className={inp} value={it.href} onChange={(e) => patchItems(items.map((x) => (x.id === it.id ? { ...x, href: e.target.value } : x)))} />
              </label>
              <ImageUploadField
                label="Görsel"
                value={it.imageUrl ?? ""}
                onChange={(url) => patchItems(items.map((x) => (x.id === it.id ? { ...x, imageUrl: url } : x)))}
                editorChrome
              />
            </div>
          ))}
          <button type="button" className="text-xs text-[var(--kn-brand)]" onClick={() => patchItems([...items, { id: nanoid(8), title: "Yeni", href: "/" }])}>
            + Kart ekle
          </button>
        </div>
      );
    }
    case "productGrid":
      return (
        <div className="space-y-3 text-sm">
          <label className={lbl}>
            Bölüm başlığı (ör. Skincare Collection)
            <input className={inp} value={block.props.title ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, title: e.target.value } })} />
          </label>
          <label className={lbl}>
            Hangi koleksiyonun ürünleri?
            <CollectionSlugSelect
              value={block.props.collectionSlug}
              onChange={(collectionSlug) => set({ ...block, props: { ...block.props, collectionSlug } })}
            />
          </label>
          <p className="text-xs text-zinc-400">
            Ürün kartları{" "}
            <a href="/admin/products" className="underline" target="_blank" rel="noreferrer">
              Admin → Ürünler
            </a>
            ; koleksiyon ataması ürün düzenleme veya{" "}
            <a href="/admin/collections" className="underline" target="_blank" rel="noreferrer">
              Koleksiyonlar
            </a>
            .
          </p>
          <label className={lbl}>
            Gösterilecek ürün sayısı
            <input type="number" min={1} max={24} className={inp} value={block.props.limit ?? 8} onChange={(e) => set({ ...block, props: { ...block.props, limit: Number(e.target.value) } })} />
          </label>
        </div>
      );
    case "testimonials": {
      const items = block.props.items;
      const patchItems = (next: typeof items) => set({ ...block, props: { ...block.props, items: next } });
      return (
        <div className="space-y-3 text-sm">
          <label className={lbl}>
            Başlık
            <input className={inp} value={block.props.title ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, title: e.target.value } })} />
          </label>
          {items.map((it) => (
            <div key={it.id} className="space-y-2 rounded border p-2">
              <label className={lbl}>
                İsim
                <input className={inp} value={it.name} onChange={(e) => patchItems(items.map((x) => (x.id === it.id ? { ...x, name: e.target.value } : x)))} />
              </label>
              <label className={lbl}>
                Yorum
                <textarea className={inp} rows={2} value={it.quote} onChange={(e) => patchItems(items.map((x) => (x.id === it.id ? { ...x, quote: e.target.value } : x)))} />
              </label>
              <button type="button" className="text-xs text-red-600" disabled={items.length <= 1} onClick={() => patchItems(items.filter((x) => x.id !== it.id))}>
                Sil
              </button>
            </div>
          ))}
          <button type="button" className="text-xs text-[var(--kn-brand)]" onClick={() => patchItems([...items, { id: nanoid(8), name: "Müşteri", quote: "Yorum" }])}>
            + Yorum ekle
          </button>
        </div>
      );
    }
    case "promoMarquee":
      return (
        <label className={`${lbl} text-sm`}>
          Kayan metin
          <input className={inp} value={block.props.text} onChange={(e) => set({ ...block, props: { ...block.props, text: e.target.value } })} />
        </label>
      );
    case "newsletter":
      return (
        <div className="space-y-3 text-sm">
          <label className={lbl}>
            Başlık
            <input className={inp} value={block.props.title} onChange={(e) => set({ ...block, props: { ...block.props, title: e.target.value } })} />
          </label>
          <label className={lbl}>
            Alt metin
            <input className={inp} value={block.props.subtitle ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, subtitle: e.target.value } })} />
          </label>
          <label className={lbl}>
            Buton
            <input className={inp} value={block.props.buttonLabel ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, buttonLabel: e.target.value } })} />
          </label>
        </div>
      );
    case "map":
      return (
        <div className="space-y-4 text-sm">
          <p className="text-xs leading-relaxed" style={{ color: "var(--ed-muted, #a1a1aa)" }}>
            Google Maps &rarr; Paylaş &rarr; Haritayı göm &rarr; iframe kodunu veya sadece src URL&apos;sini yapıştırın.
            Adres girerseniz URL otomatik oluşturulur.
          </p>
          <label className={lbl}>
            Embed URL <span style={{ color: "var(--ed-muted, #a1a1aa)" }}>(öncelikli)</span>
            <textarea
              className={inp}
              rows={3}
              value={block.props.embedUrl ?? ""}
              placeholder="https://www.google.com/maps/embed?pb=... veya tam <iframe> kodunu yapıştırın"
              onChange={(e) => {
                const raw = e.target.value;
                const match = raw.match(/\bsrc=["']([^"']+)["']/);
                const url = match ? match[1] : raw;
                set({ ...block, props: { ...block.props, embedUrl: url || undefined } });
              }}
            />
          </label>
          <label className={lbl}>
            Adres <span style={{ color: "var(--ed-muted, #a1a1aa)" }}>(Embed URL yoksa kullanılır)</span>
            <input
              className={inp}
              value={block.props.address ?? ""}
              placeholder="Bakırköy, İstanbul"
              onChange={(e) => set({ ...block, props: { ...block.props, address: e.target.value || undefined } })}
            />
          </label>
          <label className={lbl}>
            Yükseklik (px)
            <input
              type="number"
              min={200}
              max={800}
              className={inp}
              value={block.props.height ?? 400}
              onChange={(e) => set({ ...block, props: { ...block.props, height: Number(e.target.value) } })}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={block.props.fullWidth === true}
              onChange={(e) => set({ ...block, props: { ...block.props, fullWidth: e.target.checked || undefined } })}
            />
            Tam genişlik (sayfa genişliği kadar)
          </label>
        </div>
      );
    case "featureCards": {
      const items = block.props.items;
      const patchItems = (next: typeof items) => set({ ...block, props: { ...block.props, items: next } });
      return (
        <div className="space-y-4 text-sm">
          <label className={lbl}>
            Bölüm başlığı
            <input className={inp} value={block.props.title} onChange={(e) => set({ ...block, props: { ...block.props, title: e.target.value } })} />
          </label>
          <EnField
            label="Bölüm başlığı (English)"
            value={block.props.titleEn ?? ""}
            onChange={(titleEn) => set({ ...block, props: { ...block.props, titleEn: titleEn || undefined } })}
          />
          <label className={lbl}>
            Alt başlık / açıklama
            <textarea className={inp} rows={3} value={block.props.subtitle ?? ""} onChange={(e) => set({ ...block, props: { ...block.props, subtitle: e.target.value } })} />
          </label>
          <EnField
            label="Alt başlık (English)"
            value={block.props.subtitleEn ?? ""}
            onChange={(subtitleEn) => set({ ...block, props: { ...block.props, subtitleEn: subtitleEn || undefined } })}
            multiline
          />
          <label className={lbl}>
            Arka plan rengi
            <input className={inp} type="color" value={block.props.backgroundColor ?? "#faf7f2"} onChange={(e) => set({ ...block, props: { ...block.props, backgroundColor: e.target.value } })} />
          </label>
          {items.map((it, idx) => (
            <div key={it.id} className="space-y-3 rounded-lg border p-3" style={{ borderColor: "var(--ed-border, #3f3f46)", background: "#27272a" }}>
              <div className="flex justify-between text-xs font-medium" style={{ color: "var(--ed-muted, #a1a1aa)" }}>
                Kart {idx + 1}
                <button type="button" className="text-red-600" disabled={items.length <= 1} onClick={() => patchItems(items.filter((x) => x.id !== it.id))}>
                  Sil
                </button>
              </div>
              <ImageUploadField
                label="İkon görseli (isteğe bağlı — yüklerseniz hazır ikon yerine geçer)"
                value={it.iconUrl ?? ""}
                onChange={(url) => patchItems(items.map((x) => (x.id === it.id ? { ...x, iconUrl: url || undefined } : x)))}
                editorChrome
              />
              <label className={lbl}>
                Hazır ikon
                <select
                  className={inp}
                  value={it.iconKey ?? ""}
                  onChange={(e) =>
                    patchItems(
                      items.map((x) =>
                        x.id === it.id
                          ? {
                              ...x,
                              iconKey: (e.target.value || undefined) as
                                | "tr"
                                | "globe"
                                | "leaf"
                                | "trophy"
                                | undefined,
                            }
                          : x,
                      ),
                    )
                  }
                >
                  <option value="">— Özel / metin —</option>
                  <option value="tr">TR (Türkiye)</option>
                  <option value="globe">Dünya</option>
                  <option value="leaf">Yaprak (doğal)</option>
                  <option value="trophy">Kupa (kalite)</option>
                </select>
              </label>
              <label className={lbl}>
                İkon metni (hazır ikon yoksa)
                <input className={inp} value={it.iconText ?? ""} onChange={(e) => patchItems(items.map((x) => (x.id === it.id ? { ...x, iconText: e.target.value || undefined } : x)))} placeholder="TR" />
              </label>
              <label className={lbl}>
                Kart başlığı
                <input className={inp} value={it.heading} onChange={(e) => patchItems(items.map((x) => (x.id === it.id ? { ...x, heading: e.target.value } : x)))} />
              </label>
              <EnField
                label="Kart başlığı (English)"
                value={it.headingEn ?? ""}
                onChange={(headingEn) => patchItems(items.map((x) => (x.id === it.id ? { ...x, headingEn: headingEn || undefined } : x)))}
              />
              <label className={lbl}>
                Açıklama
                <textarea className={inp} rows={3} value={it.description} onChange={(e) => patchItems(items.map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x)))} />
              </label>
              <EnField
                label="Açıklama (English)"
                value={it.descriptionEn ?? ""}
                onChange={(descriptionEn) => patchItems(items.map((x) => (x.id === it.id ? { ...x, descriptionEn: descriptionEn || undefined } : x)))}
                multiline
              />
              <label className={lbl}>
                Link (isteğe bağlı)
                <input className={inp} value={it.linkHref ?? ""} onChange={(e) => patchItems(items.map((x) => (x.id === it.id ? { ...x, linkHref: e.target.value || undefined } : x)))} placeholder="/collections/all" />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-medium"
            style={{ color: "#fda4af" }}
            disabled={items.length >= 6}
            onClick={() =>
              patchItems([
                ...items,
                { id: nanoid(8), iconKey: "trophy", heading: "Yeni kart", description: "Açıklama metni" },
              ])
            }
          >
            + Kart ekle
          </button>
        </div>
      );
    }
    default:
      return <p className="text-sm" style={{ color: "var(--ed-muted)" }}>Bu blok için alan yok.</p>;
  }
}

export function blockSummary(block: EditorShopBlock): string {
  if (block.type === "featureCards") {
    return `${SHOP_BLOCK_LABELS.featureCards}: ${block.props.title}`;
  }
  return SHOP_BLOCK_LABELS[block.type];
}
