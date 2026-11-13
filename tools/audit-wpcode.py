"""Inventory WPCode without deactivating plugins, changing settings or clearing caches."""
import argparse
import importlib.util
import json
import secrets
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('wpcode_audit_base', ROOT / 'tools/publish-clarity.py')
base = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(base)

EXTENSION = r'''
    require_once ABSPATH . 'wp-admin/includes/plugin.php';
    $active = (array)get_option('active_plugins',array()); $plugins = array();
    foreach (get_plugins() as $file=>$plugin) {
        $plugins[] = array('file'=>$file,'name'=>$plugin['Name'],'version'=>$plugin['Version'],'active'=>in_array($file,$active,true));
    }
    $snippet_rows = $wpdb->get_results("SELECT ID,post_title,post_content,post_status FROM {$wpdb->posts} WHERE post_type='wpcode' ORDER BY ID",ARRAY_A);
    $snippets = array(); $private_posts = array();
    foreach ($snippet_rows as $row) {
        $id=(int)$row['ID']; $code=$row['post_content'];
        $replaced=function_exists('ktk_site_is_replaced_snippet') && ktk_site_is_replaced_snippet($id,$code);
        $snippets[] = array('id'=>$id,'title'=>$row['post_title'],'status'=>$row['post_status'],
            'code_bytes'=>strlen(trim($code)),'replaced_by_owned_code'=>$replaced,
            'effective_code_bytes'=>class_exists('WPCode_Snippet') ? strlen(trim((new WPCode_Snippet($id))->get_code())) : null);
        $private_posts[] = array('post'=>$row,'meta'=>get_post_meta($id));
    }
    $injections = array(); $private_options = $wpdb->get_results("SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name LIKE 'wpcode%' OR option_name IN ('ihaf_insert_header','ihaf_insert_body','ihaf_insert_footer') ORDER BY option_name",ARRAY_A);
    foreach (array('ihaf_insert_header','ihaf_insert_body','ihaf_insert_footer') as $key) {
        $raw=$wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name=%s",$key));
        $injections[$key]=array('code_bytes'=>strlen(trim((string)$raw)),'sha256'=>hash('sha256',(string)$raw));
    }
    $cached_records = array(); $cached_raw = null;
    foreach ($private_options as $row) { if ($row['option_name']==='wpcode_snippets') { $cached_raw=maybe_unserialize($row['option_value']); } }
    $walk = static function($node) use (&$walk,&$cached_records) {
        if (!is_array($node)) { return; }
        if (isset($node['id'],$node['code']) && is_string($node['code'])) {
            $cached_records[]=array('id'=>(int)$node['id'],'code_bytes'=>strlen(trim($node['code'])),
                'replaced_by_owned_code'=>function_exists('ktk_site_is_replaced_snippet') && ktk_site_is_replaced_snippet($node['id'],$node['code']));
        }
        foreach ($node as $value) { if (is_array($value)) { $walk($value); } }
    };
    $walk($cached_raw);
    $references=$wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_status='publish' AND (post_content LIKE '%[wpcode%' OR post_content LIKE '%[insert_php%') ORDER BY ID");
    $page_meta=$wpdb->get_results("SELECT m.post_id,m.meta_key,m.meta_value FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID=m.post_id WHERE p.post_type<>'wpcode' AND (m.meta_key LIKE 'wpcode%' OR m.meta_key LIKE '\\_wpcode%') ORDER BY m.post_id,m.meta_key",ARRAY_A);
    $settings=get_option('wpcode_settings',array());
    $extension=array('plugins'=>$plugins,'snippets'=>$snippets,'global_injections'=>$injections,'cached_snippets'=>$cached_records,
        'published_shortcode_reference_ids'=>array_map('intval',$references),'page_meta_count'=>count($page_meta),
        'uninstall_data_enabled'=>!empty($settings['uninstall_data']),
        'wpcode_state_sha256'=>hash('sha256',wp_json_encode(array($private_options,$private_posts,$page_meta))),
        'shared_integrations_version'=>defined('KTK_SITE_INTEGRATIONS_VERSION') ? KTK_SITE_INTEGRATIONS_VERSION : null,
        'private_wpcode_backup'=>array('options'=>$private_options,'posts'=>$private_posts,'page_meta'=>$page_meta));
'''


