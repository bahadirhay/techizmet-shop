/** Vitrin iframe — mega menü: body katmanı + hover (kn-store-bridge ve sunucu enjeksiyonu) */

export const MIRROR_NAV_DROPDOWN_BIND_SCRIPT = `function knEnsureMegaHost(){
  var host=document.getElementById("kn-mega-host");
  if(!host){
    host=document.createElement("div");
    host.id="kn-mega-host";
    host.setAttribute("aria-hidden","true");
    document.body.appendChild(host);
  }
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
function knCssPx(raw){
  var n=parseFloat(String(raw||"").trim());
  return Number.isFinite(n)?n:0;
}
function knHeaderSeamPx(bar){
  if(!bar)return 1;
  var bw=parseFloat(getComputedStyle(bar).borderBottomWidth);
  return Number.isFinite(bw)&&bw>0?bw:1;
}
function knMeasureHeaderBottom(){
  var bottom=0;
  var ann=document.querySelector(".section-announcement-bar");
  if(ann){
    var ar=ann.getBoundingClientRect();
    if(ar.height>0.5)bottom=ar.bottom;
  }
  var bar=document.querySelector("sticky-always.header")||document.querySelector("[data-header-section]");
  var wrap=document.querySelector("[data-header-wrapper]")||document.querySelector(".header--wrapper");
  if(wrap){
    var wr=wrap.getBoundingClientRect();
    if(wr.height>0.5)bottom=Math.max(bottom,wr.bottom);
  }else if(bar){
    var br=bar.getBoundingClientRect();
    if(br.height>0.5)bottom=Math.max(bottom,br.bottom);
  }else{
    var hdr=document.querySelector("header.section-header");
    if(hdr){
      var hr=hdr.getBoundingClientRect();
      if(hr.height>0.5)bottom=Math.max(bottom,hr.bottom);
    }
  }
  if(bottom>0.5)return Math.max(0,bottom-knHeaderSeamPx(bar));
  var cs=getComputedStyle(document.body);
  var annPx=knCssPx(cs.getPropertyValue("--dynamic_announcement_height"))||knCssPx(cs.getPropertyValue("--announcement_height"));
  var hdrPx=knCssPx(cs.getPropertyValue("--dynamic_header_height"))||knCssPx(cs.getPropertyValue("--header_height"));
  if(annPx+hdrPx>0)return Math.max(0,annPx+hdrPx-1);
  return 0;
}
function knSyncMegaPanelPosition(){
  var topPx=knMeasureHeaderBottom();
  document.documentElement.style.setProperty("--kn-mega-panel-top",topPx+"px");
  var host=document.getElementById("kn-mega-host");
  if(host)host.style.top=topPx+"px";
  var container=document.querySelector(".section-header .container-fullwidth")||document.querySelector(".header .container-fullwidth");
  if(container){
    var w=Math.round(container.getBoundingClientRect().width);
    if(w>0)document.documentElement.style.setProperty("--kn-mega-content-max",w+"px");
  }
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
  knSyncMegaPanelPosition();
  requestAnimationFrame(function(){knSyncMegaPanelPosition();});
  knSetActiveMega(li);
  document.body.classList.add("kn-nav-dropdown-open");
  li.classList.add("kn-nav-open");
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
  knSyncMegaPanelPosition();
  if(!window.__knMegaPosBound){
    window.__knMegaPosBound=1;
    window.addEventListener("resize",function(){
      if(typeof knOnDesktopViewport==="function")knOnDesktopViewport();
      knInitMegaPanels();
      knSyncMegaPanelPosition();
    });
    window.addEventListener("scroll",knSyncMegaPanelPosition,true);
    var roTargets=document.querySelectorAll(
      ".section-announcement-bar, header.section-header, sticky-always.header, sticky-on-scroll.header, [data-announcement-wrapper]"
    );
    if(typeof ResizeObserver!=="undefined"&&roTargets.length){
      var ro=new ResizeObserver(function(){knSyncMegaPanelPosition();});
      roTargets.forEach(function(el){ro.observe(el);});
    }
    requestAnimationFrame(knSyncMegaPanelPosition);
    window.setTimeout(knSyncMegaPanelPosition,120);
  }
  var host=document.getElementById("kn-mega-host");
  if(host&&!host.dataset.knHostBound){
    host.dataset.knHostBound="1";
    host.addEventListener("mouseenter",function(){
      knCancelNavClose();
      var openLi=document.querySelector(".kn-nav-has-dropdown.kn-nav-open");
      if(openLi)knOpenNavDropdown(openLi);
    });
    host.addEventListener("mouseleave",function(e){
      var openLi=document.querySelector(".kn-nav-has-dropdown.kn-nav-open");
      if(!openLi)return;
      if(e.relatedTarget&&openLi.contains(e.relatedTarget))return;
      knScheduleNavClose(openLi);
    });
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
