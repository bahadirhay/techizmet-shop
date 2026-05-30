/** Vitrin — mobil menü açıkken viewport desktop olunca kapat */

export const MIRROR_MOBILE_DRAWER_RESET_SCRIPT = `function knCloseMobileDrawer(){
  document.querySelectorAll('#MobileDrawer,[data-drawer="mobile-menu-drawer"]').forEach(function(d){
    d.classList.remove("show","active","open","is-active");
    d.removeAttribute("open");
    d.style.display="";
  });
  document.querySelectorAll("[data-drawer]").forEach(function(d){
    if(d.getAttribute("data-drawer")==="mobile-menu-drawer"||d.id==="MobileDrawer"){
      d.classList.remove("show","active","open","is-active");
      d.removeAttribute("open");
      d.style.display="";
    }
  });
  document.body.classList.remove("overflow-hidden","hamburger-menu-open");
  document.documentElement.classList.remove("overflow-hidden");
  var toggler=document.querySelector("[data-mobile-toggler]");
  if(toggler)toggler.classList.remove("active");
  var hm=document.querySelector("hamburger-menu");
  if(hm){
    if(typeof hm.closeHamburger==="function"){
      try{hm.closeHamburger();}catch(e){}
    }
    hm.classList.remove("active");
    hm.style.display="";
  }
  document.querySelectorAll("[data-mobile-item].animate").forEach(function(el){
    el.classList.remove("animate");
  });
  document.querySelectorAll(".kn-mobile-nav-item.kn-mobile-nav-open").forEach(function(li){
    li.classList.remove("kn-mobile-nav-open");
  });
  document.querySelectorAll('.kn-mobile-menu-toggle[aria-expanded="true"]').forEach(function(btn){
    btn.setAttribute("aria-expanded","false");
    var panel=btn.nextElementSibling;
    if(panel)panel.hidden=true;
  });
}
function knOnDesktopViewport(){
  if(!window.matchMedia("(min-width: 992px)").matches)return;
  knCloseMobileDrawer();
  if(typeof knInitMegaPanels==="function")knInitMegaPanels();
  if(typeof knSyncMegaPanelPosition==="function")knSyncMegaPanelPosition();
}
function knBindMobileDrawerReset(){
  if(window.__knMobileDrawerBound)return;
  window.__knMobileDrawerBound=1;
  var run=function(){knOnDesktopViewport();};
  window.addEventListener("resize",run);
  var mq=window.matchMedia("(min-width: 992px)");
  if(mq.addEventListener)mq.addEventListener("change",run);
  else if(mq.addListener)mq.addListener(run);
}`;
