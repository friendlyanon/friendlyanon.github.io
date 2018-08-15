/* global List, localforage, VanillaModal */
/* eslint-disable no-cond-assign, strict */
(function() {

"use strict";

let Pages, Parser, Main, View, Config;
const { assign, entries } = Object;
const { isArray } = Array;
const { max } = Math;

const $ = (a, b = document) => b.querySelector(a);

function* values(map) {
  for (const code of map.values()) yield* code.values();
}
function toValues(map, items) {
  for (const item of items) {
    if (map.has(item.code)) map.get(item.code).set(item.fullCode, item);
    else map.set(item.code, new Map().set(item.fullCode, item));
  }
  return map;
}

class AlternateXHR {
  open(_, url) {
    this.url = url;
  }
  send() {
    document.dispatchEvent(new CustomEvent("amiami-xhr", { detail: this.url }));
    document.addEventListener("amiami-res", ({ detail }) => {
      this.onload.call({ responseText: detail });
    }, { once: true });
  }
}

Config = {
  local: new Map,
  remote: new Map,
  wishlist: new Set,
  changed: {
    new: [],
    deleted: [],
    clear() {
      this.new = [];
      this.deleted = [];
    },
  },
  blacklist: new Map,
  filter() {
    for (const item of values(Config.remote)) {
      if (
        !Config.local.has(item.code) ||
        !Config.local.get(item.code).has(item.fullCode)
      ) Config.changed.new.push(item);
    }
    for (const item of values(Config.local)) {
      if (
        !Config.remote.has(item.code) ||
        !Config.remote.get(item.code).has(item.fullCode)
      ) Config.changed.deleted.push(item);
    }
  },
  history() {
    if (Config.changed.new.length + Config.changed.deleted.length < 1) return;
    const date = String(new Date);
    const dateStr = date.substr(0, date.lastIndexOf(" "));
    Config.pastEntries.push({
      date: dateStr,
      new: Config.changed.new,
      deleted: Config.changed.deleted,
    });
    while (Config.pastEntries.length > 30) Config.pastEntries.shift();
    Config.set("history", Config.pastEntries);
    View.historyRender();
  },
  async set(key, value) {
    if (
      value != null &&
      typeof value === "object"
    ) {
      switch (value.constructor) {
        case Map: value = { type: "Map", data: [...values(value)] }; break;
        case Set: value = { type: "Set", data: [...value] };         break;
      }
    }
    return await localforage.setItem(key, value);
  },
  async get(key) {
    const entry = await localforage.getItem(key);
    if (
      entry != null &&
      typeof entry === "object"
    ) {
      switch (entry.type) {
        case "Set": return new Set(entry.data);
        case "Map": return toValues(new Map, entry.data);
      }
    }
    return entry;
  },
  settings: {},
  interval: 100,
  pastEntries: [],
};

Pages = {
  template: "https://cors-anywhere.herokuapp.com/https://api.amiami.com/api/v1.0/items?pagemax=50&lang=eng&s_sortkey=preowned&s_st_condition_flg=1&pagecnt=<>",
  current: 0,
  sort: -1,
  main() {
    Config.changed.clear();
    View.spinner();
    Pages.req();
  },
  reqMethod: XMLHttpRequest,
  req() {
    const xhr = new Pages.reqMethod;
    xhr.open("GET", Pages.template.replace("<>", ++Pages.current));
    assign(xhr, {
      timeout: 5000,
      onload: Pages.afterReq,
      onerror: Pages.onFail,
      onabort: Pages.onFail,
      ontimeout: Pages.onFail
    });
    xhr.setRequestHeader("X-User-Key", "amiami_dev");
    $(".loading span").textContent = Pages.current;
    xhr.send();
  },
  queryUserJS(e) {
    e.preventDefault();
    const el = $(".loading");
    const timer = setTimeout(() => {
      el.innerHTML = "Not installed.&nbsp;<a href=\"//github.com/friendlyanon/friendlyanon.github.io/raw/master/amiami-crawler/AmiAmi_Crawler_-_Alternative_XHR.user.js\">Install</a>";
    }, 5000);
    document.addEventListener("amiami-res", () => {
      clearTimeout(timer);
      Pages.reqMethod = AlternateXHR;
      Pages.current = 0;
      Pages.template = "https://api.amiami.com/api/v1.0/items?pagemax=50&lang=eng&s_sortkey=preowned&s_st_condition_flg=1&pagecnt=<>";
      el.remove();
      Pages.main();
    }, { once: true });
    document.dispatchEvent(new CustomEvent("amiami-xhr"));
  },
  onFail(err) {
    console.log(err);
    const el = $(".loading");
    el.setAttribute("style", "background-image: none; padding-left: 5px;");
    el.innerHTML = `Error. Try with&nbsp;<a href="#">userscript</a>`;
    el.lastElementChild.addEventListener("click", Pages.queryUserJS, { once: true });
  },
  afterReq() {
    try {
      const json = JSON.parse(this.responseText);
      if (
        Pages.pageunloaded ||
        !json.RSuccess ||
        !json.items.length
      ) {
        View.spinnerEnd();
        return View.display();
      }
      for (const item of json.items) {
        Parser.products.push(assign(item, { sort: ++Pages.sort }));
        Parser.check();
      }
      if (!Config.interval) Pages.req();
      else setTimeout(Pages.req, Config.interval);
    }
    catch(err) {
      console.error(err);
      Pages.onFail();
    }
  },
  unload() {
    Pages.pageunloaded = true;
  },
};

Parser = {
  products: [],
  parsing: false,
  check() {
    if (Parser.parsing) return;
    Parser.parsing = true;
    Parser.parseProducts().catch(console.error);
  },
  formatPrice({ min_price: price }) {
    if (!price) return "";
    if (price < 1000) return `${price} JPY`;
    const str = String(price);
    switch (str.length) {
      case 4: return `${str.substr(0, 1)},${str.substr(1, 3)} JPY`;
      case 5: return `${str.substr(0, 2)},${str.substr(2, 3)} JPY`;
      case 6: return `${str.substr(0, 3)},${str.substr(3, 3)} JPY`;
      case 7: return `${str.charAt()},${str.substr(1, 3)},${str.substr(4, 3)} JPY`;
    }
  },
  async parseProducts() {
    const { products } = Parser;
    while (products.length) {
      const item = products.shift();
      if (Config.blacklist.has(item.image_name)) continue;
      View.add({
        thumbnail: item.thumb_url ?
          "https://img.amiami.jp" + item.thumb_url.replace("/main/", "/thumbnail/") :
          "https://img.amiami.jp/images/product/thumbnail/noimage.gif",
        name: item.gname || "No Name",
        price: Parser.formatPrice(item),
        deal: "",
        url: "https://www.amiami.com/eng/detail/?gcode=" + item.gcode,
        code: item.image_name,
        fullCode: item.gcode,
        shortUrl: "https://www.amiami.com/eng/detail/?gcode=" + item.image_name,
        sort: item.sort
      });
    }
    Parser.parsing = false;
  },
};

View = {
  items: [],
  lists: {},
  history: {
    new: undefined,
    deleted: undefined,
    clear() {
      try {
        this.new.clear();
        this.deleted.clear();
      }
      catch(_) { /*  */ }
      finally {
        this.new =
        this.deleted = undefined;
      }
    },
  },
  init() {
    const selector = $(".selector");
    View.populateHeader(selector);
    selector.addEventListener("click", View.selectorHandler);
    document.body.addEventListener("click", View.blacklistHandler);
    document.body.addEventListener("click", View.wishlistHandler);
    $("#history").addEventListener("click", View.historyDisplay);
    const { scheme } = View;
    View.list = new List("full-list", scheme);
    View.new = new List("new", scheme);
    View.deleted = new List("deleted", scheme);
    View.blacklist = new List("blacklist", scheme);
    View.wishlist = new List("wishlist", assign({}, scheme, {
      item: `<li class="item"><div class="item-top"><div class="item-icon"><a target="_blank" class="url"><img class="thumbnail" /></a></div><div class="item-name"><a target="_blank" class="name shortUrl"></a></div></div><div class="item-bottom"><div class="item-deal deal"></div><span class="controls"><span class="blacklist">×</span></span><div class="item-price price"></div></div></li>`,
    }));
    View.modal = new VanillaModal;
  },
  populateHeader(selector) {
    let current = selector;
    const fragment = document.createDocumentFragment();
    while (current = current.nextElementSibling) {
      if (!current.dataset.title) continue;
      const { id } = current;
      View.lists[id] = current;
      const a = document.createElement("a");
      a.setAttribute("href", "#" + id);
      a.appendChild(new Text(current.dataset.title + " items list"));
      fragment.appendChild(new Text(" | "));
      fragment.appendChild(a);
    }
    fragment.firstChild.remove();
    selector.prepend(fragment);
    selector.firstElementChild.className = "active";
    View.currentId = selector.firstElementChild.id;
  },
  firstClose() {
    View.modal.settings.onclose = null;
    Config.set("notfirst", true);
    Pages.main();
  },
  selectorHandler(e) {
    try {
      if (e.target.tagName !== "A") return;
      e.preventDefault();
      if (e.target.parentNode.tagName === "SPAN") return View.modal.open(e.target.getAttribute("href"));
      const id = e.target.getAttribute("href").substr(1);
      for (const child of e.target.parentNode.children) {
        if (child === e.target) child.className = "active";
        else child.removeAttribute("class");
      }
      View.currentId = id;
      for (const [key, list] of entries(View.lists)) {
        list.hidden = id !== key;
      }
      View.history.clear();
      if (this.lastElementChild.dataset.rerender) {
        View.historyRender();
        this.lastElementChild.removeAttribute("data-rerender");
      }
      return false;
    }
    catch(err) { console.error(err); }
  },
  wishlistHandler(e) {
    try {
      if (
        e.target.tagName !== "SPAN" ||
        e.target.className !== "wishlist"
      ) return;
      e.preventDefault();
      const { code } = e.target.parentNode.parentNode.parentNode.dataset;
      Config.set("wishlist", Config.wishlist.add(code));
      let exampleItem;
      switch (View.currentId) {
        case "full-list": exampleItem = Config.local.get(code).values().next().value; break;
        case "new":       exampleItem = View.new.get("code", code)[0].values(); break;
        case "deleted":   exampleItem = View.deleted.get("code", code)[0].values(); break;
      }
      View.wishlist.add(exampleItem);
      return false;
    }
    catch(err) { console.error(err); }
  },
  blacklistHandler(e) {
    try {
      if (
        e.target.tagName !== "SPAN" ||
        e.target.className !== "blacklist"
      ) return;
      e.preventDefault();
      if (View.currentId === "history") {
        const idx = Number(e.target.previousElementSibling.getAttribute("href").substr(1));
        Config.pastEntries.splice(idx, 1);
        View.historyRender();
        Config.set("history", Config.pastEntries);
        return false;
      }
      const { code } = e.target.parentNode.parentNode.parentNode.dataset;
      switch (View.currentId) {
      case "wishlist":
        Config.wishlist.delete(code);
        View.wishlist.remove("code", code);
        Config.set("wishlist", Config.wishlist);
        return false;
      case "blacklist": {
        const item = Config.blacklist.get(code);
        Config.blacklist.delete(code);
        View.blacklist.remove("code", code);
        View.list.add(item);
        View.list.sort("sort");
      } break;
      default: {
        let exampleItem;
        switch (View.currentId) {
          case "full-list": exampleItem = Config.local.get(code).values().next().value; break;
          case "new":       exampleItem = View.new.get("code", code)[0]; break;
          case "deleted":   exampleItem = View.deleted.get("code", code)[0]; break;
        }
        Config.blacklist.set(code, exampleItem);
        try { View.list.remove("code", code); } catch(_) { /*  */ }
        try { View.new.remove("code", code); } catch(_) { /*  */ }
        try { View.deleted.remove("code", code); } catch(_) { /*  */ }
        try { View.blacklist.add(exampleItem); } catch(_) { /*  */ }
      } break;
      }
      Config.set("blacklist", [...Config.blacklist]);
      return false;
    }
    catch(err) { console.error(err); }
  },
  add(item) {
    const { code } = item;
    if (Config.remote.has(code)) Config.remote.get(code).set(item.fullCode, item);
    else Config.remote.set(code, new Map().set(item.fullCode, item));
    View.list.add(item);
    if (Config.wishlist.has(code)) View.wishlist.add(item);
    else for (const wish of Config.wishlist) {
      if (!item.name.toLowerCase().includes(wish.toLowerCase())) continue;
      View.wishlist.add(item);
      break;
    }
  },
  display() {
    Config.filter();
    Config.history();
    View.new.add(Config.changed.new);
    View.deleted.add(Config.changed.deleted);
    Config.local = Config.remote;
    Config.remote = new Map;
    Config.set("items", Config.local);
  },
  historyDisplay(e) {
    try {
      if (
        e.target.tagName !== "A" ||
        e.target.dataset.history !== "yes"
      ) return;
      e.preventDefault();
      $(".selector").lastElementChild.dataset.rerender = "yes";
      const pastEntry = Config.pastEntries[e.target.getAttribute("href").substr(1)];
      const root = $("#history");
      root.innerHTML = `<div id="new-history">New:&nbsp;<input type="text" class="fuzzy-search" /><ul class="pagination"></ul><ul class="list"></ul></div><div id="deleted-history">Deleted:&nbsp;<input type="text" class="fuzzy-search" /><ul class="pagination"></ul><ul class="list"></ul></div>`;
      (View.history.new = new List("new-history", View.historyScheme)).add(pastEntry.new);
      (View.history.deleted = new List("deleted-history", View.historyScheme)).add(pastEntry.deleted);
    }
    catch(err) { console.error(err); }
  },
  historyRender() {
    const root = $("#history");
    root.innerHTML = "";
    const fragment = document.createDocumentFragment();
    let i = -1;
    for (const diff of Config.pastEntries) {
      const h1 = document.createElement("h1");
      const a = document.createElement("a");
      a.setAttribute("href", `#${++i}`);
      a.dataset.history = "yes";
      a.appendChild(new Text(`${diff.date} (new: ${diff.new.length}, deleted: ${diff.deleted.length})`));
      h1.appendChild(a);
      const blacklist = document.createElement("span");
      blacklist.className = "blacklist";
      blacklist.textContent = "×";
      h1.appendChild(blacklist);
      fragment.prepend(h1);
    }
    root.appendChild(fragment);
  },
  spinner() {
    document.body.insertAdjacentHTML("beforeend", `<div class="loading"><div>Loading page #<span></span></div></div>`);
  },
  spinnerEnd() {
    $(".loading").remove();
  },
  scheme: {
    valueNames: [
      "name",
      "deal",
      "price",
      { data: ["code", "sort"] },
      { attr: "href", name: "url" },
      { attr: "href", name: "shortUrl" },
      { attr: "src", name: "thumbnail" },
    ],
    item: `<li class="item"><div class="item-top"><div class="item-icon"><a target="_blank" class="url"><img class="thumbnail" /></a></div><div class="item-name"><a target="_blank" class="name shortUrl"></a></div></div><div class="item-bottom"><div class="item-deal deal"></div><span class="controls"><span class="blacklist">×</span>&nbsp;<span class="wishlist">+</span></span><div class="item-price price"></div></div></li>`,
    page: 40,
    pagination: [{ outerWindow: 1 }],
  },
};

Main = {
  init() {
    View.init();
    (View.historyScheme = assign({}, View.scheme)).page = 15;
    View.historyScheme.item = `<li class="item"><div class="item-top"><div class="item-icon"><a target="_blank" class="url"><img class="thumbnail" /></a></div><div class="item-name"><a target="_blank" class="name shortUrl"></a></div></div><div class="item-bottom"><div class="item-deal deal"></div><div class="item-price price"></div></div></li>`;
    localforage.config({ name: "amiamicrawler" });
    localforage.setDriver(localforage.INDEXEDDB);
    Main.main().catch(console.error);
  },
  async main() {
    const interval = await Config.get("interval");
    if (typeof interval === "number") Config.interval = max(interval, 0);
    const previous = await Config.get("items");
    if (previous instanceof Map) Config.local = previous;
    const wishlist = await Config.get("wishlist");
    if (wishlist instanceof Set) Config.wishlist = wishlist;
    const settings = await Config.get("settings");
    if (settings) Config.settings = settings;
    const blacklist = await Config.get("blacklist");
    if (isArray(blacklist)) {
      Config.blacklist = new Map(blacklist);
      const items = [];
      for (const item of Config.blacklist.values()) {
        items.push(item);
      }
      for (const code of Config.blacklist.keys()) {
        Config.local.delete(code);
      }
      View.blacklist.add(items);
    }
    const history = await Config.get("history");
    if (isArray(history)) {
      Config.pastEntries = JSON.parse(JSON.stringify(history));
      View.historyRender();
    }
    if (await Config.get("notfirst")) Pages.main();
    else {
      View.modal.settings.onclose = View.firstClose;
      View.modal.open("#modal_about");
    }
  },
};

window.__$debug$ = { Pages, Parser, Main, View, Config };

document.addEventListener("DOMContentLoaded", Main.init, { once: true });
window.addEventListener("beforeunload", Pages.unload, { once: true });

}());
