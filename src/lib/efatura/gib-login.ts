import "server-only";

/**
 * GİB e-Arşiv giriş yardımcısı.
 *
 * `fatura` paketi PROD ortamında sabit `anologin` (anonim giriş) komutu
 * kullanır; bazı gerçek mükellef hesaplarında GİB bunu reddedip
 * "Internet vergi dairesinden kimlik doğrulanamadı" döndürür. Bu yardımcı
 * birden fazla `assoscmd` varyantını sırayla deneyip token alan ilkini
 * kullanır — böylece hesabın hangi giriş komutunu kabul ettiğinden bağımsız
 * çalışır.
 */

const BASE_URL = {
  PROD: "https://earsivportal.efatura.gov.tr",
  TEST: "https://earsivportaltest.efatura.gov.tr",
} as const;

export type GibEnv = "PROD" | "TEST";

/**
 * Denenecek giriş komutları.
 * Yaygın/çalışan konvansiyon: PROD → anologin, TEST → login.
 * Yine de her ortamda diğerini fallback olarak deniyoruz (hesaba göre değişebiliyor).
 */
function loginCommands(env: GibEnv): string[] {
  return env === "PROD" ? ["anologin", "login"] : ["login", "anologin"];
}

type AssosResponse = {
  token?: string;
  error?: string;
  messages?: (string | { text?: string; type?: string })[];
};

function readError(json: AssosResponse): string | null {
  if (json.error && json.error !== "0") {
    const raw = json.messages?.[0];
    const text = typeof raw === "string" ? raw : raw?.text;
    return text || "GİB API hatası";
  }
  return null;
}

async function attempt(
  env: GibEnv,
  cmd: string,
  userName: string,
  password: string,
): Promise<{ token: string } | { error: string }> {
  const origin = BASE_URL[env];
  const res = await fetch(`${origin}/earsiv-services/assos-login`, {
    method: "POST",
    headers: {
      accept: "*/*",
      "accept-language": "tr,en-US;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      pragma: "no-cache",
      // GİB güvenlik katmanı bu başlıkları bekler; olmadan bazı hesaplarda
      // "kimlik doğrulanamadı" döner (İnteraktif giriş sayfası referansı).
      referer: `${origin}/intragiris.html`,
      origin,
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    },
    body:
      `assoscmd=${encodeURIComponent(cmd)}&rtype=json` +
      `&userid=${encodeURIComponent(userName)}` +
      `&sifre=${encodeURIComponent(password)}` +
      `&sifre2=${encodeURIComponent(password)}&parola=1&`,
  });

  let json: AssosResponse;
  try {
    json = (await res.json()) as AssosResponse;
  } catch {
    return { error: `Geçersiz yanıt (HTTP ${res.status})` };
  }

  const err = readError(json);
  if (err) return { error: err };
  if (!json.token) return { error: "Token alınamadı" };
  return { token: json.token };
}

export type GibLoginResult = {
  token: string;
  command: string;
  attempts: { command: string; error: string }[];
};

/** Birden fazla giriş komutu deneyerek token alır. Hepsi başarısızsa hata fırlatır. */
export async function gibLogin(
  env: GibEnv,
  userName: string,
  password: string,
): Promise<GibLoginResult> {
  const attempts: { command: string; error: string }[] = [];
  for (const cmd of loginCommands(env)) {
    const r = await attempt(env, cmd, userName, password);
    if ("token" in r) {
      return { token: r.token, command: cmd, attempts };
    }
    attempts.push({ command: cmd, error: r.error });
  }
  const detail = attempts.map((a) => `${a.command}: ${a.error}`).join(" · ");
  const err = new Error(attempts[0]?.error || "GİB girişi başarısız");
  (err as Error & { attempts?: typeof attempts; detail?: string }).attempts = attempts;
  (err as Error & { attempts?: typeof attempts; detail?: string }).detail = detail;
  throw err;
}
