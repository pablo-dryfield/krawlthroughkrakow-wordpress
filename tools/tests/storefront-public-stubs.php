<?php
define( 'ABSPATH', __DIR__ );
$GLOBALS['home'] = 'https://krawlthroughkrakow.com/staging/';
$GLOBALS['site'] = $GLOBALS['home'];
$GLOBALS['query'] = array( 'ktk_storefront' => '1', 'ktk_storefront_path' => '' );
$GLOBALS['transients'] = array(); $GLOBALS['requests'] = array();
class WP_Error {}
function nocache_headers() { $GLOBALS['nocache_calls'] = ( $GLOBALS['nocache_calls'] ?? 0 ) + 1; }
function get_query_var( $key ) { return $GLOBALS['query'][$key] ?? ''; }
function home_url( $path = '/' ) { return rtrim( $GLOBALS['home'], '/' ) . '/' . ltrim( $path, '/' ); }
function site_url( $path = '/' ) { return rtrim( $GLOBALS['site'], '/' ) . '/' . ltrim( $path, '/' ); }
function sanitize_text_field( $value ) { return strip_tags( $value ); }
function sanitize_title( $value ) { return strtolower( preg_replace( '/[^a-z0-9-]/i', '-', $value ) ); }
function get_transient( $key ) { return $GLOBALS['transients'][$key] ?? false; }
function set_transient( $key, $value, $ttl ) { $GLOBALS['transients'][$key] = $value; }
function wp_remote_get( $url, $args ) { $GLOBALS['requests'][] = array( $url, $args ); return $GLOBALS['response'] ?? new WP_Error(); }
function is_wp_error( $value ) { return $value instanceof WP_Error; }
function wp_remote_retrieve_response_code( $value ) { return $value['status']; }
function wp_remote_retrieve_body( $value ) { return array_key_exists( 'raw_body', $value ) ? $value['raw_body'] : json_encode( $value['body'] ); }
function wp_remote_retrieve_header( $value, $header ) { return $value['headers'][strtolower( $header )] ?? ''; }
function untrailingslashit( $value ) { return rtrim( $value, '/' ); }
function apply_filters( $name, $value ) { return $value; }
function esc_html( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' ); }
function esc_attr( $value ) { return esc_html( $value ); }
function esc_url( $value ) {
    $scheme = parse_url( $value, PHP_URL_SCHEME );
    return null === $scheme || in_array( $scheme, array('https','http'), true ) ? esc_attr( $value ) : '';
}
function wp_strip_all_tags( $value ) { return strip_tags( $value ); }
function get_bloginfo( $key ) { return 'UTF-8'; }
function wp_html_excerpt( $value, $length, $more ) { return mb_substr( $value, 0, $length ); }
require_once dirname(__DIR__,2) . '/staging/wp-content/plugins/ktk-storefront/includes/class-ktk-storefront-public-content.php';
require dirname(__DIR__,2) . '/staging/wp-content/plugins/ktk-storefront/includes/class-ktk-storefront.php';
