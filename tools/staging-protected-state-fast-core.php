<?php
/** Derived staging-only state capture with bounded same-SHA256 hashing. No HTTP entry point, hooks, writes or network client. */
if (!defined('KTK_STAGING_STATE_ALLOWED') || KTK_STAGING_STATE_ALLOWED !== true) {
    throw new RuntimeException('Explicit staging state caller required');
}

function ktk_capture_staging_original_state(string $helperPath): array
{
    if (!defined('ABSPATH') || !defined('WP_CONTENT_DIR') || home_url('/') !== 'https://krawlthroughkrakow.com/staging/' ||
        site_url('/') !== 'https://krawlthroughkrakow.com/staging/' || (int)get_option('blog_public') !== 0) {
        throw new RuntimeException('Exact staging identity required before state capture');
    }
    $helperPath = str_replace('\\', '/', $helperPath);
    $resolvedHelper = realpath($helperPath);
    if (!preg_match('/^ktk-(?:state-snapshot|transaction-rehearsal)-[a-f0-9]{32}\.php$/D', basename($helperPath)) ||
        is_link($helperPath) || !is_file($helperPath) || $resolvedHelper === false || str_replace('\\', '/', $resolvedHelper) !== $helperPath) {
        throw new RuntimeException('Exact existing staging helper path required');
    }
    $root = static function (string $path): string {
        $real = realpath($path);
        if ($real === false || !is_dir($real)) { throw new RuntimeException('Missing protected directory'); }
        foreach (array($path, $real) as $candidate) {
            for ($p = $candidate; ; $p = dirname($p)) {
                if (is_link($p)) { throw new RuntimeException('Symlink protected ancestor'); }
                if (dirname($p) === $p) { break; }
            }
        }
        return str_replace('\\', '/', $real);
    };
    $mu = $root(dirname($helperPath));
    $stage = $root(ABSPATH);
    if (basename($stage) !== 'staging' || $mu !== $stage . '/wp-content/mu-plugins' || $root(WP_CONTENT_DIR) !== $stage . '/wp-content') {
        throw new RuntimeException('Exact staging filesystem required');
    }
    $encode = static fn($value) => json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    global $wpdb;
    $read = static function (string $table, string $suffix) use ($wpdb): array {
        if (!preg_match('/^[A-Za-z0-9_]+$/D', $table)) { throw new RuntimeException('Unexpected WordPress table'); }
        $rows = $wpdb->get_results('SELECT * FROM ' . $table . ' ' . $suffix, ARRAY_A);
        if (!is_array($rows) || !empty($wpdb->last_error)) { throw new RuntimeException('Protected query failed'); }
        return $rows;
    };
    // Page/article/configuration records only. No users, comments, customer,
    // order or payment tables, writes, automatic restoration or purge.
    $types = "('page','post','attachment','wpcf7_contact_form','wpcode','et_pb_layout','nav_menu_item','wp_global_styles','wp_template','wp_template_part','custom_css')";
    foreach (array('posts','postmeta','options','terms','term_taxonomy','term_relationships','termmeta') as $key) {
        if (!is_string($wpdb->$key) || !preg_match('/^[A-Za-z0-9_]+$/D', $wpdb->$key)) { throw new RuntimeException('Unexpected WordPress table'); }
    }
    $database = array(
        'posts' => $read($wpdb->posts, 'WHERE post_type IN ' . $types . ' ORDER BY ID'),
        'postmeta' => $read($wpdb->postmeta, 'WHERE post_id IN (SELECT ID FROM ' . $wpdb->posts . ' WHERE post_type IN ' . $types . ') ORDER BY meta_id'),
        'options' => $read($wpdb->options, "WHERE option_name IN ('home','siteurl','blog_public','show_on_front','page_on_front','page_for_posts','template','stylesheet','active_plugins','permalink_structure','ecwid_store_id') OR LEFT(option_name,3)='et_' OR option_name LIKE 'theme_mods_%' OR option_name LIKE 'wpcode%' OR option_name LIKE 'iubenda%' OR option_name LIKE 'ecwid%' OR option_name LIKE 'wpcf7%' ORDER BY option_name"),
        'terms' => $read($wpdb->terms, 'ORDER BY term_id'),
        'term_taxonomy' => $read($wpdb->term_taxonomy, 'ORDER BY term_taxonomy_id'),
        'term_relationships' => $read($wpdb->term_relationships, 'ORDER BY object_id,term_taxonomy_id'),
        'termmeta' => $read($wpdb->termmeta, 'ORDER BY meta_id'),
    );
    $saved = array();
    foreach ($database['options'] as $option) { $saved[$option['option_name']] = $option['option_value']; }
    if (rtrim((string)($saved['home'] ?? ''), '/') !== 'https://krawlthroughkrakow.com/staging' || rtrim((string)($saved['siteurl'] ?? ''), '/') !== 'https://krawlthroughkrakow.com/staging' ||
        (string)($saved['blog_public'] ?? '') !== '0') { throw new RuntimeException('Saved staging identity differs'); }
    $owned = array(); $protected = array();
    // Read-only SHA256 acceleration; complete bytes, bounded memory, original fallback.
    $hashCurrentFile = static function (string $path, $size) {
        if (PHP_INT_SIZE < 8 || !function_exists('openssl_digest') || !is_int($size) || $size < 0 || $size > 33554432) {
            return hash_file('sha256', $path);
        }
        $setting = strtoupper(trim((string)ini_get('memory_limit')));
        if (preg_match('/^([0-9]{1,9})([KMG]?)$/D', $setting, $parts) !== 1) {
            return hash_file('sha256', $path);
        }
        $unit = array('' => 1, 'K' => 1024, 'M' => 1048576, 'G' => 1073741824)[$parts[2]];
        $limit = (int)$parts[1] * $unit;
        if ($limit < 1 || memory_get_usage(true) + 2 * $size + 16777216 > $limit) {
            return hash_file('sha256', $path);
        }
        $bytes = @file_get_contents($path, false, null, 0, $size + 1);
        if (is_string($bytes) && strlen($bytes) === $size) {
            $digest = @openssl_digest($bytes, 'sha256');
            unset($bytes);
            if (is_string($digest) && preg_match('/^[a-f0-9]{64}$/D', $digest) === 1) { return $digest; }
        }
        return hash_file('sha256', $path);
    };
    $walk = static function (string $directory, string $label) use ($root, $helperPath, &$owned, &$protected, $hashCurrentFile): void {
        $directory = $root($directory);
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST);
        foreach ($iterator as $file) {
            if ($file->isLink()) { throw new RuntimeException('Symlink protected tree'); }
            if (!$file->isFile()) { continue; }
            $name = str_replace('\\', '/', substr($file->getPathname(), strlen($directory) + 1));
            if ($label === 'mu' && $name === basename($helperPath)) { continue; }
            if ($label === 'storefront' && str_starts_with($name, 'frontend/')) { continue; }
            $hash = $hashCurrentFile($file->getPathname(), $file->getSize());
            if ($hash === false) { throw new RuntimeException('Unreadable protected file'); }
            if ($label === 'mu' && ($name === 'ktk-code-pages.php' || str_starts_with($name, 'ktk-code-pages-assets/'))) { $owned[$name] = $hash; }
            else { $protected[$label . '/' . $name] = $hash; }
        }
    };
    $walk($mu, 'mu');
    $walk($stage . '/wp-content/plugins/ktk-storefront', 'storefront');
    ksort($owned); ksort($protected);
    if (!isset($owned['ktk-code-pages.php'], $owned['ktk-code-pages-assets/registry.php'], $protected['mu/ktk-homepage-shortcode.php']) || count($protected) < 3) {
        throw new RuntimeException('Complete existing site roots required');
    }
    $identity = array('home' => home_url('/'), 'siteurl' => site_url('/'), 'blogPublic' => (int)get_option('blog_public'),
        'frontPageId' => (int)get_option('page_on_front'), 'wordpressEnvironment' => function_exists('wp_get_environment_type') ? wp_get_environment_type() : null);
    $databaseHash = hash('sha256', $encode($database));
    $protectedHash = hash('sha256', $encode(array('identity' => $identity, 'databaseSha256' => $databaseHash, 'files' => $protected)));
    return array('schemaVersion' => 1, 'scope' => 'staging-protected-original-state', 'identity' => $identity,
        'capturedAt' => gmdate('c'), 'helperSha256' => hash_file('sha256', $helperPath), 'database' => $database,
        'databaseSha256' => $databaseHash, 'protectedFiles' => $protected, 'ownedContentFiles' => $owned,
        'protectedStateSha256' => $protectedHash, 'rowCounts' => array_map('count', $database),
        'databaseWrites' => 0, 'applicationWrites' => 0, 'cachePurges' => 0);
}
