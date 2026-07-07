import "server-only";

import { createFaturaClient, type UserData } from "fatura";
import type { ResolvedEfaturaConfig } from "@/lib/efatura/settings";
import { resolveLegalSellerProfile } from "@/lib/legal/seller-profile";
import type { SiteSettings } from "@/lib/site-settings";
import { gibLogin } from "@/lib/efatura/gib-login";
import { getGibSession } from "@/lib/efatura/gib-session";

export type GibTestInput = {
  username?: string;
  password?: string;
  testMode?: boolean;
};

export type GibTestResult = {
  ok: boolean;
  message: string;
  environment: "TEST" | "PROD";
  portalUrl: string;
  loginOk?: boolean;
  profileOk?: boolean;
  userData?: { name?: string; title?: string; vkn?: string };
  hint?: string;
  debug?: Record<string, boolean>;
};

type GibClient = ReturnType<typeof createFaturaClient>;

function gibEnvLabel(testMode: boolean): { env: "TEST" | "PROD"; portalUrl: string } {
  return testMode
    ? { env: "TEST", portalUrl: "https://earsivportaltest.efatura.gov.tr" }
    : { env: "PROD", portalUrl: "https://earsivportal.efatura.gov.tr" };
}

function isProfileError(msg: string): boolean {
  const m = msg.toLocaleLowerCase("tr");
  return (
    m.includes("kullanıcı bilgilerine ulaşılamadı") ||
    m.includes("kullanici bilgilerine ulasilamadi") ||
    m.includes("kullanıcı bilgilerini") ||
    m.includes("güncellemedi") ||
    m.includes("guncellemedi")
  );
}

function profileHint(testMode: boolean): string {
  const portal = testMode ? "earsivportaltest.efatura.gov.tr" : "earsivportal.efatura.gov.tr";
  return (
    `GİB portalında (${portal}) giriş yapın → Kullanıcı / Firma Bilgileri bölümündeki tüm zorunlu alanları doldurup kaydedin. ` +
    `Test ortamı işaretliyse canlı portal yerine test portalına girmelisiniz; canlı bilgilerle test portalı çalışmaz.`
  );
}

function userDataFromSeller(config: ResolvedEfaturaConfig, settings: SiteSettings): UserData {
  const legal = resolveLegalSellerProfile(settings);
  const shipFrom = settings.store?.shipFrom ?? {};
  return {
    taxIDOrTRID: config.sellerTaxId || legal.taxNo || "",
    title: config.sellerTitle || legal.tradeName || "",
    name: "",
    surname: "",
    registryNo: "",
    mersisNo: legal.mersisNo || "",
    taxOffice: config.sellerTaxOffice || legal.taxOffice || "",
    fullAddress: legal.address || shipFrom.line1 || "Adres",
    buildingName: "",
    buildingNumber: "",
    doorNumber: "",
    town: "",
    district: shipFrom.district || "",
    city: shipFrom.city || "İstanbul",
    zipCode: shipFrom.postalCode || "",
    country: "Türkiye",
    phoneNumber: legal.phone || "",
    faxNumber: "",
    email: legal.email || "",
    webSite: legal.website || "",
    businessCenter: "",
  };
}

function displayName(d: UserData): string | undefined {
  return d.title?.trim() || [d.name, d.surname].filter(Boolean).join(" ").trim() || undefined;
}

