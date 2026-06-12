# Canlı mağaza kurulum rehberi

## 1. Vercel ortam değişkenleri

**Project → Settings → Environment Variables**

Her değişken için **Production** ve **Preview** kutularını işaretleyin.  
`DATABASE_URL` için ayrıca **Build** kutusunu da işaretleyin (mirror prebuild build sırasında DB’ye bağlanır).

| Değişken | Örnek | Not |
|----------|--------|-----|
| `DATABASE_URL` | `postgresql://...@ep-xxx-pooler.neon.tech/neondb?sslmode=require` | **pooler** URL kullanın |
| `STORE_SITE_SLUG` | `demo` | Varsayılan mağaza (bilinmeyen host) |
| `DATABASE_URL_DEMO` | demo Neon pooler URL | **shop.techizmet.com** için (Anatolian Paw ile aynı Vercel projesinde şart) |
| `DATABASE_URL_ANATOLIANPAW` | paw Neon pooler URL | **anatolianpaw.com** için (ayrı DB kullanıyorsanız) |
| `SESSION_SECRET` | min 32 karakter rastgele | Admin oturumu |
| `NEXT_PUBLIC_STORE_URL` | `https://shop.techizmet.com` | |
| `NEXT_PUBLIC_SITE_URL` | `https://shop.techizmet.com` | |
| `SMTP_HOST` | `mail.techizmet.com` | Kendi mail sunucusu |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `shop@techizmet.com` | |
| `SMTP_PASSWORD` | (Plesk posta şifresi) | |
| `MAIL_FROM` | `King Noor <shop@techizmet.com>` | |

Env ekledikten veya değiştirdikten sonra: **Deployments → son deploy → Redeploy**.

---

## 2. Deploy sonrası kontrol

Build log’da şunu arayın:

```
[mirror:prebuild] Tamam — XX dosya
```

Tarayıcıda açın:

- `https://shop.techizmet.com/_mirror-prebuilt/manifest.json` → JSON görünmeli (404 olmamalı)
- Ürün sayfası → ikinci açılış belirgin hızlanmalı

---

## 3. Şifre sıfırlama tablosu (bir kez)

Kendi bilgisayarınızda, proje klasöründe:

```powershell
cd C:\Users\BH\Desktop\techizmet-shop
```

`.env` dosyasında **production** Neon `DATABASE_URL` olsun (Vercel’deki ile aynı).

```powershell
npm run db:migrate-password-reset
```

Başarılı olunca tablo oluşur; tekrar çalıştırmanız gerekmez.

---

## 4. Admin şifresi (acil durum)

Panelden: **Ayarlar → Güvenlik & şifre**

Komut satırı (production DB ile `.env`):

```powershell
cd C:\Users\BH\Desktop\techizmet-shop
$env:ADMIN_PASSWORD="YeniGucluSifre123"
npm run reset:admin
```

---

## 5. Yerel geliştirme (isteğe bağlı)

```powershell
cd C:\Users\BH\Desktop\techizmet-shop
npm install
npm run db:push
npm run dev
```

Mirror statik dosyalarını yerelde üretmek için:

```powershell
npm run mirror:prebuild
```

---

## 6. DNS (shop.techizmet.com)

Hostixo DNS:

- `shop` **A** → `76.76.21.21` (Vercel)

Plesk’te `shop` alt alan hosting’i **kapalı** olsun (SSL Plesk’ten değil Vercel’den gelir).

---

## Sık hatalar

| Belirti | Çözüm |
|---------|--------|
| `/_mirror-prebuilt/` 404 | Vercel’de `DATABASE_URL` + **Build** + `STORE_SITE_SLUG` → Redeploy |
| E-posta gitmiyor | `SMTP_*` env + Redeploy |
| Şifremi unuttum mail yok | `db:migrate-password-reset` + SMTP env |
| Site yavaş (ilk ürün) | Prebuild manifest 404 ise yukarıdaki env + redeploy |
