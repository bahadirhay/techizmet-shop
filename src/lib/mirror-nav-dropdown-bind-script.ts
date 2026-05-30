/** Vitrin iframe — mega menü: header altına DOM ile yapışık (fixed + getBoundingClientRect yok) */

export const MIRROR_NAV_DROPDOWN_BIND_SCRIPT = `function knHeaderRoot(){
  return document.querySelector("header.section-header")||document.querySelector("sticky-always.header")||document.querySelector("[data-header-section]");
}
function knEnsureMegaHost(){
  var root=knHeaderRoot();
  var host=document.getElementById("kn-mega-host");
  if(!host){
    host=document.createElement("div");
    host.id="kn-mega-host";
    host.setAttribute("aria-hidden","true");
  }
  if(root&&host.parentElement!==root){
    root.appendChild(host);
  }else if(!root&&host.parentElement!==document.body){
    document.body.appendChild(host);
  }
  host.style.removeProperty("top");
  return host;
}
function knMegaUseHost(){
  return window.matchMedia("(min-width: 992px)").matches;
}
function knInitMegaPanels(){
  var host=knEnsureMegaHost();
  var portal=knMegaUseHost();
  var idx=0;
  document.querySelectorAll(".kn-nav-has-dropdown").forEach(function(li){
    var id=li.dataset.knNavMegaId;
    var mega=li.querySelector(".kn-nav-dropdown--fruitser");
    if(!mega&&id)mega=host.querySelector('.kn-nav-dropdown--fruitser[data-kn-nav-mega-id="'+id+'"]');
    if(!mega)return;
    if(!id){
      id=String(idx++);
      li.dataset.knNavMegaId=id;
      mega.dataset.knNavMegaId=id;
    }
    if(portal){
      if(mega.parentElement!==host)host.appendChild(mega);
    }else if(mega.parentElement!==li){
      li.appendChild(mega);
      mega.classList.remove("kn-mega-active");
    }
  });
}
function knSetActiveMega(li){
  if(!knMegaUseHost())return;
  var id=li&&li.dataset.knNavMegaId;
  if(!id)return;
  document.querySelectorAll("#kn-mega-host .kn-nav-dropdown--fruitser").forEach(function(m){
    m.classList.toggle("kn-mega-active",m.dataset.knNavMegaId===id);
  });
}
function knClearActiveMega(){
  document.querySelectorAll(".kn-nav-dropdown--fruitser.kn-mega-active").forEach(function(m){
    m.classList.remove("kn-mega-active");
  });
}
function knSyncMegaContentWidth(){
  var container=document.querySelector("header.section-header .container-fullwidth")||document.querySelector(".header .container-fullwidth");
  if(!container)return;
  var w=Math.round(container.getBoundingClientRect().width);
  if(w>0)document.documentElement.style.setProperty("--kn-mega-content-max",w+"px");
}
var knNavCloseTimer=null;
function knCancelNavClose(){
  if(knNavCloseTimer){clearTimeout(knNavCloseTimer);knNavCloseTimer=null;}
}
function knPointerInNavZone(){
  if(document.querySelector(".kn-nav-has-dropdown.kn-nav-open:hover"))return true;
  var host=document.getElementById("kn-mega-host");
  if(host&&host.matches(":hover"))return true;
  var nav=document.querySelector(".header--navigation-main");
  if(nav&&nav.matches(":hover"))return true;
  var headerBar=document.querySelector("sticky-always.header")||document.querySelector("[data-header-section]");
  if(headerBar&&headerBar.matches(":hover"))return true;
  return false;
}
function knScheduleNavClose(li){
  knCancelNavClose();
  knNavCloseTimer=setTimeout(function(){
    knNavCloseTimer=null;
    if(knPointerInNavZone())return;
    knCloseNavDropdown(li);
  },240);
}
function knOpenNavDropdown(li){
  knCancelNavClose();
  document.body.classList.add("kn-nav-dropdown-open");
  li.classList.add("kn-nav-open");
  knSetActiveMega(li);
}
function knCloseNavDropdown(li){
  knCancelNavClose();
  li.classList.remove("kn-nav-open");
  if(!document.querySelector(".kn-nav-has-dropdown.kn-nav-open")){
    document.body.classList.remove("kn-nav-dropdown-open");
    knClearActiveMega();
  }
}
function knBindNavDropdown(){
  knInitMegaPanels();
  knSyncMegaContentWidth();
  if(!window.__knMegaLayoutBound){
    window.__knMegaLayoutBound=1;
    window.addEventListener("resize",function(){
      if(typeof knOnDesktopViewport==="function")knOnDesktopViewport();
      knInitMegaPanels();
      knSyncMegaContentWidth();
    });
    var mq=window.matchMedia("(min-width: 992px)");
    var onMq=function(){
      knInitMegaPanels();
      knSyncMegaContentWidth();
    };
    if(typeof mq.addEventListener==="function")mq.addEventListener("change",onMq);
    else if(typeof mq.addListener==="function")mq.addListener(onMq);
  }
  var host=document.getElementById("kn-mega-host");
  if(host&&!host.dataset.knHostBound){
    host.dataset.knHostBound="1";
    host.addEventListener("mouseenter",knCancelNavClose);
    host.addEventListener("mouseleave",function(e){
      var openLi=document.querySelector(".kn-nav-has-dropdown.kn-nav-open");
      if(!openLi)return;
      if(e.relatedTarget&&openLi.contains(e.relatedTarget))return;
      knScheduleNavClose(openLi);
    });
  }
  var headerBar=document.querySelector("sticky-always.header")||document.querySelector("[data-header-section]");
  if(headerBar&&!headerBar.dataset.knNavZoneBound){
    headerBar.dataset.knNavZoneBound="1";
    headerBar.addEventListener("mouseenter",knCancelNavClose);
  }
  var navMain=document.querySelector(".header--navigation-main");
  if(navMain&&!navMain.dataset.knNavZoneBound){
    navMain.dataset.knNavZoneBound="1";
    navMain.addEventListener("mouseenter",knCancelNavClose);
  }
  document.querySelectorAll(".kn-nav-has-dropdown").forEach(function(li){
    if(li.dataset.knNavBound==="1")return;
    li.dataset.knNavBound="1";
    var megaHost=document.getElementById("kn-mega-host");
    li.addEventListener("mouseenter",function(){knOpenNavDropdown(li);});
    li.addEventListener("mouseleave",function(e){
      if(megaHost&&e.relatedTarget&&megaHost.contains(e.relatedTarget))return;
      knScheduleNavClose(li);
    });
  });
}`;
