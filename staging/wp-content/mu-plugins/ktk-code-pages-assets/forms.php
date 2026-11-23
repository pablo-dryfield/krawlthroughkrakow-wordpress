<?php
/** Staging uses code-owned enquiries; the production handler is retained byte-exactly. */
if (!defined('ABSPATH')) { exit; }
if (function_exists('ktk_pages_is_staging') && ktk_pages_is_staging()) {
    require_once __DIR__ . '/enquiry-private-config.php';
    ktk_pages_enquiry_load_private_config();
}
require_once __DIR__ . (function_exists('ktk_pages_is_staging') && ktk_pages_is_staging() ? '/forms-code-owned.php' : '/forms-legacy.php');
