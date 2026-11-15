<?php
/** Short-lived authenticated staging snapshot. No database, payload or cache writes. */
if (!defined('ABSPATH')) { exit; }
add_action('wp_loaded', static function () {
    $token = $_SERVER['HTTP_X_KTK_SNAPSHOT_TOKEN'] ?? null;
    if (time() > __KTK_SNAPSHOT_EXPIRES__ || !is_string($token) || !hash_equals('__KTK_SNAPSHOT_TOKEN_SHA__', hash('sha256', $token))) { return; }
    nocache_headers();
    header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0', true);
    header('X-Robots-Tag: noindex, noarchive', true);
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'krawlthroughkrakow.com' ||
        home_url('/') !== 'https://krawlthroughkrakow.com/staging/' || site_url('/') !== 'https://krawlthroughkrakow.com/staging/' ||
        (int)get_option('blog_public') !== 0) { wp_send_json(array('error' => 'staging_identity_required'), 403); }
    try {
        if (basename(__FILE__) !== '__KTK_SNAPSHOT_HELPER__' || function_exists('ktk_capture_staging_original_state')) {
            throw new RuntimeException('Exact fresh snapshot caller required');
        }
        if (!defined('KTK_STAGING_STATE_ALLOWED')) { define('KTK_STAGING_STATE_ALLOWED', true); }
        /* __KTK_STAGING_STATE_CORE__ */
        wp_send_json(ktk_capture_staging_original_state(__FILE__));
    } catch (Throwable $error) {
        // Do not disclose raw SQL, private paths, saved settings or record data.
        wp_send_json(array('error' => 'protected_snapshot_failed'), 409);
    }
}, -998);
