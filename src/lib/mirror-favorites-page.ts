/** Techizmet Shop — favoriler sayfası (mirror) */

import { injectMirrorPageRoot } from "@/lib/mirror-page-inject";
import { PRODUCT_IMAGE_ASPECT_RATIO, PRODUCT_IMAGE_THUMB } from "@/lib/product-image-spec";

export type MirrorFavoriteItem = {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceLabel: string;
  compareLabel?: string | null;
};

export type MirrorFavoritesPayload = {
  items: MirrorFavoriteItem[];
  locale: "tr" | "en";
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const FAVORITES_PAGE_CSS = `<style id="kn-favorites-page-css">
.account-page .main-account--content {
  max-width: 920px;
  margin: 0 auto;
  padding: 8px 20px 56px;
}
.kn-favorites-page__back {
  margin: 0 0 24px;
}
.kn-favorites-page__back a {
  text-decoration: underline;
}
.kn-fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}
.kn-fav-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--body_alternate_background, #f7f5f2);
  border-radius: var(--product_card_radius, 8px);
  border: 1px solid var(--border_color, #e5e2dd);
}
.kn-fav-card__media {
  display: block;
  aspect-ratio: ${PRODUCT_IMAGE_ASPECT_RATIO};
  overflow: hidden;
  border-radius: var(--product_card_radius, 8px);
  background: var(--body_background, #fff);
}
.kn-fav-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.kn-fav-card__title {
  font-weight: 600;
  text-decoration: none;
  color: inherit;
}
.kn-fav-card__title:hover {
  text-decoration: underline;
}
.kn-fav-card__price {
  margin: 4px 0 0;
}
.kn-fav-card__actions {
  margin-top: auto;
}
.kn-fav-empty {
  text-align: center;
  padding: 48px 20px;
  color: var(--text_color_muted, #666);
}
</style>`;

export function buildFavoritesPageMarkup(p: MirrorFavoritesPayload): string {
  const tr = p.locale === "tr";
  const back = tr ? "← Hesabım" : "← My account";
  const empty = tr ? "Henüz favori ürününüz yok." : "You have no favorites yet.";
  const shop = tr ? "Alışverişe devam" : "Continue shopping";
  const remove = tr ? "Favorilerden çıkar" : "Remove from favorites";

  const grid =
    p.items.length > 0
      ? `<div class="kn-fav-grid">${p.items
          .map((item) => {
            const href = `/products/${encodeURIComponent(item.slug)}`;
            const img = item.imageUrl
              ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" width="${PRODUCT_IMAGE_THUMB.favCard.width}" height="${PRODUCT_IMAGE_THUMB.favCard.height}">`
              : "";
            return `<article class="kn-fav-card" data-kn-fav-card data-product-id="${esc(item.productId)}">
        <a href="${href}" class="kn-fav-card__media">${img}</a>
        <div>
          <a href="${href}" class="kn-fav-card__title product--title">${esc(item.title)}</a>
          <p class="kn-fav-card__price">
            <span class="product--actual-price">${esc(item.priceLabel)}</span>${item.compareLabel ? `<span class="product--cut-price line-through">${esc(item.compareLabel)}</span>` : ""}
          </p>
        </div>
        <div class="kn-fav-card__actions">
          <button type="button" class="button text-button" data-kn-fav-remove data-product-id="${esc(item.productId)}">${esc(remove)}</button>
        </div>
      </article>`;
          })
          .join("")}</div>`
      : `<div class="kn-fav-empty"><p class="text-medium">${esc(empty)}</p><p style="margin-top:16px"><a href="/collections/all" class="button medium-button">${esc(shop)}</a></p></div>`;

  return `<div class="kn-favorites-page" data-kn-favorites-page="1">
  <p class="kn-favorites-page__back"><a href="/account" class="text-underline">${esc(back)}</a></p>
  ${grid}
</div>`;
}

export function injectFavoritesPageStyles(html: string): string {
  if (html.includes('id="kn-favorites-page-css"')) return html;
  return html.replace(/<\/head>/i, `${FAVORITES_PAGE_CSS}</head>`);
}

export function applyFavoritesPageToMirrorHtml(html: string, payload: MirrorFavoritesPayload): string {
  let out = injectFavoritesPageStyles(html);
  out = injectMirrorPageRoot(out, "kn-page-root", buildFavoritesPageMarkup(payload));
  out = injectFavoritesPageBridge(out);
  return out;
}

export function buildFavoritesPageBridgeScript(): string {
  return `(function(){
  document.addEventListener("click",async function(e){
    var btn=e.target&&e.target.closest?e.target.closest("[data-kn-fav-remove]"):null;
    if(!btn)return;
    e.preventDefault();
    var id=btn.getAttribute("data-product-id");
    if(!id)return;
    var res=await fetch("/api/account/favorites",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"same-origin",
      body:JSON.stringify({productId:id})
    });
    if(!res.ok){alert("İşlem başarısız");return;}
    var card=btn.closest("[data-kn-fav-card]");
    if(card)card.remove();
    if(!document.querySelector("[data-kn-fav-card]"))(window.top||window).location.reload();
  });
})();`;
}

export function injectFavoritesPageBridge(html: string): string {
  const script = `<script id="kn-favorites-page-bridge">${buildFavoritesPageBridgeScript()}</script>`;
  if (html.includes('id="kn-favorites-page-bridge"')) return html;
  return html.replace(/<\/body>/i, `${script}</body>`);
}
