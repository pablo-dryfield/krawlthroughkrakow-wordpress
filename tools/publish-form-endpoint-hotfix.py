"""One approved production JS expression, never the staged SEO payload."""
import argparse
import hashlib
import importlib.util
import json
import secrets
import subprocess
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = 'ktk-code-pages-assets/runtime.js'
REMOTE = '/public_html/wp-content/mu-plugins/'
URL = 'https://krawlthroughkrakow.com/'
OLD_SHA = '38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3'
OLD = b"fetch(cf7?form.dataset.feedbackEndpoint:form.action,{method:'POST'"
NEW = b"fetch(cf7?form.dataset.feedbackEndpoint:form.getAttribute('action'),{method:'POST'"
spec = importlib.util.spec_from_file_location('ktk_endpoint_common', ROOT / 'tools/publish-clarity.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def sha(value):
    return hashlib.sha256(value).hexdigest()


def candidate(value):
    if sha(value) != OLD_SHA or value.count(OLD) != 1 or NEW in value:
        raise ValueError('Unreviewed production baseline; refuse patch')
    result = value.replace(OLD, NEW, 1)
    if result.replace(NEW, OLD, 1) != value or OLD in result:
        raise ValueError('Patch is not the single approved expression')
    return result


def content_routes():
    manifest = json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text())
    routes = [row['route'] for row in manifest['routes']]
    if len(routes) != 116 or len(set(routes)) != 116:
        raise ValueError('Exact complete content inventory required')
    for route in routes:
        if not route.startswith('/') or route.startswith('//') or route == '/' or any(
                route.startswith('/' + name) for name in ('store', 'staging', 'wp-', '?')) or '..' in route:
            raise ValueError('Protected cache route')
    return routes


def snapshot(ftp, purge=False):
    token = secrets.token_urlsafe(32)
    name = 'ktk-form-endpoint-release-' + secrets.token_hex(8) + '.php'
    routes = json.dumps(content_routes(), separators=(',', ':'))
    extension = r'''
    $meta = $wpdb->get_results("SELECT m.post_id,m.meta_id,m.meta_key,m.meta_value FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID=m.post_id WHERE p.post_status='publish' OR p.post_type IN ('wpcf7_contact_form','wpcode') ORDER BY m.meta_id",ARRAY_A);
    $meta_hash = hash('sha256',wp_json_encode($meta));
    $additional = array();
    $walk = static function ($root,$label,$excluded) use (&$additional) {
        if (!is_dir($root) || is_link($root)) { throw new RuntimeException('Unsafe protected root'); }
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS)) as $file) {
            if ($file->isLink()) { throw new RuntimeException('Unexpected protected symlink'); }
            if (!$file->isFile()) { continue; }
            $relative = str_replace('\\','/',substr($file->getPathname(),strlen($root)+1));
            if (in_array($relative,$excluded,true) || str_contains('/'.$relative,'/frontend/')) { continue; }
            $additional[$label.'/'.$relative] = hash_file('sha256',$file->getPathname());
        }
    };
    $walk(__DIR__,'production-mu',array('__HELPER__','ktk-code-pages-assets/runtime.js'));
    $staging = dirname(__DIR__,2).'/staging/wp-content';
    $walk($staging.'/mu-plugins','staging-mu',array());
    $walk($staging.'/plugins/ktk-storefront','staging-storefront',array());
    ksort($additional);
    $cleared = false;
    if (__PURGE__ && function_exists('rocket_clean_files')) {
        ob_start(); rocket_clean_files(array_map('home_url',json_decode('__ROUTES__',true))); ob_end_clean(); $cleared = true;
    }
    $extension = array('post_meta_sha256'=>$meta_hash,'additional_protected'=>$additional,
        'origin_cache_cleared'=>$cleared,'scoped_cache_available'=>function_exists('rocket_clean_files'),
        'production_enabled'=>function_exists('ktk_pages_is_production_enabled') && ktk_pages_is_production_enabled());
'''.replace('__HELPER__', name).replace('__PURGE__', 'true' if purge else 'false').replace('__ROUTES__', routes)
    source = base.helper_source('production', token, False, owned_files=[TARGET], snapshot_extension=extension)
    disabled_domain_purge = b"if (false && function_exists('rocket_clean_domain')) { ob_start(); rocket_clean_domain(); ob_end_clean(); $cleared = true; }"
    if source.count(disabled_domain_purge) != 1:
        raise RuntimeError('Shared helper changed; review cache boundary afresh')
    source = source.replace(disabled_domain_purge, b'', 1)
    path = REMOTE + name
    try:
        base.atomic_upload(ftp, path, source)
        request = urllib.request.Request(URL + '?ktk_endpoint_snapshot=' + secrets.token_hex(8), headers={
            'X-KTK-Deploy-Token': token, 'Cache-Control': 'no-cache', 'User-Agent': 'KTK approved form-only release/1.0'})
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                result = json.load(response)
        except Exception:
            raise RuntimeError('Authenticated endpoint snapshot failed') from None
        if result.get('home_url') != URL or result.get('blog_public') != 1 or result.get('production_enabled') is not True:
            raise RuntimeError('Unexpected production identity, indexing or activation')
        if not result.get('scoped_cache_available') or not result.get('additional_protected') or not result.get('post_meta_sha256'):
            raise RuntimeError('Protected state or scoped cache capability missing')
        return result
    finally:
        base.remove_file(ftp, path)


