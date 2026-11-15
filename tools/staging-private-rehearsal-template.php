<?php
/** Expiring authenticated staging-only private fixture. No public application or database writes. */
if (!defined('ABSPATH')) { exit; }
add_action('wp_loaded', static function () {
    $token = $_SERVER['HTTP_X_KTK_REHEARSAL_TOKEN'] ?? null;
    if (time() > __KTK_REHEARSAL_EXPIRES__ || !is_string($token) || !hash_equals('__KTK_REHEARSAL_TOKEN_SHA__', hash('sha256', $token))) { return; }
    nocache_headers();
    header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0', true);
    header('X-Robots-Tag: noindex, noarchive', true);
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'krawlthroughkrakow.com' ||
        home_url('/') !== 'https://krawlthroughkrakow.com/staging/' || site_url('/') !== 'https://krawlthroughkrakow.com/staging/' ||
        (int)get_option('blog_public') !== 0) { wp_send_json(array('error' => 'staging_identity_required'), 403); }
    try {
        $raw = file_get_contents('php://input');
        if ($raw === false || strlen($raw) > 512) { throw new RuntimeException('Request budget exceeded'); }
        $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($payload) || !is_string($payload['action'] ?? null) ||
            !in_array($payload['action'], array('prepare','inspect','apply','interrupt','rollback','export','cleanup'), true) ||
            array_keys($payload) !== ($payload['action'] === 'cleanup' ? array('action','exportSha256','archiveSha256') : array('action')) ||
            json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) !== $raw) {
            throw new RuntimeException('Exact canonical request required');
        }
        if ($payload['action'] === 'cleanup' && (!is_string($payload['exportSha256']) || !is_string($payload['archiveSha256']) ||
            !preg_match('/^[a-f0-9]{64}$/D', $payload['exportSha256']) || !preg_match('/^[a-f0-9]{64}$/D', $payload['archiveSha256']))) {
            throw new RuntimeException('Exact cleanup receipts required');
        }
    } catch (Throwable $error) { wp_send_json(array('error' => 'private_fixture_request_rejected'), 400); }
    set_error_handler(static function ($severity, $message, $file, $line) {
        if (!(error_reporting() & $severity)) { return false; }
        throw new ErrorException('Private rehearsal operation failed', 0, $severity);
    });
    try {
        if (basename(__FILE__) !== '__KTK_REHEARSAL_HELPER__' || function_exists('ktk_capture_staging_original_state') ||
            class_exists('KTK_Active_Content_Transaction', false) || class_exists('KTK_Staging_Private_Fixture', false)) {
            throw new RuntimeException('Exact fresh rehearsal caller required');
        }
        if (!defined('KTK_STAGING_STATE_ALLOWED')) { define('KTK_STAGING_STATE_ALLOWED', true); }
        if (!defined('KTK_UPDATE_ENGINE_ALLOWED')) { define('KTK_UPDATE_ENGINE_ALLOWED', true); }
        if (!defined('KTK_STAGING_FIXTURE_ALLOWED')) { define('KTK_STAGING_FIXTURE_ALLOWED', true); }
        /* __KTK_REHEARSAL_STATE_CORE__ */
        /* __KTK_REHEARSAL_UPDATE_ENGINE__ */
        /* __KTK_REHEARSAL_PRIVATE_FIXTURE__ */
        $owned = json_decode(base64_decode('__KTK_REHEARSAL_OWNED_MAP__', true), true, 512, JSON_THROW_ON_ERROR);
        $activation = base64_decode('__KTK_REHEARSAL_ACTIVATION__', true);
        if (!is_array($owned) || !is_string($activation)) { throw new RuntimeException('Compiled fixture bindings required'); }
        $fixture = new KTK_Staging_Private_Fixture(ABSPATH, __FILE__, '__KTK_REHEARSAL_TRANSACTION__', '__KTK_REHEARSAL_COMMIT__',
            $owned, $activation, static fn() => ktk_capture_staging_original_state(__FILE__));
        $result = $fixture->run($payload['action'], $payload['exportSha256'] ?? null, $payload['archiveSha256'] ?? null);
    } catch (Throwable $error) {
        // No SQL, raw saved records, private filesystem paths or exception details enter public responses.
        restore_error_handler();
        wp_send_json(array('error' => 'private_staging_fixture_failed'), 409);
    }
    restore_error_handler();
    wp_send_json($result);
}, -998);
