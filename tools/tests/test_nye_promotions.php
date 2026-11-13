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
$guide = require $assets . 'pages/post-new-years-eve-in-krakow.php';
$guide_body = str_replace('__KTK_PAGE_MAIN_CONTENT__', file_get_contents($assets . $guide['main_file']), file_get_contents($assets . $guide['shell_file']));
$original_guide = parse_markup($guide_body);
verify($guide['event_promotion']['ends_at'] === 1798801200 && count($guide['event_promotion']['replacements']) === 1, 'Guide has one exact same-cutoff control');
verify(!isset($guide['event_promotion']['expired_head']), 'Guide does not invent a new Article head');
foreach (array(1798801199, 1798801200, 1798801201, 1830337200) as $timestamp) {
    $expired = $timestamp >= 1798801200;
    $rendered = ktk_pages_event_promotion_body($guide_body, $guide, $timestamp);
    $dom = parse_markup($rendered);
    verify(ktk_pages_event_promotion_expired($guide, $timestamp) === $expired, 'Guide boundary');
    verify($expired || $rendered === $guide_body, 'Guide before-cutoff source is exact');
    verify($dom->query('//h2[@id="book-nye"]/a')->length === 1, 'Guide meaningful heading/anchor preserved');
    verify($dom->query('//h2[@id="book-nye"]/a[contains(@href,"store2/nye-pub-crawl-32/")]')->length === ($expired ? 0 : 1), 'Guide checkout is current only');
    verify($dom->query('//h2[@id="book-nye"]/a[contains(@href,"new-years-eve/#nye-updates") and text()="Next NYE dates to be announced"]')->length === ($expired ? 1 : 0), 'Guide future label and information destination');
    verify($dom->query('//h1')->length === 1, 'Guide keeps sole article H1');
    verify($dom->query('//img')->length === $original_guide->query('//img')->length, 'Guide images preserved');
    verify($dom->query('//a[contains(@href,"pub-crawl-28/")]')->length === $original_guide->query('//a[contains(@href,"pub-crawl-28/")]')->length, 'Regular guide destinations unchanged');
    verify(ktk_pages_event_page_state($guide, $timestamp) === $guide, 'Guide title/byline/dates/descriptions/sharing/schema remain exact');
    verify(ktk_pages_event_promotion_body($rendered, $guide, $timestamp) === $rendered, 'Guide server transition is idempotent');
}
$other_guide = $guide; $other_guide['key'] = 'post-krakow-new-years-eve';
verify(ktk_pages_event_promotion_body($guide_body, $other_guide, 1798801201) === $guide_body, 'No blanket seasonal rewrite of other articles');
$stale_guide = $guide; $stale_guide['event_promotion']['replacements'][0][0] = 'Changed guide target';
try { ktk_pages_event_promotion_body($guide_body, $stale_guide, 1798801201); verify(false, 'Stale guide target must stop'); }
catch (RuntimeException $error) { verify(true, 'Stale guide rejected before mutation'); }
$registry = require $assets . 'registry.php'; $incoming = array();
foreach ($registry['routes'] as $entry) {
    $candidate = require $assets . $entry['file'];
    $candidate_body = str_replace('__KTK_PAGE_MAIN_CONTENT__', file_get_contents($assets . $candidate['main_file']), file_get_contents($assets . $candidate['shell_file']));
    $candidate_dom = parse_markup($candidate_body);
    $links = $candidate_dom->query('//a[contains(@href,"store2/nye-pub-crawl-32/")]');
    if (!$links->length) { continue; }
    $incoming[$candidate['key']] = $links->length;
    verify(in_array($candidate['key'], array('new-years-eve', 'post-new-years-eve-in-krakow'), true), 'New incoming NYE page requires an explicit cutoff policy');
    verify(($candidate['event_promotion']['ends_at'] ?? null) === 1798801200, 'Every incoming promotion shares the confirmed deadline');
    foreach ($links as $link) {
        verify($link->getAttribute('data-ktk-expired-href') === '__KTK_HOME_URL__new-years-eve/#nye-updates', 'Every incoming NYE control has the reviewed information destination');
        verify($link->getAttribute('data-ktk-event-promotion') === 'nye' || $candidate_dom->query('ancestor::*[@data-ktk-event-promotion="nye"]', $link)->length === 1, 'Every incoming NYE control belongs to its native lifecycle root');
    }
    verify(parse_markup(ktk_pages_event_promotion_body($candidate_body, $candidate, 1798801200))->query('//a[contains(@href,"store2/nye-pub-crawl-32/")]')->length === 0, 'No expired NYE checkout remains in any registered content page');
}
ksort($incoming);
verify($incoming === array('new-years-eve' => 8, 'post-new-years-eve-in-krakow' => 1), 'Complete registered incoming NYE inventory remains explicit');
$_GET['ktk_hero'] = 'halloween';
verify(ktk_homepage_seasonal_hero(1798801199) === ktk_homepage_seasonal_hero(1798801201), 'Halloween preview is untouched by NYE cutoff');
echo "NYE promotion PHP: $checks/$checks passed; no requests, orders or settings changed\n";
