<?php
/** Staging uses code-owned enquiries; the production handler is retained byte-exactly. */
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . (function_exists('ktk_pages_is_staging') && ktk_pages_is_staging() ? '/forms-code-owned.php' : '/forms-legacy.php');
