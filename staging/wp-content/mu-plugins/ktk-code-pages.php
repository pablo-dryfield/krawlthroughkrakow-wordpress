<?php
/** Plugin Name: KTK Code-managed Content Pages */
if (!defined('ABSPATH')) { exit; }

const KTK_PAGES_GOOGLE_SITE_VERIFICATION = 'aZAgHxuJ9wBKSsHJyo7THEz_9K1ruYqIpJm1YyO9lUA';
const KTK_PAGES_GTM_ID = 'GTM-PHXGRZ';
const KTK_PAGES_GOOGLE_ADS_ID = 'AW-956184209';
const KTK_PAGES_CLARITY_ID = 'z9d5iuilvn';
const KTK_PAGES_IUBENDA_WIDGET_ID = '92c90d2a-9d50-4f09-9c21-bcb72ccc2897';

function ktk_pages_is_staging() {
    return '/staging' === rtrim((string) parse_url(home_url('/'), PHP_URL_PATH), '/');
}
function ktk_pages_is_production_enabled() {
    if (!defined('KTK_CODE_PAGES_PRODUCTION_ENABLED') || true !== KTK_CODE_PAGES_PRODUCTION_ENABLED) { return false; }
    $home = parse_url(home_url('/'));
    if ('https' !== ($home['scheme'] ?? '') || 'krawlthroughkrakow.com' !== ($home['host'] ?? '') || !empty($home['port']) || '' !== rtrim($home['path'] ?? '', '/')) { return false; }
    return isset($_SERVER['HTTP_HOST']) ? 'krawlthroughkrakow.com' === strtolower($_SERVER['HTTP_HOST']) : 'cli' === PHP_SAPI;
}
function ktk_pages_environment_enabled() {
    return ktk_pages_is_staging() || ktk_pages_is_production_enabled();
}
function ktk_pages_shortcode_is_replica_page() {
    if (!ktk_pages_environment_enabled() || is_feed() || is_embed()) { return false; }
    $route = ktk_pages_request_route();
    $registry = ktk_pages_registry();
    if (!isset($registry['routes'][$route])) { return false; }
    if (ktk_pages_is_staging()) { return true; }
    $page = ktk_pages_definition($route);
    return is_array($page['production_seo'] ?? null) && ($page['production_seo']['source_url'] ?? '') === home_url($route);
}
function ktk_pages_request_route() {
    $path = (string) parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH);
    if (ktk_pages_is_staging()) { return str_starts_with($path, '/staging/') ? substr($path, strlen('/staging')) : ''; }
    return ktk_pages_is_production_enabled() && str_starts_with($path, '/') ? $path : '';
}
function ktk_pages_page_policy($page) {
    if (ktk_pages_is_staging()) {
        return array('robots' => array(array('name' => 'robots', 'content' => 'noindex, nofollow')),
            'x_robots_tag' => 'noindex, nofollow', 'canonical' => array(home_url($page['route'] ?? '/about-us/how-to-join/')));
    }
    return $page['production_seo'];
}
function ktk_pages_registry() {
    static $registry;
    if (null !== $registry) { return $registry; }
    $file = __DIR__ . '/ktk-code-pages-assets/registry.php';
    $data = is_file($file) ? require $file : null;
    if (is_array($data) && (!empty($data['complete']) || defined('KTK_PAGES_PREVIEW'))) {
        $registry = $data;
    } else {
        $registry = array('routes' => array('/about-us/how-to-join/' => array('key' => 'how-to-join', 'file' => 'how-to-join.php')), 'redirects' => array());
    }
    return $registry;
}
function ktk_pages_asset($file) {
    $path = __DIR__ . '/ktk-code-pages-assets/' . $file;
    return content_url('/mu-plugins/ktk-code-pages-assets/' . $file)
        . '?v=' . (is_file($path) ? substr(hash_file('sha256', $path), 0, 12) : '1');
}
function ktk_pages_definition($route = null) {
    $route = null === $route ? ktk_pages_request_route() : $route;
    $entry = ktk_pages_registry()['routes'][$route] ?? null;
    if (!$entry || !preg_match('#^(?:pages/)?[a-z0-9-]+\.php$#D', $entry['file'])) { return null; }
    return require __DIR__ . '/ktk-code-pages-assets/' . $entry['file'];
}
function ktk_pages_static_body() {
    $page = ktk_pages_definition();
    if (!$page) { return ''; }
    if (isset($page['html'])) { $html = $page['html']; }
    else {
        $base = __DIR__ . '/ktk-code-pages-assets/';
        if (!preg_match('#^shells/[a-f0-9]{20}\.html$#D', $page['shell_file']) || !preg_match('#^content/[a-z0-9-]+\.html$#D', $page['main_file'])) { return ''; }
        $html = str_replace('__KTK_PAGE_MAIN_CONTENT__', file_get_contents($base . $page['main_file']), file_get_contents($base . $page['shell_file']));
    }
    $html = ktk_pages_prepare_forms($html, $page);
    return str_replace(array('__KTK_PAGE_ASSETS__', '__KTK_HOME_URL__'), array(
        esc_url(content_url('/mu-plugins/ktk-code-pages-assets/')), esc_url(home_url('/')),
    ), $html);
}
require_once __DIR__ . '/ktk-code-pages-assets/integrations.php';
require_once __DIR__ . '/ktk-code-pages-assets/forms.php';

