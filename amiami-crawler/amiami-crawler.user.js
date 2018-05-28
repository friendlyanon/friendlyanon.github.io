// ==UserScript==
// @name        AmiAmi Crawler
// @description Crawler for AmiAmi preowned section
// @namespace   friendlyanon
// @include     https://friendlyanon.github.io/amiami-crawler/
// @version     1
// @require     https://cdnjs.cloudflare.com/ajax/libs/list.js/1.5.0/list.js
// @require     https://cdn.rawgit.com/mozilla/localForage/master/dist/localforage.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==

/* global GM_xmlhttpRequest, List, localforage, unsafeWindow */
/* eslint-disable no-cond-assign */

"use strict";

let Pages, Parser, Main, View, Config;
const { setPrototypeOf, assign, entries } = Object;
const { isArray } = Array;

const domparser = new DOMParser;
const queryString = (() => {
  class NullProto {}
  setPrototypeOf(NullProto.prototype, null);
  const plusRegex = /\+/g;
  return str => {
    const ret = new NullProto;
    switch (str.charAt()) {
      case "#": case "&": case "?": str = str.substr(1); break;
    }
    for (const param of str.split("&")) {
      const [key, value] = param.replace(plusRegex, " ").split("=");
      ret[key] = value != null ? decodeURIComponent(value) : value;
    }
    return ret;
  };
})();

const $ = (a, b = document) => b.querySelector(a);
const $$ = (a, b = document) => b.querySelectorAll(a);

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

Config = {
  local: new Map,
  remote: new Map,
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
    mapsetcheck:
    if (
      value != null &&
      typeof value === "object"
    ) {
      switch (value.constructor) {
       case Map:
        value = { type: "Map", data: [...values(value)] };
        break;
       case Set:
        value = { type: "Set", data: [...value] };
        break;
       default:
        break mapsetcheck;
      }
    }
    return localforage.setItem(key, value);
  },
  async get(key) {
    const entry = await localforage.getItem(key);
    mapsetcheck:
    if (
      entry != null &&
      typeof entry === "object"
    ) {
      switch (entry.type) {
       case "Set":
        return new Set(entry.data);
       case "Map":
        return toValues(new Map, entry.data);
       default:
        break mapsetcheck;
      }
    }
    return entry;
  },
  interval: 100,
  pastEntries: [],
};

Pages = {
  template: "http://slist.amiami.com/top/search/list?s_st_condition_flg=1&pagemax=50&getcnt=0&pagecnt=<>",
  current: 0,
  sort: -1,
  main() {
    Config.changed.clear();
    View.spinner();
    Pages.req();
  },
  req() {
    const details = {
      method: "GET",
      url: Pages.template.replace("<>", ++Pages.current),
      onload: Pages.afterReq,
      onerror: console.error,
      onabort: console.error,
      ontimeout: console.error
    };
    $(".loading span").textContent = Pages.current;
    GM_xmlhttpRequest(details);
  },
  afterReq({ response: doc }) {
    try {
      doc = domparser.parseFromString(doc, "text/html");
      const products = $$(".product_box", doc);
      if (!products.length) {
        View.spinnerEnd();
        return View.display();
      }
      for (const product of products) {
        const thumbnail = $(".product_img img", product);
        const name = $(".product_name_list a", product);
        const price = $(".product_price", product);
        const deal = $(".product_off", product);
        Parser.products.push({ thumbnail, name, price, deal, sort: ++Pages.sort });
        Parser.check();
      }
      if (!Config.interval) Pages.req();
      else setTimeout(Pages.req, Config.interval);
    }
    catch (err) {
      console.error(err);
    }
  },
};

