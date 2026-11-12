"""Promote the approved content release, preserving WordPress data and both stores."""
import argparse
import base64
import hashlib
import importlib.util
import io
import json
import secrets
import sys
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REMOTE = '/public_html/wp-content/mu-plugins'
ACTIVATION = 'ktk-code-pages-production.php'
ACTIVATION_SOURCE = b"<?php\n/** Plugin Name: KTK Production Content Activation */\nif (!defined('ABSPATH')) { exit; }\nif (!defined('KTK_CODE_PAGES_PRODUCTION_ENABLED')) { define('KTK_CODE_PAGES_PRODUCTION_ENABLED', true); }\n"
URL = 'https://krawlthroughkrakow.com/'


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


pages = load('ktk_pages_promotion_source', 'publish-code-pages.py')
home = load('ktk_pages_homepage_promotion', 'promote-homepage-production.py')
common = home.homepage


def sha(value):
    return hashlib.sha256(value).hexdigest()


def production_path(name):
    if name != ACTIVATION:
        pages.remote_path(name)
    return REMOTE + '/' + name


def report_data(relative):
    return json.loads((ROOT / relative).read_text(encoding='utf-8'))


def approved_payload():
    files = pages.local_payload(full=True)
    expected = {name: sha(value) for name, value in files.items()}
    publish = report_data('docs/code-pages/production-readiness/staging-pages-publish.json')
    if publish.get('phase') != 'complete' or not publish.get('all_remote_owned_checksums_match') or publish['local_checksums'] != expected:
        raise RuntimeError('Local payload must equal the checksum-verified staging release')
    for name in ('readiness-staging-release', 'readiness-staging-clean-cache', 'readiness-staging-cache-hit'):
        evidence = report_data('docs/code-pages/full-migration/' + name + '.json')
        if evidence['summary']['passed'] != 5500 or evidence['summary']['total'] != 5500 or evidence['summary']['routes'] != 116 or evidence['summary']['assets'] != 119:
            raise RuntimeError('Complete successful staging evidence required: ' + name)
        if datetime.fromisoformat(evidence['checkedAt']) <= datetime.fromisoformat(publish['finished_at']):
            raise RuntimeError('Staging evidence predates the verified release')
        if name.endswith('cache-hit') and (len(evidence['responses']) != 348 or any(row['cfCacheStatus'] != 'HIT' for row in evidence['responses'])):
            raise RuntimeError('All staging device caches must be verified')
    seo = report_data('docs/code-pages/production-readiness/production-seo-baseline.json')
    if seo['errors'] or len(seo['routes']) != 116 or (datetime.now(timezone.utc) - datetime.fromisoformat(seo['checkedAt'])).total_seconds() > 86400:
        raise RuntimeError('A complete production SEO baseline less than 24 hours old is required')
    return files


