<?php
/** Plugin Name: KTK Staging SEO Discovery Preview and Indexing Guard */
if (!defined('ABSPATH')) { exit; }

const KTK_SEO_DISCOVERY_VERSION = '2026.11.12.1';

function ktk_seo_discovery_is_staging() {
    return home_url('/') === 'https://krawlthroughkrakow.com/staging/'
        && site_url('/') === 'https://krawlthroughkrakow.com/staging/'
        && strtolower($_SERVER['HTTP_HOST'] ?? '') === 'krawlthroughkrakow.com';
}

function ktk_seo_discovery_path() {
    return (string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
}

function ktk_seo_staging_storefront_request() {
    $path = ktk_seo_discovery_path();
    return ktk_seo_discovery_is_staging()
        && ($path === '/staging/store2' || str_starts_with($path, '/staging/store2/')
            || (class_exists('KTK_Storefront') && KTK_Storefront::is_storefront_request()));
}

function ktk_seo_staging_storefront_robots($robots) {
    if (!ktk_seo_staging_storefront_request()) { return $robots; }
    unset($robots['index'], $robots['follow'], $robots['max-image-preview']);
    $robots['noindex'] = true;
    $robots['nofollow'] = true;
    return $robots;
}

function ktk_seo_staging_storefront_headers($headers) {
    if (!ktk_seo_staging_storefront_request()) { return $headers; }
    foreach (array_keys($headers) as $name) {
        if (strtolower($name) === 'x-robots-tag') { unset($headers[$name]); }
    }
    $headers['X-Robots-Tag'] = 'noindex, nofollow';
    return $headers;
}

function ktk_seo_discovery_data() {
    $file = __DIR__ . '/ktk-seo-sitemap-assets/data.json';
    $data = is_file($file) ? json_decode(file_get_contents($file), true) : null;
    return ktk_seo_validate_discovery_data($data);
}

function ktk_seo_validate_discovery_data($data) {
    if (!is_array($data) || ($data['schemaVersion'] ?? null) !== 1 || ($data['targetOrigin'] ?? '') !== 'https://krawlthroughkrakow.com') {
        throw new RuntimeException('Verified sitemap preview data is unavailable');
    }
    $seen = array();
    foreach (array('content', 'storefront') as $group) {
        if (empty($data[$group]) || !is_array($data[$group])) { throw new RuntimeException('Empty sitemap preview'); }
        foreach ($data[$group] as $entry) {
            $url = $entry['loc'] ?? '';
            if (array_keys($entry) !== array('loc') || !preg_match('#^https://krawlthroughkrakow\.com/(?:[a-z0-9-]+/)*$#D', $url)
                || preg_match('#^https://krawlthroughkrakow\.com/(?:staging|store|wp-admin|wp-json)(?:/|$)#', $url)
                || str_starts_with($url, 'https://krawlthroughkrakow.com/store2/cart/')
                || str_starts_with($url, 'https://krawlthroughkrakow.com/store2/checkout/') || isset($seen[$url])
                || ('content' === $group && str_starts_with($url, 'https://krawlthroughkrakow.com/store2/'))
                || ('storefront' === $group && !str_starts_with($url, 'https://krawlthroughkrakow.com/store2/'))) {
                throw new RuntimeException('Invalid canonical sitemap entry');
            }
            $seen[$url] = true;
        }
    }
    if (!is_string($data['robotsPreview'] ?? null) || str_contains($data['robotsPreview'], '<')) { throw new RuntimeException('Invalid robots preview'); }
    return $data;
}

function ktk_seo_preview_route() {
    if (!ktk_seo_discovery_is_staging()) { return ''; }
    return array(
        '/staging/seo-preview/sitemap.xml' => 'index',
        '/staging/seo-preview/content.xml' => 'content',
        '/staging/seo-preview/storefront.xml' => 'storefront',
        '/staging/seo-preview/robots.txt' => 'robots',
    )[ktk_seo_discovery_path()] ?? '';
}

function ktk_seo_preview_no_stylesheet() { return ''; }

function ktk_seo_preview_document($kind, $data = null) {
    if (!in_array($kind, array('index', 'content', 'storefront', 'robots'), true)) { throw new InvalidArgumentException('Unknown preview'); }
    $data = null === $data ? ktk_seo_discovery_data() : ktk_seo_validate_discovery_data($data);
    if ('robots' === $kind) { return $data['robotsPreview']; }
    if (!class_exists('WP_Sitemaps_Renderer') || !class_exists('SimpleXMLElement')) { throw new RuntimeException('Native sitemap XML renderer unavailable'); }
    // Staging disables WordPress's public sitemap/XSL endpoints. Use its XML
    // formatter without linking to those deliberately unavailable stylesheets.
    add_filter('wp_sitemaps_stylesheet_url', 'ktk_seo_preview_no_stylesheet');
    add_filter('wp_sitemaps_stylesheet_index_url', 'ktk_seo_preview_no_stylesheet');
    try {
        $renderer = new WP_Sitemaps_Renderer();
        $xml = 'index' === $kind ? $renderer->get_sitemap_index_xml(array(
            array('loc' => home_url('/seo-preview/content.xml')),
            array('loc' => home_url('/seo-preview/storefront.xml')),
        )) : $renderer->get_sitemap_xml($data[$kind]);
        if (!is_string($xml) || '' === $xml) { throw new RuntimeException('Sitemap XML failed'); }
        return $xml;
    } finally {
        remove_filter('wp_sitemaps_stylesheet_url', 'ktk_seo_preview_no_stylesheet');
        remove_filter('wp_sitemaps_stylesheet_index_url', 'ktk_seo_preview_no_stylesheet');
    }
}

function ktk_seo_preview_response() {
    $kind = ktk_seo_preview_route();
    if ('' === $kind) { return; }
    nocache_headers();
    header('Cache-Control: private, no-store, max-age=0', true);
    header('X-Robots-Tag: noindex, nofollow', true);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, array('GET', 'HEAD'), true)) {
        status_header(405); header('Allow: GET, HEAD'); exit;
    }
    try {
        $document = ktk_seo_preview_document($kind);
        status_header(200);
        header('Content-Type: ' . ('robots' === $kind ? 'text/plain' : 'application/xml') . '; charset=UTF-8');
        header('X-KTK-SEO-Preview: ' . KTK_SEO_DISCOVERY_VERSION);
        if ('HEAD' !== $method) { echo $document; }
    } catch (Throwable $error) {
        status_header(503); header('Content-Type: text/plain; charset=UTF-8');
        if ('HEAD' !== $method) { echo 'SEO preview unavailable.'; }
    }
    exit;
}

function ktk_seo_discovery_register() {
    if (!ktk_seo_discovery_is_staging()) { return; }
    add_filter('wp_robots', 'ktk_seo_staging_storefront_robots', PHP_INT_MAX);
    add_filter('wp_headers', 'ktk_seo_staging_storefront_headers', PHP_INT_MAX);
    add_action('template_redirect', 'ktk_seo_preview_response', -30);
}
add_action('init', 'ktk_seo_discovery_register');