/** GİB bağlantı testi — login + profil okuma (gerekirse satıcı bilgileriyle profil senkronu dener) */
export async function testGibConnection(
  config: ResolvedEfaturaConfig,
  settings: SiteSettings,
  siteId?: string,
): Promise<GibTestResult> {
  const { env, portalUrl } = gibEnvLabel(config.testMode);

  if (!config.username || !config.password) {
    return {
      ok: false,
      message: "GİB bilgileri eksik. Kullanıcı kodu ve parola girilmeli.",
      environment: env,
      portalUrl,
    };
  }

  // Önbellekli oturum kullan (siteId varsa): aynı token tekrar kullanılır, böylece
  // test + fatura çekme aynı oturumu paylaşır ve "aynı anda birden fazla giriş" olmaz.
  let token: string;
  let client: GibClient;
  try {
    if (siteId) {
      const session = await getGibSession(siteId, config);
      token = session.token;
      client = session.client as GibClient;
    } else {
      client = createFaturaClient(env) as GibClient;
      const login = await gibLogin(env, config.username, config.password);
      token = login.token;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const detail =
      (err as Error & { detail?: string }).detail && (err as Error & { detail?: string }).detail !== msg
        ? (err as Error & { detail?: string }).detail
        : undefined;
    const isAlreadyLoggedIn = /birden fazla giriş|birden fazla giris|güvenli çıkış|guvenli cikis/i.test(msg + (detail ?? ""));
    const isAuthError =
      /doğrulanamad|dogrulanamad|kimlik|kullanıcı adı|parola|şifre|sifre/i.test(msg);
    return {
      ok: false,
      message: isAlreadyLoggedIn
        ? `GİB'de zaten açık bir oturum var: ${msg}`
        : `GİB girişi başarısız: ${msg}${detail ? ` (denenen: ${detail})` : ""}`,
      environment: env,
      portalUrl,
      loginOk: false,
      hint: isAlreadyLoggedIn
        ? `GİB aynı hesapta ikinci oturuma izin vermez. ${portalUrl} adresine tarayıcıdan girip sağ üstten "Güvenli Çıkış" yapın (veya açık sekmeleri kapatın), 1-2 dakika bekleyip tekrar deneyin. Sistem artık tek oturumu paylaşır, bu hata tekrarlanmamalı.`
        : config.testMode
          ? "Test ortamı açık — earsivportaltest.efatura.gov.tr için ayrı test hesabı gerekir. Canlı portala girebiliyorsanız test kutusunu kapatıp tekrar deneyin."
          : isAuthError
            ? "Bilgiler web portalda çalışıyor ama sunucudan çalışmıyorsa neden büyük olasılıkla GİB'in IP engelidir: " +
              "GİB İVD, bulut/yurt dışı sunucu (Vercel) IP'lerinden gelen girişleri bu mesajla reddeder. " +
              "Doğrulamak için `node scripts/gib-login-diag.mjs <kullanıcı> <şifre>` komutunu KENDİ bilgisayarınızda çalıştırın; " +
              "orada başarılıysa sorun IP engelidir (çözüm: Türkiye IP'li vekil sunucu veya özel entegratör). " +
              "Değilse: İVD kullanıcı kodu/şifresini kontrol edin veya GİB yoğunluğu için birkaç dk sonra deneyin."
            : "Kullanıcı kodu ve parolayı İVD / e-Arşiv portal giriş bilgilerinizle kontrol edin.",
    };
  }

  const readProfile = async (): Promise<UserData> => client.getUserData(token);

  try {
    const userData = await readProfile();
    const name = displayName(userData);
    return {
      ok: true,
      message: `GİB bağlantısı başarılı${name ? ` — ${name}` : ""}.`,
      environment: env,
      portalUrl,
      loginOk: true,
      profileOk: true,
      userData: {
        name,
        title: userData.title,
        vkn: userData.taxIDOrTRID,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isProfileError(msg)) {
      return {
        ok: false,
        message: `GİB bağlantı hatası: ${msg}`,
        environment: env,
        portalUrl,
        loginOk: true,
        profileOk: false,
      };
    }

    // Profil eksik — satıcı ayarlarından otomatik doldurmayı dene
    try {
      const draft = userDataFromSeller(config, settings);
      if (draft.taxIDOrTRID && draft.title) {
        await client.updateUserData(token, draft);
        const userData = await readProfile();
        const name = displayName(userData);
        return {
          ok: true,
          message: `GİB bağlantısı başarılı (profil satıcı bilgilerinizle güncellendi)${name ? ` — ${name}` : ""}.`,
          environment: env,
          portalUrl,
          loginOk: true,
          profileOk: true,
          userData: { name, title: userData.title, vkn: userData.taxIDOrTRID },
        };
      }
    } catch {
      /* retry failed */
    }

    return {
      ok: false,
      message: `Giriş başarılı ama mükellef profili okunamadı: ${msg}`,
      environment: env,
      portalUrl,
      loginOk: true,
      profileOk: false,
      hint: profileHint(config.testMode),
    };
  }
}

export function mergeEfaturaTestConfig(
  stored: ResolvedEfaturaConfig,
  input: GibTestInput,
): ResolvedEfaturaConfig {
  return {
    ...stored,
    username: input.username?.trim() || stored.username,
    password: input.password?.trim() || stored.password,
    testMode: typeof input.testMode === "boolean" ? input.testMode : stored.testMode,
  };
}