def snapshot_helper(token, manifest, purge=False):
    ids = sorted({int(row['postId']) for row in manifest['routes'] if row.get('postId') and row['kind'] in ('page', 'blog post')})
    terms = sorted({int(row['termId']) for row in manifest['routes'] if row.get('termId')})
    routes = [row['route'] for row in manifest['routes']] + [row['route'] for row in manifest['aliases'] if row['status'] != 'existing-homepage-canonical-alias']
    data = json.dumps({'ids': ids, 'terms': terms, 'routes': routes}, separators=(',', ':'))
    expires = int(time.time()) + 900
    return f'''<?php
if (!defined('ABSPATH')) {{ exit; }}
add_action('wp_loaded', function () {{
    if (time() > {expires} || !isset($_SERVER['HTTP_X_KTK_DEPLOY_TOKEN']) || !hash_equals('{token}', (string) $_SERVER['HTTP_X_KTK_DEPLOY_TOKEN'])) {{ return; }}
    if (home_url('/') !== 'https://krawlthroughkrakow.com/' || site_url('/') !== 'https://krawlthroughkrakow.com/' || strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'krawlthroughkrakow.com') {{ status_header(403); exit; }}
    nocache_headers();
    $data = json_decode('{data}', true); $ids = $data['ids'];
    $front = (int) get_option('page_on_front'); $ids[] = $front;
    foreach (array('store','store2') as $slug) {{ $post = get_page_by_path($slug, OBJECT, 'page'); if ($post) {{ $ids[] = $post->ID; }} }}
    foreach (get_posts(array('post_type'=>'wpcf7_contact_form','post_status'=>'publish','numberposts'=>-1)) as $post) {{ $ids[] = $post->ID; }}
    $ids = array_unique($ids); sort($ids); $posts = array(); $meta = array();
    foreach ($ids as $id) {{ $post = get_post($id); $posts[$id] = $post ? $post->to_array() : null; $meta[$id] = get_post_meta($id); ksort($meta[$id]); }}
    $terms = array(); foreach ($data['terms'] as $id) {{ $term = get_term($id); $terms[$id] = $term && !is_wp_error($term) ? (array) $term : null; }}
    $keys = array('home','siteurl','blog_public','show_on_front','page_on_front','page_for_posts','template','stylesheet','active_plugins','et_divi','wpcode_snippets','wpcode_settings','iubenda','iubenda_options','iubenda_settings','ecwid_store_id','permalink_structure');
    global $wpdb;
    $keys = array_unique(array_merge($keys, $wpdb->get_col("SELECT option_name FROM {{$wpdb->options}} WHERE option_name LIKE 'iubenda%' OR option_name LIKE 'wpcode%' OR option_name LIKE 'et\\_%'")));
    sort($keys); $options = array(); foreach ($keys as $key) {{ $options[$key] = get_option($key, null); }}
    $state = array('front_page'=>$posts[$front] ?? null,'posts'=>$posts,'post_meta'=>$meta,'terms'=>$terms,'options'=>$options);
    $inventory = static function ($root) {{
        $owned = array(); $assets = $root . '/ktk-code-pages-assets/';
        if (is_dir($assets)) {{ foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($assets, FilesystemIterator::SKIP_DOTS)) as $file) {{
            if ($file->isLink()) {{ throw new RuntimeException('Symlinks are not allowed in owned content assets'); }}
            if ($file->isFile()) {{ $owned['ktk-code-pages-assets/' . str_replace('\\\\','/',substr($file->getPathname(), strlen($assets)))] = hash_file('sha256', $file->getPathname()); }}
        }} }}
        foreach (array('ktk-code-pages.php','{ACTIVATION}') as $name) {{ if (is_file($root . '/' . $name)) {{ $owned[$name] = hash_file('sha256', $root . '/' . $name); }} }}
        ksort($owned); return (object) $owned;
    }};
    $identities = array(); foreach ($data['ids'] as $id) {{ $post = get_post($id); $identities[$id] = $post ? array('status'=>$post->post_status,'type'=>$post->post_type,'permalink'=>get_permalink($post)) : null; }}
    $purged = false;
    if ({'true' if purge else 'false'} && function_exists('rocket_clean_files')) {{ ob_start(); rocket_clean_files(array_map('home_url', $data['routes'])); ob_end_clean(); $purged = true; }}
    wp_send_json(array('home_url'=>home_url('/'),'site_url'=>site_url('/'),'content_url'=>content_url('/'),'environment'=>wp_get_environment_type(),'blog_public'=>(int)get_option('blog_public'),
        'state'=>$state,'state_sha256'=>hash('sha256',wp_json_encode($state)),'identities'=>$identities,
        'owned_checksums'=>$inventory(__DIR__),'staging_checksums'=>$inventory(dirname(__DIR__,2).'/staging/wp-content/mu-plugins'),
        'production_enabled'=>function_exists('ktk_pages_is_production_enabled') && ktk_pages_is_production_enabled(),'origin_cache_cleared'=>$purged,'captured_at'=>gmdate('c')));
}}, -999);
'''.encode()


def snapshot(ftp, manifest, purge=False):
    token = secrets.token_urlsafe(32)
    return home.transient_helper(ftp, 'snapshot', snapshot_helper(token, manifest, purge), token)


def validate_snapshot(value, manifest, expected, enabled):
    home.validate_snapshot(value)
    if value.get('production_enabled') is not enabled:
        raise RuntimeError('Unexpected production activation state')
    if value.get('staging_checksums') != expected:
        raise RuntimeError('Independent staging checksum inventory differs from approved local payload')
    for row in manifest['routes']:
        if row.get('postId') and row['kind'] in ('page', 'blog post'):
            post = value['identities'].get(str(row['postId']))
            if not post or post['status'] != 'publish' or post['permalink'] != URL.rstrip('/') + row['route']:
                raise RuntimeError('Production source post identity mismatch: ' + row['route'])


