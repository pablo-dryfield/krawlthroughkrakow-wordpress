<?php
/** Isolated public-shape/route contracts. No network, real CMP or provider receipt. */
require __DIR__ . '/storefront-public-stubs.php';
$checks = 0;
function check_meta( $pass, $label ) { $GLOBALS['checks']++; if ( ! $pass ) { throw new RuntimeException( $label ); } }
function add_filter( $name, $callback, $priority = 10 ) { $GLOBALS['meta_filters'][] = array( $name, $callback, $priority ); }
$GLOBALS['meta_filters'] = array();
KTK_Storefront::register_meta_ordering();
check_meta( array_column( $GLOBALS['meta_filters'], 0 ) === array( 'iubenda_initial_output', 'rocket_exclude_js', 'rocket_exclude_defer_js', 'rocket_delay_js_exclusions' ), 'Only the reviewed parser and three dependency-exclusion hooks are registered' );
$fragments = json_decode( file_get_contents( dirname( __DIR__ ) . '/fixtures/meta-ordering-inline.json' ), true, 512, JSON_THROW_ON_ERROR );
$bodies = array_column( $fragments, 'text' );
foreach ( $fragments as $fragment ) { check_meta( hash( 'sha256', $fragment['text'] ) === $fragment['sha256'], 'Source fragment hash pinned' ); }
$helper = '<script id="facebook-signal-js" src="https://krawlthroughkrakow.com/staging/wp-content/plugins/official-facebook-pixel/core/../js/facebook_signal.js?ver=5.2.2"></script>';
$before = '<!doctype html><html><head><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://krawlthroughkrakow.com/staging/store2/example-28/">';
$after = '</head><body><h1>Experience not found</h1><a href="/staging/store2/">Browse experiences</a><form action="/unchanged" method="post"><input value="preserved"></form><script>window.KTK_UNRELATED = "exact";</script></body></html>';
$tags = array_map( static function( $body ) { return '<script type="text/javascript">' . $body . '</script>'; }, $bodies );
$input = $before . $helper . "\n<!-- Meta Pixel Code -->\n" . implode( "\n<!-- untouched separator -->\n", $tags ) . "\n<!-- End Meta Pixel Code -->\n" . $after;
$group_open = '<script type="text/plain" class="_iub_cs_activate-inline" data-iub-purposes="5" data-ktk-meta-ordering="v1">';
$expected = $before . $helper . "\n<!-- Meta Pixel Code -->\n" . $group_open . implode( '', $bodies ) . '</script>' . str_repeat( "\n<!-- untouched separator -->\n", 2 ) . "\n<!-- End Meta Pixel Code -->\n" . $after;
$_SERVER['REQUEST_METHOD'] = 'GET';
$GLOBALS['query']['ktk_storefront_path'] = 'missing-experience-987654';
$output = KTK_Storefront::group_meta_ordering( $input );
check_meta( $output === $expected, 'Only the three complete tags change; every other document byte remains exact' );
$dom = new DOMDocument(); @$dom->loadHTML( $output ); $xpath = new DOMXPath( $dom );
$group = $xpath->query( '//script[@data-ktk-meta-ordering="v1"]' );
check_meta( 1 === $group->length && $group[0]->textContent === implode( '', $bodies ), 'One activation unit preserves exact three source bodies and order' );
check_meta( 'text/plain' === $group[0]->getAttribute( 'type' ) && '5' === $group[0]->getAttribute( 'data-iub-purposes' ), 'Existing purpose5 boundary stays inert before CMP activation' );
check_meta( KTK_Storefront::group_meta_ordering( $output ) === $output, 'Repeated parser application does not duplicate a call or activation block' );
$rocket_open = '<script type="text/rocketlazyloadscript" data-rocket-type="text/javascript">';
foreach ( array( array( 1, 2 ), array( 1 ), array( 2 ) ) as $optimized_parts ) {
	$optimized = $input;
	foreach ( $optimized_parts as $part ) { $optimized = str_replace( $tags[$part], $rocket_open . $bodies[$part] . '</script>', $optimized ); }
	check_meta( KTK_Storefront::group_meta_ordering( $optimized ) === $expected, 'Exact observed optimized initializer/PageView tags produce the same purpose5 unit with all other bytes exact' );
}
foreach ( array(
	$rocket_open . $bodies[0] . '</script>',
	'<script type="text/rocketlazyloadscript" data-rocket-type="module">' . $bodies[0] . '</script>',
	'<script nonce="unreviewed" type="text/rocketlazyloadscript" data-rocket-type="text/javascript">' . $bodies[0] . '</script>',
) as $unreviewed_bootstrap ) {
	$changed = str_replace( $tags[0], $unreviewed_bootstrap, $input );
	check_meta( $changed !== $input && KTK_Storefront::group_meta_ordering( $changed ) === $changed, 'Optimizer acceptance never expands to an unreviewed bootstrap/type/nonce shape' );
}
foreach ( array(
	'<script type="text/rocketlazyloadscript" data-rocket-type="module">',
	'<script nonce="unreviewed" type="text/rocketlazyloadscript" data-rocket-type="text/javascript">',
) as $unreviewed_initializer_open ) {
	$changed = str_replace( $tags[1], $unreviewed_initializer_open . $bodies[1] . '</script>', $input );
	check_meta( $changed !== $input && KTK_Storefront::group_meta_ordering( $changed ) === $changed, 'Pinned initializer body still rejects an unreviewed optimized module/nonce opening tag' );
}
$original = array( 'existing-owned-rule' );
$paths = KTK_Storefront::exclude_meta_ordering_helper( $original );
check_meta( $paths === array( 'existing-owned-rule', '/staging/wp-content/plugins/official-facebook-pixel/js/facebook_signal.js', '/staging/wp-content/plugins/official-facebook-pixel/core/../js/facebook_signal.js' ), 'Only exact two current local helper spellings are added to optimizer exclusions' );
check_meta( KTK_Storefront::exclude_meta_ordering_helper( $paths ) === $paths, 'Exclusion registration stays idempotent' );
foreach ( array( '', 'pub-crawl-28', 'new-years-eve-32', 'missing-experience-987654' ) as $path ) {
	$GLOBALS['query']['ktk_storefront_path'] = $path;
	foreach ( array( 'GET', 'HEAD' ) as $method ) { $_SERVER['REQUEST_METHOD'] = $method; check_meta( KTK_Storefront::group_meta_ordering( $input ) === $expected, 'Only public-shaped GET/HEAD routes can group the reviewed scripts' ); }
}
foreach ( array( 'cart', 'cart-28', 'checkout', 'checkout/success', 'checkout-123', 'orders/123', 'orders-123', 'saved-carts/123', 'ongoing-carts/123', 'order-confirmation', 'order-confirmation-123', 'pub-crawl-28/child', 'missing%2Fexperience-987654', '../pub-crawl-28', 'pub-crawl-28?private=1' ) as $path ) {
	$GLOBALS['query']['ktk_storefront_path'] = $path;
	check_meta( KTK_Storefront::group_meta_ordering( $input ) === $input && KTK_Storefront::exclude_meta_ordering_helper( $original ) === $original, 'Private, nested, encoded and ambiguous routes retain all output and optimizer settings' );
}
$GLOBALS['query']['ktk_storefront_path'] = 'pub-crawl-28';
foreach ( array( 'POST', 'PUT', 'DELETE', 'OPTIONS', 'get' ) as $method ) {
	$_SERVER['REQUEST_METHOD'] = $method;
	check_meta( KTK_Storefront::group_meta_ordering( $input ) === $input && KTK_Storefront::exclude_meta_ordering_helper( $original ) === $original, 'Non-read request cannot change integration output or exclusions' );
}
$_SERVER['REQUEST_METHOD'] = 'GET';
foreach ( array(
	array( 'https://krawlthroughkrakow.com/', 'https://krawlthroughkrakow.com/', '1' ),
	array( 'https://foreign.invalid/staging/', 'https://foreign.invalid/staging/', '1' ),
	array( 'https://krawlthroughkrakow.com/staging/', 'https://krawlthroughkrakow.com/', '1' ),
	array( 'https://krawlthroughkrakow.com/', 'https://krawlthroughkrakow.com/staging/', '1' ),
	array( 'http://krawlthroughkrakow.com/staging/', 'http://krawlthroughkrakow.com/staging/', '1' ),
	array( 'https://krawlthroughkrakow.com/staging/', 'https://krawlthroughkrakow.com/staging/', '0' ),
) as $context ) {
	list( $GLOBALS['home'], $GLOBALS['site'], $GLOBALS['query']['ktk_storefront'] ) = $context;
	check_meta( KTK_Storefront::group_meta_ordering( $input ) === $input && KTK_Storefront::exclude_meta_ordering_helper( $original ) === $original, 'Production, foreign, mixed, HTTP and non-store contexts are untouched' );
}
$GLOBALS['home'] = $GLOBALS['site'] = 'https://krawlthroughkrakow.com/staging/'; $GLOBALS['query']['ktk_storefront'] = '1';
$negatives = array(
	'bootstrap drift' => str_replace( "n.version='2.0'", "n.version='3.0'", $input ),
	'initializer version drift' => str_replace( 'wordpress_0-7.1.5-5.2.2', 'wordpress_0-7.1.6-5.2.2', $input ),
	'pixel identity drift' => str_replace( '1018986598176189', '9999999999999999', $input ),
	'purchase is not pageview' => str_replace( "'PageView'", "'Purchase'", $input ),
	'missing body' => str_replace( $tags[2], '', $input ),
	'duplicate body' => $input . $tags[2],
	'extra tracking body' => $input . '<script>fbq("track", "Purchase");</script>',
	'extra initializer' => $input . '<script>FacebookSignal.init({});</script>',
	'helper missing' => str_replace( $helper, '', $input ),
	'helper late' => str_replace( $helper, '', $input ) . $helper,
	'helper async' => str_replace( '<script id="facebook-signal-js"', '<script async id="facebook-signal-js"', $input ),
	'helper defer' => str_replace( '<script id="facebook-signal-js"', '<script defer id="facebook-signal-js"', $input ),
	'helper deferred by optimizer' => str_replace( '<script id="facebook-signal-js" src=', '<script type="text/rocketlazyloadscript" id="facebook-signal-js" data-rocket-src=', $input ),
	'helper version drift' => str_replace( 'facebook_signal.js?ver=5.2.2', 'facebook_signal.js?ver=5.3.0', $input ),
	'helper foreign host' => str_replace( 'src="https://krawlthroughkrakow.com', 'src="https://foreign.invalid', $input ),
	'helper duplicate' => $helper . $input,
	'existing unrelated marker' => $input . '<div data-ktk-meta-ordering="unknown"></div>',
	'changed body whitespace' => str_replace( $bodies[2], "\n" . $bodies[2], $input ),
	'nonce or unknown script attributes' => str_replace( $tags[2], '<script nonce="unreviewed">' . $bodies[2] . '</script>', $input ),
	'changed call order' => strtr( $input, array( $tags[0] => $tags[2], $tags[2] => $tags[0] ) ),
	'oversized document' => $input . str_repeat( 'x', 2097152 ),
);
foreach ( $negatives as $label => $changed ) {
	check_meta( $changed !== $input, 'Negative fixture actually differs: ' . $label );
	check_meta( KTK_Storefront::group_meta_ordering( $changed ) === $changed, 'Unknown/drifted shape stays exact; acceptance guard must keep failing: ' . $label );
}
foreach ( array( null, false, array(), '' ) as $value ) { check_meta( KTK_Storefront::group_meta_ordering( $value ) === $value, 'Non-document filter input is preserved' ); }
check_meta( !$GLOBALS['requests'] && !$GLOBALS['transients'], 'No API requests, cache writes or catalog lookup required to order the three public fragments' );
echo json_encode( array( 'checks' => $checks, 'passed' => true, 'scope' => 'Offline exact source/route/markup contracts; not real CMP/provider verification' ) ) . "\n";
