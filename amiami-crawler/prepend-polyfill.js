/* eslint-disable strict */
(function() {
  "use strict";
  const prepend = {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function prepend(...args) {
      if (!args.length) return;
      const docFrag = document.createDocumentFragment();
      for (const node of args) {
        docFrag.appendChild(
          node instanceof Node ? node : new Text(String(node))
        );
      }
      this.insertBefore(docFrag, this.firstChild);
    }
  };
  for (const item of [Element.prototype, Document.prototype, DocumentFragment.prototype]) {
    if (item.hasOwnProperty("prepend")) continue;
    Object.defineProperty(item, "prepend", prepend);
  }
}());