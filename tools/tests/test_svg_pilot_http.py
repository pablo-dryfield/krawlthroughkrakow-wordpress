"""Faulted modeled HTTP responses are not hosting/cache acceptance."""
import copy
import datetime
import gzip
import importlib.util
import time
import unittest
from http.client import HTTPConnection
import os
import socket
import subprocess
import tempfile
from email.message import Message
from pathlib import Path
from unittest.mock import patch


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), Path(__file__).resolve().parents[1] / (name + '.py'))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


core, http = load('svg-pilot-core'), load('svg-pilot-http')
NOW = int(time.time()) - 1
PLAN, FILES = core.make_plan('bc' * 16, 'no-store', NOW, '1' * 40, '2' * 40, {'tools/svg-pilot-http.py': core.sha(Path(http.__file__).read_bytes())})


class Transport:
    def __init__(self, plan=PLAN, files=FILES):
        self.plan, self.files, self.calls, self.counts = plan, files, [], {}
        self.change = lambda response: None
        self.always_miss = False

    def __call__(self, url, method, headers):
        self.calls.append((url, method, dict(headers)))
        field = headers.get('Accept-Encoding')
        pairs = dict(http.CASES)
        coding = pairs[field]
        stem = url.rsplit('/', 1)[1].split('.')[0]
        fields = Message()
        fields['X-KTK-Encoding-Probe'] = self.plan['token']
        fields['X-KTK-Accept-Encoding-Present'] = '0' if field is None else '1'
        fields['X-KTK-Accept-Encoding-SHA256'] = core.sha(b'absent\0' if field is None else b'present\0' + field.strip(' \t').encode())
        fields['Vary'] = 'Accept-Encoding'; fields['Vary'] = 'Accept-Encoding'
        fields['X-Robots-Tag'] = 'noindex, nofollow'
        fields['Cache-Control'] = ('public, max-age=60, no-transform' if self.plan['mode'] == 'public' and coding else 'no-store, max-age=0, no-transform')
        key = (stem, field); self.counts[key] = self.counts.get(key, 0) + 1
        fields['CF-Cache-Status'] = 'DYNAMIC' if self.plan['mode'] == 'no-store' or coding is None else ('MISS' if self.counts[key] < 2 or self.always_miss else 'HIT')
        status, body = 406, b'No acceptable representation\n'
        if coding:
            entry = self.plan['manifest']['assets'][stem][coding]
            fields['ETag'] = '"' + entry['sha256'] + '"'
            fields['Last-Modified'] = datetime.datetime.fromtimestamp(self.plan['createdAt'], datetime.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')
            fields['Content-Type'] = 'image/svg+xml'
            status = 304 if headers.get('If-None-Match') == fields['ETag'] else 200
            body = self.files[entry['file']]
            if status != 304:
                fields['Content-Length'] = str(len(body))
                if coding != 'identity': fields['Content-Encoding'] = coding
        if status == 304 or method == 'HEAD': body = b''
        response = {'url': url, 'status': status, 'headers': fields, 'body': body}
        self.change(response)
        return response


class ObserverTests(unittest.TestCase):
    def test_empty_field_omission_is_reported_and_only_identity_remains_acceptable(self):
        def omitted(response):
            fields = response['headers']
            fields.replace_header('X-KTK-Accept-Encoding-Present', '0')
            fields.replace_header('X-KTK-Accept-Encoding-SHA256', core.sha(b'absent\0'))
        send = Transport(); send.change = omitted
        row = http.observe(PLAN, 'regular', '', 'identity', send=send)
        self.assertFalse(row['originFieldExact'])
        self.assertTrue(row['emptyEncodingFieldOmittedByTransport'])
        self.assertTrue(row['originalExact'])
        # An omitted nonempty field, compressed empty response, wrong digest,
        # wrong identity body or wrong validator never receives this exception.
        with self.assertRaises(ValueError): http.observe(PLAN, 'regular', 'br', 'br', send=send)
        for fault in [lambda v: v['headers'].__setitem__('Content-Encoding', 'br'), lambda v: v['headers'].replace_header('X-KTK-Accept-Encoding-SHA256', '0' * 64), lambda v: v.update(body=b'changed'), lambda v: v['headers'].replace_header('ETag', '"wrong"')]:
            send = Transport()
            def changed(response, fault=fault): omitted(response); fault(response)
            send.change = changed
            with self.assertRaises(ValueError): http.observe(PLAN, 'regular', '', 'identity', send=send)

    def test_complete_no_store_matrix_preserves_absent_empty_and_quality(self):
        send = Transport(); report = http.matrix(PLAN, send, wait=lambda _: self.fail('no waiting needed'))
        self.assertEqual(report['requests'], 38)
        self.assertEqual(len(send.calls), 38)
        self.assertNotIn('Accept-Encoding', send.calls[0][2]); self.assertEqual(send.calls[1][2]['Accept-Encoding'], '')
        self.assertEqual(sum(r.get('originalExact', False) for r in report['rows']), 24)
        self.assertEqual(sum(r['status'] == 304 for r in report['rows']), 6)
        self.assertFalse(report['warmedVariants'])

    def test_public_matrix_records_actual_modeled_cold_and_warm_variants(self):
        plan, files = core.make_plan('bd' * 16, 'public', NOW, '1' * 40, '2' * 40, PLAN['sourceHashes'])
        send = Transport(plan, files); rows = []
        report = http.matrix(plan, send, record=rows.append, wait=lambda _: None)
        self.assertEqual(report['requests'], 44); self.assertEqual(len(rows), 44)
        self.assertEqual(len(report['coldVariants']), 6); self.assertEqual(len(report['warmedVariants']), 6)
        send = Transport(plan, files); send.always_miss = True; rows = []
        with self.assertRaisesRegex(ValueError, 'HIT'):
            http.matrix(plan, send, record=rows.append, wait=lambda _: None)
        self.assertEqual([r['cacheStatus'] for r in rows[-3:]], ['MISS'] * 3)

    def test_transformed_codings_wire_bytes_metadata_and_redirects_are_rejected(self):
        mutations = [lambda r: r.update(url=r['url'] + '?redirected'), lambda r: r.update(status=302), lambda r: r.update(body=r['body'] + b'x')]
        for key, value in [('X-KTK-Encoding-Probe', 'unknown'), ('X-KTK-Accept-Encoding-SHA256', '0' * 64), ('X-KTK-Accept-Encoding-Present', '0'), ('Content-Encoding', 'gzip'), ('ETag', 'W/"weak"'), ('Last-Modified', 'wrong'), ('Content-Length', '1'), ('Vary', 'Cookie'), ('Cache-Control', 'no-store, max-age=0'), ('CF-Cache-Status', 'HIT')]:
            def mutate(response, k=key, v=value):
                del response['headers'][k]; response['headers'][k] = v
            mutations.append(mutate)
        for mutate in mutations:
            send = Transport(); send.change = mutate
            with self.subTest(mutate=mutate), self.assertRaises(ValueError): http.observe(PLAN, 'regular', 'br', 'br', send=send)

    def test_ambiguous_validators_oversized_body_and_cached_error_are_rejected(self):
        for mutate in [lambda r: r['headers'].__setitem__('ETag', '"another"'), lambda r: r.update(body=b'x' * (http.MAX_BODY + 1))]:
            send = Transport(); send.change = mutate
            with self.assertRaises(ValueError): http.observe(PLAN, 'regular', 'br', 'br', send=send)
        send = Transport()
        def cached(response):
            del response['headers']['CF-Cache-Status']; response['headers']['CF-Cache-Status'] = 'HIT'
        send.change = cached
        with self.assertRaisesRegex(ValueError, '406'): http.observe(PLAN, 'regular', http.CASES[5][0], None, send=send)

    def test_wrong_cross_validator_or_same_validator_status_cannot_pass_matrix(self):
        for status in [200, 304]:
            send = Transport()
            send.change = lambda r: r.update(status=status) if any(k.startswith('If-') for k in send.calls[-1][2]) else None
            with self.subTest(status=status), self.assertRaises(ValueError): http.matrix(PLAN, send)

    def test_decoding_is_bounded_and_gzip_rejects_trailing_or_concatenated_streams(self):
        for body in [gzip.compress(b'x' * (http.MAX_BODY + 1)), gzip.compress(b'a') + gzip.compress(b'b'), gzip.compress(b'a') + b'x', b'invalid']:
            with self.assertRaises(ValueError): http.decoded(body, 'gzip')
        self.assertEqual(http.decoded(gzip.compress(b'exact'), 'gzip'), b'exact')
        with self.assertRaises(ValueError): http.decoded(b'anything', 'deflate')

    def test_network_boundary_refuses_foreign_path_method_credentials_and_redirect_inputs(self):
        url = 'https://krawlthroughkrakow.com/staging/ktk-svg-encoding-probe-' + PLAN['token'] + '/regular.svg'
        with patch.object(http.http.client, 'HTTPSConnection', side_effect=AssertionError('must not connect')):
            for bad in [url + '?x=1', url + '#x', url.replace('https:', 'http:'), url.replace('regular.svg', 'origin.php'), url.replace('krawlthroughkrakow.com', 'other.example'), url.replace('/staging/', '/production/')]:
                with self.assertRaises(ValueError): http.request(bad, 'GET', {})
            for headers in [{'Cookie': 'x'}, {'Authorization': 'x'}, {'Accept-Encoding': 'br\r\nx: y'}]:
                with self.assertRaises(ValueError): http.request(url, 'GET', headers)
            with self.assertRaises(ValueError): http.request(url, 'POST', {})

    def test_observer_checks_38_actual_loopback_php_responses_with_qualified_edge_metadata(self):
        # Only the CF status is modeled. Actual PHP wire bytes/validators/header
        # digests are checked; this does not emulate LiteSpeed or Cloudflare.
        with tempfile.TemporaryDirectory(prefix='ktk-svg-observer-loopback-') as name:
            directory = Path(name)
            for filename, body in FILES.items(): (directory / filename).write_bytes(body)
            (directory / 'router.php').write_text("<?php $p=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH); if(preg_match('~/((?:regular|seasonal))[.]svg$~D',$p,$m)){$_GET['asset']=$m[1];require __DIR__.'/origin.php';return;}http_response_code(404);", encoding='utf-8')
            with socket.socket() as reserved:
                reserved.bind(('127.0.0.1', 0)); port = reserved.getsockname()[1]
            with (directory / 'server.log').open('xb') as log:
                process = subprocess.Popen(['php', '-d', 'zlib.output_compression=0', '-d', 'display_errors=0', '-S', '127.0.0.1:' + str(port), '-t', str(directory), str(directory / 'router.php')], stdout=log, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
                try:
                    deadline = time.monotonic() + 10
                    while True:
                        if process.poll() is not None: self.fail('Owned PHP exited before ready')
                        try:
                            with socket.create_connection(('127.0.0.1', port), timeout=0.2): break
                        except OSError:
                            if time.monotonic() >= deadline: raise
                            time.sleep(0.05)
                    def send(url, method, headers):
                        connection = HTTPConnection('127.0.0.1', port, timeout=10)
                        try:
                            connection.putrequest(method, url.split('.com', 1)[1], skip_accept_encoding=True)
                            for key, value in headers.items(): connection.putheader(key, value)
                            connection.endheaders(); response = connection.getresponse(); fields = Message()
                            for key, value in response.getheaders(): fields[key] = value
                            fields['CF-Cache-Status'] = 'DYNAMIC'
                            return {'url': url, 'status': response.status, 'headers': fields, 'body': response.read(http.MAX_BODY + 1)}
                        finally: connection.close()
                    result = http.matrix(PLAN, send=send)
                    self.assertEqual(result['requests'], 38); self.assertTrue(result['allStrictHTTPChecksPassed'])
                finally:
                    if process.poll() is None: process.terminate()
                    try: process.wait(timeout=10)
                    except subprocess.TimeoutExpired: process.kill(); process.wait(timeout=5)
                self.assertIsNotNone(process.poll())


if __name__ == '__main__': unittest.main()
