
(function () {
  function knEscNav(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");}
function knNavDropdownLinks(links){return(links||[]).map(function(l){return"<li><a href=\""+knEscNav(l.href)+"\">"+knEscNav(l.label)+"</a></li>";}).join("");}
function knMegaFeatured(cols){
  var feat=null,promo="/collections/all";
  cols.forEach(function(col){
    if(col.href)promo=col.href;
    (col.links||[]).forEach(function(l){if(!feat)feat=l;if(!feat&&l.href.indexOf("/products/")===0)feat=l;});
  });
  if(!feat&&cols[0]&&(cols[0].links||[])[0])feat=cols[0].links[0];
  var tr=document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0;
  var fh=feat?feat.href:promo;
  var meta=(window.__knMegaMeta&&window.__knMegaMeta.current)||{};
  var featuredImg=meta.featuredImageUrl||"/theme/king-noor/nav-mega-featured.jpg";
  var secondaryImg=meta.featuredSecondaryImageUrl||meta.promoImageUrl||"/theme/king-noor/nav-mega-promo.jpg";
  var promoImg=meta.promoImageUrl||"/theme/king-noor/nav-mega-promo.jpg";
  var title1=tr?(meta.featuredTitleTr||"Yeni Gelenler"):(meta.featuredTitleEn||"New Arrivals");
  var title2=tr?"Çok Satanlar":"Best Sellers";
  return "<div class=\"col-md-6 col-sm-6 mega-img kn-nav-mega__aside\"><div class=\"row megaproimg kn-nav-mega__aside-row\"><div class=\"col-md-6 col-sm-12 kn-nav-mega__tile-col\"><a href=\""+knEscNav(fh)+"\" class=\"kn-nav-mega__tile\"><span class=\"kn-nav-mega__tile-img\" style=\"background-image:url('"+knEscNav(featuredImg)+"')\"></span><span class=\"kn-nav-mega__tile-title\">"+knEscNav(title1)+"</span></a></div><div class=\"col-md-6 col-sm-12 kn-nav-mega__tile-col kn-nav-mega__tile-col--secondary\"><a href=\""+knEscNav(promo)+"\" class=\"kn-nav-mega__tile\"><span class=\"kn-nav-mega__tile-img\" style=\"background-image:url('"+knEscNav(secondaryImg||promoImg)+"')\"></span><span class=\"kn-nav-mega__tile-title\">"+knEscNav(title2)+"</span></a></div></div></div>";
}
function knNavItemHtml(it){
  var href=knEscNav(it.href),label=knEscNav(it.label||it.labelTr||it.labelEn||"");
  if(it.columns&&it.columns.length){
    var cols=it.columns.map(function(col){
      var title=col.href
        ? "<a class=\"currentm kn-nav-mega__heading\" href=\""+knEscNav(col.href)+"\">"+knEscNav(col.title)+"</a>"
        : "<span class=\"currentm kn-nav-mega__heading\">"+knEscNav(col.title)+"</span>";
      var links=(col.links&&col.links.length)?("<ul class=\"dropdown kn-nav-mega__links\">"+knNavDropdownLinks(col.links)+"</ul>"):"";
      return"<div class=\"inner col-sm-6 col-xs-12 kn-nav-mega__inner\">"+title+links+"</div>";
    }).join("");
    window.__knMegaMeta={current:(it&&it.mega)||{}};
    var mega="<div class=\"kn-nav-dropdown kn-nav-dropdown--mega kn-nav-dropdown--fruitser\" data-kn-nav-dropdown><div class=\"kn-nav-dropdown__panel\"><div class=\"style_1 row kn-nav-mega__row\"><div class=\"parent-mega-menu parent-mega-menu col-md-6 col-sm-6 kn-nav-mega__left\"><div class=\"row kn-nav-mega__categories\">"+cols+"</div></div>"+knMegaFeatured(it.columns)+"</div></div></div>";
    return"<li class=\"header--menu-item kn-nav-has-dropdown\" data-kn-nav-parent><a href=\""+href+"\" class=\"header--menu-link heading-font text-small\">"+label+"</a>"+mega+"</li>";
  }
  if(it.children&&it.children.length){
    var simple="<div class=\"kn-nav-dropdown kn-nav-dropdown--simple\" data-kn-nav-dropdown><div class=\"kn-nav-dropdown__panel\"><ul class=\"kn-nav-dropdown__links\">"+knNavDropdownLinks(it.children)+"</ul></div></div>";
    return"<li class=\"header--menu-item kn-nav-has-dropdown\" data-kn-nav-parent><a href=\""+href+"\" class=\"header--menu-link heading-font text-small\">"+label+"</a>"+simple+"</li>";
  }
  return"<li class=\"header--menu-item\"><a href=\""+href+"\" class=\"header--menu-link heading-font text-small\">"+label+"</a></li>";
}
function knBindNavDropdown(){
  document.querySelectorAll(".kn-nav-has-dropdown").forEach(function(li){
    if(li.dataset.knNavBound==="1")return;
    li.dataset.knNavBound="1";
    li.addEventListener("mouseenter",function(){
      document.body.classList.add("kn-nav-dropdown-open");
      li.classList.add("kn-nav-open");
    });
    li.addEventListener("mouseleave",function(){
      li.classList.remove("kn-nav-open");
      if(!document.querySelector(".kn-nav-has-dropdown:hover")){
        document.body.classList.remove("kn-nav-dropdown-open");
      }
    });
  });
}
  function getLocale() {
    var m = document.cookie.match(/(?:^|;)\s*shop_locale=([^;]+)/);
    return (m && m[1]) || "en";
  }
  function localeMarkup() {
    return '<div class="kn-iframe-locale localization-form" data-kn-locale-root role="group" aria-label="Dil"><button type="button" data-locale="tr">Türkçe</button><button type="button" data-locale="en">English</button></div>';
  }
  function openDrawer(source) {
    var drawer = document.querySelector('[data-drawer="' + source + '"]');
    if (!drawer) return false;
    document.querySelectorAll("search-drawer,account-drawer,cart-drawer,mobile-menu,[data-drawer]").forEach(function (d) {
      d.removeAttribute("open");
      d.classList.remove("active", "is-active", "open", "show");
    });
    drawer.classList.add("show");
    drawer.setAttribute("open", "");
    document.body.classList.add("overflow-hidden");
    document.documentElement.classList.add("overflow-hidden");
    return true;
  }
  function bindLocale(root) {
    if (!root || root.dataset.knBound) return;
    root.dataset.knBound = "1";
    var cur = getLocale();
    root.querySelectorAll("[data-locale]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-locale") === cur);
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-locale");
        if (!next || next === cur) return;
        if (window.top !== window.self) {
          window.top.postMessage({ type: "kn-set-locale", locale: next }, "*");
          return;
        }
        fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        }).then(function () { window.location.reload(); });
      });
    });
  }
  function navItemHtml(it) { return knNavItemHtml(it); }
  function applyNav(nav) {
    if (!nav || !nav.length) return;
    document.querySelectorAll("ul.header--navigation-list").forEach(function (ul) {
      ul.innerHTML = nav.map(navItemHtml).join("");
      ul.setAttribute("data-kn-nav-injected", "1");
    });
    document.querySelectorAll(".no-js-menu nav > ul").forEach(function (ul) {
      ul.innerHTML = nav
        .map(function (it) {
          var links = [];
          if (it.columns) it.columns.forEach(function (c) { (c.links || []).forEach(function (l) { links.push(l); }); });
          else if (it.children) links = it.children;
          var sub = links.length
            ? "<ul>" + links.map(function (l) {
                return '<li><a href="' + l.href + '">' + (l.label || "") + "</a></li>";
              }).join("") + "</ul>"
            : "";
          return '<li><a class="header--menu-link" href="' + it.href + '">' + (it.label || it.labelEn || "") + "</a>" + sub + "</li>";
        })
        .join("");
    });
    knBindNavDropdown();
  }
  document.querySelectorAll("[data-kn-locale-root]").forEach(bindLocale);
  fetch("/api/store/bootstrap")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      knBindNavDropdown();
      var injected = document.querySelector("ul.header--navigation-list[data-kn-nav-injected]");
      if (document.documentElement.dataset.knNavServer === "1" && injected) return;
      if (d.nav && d.nav.length) applyNav(d.nav);
      document.querySelectorAll("[data-kn-locale-root]").forEach(bindLocale);
    })
    .catch(function () {});
  document.addEventListener("click", function (e) {
    var listSet = e.target && e.target.closest ? e.target.closest("list-set[data-behaviour='drawer']") : null;
    if (listSet) {
      e.preventDefault();
      e.stopPropagation();
      openDrawer(listSet.getAttribute("data-source") || "");
      return;
    }
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href === "#" || href.indexOf("search.html") >= 0) {
      e.preventDefault();
      openDrawer("search-drawer");
      return;
    }
    if (!href || href.charAt(0) !== "/" || href.indexOf("/theme/") === 0) return;
    if (window.top === window.self) return;
    e.preventDefault();
    window.top.location.href = href;
  }, true);
  function closeDrawers() {
    document.querySelectorAll("[data-drawer]").forEach(function (d) {
      d.removeAttribute("open");
      d.classList.remove("active", "is-active", "open", "show");
    });
    document.body.classList.remove("overflow-hidden");
    document.documentElement.classList.remove("overflow-hidden");
  }
  document.querySelectorAll("[data-close-drawer],[data-drawer-close]").forEach(function (btn) {
    btn.addEventListener("click", closeDrawers);
  });
})();
