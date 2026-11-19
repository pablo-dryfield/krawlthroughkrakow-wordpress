"""Reproduce the reviewed full-size NYE encoding; no network or crop/resize."""
from pathlib import Path
from io import BytesIO
import hashlib
from PIL import Image

root = Path(__file__).resolve().parents[1]
media = root / 'staging/wp-content/mu-plugins/ktk-code-pages-assets/media'
source = media / 'c3ba6f2526c9-edited-header.jpg'
target = media / 'ada148a3afee-nye-fireworks-full.webp'
digest = lambda data: hashlib.sha256(data).hexdigest()
expected = 'ada148a3afeeab406120b9d4c8797140151a3077fb067860cb8405c5e6fca60b'
assert digest(source.read_bytes()) == '31e758d55951fbb0cfb0921af2730249b904e2eb9c46228a860acfeab67c7c82'
with Image.open(source) as image:
    assert image.size == (1916, 1027) and image.mode == 'RGB'
    metadata = {key: image.info[key] for key in ('icc_profile', 'exif') if key in image.info}
    output = BytesIO()
    image.save(output, format='WEBP', quality=85, method=6, **metadata)
encoded = output.getvalue()
assert len(encoded) == 366772 and digest(encoded) == expected, 'Encoder differs from the reviewed artifact; review before replacing it'
assert not target.exists() or digest(target.read_bytes()) == expected, 'Preserve an unexpected existing file'
target.write_bytes(encoded)
print('Reproduced reviewed1916x1027 WebP366772bytes; original JPEG unchanged.')
