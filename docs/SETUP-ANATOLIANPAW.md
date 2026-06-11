# Anatolian Paw — hızlı kurulum

Aynı platform (admin + mirror tema), **ayrı veri**. Ürün/kategori/görsel Techizmet Shop ile paylaşılmaz.

## 1. Neon (5 dk)

1. [neon.tech](https://neon.tech) → **New Project** → `anatolianpaw-shop`
2. Connection string kopyala

## 2. Yerel env

```powershell
cd C:\Users\BH\Desktop\techizmet-shop
copy .env.anatolianpaw.example .env.anatolianpaw
```

`.env.anatolianpaw` düzenle:

```env
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
ADMIN_PASSWORD=guclu-sifre-buraya
STORE_SITE_SLUG=anatolianpaw
NEXT_PUBLIC_STORE_URL=http://localhost:5556
NEXT_PUBLIC_SITE_URL=http://localhost:5556
```

## 3. Tek komut kurulum

```powershell
.\scripts\setup-anatolianpaw.ps1
```

Veya elle:

```powershell
copy .env.anatolianpaw .env
npm run db:push
npm run store:provision:anatolianpaw
```

Provision sonrası:

- `homepageMode`: **mirror** (Techizmet vitrin çerçevesi)
- `themeId`: **techizmet-shop** (aynı tasarım paketi)
- Ürün: **0**

## 4. Geliştirme

```powershell
npm run dev -- -p 5556
```

| URL | |
|-----|--|
| Vitrin | http://localhost:5556 |
| Admin | http://localhost:5556/admin (`admin` / `ADMIN_PASSWORD`) |

## 5. Panel sırası (içerik)

1. **Ayarlar → Logo, Favicon & SEO** — Anatolian Paw, açıklama, logo
2. **Tema** — mirror zaten açık; gerekirse doğrula
3. **Ana Sayfa** — mirror blok metinleri / görseller
4. **Kategoriler** — Örn. Köpek Ödülü, Sığır, Kuzu
5. **Ürünler** — mamalar + görseller + barkod
6. **Menü** — header linkleri
7. **Bildirimler** — `siparis@anatolianpaw.com`

## 6. Canlı: anatolianpaw.com

### Vercel (yeni proje)

| Değişken | Değer |
|----------|--------|
| `DATABASE_URL` | Paw Neon |
| `STORE_SITE_SLUG` | `anatolianpaw` |
| `NEXT_PUBLIC_SITE_URL` | `https://anatolianpaw.com` |
| `NEXT_PUBLIC_STORE_URL` | `https://anatolianpaw.com` |
| `SESSION_SECRET` | 32+ karakter (yeni) |
| `ADMIN_PASSWORD` | sadece ilk kurulum / reset için |

GitHub: aynı `techizmet-shop` repo, branch `main` (veya `brand/anatolianpaw`).

DNS: `anatolianpaw.com` → Vercel.

İlk deploy sonrası DB boşsa bir kez lokalden `db:push` + `store:provision:anatolianpaw` (production `DATABASE_URL` ile).

## 7. İki site aynı PC

| Site | Klasör | Port | Env |
|------|--------|------|-----|
| Techizmet Shop | `techizmet-shop` | 5555 | `.env` demo |
| Anatolian Paw | worktree veya aynı repo | 5556 | `.env.anatolianpaw` |

İsteğe bağlı worktree:

```powershell
cd C:\Users\BH\Desktop\techizmet-shop
git worktree add ..\anatolianpaw-shop main
```

## Mimari özeti

```
Platform kodu (paylaşımlı)
    └── Deploy Paw → STORE_SITE_SLUG=anatolianpaw
            └── Neon DB (sadece Paw verisi)
            └── themeId: techizmet-shop (şimdilik aynı vitrin)
            └── İçerik: panelden Paw'a özel
```

Müşteri siteleri ileride: aynı model + isteğe bağlı farklı `themeId` veya deploy branch.
