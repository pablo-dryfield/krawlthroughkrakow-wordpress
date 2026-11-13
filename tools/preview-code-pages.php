<?php
/** Local-only full-registry visual preview; no live tracking or email submission. */
if (PHP_SAPI !== 'cli-server') { http_response_code(404); exit; }
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($path, '/ktk-code-pages-assets/')) { return false; }
define('ABSPATH', dirname(__DIR__));
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function esc_url($value) { return esc_attr($value); }
function home_url($path) { return 'https://krawlthroughkrakow.com/staging' . $path; }
function admin_url($path) { return home_url('/wp-admin/' . $path); }
function rest_url($path) { return home_url('/wp-json/' . $path); }
function wp_create_nonce($action) { return 'local-preview'; }
function wp_salt($purpose) { return 'local-only-preview-not-a-server-secret'; }
function add_action(...$args) {}
$assets = ABSPATH . '/staging/wp-content/mu-plugins/ktk-code-pages-assets/';
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-code-pages.php';
$registry = is_file($assets . 'registry.php') ? require $assets . 'registry.php' : array('routes' => array());
$route = '/' === $path ? '/about-us/how-to-join/' : $path;
if (isset($registry['redirects'][$route])) { $query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY); header('Location: ' . $registry['redirects'][$route]['target'] . ($query ? '?' . $query : ''), true, $registry['redirects'][$route]['status']); exit; }
$entry = $registry['routes'][$route] ?? null;
if (!$entry) {
    if ('/about-us/how-to-join/' !== $route) { http_response_code(404); echo 'Not built: ' . esc_html($route); exit; }
    $page = require $assets . 'how-to-join.php';
} else { $page = require $assets . $entry['file']; }
$preview_epoch = isset($_GET['ktk_preview_epoch']) && is_string($_GET['ktk_preview_epoch']) && preg_match('/^\d{10}$/D', $_GET['ktk_preview_epoch']) ? (int) $_GET['ktk_preview_epoch'] : null;
$html = isset($page['html']) ? $page['html'] : str_replace('__KTK_PAGE_MAIN_CONTENT__', file_get_contents($assets . $page['main_file']), file_get_contents($assets . $page['shell_file']));
$html = ktk_pages_event_promotion_body($html, $page, $preview_epoch);
$page = ktk_pages_event_page_state($page, $preview_epoch);
$html = ktk_pages_prepare_forms($html, $page);
$html = str_replace(array('__KTK_PAGE_ASSETS__', '__KTK_HOME_URL__'), array('/ktk-code-pages-assets/', home_url('/')), $html);
$html = str_replace('data-ktk-expired-href="' . esc_url(home_url('/new-years-eve/')) . '#nye-updates"', 'data-ktk-expired-href="/new-years-eve/#nye-updates"', $html);
$css = $page['css'] ?? 'how-to-join.css';
?>
<!doctype html><html lang="en-US"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?php echo esc_html($page['title']); ?></title><meta name="robots" content="noindex, nofollow">
<?php if ('' !== $page['description']) { ?><meta name="description" content="<?php echo esc_attr($page['description']); ?>"><?php } ?>
<link rel="canonical" href="<?php echo esc_url(home_url($route)); ?>">
<?php echo str_replace('https://krawlthroughkrakow.com/', home_url('/'), $page['metadata'] ?? ''); ?>
<?php foreach (($page['schema'] ?? array()) as $schema) { ?><script type="application/ld+json"<?php if ('new-years-eve' === ($page['key'] ?? '')) { ?> data-ktk-event-schema=""<?php } ?>><?php echo str_replace('https://krawlthroughkrakow.com/', home_url('/'), json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP)); ?></script><?php } ?>
<link rel="stylesheet" href="/ktk-code-pages-assets/<?php echo esc_attr($css); ?>"><link rel="stylesheet" href="/ktk-code-pages-assets/font-resilience.css"><link rel="stylesheet" href="/ktk-code-pages-assets/runtime.css">
</head><body class="<?php echo esc_attr($page['body_class']); ?> ktk-code-page" data-ktk-page="<?php echo esc_attr($page['key'] ?? 'how-to-join'); ?>" data-ktk-form-token-url="<?php echo esc_url(admin_url('admin-ajax.php')); ?>">
<a class="ktk-parity-skip-link" href="#main-content">Skip to content</a>
<?php echo $html; ?><script src="/ktk-code-pages-assets/runtime.js" defer></script>
</body></html>
