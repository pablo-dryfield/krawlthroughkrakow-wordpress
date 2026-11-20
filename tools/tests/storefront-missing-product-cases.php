<?php
// Each case is a fresh PHP request, including the real static lookup/metadata caches.
$missing_cases = array(
    'confirmed', 'head', 'metadata-first', 'query-privacy', 'known-cached', 'known-fresh', 'catalog',
    'network-error', 'html-404', 'wrong-message', 'extra-field', 'missing-type', 'wrong-type', 'invalid-json',
    'empty-json', 'status-200', 'unauthorized', 'forbidden', 'rate-limited', 'server-error', 'unavailable',
    'cart', 'checkout', 'success', 'orders', 'saved-cart', 'orders-root', 'saved-root', 'ongoing-root', 'confirmation-root', 'nested-unknown',
    'production', 'foreign', 'mixed', 'not-store', 'post',
);

if ( ( $argv[1] ?? '' ) === '--case' ) {
    $case = $argv[2] ?? '';
    if ( ! in_array( $case, $missing_cases, true ) ) { throw new RuntimeException( 'Unknown isolated case' ); }
    require __DIR__ . '/storefront-public-stubs.php';
    define( 'KTK_STOREFRONT_DIR', dirname( __DIR__, 2 ) . '/staging/wp-content/plugins/ktk-storefront/' );
    function status_header( $status ) { $GLOBALS['observed_status'] = $status; }
    $count = 0;
    $assert = function ( $ok, $message ) use ( &$count, $case ) {
        $count++;
        if ( ! $ok ) { throw new RuntimeException( $case . ': ' . $message ); }
    };
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $GLOBALS['query']['ktk_storefront_path'] = 'missing-experience-987654';
    $GLOBALS['response'] = array( 'status' => 404, 'headers' => array( 'content-type' => 'application/json; charset=utf-8' ), 'body' => array( 'message' => 'Product not found.' ) );
    $product = array( 'id' => 28, 'slug' => 'pub-crawl-28', 'name' => 'Pub Crawl', 'price' => array( 'amount' => 135, 'currency' => 'PLN' ), 'config' => array( 'content' => array( 'summary' => 'Actual configured summary' ) ) );
    $expect_missing = in_array( $case, array( 'confirmed', 'head', 'metadata-first', 'query-privacy' ), true );
    $excluded = in_array( $case, array( 'cart', 'checkout', 'success', 'orders', 'saved-cart', 'orders-root', 'saved-root', 'ongoing-root', 'confirmation-root', 'nested-unknown', 'production', 'foreign', 'mixed', 'not-store', 'post' ), true );
    $expect_native = null;
    switch ( $case ) {
        case 'head': $_SERVER['REQUEST_METHOD'] = 'HEAD'; break;
        case 'post': $_SERVER['REQUEST_METHOD'] = 'POST'; break;
        case 'query-privacy': $_GET = array( 'rt' => 'synthetic-private-marker', 'utm_source' => 'synthetic-attribution', 'book' => '1' ); break;
        case 'known-cached':
        case 'known-fresh':
            $GLOBALS['query']['ktk_storefront_path'] = $product['slug'];
            $payload = array( 'product' => $product, 'customer' => array( 'email' => 'synthetic-private-marker' ) );
            if ( $case === 'known-cached' ) { $GLOBALS['transients']['ktk_sf_' . md5( 'product_' . $product['slug'] )] = $payload; }
            else { $GLOBALS['response'] = array( 'status' => 200, 'body' => $payload ); }
            $expect_native = 'product'; break;
        case 'catalog':
            $GLOBALS['query']['ktk_storefront_path'] = '';
            $GLOBALS['response'] = array( 'status' => 200, 'body' => array( 'products' => array( $product ) ) );
            $expect_native = 'catalog'; break;
        case 'network-error': $GLOBALS['response'] = new WP_Error(); break;
        case 'html-404': $GLOBALS['response']['raw_body'] = '<html><h1>Not Found</h1></html>'; $GLOBALS['response']['headers']['content-type'] = 'text/html'; break;
        case 'wrong-message': $GLOBALS['response']['body']['message'] = 'Gateway not found.'; break;
        case 'extra-field': $GLOBALS['response']['body']['retry'] = true; break;
        case 'missing-type': unset( $GLOBALS['response']['headers'] ); break;
        case 'wrong-type': $GLOBALS['response']['headers']['content-type'] = 'text/plain'; break;
        case 'invalid-json': $GLOBALS['response']['raw_body'] = '{invalid'; break;
        case 'empty-json': $GLOBALS['response']['body'] = array(); break;
        case 'status-200': $GLOBALS['response']['status'] = 200; break;
        case 'unauthorized': $GLOBALS['response']['status'] = 401; break;
        case 'forbidden': $GLOBALS['response']['status'] = 403; break;
        case 'rate-limited': $GLOBALS['response']['status'] = 429; break;
        case 'server-error': $GLOBALS['response']['status'] = 500; break;
        case 'unavailable': $GLOBALS['response']['status'] = 503; break;
        case 'cart': $GLOBALS['query']['ktk_storefront_path'] = 'cart'; break;
        case 'checkout': $GLOBALS['query']['ktk_storefront_path'] = 'checkout'; break;
        case 'success': $GLOBALS['query']['ktk_storefront_path'] = 'checkout/success'; break;
        case 'orders': $GLOBALS['query']['ktk_storefront_path'] = 'orders/example'; break;
        case 'saved-cart': $GLOBALS['query']['ktk_storefront_path'] = 'saved-carts/example'; break;
        case 'orders-root': $GLOBALS['query']['ktk_storefront_path'] = 'orders'; break;
        case 'saved-root': $GLOBALS['query']['ktk_storefront_path'] = 'saved-carts'; break;
        case 'ongoing-root': $GLOBALS['query']['ktk_storefront_path'] = 'ongoing-carts'; break;
        case 'confirmation-root': $GLOBALS['query']['ktk_storefront_path'] = 'order-confirmation'; break;
        case 'nested-unknown': $GLOBALS['query']['ktk_storefront_path'] = 'unknown/nested'; break;
        case 'production': $GLOBALS['home'] = $GLOBALS['site'] = 'https://krawlthroughkrakow.com/'; break;
        case 'foreign': $GLOBALS['home'] = $GLOBALS['site'] = 'https://example.invalid/staging/'; break;
        case 'mixed': $GLOBALS['site'] = 'https://krawlthroughkrakow.com/'; break;
        case 'not-store': $GLOBALS['query']['ktk_storefront'] = '0'; break;
    }
    $initial_cache = $GLOBALS['transients'];
    if ( $case === 'metadata-first' ) {
        $assert( KTK_Storefront::filter_pre_document_title( 'Old title' ) === 'Experience not found | Krawl Through Krakow', 'Metadata-first lookup uses missing title' );
    }
    $template = KTK_Storefront::use_storefront_template( 'legacy-template.php' );
    if ( $case === 'not-store' ) {
        $assert( $template === 'legacy-template.php' && ! isset( $GLOBALS['observed_status'] ), 'Non-store hook remains inert' );
    } else {
        $assert( $template === KTK_STOREFRONT_DIR . 'templates/storefront.php', 'Original owned template retained' );
        $assert( $GLOBALS['observed_status'] === ( $expect_missing ? 404 : 200 ), 'Only confirmed missing public reads return404' );
    }
    if ( $excluded || $case === 'catalog' || $case === 'known-cached' ) {
        $assert( count( $GLOBALS['requests'] ) === 0, 'Status gate adds no excluded/catalog/cached API request' );
    }
    $expect_no_page_cache = ! $excluded && ! in_array( $case, array( 'known-cached', 'known-fresh', 'catalog' ), true );
    $assert( ( defined( 'DONOTCACHEPAGE' ) && DONOTCACHEPAGE ) === $expect_no_page_cache, 'Only unavailable staging public product reads prevent full-page cache persistence' );
    $assert( ( $GLOBALS['nocache_calls'] ?? 0 ) === ( $expect_no_page_cache ? 1 : 0 ), 'No-cache headers apply once to public failures and never to known/private/foreign/POST contexts' );
    $data = KTK_Storefront::public_html_data();
    $html = KTK_Storefront_Public_Content::render( $data );
    $assert( KTK_Storefront::public_not_found() === $expect_missing, 'Missing evidence is scoped to this request/environment' );
    $assert( ! str_contains( $html, 'synthetic-private-marker' ) && ! str_contains( $html, 'synthetic-attribution' ), 'No private/query fixture content rendered' );
    if ( $expect_missing ) {
        $assert( $data === array( 'kind' => 'not-found' ), 'Typed native missing data' );
        $doc = new DOMDocument(); @$doc->loadHTML( $html ); $xp = new DOMXPath( $doc );
        $assert( $xp->query( '//main' )->length === 1 && $xp->query( '//main//main' )->length === 0 && $xp->query( '//h1' )->length === 1, 'One native main and H1' );
        $assert( $xp->query( '//h1' )->item( 0 )->textContent === 'Experience not found', 'Useful native error heading' );
        $assert( $xp->query( '//main//a' )->length === 2 && str_contains( $html, '/staging/store2/' ) && str_contains( $html, '/staging/contact/' ), 'Two native recovery destinations' );
        $assert( ! str_contains( $html, '<form' ) && ! str_contains( $html, '<script' ) && ! str_contains( $html, '<iframe' ) && ! str_contains( $html, '987654' ), 'No form/provider/script/reflected slug' );
        $assert( KTK_Storefront::filter_pre_document_title( 'Old title' ) === 'Experience not found | Krawl Through Krakow', 'Error document title matches native heading' );
        $assert( ! empty( KTK_Storefront::filter_robots( array() )['noindex'] ), 'Error stays excluded from indexing' );
        $assert( $GLOBALS['transients'] === $initial_cache, 'Missing result is never cached' );
    } elseif ( $expect_native ) {
        $assert( $data['kind'] === $expect_native && ! str_contains( $html, 'Experience not found' ), 'Valid product/catalog native content retained' );
        $assert( str_contains( $html, 'Pub Crawl' ) && str_contains( $html, '135.00' ), 'Actual configured offer retained' );
    } else {
        $assert( $data === null && $html === '', 'Original client fallback or utility exclusion retained' );
    }
    $assert( count( $GLOBALS['requests'] ) <= 1, 'No duplicate public API request' );
    foreach ( $GLOBALS['requests'] as $request ) {
        $assert( $request[1]['timeout'] === 8 && ! isset( $request[1]['body'] ) && ! isset( $request[1]['method'] ), 'Existing bounded GET contract retained' );
    }
    echo json_encode( array( 'case' => $case, 'checks' => $count ), JSON_THROW_ON_ERROR );
    exit;
}

$missing_count = 0;
foreach ( $missing_cases as $case ) {
    $process = proc_open( array( PHP_BINARY, __FILE__, '--case', $case ), array( 0 => array( 'pipe', 'r' ), 1 => array( 'pipe', 'w' ), 2 => array( 'pipe', 'w' ) ), $pipes );
    if ( ! is_resource( $process ) ) { throw new RuntimeException( 'Native PHP process required' ); }
    fclose( $pipes[0] ); $stdout = stream_get_contents( $pipes[1] ); fclose( $pipes[1] ); $stderr = stream_get_contents( $pipes[2] ); fclose( $pipes[2] );
    $status = proc_close( $process );
    if ( $status !== 0 || $stderr !== '' ) { throw new RuntimeException( $case . ': ' . $stderr ); }
    $result = json_decode( $stdout, true, 512, JSON_THROW_ON_ERROR );
    if ( ( $result['case'] ?? '' ) !== $case || ! is_int( $result['checks'] ?? null ) || $result['checks'] < 1 ) { throw new RuntimeException( 'Complete per-request checks required' ); }
    $missing_count += $result['checks'];
}
echo 'Missing-product native contracts: ' . count( $missing_cases ) . ' fresh requests, ' . $missing_count . "/$missing_count passed\n";
