<?php
define('ABSPATH', dirname(__DIR__, 2));
$home = 'https://krawlthroughkrakow.com/staging';
$is_page = true;
$is_feed = false;
$is_embed = false;
function home_url($path) { global $home; return $home . $path; }
function site_url($path) { return ($GLOBALS['site'] ?? $GLOBALS['home']) . $path; }
function content_url($path) { global $home; return $home . '/wp-content' . $path; }
function is_page($slug) { global $is_page; return $is_page && $slug === 'how-to-join'; }
function is_feed() { global $is_feed; return $is_feed; }
function is_embed() { global $is_embed; return $is_embed; }
function add_action(...$args) {}
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function esc_url($value) { return esc_attr($value); }
function esc_js($value) { return addslashes($value); }
function admin_url($path) { return home_url('/wp-admin/' . $path); }
function rest_url($path) { return home_url('/wp-json/' . $path); }
function wp_salt($purpose) { return 'test-only'; }
function wp_create_nonce($action) { return 'test-only'; }
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-code-pages.php';
$checks = 0;
function check($condition, $message) { global $checks; $checks++; if (!$condition) { throw new RuntimeException($message); } }
$_SERVER['REQUEST_URI'] = '/staging/about-us/how-to-join/';
check(ktk_pages_shortcode_is_replica_page(), 'Staging page selected');
$_SERVER['REQUEST_URI'] .= '?utm_source=test';
check(ktk_pages_shortcode_is_replica_page(), 'Query does not alter route');
foreach (array('/staging/', '/staging/store/', '/staging/store2/', '/staging/about-us/how-to-join-extra/', '/about-us/how-to-join/', '/staging/unknown/') as $path) {
    $_SERVER['REQUEST_URI'] = $path;
    check(!ktk_pages_shortcode_is_replica_page(), 'Unrelated route isolated: ' . $path);
}
$_SERVER['REQUEST_URI'] = '/staging/about-us/how-to-join/';
$home = 'https://krawlthroughkrakow.com';
check(!ktk_pages_shortcode_is_replica_page(), 'Never active on production');
$home = 'https://krawlthroughkrakow.com/staging';
$is_feed = true;
check(!ktk_pages_shortcode_is_replica_page(), 'Feed isolated');
$is_feed = false; $is_embed = true;
check(!ktk_pages_shortcode_is_replica_page(), 'Embed isolated');
$is_embed = false;
$_SERVER['HTTP_HOST'] = 'krawlthroughkrakow.com';
$legacy_brunch = '/staging/store/Bottomless-Brunch-p661114244';
check(ktk_pages_staging_brunch_alias($legacy_brunch) === home_url('/store2/bottomless-brunch-29/#book'), 'Approved exact staging brunch alias');
check(ktk_pages_staging_brunch_alias($legacy_brunch . '?utm_source=partner&gclid=example') === home_url('/store2/bottomless-brunch-29/?utm_source=partner&gclid=example#book'), 'Legacy attribution preserved, never invented');
foreach (array('/store/Bottomless-Brunch-p661114244', '/staging/store/', '/staging/store/cart/', '/staging/store/Bottomless-Brunch-p661114244/', '/staging/store/Other-p123', '/staging/store2/cart/', $legacy_brunch . "?x=\r\n") as $path) {
    check(null === ktk_pages_staging_brunch_alias($path), 'Other legacy/private/unsafe route is untouched');
}
$_SERVER['REQUEST_METHOD'] = 'POST';
check(null === ktk_pages_staging_brunch_alias($legacy_brunch), 'No commerce POST redirection');
$_SERVER['REQUEST_METHOD'] = 'HEAD';
check(null !== ktk_pages_staging_brunch_alias($legacy_brunch), 'HEAD shares safe GET redirect');
$_SERVER['REQUEST_METHOD'] = 'GET';
$home = 'https://krawlthroughkrakow.com';
check(null === ktk_pages_staging_brunch_alias($legacy_brunch), 'No production alias activation');
$home = 'https://krawlthroughkrakow.com/staging'; $GLOBALS['site'] = 'https://other.example/staging';
check(null === ktk_pages_staging_brunch_alias($legacy_brunch), 'Site identity required');
unset($GLOBALS['site']); $_SERVER['HTTP_HOST'] = 'other.example';
check(null === ktk_pages_staging_brunch_alias($legacy_brunch), 'Foreign host is excluded');
$_SERVER['HTTP_HOST'] = 'krawlthroughkrakow.com';
check(count(ktk_pages_registry()['routes']) === 116, 'Complete explicit registry');
foreach (ktk_pages_registry()['routes'] as $route => $entry) {
    $_SERVER['REQUEST_URI'] = '/staging' . $route;
    check(ktk_pages_shortcode_is_replica_page(), 'Explicit content route: ' . $route);
    check(ktk_pages_definition()['key'] === $entry['key'], 'Matching content definition');
}
$_SERVER['REQUEST_URI'] = '/staging/about-us/how-to-join/';
$body = ktk_pages_static_body();
foreach (array('HOW TO JOIN THE PUB CRAWL', '9 PM EVERY NIGHT', 'ADAM STATUE', '120 zl', 'RESERVE YOUR SPOT!', 'THE MEETING POINT', 'Follow us!', 'Contact us:') as $text) {
    check(str_contains($body, $text), 'Complete content: ' . $text);
}
check(!preg_match('/<script\b|\son\w+\s*=/i', $body), 'No captured scripts/handlers');
check(!str_contains($body, '__KTK_'), 'All portable tokens resolved');
check(!preg_match('#href="https://krawlthroughkrakow.com/(?!staging/)#', $body), 'All internal navigation remains in staging');
check(str_contains($body, '/staging/store2/pub-crawl-28/#book'), 'Correct staging booking target');
check(substr_count($body, 'data-ktk-embed-src=') === 2 && substr_count($body, 'src="about:blank"') === 2, 'Map requests withheld before consent');
check(!preg_match('/codex-test|test-click-id|utm_source=/i', $body), 'No test attribution baked into links');
$head = ktk_pages_required_head_html('');
foreach (array('ktk-gtm-loader', 'ktk-google-ads-loader', 'ktk-clarity-loader', 'ktk-iubenda-widget', 'google-site-verification') as $id) check(substr_count($head, $id) === 1, 'One integration: ' . $id);
$foreign = '<script src="https://example.test/unrelated.js"></script>';
check(ktk_pages_filter_hook_html($foreign) === $foreign, 'Unrelated integration retained');
check(ktk_pages_filter_hook_html('<script src="/wp-content/themes/Divi/runtime.js"></script>') === '', 'Divi runtime removed');
$home = 'https://krawlthroughkrakow.com';
check(ktk_pages_filter_hook_html($foreign) === $foreign, 'No production integration filtering');
check(!ktk_pages_is_production_enabled(), 'Production requires explicit opt-in');
define('KTK_CODE_PAGES_PRODUCTION_ENABLED', true);
foreach (ktk_pages_registry()['routes'] as $route => $entry) {
    $_SERVER['REQUEST_URI'] = $route;
    check(ktk_pages_shortcode_is_replica_page(), 'Opted-in production route: ' . $route);
    $page = ktk_pages_definition();
    $policy = ktk_pages_page_policy($page);
    check($policy['robots'] === array(array('name' => 'robots', 'content' => 'max-image-preview:large')), 'Preserve source indexing policy');
    check(null === $policy['x_robots_tag'], 'Do not copy staging noindex header to production');
    check($policy['canonical'] === ('post-krakow-team-building-activities' === $entry['key'] ? array() : array(home_url($route))), 'Preserve source canonical presence/value');
}
foreach (array('/', '/store/', '/store2/', '/wp-admin/', '/wp-json/', '/unknown/', '/staging/contact/') as $route) {
    $_SERVER['REQUEST_URI'] = $route;
    check(!ktk_pages_shortcode_is_replica_page(), 'Opt-in still excludes protected routes: ' . $route);
}
$_SERVER['REQUEST_URI'] = '/contact/';
foreach (array('http://krawlthroughkrakow.com', 'https://example.test', 'https://krawlthroughkrakow.com/clone', 'https://krawlthroughkrakow.com:444') as $invalid_home) {
    $home = $invalid_home;
    check(!ktk_pages_shortcode_is_replica_page(), 'Production opt-in is bound to canonical site: ' . $home);
}
$home = 'https://krawlthroughkrakow.com';
$_SERVER['HTTP_HOST'] = 'www.krawlthroughkrakow.com';
check(!ktk_pages_shortcode_is_replica_page(), 'Leave hostname aliases to the existing WordPress redirect');
$_SERVER['HTTP_HOST'] = 'krawlthroughkrakow.com';
$is_feed = true;
check(!ktk_pages_shortcode_is_replica_page(), 'Production feed isolated');
$is_feed = false; $is_embed = true;
check(!ktk_pages_shortcode_is_replica_page(), 'Production embed isolated');
$is_embed = false;
$home = 'https://krawlthroughkrakow.com/staging';
$_SERVER['REQUEST_URI'] = '/staging/contact/';
check(ktk_pages_page_policy(ktk_pages_definition())['robots'][0]['content'] === 'noindex, nofollow', 'Staging stays noindex even with production opt-in');
echo "Code page integration: {$checks}/{$checks} passed\n";
