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
  // setInterval(syncTop, 250) kaldırıldı — scroll event yeterli, her 250ms polling gereksizdi
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
  function bootMarqueeSections() {
    qsa("section.section-marquee").forEach(function (section) {
      section.classList.add("kn-marquee-readable");
      qsa(".marquee--block-node", section).forEach(function (node) {
        node.classList.add("autoplay--infinite");
      });
      qsa(".marquee-text .outline--filled", section).forEach(function (el) {
        el.classList.add("outline-animate");
      });
    });
  }
  bootMarqueeSections();
  setTimeout(bootMarqueeSections, 80);
  setTimeout(bootMarqueeSections, 600);
  // Galeri binding: 20 saniye boyunca her 2 saniyede çalışır, sonra durur (sonsuz DOM taraması yerine)
  var _galleryTick = 0;
  var _galleryInterval = setInterval(function () {
    initGalleries();
    if (++_galleryTick >= 10) clearInterval(_galleryInterval);
  }, 2000);
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
    applyHero(p);
    syncHeroUnderHeader();
  }
  function renderHero(p) {
    var pct = Math.max(0, Math.min(100, Number(p.progressPercent) || 0));
    var href = p.detailHref || "/sokak-dostlari";
    return (
      '<div class="kn-street-food-hero__card"><div class="kn-street-food-hero__title">🐾 ' +
      (p.title || "") +
      '</div><p class="kn-street-food-hero__slogan">' +
      (p.slogan || "") +
      '</p><div class="kn-street-food-hero__counts">Toplanan Mama: ' +
      (p.collectedLabel || "0 kg") +
      " / " +
      (p.targetLabel || "50 kg") +
      '</div><div class="kn-street-food-hero__track" aria-hidden="true"><div class="kn-street-food-hero__fill" style="width:' +
      pct +
      '%"></div></div><p class="kn-street-food-hero__sub">' +
      (p.counterSubtext || "") +
      '</p><a class="kn-street-food-hero__link" href="' +
      href +
      '">Detaylar →</a></div>'
    );
  }
  function applyHero(p) {
    if (!p || !p.enabled) return;
    var host =
      qs("#MainContent > .section-media-grid:first-of-type .media-grid--wrapper") ||
      qs("#MainContent .section-media-grid:first-of-type .media-grid--wrapper");
    if (!host) return;
    if (!qs("#kn-street-food-hero-styles")) {
      var st = document.createElement("style");
      st.id = "kn-street-food-hero-styles";
      st.textContent =
        "#MainContent>.section-media-grid:first-of-type .media-grid--wrapper,#MainContent .section-media-grid:first-of-type .media-grid--wrapper{position:relative}#kn-street-food-hero{position:absolute;left:16px;right:16px;bottom:16px;z-index:2;pointer-events:none;max-width:420px}#kn-street-food-hero[hidden]{display:none!important}.kn-street-food-hero__card{pointer-events:auto;border-radius:14px;padding:14px 16px;background:linear-gradient(135deg,rgba(31,77,58,.94) 0%,rgba(45,106,79,.92) 100%);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.22);backdrop-filter:blur(6px)}.kn-street-food-hero__title{font-size:14px;font-weight:700;line-height:1.3}.kn-street-food-hero__slogan{margin-top:6px;font-size:12px;line-height:1.4;opacity:.95}.kn-street-food-hero__counts{margin-top:10px;font-size:12px;font-weight:600}.kn-street-food-hero__track{height:5px;border-radius:999px;background:rgba(255,255,255,.25);margin-top:6px;overflow:hidden}.kn-street-food-hero__fill{height:100%;border-radius:999px;background:#b7e4c7;transition:width .35s ease}.kn-street-food-hero__sub{margin-top:8px;font-size:11px;opacity:.9}.kn-street-food-hero__link{display:inline-block;margin-top:8px;color:#fff;font-size:11px;font-weight:600;text-decoration:underline;text-underline-offset:2px}@media(min-width:768px){#kn-street-food-hero{left:24px;right:auto;bottom:24px;max-width:380px}}@media(max-width:640px){#kn-street-food-hero{left:10px;right:10px;bottom:10px;max-width:none}.kn-street-food-hero__card{padding:12px 14px}}";
      document.head.appendChild(st);
    }
    var hero = qs("#kn-street-food-hero");
    if (!hero) {
      hero = document.createElement("div");
      hero.id = "kn-street-food-hero";
      host.appendChild(hero);
    }
    hero.removeAttribute("hidden");
    hero.innerHTML = renderHero(p);
  }
  function refreshBar() {
    if (document.querySelector(".kn-street-food-fund-bar, #kn-street-food-bar")) return;
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
  function bootTabPriceHover() {
    qsa("[data-content-item]").forEach(function (card) {
      if (card.getAttribute("data-kn-tab-price-hover") === "1") return;
      var infoBox = card.querySelector("[data-item-info]");
      if (!infoBox) return;
      card.setAttribute("data-kn-tab-price-hover", "1");
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        infoBox.style.transform =
          "translate(" + (e.clientX - rect.left) + "px, " + (e.clientY - rect.top) + "px)";
        infoBox.style.opacity = "1";
      });
      card.addEventListener("mouseleave", function () {
        infoBox.style.opacity = "0";
      });
    });
  }
  bootTabPriceHover();
  setTimeout(bootTabPriceHover, 500);
  setTimeout(bootTabPriceHover, 2500);
})();
