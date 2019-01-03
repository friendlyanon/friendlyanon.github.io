(function() {
  "use strict";
  const ls = localStorage;

  window.ZoraGen = {
    doneLoading() { document.body.classList.remove("loading"); },
    set(key, data) { ls.setItem(key, data); },
    get(key) { return ls.getItem(key); },
    rm(key) { ls.removeItem(key); },
    clr() { ls.clear(); },
    len() { return ls.length; },
    key(idx) { return ls.key(idx); },
  };

}());
