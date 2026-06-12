import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };
type RateResult = { ok: true } | { ok: false; retryAfterSec: number };

const buckets = new Map<string, Bucket>();
const upstashLimiters = new Map<string, Ratelimit>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip")?.trim() ?? "unknown";
}

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const cacheKey = `${limit}:${windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "kn-shop-rl",
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

/** Bellek içi yedek — Upstash yoksa veya hata olursa */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Upstash (tercih) veya bellek içi rate limit */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateResult> {
  const upstash = getUpstashLimiter(limit, windowMs);
  if (upstash) {
    try {
      const { success, reset } = await upstash.limit(key);
      if (!success) {
        return {
          ok: false,
          retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
        };
      }
      return { ok: true };
    } catch (err) {
      console.error("[rate-limit] Upstash hatası, bellek içi yedek:", err);
    }
  }
  return checkRateLimit(key, limit, windowMs);
}

export function rateLimitResponse(retryAfterSec: number) {
  return new Response(JSON.stringify({ error: "Çok fazla deneme. Lütfen bekleyin." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSec),
    },
  });
}
