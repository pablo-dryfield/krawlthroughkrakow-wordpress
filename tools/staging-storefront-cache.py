"""One authenticated, expiring native WP Rocket purge of the staging storefront."""
import ftplib
import json
import re
import secrets
import time
import urllib.request

ORIGIN = 'https://krawlthroughkrakow.com/staging/'
URL = ORIGIN + 'store2/'
MU = '/public_html/staging/wp-content/mu-plugins'
TARGET = '/public_html/staging/wp-content/cache/wp-rocket/krawlthroughkrakow.com/staging/store2'


def helper_source(token, issued, expires):
    if not re.fullmatch(r'[a-f0-9]{64}', token) or type(issued) is not int or type(expires) is not int or not 0 < expires - issued <= 600:
        raise ValueError('Bounded token and ten-minute maximum lifetime required')
    source = r'''<?php
if (!defined('ABSPATH')) { exit; }
add_action('wp_loaded', function () {
    if (!isset($_GET['_ktk_storefront_cache']) || !is_string($_GET['_ktk_storefront_cache']) || $_GET['_ktk_storefront_cache'] !== '1') { return; }
    nocache_headers();
    header('X-Robots-Tag: noindex, nofollow');
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET' || !is_string($_SERVER['HTTP_X_KTK_CACHE_TOKEN'] ?? null)
        || !hash_equals('TOKEN_VALUE', $_SERVER['HTTP_X_KTK_CACHE_TOKEN'])) {
        wp_send_json(array('error' => 'unauthorized'), 403);
    }
    if (time() < ISSUED_VALUE - 60 || time() > EXPIRES_VALUE) { wp_send_json(array('error' => 'expired'), 410); }
    $actual = realpath(ABSPATH);
    $expected = realpath(dirname(__DIR__, 2));
    if ($actual === false || $expected === false || $actual !== $expected || basename($actual) !== 'staging'
        || home_url('/') !== 'https://krawlthroughkrakow.com/staging/' || site_url('/') !== 'https://krawlthroughkrakow.com/staging/'
        || parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) !== '/staging/') {
        wp_send_json(array('error' => 'exact_staging_identity_required'), 403);
    }
    if (!function_exists('rocket_clean_files')) { wp_send_json(array('error' => 'native_cache_api_unavailable'), 503); }
    if (function_exists('set_time_limit')) { @set_time_limit(30); }
    $buffer_level = ob_get_level();
    ob_start();
    try {
        rocket_clean_files(array('https://krawlthroughkrakow.com/staging/store2/'));
    } catch (Throwable $error) {
        while (ob_get_level() > $buffer_level) { ob_end_clean(); }
        wp_send_json(array('error' => 'native_cache_purge_failed'), 500);
    }
    while (ob_get_level() > $buffer_level) { ob_end_clean(); }
    wp_send_json(array('staging' => true, 'method' => 'rocket_clean_files', 'native_call_completed' => true,
        'urls' => array('https://krawlthroughkrakow.com/staging/store2/'),
        'cache_targets' => array('/public_html/staging/wp-content/cache/wp-rocket/krawlthroughkrakow.com/staging/store2')), 200);
}, 999);
'''
    return source.replace('TOKEN_VALUE', token).replace('ISSUED_VALUE', str(issued)).replace('EXPIRES_VALUE', str(expires)).encode()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, newurl):
        raise RuntimeError('Staging cache requests must never redirect')


def purge(ftp, atomic_upload):
    token = secrets.token_hex(32)
    now = int(time.time())
    name = 'ktk-storefront-origin-cache-' + secrets.token_hex(8) + '.php'
    remote = MU + '/' + name
    result = None
    try:
        atomic_upload(ftp, remote, helper_source(token, now, now + 600))
        request = urllib.request.Request(ORIGIN + '?_ktk_storefront_cache=1&ktk_cache_probe=' + secrets.token_hex(8), headers={
            'X-KTK-Cache-Token': token, 'Cache-Control': 'no-cache', 'User-Agent': 'KTK staging-only native cache purge/1.0'})
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=45) as response:
            body = response.read(4097)
            if response.status != 200 or len(body) > 4096:
                raise RuntimeError('Bounded native cache response required')
        result = json.loads(body)
        if result != {'staging': True, 'method': 'rocket_clean_files', 'native_call_completed': True, 'urls': [URL], 'cache_targets': [TARGET]}:
            raise RuntimeError('Unexpected native cache result or scope')
    finally:
        try:
            ftp.delete(remote)
        except ftplib.error_perm:
            pass
        if any(entry == name for entry, _ in ftp.mlsd(MU)):
            raise RuntimeError('Temporary staging cache helper remains; do not repeat the operation')
    result['helper_removed'] = True
    result['request_count'] = 1
    return result
