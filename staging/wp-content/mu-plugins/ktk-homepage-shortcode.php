<?php
/** Plugin Name: KTK Code-managed Homepage */
if ( ! defined( 'ABSPATH' ) ) { exit; }
const KTK_HOMEPAGE_SHORTCODE_CONTENT_FILE = 'ktk-homepage-shortcode-content.php';
const KTK_HOMEPAGE_SHORTCODE_PAGE_SLUG = 'homepage-shortcode';
const KTK_HOMEPAGE_SHORTCODE_TAG = '[ktk_homepage]';
const KTK_HOMEPAGE_HEADER_MENU_LOCATION = 'ktk-homepage-menu';
const KTK_HOMEPAGE_GOOGLE_SITE_VERIFICATION = 'aZAgHxuJ9wBKSsHJyo7THEz_9K1ruYqIpJm1YyO9lUA';
const KTK_HOMEPAGE_GTM_ID = 'GTM-PHXGRZ';
const KTK_HOMEPAGE_GOOGLE_ADS_ID = 'AW-956184209';
const KTK_HOMEPAGE_CLARITY_ID = 'z9d5iuilvn';
const KTK_HOMEPAGE_IUBENDA_WIDGET_ID = '92c90d2a-9d50-4f09-9c21-bcb72ccc2897';

function ktk_homepage_shortcode_is_replica_page() {
    return is_front_page() || is_page( KTK_HOMEPAGE_SHORTCODE_PAGE_SLUG );
}
function ktk_homepage_is_staging() {
    return false !== strpos( home_url( '/' ), '/staging/' )
        || ( function_exists( 'wp_get_environment_type' ) && 'production' !== wp_get_environment_type() );
}
function ktk_homepage_asset( $file ) {
    static $urls = array();
    if ( isset( $urls[ $file ] ) ) { return $urls[ $file ]; }
    $path = __DIR__ . '/ktk-homepage-assets/' . $file;
    $urls[ $file ] = content_url( '/mu-plugins/ktk-homepage-assets/' . $file )
        . '?v=' . ( is_file( $path ) ? substr( hash_file( 'sha256', $path ), 0, 12 ) : '1' );
    return $urls[ $file ];
}
function ktk_homepage_product_url( $slug = 'pub-crawl-28' ) {
    return home_url( '/store2/' . $slug . '/#book' );
}
require_once __DIR__ . '/ktk-homepage-assets/reviews.php';
function ktk_homepage_offer() {
    // Verified against active product 28 on 2026-10-06; no runtime API dependency.
    return array(
        'price' => '120', 'currency' => 'PLN', 'time' => '9 PM', 'time24' => '21:00',
        'phone' => '+48 791 847 981', 'phone_uri' => '+48791847981', 'email' => 'pubthroughkrakow@gmail.com',
        'directions' => 'https://maps.app.goo.gl/S3kQZC5rdABdpA1G9',
        'reviews' => 'https://www.tripadvisor.com/Attraction_Review-g274772-d2725527-Reviews-Krawl_Through_Krakow_Pub_Crawl-Krakow_Lesser_Poland_Province_Southern_Poland.html',
        'inclusions' => array(
            array( 'One hour of open bar', 'Beer, vodka, gin, rum, whiskey and soft drinks. Your first round of getting to know everyone, sorted.' ),
            array( '4-5 bars & clubs', 'Explore Krakow nightlife with VIP entrance included, plus a welcome shot at each venue.' ),
            array( 'Local guides & a photographer', 'Our team leads the way and captures the night. You can get on with enjoying it.' ),
        ),
    );
}
function ktk_homepage_icon( $name, $class = '' ) {
    return '<svg class="icon ' . esc_attr( $class ) . '" width="24" height="24" aria-hidden="true"><use href="'
        . esc_url( ktk_homepage_asset( 'icons.svg' ) ) . '#' . esc_attr( $name ) . '"></use></svg>';
}
function ktk_homepage_book_button( $position, $class = '' ) {
    return '<a class="button ' . esc_attr( $class ) . '" data-book="' . esc_attr( $position ) . '" href="'
        . esc_url( ktk_homepage_product_url() ) . '">Book pub crawl' . ktk_homepage_icon( 'arrow-up-right' ) . '</a>';
}
function ktk_homepage_photo( $name, $alt, $sizes = '(max-width: 767px) 100vw, 50vw', $class = '', $height = 640 ) {
    return '<img class="' . esc_attr( $class ) . '" src="' . esc_url( ktk_homepage_asset( $name . '-640.webp' ) )
        . '" srcset="' . esc_url( ktk_homepage_asset( $name . '-640.webp' ) ) . ' 640w, '
        . esc_url( ktk_homepage_asset( $name . '-960.webp' ) ) . ' 960w" sizes="' . esc_attr( $sizes )
        . '" width="960" height="' . esc_attr( $height ) . '" loading="lazy" decoding="async" alt="' . esc_attr( $alt ) . '">';
}
require_once __DIR__ . '/ktk-homepage-assets/integrations.php';
require_once __DIR__ . '/ktk-homepage-assets/hero.php';
require_once __DIR__ . '/ktk-homepage-assets/parity-seasonal-content.php';
require_once __DIR__ . '/ktk-homepage-assets/nojs-navigation.php';
add_action( 'init', function () { add_shortcode( 'ktk_homepage', 'ktk_homepage_static_body' ); }, 20 );

