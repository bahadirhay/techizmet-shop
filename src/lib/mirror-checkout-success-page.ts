/** Techizmet Shop — checkout success (mirror) */

import { injectMirrorPageRoot } from "@/lib/mirror-page-inject";

export type MirrorCheckoutSuccessPayload = {
  locale: "tr" | "en";
  orderNumber?: string;
  paid: boolean;
  accountCreated: boolean;
  loggedIn: boolean;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const CHECKOUT_SUCCESS_CSS = `<style id="kn-checkout-success-css">
.kn-checkout-success-page {
  max-width: 520px;
  margin: 0 auto;
  padding: 48px 20px 64px;
  text-align: center;
}
.kn-checkout-success-card {
  padding: 40px 32px;
  background: var(--body_alternate_background, #f7f5f2);
  border-radius: var(--card_radius, 8px);
}
.kn-checkout-success-card .heading-font {
  margin: 0 0 16px;
}
.kn-checkout-success__order {
  margin: 0 0 12px;
}
.kn-checkout-success__order strong {
  font-weight: 600;
}
.kn-checkout-success__account {
  margin: 16px 0 0;
  padding: 12px 16px;
  background: var(--body_background, #fff);
  border-radius: 8px;
}
.kn-checkout-success__actions {
  display: grid;
  gap: 10px;
  margin-top: 28px;
}
</style>`;

export function buildCheckoutSuccessMarkup(p: MirrorCheckoutSuccessPayload): string {
  const tr = p.locale === "tr";
  const title = p.paid
    ? tr
      ? "Siparişiniz alındı"
      : "Order received"
    : tr
      ? "Ödeme işleniyor"
      : "Payment processing";

  const orderBlock = p.orderNumber
    ? `<p class="text-medium kn-checkout-success__order">${tr ? "Sipariş numaranız:" : "Your order number:"} <strong>${esc(p.orderNumber)}</strong></p>`
    : "";

  const bodyText = p.paid
    ? tr
      ? "Onay e-postası adresinize gönderildi (e-posta ayarlıysa)."
      : "A confirmation email has been sent (if email is configured)."
    : tr
      ? "Kart ödemesi onaylandığında e-posta gönderilecektir."
      : "You will receive an email once card payment is confirmed.";

  const accountMsg =
    p.accountCreated
      ? `<p class="kn-checkout-success__account text-medium">${tr ? "Hesabınız oluşturuldu ve giriş yaptınız. Siparişlerinizi " : "Your account was created and you are signed in. Track orders from "}<a href="/account" class="text-underline">${tr ? "hesabım" : "my account"}</a>${tr ? " sayfasından takip edebilirsiniz." : "."}</p>`
      : "";

  const trackBtn = p.orderNumber
    ? `<a href="/orders/track?order=${encodeURIComponent(p.orderNumber)}" class="button medium-button button-block">${tr ? "Siparişi takip et" : "Track order"}</a>`
    : "";

  const accountBtn =
    p.accountCreated || p.loggedIn
      ? `<a href="/account" class="button medium-button button-secondary button-block">${tr ? "Hesabım" : "My account"}</a>`
      : `<a href="/account/register" class="button medium-button button-secondary button-block">${tr ? "Hesap oluştur" : "Create account"}</a>`;

  const shopBtn = `<a href="/collections/all" class="button text-button" style="margin-top:4px">${tr ? "Alışverişe devam" : "Continue shopping"}</a>`;

  return `<div class="kn-checkout-success-page" data-kn-checkout-success="1">
  <div class="kn-checkout-success-card">
    <h1 class="heading-font h2">${esc(title)}</h1>
    ${orderBlock}
    <p class="text-medium">${esc(bodyText)}</p>
    ${accountMsg}
    <div class="kn-checkout-success__actions">
      ${trackBtn}
      ${accountBtn}
      ${shopBtn}
    </div>
  </div>
</div>`;
}

export function applyCheckoutSuccessToMirrorHtml(
  html: string,
  payload: MirrorCheckoutSuccessPayload,
): string {
  let out = html;
  if (!out.includes('id="kn-checkout-success-css"')) {
    out = out.replace(/<\/head>/i, `${CHECKOUT_SUCCESS_CSS}</head>`);
  }
  if (!out.includes("kn-checkout-embed.css")) {
    out = out.replace(
      /<\/head>/i,
      '<link href="/theme/techizmet-shop/kn-checkout-embed.css?v=1" rel="stylesheet" type="text/css" media="all" />\n</head>',
    );
  }
  return injectMirrorPageRoot(out, "kn-page-root", buildCheckoutSuccessMarkup(payload));
}
