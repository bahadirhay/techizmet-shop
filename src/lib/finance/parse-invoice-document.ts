import "server-only";

import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";

export type ExtractedInvoiceLine = {
  description: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
};

export type ExtractedInvoice = {
  counterpartyTitle: string | null;
  taxId: string | null;
  invoiceNo: string | null;
  ettn: string | null;
  issueDate: string | null; // YYYY-MM-DD
  currency: string;
  lines: ExtractedInvoiceLine[];
  subtotal: number | null;
  vatTotal: number | null;
  grandTotal: number | null;
};

export type ParseInvoiceResult =
  | { ok: true; provider: string; extracted: ExtractedInvoice }
  | { ok: false; error: string };

/**
 * Fatura OCR modeli. SEO ayarlarındaki model eski nesil (3.x) olabildiğinden
 * bu özellik için güncel, vision destekli bir model kullanıyoruz. Env ile ezilebilir.
 */
const CLAUDE_OCR_MODEL = process.env.FINANCE_OCR_MODEL?.trim() || "claude-haiku-4-5-20251001";
const GEMINI_OCR_MODEL = process.env.FINANCE_OCR_GEMINI_MODEL?.trim() || "gemini-2.0-flash";

const SUPPORTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const PROMPT = `Bu bir Türk faturasıdır (e-Arşiv / e-Fatura, genellikle GELEN/tedarikçi faturası). Belgedeki bilgileri dikkatle OKU ve SADECE aşağıdaki JSON şemasında döndür.
Kurallar:
- Tahmin etme; okuyamadığın alanı null bırak.
- Tutarları nokta ondalık ile SAYI olarak ver (ör. 1234.56). Binlik ayıracı koyma.
- vatRate: KDV yüzdesi (0, 1, 10, 20 gibi).
- lines: her mal/hizmet satırı için bir nesne; qty=miktar, unitPrice=birim fiyat (KDV hariç).
- taxId: yalnızca rakam (VKN 10 veya TCKN 11 hane) — SATICININ/düzenleyenin numarası.
- Yanıtta yalnızca JSON ver, açıklama veya kod bloğu işareti yazma.

{
  "counterpartyTitle": "satıcı/düzenleyen firma ünvanı",
  "taxId": "satıcı VKN/TCKN (sadece rakam)",
  "invoiceNo": "fatura numarası",
  "ettn": "ETTN/UUID varsa",
  "issueDate": "YYYY-MM-DD",
  "currency": "TRY",
  "lines": [{"description": "mal/hizmet adı", "qty": 1, "unitPrice": 0, "vatRate": 20}],
  "subtotal": 0,
  "vatTotal": 0,
  "grandTotal": 0
}`;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function coerceExtracted(raw: unknown): ExtractedInvoice | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const linesRaw = Array.isArray(o.lines) ? o.lines : [];
  const lines: ExtractedInvoiceLine[] = linesRaw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const l = x as Record<string, unknown>;
      const description = str(l.description) ?? "";
      const qty = num(l.qty) ?? 1;
      const unitPrice = num(l.unitPrice) ?? 0;
      const vatRate = num(l.vatRate) ?? 20;
      if (!description && unitPrice <= 0) return null;
      return { description: description || "Kalem", qty: qty > 0 ? qty : 1, unitPrice, vatRate };
    })
    .filter((x): x is ExtractedInvoiceLine => Boolean(x));

  const taxIdRaw = str(o.taxId);
  const taxId = taxIdRaw ? taxIdRaw.replace(/\D/g, "") || null : null;

  return {
    counterpartyTitle: str(o.counterpartyTitle),
    taxId,
    invoiceNo: str(o.invoiceNo),
    ettn: str(o.ettn),
    issueDate: str(o.issueDate),
    currency: str(o.currency) ?? "TRY",
    lines,
    subtotal: num(o.subtotal),
    vatTotal: num(o.vatTotal),
    grandTotal: num(o.grandTotal),
  };
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callClaude(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string,
): Promise<string | null> {
  const docBlock =
    mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: [docBlock, { type: "text", text: PROMPT }] }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((c) => c.type === "text")?.text ?? null;
}

async function callGemini(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string,
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

/**
 * PDF veya görsel bir faturayı yapay zeka ile okuyup yapılandırılmış veri döndürür.
 * Kullanıcı sonucu her zaman kontrol edip kaydeder (otomatik post etmez).
 */
export async function parseInvoiceDocument(
  siteId: string,
  file: { base64: string; mimeType: string },
): Promise<ParseInvoiceResult> {
  if (!SUPPORTED_MIME.has(file.mimeType)) {
    return { ok: false, error: "Desteklenmeyen dosya türü. PDF, JPG, PNG veya WEBP yükleyin." };
  }
  const config = await getSeoAiConfig(siteId);
  if (!config.enabled) {
    return { ok: false, error: "Yapay zekâ okuma kapalı. /admin/settings/seo-ai sayfasından açın." };
  }

  const attempts: { name: string; run: () => Promise<string | null> }[] = [];
  if (config.claudeApiKey) {
    attempts.push({
      name: "claude",
      run: () => callClaude(config.claudeApiKey, CLAUDE_OCR_MODEL, file.base64, file.mimeType),
    });
  }
  if (config.geminiApiKey) {
    attempts.push({
      name: "gemini",
      run: () => callGemini(config.geminiApiKey, GEMINI_OCR_MODEL, file.base64, file.mimeType),
    });
  }

  if (attempts.length === 0) {
    return {
      ok: false,
      error:
        "Yapay zekâ anahtarı bulunamadı. /admin/settings/seo-ai sayfasından Claude veya Gemini API anahtarı girin.",
    };
  }

  let lastErr = "Belge okunamadı.";
  for (const attempt of attempts) {
    try {
      const text = await attempt.run();
      if (!text) {
        lastErr = `${attempt.name} yanıt vermedi.`;
        continue;
      }
      const extracted = coerceExtracted(extractJson(text));
      if (!extracted) {
        lastErr = `${attempt.name} yanıtı çözümlenemedi.`;
        continue;
      }
      return { ok: true, provider: attempt.name, extracted };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: `Fatura okunamadı: ${lastErr}` };
}
