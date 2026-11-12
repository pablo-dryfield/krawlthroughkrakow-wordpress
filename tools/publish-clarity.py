"""Back up and publish only the five approved Clarity integration files."""
import argparse
import hashlib
import importlib.util
import io
import json
import secrets
import time
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ktk_homepage_clarity_publisher', ROOT / 'tools/publish-homepage-shortcode.py')
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
FILES = ('ktk-homepage-assets/integrations.php', 'ktk-code-pages-assets/integrations.php',
         'ktk-homepage-shortcode.php', 'ktk-code-pages.php', 'ktk-clarity.php')


def sha(value):
    return hashlib.sha256(value).hexdigest()


def remote_root(environment):
    if environment not in ('production', 'staging'):
        raise ValueError('Unknown environment')
    return '/public_html/' + ('staging/' if environment == 'staging' else '') + 'wp-content/mu-plugins'


def local_payload():
    files = {name: (common.LOCAL_MU_PLUGINS / name).read_bytes() for name in FILES}
    for name in ('ktk-homepage-shortcode.php', 'ktk-code-pages.php', 'ktk-clarity.php'):
        if b'z9d5iuilvn' not in files[name] or b'ufswk29c79' in files[name]:
            raise RuntimeError('Unexpected project in ' + name)
    return files


def atomic_upload(ftp, target, value):
    temporary = target + '.upload-' + secrets.token_hex(8) + '.tmp'
    try:
        ftp.storbinary('STOR ' + temporary, io.BytesIO(value))
        if common.retrieve_file(ftp, temporary) != value:
            raise RuntimeError('Temporary checksum mismatch')
        ftp.rename(temporary, target)
        if common.retrieve_file(ftp, target) != value:
            raise RuntimeError('Activated checksum mismatch')
    finally:
        remove_file(ftp, temporary)


def remove_file(ftp, path):
    names = {name for name, _ in ftp.mlsd(path.rsplit('/', 1)[0])}
    if path.rsplit('/', 1)[1] in names:
        ftp.delete(path)
    if any(name == path.rsplit('/', 1)[1] for name, _ in ftp.mlsd(path.rsplit('/', 1)[0])):
        raise RuntimeError('Temporary file removal could not be verified')


