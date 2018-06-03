/* global List, localforage */
/* eslint-disable no-cond-assign, strict */
(function() {

"use strict";

let Pages, Parser, Main, View, Config;
const { setPrototypeOf, assign, entries } = Object;
const { isArray } = Array;

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
       case "Set":
        return new Set(entry.data);
       case "Map":
        return toValues(new Map, entry.data);
      }
    }
    return entry;
  },
  interval: 100,
  pastEntries: [],
};

Pages = {
  template: "https://cors.now.sh/http://slist.amiami.com/top/search/list?s_st_condition_flg=1&pagemax=50&getcnt=0&pagecnt=<>",
  current: 0,
  sort: -1,
  main() {
    Config.changed.clear();
    View.spinner();
    Pages.req();
  },
  req() {
    const xhr = new XMLHttpRequest;
    xhr.open("GET", Pages.template.replace("<>", ++Pages.current));
    assign(xhr, {
      onload: Pages.afterReq,
      onerror: console.error,
      onabort: console.error,
      ontimeout: console.error,
      responseType: "document"
    });
    $(".loading span").textContent = Pages.current;
    xhr.send();
  },
  afterReq() {
    const products = $$(".product_box", this.response);
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
      catch(_) { /*  */ }
      finally {
        this.new =
        this.deleted = undefined;
      }
    },
  },
  init() {
    const selector = $(".selector");
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
    setTimeout(() => {
      if (selector.children.length > 0) {
        return selector.classList.add("userjs");
      }
      selector.appendChild(fragment);
      selector.firstElementChild.className = "active";
    }, 1500);
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
      for (const child of e.target.parentNode.children) {
        if (child === e.target) child.className = "active";
        else child.removeAttribute("class");
      }
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
      if (!$("body > #history").hidden) {
        const idx = Number(e.target.previousElementSibling.getAttribute("href").substr(1));
        Config.pastEntries.splice(idx, 1);
        View.historyRender();
        Config.set("history", Config.pastEntries);
        return false;
      }
      const code = e.target.parentNode.parentNode.dataset.code;
      if ($("body > #blacklist").hidden) {
        let exampleItem;
        switch ($(".selector ~ div[data-title]:not([hidden])").id) {
          case "full-list": exampleItem = Config.local.get(code).values().next().value; break;
          case "new":       exampleItem = View.new.get("code", code); break;
          case "deleted":   exampleItem = View.deleted.get("code", code); break;
        }
        Config.blacklist.set(code, exampleItem);
        View.blacklist.add(exampleItem);
        try { View.list.remove("code", code); } catch(_) { /*  */ }
        try { View.new.remove("code", code); } catch(_) { /*  */ }
        try { View.deleted.remove("code", code); } catch(_) { /*  */ }
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
    item: `<li class="item"><div class="item-top"><div class="item-icon"><a target="_blank" class="url"><img class="thumbnail" /></a></div><div class="item-name"><a target="_blank" class="name shortUrl"></a></div></div><div class="item-bottom"><div class="item-deal deal"></div><span class="blacklist">×</span><div class="item-price price"></div></div></li>`,
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

document.addEventListener("DOMContentLoaded", Main.init, { once: true });

}());