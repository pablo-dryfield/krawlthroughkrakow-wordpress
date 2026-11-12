<?php
/** Local-only visual preview: php -S 127.0.0.1:5184 -t staging/wp-content/mu-plugins tools/preview-homepage-parity.php */
if (PHP_SAPI !== 'cli-server') { http_response_code(404); exit; }
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($path, '/ktk-homepage-assets/')) { return false; }
define('ABSPATH', dirname(__DIR__));
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function esc_url($value) { return esc_attr($value); }
function content_url($path) { return str_replace('/mu-plugins', '', $path); }
function home_url($path) { return 'https://krawlthroughkrakow.com/staging' . $path; }
function ktk_homepage_is_staging() { return true; }
function ktk_homepage_asset($file) { return '/ktk-homepage-assets/' . $file; }
function ktk_homepage_product_url($slug = 'pub-crawl-28') { return home_url('/store2/' . $slug . '/#book'); }
function ktk_homepage_icon($name, $class = '') { return '<svg class="' . esc_attr($class) . '" width="24" height="24" aria-hidden="true"><use href="/ktk-homepage-assets/icons.svg#' . esc_attr($name) . '"></use></svg>'; }
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php';
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-homepage-assets/hero.php';
require ABSPATH . '/staging/wp-content/mu-plugins/ktk-homepage-assets/parity-seasonal-content.php';
?>
<!doctype html>
<html lang="en-US"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Local production parity preview</title>
<link rel="stylesheet" href="/ktk-homepage-assets/parity.css">
<link rel="stylesheet" href="/ktk-homepage-assets/font-resilience.css">
<link rel="stylesheet" href="/ktk-homepage-assets/parity-runtime.css">
<link rel="stylesheet" href="/ktk-homepage-assets/hero.css">
</head><body class="<?php echo esc_attr(ktk_homepage_parity_body_class()); ?> ktk-homepage-standalone">
<a class="ktk-parity-skip-link" href="#main-content">Skip to content</a>
<?php echo ktk_homepage_static_body(); ?>
<script src="/ktk-homepage-assets/parity.js" defer></script>
<script src="/ktk-homepage-assets/journey.js" defer></script>
</body></html>