function ktk_pages_staging_brunch_alias($request_uri) {
    if ('https://krawlthroughkrakow.com/staging/' !== home_url('/')
        || 'https://krawlthroughkrakow.com/staging/' !== site_url('/')
        || (isset($_SERVER['HTTP_HOST']) && 'krawlthroughkrakow.com' !== strtolower($_SERVER['HTTP_HOST']))
        || !in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', array('GET','HEAD'), true)
        || preg_match('/[\x00-\x20\x7f]/', $request_uri)
        || '/staging/store/Bottomless-Brunch-p661114244' !== parse_url($request_uri, PHP_URL_PATH)) { return null; }
    $query = (string) parse_url($request_uri, PHP_URL_QUERY);
    return home_url('/store2/bottomless-brunch-29/') . ('' !== $query ? '?' . $query : '') . '#book';
}

add_action('template_redirect', function () {
    $legacy_brunch = ktk_pages_staging_brunch_alias($_SERVER['REQUEST_URI'] ?? '');
    if (null !== $legacy_brunch) { wp_safe_redirect($legacy_brunch, 301, 'KTK Approved Staging Alias'); exit; }
    if (ktk_pages_environment_enabled() && !is_feed() && !is_embed()) {
        $redirect = ktk_pages_registry()['redirects'][ktk_pages_request_route()] ?? null;
        if ($redirect) {
            if (!preg_match('#^/(?!/)(?!store(?:2)?(?:/|$))#', $redirect['target']) && '/' !== $redirect['target']) { return; }
            $destination = home_url($redirect['target']);
            $query = (string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_QUERY);
            if ('' !== $query) { $destination .= '?' . $query; }
            wp_safe_redirect($destination, $redirect['status'], 'KTK Code-managed Pages'); exit;
        }
    }
    if (!ktk_pages_shortcode_is_replica_page()) { return; }
    status_header(200);
    $page = ktk_pages_definition();
    $policy = ktk_pages_page_policy($page);
    if (!empty($policy['x_robots_tag'])) { header('X-Robots-Tag: ' . str_replace(array("\r", "\n"), '', $policy['x_robots_tag']), true); }
    $url = home_url($page['route'] ?? '/about-us/how-to-join/');
    $css = $page['css'] ?? 'how-to-join.css';
    $extra = str_replace('https://krawlthroughkrakow.com/', esc_url(home_url('/')), $page['metadata'] ?? '');
    ?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title><?php echo esc_html($page['title']); ?></title>
    <?php if ('' !== $page['description']) { ?><meta name="description" content="<?php echo esc_attr($page['description']); ?>"><?php } ?>
    <?php foreach ($policy['robots'] as $robot) { ?><meta name="<?php echo esc_attr($robot['name']); ?>" content="<?php echo esc_attr($robot['content']); ?>"><?php } ?>
    <?php foreach ($policy['canonical'] as $canonical) { ?><link rel="canonical" href="<?php echo esc_url($canonical); ?>"><?php } ?>
    <?php if (!$extra && ktk_pages_is_staging()) { ?><meta property="og:type" content="website">
    <meta property="og:title" content="<?php echo esc_attr($page['title']); ?>">
    <meta property="og:description" content="<?php echo esc_attr($page['description']); ?>">
    <meta property="og:url" content="<?php echo esc_url($url); ?>"><?php } else { echo $extra; } ?>
    <?php foreach (($page['schema'] ?? array()) as $schema) { ?><script type="application/ld+json"><?php echo str_replace('https://krawlthroughkrakow.com/', home_url('/'), wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP)); ?></script><?php } ?>
    <link rel="stylesheet" href="<?php echo esc_url(ktk_pages_asset($css)); ?>">
    <link rel="stylesheet" href="<?php echo esc_url(ktk_pages_asset('font-resilience.css')); ?>">
    <link rel="stylesheet" href="<?php echo esc_url(ktk_pages_asset('runtime.css')); ?>">
    <?php echo ktk_pages_required_head_html(ktk_pages_captured_head()); ?>
</head>
<body class="<?php echo esc_attr($page['body_class']); ?> ktk-code-page" data-ktk-page="<?php echo esc_attr($page['key'] ?? 'how-to-join'); ?>" data-ktk-form-token-url="<?php echo esc_url(admin_url('admin-ajax.php')); ?>">
    <a class="ktk-parity-skip-link" href="#main-content">Skip to content</a>
    <?php echo ktk_pages_required_body_open_html(); ?>
    <?php echo ktk_pages_static_body(); ?>
    <script src="<?php echo esc_url(ktk_pages_asset('runtime.js')); ?>" defer></script>
    <?php echo ktk_pages_captured_footer(); ?>
</body>
</html>
    <?php exit;
}, -20);
