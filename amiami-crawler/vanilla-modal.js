/* eslint-disable strict, no-cond-assign */
(function() {

"use strict";
const { hasOwnProperty: has, toString } = Object.prototype;
const html = document.documentElement;
const {
  0: transitionEnd,
  1: transitionDuration,
} = (() => {
  const el = document.createElement("div");
  if ("transition" in el.style) {
    return ["transitionend", "transitionDuration"];
  }
  if ("OTransition" in el.style) {
    if (Number(opera.version().split(".")[0]) > 11) {
      return ["otransitionend", "OTransitionDuration"];
    }
    return ["oTransitionEnd", "OTransitionDuration"];
  }
  if ("MozTransition" in el.style) {
    return ["transitionend", "MozTransitionDuration"];
  }
  if ("WebkitTransition" in el.style) {
    return ["webkitTransitionEnd", "WebkitTransitionDuration"];
  }
  return {};
})();
const whitespaceRegex = /\s+/;

const defaults = {
  modal: ".modal",
  modalInner: ".modal-inner",
  modalContent: ".modal-content",
  open: "[data-modal-open]",
  close: "[data-modal-close]",
  page: "body",
  class: "modal-visible",
  loadClass: "vanilla-modal",
  clickOutside: true,
  closeKeys: [27],
  transitions: true,
  onbeforeopen: null,
  onbeforeclose: null,
  onopen: null,
  onclose: null,
};

const instancesMap = [];
const instanceId = "data-vanilla-id-" + Math.random().toString(32).slice(2);

function isArray(obj) {
  return toString.call(obj) === "[object Array]";
}

function throwError(message) {
  console.error(`VanillaModal: ${message}`);
}

function getNode(selector, parent) {
  const targetNode = parent || document;
  const node = targetNode.querySelector(selector);
  if (!node) {
    throwError(`${selector} not found in document`);
  }
  return node;
}

function trim(str) {
  if (typeof str !== "string") return "";
  let c, i = 0, j = str.length;
  if (!j) return "";
  while ((c = str.charCodeAt(i++)) >= 0) {
    switch (c) {
      case 9: case 10: case 11: case 12: case 13: case 32: case 65279: continue;
    }
    break;
  }
  if (i === j) return "";
  while ((c = str.charCodeAt(--j)) >= 0) {
    switch (c) {
      case 9: case 10: case 11: case 12: case 13: case 32: case 65279: continue;
    }
    break;
  }
  return --i >= ++j ? "" : str.slice(i, j);
}

function addClass(el, _class) {
  const attribute = el.getAttribute("class");
  if (!attribute) return el.setAttribute("class", _class);
  const classNames = trim(attribute).split(whitespaceRegex);
  if (classNames.indexOf(_class) >= 0) return;
  switch (classNames.length) {
    case 0: el.setAttribute("class", _class); break;
    case 1: el.setAttribute("class", `${classNames[0]} ${_class}`); break;
    default: el.setAttribute("class", `${classNames.join(" ")} ${_class}`);
  }
}

function removeClass(el, _class) {
  const attribute = el.getAttribute("class");
  if (!attribute) return;
  const classNames = trim(attribute).split(whitespaceRegex);
  const len = classNames.length;
  if (!len) return el.removeAttribute("class");
  const idx = classNames.indexOf(_class);
  if (idx < 0) return;
  if (len === 1) return el.removeAttribute("class");
  classNames.splice(idx, 1);
  el.setAttribute("class", len > 2 ? classNames.join(" ") : classNames[0]);
}

function getElementContext(e) {
  if (e && typeof e.hash === "string") {
    return document.querySelector(e.hash);
  }
  else if (typeof e === "string") {
    return document.querySelector(e);
  }
  throwError("No selector supplied to open()");
}

function applyUserSettings(settings) {
  const obj = {};
  for (const k in defaults) if (has.call(defaults, k)) obj[k] = defaults[k];
  for (const k in settings) if (has.call(settings, k)) obj[k] = settings[k];
  return obj;
}

function matches(target, selector) {
  const allMatches = target.ownerDocument.querySelectorAll(selector);
  if (!allMatches) return;
  const len = allMatches.length;
  for (let i = 0; i < len; ++i) {
    const match = allMatches[i];
    let node = target;
    do { if (node === html) break; if (node === match) return node; }
    while (node = node.parentNode);
  }
}

function prepend(target, source) {
  const fragment = document.createDocumentFragment();
  for (let el; el = source.firstChild; ) fragment.appendChild(el);
  target.insertBefore(fragment, target.firstChild);
}

function getDomNodes(settings) {
  const {
    modal,
    page,
    modalInner,
    modalContent,
  } = settings;
  const modalEl = getNode(modal);
  return {
    modal: modalEl,
    page: getNode(page),
    modalInner: getNode(modalInner, modalEl),
    modalContent: getNode(modalContent, modalEl),
  };
}

function hasTransition(el) {
  const css = window.getComputedStyle(el, null)[transitionDuration];
  return typeof css === "string" && parseFloat(css) > 0;
}

function crankshaftTryCatch(fn, context, event) {
  try { fn.call(context, event); }
  catch (err) { throwError(err); }
}

document.addEventListener("keydown", function(e) {
  const len = instancesMap.length;
  const { _closeKeyHandler } = VanillaModal.prototype;
  for (let i = 0; i < len; ++i) {
    const inst = instancesMap[i];
    if (inst) crankshaftTryCatch(_closeKeyHandler, inst, e);
  }
}, false);

document.addEventListener("click", function(e) {
  const len = instancesMap.length;
  const {
    _outsideClickHandler,
    _delegateOpen,
    _delegateClose
  } = VanillaModal.prototype;
  let node = e.target;
  do {
    if (node === html) break;
    const attribute = node.getAttribute(instanceId);
    if (attribute) {
      const inst = instancesMap[attribute];
      if (inst) crankshaftTryCatch(_outsideClickHandler, inst, e);
      break;
    }
  } while (node = node.parentNode);
  for (let i = 0; i < len; ++i) {
    const inst = instancesMap[i];
    if (inst === null) continue;
    crankshaftTryCatch(_delegateOpen, inst, e);
    crankshaftTryCatch(_delegateClose, inst, e);
  }
}, false);

const VanillaModal = class {

constructor(settings) {
  this.isOpen =
  this._isListening = false;
  this.current =
  this._instanceId = null;

  this._dom = getDomNodes(this._settings = applyUserSettings(settings));

  const len = instancesMap.length;
  for (let i = 0; i < len; ++i) {
    const inst = instancesMap[i];
    if (inst && inst._dom.modal.parentNode === null) instancesMap[i] = null;
  }

  addClass(this._dom.page, this._settings.loadClass);
  this._listen();
}

open(selector, e) {
  const { page } = this._dom;
  const { onbeforeopen, onopen, class: _class } = this._settings;
  this._releaseNode(this.current);
  this.current = getElementContext(selector);
  if (!this.current) {
    return throwError("VanillaModal target must exist on page");
  }
  if (typeof onbeforeopen === "function") {
    crankshaftTryCatch(onbeforeopen, this, e);
  }
  this._captureNode(this.current);
  addClass(page, _class);
  page.setAttribute("data-current-modal", this.current.id || "anonymous");
  this.isOpen = true;
  if (typeof onopen === "function") {
    crankshaftTryCatch(onopen, this, e);
  }
}

close(e) {
  if (!this.isOpen) return;
  const {
    _settings: { transitions, onbeforeclose, class: _class },
    _dom,
  } = this;
  this.isOpen = false;
  if (typeof onbeforeclose === "function") {
    crankshaftTryCatch(onbeforeclose, this, e);
  }
  removeClass(_dom.page, _class);
  if (
    transitions &&
    transitionEnd &&
    hasTransition(_dom.modal)
  ) {
    return this._closeModalWithTransition(e);
  }
  this._closeModal(e);
}

destroy() {
  if (!this._isListening) return throwError("Event listeners already removed");
  this.close();
  this._instanceId =
  instancesMap[this._instanceId] = null;
  this._dom.modal.removeAttribute(instanceId);
  this._isListening = false;
}

_closeModal(e) {
  const { onclose } = this._settings;
  this._dom.page.removeAttribute("data-current-modal");
  this._releaseNode(this.current);
  this.isOpen = false;
  this.current = null;
  if (typeof onclose === "function") {
    crankshaftTryCatch(onclose, this, e);
  }
}

_closeModalWithTransition(e) {
  const that = this;
  const { modal } = this._dom;
  function closeHandler() {
    modal.removeEventListener(transitionEnd, closeHandler, false);
    that._closeModal(e);
  }
  modal.addEventListener(transitionEnd, closeHandler, false);
}

_captureNode(node) {
  if (node) prepend(this._dom.modalContent, node);
}

_releaseNode(node) {
  if (node) prepend(node, this._dom.modalContent);
}

_closeKeyHandler(e) {
  const { closeKeys } = this._settings;
  if (
    this.isOpen &&
    isArray(closeKeys) &&
    closeKeys.length &&
    closeKeys.indexOf(e.which) >= 0
  ) {
    e.preventDefault();
    this.close(e);
  }
}

_outsideClickHandler(e) {
  if (!this._settings.clickOutside) return;
  const { modalInner } = this._dom;
  let node = e.target;
  do { if (node === html) break; if (node === modalInner) return; }
  while (node = node.parentNode);
  this.close(e);
}

_delegateOpen(e) {
  const matchedNode = matches(e.target, this._settings.open);
  if (!matchedNode) return;
  e.preventDefault();
  this.open(matchedNode, e);
}

_delegateClose(e) {
  if (!matches(e.target, this._settings.close)) return;
  e.preventDefault();
  this.close(e);
}

_listen() {
  if (this._isListening) return throwError("Event listeners already applied");
  this._dom.modal.setAttribute(
    instanceId,
    this._instanceId = instancesMap.push(this) - 1
  );
  this._isListening = true;
}

}; // class VanillaModal

window.VanillaModal = VanillaModal;

}());
