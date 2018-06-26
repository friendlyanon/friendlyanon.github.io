// ==UserScript==
// @name        AmiAmi Crawler - Alternative XHR
// @description Alternative way to make network requests for AmiAmi Crawler
// @namespace   friendlyanon
// @include     https://friendlyanon.github.io/amiami-crawler/
// @version     1
// @grant       GM_xmlhttpRequest
// ==/UserScript==

/* global GM_xmlhttpRequest */

"use strict";

function onload(e) {
  document.dispatchEvent(new CustomEvent("amiami-res", { detail: e.response }));
}

document.addEventListener("amiami-xhr", function(e) {
  if (!e.detail) {
    return document.dispatchEvent(new CustomEvent("amiami-res"));
  }
  GM_xmlhttpRequest({
    method: "GET",
    url: e.detail,
    onload
  });
});
