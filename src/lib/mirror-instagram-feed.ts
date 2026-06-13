import type { InstagramFeedPostDTO } from "@/lib/instagram-feed-card";
import { cardDisplayTitle, cardImageSrc, cardPrimaryHref } from "@/lib/instagram-feed-card";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const IG_FEED_CSS = `
.kn-ig-feed-root{padding:48px 16px 56px;background:#fafafa;border-top:1px solid #eee}
.kn-ig-feed-root .kn-ig-feed-title{text-align:center;font-size:1.35rem;font-weight:600;margin:0 0 24px;color:#111}
.kn-ig-feed-grid{display:grid;gap:16px;max-width:1100px;margin:0 auto;grid-template-columns:repeat(2,minmax(0,1fr))}
@media(min-width:768px){.kn-ig-feed-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1024px){.kn-ig-feed-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.kn-ig-card{display:flex;flex-direction:column;overflow:hidden;border-radius:14px;border:1px solid rgba(0,0,0,.08);background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);text-decoration:none;color:inherit}
.kn-ig-card:hover{box-shadow:0 6px 20px rgba(0,0,0,.1)}
.kn-ig-card-img{aspect-ratio:2/3;width:100%;object-fit:cover;display:block;background:#f0f0f0}
.kn-ig-card-body{padding:12px 14px 14px}
.kn-ig-card-title{font-size:.9rem;font-weight:600;margin:0 0 8px;line-height:1.35;color:#111}
.kn-ig-card-cta{display:inline-block;font-size:.75rem;font-weight:600;color:#059669}
`;

function cardHtml(p: InstagramFeedPostDTO): string {
  const img = cardImageSrc(p);
  if (!img) return "";
  const title = cardDisplayTitle(p) || "Instagram";
  const { href, external } = cardPrimaryHref(p);
  const cta = p.linkLabel?.trim() || (p.linkHref?.trim() ? "İncele" : "Instagram'da gör");
  const target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<a href="${esc(href)}" class="kn-ig-card"${target}>
    <img class="kn-ig-card-img" src="${esc(img)}" alt="" loading="lazy" />
    <div class="kn-ig-card-body">
      <p class="kn-ig-card-title">${esc(title)}</p>
      <span class="kn-ig-card-cta">${esc(cta)} →</span>
    </div>
  </a>`;
}

/** Mirror ana sayfa — footer öncesine Instagram vitrin bölümü */
export function applyInstagramFeedToDoc(doc: Document, posts: InstagramFeedPostDTO[], title?: string) {
  if (!posts.length) return;
  const main = doc.getElementById("MainContent") ?? doc.querySelector("main");
  if (!main) return;
  if (doc.getElementById("kn-instagram-feed-root")) return;

  if (!doc.getElementById("kn-instagram-feed-styles")) {
    const style = doc.createElement("style");
    style.id = "kn-instagram-feed-styles";
    style.textContent = IG_FEED_CSS;
    doc.head.appendChild(style);
  }

  const cards = posts.map(cardHtml).filter(Boolean).join("");
  if (!cards) return;

  const root = doc.createElement("section");
  root.id = "kn-instagram-feed-root";
  root.className = "kn-ig-feed-root";
  root.innerHTML = `<h2 class="kn-ig-feed-title">${esc(title?.trim() || "Instagram")}</h2><div class="kn-ig-feed-grid">${cards}</div>`;

  const footer = main.querySelector("footer") ?? doc.querySelector("footer");
  if (footer?.parentElement) {
    footer.parentElement.insertBefore(root, footer);
  } else {
    main.appendChild(root);
  }
}
