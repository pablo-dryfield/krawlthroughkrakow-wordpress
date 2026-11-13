"""Guarded staging-only public storefront release; never promotes production."""
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

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('seo_shared',ROOT/'tools/publish-seo-discovery.py')
shared=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(shared)
base=shared.base;common=shared.common
LOCAL=ROOT/'staging/wp-content/plugins/ktk-storefront'
REMOTE='/public_html/staging/wp-content/plugins/ktk-storefront'
MU='/public_html/staging/wp-content/mu-plugins'
PREFIX='../plugins/ktk-storefront/'
FILES=tuple(sorted(common.store2.DEPLOY_FILES))
BASELINE='dc22fa6c03734644ccde3f2ce725f2900151ff61'
VERSION='2026.11.13.2'


def sha(value): return hashlib.sha256(value).hexdigest()


def remote_path(name):
    if name not in FILES: raise ValueError('Unowned staging storefront file')
    return REMOTE+'/'+name


def payload():
    if len(FILES)!=12: raise RuntimeError('Reviewed 12-file public storefront scope required')
    files={name:(LOCAL/name).read_bytes() for name in FILES}
    for name,value in files.items():
        if name.endswith('.php'):
            result=subprocess.run(['php','-l'],input=value,capture_output=True)
            if result.returncode: raise RuntimeError('PHP syntax validation failed: '+name)
    json.loads(files['includes/product-content-fallbacks.json'])
    return files


def validate_qa(report,expected):
    summary=report.get('summary',{})
    if (report.get('errors') or report.get('realMutations')!=0 or summary.get('passed')!=summary.get('total')
            or summary.get('total',0)<800 or report.get('payloadChecksums')!=expected
            or not 0 <= (datetime.now(timezone.utc)-datetime.fromisoformat(report['checkedAt'])).total_seconds()<=86400):
        raise RuntimeError('Fresh complete payload-bound public browser checks required')


def baseline_hashes(previous_release=None):
    if previous_release:
        report=json.loads(previous_release.read_text())
        if (report.get('phase')!='complete' or report.get('stagingOnly') is not True or report.get('protectedUnchanged') is not True
                or report.get('productionFilesUnchanged') is not True or set(report.get('expected',{}))!={PREFIX+name for name in FILES}
                or report.get('after',{}).get('owned')!=report['expected']):
            raise RuntimeError('Previous baseline must be a verified matching staging-only release')
        return report['expected']
    result={}
    for name in FILES:
        source=subprocess.run(['git','show',BASELINE+':staging/wp-content/plugins/ktk-storefront/'+name],cwd=ROOT,capture_output=True)
        result[PREFIX+name]=sha(source.stdout) if source.returncode==0 else None
    return result


def snapshot(ftp):
    token=secrets.token_hex(32);helper=MU+'/ktk-public-storefront-probe-'+secrets.token_hex(8)+'.php'
    extra=tuple(path.name for path in (ROOT/'staging/wp-content/mu-plugins').glob('ktk-*.php'))+(
        'ktk-site-integrations-assets/site.js','ktk-site-integrations-assets/site.css',
        'ktk-seo-sitemap-assets/.htaccess','ktk-seo-sitemap-assets/data.json')
    extension=shared.extension()+r'''
    if (is_link(dirname(__DIR__).'/plugins/ktk-storefront')) { throw new RuntimeException('Unexpected plugin-root symlink'); }
    $extension['public_content_version'] = class_exists('KTK_Storefront_Public_Content') ? KTK_Storefront_Public_Content::VERSION : null;
    $extension['public_method_available'] = method_exists('KTK_Storefront','public_html_data');
    $extension['storefront_active'] = in_array('ktk-storefront/ktk-storefront.php',(array)get_option('active_plugins'),true);
'''
    try:
        base.atomic_upload(ftp,helper,base.helper_source('staging',token,owned_files=tuple(PREFIX+name for name in FILES),extra_protected=extra,snapshot_extension=extension))
        request=urllib.request.Request('https://krawlthroughkrakow.com/staging/?ktk_public_probe='+secrets.token_hex(8),headers={
            'X-KTK-Deploy-Token':token,'User-Agent':'KTK staging public HTML release/1.0','Cache-Control':'no-cache'})
        with urllib.request.urlopen(request,timeout=180) as response: value=json.load(response)
        if value['home_url']!='https://krawlthroughkrakow.com/staging/' or value['blog_public']!=0 or not value['storefront_active']:
            raise RuntimeError('Staging identity, active plugin and noindex setting required')
        return value
    finally: base.remove_file(ftp,helper)


def protected_unchanged(before,after):
    return all(before[key]==after[key] for key in ('protected','production_checksums','wordpress_state_sha256','blog_public'))