function ktk_homepage_metadata() {
    $url = home_url( '/' );
    $title = 'Krawl Through Krakow | Best Pub Crawl in Krakow';
    $description = 'Meet new people on a Krakow pub crawl with one hour of open bar, VIP entry to 4-5 bars and clubs, local guides and a photographer. Starts at 9 PM. 120 PLN.';
    $image = ktk_homepage_asset( 'hero-1600.webp' );
    $schema = array( '@context' => 'https://schema.org', '@graph' => array(
        array( '@type' => 'Organization', '@id' => $url . '#organization', 'name' => 'Krawl Through Krakow',
            'url' => $url, 'logo' => ktk_homepage_asset( 'logo.webp' ), 'telephone' => ktk_homepage_offer()['phone_uri'],
            'sameAs' => array( 'https://www.instagram.com/krawlthroughkrakow/', 'https://www.facebook.com/krawlthroughkrakow' ) ),
        array( '@type' => 'WebSite', '@id' => $url . '#website', 'url' => $url, 'name' => 'Krawl Through Krakow',
            'publisher' => array( '@id' => $url . '#organization' ) ),
        array( '@type' => 'WebPage', '@id' => $url . '#webpage', 'url' => $url, 'name' => $title,
            'description' => $description, 'isPartOf' => array( '@id' => $url . '#website' ),
            'about' => array( '@id' => $url . '#organization' ), 'inLanguage' => 'en',
            'primaryImageOfPage' => array( '@type' => 'ImageObject', 'url' => $image ) ),
    ) ); ?>
    <title><?php echo esc_html( $title ); ?></title>
    <meta name="description" content="<?php echo esc_attr( $description ); ?>">
    <meta name="robots" content="<?php echo ktk_homepage_is_staging() ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'; ?>">
    <link rel="canonical" href="<?php echo esc_url( $url ); ?>">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Krawl Through Krakow">
    <meta property="og:title" content="<?php echo esc_attr( $title ); ?>">
    <meta property="og:description" content="<?php echo esc_attr( $description ); ?>">
    <meta property="og:url" content="<?php echo esc_url( $url ); ?>">
    <meta property="og:image" content="<?php echo esc_url( $image ); ?>">
    <meta property="og:image:alt" content="Krawl Through Krakow guests in the Main Square">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php echo esc_attr( $title ); ?>">
    <meta name="twitter:description" content="<?php echo esc_attr( $description ); ?>">
    <meta name="twitter:image" content="<?php echo esc_url( $image ); ?>">
    <meta name="theme-color" content="#101110">
    <script type="application/ld+json"><?php echo wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP ); ?></script>
    <?php
}
add_action( 'template_redirect', function () {
    if ( ! ktk_homepage_shortcode_is_replica_page() || is_feed() || is_embed() ) { return; }
    status_header( 200 );
    if ( ktk_homepage_is_staging() ) { header( 'X-Robots-Tag: noindex, nofollow', true ); } ?>
    <!doctype html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo( 'charset' ); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <?php ktk_homepage_metadata(); ?>
        <link rel="stylesheet" href="<?php echo esc_url( ktk_homepage_asset( 'parity.css' ) ); ?>">
        <link rel="stylesheet" href="<?php echo esc_url( ktk_homepage_asset( 'font-resilience.css' ) ); ?>">
        <link rel="stylesheet" href="<?php echo esc_url( ktk_homepage_asset( 'parity-runtime.css' ) ); ?>">
        <link rel="stylesheet" href="<?php echo esc_url( ktk_homepage_asset( 'hero.css' ) ); ?>">
        <?php echo ktk_homepage_required_head_html( ktk_homepage_captured_head() ); ?>
    </head>
    <body class="<?php echo esc_attr( ktk_homepage_parity_body_class() ); ?> ktk-homepage-standalone">
        <a class="ktk-parity-skip-link" href="#main-content">Skip to content</a>
        <?php echo ktk_homepage_required_body_open_html(); ?>
        <?php echo ktk_homepage_nojs_navigation_body(ktk_homepage_static_body(), home_url('/')); ?>
        <script src="<?php echo esc_url( ktk_homepage_asset( 'parity.js' ) ); ?>" defer></script>
        <script src="<?php echo esc_url( ktk_homepage_asset( 'journey.js' ) ); ?>" defer></script>
        <?php echo ktk_homepage_captured_footer(); ?>
    </body>
    </html>
    <?php exit;
}, 0 );
function ktk_homepage_shortcode_source_metadata() {
    return array(
        'source_title' => "", 'source_exported_at' => "2026-10-06T09:46:30+00:00",
        'source_sha256' => '95832bade95edea6cdae9e784b75be664bf0c8069027a215512128bd81f506b6', 'shortcode' => KTK_HOMEPAGE_SHORTCODE_TAG,
        'header' => 'code-managed', 'menu_location' => KTK_HOMEPAGE_HEADER_MENU_LOCATION,
    );
}
