"""Compile a closed standalone SVG probe and its review-only edge policy.

This module has no FTPS, Cloudflare, publication or purge capability. A future
live pilot needs complete current CI and approval for the exact two-path rule.
"""
from __future__ import annotations

import base64
import gzip
import hashlib
import importlib.util
import json
import re
import subprocess
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = {
    'regular': ('hero-statue-regular.svg', '95ae7ee6a4c5fc951a20493c159427598d3f28b810a95191ca846f72548e4c7c'),
    'seasonal': ('hero-statue-seasonal.svg', 'a6071047938e6dc52afd0fadb026d85496f7d3d744b602b9a27a798567e07aa7'),
}
FILES = {'.htaccess', 'origin.php'} | {stem + suffix for stem in ORIGINALS for suffix in ('.svg', '.identity', '.br', '.gz')}
ANCHOR = '/* BEGIN compiled SVG probe manifest */\n$manifest = [];\n/* END compiled SVG probe manifest */'


def sha(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def checked_token(token: str) -> str:
    if not isinstance(token, str) or not re.fullmatch('[a-f0-9]{32}', token):
        raise ValueError('Exact fresh32-hex probe token required')
    return token


@lru_cache(maxsize=2)
def encoded(raw: bytes) -> tuple[bytes, bytes]:
    code = "const z=require('node:zlib'),b=require('node:fs').readFileSync(0);process.stdout.write(z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}}));"
    br = subprocess.run(['node', '-e', code], input=raw, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=60).stdout
    decode = "const z=require('node:zlib');process.stdout.write(z.brotliDecompressSync(require('node:fs').readFileSync(0),{maxOutputLength:1000000}));"
    assert subprocess.run(['node', '-e', decode], input=br, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=15).stdout == raw
    gz = gzip.compress(raw, compresslevel=9, mtime=0)
    assert gzip.decompress(gz) == raw
    return br, gz


def cache_policy(token: str) -> dict:
    """Return an unexecuted rule for only the fresh probe's two SVG aliases."""
    token = checked_token(token)
    prefix = '/staging/ktk-svg-encoding-probe-' + token + '/'
    return {
        'description': 'KTK isolated SVG probe ' + token,
        'enabled': True,
        'expression': '(http.host eq "krawlthroughkrakow.com" and http.request.method in {"GET" "HEAD"} and http.request.uri.path in {"' + prefix + 'regular.svg" "' + prefix + 'seasonal.svg"})',
        'action': 'set_cache_settings',
        'action_parameters': {
            'cache': True,
            'respect_strong_etags': True,
            'vary': {'default': {'action': 'bypass'}, 'headers': {'accept-encoding': {'action': 'passthrough'}}},
        },
    }


def payload(token: str, cache_mode: str, generated_at: int) -> tuple[dict[str, bytes], dict]:
    token = checked_token(token)
    if cache_mode not in ('no-store', 'public') or type(generated_at) is not int or not 1_700_000_000 <= generated_at <= 2_100_000_000:
        raise ValueError('Explicit bounded epoch and fixed cache mode required')
    template = (ROOT / 'tools/svg-negotiation-origin.php').read_bytes().decode('utf-8')
    if template.count(ANCHOR) != 1:
        raise ValueError('Exact uncompiled origin-template boundary required')
    files: dict[str, bytes] = {}
    manifest = {'schemaVersion': 1, 'token': token, 'cacheMode': cache_mode, 'generatedAt': generated_at, 'expiresAt': generated_at + 3600, 'assets': {}}
    for stem, (name, digest) in ORIGINALS.items():
        raw = (ROOT / 'staging/wp-content/mu-plugins/ktk-homepage-assets' / name).read_bytes()
        if sha(raw) != digest:
            raise ValueError('Original vector source changed; refuse compilation')
        br, gz = encoded(raw)
        manifest['assets'][stem] = {}
        for coding, suffix, value in [('identity', 'identity', raw), ('br', 'br', br), ('gzip', 'gz', gz)]:
            filename = stem + '.' + suffix
            files[filename] = value
            manifest['assets'][stem][coding] = {'file': filename, 'bytes': len(value), 'sha256': sha(value), 'originalSHA256': digest}
        files[stem + '.svg'] = b'<svg xmlns="http://www.w3.org/2000/svg"><desc>Unrewritten isolated probe sentinel</desc></svg>\n'
    bound = base64.b64encode(json.dumps(manifest, separators=(',', ':')).encode()).decode()
    compiled = "/* BEGIN compiled SVG probe manifest */\n$manifest = json_decode(base64_decode('" + bound + "', true), true, 16, JSON_THROW_ON_ERROR);\n/* END compiled SVG probe manifest */"
    files['origin.php'] = template.replace(ANCHOR, compiled, 1).encode('utf-8')
    # No parent rewrite/configuration changes. Actual LiteSpeed behavior is an
    # unverified live-pilot gate; the local PHP router is a qualified substitute.
    files['.htaccess'] = b'''<IfModule mod_env.c>
SetEnv no-gzip 1
SetEnv no-brotli 1
</IfModule>
<FilesMatch "^(regular|seasonal)[.](svg|identity|br|gz)$|^origin[.]php$">
<IfModule mod_expires.c>
ExpiresActive Off
</IfModule>
<IfModule mod_headers.c>
Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>
</FilesMatch>
RewriteEngine On
RewriteRule ^(regular|seasonal)\\.svg$ origin.php?asset=$1 [L,QSD]
'''
    if set(files) != FILES or len(files) != 10:
        raise RuntimeError('Exactly ten declared probe files required')
    return files, manifest