def owned_files(ftp):
    files = {pages.ASSETS + '/' + name: value for name, value in common.store2.read_tree(ftp, REMOTE + '/' + pages.ASSETS).items()}
    for name in (pages.RENDERER, ACTIVATION):
        value = common.retrieve_file(ftp, production_path(name))
        if value is not None:
            files[name] = value
    return files


def backup(files, state, planned):
    path = ROOT / 'deploy-backups' / ('ktk-code-pages-production-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f') + '.zip')
    path.parent.mkdir(parents=True, exist_ok=True)
    manifest = {'remote_root': REMOTE, 'created_at': datetime.now(timezone.utc).isoformat(), 'files': {name: sha(value) for name, value in files.items()},
                'new_files': sorted(set(planned) - set(files)), 'state_sha256': state['state_sha256'], 'database_mutated': False,
                'rollback': 'Disable/rename ktk-code-pages-production.php first, restore verified prior owned dependencies and renderer if present, then clear only affected caches. Original WordPress data is unchanged. Restore homepage separately from its own backup if needed. Do not delete unrelated files or restore global settings.'}
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('release-manifest.json', json.dumps(manifest, indent=2))
        archive.writestr('production-wordpress-snapshot.json', json.dumps(state, indent=2))
        for name, value in files.items():
            archive.writestr(name, value)
    with zipfile.ZipFile(path) as archive:
        if json.loads(archive.read('production-wordpress-snapshot.json')) != state:
            raise RuntimeError('Production WordPress backup verification failed')
        for name, expected in manifest['files'].items():
            if sha(archive.read(name)) != expected:
                raise RuntimeError('Production file backup verification failed: ' + name)
    return path


