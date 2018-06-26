// ==UserScript==
// @name        AmiAmi Crawler - Alternative XHR
// @description Alternative way to make network requests for AmiAmi Crawler
// @namespace   friendlyanon
// @include     https://friendlyanon.github.io/amiami-crawler/
// @version     1
// @grant       GM_xmlhttpRequest
// ==/UserScript==

/* global GM_xmlhttpRequest */
/* eslint-disable no-cond-assign */

"use strict";
let once = true;

function onload() {
  document.dispatchEvent(new CustomEvent("amiami-res", { detail: this.response }));
}

document.addEventListener("amiami-xhr", function(e) {
  console.log(e);
  if (once) {
    document.dispatchEvent(new CustomEvent("amiami-res"));
    return once = false;
  }
  GM_xmlhttpRequest({
    method: "GET",
    url: e.detail,
    onload
  });
});
