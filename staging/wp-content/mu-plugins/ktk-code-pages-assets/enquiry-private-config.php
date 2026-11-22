<?php
/** Staging transport bootstrap. The dedicated secret remains outside the web root. */
if (!defined('ABSPATH')) { exit; }

function ktk_pages_enquiry_private_config_values($bytes, $file_stat, $directory_stat, $owner) {
    if (!is_string($bytes) || strlen($bytes) > 4096 || !is_array($file_stat) || !is_array($directory_stat)
        || ($file_stat['uid'] ?? -1) !== $owner || ($directory_stat['uid'] ?? -1) !== $owner
        || (($file_stat['mode'] ?? 0) & 0777) !== 0600 || (($directory_stat['mode'] ?? 0) & 0777) !== 0700) { return null; }
    $value = json_decode($bytes, true);
    if (!is_array($value)) { return null; }
    $keys = array_keys($value); sort($keys);
    if ($keys !== array('signingSecret', 'url', 'version') || $value['version'] !== 1
        || $value['url'] !== 'https://omni-lodge.com/api/website-enquiries/staging'
        || !is_string($value['signingSecret']) || strlen($value['signingSecret']) < 32 || strlen($value['signingSecret']) > 256
        || preg_match('/[\x00-\x20\x7f]/', $value['signingSecret'])) { return null; }
    return $value;
}

function ktk_pages_enquiry_load_private_config() {
    // Existing explicit server configuration and isolated CLI fixtures keep their original scope.
    if (defined('KTK_ENQUIRY_API_URL') || defined('KTK_ENQUIRY_SIGNING_SECRET')) { return false; }
    if (!function_exists('ktk_pages_is_staging') || !ktk_pages_is_staging()) { return false; }
    $install = realpath(ABSPATH);
    if (!$install || basename($install) !== 'staging') { return false; }
    $account = realpath(dirname($install, 2));
    if (!$account || $account === DIRECTORY_SEPARATOR) { return false; }
    $private = $account . '/.ktk-storefront-private';
    $directory = $private . '/enquiries';
    $file = $directory . '/staging.json';
    foreach (array($private, $directory, $file) as $path) { if (is_link($path) || realpath($path) !== $path) { return false; } }
    $file_stat = @stat($file); $directory_stat = @stat($directory); $root_stat = @stat($private);
    $owner = @fileowner($install);
    if (!is_int($owner) || !is_array($root_stat) || ($root_stat['uid'] ?? -1) !== $owner || (($root_stat['mode'] ?? 0) & 0777) !== 0700
        || !is_file($file) || !is_readable($file) || !is_array($file_stat) || ($file_stat['size'] ?? 4097) > 4096) { return false; }
    $value = ktk_pages_enquiry_private_config_values(@file_get_contents($file), $file_stat, $directory_stat, $owner);
    if (!$value) { return false; }
    define('KTK_ENQUIRY_API_URL', $value['url']);
    define('KTK_ENQUIRY_SIGNING_SECRET', $value['signingSecret']);
    return true;
}
