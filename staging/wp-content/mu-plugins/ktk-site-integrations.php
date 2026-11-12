<?php
/** Plugin Name: KTK Shared Website Integrations */
if (!defined('ABSPATH')) { exit; }

const KTK_SITE_INTEGRATIONS_VERSION = '2026.11.06.1';
const KTK_SITE_GTM_ID = 'GTM-PHXGRZ';
const KTK_SITE_VERIFICATION = 'aZAgHxuJ9wBKSsHJyo7THEz_9K1ruYqIpJm1YyO9lUA';

function ktk_site_script_fingerprint($code) {
    return hash('sha256', preg_replace('/\s+/', '', str_replace('"', "'", $code)));
}

function ktk_site_is_production() {
    $home = parse_url(home_url('/'));
    return 'https' === ($home['scheme'] ?? '') && 'krawlthroughkrakow.com' === ($home['host'] ?? '')
        && empty($home['port']) && '' === rtrim($home['path'] ?? '', '/')
        && 'krawlthroughkrakow.com' === strtolower($_SERVER['HTTP_HOST'] ?? '');
}

function ktk_site_is_managed_page() {
    return (function_exists('ktk_homepage_shortcode_is_replica_page') && ktk_homepage_shortcode_is_replica_page())
        || (function_exists('ktk_pages_shortcode_is_replica_page') && ktk_pages_shortcode_is_replica_page())
        || (class_exists('KTK_Storefront') && KTK_Storefront::is_storefront_request());
}

function ktk_site_is_store_path($path) {
    return 1 === preg_match('#^/(?:staging/)?store2?(?:/|$)#D', $path);
}

function ktk_site_standard_gtm($markup) {
    $tag = new WP_HTML_Tag_Processor($markup);
    if (!$tag->next_tag('SCRIPT') || $tag->get_attribute('src') !== null) { return false; }
    preg_match('#^<script\b[^>]*>(.*?)</script\s*>$#is', $markup, $body);
    $code = preg_replace('/\s+/', '', str_replace('"', "'", $body[1] ?? ''));
    $expected = "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':newDate().getTime(),event:'gtm.js'});"
        . "varf=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';"
        . "j.async=true;j.src='//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);"
        . "})(window,document,'script','dataLayer','" . KTK_SITE_GTM_ID . "');";
    foreach (array('!=', '!==') as $comparison) {
        foreach (array('//', 'https://') as $protocol) {
            if ($code === str_replace(array('!=', "'//www.googletagmanager.com/"), array($comparison, "'" . $protocol . 'www.googletagmanager.com/'), $expected)) { return true; }
        }
    }
    return false;
}

function ktk_site_remove_legacy_divi_html($html) {
    if (!is_string($html)) { return $html; }
    return preg_replace_callback('#<(script|noscript)\b[^>]*>.*?</\1\s*>|<meta\b[^>]*>#is', static function ($match) {
        $markup = $match[0];
        $tag = new WP_HTML_Tag_Processor($markup);
        if (!$tag->next_tag()) { return $markup; }
        if (str_starts_with(strtolower($markup), '<meta')) {
            return strtolower((string)$tag->get_attribute('name')) === 'google-site-verification'
                && $tag->get_attribute('content') === KTK_SITE_VERIFICATION ? '' : $markup;
        }
        if (str_starts_with(strtolower($markup), '<noscript')) {
            $frame = new WP_HTML_Tag_Processor($markup);
            if (!$frame->next_tag('IFRAME')) { return $markup; }
            $src = $frame->get_attribute('src');
            $url = is_string($src) ? parse_url(str_starts_with($src, '//') ? 'https:' . $src : $src) : array();
            parse_str($url['query'] ?? '', $query);
            $normalized = preg_replace('/\s+/', '', str_replace('"', "'", $markup));
            $only_frame = preg_match('#^<noscript><iframe[^>]*></iframe></noscript>$#iD', $normalized);
            return $only_frame && ($url['host'] ?? '') === 'www.googletagmanager.com'
                && ($url['path'] ?? '') === '/ns.html' && $query === array('id' => KTK_SITE_GTM_ID) ? '' : $markup;
        }
        if (ktk_site_standard_gtm($markup)) { return ''; }
        preg_match('#^<script\b[^>]*>(.*?)</script\s*>$#is', $markup, $body);
        // Exact, audited legacy helpers only; mixed scripts are deliberately retained.
        return in_array(ktk_site_script_fingerprint($body[1] ?? ''), array(
            '29c4789d850c2d13f3a04fda18ea1208c02414fda701023e08ec05fdf380945b',
            '353446913eef5966dadb34c4ba84b6c1661f173f9ca3adf22148a0f2491be3ed',
        ), true) ? '' : $markup;
    }, $html);
}

function ktk_site_filter_divi_options($options) {
    if (is_admin() || !is_array($options)) { return $options; }
    foreach ($options as $key => $value) {
        if (preg_match('/_integration_(?:head|body|single_top|single_bottom)$/D', (string)$key)) {
            $options[$key] = ktk_site_remove_legacy_divi_html($value);
        }
    }
    return $options;
}
add_filter('option_et_divi', 'ktk_site_filter_divi_options', 20);

