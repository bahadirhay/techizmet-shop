-- Medya dosyalarını Neon'da saklamak için (Vercel upload)
ALTER TABLE shop.media ADD COLUMN IF NOT EXISTS data BYTEA;