def helper_source(environment, token, purge=False, owned_files=None, extra_protected=(), snapshot_extension=''):
    url = 'https://krawlthroughkrakow.com/' + ('staging/' if environment == 'staging' else '')
    owned = json.dumps(FILES if owned_files is None else owned_files, separators=(',', ':'))
    extra_paths = json.dumps(extra_protected, separators=(',', ':'))
    return f'''<?php
if (!defined('ABSPATH')) {{ exit; }}
add_action('wp_loaded', function () {{
    if (time() > {int(time.time()) + 900} || !isset($_SERVER['HTTP_X_KTK_DEPLOY_TOKEN']) || !hash_equals('{token}', (string)$_SERVER['HTTP_X_KTK_DEPLOY_TOKEN'])) {{ return; }}
    if (home_url('/') !== '{url}' || site_url('/') !== '{url}' || strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'krawlthroughkrakow.com') {{ status_header(403); exit; }}
    nocache_headers();
    global $wpdb;
    $options = $wpdb->get_results("SELECT option_name,option_value FROM {{$wpdb->options}} WHERE option_name IN ('home','siteurl','blog_public','show_on_front','page_on_front','page_for_posts','template','stylesheet','active_plugins','permalink_structure') OR option_name LIKE 'et\\_%' OR option_name LIKE 'wpcode%' OR option_name LIKE 'iubenda%' OR option_name LIKE 'ecwid%' ORDER BY option_name", ARRAY_A);
    $posts = $wpdb->get_results("SELECT ID,post_content,post_status,post_modified_gmt FROM {{$wpdb->posts}} WHERE post_status='publish' OR post_type IN ('wpcf7_contact_form','wpcode') ORDER BY ID", ARRAY_A);
    $legacy = array(); foreach ($options as $option) {{ if (str_contains($option['option_value'],'ufswk29c79')) {{ $legacy[] = $option['option_name']; }} }}
    $owned = json_decode('{owned}',true); $checksums = array(); $protected = array();
    foreach ($owned as $name) {{ $path = __DIR__ . '/' . $name; $checksums[$name] = is_file($path) ? hash_file('sha256',$path) : null; }}
    foreach (array('ktk-homepage-assets','ktk-code-pages-assets','../plugins/ktk-storefront') as $folder) {{
        $root = realpath(__DIR__ . '/' . $folder);
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {{
            if ($file->isLink()) {{ throw new RuntimeException('Unexpected symlink'); }}
            $relative = $folder . '/' . str_replace('\\\\','/',substr($file->getPathname(),strlen($root)+1));
            if ($file->isFile() && !in_array($relative,$owned,true) && !str_contains($relative,'/frontend/')) {{ $protected[$relative] = hash_file('sha256',$file->getPathname()); }}
        }}
    }}
    foreach (json_decode('{extra_paths}',true) as $name) {{ $protected[$name] = is_file(__DIR__ . '/' . $name) ? hash_file('sha256',__DIR__ . '/' . $name) : null; }}
    $front = get_post((int)get_option('page_on_front')); $activation = __DIR__ . '/ktk-code-pages-production.php';
    $protected['ktk-code-pages-production.php'] = is_file($activation) ? hash_file('sha256',$activation) : null;
    ksort($protected);
    $cleared = false;
    if ({'true' if purge else 'false'} && function_exists('rocket_clean_domain')) {{ ob_start(); rocket_clean_domain(); ob_end_clean(); $cleared = true; }}
    $extension = array();
    {snapshot_extension}
    wp_send_json(array_merge(array('home_url'=>home_url('/'),'blog_public'=>(int)get_option('blog_public'),'front_page_id'=>$front ? $front->ID : null,
        'wordpress_state_sha256'=>hash('sha256',wp_json_encode(array($options,$posts))),'legacy_saved_options'=>$legacy,
        'owned'=>$checksums,'protected'=>$protected,'policy_enabled'=>function_exists('ktk_clarity_enabled') ? ktk_clarity_enabled() : null,
        'project_id'=>defined('KTK_CLARITY_PROJECT_ID') ? KTK_CLARITY_PROJECT_ID : null,
        'tag_processor_available'=>class_exists('WP_HTML_Tag_Processor'),
        'effective_legacy_option_present'=>str_contains(wp_json_encode(array(get_option('et_divi'),get_option('wpcode_snippets'))),'ufswk29c79'),
        'origin_cache_cleared'=>$cleared,'captured_at'=>gmdate('c')),$extension));
}}, -998);
'''.encode()


def snapshot(ftp, environment, purge=False):
    token = secrets.token_urlsafe(32)
    path = remote_root(environment) + '/ktk-clarity-release-' + secrets.token_hex(8) + '.php'
    try:
        atomic_upload(ftp, path, helper_source(environment, token, purge))
        url = 'https://krawlthroughkrakow.com/' + ('staging/' if environment == 'staging' else '')
        request = urllib.request.Request(url + '?ktk_clarity_release=' + secrets.token_hex(8), headers={
            'X-KTK-Deploy-Token': token, 'Cache-Control': 'no-cache', 'User-Agent': 'KTK Clarity release/1.0'})
        try:
            with urllib.request.urlopen(request, timeout=180) as result:
                value = json.load(result)
        except Exception:
            raise RuntimeError('Authenticated Clarity snapshot request failed') from None
        if value.get('home_url') != url or value.get('blog_public') != (1 if environment == 'production' else 0):
            raise RuntimeError('Unexpected site identity or indexing policy')
        return value
    finally:
        remove_file(ftp, path)


