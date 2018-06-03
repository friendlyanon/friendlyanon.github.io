(function() {
"use strict";

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
  transitionEnd: null,
  onBeforeOpen: null,
  onBeforeClose: null,
  onOpen: null,
  onClose: null,
};

function throwError(message) {
  console.error(`VanillaModal: ${message}`);
}

function getNode(selector, parent) {
  const targetNode = parent || document;
  const node = targetNode.querySelector(selector);
  if (!node) {
    throwError(`${selector} not found in document.`);
  }
  return node;
}

function getElementContext(e) {
  if (e && typeof e.hash === "string") {
    return document.querySelector(e.hash);
  }
  else if (typeof e === "string") {
    return document.querySelector(e);
  }
  throwError("No selector supplied to open()");
  return null;
}

function applyUserSettings(settings) {
  return Object.assign(
    {},
    defaults,
    settings,
    { transitionEnd: { key: "transition", value: "transitionend" } },
  );
}

function matches(e, selector) {
  const allMatches = (e.target.document || e.target.ownerDocument).querySelectorAll(selector);
  const { body, documentElement } = document;
  outerLoop:
  for (const match of allMatches) {
    let node = e.target;
    while (node) {
      switch (node) {
        case body: case documentElement: continue outerLoop;
        case match: return node;
      }
      node = node.parentNode;
    }
  }
  return null;
}

class VanillaModal {
  constructor(settings) {
    this.isOpen = false;
    this.current = null;
    this.isListening = false;
    this.listeners = [];

    this.settings = applyUserSettings(settings);
    this.dom = this.getDomNodes();

    this.addLoadedCssClass();
    this.listen();
  }

  getDomNodes() {
    const {
      modal,
      page,
      modalInner,
      modalContent,
    } = this.settings;
    return {
      modal: getNode(modal),
      page: getNode(page),
      modalInner: getNode(modalInner, getNode(modal)),
      modalContent: getNode(modalContent, getNode(modal)),
    };
  }

  addLoadedCssClass() {
    this.dom.page.classList.add(this.settings.loadClass);
  }

  setOpenId(id) {
    const { page } = this.dom;
    page.setAttribute("data-current-modal", id || "anonymous");
  }

  removeOpenId() {
    const { page } = this.dom;
    page.removeAttribute("data-current-modal");
  }

  open(allMatches, e) {
    const { page } = this.dom;
    const { onBeforeOpen, onOpen } = this.settings;
    this.releaseNode(this.current);
    this.current = getElementContext(allMatches);
    if (!(this.current instanceof HTMLElement)) {
      throwError("VanillaModal target must exist on page.");
      return;
    }
    if (typeof onBeforeOpen === "function") {
      onBeforeOpen.call(this, e);
    }
    this.captureNode(this.current);
    page.classList.add(this.settings.class);
    this.setOpenId(this.current.id);
    this.isOpen = true;
    if (typeof onOpen === "function") {
      onOpen.call(this, e);
    }
  }

  get hasTransition() {
    return this.dom.modal.style.hasOwnProperty("transitionDuration");
  }

  close(e) {
    const {
      transitions,
      transitionEnd,
      onBeforeClose,
    } = this.settings;
    if (this.isOpen) {
      this.isOpen = false;
      if (typeof onBeforeClose === "function") {
        onBeforeClose.call(this, e);
      }
      this.dom.page.classList.remove(this.settings.class);
      if (transitions && transitionEnd && this.hasTransition) {
        this.closeModalWithTransition(e);
      } else {
        this.closeModal(e);
      }
    }
  }

  closeModal(e) {
    const { onClose } = this.settings;
    this.removeOpenId(this.dom.page);
    this.releaseNode(this.current);
    this.isOpen = false;
    this.current = null;
    if (typeof onClose === "function") {
      onClose.call(this, e);
    }
  }

  closeModalWithTransition(e) {
    const { modal } = this.dom;
    const { transitionEnd } = this.settings;
    const closeTransitionHandler = () => this.closeModal(e);
    modal.addEventListener(transitionEnd, closeTransitionHandler, { once: true });
  }

  captureNode(node) {
    const { modalContent } = this.dom;
    while (node.childNodes.length) {
      modalContent.appendChild(node.childNodes[0]);
    }
  }

  releaseNode(node) {
    const { modalContent } = this.dom;
    while (modalContent.childNodes.length) {
      node.appendChild(modalContent.childNodes[0]);
    }
  }

  closeKeyHandler(e) {
    const { closeKeys } = this.settings;
    if (
      isArray(closeKeys) &&
      closeKeys.length &&
      closeKeys.indexOf(e.which) > -1 &&
      this.isOpen === true
    ) {
      e.preventDefault();
      this.close(e);
    }
  }

  outsideClickHandler(e) {
    const { clickOutside } = this.settings;
    const { modalInner } = this.dom;
    if (clickOutside) {
      const { body } = document;
      let node = e.target;
      while (node && node !== body) {
        if (node === modalInner) {
          return;
        }
        node = node.parentNode;
      }
      this.close(e);
    }
  }

  delegateOpen(e) {
    const { open } = this.settings;
    const matchedNode = matches(e, open);
    if (matchedNode) {
      e.preventDefault();
      this.open(matchedNode, e);
    }
  }

  delegateClose(e) {
    const { close } = this.settings;
    if (matches(e, close)) {
      e.preventDefault();
      this.close(e);
    }
  }

  listen() {
    if (!this.isListening) {
      const { dom: { modal }, listeners } = this;
      modal.addEventListener("click", listeners[listeners.push(e => this.outsideClickHandler(e)) - 1], false);
      document.addEventListener("keydown", listeners[listeners.push(e => this.closeKeyHandler(e)) - 1], false);
      document.addEventListener("click", listeners[listeners.push(e => this.delegateOpen(e)) - 1], false);
      document.addEventListener("click", listeners[listeners.push(e => this.delegateClose(e)) - 1], false);
      this.isListening = true;
    } else {
      throwError("Event listeners already applied.");
    }
  }

  destroy() {
    if (this.isListening) {
      const { dom: { modal }, listeners } = this;
      this.close();
      document.removeEventListener("click", listeners.pop());
      document.removeEventListener("click", listeners.pop());
      document.removeEventListener("keydown", listeners.pop());
      modal.removeEventListener("click", listeners.pop());
      this.isListening = false;
    } else {
      throwError("Event listeners already removed.");
    }
  }
}

window.VanillaModal = VanillaModal;

}());