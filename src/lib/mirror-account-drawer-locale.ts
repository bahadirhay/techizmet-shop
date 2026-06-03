/** Hesap çekmecesi — TR etiket / placeholder (gömülü Shopify İngilizce metinleri) */

import { parseHTML } from "linkedom";
import { isElementNode, isInputNode } from "@/lib/mirror-dom-node";

/** linkedom / Node prebuild — Node.TEXT_NODE global yok */
const TEXT_NODE = 3;

function cssIdSelector(id: string): string {
  const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(id) : id;
  return `#${esc}`;
}

export function localizeAccountDrawerTr(doc: Document): void {
  const drawer = doc.querySelector('[data-drawer="account-drawer"]');
  if (!isElementNode(drawer) || drawer.getAttribute("data-kn-tr-localized") === "1") return;
  drawer.setAttribute("data-kn-tr-localized", "1");

  const heading = (key: string, text: string) => {
    const el = drawer.querySelector(`[data-heading="${key}"]`);
    if (el) el.textContent = text;
  };

  heading("login", "Giriş yap");
  heading("reset", "Şifre sıfırlama");
  heading("create", "Hesap oluştur");

  const label = (forId: string, text: string) => {
    const el = drawer.querySelector(`label[for="${forId}"]`);
    if (el) el.textContent = text;
  };

  const placeholder = (id: string, text: string) => {
    const el = drawer.querySelector(cssIdSelector(id));
    if (isInputNode(el)) el.setAttribute("placeholder", text);
  };

  const btnInForm = (formSelector: string, text: string) => {
    const form = drawer.querySelector(formSelector);
    const btn = form?.querySelector("button.button-block, button.medium-button");
    if (btn && !btn.closest("account-event")) btn.textContent = text;
  };

  // Giriş
  label("CustomerEmail", "E-posta");
  placeholder("CustomerEmail", "E-posta adresiniz");
  label("customerPassword", "Şifre");
  const loginPwd = drawer.querySelector('[data-form="login"] input[name="customer[password]"]');
  if (isInputNode(loginPwd)) loginPwd.setAttribute("placeholder", "Şifreniz");
  btnInForm('[data-form="login"]', "Giriş yap");

  const loginInfo = drawer.querySelector('[data-form="login"] .account--text-info');
  if (loginInfo) {
    loginInfo.childNodes.forEach((node) => {
      if (node.nodeType === TEXT_NODE && /don.t have/i.test(node.textContent ?? "")) {
        node.textContent = "Hesabınız yok mu? ";
      }
    });
    const createLink = loginInfo.querySelector('account-event[data-target="create"] a');
    if (createLink) createLink.textContent = "Kayıt olun";
  }

  const forgotLink = drawer.querySelector('account-event[data-target="reset"] a');
  if (forgotLink) forgotLink.textContent = "Şifremi unuttum?";

  // Kayıt
  label("RegisterForm-FirstName", "Ad");
  placeholder("RegisterForm-FirstName", "Adınız");
  label("RegisterForm-LastName", "Soyad");
  placeholder("RegisterForm-LastName", "Soyadınız");
  label("Customer-Email", "E-posta");
  label("RegisterForm-email", "E-posta");
  placeholder("RegisterForm-email", "E-posta adresiniz");
  label("Customer-Password", "Şifre");
  label("RegisterForm-password", "Şifre");
  placeholder("RegisterForm-password", "Şifrenizi girin");
  btnInForm('[data-form="create"]', "Kayıt ol");

  const regInfo = drawer.querySelector('[data-form="create"] .account--text-info');
  if (regInfo) {
    regInfo.childNodes.forEach((node) => {
      if (node.nodeType === TEXT_NODE && /already have/i.test(node.textContent ?? "")) {
        node.textContent = "Zaten üye misiniz? ";
      }
    });
    const loginLink = regInfo.querySelector('account-event[data-target="login"] a');
    if (loginLink) loginLink.textContent = "Giriş yapın";
  }

  // Şifre sıfırlama
  label("RecoverEmail", "E-posta");
  placeholder("RecoverEmail", "E-posta adresiniz");
  btnInForm('[data-form="reset"]', "Bağlantı gönder");
  const cancelLink = drawer.querySelector('[data-form="reset"] account-event[data-target="login"] a');
  if (cancelLink) cancelLink.textContent = "İptal";
}

/** Prebuild / sunucu HTML — çekmece metinleri TR (lang=en kalsa bile) */
export function applyAccountDrawerTrHtml(html: string): string {
  if (!html.includes('data-drawer="account-drawer"')) return html;
  const { document } = parseHTML(html);
  localizeAccountDrawerTr(document);
  const root = document.documentElement;
  if (root) {
    root.setAttribute("data-kn-locale", "tr");
    if (!root.getAttribute("lang")?.toLowerCase().startsWith("tr")) {
      root.setAttribute("lang", "tr");
    }
  }
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
