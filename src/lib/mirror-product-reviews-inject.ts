/** Ürün sayfası iframe — yorum + yıldız enjeksiyonu */

export type IframeReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
};

export type IframeReviewStats = {
  count: number;
  average: number;
};

function stars(rating: number): string {
  const full = Math.round(Math.min(5, Math.max(0, rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTr(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/** Ürün başlığı altına eklenen kompakt yıldız bandı */
export function buildProductStarBadgeHtml(stats: IframeReviewStats): string {
  if (stats.count === 0) return "";
  const avg = stats.average.toFixed(1);
  const starStr = stars(stats.average);
  const label = stats.count === 1 ? "1 değerlendirme" : `${stats.count} değerlendirme`;
  return `<div id="kn-product-star-badge" style="display:flex;align-items:center;gap:6px;margin:6px 0 10px;flex-wrap:wrap;cursor:pointer;" onclick="document.getElementById('kn-reviews-accordion')&&document.getElementById('kn-reviews-accordion').scrollIntoView({behavior:'smooth'})">
  <span style="font-weight:700;font-size:0.95rem;color:#1a1a1a;">${escHtml(avg)}</span>
  <span style="color:#f5a623;font-size:1rem;letter-spacing:1px;">${starStr}</span>
  <span style="font-size:0.82rem;color:#71717a;">${escHtml(label)}</span>
</div>`;
}

/** Akordeon şeklinde tam yorum bölümü */
export function buildProductReviewsAccordionHtml(
  stats: IframeReviewStats,
  reviews: IframeReviewItem[],
): string {
  const heading = `Yorum &amp; Değerlendirmeler (${stats.count})`;
  const avg = stats.average.toFixed(1);
  const starStr = stars(stats.average);

  let summaryHtml = "";
  if (stats.count > 0) {
    summaryHtml = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <span style="font-size:2rem;font-weight:800;color:#1a1a1a;line-height:1;">${escHtml(avg)}</span>
      <div>
        <div style="color:#f5a623;font-size:1.1rem;letter-spacing:1px;">${starStr}</div>
        <div style="font-size:0.8rem;color:#71717a;">${stats.count} değerlendirme</div>
      </div>
    </div>`;
  }

  let reviewsHtml = "";
  if (reviews.length === 0) {
    reviewsHtml = `<p style="color:#52525b;margin:0;">Henüz yorum yok. İlk değerlendirmeyi siz yapın.</p>`;
  } else {
    reviewsHtml = reviews
      .map(
        (r) => `<div style="border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:12px 14px;margin-bottom:10px;background:#fff;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="color:#f5a623;font-size:0.9rem;">${stars(r.rating)}</span>
          <span style="font-weight:600;font-size:0.9rem;color:#1a1a1a;">${escHtml(r.authorName)}</span>
          ${r.isVerifiedPurchase ? `<span style="font-size:0.7rem;font-weight:600;color:#166534;background:#dcfce7;border-radius:999px;padding:1px 8px;">Doğrulanmış alışveriş</span>` : ""}
          <span style="font-size:0.75rem;color:#a1a1aa;margin-left:auto;">${escHtml(formatDateTr(r.createdAt))}</span>
        </div>
        ${r.title ? `<p style="font-weight:600;margin:4px 0 2px;color:#1a1a1a;">${escHtml(r.title)}</p>` : ""}
        <p style="margin:2px 0 0;color:#3f3f46;line-height:1.55;font-size:0.9rem;">${escHtml(r.body)}</p>
      </div>`,
      )
      .join("");
  }

  // Yorum yazma formu (iframe içinde window.parent.postMessage ile gönderir)
  const formHtml = `<details style="margin-top:16px;" id="kn-review-form-toggle">
    <summary style="cursor:pointer;font-weight:600;color:#2d4a6f;font-size:0.9rem;list-style:none;display:flex;align-items:center;gap:6px;">
      <span>+ Yorum Yaz</span>
    </summary>
    <form id="kn-iframe-review-form" style="display:grid;gap:10px;margin-top:12px;background:#f9f9f7;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:14px;" onsubmit="(function(e){e.preventDefault();var f=document.getElementById('kn-iframe-review-form');var data={rating:+f.querySelector('[name=rating]').value,authorName:f.querySelector('[name=authorName]').value,title:f.querySelector('[name=title]').value,body:f.querySelector('[name=body]').value};window.parent.postMessage({type:'kn-submit-review',data:data},'*');})(event)">
      <div>
        <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px;">Puanınız *</label>
        <select name="rating" required style="border:1px solid #d4d4d8;border-radius:8px;padding:6px 10px;font:inherit;width:100%;">
          <option value="">Seçin...</option>
          <option value="5">★★★★★ — Mükemmel</option>
          <option value="4">★★★★☆ — İyi</option>
          <option value="3">★★★☆☆ — Orta</option>
          <option value="2">★★☆☆☆ — Kötü</option>
          <option value="1">★☆☆☆☆ — Çok Kötü</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px;">Adınız *</label>
          <input name="authorName" required placeholder="Adınız" style="border:1px solid #d4d4d8;border-radius:8px;padding:6px 10px;font:inherit;width:100%;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px;">Başlık</label>
          <input name="title" placeholder="Kısa başlık" style="border:1px solid #d4d4d8;border-radius:8px;padding:6px 10px;font:inherit;width:100%;box-sizing:border-box;">
        </div>
      </div>
      <div>
        <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px;">Yorumunuz *</label>
        <textarea name="body" required rows="3" placeholder="Ürün hakkında düşünceleriniz..." style="border:1px solid #d4d4d8;border-radius:8px;padding:6px 10px;font:inherit;width:100%;box-sizing:border-box;resize:vertical;"></textarea>
      </div>
      <button type="submit" style="justify-self:start;background:#2d4a6f;color:#fff;border:none;border-radius:999px;padding:8px 20px;font-weight:600;cursor:pointer;font-size:0.9rem;">Gönder</button>
      <p id="kn-review-form-msg" style="display:none;margin:0;font-size:0.85rem;"></p>
    </form>
  </details>`;

  return `<details class="product-accordion--item border-bottom" id="kn-reviews-accordion" open>
  <summary class="product-accordion--heading" style="cursor:pointer;">
    <h2 class="product-accordion--heading-text">${heading}</h2>
    <span class="product-accordion--icon product-accordion--icon--open"></span>
  </summary>
  <div class="product-accordion--content">
    <div class="product-accordion--content-body rte" style="padding:16px 0;">
      ${summaryHtml}
      ${reviewsHtml}
      ${formHtml}
    </div>
  </div>
</details>`;
}

const STYLE_ID = "kn-reviews-inject-style";

function ensureReviewStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#kn-product-star-badge { cursor: pointer; }
#kn-product-star-badge:hover span:last-child { text-decoration: underline; }
#kn-reviews-accordion .product-accordion--content-body { padding: 16px 0 !important; }
`;
  doc.head.appendChild(style);
}

/** iframe DOM'una yıldız bandı + yorum akordeonunu enjekte eder */
export function applyProductReviewsToDocument(
  doc: Document,
  stats: IframeReviewStats,
  reviews: IframeReviewItem[],
) {
  ensureReviewStyles(doc);

  // 1) Başlık altına yıldız bandı
  if (stats.count > 0 && !doc.getElementById("kn-product-star-badge")) {
    const titleEl = doc.querySelector(".product-title-heading");
    if (titleEl) {
      const badgeDiv = doc.createElement("div");
      badgeDiv.innerHTML = buildProductStarBadgeHtml(stats);
      const badge = badgeDiv.firstElementChild;
      if (badge) titleEl.insertAdjacentElement("afterend", badge);
    }
  }

  // 2) Yorum akordeonunu .product-accordion sonuna ekle
  if (!doc.getElementById("kn-reviews-accordion")) {
    const accordion = doc.querySelector(".product-accordion");
    if (accordion) {
      const html = buildProductReviewsAccordionHtml(stats, reviews);
      accordion.insertAdjacentHTML("beforeend", html);
    }
  }

  // 3) iframe içinden gelen form submit mesajını burada handle etme —
  //    parent window (MirrorProductFrameClient) tarafından handle edilir
}
