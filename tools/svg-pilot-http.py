"""Bounded GET/HEAD observer for exactly two owned staging SVG aliases.

No redirects, cookies, authorization headers, website scripts or form requests.
An injected transport is a qualified local test seam, never hosting evidence.
"""
from __future__ import annotations

import datetime
import hashlib
import http.client
import json
import re
import ssl
import subprocess
import time
import urllib.parse
import zlib
from email.message import Message

MAX_BODY = 1000000


def sha(body):
    return hashlib.sha256(body).hexdigest()


def request(url: str, method: str, headers: dict) -> dict:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.netloc != 'krawlthroughkrakow.com' or parsed.query or parsed.fragment or not re.fullmatch('/staging/ktk-svg-encoding-probe-[a-f0-9]{32}/(?:regular|seasonal)[.]svg', parsed.path) or method not in ('GET', 'HEAD'):
        raise ValueError('Only the two exact clean staging nonce URLs may be read')
    allowed = {'Accept-Encoding', 'If-None-Match', 'If-Modified-Since', 'If-Match', 'If-Unmodified-Since', 'Range'}
    if set(headers) - allowed or any(not isinstance(v, str) or len(v) > 2048 or '\r' in v or '\n' in v for v in headers.values()):
        raise ValueError('Only bounded encoding/conditional headers are permitted')
    connection = http.client.HTTPSConnection('krawlthroughkrakow.com', timeout=45, context=ssl.create_default_context())
    try:
        connection.putrequest(method, parsed.path, skip_accept_encoding=True)
        connection.putheader('User-Agent', 'KTK isolated original SVG pilot/1.0')
        for name, value in headers.items():
            connection.putheader(name, value)
        connection.endheaders()
        response = connection.getresponse()
        body = response.read(MAX_BODY + 1)
        if len(body) > MAX_BODY:
            raise ValueError('Oversized raw response')
        fields = Message()
        for name, value in response.getheaders():
            fields[name] = value
        return {'url': url, 'status': response.status, 'headers': fields, 'body': body}
    finally:
        connection.close()


