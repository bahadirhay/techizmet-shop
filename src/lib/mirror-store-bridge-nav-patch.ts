/** Eski mirror HTML — kn-store-bridge menüsünü mega dropdown ile güncelle */

import { MIRROR_NAV_DROPDOWN_BIND_SCRIPT } from "@/lib/mirror-nav-dropdown-bind-script";
import { MIRROR_MOBILE_DRAWER_RESET_SCRIPT } from "@/lib/mirror-mobile-drawer-reset-script";
import { MIRROR_MOBILE_NAV_BIND_SCRIPT } from "@/lib/mirror-nav-mobile-bind-script";

const NAV_BRIDGE_FN = `function knEscNav(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");}
function knNavDropdownLinks(links){return(links||[]).map(function(l){return"<li><a href=\\""+knEscNav(l.href)+"\\">"+knEscNav(l.label)+"</a></li>";}).join("");}
function knMegaProductCard(p){
  var img=p.imageUrl?" style=\\"background-image:url('"+knEscNav(p.imageUrl)+"')\\"":"";
  var cmp=p.compareLabel?"<span class=\\"kn-nav-mega__product-compare\\">"+knEscNav(p.compareLabel)+"</span>":"";
  return "<a href=\\""+knEscNav(p.href)+"\\" class=\\"kn-nav-mega__product\\" role=\\"listitem\\"><span class=\\"kn-nav-mega__product-img\\""+img+"></span><span class=\\"kn-nav-mega__product-title\\">"+knEscNav(p.title)+"</span><span class=\\"kn-nav-mega__product-prices\\"><span class=\\"kn-nav-mega__product-price\\">"+knEscNav(p.priceLabel)+"</span>"+cmp+"</span></a>";
}
function knMegaProductsStrip(products){
  if(!products||!products.length)return "";
  return "<div class=\\"kn-nav-mega__products-wrap kn-nav-mega__products-wrap--strip\\"><div class=\\"kn-nav-mega__products-track\\" role=\\"list\\">"+products.map(knMegaProductCard).join("")+"</div></div>";
}
function knMegaProductsSlot(products){
  if(!products||!products.length)return "";
  return "<div class=\\"kn-nav-mega__products-wrap kn-nav-mega__products-wrap--slot\\"><div class=\\"kn-nav-mega__products-slot\\" role=\\"list\\">"+products.map(knMegaProductCard).join("")+"</div></div>";
}
function knMegaImageTile(href,img,title,secondary){
  var col=secondary?"col-md-6 col-sm-12 kn-nav-mega__tile-col kn-nav-mega__tile-col--secondary":"col-md-6 col-sm-12 kn-nav-mega__tile-col";
  return "<div class=\\""+col+"\\"><a href=\\""+knEscNav(href)+"\\" class=\\"kn-nav-mega__tile\\"><span class=\\"kn-nav-mega__tile-img\\" style=\\"background-image:url('"+knEscNav(img)+"')\\"></span><span class=\\"kn-nav-mega__tile-title\\">"+knEscNav(title)+"</span></a></div>";
}
function knMegaFeatured(cols,it){
  var feat=null,promo="/collections/all";
  cols.forEach(function(col){
    if(col.href)promo=col.href;
    (col.links||[]).forEach(function(l){if(!feat&&l.href.indexOf("/products/")===0)feat=l;});
  });
  if(!feat&&cols[0]&&(cols[0].links||[])[0])feat=cols[0].links[0];
  var tr=document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0;
  var fh=feat?feat.href:promo;
  var meta=(it&&it.mega)||(window.__knMegaMeta&&window.__knMegaMeta.current)||{};
  var products=(it&&it.products)||[];
  var featuredUrl=(meta.featuredImageUrl||"").trim();
  var secondaryUrl=((meta.featuredSecondaryImageUrl||meta.promoImageUrl)||"").trim();
  var hasFeatured=!!featuredUrl;
  var hasSecondary=!!secondaryUrl;
  var emptySlots=(hasFeatured?0:1)+(hasSecondary?0:1);
  var title1=tr?(meta.featuredTitleTr||(feat&&feat.label)||"Yeni Gelenler"):(meta.featuredTitleEn||(feat&&feat.label)||"New Arrivals");
  var title2=tr?"Çok Satanlar":"Best Sellers";
  var slot1=[],slot2=[],strip=[];
  if(products.length){
    if(emptySlots===0)strip=products;
    else if(emptySlots===1){if(!hasFeatured)slot1=products;else slot2=products;}
    else{var mid=Math.ceil(products.length/2);slot1=products.slice(0,mid);slot2=products.slice(mid);}
  }
  var colsHtml="";
  if(hasFeatured)colsHtml+=knMegaImageTile(fh,featuredUrl,title1,false);
  else if(slot1.length)colsHtml+="<div class=\\"col-md-6 col-sm-12 kn-nav-mega__tile-col kn-nav-mega__tile-col--products\\">"+knMegaProductsSlot(slot1)+"</div>";
  if(hasSecondary)colsHtml+=knMegaImageTile(promo,secondaryUrl,title2,true);
  else if(slot2.length)colsHtml+="<div class=\\"col-md-6 col-sm-12 kn-nav-mega__tile-col kn-nav-mega__tile-col--products kn-nav-mega__tile-col--secondary\\">"+knMegaProductsSlot(slot2)+"</div>";
  var stripHtml=knMegaProductsStrip(strip);
  if(!colsHtml&&!stripHtml)return "";
  return "<div class=\\"col-md-6 col-sm-6 mega-img kn-nav-mega__aside\\"><div class=\\"row megaproimg kn-nav-mega__aside-row\\">"+colsHtml+"</div>"+stripHtml+"</div>";
}
function knNavItemHtml(it){
  var href=knEscNav(it.href),label=knEscNav(it.label||it.labelTr||it.labelEn||"");
  if(it.columns&&it.columns.length){
    var cols=it.columns.map(function(col){
      var title=col.href
        ? "<a class=\\"currentm kn-nav-mega__heading\\" href=\\""+knEscNav(col.href)+"\\">"+knEscNav(col.title)+"</a>"
        : "<span class=\\"currentm kn-nav-mega__heading\\">"+knEscNav(col.title)+"</span>";
      var links=(col.links&&col.links.length)?("<ul class=\\"kn-nav-mega__links\\">"+knNavDropdownLinks(col.links)+"</ul>"):"";
      return"<div class=\\"inner col-sm-6 col-xs-12 kn-nav-mega__inner\\">"+title+links+"</div>";
    }).join("");
    window.__knMegaMeta={current:(it&&it.mega)||{}};
    var mega="<div class=\\"kn-nav-dropdown kn-nav-dropdown--mega kn-nav-dropdown--fruitser\\" data-kn-nav-dropdown><div class=\\"kn-nav-dropdown__panel\\"><div class=\\"style_1 row kn-nav-mega__row\\"><div class=\\"parent-mega-menu parent-mega-menu col-md-6 col-sm-6 kn-nav-mega__left\\"><div class=\\"row kn-nav-mega__categories\\">"+cols+"</div></div>"+knMegaFeatured(it.columns,it)+"</div></div></div>";
    return"<li class=\\"header--menu-item kn-nav-has-dropdown\\" data-kn-nav-parent><a href=\\""+href+"\\" class=\\"header--menu-link heading-font text-small\\">"+label+"</a>"+mega+"</li>";
  }
  if(it.children&&it.children.length){
    var simple="<div class=\\"kn-nav-dropdown kn-nav-dropdown--simple\\" data-kn-nav-dropdown><div class=\\"kn-nav-dropdown__panel\\"><ul class=\\"kn-nav-dropdown__links\\">"+knNavDropdownLinks(it.children)+"</ul></div></div>";
    return"<li class=\\"header--menu-item kn-nav-has-dropdown\\" data-kn-nav-parent><a href=\\""+href+"\\" class=\\"header--menu-link heading-font text-small\\">"+label+"</a>"+simple+"</li>";
  }
  return"<li class=\\"header--menu-item\\"><a href=\\""+href+"\\" class=\\"header--menu-link heading-font text-small\\">"+label+"</a></li>";
}
${MIRROR_MOBILE_NAV_BIND_SCRIPT}
${MIRROR_MOBILE_DRAWER_RESET_SCRIPT}
${MIRROR_NAV_DROPDOWN_BIND_SCRIPT}`;