def assess(snapshot):
    blockers = []
    for row in snapshot['snippets']:
        if row['status'] in ('publish', 'future') and row['code_bytes'] and not row['replaced_by_owned_code']:
            blockers.append({'kind': 'active_snippet', 'id': row['id']})
        if row['status'] == 'publish' and row['replaced_by_owned_code'] and row['effective_code_bytes'] not in (None, 0):
            blockers.append({'kind': 'replacement_not_suppressed', 'id': row['id']})
    for key, value in snapshot['global_injections'].items():
        if value['code_bytes']:
            blockers.append({'kind': 'global_injection', 'option': key})
    for row in snapshot['cached_snippets']:
        if row['code_bytes'] and not row['replaced_by_owned_code']:
            blockers.append({'kind': 'cached_snippet', 'id': row['id']})
    if snapshot['published_shortcode_reference_ids']:
        blockers.append({'kind': 'published_shortcode_references', 'count': len(snapshot['published_shortcode_reference_ids'])})
    if snapshot['page_meta_count']:
        blockers.append({'kind': 'page_scripts_require_review', 'count': snapshot['page_meta_count']})
    return {'removal_candidate': not blockers and snapshot['shared_integrations_version'] == '2026.11.06.1', 'blockers': blockers}


def snapshot(ftp, environment):
    token = secrets.token_urlsafe(32)
    helper = base.remote_root(environment) + '/ktk-wpcode-audit-' + secrets.token_hex(8) + '.php'
    extra = ('ktk-site-integrations.php', 'ktk-site-integrations-assets/site.js', 'ktk-site-integrations-assets/site.css')
    try:
        base.atomic_upload(ftp, helper, base.helper_source(environment, token, False, owned_files=(), extra_protected=extra, snapshot_extension=EXTENSION))
        url = 'https://krawlthroughkrakow.com/' + ('staging/' if environment == 'staging' else '')
        request = urllib.request.Request(url + '?ktk_wpcode_audit=' + secrets.token_hex(8), headers={
            'X-KTK-Deploy-Token': token, 'Cache-Control': 'no-cache', 'User-Agent': 'KTK read-only WPCode inventory/1.0'})
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.load(response)
        if result['home_url'] != url or result['blog_public'] != (0 if environment == 'staging' else 1) or result['origin_cache_cleared']:
            raise RuntimeError('Audit identity/indexing/cache boundary failed')
        return result
    finally:
        base.remove_file(ftp, helper)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--environment', choices=('staging', 'production'), required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError('Preserve previous audit; select a new report path')
    ftp = base.common.StagingFTP()
    try:
        before = snapshot(ftp, args.environment)
        after = snapshot(ftp, args.environment)
    finally:
        ftp.close()
    unchanged = all(before[key] == after[key] for key in ('protected', 'wordpress_state_sha256', 'wpcode_state_sha256', 'plugins'))
    if not unchanged:
        raise RuntimeError('Saved state/files changed during audit; do not recommend removal')
    checkpoint = ROOT / 'deploy-backups' / ('wpcode-audit-' + args.environment + '-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f') + '.zip')
    raw = json.dumps(before['private_wpcode_backup'], indent=2).encode()
    with zipfile.ZipFile(checkpoint, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('wpcode-private.json', raw)
    with zipfile.ZipFile(checkpoint) as archive:
        if archive.read('wpcode-private.json') != raw:
            raise RuntimeError('Private audit checkpoint verification failed')
    public = {key: value for key, value in after.items() if key != 'private_wpcode_backup'}
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'environment': args.environment, 'readOnly': True,
              'stateAndFilesUnchanged': unchanged, 'helpersRemoved': True, 'backup': str(checkpoint.relative_to(ROOT)),
              'backupSha256': base.sha(checkpoint.read_bytes()), 'inventory': public, **assess(after)}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in ('environment', 'readOnly', 'stateAndFilesUnchanged', 'helpersRemoved', 'removal_candidate', 'blockers', 'backup')}))


if __name__ == '__main__':
    main()
