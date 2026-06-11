/** Techizmet Shop — hesap paneli HTML + iframe etkileşim köprüsü */

import { mirrorTrAddressFieldsHtml } from "@/lib/mirror-tr-address-markup";

export type MirrorAccountAddress = {
  id: string;
  label: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  city: string;
  district: string;
  line1: string;
  postalCode: string | null;
  isDefault: boolean;
};

export type MirrorAccountOrder = {
  id: string;
  orderNumber: string;
  statusLabel: string;
  paymentStatusLabel: string;
  paymentMethodLabel: string;
  createdAt: string;
  trackingNumber: string | null;
  carrierName: string | null;
  totalLabel: string;
  canCancel: boolean;
  canRefund: boolean;
};

export type MirrorAccountFavorite = {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceLabel: string;
  compareLabel?: string | null;
};

export type MirrorAccountDashboardPayload = {
  name: string;
  email: string;
  memberGroup: { name: string; discountPercent: number } | null;
  profile: { firstName: string | null; lastName: string | null; phone: string | null };
  addresses: MirrorAccountAddress[];
  orders: MirrorAccountOrder[];
  favorites: MirrorAccountFavorite[];
  hasPassword: boolean;
  locale: "tr" | "en";
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Hesap paneli — sekmeli düzen */
export const ACCOUNT_DASHBOARD_CSS = `<style id="kn-account-dashboard-css">
.account-page .main-account--content {
  max-width: 960px;
  margin: 0 auto;
  padding: 8px 20px 56px;
}
.kn-account-dashboard__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 24px;
}
.kn-account-dashboard__head h2 {
  margin: 0 0 4px;
}
.kn-account-dashboard__email {
  color: var(--text_medium, #6b6b6b);
  font-size: 0.9rem;
}
.kn-account-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border_color, #e5e2dd);
}
.kn-account-tab-radio {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.kn-account-dashboard .kn-account-panels > .kn-account-panel {
  display: none !important;
}
#kn-acc-tab-profile:checked ~ .kn-account-panels [data-kn-account-panel="profile"],
#kn-acc-tab-orders:checked ~ .kn-account-panels [data-kn-account-panel="orders"],
#kn-acc-tab-addresses:checked ~ .kn-account-panels [data-kn-account-panel="addresses"],
#kn-acc-tab-favorites:checked ~ .kn-account-panels [data-kn-account-panel="favorites"],
#kn-acc-tab-password:checked ~ .kn-account-panels [data-kn-account-panel="password"] {
  display: block !important;
}
#kn-acc-tab-profile:checked ~ .kn-account-tabs label[for="kn-acc-tab-profile"],
#kn-acc-tab-orders:checked ~ .kn-account-tabs label[for="kn-acc-tab-orders"],
#kn-acc-tab-addresses:checked ~ .kn-account-tabs label[for="kn-acc-tab-addresses"],
#kn-acc-tab-favorites:checked ~ .kn-account-tabs label[for="kn-acc-tab-favorites"],
#kn-acc-tab-password:checked ~ .kn-account-tabs label[for="kn-acc-tab-password"] {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #fff;
}
.kn-account-tab {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 500;
  border-radius: 999px;
  border: 1px solid var(--border_color, #e5e2dd);
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
  pointer-events: auto;
  -webkit-appearance: none;
  appearance: none;
  font-family: inherit;
  user-select: none;
}
.kn-account-tab:hover {
  background: #f7f7f7;
}
.kn-account-tab.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #fff;
}
.kn-account-panel[hidden] {
  display: none !important;
}
.kn-account-dashboard .account--form {
  max-width: 100%;
}
.kn-account-dashboard .input-form--fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
  row-gap: 0;
}
.kn-account-dashboard .form-group {
  margin-bottom: 16px;
}
.kn-account-dashboard .form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
}
.kn-account-dashboard .form-control {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.kn-tr-address-select,
.kn-account-dashboard .kn-tr-address-select {
  cursor: pointer;
  min-height: 46px;
  padding-right: 2.25rem;
  background-color: var(--form_background, #fff);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%231a1a1a' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  -webkit-appearance: none;
  appearance: none;
}
.kn-account-dashboard .kn-tr-address [data-kn-tr-postal] {
  background: var(--body_alternate_background, #f7f5f2);
  cursor: default;
}
.kn-account-dashboard .button.medium-button {
  width: auto;
  max-width: 100%;
  margin-top: 4px;
}
.kn-account-dashboard .kn-account-msg {
  margin: 8px 0 12px;
  font-size: 0.9rem;
}
.kn-account-dashboard .address--list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.kn-account-dashboard .order--history {
  overflow-x: auto;
}
.kn-account-dashboard .kn-account-address-form,
.kn-account-dashboard .kn-account-address-edit-form {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px dashed var(--border_color, #e5e2dd);
}
.kn-account-dashboard .kn-account-address-edit-form[hidden] {
  display: none !important;
}
.kn-account-dashboard .kn-account-address-edit-form:not([hidden]) {
  display: block !important;
}
.kn-account-dashboard .kn-addr-btn {
  pointer-events: auto !important;
  cursor: pointer !important;
}
.kn-account-dashboard .address--card {
  border: 1px solid var(--border_color, #e5e2dd);
  border-radius: 12px;
  padding: 16px;
  background: #fff;
}
.kn-account-dashboard .address--footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin-top: 14px;
}
.kn-account-dashboard .kn-addr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.2;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.22);
  background: #fff;
  color: #1a1a1a !important;
  cursor: pointer;
  text-decoration: none !important;
}
.kn-account-dashboard .kn-addr-btn:hover {
  background: #f3f3f3;
}
.kn-account-dashboard .kn-addr-btn--danger {
  border-color: #dc2626;
  color: #dc2626 !important;
}
.kn-account-dashboard .kn-addr-btn--danger:hover {
  background: #fef2f2;
}
.kn-account-dashboard .payment--status {
  display: inline-block;
  margin-right: 6px;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  background: #1a1a1a;
  color: #fff;
}
.kn-account-dashboard .kn-fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
.kn-account-dashboard .kn-fav-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--body_alternate_background, #f7f5f2);
  border-radius: 12px;
  border: 1px solid var(--border_color, #e5e2dd);
}
.kn-account-dashboard .kn-fav-card__media {
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
}
.kn-account-dashboard .kn-fav-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.kn-account-dashboard .kn-fav-card__title {
  font-weight: 600;
  text-decoration: none;
  color: inherit;
}
.kn-account-dashboard .kn-fav-empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--text_medium, #6b6b6b);
}
.kn-account-dashboard .account--text-info.text-center {
  margin-top: 32px;
}
#kn-account-welcome-inline {
  display: none;
}
@media (max-width: 767px) {
  .kn-account-dashboard .input-form--fields,
  .kn-account-dashboard .address--list {
    grid-template-columns: 1fr;
  }
  .account-page .main-account--content {
    padding-left: 16px;
    padding-right: 16px;
  }
  .kn-account-tabs {
    gap: 6px;
  }
  .kn-account-tab {
    padding: 8px 14px;
    font-size: 0.85rem;
  }
}
</style>`;

export function buildAccountWelcomeHtml(p: Pick<MirrorAccountDashboardPayload, "name" | "locale">): string {
  const tr = p.locale === "tr";
  return tr
    ? `Hoş geldiniz, <strong>${esc(p.name)}</strong>`
    : `Welcome, <strong>${esc(p.name)}</strong>`;
}

function addressEditFormHtml(a: MirrorAccountAddress, tr: boolean): string {
  return `<form class="account--form kn-account-address-edit-form" data-kn-addr-edit-form="${esc(a.id)}" hidden>
    <div class="form-group"><label>${tr ? "Etiket" : "Label"}</label><input class="form-control" name="label" value="${esc(a.label ?? "")}" /></div>
    ${mirrorTrAddressFieldsHtml(tr, {
      city: a.city,
      district: a.district,
      line1: a.line1,
      postalCode: a.postalCode ?? "",
    })}
    <div class="form-group kn-account-checkbox"><label><input type="checkbox" name="isDefault"${a.isDefault ? " checked" : ""} /> ${tr ? "Varsayılan adres" : "Default address"}</label></div>
    <p class="kn-account-msg" data-kn-addr-edit-msg hidden></p>
    <button type="submit" class="button medium-button">${tr ? "Kaydet" : "Save"}</button>
    <button type="button" class="button kn-addr-btn" data-kn-addr-cancel="${esc(a.id)}">${tr ? "İptal" : "Cancel"}</button>
  </form>`;
}

function favoritesGridHtml(favorites: MirrorAccountFavorite[], tr: boolean): string {
  if (!favorites.length) {
    const empty = tr ? "Henüz favori ürününüz yok." : "You have no favorites yet.";
    const shop = tr ? "Alışverişe devam" : "Continue shopping";
    return `<div class="kn-fav-empty"><p class="text-medium">${esc(empty)}</p><p style="margin-top:16px"><a href="/collections/all" class="button medium-button">${esc(shop)}</a></p></div>`;
  }
  const remove = tr ? "Favorilerden çıkar" : "Remove";
  return `<div class="kn-fav-grid">${favorites
    .map((item) => {
      const href = `/products/${encodeURIComponent(item.slug)}`;
      const img = item.imageUrl
        ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" width="400" height="400">`
        : "";
      return `<article class="kn-fav-card" data-kn-fav-card data-product-id="${esc(item.productId)}">
        <a href="${href}" class="kn-fav-card__media">${img}</a>
        <div>
          <a href="${href}" class="kn-fav-card__title product--title">${esc(item.title)}</a>
          <p class="kn-fav-card__price">
            <span class="product--actual-price">${esc(item.priceLabel)}</span>${item.compareLabel ? `<span class="product--cut-price line-through">${esc(item.compareLabel)}</span>` : ""}
          </p>
        </div>
        <button type="button" class="button kn-addr-btn" data-kn-fav-remove data-product-id="${esc(item.productId)}">${esc(remove)}</button>
      </article>`;
    })
    .join("")}</div>`;
}

export function buildAccountDashboardMarkup(p: MirrorAccountDashboardPayload): string {
  const tr = p.locale === "tr";
  const welcome = buildAccountWelcomeHtml(p);

  const member = p.memberGroup
    ? tr
      ? `<p class="text-medium kn-account-member">Üye grubunuz: <strong>${esc(p.memberGroup.name)}</strong> — %${p.memberGroup.discountPercent} indirim</p>`
      : `<p class="text-medium kn-account-member">Member group: <strong>${esc(p.memberGroup.name)}</strong> — ${p.memberGroup.discountPercent}% off</p>`
    : "";

  const tabs = [
    { id: "profile", label: tr ? "Profil" : "Profile" },
    { id: "orders", label: tr ? "Siparişlerim" : "Orders" },
    { id: "addresses", label: tr ? "Adres Bilgilerim" : "Addresses" },
    { id: "favorites", label: tr ? "Favorilerim" : "Favorites" },
    { id: "password", label: tr ? "Şifre Değiştir" : "Change password" },
  ];

  const tabRadios = tabs
    .map(
      (t, i) =>
        `<input type="radio" name="kn-acc-tab" id="kn-acc-tab-${t.id}" class="kn-account-tab-radio"${i === 0 ? " checked" : ""} />`,
    )
    .join("");
  const tabNav = tabs
    .map(
      (t, i) =>
        `<label for="kn-acc-tab-${t.id}" role="tab" class="kn-account-tab${i === 0 ? " active" : ""}" data-kn-account-tab="${t.id}">${esc(t.label)}</label>`,
    )
    .join("");

  const addressCards = p.addresses
    .map((a) => {
      const def = a.isDefault
        ? `<span class="payment--status">${tr ? "Varsayılan" : "Default"}</span> `
        : "";
      return `<div class="address--card" data-address-id="${esc(a.id)}">
        <div class="address--card-item">
          <div class="address--head"><strong>${def}${esc(a.label ?? (tr ? "Adres" : "Address"))}</strong></div>
          <div class="address--body"><address>
            <p>${esc(a.line1)}</p>
            <p>${esc(a.district)} / ${esc(a.city)}</p>
          </address></div>
          <div class="address--footer">
            <button type="button" class="button kn-addr-btn" data-kn-addr-edit="${esc(a.id)}">${tr ? "Düzenle" : "Edit"}</button>
            ${!a.isDefault ? `<button type="button" class="button kn-addr-btn" data-kn-addr-default="${esc(a.id)}">${tr ? "Varsayılan yap" : "Set default"}</button>` : ""}
            <button type="button" class="button kn-addr-btn kn-addr-btn--danger" data-kn-addr-delete="${esc(a.id)}">${tr ? "Sil" : "Delete"}</button>
          </div>
        </div>
        ${addressEditFormHtml(a, tr)}
      </div>`;
    })
    .join("");

  const orderRows = p.orders.length
    ? p.orders
        .map((o) => {
          const track = o.trackingNumber
            ? `<br/><small>${esc(o.carrierName ?? "")} ${esc(o.trackingNumber)}</small>`
            : "";
          const actions = [
            o.canCancel
              ? `<button type="button" class="button kn-addr-btn" data-kn-order-cancel="${esc(o.orderNumber)}">${tr ? "İptal" : "Cancel"}</button>`
              : "",
            o.canRefund
              ? `<button type="button" class="button kn-addr-btn" data-kn-order-refund="${esc(o.orderNumber)}">${tr ? "İade" : "Refund"}</button>`
              : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `<tr>
            <td><a href="/orders/track?order=${encodeURIComponent(o.orderNumber)}">${esc(o.orderNumber)}</a>${track}</td>
            <td>${new Date(o.createdAt).toLocaleDateString(tr ? "tr-TR" : "en-US")}</td>
            <td>${esc(o.statusLabel)}</td>
            <td>${esc(o.totalLabel)}</td>
            <td>${actions}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="5">${tr ? "Henüz sipariş yok." : "No orders yet."}</td></tr>`;

  const passwordPanel = p.hasPassword
    ? `<form class="account--form" data-kn-password-form>
    <div class="form-group"><label for="kn-pw-current">${tr ? "Mevcut şifre" : "Current password"}</label><input class="form-control" id="kn-pw-current" name="currentPassword" type="password" autocomplete="current-password" required /></div>
    <div class="form-group"><label for="kn-pw-new">${tr ? "Yeni şifre" : "New password"}</label><input class="form-control" id="kn-pw-new" name="newPassword" type="password" autocomplete="new-password" minlength="8" required /></div>
    <div class="form-group"><label for="kn-pw-confirm">${tr ? "Yeni şifre (tekrar)" : "Confirm new password"}</label><input class="form-control" id="kn-pw-confirm" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required /></div>
    <p class="kn-account-msg" data-kn-password-msg hidden></p>
    <button type="submit" class="button medium-button">${tr ? "Şifreyi güncelle" : "Update password"}</button>
  </form>`
    : `<p class="text-medium">${tr ? "Hesabınızda şifre tanımlı değil." : "No password set on this account."}</p>`;

  return `<div class="kn-account-dashboard" data-kn-account-dashboard="1">
  <p id="kn-account-welcome-inline" class="account--text-info" hidden>${welcome}</p>
  <div class="kn-account-dashboard__head">
    <div>
      <h2 class="heading-font h4">${tr ? "Hesabım" : "My account"}</h2>
      ${p.email ? `<p class="kn-account-dashboard__email">${esc(p.email)}</p>` : ""}
      ${member}
    </div>
    <button type="button" class="button medium-button" data-kn-logout>${tr ? "Çıkış yap" : "Log out"}</button>
  </div>
  ${tabRadios}
  <nav class="kn-account-tabs" aria-label="${tr ? "Hesap menüsü" : "Account menu"}">${tabNav}</nav>
  <div class="kn-account-panels">
    <section class="kn-account-panel" data-kn-account-panel="profile">
      <h3 class="heading-font h5">${tr ? "Profil bilgileri" : "Profile details"}</h3>
      <form class="account--form" data-kn-profile-form>
        <div class="input-form--fields">
          <div class="form-group">
            <label for="kn-profile-first">${tr ? "Ad" : "First name"}</label>
            <input class="form-control" id="kn-profile-first" name="firstName" value="${esc(p.profile.firstName ?? "")}" autocomplete="given-name" />
          </div>
          <div class="form-group">
            <label for="kn-profile-last">${tr ? "Soyad" : "Last name"}</label>
            <input class="form-control" id="kn-profile-last" name="lastName" value="${esc(p.profile.lastName ?? "")}" autocomplete="family-name" />
          </div>
        </div>
        <div class="form-group">
          <label for="kn-profile-phone">${tr ? "Telefon" : "Phone"}</label>
          <input class="form-control" id="kn-profile-phone" name="phone" value="${esc(p.profile.phone ?? "")}" autocomplete="tel" />
        </div>
        <p class="kn-account-msg" data-kn-profile-msg hidden></p>
        <button type="submit" class="button medium-button">${tr ? "Profili kaydet" : "Save profile"}</button>
      </form>
    </section>
    <section class="kn-account-panel" data-kn-account-panel="orders">
      <h3 class="heading-font h5">${tr ? "Siparişlerim" : "Order history"}</h3>
      <div class="order--history">
        <table width="100%">
          <thead><tr>
            <th>${tr ? "Sipariş" : "Order"}</th>
            <th>${tr ? "Tarih" : "Date"}</th>
            <th>${tr ? "Durum" : "Status"}</th>
            <th>${tr ? "Toplam" : "Total"}</th>
            <th></th>
          </tr></thead>
          <tbody>${orderRows}</tbody>
        </table>
      </div>
    </section>
    <section class="kn-account-panel" data-kn-account-panel="addresses">
      <h3 class="heading-font h5">${tr ? "Adres bilgilerim" : "My addresses"}</h3>
      <div class="address--list">${addressCards || `<p class="text-medium">${tr ? "Kayıtlı adres yok." : "No saved addresses."}</p>`}</div>
      <form class="account--form kn-account-address-form" data-kn-address-form>
        <h4 class="heading-font h6">${tr ? "Yeni adres" : "New address"}</h4>
        <p class="kn-account-msg" data-kn-address-form-msg hidden></p>
        <div class="form-group"><label for="kn-addr-label">${tr ? "Etiket" : "Label"}</label><input class="form-control" id="kn-addr-label" name="label" placeholder="${tr ? "Ev, İş…" : "Home, Work…"}" autocomplete="off" /></div>
        ${mirrorTrAddressFieldsHtml(tr)}
        <div class="form-group kn-account-checkbox"><label><input type="checkbox" name="isDefault" /> ${tr ? "Varsayılan adres" : "Default address"}</label></div>
        <button type="submit" class="button medium-button">${tr ? "Adres ekle" : "Add address"}</button>
      </form>
    </section>
    <section class="kn-account-panel" data-kn-account-panel="favorites">
      <h3 class="heading-font h5">${tr ? "Favorilerim" : "My favorites"}</h3>
      ${favoritesGridHtml(p.favorites, tr)}
    </section>
    <section class="kn-account-panel" data-kn-account-panel="password">
      <h3 class="heading-font h5">${tr ? "Şifre değiştir" : "Change password"}</h3>
      ${passwordPanel}
    </section>
  </div>
  <p class="account--text-info text-center kn-account-footer-links">
    <a href="/orders/track" class="text-underline">${tr ? "Misafir sipariş takip" : "Guest order tracking"}</a>
    · <a href="/collections/all" class="text-underline">${tr ? "Alışverişe devam" : "Continue shopping"}</a>
  </p>
