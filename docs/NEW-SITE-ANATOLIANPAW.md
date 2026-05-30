# Yeni site: Anatolian Paw (ayrı veritabanı)

King Noor (`demo`) ile **çakışmaması** için Anatolian Paw kendi PostgreSQL veritabanında ve kendi `STORE_SITE_SLUG` değeriyle çalışır. Aynı kod tabanı, farklı `.env` + farklı Neon projesi.

## Mimari (kısa)

| | King Noor (mevcut) | Anatolian Paw (yeni) |
|--|-------------------|----------------------|
| Neon DB | `neondb` / mevcut URL | **Yeni** proje örn. `neondb_anatolianpaw` |
| `STORE_SITE_SLUG` | `demo` | `anatolianpaw` |
| Vitrin | mirror veya blocks | **blocks** (boş şablon) |
| Ürünler | dolu katalog | **0** — panelden eklersiniz |
| Alan adı | mevcut | `anatolianpaw.com` |
| Yerel port | 5555 | 5556 (öneri) |

Salon / randevu (`web-page`, `randevu.techizmet.com`) bu rehberin dışındadır; bu doküman **techizmet-shop** e-ticaret vitrinidir.

---

## 1. Neon’da yeni veritabanı

1. [Neon](https://neon.tech) → **New Project** (ör. `anatolianpaw-shop`).
2. Connection string’i kopyalayın (`postgresql://...`).
3. King Noor DB’sine **aynı connection string’i vermeyin**.

---

## 2. Yerel kurulum

```powershell
cd C:\Users\BH\Desktop\techizmet-shop

copy .env.anatolianpaw.example .env.anatolianpaw
# .env.anatolianpaw içinde DATABASE_URL ve ADMIN_PASSWORD doldurun
```

Şemayı bu DB’ye uygulayın (geçici olarak bu env’i kullanın):

```powershell
# Seçenek A: .env.anatolianpaw içeriğini .env olarak kopyalayın
copy .env.anatolianpaw .env

npm run db:push
npm run store:provision -- --slug=anatolianpaw --name="Anatolian Paw" --url=https://anatolianpaw.com
```

Veya mevcut `.env` dosyanıza dokunmadan:

```powershell
$env:DOTENV_CONFIG_PATH=".env.anatolianpaw"
# PowerShell'de dotenv için önce .env.anatolianpaw → .env kopyalamak en kolayı
```

Provision sonrası `.env` (veya deploy ortamı) şunları içermeli:

```env
DATABASE_URL=postgresql://...anatolianpaw...
STORE_SITE_SLUG=anatolianpaw
NEXT_PUBLIC_STORE_URL=http://localhost:5556
ADMIN_PASSWORD=...
SESSION_SECRET=...
```

Geliştirme:

```powershell
npm run dev -- -p 5556
```

- Vitrin: http://localhost:5556  
- Admin: http://localhost:5556/admin (kullanıcı: `admin`, şifre: `ADMIN_PASSWORD`)

---

## 3. Canlı: anatolianpaw.com

1. **Ayrı Vercel projesi** (veya ayrı sunucu) — King Noor deploy’undan farklı.
2. Environment variables (Production):
   - `DATABASE_URL` → Anatolian Paw Neon
   - `STORE_SITE_SLUG` → `anatolianpaw`
   - `NEXT_PUBLIC_STORE_URL` / `NEXT_PUBLIC_SITE_URL` → `https://anatolianpaw.com`
   - `SESSION_SECRET`, `ADMIN_PASSWORD` (sadece ilk provision için; canlıda şifreyi panelden değiştirin)
3. DNS: `anatolianpaw.com` → Vercel.
4. İlk deploy sonrası DB boşsa, CI veya lokalden **bir kez** `npm run db:push` + `store:provision` (production `DATABASE_URL` ile).

---

## 4. Panelden doldurma sırası (öneri)

1. **Ayarlar** → SEO, logo, iletişim  
2. **Bildirimler** → `/admin/settings/notifications` (e-posta gönderen, SMS Netgsm — site başına DB’de)  
3. **Ürünler** → kategoriler, ürünler, görseller  
4. **Menü** → üst menü / mega menü  
5. **Sayfa editörü** → ana sayfa blokları (slider, metin)  
6. **Raporlar** → `/admin/reports` (satış özeti; ayrı DB = ayrı rakamlar)  
7. Tema: **Blok modu** açık kalsın; mirror/King Noor’a geçmeyin (boş site için gerekmez)

Sunucu `.env`: `RESEND_API_KEY` + `MAIL_FROM` (tüm mağazalar aynı sunucuda paylaşabilir; gönderen adresi site ayarından override edilir).

---

## 5. İki siteyi aynı PC’de

| Terminal | `.env` | Port |
|----------|--------|------|
| King Noor | `DATABASE_URL` demo + `STORE_SITE_SLUG=demo` | 5555 |
| Anatolian Paw | `DATABASE_URL` paw + `STORE_SITE_SLUG=anatolianpaw` | 5556 |

`.env` dosyasını değiştirmeden iki süreç çalıştırmak için iki klasör klonu da kullanılabilir.

---

## Komut özeti

```bash
npm run db:push
npm run store:provision -- --slug=anatolianpaw --name="Anatolian Paw" --url=https://anatolianpaw.com
npm run reset:admin   # şifreyi .env ADMIN_PASSWORD ile sıfırlar
```

`--force` — aynı slug’ı silip yeniden oluşturur (dikkat: tüm site verisi gider).
