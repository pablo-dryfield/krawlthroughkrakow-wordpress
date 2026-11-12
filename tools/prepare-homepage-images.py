"""Build responsive homepage images from the existing KTK photo archive."""

import argparse
import json
import shutil
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "photo-library/products/krakow-pub-crawl-with-krawl-through-krakow"
PREVIEW = ROOT / "staging/tmp-screenshots/homepage-media"
OUTPUT = ROOT / "staging/wp-content/mu-plugins/ktk-homepage-assets"
SOURCES = PREVIEW / "sources"

REMOTE_SOURCES = {
    "square.webp": "https://krawlthroughkrakow.com/wp-content/uploads/2025/04/qjfkytgsbnnjmkmkcfrc_compressed_compressed.webp",
    "friends.webp": "https://krawlthroughkrakow.com/wp-content/uploads/2025/04/perimbpnfuutdrdhv7ho_compressed_compressed.webp",
    "games.webp": "https://media.krawlthroughkrakow.com/products/28/pub-crawl-c20bbe36-4d6e-4184-9377-4b935d0c1a68.webp",
    "host.webp": "https://media.krawlthroughkrakow.com/products/28/pub-crawl-7f19fb00-ea82-4dff-b672-0614a6f8821f.webp",
    "logo.webp": "https://krawlthroughkrakow.com/wp-content/uploads/2025/05/new_logo_solid.webp",
}

ADDITIONAL_REMOTE_SOURCES = {
    "gallery-sing.webp": "https://krawlthroughkrakow.com/wp-content/uploads/2025/04/zpw5fk7iqtdgmiaw7dgz_compressed_compressed.webp",
    "nye.webp": "https://media.krawlthroughkrakow.com/products/32/nye-pub-crawl-d7da322b-290e-4f2e-9e7d-cdf5f4f7e1e6.webp",
    "video-poster.jpg": "https://i.vimeocdn.com/video/1789191543-01b474c13a1d3407f0fb359954eb33b9e6e2d821c62a2815df18cfb7956d504c-d_1280?region=us",
}


def prepare_assets(additional_only=False, only_names=None):
    SOURCES.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    remote_sources = ADDITIONAL_REMOTE_SOURCES if additional_only else {**REMOTE_SOURCES, **ADDITIONAL_REMOTE_SOURCES}
    for filename, url in remote_sources.items():
        if not (SOURCES / filename).exists():
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=30) as response, (SOURCES / filename).open("wb") as target:
                shutil.copyfileobj(response, target)

    photos = {
        "hero": (SOURCES / "square.webp", (640, 960, 1600), None),
        "hero-mobile": (SOURCES / "square.webp", (640, 848), (456, 6, 1304, 1066)),
        "friends": (SOURCES / "friends.webp", (640, 960), None),
        "games": (SOURCES / "games.webp", (640, 960), None),
        "host": (SOURCES / "host.webp", (640, 960), None),
        "umbrella": (ARCHIVE / "11--5436826020.jpg", (640, 960), None),
        "meeting": (ARCHIVE / "13--5436826038.jpg", (640, 960), None),
    }
    additional_photos = {
        "gallery-dance": (ARCHIVE / "01--5046886494.jpg", (640, 960), None),
        "gallery-guests": (ARCHIVE / "03--5436815344.jpg", (640, 960), None),
        "gallery-sing": (SOURCES / "gallery-sing.webp", (640, 960), None),
        "brunch": (ROOT / "photo-library/products/2-hour-bottomless-brunch-with-3-course-meal-and-drinks/01--5517301677.jpg", (640, 960), None),
        "nye": (SOURCES / "nye.webp", (640, 960), None),
        "video-poster": (SOURCES / "video-poster.jpg", (640, 960), None),
    }
    photos = additional_photos if additional_only else {**photos, **additional_photos}
    if only_names:
        unknown = set(only_names) - photos.keys()
        if unknown:
            raise ValueError(f"Unknown image names: {', '.join(sorted(unknown))}")
        photos = {name: item for name, item in photos.items() if name in only_names}
    output_manifest = []
    for name, (source, widths, crop) in photos.items():
        with Image.open(source) as original:
            photo = ImageOps.exif_transpose(original).convert("RGB")
            if crop:
                photo = photo.crop(crop)
            for width in widths:
                if width > photo.width:
                    raise ValueError(f"Refusing to upscale {name} from {photo.width} to {width}")
                resized = photo.resize((width, round(photo.height * width / photo.width)), Image.Resampling.LANCZOS)
                target = OUTPUT / f"{name}-{width}.webp"
                if crop is None and width == photo.width and source.suffix == ".webp":
                    shutil.copyfile(source, target)
                else:
                    quality = 72 if source.name in ("square.webp", "friends.webp") else 80
                    if name in additional_photos:
                        quality = 74
                    resized.save(target, "WEBP", quality=quality, method=6)
                output_manifest.append({"file": target.name, "width": resized.width, "height": resized.height, "bytes": target.stat().st_size, "source": str(source.relative_to(ROOT)), "crop": crop})

    if additional_only or only_names:
        print(json.dumps(output_manifest, indent=2))
        return

    with Image.open(SOURCES / "logo.webp") as source:
        logo = source.convert("RGBA")
        # The original 317px transparent WebP is smaller than a re-encoded resize.
        shutil.copyfile(SOURCES / "logo.webp", OUTPUT / "logo.webp")
        output_manifest.append({"file": "logo.webp", "width": logo.width, "height": logo.height, "bytes": (OUTPUT / "logo.webp").stat().st_size, "source": REMOTE_SOURCES["logo.webp"]})

    for font in ("storefront-montserrat-latin.woff2", "storefront-oswald-latin.woff2"):
        shutil.copyfile(ROOT / "staging/wp-content/plugins/ktk-storefront/assets" / font, OUTPUT / font)
    print(json.dumps(output_manifest, indent=2))


