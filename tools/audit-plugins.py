"""Read installed-plugin dependencies; never deactivate, uninstall or change settings."""
import argparse
import importlib.util
import json
import secrets
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('plugin_audit_wpcode', ROOT / 'tools/audit-wpcode.py')
wpcode = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(wpcode)
base = wpcode.base

EXTENSION = wpcode.EXTENSION + r'''
    unset($extension['private_wpcode_backup']);
    $selected_names = array('wp_rocket_settings','facebook_business_extension_config','facebook_config',
        'facebook_fbl4b_config','facebook_capi_integration_status','facebook_capi_integration_events_filter',
        'iubenda_cookie_law_solution','iubenda_global_options','iubenda_privacy_policy',
        'iubenda_consent_solution','iubenda_terms_conditions','ecwid_store_id','ecwid_store_page_id',
        'eps_redirects','eps_redirects_settings','eps_redirects_options','updraft_interval','updraft_interval_database','updraft_service');
    $config_hashes=array(); $config=array();
    foreach ($selected_names as $name) {
        $raw=$wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name=%s",$name));
        $config_hashes[$name]=hash('sha256',(string)$raw); $config[$name]=maybe_unserialize($raw);
    }
    $table=$wpdb->prefix.'redirects';
    $table_exists=$wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like($table)))===$table;
    $redirects=$table_exists ? $wpdb->get_results("SELECT id,url_from,url_to,status,type FROM `$table` ORDER BY id",ARRAY_A) : array();
    foreach ($redirects as &$redirect) {
        $redirect['resolved_target']=('url'===$redirect['type'] && !is_numeric($redirect['url_to'])) ? html_entity_decode(urldecode($redirect['url_to'])) : get_permalink((int)$redirect['url_to']);
    } unset($redirect);
    $forms=$wpdb->get_results("SELECT ID,post_status FROM {$wpdb->posts} WHERE post_type='wpcf7_contact_form' ORDER BY ID",ARRAY_A);
    $published=$wpdb->get_results("SELECT ID,post_name,post_type,post_content FROM {$wpdb->posts} WHERE post_status='publish' AND post_type IN ('page','post','project') ORDER BY ID",ARRAY_A);
    $stored_references=array();
    foreach ($published as $post) {
        foreach (array('cf7'=>'/\[contact-form-7\b/i','ecwid'=>'/\[(?:ecwid|ecwid_product|ecwid_productbrowser)\b/i','revslider'=>'/\[(?:rev_slider|rev_slider_vc)\b/i') as $kind=>$pattern) {
            if (preg_match($pattern,$post['post_content'])) { $stored_references[]=array('post_id'=>(int)$post['ID'],'kind'=>$kind,'url'=>get_permalink((int)$post['ID'])); }
        }
    }
    $rendered=array(); $registry=function_exists('ktk_pages_registry') ? ktk_pages_registry() : array('routes'=>array(),'redirects'=>array());
    foreach ($registry['routes'] as $route=>$entry) {
        $page=ktk_pages_definition($route); $html=$page['html'] ?? '';
        if (!empty($page['main_file']) && preg_match('#^content/[a-z0-9-]+\.html$#D',$page['main_file'])) { $html=file_get_contents(__DIR__.'/ktk-code-pages-assets/'.$page['main_file']); }
        $ids=array(); $processor=new WP_HTML_Tag_Processor($html);
        while ($processor->next_tag('INPUT')) { if ($processor->get_attribute('name')==='_wpcf7') { $ids[]=(string)$processor->get_attribute('value'); } }
        $rendered[]=array('route'=>$route,'cf7_ids'=>$ids,'native_form_count'=>count($page['forms'] ?? array()),
            'ecwid_widget'=>str_contains($html,'xProductBrowser(') || str_contains($html,'data-ktk-ecwid'),
            'revslider_widget'=>str_contains($html,'rev_slider') || str_contains($html,'rs-module'));
    }
    $rocket=is_array($config['wp_rocket_settings']) ? $config['wp_rocket_settings'] : array(); $rocket_flags=array();
    foreach (array('cache_mobile','minify_css','minify_js','defer_all_js','delay_js','lazyload','lazyload_iframes','remove_unused_css','async_css') as $key) { $rocket_flags[$key]=!empty($rocket[$key]); }
    $fb=is_array($config['facebook_business_extension_config']) ? $config['facebook_business_extension_config'] : array();
    $old=is_array($config['facebook_config']) ? $config['facebook_config'] : array();
    $fbl=is_array($config['facebook_fbl4b_config']) ? $config['facebook_fbl4b_config'] : array();
    $fbclass='FacebookPixelPlugin\\Core\\FacebookWordpressOptions';
    $pixel=class_exists($fbclass) ? $fbclass::get_active_pixel_id() : ($fb['facebook_pixel_id'] ?? ($old['pixel_id'] ?? ''));
    $token=class_exists($fbclass) ? $fbclass::get_active_access_token() : ($fb['facebook_pixel_access_token'] ?? ($old['access_token'] ?? ''));
    $iub=is_array($config['iubenda_cookie_law_solution']) ? $config['iubenda_cookie_law_solution'] : array();
    $iub_flags=array(); foreach (array('parse','skip_parsing','block_gtm','amp_support','integrate_with_wp_consent_api') as $key) { $iub_flags[$key]=!empty($iub[$key]); }
    $wf_table=$wpdb->prefix.'wfconfig';
    $wf_exists=$wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like($wf_table)))===$wf_table;
    $wf=$wf_exists ? $wpdb->get_results("SELECT name,val FROM `$wf_table` WHERE name IN ('scheduledScansEnabled','loginSec_bruteForceEnable','firewallEnabled','liveTrafficEnabled') ORDER BY name",ARRAY_A) : array();
    $wf_flags=array(); foreach ($wf as $row) { $wf_flags[$row['name']]=(string)$row['val']; }
    $root_files=array(); foreach (array('.user.ini','.htaccess','wordfence-waf.php') as $name) {
        $path=ABSPATH.$name; $bytes=is_file($path) ? file_get_contents($path) : '';
        $root_files[$name]=array('exists'=>is_file($path),'sha256'=>hash('sha256',$bytes),'has_wordfence_marker'=>stripos($bytes,'wordfence')!==false);
    }
    $dropins=array(); foreach (get_dropins() as $file=>$data) { $path=WP_CONTENT_DIR.'/'.$file; $dropins[]=array('file'=>$file,'name'=>$data['Name'],'sha256'=>hash_file('sha256',$path)); }
    $mu=array(); foreach (get_mu_plugins() as $file=>$data) { if (str_starts_with($file,'ktk-plugin-audit-')) { continue; } $mu[]=array('file'=>$file,'name'=>$data['Name'],'version'=>$data['Version']); }
    $history=get_option('updraft_backup_history',array()); $history=is_array($history) ? $history : array();
    $timestamps=array_filter(array_keys($history),'is_numeric');
    $redirect_semantics=array();
    foreach (array(array('EPS_Redirects','format_from_url'),array('EPS_Redirects_Plugin','protect_from_translation_plugins')) as $method) {
        if (!method_exists($method[0],$method[1])) { continue; }
        $reflection=new ReflectionMethod($method[0],$method[1]);
        $source=implode('',array_slice(file($reflection->getFileName()),$reflection->getStartLine()-1,$reflection->getEndLine()-$reflection->getStartLine()+1));
        $redirect_semantics[$method[1]]=array('sha256'=>hash('sha256',$source),'lowercases'=>str_contains($source,'strtolower('),
            'trims_trailing_slash'=>str_contains($source,'rtrim('),'decodes_url'=>str_contains($source,'urldecode('));
    }
    $extension=array_merge($extension,array('config_hashes'=>$config_hashes,'redirect_table_exists'=>$table_exists,'redirects'=>$redirects,
        'cf7_definitions'=>$forms,'stored_references'=>$stored_references,'rendered_dependencies'=>$rendered,'code_redirects'=>$registry['redirects'],
        'redirect_plugin_semantics'=>$redirect_semantics,
        'rocket_flags'=>$rocket_flags,'wp_cache_defined'=>defined('WP_CACHE') && WP_CACHE,'dropins'=>$dropins,'mu_plugins'=>$mu,
        'meta'=>array('pixel_configured'=>!empty($pixel),'pixel_sha256'=>hash('sha256',(string)$pixel),'server_token_configured'=>!empty($token),
            'capi_setting'=>$config['facebook_capi_integration_status'],'capi_filter'=>$config['facebook_capi_integration_events_filter'],
            'fbl4b_configured'=>!empty($fbl)),
        'iubenda'=>array('configuration_type'=>$iub['configuration_type'] ?? null,'flags'=>$iub_flags,'option_present'=>!empty($iub)),
        'ecwid'=>array('store_id_configured'=>!empty($config['ecwid_store_id']),'store_page_id'=>(int)$config['ecwid_store_page_id']),
        'updraft'=>array('files_schedule'=>$config['updraft_interval'],'database_schedule'=>$config['updraft_interval_database'],
            'remote_service_configured'=>!empty($config['updraft_service']) && $config['updraft_service']!==array('none') && $config['updraft_service']!=='none',
            'recorded_backup_count'=>count($history),'latest_recorded_at'=>empty($timestamps) ? null : gmdate('c',(int)max($timestamps))),
        'wordfence_flags'=>$wf_flags,'root_files'=>$root_files,'auto_prepend_wordfence'=>str_contains((string)ini_get('auto_prepend_file'),'wordfence'),
        'plugin_audit_state_sha256'=>hash('sha256',wp_json_encode(array($config_hashes,$redirects,$forms,$stored_references,$wf,$root_files,$dropins,$redirect_semantics)))));
'''