def backup(environment, before, files):
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f')
    target = ROOT / 'deploy-backups' / f'clarity-{environment}-{stamp}.zip'
    manifest = {'environment': environment, 'owned': before['owned'], 'new_files': [name for name in FILES if name not in files],
                'rollback': 'Restore only these five owned files; remove only newly added ktk-clarity.php if rolling back, then purge site caches. No settings or content were rewritten.'}
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('release-manifest.json', json.dumps(manifest, indent=2))
        archive.writestr('before.json', json.dumps(before, indent=2))
        for name, value in files.items():
            archive.writestr(name, value)
    with zipfile.ZipFile(target) as archive:
        for name, value in files.items():
            if archive.read(name) != value:
                raise RuntimeError('Backup verification failed')
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--environment', choices=('staging', 'production'), default='staging')
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    files = local_payload()
    expected = {name: sha(value) for name, value in files.items()}
    folder = ROOT / 'docs/clarity-project-switch'
    folder.mkdir(parents=True, exist_ok=True)
    report = {'environment': args.environment, 'started_at': datetime.now(timezone.utc).isoformat(), 'phase': 'preflight', 'expected': expected}
    ftp = common.StagingFTP()
    try:
        before = snapshot(ftp, args.environment)
        report['before'] = before
        if not before['tag_processor_available']:
            raise RuntimeError('WordPress HTML processor required for safe snippet suppression')
        existing = {}
        for name in FILES:
            value = common.retrieve_file(ftp, remote_root(args.environment) + '/' + name)
            if value is not None:
                existing[name] = value
            if before['owned'][name] != (sha(value) if value is not None else None):
                raise RuntimeError('Independent preflight inventory mismatch')
        report['changed'] = [name for name in FILES if before['owned'][name] != expected[name]]
        if not args.publish:
            report['phase'] = 'dry-run-complete'
            return
        if args.environment == 'production':
            staging = json.loads((folder / 'staging-publish.json').read_text())
            if staging['phase'] != 'complete' or staging['expected'] != expected:
                raise RuntimeError('Exact verified staging payload required')
            for name, value in files.items():
                if common.retrieve_file(ftp, remote_root('staging') + '/' + name) != value:
                    raise RuntimeError('Staging payload changed after verification')
        checkpoint = backup(args.environment, before, existing)
        report['backup'] = str(checkpoint.relative_to(ROOT))
        report['backup_sha256'] = sha(checkpoint.read_bytes())
        report['phase'] = 'publishing'
        try:
            for name in FILES:
                if name in report['changed']:
                    atomic_upload(ftp, remote_root(args.environment) + '/' + name, files[name])
            after = snapshot(ftp, args.environment, purge=True)
            report['after'] = after
            if after['owned'] != expected or after['protected'] != before['protected'] or after['wordpress_state_sha256'] != before['wordpress_state_sha256']:
                raise RuntimeError('Deployment or protected-state verification failed')
            if after['project_id'] != 'z9d5iuilvn' or after['policy_enabled'] is not (args.environment == 'production') or not after['origin_cache_cleared'] or after['effective_legacy_option_present']:
                raise RuntimeError('Runtime policy or origin cache verification failed')
        except Exception:
            report['phase'] = 'rolling-back'
            for name in reversed(FILES):
                target = remote_root(args.environment) + '/' + name
                if name in existing:
                    atomic_upload(ftp, target, existing[name])
                else:
                    remove_file(ftp, target)
            restored = snapshot(ftp, args.environment, purge=True)
            report['rollback_verified'] = restored['owned'] == before['owned'] and restored['protected'] == before['protected']
            report['phase'] = 'rolled-back' if report['rollback_verified'] else 'rollback-needs-review'
            raise
        report['phase'] = 'complete'
    finally:
        ftp.close()
        report['finished_at'] = datetime.now(timezone.utc).isoformat()
        destination = folder / (args.environment + ('-publish.json' if args.publish else '-dry-run.json'))
        destination.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({key: report.get(key) for key in ('environment', 'phase', 'changed', 'backup', 'backup_sha256')}))


if __name__ == '__main__':
    main()
