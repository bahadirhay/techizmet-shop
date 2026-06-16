/** Mirror vitrin — /sokak-dostlari sayfa içeriği (sayaç + bağış günlüğü) */

import type { StreetFoodDonationPublic, StreetFoodFundPublicPayload } from "@/lib/street-food-fund/types";

const STYLE_ID = "kn-street-food-page-styles";
const FUND_API = "/api/vitrin/street-food-fund";
const DONATIONS_API = "/api/vitrin/street-food-fund/donations";

const PAGE_STYLES = `
.kn-street-food-stats__card {
  text-align: center;
  padding: 24px 20px;
  border-radius: var(--product_card_radius, 12px);
  background: var(--body_alternate_background, #f5f5f5);
  border: 1px solid color-mix(in srgb, var(--text_color, #111) 10%, transparent);
}
.kn-street-food-stats__emoji { font-size: 2rem; line-height: 1; margin-bottom: 8px; }
.kn-street-food-stats__title { font-size: 1.35rem; font-weight: 600; margin: 0 0 8px; }
.kn-street-food-stats__slogan { margin: 0 0 16px; color: color-mix(in srgb, var(--text_color, #111) 70%, transparent); }
.kn-street-food-stats__counts { font-size: 1.15rem; font-weight: 600; margin-bottom: 10px; }
.kn-street-food-stats__track {
  max-width: 420px; margin: 0 auto 12px; height: 8px; border-radius: 999px;
  background: color-mix(in srgb, var(--text_color, #111) 12%, transparent); overflow: hidden;
}
.kn-street-food-stats__fill { height: 100%; border-radius: 999px; background: #059669; transition: width .4s ease; }
.kn-street-food-stats__sub { margin: 0; font-size: .9rem; color: color-mix(in srgb, var(--text_color, #111) 65%, transparent); }
.kn-street-food-donations__title { font-size: 1.15rem; font-weight: 600; margin: 0 0 16px; }
.kn-street-food-donation {
  padding: 20px; margin-bottom: 16px; border-radius: var(--product_card_radius, 12px);
  background: var(--body_background, #fff);
  border: 1px solid color-mix(in srgb, var(--text_color, #111) 10%, transparent);
}
.kn-street-food-donation__head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.kn-street-food-donation__name { font-weight: 600; margin: 0; }
.kn-street-food-donation__meta { font-size: .85rem; color: color-mix(in srgb, var(--text_color, #111) 60%, transparent); }
.kn-street-food-donation__photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-top: 12px; }
.kn-street-food-donation__photos img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
#kn-mirror-section-template--street_food_fund__richtext .richtext--content {
  text-align: center;
  margin-left: auto;
  margin-right: auto;
}
#kn-mirror-section-template--street_food_fund__richtext .richtext--content ol {
  display: inline-block;
  text-align: left;
  margin: 0 auto;
  padding-left: 1.25rem;
}
#kn-mirror-section-template--street_food_fund__richtext .richtext--content .button {
  display: inline-block;
}
`;

function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = PAGE_STYLES;
  doc.head.appendChild(style);
}

function renderStatsHtml(payload: StreetFoodFundPublicPayload, locale: string): string {
  const pct = Math.max(0, Math.min(100, payload.progressPercent));
  const countsLabel =
    locale === "en"
      ? `Collected food: ${payload.collectedLabel} / ${payload.targetLabel}`
      : `Toplanan Mama: ${payload.collectedLabel} / ${payload.targetLabel}`;
  return `<div class="kn-street-food-stats__card">
  <div class="kn-street-food-stats__emoji">🐾</div>
  <h2 class="kn-street-food-stats__title">${escHtml(payload.title)}</h2>
  <p class="kn-street-food-stats__slogan">${escHtml(payload.slogan)}</p>
  <p class="kn-street-food-stats__counts">${escHtml(countsLabel)}</p>
  <div class="kn-street-food-stats__track" aria-hidden="true"><div class="kn-street-food-stats__fill" style="width:${pct}%"></div></div>
  <p class="kn-street-food-stats__sub">${escHtml(payload.counterSubtext)}</p>
</div>`;
}

function formatDonationDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR");
  } catch {
    return iso;
  }
}

function renderDonationsHtml(donations: StreetFoodDonationPublic[], locale: string): string {
  if (!donations.length) return "";
  const title = locale === "en" ? "Donation log" : "Bağış günlüğü";
  const videoLabel = locale === "en" ? "Watch donation video" : "Bağış videosunu izle";
  const items = donations
    .map((d) => {
      const photos = d.photoUrls.length
        ? `<div class="kn-street-food-donation__photos">${d.photoUrls
            .map((url) => `<img src="${escHtml(url)}" alt="" loading="lazy">`)
            .join("")}</div>`
        : "";
      const story = d.storyHtml?.trim()
        ? `<div class="kn-street-food-donation__story">${d.storyHtml}</div>`
        : "";
      const video = d.videoUrl?.trim()
        ? `<p><a href="${escHtml(d.videoUrl)}" target="_blank" rel="noreferrer">${videoLabel}</a></p>`
        : "";
      return `<article class="kn-street-food-donation">
  <div class="kn-street-food-donation__head">
    <h3 class="kn-street-food-donation__name">${escHtml(d.recipientName)}</h3>
    <span class="kn-street-food-donation__meta">${formatDonationDate(d.donatedAt, locale)} · ${escHtml(d.gramsLabel)}</span>
  </div>
  ${story}
  ${video}
  ${photos}
</article>`;
    })
    .join("");
  return `<h2 class="kn-street-food-donations__title">${title}</h2>${items}`;
}

async function fetchFund(): Promise<StreetFoodFundPublicPayload | null> {
  try {
    const res = await fetch(FUND_API, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    const data = (await res.json()) as StreetFoodFundPublicPayload & { enabled?: boolean };
    if (data.enabled === false) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchDonations(): Promise<StreetFoodDonationPublic[]> {
  try {
    const res = await fetch(DONATIONS_API, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return [];
    const data = (await res.json()) as { donations?: StreetFoodDonationPublic[] };
    return data.donations ?? [];
  } catch {
    return [];
  }
}

export function applyStreetFoodFundPageContent(
  doc: Document,
  fund: StreetFoodFundPublicPayload | null,
  donations: StreetFoodDonationPublic[],
  locale = "tr",
) {
  ensureStyles(doc);
  const stats = doc.getElementById("kn-street-food-stats");
  if (stats) {
    stats.innerHTML = fund ? renderStatsHtml(fund, locale) : "";
  }
  const log = doc.getElementById("kn-street-food-donations");
  if (log) {
    log.innerHTML = renderDonationsHtml(donations, locale);
  }
}

export function installMirrorStreetFoodFundPage(doc: Document) {
  if (!doc.querySelector("[data-kn-street-food-fund-page]")) return;
  if (doc.documentElement.getAttribute("data-kn-street-food-page") === "1") return;
  doc.documentElement.setAttribute("data-kn-street-food-page", "1");

  const locale =
    doc.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "tr";

  const refresh = async () => {
    const [fund, donations] = await Promise.all([fetchFund(), fetchDonations()]);
    applyStreetFoodFundPageContent(doc, fund, donations, locale);
  };

  void refresh();
  const win = doc.defaultView;
  if (!win) return;
  const key = "__knStreetFoodPageTimer";
  const existing = (win as unknown as Record<string, number | undefined>)[key];
  if (existing) win.clearInterval(existing);
  (win as unknown as Record<string, number>)[key] = win.setInterval(() => void refresh(), 60_000);
}
