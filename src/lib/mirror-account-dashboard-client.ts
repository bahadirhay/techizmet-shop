/** Mirror iframe — hesap paneli sekmeleri ve formlar (inline script yedek) */

import {
  bindMirrorTrAddressFields,
  mirrorTrAddressBodyFromForm,
} from "@/lib/mirror-tr-address-client";

const ACCOUNT_TAB_IDS = ["profile", "orders", "addresses", "favorites", "password"] as const;

function isTr(doc: Document): boolean {
  const lang = doc.documentElement.lang || "";
  return lang.toLowerCase().startsWith("tr");
}

function field(form: HTMLFormElement, name: string): string {
  const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  return el ? String(el.value || "").trim() : "";
}

function chk(form: HTMLFormElement, name: string): boolean {
  const el = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
  return !!(el && el.checked);
}

function setMsg(el: HTMLElement | null, text: string, ok: boolean) {
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || "";
  el.style.color = ok ? "#166534" : "#b91c1c";
}

function welcomeName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(" ").trim();
}

function setWelcome(doc: Document, name: string) {
  const w = doc.getElementById("kn-account-welcome");
  if (!w || !name) return;
  const safe = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  w.innerHTML = `${isTr(doc) ? "Hoş geldiniz, " : "Welcome, "}<strong>${safe}</strong>`;
}

function reloadDashboard(doc: Document) {
  const win = doc.defaultView;
  if (!win) return;
  try {
    const u = new URL(win.location.href);
    u.searchParams.set("_kn", String(Date.now()));
    win.location.replace(u.toString());
  } catch {
    win.location.reload();
  }
}

export function showAccountTab(doc: Document, name: string) {
  if (!name) return;

  const radio = doc.getElementById(`kn-acc-tab-${name}`) as HTMLInputElement | null;
  if (radio) radio.checked = true;

  doc.querySelectorAll("[data-kn-account-tab]").forEach((btn) => {
    const on = btn.getAttribute("data-kn-account-tab") === name;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });

  doc.querySelectorAll("[data-kn-account-panel]").forEach((panel) => {
    const on = panel.getAttribute("data-kn-account-panel") === name;
    const el = panel as HTMLElement;
    if (on) {
      panel.removeAttribute("hidden");
      el.style.display = "";
    } else {
      panel.setAttribute("hidden", "");
      el.style.display = "none";
    }
  });

  const win = doc.defaultView;
  if (!win) return;
  try {
    const u = new URL(win.location.href);
    u.searchParams.set("tab", name);
    win.history.replaceState(null, "", u.toString());
  } catch {
    /* ignore */
  }
}

async function postJson(url: string, body: Record<string, unknown>) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  let json: Record<string, string> = {};
  try {
    json = (await r.json()) as Record<string, string>;
  } catch {
    /* ignore */
  }
  return { ok: r.ok, json };
}

async function patchJson(url: string, body: Record<string, unknown>) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  let json: Record<string, string> = {};
  try {
    json = (await r.json()) as Record<string, string>;
  } catch {
    /* ignore */
  }
  return { ok: r.ok, json };
}

function eventTargetElement(e: Event): Element | null {
  const t = e.target;
  if (t instanceof Element) return t;
  if (t && "parentElement" in t && t.parentElement instanceof Element) return t.parentElement;
  return null;
}

function hideAddressEditForms(doc: Document, except?: HTMLElement) {
  doc.querySelectorAll<HTMLElement>("[data-kn-addr-edit-form]").forEach((f) => {
    if (f === except) return;
    f.hidden = true;
    f.setAttribute("hidden", "");
    f.style.display = "none";
  });
}

