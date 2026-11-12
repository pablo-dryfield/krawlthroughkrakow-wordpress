"""Manually publish only the staging SEO preview/guard; default is local dry run."""
import argparse
import hashlib
import importlib.util
import json
import re
import secrets
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REMOTE = '/public_html/staging/wp-content/mu-plugins'
LOCAL = ROOT / 'staging/wp-content/mu-plugins'
FILES = ('ktk-seo-sitemap-assets/.htaccess', 'ktk-seo-sitemap-assets/data.json', 'ktk-seo-sitemap.php')
VERSION = '2026.11.12.1'
OUT = ROOT / 'docs/seo/staging-discovery-2026-11-12'
SPEC = importlib.util.spec_from_file_location('seo_release_common', ROOT / 'tools/publish-clarity.py')
base = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(base)
common = base.common


def sha(value):
    return hashlib.sha256(value).hexdigest()


def remote_path(name):
    if name not in FILES:
        raise ValueError('Unowned staging SEO path')
    return REMOTE + '/' + name


def local_payload():
    files = {name: (LOCAL / name).read_bytes() for name in FILES}
    data = json.loads(files[FILES[1]])
    policy = json.loads((ROOT / 'tools/seo-discovery-policy.json').read_text())
    if len(data['content']) != 116 or len(data['storefront']) != 3 or data['products'] != policy['products']:
        raise RuntimeError('Reviewed first-batch discovery scope required')
    report = json.loads((OUT / 'build.json').read_text())
    if (report['dataSha256'] != sha(files[FILES[1]]) or report['policySha256'] != sha((ROOT / 'tools/seo-discovery-policy.json').read_bytes())
            or not 0 <= (datetime.now(timezone.utc) - datetime.fromisoformat(report['checkedAt'])).total_seconds() <= 86400):
        raise RuntimeError('Fresh verified sitemap build required')
    expected = [row['loc'] for key in ('content', 'storefront') for row in data[key]]
    if expected != [row['url'] for row in report['verified']] or any(row['status'] != 200 or row['canonical'] != row['url'] for row in report['verified']):
        raise RuntimeError('All discovery URLs require final canonical verification')
    if len(data['sourceHashes']) != 117 or any(not re.fullmatch(r'ktk-code-pages-assets/(?:registry\.php|pages/[a-z0-9-]+\.php)', name) for name in data['sourceHashes']):
        raise RuntimeError('Expected owned content source bindings')
    if any(sha((LOCAL / name).read_bytes()) != digest for name, digest in data['sourceHashes'].items()):
        raise RuntimeError('Content definitions changed since sitemap build')
    if files[FILES[0]].strip() != b'Require all denied' or VERSION.encode() not in files[FILES[2]]:
        raise RuntimeError('Unexpected preview protection/version')
    return files


def extension():
    return r'''
    $production = dirname(rtrim(ABSPATH, '/'));
    $production_checksums = array();
    foreach (array('ktk-homepage-assets','ktk-code-pages-assets','ktk-site-integrations-assets') as $folder) {
        $root = $production . '/wp-content/mu-plugins/' . $folder . '/';
        if (!is_dir($root)) { throw new RuntimeException('Expected production boundary missing'); }
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {
            if ($file->isLink()) { throw new RuntimeException('Unexpected production symlink'); }
            if ($file->isFile()) { $production_checksums[$folder . '/' . substr($file->getPathname(),strlen($root))] = hash_file('sha256',$file->getPathname()); }
        }
    }
    foreach (glob($production . '/wp-content/mu-plugins/ktk-*.php') as $file) { $production_checksums[basename($file)] = hash_file('sha256',$file); }
    $production_checksums['robots.txt'] = is_file($production . '/robots.txt') ? hash_file('sha256',$production . '/robots.txt') : null;
    foreach (array('ktk-storefront.php','includes/class-ktk-storefront.php','templates/storefront.php','assets/storefront.js','assets/storefront.css') as $name) {
        $file = $production . '/wp-content/plugins/ktk-storefront/' . $name;
        $production_checksums['storefront/' . $name] = is_file($file) ? hash_file('sha256',$file) : null;
    }
    $asset_root = __DIR__ . '/ktk-seo-sitemap-assets';
    if (is_link($asset_root) || (is_dir($asset_root) && dirname(realpath($asset_root)) !== realpath(__DIR__))) { throw new RuntimeException('Unsafe SEO asset directory'); }
    foreach ($owned as $name) { if (is_link(__DIR__ . '/' . $name)) { throw new RuntimeException('Unexpected owned symlink'); } }
    ksort($production_checksums);
    $extension = array('production_checksums'=>$production_checksums,
        'core_renderer_available'=>class_exists('WP_Sitemaps_Renderer') && class_exists('SimpleXMLElement'),
        'seo_version'=>defined('KTK_SEO_DISCOVERY_VERSION') ? KTK_SEO_DISCOVERY_VERSION : null,
        'seo_staging_enabled'=>function_exists('ktk_seo_discovery_is_staging') ? ktk_seo_discovery_is_staging() : false);
'''