def same_protected(before, after):
    return all(before[key] == after[key] for key in (
        'protected', 'additional_protected', 'wordpress_state_sha256', 'post_meta_sha256',
        'production_enabled', 'home_url', 'blog_public', 'project_id', 'policy_enabled'))


def checkpoint(before, original, patched):
    target = ROOT / 'deploy-backups' / ('production-form-endpoint-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f') + '.zip')
    target.parent.mkdir(exist_ok=True)
    manifest = {'target': TARGET, 'original_sha256': sha(original), 'candidate_sha256': sha(patched),
                'database_mutated': False, 'rollback': 'Restore only original/runtime.js to the same production target, verify bytes and protected state, clear managed-content HTML and this JS asset cache only. Never restore the database or disable production activation.'}
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json', json.dumps(manifest, indent=2))
        archive.writestr('before.json', json.dumps(before, indent=2))
        archive.writestr('original/runtime.js', original)
        archive.writestr('candidate/runtime.js', patched)
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None or archive.read('original/runtime.js') != original or archive.read('candidate/runtime.js') != patched or json.loads(archive.read('before.json')) != before:
            raise RuntimeError('Checkpoint verification failed')
    return target


def verified_candidate(prepared, evidence, original):
    if prepared.get('phase') != 'prepared' or prepared.get('original_sha256') != sha(original):
        raise ValueError('Production changed since preparation')
    patched = candidate(original)
    if prepared.get('candidate_sha256') != sha(patched):
        raise ValueError('Prepared candidate differs')
    age = datetime.now(timezone.utc) - datetime.fromisoformat(evidence['finishedAt'].replace('Z', '+00:00'))
    if not (0 <= age.total_seconds() <= 86400) or evidence.get('candidateSha256') != sha(patched) or evidence.get('baselineSha256') != OLD_SHA:
        raise ValueError('Fresh candidate-bound browser evidence required')
    if evidence.get('phase') != 'candidate' or evidence.get('base') != URL or evidence.get('passed') != evidence.get('total') or evidence.get('total', 0) < 200 or evidence.get('errors') or evidence.get('unexpectedWrites'):
        raise ValueError('Complete production-DOM intercepted form checks required')
    if evidence.get('nativeForms') != 5 or evidence.get('cf7Forms') != 2 or evidence.get('widths') != [390, 1440] or not evidence.get('allPostsIntercepted'):
        raise ValueError('All original form types and widths must be verified without messages')
    if evidence.get('harnessSha256') != sha((ROOT / 'tools/test-production-form-hotfix.mjs').read_bytes()):
        raise ValueError('Browser harness changed since verification')
    checks, payloads, scripts = (evidence.get(key, []) for key in ('checks', 'payloads', 'scripts'))
    if len(checks) != evidence['total'] or not all(row.get('pass') is True for row in checks):
        raise ValueError('Actual complete passing check rows required')
    if len(payloads) < 118 or not all(row.get('pass') is True for row in payloads) or evidence.get('wrongEndpoints'):
        raise ValueError('All native/CF7 payload and exact endpoint checks required')
    if len({(row.get('key'), row.get('width')) for row in scripts}) != 14 or not all(row.get('sha256') == sha(patched) for row in scripts):
        raise ValueError('All14 form views must execute the exact candidate')
    archive_path = (ROOT / prepared['backup']).resolve()
    if (ROOT / 'deploy-backups').resolve() not in archive_path.parents or sha(archive_path.read_bytes()) != prepared['backup_sha256']:
        raise ValueError('Verified preparation checkpoint required')
    with zipfile.ZipFile(archive_path) as archive:
        if archive.read('original/runtime.js') != original or archive.read('candidate/runtime.js') != patched:
            raise ValueError('Checkpoint candidate mismatch')
    return patched


