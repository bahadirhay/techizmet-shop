/** Mirror iframe — sokak dostları mama fonu üst şeridi */

const STYLE_ID = "kn-street-food-bar-styles";
const BAR_ID = "kn-street-food-bar";
const API_PATH = "/api/vitrin/street-food-fund";

export type StreetFoodBarPayload = {
  enabled: boolean;
  title?: string;
  slogan?: string;
  counterSubtext?: string;
  detailHref?: string;
  collectedLabel?: string;
  targetLabel?: string;
  progressPercent?: number;
};

function ensureStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#${BAR_ID} {
  position: relative;
  z-index: 10050;
  width: 100%;
  background: linear-gradient(90deg, #1f4d3a 0%, #2d6a4f 55%, #40916c 100%);
  color: #fff;
  font-size: 12px;
  line-height: 1.35;
  box-shadow: 0 1px 0 rgba(255,255,255,0.08);
}
#${BAR_ID}[hidden] { display: none !important; }
.kn-street-food-bar__inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 8px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.kn-street-food-bar__title {
  font-weight: 700;
  white-space: nowrap;
}
.kn-street-food-bar__meter {
  flex: 1 1 180px;
  min-width: 140px;
}
.kn-street-food-bar__counts {
  font-weight: 600;
  white-space: nowrap;
}
.kn-street-food-bar__track {
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.25);
  margin-top: 4px;
  overflow: hidden;
}
.kn-street-food-bar__fill {
  height: 100%;
  border-radius: 999px;
  background: #b7e4c7;
  transition: width 0.35s ease;
}
.kn-street-food-bar__sub {
  opacity: 0.92;
  font-size: 11px;
}
.kn-street-food-bar__link {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
}
@media (max-width: 640px) {
  #${BAR_ID} { font-size: 11px; }
  .kn-street-food-bar__inner { padding: 7px 12px; }
}
`;
  doc.head.appendChild(style);
}

function renderBarHtml(payload: StreetFoodBarPayload): string {
  const pct = Math.max(0, Math.min(100, payload.progressPercent ?? 0));
  return `<div class="kn-street-food-bar__inner">
  <div class="kn-street-food-bar__title">🐾 ${payload.title ?? ""}</div>
  <div class="kn-street-food-bar__meter">
    <div class="kn-street-food-bar__counts">Toplanan Mama: ${payload.collectedLabel ?? "0 kg"} / ${payload.targetLabel ?? "50 kg"}</div>
    <div class="kn-street-food-bar__track" aria-hidden="true"><div class="kn-street-food-bar__fill" style="width:${pct}%"></div></div>
  </div>
  <div class="kn-street-food-bar__sub">${payload.counterSubtext ?? ""}</div>
  <a class="kn-street-food-bar__link" href="${payload.detailHref ?? "/sokak-dostlari"}">Detaylar</a>
</div>`;
}

export function applyStreetFoodFundBar(doc: Document, payload: StreetFoodBarPayload | null) {
  ensureStyles(doc);
  let bar = doc.getElementById(BAR_ID);
  if (!payload?.enabled) {
    if (bar) bar.setAttribute("hidden", "");
    return;
  }
  if (!bar) {
    bar = doc.createElement("div");
    bar.id = BAR_ID;
    doc.body.prepend(bar);
  }
  bar.removeAttribute("hidden");
  bar.innerHTML = renderBarHtml(payload);
}

async function fetchPayload(): Promise<StreetFoodBarPayload | null> {
  try {
    const res = await fetch(API_PATH, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    return (await res.json()) as StreetFoodBarPayload;
  } catch {
    return null;
  }
}

export function installMirrorStreetFoodBar(doc: Document) {
  if (doc.documentElement.getAttribute("data-kn-street-food-bar") === "1") return;
  doc.documentElement.setAttribute("data-kn-street-food-bar", "1");

  const refresh = async () => {
    const payload = await fetchPayload();
    applyStreetFoodFundBar(doc, payload);
  };

  void refresh();
  const win = doc.defaultView;
  if (!win) return;
  const key = "__knStreetFoodBarTimer";
  const existing = (win as unknown as Record<string, number | undefined>)[key];
  if (existing) win.clearInterval(existing);
  (win as unknown as Record<string, number>)[key] = win.setInterval(() => void refresh(), 60_000);
}
