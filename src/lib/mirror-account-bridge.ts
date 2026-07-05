/** Mirror iframe — hesap çekmecesi → /api/account (Prisma StoreCustomer) */

import { patchMirrorStoreBridgeNavigation } from "@/lib/mirror-store-bridge-nav-patch";
import { patchMirrorStoreBridgeDrawerClickGuard } from "@/lib/mirror-store-bridge-drawer-patch";

/** Hesap çekmecesi tab linkleri — kn-store-bridge "#" → search-drawer eşlemesinden kaçın */
export const MIRROR_ACCOUNT_DRAWER_LINK_HREF = "#kn-account";

/** Çekmece içi account-event — sayfa değil, çekmece formu değişsin */
export function patchMirrorAccountDrawerNavLinks(html: string): string {
  if (!html.includes('data-drawer="account-drawer"')) return html;
  const m = html.match(/<account-drawer[\s\S]*?<\/account-drawer>/i);
  if (!m) return html;

  let drawer = m[0];
  const tabHref = MIRROR_ACCOUNT_DRAWER_LINK_HREF;
  drawer = drawer.replace(
    /(<account-event[^>]*data-target="(?:create|login|reset)"[^>]*>[\s\S]*?<a\b[^>]*\shref=")[^"]*(")/gi,
    `$1${tabHref}$2`,
  );
  drawer = drawer.replace(
    /\shref="\/account\/(?:register|login|forgot-password)[^"]*"/gi,
    ` href="${tabHref}"`,
  );
  drawer = drawer.replace(/\shref="index\.html"/gi, ` href="${tabHref}"`);

  return html.replace(m[0], drawer);
}