def backup(existing,before):
    target=ROOT/'deploy-backups'/('storefront-public-staging-'+datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f')+'.zip')
    manifest={'remoteRoot':REMOTE,'baseline':BASELINE,'before':before,'newFiles':[name for name in FILES if name not in existing],
              'files':{name:sha(value) for name,value in existing.items()}}
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('release-manifest.json',json.dumps(manifest,indent=2))
        for name,value in existing.items(): archive.writestr(name,value)
    with zipfile.ZipFile(target) as archive:
        for name,value in existing.items():
            if sha(archive.read(name))!=sha(value): raise RuntimeError('Backup verification failed')
    return target


def ordered_files():
    dependencies=['includes/product-content-fallbacks.json','includes/class-ktk-storefront-public-content.php']
    return [name for name in FILES if name not in dependencies and not name.endswith('.php')]+dependencies+[
        'includes/class-ktk-storefront.php','templates/storefront.php','ktk-storefront.php']


def rollback(ftp,existing):
    for name in ['templates/storefront.php','includes/class-ktk-storefront.php','includes/class-ktk-storefront-public-content.php','ktk-storefront.php']:
        if name in existing: base.atomic_upload(ftp,remote_path(name),existing[name])
    for name in FILES:
        if name in existing and not name.endswith('.php'): base.atomic_upload(ftp,remote_path(name),existing[name])
    for name in FILES:
        if name not in existing: base.remove_file(ftp,remote_path(name))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish',action='store_true');parser.add_argument('--manifest',action='store_true')
    parser.add_argument('--qa-report');parser.add_argument('--report')
    parser.add_argument('--previous-release',help='Explicit verified staging checkpoint for a scoped follow-up')
    args=parser.parse_args();files=payload();expected={PREFIX+name:sha(value) for name,value in files.items()}
    if args.manifest: print(json.dumps({name:sha(value) for name,value in files.items()}));return
    if args.qa_report: validate_qa(json.loads((ROOT/args.qa_report).read_text()),{name:sha(value) for name,value in files.items()})
    if not args.publish: print(json.dumps({'phase':'local-dry-run','remoteRoot':REMOTE,'files':expected,'networkOrDeployment':False}));return
    if not args.qa_report or not args.report: raise RuntimeError('Publishing requires QA evidence and a new report path')
    destination=ROOT/args.report
    if destination.exists(): raise RuntimeError('Preserve earlier report; choose a new filename')
    report={'startedAt':datetime.now(timezone.utc).isoformat(),'phase':'preflight','expected':expected,'stagingOnly':True}
    ftp=common.StagingFTP()
    try:
        before=snapshot(ftp);report['before']=before
        if before['owned'] not in (baseline_hashes(ROOT/args.previous_release if args.previous_release else None),expected): raise RuntimeError('Remote plugin differs from reviewed baseline/current payload')
        existing={}
        if set(common.store2.read_tree(ftp,REMOTE))-set(FILES): raise RuntimeError('Unowned plugin files must not be overwritten/removed')
        for name in FILES:
            value=common.retrieve_file(ftp,remote_path(name))
            if before['owned'][PREFIX+name]!=(sha(value) if value is not None else None): raise RuntimeError('Independent preflight inventory mismatch')
            if value is not None: existing[name]=value
        checkpoint=backup(existing,before);report.update(phase='backed-up',backup=str(checkpoint.relative_to(ROOT)),backupSha256=sha(checkpoint.read_bytes()))
        try:
            for name in ordered_files():
                if files[name]!=existing.get(name): base.atomic_upload(ftp,remote_path(name),files[name])
            after=snapshot(ftp);report['after']=after
            if after['owned']!=expected or not protected_unchanged(before,after) or after['public_content_version']!=VERSION or not after['public_method_available']:
                raise RuntimeError('Owned/protected/runtime verification failed')
            if common.store2.hash_map(common.store2.read_tree(ftp,REMOTE))!={name:sha(value) for name,value in files.items()}: raise RuntimeError('Independent deployed plugin inventory mismatch')
            report['cachePathsCleared']=common.store2.clear_store2_cache(ftp,staging=True)
            report.update(phase='complete',protectedUnchanged=True,productionFilesUnchanged=True,helpersRemoved=True)
        except Exception:
            rollback(ftp,existing);restored=snapshot(ftp);report['rollbackOwnedVerified']=restored['owned']==before['owned']
            report['phase']='rolled-back' if report['rollbackOwnedVerified'] else 'rollback-needs-review'
            raise
    except Exception as error: report['error']=str(error);raise
    finally:
        ftp.close();report['finishedAt']=datetime.now(timezone.utc).isoformat();destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({key:report.get(key) for key in ('phase','backup','backupSha256','protectedUnchanged','productionFilesUnchanged','cachePathsCleared','error')}))


if __name__=='__main__': main()
