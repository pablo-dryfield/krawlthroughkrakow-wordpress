<?php
// Synthetic CLI request only; WordPress public GETs are replaced by the existing stub.
require __DIR__ . '/storefront-public-stubs.php';
$input = json_decode( stream_get_contents( STDIN ), true, 512, JSON_THROW_ON_ERROR );
define( 'KTK_STOREFRONT_DIR', dirname( __DIR__, 2 ) . '/staging/wp-content/plugins/ktk-storefront/' );
define( 'KTK_STOREFRONT_URL', $input['pluginUrl'] ?? 'http://127.0.0.1/fixture-plugin/' );
function status_header( $code ) { $GLOBALS['observed_status'] = $code; }
function absint( $value ) { return abs( (int) $value ); }
function wp_list_pluck( $items, $key ) { return array_column( $items, $key ); }
function add_query_arg( $key, $value, $url ) { return $url . '?' . http_build_query( array( $key => $value ) ); }
function wp_parse_url( $url, $component = -1 ) { return parse_url( $url, $component ); }
function wp_json_encode( $value, $flags = 0, $depth = 512 ) { return json_encode( $value, $flags, $depth ); }
// These reviewed fixture images are absolute HTTP URLs; this is not WordPress sanitizer acceptance.
function esc_url_raw( $url ) { return in_array( parse_url( $url, PHP_URL_SCHEME ), array( 'http', 'https' ), true ) ? $url : ''; }
$GLOBALS['query']['ktk_storefront_path'] = $input['path'];
$_SERVER['REQUEST_METHOD'] = $input['method'] ?? 'GET';
switch ( $input['context'] ?? 'staging' ) {
    case 'staging': break;
    case 'production': $GLOBALS['home'] = $GLOBALS['site'] = 'https://krawlthroughkrakow.com/'; break;
    case 'foreign': $GLOBALS['home'] = $GLOBALS['site'] = 'https://example.invalid/staging/'; break;
    case 'mixed': $GLOBALS['site'] = 'https://krawlthroughkrakow.com/'; break;
    case 'not-store': $GLOBALS['query']['ktk_storefront'] = '0'; break;
    default: throw new RuntimeException( 'Known isolated environment required' );
}
$mode = $input['mode'] ?? 'normal';
$payload = $input['path'] === '' ? array( 'products' => $input['products'] ) : ( isset( $input['product'] ) ? array( 'product' => $input['product'], 'storefrontConfig' => array( 'cancellationPolicy' => $input['cancellationPolicy'] ?? null ) ) : null );
$GLOBALS['response'] = array( 'status' => $payload ? 200 : 404, 'headers' => array( 'content-type' => 'application/json; charset=utf-8' ), 'body' => $payload ?? array( 'message' => 'Product not found.' ) );
if ( $mode === 'outage' ) { $GLOBALS['response'] = new WP_Error(); }
elseif ( $mode === 'unavailable' ) { $GLOBALS['response']['status'] = 503; $GLOBALS['response']['body'] = array( 'message' => 'Temporarily unavailable.' ); }
elseif ( $mode === 'html404' ) { $GLOBALS['response'] = array( 'status' => 404, 'headers' => array( 'content-type' => 'text/html' ), 'raw_body' => '<h1>Gateway not found</h1>' ); }
elseif ( $mode !== 'normal' ) { throw new RuntimeException( 'Known isolated response mode required' ); }
$template = KTK_Storefront::use_storefront_template( 'legacy-template.php' );
$data = KTK_Storefront::public_html_data();
$html = KTK_Storefront_Public_Content::render( $data );
$title = KTK_Storefront::filter_pre_document_title( 'Legacy document title' );
ob_start(); KTK_Storefront::output_storefront_metadata(); $metadata = ob_get_clean();
echo json_encode( array( 'status' => $GLOBALS['observed_status'] ?? null, 'template' => basename( $template ), 'title' => $title, 'metadata' => $metadata, 'robots' => KTK_Storefront::filter_robots( array() ), 'kind' => $data['kind'] ?? null, 'html' => $html, 'publicGetCount' => count( $GLOBALS['requests'] ), 'cacheKeys' => array_keys( $GLOBALS['transients'] ) ), JSON_THROW_ON_ERROR );