def decoded(body: bytes, coding: str) -> bytes:
    if len(body) > MAX_BODY:
        raise ValueError('Oversized encoded response')
    if coding == 'identity':
        return body
    if coding == 'gzip':
        decoder = zlib.decompressobj(16 + zlib.MAX_WBITS)
        try:
            value = decoder.decompress(body, MAX_BODY + 1)
        except zlib.error as error:
            raise ValueError('Invalid gzip response') from error
        if len(value) > MAX_BODY or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
            raise ValueError('Invalid, concatenated or oversized gzip response')
        return value
    if coding == 'br':
        code = "const z=require('node:zlib');process.stdout.write(z.brotliDecompressSync(require('node:fs').readFileSync(0),{maxOutputLength:1000000}));"
        run = subprocess.run(['node', '-e', code], input=body, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
        if run.returncode or len(run.stdout) > MAX_BODY:
            raise ValueError('Invalid or oversized Brotli response')
        return run.stdout
    raise ValueError('Unsupported response coding')


def header_tokens(fields, name: str) -> list[str]:
    values = fields.get_all(name, [])
    return [part.strip().lower() for value in values for part in value.split(',') if part.strip()]


def observe(plan: dict, stem: str, field: str | None, coding: str | None, method='GET', condition=None, send=request) -> dict:
    if not re.fullmatch('[a-f0-9]{32}', plan.get('token', '')) or stem not in ('regular', 'seasonal') or method not in ('GET', 'HEAD'):
        raise ValueError('Closed nonce asset and GET/HEAD required')
    url = 'https://krawlthroughkrakow.com/staging/ktk-svg-encoding-probe-' + plan['token'] + '/' + stem + '.svg'
    headers = {} if field is None else {'Accept-Encoding': field}
    headers.update(condition or {})
    response = send(url, method, headers)
    body, fields, status = response['body'], response['headers'], response['status']
    if response['url'] != url or not isinstance(body, bytes) or len(body) > MAX_BODY:
        raise ValueError('Redirected, invalid or oversized response')
    for name in ['Content-Encoding', 'Content-Type', 'Content-Length', 'ETag', 'Last-Modified', 'CF-Cache-Status', 'Age', 'X-KTK-Encoding-Probe', 'X-KTK-Accept-Encoding-SHA256', 'X-KTK-Accept-Encoding-Present']:
        if len(fields.get_all(name, [])) > 1:
            raise ValueError('Ambiguous response field: ' + name)
    actual = fields.get('Content-Encoding', 'identity').lower()
    expected_field = sha(b'absent\0' if field is None else b'present\0' + field.strip(' \t').encode('ascii'))
    field_exact = fields.get('X-KTK-Accept-Encoding-SHA256') == expected_field and fields.get('X-KTK-Accept-Encoding-Present') == ('0' if field is None else '1')
    # The real edge can omit an empty field. Absence and empty remain distinct
    # in evidence. This narrow case is acceptable only with identity selected;
    # the complete identity wire, validator and decoded-body checks still run.
    empty_omitted = field == '' and coding == 'identity' and actual == 'identity' and fields.get('X-KTK-Accept-Encoding-Present') == '0' and fields.get('X-KTK-Accept-Encoding-SHA256') == sha(b'absent\0')
    if fields.get('X-KTK-Encoding-Probe') != plan['token'] or not (field_exact or empty_omitted):
        raise ValueError('Origin nonce or original encoding field does not match')
    if set(header_tokens(fields, 'Vary')) != {'accept-encoding'} or not {'noindex', 'nofollow'}.issubset(header_tokens(fields, 'X-Robots-Tag')):
        raise ValueError('Vary/noindex metadata is incomplete')
    cache = header_tokens(fields, 'Cache-Control')
    if 'no-transform' not in cache:
        raise ValueError('Origin no-transform boundary missing')
    row = {'url': url, 'method': method, 'field': field, 'condition': condition, 'status': status, 'encodedBytes': len(body), 'encodedSHA256': sha(body), 'coding': actual, 'cacheStatus': fields.get('CF-Cache-Status'), 'age': fields.get('Age'), 'vary': fields.get_all('Vary', []), 'cacheControl': fields.get_all('Cache-Control', []), 'etag': fields.get('ETag'), 'lastModified': fields.get('Last-Modified'), 'originFieldExact': field_exact, 'emptyEncodingFieldOmittedByTransport': empty_omitted, 'nonceExact': True}
    if coding is None:
        expected = b'No acceptable representation\n'
        if status != 406 or actual != 'identity' or 'no-store' not in cache or 'max-age=0' not in cache or row['cacheStatus'] not in ('BYPASS', 'DYNAMIC', 'MISS') or row['etag'] is not None or row['lastModified'] is not None or body != (b'' if method == 'HEAD' else expected):
            raise ValueError('All excluded codings must return an uncached406')
        return row
    entry = plan['manifest']['assets'][stem][coding]
    etag = '"' + entry['sha256'] + '"'
    modified = datetime.datetime.fromtimestamp(plan['createdAt'], datetime.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')
    if row['etag'] != etag or row['lastModified'] != modified:
        raise ValueError('Representation-specific validator or bound modification time changed')
    if plan['mode'] == 'no-store':
        if 'no-store' not in cache or 'max-age=0' not in cache or row['cacheStatus'] not in ('BYPASS', 'DYNAMIC', 'MISS'):
            raise ValueError('No-store contract or observed edge behavior changed')
    else:
        ages = [int(t.split('=', 1)[1]) for t in cache if re.fullmatch('max-age=[0-9]+', t)]
        if 'public' not in cache or 'no-store' in cache or len(ages) != 1 or not 1 <= ages[0] <= 60:
            raise ValueError('Public cache TTL contract changed')
    if status == 304:
        if not condition or body or actual != 'identity':
            raise ValueError('Invalid conditional304 body/coding')
        row['conditionalBodyless'] = True
        return row
    if status != 200 or fields.get('Content-Type', '').split(';')[0].strip().lower() != 'image/svg+xml' or actual != coding:
        raise ValueError('Status, MIME or selected representation is wrong')
    length = fields.get_all('Content-Length', [])
    if length and (len(length) != 1 or length[0] != str(entry['bytes'])):
        raise ValueError('Advertised representation length is wrong')
    if method == 'HEAD':
        if body:
            raise ValueError('HEAD unexpectedly contains a body')
        row['headBodyless'] = True
        return row
    if len(body) != entry['bytes'] or sha(body) != entry['sha256']:
        raise ValueError('Wire bytes differ from the bound prebuilt representation')
    original = decoded(body, actual)
    if len(original) != plan['manifest']['assets'][stem]['identity']['bytes'] or sha(original) != entry['originalSHA256']:
        raise ValueError('Decoded original artwork differs')
    row.update({'decodedBytes': len(original), 'decodedSHA256': sha(original), 'originalExact': True})
    return row


CASES = [(None, 'identity'), ('', 'identity'), ('br', 'br'), ('gzip', 'gzip'), ('identity', 'identity'), ('br;q=0,gzip;q=0,identity;q=0', None), ('br;q=0.1,gzip;q=1,identity;q=0', 'gzip'), ('br;q=1,gzip;q=0.1,identity;q=0', 'br'), ('*;q=0,identity;q=1', 'identity'), ('br;q=0,*;q=0.3', 'gzip')]


def matrix(plan: dict, send=request, record=lambda row: None, wait=time.sleep) -> dict:
    rows, cached, cold = [], [], []
    for stem in ['regular', 'seasonal']:
        for field, coding in CASES:
            row = observe(plan, stem, field, coding, send=send)
            rows.append(row); record(row)
            if plan['mode'] == 'public' and field in ('br', 'gzip', 'identity'):
                if row['cacheStatus'] != 'MISS':
                    raise ValueError('Fresh public representation cold MISS not established')
                cold.append({'stem': stem, 'coding': coding, 'cacheStatus': row['cacheStatus']})
        for coding in ['br', 'gzip', 'identity']:
            row = observe(plan, stem, coding, coding, method='HEAD', send=send)
            rows.append(row); record(row)
            tag = '"' + plan['manifest']['assets'][stem][coding]['sha256'] + '"'
            conditional = observe(plan, stem, coding, coding, condition={'If-None-Match': tag}, send=send)
            if conditional['status'] != 304:
                raise ValueError('Same-representation conditional must return304')
            rows.append(conditional); record(conditional)
            other = 'gzip' if coding != 'gzip' else 'br'
            cross = observe(plan, stem, coding, coding, condition={'If-None-Match': '"' + plan['manifest']['assets'][stem][other]['sha256'] + '"'}, send=send)
            if cross['status'] != 200:
                raise ValueError('Another representation must not share a strong validator')
            rows.append(cross); record(cross)
        if plan['mode'] == 'public':
            # Keep every observed miss; bounded read-only repeats do not hide it.
            for coding in ['br', 'gzip', 'identity']:
                attempts = []
                for attempt in range(3):
                    row = observe(plan, stem, coding, coding, send=send)
                    rows.append(row); record(row); attempts.append(row['cacheStatus'])
                    if row['cacheStatus'] == 'HIT':
                        break
                    if attempt < 2:
                        wait(1)
                if attempts[-1] != 'HIT':
                    raise ValueError('Warmed representation HIT not established')
                cached.append({'stem': stem, 'coding': coding, 'observedStatuses': attempts, 'hitEstablished': True})
    return {'allStrictHTTPChecksPassed': True, 'requests': len(rows), 'rows': rows, 'coldVariants': cold, 'warmedVariants': cached, 'scope': 'Actual supplied transport only. Local injected transport is not LiteSpeed/Cloudflare/cache or speed acceptance.'}