def contact_sheet(extended=False):
    PREVIEW.mkdir(parents=True, exist_ok=True)
    if extended:
        files = sorted((PREVIEW / "extended-sources").glob("*"))
        files.extend((
            ARCHIVE / "01--5046886494.jpg",
            ARCHIVE / "03--5436815344.jpg",
            SOURCES / "zpw5fk7iqtdgmiaw7dgz.webp",
            SOURCES / "khiybjyfrsplomnthxoe.webp",
            ROOT / "photo-library/products/2-hour-bottomless-brunch-with-3-course-meal-and-drinks/01--5517301677.jpg",
        ))
    else:
        files = sorted(ARCHIVE.glob("*.jpg"))
        files.extend(sorted((PREVIEW / "sources").glob("*")))
    sheet = Image.new("RGB", (1200, ((len(files) + 3) // 4) * 228), "#181818")
    draw = ImageDraw.Draw(sheet)
    for index, file in enumerate(files):
        with Image.open(file) as source:
            photo = ImageOps.exif_transpose(source).convert("RGB")
            thumb = ImageOps.contain(photo, (292, 196))
            x, y = (index % 4) * 300 + 4, (index // 4) * 228 + 4
            sheet.paste(thumb, (x, y))
            draw.text((x, y + 198), file.name[:38], fill="white")
            draw.text((x, y + 211), f"{photo.width} x {photo.height}", fill="#cccccc")
    output = PREVIEW / ("extended-contact-sheet.jpg" if extended else "contact-sheet.jpg")
    sheet.save(output, quality=85)
    print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true", help="Write responsive delivery assets")
    parser.add_argument("--additional-only", action="store_true", help="Prepare added gallery/secondary photos without touching existing assets")
    parser.add_argument("--only", nargs="+", help="Prepare only the specified photo names, without touching logo/fonts")
    parser.add_argument("--extended-contact", action="store_true", help="Preview additional gallery and experience sources")
    args = parser.parse_args()
    if args.prepare or args.additional_only or args.only:
        prepare_assets(additional_only=args.additional_only, only_names=args.only)
    else:
        contact_sheet(args.extended_contact)