export function patchMirrorStoreBridgeNavigation(html: string): string {
  if (!html.includes("kn-store-bridge") || html.includes("knNavItemHtml")) {
    return html;
  }

  let out = html.replace(
    /function navItemHtml\(it\) \{[\s\S]*?\n  \}/,
    `function navItemHtml(it) { return knNavItemHtml(it); }`,
  );

  out = out.replace(
    /function applyNav\(nav\) \{[\s\S]*?\n  \}/,
    `function applyNav(nav) {
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
    knApplyMobileNav(nav);
    knBindNavDropdown();
    knBindMobileDrawerReset();
  }`,
  );

  out = out.replace(
    /fetch\("\/api\/store\/bootstrap"\)\s*\n\s*\.then\(function \(r\) \{ return r\.json\(\); \}\)\s*\n\s*\.then\(function \(d\) \{\s*\n\s*if \(d\.nav\) applyNav\(d\.nav\);/,
    `fetch("/api/store/bootstrap")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      knBindNavDropdown();
      knBindMobileDrawerReset();
      var injected = document.querySelector("ul.header--navigation-list[data-kn-nav-injected]");
      if (document.documentElement.dataset.knNavServer === "1" && injected) return;
      if (d.nav && d.nav.length) applyNav(d.nav);`,
  );

  return out.replace(
    /\(function \(\) \{\s*\n  function getLocale\(\)/,
    `(function () {
  ${NAV_BRIDGE_FN}
  function getLocale()`,
  );
}
