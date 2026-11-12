<?php
define('ABSPATH', dirname(__DIR__, 2));
$home = 'https://krawlthroughkrakow.com/staging';
$site = $home; $filters = array(); $actions = array(); $checks = 0; $storefront = false;
$_SERVER['HTTP_HOST'] = 'krawlthroughkrakow.com';
$_SERVER['REQUEST_URI'] = '/staging/store2/pub-crawl-28/?utm_source=real';
function home_url($path = '/') { return $GLOBALS['home'] . $path; }
function site_url($path = '/') { return $GLOBALS['site'] . $path; }
function add_filter($name, $callback, $priority = 10) { $GLOBALS['filters'][$name][$callback] = $priority; }
function remove_filter($name, $callback) { unset($GLOBALS['filters'][$name][$callback]); }
function add_action($name, $callback, $priority = 10) { $GLOBALS['actions'][$name][$callback] = $priority; }
function check($pass, $name) { $GLOBALS['checks']++; if (!$pass) { throw new RuntimeException($name); } }
class KTK_Storefront { static function is_storefront_request() { return $GLOBALS['storefront']; } }
class WP_Sitemaps_Renderer {
    function __construct() {
        check(isset($GLOBALS['filters']['wp_sitemaps_stylesheet_url']['ktk_seo_preview_no_stylesheet']), 'Preview has no broken core stylesheet');
    }
    function get_sitemap_xml($rows) { $GLOBALS['rendered_rows'] = $rows; return '<urlset/>'; }
    function get_sitemap_index_xml($rows) { $GLOBALS['rendered_rows'] = $rows; return '<sitemapindex/>'; }
}
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-seo-sitemap.php';
$data = ktk_seo_discovery_data();
$policy = json_decode(file_get_contents(ABSPATH . '/tools/seo-discovery-policy.json'), true);
check(count($data['content']) === 116 && count($data['storefront']) === count($policy['products']) + 1 && $data['products'] === $policy['products'], 'Exact reviewed preview scope');
check(ktk_seo_discovery_is_staging(), 'Staging identity accepted');
ktk_seo_discovery_register();
check($filters['wp_robots']['ktk_seo_staging_storefront_robots'] === PHP_INT_MAX, 'Robots override follows storefront index filter');
$initial = array('index' => true, 'follow' => true, 'max-image-preview' => 'large', 'custom' => true);
foreach (array('/staging/store2', '/staging/store2/', '/staging/store2/pub-crawl-28/', '/staging/store2/nye-pub-crawl-32/?gclid=real', '/staging/store2/cart/', '/staging/store2/checkout/') as $path) {
    $_SERVER['REQUEST_URI'] = $path;
    $actual = ktk_seo_staging_storefront_robots($initial);
    check(isset($actual['noindex'], $actual['nofollow'], $actual['custom']) && !isset($actual['index'], $actual['follow']), $path . ' remains noindex');
    $headers = ktk_seo_staging_storefront_headers(array('x-robots-tag' => 'index', 'Other' => 'preserved'));
    check($headers === array('Other' => 'preserved', 'X-Robots-Tag' => 'noindex, nofollow'), $path . ' response header consistent');
}
foreach (array('/staging/store/', '/staging/store20/', '/staging/store2-other/', '/staging/wp-json/ktk-storefront/v1/products', '/staging/about-us/', '/store2/') as $path) {
    $_SERVER['REQUEST_URI'] = $path;
    check(ktk_seo_staging_storefront_robots($initial) === $initial, $path . ' untouched');
    check(ktk_seo_staging_storefront_headers(array('Other' => 'same')) === array('Other' => 'same'), $path . ' headers untouched');
}
$storefront = true; $_SERVER['REQUEST_URI'] = '/staging/?ktk_storefront=1';
check(isset(ktk_seo_staging_storefront_robots($initial)['noindex']), 'Resolved storefront aliases are protected');
$storefront = false;
foreach (array('sitemap.xml' => 'index', 'content.xml' => 'content', 'storefront.xml' => 'storefront', 'robots.txt' => 'robots') as $path => $kind) {
    $_SERVER['REQUEST_URI'] = '/staging/seo-preview/' . $path . '?ignored=1';
    check(ktk_seo_preview_route() === $kind, 'Exact preview route ' . $path);
    check(is_string(ktk_seo_preview_document($kind)), 'Preview document ' . $kind);
}
check($rendered_rows === $data['storefront'], 'Native formatter gets canonical product rows');
ktk_seo_preview_document('index');
check($rendered_rows === array(array('loc' => $home . '/seo-preview/content.xml'), array('loc' => $home . '/seo-preview/storefront.xml')), 'Index points to actual staging preview children');
check(empty($filters['wp_sitemaps_stylesheet_url']) && empty($filters['wp_sitemaps_stylesheet_index_url']), 'Temporary stylesheet filters removed');
foreach (array('/staging/wp-sitemap.xml', '/staging/robots.txt', '/staging/seo-preview/other.xml', '/seo-preview/sitemap.xml') as $path) {
    $_SERVER['REQUEST_URI'] = $path;
    check(ktk_seo_preview_route() === '', 'Unknown/native endpoint not intercepted: ' . $path);
}
foreach (array('https://krawlthroughkrakow.com', 'https://example.com/staging', 'http://krawlthroughkrakow.com/staging', 'https://krawlthroughkrakow.com/staging-other') as $wrong) {
    $home = $wrong; $site = $wrong; $filters = array(); $actions = array();
    $_SERVER['REQUEST_URI'] = '/staging/store2/pub-crawl-28/';
    ktk_seo_discovery_register();
    check(!$filters && !$actions && !ktk_seo_discovery_is_staging(), 'No production/foreign activation: ' . $wrong);
    check(ktk_seo_staging_storefront_robots($initial) === $initial, 'Foreign robots untouched');
}
$home = 'https://krawlthroughkrakow.com/staging'; $site = $home;
foreach (array('www.krawlthroughkrakow.com', 'krawlthroughkrakow.com:443', 'example.com') as $host) {
    $_SERVER['HTTP_HOST'] = $host;
    check(!ktk_seo_discovery_is_staging(), 'Host guard: ' . $host);
}
$_SERVER['HTTP_HOST'] = 'krawlthroughkrakow.com';
foreach (array('https://krawlthroughkrakow.com/staging/', 'https://krawlthroughkrakow.com/krakow-pub-crawl/?utm_source=x', 'https://other.com/', 'https://krawlthroughkrakow.com/store2/cart/', 'https://krawlthroughkrakow.com/store2/checkout/confirmation/') as $url) {
    $broken = $data; $broken['content'][0] = array('loc' => $url);
    try { ktk_seo_validate_discovery_data($broken); throw new LogicException('Invalid URL accepted'); }
    catch (RuntimeException $error) { check(true, 'Invalid URL rejected'); }
}
$broken = $data; $broken['content'][] = $data['content'][0];
try { ktk_seo_validate_discovery_data($broken); throw new LogicException('Duplicate accepted'); }
catch (RuntimeException $error) { check(true, 'Duplicate rejected'); }
check(!str_contains(json_encode(array_merge($data['content'], $data['storefront'])), 'lastmod'), 'Unknown modification dates are not invented');
echo "SEO discovery PHP contracts: $checks/$checks passed\n";
