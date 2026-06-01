/** Techizmet Shop — /account/login & /account/register (mirror vitrin) */

import { injectMirrorPageRoot } from "@/lib/mirror-page-inject";

export type MirrorAccountAuthMode = "login" | "register" | "forgot-password";

export type MirrorAccountAuthPayload = {
  locale: "tr" | "en";
  mode: MirrorAccountAuthMode;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const ACCOUNT_AUTH_CSS = `<style id="kn-account-auth-css">
html, body {
  overflow-x: clip;
  max-width: 100%;
}
.kn-account-auth-page {
  max-width: 440px;
  margin: 0 auto;
  padding: 40px 20px 64px;
  padding-left: max(20px, env(safe-area-inset-left, 0px));
  padding-right: max(20px, env(safe-area-inset-right, 0px));
  box-sizing: border-box;
  width: 100%;
}
.kn-account-auth-page .form-control,
.kn-account-auth-page input,
.kn-account-auth-page select {
  max-width: 100%;
  box-sizing: border-box;
}
.kn-account-auth-page .input-form--fields {
  display: grid;
  gap: 0;
  grid-template-columns: 1fr;
}
@media (min-width: 480px) {
  .kn-account-auth-page .input-form--fields {
    grid-template-columns: 1fr 1fr;
    column-gap: 12px;
  }
}
.kn-account-auth-card {
  padding: 32px 24px;
  background: var(--body_alternate_background, #f7f5f2);
  border-radius: var(--card_radius, 8px);
}
.kn-account-auth-card .heading-font {
  margin: 0 0 8px;
  text-align: center;
}
.kn-account-auth__lead {
  margin: 0 0 24px;
  text-align: center;
  color: var(--text_medium, #6b6b6b);
  font-size: 0.9375rem;
  line-height: 1.5;
}
.kn-account-auth-card .form-group {
  margin-bottom: 16px;
}
.kn-account-auth-card .account--text-info {
  margin-top: 20px;
}
</style>`;

function buildLoginMarkup(tr: boolean): string {
  return `<div class="kn-account-auth-page" data-kn-account-auth="login">
  <div class="kn-account-auth-card">
    <h1 class="heading-font h2">${tr ? "Giriş yap" : "Log in"}</h1>
    <p class="kn-account-auth__lead text-medium">${
      tr
        ? "Sipariş geçmişinizi görün ve sonraki alışverişlerinizi hızlandırın."
        : "View order history and speed up your next purchase."
    }</p>
    <form action="#" onsubmit="return false">
      <input type="hidden" name="form_type" value="customer_login" />
      <input type="hidden" name="utf8" value="✓" />
      <div class="form-group">
        <label for="kn-login-email">${tr ? "E-posta" : "Email"}</label>
        <input class="form-control" type="email" name="customer[email]" id="kn-login-email" autocomplete="email" placeholder="${tr ? "E-posta adresiniz" : "Email address"}" autocapitalize="off" required />
      </div>
      <div class="form-group">
        <label for="kn-login-password">${tr ? "Şifre" : "Password"}</label>
        <input class="form-control" type="password" name="customer[password]" id="kn-login-password" placeholder="${tr ? "Şifreniz" : "Your password"}" autocapitalize="off" required />
      </div>
      <p class="form-group forgot-password text-right text-small">
        <a href="/account/forgot-password" class="text-underline">${tr ? "Şifremi unuttum" : "Forgot password?"}</a>
      </p>
      <button type="submit" class="button medium-button button-block">${tr ? "Giriş yap" : "Log in"}</button>
      <p class="account--text-info text-center text-medium">
        ${tr ? "Hesabınız yok mu?" : "Don't have an account?"}
        <a href="/account/register" class="text-underline">${tr ? "Kayıt olun" : "Create an account"}</a>
      </p>
    </form>
  </div>
</div>`;
}

function buildRegisterMarkup(tr: boolean): string {
  return `<div class="kn-account-auth-page" data-kn-account-auth="register">
  <div class="kn-account-auth-card">
    <h1 class="heading-font h2">${tr ? "Hesap oluştur" : "Create account"}</h1>
    <p class="kn-account-auth__lead text-medium">${
      tr
        ? "Sipariş geçmişinizi görün ve sonraki alışverişlerinizi hızlandırın."
        : "View order history and speed up your next purchase."
    }</p>
    <form action="#" onsubmit="return false">
      <input type="hidden" name="form_type" value="create_customer" />
      <input type="hidden" name="utf8" value="✓" />
      <div class="input-form--fields">
        <div class="form-group">
          <label for="kn-reg-first">${tr ? "Ad" : "First name"}</label>
          <input class="form-control" type="text" name="customer[first_name]" id="kn-reg-first" autocomplete="given-name" placeholder="${tr ? "Adınız" : "First name"}" required />
        </div>
        <div class="form-group">
          <label for="kn-reg-last">${tr ? "Soyad" : "Last name"}</label>
          <input class="form-control" type="text" name="customer[last_name]" id="kn-reg-last" autocomplete="family-name" placeholder="${tr ? "Soyadınız" : "Last name"}" required />
        </div>
      </div>
      <div class="form-group">
        <label for="kn-reg-email">${tr ? "E-posta" : "Email"}</label>
        <input class="form-control" type="email" name="customer[email]" id="kn-reg-email" autocomplete="email" placeholder="${tr ? "E-posta adresiniz" : "Email address"}" autocapitalize="off" required />
      </div>
      <div class="form-group">
        <label for="kn-reg-phone">${tr ? "Telefon" : "Phone"}</label>
        <input class="form-control" type="tel" name="customer[phone]" id="kn-reg-phone" autocomplete="tel" placeholder="${tr ? "Opsiyonel" : "Optional"}" />
      </div>
      <div class="form-group">
        <label for="kn-reg-password">${tr ? "Şifre (min. 6)" : "Password (min. 6)"}</label>
        <input class="form-control" type="password" name="customer[password]" id="kn-reg-password" minlength="6" placeholder="${tr ? "Şifreniz" : "Your password"}" required />
      </div>
      <button type="submit" class="button medium-button button-block">${tr ? "Kayıt ol" : "Create account"}</button>
      <p class="account--text-info text-center text-medium">
        ${tr ? "Zaten üye misiniz?" : "Already have an account?"}
        <a href="/account/login" class="text-underline">${tr ? "Giriş yapın" : "Log in"}</a>
      </p>
    </form>
  </div>
</div>`;
}

function buildForgotPasswordMarkup(tr: boolean): string {
  return `<div class="kn-account-auth-page" data-kn-account-auth="forgot-password">
  <div class="kn-account-auth-card">
    <h1 class="heading-font h2">${tr ? "Şifremi unuttum" : "Forgot password"}</h1>
    <p class="kn-account-auth__lead text-medium">${
      tr
        ? "Kayıtlı e-posta adresinize sıfırlama bağlantısı gönderilir."
        : "We will email you a reset link if this address is registered."
    }</p>
    <form action="#" onsubmit="return false">
      <input type="hidden" name="form_type" value="recover_customer_password" />
      <input type="hidden" name="utf8" value="✓" />
      <div class="form-group">
        <label for="kn-forgot-email">${tr ? "E-posta" : "Email"}</label>
        <input class="form-control" type="email" name="email" id="kn-forgot-email" autocomplete="email" placeholder="${tr ? "E-posta adresiniz" : "Email address"}" autocapitalize="off" required />
      </div>
      <button type="submit" class="button medium-button button-block">${tr ? "Bağlantı gönder" : "Send link"}</button>
      <p class="account--text-info text-center text-medium">
        <a href="/account/login" class="text-underline">${tr ? "← Giriş sayfası" : "← Back to log in"}</a>
      </p>
    </form>
  </div>
</div>`;
}

export function buildAccountAuthMarkup(p: MirrorAccountAuthPayload): string {
  const tr = p.locale === "tr";
  if (p.mode === "login") return buildLoginMarkup(tr);
  if (p.mode === "register") return buildRegisterMarkup(tr);
  return buildForgotPasswordMarkup(tr);
}

export function applyAccountAuthToMirrorHtml(
  html: string,
  payload: MirrorAccountAuthPayload,
): string {
  let out = html;
  if (!out.includes('id="kn-account-auth-css"')) {
    out = out.replace(/<\/head>/i, `${ACCOUNT_AUTH_CSS}</head>`);
  }
  const title =
    payload.mode === "login"
      ? payload.locale === "tr"
        ? "Giriş"
        : "Log in"
      : payload.mode === "register"
        ? payload.locale === "tr"
          ? "Kayıt"
          : "Register"
        : payload.locale === "tr"
          ? "Şifre sıfırlama"
          : "Reset password";
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);
  return injectMirrorPageRoot(out, "kn-page-root", buildAccountAuthMarkup(payload));
}