function ktk_site_is_replaced_snippet($id, $code) {
    if (!is_string($code)) { return false; }
    $known = array(
        9132 => array('244bb0c29f5fa10142be1f428309f61d3fed491d195c9b3b1619f718d731ccef'),
        8798 => array('312cab734e5ff8ff7fbd0bdf09d71f781356208dcffaf0eef929392a9de6ea14',
            'd685ebb9e9d895f33aa34de4a715679310d8b346c294d368e581d9100b6d7118'),
    );
    return in_array(ktk_site_script_fingerprint($code), $known[(int)$id] ?? array(), true);
}

function ktk_site_filter_loaded_snippet($snippet) {
    if (is_admin()) { return $snippet; }
    if (is_array($snippet) && isset($snippet['id'], $snippet['code']) && ktk_site_is_replaced_snippet($snippet['id'], $snippet['code'])) {
        $snippet['code'] = '';
        $snippet['compiled_code'] = '';
        $snippet['load_as_file'] = false;
    } elseif (is_int($snippet)) {
        $post = get_post($snippet);
        if ($post && $post->post_type === 'wpcode' && ktk_site_is_replaced_snippet($post->ID, $post->post_content)) {
            $snippet = clone $post;
            $snippet->post_content = '';
        }
    } elseif ($snippet instanceof WP_Post && $snippet->post_type === 'wpcode' && ktk_site_is_replaced_snippet($snippet->ID, $snippet->post_content)) {
        $snippet = clone $snippet;
        $snippet->post_content = '';
    }
    return $snippet;
}
// Suppress the PHP callback before evaluation, not after it has registered wp_footer.
add_filter('wpcode_load_snippet', 'ktk_site_filter_loaded_snippet');

function ktk_site_verification_head() {
    if (!is_admin()) { echo '<meta name="google-site-verification" content="' . esc_attr(KTK_SITE_VERIFICATION) . '">' . "\n"; }
}
add_action('wp_head', 'ktk_site_verification_head', 0);

function ktk_site_gtm_head() {
    if (is_admin() || !ktk_site_is_production()) { return; }
    echo '<script id="ktk-gtm-loader" class="_iub_cs_skip">'
        . '(function(w,d,s,l,i){if(w.__ktkSiteGtmLoaded||(w.google_tag_manager&&w.google_tag_manager[i]))return;w.__ktkSiteGtmLoaded=true;'
        . 'w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});'
        . 'var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=="dataLayer"?"&l="+l:"";'
        . 'j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);'
        . '})(window,document,"script","dataLayer","' . esc_js(KTK_SITE_GTM_ID) . '");</script>' . "\n";
}
// Iubenda remains the consent owner and prints its configuration before this hook.
add_action('wp_head', 'ktk_site_gtm_head', 99999);

function ktk_site_gtm_body() {
    static $printed = false;
    if ($printed || is_admin() || !ktk_site_is_production()) { return; }
    $printed = true;
    echo '<noscript id="ktk-gtm-noscript"><iframe src="https://www.googletagmanager.com/ns.html?id=' . esc_attr(KTK_SITE_GTM_ID)
        . '" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>';
}
add_action('wp_body_open', 'ktk_site_gtm_body', 0);
add_action('wp_footer', 'ktk_site_gtm_body', 0);

function ktk_site_enqueue_legacy_helpers() {
    if (is_admin() || ktk_site_is_managed_page()) { return; }
    $directory = __DIR__ . '/ktk-site-integrations-assets/';
    $url = content_url('/mu-plugins/ktk-site-integrations-assets/');
    wp_enqueue_script('ktk-site-integrations', $url . 'site.js', array(), substr(hash_file('sha256', $directory . 'site.js'), 0, 12), true);
    wp_add_inline_script('ktk-site-integrations', 'window.KTK_SITE_INTEGRATIONS=' . wp_json_encode(array(
        'regularBooking' => home_url('/store2/pub-crawl-28/#book'), 'nyeBooking' => home_url('/store2/nye-pub-crawl-32/#book'),
    )) . ';', 'before');
    $path = (string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if (!ktk_site_is_store_path($path)) {
        wp_enqueue_style('ktk-site-integrations', $url . 'site.css', array(), substr(hash_file('sha256', $directory . 'site.css'), 0, 12));
    }
}
add_action('wp_enqueue_scripts', 'ktk_site_enqueue_legacy_helpers', 20);

function ktk_site_floating_cta() {
    if (is_admin() || ktk_site_is_managed_page()) { return; }
    $path = (string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if (ktk_site_is_store_path($path)) { return; }
    $nye = preg_match('#^/(?:staging/)?new-years-eve(?:/|$)#D', $path);
    $href = home_url($nye ? '/store2/nye-pub-crawl-32/#book' : '/store2/pub-crawl-28/#book');
    echo '<a id="ktk-cta" class="js-fh-book" data-ktk-site-cta href="' . esc_url($href) . '">BOOK NOW</a>';
}
add_action('wp_footer', 'ktk_site_floating_cta', 5);

function ktk_site_rocket_exclusions($values) {
    return array_values(array_unique(array_merge($values, array('ktk-site-integrations-assets/site.js', 'window.KTK_SITE_INTEGRATIONS', '__ktkSiteGtmLoaded'))));
}
foreach (array('rocket_exclude_js', 'rocket_exclude_defer_js', 'rocket_delay_js_exclusions') as $filter) {
    add_filter($filter, 'ktk_site_rocket_exclusions');
}