def snapshot(ftp):
    token = secrets.token_hex(32)
    helper = REMOTE + '/ktk-seo-probe-' + secrets.token_hex(8) + '.php'
    protected = tuple(path.name for path in LOCAL.glob('ktk-*.php') if path.name not in FILES) + ('ktk-site-integrations-assets/site.js','ktk-site-integrations-assets/site.css')
    try:
        base.atomic_upload(ftp, helper, base.helper_source('staging', token, owned_files=FILES,
                                                        extra_protected=protected, snapshot_extension=extension()))
        request = urllib.request.Request('https://krawlthroughkrakow.com/staging/?ktk_seo_probe=' + secrets.token_hex(8),
                                         headers={'X-KTK-Deploy-Token':token, 'Cache-Control':'no-cache', 'User-Agent':'KTK staging SEO release/1.0'})
        with urllib.request.urlopen(request, timeout=180) as response:
            value = json.load(response)
        if value['home_url'] != 'https://krawlthroughkrakow.com/staging/' or value['blog_public'] != 0 or not value['core_renderer_available']:
            raise RuntimeError('Staging identity, noindex setting or native XML renderer invalid')
        return value
    finally:
        base.remove_file(ftp, helper)


def backup(before, existing):
    target = ROOT / 'deploy-backups' / ('seo-discovery-staging-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f') + '.zip')
    manifest = {'remoteRoot': REMOTE, 'files':{name:sha(value) for name,value in existing.items()},
                'newFiles':[name for name in FILES if name not in existing], 'before': before,
                'rollback':'Restore/remove only these three owned files; no database/settings restore.'}
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('release-manifest.json', json.dumps(manifest, indent=2))
        for name,value in existing.items(): archive.writestr(name,value)
    with zipfile.ZipFile(target) as archive:
        for name,value in existing.items():
            if archive.read(name) != value: raise RuntimeError('Rollback backup verification failed')
    return target


def restore_owned(ftp, existing):
    for name in reversed(FILES):
        if name in existing: base.atomic_upload(ftp,remote_path(name),existing[name])
        else: base.remove_file(ftp,remote_path(name))


def protected_unchanged(before, after):
    return all(before[key] == after[key] for key in ('protected','production_checksums','wordpress_state_sha256','blog_public'))


def public_product_routes():
    request = urllib.request.Request('https://krawlthroughkrakow.com/staging/wp-json/ktk-storefront/v1/products',
                                     headers={'Accept':'application/json','User-Agent':'Mozilla/5.0 KTK public SEO audit/1.0'})
    with urllib.request.urlopen(request,timeout=60) as response:
        catalog = json.load(response)
    products = catalog.get('products')
    if not isinstance(products,list) or not products:
        raise RuntimeError('Public catalog verification unavailable')
    result = {product['id']:product['slug'] for product in products}
    if len(result) != len(products): raise RuntimeError('Ambiguous public product identities')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--report')
    args = parser.parse_args()
    files = local_payload()
    expected = {name:sha(value) for name,value in files.items()}
    if not args.publish:
        print(json.dumps({'phase':'local-dry-run','files':expected,'remoteRoot':REMOTE,'networkOrDeployment':False}))
        return
    destination = ROOT / args.report if args.report else OUT / ('staging-publish-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '.json')
    if destination.exists(): raise RuntimeError('Preserve existing release report; use a new report filename')
    destination.parent.mkdir(parents=True,exist_ok=True)
    report = {'startedAt':datetime.now(timezone.utc).isoformat(),'phase':'preflight','expected':expected,'stagingOnly':True}
    ftp = common.StagingFTP()
    try:
        before = snapshot(ftp); report['before'] = before
        data = json.loads(files[FILES[1]])
        if any(before['protected'].get(name) != digest for name,digest in data['sourceHashes'].items()):
            raise RuntimeError('Staging content differs from verified sitemap source')
        public_products = public_product_routes()
        if any(public_products.get(product['id']) != product['slug'] for product in data['products']):
            raise RuntimeError('Reviewed public product routes changed since build')
        report['reviewedPublicProductRoutesMatch'] = True
        existing = {}
        for name in FILES:
            value = common.retrieve_file(ftp,remote_path(name))
            if before['owned'][name] != (sha(value) if value is not None else None): raise RuntimeError('Independent preflight inventory mismatch')
            if value is not None: existing[name] = value
        checkpoint = backup(before,existing)
        report.update(phase='backed-up',backup=str(checkpoint.relative_to(ROOT)),backupSha256=sha(checkpoint.read_bytes()))
        try:
            for name in FILES:
                common.store2.ensure_dir(ftp,remote_path(name).rsplit('/',1)[0])
                if existing.get(name) != files[name]: base.atomic_upload(ftp,remote_path(name),files[name])
            after = snapshot(ftp); report['after'] = after
            if after['owned'] != expected or not protected_unchanged(before,after) or after['seo_version'] != VERSION or not after['seo_staging_enabled']:
                raise RuntimeError('Owned/protected files, saved state or runtime verification failed')
            report.update(protectedUnchanged=True,productionFilesUnchanged=True)
            report['cachePathsCleared'] = common.store2.clear_store2_cache(ftp,staging=True)
            report.update(phase='complete',protectedUnchanged=True,productionFilesUnchanged=True,helpersRemoved=True)
        except Exception:
            restore_owned(ftp,existing)
            restored = snapshot(ftp)
            report['rollbackOwnedVerified'] = restored['owned'] == before['owned']
            report['phase'] = 'rolled-back' if report['rollbackOwnedVerified'] else 'rollback-needs-review'
            raise
    except Exception as error:
        report['error'] = str(error)
        raise
    finally:
        ftp.close()
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({key:report.get(key) for key in ('phase','backup','backupSha256','protectedUnchanged','productionFilesUnchanged','cachePathsCleared','error')}))


if __name__ == '__main__': main()
