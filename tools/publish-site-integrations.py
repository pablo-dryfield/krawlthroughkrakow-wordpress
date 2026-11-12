"""Publish shared integrations without changing saved Divi/WPCode settings."""
import argparse
import importlib.util
import json
import re
import secrets
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ktk_shared_release_common', ROOT / 'tools/publish-clarity.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
FILES = ('ktk-site-integrations-assets/site.js', 'ktk-site-integrations-assets/site.css', 'ktk-site-integrations.php')
PROTECTED = ('ktk-clarity.php', 'ktk-homepage-shortcode.php', 'ktk-code-pages.php')
OUT = ROOT / 'docs/shared-integrations'


def extension():
    return r'''
    $divi = array(); $cached = array();
    foreach ($options as $row) {
        if ($row['option_name'] === 'et_divi') { $divi = maybe_unserialize($row['option_value']); }
        if ($row['option_name'] === 'wpcode_snippets') { $cached = maybe_unserialize($row['option_value']); }
    }
    $asset_root = __DIR__ . '/ktk-site-integrations-assets';
    if (is_link($asset_root) || (is_dir($asset_root) && dirname(realpath($asset_root)) !== realpath(__DIR__))) { throw new RuntimeException('Unsafe integration asset directory'); }
    $selected = array(); $profiles = array(); $effective = array();
    foreach ($wpdb->get_results("SELECT ID,post_title,post_content,post_status FROM {$wpdb->posts} WHERE post_type='wpcode' ORDER BY ID",ARRAY_A) as $row) {
        $code = $row['post_content'];
        if (($row['post_title'] === 'UTM Tags' && str_contains($code,'saveFromUrl') && str_contains($code,'addParams'))
            || (str_starts_with($row['post_title'],'Floating Right CTA') && str_contains($code,'ktk-cta') && str_contains($code,'setNYELink'))) {
            $selected[] = array('post'=>$row,'meta'=>get_post_meta((int)$row['ID']));
            $profiles[] = array('id'=>(int)$row['ID'],'title'=>$row['post_title'],'status'=>$row['post_status'],
                'code_sha256'=>hash('sha256',$code),'normalized_sha256'=>hash('sha256',preg_replace('/\s+/','',str_replace('"',"'",$code))));
            $effective[] = array('id'=>(int)$row['ID'],'code_bytes'=>class_exists('WPCode_Snippet') ? strlen((new WPCode_Snippet((int)$row['ID']))->get_code()) : null);
        }
    }
    $cached_profiles = array();
    $walk = static function ($node) use (&$walk,&$cached_profiles) {
        if (!is_array($node)) { return; }
        if (isset($node['id'],$node['code']) && is_string($node['code']) && (str_contains($node['code'],'saveFromUrl') || str_contains($node['code'],'setNYELink'))) {
            $cached_profiles[] = array('id'=>$node['id'],'title'=>$node['title'] ?? '', 'code_type'=>$node['code_type'] ?? '',
                'normalized_sha256'=>hash('sha256',preg_replace('/\s+/','',str_replace('"',"'",$node['code']))));
        }
        foreach ($node as $value) { if (is_array($value)) { $walk($value); } }
    };
    $walk($cached);
    $effective_divi = get_option('et_divi',array()); $integration_html = '';
    foreach ((array)$effective_divi as $key=>$value) { if (preg_match('/_integration_(?:head|body|single_top|single_bottom)$/D',(string)$key) && is_string($value)) { $integration_html .= $value; } }
    $state_rows = array('options'=>array(),'posts'=>array());
    foreach ($options as $row) { $state_rows['options'][$row['option_name']] = hash('sha256',$row['option_value']); }
    foreach ($posts as $row) { $state_rows['posts'][(string)$row['ID']] = hash('sha256',wp_json_encode($row)); }
    $extension = array('legacy_profile'=>$profiles,'cached_profile'=>$cached_profiles,'effective_snippets'=>$effective,
        'wordpress_state_rows'=>$state_rows,
        'effective_divi_legacy_present'=>(bool)preg_match('/makeInstant|GTM-PHXGRZ|google-site-verification|\.et_pb_countdown_timer \.days \.value/',$integration_html),
        'private_legacy_backup'=>array('divi'=>$divi,'snippets'=>$selected,'cached_snippets'=>$cached),
        'shared_policy_loaded'=>defined('KTK_SITE_INTEGRATIONS_VERSION') ? KTK_SITE_INTEGRATIONS_VERSION : null);
'''


def snapshot(ftp, environment, purge=False):
    token = secrets.token_urlsafe(32)
    path = base.remote_root(environment) + '/ktk-site-release-' + secrets.token_hex(8) + '.php'
    source = base.helper_source(environment, token, purge, owned_files=FILES, extra_protected=PROTECTED, snapshot_extension=extension())
    try:
        base.atomic_upload(ftp, path, source)
        url = 'https://krawlthroughkrakow.com/' + ('staging/' if environment == 'staging' else '')
        request = urllib.request.Request(url + '?ktk_site_release=' + secrets.token_hex(8), headers={
            'X-KTK-Deploy-Token': token, 'Cache-Control': 'no-cache', 'User-Agent': 'KTK shared integration release/1.0'})
        try:
            with urllib.request.urlopen(request, timeout=180) as result:
                data = json.load(result)
        except Exception:
            raise RuntimeError('Authenticated shared integration snapshot failed') from None
        if data.get('home_url') != url or data.get('blog_public') != (0 if environment == 'staging' else 1) or not data.get('tag_processor_available'):
            raise RuntimeError('Unexpected site identity/indexing or missing HTML processor')
        return data
    finally:
        base.remove_file(ftp, path)


def public_snapshot(data):
    return {key: value for key, value in data.items() if key != 'private_legacy_backup'}