const BRIDGE_SCRIPT = `<script id="kn-account-bridge">(function(){
  function relocateAccountDrawer(){
    var drawer=document.querySelector('account-drawer[data-drawer="account-drawer"]');
    if(!drawer||drawer.dataset.knRelocated)return;
    drawer.dataset.knRelocated="1";
    document.body.appendChild(drawer);
  }
  function field(form, name){
    var el=form.querySelector('[name="'+name+'"]');
    return el?String(el.value||"").trim():"";
  }
  function formType(form){
    var el=form.querySelector('input[name="form_type"]');
    return el?String(el.value||""):"";
  }
  function showErr(form, msg){
    var box=form.querySelector(".kn-account-error");
    if(!box){
      box=document.createElement("p");
      box.className="kn-account-error";
      box.style.cssText="color:#b91c1c;margin:10px 0;font-size:14px;line-height:1.4";
      var btn=form.querySelector("button.button-block,button.medium-button,button");
      if(btn) form.insertBefore(box,btn);
      else form.appendChild(box);
    }
    box.textContent=msg;
  }
  function clearErr(form){
    var box=form.querySelector(".kn-account-error");
    if(box) box.remove();
  }
  function setBusy(form, busy){
    form.querySelectorAll("button").forEach(function(btn){
      if(btn.closest("account-event")) return;
      btn.disabled=busy;
      if(busy) btn.dataset.knPrevText=btn.textContent, btn.textContent="…";
      else if(btn.dataset.knPrevText) btn.textContent=btn.dataset.knPrevText;
    });
  }
  function returnPath(){
    try{
      var topWin=window.top||window;
      var u=new URL(topWin.location.href);
      var n=u.searchParams.get("next");
      if(n&&n.charAt(0)==="/"&&!n.startsWith("//")&&n.indexOf("://")===-1){
        if(n.indexOf("/account/login")!==0&&n.indexOf("/account/register")!==0&&n.indexOf("/account/forgot-password")!==0)return n;
      }
      var p=u.pathname||"";
      if(p.indexOf("/checkout")===0||p==="/cart")return p+(u.search||"");
    }catch(e){}
    return "/account";
  }
  function afterAuthSuccess(){
    try{
      var topWin=window.top||window;
      var p=topWin.location.pathname||"";
      if(p.indexOf("/checkout")===0||p==="/cart"){
        topWin.location.reload();
        return;
      }
    }catch(e){}
    (window.top||window).location.href=returnPath();
  }
  async function postJson(url, body){
    var res=await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"same-origin",
      body:JSON.stringify(body)
    });
    var j={};
    try{j=await res.json();}catch(e){}
    return {ok:res.ok, error:j.error||null};
  }
  async function handleForm(form, e){
    if(e){e.preventDefault();e.stopPropagation();}
    clearErr(form);
    var type=formType(form);
    setBusy(form,true);
  try{
    if(type==="customer_login"){
      var r=await postJson("/api/account/login",{
        email:field(form,"customer[email]"),
        password:field(form,"customer[password]")
      });
      if(!r.ok){showErr(form,r.error||"Giriş başarısız");return;}
      afterAuthSuccess();
      return;
    }
    if(type==="create_customer"){
      var reg=await postJson("/api/account/register",{
        email:field(form,"customer[email]"),
        password:field(form,"customer[password]"),
        firstName:field(form,"customer[first_name]"),
        lastName:field(form,"customer[last_name]"),
        phone:field(form,"customer[phone]")||""
      });
      if(!reg.ok){showErr(form,reg.error||"Kayıt başarısız");return;}
      afterAuthSuccess();
      return;
    }
    if(type==="recover_customer_password"){
      var fp=await postJson("/api/account/forgot-password",{
        email:field(form,"email")
      });
      if(!fp.ok){showErr(form,fp.error||"İşlem başarısız");return;}
      var ok=form.querySelector(".kn-account-success");
      if(!ok){
        ok=document.createElement("p");
        ok.className="kn-account-success";
        ok.style.cssText="color:#15803d;margin:10px 0;font-size:14px;line-height:1.4";
        var btn=form.querySelector("button.button-block,button.medium-button,button");
        if(btn) form.insertBefore(ok,btn);
        else form.appendChild(ok);
      }
      ok.textContent=tr()
        ? "Kayıtlı e-posta varsa sıfırlama bağlantısı gönderildi."
        : "If this email is registered, a reset link was sent.";
      return;
    }
  }catch(err){
    showErr(form,"Bağlantı hatası. Tekrar deneyin.");
  }finally{
    setBusy(form,false);
  }
  }
  function bindForm(form){
    if(!form||form.dataset.knAccountBound)return;
    form.dataset.knAccountBound="1";
    form.setAttribute("action","#");
    form.removeAttribute("onsubmit");
    form.addEventListener("submit",function(e){handleForm(form,e);});
    form.querySelectorAll("button").forEach(function(btn){
      if(btn.closest("account-event")) return;
      btn.setAttribute("type","button");
      btn.addEventListener("click",function(e){handleForm(form,e);});
    });
  }
  function bindAll(){
    document.querySelectorAll("account-drawer form").forEach(bindForm);
    document.querySelectorAll(
      'form input[name="form_type"][value="customer_login"], form input[name="form_type"][value="create_customer"], form input[name="form_type"][value="recover_customer_password"]'
    ).forEach(function(inp){
      var form=inp&&inp.form;
      if(form) bindForm(form);
    });
  }
  function tr(){
    var el=document.documentElement;
    if(el.getAttribute("data-kn-locale")==="tr")return true;
    return el.lang&&el.lang.indexOf("tr")===0;
  }
  function hideGuestForms(drawer){
    drawer.classList.add("kn-account-is-logged-in");
    drawer.querySelectorAll("[data-form]").forEach(function(el){
      el.classList.add("hidden");
      el.setAttribute("hidden","");
    });
    drawer.querySelectorAll("account-event").forEach(function(el){
      el.style.display="none";
    });
    drawer.querySelectorAll("[data-heading]").forEach(function(el){
      el.classList.add("hidden");
    });
    var head=drawer.querySelector(".account--drawer-heading");
    if(head){
      head.classList.remove("hidden");
      head.textContent=tr()?"Hesabım":"My account";
      head.removeAttribute("data-heading");
    }
  }
  function showLoggedIn(customer){
    var drawer=document.querySelector('[data-drawer="account-drawer"]');
    if(!drawer||drawer.dataset.knLoggedIn)return;
    drawer.dataset.knLoggedIn="1";
    hideGuestForms(drawer);
    var body=drawer.querySelector(".side--drawer-body")||drawer.querySelector("[drawer-body]");
    if(!body)return;
    if(body.querySelector(".kn-account-logged-in"))return;
    var note=document.createElement("div");
    note.className="kn-account-logged-in";
    note.innerHTML=
      '<p class="text-medium" style="margin:0 0 16px;text-align:center">'+
      (tr()?"Hoş geldiniz, ":"Welcome, ")+'<strong></strong></p>'+
      '<div class="kn-account-logged-in__actions" style="display:grid;gap:10px">'+
      '<a href="/account" class="button medium-button button-block">'+ (tr()?"Hesabım":"My account") +'</a>'+
      '<a href="/account/favorites" class="button medium-button button-secondary button-block">'+ (tr()?"Favorilerim":"Favorites") +'</a>'+
      '<button type="button" class="button text-button kn-account-logout">'+ (tr()?"Çıkış yap":"Log out") +'</button>'+
      '</div>';
    var displayName=[customer.firstName,customer.lastName].filter(Boolean).join(" ").trim();
    note.querySelector("strong").textContent=displayName||customer.email||"";
    note.querySelector(".kn-account-logout").addEventListener("click",function(){
      fetch("/api/account/logout",{method:"POST",credentials:"same-origin"}).then(function(){
        (window.top||window).location.reload();
      });
    });
    body.appendChild(note);
  }
  function checkSession(){
    fetch("/api/store/bootstrap",{credentials:"same-origin"})
      .then(function(r){return r.json();})
      .then(function(d){if(d.customer) showLoggedIn(d.customer);})
      .catch(function(){});
  }
  relocateAccountDrawer();
  function injectOAuthButtons(root){
    if(!root||root.dataset.knOAuth)return;
    fetch("/api/account/oauth/status",{credentials:"same-origin"})
      .then(function(r){return r.json();})
      .then(function(s){
        if(!s.google&&!s.apple)return;
        var next=encodeURIComponent(returnPath());
        var box=document.createElement("div");
        box.className="kn-oauth-links";
        box.style.cssText="margin-top:16px;display:flex;flex-direction:column;gap:8px";
        if(s.google){
          var g=document.createElement("a");
          g.href="/api/account/oauth/google?next="+next;
          g.textContent="Google ile devam et";
          g.className="button button-block medium-button";
          g.style.background="#fff";
          g.style.color="#333";
          box.appendChild(g);
        }
        if(s.apple){
          var a=document.createElement("a");
          a.href="/api/account/oauth/apple?next="+next;
          a.textContent="Apple ile devam et";
          a.className="button button-block medium-button";
          a.style.background="#000";
          a.style.color="#fff";
          box.appendChild(a);
        }
        var btn=root.querySelector("button.button-block,button.medium-button,button[type='submit']");
        if(btn&&btn.parentNode) btn.parentNode.insertBefore(box,btn.nextSibling);
        else root.appendChild(box);
        root.dataset.knOAuth="1";
      })
      .catch(function(){});
  }
  function initOAuth(){
    document.querySelectorAll('[data-kn-account-auth="login"],[data-kn-account-auth="register"]').forEach(injectOAuthButtons);
    var drawer=document.querySelector('account-drawer[data-drawer="account-drawer"]');
    if(drawer){
      var loginForm=drawer.querySelector('[data-form="login"]');
      if(loginForm) injectOAuthButtons(loginForm);
      var regForm=drawer.querySelector('[data-form="create"]');
      if(regForm) injectOAuthButtons(regForm);
    }
  }
  function init(){
    bindAll();
    checkSession();
    initOAuth();
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{init();}
  function switchAccountDrawerForm(drawer,target){
    drawer.querySelectorAll("[data-form],[data-heading]").forEach(function(item){
      item.classList.add("hidden");
      item.classList.remove("active");
      if(item.hasAttribute("data-form")) item.setAttribute("hidden","");
    });
    var targetForm=drawer.querySelector('[data-form="'+target+'"]');
    var targetHeading=drawer.querySelector('[data-heading="'+target+'"]');
    if(targetForm){
      targetForm.classList.remove("hidden");
      targetForm.classList.add("active");
      targetForm.removeAttribute("hidden");
    }
    if(targetHeading){
      targetHeading.classList.remove("hidden");
      targetHeading.classList.add("active");
      targetHeading.removeAttribute("hidden");
    }
  }
  document.addEventListener("click",function(e){
    var ev=e.target&&e.target.closest?e.target.closest("account-event[data-target]"):null;
    if(!ev)return;
    var drawer=ev.closest('[data-drawer="account-drawer"]');
    if(!drawer)return;
    var target=ev.getAttribute("data-target");
    if(!target)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    switchAccountDrawerForm(drawer,target);
    setTimeout(bindAll,50);
  },true);
  document.addEventListener("click",function(e){
    var t=e.target&&e.target.closest?e.target.closest('[data-source="account-drawer"],[aria-label*="account" i],[aria-label*="hesap" i]'):null;
    if(!t)return;
    setTimeout(checkSession,80);
  },true);
})();</script>`;

