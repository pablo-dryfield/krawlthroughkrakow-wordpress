"""Build an exact-outline homepage social font, preserving the full original fallback."""
from io import BytesIO
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'staging/wp-content/mu-plugins/ktk-homepage-assets'
SOURCE = ASSETS / 'parity/114236a5fb48-fa-brands-400.woff2'
OUTPUT = ASSETS / 'social-icons-homepage.woff2'
SOURCE_HASH = '71b3ce72680f4183d28db86b184542051fd533bb1146933233e4f6a20cf98cba'
OUTPUT_HASH = '3044507fd7367ca59d4a95308e0cadd3d151032a335d2774f7871beeb2dda65a'
CODEPOINTS = (0xE07B, 0xF262)


def build():
    import fontTools
    import brotli
    from fontTools import subset
    from fontTools.ttLib import TTFont
    from fontTools.pens.recordingPen import DecomposingRecordingPen
    if (fontTools.__version__, brotli.__version__) != ('4.66.1', '1.2.0'):
        raise ValueError('Use reviewed FontTools4.66.1 and Brotli1.2.0')
    source = SOURCE.read_bytes()
    if hashlib.sha256(source).hexdigest() != SOURCE_HASH:
        raise ValueError('Review changed original social font')
    candidate = TTFont(BytesIO(source), recalcTimestamp=False)
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.name_legacy = True
    options.glyph_names = True
    options.recalc_timestamp = False
    options.notdef_outline = True
    options.ignore_missing_unicodes = False
    options.drop_tables += ['FFTM']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=CODEPOINTS)
    subsetter.subset(candidate)
    buffer = BytesIO()
    candidate.save(buffer)
    result = buffer.getvalue()
    if hashlib.sha256(result).hexdigest() != OUTPUT_HASH or len(result) != 932:
        raise ValueError('Review changed reproducible social font bytes')
    original = TTFont(BytesIO(source), recalcTimestamp=False)
    decoded = TTFont(BytesIO(result), recalcTimestamp=False)
    if set(decoded.getBestCmap()) != set(CODEPOINTS):
        raise ValueError('Unexpected subset character coverage')
    for codepoint in CODEPOINTS:
        glyph_names = [font.getBestCmap()[codepoint] for font in (original, decoded)]
        outlines = []
        for font, name in zip((original, decoded), glyph_names):
            pen = DecomposingRecordingPen(font.getGlyphSet())
            font.getGlyphSet()[name].draw(pen)
            outlines.append(pen.value)
        if outlines[0] != outlines[1]:
            raise ValueError('A social glyph outline changed')
        if original['hmtx'].metrics[glyph_names[0]] != decoded['hmtx'].metrics[glyph_names[1]]:
            raise ValueError('A social glyph advance/bearing changed')
    metrics = {'head': ['unitsPerEm'], 'hhea': ['ascent', 'descent', 'lineGap'],
               'OS/2': ['sTypoAscender', 'sTypoDescender', 'sTypoLineGap',
                        'usWinAscent', 'usWinDescent', 'fsSelection', 'sxHeight', 'sCapHeight']}
    for table, fields in metrics.items():
        for field in fields:
            if getattr(original[table], field, None) != getattr(decoded[table], field, None):
                raise ValueError('A line metric changed: ' + field)
    names = lambda font: sorted((n.nameID, n.platformID, n.platEncID, n.langID, n.string)
                                for n in font['name'].names)
    if names(original) != names(decoded):
        raise ValueError('Original font names/copyright metadata changed')
    return result, {'sourceSha256': SOURCE_HASH, 'outputSha256': OUTPUT_HASH,
                    'sourceBytes': len(source), 'outputBytes': len(result),
                    'codepoints': list(CODEPOINTS), 'originalMappedCharacters': len(original.getBestCmap()),
                    'outlinesAdvancesLineMetricsNamesExact': True,
                    'originalFallbackUntouched': hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_HASH}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    candidate, report = build()
    if args.write:
        OUTPUT.write_bytes(candidate)
    elif not OUTPUT.exists() or OUTPUT.read_bytes() != candidate:
        raise ValueError('Review the font and run with --write to generate its derivative')
    print(json.dumps({**report, 'written': args.write}, indent=2))


if __name__ == '__main__':
    main()
