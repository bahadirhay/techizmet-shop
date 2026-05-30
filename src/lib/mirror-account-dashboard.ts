/** Techizmet Shop — hesap paneli HTML + iframe etkileşim köprüsü */

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

export type MirrorAccountDashboardPayload = {
  name: string;
  email: string;
  memberGroup: { name: string; discountPercent: number } | null;
  profile: { firstName: string | null; lastName: string | null; phone: string | null };
  addresses: MirrorAccountAddress[];
  orders: MirrorAccountOrder[];
  locale: "tr" | "en";
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Hesap paneli — geniş formları sınırlar (mirror container tam genişlikte) */
export const ACCOUNT_DASHBOARD_CSS = `<style id="kn-account-dashboard-css">
.account-page .main-account--content {
  max-width: 920px;
  margin: 0 auto;
  padding: 8px 20px 56px;
}
.kn-account-dashboard__inner {
  max-width: 640px;
}
.kn-account-dashboard .kn-account-section {
  margin-top: 36px;
  padding-top: 36px;
  border-top: 1px dashed var(--border_color, #e5e2dd);
}
.kn-account-dashboard .kn-account-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
.kn-account-dashboard .main-address--header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin: 0 0 20px;
}
.kn-account-dashboard .main-address--header h2,
.kn-account-dashboard .main-address--header h3 {
  margin: 0;
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
.kn-account-dashboard .button.medium-button,
.kn-account-dashboard .button.button-block {
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
  max-width: 920px;
}
.kn-account-dashboard .kn-account-section--orders {
  max-width: 920px;
  margin-top: 40px;
}
.kn-account-dashboard .kn-account-orders-title {
  margin: 0 0 16px;
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
.kn-account-dashboard .address--footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 12px;
}
.kn-account-dashboard .account--text-info.text-center {
  max-width: 640px;
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
    <div class="input-form--fields">
      <div class="form-group"><label>${tr ? "İl" : "City"}</label><input class="form-control" name="city" value="${esc(a.city)}" required /></div>
      <div class="form-group"><label>${tr ? "İlçe" : "District"}</label><input class="form-control" name="district" value="${esc(a.district)}" required /></div>
    </div>
    <div class="form-group"><label>${tr ? "Adres" : "Address"}</label><input class="form-control" name="line1" value="${esc(a.line1)}" required /></div>
    <div class="form-group"><label>${tr ? "Posta kodu" : "Postal code"}</label><input class="form-control" name="postalCode" value="${esc(a.postalCode ?? "")}" /></div>
    <div class="form-group kn-account-checkbox"><label><input type="checkbox" name="isDefault"${a.isDefault ? " checked" : ""} /> ${tr ? "Varsayılan adres" : "Default address"}</label></div>
    <p class="kn-account-msg" data-kn-addr-edit-msg hidden></p>
    <button type="submit" class="button medium-button">${tr ? "Kaydet" : "Save"}</button>
    <button type="button" class="button text-button" data-kn-addr-cancel="${esc(a.id)}">${tr ? "İptal" : "Cancel"}</button>
  </form>`;
}

