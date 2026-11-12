<?php
/** Run with: php tools/tests/test_homepage_integration.php */
error_reporting( E_ALL );
define( 'ABSPATH', dirname( __DIR__, 2 ) );
$ktk_test_front_page = true;
$ktk_test_home = 'https://krawlthroughkrakow.com/staging';
$ktk_test_environment = 'staging';
$ktk_test_actions = array();
$ktk_test_shortcodes = array();
$ktk_test_head = '';
$ktk_test_footer = '';

function add_action( $hook, $callback, $priority = 10 ) { $GLOBALS['ktk_test_actions'][ $hook ][ $priority ][] = $callback; }
function remove_action( $hook, $callback, $priority = 10 ) {}
function add_shortcode( $tag, $callback ) {
    if ( preg_match( '@[<>&/\[\]\x00-\x20=]@', $tag ) ) { throw new RuntimeException( 'WordPress rejects this shortcode tag: ' . $tag ); }
    $GLOBALS['ktk_test_shortcodes'][ $tag ] = $callback;
}
function is_front_page() { return $GLOBALS['ktk_test_front_page']; }
function is_page( $slug ) { return false; }
function home_url( $path = '/' ) { return $GLOBALS['ktk_test_home'] . $path; }
function content_url( $path = '' ) { return home_url( '/wp-content' . $path ); }
function wp_get_environment_type() { return $GLOBALS['ktk_test_environment']; }
function wp_json_encode( $value, $flags = 0 ) { return json_encode( $value, $flags ); }
function esc_attr( $value ) { return htmlspecialchars( $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' ); }
function esc_html( $value ) { return esc_attr( $value ); }
function esc_url( $value ) { return esc_attr( $value ); }
function esc_js( $value ) { return addslashes( $value ); }
function wp_head() { echo $GLOBALS['ktk_test_head']; }
function wp_footer() { echo $GLOBALS['ktk_test_footer']; }
function wp_dequeue_script( $handle ) { $GLOBALS['wp_scripts']->queue = array_values( array_diff( $GLOBALS['wp_scripts']->queue, array( $handle ) ) ); }
function wp_deregister_script( $handle ) { unset( $GLOBALS['wp_scripts']->registered[ $handle ] ); }
function wp_dequeue_style( $handle ) { $GLOBALS['wp_styles']->queue = array_values( array_diff( $GLOBALS['wp_styles']->queue, array( $handle ) ) ); }
function wp_deregister_style( $handle ) { unset( $GLOBALS['wp_styles']->registered[ $handle ] ); }
function ktk_test_check( $condition, $message ) { if ( ! $condition ) { throw new RuntimeException( $message ); } }
function ktk_test_asset( $deps = array(), $src = '' ) { return (object) array( 'src' => $src, 'deps' => $deps ); }

$template = file_get_contents( dirname( __DIR__ ) . '/homepage-shortcode-plugin-template.php' );
$template = strtr( $template, array(
    '__DIR__' => var_export( ABSPATH . '/staging/wp-content/mu-plugins', true ),
    '__CONTENT_FILE__' => 'ktk-homepage-shortcode-content.php',
    '__PAGE_SLUG__' => 'homepage-shortcode', '__SHORTCODE__' => '[ktk_homepage]',
    '__SOURCE_TITLE_JSON__' => '"Fixture"', '__SOURCE_EXPORTED_AT_JSON__' => '"2026-10-06T00:00:00Z"',
    '__SOURCE_SHA256__' => str_repeat( 'a', 64 ),
) );
eval( '?>' . $template );

$ktk_test_head = <<<'HTML'
<title>Old WordPress title</title><meta name="description" content="Old description"><meta name="robots" content="index, follow">
<meta property="og:title" content="Old Open Graph"><meta name="twitter:card" content="summary">
<meta name="google-site-verification" content="verification"><link rel="canonical" href="https://old.example/"><link rel="icon" href="favicon.png">
<link rel="alternate" type="application/rss+xml" href="https://example.test/feed/"><link rel="https://api.w.org/" href="/wp-json/">
<script type="application/ld+json">{"@type":"WebPage","name":"Old schema"}</script>
<script src="https://embeds.iubenda.com/widgets/92c90d2a-9d50-4f09-9c21-bcb72ccc2897.js"></script>
<script id="facebook-signal-js" src="facebook_signal.js"></script><script>fbq('init', 'existing'); var example = '<link rel="prefetch" href="example">';</script>
<link rel="stylesheet" id="contact-form-7-css" href="/plugins/contact-form-7/style.css">
<script id="ecwid-frontend-js-js" src="/plugins/ecwid-shopping-cart/frontend.js"></script>
<script id="iubenda-forms-js" src="forms.js"></script><script id="iubenda-cons-cdn-js" src="cons.js"></script>
<style id="ktk-homepage-header-inline-css">.ktk-homepage-header { font-size: 90px; }</style>
HTML;
$ktk_test_footer = <<<'HTML'
<a id="ktk-cta" href="store">BOOK NOW</a><style>#ktk-cta{position:fixed}</style><script>document.getElementById('ktk-cta');</script>
<noscript><img src="https://www.facebook.com/tr?id=existing" alt=""></noscript>
<script id="iubenda-wp-consent-api-integration-js" src="consent-api.js"></script>
HTML;
$wp_scripts = (object) array( 'registered' => array(), 'queue' => array() );
$wp_styles = (object) array( 'registered' => array(), 'queue' => array() );

$clean = ktk_homepage_captured_head();
foreach ( array( '<title', 'og:title', 'canonical', 'ld+json', 'contact-form-7', 'ecwid-', 'iubenda-forms', 'iubenda-cons-cdn', 'ktk-homepage-header', 'application/rss', '/wp-json/' ) as $removed ) {
    ktk_test_check( false === strpos( $clean, $removed ), 'Unexpected retained output: ' . $removed );
}
foreach ( array( 'google-site-verification', 'rel="icon"', 'embeds.iubenda', 'facebook-signal', 'fbq(', 'var example' ) as $retained ) {
    ktk_test_check( false !== strpos( $clean, $retained ), 'Missing integration: ' . $retained );
}
$footer = ktk_homepage_captured_footer();
ktk_test_check( false === strpos( $footer, 'ktk-cta' ), 'Legacy floating CTA remains' );
ktk_test_check( false !== strpos( $footer, 'facebook.com/tr?' ), 'Existing Meta noscript pixel removed' );
ktk_test_check( false !== strpos( $footer, 'consent-api.js' ), 'Consent API integration removed' );

$full = ktk_homepage_required_head_html( $clean );
ktk_test_check( 1 === substr_count( $full, 'embeds.iubenda.com/widgets/' ), 'Duplicate Iubenda widget' );
ktk_test_check( 1 === substr_count( $full, 'id="ktk-gtm-loader"' ), 'GTM loader missing or duplicated' );
ktk_test_check( 1 === substr_count( $full, 'id="ktk-clarity-loader"' ), 'Clarity loader missing or duplicated' );
ktk_test_check( 1 === substr_count( $full, 'id="ktk-google-ads-loader"' ), 'Google Ads loader missing or duplicated' );
ktk_test_check( trim( ktk_homepage_required_head_html( $full ) ) === trim( $full ), 'Required integrations are not idempotent' );
ktk_test_check( strpos( $full, 'ktk-clarity-consent-bridge' ) < strpos( $full, 'ktk-clarity-loader' ), 'Clarity loads before its consent bridge' );

$production_gtm = <<<'HTML'
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PHXGRZ');</script>
HTML;
foreach ( array( '!=', '!==' ) as $comparison ) {
    foreach ( array( '//', 'https://' ) as $protocol ) {
        $variant = str_replace( array( '!=', '//www.googletagmanager.com/' ), array( $comparison, $protocol . 'www.googletagmanager.com/' ), $production_gtm );
        ktk_test_check( '' === ktk_homepage_filter_hook_html( $variant ), 'Supported standalone GTM bootstrap remains in captured output' );
        ktk_test_check( '' === ktk_homepage_filter_hook_html( str_replace( "'", '"', $variant ) ), 'Double-quoted standalone GTM bootstrap remains in captured output' );
    }
}
$original_head = $ktk_test_head;
$original_footer = $ktk_test_footer;
$ktk_test_head .= $production_gtm;
$ktk_test_footer .= $production_gtm;
foreach ( range( 1, 2 ) as $capture ) {
    $captured_head = ktk_homepage_required_head_html( ktk_homepage_captured_head() );
    $captured_footer = ktk_homepage_captured_footer();
    ktk_test_check( 1 === substr_count( $captured_head . $captured_footer, 'googletagmanager.com/gtm.js?id=' ), 'Head/footer captures must produce exactly one GTM bootstrap' );
    ktk_test_check( false === strpos( $captured_footer, 'GTM-PHXGRZ' ), 'The legacy production footer GTM loader remains' );
    ktk_test_check( 1 === substr_count( $captured_head, 'id="ktk-gtm-loader"' ), 'The single GTM loader must be code-managed in the head' );
}
$other_gtm = str_replace( 'GTM-PHXGRZ', 'GTM-UNRELATED', $production_gtm );
$mixed_gtm = str_replace( '</script>', "window.keepOtherIntegration = true;</script>", $production_gtm );
foreach ( array( $other_gtm, $mixed_gtm, '<script>window.notes = "GTM-PHXGRZ googletagmanager.com/gtm.js?id=";</script>' ) as $unrelated ) {
    ktk_test_check( $unrelated === ktk_homepage_filter_hook_html( $unrelated ), 'GTM cleanup removed a different container or mixed integration block' );
}
$ktk_test_front_page = false;
ktk_test_check( $production_gtm === ktk_homepage_filter_hook_html( $production_gtm ), 'Production GTM must remain untouched on non-homepage routes' );
$ktk_test_front_page = true;
$ktk_test_head = $original_head;
$ktk_test_footer = $original_footer;

$production_divi_late_css = <<<'HTML'
<script type="application/javascript">
            (function() {
                var file     = ["https:\/\/krawlthroughkrakow.com\/wp-content\/et-cache\/278\/et-divi-dynamic-278-late.css"];
                var handle   = document.getElementById('divi-style-inline-inline-css');
                var location = handle.parentNode;

                if (0===document.querySelectorAll('link[href="' + file + '"]').length) {
                    var link  = document.createElement('link');
                    link.rel  = 'stylesheet';
                    link.id   = 'et-dynamic-late-css';
                    link.href = file;

                    location.insertBefore(link, handle.nextSibling);
                }
            })();
        </script>
HTML;
ktk_test_check( '' === ktk_homepage_filter_hook_html( $production_divi_late_css ), 'The production Divi late-CSS loader must not dereference its removed style handle' );
foreach ( array(
    str_replace( '</script>', 'window.keepOtherIntegration = true;</script>', $production_divi_late_css ),
    str_replace( 'et-divi-dynamic-278-late.css', 'unrelated.css', $production_divi_late_css ),
    '<script>document.querySelector("#other-style").parentNode; window.marker = "et-dynamic-late-css";</script>',
) as $unrelated ) {
    ktk_test_check( $unrelated === ktk_homepage_filter_hook_html( $unrelated ), 'Divi late-CSS cleanup removed an unrelated or mixed script' );
}
$ktk_test_footer .= $production_divi_late_css;
ktk_test_check( false === strpos( ktk_homepage_captured_footer(), 'et-dynamic-late-css' ), 'Captured footer still contains Divi late-CSS bootstrap' );
$ktk_test_front_page = false;
ktk_test_check( $production_divi_late_css === ktk_homepage_filter_hook_html( $production_divi_late_css ), 'Other Divi pages must keep their late-CSS loader' );
$ktk_test_front_page = true;
$ktk_test_footer = $original_footer;

ob_start();
ktk_homepage_metadata();
$metadata = ob_get_clean();
$head = $metadata . $full;
foreach ( array( '<title', 'name="description"', 'name="robots"', 'rel="canonical"', 'property="og:title"', 'name="twitter:card"', 'type="application/ld+json"' ) as $unique ) {
    ktk_test_check( 1 === substr_count( $head, $unique ), 'Missing or duplicate SEO metadata: ' . $unique );
}
ktk_test_check( false !== strpos( $head, 'noindex, nofollow' ), 'Staging must not be indexed' );
ktk_test_check( false !== strpos( $head, 'href="https://krawlthroughkrakow.com/staging/"' ), 'Staging canonical is incorrect' );

$ktk_test_front_page = false;
ktk_test_check( ktk_homepage_filter_hook_html( $ktk_test_head ) === $ktk_test_head, 'Another page was altered' );
ktk_test_check( '' === ktk_homepage_required_body_open_html(), 'Another page got a GTM noscript' );
$wp_scripts->queue = array( 'contact-form-7' );
$wp_scripts->registered = array( 'contact-form-7' => ktk_test_asset() );
ktk_homepage_prepare_assets();
ktk_test_check( array( 'contact-form-7' ) === $wp_scripts->queue, 'Form scripts removed from another page' );
$ktk_test_front_page = true;

$wp_styles = (object) array( 'registered' => array( 'contact-form-7' => ktk_test_asset() ), 'queue' => array( 'contact-form-7' ) );
$wp_scripts = (object) array( 'registered' => array(
    'jquery' => ktk_test_asset( array( 'jquery-core' ) ), 'jquery-core' => ktk_test_asset(),
    'iubenda-forms' => ktk_test_asset( array( 'jquery' ) ), 'facebook-signal' => ktk_test_asset(),
), 'queue' => array( 'jquery', 'jquery-core', 'iubenda-forms', 'facebook-signal' ) );
ktk_homepage_prepare_assets();
ktk_test_check( array( 'facebook-signal' ) === $wp_scripts->queue, 'Unused form/jQuery scripts remain' );
ktk_test_check( array() === $wp_styles->queue, 'Unused form style remains' );
$wp_scripts = (object) array( 'registered' => array(
    'jquery' => ktk_test_asset( array( 'jquery-core' ) ), 'jquery-core' => ktk_test_asset(), 'keeper' => ktk_test_asset( array( 'jquery' ) ),
), 'queue' => array( 'jquery', 'jquery-core', 'keeper' ) );
ktk_homepage_prepare_assets();
ktk_test_check( array( 'jquery', 'jquery-core', 'keeper' ) === $wp_scripts->queue, 'Required integration dependency removed' );

foreach ( $ktk_test_actions['init'] as $callbacks ) {
    foreach ( $callbacks as $callback ) { $callback(); }
}
ktk_test_check( isset( $ktk_test_shortcodes['ktk_homepage'] ), 'Homepage shortcode is not registered' );
ktk_test_check( isset( $ktk_test_actions['template_redirect'][0] ), 'Standalone route handler is not registered' );
$body = ktk_homepage_static_body();
ktk_test_check( false !== strpos( $body, ktk_homepage_seasonal_hero() ), 'The seasonal hero is not rendered through its PHP configuration' );
$document = new DOMDocument();
$document->loadHTML( '<!doctype html><html><body>' . $body . '</body></html>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING );
$xpath = new DOMXPath( $document );
$sections = $xpath->query( '//*[contains(concat(" ", normalize-space(@class), " "), " et_pb_section ")]' );
ktk_test_check( 13 === $sections->length, 'The hero replacement must preserve exactly 13 production sections' );
$hero_sections = $xpath->query( '//*[contains(concat(" ", normalize-space(@class), " "), " et_pb_section_0 ")]' );
ktk_test_check( 1 === $hero_sections->length, 'The replacement hero must retain section index zero exactly once' );
$hero_links = $xpath->query( './/a[@data-book]', $hero_sections->item( 0 ) );
ktk_test_check( $hero_links->length > 0, 'The hero must provide a native booking link' );
foreach ( $hero_links as $anchor ) {
    $id = $anchor->getAttribute( 'data-product-id' );
    ktk_test_check( 1 === preg_match( '/^[1-9][0-9]*$/D', $id ), 'Hero booking links require an explicit positive product ID' );
    $url = parse_url( html_entity_decode( $anchor->getAttribute( 'href' ), ENT_QUOTES, 'UTF-8' ) );
    ktk_test_check( 'krawlthroughkrakow.com' === ( $url['host'] ?? '' ) && 0 === strpos( $url['path'] ?? '', '/staging/store2/' ), 'Hero booking links must remain in the staging storefront' );
    ktk_test_check( 'book' === ( $url['fragment'] ?? '' ), 'Hero booking links must retain the booking anchor' );
    foreach ( array( 'pub-crawl-28' => '28', 'nye-pub-crawl-32' => '32', 'halloween-pub-crawl-51' => '51' ) as $slug => $expected_id ) {
        if ( '/staging/store2/' . $slug . '/' === ( $url['path'] ?? '' ) ) {
            ktk_test_check( $expected_id === $id, 'Hero booking attribution does not match ' . $slug );
        }
    }
}
$review_rows = $xpath->query( './/nav[@class="ktk-hero-reviews"]', $hero_sections->item( 0 ) );
ktk_test_check( 1 === $review_rows->length, 'The hero must end with one independent-review row' );
$review_links = $xpath->query( './/a', $review_rows->item( 0 ) );
$review_sources = ktk_homepage_review_sources();
ktk_test_check( 3 === $review_links->length, 'The review row must contain all three platforms' );
foreach ( $review_links as $index => $anchor ) {
    $review = $review_sources[ $index ];
    ktk_test_check( $review['url'] === $anchor->getAttribute( 'href' ), 'Review destination must match the verified platform listing' );
    ktk_test_check( false !== strpos( $anchor->textContent, $review['name'] ), 'Review platform name is missing' );
    ktk_test_check( false !== strpos( $anchor->textContent, (string) (float) $review['rating'] . '/5' ), 'Review row must show the checked rating without zero decimals' );
    $count_label = empty( $review['count'] ) ? 'Read reviews' : $review['count'] . ' reviews';
    ktk_test_check( false !== strpos( $anchor->textContent, $count_label ), 'Review row must use the checked count or honest fallback' );
    ktk_test_check( false !== strpos( $anchor->getAttribute( 'aria-label' ), $review['name'] ), 'Compact review links must retain an accessible platform name' );
    $logos = $xpath->query( './/span[@class="ktk-hero-review-logo"]/img', $anchor );
    ktk_test_check( 1 === $logos->length, 'Each platform must have one local logo' );
    $logo = $logos->item( 0 );
    ktk_test_check( false !== strpos( $logo->getAttribute( 'src' ), '/ktk-homepage-assets/' . $review['logo'] ), 'Platform logos must be served from local assets' );
    ktk_test_check( '' === $logo->getAttribute( 'alt' ) && '40' === $logo->getAttribute( 'width' ) && '40' === $logo->getAttribute( 'height' ), 'Platform logos need reserved dimensions without redundant announcements' );
    ktk_test_check( '_blank' === $anchor->getAttribute( 'target' ) && 'noopener noreferrer' === $anchor->getAttribute( 'rel' ), 'External review links must open securely' );
}
ktk_test_check( '2,400+' === $review_sources[0]['count'], 'Google count must use the owner-requested display' );
ktk_test_check( false === strpos( $review_rows->item( 0 )->textContent, 'Ratings checked' ), 'The review row must omit the checked-date text as requested' );
ktk_test_check( false === strpos( $review_rows->item( 0 )->textContent, '5.0/5' ), 'Whole-number ratings must not retain zero decimals' );
$legacy_review_widgets = $xpath->query( '//div[contains(concat(" ", normalize-space(@class), " "), " cont_TA ")]' );
ktk_test_check( 2 === $legacy_review_widgets->length, 'Both lower review widgets must remain present' );
$sources_by_name = array_column( $review_sources, null, 'name' );
foreach ( $legacy_review_widgets as $widget ) {
    $platform = false !== stripos( $widget->textContent, 'Tripadvisor' ) ? 'Tripadvisor' : 'Google';
    ktk_test_check( false !== strpos( $widget->textContent, $sources_by_name[$platform]['count'] . ' reviews' ), 'Lower review widgets must share the hero counts' );
}
ktk_test_check( false !== strpos( $body, 'Take a look at 3,000+ reviews from our krawlers on TripAdvisor.' ), 'The story must use the shared Tripadvisor count without an unsupported positive-review claim' );
ktk_test_check( false === strpos( $body, '__KTK_REVIEW_COUNT_' ), 'Review-count tokens must be resolved in the rendered HTML' );
$hero_css_hash = substr( hash_file( 'sha256', ABSPATH . '/staging/wp-content/mu-plugins/ktk-homepage-assets/hero.css' ), 0, 12 );
$font_resilience_hash = substr( hash_file( 'sha256', ABSPATH . '/staging/wp-content/mu-plugins/ktk-homepage-assets/font-resilience.css' ), 0, 12 );
ktk_test_check( false === strpos( $body, 'ktk-hero-panel--pink' ), 'The default NYE campaign must retain the dark regular panel' );
ktk_test_check( 1 === $xpath->query( '//a[@data-book="hero-nye"]' )->length, 'The default campaign must render the NYE booking link' );
ktk_test_check( 1 === substr_count( $body, 'ktk-hero-banner--first' ) && 1 === substr_count( $body, 'ktk-hero-banner--last' ), 'Both halves of the shared poster caption must render exactly once' );
ktk_test_check( false !== strpos( $body, 'The original &amp; best' ) && false !== strpos( $body, 'Pubcrawl in Krakow' ), 'The original cross-panel caption must remain selectable HTML' );
foreach ( array( 'hero-statue-regular.svg', 'hero-statue-seasonal.svg' ) as $statue_asset ) {
    ktk_test_check( 1 === substr_count( $body, $statue_asset ), 'Original Illustrator artwork missing or duplicated: ' . $statue_asset );
}
ktk_test_check( 7 === substr_count( ktk_homepage_hero_rays(), '<path ' ), 'Original radial fan must retain its seven vector rays' );
$_GET['ktk_hero'] = 'halloween';
$halloween_hero = ktk_homepage_seasonal_hero();
$halloween_document = new DOMDocument();
$halloween_document->loadHTML( '<!doctype html><html><body>' . $halloween_hero . '</body></html>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING );
$halloween_xpath = new DOMXPath( $halloween_document );
ktk_test_check( false !== strpos( $halloween_hero, 'ktk-hero-panel--regular ktk-hero-panel--pink' ), 'Halloween must pair with the pink regular panel' );
ktk_test_check( false !== strpos( $halloween_hero, 'class="ktk-hero-halloween-detail"><strong>9 PM</strong>' ), 'Halloween must show the prominent 9 PM start time' );
ktk_test_check( false === strpos( $halloween_hero, 'Join the regular crawl' ), 'Superseded Halloween schedule explanation remains' );
$halloween_links = $halloween_xpath->query( '//a[@data-book="hero-halloween"]' );
ktk_test_check( 1 === $halloween_links->length, 'Halloween must render exactly one seasonal booking link' );
ktk_test_check( '51' === $halloween_links->item( 0 )->getAttribute( 'data-product-id' ), 'Halloween must attribute booking clicks to product 51' );
ktk_test_check( 'https://krawlthroughkrakow.com/staging/store2/halloween-pub-crawl-51/#book' === $halloween_links->item( 0 )->getAttribute( 'href' ), 'Halloween must link to its own staging product and booking anchor' );
ktk_test_check( 'Book Halloween' === trim( $halloween_links->item( 0 )->textContent ), 'Halloweekend booking button must say Book Halloween' );
ktk_test_check( false !== strpos( $halloween_hero, '>Halloweekend</span>' ), 'The seasonal heading must use Halloweekend' );
ktk_test_check( false !== strpos( $halloween_hero, 'Thursday 29<br>Friday 30<br>&amp; Saturday 31' ), 'Halloweekend must list the three confirmed October dates' );
ktk_test_check( false !== strpos( $halloween_hero, 'Best costumes win prizes.' ), 'Halloweekend must show the costume-prize message' );
ktk_test_check( false !== strpos( ktk_homepage_asset( 'hero.css' ), '?v=' . $hero_css_hash ), 'Hero stylesheet must use its content hash for cache invalidation' );
ktk_test_check( false !== strpos( ktk_homepage_asset( 'font-resilience.css' ), '?v=' . $font_resilience_hash ), 'Embedded font stylesheet must use its content hash for cache invalidation' );
ktk_test_check( false !== strpos( $body, 'https://krawlthroughkrakow.com/staging/store2/pub-crawl-28/#book' ), 'Book links leave the staging store' );
ktk_test_check( 1 === substr_count( $body, 'id="ktk-cta"' ), 'Production floating CTA must render exactly once' );
ktk_test_check( false === strpos( $body, '<script' ), 'Captured content must not reintroduce production scripts' );
foreach ( array( 'data-cmp-info=', 'data-suppressedsrc=', '_iub_cs_activate' ) as $runtime_state ) {
    ktk_test_check( false === strpos( $body, $runtime_state ), 'Captured consent runtime state remains: ' . $runtime_state );
}
ktk_test_check( false === strpos( $body, '__KTK_' ), 'Unresolved portable URL marker' );
foreach ( range( 0, 12 ) as $section ) {
    ktk_test_check( 1 === preg_match( '/\bet_pb_section_' . $section . '\b/', $body ), 'Missing production section ' . $section );
}
foreach ( array( 'main-header', 'mobile_menu', 'main-content', 'et_pb_gallery', 'player.vimeo.com/video/892352668', 'maps/d/embed' ) as $required ) {
    ktk_test_check( false !== strpos( $body, $required ), 'Missing production content: ' . $required );
}
ktk_test_check( false !== strpos( $body, '/staging/wp-content/mu-plugins/ktk-homepage-assets/parity/' ), 'Production images are not localized' );
ktk_test_check( false === strpos( $body, 'href="https://krawlthroughkrakow.com/store2/' ), 'Production store link escaped localization' );
ktk_test_check( false !== strpos( ktk_homepage_parity_body_class(), 'et_non_fixed_nav' ), 'Production nonfixed header behavior is missing' );
$_GET['ktk_hero'] = 'nye';
$nye_hero = ktk_homepage_seasonal_hero();
ktk_test_check( false === strpos( $nye_hero, 'ktk-hero-panel--pink' ), 'NYE must retain the dark regular panel' );
ktk_test_check( false !== strpos( $nye_hero, '>2027</text>' ) && false === strpos( $nye_hero, '>2024<' ), 'Original flag artwork must use the current event year, not historical AI copy' );
$document->loadHTML( '<!doctype html><html><body>' . $nye_hero . '</body></html>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING );
$xpath = new DOMXPath( $document );
$nye_links = $xpath->query( '//a[@data-book="hero-nye"]' );
ktk_test_check( 1 === $nye_links->length, 'The NYE preview must render exactly one seasonal booking link' );
ktk_test_check( '32' === $nye_links->item( 0 )->getAttribute( 'data-product-id' ), 'NYE must attribute booking clicks to product 32' );
ktk_test_check( 'https://krawlthroughkrakow.com/staging/store2/nye-pub-crawl-32/#book' === $nye_links->item( 0 )->getAttribute( 'href' ), 'NYE must link to its own staging product and booking anchor' );
ktk_test_check( 1 === $xpath->query( '//h1' )->length, 'The hero must have one semantic primary heading' );
foreach ( array( 'unknown', '"><script>alert(1)</script>', array( 'nye' ) ) as $invalid_campaign ) {
    $_GET['ktk_hero'] = $invalid_campaign;
    ktk_test_check( 'nye' === ktk_homepage_hero_campaign(), 'Unsupported seasonal preview values must use the configured fallback' );
}
$_GET['ktk_hero'] = 'nye';
$ktk_test_home = 'https://krawlthroughkrakow.com';
$ktk_test_environment = 'production';
ktk_test_check( 'nye' === ktk_homepage_hero_campaign(), 'Preview parameters must not change a production campaign' );
$ktk_test_home = 'https://krawlthroughkrakow.com/staging';
$ktk_test_environment = 'staging';
unset( $_GET['ktk_hero'] );
echo "Homepage integration tests passed: cleanup, consent loaders, SEO, route scoping, dependencies, shortcode, seasonal hero, product attribution, and content.\n";
