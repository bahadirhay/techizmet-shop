/** Mirror HTML — il / ilçe / mahalle seçim alanları */

import { splitSavedLine1 } from "@/lib/tr-address/format";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type MirrorTrAddressInitial = {
  city?: string;
  district?: string;
  line1?: string;
  postalCode?: string;
};

export function mirrorTrAddressFieldsHtml(
  tr: boolean,
  initial?: MirrorTrAddressInitial,
): string {
  const { neighborhood, streetLine } = splitSavedLine1(initial?.line1 ?? "");
  const city = esc(initial?.city ?? "");
  const district = esc(initial?.district ?? "");
  const hood = esc(neighborhood);
  const street = esc(streetLine);
  const postal = esc(initial?.postalCode ?? "");

  return `<div class="kn-tr-address input-form--fields" data-kn-tr-address>
  <div class="form-group">
    <label>${tr ? "İl *" : "City *"}</label>
    <select class="form-control kn-tr-address-select" name="city" data-kn-tr-city required>
      <option value="">${tr ? "İl seçin" : "Select city"}</option>
      ${city ? `<option value="${city}" selected>${city}</option>` : ""}
    </select>
  </div>
  <div class="form-group">
    <label>${tr ? "İlçe *" : "District *"}</label>
    <select class="form-control kn-tr-address-select" name="district" data-kn-tr-district required${city ? "" : " disabled"}>
      <option value="">${tr ? "İlçe seçin" : "Select district"}</option>
      ${district ? `<option value="${district}" selected>${district}</option>` : ""}
    </select>
  </div>
  <div class="form-group">
    <label>${tr ? "Mahalle *" : "Neighborhood *"}</label>
    <select class="form-control kn-tr-address-select" name="neighborhood" data-kn-tr-neighborhood required${district ? "" : " disabled"}>
      <option value="">${tr ? "Mahalle seçin" : "Select neighborhood"}</option>
      ${hood ? `<option value="${hood}" selected>${hood}</option>` : ""}
    </select>
  </div>
  <div class="form-group">
    <label>${tr ? "Posta kodu" : "Postal code"}</label>
    <input class="form-control" name="postalCode" data-kn-tr-postal readonly tabindex="-1" aria-readonly="true" placeholder="${tr ? "Mahalle seçilince dolar" : "Fills when neighborhood is selected"}" value="${postal}" />
  </div>
  <div class="form-group kn-form-full">
    <label>${tr ? "Adres (sokak, bina no, daire) *" : "Street address *"}</label>
    <textarea class="form-control" name="line1" data-kn-tr-line rows="2" required placeholder="${tr ? "Örn. 57/1 Sokak No:5/1a" : "e.g. 12 Main St Apt 4"}">${street}</textarea>
  </div>
</div>`;
}