export function buildAccountDashboardMarkup(p: MirrorAccountDashboardPayload): string {
  const tr = p.locale === "tr";
  const welcome = buildAccountWelcomeHtml(p);

  const member = p.memberGroup
    ? tr
      ? `Üye grubunuz: <strong>${esc(p.memberGroup.name)}</strong> — %${p.memberGroup.discountPercent} indirim`
      : `Member group: <strong>${esc(p.memberGroup.name)}</strong> — ${p.memberGroup.discountPercent}% off`
    : "";

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
            <button type="button" class="button text-button" data-kn-addr-edit="${esc(a.id)}">${tr ? "Düzenle" : "Edit"}</button>
            ${!a.isDefault ? ` <button type="button" class="button text-button" data-kn-addr-default="${esc(a.id)}">${tr ? "Varsayılan yap" : "Set default"}</button>` : ""}
            <button type="button" class="button text-button" data-kn-addr-delete="${esc(a.id)}">${tr ? "Sil" : "Delete"}</button>
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
              ? `<button type="button" class="button text-button" data-kn-order-cancel="${esc(o.orderNumber)}">${tr ? "İptal" : "Cancel"}</button>`
              : "",
            o.canRefund
              ? `<button type="button" class="button text-button" data-kn-order-refund="${esc(o.orderNumber)}">${tr ? "İade" : "Refund"}</button>`
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

  return `<div class="kn-account-dashboard" data-kn-account-dashboard="1">
  <p id="kn-account-welcome-inline" class="account--text-info" hidden>${welcome}</p>
  <div class="kn-account-dashboard__inner">
  <section class="kn-account-section kn-account-section--profile">
  ${member ? `<p class="text-medium account--text-info kn-account-member">${member}</p>` : ""}
  <div class="main-address--header">
    <h2 class="heading-font h4">${tr ? "Profil" : "Profile"}</h2>
    <button type="button" class="button medium-button" data-kn-logout>${tr ? "Çıkış" : "Log out"}</button>
  </div>
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

  <section class="kn-account-section kn-account-section--addresses">
  <div class="main-address--header">
    <h2 class="heading-font h4">${tr ? "Adres defteri" : "Address book"}</h2>
    <a href="/account/favorites" class="text-underline text-small">${tr ? "Favorilerim" : "Favorites"}</a>
  </div>
  <div class="address--list">${addressCards || `<p class="text-medium">${tr ? "Kayıtlı adres yok." : "No saved addresses."}</p>`}</div>
  <form class="account--form kn-account-address-form" data-kn-address-form>
    <h3 class="heading-font h5">${tr ? "Yeni adres" : "New address"}</h3>
    <div class="form-group"><label for="kn-addr-label">${tr ? "Etiket" : "Label"}</label><input class="form-control" id="kn-addr-label" name="label" value="${tr ? "Ev" : "Home"}" /></div>
    <div class="input-form--fields">
      <div class="form-group"><label for="kn-addr-city">${tr ? "İl" : "City"}</label><input class="form-control" id="kn-addr-city" name="city" required /></div>
      <div class="form-group"><label for="kn-addr-district">${tr ? "İlçe" : "District"}</label><input class="form-control" id="kn-addr-district" name="district" required /></div>
    </div>
    <div class="form-group"><label for="kn-addr-line">${tr ? "Adres" : "Address line"}</label><input class="form-control" id="kn-addr-line" name="line1" required /></div>
    <div class="form-group kn-account-checkbox"><label><input type="checkbox" name="isDefault" /> ${tr ? "Varsayılan adres" : "Default address"}</label></div>
    <button type="submit" class="button medium-button">${tr ? "Adres ekle" : "Add address"}</button>
  </form>
  </section>
  </div>

  <section class="kn-account-section kn-account-section--orders">
  <h2 class="heading-font h4 kn-account-orders-title">${tr ? "Siparişlerim" : "Order history"}</h2>
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
  function tr(){return document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0;}
  function field(form,name){var el=form.querySelector('[name="'+name+'"]');return el?String(el.value||"").trim():"";}
  function chk(form,name){var el=form.querySelector('[name="'+name+'"]');return !!(el&&el.checked);}
  function msg(el,text,ok){if(!el)return;el.hidden=!text;el.textContent=text||"";el.style.color=ok?"#166534":"#b91c1c";}
  function welcomeName(first,last){return [first,last].filter(Boolean).join(" ").trim();}
  function setWelcome(name){var w=qs("#kn-account-welcome");if(!w||!name)return;w.innerHTML=(tr()?"Hoş geldiniz, ":"Welcome, ")+"<strong>"+name.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</strong>";}
  async function post(url,body){var r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body||{})});var j={};try{j=await r.json();}catch(e){}return {ok:r.ok,json:j};}
  async function patch(url,body){var r=await fetch(url,{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body||{})});var j={};try{j=await r.json();}catch(e){}return {ok:r.ok,json:j};}
  function addrBody(form){return {label:field(form,"label"),city:field(form,"city"),district:field(form,"district"),line1:field(form,"line1"),postalCode:field(form,"postalCode"),isDefault:chk(form,"isDefault")};}
  var pf=qs("[data-kn-profile-form]");if(pf){pf.addEventListener("submit",async function(e){e.preventDefault();var m=qs("[data-kn-profile-msg]",pf);var fn=field(pf,"firstName"),ln=field(pf,"lastName");var r=await patch("/api/account/profile",{firstName:fn,lastName:ln,phone:field(pf,"phone")});msg(m,r.ok?(tr()?"Kaydedildi":"Saved"):(r.json.error||(tr()?"Hata":"Error")),r.ok);if(r.ok){var n=welcomeName(fn,ln);if(n)setWelcome(n);}});}
  var af=qs("[data-kn-address-form]");if(af){af.addEventListener("submit",async function(e){e.preventDefault();var r=await post("/api/account/addresses",addrBody(af));if(r.ok)(window.top||window).location.reload();else alert(r.json.error||(tr()?"Adres eklenemedi":"Could not add address"));});}
  document.querySelectorAll("[data-kn-addr-edit-form]").forEach(function(form){
    form.addEventListener("submit",async function(e){e.preventDefault();var id=form.getAttribute("data-kn-addr-edit-form");var m=qs("[data-kn-addr-edit-msg]",form);var r=await patch("/api/account/addresses/"+id,addrBody(form));msg(m,r.ok?(tr()?"Kaydedildi":"Saved"):(r.json.error||(tr()?"Hata":"Error")),r.ok);if(r.ok)(window.top||window).location.reload();});
  });
  document.addEventListener("click",async function(e){
    var t=e.target;if(!t||!t.closest)return;
    var lo=t.closest("[data-kn-logout]");if(lo){e.preventDefault();await post("/api/account/logout",{});(window.top||window).location.href="/";}
    var edit=t.closest("[data-kn-addr-edit]");if(edit){e.preventDefault();var card=edit.closest("[data-address-id]");var form=card&&card.querySelector("[data-kn-addr-edit-form]");if(form)form.hidden=false;return;}
    var cancel=t.closest("[data-kn-addr-cancel]");if(cancel){e.preventDefault();var form=cancel.closest("[data-kn-addr-edit-form]");if(form)form.hidden=true;return;}
    var def=t.closest("[data-kn-addr-default]");if(def){e.preventDefault();await patch("/api/account/addresses/"+def.getAttribute("data-kn-addr-default"),{isDefault:true});(window.top||window).location.reload();}
    var del=t.closest("[data-kn-addr-delete]");if(del){e.preventDefault();if(!confirm(tr()?"Bu adresi silmek istiyor musunuz?":"Delete this address?"))return;var res=await fetch("/api/account/addresses/"+del.getAttribute("data-kn-addr-delete"),{method:"DELETE",credentials:"same-origin"});if(!res.ok){var j={};try{j=await res.json();}catch(err){}alert(j.error||(tr()?"Silinemedi":"Could not delete"));return;}(window.top||window).location.reload();}
    var oc=t.closest("[data-kn-order-cancel]");if(oc){e.preventDefault();var reason=prompt(tr()?"İptal nedeni (isteğe bağlı):":"Cancel reason (optional):")||"";var r=await post("/api/account/orders/"+encodeURIComponent(oc.getAttribute("data-kn-order-cancel"))+"/request",{type:"cancel",reason:reason});alert(r.json.message||r.json.error||"");if(r.ok)(window.top||window).location.reload();}
    var orf=t.closest("[data-kn-order-refund]");if(orf){e.preventDefault();var reason2=prompt(tr()?"İade nedeni (isteğe bağlı):":"Refund reason (optional):")||"";var r2=await post("/api/account/orders/"+encodeURIComponent(orf.getAttribute("data-kn-order-refund"))+"/request",{type:"refund",reason:reason2});alert(r2.json.message||r2.json.error||"");if(r2.ok)(window.top||window).location.reload();}
  });
  var w=qs("#kn-account-welcome");var wi=qs("#kn-account-welcome-inline");if(w&&wi)w.innerHTML=wi.innerHTML;
  fetch("/api/account/profile",{credentials:"same-origin"}).then(function(r){return r.json();}).then(function(d){var p=d&&d.profile;if(!p)return;var n=welcomeName(p.firstName||"",p.lastName||"");if(n)setWelcome(n);}).catch(function(){});
})();`;
}

export function injectAccountDashboardBridge(html: string): string {
  const script = `<script id="kn-account-dashboard-bridge">${buildAccountDashboardBridgeScript()}</script>`;
  if (html.includes('id="kn-account-dashboard-bridge"')) return html;
  return html.replace(/<\/body>/i, `${script}</body>`);
}
