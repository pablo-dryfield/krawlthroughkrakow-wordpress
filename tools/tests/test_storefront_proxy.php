<?php
// php tools/tests/test_storefront_proxy.php — no WordPress/network/payment operations.
define( 'ABSPATH', __DIR__ );
class WP_Error {
    public function __construct( public $code, public $message, public $data ) {}
}
class WP_REST_Request {
    public function __construct( private array $body ) {}
    public function get_json_params() { return $this->body; }
}
function apply_filters( $name, $value ) { return $value; }
function untrailingslashit( $value ) { return rtrim( $value, '/' ); }
function wp_json_encode( $value ) { return json_encode( $value ); }
function wp_remote_request( $url, $args ) { $GLOBALS['sent'] = $args; return $GLOBALS['response']; }
function is_wp_error( $value ) { return $value instanceof WP_Error; }
function wp_remote_retrieve_response_code( $response ) { return $response['status']; }
function wp_remote_retrieve_body( $response ) { return json_encode( $response['body'] ); }
function sanitize_text_field( $value ) { return strip_tags( $value ); }
function rest_ensure_response( $value ) { return $value; }
require dirname( __DIR__, 2 ) . '/staging/wp-content/plugins/ktk-storefront/includes/class-ktk-storefront.php';
$checks = 0;
function check( $ok, $message ) { if ( ! $ok ) throw new RuntimeException( $message ); ++$GLOBALS['checks']; }
$body = array( 'cartVersionProtocol' => 1, 'cartVersion' => str_repeat( 'a', 64 ), 'items' => array() );
$request = new WP_REST_Request( $body );
$message = 'This cart changed on another device. Review your selections before continuing.';
$GLOBALS['response'] = array( 'status' => 409, 'body' => array( 'error' => array( 'message' => $message, 'reference' => 'fixture' ) ) );
$result = KTK_Storefront::proxy_cart_quote( $request );
check( $result instanceof WP_Error, 'Conflict stays an error' );
check( $result->message === $message, 'Nested review-required error reaches the browser' );
check( $result->data['status'] === 409, 'Conflict status is preserved' );
check( json_decode( $GLOBALS['sent']['body'], true ) === $body, 'Revision protocol and value are forwarded unchanged' );
$GLOBALS['response'] = array( 'status' => 409, 'body' => array( 'error' => array( 'message' => '<b>Payment is being confirmed.</b>' ) ) );
check( KTK_Storefront::proxy_cart_quote( $request )->message === 'Payment is being confirmed.', 'Payment error text is sanitized' );
$GLOBALS['response'] = array( 'status' => 400, 'body' => array( 'message' => 'Legacy error' ) );
check( KTK_Storefront::proxy_cart_quote( $request )->message === 'Legacy error', 'Top-level errors remain compatible' );
$GLOBALS['response'] = array( 'status' => 400, 'body' => array( 'message' => array( 'invalid' ), 'error' => array( 'message' => array( 'invalid' ) ) ) );
check( KTK_Storefront::proxy_cart_quote( $request )->message === 'Unable to load the experience catalog.', 'Non-string errors use a safe fallback' );
$GLOBALS['response'] = array( 'status' => 200, 'body' => array( 'ongoingCart' => array( 'cartVersion' => str_repeat( 'b', 64 ) ) ) );
check( KTK_Storefront::proxy_cart_quote( $request ) === $GLOBALS['response']['body'], 'Success revision is returned unchanged' );
echo json_encode( array( 'checks' => $checks, 'passed' => $checks ) ) . PHP_EOL;
