# Techizmet Shop

Salon projesinden (**web-page**) bağımsız e-ticaret vitrini. King Noor referans teması.

| | URL |
|--|-----|
| Vitrin | http://localhost:5555 — **King Noor mirror** (indirdiğiniz klasör) |
| Admin | http://localhost:5555/admin/login |
| Giriş | `admin` / `.env` → `ADMIN_PASSWORD` (seed: `admin123`) |

## Kurulum

```powershell
cd C:\Users\BH\Desktop\techizmet-shop
copy .env.example .env
# DATABASE_URL doldurun (salon ile aynı Neon olabilir — shop verisi ayrı PostgreSQL şemasında: shop.*)
npm install
npm run theme:import
# → 500+ görsel/CSS + mirror/index.html (ana sayfa tasarımı)
npm run db:push
npm run db:seed
npm run dev
```

Tema mirror kaynağı: `C:\My Web Sites\shop\theking-noor.myshopify.com`

## Yapı

- `src/lib/blocks/` — shop blok şeması + King Noor preset
- `src/components/editor/` — tut-sürükle sayfa editörü
- `src/app/(store)/` — müşteri vitrini
- `src/app/admin/` — mağaza paneli

**web-page** reposuna import yok.
