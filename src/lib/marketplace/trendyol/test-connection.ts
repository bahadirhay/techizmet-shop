import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";
import { trendyolUserAgent } from "@/lib/marketplace/trendyol/headers";

export type TrendyolTestResult = {
  ok: boolean;
  status: number;
  message: string;
  userAgent: string;
};

export async function testTrendyolConnection(creds: TrendyolCredentials): Promise<TrendyolTestResult> {
  const userAgent = trendyolUserAgent(creds);
  const path = `/integration/product/sellers/${creds.sellerId}/products?page=0&size=1`;
  const res = await trendyolRequest(creds, path, { method: "GET" });

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      userAgent,
      message: "Bağlantı başarılı — Trendyol ürün API yanıt verdi.",
    };
  }

  if (res.status === 401) {
    return {
      ok: false,
      status: 401,
      userAgent,
      message:
        "401 Yetkisiz — API Key veya API Secret hatalı. Trendyol panelindeki değerleri birebir kopyalayın (Token değil).",
    };
  }

  if (res.status === 403) {
    return {
      ok: false,
      status: 403,
      userAgent,
      message: `403 Engellendi — User-Agent: "${userAgent}". Kendi yazılımınız ise entegrasyon firma adına SelfIntegration yazın. Master kullanıcı ile API bilgilerini kontrol edin.`,
    };
  }

  return {
    ok: false,
    status: res.status,
    userAgent,
    message: `HTTP ${res.status}: ${res.text.slice(0, 280)}`,
  };
}
