/**
 * Vercel build basinda ortam kontrolu — logda net hata mesaji.
 * DATABASE_URL Vercel'de Production + Preview + BUILD ile tanimli olmali.
 */
const slug = process.env.STORE_SITE_SLUG?.trim() || "demo";
const db = process.env.DATABASE_URL?.trim() || "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
const session = process.env.SESSION_SECRET?.trim() || "";

console.log(`[vercel:preflight] STORE_SITE_SLUG=${slug}`);
console.log(`[vercel:preflight] DATABASE_URL=${db ? "ok" : "EKSIK"}`);
console.log(`[vercel:preflight] NEXT_PUBLIC_SITE_URL=${siteUrl || "(bos)"}`);
console.log(`[vercel:preflight] SESSION_SECRET=${session.length >= 32 ? "ok" : "EKSIK"}`);

const errors = [];

if (!db) {
  errors.push(
    "DATABASE_URL yok. Vercel -> Settings -> Environment Variables -> DATABASE_URL -> Production + Preview + BUILD isaretleyin.",
  );
} else if (!db.includes("neon.tech") && !db.startsWith("postgresql://")) {
  errors.push("DATABASE_URL gecersiz formatta gorunuyor.");
}

if (slug === "demo") {
  console.warn(
    '[vercel:preflight] UYARI: STORE_SITE_SLUG=demo. Anatolian Paw deploy icin Vercel env: anatolianpaw',
  );
}

if (!siteUrl) {
  console.warn(
    "[vercel:preflight] UYARI: NEXT_PUBLIC_SITE_URL bos — https://anatolianpaw.vercel.app gibi canli URL ekleyin.",
  );
}

if (session.length < 32) {
  console.warn("[vercel:preflight] UYARI: SESSION_SECRET eksik veya kisa (runtime icin gerekli).");
}

if (errors.length) {
  console.error("\n========== VERCEL BUILD DURDURULDU ==========");
  for (const e of errors) console.error("  *", e);
  console.error("=============================================\n");
  process.exit(1);
}
