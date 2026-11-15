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
        $mu = $root(__DIR__);
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
        $walk = static function (string $directory, string $label) use ($root, &$owned, &$protected): void {
            $directory = $root($directory);
            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST);
            foreach ($iterator as $file) {
                if ($file->isLink()) { throw new RuntimeException('Symlink protected tree'); }
                if (!$file->isFile()) { continue; }
                $name = str_replace('\\', '/', substr($file->getPathname(), strlen($directory) + 1));
                if ($label === 'mu' && $name === '__KTK_SNAPSHOT_HELPER__') { continue; }
                if ($label === 'storefront' && str_starts_with($name, 'frontend/')) { continue; }
                $hash = hash_file('sha256', $file->getPathname());
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
        wp_send_json(array('schemaVersion' => 1, 'scope' => 'staging-protected-original-state', 'identity' => $identity,
            'capturedAt' => gmdate('c'), 'helperSha256' => hash_file('sha256', __FILE__), 'database' => $database,
            'databaseSha256' => $databaseHash, 'protectedFiles' => $protected, 'ownedContentFiles' => $owned,
            'protectedStateSha256' => $protectedHash, 'rowCounts' => array_map('count', $database),
            'databaseWrites' => 0, 'applicationWrites' => 0, 'cachePurges' => 0));
    } catch (Throwable $error) {
        // Do not disclose raw SQL, private paths, saved settings or record data.
        wp_send_json(array('error' => 'protected_snapshot_failed'), 409);
    }
}, -998);