def publish(ftp, before, original, patched, report):
    target = REMOTE + TARGET
    try:
        # Last read catches drift after the protected-state snapshot.
        if base.common.retrieve_file(ftp, target) != original:
            raise RuntimeError('Concurrent target change before write')
        base.atomic_upload(ftp, target, patched)
        after = snapshot(ftp, purge=True)
        report['after'] = after
        if after['owned'] != {TARGET: sha(patched)} or not same_protected(before, after) or not after['origin_cache_cleared']:
            raise RuntimeError('Hotfix or protected-state verification failed')
        report['phase'] = 'complete'
    except Exception:
        current = base.common.retrieve_file(ftp, target)
        if current not in (original, patched):
            report['phase'] = 'rollback-needs-review'
            raise RuntimeError('Concurrent target change; refuse to overwrite it in rollback') from None
        if current != original:
            base.atomic_upload(ftp, target, original)
        restored = snapshot(ftp, purge=True)
        report['rollback_verified'] = restored['owned'] == {TARGET: sha(original)} and same_protected(before, restored)
        report['phase'] = 'rolled-back' if report['rollback_verified'] else 'rollback-needs-review'
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--prepared', type=Path)
    parser.add_argument('--verification', type=Path)
    parser.add_argument('--report', required=True, type=Path)
    args = parser.parse_args()
    args.report = args.report.resolve()
    if (ROOT / 'docs/seo').resolve() not in args.report.parents:
        parser.error('Report must stay in repository SEO evidence storage')
    if args.report.exists():
        parser.error('Fresh output required; preserve earlier evidence')
    if args.publish and (not args.prepared or not args.verification):
        parser.error('Publish requires preparation and browser reports')
    report = {'started_at': datetime.now(timezone.utc).isoformat(), 'environment': 'production',
              'phase': 'preflight', 'target': TARGET, 'scope': 'Endpoint expression only; no staging application payload or database mutation'}
    ftp = base.common.StagingFTP()
    try:
        before = snapshot(ftp)
        report['before'] = before
        original = base.common.retrieve_file(ftp, REMOTE + TARGET)
        if original is None or before['owned'] != {TARGET: sha(original)}:
            raise RuntimeError('Independent production baseline mismatch')
        patched = candidate(original)
        report.update(original_sha256=sha(original), candidate_sha256=sha(patched))
        if args.publish:
            prepared = json.loads(args.prepared.read_text())
            evidence = json.loads(args.verification.read_text())
            verified_candidate(prepared, evidence, original)
            if not same_protected(prepared['before'], before):
                raise RuntimeError('Protected state changed since browser preparation; review afresh')
        archive = checkpoint(before, original, patched)
        report.update(backup=archive.relative_to(ROOT).as_posix(), backup_sha256=sha(archive.read_bytes()))
        with zipfile.ZipFile(archive) as source:
            # Generated candidates stay in ignored evidence storage, never the staged app tree.
            candidate_path = args.report.parent / 'candidate' / 'runtime.js'
            candidate_path.parent.mkdir(parents=True, exist_ok=True)
            if candidate_path.exists() and candidate_path.read_bytes() != patched:
                raise RuntimeError('Refuse to overwrite a different candidate')
            candidate_path.write_bytes(source.read('candidate/runtime.js'))
        subprocess.run(['node', '--check', str(candidate_path)], check=True, capture_output=True)
        report['candidate_file'] = candidate_path.relative_to(ROOT).as_posix()
        report['phase'] = 'prepared'
        if args.publish:
            publish(ftp, before, original, patched, report)
    finally:
        ftp.close()
        report['finished_at'] = datetime.now(timezone.utc).isoformat()
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({key: report.get(key) for key in ('phase', 'target', 'original_sha256', 'candidate_sha256', 'backup', 'backup_sha256')}))


if __name__ == '__main__':
    main()
