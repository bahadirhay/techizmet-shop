import {
  amazonSpApiRequest,
  getAmazonAccessToken,
  type AmazonSpApiCredentials,
} from "@/lib/marketplace/amazon/client";

export type MarketplaceConnectionTestResult = {
  ok: boolean;
  message: string;
};

/**
 * Amazon SP-API bağlantısını doğrular:
 * 1) LWA refresh_token → access_token alınabiliyor mu?
 * 2) Hafif bir SP-API çağrısı (marketplaceParticipations) 200 dönüyor mu?
 *
 * marketplaceParticipations herhangi bir marketplace ID gerektirmez ve
 * "Selling Partner Insights" ya da temel yetkiyle çalışır — bağlantı testi için idealdir.
 */
export async function testAmazonConnection(
  creds: AmazonSpApiCredentials,
): Promise<MarketplaceConnectionTestResult> {
  const token = await getAmazonAccessToken(creds);
  if (!token.accessToken) {
    return {
      ok: false,
      message:
        `LWA token alınamadı: ${token.error ?? "bilinmeyen hata"}. ` +
        "LWA Client ID/Secret ve Refresh Token'ı Seller Central → Develop Apps bilgileriyle kontrol edin.",
    };
  }

  const res = await amazonSpApiRequest(
    creds,
    token.accessToken,
    "/sellers/v1/marketplaceParticipations",
  );

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      message:
        `Yetki hatası (HTTP ${res.status}). Token alındı ama SP-API erişimi reddedildi. ` +
        "Uygulamanızın Amazon.com.tr mağazasına yetkilendirildiğinden (self-authorization) ve gerekli rollerin onaylı olduğundan emin olun.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      message: `Amazon SP-API HTTP ${res.status}: ${res.text.slice(0, 200)}`,
    };
  }

  const payload = res.json as { payload?: Record<string, unknown>[] } | null;
  const list = Array.isArray(payload?.payload) ? payload!.payload : [];
  const marketplaceCount = list.length;
  return {
    ok: true,
    message:
      `Bağlantı başarılı. ${marketplaceCount} mağaza/pazaryeri katılımı görülüyor. ` +
      "Token ve yetkiler geçerli.",
  };
}
