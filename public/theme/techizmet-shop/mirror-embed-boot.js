(function () {
  if (window.__knMirrorBoot) return;
  window.__knMirrorBoot = 1;
  var TOP = 400;
  function qs(s, r) {
    return (r || document).querySelector(s);
  }
  function qsa(s, r) {
    return Array.from((r || document).querySelectorAll(s));
  }
  function syncTop() {
    var el = qs(".scroll-to-top") || qs("[back-to-top-button]");
    if (!el) return;
    var st = window.pageYOffset || document.documentElement.scrollTop || 0;
    el.classList.toggle("show", st > TOP);
  }
  window.addEventListener(
    "scroll",
    function () {
      setTimeout(syncTop, 0);
    },
    { passive: true },
  );
  setInterval(syncTop, 250);
  document.addEventListener(
    "click",
    function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (!t.closest(".scroll-to-top,[back-to-top-button]")) return;
      ev.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    true,
  );
  syncTop();
  function parseUrls(raw) {
    if (!raw) return [];
    try {
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a.filter(function (u) {
        return typeof u === "string" && u.trim();
      }) : [];
    } catch (e) {
      return [];
    }
  }
  function bindGallery(media) {
    if (media.getAttribute("data-kn-gallery-bound") === "1") return;
    var urls = parseUrls(media.getAttribute("data-kn-gallery"));
    if (urls.length <= 1) return;
    media.setAttribute("data-kn-gallery-bound", "1");
    var img = media.querySelector("img");
    if (!img) return;
    function show(i) {
      if (urls[i] && urls[i] !== img.getAttribute("src")) img.setAttribute("src", urls[i]);
      qsa(".kn-card-gallery-seg", media).forEach(function (seg, j) {
        seg.classList.toggle("kn-card-gallery-seg--active", j === i);
      });
    }
    function idx(x, rect) {
      return Math.min(
        urls.length - 1,
        Math.max(0, Math.floor(((x - rect.left) / Math.max(rect.width, 1)) * urls.length)),
      );
    }
    media.addEventListener("pointerenter", function () {
      media.classList.add("kn-card-gallery-active");
      show(0);
    });
    media.addEventListener("pointermove", function (e) {
      show(idx(e.clientX, media.getBoundingClientRect()));
    });
    media.addEventListener("pointerleave", function () {
      media.classList.remove("kn-card-gallery-active");
      show(0);
    });
  }
  function initGalleries() {
    qsa("[data-kn-gallery]").forEach(bindGallery);
  }
  initGalleries();
  setInterval(initGalleries, 2000);
  function renderBar(p) {
    var pct = Math.max(0, Math.min(100, Number(p.progressPercent) || 0));
    return (
      '<div class="kn-street-food-bar__inner"><div class="kn-street-food-bar__title">🐾 ' +
      (p.title || "") +
      '</div><div class="kn-street-food-bar__meter"><div class="kn-street-food-bar__counts">Toplanan Mama: ' +
      (p.collectedLabel || "0 kg") +
      " / " +
      (p.targetLabel || "50 kg") +
      '</div><div class="kn-street-food-bar__track" aria-hidden="true"><div class="kn-street-food-bar__fill" style="width:' +
      pct +
      '%"></div></div></div><div class="kn-street-food-bar__sub">' +
      (p.counterSubtext || "") +
      '</div><a class="kn-street-food-bar__link" href="' +
      (p.detailHref || "/sokak-dostlari") +
      '">Detaylar</a></div>'
    );
  }
  function findBarAnchor() {
    return (
      qs(".section-announcement-bar") ||
      qs(".section-header") ||
      qs("[data-header-section]") ||
      document.body
    );
  }
  function mountBar(bar) {
    var anchor = findBarAnchor();
    if (anchor === document.body) {
      if (bar.parentElement !== document.body || bar !== document.body.firstElementChild) {
        document.body.prepend(bar);
      }
      return;
    }
    if (bar.parentElement !== anchor.parentElement || bar.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement("afterend", bar);
    }
  }
  function syncHeroUnderHeader() {
    var hero = qs("#kn-street-food-hero");
    if (!hero) return;
    var header = qs(".section-header");
    if (!header) return;
    var headerBottom = header.getBoundingClientRect().bottom;
    var heroTop = hero.getBoundingClientRect().top;
    var overlap = heroTop < headerBottom - 2;
    hero.style.visibility = overlap ? "hidden" : "";
    hero.style.pointerEvents = overlap ? "none" : "";
  }
  function applyBar(p) {
    if (!p || !p.enabled) return;
    if (!qs("#kn-street-food-bar-styles")) {
      var st = document.createElement("style");
      st.id = "kn-street-food-bar-styles";
      st.textContent =
        "#kn-street-food-bar{position:relative;z-index:1;width:100%;background:linear-gradient(90deg,#1f4d3a 0%,#2d6a4f 55%,#40916c 100%);color:#fff;font-size:12px;line-height:1.35;box-shadow:0 1px 0 rgba(255,255,255,.08)}#kn-street-food-bar[hidden]{display:none!important}.kn-street-food-bar__inner{max-width:1320px;margin:0 auto;padding:8px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px}.kn-street-food-bar__title{font-weight:700;white-space:nowrap}.kn-street-food-bar__meter{flex:1 1 180px;min-width:140px}.kn-street-food-bar__counts{font-weight:600;white-space:nowrap}.kn-street-food-bar__track{height:4px;border-radius:999px;background:rgba(255,255,255,.25);margin-top:4px;overflow:hidden}.kn-street-food-bar__fill{height:100%;border-radius:999px;background:#b7e4c7;transition:width .35s ease}.kn-street-food-bar__sub{opacity:.92;font-size:11px}.kn-street-food-bar__link{color:#fff;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}";
      document.head.appendChild(st);
    }
    var bar = qs("#kn-street-food-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "kn-street-food-bar";
    }
    mountBar(bar);
    bar.removeAttribute("hidden");
    bar.innerHTML = renderBar(p);
    syncHeroUnderHeader();
  }
  function refreshBar() {
    fetch("/api/vitrin/street-food-fund", { cache: "no-store", credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(applyBar)
      .catch(function () {});
  }
  if (!qs("[data-kn-street-food-fund-page]")) {
    refreshBar();
    setInterval(refreshBar, 60000);
    window.addEventListener("scroll", syncHeroUnderHeader, { passive: true });
  }
})();