def backup(environment, before, existing):
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f')
    target = ROOT / 'deploy-backups' / f'shared-integrations-{environment}-{stamp}.zip'
    manifest = {'environment':environment,'owned':before['owned'],'new_files':[name for name in FILES if name not in existing],
                'rollback':'Disable/remove only ktk-site-integrations.php first; restore prior owned files if any, then clear site caches. Original saved Divi/WPCode integrations are unchanged. Do not restore database settings globally.'}
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('release-manifest.json',json.dumps(manifest,indent=2))
        archive.writestr('before-private.json',json.dumps(before,indent=2))
        for name,value in existing.items(): archive.writestr(name,value)
    with zipfile.ZipFile(target) as archive:
        if json.loads(archive.read('before-private.json')) != before: raise RuntimeError('Private checkpoint verification failed')
        for name,value in existing.items():
            if archive.read(name) != value: raise RuntimeError('Checkpoint file verification failed')
    return target


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--environment',choices=('staging','production'),default='staging')
    parser.add_argument('--audit',action='store_true')
    parser.add_argument('--publish',action='store_true')
    args=parser.parse_args()
    if args.audit and args.publish: parser.error('Audit cannot publish')
    OUT.mkdir(parents=True,exist_ok=True)
    report={'environment':args.environment,'started_at':datetime.now(timezone.utc).isoformat(),'phase':'preflight'}
    files={} if args.audit else {name:(base.common.LOCAL_MU_PLUGINS/name).read_bytes() for name in FILES}
    expected={name:base.sha(value) for name,value in files.items()}
    version=None if args.audit else re.search(rb"const KTK_SITE_INTEGRATIONS_VERSION = '([^']+)';",files['ktk-site-integrations.php'])[1].decode()
    report['expected']=expected
    ftp=base.common.StagingFTP()
    try:
        before=snapshot(ftp,args.environment)
        report['before']=public_snapshot(before)
        existing={}
        for name in FILES:
            value=base.common.retrieve_file(ftp,base.remote_root(args.environment)+'/'+name)
            if value is not None: existing[name]=value
            if before['owned'][name] != (base.sha(value) if value is not None else None): raise RuntimeError('Independent preflight hash mismatch')
        if args.audit:
            checkpoint=backup(args.environment,before,existing)
            report.update(phase='audit-complete',backup=str(checkpoint.relative_to(ROOT)),backup_sha256=base.sha(checkpoint.read_bytes()))
            return
        report['changed']=[name for name in FILES if before['owned'][name]!=expected[name]]
        if not args.publish: report['phase']='dry-run-complete'; return
        approved=json.loads((OUT/(args.environment+'-audit.json')).read_text())['before']['legacy_profile']
        approved={(row['id'],row['normalized_sha256']) for row in approved}
        if any((int(row['id']),row['normalized_sha256']) not in approved for row in before['legacy_profile']+before['cached_profile']):
            raise RuntimeError('Legacy snippets changed since the reviewed audit')
        if args.environment=='production':
            staging=json.loads((OUT/'staging-publish.json').read_text())
            tests=json.loads((OUT/'staging-browser-checks.json').read_text())
            if staging['phase']!='complete' or staging['expected']!=expected or tests['summary']['passed']!=tests['summary']['total'] or tests['payload']!=expected or tests['httpOnly'] or tests['summary']['total']<450 or datetime.fromisoformat(tests['finishedAt'].replace('Z','+00:00'))<=datetime.fromisoformat(staging['finished_at']):
                raise RuntimeError('Exact verified staging payload and browser evidence required')
            for name,value in files.items():
                if base.common.retrieve_file(ftp,base.remote_root('staging')+'/'+name)!=value: raise RuntimeError('Staging bytes changed')
        checkpoint=backup(args.environment,before,existing)
        report.update(backup=str(checkpoint.relative_to(ROOT)),backup_sha256=base.sha(checkpoint.read_bytes()),phase='publishing')
        base.common.store2.ensure_dir(ftp,base.remote_root(args.environment)+'/ktk-site-integrations-assets')
        try:
            for name in FILES:
                if name in report['changed']: base.atomic_upload(ftp,base.remote_root(args.environment)+'/'+name,files[name])
            after=snapshot(ftp,args.environment,purge=True)
            report['after']=public_snapshot(after)
            if after['owned']!=expected or after['protected']!=before['protected'] or after['wordpress_state_sha256']!=before['wordpress_state_sha256'] or not after['origin_cache_cleared'] or after['shared_policy_loaded']!=version:
                raise RuntimeError('Shared release verification failed')
            if after['effective_divi_legacy_present'] or any(row['code_bytes'] not in (None,0) for row in after['effective_snippets']):
                raise RuntimeError('A legacy integration is still active; unsafe to remove saved injections')
            report['phase']='complete'
        except Exception:
            report['phase']='rolling-back'
            for name in reversed(FILES):
                target=base.remote_root(args.environment)+'/'+name
                if name in existing: base.atomic_upload(ftp,target,existing[name])
                else: base.remove_file(ftp,target)
            restored=snapshot(ftp,args.environment,purge=True)
            report['rollback_verified']=restored['owned']==before['owned'] and restored['protected']==before['protected']
            report['phase']='rolled-back' if report['rollback_verified'] else 'rollback-needs-review'
            raise
    finally:
        ftp.close()
        report['finished_at']=datetime.now(timezone.utc).isoformat()
        suffix='audit' if args.audit else 'publish' if args.publish else 'dry-run'
        (OUT/(args.environment+'-'+suffix+'.json')).write_text(json.dumps(report,indent=2),encoding='utf-8')
        print(json.dumps({key:report.get(key) for key in ('environment','phase','changed','backup','backup_sha256')}))


if __name__=='__main__': main()
