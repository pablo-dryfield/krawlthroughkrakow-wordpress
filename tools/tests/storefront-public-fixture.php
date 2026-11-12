<?php
require __DIR__ . '/storefront-public-stubs.php';
$input = json_decode( stream_get_contents( STDIN ), true, 512, JSON_THROW_ON_ERROR );
if ( ($input['action'] ?? '') === 'resolve' ) {
    echo json_encode( array_map( array('KTK_Storefront_Public_Content','resolve'), $input['products'] ), JSON_THROW_ON_ERROR );
} else {
    if ( ! empty( $input['baseUrl'] ) ) { $GLOBALS['home'] = $input['baseUrl']; }
    echo KTK_Storefront_Public_Content::render( $input['data'] );
}
