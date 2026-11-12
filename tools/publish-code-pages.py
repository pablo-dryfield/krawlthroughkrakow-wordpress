#!/usr/bin/env python3
"""Checksum-verified staging-only publisher for the How to Join pilot."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
import secrets
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / 'staging/wp-content/mu-plugins'
REMOTE = '/public_html/staging/wp-content/mu-plugins'
URL = 'https://krawlthroughkrakow.com/staging/about-us/how-to-join/'
RENDERER = 'ktk-code-pages.php'
ASSETS = 'ktk-code-pages-assets'


def load_publisher():
    spec = importlib.util.spec_from_file_location('ktk_homepage_publisher', ROOT / 'tools/publish-homepage-shortcode.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def remote_path(name):
    parts = name.split('/')
    if (name != RENDERER and not name.startswith(ASSETS + '/')) or any(part in ('', '.', '..') for part in parts) or '\\' in name:
        raise ValueError(f'Invalid staging page path: {name}')
    return REMOTE + '/' + name


def registry_data():
    result = subprocess.run(['php', '-r', "define('ABSPATH', __DIR__); echo json_encode(require $argv[1]);", str(LOCAL / ASSETS / 'registry.php')], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def validate_full_registry(registry):
    manifest = json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text(encoding='utf-8'))
    expected = {row['route'] for row in manifest['routes']}
    if not registry.get('complete') or set(registry.get('routes', {})) != expected or len(expected) != 116:
        raise RuntimeError('Complete 116-route registry required')
    for route in [*registry['routes'], *registry.get('redirects', {})]:
        if not route.startswith('/') or route.startswith('//') or route == '/' or route.rstrip('/').split('/')[1] in ('store', 'store2'):
            raise RuntimeError('Protected or invalid registry route: ' + route)
    return manifest


def local_payload(full=False):
    if full:
        validate_full_registry(registry_data())
    files = {RENDERER: (LOCAL / RENDERER).read_bytes()}
    for file in sorted((LOCAL / ASSETS).rglob('*')):
        if file.is_file():
            files[file.relative_to(LOCAL).as_posix()] = file.read_bytes()
    for name in files:
        remote_path(name)
    for required in ('how-to-join.php', 'how-to-join.css', 'runtime.js', 'runtime.css', 'integrations.php', 'font-resilience.css'):
        if f'{ASSETS}/{required}' not in files:
            raise RuntimeError(f'Missing dependency: {required}')
    if full:
        build = json.loads((ROOT / 'docs/code-pages/full-migration/build-report.json').read_text(encoding='utf-8'))
        evidence = json.loads((ROOT / 'docs/code-pages/full-migration/build-verification.json').read_text(encoding='utf-8'))
        if build['errors'] or build['missing'] or len(build['built']) != 116 or evidence['passed'] != evidence['total']:
            raise RuntimeError('Successful full build and verification required')
        if evidence.get('payloadChecksums') != {name: sha(content) for name, content in files.items()}:
            raise RuntimeError('Payload changed since build verification; rerun tools/verify-code-pages-build.mjs')
    return files


def probe_helper(token, manifest=None):
    expires = int(time.time()) + 900
    if manifest:
        ids = sorted({int(row['postId']) for row in manifest['routes'] if row.get('postId') and row['kind'] in ('page', 'blog post')} | {278})
        routes = [row['route'] for row in manifest['routes']]
        routes.extend(row['route'] for row in manifest['aliases'] if row['status'] != 'existing-homepage-canonical-alias')
        data = json.dumps({'ids': ids, 'routes': routes}, separators=(',', ':'))
        return f'''<?php
if (!defined('ABSPATH')) {{ exit; }}
add_action('wp_loaded', function () {{
    if (time() > {expires} || !isset($_GET['_ktk_pages_probe']) || !is_scalar($_GET['_ktk_pages_probe']) || !hash_equals('{token}', (string) $_GET['_ktk_pages_probe'])) {{ return; }}
    if (rtrim((string) parse_url(home_url('/'), PHP_URL_PATH), '/') !== '/staging') {{ status_header(403); exit; }}
    nocache_headers();
    $data = json_decode('{data}', true); $posts = array();
    foreach ($data['ids'] as $id) {{
        $post = get_post($id);
        $posts[$id] = $post ? array('type' => $post->post_type, 'status' => $post->post_status,
            'content_sha256' => hash('sha256', serialize($post)), 'permalink' => get_permalink($post)) : null;
    }}
    $options = array();
    foreach (array('show_on_front','page_on_front','page_for_posts','blog_public','template','stylesheet','et_divi','iubenda','wpcode_snippets','active_plugins','ecwid_store_id') as $name) {{ $options[$name] = hash('sha256', serialize(get_option($name))); }}
    $store = get_page_by_path('store', OBJECT, 'page');
    $owned = array();
    $root = __DIR__ . '/ktk-code-pages-assets/';
    if (is_dir($root)) {{
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {{
            if ($file->isFile() && !$file->isLink()) {{ $owned['ktk-code-pages-assets/' . substr($file->getPathname(), strlen($root))] = hash_file('sha256', $file->getPathname()); }}
        }}
    }}
    if (is_file(__DIR__ . '/ktk-code-pages.php')) {{ $owned['ktk-code-pages.php'] = hash_file('sha256', __DIR__ . '/ktk-code-pages.php'); }}
    $purged = false;
    if (isset($_GET['purge']) && $_GET['purge'] === '1' && function_exists('rocket_clean_files')) {{
        $urls = array_map(static function ($route) {{ return home_url($route); }}, $data['routes']);
        ob_start(); rocket_clean_files($urls); ob_end_clean(); $purged = true;
    }}
    wp_send_json(array('posts' => $posts, 'options_sha256' => $options, 'owned_checksums' => $owned,
        'ecwid_page_sha256' => $store ? hash('sha256', serialize($store)) : null, 'origin_cache_cleared' => $purged));
}}, 999);
'''.encode()
    return f'''<?php
if (!defined('ABSPATH')) {{ exit; }}
add_action('wp_loaded', function () {{
    if (time() > {expires} || !isset($_GET['_ktk_pages_probe']) || !hash_equals('{token}', (string) $_GET['_ktk_pages_probe'])) {{ return; }}
    if (rtrim((string) parse_url(home_url('/'), PHP_URL_PATH), '/') !== '/staging') {{ status_header(403); exit; }}
    nocache_headers();
    $page = get_page_by_path('about-us/how-to-join', OBJECT, 'page');
    if (!$page || $page->post_status !== 'publish') {{ wp_send_json(array('error' => 'existing_staging_page_required'), 409); }}
    $options = array();
    foreach (array('show_on_front', 'page_on_front', 'page_for_posts', 'blog_public', 'template', 'stylesheet', 'et_divi', 'iubenda', 'wpcode_snippets') as $name) {{
        $options[$name] = hash('sha256', serialize(get_option($name)));
    }}
    $purged = false;
    if (isset($_GET['purge']) && $_GET['purge'] === '1' && function_exists('rocket_clean_post')) {{
        ob_start(); rocket_clean_post($page->ID); ob_end_clean(); $purged = true;
    }}
    wp_send_json(array('page_id' => $page->ID, 'page_status' => $page->post_status,
        'page_content_sha256' => hash('sha256', $page->post_content), 'page_modified' => $page->post_modified_gmt,
        'permalink' => get_permalink($page), 'options_sha256' => $options, 'origin_cache_cleared' => $purged));
}}, 999);
'''.encode()


def sha(content):
    return hashlib.sha256(content).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true', help='Inspect local payload only; no network or deployment.')
    parser.add_argument('--full', action='store_true', help='Deploy complete audited non-Ecwid registry to staging only.')
    parser.add_argument('--preflight', action='store_true', help='Inspect staging identity/protected state, then remove the probe; no application payload upload.')
    parser.add_argument('--incremental', action='store_true', help='Full registry only: back up/upload changed files; independently hash all owned remote files with the staging probe.')
    parser.add_argument('--report', default='docs/code-pages/how-to-join/staging-publish.json')
    args = parser.parse_args()
    if args.incremental and not args.full:
        raise RuntimeError('--incremental requires --full')
    manifest = validate_full_registry(registry_data()) if args.full else None
    files = local_payload(args.full)
    report = {'started_at': datetime.now(timezone.utc).isoformat(), 'mode': 'local-dry-run' if args.dry_run else 'publish-staging-only',
              'url': URL, 'file_count': len(files), 'local_checksums': {name: sha(content) for name, content in files.items()}, 'phase': 'local-validated'}
    destination = ROOT / args.report
    destination.parent.mkdir(parents=True, exist_ok=True)
    if args.dry_run:
        destination.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({'phase': report['phase'], 'file_count': len(files), 'report': str(destination)}))
        return 0
    publisher = load_publisher()
    ftp = publisher.StagingFTP()
    token = secrets.token_hex(24)
    helper = 'ktk-pages-probe-' + secrets.token_hex(8) + '.php'
    helper_path = REMOTE + '/' + helper
    protected = ['ktk-homepage-shortcode.php', 'ktk-homepage-assets/hero.php', 'ktk-homepage-assets/parity.css', 'ktk-homepage-assets/parity.js',
                 'ktk-homepage-assets/integrations.php']
    try:
        # This helper is staging-only, expiring and removed in the finally block.
        publisher.replace_renderer_atomically(ftp, helper_path, probe_helper(token, manifest))
        endpoint = URL + '?' + urllib.parse.urlencode({'_ktk_pages_probe': token})
        before = publisher.http_json(endpoint)
        if before.get('error') or (not args.full and before.get('permalink') != URL):
            raise RuntimeError(f'Unexpected staging page state: {before}')
        report['before'] = before
        if args.full:
            mismatches = []
            for route in manifest['routes']:
                if not route.get('postId') or route['kind'] not in ('page', 'blog post'): continue
                post = before.get('posts', {}).get(str(route['postId']))
                if not post or post['status'] != 'publish' or post['permalink'] != 'https://krawlthroughkrakow.com/staging' + route['route']:
                    mismatches.append(route['route'])
            if mismatches:
                raise RuntimeError('Original staging post identity mismatch: ' + ', '.join(mismatches))
        if args.preflight:
            report['phase'] = 'staging-preflight-verified'
            return 0
        protected_before = {name: sha(publisher.retrieve_file(ftp, REMOTE + '/' + name) or b'') for name in protected}
        storefront_root = '/public_html/staging/wp-content/plugins/ktk-storefront/'
        storefront_before = {name: sha(publisher.retrieve_file(ftp, storefront_root + name) or b'') for name in publisher.store2.DEPLOY_FILES} if args.full else {}
        existing = {}
        if args.incremental:
            remote_hashes = before.get('owned_checksums', {})
            if not remote_hashes: raise RuntimeError('Remote owned SHA-256 manifest required')
            for name, content in files.items():
                if name in remote_hashes and (remote_hashes[name] != sha(content) or name == ASSETS + '/registry.php'):
                    existing[name] = publisher.retrieve_file(ftp, remote_path(name))
        else:
            for name, content in publisher.store2.read_tree(ftp, REMOTE + '/' + ASSETS).items():
                existing[ASSETS + '/' + name] = content
        previous_renderer = publisher.retrieve_file(ftp, remote_path(RENDERER))
        if previous_renderer is not None: existing[RENDERER] = previous_renderer
        stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
        backup = ROOT / 'deploy-backups' / f'ktk-code-pages-staging-{stamp}.zip'
        with zipfile.ZipFile(backup, 'w', zipfile.ZIP_DEFLATED) as archive:
            known_remote = before['owned_checksums'] if args.incremental else existing
            archive.writestr('release-manifest.json', json.dumps({'before': before, 'previous_renderer_present': RENDERER in existing,
                'remote_root': REMOTE, 'files': {name: sha(content) for name, content in existing.items()},
                'backup_type': 'changed-files-only' if args.incremental else 'complete-owned-payload',
                'new_files': [name for name in files if name not in known_remote]}, indent=2))
            for name, content in existing.items():
                archive.writestr(name, content)
        report.update(backup=str(backup), backup_sha256=sha(backup.read_bytes()), phase='backed-up')
        verified = {}
        for directory in sorted({remote_path(name).rsplit('/', 1)[0] for name in files}, key=lambda value: (value.count('/'), value)):
            publisher.store2.ensure_dir(ftp, directory)
        # The registry activates new routes only after every referenced dependency is verified.
        for name in sorted(files, key=lambda name: (2 if name == RENDERER else 1 if name == ASSETS + '/registry.php' else 0, name)):
            content = files[name]
            remote = remote_path(name)
            if args.incremental and before['owned_checksums'].get(name) == sha(content):
                verified[name] = sha(content)
                continue
            if existing.get(name) != content:
                if name.endswith('.php') or name in existing:
                    publisher.replace_renderer_atomically(ftp, remote, content)
                else:
                    ftp.storbinary('STOR ' + remote, io.BytesIO(content))
            actual = publisher.retrieve_file(ftp, remote)
            if actual is None or sha(actual) != sha(content):
                raise RuntimeError(f'Staging checksum mismatch: {name}')
            verified[name] = sha(actual)
            if len(verified) % 25 == 0:
                print(f'Verified {len(verified)}/{len(files)} staging page files...', file=sys.stderr)
        report['remote_checksums'] = verified
        report['phase'] = 'uploaded-and-verified'
        # A large media upload can exceed the original probe's short validity window.
        publisher.replace_renderer_atomically(ftp, helper_path, probe_helper(token, manifest))
        after = publisher.http_json(endpoint + '&purge=1')
        report['after'] = after
        report['wordpress_state_unchanged'] = {k: v for k, v in before.items() if k not in ('origin_cache_cleared', 'owned_checksums')} == {k: v for k, v in after.items() if k not in ('origin_cache_cleared', 'owned_checksums')}
        if args.incremental:
            report['all_remote_owned_checksums_match'] = all(after['owned_checksums'].get(name) == sha(content) for name, content in files.items())
            if not report['all_remote_owned_checksums_match']: raise RuntimeError('Final independent owned SHA-256 verification failed')
        protected_after = {name: sha(publisher.retrieve_file(ftp, REMOTE + '/' + name) or b'') for name in protected}
        report['homepage_unchanged'] = protected_before == protected_after
        storefront_after = {name: sha(publisher.retrieve_file(ftp, storefront_root + name) or b'') for name in publisher.store2.DEPLOY_FILES} if args.full else {}
        report['storefront_unchanged'] = storefront_before == storefront_after
        if not report['wordpress_state_unchanged'] or not report['homepage_unchanged'] or not report['storefront_unchanged']:
            raise RuntimeError('Unexpected WordPress/homepage mutation')
        request = urllib.request.Request(URL + '?ktk_release=' + stamp, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            html = response.read().decode('utf-8')
            checks = {'http_200': response.status == 200, 'code_renderer': 'ktk-code-page' in html,
                      'noindex': 'noindex, nofollow' in html, 'canonical': f'rel="canonical" href="{URL}"' in html,
                      'complete_content': all(text in html for text in ['HOW TO JOIN THE PUB CRAWL', 'RESERVE YOUR SPOT!', 'THE MEETING POINT', 'Contact us:']),
                      'owned_runtime': '/ktk-code-pages-assets/runtime.js?v=' in html}
        report['smoke_checks'] = checks
        if not all(checks.values()):
            raise RuntimeError(f'Staging smoke failed: {checks}')
        report['phase'] = 'complete'
        return 0
    except Exception as exc:
        report['error'] = str(exc)
        raise
    finally:
        try:
            ftp.delete(helper_path)
            report['helper_removed'] = publisher.retrieve_file(ftp, helper_path) is None
        finally:
            ftp.close()
            report['finished_at'] = datetime.now(timezone.utc).isoformat()
            destination.write_text(json.dumps(report, indent=2), encoding='utf-8')
            print(json.dumps({k: report.get(k) for k in ('phase', 'file_count', 'backup', 'wordpress_state_unchanged', 'homepage_unchanged', 'helper_removed', 'error')}))


if __name__ == '__main__':
    raise SystemExit(main())
