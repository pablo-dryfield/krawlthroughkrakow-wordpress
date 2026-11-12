<?php
/** Plugin Name: KTK Clarity Ownership and Environment Policy */
if (!defined('ABSPATH')) { exit; }

const KTK_CLARITY_PROJECT_ID = 'z9d5iuilvn';

function ktk_clarity_enabled() {
    $home = parse_url(home_url('/'));
    return 'https' === ($home['scheme'] ?? '')
        && 'krawlthroughkrakow.com' === ($home['host'] ?? '')
        && empty($home['port']) && '' === rtrim($home['path'] ?? '', '/')
        && 'krawlthroughkrakow.com' === strtolower($_SERVER['HTTP_HOST'] ?? '');
}

function ktk_clarity_remove_legacy_html($html) {
    if (!is_string($html) || false === stripos($html, 'clarity.ms/tag/')) { return $html; }
    return preg_replace_callback('#<script\b[^>]*>.*?</script\s*>#is', static function ($match) {
        $tag = $match[0];
        $processor = new WP_HTML_Tag_Processor($tag);
        if (!$processor->next_tag('SCRIPT')) { return $tag; }
        $src = $processor->get_attribute('src');
        if (is_string($src)) {
            $url = parse_url(str_starts_with($src, '//') ? 'https:' . $src : $src);
            return in_array(strtolower($url['host'] ?? ''), array('www.clarity.ms', 'clarity.ms'), true)
                && preg_match('#^/tag/[a-z0-9]+/?$#D', $url['path'] ?? '') ? '' : $tag;
        }
        preg_match('#^<script\b[^>]*>(.*?)</script\s*>$#is', $tag, $body);
        $script = preg_replace('/\s+/', '', str_replace('"', "'", $body[1] ?? ''));
        $script = preg_replace("/('script',)'[a-z0-9]+'(\\);?)$/D", '$1\'__PROJECT__\'$2', $script);
        $expected = "(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};"
            . "t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;"
            . "y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);"
            . "})(window,document,'clarity','script','__PROJECT__');";
        // Only suppress the complete standard loader, never a mixed script block.
        return rtrim($script, ';') === rtrim($expected, ';') ? '' : $tag;
    }, $html);
}

function ktk_clarity_filter_saved_integrations($value) {
    if (is_admin()) { return $value; }
    if (is_array($value)) {
        return array_map('ktk_clarity_filter_saved_integrations', $value);
    }
    return ktk_clarity_remove_legacy_html($value);
}
// Filter output in memory; the original settings remain available for rollback.
add_filter('option_et_divi', 'ktk_clarity_filter_saved_integrations');
add_filter('option_wpcode_snippets', 'ktk_clarity_filter_saved_integrations');

function ktk_clarity_output_loader() {
    if (is_admin() || !ktk_clarity_enabled()) { return; }
    echo '<script id="ktk-clarity-loader" class="_iub_cs_skip">'
        . '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};'
        . 't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;'
        . 'y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);'
        . '})(window,document,"clarity","script","' . esc_js(KTK_CLARITY_PROJECT_ID) . '");</script>' . "\n";
}
// The existing storefront consent bridge is registered at priority 0 site-wide.
add_action('wp_head', 'ktk_clarity_output_loader', 1);

function ktk_clarity_filter_replay_config($response, $server, $request) {
    $config_read = 'GET' === $request->get_method()
        && preg_match('#^/ktk-storefront/v1/(?:config|products(?:/[^/]+)?)$#D', $request->get_route());
    $quote = 'POST' === $request->get_method() && '/ktk-storefront/v1/cart/quote' === $request->get_route();
    if ((!$config_read && !$quote)
        || !($response instanceof WP_REST_Response) || 200 !== $response->get_status()) { return $response; }
    $data = $response->get_data();
    if (!is_array($data)) { return $response; }
    foreach (array('journeyReplay', 'storefrontConfig') as $key) {
        if ('storefrontConfig' === $key) {
            if (!isset($data[$key]['journeyReplay']) || !is_array($data[$key]['journeyReplay'])) { continue; }
            $config =& $data[$key]['journeyReplay'];
        } else {
            if (!isset($data[$key]) || !is_array($data[$key])) { continue; }
            $config =& $data[$key];
        }
        $config['projectId'] = KTK_CLARITY_PROJECT_ID;
        if (!ktk_clarity_enabled()) { $config['enabled'] = false; }
        unset($config);
    }
    $response->set_data($data);
    return $response;
}
add_filter('rest_post_dispatch', 'ktk_clarity_filter_replay_config', 10, 3);
