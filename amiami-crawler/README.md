# amiami-crawler
Crawler for the preowned section of amiami.

## Usage
Navigate to the static [github.io page][1] to begin crawling. Progress indicator
is displayed in the bottom left corner. Items display as they come in. Icons
link to the preowned product's page, the name link leads to the general page of
the product - these later will be revised to open a modal with an iframe to the
product page so you can waste money without changing tabs. The tiny red × at the
bottom of cards is a blacklist button, which will blacklist item codes like
GOODS-01234 from appearing on lists other than blacklisted and past diff lists.
The input field at the top left corner is a fuzzy search box, meaning that it
will match exact or similar products based on their name.

## `Error. Try with userscript`
AmiAmi now has an API, but they do not send the necessary headers that browsers
require to fetch data from other domains. First, [cors.now.sh][2] was used to
bypass this, but that site seems to be down. Using the tiny userscript above
will enable you to make cross-origin requests from the crawler, but it requires
a userscript addon installed of course. It is not in my power currently to host
and alternative to [cors.now.sh][2], so if you have a possible solution that
does not require spending a single dime, I'm all ears. In the meantime, use the
userscript.

## Halp
If you are a CSS wizard who feels like helping then please poke me at
skype1234@waifu.club with your discord id maybe to pretty this shit up, thanks.

[1]: https://friendlyanon.github.io/amiami-crawler/