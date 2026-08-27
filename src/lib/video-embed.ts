/** YouTube / Vimeo / Instagram → iframe embed */

export type EmbedVideoProvider = "youtube" | "vimeo" | "instagram";

export function detectEmbedProvider(url: string): EmbedVideoProvider | null {
  const raw = url.trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtu.be" || h.includes("youtube")) return "youtube";
    if (h.endsWith("vimeo.com")) return "vimeo";
    if (h === "instagram.com") return "instagram";
    return null;
  } catch {
    return null;
  }
}

/** youtube.com / youtu.be / shorts / embed → video id */
export function extractYoutubeVideoId(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(normalized);
    const h = u.hostname.replace(/^www\./, "");

    if (h === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (h === "youtube.com" || h === "m.youtube.com" || h === "music.youtube.com" || h === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return shorts[1];
      const embed = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (embed?.[1]) return embed[1];
      const live = u.pathname.match(/^\/live\/([^/?]+)/);
      if (live?.[1]) return live[1];
    }
    return null;
  } catch {
    return null;
  }
}

/** YouTube kapak görseli (hqdefault — Shorts dahil güvenilir) */
export function youtubeThumbnailUrl(url: string): string | null {
  const id = extractYoutubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function toVideoIframeSrc(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(normalized);
    const h = u.hostname.replace(/^www\./, "");

    if (h === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (h === "youtube.com" || h === "m.youtube.com" || h === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
      const embed = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (embed?.[1]) return `https://www.youtube.com/embed/${embed[1]}`;
    }
    if (h.endsWith("vimeo.com")) {
      const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
      if (m?.[1]) return `https://player.vimeo.com/video/${m[1]}`;
    }
    if (h === "instagram.com") {
      const m = u.pathname.match(/\/(reels?|p|tv)\/([^/?]+)/i);
      if (m?.[1] && m[2]) {
        const kind = m[1].toLowerCase() === "reels" ? "reel" : m[1].toLowerCase();
        return `https://www.instagram.com/${kind}/${m[2]}/embed`;
      }
      if (u.pathname.includes("/embed")) return normalized;
    }
    if (raw.includes("youtube.com/embed") || raw.includes("player.vimeo.com/video")) {
      return normalized;
    }
    if (raw.includes("instagram.com") && raw.includes("/embed")) return normalized;
    return null;
  } catch {
    return null;
  }
}