def copy_helper(token, expected):
    for name in expected:
        if name == ACTIVATION:
            raise ValueError('Activation cannot be included in dependency copying')
        production_path(name)
    encoded = base64.b64encode(json.dumps(expected, separators=(',', ':')).encode()).decode()
    return f'''<?php
if (!defined('ABSPATH')) {{ exit; }}
add_action('wp_loaded', function () {{
    if (time() > {int(time.time()) + 900} || !isset($_SERVER['HTTP_X_KTK_DEPLOY_TOKEN']) || !hash_equals('{token}', (string) $_SERVER['HTTP_X_KTK_DEPLOY_TOKEN'])) {{ return; }}
    if (home_url('/') !== 'https://krawlthroughkrakow.com/' || site_url('/') !== 'https://krawlthroughkrakow.com/' || strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'krawlthroughkrakow.com') {{ status_header(403); exit; }}
    if (defined('KTK_CODE_PAGES_PRODUCTION_ENABLED') && KTK_CODE_PAGES_PRODUCTION_ENABLED) {{ wp_send_json(array('error'=>'production_must_be_disabled'),409); }}
    nocache_headers(); if (function_exists('set_time_limit')) {{ @set_time_limit(180); }}
    $expected = json_decode(base64_decode('{encoded}'), true);
    $canonicalPath = static function ($path) {{ $value = realpath($path); return $value === false ? false : str_replace('\\\\','/',$value); }};
    $targetRoot = $canonicalPath(__DIR__); $sourceRoot = $canonicalPath(dirname(__DIR__,2) . '/staging/wp-content/mu-plugins');
    if (!$sourceRoot || !$targetRoot || $sourceRoot === $targetRoot || is_link(__DIR__) || is_link(dirname(__DIR__,2) . '/staging/wp-content/mu-plugins')) {{ throw new RuntimeException('Invalid deployment roots'); }}
    foreach ($expected as $name=>$hash) {{
        $parts = explode('/', $name);
        if (($name !== 'ktk-code-pages.php' && !str_starts_with($name,'ktk-code-pages-assets/')) || str_contains($name,'\\\\') || array_intersect($parts,array('','.','..')) || !preg_match('/^[a-f0-9]{{64}}$/D',$hash)) {{ throw new RuntimeException('Unowned dependency path'); }}
        $source = $sourceRoot . '/' . $name; $resolved = $canonicalPath($source);
        if (!$resolved || !str_starts_with($resolved,$sourceRoot.'/') || is_link($source) || !is_file($source) || hash_file('sha256',$source) !== $hash) {{ throw new RuntimeException('Source dependency checksum mismatch'); }}
    }}
    uksort($expected, static function ($a,$b) {{
        $rank = static function ($name) {{ return $name === 'ktk-code-pages.php' ? 2 : ($name === 'ktk-code-pages-assets/registry.php' ? 1 : 0); }};
        return ($rank($a) <=> $rank($b)) ?: strcmp($a,$b);
    }});
    $copied = 0; $skipped = 0; $checksums = array();
    foreach ($expected as $name=>$hash) {{
        $parts = explode('/',$name); $directory = $targetRoot;
        foreach (array_slice($parts,0,-1) as $part) {{
            $directory .= '/' . $part;
            if (is_link($directory) || (!is_dir($directory) && !mkdir($directory,0755)) || !str_starts_with($canonicalPath($directory),$targetRoot.'/')) {{ throw new RuntimeException('Unsafe target directory'); }}
        }}
        $target = $targetRoot . '/' . $name;
        if (is_link($target)) {{ throw new RuntimeException('Unsafe target file'); }}
        if (is_file($target) && hash_file('sha256',$target) === $hash) {{ $skipped++; }}
        else {{
            $temporary = tempnam($directory,'.ktk-content-');
            if (!$temporary) {{ throw new RuntimeException('Could not create temporary dependency'); }}
            try {{
                if (!copy($sourceRoot.'/'.$name,$temporary) || hash_file('sha256',$temporary) !== $hash || !chmod($temporary,0644) || !rename($temporary,$target)) {{ throw new RuntimeException('Atomic dependency copy failed'); }}
                if (str_ends_with($name,'.php') && function_exists('opcache_invalidate')) {{ @opcache_invalidate($target,true); }}
            }} finally {{ if (is_file($temporary)) {{ unlink($temporary); }} }}
            $copied++;
        }}
        $checksums[$name] = hash_file('sha256',$target);
        if ($checksums[$name] !== $hash) {{ throw new RuntimeException('Final target checksum mismatch'); }}
    }}
    wp_send_json(array('checksums'=>$checksums,'copied'=>$copied,'skipped'=>$skipped,'activation_enabled'=>false));
}}, -999);
'''.encode()


def publish_dependencies(ftp, files, previous):
    expected = {name: sha(value) for name, value in files.items()}
    token = secrets.token_urlsafe(32)
    result = home.transient_helper(ftp, 'snapshot', copy_helper(token, expected), token)
    if result.get('checksums') != expected or result.get('activation_enabled') is not False or result.get('copied',0) + result.get('skipped',0) != len(files):
        raise RuntimeError('Independent server-side dependency copy verification failed')
    print(f"Verified {len(files)} production content files by server-side copy ({result['copied']} copied, {result['skipped']} unchanged).", flush=True)
    return result['checksums']


def disable_activation(ftp):
    path = production_path(ACTIVATION)
    if common.retrieve_file(ftp, path) != ACTIVATION_SOURCE:
        raise RuntimeError('Refusing to disable an unrecognized activation file')
    ftp.rename(path, path + '.disabled-' + secrets.token_hex(8) + '.tmp')
    if any(name == ACTIVATION for name, _ in ftp.mlsd(REMOTE)):
        raise RuntimeError('Activation rollback could not be verified')


