// ==UserScript==
// @name        AmiAmi Crawler - Alternative XHR
// @description Alternative way to make network requests for AmiAmi Crawler
// @namespace   friendlyanon
// @include     https://friendlyanon.github.io/amiami-crawler/*
// @version     5
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// ==/UserScript==

/* global GM_xmlhttpRequest, GM */

"use strict";

const xhr = typeof GM !== "undefined" ?
  GM.xmlHttpRequest.bind(GM) :
  GM_xmlhttpRequest;

function onload(e) {
  document.dispatchEvent(new CustomEvent("amiami-res", { detail: e.responseText }));
}

document.addEventListener("amiami-xhr", function(e) {
  if (!e.detail) {
    return document.dispatchEvent(new CustomEvent("amiami-res"));
  }
  xhr({
    method: "GET",
    url: e.detail,
    headers: { "x-user-key": "amiami_dev" },
    onload
  });
});
