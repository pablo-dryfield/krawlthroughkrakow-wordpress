"""Reproduce the full original homepage icon font; never subset or alter artwork."""
from io import BytesIO, StringIO
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'staging/wp-content/mu-plugins/ktk-homepage-assets'
SOURCE = ASSETS / 'parity/e5109a227107-modules.woff'
OUTPUT = ASSETS / 'etmodules-full.woff2'
SOURCE_HASH = 'fe67b77ac7e0ef4b482dafb86adfa403db1b89a2f337d2dc8bd1278cfe975196'


def table_xml(font, tag):
    from fontTools.misc.xmlWriter import XMLWriter
    buffer = StringIO()
    font[tag].toXML(XMLWriter(buffer), font)
    return buffer.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--coverage', action='store_true')
    args = parser.parse_args()
    import fontTools
    import brotli
    from fontTools.ttLib import TTFont
    if (fontTools.__version__, brotli.__version__) != ('4.66.1', '1.2.0'):
        raise ValueError('Use reviewed FontTools 4.66.1 and Brotli 1.2.0 to reproduce bytes')
    source = SOURCE.read_bytes()
    if hashlib.sha256(source).hexdigest() != SOURCE_HASH:
        raise ValueError('Review changed original homepage icon font')
    original = TTFont(BytesIO(source), recalcTimestamp=False)
    original.flavor = 'woff2'
    buffer = BytesIO()
    original.save(buffer)
    candidate = buffer.getvalue()
    decoded = TTFont(BytesIO(candidate), recalcTimestamp=False)
    # Read the source afresh: the encoder can update the in-memory head flags.
    original = TTFont(BytesIO(source), recalcTimestamp=False)
    tags = [tag for tag in original.keys() if tag != 'GlyphOrder']
    if set(original.keys()) != set(decoded.keys()):
        raise ValueError('Font table inventory changed')
    exact = [tag for tag in tags if tag != 'head' and table_xml(original, tag) == table_xml(decoded, tag)]
    if len(exact) != len(tags) - 1:
        raise ValueError('A semantic font table changed')
    original_flags, decoded_flags = original['head'].flags, decoded['head'].flags
    if decoded_flags != original_flags | (1 << 11):
        raise ValueError('Unexpected WOFF2 head flag change')
    # W3C WOFF2 requires bit 11; checkSumAdjustment is recomputed by the encoder.
    decoded['head'].flags = original_flags
    decoded['head'].checkSumAdjustment = original['head'].checkSumAdjustment
    if table_xml(original, 'head') != table_xml(decoded, 'head'):
        raise ValueError('Another head field changed')
    if len(original.getBestCmap()) != 409 or len(original.getGlyphOrder()) != 410:
        raise ValueError('Original glyph coverage changed')
    if args.write:
        OUTPUT.write_bytes(candidate)
    elif not OUTPUT.exists() or OUTPUT.read_bytes() != candidate:
        raise ValueError('Committed font does not match reproducible output; review then use --write')
    report = {'sourceSha256': SOURCE_HASH, 'sourceBytes': len(source),
                     'outputSha256': hashlib.sha256(candidate).hexdigest(),
                     'outputBytes': len(candidate), 'exactSemanticTables': exact,
                     'headFlags': [original_flags, decoded_flags],
                     'headOtherFieldsExact': True, 'mappedCharacters': 409,
                     'glyphs': 410, 'written': args.write}
    if args.coverage:
        report['codepoints'] = sorted(original.getBestCmap())
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
