/** iframe içine enjekte edilen tıkla-düzenle betiği (string) */
export const MIRROR_VISUAL_EDITOR_VERSION = "6";

export const MIRROR_VISUAL_EDITOR_SCRIPT = `
(function () {
  var win = window;
  if (win.__knVisualEditorCleanup) {
    win.__knVisualEditorCleanup();
  }

  var handlers = [];
  function listen(type, fn, opts) {
    document.addEventListener(type, fn, opts);
    handlers.push([type, fn, opts]);
  }

  function neuterAllLinks() {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href === "#" || href.indexOf("#MainContent") === 0) return;
      if (a.getAttribute("data-kn-saved-href")) return;
      a.setAttribute("data-kn-saved-href", href);
      a.setAttribute("href", "#");
      a.removeAttribute("target");
      a.setAttribute("data-kn-nav-disabled", "1");
    });
  }

  var style = document.createElement("style");
  style.id = "kn-visual-editor-style";
  style.textContent = [
    "html.kn-visual-edit-mode, html.kn-visual-edit-mode body { cursor: default; }",
    "html.kn-visual-edit-mode a[href] { pointer-events: none !important; cursor: default !important; }",
    "html.kn-visual-edit-mode [data-kn-edit] { pointer-events: auto !important; cursor: pointer !important; }",
    "html.kn-visual-edit-mode .announcement-bar a,",
    "html.kn-visual-edit-mode header a,",
    "html.kn-visual-edit-mode footer a,",
    "html.kn-visual-edit-mode nav a,",
    "html.kn-visual-edit-mode a.collection--card { pointer-events: none !important; }",
    "html.kn-visual-edit-mode #MainContent .page--banner .page--banner-img,",
    "html.kn-visual-edit-mode #MainContent .page--banner .page--banner-img .media-wrapper { pointer-events: none !important; }",
    "html.kn-visual-edit-mode #MainContent .page--banner .page--banner-img img[data-kn-edit] { pointer-events: auto !important; z-index: 2; }",
    "html.kn-visual-edit-mode #MainContent .page--banner .page--banner-content { pointer-events: auto !important; position: relative; z-index: 4; }",
    "[data-kn-edit] { cursor: pointer !important; }",
    "[data-kn-edit]:hover { outline: 2px dashed rgba(225,29,72,.85) !important; outline-offset: 2px; }",
    "[data-kn-edit].kn-edit-active { outline: 3px solid #e11d48 !important; outline-offset: 2px; }",
    "html.kn-visual-edit-mode .page--title,",
    "html.kn-visual-edit-mode .page--desc { opacity: 1 !important; visibility: visible !important; }",
  ].join("\\n");
  document.documentElement.classList.add("kn-visual-edit-mode");
  if (!document.getElementById("kn-visual-editor-style")) {
    document.head.appendChild(style);
  }
  neuterAllLinks();

  function isInMain(el) {
    return el && el.closest && el.closest("#MainContent");
  }

  function notifyPick(el) {
    var id = el.getAttribute("data-kn-edit");
    if (!id) return;
    var kind = el.getAttribute("data-kn-kind") || "text";
    var value = "";
    if (kind === "image") {
      value = el.getAttribute("data-original") || el.src || "";
    } else if (kind === "link") {
      value = el.getAttribute("data-kn-saved-href") || el.getAttribute("href") || "";
    } else if (kind === "html") {
      value = el.innerHTML || "";
    } else {
      value = (el.textContent || "").trim();
    }
    var label = (el.textContent || "").trim().slice(0, 60) || el.tagName;
    win.parent.postMessage({
      type: "kn-element-pick",
      id: id,
      kind: kind,
      value: value,
      label: label,
    }, "*");
  }

  function blockNav(reason, href) {
    win.parent.postMessage({
      type: "kn-nav-blocked",
      href: href || "",
      reason: reason || "nav",
    }, "*");
  }

  function blockLinkEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    return false;
  }

  function resolveEditTarget(t) {
    var editEl = t.closest("[data-kn-edit]");
    if (editEl && isInMain(editEl)) return editEl;
    if (!isInMain(t)) return null;
    var banner = t.closest(".page--banner, section.page-banner");
    if (!banner) return null;
    if (t.closest(".page--banner-img")) {
      return banner.querySelector(".page--banner-img img[data-kn-edit], img[data-kn-edit]");
    }
    return (
      banner.querySelector(".page--title[data-kn-edit]") ||
      banner.querySelector(".page--desc[data-kn-edit]")
    );
  }

  function onPointer(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var editEl = resolveEditTarget(t);
    if (editEl) {
      blockLinkEvent(e);
      if (e.type === "click") {
        document.querySelectorAll(".kn-edit-active").forEach(function (n) {
          n.classList.remove("kn-edit-active");
        });
        editEl.classList.add("kn-edit-active");
        notifyPick(editEl);
      }
      return;
    }

    var anchor = t.closest("a[href]");
    if (anchor) {
      blockLinkEvent(e);
      if (e.type === "click") {
        var saved = anchor.getAttribute("data-kn-saved-href") || anchor.getAttribute("href") || "";
        if (anchor.classList.contains("collection--card") || anchor.closest(".collection--card-item")) {
          blockNav("collection-card", saved);
        } else if (!isInMain(anchor)) {
          blockNav("header-footer", saved);
        } else {
          blockNav("main-link", saved);
        }
      }
    }
  }

  listen("click", onPointer, true);
  listen("mousedown", onPointer, true);
  listen("mouseup", onPointer, true);
  listen("auxclick", onPointer, true);
  listen("pointerdown", onPointer, true);
  listen("touchstart", onPointer, { capture: true, passive: false });

  listen("submit", function (e) {
    e.preventDefault();
  }, true);

  var lastPath = win.location.pathname;
  var navGuard = setInterval(function () {
    if (win.location.pathname !== lastPath) {
      win.parent.postMessage({ type: "kn-iframe-navigated", path: win.location.pathname }, "*");
      lastPath = win.location.pathname;
    }
  }, 200);

  win.__knVisualEditor = true;
  win.__knVisualEditorVersion = "${MIRROR_VISUAL_EDITOR_VERSION}";
  win.__knVisualEditorCleanup = function () {
    clearInterval(navGuard);
    handlers.forEach(function (h) {
      document.removeEventListener(h[0], h[1], h[2]);
    });
    handlers = [];
    document.documentElement.classList.remove("kn-visual-edit-mode");
    var st = document.getElementById("kn-visual-editor-style");
    if (st) st.remove();
    delete win.__knVisualEditor;
    delete win.__knVisualEditorCleanup;
    delete win.__knVisualEditorVersion;
  };
})();
`;

declare global {
  interface Window {
    __knVisualEditorVersion?: string;
    __knVisualEditorCleanup?: () => void;
  }
}