Parser = {
  products: [],
  codeRegex: /-[RS]\d*$/,
  parsing: false,
  check() {
    if (Parser.parsing) return;
    Parser.parsing = true;
    Parser.parseProducts().catch(console.error);
  },
  async parseProducts() {
    const { products, codeRegex } = Parser;
    while(products.length) {
      const { thumbnail, name, price, deal, sort } = products.shift();
      const result = {
        thumbnail: "http://img.amiami.jp/images/product/thumbnail/noimage.gif",
        name: "No Name",
        price: "",
        deal: "",
        url: "",
        code: "",
        fullCode: "",
        shortUrl: "",
        sort
      };
      let found = false;
      if (thumbnail) {
        result.thumbnail = thumbnail.src;
        found = true;
      }
      if (name) {
        result.name = name.textContent.trim() || result.name;
        const { gcode } = queryString(name.search);
        result.fullCode = gcode;
        result.shortUrl = "http://www.amiami.com/top/detail/detail?gcode=" + (result.code = codeRegex.test(gcode) ? gcode.substr(0, gcode.lastIndexOf("-")) : gcode);
        if (Config.blacklist.has(result.code)) continue;
        result.url = "http://www.amiami.com/top/detail/detail?gcode=" + gcode;
        found = true;
      }
      if (price) {
        result.price = price.lastChild.data.trim();
        found = true;
      }
      if (deal) {
        result.deal = deal.textContent.trim();
        found = true;
      }
      if (found) {
        View.add(result);
      }
      else {
        console.log("skipped %s", name);
      }
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
      finally {
        this.new =
        this.deleted = undefined;
      }
    },
  },
  init() {
    const selector = $(".selector");
    let current = selector, first = true;
    while (current = current.nextElementSibling) {
      if (!current.dataset.title) continue;
      const { id } = current;
      View.lists[id] = current;
      const a = document.createElement("a");
      a.setAttribute("href", "#" + id);
      a.appendChild(new Text(current.dataset.title + " items list"));
      if (!first) { selector.appendChild(new Text(" | ")); first = false; }
      selector.appendChild(a);
      current.insertAdjacentHTML("afterend", `<div class="top-title">${current.dataset.top}</div>`);
    }
    selector.addEventListener("click", View.selectorHandler);
    document.body.addEventListener("click", View.blacklistHandler);
    $("#history").addEventListener("click", View.historyDisplay);
    View.list = new List("full-list", View.scheme);
    View.new = new List("new", View.scheme);
    View.deleted = new List("deleted", View.scheme);
    View.blacklist = new List("blacklist", View.scheme);
  },
  selectorHandler(e) {
    try {
      if (e.target.tagName !== "A") return;
      e.preventDefault();
      const id = e.target.getAttribute("href").substr(1);
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
  blacklistHandler(e) {
    try {
      if (
        e.target.tagName !== "SPAN" ||
        e.target.className !== "blacklist"
      ) return;
      e.preventDefault();
      const code = e.target.parentNode.parentNode.dataset.code;
      if (
        $("body > #blacklist").hidden
      ) {
        let exampleItem;
        switch ($(".selector ~ div:not([hidden])").id) {
          case "full-list": exampleItem = Config.local.get(code).values().next().value; break;
          case "new":       exampleItem = View.new.get("code", code); break;
          case "deleted":   exampleItem = View.deleted.get("code", code); break;
        }
        Config.blacklist.set(code, exampleItem);
        View.blacklist.add(exampleItem);
        View.list.remove("code", code);
        View.new.remove("code", code);
        View.deleted.remove("code", code);
      }
      else {
        const item = Config.blacklist.get(code);
        Config.blacklist.delete(code);
        View.blacklist.remove("code", code);
        View.list.add(item);
        View.list.sort("sort");
      }
      Config.set("blacklist", [...Config.blacklist]);
      return false;
    }
    catch(err) { console.error(err); }
  },
  add(item) {
    if (Config.remote.has(item.code)) Config.remote.get(item.code).set(item.fullCode, item);
    else Config.remote.set(item.code, new Map().set(item.fullCode, item));
    View.list.add(item);
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
      root.innerHTML = `<div id="new-history"><input type="text" class="fuzzy-search" /><ul class="pagination"></ul><ul class="list"></ul></div><div id="deleted-history"><input type="text" class="fuzzy-search" /><ul class="pagination"></ul><ul class="list"></ul></div>`;
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
      fragment.appendChild(h1);
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
    item: `<li class="item"><div class="item-top"><div class="item-icon"><a class="url"><img class="thumbnail" /></a></div><div class="item-name"><a class="name shortUrl"></a></div></div><div class="item-bottom"><div class="item-deal deal"></div><span class="blacklist">×</span><div class="item-price price"></div></div></li>`,
    page: 40,
    pagination: true
  },
};

Main = {
  async init() {
    Object.defineProperty(unsafeWindow, "crawler", {
      value: true
    });
    View.init();
    (View.historyScheme = assign({}, View.scheme)).page = 15;
    View.historyScheme.item = `<li class="item"><div class="item-top"><div class="item-icon"><a class="url"><img class="thumbnail" /></a></div><div class="item-name"><a class="name shortUrl"></a></div></div><div class="item-bottom"><div class="item-deal deal"></div><div class="item-price price"></div></div></li>`;
    localforage.config({ name: "amiamicrawler" });
    localforage.setDriver(localforage.INDEXEDDB);
    const interval = await Config.get("interval");
    if (typeof interval === "number") Config.interval = interval;
    const previous = await Config.get("items");
    if (previous instanceof Map) Config.local = previous;
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
    Pages.main();
  },
};

Main.init().catch(console.error);