def redirect_coverage(snapshot):
    coverage = []
    for row in snapshot['redirects']:
        if str(row['status']) == 'inactive':
            continue
        route = '/' + row['url_from'].lstrip('/')
        code = snapshot['code_redirects'].get(route)
        coverage.append({'id': row['id'], 'route': route,
                         'exact_stored_source_covered': bool(code) and str(code['status']) == str(row['status'])
                         and urljoin(snapshot['home_url'], code['target'].lstrip('/')) == row['resolved_target']})
    return coverage


def assess(snapshot):
    active = {row['file'].split('/')[0] for row in snapshot['plugins'] if row['active']}
    return {
        'wpcode_present': any(row['file'].startswith('insert-headers-and-footers/') for row in snapshot['plugins']),
        'active_plugin_count': len(active),
        'active_redirect_count': sum(str(row['status']) != 'inactive' for row in snapshot['redirects']),
        'cf7_rendered_routes': [row['route'] for row in snapshot['rendered_dependencies'] if row['cf7_ids']],
        'native_form_routes': [row['route'] for row in snapshot['rendered_dependencies'] if row['native_form_count']],
        'redirect_coverage': redirect_coverage(snapshot),
        'redirect_variant_parity_verified': False,
        'removal_authorized': False,
    }


def unchanged(before, after):
    keys = ('protected', 'wordpress_state_sha256', 'wpcode_state_sha256', 'plugins',
            'plugin_audit_state_sha256', 'mu_plugins', 'rendered_dependencies', 'code_redirects')
    return all(before[key] == after[key] for key in keys)


