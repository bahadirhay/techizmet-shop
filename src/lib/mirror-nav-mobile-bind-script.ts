/** Vitrin mobil menü — kn-store-bridge ile aynı HTML + accordion */

export const MIRROR_MOBILE_NAV_BIND_SCRIPT = `function knMobileNavSubLinks(links){
  return(links||[]).map(function(l){
    return'<li><a href="'+knEscNav(l.href)+'" class="kn-mobile-nav-sublink">'+knEscNav(l.label)+'</a></li>';
  }).join("");
}
function knMobileNavColumnsPanel(cols,href){
  var tr=document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0;
  var all=tr?"Tümünü gör":"View all";
  var groups=(cols||[]).map(function(col){
    var title=col.href
      ?'<a href="'+knEscNav(col.href)+'" class="kn-mobile-nav-group-title">'+knEscNav(col.title)+"</a>"
      :'<span class="kn-mobile-nav-group-title">'+knEscNav(col.title)+"</span>";
    var links=(col.links&&col.links.length)?('<ul class="kn-mobile-nav-sublist">'+knMobileNavSubLinks(col.links)+"</ul>"):"";
    return'<div class="kn-mobile-nav-group">'+title+links+"</div>";
  }).join("");
  return'<a href="'+knEscNav(href)+'" class="kn-mobile-nav-parent-link">'+all+"</a>"+groups;
}
function knMobileNavItemHtml(it,idx){
  var n=idx+1;
  var href=knEscNav(it.href);
  var label=knEscNav(it.label||it.labelTr||it.labelEn||"");
  var hasCol=it.columns&&it.columns.length;
  var hasCh=it.children&&it.children.length;
  if(!hasCol&&!hasCh){
    return'<li class="mobile-menu--item menu-item-'+n+' kn-mobile-nav-item" data-mobile-item><a href="'+href+'" class="mobile-menu--link heading-font h5 cursor-pointer">'+label+"</a></li>";
  }
  var panel=hasCol?knMobileNavColumnsPanel(it.columns,it.href):('<ul class="kn-mobile-nav-sublist kn-mobile-nav-sublist--flat">'+knMobileNavSubLinks(it.children)+"</ul>");
  return'<li class="mobile-menu--item menu-item-'+n+' kn-mobile-nav-item kn-mobile-nav-item--has-sub" data-mobile-item><button type="button" class="kn-mobile-menu-toggle heading-font h5" aria-expanded="false"><span class="kn-mobile-menu-summary__label">'+label+'</span><span class="kn-mobile-menu-chevron" aria-hidden="true"></span></button><div class="kn-mobile-nav-panel" hidden>'+panel+"</div></li>";
}
function knBindMobileNavAccordion(){
  document.querySelectorAll(".kn-mobile-menu-toggle").forEach(function(btn){
    if(btn.dataset.knNavBound==="1")return;
    btn.dataset.knNavBound="1";
    btn.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      var open=btn.getAttribute("aria-expanded")==="true";
      var panel=btn.nextElementSibling;
      btn.setAttribute("aria-expanded",open?"false":"true");
      if(panel)panel.hidden=open;
      var li=btn.closest(".kn-mobile-nav-item");
      if(li)li.classList.toggle("kn-mobile-nav-open",!open);
    });
  });
}
function knApplyMobileNav(nav){
  if(!nav||!nav.length)return;
  document.querySelectorAll("ul.mobile-menu--list").forEach(function(ul){
    ul.innerHTML=nav.map(knMobileNavItemHtml).join("");
    ul.setAttribute("data-kn-mobile-nav-injected","1");
  });
  knBindMobileNavAccordion();
}`;
