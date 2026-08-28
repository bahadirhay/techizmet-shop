/** Mirror vitrin — /sokak-dostlari sayfa içeriği (sayaç + bağış günlüğü) */

import { readShopLocaleFromDocument } from "@/lib/i18n/locale";
import type { StreetFoodDonationPublic, StreetFoodFundPublicPayload } from "@/lib/street-food-fund/types";
import { youtubeThumbnailUrl } from "@/lib/video-embed";

const STYLE_ID = "kn-street-food-page-styles";
const FUND_API = "/api/vitrin/street-food-fund";
const DONATIONS_API = "/api/vitrin/street-food-fund/donations";

export const STREET_FOOD_PAGE_STYLES = `
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
.kn-street-food-stats__cycle {
  margin: 0 0 6px; font-size: .8rem; font-weight: 500; letter-spacing: .02em;
  text-transform: uppercase; color: color-mix(in srgb, var(--text_color, #111) 55%, transparent);
}
.kn-street-food-stats__impact {
  margin: 14px 0 0; padding: 12px 14px; border-radius: 10px;
  background: color-mix(in srgb, #059669 12%, transparent);
  color: color-mix(in srgb, #065f46 85%, #111);
  font-size: .95rem; font-weight: 600; line-height: 1.4;
}
.kn-street-food-donations__title { font-size: 1.15rem; font-weight: 600; margin: 0 0 16px; text-align: center; }
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
.kn-street-food-donation__story { margin: 0 0 14px; line-height: 1.55; }
.kn-street-food-donation__video {
  display: block; position: relative; margin-top: 4px; overflow: hidden;
  border-radius: 12px; aspect-ratio: 16 / 9; background: #111;
  text-decoration: none; color: inherit;
}
.kn-street-food-donation__video img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.kn-street-food-donation__video-play {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, #000 28%, transparent);
  transition: background .2s ease;
}
.kn-street-food-donation__video:hover .kn-street-food-donation__video-play,
.kn-street-food-donation__video:focus-visible .kn-street-food-donation__video-play {
  background: color-mix(in srgb, #000 42%, transparent);
}
.kn-street-food-donation__video-play span {
  width: 58px; height: 58px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, #fff 92%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, #000 28%, transparent);
}
.kn-street-food-donation__video-play span::before {
  content: "";
  width: 0; height: 0;
  border-style: solid;
  border-width: 10px 0 10px 16px;
  border-color: transparent transparent transparent #111;
  margin-left: 3px;
}
.kn-street-food-donation__video-fallback {
  margin: 8px 0 0; font-size: .9rem;
}
#kn-mirror-section-template--street_food_fund__stats .container-narrow {
  max-width: 48rem;
  margin-left: auto;
  margin-right: auto;
}
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

/** Tema kabuğu — stiller head yerine MainContent içinde */
export function streetFoodFundPageStyleTag(): string {
  return `<style id="${STYLE_ID}">${STREET_FOOD_PAGE_STYLES}</style>`;
}
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
  style.textContent = STREET_FOOD_PAGE_STYLES;
  doc.head.appendChild(style);
}

function renderStatsHtml(payload: StreetFoodFundPublicPayload, locale: string): string {
  const pct = Math.max(0, Math.min(100, payload.progressPercent));
  const cycleLabel = locale === "en" ? "Current piggy bank" : "Bu kumbara döngüsü";
  const countsLabel =
    locale === "en"
      ? `Collected food: ${payload.collectedLabel} / ${payload.targetLabel}`
      : `Toplanan Mama: ${payload.collectedLabel} / ${payload.targetLabel}`;
  const impact = payload.impactLabel?.trim()
    ? `<p class="kn-street-food-stats__impact">${escHtml(payload.impactLabel)}</p>`
    : "";
  return `<div class="kn-street-food-stats__card">
  <div class="kn-street-food-stats__emoji">🐾</div>
  <h2 class="kn-street-food-stats__title">${escHtml(payload.title)}</h2>
  <p class="kn-street-food-stats__slogan">${escHtml(payload.slogan)}</p>
  <p class="kn-street-food-stats__cycle">${escHtml(cycleLabel)}</p>
  <p class="kn-street-food-stats__counts">${escHtml(countsLabel)}</p>
  <div class="kn-street-food-stats__track" aria-hidden="true"><div class="kn-street-food-stats__fill" style="width:${pct}%"></div></div>
  <p class="kn-street-food-stats__sub">${escHtml(payload.counterSubtext)}</p>
  ${impact}
</div>`;
}

function formatDonationDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR");
  } catch {
    return iso;
  }
}

function renderDonationVideoHtml(videoUrl: string, locale: string): string {
  const videoLabel = locale === "en" ? "Watch donation video" : "Bağış videosunu izle";
  const thumb = youtubeThumbnailUrl(videoUrl);
  if (thumb) {
    return `<a class="kn-street-food-donation__video" href="${escHtml(videoUrl)}" target="_blank" rel="noreferrer" aria-label="${escHtml(videoLabel)}">
  <img src="${escHtml(thumb)}" alt="" loading="lazy" decoding="async">
  <span class="kn-street-food-donation__video-play" aria-hidden="true"><span></span></span>
</a>`;
  }
  return `<p class="kn-street-food-donation__video-fallback"><a href="${escHtml(videoUrl)}" target="_blank" rel="noreferrer">${videoLabel}</a></p>`;
}

function renderDonationsHtml(donations: StreetFoodDonationPublic[], locale: string): string {
  if (!donations.length) return "";
  const title = locale === "en" ? "Donation log" : "Bağış günlüğü";
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
      const video = d.videoUrl?.trim() ? renderDonationVideoHtml(d.videoUrl, locale) : "";
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

  const locale = readShopLocaleFromDocument(doc);

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
