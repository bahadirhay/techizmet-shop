/**
 * GİB e-Arşiv giriş teşhis aracı.
 *
 * Bu scripti KENDİ BİLGİSAYARINDA (Türkiye IP) çalıştır. Amaç: giriş
 * sorununun IP engelinden mi yoksa kimlik/komut/yoğunluktan mı kaynaklandığını
 * kesinleştirmek.
 *
 * Kullanım (PowerShell):
 *   node scripts/gib-login-diag.mjs "KULLANICI_KODU" "SIFRE"
 *   # test ortamı için sonuna test ekle:
 *   node scripts/gib-login-diag.mjs "KULLANICI_KODU" "SIFRE" test
 *
 * Not: Bilgiler ekrana yazılmaz, hiçbir yere kaydedilmez; sadece GİB'e gönderilir.
 */

const [, , username, password, mode] = process.argv;

if (!username || !password) {
  console.error("Kullanım: node scripts/gib-login-diag.mjs <kullaniciKodu> <sifre> [test]");
  process.exit(1);
}

const env = mode === "test" ? "TEST" : "PROD";
const base =
  env === "TEST"
    ? "https://earsivportaltest.efatura.gov.tr"
    : "https://earsivportal.efatura.gov.tr";

const commands = env === "PROD" ? ["anologin", "login"] : ["login", "anologin"];

async function tryLogin(cmd) {
  const body =
    `assoscmd=${encodeURIComponent(cmd)}&rtype=json` +
    `&userid=${encodeURIComponent(username)}` +
    `&sifre=${encodeURIComponent(password)}` +
    `&sifre2=${encodeURIComponent(password)}&parola=1&`;

  const started = Date.now();
  try {
    const res = await fetch(`${base}/earsiv-services/assos-login`, {
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "tr,en-US;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        pragma: "no-cache",
        referer: `${base}/intragiris.html`,
        origin: base,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      },
      body,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* raw */
    }
    const ms = Date.now() - started;
    const token = json?.token;
    const errMsg =
      json?.error && json.error !== "0"
        ? typeof json?.messages?.[0] === "string"
          ? json.messages[0]
          : json?.messages?.[0]?.text
        : null;

    console.log(`\n[${cmd}] HTTP ${res.status} · ${ms}ms`);
    if (token) {
      console.log(`  ✓ BAŞARILI — token alındı (${String(token).slice(0, 12)}…)`);
    } else if (errMsg) {
      console.log(`  ✗ GİB hatası: ${errMsg}`);
    } else {
      console.log(`  ? Beklenmeyen yanıt: ${text.slice(0, 300)}`);
    }
    return Boolean(token);
  } catch (e) {
    console.log(`\n[${cmd}] AĞ HATASI: ${e?.message ?? e}`);
    return false;
  }
}

console.log(`Ortam: ${env} — ${base}`);
console.log(`Kullanıcı: ${username.slice(0, 3)}*** · komutlar: ${commands.join(", ")}`);

let ok = false;
for (const cmd of commands) {
  if (await tryLogin(cmd)) {
    ok = true;
    break;
  }
}

console.log("\n──────────────────────────────");
if (ok) {
  console.log("SONUÇ: Bu makineden (bu IP) GİB girişi BAŞARILI.");
  console.log("→ Uygulama sunucusunda (Vercel) hâlâ başarısızsa sorun IP engelidir.");
} else {
  console.log("SONUÇ: Bu makineden de GİB girişi BAŞARISIZ.");
  console.log("→ Sorun IP değil; kimlik bilgisi/komut veya GİB yoğunluğu. Birkaç dk sonra tekrar deneyin.");
}
