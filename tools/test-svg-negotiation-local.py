"""Actual standalone PHP HTTP contracts; never connects to hosting or Cloudflare.

Fixtures remain in the explicit ignored output directory. Only the PHP process
created here is stopped. Existing previews and all application assets stay put.
The local router substitutes for unverified LiteSpeed rewrites and edge policy.
"""
from __future__ import annotations

import argparse
import datetime
import gzip
import hashlib
import http.client
import importlib.util
import json
import os
import re
import socket
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ktk_svg_payload', ROOT / 'tools/svg-negotiation-payload.py')
svg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(svg)
CASES = [
    (None, 'identity'), ('', 'identity'), (' , , ', 'identity'), ('\tbr\t', 'br'), (' \tBr ; Q=0.5\t, gzip; q=0.4 , identity; q=0 ', 'br'),
    ('br', 'br'), ('gzip', 'gzip'), ('identity', 'identity'), ('zstd', 'identity'),
    ('br, gzip', 'br'), ('gzip, br', 'br'),
    ('br;q=0.1,gzip;q=1,identity;q=0', 'gzip'),
    ('gzip;q=0.1,br;q=1,identity;q=0', 'br'),
    ('br;q=0.1,gzip;q=0.2,identity;q=0.8', 'identity'),
    ('br;q=0.5,gzip;q=0.5,identity;q=0.5', 'br'),
    ('br;q=0,gzip;q=0', 'identity'), ('br;q=0,gzip;q=0,identity;q=0', None),
    ('*;q=0', None), ('*;q=0,identity;q=1', 'identity'), ('*;q=0.5', 'identity'),
    ('br;q=0,*;q=0.3', 'identity'), ('br;q=0,gzip;q=0,*;q=1', 'identity'),
    ('*;q=1,identity;q=0', None), ('*;q=1,gzip;q=0.5,identity;q=0', 'gzip'),
    ('BR;Q=0.001, GZIP;Q=0.002, IDENTITY;Q=0', 'gzip'),
    ('br;q=0.000,gzip;q=1.000,identity;q=0.', 'gzip'),
    ('br;q=0.001,gzip;q=0.001,identity;q=0', 'br'),
    ('br;q=0.5,br;q=0.5,gzip;q=0', 'br'),
    ('deflate;q=1,zstd;q=1,identity;q=0', None),
]
INVALID = ['br;q=.5', 'br;q=1.001', 'br;q=0.0000', 'br;q=-1', 'br;q=01',
           'br;q=1e0', 'br;quality=1', 'br;q=0;q=1', 'br;q=0,br;q=1',
           'br;q=1,BR;q=0', 'br gzip', 'br;q=NaN', 'br; q = 1',
           'br\x80', 'x' * 1025, ',' * 33]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    parser.add_argument('--port', type=int, default=5194)
    args = parser.parse_args()
    out = Path(args.output).resolve()
    allowed = (ROOT / 'docs/seo/svg-negotiation-review-2026-11-17').resolve()
    if out.parent != allowed or not re.fullmatch(r'local-http-[a-z0-9-]+[.]json', out.name) or out.exists() or not 1024 <= args.port <= 65535:
        raise ValueError('Fresh explicit owned output and unprivileged loopback port required')
    # An explicitly selected port lets local checks preserve existing previews.
    # Refuse an occupied port before creating any fixtures or starting PHP.
    with socket.socket() as reservation:
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            reservation.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        reservation.bind(('127.0.0.1', args.port))
    fixture = out.parent / (out.stem + '-fixture')
    if fixture.exists():
        raise ValueError('Preserve existing fixture/evidence')
    source_paths = ['tools/svg-negotiation-origin.php', 'tools/svg-negotiation-payload.py', 'tools/test-svg-negotiation-local.py'] + ['staging/wp-content/mu-plugins/ktk-homepage-assets/' + row[0] for row in svg.ORIGINALS.values()]
    hashes = {p: svg.sha((ROOT / p).read_bytes()) for p in source_paths}
    report = {'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'scope': __doc__, 'sourceHashes': hashes, 'loopbackPort': args.port, 'checks': [], 'requests': [], 'negativeControls': [], 'errors': []}
    def check(name, passed, detail=None):
        report['checks'].append({'name': name, 'pass': bool(passed), 'detail': detail})
        if not passed:
            raise AssertionError(name + ': ' + str(detail))
    process = None
    try:
        with socket.socket() as reservation:
            reservation.bind(('127.0.0.1', args.port))
        fixture.mkdir()
        token = 'd4' * 16
        epoch = int(time.time()) - 2
        for bad in [None, '', 'd4' * 15, 'D4' * 16, '../' + 'd4' * 16, 'd4' * 16 + '" or true']:
            for factory in [svg.cache_policy, lambda t: svg.payload(t, 'no-store', epoch)]:
                try:
                    factory(bad)
                except ValueError:
                    check('untrusted namespace cannot form a policy or payload', True)
                else:
                    check('untrusted namespace cannot form a policy or payload', False)
        for mode, timestamp in [('unknown', epoch), ('no-store', True), ('no-store', float(epoch)), ('public', -1), ('public', 2_100_000_001)]:
            try:
                svg.payload(token, mode, timestamp)
            except ValueError:
                check('ambiguous mode or epoch refuses before compression', True)
            else:
                check('ambiguous mode or epoch refuses before compression', False)
        fake = fixture / 'compiler-negative-inputs'
        template = (ROOT / 'tools/svg-negotiation-origin.php').read_bytes()
        (fake / 'tools').mkdir(parents=True)
        source = fake / 'staging/wp-content/mu-plugins/ktk-homepage-assets'
        source.mkdir(parents=True)
        for name, digest in svg.ORIGINALS.values():
            (source / name).write_bytes((ROOT / 'staging/wp-content/mu-plugins/ktk-homepage-assets' / name).read_bytes())
        try:
            svg.ROOT = fake
            for altered in [template.replace(svg.ANCHOR.encode(), b'partial compiled manifest'), template + svg.ANCHOR.encode()]:
                (fake / 'tools/svg-negotiation-origin.php').write_bytes(altered)
                try:
                    svg.payload(token, 'no-store', epoch)
                except ValueError:
                    check('partial/duplicate template refuses without a payload', True)
                else:
                    check('partial/duplicate template refuses without a payload', False)
            (fake / 'tools/svg-negotiation-origin.php').write_bytes(template)
            late = source / svg.ORIGINALS['seasonal'][0]
            original = late.read_bytes()
            late.write_bytes(original[:-1])
            try:
                svg.payload(token, 'no-store', epoch)
            except ValueError:
                check('late changed original refuses the complete payload', True)
            else:
                check('late changed original refuses the complete payload', False)
            late.write_bytes(original)
        finally:
            svg.ROOT = ROOT
        files, manifest = svg.payload(token, 'no-store', epoch)
        public_files, public_manifest = svg.payload('e5' * 16, 'public', epoch)
        expired_files, expired_manifest = svg.payload('f6' * 16, 'no-store', epoch - 3601)
        future_files, future_manifest = svg.payload('a7' * 16, 'no-store', epoch + 120)
        fixtures = [('normal', files), ('public', public_files), ('expired', expired_files), ('future', future_files)]
        for name, payload in fixtures:
            directory = fixture / name
            directory.mkdir()
            for filename, body in payload.items():
                (directory / filename).write_bytes(body)
            lint = subprocess.run(['php', '-l', str(directory / 'origin.php')], capture_output=True)
            check(name + ' compiled PHP syntax', lint.returncode == 0)
        router = fixture / 'router.php'
        router.write_text('''<?php
$routes = [''' + repr(token) + "=>'normal'," + repr('e5' * 16) + "=>'public'," + repr('f6' * 16) + "=>'expired'," + repr('a7' * 16) + '''=>'future'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('~^/staging/ktk-svg-encoding-probe-([a-f0-9]{32})/(?:(regular|seasonal|missing)\\.svg|origin\\.php)$~D', $path, $m) && isset($routes[$m[1]])) {
    if (isset($m[2])) { $_GET['asset'] = $m[2]; }
    // Negative control exists ONLY in this local router, never in the payload.
    if (isset($_SERVER['HTTP_X_KTK_LOCAL_OVERRIDE'])) { $_SERVER['HTTP_ACCEPT_ENCODING'] = 'br, gzip'; }
    require __DIR__ . '/' . $routes[$m[1]] . '/origin.php';
    return;
}
http_response_code(404); header('Cache-Control:no-store'); echo 'Local router not found';
''', encoding='utf-8')
        log = (fixture / 'php-server.log').open('xb')
        process = subprocess.Popen(['php', '-d', 'zlib.output_compression=0', '-d', 'display_errors=0', '-S', f'127.0.0.1:{args.port}', '-t', str(fixture), str(router)], stdout=log, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        deadline = time.monotonic() + 10
        while True:
            if process.poll() is not None:
                raise RuntimeError('Owned PHP server exited before ready')
            try:
                with socket.create_connection(('127.0.0.1', args.port), timeout=0.2):
                    break
            except OSError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(0.05)
        def get(stem, field, method='GET', extra=None, which='normal', target=None):
            selected = {'normal': manifest, 'public': public_manifest, 'expired': expired_manifest, 'future': future_manifest}[which]
            uri = '/staging/ktk-svg-encoding-probe-' + selected['token'] + '/' + (target or stem + '.svg')
            connection = http.client.HTTPConnection('127.0.0.1', args.port, timeout=10)
            connection.putrequest(method, uri, skip_accept_encoding=True)
            if field is not None:
                connection.putheader('Accept-Encoding', field)
            for k, v in (extra or {}).items():
                connection.putheader(k, v)
            connection.endheaders()
            response = connection.getresponse()
            body = response.read(1000001)
            headers = dict(response.getheaders())
            connection.close()
            row = {'stem': stem, 'target': uri, 'field': field, 'method': method, 'extra': extra, 'mode': which, 'status': response.status, 'bytes': len(body), 'sha256': svg.sha(body), 'headers': headers}
            report['requests'].append(row)
            check('bounded actual HTTP body', len(body) <= 1000000)
            check('exact owned nonce', headers.get('X-KTK-Encoding-Probe') == selected['token'])
            return row, body
        def validate(stem, field, coding, method='GET', which='normal'):
            row, body = get(stem, field, method, which=which)
            headers = row['headers']
            expected = svg.sha(b'absent\0' if field is None else b'present\0' + field.strip(' \t').encode('latin1'))
            check('origin sees exact HTTP field value after outer OWS parsing', headers.get('X-KTK-Accept-Encoding-SHA256') == expected and headers.get('X-KTK-Accept-Encoding-Present') == ('0' if field is None else '1'))
            check('response varies only on encoding and stays noindex', headers.get('Vary') == 'Accept-Encoding' and headers.get('X-Robots-Tag') == 'noindex, nofollow')
            if coding is None:
                check('no acceptable representation returns406', row['status'] == 406 and 'no-store' in headers.get('Cache-Control', '') and 'Content-Encoding' not in headers)
                return row
            entry = manifest['assets'][stem][coding]
            check('selected coding actual MIME length and strong validator', row['status'] == 200 and headers.get('Content-Type') == 'image/svg+xml' and headers.get('Content-Encoding', 'identity') == coding and headers.get('Content-Length') == str(entry['bytes']) and headers.get('ETag') == '"' + entry['sha256'] + '"')
            check('no-transform preserved and cache mode honored', 'no-transform' in headers['Cache-Control'] and ('public, max-age=' in headers['Cache-Control'] if which == 'public' else 'no-store' in headers['Cache-Control']))
            check('selected response uses bound exact bytes', (not body if method == 'HEAD' else body == files[entry['file']]))
            return row
        for stem in svg.ORIGINALS:
            for field, coding in CASES:
                validate(stem, field, coding)
            for field in INVALID:
                row, body = get(stem, field)
                check('malformed/ambiguous/bounded header rejected400', row['status'] == 400 and 'no-store' in row['headers']['Cache-Control'] and 'Content-Encoding' not in row['headers'])
            for coding in ['br', 'gzip', 'identity']:
                current = validate(stem, coding, coding)
                validate(stem, coding, coding, 'HEAD')
                etag = current['headers']['ETag']
                modified = current['headers']['Last-Modified']
                for method, condition in [('GET', {'If-None-Match': etag}), ('HEAD', {'If-None-Match': etag}), ('GET', {'If-None-Match': 'W/' + etag}), ('GET', {'If-None-Match': '"unrelated", ' + etag}), ('GET', {'If-None-Match': '*'}), ('GET', {'If-Modified-Since': modified})]:
                    row, body = get(stem, coding, method, condition)
                    check('same-representation conditional304 has no body', row['status'] == 304 and not body and row['headers'].get('ETag') == etag and row['headers'].get('Vary') == 'Accept-Encoding' and 'Content-Encoding' not in row['headers'])
                for obsolete in [datetime.datetime.fromtimestamp(epoch, datetime.timezone.utc).strftime('%A, %d-%b-%y %H:%M:%S GMT'), datetime.datetime.fromtimestamp(epoch, datetime.timezone.utc).strftime('%a %b %d %H:%M:%S %Y')]:
                    row, body = get(stem, coding, extra={'If-Modified-Since': obsolete})
                    check('advertised time accepts both obsolete HTTP-date formats', row['status'] == 304 and not body)
                row, body = get(stem, coding, extra={'If-Modified-Since': 'not-an-http-date'})
                check('invalid date is ignored with exact complete200', row['status'] == 200 and body == files[manifest['assets'][stem][coding]['file']])
                other = manifest['assets'][stem]['gzip' if coding != 'gzip' else 'br']['sha256']
                for condition in [{'If-None-Match': '"' + other + '"', 'If-Modified-Since': modified}, {'If-None-Match': '"other"', 'If-Modified-Since': modified}, {'If-None-Match': 'malformed', 'If-Modified-Since': modified}]:
                    row, body = get(stem, coding, extra=condition)
                    check('different validator and INM precedence return complete200', row['status'] == 200 and body == files[manifest['assets'][stem][coding]['file']])
                for condition in [{'If-Match': etag}, {'If-Match': '*'}, {'If-Match': etag, 'If-Unmodified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'}]:
                    row, body = get(stem, coding, extra=condition)
                    check('strong If-Match permits exact representation with precedence', row['status'] == 200 and body == files[manifest['assets'][stem][coding]['file']])
                for condition in [{'If-Match': 'W/' + etag}, {'If-Match': '"other"'}, {'If-Unmodified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'}]:
                    row, body = get(stem, coding, extra=condition)
                    check('failed precondition412 is not cacheable', row['status'] == 412 and 'no-store' in row['headers']['Cache-Control'])
            row, body = get(stem, 'br', 'POST')
            check('POST cannot cause work and advertises GET/HEAD', row['status'] == 405 and row['headers'].get('Allow') == 'GET, HEAD' and 'no-store' in row['headers']['Cache-Control'])
            row, body = get(stem, 'br', extra={'Range': 'bytes=0-15'})
            check('range deliberately ignored as full bounded200', row['status'] == 200 and row['headers'].get('Accept-Ranges') == 'none' and body == files[stem + '.br'])
            cached = validate(stem, 'br', 'br', which='public')
            row, body = get(stem, 'br', extra={'If-None-Match': cached['headers']['ETag']}, which='public')
            check('public-mode conditional retains its cache contract without body', row['status'] == 304 and not body and 'public, max-age=' in row['headers']['Cache-Control'] and 'no-transform' in row['headers']['Cache-Control'])
            row, body = get(stem, 'br', which='expired')
            check('compiled expiry cannot be rearmed by HTTP', row['status'] == 410 and 'no-store' in row['headers']['Cache-Control'])
            row, body = get(stem, 'br', which='expired', target=stem + '.svg?ktk_preview_epoch=1&asset=regular')
            check('HTTP query cannot override the actual compiled expiry', row['status'] == 410 and 'no-store' in row['headers']['Cache-Control'])
            row, body = get(stem, 'br', which='future')
            check('future compiled manifest refuses503', row['status'] == 503 and 'no-store' in row['headers']['Cache-Control'])
            row, body = get(stem, 'br;q=0,gzip;q=0,identity;q=0', extra={'If-None-Match': '*'})
            check('failed negotiation takes precedence over validators', row['status'] == 406 and 'no-store' in row['headers']['Cache-Control'])
            row, body = get(stem, 'br;q=0,gzip;q=0,identity;q=0', extra={'X-KTK-Local-Override': '1'})
            sent = svg.sha(b'present\0br;q=0,gzip;q=0,identity;q=0')
            rejected = row['status'] != 406 and row['headers']['X-KTK-Accept-Encoding-SHA256'] != sent
            check('modeled transport override is detected, never accepted', rejected)
            report['negativeControls'].append({'stem': stem, 'observedStatus': row['status'], 'actualHeaderDigestDiffers': True, 'strictVisitorExpectationRejected': True, 'notHistoricalCauseProof': True})
            selected = fixture / 'normal' / (stem + '.br')
            original = selected.read_bytes()
            selected.write_bytes(original[:-1])
            try:
                row, body = get(stem, 'br')
                check('changed known representation refuses503 without fallback', row['status'] == 503 and 'no-store' in row['headers']['Cache-Control'] and 'Content-Encoding' not in row['headers'])
            finally:
                selected.write_bytes(original)
            validate(stem, 'br', 'br')
        for target in ['missing.svg', 'origin.php', 'origin.php?asset=regular', 'origin.php?asset[]=regular', 'origin.php?asset=../regular']:
            row, body = get('regular', 'br', target=target)
            check('unknown/direct/array/path-escape alias cannot read a file', row['status'] == 404 and 'no-store' in row['headers']['Cache-Control'] and 'Content-Encoding' not in row['headers'])
        for name, payload in fixtures:
            directory = fixture / name
            check(name + ' retains exactly ten known fixture files', {p.name for p in directory.iterdir()} == set(svg.FILES))
            check(name + ' all known fixture bytes restored and unchanged', all((directory / filename).read_bytes() == body for filename, body in payload.items()))
        report['completed'] = True
        report['compiledManifest'] = manifest
        report['cachePolicyProposalNeverExecuted'] = svg.cache_policy(token)
        report['fixtureFilesRetained'] = str(fixture)
    except Exception as error:
        report['errors'].append(repr(error))
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill(); process.wait(timeout=10)
            log.close()
            report['ownedPHPProcessClosed'] = process.poll() is not None
        report['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        report['sourceStillExact'] = all(svg.sha((ROOT / p).read_bytes()) == h for p, h in hashes.items())
        out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    summary = {'passed': sum(c['pass'] for c in report['checks']), 'checks': len(report['checks']), 'requests': len(report['requests']), 'completed': report.get('completed', False), 'errors': report['errors'], 'sourceStillExact': report['sourceStillExact'], 'ownedPHPProcessClosed': report.get('ownedPHPProcessClosed')}
    print(json.dumps(summary, indent=2))
    return 0 if report.get('completed') and report['sourceStillExact'] and all(c['pass'] for c in report['checks']) else 1


if __name__ == '__main__':
    raise SystemExit(main())
