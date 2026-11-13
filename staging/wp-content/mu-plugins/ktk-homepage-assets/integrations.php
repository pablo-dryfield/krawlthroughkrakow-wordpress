<?php
/** Homepage-only integration output and removal of unused WordPress assets. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

function ktk_homepage_unused_asset( $handle, $src = '' ) {
    $handle = strtolower( (string) $handle );
    $src = strtolower( (string) $src );
    foreach ( array( '/themes/divi/', '/wp-content/et-cache/', '/plugins/contact-form-7/', '/plugins/ecwid-shopping-cart/' ) as $path ) {
        if ( false !== strpos( $src, $path ) ) {
            return true;
        }
    }
    foreach ( array( 'et-', 'divi-', 'ecwid-', 'contact-form-7', 'wp-block-' ) as $prefix ) {
        if ( 0 === strpos( $handle, $prefix ) ) {
            return true;
        }
    }
    return in_array( $handle, array(
        'swv', 'global-styles', 'classic-theme-styles', 'core-block-supports',
        'ktk-homepage-header', 'iubenda-forms', 'iubenda-cons', 'iubenda-cons-cdn',
    ), true );
}

function ktk_homepage_prepare_assets() {
    if ( ! ktk_homepage_shortcode_is_replica_page() ) {
        return;
    }

    global $wp_styles, $wp_scripts;
    foreach ( array( array( $wp_styles, 'wp_dequeue_style', 'wp_deregister_style' ), array( $wp_scripts, 'wp_dequeue_script', 'wp_deregister_script' ) ) as $entry ) {
        list( $registry, $dequeue, $deregister ) = $entry;
        if ( ! $registry || empty( $registry->registered ) ) {
            continue;
        }
        foreach ( $registry->registered as $handle => $asset ) {
            if ( ktk_homepage_unused_asset( $handle, isset( $asset->src ) ? $asset->src : '' ) ) {
                $dequeue( $handle );
                $deregister( $handle );
            }
        }
    }

    // Retain shared libraries only when an integration still depends on them.
    if ( $wp_scripts && ! empty( $wp_scripts->registered ) ) {
        $optional = array( 'jquery', 'jquery-core', 'jquery-migrate', 'wp-hooks', 'wp-i18n', 'wp-polyfill', 'wp-dom-ready', 'wp-a11y', 'wp-embed' );
        $needed = array();
        $visit = static function ( $handle ) use ( &$visit, &$needed, $wp_scripts ) {
            if ( isset( $needed[ $handle ] ) || empty( $wp_scripts->registered[ $handle ] ) ) {
                return;
            }
            $needed[ $handle ] = true;
            foreach ( (array) $wp_scripts->registered[ $handle ]->deps as $dependency ) {
                $visit( $dependency );
            }
        };
        foreach ( (array) $wp_scripts->queue as $handle ) {
            if ( ! in_array( $handle, $optional, true ) ) {
                $visit( $handle );
            }
        }
        foreach ( $optional as $handle ) {
            if ( ! isset( $needed[ $handle ] ) ) {
                wp_dequeue_script( $handle );
            }
        }
    }

    foreach ( array(
        array( 'feed_links', 2 ), array( 'feed_links_extra', 3 ),
        array( 'rsd_link', 10 ), array( 'wlwmanifest_link', 10 ),
        array( 'wp_generator', 10 ), array( 'rest_output_link_wp_head', 10 ),
        array( 'wp_oembed_add_discovery_links', 10 ), array( 'wp_shortlink_wp_head', 10 ),
        array( 'print_emoji_detection_script', 7 ), array( 'wp_print_auto_sizes_contain_css_fix', 1 ),
    ) as $entry ) {
        remove_action( 'wp_head', $entry[0], $entry[1] );
    }
    remove_action( 'wp_print_styles', 'print_emoji_styles' );
    remove_action( 'wp_enqueue_scripts', 'wp_enqueue_emoji_styles' );
}
add_action( 'wp_enqueue_scripts', 'ktk_homepage_prepare_assets', 99999 );
add_action( 'wp_print_styles', 'ktk_homepage_prepare_assets', 0 );
add_action( 'wp_print_scripts', 'ktk_homepage_prepare_assets', 0 );
add_action( 'wp_print_footer_scripts', 'ktk_homepage_prepare_assets', 0 );

function ktk_homepage_markup_attribute( $markup, $attribute ) {
    if ( class_exists( 'WP_HTML_Tag_Processor' ) ) {
        $processor = new WP_HTML_Tag_Processor( $markup );
        if ( $processor->next_tag() ) {
            $value = $processor->get_attribute( $attribute );
            return is_string( $value ) ? $value : '';
        }
        return '';
    }
    if ( preg_match( '/\s' . preg_quote( $attribute, '/' ) . '\s*=\s*(?:"([^"]*)"|\x27([^\x27]*)\x27|([^\s>]+))/i', $markup, $matches ) ) {
        foreach ( array_slice( $matches, 1 ) as $value ) {
            if ( '' !== $value ) {
                return html_entity_decode( $value, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
            }
        }
    }
    return '';
}

function ktk_homepage_is_owned_gtm_bootstrap( $markup ) {
    if ( '' !== ktk_homepage_markup_attribute( $markup, 'src' )
        || ! preg_match( '#\A<script\b[^>]*>(.*?)</script\s*>\z#is', $markup, $matches ) ) {
        return false;
    }

    // Only replace the standalone default snippet, never a mixed integration block.
    $script = preg_replace( '/\s+/', '', str_replace( '"', "'", $matches[1] ) );
    $bootstrap = "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':newDate().getTime(),event:'gtm.js'});"
        . "varf=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';"
        . "j.async=true;j.src='//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);"
        . "})(window,document,'script','dataLayer','" . KTK_HOMEPAGE_GTM_ID . "');";
    foreach ( array( '!=', '!==' ) as $comparison ) {
        foreach ( array( '//', 'https://' ) as $protocol ) {
            $expected = str_replace( array( '!=', "'//www.googletagmanager.com/" ), array( $comparison, "'" . $protocol . 'www.googletagmanager.com/' ), $bootstrap );
            if ( $script === $expected ) {
                return true;
            }
        }
    }
    return false;
}

function ktk_homepage_is_divi_late_css_loader( $markup ) {
    if ( '' !== ktk_homepage_markup_attribute( $markup, 'src' )
        || ! preg_match( '#\A<script\b[^>]*>(.*?)</script\s*>\z#is', $markup, $block )
        || ! preg_match( '/\bvar\s+file\s*=\s*(\[[^;\r\n]*\]);/', $block[1], $match ) ) {
        return false;
    }
    $files = json_decode( $match[1], true );
    if ( ! is_array( $files ) || ! $files ) { return false; }
    foreach ( $files as $file ) {
        if ( ! is_string( $file ) || ! preg_match( '#/wp-content/et-cache/(?:[0-9]+/et-divi-dynamic-[0-9]+|taxonomy/category/[0-9]+/et-divi-dynamic)-late\.css$#', (string) parse_url( $file, PHP_URL_PATH ) ) ) {
            return false;
        }
    }

    // Match the complete Divi bootstrap so unrelated or mixed scripts survive.
    $expected = <<<'JS'
(function() {
    var file = __KTK_DIVI_FILES__;
    var handle = document.getElementById('divi-style-inline-inline-css');
    var location = handle.parentNode;
    if (0===document.querySelectorAll('link[href="' + file + '"]').length) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.id = 'et-dynamic-late-css';
        link.href = file;
        location.insertBefore(link, handle.nextSibling);
    }
})();
JS;
    $script = str_replace( $match[1], '__KTK_DIVI_FILES__', $block[1] );
    $normalize = static function ( $value ) { return preg_replace( '/\s+/', '', str_replace( '"', "'", $value ) ); };
    return $normalize( $script ) === $normalize( $expected );
}

function ktk_homepage_filter_hook_html( $html ) {
    if ( ! ktk_homepage_shortcode_is_replica_page() ) {
        return $html;
    }

    // Process complete script/style blocks so markup inside JavaScript is untouched.
    $html = preg_replace_callback( '#<(script|style|noscript|title)\b[^>]*>.*?</\1\s*>|<(meta|link)\b[^>]*>#is', static function ( $match ) {
        $markup = $match[0];
        $tag = strtolower( ! empty( $match[1] ) ? $match[1] : $match[2] );
        $id = ktk_homepage_markup_attribute( $markup, 'id' );
        $src = ktk_homepage_markup_attribute( $markup, 'src' );
        $href = ktk_homepage_markup_attribute( $markup, 'href' );
        $type = strtolower( ktk_homepage_markup_attribute( $markup, 'type' ) );
        $handle = preg_replace( '/-(?:js|css)(?:-extra|-before|-after|-translations|-inline-css)?$/', '', $id );
        if ( 'title' === $tag || ktk_homepage_unused_asset( $handle, $src ?: $href ) ) {
            return '';
        }
        if ( 'meta' === $tag ) {
            $name = strtolower( ktk_homepage_markup_attribute( $markup, 'name' ) );
            $property = strtolower( ktk_homepage_markup_attribute( $markup, 'property' ) );
            if ( in_array( $name, array( 'description', 'robots', 'googlebot', 'bingbot', 'generator', 'viewport', 'theme-color' ), true )
                || 0 === strpos( $name, 'twitter:' ) || 0 === strpos( $property, 'og:' ) || 0 === strpos( $property, 'twitter:' ) ) {
                return '';
            }
        }
        if ( 'link' === $tag ) {
            $rel = strtolower( ktk_homepage_markup_attribute( $markup, 'rel' ) );
            if ( in_array( $rel, array( 'canonical', 'shortlink', 'edituri', 'wlwmanifest', 'https://api.w.org/' ), true )
                || false !== strpos( $type, 'rss' ) || false !== strpos( $type, 'atom' ) || false !== strpos( $type, 'oembed' )
                || false !== strpos( $href, '/wp-json/' ) || false !== strpos( $href, 'xmlrpc.php' )
                || preg_match( '#(?:app\.ecwid\.com|ecomm\.events|d1q3axnfhmyveb\.cloudfront\.net|dqzrr9k4bjpzk\.cloudfront\.net|d1oxsl77a1kjht\.cloudfront\.net)#i', $href )
                || ( 'prerender' === $rel && preg_match( '#/(?:staging/)?store/?(?:\?|$)#', $href ) ) ) {
                return '';
            }
        }
        if ( 'script' === $tag ) {
            if ( ktk_homepage_is_owned_gtm_bootstrap( $markup ) || ktk_homepage_is_divi_late_css_loader( $markup )
                || 'application/ld+json' === $type || in_array( $id, array( 'wp-emoji-settings', 'ktk-homepage-attribution' ), true )
                || preg_match( '/\b(?:et_pb_custom|et_builder_utils_params|et_core_api_spam_recaptcha|ecwidParams|ecwid_config)\b/', $markup )
                || false !== strpos( $markup, "getElementById('ktk-homepage-header')" )
                || ( false !== strpos( $markup, 'trk_' ) && false !== strpos( $markup, 'saveFromUrl' ) && false !== strpos( $markup, 'addParams' ) ) ) {
                return '';
            }
        }
        if ( 'style' === $tag && preg_match( '/(?:\.et_pb_|\.et-pb-|\.ktk-homepage-header|wp-block-|wp-emoji)/i', $markup ) ) {
            return '';
        }
        if ( in_array( $tag, array( 'style', 'script' ), true ) && false !== strpos( $markup, 'ktk-cta' ) ) {
            return '';
        }
        if ( 'noscript' === $tag && false !== strpos( $markup, 'googletagmanager.com/ns.html?id=' . KTK_HOMEPAGE_GTM_ID ) ) {
            return '';
        }
        return $markup;
    }, $html );

    return preg_replace( '#<a\b(?=[^>]*\bid\s*=\s*["\x27]ktk-cta["\x27])[^>]*>.*?</a>#is', '', $html );
}

function ktk_homepage_captured_head() {
    ktk_homepage_prepare_assets();
    ob_start();
    wp_head();
    return ktk_homepage_filter_hook_html( ob_get_clean() );
}

function ktk_homepage_captured_footer() {
    ktk_homepage_prepare_assets();
    ob_start();
    wp_footer();
    return ktk_homepage_filter_hook_html( ob_get_clean() );
}

function ktk_homepage_clarity_consent_bridge_html() {
    return <<<'HTML'
<script id="ktk-clarity-consent-bridge" class="_iub_cs_skip" data-cmp-ab="2">
(function (window, document) {
    if (window.__ktkClarityConsentBridge) return;
    window.__ktkClarityConsentBridge = true;
    window.clarity = window.clarity || function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
    };

    var lastConsent = null;
    function applyConsent(granted) {
        if (lastConsent === granted) return;
        lastConsent = granted;
        window.KTK_ANALYTICS_CONSENT = granted;
        window.clarity('consentv2', {
            ad_Storage: 'denied',
            analytics_Storage: granted ? 'granted' : 'denied'
        });
        window.dispatchEvent(new CustomEvent('ktk:analytics-consent', {
            detail: { analytics: granted }
        }));
    }

    function readCookieConsent() {
        var cookies = String(document.cookie || '').split(';');
        for (var index = 0; index < cookies.length; index += 1) {
            var parts = cookies[index].trim().split('=');
            var name = parts.shift();
            if (!name || name.indexOf('_iub_cs-') !== 0 || !parts.length) continue;
            try {
                var value = JSON.parse(decodeURIComponent(parts.join('=')));
                var purposes = value && (value.purposes
                    || (value.preferences && value.preferences.purposes));
                if (purposes && Object.prototype.hasOwnProperty.call(purposes, '4')) {
                    return purposes['4'] === true;
                }
                if (value && typeof value.consent === 'boolean') return value.consent;
            } catch (error) {
                continue;
            }
        }
        return null;
    }

    function readConsent() {
        try {
            var api = window._iub && window._iub.cs && window._iub.cs.api;
            if (!api) return readCookieConsent();
            var preferences = typeof api.getPreferences === 'function'
                ? api.getPreferences()
                : null;
            if (preferences && preferences.purposes
                && Object.prototype.hasOwnProperty.call(preferences.purposes, '4')) {
                return preferences.purposes['4'] === true;
            }
            var preferenceId = typeof api.getPreferenceId === 'function'
                ? api.getPreferenceId()
                : '';
            if (preferenceId && typeof api.isConsentGiven === 'function') {
                return api.isConsentGiven() === true;
            }
        } catch (error) {
            return readCookieConsent();
        }
        return readCookieConsent();
    }

    function syncConsent() {
        var consent = readConsent();
        if (consent !== null) applyConsent(consent);
    }

    applyConsent(readConsent() === true);

    var dataLayer = window.dataLayer = window.dataLayer || [];
    var originalPush = dataLayer.push;
    dataLayer.push = function () {
        for (var index = 0; index < arguments.length; index += 1) {
            var eventName = arguments[index] && arguments[index].event;
            if (eventName === 'iubenda_consent_given_purpose_4'
                || eventName === 'iubenda_preference_not_needed') {
                applyConsent(true);
            } else if (eventName && eventName.indexOf('iubenda_') === 0) {
                window.setTimeout(syncConsent, 0);
            }
        }
        return originalPush.apply(this, arguments);
    };

    document.addEventListener('pointerup', function () {
        window.setTimeout(syncConsent, 100);
    }, { passive: true });
    window.addEventListener('focus', syncConsent);
    var attempts = 0;
    var consentTimer = window.setInterval(function () {
        attempts += 1;
        syncConsent();
        if (attempts >= 60 || lastConsent !== null) {
            window.clearInterval(consentTimer);
        }
    }, 500);
})(window, document);
</script>
HTML;
}

function ktk_homepage_required_head_html( $head ) {
    if ( ! ktk_homepage_shortcode_is_replica_page() ) {
        return $head;
    }
    $before = '';
    $after = '';
    if ( false === strpos( $head, 'google-site-verification' ) ) {
        $before .= '<meta name="google-site-verification" content="' . esc_attr( KTK_HOMEPAGE_GOOGLE_SITE_VERIFICATION ) . '">' . "\n";
    }
    if ( false === strpos( $head, KTK_HOMEPAGE_IUBENDA_WIDGET_ID ) ) {
        $widget_url = 'https://embeds.iubenda.com/widgets/' . rawurlencode( KTK_HOMEPAGE_IUBENDA_WIDGET_ID ) . '.js';
        $before .= '<script id="ktk-iubenda-widget" class="_iub_cs_skip" src="' . esc_url( $widget_url ) . '" type="text/javascript"></script>' . "\n";
    }
    if ( false === strpos( $head, 'ktk-clarity-consent-bridge' ) ) {
        $before .= ktk_homepage_clarity_consent_bridge_html() . "\n";
    }
    if ( false === strpos( $head, KTK_HOMEPAGE_GTM_ID ) ) {
        $after .= '<script id="ktk-gtm-loader" class="_iub_cs_skip">'
            . '(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({\'gtm.start\':'
            . 'new Date().getTime(),event:\'gtm.js\'});var f=d.getElementsByTagName(s)[0],'
            . 'j=d.createElement(s),dl=l!==\'dataLayer\'?\'&l=\'+l:\'\';j.async=true;j.src='
            . '\'https://www.googletagmanager.com/gtm.js?id=\'+i+dl;f.parentNode.insertBefore(j,f);'
            . '})(window,document,\'script\',\'dataLayer\',\'' . esc_js( KTK_HOMEPAGE_GTM_ID ) . '\');'
            . '</script>' . "\n";
    }
    if ( false === strpos( $head, KTK_HOMEPAGE_GOOGLE_ADS_ID ) ) {
        $ads_url = 'https://www.googletagmanager.com/gtag/js?id=' . rawurlencode( KTK_HOMEPAGE_GOOGLE_ADS_ID );
        $after .= '<script id="ktk-google-ads-loader" class="_iub_cs_skip" async src="' . esc_url( $ads_url ) . '"></script>' . "\n";
        $after .= '<script id="ktk-google-ads-config" class="_iub_cs_skip">'
            . 'window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};'
            . 'window.gtag(\'js\',new Date());window.gtag(\'config\',\'' . esc_js( KTK_HOMEPAGE_GOOGLE_ADS_ID ) . '\');'
            . '</script>' . "\n";
    }
    $has_clarity_loader = false !== strpos( $head, 'clarity.ms/tag/' ) && false !== strpos( $head, KTK_HOMEPAGE_CLARITY_ID );
    if ( ! $has_clarity_loader && ( ! function_exists( 'ktk_clarity_enabled' ) || ktk_clarity_enabled() ) ) {
        $after .= '<script id="ktk-clarity-loader" class="_iub_cs_skip" type="text/javascript">' . "\n" . <<<'HTML'
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
HTML;
        $after .= '    })(window, document, "clarity", "script", "' . esc_js( KTK_HOMEPAGE_CLARITY_ID ) . '");' . "\n</script>\n";
    }
    return $before . $head . "\n" . $after;
}

function ktk_homepage_required_body_open_html() {
    if ( ! ktk_homepage_shortcode_is_replica_page() ) {
        return '';
    }
    return '<noscript id="ktk-gtm-noscript"><iframe src="https://www.googletagmanager.com/ns.html?id=' . rawurlencode( KTK_HOMEPAGE_GTM_ID ) . '" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>';
}
