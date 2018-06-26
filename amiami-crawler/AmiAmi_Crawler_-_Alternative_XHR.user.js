// ==UserScript==
// @name        AmiAmi Crawler - Alternative XHR
// @description Alternative way to make network requests for AmiAmi Crawler
// @namespace   friendlyanon
// @include     https://friendlyanon.github.io/amiami-crawler/
// @version     1
// @grant       GM_xmlhttpRequest
// @grant       unsafeWindow
// ==/UserScript==

/* global GM_xmlhttpRequest, unsafeWindow */
/* eslint-disable no-cond-assign */

"use strict";
let once = true;

function onload() {
  unsafeWindow.dispatchEvent(new CustomEvent("amiami-res", { detail: this.response }));
}

unsafeWindow.addEventListener("amiami-xhr", function(e) {
  if (once) {
    unsafeWindow.dispatchEvent(new CustomEvent("amiami-xhr"));
    return once = false;
  }
  GM_xmlhttpRequest({
    method: "GET",
    url: e.detail,
    onload
  });
});