const RELOCATE_IN_STORE_BRIDGE = `function relocateAccountDrawer() {
    var drawer = document.querySelector('account-drawer[data-drawer="account-drawer"]');
    if (!drawer || drawer.dataset.knRelocated) return;
    drawer.dataset.knRelocated = "1";
    document.body.appendChild(drawer);
  }`;

/** Eski mirror HTML — kn-store-bridge içinde hesap çekmecesini body'ye taşı */
export function patchMirrorStoreBridgeAccountDrawer(html: string): string {
  if (!html.includes("kn-store-bridge") || html.includes("relocateAccountDrawer")) {
    return html;
  }
  return html.replace(
    /function openDrawer\(source\) \{\s*\n\s*var drawer = document\.querySelector/,
    `${RELOCATE_IN_STORE_BRIDGE}
  function openDrawer(source) {
    if (source === "account-drawer") relocateAccountDrawer();
    var drawer = document.querySelector`,
  );
}

export function injectMirrorAccountBridge(html: string): string {
  let out = patchMirrorAccountDrawerNavLinks(html);
  out = patchMirrorStoreBridgeNavigation(out);
  out = patchMirrorStoreBridgeAccountDrawer(out);
  out = patchMirrorStoreBridgeDrawerClickGuard(out);
  out = out.replace(/<script id="kn-account-bridge">[\s\S]*?<\/script>\s*/i, "");
  return out.replace(/<\/body>/i, `${BRIDGE_SCRIPT}</body>`);
}

export const MIRROR_ACCOUNT_BRIDGE_JS = BRIDGE_SCRIPT.replace(
  /^<script id="kn-account-bridge">/,
  "",
).replace(/<\/script>\s*$/i, "");
