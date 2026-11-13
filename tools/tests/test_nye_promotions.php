<?php
define('ABSPATH', dirname(__DIR__, 2));
function add_action(...$args) {}
function home_url($path) { return 'https://krawlthroughkrakow.com/staging' . $path; }
function content_url($path) { return home_url('/wp-content' . $path); }
function esc_attr($value) { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function esc_url($value) { return esc_attr($value); }
function ktk_homepage_is_staging() { return true; }
function ktk_homepage_asset($file) { return '/assets/' . $file; }
function ktk_homepage_product_url($slug) { return home_url('/store2/' . $slug . '/#book'); }
function ktk_homepage_icon($name, $class) { return '<svg class="' . esc_attr($class) . '"></svg>'; }
function ktk_homepage_review_sources() { return array(); }
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-homepage-assets/hero.php';
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-code-pages.php';
$assets = ABSPATH . '/staging/wp-content/mu-plugins/ktk-code-pages-assets/';
$page = require $assets . 'pages/new-years-eve.php';
$body = str_replace('__KTK_PAGE_MAIN_CONTENT__', file_get_contents($assets . $page['main_file']), file_get_contents($assets . $page['shell_file']));
$checks = 0;
function verify($pass, $name) { global $checks; $checks++; if (!$pass) { throw new RuntimeException($name); } }
function parse_markup($html) { $dom = new DOMDocument(); @$dom->loadHTML('<?xml encoding="UTF-8">' . $html); return new DOMXPath($dom); }

verify($page['event_promotion']['ends_at'] === 1798801200, 'Exact owner-approved noon epoch');
verify(count($page['event_promotion']['replacements']) === 11, 'Complete countdown/eight links/two copy targets');
foreach (array(1798801199, 1798801200, 1798801201, 1830337200) as $timestamp) {
    $expired = $timestamp >= 1798801200;
    verify(ktk_homepage_nye_promotion_expired($timestamp) === $expired, 'Hero boundary');
    verify(ktk_pages_event_promotion_expired($page, $timestamp) === $expired, 'Page boundary');
    $hero = parse_markup(ktk_homepage_seasonal_hero($timestamp));
    verify($hero->query('//*[@class="ktk-hero-times"]')->length === ($expired ? 0 : 1), 'Hero group visibility');
    verify($hero->query('//a[@data-product-id="28" and contains(@href,"pub-crawl-28/")]')->length === 1, 'Regular crawl remains bookable');
    verify($hero->query('//a[@data-product-id="32"]')->length === ($expired ? 0 : 1), 'No past-product booking identity');
    verify($hero->query('//article[@data-campaign="nye"]//a[contains(@class,"ktk-hero-cta") and @href="https://krawlthroughkrakow.com/staging/new-years-eve/"]')->length === ($expired ? 1 : 0), 'Hero information destination');
    verify($hero->query('//text()[contains(.,"Next dates to be announced")]')->length === ($expired ? 1 : 0), 'Hero TBA is visible text, not only data');
    verify($hero->query('//*[local-name()="text" and text()="2027"]')->length === 1, 'Welcome flag stays historical, never auto-rolls');
    $rendered = ktk_pages_event_promotion_body($body, $page, $timestamp);
    $dom = parse_markup($rendered);
    verify($dom->query('//h1')->length === 1, 'One actual page H1');
    verify($dom->query('//*[@id="nye-updates" and not(ancestor::template)]')->length === ($expired ? 1 : 0), 'Future notice state');
    verify($dom->query('//a[contains(@href,"store2/nye-pub-crawl-32/")]')->length === ($expired ? 0 : 8), 'All eight event booking destinations transition');
    verify($dom->query('//a[@data-ktk-event-link and contains(@href,"new-years-eve/#nye-updates")]')->length === ($expired ? 8 : 0), 'All eight current-date updates destinations');
    verify($dom->query('//*[contains(concat(" ",normalize-space(@class)," ")," et_pb_countdown_timer ")]')->length === ($expired ? 0 : 1), 'Past countdown becomes useful notice');
    $head = ktk_pages_event_page_state($page, $timestamp);
    verify(str_contains($head['description'], 'Next dates are to be announced') === $expired, 'Server metadata matches visible state');
    verify(str_contains($head['metadata'], 'Next dates are to be announced') === $expired, 'Sharing metadata state');
    verify(ktk_pages_event_promotion_body($rendered, $page, $timestamp) === $rendered, 'Server transition is idempotent');
    if (!$expired) { verify($rendered === $body && $head === $page, 'Before-cutoff markup and head remain exact'); }
}
foreach (array(null, 'invalid', 1798801200.0) as $invalid) {
    if (null === $invalid) { continue; }
    foreach (array('hero', 'page') as $kind) {
        try { if ('hero' === $kind) { ktk_homepage_nye_promotion_expired($invalid); } else { ktk_pages_event_promotion_expired($page, $invalid); } verify(false, 'Reject ambiguous timestamp'); }
        catch (InvalidArgumentException $error) { verify(true, 'Explicit timestamp guard'); }
    }
}
$other = $page; $other['key'] = 'how-to-join';
verify(ktk_pages_event_promotion_body($body, $other, 1798801201) === $body, 'Unrelated page is byte-identical');
$stale = $page; $stale['event_promotion']['replacements'][10][0] = 'A changed final target';
try { ktk_pages_event_promotion_body($body, $stale, 1798801201); verify(false, 'Stale source must stop'); }
catch (RuntimeException $error) { verify(true, 'Stale source rejected before any replacement'); }
$_GET['ktk_hero'] = 'halloween';
verify(ktk_homepage_seasonal_hero(1798801199) === ktk_homepage_seasonal_hero(1798801201), 'Halloween preview is untouched by NYE cutoff');
echo "NYE promotion PHP: $checks/$checks passed; no requests, orders or settings changed\n";
