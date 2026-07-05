/** Mirror iframe — il / ilçe / mahalle cascade (vanilla) */

import { fetchTrAddressJson } from "@/lib/tr-address/client-fetch";

type CityRow = { code: string; name: string };

function fillSelect(
  sel: HTMLSelectElement,
  items: string[],
  placeholder: string,
  selected?: string,
) {
  sel.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  sel.appendChild(ph);
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    if (selected && item === selected) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.disabled = items.length === 0 && !selected;
}

function formatLine1(neighborhood: string, street: string): string {
  const hood = neighborhood.trim();
  const line = street.trim();
  if (hood && line) return `${hood}, ${line}`;
  return hood || line;
}

async function loadPostal(
  city: string,
  district: string,
  postalInput: HTMLInputElement | null,
) {
  if (!postalInput || !city || !district) return;
  const j = await fetchTrAddressJson<{ postalCode?: string }>(
    `/api/address/tr/postal-code?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`,
  );
  const code = j?.postalCode?.trim() ?? "";
  if (code) postalInput.value = code;
}

async function initTrAddressBlock(block: Element) {
  if (block.getAttribute("data-kn-tr-bound") === "1") return;
  block.setAttribute("data-kn-tr-bound", "1");

  const citySel = block.querySelector<HTMLSelectElement>("[data-kn-tr-city]");
  const distSel = block.querySelector<HTMLSelectElement>("[data-kn-tr-district]");
  const hoodSel = block.querySelector<HTMLSelectElement>("[data-kn-tr-neighborhood]");
  const postalInput = block.querySelector<HTMLInputElement>("[data-kn-tr-postal]");
  if (!citySel || !distSel || !hoodSel) return;

  const citySelect = citySel;
  const distSelect = distSel;
  const hoodSelect = hoodSel;
  const tr = document.documentElement.lang?.toLowerCase().startsWith("tr");
  const savedCity = citySelect.value;
  const savedDistrict = distSelect.value;
  const savedHood = hoodSelect.value;

  const citiesRes = await fetchTrAddressJson<{ cities: CityRow[] }>("/api/address/tr/cities");
  const cities = citiesRes?.cities ?? [];
  fillSelect(
    citySelect,
    cities.map((c) => c.name),
    tr ? "İl seçin" : "Select city",
    savedCity || undefined,
  );

  async function onCityChange(city: string, keepDistrict?: string, keepHood?: string) {
    fillSelect(distSelect, [], tr ? "Yükleniyor…" : "Loading…");
    fillSelect(hoodSelect, [], tr ? "Mahalle seçin" : "Select neighborhood");
    hoodSelect.disabled = true;
    if (postalInput) postalInput.value = "";
    if (!city) {
      distSelect.disabled = true;
      return;
    }
    const j = await fetchTrAddressJson<{ districts: string[] }>(
      `/api/address/tr/districts?city=${encodeURIComponent(city)}`,
    );
    const districts = j?.districts ?? [];
    fillSelect(distSelect, districts, tr ? "İlçe seçin" : "Select district", keepDistrict);
    distSelect.disabled = districts.length === 0;
    if (keepDistrict) await onDistrictChange(city, keepDistrict, keepHood);
  }

  async function onDistrictChange(city: string, district: string, keepHood?: string) {
    fillSelect(hoodSelect, [], tr ? "Yükleniyor…" : "Loading…");
    if (postalInput) postalInput.value = "";
    if (!city || !district) {
      hoodSelect.disabled = true;
      return;
    }
    const j = await fetchTrAddressJson<{ neighborhoods: string[] }>(
      `/api/address/tr/neighborhoods?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`,
    );
    const neighborhoods = j?.neighborhoods ?? [];
    fillSelect(hoodSelect, neighborhoods, tr ? "Mahalle seçin" : "Select neighborhood", keepHood);
    hoodSelect.disabled = neighborhoods.length === 0;
    if (keepHood) await loadPostal(city, district, postalInput);
  }

  citySelect.addEventListener("change", () => {
    void onCityChange(citySelect.value);
  });

  distSelect.addEventListener("change", () => {
    void onDistrictChange(citySelect.value, distSelect.value);
  });

  hoodSelect.addEventListener("change", () => {
    void loadPostal(citySelect.value, distSelect.value, postalInput);
  });

  if (savedCity) await onCityChange(savedCity, savedDistrict || undefined, savedHood || undefined);
}

export function mirrorTrAddressBodyFromForm(form: HTMLFormElement) {
  const block = form.querySelector("[data-kn-tr-address]");
  const hoodEl = block?.querySelector<HTMLSelectElement>("[data-kn-tr-neighborhood]");
  const lineEl = block?.querySelector<HTMLTextAreaElement>("[data-kn-tr-line]");
  const cityEl = block?.querySelector<HTMLSelectElement>("[data-kn-tr-city]");
  const distEl = block?.querySelector<HTMLSelectElement>("[data-kn-tr-district]");
  const postalEl = block?.querySelector<HTMLInputElement>("[data-kn-tr-postal]");

  const neighborhood = hoodEl?.value.trim() ?? "";
  const street = lineEl?.value.trim() ?? "";

  return {
    city: cityEl?.value.trim() ?? "",
    district: distEl?.value.trim() ?? "",
    neighborhood,
    line1: formatLine1(neighborhood, street),
    postalCode: postalEl?.value.trim() ?? "",
  };
}

export function bindMirrorTrAddressFields(root: ParentNode) {
  root.querySelectorAll("[data-kn-tr-address]").forEach((block) => {
    void initTrAddressBlock(block);
  });
}