</div>`;
}

export function injectAccountDashboardStyles(html: string): string {
  if (html.includes('id="kn-account-dashboard-css"')) return html;
  return html.replace(/<\/head>/i, `${ACCOUNT_DASHBOARD_CSS}</head>`);
}

export function injectAccountWelcomeBanner(html: string, welcomeHtml: string): string {
  if (!welcomeHtml) return html;
  const escWelcome = welcomeHtml;
  if (html.includes('id="kn-account-welcome"')) {
    return html.replace(
      /<p class="text-medium" id="kn-account-welcome">\s*<\/p>/,
      `<p class="text-medium" id="kn-account-welcome">${escWelcome}</p>`,
    );
  }
  return html;
}

export function injectAccountDashboardIntoMirrorHtml(html: string, markup: string): string {
  const rootRe = /<div class="main-account--content" id="kn-account-dashboard-root">\s*<\/div>/;
  if (rootRe.test(html)) {
    return html.replace(
      rootRe,
      `<div class="main-account--content" id="kn-account-dashboard-root">${markup}</div>`,
    );
  }
  return html.replace(
    'id="kn-account-dashboard-root"',
    `id="kn-account-dashboard-root">${markup}`,
  );
}

export function buildAccountDashboardBridgeScript(): string {
  return `(function(){
  function qs(s,r){return (r||document).querySelector(s);}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function tr(){return document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0;}
  function elFromEvent(e){var t=e.target;while(t){if(t instanceof Element)return t;if(t.parentElement)t=t.parentElement;else break;}return null;}
  function field(form,name){var el=form.querySelector('[name="'+name+'"]');return el?String(el.value||"").trim():"";}
  function chk(form,name){var el=form.querySelector('[name="'+name+'"]');return !!(el&&el.checked);}
  function msg(el,text,ok){if(!el)return;el.hidden=!text;el.textContent=text||"";el.style.color=ok?"#166534":"#b91c1c";}
  function welcomeName(first,last){return [first,last].filter(Boolean).join(" ").trim();}
  function setWelcome(name){var w=qs("#kn-account-welcome");if(!w||!name)return;w.innerHTML=(tr()?"Hoş geldiniz, ":"Welcome, ")+"<strong>"+name.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</strong>";}
  function resetNewAddressForm(form){if(!form)return;form.reset();var cb=form.querySelector('[name="isDefault"]');if(cb)cb.checked=false;}
  function hideAllAddrEditForms(except){qsa("[data-kn-addr-edit-form]").forEach(function(f){if(f!==except){f.hidden=true;f.setAttribute("hidden","");f.style.display="none";}});}
  function reloadDashboard(){try{var u=new URL(window.location.href);u.searchParams.set("_kn",String(Date.now()));window.location.replace(u.toString());}catch(e){window.location.reload();}}
  function showTab(name){
    if(!name)return;
    var radio=qs("#kn-acc-tab-"+name);if(radio)radio.checked=true;
    qsa("[data-kn-account-tab]").forEach(function(btn){
      var on=btn.getAttribute("data-kn-account-tab")===name;
      btn.classList.toggle("active",on);
      btn.setAttribute("aria-selected",on?"true":"false");
    });
    qsa("[data-kn-account-panel]").forEach(function(panel){
      var on=panel.getAttribute("data-kn-account-panel")===name;
      if(on){
        panel.removeAttribute("hidden");
        panel.style.display="";
      }else{
        panel.setAttribute("hidden","");
        panel.style.display="none";
      }
    });
    try{var u=new URL(window.location.href);u.searchParams.set("tab",name);window.history.replaceState(null,"",u.toString());}catch(e){}
  }
  function bindTabs(){
    qsa(".kn-account-tab-radio").forEach(function(radio){
      if(radio.dataset.knRadioBound)return;
      radio.dataset.knRadioBound="1";
      radio.addEventListener("change",function(){
        if(!radio.checked)return;
        var id=radio.id.replace(/^kn-acc-tab-/,"");
        if(id)showTab(id);
      });
    });
    qsa("[data-kn-account-tab]").forEach(function(btn){
      if(btn.dataset.knTabBound)return;
      btn.dataset.knTabBound="1";
      btn.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        var id=btn.getAttribute("data-kn-account-tab");
        if(id)showTab(id);
      });
    });
  }
  async function post(url,body){var r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body||{})});var j={};try{j=await r.json();}catch(e){}return {ok:r.ok,json:j};}
  async function patch(url,body){var r=await fetch(url,{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body||{})});var j={};try{j=await r.json();}catch(e){}return {ok:r.ok,json:j};}
  function addrBody(form){
    var block=form.querySelector("[data-kn-tr-address]");
    if(block){
      var hood=block.querySelector("[data-kn-tr-neighborhood]");
      var street=block.querySelector("[data-kn-tr-line]");
      var city=block.querySelector("[data-kn-tr-city]");
      var dist=block.querySelector("[data-kn-tr-district]");
      var postal=block.querySelector("[data-kn-tr-postal]");
      var h=hood?String(hood.value||"").trim():"";
      var s=street?String(street.value||"").trim():"";
      var line1=h&&s?h+", "+s:(h||s);
      return {label:field(form,"label"),city:city?String(city.value||"").trim():"",district:dist?String(dist.value||"").trim():"",line1:line1,postalCode:postal?String(postal.value||"").trim():"",isDefault:chk(form,"isDefault")};
    }
    return {label:field(form,"label"),city:field(form,"city"),district:field(form,"district"),line1:field(form,"line1"),postalCode:field(form,"postalCode"),isDefault:chk(form,"isDefault")};
  }
  function bindDashboard(){
    bindTabs();
    var tabParam="";try{tabParam=new URL(window.location.href).searchParams.get("tab")||"";}catch(e){}
    var valid=["profile","orders","addresses","favorites","password"];
    if(valid.indexOf(tabParam)>=0)showTab(tabParam);
    else showTab("profile");
    var pf=qs("[data-kn-profile-form]");if(pf&&!pf.dataset.knBound){pf.dataset.knBound="1";pf.addEventListener("submit",async function(e){e.preventDefault();var m=qs("[data-kn-profile-msg]",pf);var fn=field(pf,"firstName"),ln=field(pf,"lastName");var r=await patch("/api/account/profile",{firstName:fn,lastName:ln,phone:field(pf,"phone")});msg(m,r.ok?(tr()?"Kaydedildi":"Saved"):(r.json.error||(tr()?"Hata":"Error")),r.ok);if(r.ok){var n=welcomeName(fn,ln);if(n)setWelcome(n);}});}
    var af=qs("[data-kn-address-form]");if(af&&!af.dataset.knBound){af.dataset.knBound="1";af.addEventListener("submit",async function(e){e.preventDefault();var fm=qs("[data-kn-address-form-msg]",af);var btn=af.querySelector('button[type="submit"]');if(btn)btn.disabled=true;var r=await post("/api/account/addresses",addrBody(af));if(btn)btn.disabled=false;if(r.ok){resetNewAddressForm(af);msg(fm,tr()?"Adres eklendi":"Address added",true);reloadDashboard();}else{msg(fm,r.json.error||(tr()?"Adres eklenemedi":"Could not add address"),false);}});
    qsa("[data-kn-addr-edit-form]").forEach(function(form){
      if(form.dataset.knBound)return;form.dataset.knBound="1";
      form.addEventListener("submit",async function(e){e.preventDefault();var id=form.getAttribute("data-kn-addr-edit-form");var m=qs("[data-kn-addr-edit-msg]",form);var btn=form.querySelector('button[type="submit"]');if(btn)btn.disabled=true;var r=await patch("/api/account/addresses/"+id,addrBody(form));if(btn)btn.disabled=false;msg(m,r.ok?(tr()?"Kaydedildi":"Saved"):(r.json.error||(tr()?"Hata":"Error")),r.ok);if(r.ok)reloadDashboard();});
    });
    var pwf=qs("[data-kn-password-form]");if(pwf&&!pwf.dataset.knBound){pwf.dataset.knBound="1";pwf.addEventListener("submit",async function(e){e.preventDefault();var m=qs("[data-kn-password-msg]",pwf);var np=field(pwf,"newPassword"),cp=field(pwf,"confirmPassword");if(np!==cp){msg(m,tr()?"Yeni şifreler eşleşmiyor":"Passwords do not match",false);return;}var btn=pwf.querySelector('button[type="submit"]');if(btn)btn.disabled=true;var r=await post("/api/account/change-password",{currentPassword:field(pwf,"currentPassword"),newPassword:np});if(btn)btn.disabled=false;if(r.ok){pwf.reset();msg(m,tr()?"Şifreniz güncellendi":"Password updated",true);}else{msg(m,r.json.error||(tr()?"Kaydedilemedi":"Could not save"),false);}});
    var w=qs("#kn-account-welcome");var wi=qs("#kn-account-welcome-inline");if(w&&wi)w.innerHTML=wi.innerHTML;
    fetch("/api/account/profile",{credentials:"same-origin"}).then(function(r){return r.json();}).then(function(d){var p=d&&d.profile;if(!p)return;var n=welcomeName(p.firstName||"",p.lastName||"");if(n)setWelcome(n);}).catch(function(){});
  }
  if(!document.documentElement.dataset.knAddrClickBound){document.documentElement.dataset.knAddrClickBound="1";
  document.addEventListener("click",async function(e){
    var el=elFromEvent(e);if(!el)return;
    var tabBtn=el.closest("[data-kn-account-tab]");if(tabBtn){e.preventDefault();showTab(tabBtn.getAttribute("data-kn-account-tab"));return;}
    var lo=el.closest("[data-kn-logout]");if(lo){e.preventDefault();await post("/api/account/logout",{});try{window.top.location.href="/";}catch(err){window.location.href="/";}return;}
    var edit=el.closest("[data-kn-addr-edit]");if(edit){e.preventDefault();e.stopPropagation();var card=edit.closest("[data-address-id]");var form=card&&card.querySelector("[data-kn-addr-edit-form]");if(form){hideAllAddrEditForms(form);form.hidden=false;form.removeAttribute("hidden");form.style.display="block";var trBlocks=form.querySelectorAll("[data-kn-tr-address]");trBlocks.forEach(function(b){b.removeAttribute("data-kn-tr-bound");});form.scrollIntoView({behavior:"smooth",block:"nearest"});}return;}
    var cancel=el.closest("[data-kn-addr-cancel]");if(cancel){e.preventDefault();e.stopPropagation();var form=cancel.closest("[data-kn-addr-edit-form]");if(form){form.hidden=true;form.setAttribute("hidden","");form.style.display="none";}return;}
    var def=el.closest("[data-kn-addr-default]");if(def){e.preventDefault();var r=await patch("/api/account/addresses/"+def.getAttribute("data-kn-addr-default"),{isDefault:true});if(r.ok)reloadDashboard();else alert(r.json.error||(tr()?"Hata":"Error"));return;}
    var del=el.closest("[data-kn-addr-delete]");if(del){e.preventDefault();if(!confirm(tr()?"Bu adresi silmek istiyor musunuz?":"Delete this address?"))return;var res=await fetch("/api/account/addresses/"+del.getAttribute("data-kn-addr-delete"),{method:"DELETE",credentials:"same-origin"});if(!res.ok){var j={};try{j=await res.json();}catch(err){}alert(j.error||(tr()?"Silinemedi":"Could not delete"));return;}reloadDashboard();return;}
    var fav=el.closest("[data-kn-fav-remove]");if(fav){e.preventDefault();var pid=fav.getAttribute("data-product-id");if(!pid)return;var fr=await post("/api/account/favorites",{productId:pid});if(!fr.ok){alert(tr()?"İşlem başarısız":"Failed");return;}var card=fav.closest("[data-kn-fav-card]");if(card)card.remove();if(!qs("[data-kn-fav-card]")){var empty=qs('[data-kn-account-panel="favorites"]');if(empty)reloadDashboard();}return;}
    var oc=el.closest("[data-kn-order-cancel]");if(oc){e.preventDefault();var reason=prompt(tr()?"İptal nedeni (isteğe bağlı):":"Cancel reason (optional):")||"";var r=await post("/api/account/orders/"+encodeURIComponent(oc.getAttribute("data-kn-order-cancel"))+"/request",{type:"cancel",reason:reason});alert(r.json.message||r.json.error||"");if(r.ok)reloadDashboard();return;}
    var orf=el.closest("[data-kn-order-refund]");if(orf){e.preventDefault();var reason2=prompt(tr()?"İade nedeni (isteğe bağlı):":"Refund reason (optional):")||"";var r2=await post("/api/account/orders/"+encodeURIComponent(orf.getAttribute("data-kn-order-refund"))+"/request",{type:"refund",reason:reason2});alert(r2.json.message||r2.json.error||"");if(r2.ok)reloadDashboard();return;}
  },true);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindDashboard);else bindDashboard();
})();`;
}

export function injectAccountDashboardBridge(html: string): string {
  const script = `<script id="kn-account-dashboard-bridge">${buildAccountDashboardBridgeScript()}</script>`;
  if (html.includes('id="kn-account-dashboard-bridge"')) {
    return html.replace(
      /<script id="kn-account-dashboard-bridge">[\s\S]*?<\/script>/i,
      script,
    );
  }
  return html.replace(/<\/body>/i, `${script}</body>`);
}