def promote(ftp, files, publish, destination):
    expected = {name: sha(value) for name, value in files.items()}
    manifest = pages.validate_full_registry(pages.registry_data())
    report = {'started_at': datetime.now(timezone.utc).isoformat(), 'mode': 'publish-production' if publish else 'production-dry-run',
              'phase': 'preflight', 'database_mutated': False, 'file_count': len(files), 'local_checksums': expected,
              'transfer_method': 'authenticated-server-side-copy-from-verified-staging'}
    activated = False
    try:
        before = snapshot(ftp, manifest)
        validate_snapshot(before, manifest, expected, False)
        report['staging_checksums'] = before['staging_checksums']
        report['local_matches_staging'] = True
        report['production_state'] = {key: before[key] for key in ('home_url', 'site_url', 'environment', 'blog_public', 'state_sha256')}
        previous = owned_files(ftp)
        if ACTIVATION in previous:
            raise RuntimeError('Production activation file already exists; review the previous release before replacing it')
        if {name: sha(value) for name, value in previous.items()} != before['owned_checksums']:
            raise RuntimeError('Production inventory changed while being backed up')
        store_root = '/public_html/wp-content/plugins/ktk-storefront/'
        protected = {name: sha(common.retrieve_file(ftp, store_root + name) or b'') for name in sorted(common.store2.DEPLOY_FILES)}
        if not publish:
            report['phase'] = 'dry-run-complete'
            report['existing_files'] = len(previous)
            return report
        archive = backup(previous, before, [*files, ACTIVATION])
        report.update(backup=str(archive), backup_sha256=sha(archive.read_bytes()), phase='backup-verified')
        home.checkpoint(destination, report)
        report['production_checksums'] = publish_dependencies(ftp, files, previous)
        prepared = snapshot(ftp, manifest)
        validate_snapshot(prepared, manifest, expected, False)
        if prepared['owned_checksums'] != expected or prepared['state_sha256'] != before['state_sha256']:
            raise RuntimeError('Pre-activation payload or WordPress state changed')
        report['phase'] = 'dependencies-verified-production-disabled'
        home.checkpoint(destination, report)
        # Homepage promotion has its own backup, exact staging parity and state guards.
        home_report_path = destination.with_name('homepage-publish.json')
        home_report = home.promote(ftp, home.local_payload(), True, home_report_path)
        report['homepage_report'] = str(home_report_path.relative_to(ROOT))
        report['homepage_complete'] = home_report['phase'] == 'complete'
        ready = snapshot(ftp, manifest)
        validate_snapshot(ready, manifest, expected, False)
        if ready['owned_checksums'] != expected or ready['state_sha256'] != before['state_sha256']:
            raise RuntimeError('Final pre-activation verification failed')
        # From this point an uncertain activation upload must be treated as live.
        activated = True
        common.replace_renderer_atomically(ftp, production_path(ACTIVATION), ACTIVATION_SOURCE)
        after = snapshot(ftp, manifest, purge=True)
        validate_snapshot(after, manifest, expected, True)
        deployed = {**expected, ACTIVATION: sha(ACTIVATION_SOURCE)}
        if after['owned_checksums'] != deployed or after['state_sha256'] != before['state_sha256']:
            raise RuntimeError('Final production payload or WordPress state verification failed')
        after_store = {name: sha(common.retrieve_file(ftp, store_root + name) or b'') for name in protected}
        if after_store != protected:
            raise RuntimeError('Protected storefront files changed during release')
        report.update(production_checksums=deployed, wordpress_state_unchanged=True, storefront_unchanged=True,
                      all_remote_owned_checksums_match=True, activation_verified=True, origin_cache_cleared=after['origin_cache_cleared'],
                      phase='complete', finished_at=datetime.now(timezone.utc).isoformat())
        return report
    except Exception as error:
        report['failed_phase'] = report['phase']
        report['phase'] = 'failed'
        report['error'] = str(error)
        if activated:
            try:
                disable_activation(ftp)
                snapshot(ftp, manifest, purge=True)
                report['activation_rolled_back'] = True
            except Exception:
                report['activation_rolled_back'] = False
                report['rollback_requires_attention'] = True
        raise
    finally:
        home.checkpoint(destination, report)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--report', default='docs/code-pages/production-release/publish.json')
    args = parser.parse_args()
    destination = (ROOT / args.report).resolve()
    if not destination.is_relative_to(ROOT):
        raise ValueError('Release report must stay inside the workspace')
    files = approved_payload()
    ftp = common.StagingFTP()
    try:
        result = promote(ftp, files, args.publish, destination)
        print(json.dumps({key: result.get(key) for key in ('mode','phase','file_count','local_matches_staging','backup','backup_sha256','activation_verified','wordpress_state_unchanged','storefront_unchanged')}))
    finally:
        ftp.close()


if __name__ == '__main__':
    main()