export function openAddressEditForm(doc: Document, editBtn: Element) {
  const card = editBtn.closest("[data-address-id]");
  const form = card?.querySelector<HTMLElement>("[data-kn-addr-edit-form]");
  if (!form) return;

  hideAddressEditForms(doc, form);
  form.hidden = false;
  form.removeAttribute("hidden");
  form.style.display = "block";

  form.querySelectorAll("[data-kn-tr-address]").forEach((block) => {
    block.removeAttribute("data-kn-tr-bound");
  });
  bindMirrorTrAddressFields(form);

  try {
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch {
    form.scrollIntoView();
  }
}

function bindAddressCardButtons(doc: Document) {
  doc.querySelectorAll<HTMLButtonElement>("[data-kn-addr-edit]").forEach((btn) => {
    if (btn.dataset.knEditBound === "1") return;
    btn.dataset.knEditBound = "1";
    btn.type = "button";
    btn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        openAddressEditForm(doc, btn);
      },
      true,
    );
  });

  doc.querySelectorAll<HTMLButtonElement>("[data-kn-addr-cancel]").forEach((btn) => {
    if (btn.dataset.knCancelBound === "1") return;
    btn.dataset.knCancelBound = "1";
    btn.type = "button";
    btn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const form = btn.closest<HTMLElement>("[data-kn-addr-edit-form]");
        if (!form) return;
        form.hidden = true;
        form.setAttribute("hidden", "");
        form.style.display = "none";
      },
      true,
    );
  });

  doc.querySelectorAll<HTMLButtonElement>("[data-kn-addr-default]").forEach((btn) => {
    if (btn.dataset.knDefaultBound === "1") return;
    btn.dataset.knDefaultBound = "1";
    btn.type = "button";
    btn.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute("data-kn-addr-default");
        if (!id) return;
        const r = await patchJson(`/api/account/addresses/${id}`, { isDefault: true });
        if (r.ok) reloadDashboard(doc);
        else alert(r.json.error || (isTr(doc) ? "Hata" : "Error"));
      },
      true,
    );
  });

  doc.querySelectorAll<HTMLButtonElement>("[data-kn-addr-delete]").forEach((btn) => {
    if (btn.dataset.knDeleteBound === "1") return;
    btn.dataset.knDeleteBound = "1";
    btn.type = "button";
    btn.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tr = isTr(doc);
        if (!confirm(tr ? "Bu adresi silmek istiyor musunuz?" : "Delete this address?")) return;
        const id = btn.getAttribute("data-kn-addr-delete");
        if (!id) return;
        const res = await fetch(`/api/account/addresses/${id}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        if (!res.ok) {
          let j: { error?: string } = {};
          try {
            j = await res.json();
          } catch {
            /* ignore */
          }
          alert(j.error || (tr ? "Silinemedi" : "Could not delete"));
          return;
        }
        reloadDashboard(doc);
      },
      true,
    );
  });
}

function addrBody(form: HTMLFormElement) {
  if (form.querySelector("[data-kn-tr-address]")) {
    const tr = mirrorTrAddressBodyFromForm(form);
    return {
      label: field(form, "label"),
      city: tr.city,
      district: tr.district,
      line1: tr.line1,
      postalCode: tr.postalCode,
      isDefault: chk(form, "isDefault"),
    };
  }
  return {
    label: field(form, "label"),
    city: field(form, "city"),
    district: field(form, "district"),
    line1: field(form, "line1"),
    postalCode: field(form, "postalCode"),
    isDefault: chk(form, "isDefault"),
  };
}

function bindAccountTabs(doc: Document) {
  doc.querySelectorAll<HTMLElement>("[data-kn-account-tab]").forEach((tab) => {
    if (tab.dataset.knTabBound === "1") return;
    tab.dataset.knTabBound = "1";
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = tab.getAttribute("data-kn-account-tab");
      if (id) showAccountTab(doc, id);
    });
  });

  doc.querySelectorAll<HTMLInputElement>(".kn-account-tab-radio").forEach((radio) => {
    if (radio.dataset.knRadioBound === "1") return;
    radio.dataset.knRadioBound = "1";
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      const id = radio.id.replace(/^kn-acc-tab-/, "");
      if (id) showAccountTab(doc, id);
    });
  });
}

function bindAccountForms(doc: Document) {
  const tr = isTr(doc);

  const pf = doc.querySelector<HTMLFormElement>("[data-kn-profile-form]");
  if (pf && pf.dataset.knBound !== "1") {
    pf.dataset.knBound = "1";
    pf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const m = pf.querySelector<HTMLElement>("[data-kn-profile-msg]");
      const fn = field(pf, "firstName");
      const ln = field(pf, "lastName");
      const r = await patchJson("/api/account/profile", {
        firstName: fn,
        lastName: ln,
        phone: field(pf, "phone"),
      });
      setMsg(m, r.ok ? (tr ? "Kaydedildi" : "Saved") : r.json.error || (tr ? "Hata" : "Error"), r.ok);
      if (r.ok) {
        const n = welcomeName(fn, ln);
        if (n) setWelcome(doc, n);
      }
    });
  }

  const af = doc.querySelector<HTMLFormElement>("[data-kn-address-form]");
  if (af && af.dataset.knBound !== "1") {
    af.dataset.knBound = "1";
    af.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fm = af.querySelector<HTMLElement>("[data-kn-address-form-msg]");
      const btn = af.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (btn) btn.disabled = true;
      const r = await postJson("/api/account/addresses", addrBody(af));
      if (btn) btn.disabled = false;
      if (r.ok) {
        af.reset();
        const cb = af.querySelector<HTMLInputElement>('[name="isDefault"]');
        if (cb) cb.checked = false;
        setMsg(fm, tr ? "Adres eklendi" : "Address added", true);
        reloadDashboard(doc);
      } else {
        setMsg(fm, r.json.error || (tr ? "Adres eklenemedi" : "Could not add address"), false);
      }
    });
  }

  doc.querySelectorAll<HTMLFormElement>("[data-kn-addr-edit-form]").forEach((form) => {
    if (form.dataset.knBound === "1") return;
    form.dataset.knBound = "1";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = form.getAttribute("data-kn-addr-edit-form");
      const m = form.querySelector<HTMLElement>("[data-kn-addr-edit-msg]");
      const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (btn) btn.disabled = true;
      const r = await patchJson(`/api/account/addresses/${id}`, addrBody(form));
      if (btn) btn.disabled = false;
      setMsg(m, r.ok ? (tr ? "Kaydedildi" : "Saved") : r.json.error || (tr ? "Hata" : "Error"), r.ok);
      if (r.ok) reloadDashboard(doc);
    });
  });

  const pwf = doc.querySelector<HTMLFormElement>("[data-kn-password-form]");
  if (pwf && pwf.dataset.knBound !== "1") {
    pwf.dataset.knBound = "1";
    pwf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const m = pwf.querySelector<HTMLElement>("[data-kn-password-msg]");
      const np = field(pwf, "newPassword");
      const cp = field(pwf, "confirmPassword");
      if (np !== cp) {
        setMsg(m, tr ? "Yeni şifreler eşleşmiyor" : "Passwords do not match", false);
        return;
      }
      const btn = pwf.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (btn) btn.disabled = true;
      const r = await postJson("/api/account/change-password", {
        currentPassword: field(pwf, "currentPassword"),
        newPassword: np,
      });
      if (btn) btn.disabled = false;
      if (r.ok) {
        pwf.reset();
        setMsg(m, tr ? "Şifreniz güncellendi" : "Password updated", true);
      } else {
        setMsg(m, r.json.error || (tr ? "Kaydedilemedi" : "Could not save"), false);
      }
    });
  }

  const w = doc.getElementById("kn-account-welcome");
  const wi = doc.getElementById("kn-account-welcome-inline");
  if (w && wi) w.innerHTML = wi.innerHTML;

  fetch("/api/account/profile", { credentials: "same-origin" })
    .then((r) => r.json())
    .then((d: { profile?: { firstName?: string; lastName?: string } }) => {
      const p = d?.profile;
      if (!p) return;
      const n = welcomeName(p.firstName || "", p.lastName || "");
      if (n) setWelcome(doc, n);
    })
    .catch(() => {});
}

function bindAccountActions(doc: Document) {
  if (doc.documentElement.dataset.knAddrClickBound === "1") return;
  doc.documentElement.dataset.knAddrClickBound = "1";

  const tr = () => isTr(doc);

  doc.addEventListener(
    "click",
    async (e) => {
      const t = eventTargetElement(e);
      if (!t) return;

      const tabBtn = t.closest("[data-kn-account-tab]");
      if (tabBtn) {
        e.preventDefault();
        e.stopPropagation();
        showAccountTab(doc, tabBtn.getAttribute("data-kn-account-tab") || "profile");
        return;
      }

      const lo = t.closest("[data-kn-logout]");
      if (lo) {
        e.preventDefault();
        await postJson("/api/account/logout", {});
        try {
          (doc.defaultView?.top || doc.defaultView)!.location.href = "/";
        } catch {
          if (doc.defaultView) doc.defaultView.location.href = "/";
        }
        return;
      }

      const fav = t.closest("[data-kn-fav-remove]");
      if (fav) {
        e.preventDefault();
        const pid = fav.getAttribute("data-product-id");
        if (!pid) return;
        const fr = await postJson("/api/account/favorites", { productId: pid });
        if (!fr.ok) {
          alert(tr() ? "İşlem başarısız" : "Failed");
          return;
        }
        fav.closest("[data-kn-fav-card]")?.remove();
        if (!doc.querySelector("[data-kn-fav-card]")) reloadDashboard(doc);
        return;
      }

      const oc = t.closest("[data-kn-order-cancel]");
      if (oc) {
        e.preventDefault();
        const reason =
          prompt(tr() ? "İptal nedeni (isteğe bağlı):" : "Cancel reason (optional):") || "";
        const r = await postJson(
          `/api/account/orders/${encodeURIComponent(oc.getAttribute("data-kn-order-cancel") || "")}/request`,
          { type: "cancel", reason },
        );
        alert(r.json.message || r.json.error || "");
        if (r.ok) reloadDashboard(doc);
        return;
      }

      const orf = t.closest("[data-kn-order-refund]");
      if (orf) {
        e.preventDefault();
        const reason =
          prompt(tr() ? "İade nedeni (isteğe bağlı):" : "Refund reason (optional):") || "";
        const r = await postJson(
          `/api/account/orders/${encodeURIComponent(orf.getAttribute("data-kn-order-refund") || "")}/request`,
          { type: "refund", reason },
        );
        alert(r.json.message || r.json.error || "");
        if (r.ok) reloadDashboard(doc);
      }
    },
    true,
  );
}

function initAccountTabFromUrl(doc: Document) {
  const win = doc.defaultView;
  if (!win) return;
  let tabParam = "";
  try {
    tabParam = new URL(win.location.href).searchParams.get("tab") || "";
  } catch {
    /* ignore */
  }
  if ((ACCOUNT_TAB_IDS as readonly string[]).includes(tabParam)) {
    showAccountTab(doc, tabParam);
  } else {
    showAccountTab(doc, "profile");
  }
}

/** Mirror hesap paneli — iframe yüklendiğinde parent veya inline script çağırır */
export function applyMirrorAccountDashboardClient(doc: Document) {
  if (!doc.querySelector("[data-kn-account-dashboard]")) return;

  const win = doc.defaultView as (Window & { __knAccountDashboardInited?: number }) | null;
  if (!win) return;

  bindAccountTabs(doc);
  bindMirrorTrAddressFields(doc);
  bindAddressCardButtons(doc);
  bindAccountForms(doc);
  bindAccountActions(doc);

  if (win.__knAccountDashboardInited) return;
  win.__knAccountDashboardInited = 1;

  initAccountTabFromUrl(doc);

  const root = doc.querySelector("[data-kn-account-dashboard]");
  if (!root || typeof MutationObserver === "undefined") return;

  const obs = new MutationObserver(() => {
    bindAccountTabs(doc);
    bindMirrorTrAddressFields(doc);
    bindAddressCardButtons(doc);
    bindAccountForms(doc);
  });
  obs.observe(root, { childList: true, subtree: true });
}
