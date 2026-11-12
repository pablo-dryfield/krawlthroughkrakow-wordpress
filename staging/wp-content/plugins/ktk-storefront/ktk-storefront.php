<?php
/**
 * Plugin Name: KTK Storefront
 * Description: Custom Krawl Through Krakow storefront served at /store2.
 * Version: 0.1.1
 * Author: Krawl Through Krakow
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'KTK_STOREFRONT_VERSION', '0.1.1' );
define( 'KTK_STOREFRONT_FILE', __FILE__ );
define( 'KTK_STOREFRONT_DIR', plugin_dir_path( __FILE__ ) );
define( 'KTK_STOREFRONT_URL', plugin_dir_url( __FILE__ ) );

require_once KTK_STOREFRONT_DIR . 'includes/class-ktk-storefront.php';

KTK_Storefront::boot();

register_activation_hook( __FILE__, array( 'KTK_Storefront', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'KTK_Storefront', 'deactivate' ) );
