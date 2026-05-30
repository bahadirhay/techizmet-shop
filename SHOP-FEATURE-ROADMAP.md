# Techizmet Shop — Özellik yol haritası

Bu dosya, ShopPHP benzeri hedef liste ile mevcut durumu eşleştirir. Admin sol menü bu yapıya göre düzenlenmiştir.

## Durum göstergeleri

- **Var** — kullanılabilir
- **Kısmi** — temel akış var, geliştirilecek
- **Plan** — menüde işaretli / henüz yok

---

## 1. Front-end (müşteri yüzü)

| Modül | Durum | Not |
|-------|--------|-----|
| Responsive tema | Kısmi | King Noor mirror + DnD sayfalar |
| Akıllı arama | Kısmi | `/search`, 2+ karakter |
| Mega menü / breadcrumbs | Plan | |
| Banner / slider | Kısmi | DnD blokları |
| PDP çoklu görsel | Kısmi | Tek görsel |
| Varyant (hacim / ml) | Kısmi | Admin + vitrin pill; çoklu seçenek adı sonra |
| Yorum & puan | Plan | |
| Stok uyarısı | Var | Rozetler, düşük stok |
| Favori | Var | Hesap + vitrin |
| Karşılaştırma | Plan | |
| Mini sepet | Var | |
| Misafir checkout | Var | |
| Tek sayfa ödeme | Var | Checkout |
| PayTR / havale / kapıda | Var | |
| Taksit tablosu | Plan | |
| Kayıtlı adres | Var | Giriş + checkout |
| Kargo seçimi | Var | |
| Sipariş takip | Var | `/orders/track` |
| E-posta bildirim | Kısmi | Resend + şablonlar |
| SMS | Plan | |
| Hesap / sipariş geçmişi | Var | |
| Adres defteri | Var | |
| Favoriler | Var | |
| Puan / cüzdan | Plan | |
| Mesafeli satış | Var | Sayfa + checkbox |
| Canlı destek | Plan | |

---

## 2. Back-end (admin)

| Modül | Menü | Durum |
|-------|------|--------|
| Özet panel | Genel | Var |
| Raporlar | Genel | Plan (sayfa stub) |
| Ürün / kategori / marka | Ürün & Katalog | Var |
| Excel içe/dışa | Ürünler sayfası | Var |
| Sipariş listesi & detay | Siparişler | Var |
| Durum / kargo / not | Sipariş detay | Var |
| Müşteri / üye listesi | Müşteriler & Üyeler | Var |
| Müşteri detay CRM | Müşteri kartı | Var |
| Kampanya & kupon | Kampanyalar | Var |
| Ücretsiz kargo eşiği | Kampanyalar → Ücretsiz kargo eşiği | Var |
| CRM segmentleri | Müşteriler filtreleri | Kısmi |
| Kargo firmaları | Kargo | Var |
| Pazaryeri (TY, HB, …) | **Pazaryeri** | Var |
| PayTR / ödeme | Ödeme | Var |
| E-posta şablonları | Bildirimler | Var |
| Sayfalar DnD | İçerik & SEO | Var |
| Tema | Ayarlar | Var |
| Panel kullanıcıları | Ayarlar → Kullanıcılar | Kısmi (liste) |

---

## 3. Entegrasyonlar

| Entegrasyon | Durum |
|-------------|--------|
| PayTR | Var |
| Trendyol API | Var |
| Hepsiburada fastlisting | Var |
| n11 / Amazon / diğer | XML export |
| Resend e-posta | Var |
| e-Fatura | Plan |
| GA4 / Pixel | Plan |

---

## Menüde göremiyorsanız

1. **Çıkış yapın** → tekrar `admin` / `admin123` ile giriş (yetkiler artık her girişte DB’den yenilenir).
2. `npm run db:seed` — admin rolüne tüm yetkileri yazar.
3. Sol menüyü **aşağı kaydırın** (Pazaryeri, Kampanyalar, Müşteriler altta).
4. Mobilde üst çubuktan **☰ Menü** kullanın.

---

Son güncelleme: admin menü genişletmesi + yetki yenileme düzeltmesi.
