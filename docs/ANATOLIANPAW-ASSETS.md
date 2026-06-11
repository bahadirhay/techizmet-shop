# Anatolian Paw — görsel paketi

Tüm dosyalar: `public/brands/anatolianpaw/`

Ürün bilgileri [anatolianpaw.com](https://anatolianpaw.com) referans alınarak hazırlandı. Logolar sizin verdiğiniz orijinaller; diğerleri marka stiline uygun üretildi.

## Logo & kimlik

| Dosya | Boyut hedefi | Admin yolu | Kullanım |
|-------|--------------|------------|----------|
| `logo-header.png` | En fazla 360×96, oran korunur | **Ayarlar → Logo, favicon & SEO** → Site logosu (koyu) | Açık header; boş kenarlar yüklemede kırpılır |
| `logo-header-light.png` | En fazla 360×96, oran korunur | **Logo, favicon & SEO** → Logo (açık header) | Koyu/şeffaf header |
| `logo-icon-dark.png` | — | Yedek / sosyal | Sadece paw ikonu |
| `favicon.png` | 128×128 | **Logo, favicon & SEO** → Favicon | Tarayıcı sekmesi |

## Hero slider (Ana sayfa)

| Dosya | Boyut | Admin yolu | Önerilen metin |
|-------|-------|------------|----------------|
| `hero/hero-1-dog-treats.png` | 1920×1080 | **Vitrin sayfaları → Hero slider** | Türkiye'de Üretilen, Avrupa'da Sevilen Doğal Köpek Ödülleri |
| `hero/hero-2-flatlay.png` | 1920×1080 | Hero slider slayt 2 | %100 Doğal — katkısız kurutulmuş ödüller |
| `hero/hero-3-lifestyle.png` | 1920×1080 | Hero slider slayt 3 | Sevimli dostlarınız için güvenilir ödül |

## Sosyal & SEO

| Dosya | Boyut | Admin yolu |
|-------|-------|------------|
| `social/og-share.png` | 1200×630 | **Logo, favicon & SEO** → Paylaşım görseli (OG) |

**SEO önerisi (Ayarlar):**
- Site başlığı: `Anatolian Paw`
- Meta açıklama: `Türkiye'de üretilen, Avrupa'da sevilen %100 doğal kurutulmuş köpek ödül mamaları.`

## Kategori

| Dosya | Boyut | Admin yolu |
|-------|-------|------------|
| `category-banner.png` | 1600×600 | **Kategoriler** → banner (ör. "Doğal Köpek Ödülleri") |

## Ürün görselleri (1200×1200 kare)

Admin: **Ürünler → düzenle → Ürün görselleri** (ilk görsel = kapak)

| Dosya | Ürün adı (TR) | Önerilen slug | anatolianpaw.com |
|-------|---------------|---------------|------------------|
| `products/kurutulmus-deve-derisi.png` | Kurutulmuş Deve Derisi | `kurutulmus-deve-derisi` | Dried Camel Skin Chew |
| `products/kurutulmus-dana-girtlak.png` | Kurutulmuş Dana Gırtlak | `kurutulmus-dana-girtlak` | Dried Beef Trachea |
| `products/kurutulmus-kuzu-paca.png` | Kurutulmuş Kuzu Paça | `kurutulmus-kuzu-paca` | Dried Lamb Trotters |
| `products/kurutulmus-tavuk-ayagi.png` | Kurutulmuş Tavuk Ayağı | `kurutulmus-tavuk-ayagi` | Dried Chicken Feet |
| `products/kurutulmus-dana-akciger.png` | Kurutulmuş Dana Akciğer | `kurutulmus-dana-akciger` | Dried Beef Lung Cubes |

### Ürün kısa açıklamalar (panelden yapıştır)

1. **Deve derisi** — Uzun süre çiğneme keyfi; diş sağlığına katkılı. Yüksek protein, düşük yağ.
2. **Dana gırtlak** — Kıkırdak yapısıyla eklem sağlığını destekler; çıtır çıtır lezzet.
3. **Kuzu paça** — Kolajen deposu; tüy ve cilt sağlığı için ideal.
4. **Tavuk ayağı** — Glukozamin açısından zengin; eklem sağlığını destekler.
5. **Dana akciğer** — Hafif, çıtır; her yaş ve boy için eğitim ödülü.

## Otomatik yükleme (tek komut)

```powershell
cd C:\Users\BH\Desktop\techizmet-shop
npm run store:seed:anatolianpaw
```

Veya Paw env ile:

```powershell
npx tsx scripts/seed-anatolianpaw-assets.ts --env-file=.env.anatolianpaw
```

Script şunları yapar:
- Görselleri `public/uploads/shop/{siteId}/` altına kopyalar + `StoreMedia` kaydı
- Logo, favicon, OG → `settingsJson`
- Mirror hero grid (4 kart) → `theme.mirrorPages.home`
- Ana sayfa blokları → hero slider + ürün grid
- Kategori + 5 ürün (fiyat/stok 0 — panelden girin)

Tekrar çalıştırmak için: `--force` (mevcut ürün görsellerini günceller)

## Manuel yükleme sırası (alternatif)

1. Logo, favicon, OG → Ayarlar
2. Hero 3 slayt → Vitrin sayfaları / Ana sayfa
3. Kategori banner → Kategoriler
4. 5 ürün + görseller → Ürünler

## Not

- Ürün fotoğrafları AI üretimidir; canlıya almadan önce gerçek ürün fotoğraflarınızla değiştirmeniz önerilir.
- Logo dosyaları (`logo-header.png`, `logo-icon-dark.png`) sizin orijinal dosyalarınızdır.
