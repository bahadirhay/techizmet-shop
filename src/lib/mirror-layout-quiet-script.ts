/** Mirror vitrin — tema layout okumalarını rAF ile topla (forced reflow azaltır) */

export const MIRROR_LAYOUT_QUIET_SCRIPT = `(function(){
  if(window.__knLayoutQuiet)return;
  window.__knLayoutQuiet=1;
  var NativeRO=window.ResizeObserver;
  if(NativeRO){
    window.ResizeObserver=function(cb){
      var pending=null,raf=0,obsRef=null;
      var wrapped=function(entries,observer){
        pending=entries;
        obsRef=observer;
        if(raf)return;
        raf=requestAnimationFrame(function(){
          raf=0;
          if(pending)cb(pending,obsRef);
        });
      };
      return new NativeRO(wrapped);
    };
    if(NativeRO.prototype)window.ResizeObserver.prototype=NativeRO.prototype;
  }
  var nativeAdd=EventTarget.prototype.addEventListener;
  var nativeRemove=EventTarget.prototype.removeEventListener;
  var scrollWraps=new WeakMap();
  EventTarget.prototype.addEventListener=function(type,listener,options){
    if(type==="scroll"&&this===window&&typeof listener==="function"){
      var wrapped=scrollWraps.get(listener);
      if(!wrapped){
        var raf=0,ev;
        wrapped=function(e){
          ev=e;
          if(raf)return;
          raf=requestAnimationFrame(function(){
            raf=0;
            listener.call(window,ev);
          });
        };
        scrollWraps.set(listener,wrapped);
      }
      return nativeAdd.call(this,type,wrapped,options);
    }
    return nativeAdd.call(this,type,listener,options);
  };
  EventTarget.prototype.removeEventListener=function(type,listener,options){
    if(type==="scroll"&&this===window&&typeof listener==="function"){
      var wrapped=scrollWraps.get(listener);
      if(wrapped)listener=wrapped;
    }
    return nativeRemove.call(this,type,listener,options);
  };
})();`;

export const LAYOUT_QUIET_SCRIPT_ID = "kn-layout-quiet-script";

export const LAYOUT_QUIET_SCRIPT_TAG = `<script id="${LAYOUT_QUIET_SCRIPT_ID}">${MIRROR_LAYOUT_QUIET_SCRIPT}</script>`;
