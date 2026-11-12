<?php
error_reporting(E_ALL);
define('ABSPATH', __DIR__);
$home = 'https://krawlthroughkrakow.com/';
$_SERVER['HTTP_HOST'] = 'krawlthroughkrakow.com';
$admin = false;
$checks = 0;
function home_url($path) { return $GLOBALS['home']; }
function is_admin() { return $GLOBALS['admin']; }
function esc_js($value) { return addslashes($value); }
function add_filter(...$args) {}
function add_action(...$args) {}
class WP_HTML_Tag_Processor {
    private $html;
    function __construct($html) { $this->html = $html; }
    function next_tag($name) { return true; }
    function get_attribute($name) {
        preg_match('/^<script\b([^>]*)>/i', $this->html, $tag);
        return preg_match('/\s' . $name . '\s*=\s*(["\x27])(.*?)\1/i', $tag[1] ?? '', $match) ? $match[2] : null;
    }
}
class WP_REST_Response {
    function __construct(private $data, private $status = 200) {}
    function get_status() { return $this->status; }
    function get_data() { return $this->data; }
    function set_data($value) { $this->data = $value; }
}
class Request {
    function __construct(private $route, private $method = 'GET') {}
    function get_route() { return $this->route; }
    function get_method() { return $this->method; }
}
function check($condition, $message) {
    $GLOBALS['checks']++;
    if (!$condition) { throw new RuntimeException($message); }
}
require dirname(__DIR__, 2) . '/staging/wp-content/mu-plugins/ktk-clarity.php';
$snippet = <<<'HTML'
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "ufswk29c79");
</script>
HTML;
foreach (array($snippet, str_replace('"', "'", $snippet), str_replace('ufswk29c79', KTK_CLARITY_PROJECT_ID, $snippet)) as $variant) {
    check('' === ktk_clarity_remove_legacy_html($variant), 'Standard loader must be suppressed');
}
$other = '<meta name="google-site-verification" content="test"><script>gtag("config","AW-956184209");</script><script>var attribution="trk_utm_source";</script>';
check($other === ktk_clarity_remove_legacy_html($other . $snippet), 'Other integrations preserved byte for byte');
$mixed = str_replace('</script>', 'window.otherIntegration=true;</script>', $snippet);
check($mixed === ktk_clarity_remove_legacy_html($mixed), 'Mixed script never discarded');
check('' === ktk_clarity_remove_legacy_html('<script async src="https://www.clarity.ms/tag/ufswk29c79"></script>'), 'Direct loader removed');
$unrelated = '<script src="https://example.com/clarity.ms/tag/project"></script>';
check($unrelated === ktk_clarity_remove_legacy_html($unrelated), 'Unrelated host retained');
$options = array('head' => $snippet . $other, 'nested' => array('enabled' => true, 'count' => 12));
$filtered = ktk_clarity_filter_saved_integrations($options);
check($filtered['head'] === $other && $options['head'] === $snippet . $other && $filtered['nested'] === $options['nested'], 'Settings only filtered in memory');
$admin = true;
check($options === ktk_clarity_filter_saved_integrations($options), 'Admin saved settings unchanged');
$admin = false;
ob_start(); ktk_clarity_output_loader(); $output = ob_get_clean();
check(ktk_clarity_enabled() && substr_count($output, KTK_CLARITY_PROJECT_ID) === 1 && !str_contains($output, 'ufswk29c79'), 'Production uses owned project once');
$config = array('enabled' => true, 'projectId' => 'ufswk29c79', 'samplePercent' => 20, 'requireAnalyticsConsent' => true);
$pricing = array('total' => 120, 'discountTotal' => 10, 'cartVersion' => 'original', 'journeyReplay' => $config, 'storefrontConfig' => array('journeyReplay' => $config));
foreach (array('/config', '/products', '/products/pub-crawl-28', '/cart/quote') as $path) {
    $response = new WP_REST_Response($pricing);
    ktk_clarity_filter_replay_config($response, null, new Request('/ktk-storefront/v1' . $path, $path === '/cart/quote' ? 'POST' : 'GET'));
    $expected = $pricing;
    $expected['journeyReplay']['projectId'] = KTK_CLARITY_PROJECT_ID;
    $expected['storefrontConfig']['journeyReplay']['projectId'] = KTK_CLARITY_PROJECT_ID;
    check($expected === $response->get_data(), 'Only project changes for ' . $path);
}
foreach (array('/staging/', '/', '/another-path/') as $path) {
    $home = $path === '/' ? 'https://another-host.com/' : 'https://krawlthroughkrakow.com' . $path;
    check(!ktk_clarity_enabled(), 'Nonproduction excluded');
    ob_start(); ktk_clarity_output_loader(); $output = ob_get_clean();
    check($output === '', 'No loader outside production');
    $response = new WP_REST_Response(array('journeyReplay' => $config));
    ktk_clarity_filter_replay_config($response, null, new Request('/ktk-storefront/v1/config'));
    check($response->get_data()['journeyReplay']['enabled'] === false, 'Replay disabled outside production');
}
$home = 'https://krawlthroughkrakow.com/';
foreach (array(array('/ktk-storefront/v1/checkout','POST',200), array('/other/v1/config','GET',200), array('/ktk-storefront/v1/config','GET',503)) as [$route,$method,$status]) {
    $response = new WP_REST_Response($pricing, $status);
    ktk_clarity_filter_replay_config($response, null, new Request($route, $method));
    check($response->get_data() === $pricing && $response->get_status() === $status, 'Payments, other APIs and errors untouched');
}
echo "Clarity policy: $checks/$checks passed\n";