def snapshot(ftp, environment):
    token = secrets.token_urlsafe(32)
    helper = base.remote_root(environment) + '/ktk-plugin-audit-' + secrets.token_hex(8) + '.php'
    mu_root = ROOT / 'staging/wp-content/mu-plugins'
    extra = tuple(sorted(path.name for path in mu_root.glob('ktk-*.php'))) + (
        'ktk-site-integrations-assets/site.js', 'ktk-site-integrations-assets/site.css')
    try:
        base.atomic_upload(ftp, helper, base.helper_source(environment, token, False, owned_files=(), extra_protected=extra, snapshot_extension=EXTENSION))
        url = 'https://krawlthroughkrakow.com/' + ('staging/' if environment == 'staging' else '')
        request = urllib.request.Request(url + '?ktk_plugin_audit=' + secrets.token_hex(8), headers={
            'X-KTK-Deploy-Token': token, 'Cache-Control': 'no-cache', 'User-Agent': 'KTK read-only plugin dependencies/1.0'})
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
    stable = unchanged(before, after)
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'environment': args.environment,
              'readOnly': True, 'stateAndFilesUnchanged': stable, 'helpersRemoved': True,
              'inventory': after, 'summary': assess(after)}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    if not stable:
        raise RuntimeError('Configuration/files changed during audit; retained report requires review')
    print(json.dumps({key: report[key] for key in ('environment', 'readOnly', 'stateAndFilesUnchanged', 'helpersRemoved', 'summary')}))


if __name__ == '__main__':
    main()
