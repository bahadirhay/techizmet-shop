import { detectEmbedProvider, toVideoIframeSrc, type EmbedVideoProvider } from "@/lib/video-embed";

export type VideoSourceType = "local" | EmbedVideoProvider;

export type VideoSectionData = {
  sourceType: VideoSourceType;
  /** Yerel: /uploads/...mp4 — embed: sayfa linki */
  url: string;
  posterUrl?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
};

export type VideoSectionEdit = VideoSectionData;

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

export function extractVideoSectionFromHtml(html: string, sectionKey: string): VideoSectionData | null {
  const block = sliceSectionHtml(html, sectionKey);
  if (!block || !block.includes("section-video")) return null;

  const iframe = block.match(/<iframe[^>]*src="([^"]+)"/i)?.[1];
  if (iframe?.includes("instagram.com") || iframe?.includes("youtube.com/embed") || iframe?.includes("vimeo.com")) {
    const provider = detectEmbedProvider(iframe) ?? "youtube";
    return {
      sourceType: provider,
      url: iframe,
      autoplay: true,
      muted: true,
      loop: true,
    };
  }

  const src =
    block.match(/<source[^>]*src="([^"]+\.mp4[^"]*)"/i)?.[1] ??
    block.match(/<video[^>]*src="([^"]+)"/i)?.[1];
  if (!src) {
    return { sourceType: "local", url: "", autoplay: true, muted: true, loop: true };
  }

  const poster = block.match(/<video[^>]*poster="([^"]+)"/i)?.[1];
  const autoplay = /autoplay/i.test(block);
  const muted = /muted/i.test(block);
  const loop = /loop/i.test(block);

  return {
    sourceType: "local",
    url: src.split("?")[0] ?? src,
    posterUrl: poster?.split("?")[0],
    autoplay,
    muted,
    loop,
  };
}

function embedHtml(embedSrc: string, title?: string): string {
  const safe = embedSrc.replace(/"/g, "&quot;");
  return `<div class="kn-video-embed" style="position:relative;width:100%;padding-bottom:56.25%;height:0;overflow:hidden;background:#111">
<iframe src="${safe}" title="${(title ?? "Video").replace(/"/g, "&quot;")}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
</div>`;
}

function localVideoHtml(url: string, edit: VideoSectionEdit): string {
  const attrs = [
    'class="videoBackgroundFile"',
    edit.autoplay !== false ? "autoplay" : "",
    edit.muted !== false ? "muted" : "",
    edit.loop !== false ? "loop" : "",
    "playsinline",
    edit.posterUrl ? `poster="${edit.posterUrl.replace(/"/g, "&quot;")}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<video ${attrs}><source src="${url.replace(/"/g, "&quot;")}" type="video/mp4"></video>`;
}

/** Vitrin iframe — video bölümü */
export function applyVideoSectionToElement(section: Element, edit: VideoSectionEdit) {
  const host =
    section.querySelector("deferred-media-video") ??
    section.querySelector("[data-video-wrapper]") ??
    section.querySelector(".video--wrapper");
  if (!host) return;

  const media = host.closest(".media") ?? host;

  if (edit.sourceType === "local") {
    const url = edit.url?.trim();
    if (!url) return;
    host.innerHTML = localVideoHtml(url, edit);
    if (media && "classList" in media) {
      (media as HTMLElement).classList.remove("kn-video-embed-host");
    }
    return;
  }

  const pageUrl = edit.url?.trim();
  const embedSrc = toVideoIframeSrc(pageUrl);
  if (!embedSrc) return;

  host.innerHTML = embedHtml(embedSrc, "Video");
  if (media && "classList" in media) {
    const el = media as HTMLElement;
    el.classList.add("kn-video-embed-host");
    el.style.minHeight = "min(56.25vw, 70vh)";
  }
}
