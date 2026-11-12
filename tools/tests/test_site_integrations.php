<?php
error_reporting(E_ALL);
define('ABSPATH', __DIR__);
$root = dirname(__DIR__, 2);
$home = 'https://krawlthroughkrakow.com';
$_SERVER['HTTP_HOST'] = 'krawlthroughkrakow.com';
$_SERVER['REQUEST_URI'] = '/unmanaged/';
$admin = false; $managed = false; $checks = 0; $filters = array(); $actions = array(); $assets = array(); $posts = array();
function check($condition, $message) { $GLOBALS['checks']++; if (!$condition) { throw new RuntimeException($message); } }
function add_filter($hook, $callback, $priority=10, $accepted=1) { $GLOBALS['filters'][$hook][$priority][] = $callback; }
function add_action($hook, $callback, $priority=10) { $GLOBALS['actions'][$hook][$priority][] = $callback; }
function apply_filters($hook, $value) { $filters=$GLOBALS['filters'][$hook] ?? array(); ksort($filters); foreach ($filters as $callbacks) { foreach ($callbacks as $callback) { $value=$callback($value); } } return $value; }
function is_admin() { return $GLOBALS['admin']; }
function home_url($path='/') { return $GLOBALS['home'] . $path; }
function content_url($path='') { return home_url('/wp-content' . $path); }
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES); }
function esc_url($value) { return esc_attr($value); }
function esc_js($value) { return addslashes($value); }
function wp_json_encode($value) { return json_encode($value); }
function get_post($id) { return $GLOBALS['posts'][$id] ?? null; }
function wp_enqueue_script(...$args) { $GLOBALS['assets']['script'][]=$args; }
function wp_enqueue_style(...$args) { $GLOBALS['assets']['style'][]=$args; }
function wp_add_inline_script(...$args) { $GLOBALS['assets']['inline'][]=$args; }
function ktk_homepage_shortcode_is_replica_page() { return $GLOBALS['managed']; }
class WP_Post { public $ID; public $post_type='wpcode'; public $post_content; }
class WP_HTML_Tag_Processor {
    private $html; private $attributes='';
    function __construct($html) { $this->html=$html; }
    function next_tag($name=null) {
        $pattern='/<'.($name ? preg_quote($name,'/') : '[a-z]+').'\b([^>]*)>/i';
        if (!preg_match($pattern,$this->html,$match)) { return false; }
        $this->attributes=$match[1]; return true;
    }
    function get_attribute($name) {
        if (preg_match('/\b'.preg_quote($name,'/').'\s*=\s*(["\x27])(.*?)\1/i',$this->attributes,$match)) { return html_entity_decode($match[2],ENT_QUOTES); }
        return null;
    }
}
require $root . '/staging/wp-content/mu-plugins/ktk-site-integrations.php';
require $root . '/staging/wp-content/plugins/insert-headers-and-footers/includes/class-wpcode-snippet.php';
$fixtures = __DIR__ . '/fixtures/shared-integrations/';
$menu = '<script>'.file_get_contents($fixtures.'mobile.js').'</script>';
$timer = '<script>'.file_get_contents($fixtures.'countdown.js').'</script>';
$gtm = '<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({\'gtm.start\':new Date().getTime(),event:\'gtm.js\'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=\'dataLayer\'?\'&l=\'+l:\'\';j.async=true;j.src=\'//www.googletagmanager.com/gtm.js?id=\'+i+dl;f.parentNode.insertBefore(j,f);})(window,document,\'script\',\'dataLayer\',\'GTM-PHXGRZ\');</script>';
$frame='<noscript><iframe src="//www.googletagmanager.com/ns.html?id=GTM-PHXGRZ" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>';
$meta='<meta name="google-site-verification" content="'.KTK_SITE_VERIFICATION.'" />';
foreach (array($menu,$timer,$gtm,$frame,$meta) as $legacy) { check(''===ktk_site_remove_legacy_divi_html($legacy),'Known legacy block suppressed'); }
foreach (array('!=','!==') as $comparison) { foreach (array('//','https://') as $protocol) {
    $variant=str_replace(array('!=','//www.googletagmanager.com/'),array($comparison,$protocol.'www.googletagmanager.com/'),$gtm);
    check(''===ktk_site_remove_legacy_divi_html($variant),'Canonical GTM variations suppressed');
    check(''===ktk_site_remove_legacy_divi_html(str_replace("'",'"',$variant)),'Double-quoted GTM suppressed');
} }
$mixed=str_replace('</script>','window.otherService=true;</script>',$gtm);
check($mixed===ktk_site_remove_legacy_divi_html($mixed),'Mixed script preserved');
$other='<meta name="google-site-verification" content="another-token"><script>window.unrelated=true;</script>';
check($other===ktk_site_remove_legacy_divi_html($meta.$menu.$gtm.$timer.$frame.$other),'Other tags preserved exactly');
$options=array('divi_integration_head'=>$meta.$menu.$other,'divi_integration_body'=>$gtm.$timer.$frame,'other_setting'=>$gtm);
$filtered=ktk_site_filter_divi_options($options);
check($filtered['divi_integration_head']===$other && $filtered['divi_integration_body']==='' && $filtered['other_setting']===$gtm,'Only integration fields changed in memory');
check($filtered===ktk_site_filter_divi_options(array('divi_integration_head'=>$other,'divi_integration_body'=>'','other_setting'=>$gtm)),'Removing exact retired Divi blocks leaves effective settings identical');
check($options['divi_integration_body']===$gtm.$timer.$frame,'Original settings not mutated');
foreach (array(9132=>'utm.html',8798=>'floating.php') as $id=>$file) {
    $code=file_get_contents($fixtures.$file);
    check(ktk_site_is_replaced_snippet($id,$code),'Audited snippet fingerprint recognized');
    check(!ktk_site_is_replaced_snippet($id+1,$code),'Different snippet ID preserved');
    check(!ktk_site_is_replaced_snippet($id,$code.'echo "new feature";'),'Modified snippet preserved');
    $data=array('id'=>$id,'code'=>$code,'code_type'=>$id===8798?'php':'html','title'=>'Original title','auto_insert'=>true);
    $snippet=new WPCode_Snippet($data);
    check($snippet->get_code()==='' && $snippet->get_title()==='Original title','Actual WPCode constructor suppresses cached code before execution');
    check((new WPCode_Snippet(array_merge($data,array('code'=>''))))->get_code()===$snippet->get_code(),'Removing exact retired WPCode source leaves effective code identical');
    check($data['code']===$code,'Original snippet/cache data not mutated');
    $post=new WP_Post();$post->ID=$id;$post->post_content=$code;$posts[$id]=$post;
    check((new WPCode_Snippet($id))->get_code()==='' && (new WPCode_Snippet($post))->get_code()==='','Uncached and post-object WPCode loads suppressed');
    check($post->post_content===$code,'Original post not mutated');
}
$admin=true;
check($options===ktk_site_filter_divi_options($options),'Admin settings unchanged');
check((new WPCode_Snippet($data))->get_code()===$data['code'],'Admin snippets unchanged');
ob_start();ktk_site_gtm_head();ktk_site_verification_head();ktk_site_floating_cta();check(ob_get_clean()==='','No frontend output in admin');
$admin=false;
check(!function_exists('ktk_site_google_consent_default') && !isset($actions['wp_head'][PHP_INT_MIN]),'Declined consent-default experiment is not registered');
ob_start();ktk_site_gtm_head();$head=ob_get_clean();
check(substr_count($head,'GTM-PHXGRZ')===1 && str_contains($head,'id="ktk-gtm-loader"'),'Production code owns GTM');
check(ktk_site_remove_legacy_divi_html($head)===$head,'New guarded GTM not mistaken for legacy');
define('KTK_HOMEPAGE_GTM_ID', KTK_SITE_GTM_ID);
require $root . '/staging/wp-content/mu-plugins/ktk-homepage-assets/integrations.php';
$managed=true;
check(ktk_homepage_filter_hook_html($head)===$head,'Migrated page capture retains shared GTM without requiring a duplicate');
$managed=false;
ob_start();ktk_site_gtm_body();ktk_site_gtm_body();$body=ob_get_clean();
check(substr_count($body,'<iframe')===1,'Body-open/footer fallback does not duplicate noscript');
ob_start();ktk_site_floating_cta();$cta=ob_get_clean();
check(str_contains($cta,'/store2/pub-crawl-28/#book') && str_contains($cta,'data-ktk-site-cta'),'Regular fallback CTA uses new storefront');
$_SERVER['REQUEST_URI']='/staging/new-years-eve/';$home.='/staging';
ob_start();ktk_site_floating_cta();$cta=ob_get_clean();
check(str_contains($cta,'/staging/store2/nye-pub-crawl-32/#book'),'NYE fallback CTA stays in its environment and uses new product');
ob_start();ktk_site_gtm_head();check(ob_get_clean()==='','Staging legacy/store GTM behavior unchanged');
foreach (array('/store','/store/','/store2','/store2/cart/','/staging/store/Legacy-product','/staging/store2/checkout/success') as $path) {
    check(ktk_site_is_store_path($path),'Store path boundary recognized');
    $_SERVER['REQUEST_URI']=$path;ob_start();ktk_site_floating_cta();check(ob_get_clean()==='','No hidden/duplicate CTA emitted in stores');
}
foreach (array('/storehouse/','/store20/','/staging/storefront/','/about-us/') as $path) { check(!ktk_site_is_store_path($path),'Unrelated path not hidden'); }
$managed=true;$assets=array();$_SERVER['REQUEST_URI']='/';
ktk_site_enqueue_legacy_helpers();ob_start();ktk_site_floating_cta();
check($assets===array() && ob_get_clean()==='','Migrated page assets and CTA remain independently owned');
$managed=false;$assets=array();$_SERVER['REQUEST_URI']='/unmanaged/';
ktk_site_enqueue_legacy_helpers();
$inline=json_decode(rtrim(substr($assets['inline'][0][1],strlen('window.KTK_SITE_INTEGRATIONS=')),';'),true);
check(count($assets['script'])===1 && count($assets['style'])===1 && $inline['regularBooking']==='https://krawlthroughkrakow.com/staging/store2/pub-crawl-28/#book','Legacy assets are versioned and environment aware');
$exclusions=ktk_site_rocket_exclusions(array('existing-script'));
foreach (array('existing-script','__ktkSiteGtmLoaded','ktk-site-integrations-assets/site.js','window.KTK_SITE_INTEGRATIONS') as $required) {
    check(in_array($required,$exclusions,true),'Shared integration helpers retain original optimization exclusions');
}
check($exclusions===ktk_site_rocket_exclusions($exclusions),'Optimization exclusions are idempotent');
check(!isset($filters['rocket_minify_excluded_external_js']) && !in_array('__ktkClarityConsentBridge',$exclusions,true),'Staging-only consent optimization changes are reverted');
echo "Shared integrations: $checks/$checks passed\n";
