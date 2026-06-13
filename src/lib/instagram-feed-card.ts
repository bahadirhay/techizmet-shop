export type InstagramFeedPostDTO = {
  id: string;
  permalink: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  title: string | null;
  linkHref: string | null;
  linkLabel: string | null;
  coverImage: string | null;
};

export function cardImageSrc(p: {
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  coverImage?: string | null;
}): string | null {
  const cover = p.coverImage?.trim();
  if (cover) return cover;
  const t = p.thumbnailUrl?.trim();
  const m = p.mediaUrl?.trim();
  if (p.mediaType === "VIDEO") {
    if (t) return t;
    if (m && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(m)) return m;
    return null;
  }
  if (m && !/\.mp4(\?|$)/i.test(m)) return m;
  if (t) return t;
  if (m) return m;
  return null;
}

export function cardDisplayTitle(p: { title: string | null; caption: string | null }): string | null {
  const t = p.title?.trim();
  if (t) return t;
  const c = p.caption?.trim();
  if (!c) return null;
  const line = c.split("\n")[0]?.trim();
  if (!line) return null;
  return line.length > 80 ? `${line.slice(0, 77)}…` : line;
}

export function cardPrimaryHref(p: {
  linkHref: string | null;
  permalink: string;
}): { href: string; external: boolean } {
  const custom = p.linkHref?.trim();
  if (custom) {
    const external = /^https?:\/\//i.test(custom) || /^wa\.me\//i.test(custom);
    return { href: custom, external };
  }
  return { href: p.permalink, external: true };
}
