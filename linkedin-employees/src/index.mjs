#!/usr/bin/env node
/**
 * Bir firmanın LinkedIn çalışanlarını Apify (harvestapi) üzerinden listeler.
 *
 * Aşama 1: harvestapi/linkedin-company-employees  -> çalışan profillerini bulur
 * Aşama 2 (--enrich): harvestapi/linkedin-profile-scraper -> bulunan profilleri detaylandırır
 *   (profile-scraper yalnızca profil URL'si/ID'si alır; firmadan çalışan listesi çıkarmaz,
 *    bu yüzden liste aşaması ayrı bir actor ile yapılır.)
 *
 * Kullanım:
 *   APIFY_TOKEN=xxx node src/index.mjs \
 *     --company https://www.linkedin.com/company/microsoft/ --max 100 --out out.csv
 *
 * Seçenekler:
 *   --company <url|ad>      (tekrarlanabilir) Firma LinkedIn URL'si veya adı
 *   --max <n>               Firma başına en fazla çalışan (varsayılan 50)
 *   --title <metin>         Unvan filtresi (tekrarlanabilir)
 *   --location <metin>      Konum filtresi (tekrarlanabilir)
 *   --enrich                Bulunan profilleri profile-scraper ile zenginleştir
 *   --out <dosya>           .csv veya .json (varsayılan: stdout'a JSON)
 *   --list-actor <id>       Varsayılan harvestapi~linkedin-company-employees
 *   --profile-actor <id>    Varsayılan harvestapi~linkedin-profile-scraper
 *   --input-json <json>     Liste actor'ına ek/override input (actor şeması değişirse)
 *
 * Not: Input alan adları actor sayfasındaki şemaya göre doğrulanmalıdır
 * (https://apify.com/harvestapi/linkedin-company-employees); --input-json ile ezilebilir.
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const API = "https://api.apify.com/v2";

const { values: args } = parseArgs({
  options: {
    company: { type: "string", multiple: true },
    max: { type: "string", default: "50" },
    title: { type: "string", multiple: true },
    location: { type: "string", multiple: true },
    enrich: { type: "boolean", default: false },
    out: { type: "string" },
    "list-actor": { type: "string", default: "harvestapi~linkedin-company-employees" },
    "profile-actor": { type: "string", default: "harvestapi~linkedin-profile-scraper" },
    "input-json": { type: "string" },
  },
});

const token = process.env.APIFY_TOKEN;
if (!token) fail("APIFY_TOKEN ortam değişkeni gerekli.");
if (!args.company?.length) fail("En az bir --company verin.");

function fail(msg) {
  console.error(`Hata: ${msg}`);
  process.exit(1);
}

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}token=${token}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) fail(`${init.method ?? "GET"} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

/** Actor'ı çalıştırır, bitmesini bekler, dataset öğelerini döner. */
async function runActor(actorId, input) {
  const { data: run } = await api(`/acts/${actorId}/runs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  console.error(`[${actorId}] run ${run.id} başladı`);

  let state = run;
  while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(state.status)) {
    await new Promise((r) => setTimeout(r, 5000));
    state = (await api(`/actor-runs/${run.id}`)).data;
    console.error(`[${actorId}] durum: ${state.status}`);
  }
  if (state.status !== "SUCCEEDED") fail(`${actorId} run ${state.status} ile bitti (${run.id}).`);

  const items = [];
  for (let offset = 0; ; ) {
    const res = await fetch(
      `${API}/datasets/${state.defaultDatasetId}/items?token=${token}&format=json&clean=true&limit=1000&offset=${offset}`,
    );
    if (!res.ok) fail(`dataset okunamadı: ${res.status}`);
    const page = await res.json();
    items.push(...page);
    if (page.length < 1000) break;
    offset += page.length;
  }
  return items;
}

const extra = args["input-json"] ? JSON.parse(args["input-json"]) : {};

// Aşama 1: çalışan listesi
let people = await runActor(args["list-actor"], {
  companies: args.company,
  maxItems: Number(args.max),
  ...(args.title && { jobTitles: args.title }),
  ...(args.location && { locations: args.location }),
  ...extra,
});
console.error(`${people.length} çalışan bulundu.`);

// Aşama 2: profile-scraper ile zenginleştirme
if (args.enrich && people.length) {
  const urls = people.map((p) => p.linkedinUrl ?? p.url ?? p.profileUrl).filter(Boolean);
  const detailed = await runActor(args["profile-actor"], { urls });
  const byUrl = new Map(detailed.map((d) => [d.linkedinUrl ?? d.url, d]));
  people = people.map((p) => ({ ...p, ...(byUrl.get(p.linkedinUrl ?? p.url ?? p.profileUrl) ?? {}) }));
}

// Çıktı
const rows = people.map((p) => ({
  firstName: p.firstName ?? "",
  lastName: p.lastName ?? "",
  headline: p.headline ?? p.position ?? "",
  location: typeof p.location === "object" ? (p.location?.linkedinText ?? "") : (p.location ?? ""),
  url: p.linkedinUrl ?? p.url ?? p.profileUrl ?? "",
}));

const csvCell = (v) => `"${String(v).replaceAll('"', '""')}"`;
const toCsv = (r) =>
  [Object.keys(r[0] ?? {}).join(","), ...r.map((x) => Object.values(x).map(csvCell).join(","))].join("\n");

if (args.out?.endsWith(".csv")) writeFileSync(args.out, toCsv(rows), "utf8");
else if (args.out) writeFileSync(args.out, JSON.stringify(args.enrich ? people : rows, null, 2), "utf8");
else console.log(JSON.stringify(rows, null, 2));
if (args.out) console.error(`Yazıldı: ${args.out}`);
