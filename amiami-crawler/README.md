# amiami-crawler
Crawler for the preowned section of amiami.

## Install
You need a userscript manager addon for your browser to use this.

| Browser | Addon |
| ------- | ----- |
| Firefox | [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) / [Violentmonkey](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/) |
| Seamonkey | [Greasemonkey](https://sourceforge.net/projects/gmport/) |
| Pale Moon | [Greasemonkey](https://github.com/janekptacijarabaci/greasemonkey/releases/latest) |
| Chrome/Chromium based | [Violentmonkey](https://chrome.google.com/webstore/detail/violent-monkey/jinjaccalgkegednnccohejagnlnfdag) (for [Opera](https://addons.opera.com/en/extensions/details/violent-monkey/)) / [Tampermonkey](https://tampermonkey.net/) |
| Safari | [JS Blocker](http://jsblocker.toggleable.com/) / [Tampermonkey](https://tampermonkey.net/) |
| Microsoft Edge | [Tampermonkey](https://www.microsoft.com/en-us/store/p/tampermonkey/9nblggh5162s) |

After that install the crawler:

|   Userscript   |     Link     |
| -------------- | ------------ |
| AmiAmi Crawler | [Install][1] |

## Usage
Navigate to the static [github.io page][2] to begin crawling. Progress indicator
is displayed in the top right corner. Items display as they come in. Icons link
to the preowned product's page, the name link leads to the general page of the
product - these later will be revised to open a modal with an iframe to the
product page so you can waste money without changing tabs. The tiny red × at the
bottom of cards is a blacklist button, which will blacklist item codes like
GOODS-01234 from appearing on lists other than blacklisted and past diff lists.
The input field at the top left corner is a fuzzy search box, meaning that it
will match exact or similar products based on their name.

## Halp
If you are a CSS wizard who feels like helping then please poke me at
skype1234@waifu.club with your discord id maybe to pretty this shit up, thanks.

[1]: https://raw.githubusercontent.com/friendlyanon/friendlyanon.github.io/master/amiami-crawler/amiami-crawler.user.js
[2]: https://friendlyanon.github.io/amiami-crawler/
