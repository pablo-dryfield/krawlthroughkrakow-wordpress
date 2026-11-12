# Homepage Photography

Prepared on 2026-10-06 with `python tools/prepare-homepage-images.py --prepare`.
The script requires Pillow. All photographs are existing Krawl Through Krakow
website or product-catalog assets. Processing is limited to resizing, a mobile
crop, format conversion, and compression. No people, backgrounds, signs, or other
scene content have been generated or modified.

Delivery files are in `staging/wp-content/mu-plugins/ktk-homepage-assets/`.
The publisher should include that directory. The source-download cache and
contact sheet are only in `staging/tmp-screenshots/homepage-media/`.

| Delivery name | Source | Subject and use |
| --- | --- | --- |
| `hero-640/960/1600.webp` | [Existing KTK homepage photo](https://krawlthroughkrakow.com/wp-content/uploads/2025/04/qjfkytgsbnnjmkmkcfrc_compressed_compressed.webp) | Guests with pink umbrella in Krakow Main Square; hero with HTML headline. Original is 1600 x 1066, so no 1920px upscale is supplied. |
| `hero-mobile-640/848.webp` | Same Main Square original | Explicit 4:5 crop preserves clear sky above the group. Maximum native crop is 848 x 1060. |
| `friends-640/960.webp` | [Existing KTK homepage photo](https://krawlthroughkrakow.com/wp-content/uploads/2025/04/perimbpnfuutdrdhv7ho_compressed_compressed.webp) | Three smiling guests in floral outfits at a KTK event. Existing small KTK watermark is retained. |
| `games-640/960.webp` | [Current Pub Crawl product catalog image](https://media.krawlthroughkrakow.com/products/28/pub-crawl-c20bbe36-4d6e-4184-9377-4b935d0c1a68.webp) | Guests talking and playing cards around a table. Shows the social aspect without implying a fixed venue guarantee. |
| `host-640/960.webp` | [Current Pub Crawl product catalog image](https://media.krawlthroughkrakow.com/products/28/pub-crawl-7f19fb00-ea82-4dff-b672-0614a6f8821f.webp) | Woman with a pink KTK lanyard raising a drink in a lively bar. Identity is not supplied, so do not invent a guide name or testimonial. |
| `umbrella-640/960.webp` | `photo-library/products/krakow-pub-crawl-with-krawl-through-krakow/11--5436826020.jpg` | KTK guests following the pink umbrella in Main Square. Origin URL and checksum are preserved in `photo-library/manifest.json`. |
| `meeting-640/960.webp` | `photo-library/products/krakow-pub-crawl-with-krawl-through-krakow/13--5436826038.jpg` | Existing group photo at the Adam Mickiewicz Monument; useful real meeting-point evidence. Origin URL and checksum are preserved in `photo-library/manifest.json`. |
| `logo.webp` | [Existing KTK logo](https://krawlthroughkrakow.com/wp-content/uploads/2025/05/new_logo_solid.webp) | Original 317 x 248 transparent WebP retained at 11,344 bytes; resizing/re-encoding increased its size. |

The desktop hero ranges from 30,970 to 59,240 bytes. Mobile hero variants are
43,200 and 64,446 bytes, well below the provisional mobile image budget. The
original full-size WebP is reused when recompression would only add weight and
lose quality. Use one responsive `<picture>` rather than loading separate hidden
desktop and mobile images.

`storefront-montserrat-latin.woff2` and `storefront-oswald-latin.woff2` are exact
copies of the existing storefront fonts, 37,956 and 21,472 bytes respectively.
No new font service or remote font request is needed.

The contact sheet and final mobile hero/table-game assets were visually inspected.
No clean standalone daytime photograph of the meeting monument or a clearly
identified named guide portrait was available in this inspected selection. A
future supplied image could improve landmark recognition; the existing group
photo is an honest alternative.

## Expanded Gallery And Secondary Experiences

Prepared with `python tools/prepare-homepage-images.py --additional-only`.
This command does not touch the existing homepage photographs, fonts, or logo.
Originals were inspected before conversion; the selection contact sheet is
`staging/tmp-screenshots/homepage-media/extended-contact-sheet.jpg`.

| Delivery name | Source | Subject and use |
| --- | --- | --- |
| `gallery-dance-640/960.webp` | `photo-library/products/krakow-pub-crawl-with-krawl-through-krakow/01--5046886494.jpg` | Mixed group dancing together inside a bar. Keep existing photographer/KTK watermarks visible where the layout allows. |
| `gallery-guests-640/960.webp` | `photo-library/products/krakow-pub-crawl-with-krawl-through-krakow/03--5436815344.jpg` | Friends smiling together outdoors during a KTK night. This is not evidence that they attended a private or student event. |
| `gallery-sing-640/960.webp` | [Existing KTK homepage photo](https://krawlthroughkrakow.com/wp-content/uploads/2025/04/zpw5fk7iqtdgmiaw7dgz_compressed_compressed.webp) | Smiling guest holding a microphone in a brick-vaulted bar. It documents a past moment; do not turn the image into a nightly karaoke guarantee. |
| `brunch-640/960.webp` | `photo-library/products/2-hour-bottomless-brunch-with-3-course-meal-and-drinks/01--5517301677.jpg`, also [current Brunch catalog image](https://media.krawlthroughkrakow.com/products/29/01-521c9f7a1ae6.jpg) | Bartender making a cocktail. Source is the current Brunch product image; no verified meal photograph was found. This is a portrait image, so preserve its vertical composition or use a considered center crop. |
| `nye-640/960.webp` | [Current NYE catalog image](https://media.krawlthroughkrakow.com/products/32/nye-pub-crawl-d7da322b-290e-4f2e-9e7d-cdf5f4f7e1e6.webp) | Real crowd celebrating with confetti and an existing PUB CRAWL 2025 watermark. Represents a past New Year's event, not guaranteed future decor or attendance. |

No clean, separately verified student-trip or private-group photograph was found.
The student page's old cover is a collage with baked marketing claims, and has
not been used. A regular KTK guest photo can support group enquiries with a
literal alt description, but must not be labelled as a documented private trip.
New Year's buffet photographs were not repurposed as brunch evidence.

## Video Poster

`video-poster-640.webp` and `video-poster-960.webp` are local, 16:9 derivatives of
the thumbnail returned by [Vimeo's oEmbed endpoint](https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F892352668%2Fdf4cdc75d0&width=1280)
for the [official KTK promo video](https://vimeo.com/892352668/df4cdc75d0).
Verified metadata: title `Promo`, author `Krawl through krakow`, duration 31
seconds, original poster 1280 x 720. The thumbnail shows dancing guests with the
video's original pink `JOIN US` title. Its scene and lettering have not been
modified. Use a literal accessible play label; the poster text is not a page
heading. This locally served poster does not contact Vimeo until the visitor
chooses the video link.

Recreate only these files with:
`python tools/prepare-homepage-images.py --additional-only --only video-poster`.
