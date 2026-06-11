export type ImageGuideRow = {
  name: string;
  adminPath: string;
  adminLabel: string;
  size: string;
  ratio: string;
  where: string;
  notes?: string;
};

export const IMAGE_GUIDE_GENERAL = {
  formats: "JPEG, PNG, WebP (tercih), GIF, SVG (logo)",
  maxMb: 8,
  uploadPath: "Yerel: public/uploads/shop/{siteId}/ — Canlı (Vercel): Neon DB (/api/media/…)",
  maxEdgeNoCrop: "2000 px (blog/mirror: 2400 px)",
};

export const IMAGE_GUIDE_ROWS: ImageGuideRow[] = [
  {
    name: "Ürün ana + galeri",
    adminPath: "/admin/products",
    adminLabel: "Ürünler → düzenle → Ürün görselleri",
    size: "1200 × 1200 px",
    ratio: "1:1 (kare)",
    where: "Liste kartı, arama, sepet, ürün detay galerisi",
    notes: "İlk görsel ana görseldir. Trendyol/HB’ye en fazla 8 görsel gider.",
  },
  {
    name: "EXPLORE (Keşfet)",
    adminPath: "/admin/products",
    adminLabel: "Ürün → Sayfa altı Keşfet",
    size: "1200 × 1500 veya 1000 × 1000",
    ratio: "Serbest (yatay/dikey)",
    where: "Ürün detay — Description altı 3 lifestyle kart",
    notes: "Genelde 3 kart. Kırpma zorunlu değil.",
  },
  {
    name: "Site logosu (koyu)",
    adminPath: "/admin/settings/seo",
    adminLabel: "Logo, favicon & SEO",
    size: "En fazla 360 × 96 px",
    ratio: "Oran korunur (3:1 zorunlu değil)",
    where: "Header — açık arka plan",
    notes: "Boş kenarlar otomatik kırpılır. Sıkı kırpılmış PNG; koyu logo açık zemin.",
  },
  {
    name: "Logo (açık header)",
    adminPath: "/admin/settings/seo",
    adminLabel: "Logo, favicon & SEO",
    size: "En fazla 360 × 96 px",
    ratio: "Oran korunur",
    where: "Şeffaf / koyu header",
    notes: "Beyaz/açık logo; şeffaf PNG önerilir.",
  },
  {
    name: "Favicon",
    adminPath: "/admin/settings/seo",
    adminLabel: "Logo, favicon & SEO",
    size: "128 × 128 px",
    ratio: "1:1",
    where: "Tarayıcı sekmesi",
  },
  {
    name: "Paylaşım görseli (OG)",
    adminPath: "/admin/settings/seo",
    adminLabel: "Logo, favicon & SEO",
    size: "1200 × 630 px",
    ratio: "≈ 1,91:1",
    where: "WhatsApp, Facebook, X link önizlemesi",
  },
  {
    name: "Marka logosu",
    adminPath: "/admin/brands",
    adminLabel: "Markalar",
    size: "400 × 133 px",
    ratio: "3:1",
    where: "Marka alanları",
  },
  {
    name: "Kategori banner",
    adminPath: "/admin/categories",
    adminLabel: "Kategoriler → düzenle",
    size: "1600 × 600 px",
    ratio: "16:6",
    where: "Kategori sayfası üst alan (isteğe bağlı)",
  },
  {
    name: "Koleksiyon kapak",
    adminPath: "/admin/collections",
    adminLabel: "Koleksiyonlar",
    size: "1200 × 900 px",
    ratio: "4:3",
    where: "Koleksiyon listesi kartları",
    notes: "Vitrinde kartlar 4:5 oranında kırpılabilir — önemli detayı ortada tutun.",
  },
  {
    name: "Blog kapak",
    adminPath: "/admin/blog",
    adminLabel: "Blog → yazı düzenle",
    size: "1180 × 760 px",
    ratio: "≈ 1,55:1",
    where: "Blog listesi, yazı üstü, ana sayfa blog bölümü",
  },
  {
    name: "Mega menü kart",
    adminPath: "/admin/settings/menu",
    adminLabel: "Menü & Kategoriler → Mega Menü",
    size: "875 × 500 veya 1050 × 600",
    ratio: "1,75:1",
    where: "Üst menü açılır panel — sol/sağ kart",
    notes: "Kırpma yok; yatay görsel yükleyin.",
  },
  {
    name: "Hero slider (blok)",
    adminPath: "/admin/pages",
    adminLabel: "Vitrin sayfaları → Hero slider",
    size: "1920 × 1080 veya 1600 × 900",
    ratio: "16:9",
    where: "Ana sayfa / özel sayfa tam genişlik slayt",
  },
  {
    name: "Görsel + metin (blok)",
    adminPath: "/admin/pages",
    adminLabel: "Vitrin sayfaları → Görsel+metin",
    size: "1200 × 900 px",
    ratio: "4:3",
    where: "İki sütun içerik blokları",
  },
];

export const IMAGE_GUIDE_CHECKLIST = [
  "Ana ürün görseli: 1200×1200 kare, temiz arka plan",
  "2–4 ek galeri görseli (aynı boyut, farklı açı)",
  "İsteğe bağlı: 3 EXPLORE lifestyle görseli",
  "Kategori ve koleksiyon ataması yapıldı mı?",
  "SEO çalışması (ürün formu) çalıştırıldı mı?",
];

export const IMAGE_GUIDE_MARKETPLACE = [
  { channel: "Trendyol", spec: "Kare 1200×1200, ilk görsel kapak, max 8 adet" },
  { channel: "Hepsiburada", spec: "Kare, aynı URL’ler fastlisting ile gider" },
  { channel: "Web vitrin", spec: "1200×1200 — liste ve detay uyumlu" },
];
