<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-ktk-storefront-public-content.php';

final class KTK_Storefront {
	const QUERY_FLAG = 'ktk_storefront';
	const QUERY_PATH = 'ktk_storefront_path';
	const REST_NAMESPACE = 'ktk-storefront/v1';
	const CACHE_TTL = 300;
	// Dedicated verified staging stream; the identity guard below excludes production.
	const STAGING_GA4_MEASUREMENT_ID = 'G-83YXQK49KB';
	private static $missing_products = array();

	public static function boot() {
		self::register_meta_ordering();
		add_action( 'init', array( __CLASS__, 'register_rewrite_rules' ) );
		add_filter( 'query_vars', array( __CLASS__, 'register_query_vars' ) );
		add_action( 'template_redirect', array( __CLASS__, 'remove_legacy_ecwid_output' ), 0 );
		add_action( 'template_redirect', array( __CLASS__, 'allow_staging_storefront_zoom' ), 1 );
		add_filter( 'template_include', array( __CLASS__, 'use_storefront_template' ), 99 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'dequeue_unused_assets' ), 999 );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );
		add_action( 'wp_head', array( __CLASS__, 'output_clarity_consent_bridge' ), 0 );
		add_action( 'wp_head', array( __CLASS__, 'output_storefront_metadata' ), 1 );
		add_action( 'wp_head', array( __CLASS__, 'output_font_preloads' ), 2 );
		add_filter( 'pre_get_document_title', array( __CLASS__, 'filter_pre_document_title' ), 99 );
		add_filter( 'document_title_parts', array( __CLASS__, 'filter_document_title' ) );
		add_filter( 'wp_robots', array( __CLASS__, 'filter_robots' ), 99 );
		add_filter( 'body_class', array( __CLASS__, 'filter_body_class' ) );
		add_filter( 'rocket_exclude_css', array( __CLASS__, 'exclude_rocket_css' ) );
		add_filter( 'style_loader_tag', array( __CLASS__, 'public_style_tag' ), 10, 2 );
		add_filter( 'rocket_exclude_js', array( __CLASS__, 'exclude_rocket_js' ) );
		add_filter( 'rocket_exclude_defer_js', array( __CLASS__, 'exclude_rocket_js' ) );
		add_filter( 'rocket_delay_js_exclusions', array( __CLASS__, 'exclude_rocket_js' ) );
		add_filter( 'wp_speculation_rules_href_exclude_paths', array( __CLASS__, 'exclude_storefront_speculation' ) );
	}

	public static function activate() {
		self::register_rewrite_rules();
		flush_rewrite_rules();
	}

	public static function deactivate() {
		flush_rewrite_rules();
	}

	public static function register_rewrite_rules() {
		add_rewrite_rule(
			'^store2(?:/(.+))?/?$',
			'index.php?' . self::QUERY_FLAG . '=1&' . self::QUERY_PATH . '=$matches[1]',
			'top'
		);
	}

	public static function register_query_vars( $vars ) {
		$vars[] = self::QUERY_FLAG;
		$vars[] = self::QUERY_PATH;
		return $vars;
	}

	public static function is_storefront_request() {
		return '1' === (string) get_query_var( self::QUERY_FLAG );
	}

	public static function remove_legacy_ecwid_output() {
		if ( ! self::is_storefront_request() ) {
			return;
		}

		remove_action( 'wp_head', 'ecwid_print_inline_js_config' );
		remove_action( 'wp_head', 'ecwid_product_browser_url_in_head' );
		remove_action( 'wp_head', 'ecwid_add_kliken_code' );
		remove_action( 'wp_footer', 'Ec_Store_Defer_Init::defer_script_js_load' );

		self::remove_ecwid_object_callbacks( 'wp_head' );
		self::remove_ecwid_object_callbacks( 'wp_footer' );
	}

	private static function remove_ecwid_object_callbacks( $hook_name ) {
		global $wp_filter;

		if ( empty( $wp_filter[ $hook_name ] ) || empty( $wp_filter[ $hook_name ]->callbacks ) ) {
			return;
		}

		foreach ( $wp_filter[ $hook_name ]->callbacks as $priority => $callbacks ) {
			foreach ( $callbacks as $callback ) {
				$callable = isset( $callback['function'] ) ? $callback['function'] : null;
				if ( ! is_array( $callable ) || ! is_object( $callable[0] ) ) {
					continue;
				}

				$class_name = strtolower( get_class( $callable[0] ) );
				if ( 0 === strpos( $class_name, 'ecwid_' ) || 0 === strpos( $class_name, 'ec_' ) ) {
					remove_action( $hook_name, $callable, $priority );
				}
			}
		}
	}

	public static function use_storefront_template( $template ) {
		if ( ! self::is_storefront_request() ) {
			return $template;
		}

		$missing = self::public_not_found();
		$path = self::storefront_path();
		if ( self::public_html_enabled() && in_array( $_SERVER['REQUEST_METHOD'] ?? 'GET', array( 'GET', 'HEAD' ), true )
			&& preg_match( '/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]+$/D', $path )
			&& ! preg_match( '/^(?:cart|checkout|orders|saved-carts|ongoing-carts|order-confirmation)(?:-|\/|$)/', $path )
			&& ( $missing || null === self::public_html_data() ) ) {
			// Do not persist an unavailable lookup as a successful full-page cache hit.
			if ( ! defined( 'DONOTCACHEPAGE' ) ) { define( 'DONOTCACHEPAGE', true ); }
			nocache_headers();
		}
		status_header( $missing ? 404 : 200 );
		return KTK_STOREFRONT_DIR . 'templates/storefront.php';
	}

	public static function public_html_enabled() {
		return self::is_storefront_request() && home_url( '/' ) === 'https://krawlthroughkrakow.com/staging/'
			&& site_url( '/' ) === 'https://krawlthroughkrakow.com/staging/';
	}

	public static function public_not_found() {
		if ( ! self::public_html_enabled() || ! in_array( $_SERVER['REQUEST_METHOD'] ?? 'GET', array( 'GET', 'HEAD' ), true ) ) { return false; }
		$slug = self::product_slug();
		if ( '' === $slug || in_array( $slug, array( 'orders', 'saved-carts', 'ongoing-carts', 'order-confirmation' ), true ) ) { return false; }
		self::product_payload( $slug );
		return ! empty( self::$missing_products[ $slug ] );
	}

	public static function allow_staging_storefront_zoom() {
		if ( self::public_html_enabled() ) {
			// The standalone template already supplies a viewport without zoom restrictions.
			remove_action( 'wp_head', 'et_add_viewport_meta', 10 );
		}
	}

	public static function public_style_tag( $html, $handle ) {
		if ( 'ktk-storefront' !== $handle || ! self::public_html_enabled() || ! class_exists( 'WP_HTML_Tag_Processor' ) ) { return $html; }
		$tag = new WP_HTML_Tag_Processor( $html );
		if ( $tag->next_tag( 'LINK' ) ) { $tag->set_attribute( 'data-no-minify', '1' ); }
		return $tag->get_updated_html();
	}

	public static function public_html_data() {
		if ( ! self::public_html_enabled() ) { return null; }
		$path = self::storefront_path();
		if ( '' === $path ) {
			$payload = get_transient( 'ktk_sf_' . md5( 'catalog' ) );
			if ( ! is_array( $payload ) || ! isset( $payload['products'] ) || ! is_array( $payload['products'] ) ) {
				$response = wp_remote_get( untrailingslashit( self::storefront_api_base() ) . '/products', array( 'timeout' => 8, 'headers' => array( 'Accept' => 'application/json' ) ) );
				if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) { return null; }
				$payload = json_decode( wp_remote_retrieve_body( $response ), true );
				if ( ! is_array( $payload['products'] ?? null ) || empty( $payload['products'] ) ) { return null; }
				set_transient( 'ktk_sf_' . md5( 'catalog' ), $payload, self::CACHE_TTL );
			}
			$products = array_filter( $payload['products'], function ( $product ) {
				return is_array( $product ) && ! empty( $product['name'] ) && preg_match( '/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $product['slug'] ?? '' );
			} );
			return $products ? array( 'kind' => 'catalog', 'products' => array_values( $products ) ) : null;
		}
		$slug = self::product_slug();
		if ( '' === $slug ) { return null; }
		$product = self::product_payload( $slug );
		if ( self::public_not_found() ) { return array( 'kind' => 'not-found' ); }
		if ( empty( $product['name'] ) || ( $product['slug'] ?? '' ) !== $slug ) { return null; }
		$payload = get_transient( 'ktk_sf_' . md5( 'product_' . $slug ) );
		return array( 'kind' => 'product', 'product' => $product,
			'cancellationPolicy' => is_array( $payload['storefrontConfig']['cancellationPolicy'] ?? null ) ? $payload['storefrontConfig']['cancellationPolicy'] : null );
	}

	public static function enqueue_assets() {
		if ( ! self::is_storefront_request() ) {
			return;
		}

		$asset_dir = KTK_STOREFRONT_DIR . 'assets/';
		$asset_url = KTK_STOREFRONT_URL . 'assets/';
		$css_version = self::asset_version( $asset_dir . 'storefront.css' );
		$js_version = self::asset_version( $asset_dir . 'storefront.js' );

		wp_enqueue_style(
			'ktk-storefront',
			$asset_url . 'storefront.css',
			array(),
			$css_version
		);

		wp_enqueue_script(
			'ktk-storefront',
			$asset_url . 'storefront.js',
			array(),
			$js_version,
			true
		);

		$legacy_store_url = 'https://krawlthroughkrakow.com/store/';
		$legacy_product_urls = array(
			'airport-transfer-42' => $legacy_store_url . 'Airport-Transfer-Normal-p740813107',
			'beauty-the-beast-stag-45' => $legacy_store_url . 'Beauty-&-the-Beast-Stag-p816624537',
			'boat-party-41' => $legacy_store_url . 'Boat-Party-Private-Boat-p637239272',
			'bottomless-brunch-29' => $legacy_store_url . '2-Hour-Bottomless-Brunch-with-3-Course-Meal-And-Drinks-p808765006',
			'brewery-tour-40' => $legacy_store_url . 'Brewery-Tour-p637056338',
			'bubble-football-43' => $legacy_store_url . 'Bubble-Football-p637225330',
			'cycle-tour-50' => $legacy_store_url . 'Cycle-Tour-p850960793',
			'dwarf-arrest-38' => $legacy_store_url . 'Dwarf-Arrest-p808765256',
			'food-tour-krakow-48' => $legacy_store_url . 'Krakow-Food-Tour-p637227366',
			'go-karting-30' => $legacy_store_url . 'Krakow-Go-Karting-p637221989',
			'kidnapping-stag-prank-39' => $legacy_store_url . 'Kidnapping-Stag-Prank-p740772463',
			'life-drawing-session-37' => $legacy_store_url . 'Life-Drawing-Session-p637227458',
			'morning-wake-up-47' => $legacy_store_url . 'Morning-Wake-Up-p828444580',
			'nye-pub-crawl-32' => $legacy_store_url . 'New-Years-Eve-Krakow-Pub-Crawl-p800134329',
			'paintball-35' => $legacy_store_url . 'Krakow-Paintball-p637240753',
			'party-bus-46' => $legacy_store_url . 'Party-Bus-p821424470',
			'polish-vodka-tasting-44' => $legacy_store_url . 'Polish-Vodka-Tasting-p637205219',
			'private-pub-crawl-31' => $legacy_store_url . 'Private-Pub-Crawl-p835613122',
			'pub-crawl-28' => $legacy_store_url . 'Krakow-Pub-Crawl-with-Krawl-Through-Krakow-p637047413',
			'shooting-range-34' => $legacy_store_url . 'Krakow-Shooting-Range-Package-p637227393',
			'strip-club-36' => $legacy_store_url . 'Strip-Club-p637239277',
		);

		$config = array(
			'restUrl' => esc_url_raw( rest_url( self::REST_NAMESPACE ) ),
			'assetBaseUrl' => esc_url_raw( $asset_url ),
			'baseUrl' => esc_url_raw( home_url( '/store2' ) ),
			'path' => sanitize_text_field( (string) get_query_var( self::QUERY_PATH ) ),
			'siteUrl' => esc_url_raw( home_url( '/' ) ),
			'legacyStoreUrl' => esc_url_raw( $legacy_store_url ),
			'legacyProductUrls' => array_map( 'esc_url_raw', $legacy_product_urls ),
			'ga4Purchase' => self::staging_ga4_purchase_config(),
		);

		wp_add_inline_script(
			'ktk-storefront',
			'window.KTK_STOREFRONT = ' . wp_json_encode( $config ) . ';',
			'before'
		);
	}

	public static function staging_ga4_purchase_config() {
		$measurement_id = self::STAGING_GA4_MEASUREMENT_ID;
		$home = parse_url( home_url( '/' ) );
		$path = (string) parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH );
		if ( ( $home['scheme'] ?? '' ) !== 'https' || ( $home['host'] ?? '' ) !== 'krawlthroughkrakow.com'
			|| ! empty( $home['port'] ) || rtrim( $home['path'] ?? '', '/' ) !== '/staging'
			|| strtolower( $_SERVER['HTTP_HOST'] ?? '' ) !== 'krawlthroughkrakow.com'
			|| ! preg_match( '#^/staging/store2(?:/|$)#D', $path )
			|| ! preg_match( '/^G-[A-Z0-9]{6,15}$/D', $measurement_id )
			|| in_array( $measurement_id, array( 'G-58KDXF12R8', 'G-8F5KMPDYEB' ), true ) ) {
			return null;
		}
		return array( 'enabled' => true, 'environment' => 'staging', 'measurementId' => $measurement_id );
	}

	public static function output_clarity_consent_bridge() {
		?>
		<script id="ktk-clarity-consent-bridge" class="_iub_cs_skip" data-cmp-ab="2">
		(function (window, document) {
			if (window.__ktkClarityConsentBridge) return;
			window.__ktkClarityConsentBridge = true;
			window.clarity = window.clarity || function () {
				(window.clarity.q = window.clarity.q || []).push(arguments);
			};

			var lastConsent = null;
			function applyConsent(granted) {
				if (lastConsent === granted) return;
				lastConsent = granted;
				window.KTK_ANALYTICS_CONSENT = granted;
				window.clarity('consentv2', {
					ad_Storage: 'denied',
					analytics_Storage: granted ? 'granted' : 'denied'
				});
				window.dispatchEvent(new CustomEvent('ktk:analytics-consent', {
					detail: { analytics: granted }
				}));
			}

			function readIubendaCookieConsent() {
				var cookies = String(document.cookie || '').split(';');
				for (var index = 0; index < cookies.length; index += 1) {
					var parts = cookies[index].trim().split('=');
					var name = parts.shift();
					if (!name || name.indexOf('_iub_cs-') !== 0 || !parts.length) continue;
					try {
						var value = JSON.parse(decodeURIComponent(parts.join('=')));
						var purposes = value && (value.purposes
							|| (value.preferences && value.preferences.purposes));
						if (purposes && Object.prototype.hasOwnProperty.call(purposes, '4')) {
							return purposes['4'] === true;
						}
						if (value && typeof value.consent === 'boolean') return value.consent;
					} catch (error) {
						continue;
					}
				}
				return null;
			}

			function readIubendaConsent() {
				try {
					var api = window._iub && window._iub.cs && window._iub.cs.api;
					if (!api) return readIubendaCookieConsent();
					var preferences = typeof api.getPreferences === 'function'
						? api.getPreferences()
						: null;
					if (preferences && preferences.purposes
						&& Object.prototype.hasOwnProperty.call(preferences.purposes, '4')) {
						return preferences.purposes['4'] === true;
					}
					var preferenceId = typeof api.getPreferenceId === 'function'
						? api.getPreferenceId()
						: '';
					if (preferenceId && typeof api.isConsentGiven === 'function') {
						return api.isConsentGiven() === true;
					}
				} catch (error) {
					return readIubendaCookieConsent();
				}
				return readIubendaCookieConsent();
			}

			function syncConsent() {
				var consent = readIubendaConsent();
				if (consent !== null) applyConsent(consent);
			}

			var initialConsent = readIubendaConsent();
			applyConsent(initialConsent === true);

			var dataLayer = window.dataLayer = window.dataLayer || [];
			var originalPush = dataLayer.push;
			dataLayer.push = function () {
				for (var index = 0; index < arguments.length; index += 1) {
					var eventName = arguments[index] && arguments[index].event;
					if (eventName === 'iubenda_consent_given_purpose_4'
						|| eventName === 'iubenda_preference_not_needed') {
						applyConsent(true);
					} else if (eventName && eventName.indexOf('iubenda_') === 0) {
						window.setTimeout(syncConsent, 0);
					}
				}
				return originalPush.apply(this, arguments);
			};

			document.addEventListener('pointerup', function () {
				window.setTimeout(syncConsent, 100);
			}, { passive: true });
			window.addEventListener('focus', syncConsent);
			var attempts = 0;
			var consentTimer = window.setInterval(function () {
				attempts += 1;
				syncConsent();
				if (attempts >= 60 || lastConsent !== null) {
					window.clearInterval(consentTimer);
				}
			}, 500);
		})(window, document);
		</script>
		<?php
	}

	public static function dequeue_unused_assets() {
		if ( ! self::is_storefront_request() ) {
			return;
		}

		self::dequeue_unused_asset_group( wp_styles(), 'style' );
		self::dequeue_unused_asset_group( wp_scripts(), 'script' );
	}

	private static function dequeue_unused_asset_group( $registry, $type ) {
		foreach ( (array) $registry->queue as $handle ) {
			if ( 'ktk-storefront' === $handle || ! isset( $registry->registered[ $handle ] ) ) {
				continue;
			}

			$asset = $registry->registered[ $handle ];
			$src = is_string( $asset->src ) ? strtolower( $asset->src ) : '';
			$normalized_handle = strtolower( (string) $handle );
			$is_ecwid = 0 === strpos( $normalized_handle, 'ecwid-' )
				|| false !== strpos( $src, '/plugins/ecwid-shopping-cart/' );
			$is_divi = false !== strpos( $src, '/themes/divi/' )
				|| false !== strpos( $src, '/wp-content/et-cache/' );

			if ( ! $is_ecwid && ! $is_divi ) {
				continue;
			}

			if ( 'style' === $type ) {
				wp_dequeue_style( $handle );
			} else {
				wp_dequeue_script( $handle );
			}
		}
	}

	private static function asset_version( $path ) {
		if ( ! file_exists( $path ) ) {
			return KTK_STOREFRONT_VERSION;
		}

		$hash = hash_file( 'sha256', $path );
		return false !== $hash ? substr( $hash, 0, 12 ) : (string) filemtime( $path );
	}

	public static function output_font_preloads() {
		if ( ! self::is_storefront_request() ) {
			return;
		}

		$font_base_url = KTK_STOREFRONT_URL . 'assets/';
		$fonts = array(
			'storefront-montserrat-latin.woff2',
			'storefront-oswald-latin.woff2',
		);

		foreach ( $fonts as $font ) {
			printf(
				'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>%s',
				esc_url( $font_base_url . $font ),
				"\n"
			);
		}
	}

	private static function storefront_path() {
		return trim( sanitize_text_field( (string) get_query_var( self::QUERY_PATH ) ), '/' );
	}

	private static function product_slug() {
		$path = self::storefront_path();
		if ( '' === $path || false !== strpos( $path, '/' ) || in_array( $path, array( 'cart', 'checkout' ), true ) ) {
			return '';
		}

		return sanitize_title( $path );
	}

	private static function storefront_api_base() {
		$api_base = defined( 'KTK_STOREFRONT_API_BASE' )
			? KTK_STOREFRONT_API_BASE
			: 'https://omni-lodge.com/api/storefront';

		return apply_filters( 'ktk_storefront_api_base', $api_base );
	}

	private static function product_payload( $slug ) {
		static $products = array();
		if ( isset( $products[ $slug ] ) ) {
			return $products[ $slug ];
		}

		$cache_key = 'product_' . $slug;
		$cached = get_transient( 'ktk_sf_' . md5( $cache_key ) );
		if ( is_array( $cached ) && isset( $cached['product'] ) && is_array( $cached['product'] ) ) {
			$products[ $slug ] = $cached['product'];
			return $products[ $slug ];
		}

		$response = wp_remote_get(
			untrailingslashit( self::storefront_api_base() ) . '/products/' . rawurlencode( $slug ),
			array(
				'timeout' => 8,
				'headers' => array( 'Accept' => 'application/json' ),
			)
		);
		if ( self::public_html_enabled() && ! is_wp_error( $response ) && 404 === (int) wp_remote_retrieve_response_code( $response ) ) {
			$content_type = wp_remote_retrieve_header( $response, 'content-type' );
			$error = json_decode( wp_remote_retrieve_body( $response ), true );
			if ( is_string( $content_type ) && preg_match( '~^application/json(?:\s*;|$)~iD', $content_type )
				&& is_array( $error ) && 1 === count( $error ) && ( $error['message'] ?? null ) === 'Product not found.' ) {
				// Request-local evidence only: never cache absence or infer it from an outage.
				self::$missing_products[ $slug ] = true;
			}
		}
		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			$products[ $slug ] = array();
			return $products[ $slug ];
		}

		$payload = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $payload ) || ! isset( $payload['product'] ) || ! is_array( $payload['product'] ) ) {
			$products[ $slug ] = array();
			return $products[ $slug ];
		}

		set_transient( 'ktk_sf_' . md5( $cache_key ), $payload, self::CACHE_TTL );
		$products[ $slug ] = $payload['product'];
		return $products[ $slug ];
	}

	private static function normalized_text( $value ) {
		$text = html_entity_decode( wp_strip_all_tags( (string) $value ), ENT_QUOTES, get_bloginfo( 'charset' ) );
		return trim( preg_replace( '/\s+/u', ' ', $text ) );
	}

	private static function truncate_description( $description, $length = 200 ) {
		$description = self::normalized_text( $description );
		if ( function_exists( 'mb_strlen' ) && mb_strlen( $description ) <= $length ) {
			return $description;
		}
		if ( ! function_exists( 'mb_strlen' ) && strlen( $description ) <= $length ) {
			return $description;
		}

		$excerpt = wp_html_excerpt( $description, $length - 3, '' );
		$excerpt = preg_replace( '/\s+\S*$/u', '', $excerpt );
		return rtrim( $excerpt, " \t\n\r\0\x0B,.;:-" ) . '...';
	}

	private static function product_description( $product ) {
		$content = isset( $product['config']['content'] ) && is_array( $product['config']['content'] )
			? $product['config']['content']
			: array();
		if ( self::public_html_enabled() ) { $content = KTK_Storefront_Public_Content::resolve( $product ); }
		$parts = array();

		$fields = ! empty( $content['pastCampaign'] ) ? array( 'summary', 'description' ) : array( 'description', 'summary' );
		foreach ( $fields as $field ) {
			$value = isset( $content[ $field ] ) ? self::normalized_text( $content[ $field ] ) : '';
			if ( '' !== $value && ! in_array( $value, $parts, true ) ) {
				$parts[] = $value;
			}
		}
		if ( isset( $content['highlights'] ) && is_array( $content['highlights'] ) ) {
			foreach ( $content['highlights'] as $highlight ) {
				$value = self::normalized_text( $highlight );
				if ( '' !== $value && ! in_array( $value, $parts, true ) ) {
					$parts[] = $value;
				}
			}
		}

		$description = implode( '. ', array_map( function ( $part ) {
			return rtrim( $part, " \t\n\r\0\x0B.!?" );
		}, $parts ) );
		if ( '' === $description ) {
			$description = sprintf( 'Book %s in Krakow with Krawl Through Krakow.', self::normalized_text( $product['name'] ?? 'an experience' ) );
		}

		return self::truncate_description( $description );
	}

	private static function product_images( $product ) {
		$images = array();
		if ( ! empty( $product['imageUrl'] ) ) {
			$images[] = array(
				'url' => $product['imageUrl'],
				'alt' => sprintf( '%s experience in Krakow', self::normalized_text( $product['name'] ?? 'Krawl Through Krakow' ) ),
			);
		}
		if ( isset( $product['images'] ) && is_array( $product['images'] ) ) {
			foreach ( $product['images'] as $image ) {
				$images[] = is_array( $image ) ? $image : array( 'url' => $image );
			}
		}
		if ( self::public_html_enabled() ) {
			foreach ( KTK_Storefront_Public_Content::resolve( $product )['gallery'] as $url ) {
				$images[] = array( 'url' => $url );
			}
		}

		$normalized = array();
		$seen = array();
		foreach ( $images as $image ) {
			$url = isset( $image['url'] ) ? esc_url_raw( $image['url'] ) : '';
			if ( '' === $url || isset( $seen[ $url ] ) ) {
				continue;
			}
			$seen[ $url ] = true;
			$normalized[] = array(
				'url' => $url,
				'alt' => ! empty( $image['alt'] ) ? self::normalized_text( $image['alt'] ) : sprintf( '%s experience in Krakow', self::normalized_text( $product['name'] ?? 'Krawl Through Krakow' ) ),
				'width' => isset( $image['width'] ) ? absint( $image['width'] ) : 0,
				'height' => isset( $image['height'] ) ? absint( $image['height'] ) : 0,
			);
		}

		return $normalized;
	}

	private static function metadata() {
		static $metadata = null;
		if ( null !== $metadata ) {
			return $metadata;
		}

		$path = self::storefront_path();
		$slug = self::product_slug();
		$canonical = home_url( '/store2/' );
		$metadata = array(
			'title' => 'Krakow Experiences | Krawl Through Krakow',
			'description' => 'Book unforgettable Krakow experiences, nightlife activities and group events with Krawl Through Krakow.',
			'canonical' => $canonical,
			'image' => array(),
			'images' => array(),
			'product' => array(),
			'indexable' => '' === $path,
		);

		if ( '' === $slug ) {
			if ( 'cart' === $path ) {
				$metadata['title'] = 'Your Cart | Krawl Through Krakow';
				$metadata['canonical'] = home_url( '/store2/cart/' );
			} elseif ( 0 === strpos( $path, 'checkout' ) ) {
				$metadata['title'] = 'Checkout | Krawl Through Krakow';
				$metadata['canonical'] = home_url( '/store2/checkout/' );
			}
			return $metadata;
		}

		$product = self::product_payload( $slug );
		if ( empty( $product ) ) {
			$metadata['canonical'] = home_url( '/store2/' . $slug . '/' );
			$metadata['indexable'] = false;
			if ( self::public_not_found() ) {
				$metadata['title'] = 'Experience not found | Krawl Through Krakow';
				$metadata['description'] = 'The requested experience could not be found. Browse current Krakow experiences or contact our local team.';
			}
			return $metadata;
		}

		$name = self::normalized_text( $product['name'] ?? 'Krakow Experience' );
		$images = self::product_images( $product );
		$metadata['title'] = $name . ' | Krawl Through Krakow';
		$metadata['description'] = self::product_description( $product );
		$metadata['canonical'] = home_url( '/store2/' . $slug . '/' );
		$metadata['image'] = $images[0] ?? array();
		$metadata['images'] = $images;
		$metadata['product'] = $product;
		$metadata['indexable'] = true;
		return $metadata;
	}

	private static function output_meta_tag( $attribute, $name, $content ) {
		if ( '' === (string) $content ) {
			return;
		}
		printf( "<meta %s=\"%s\" content=\"%s\" />\n", esc_attr( $attribute ), esc_attr( $name ), esc_attr( $content ) );
	}

	public static function output_storefront_metadata() {
		if ( ! self::is_storefront_request() ) {
			return;
		}

		$metadata = self::metadata();
		$product = $metadata['product'];
		$image = $metadata['image'];
		$name = ! empty( $product ) ? self::normalized_text( $product['name'] ?? '' ) : $metadata['title'];

		echo "<!-- KTK Storefront metadata -->\n";
		self::output_meta_tag( 'name', 'description', $metadata['description'] );
		printf( "<link rel=\"canonical\" href=\"%s\" />\n", esc_url( $metadata['canonical'] ) );
		self::output_meta_tag( 'property', 'og:title', $metadata['title'] );
		self::output_meta_tag( 'property', 'og:description', $metadata['description'] );
		self::output_meta_tag( 'property', 'og:type', ! empty( $product ) ? 'product' : 'website' );
		self::output_meta_tag( 'property', 'og:url', $metadata['canonical'] );
		self::output_meta_tag( 'property', 'og:site_name', 'Krawl Through Krakow' );
		self::output_meta_tag( 'property', 'og:locale', 'en_US' );
		if ( ! empty( $image['url'] ) ) {
			self::output_meta_tag( 'property', 'og:image', $image['url'] );
			self::output_meta_tag( 'property', 'og:image:secure_url', $image['url'] );
			self::output_meta_tag( 'property', 'og:image:type', self::image_mime_type( $image['url'] ) );
			self::output_meta_tag( 'property', 'og:image:alt', $image['alt'] );
			if ( ! empty( $image['width'] ) && ! empty( $image['height'] ) ) {
				self::output_meta_tag( 'property', 'og:image:width', $image['width'] );
				self::output_meta_tag( 'property', 'og:image:height', $image['height'] );
			}
		}
		$past_campaign = self::public_html_enabled() && ! empty( $product ) ? KTK_Storefront_Public_Content::past_campaign( $product ) : null;
		if ( ! $past_campaign && ! empty( $product['price']['amount'] ) && ! empty( $product['price']['currency'] ) ) {
			self::output_meta_tag( 'property', 'product:price:amount', number_format( (float) $product['price']['amount'], 2, '.', '' ) );
			self::output_meta_tag( 'property', 'product:price:currency', strtoupper( sanitize_text_field( $product['price']['currency'] ) ) );
			self::output_meta_tag( 'property', 'product:availability', 'in stock' );
		}
		if ( ! empty( $product['id'] ) ) {
			self::output_meta_tag( 'property', 'product:retailer_item_id', (string) absint( $product['id'] ) );
		}
		self::output_meta_tag( 'name', 'twitter:card', ! empty( $image ) ? 'summary_large_image' : 'summary' );
		self::output_meta_tag( 'name', 'twitter:title', $metadata['title'] );
		self::output_meta_tag( 'name', 'twitter:description', $metadata['description'] );
		if ( ! empty( $image['url'] ) ) {
			self::output_meta_tag( 'name', 'twitter:image', $image['url'] );
			self::output_meta_tag( 'name', 'twitter:image:alt', $image['alt'] );
		}

		if ( ! empty( $product ) ) {
			$schema = self::product_schema( $metadata, $name );
			printf(
				"<script type=\"application/ld+json\">%s</script>\n",
				wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP )
			);
		}
		echo "<!-- /KTK Storefront metadata -->\n";
	}

	private static function image_mime_type( $url ) {
		$extension = strtolower( pathinfo( (string) wp_parse_url( $url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );
		$types = array(
			'gif' => 'image/gif',
			'jpeg' => 'image/jpeg',
			'jpg' => 'image/jpeg',
			'png' => 'image/png',
			'webp' => 'image/webp',
		);
		return $types[ $extension ] ?? 'image/jpeg';
	}

	private static function product_schema( $metadata, $name ) {
		$product = $metadata['product'];
		$schema_product = array(
			'@type' => 'Product',
			'@id' => $metadata['canonical'] . '#product',
			'name' => $name,
			'description' => $metadata['description'],
			'url' => $metadata['canonical'],
			'image' => array_values( wp_list_pluck( $metadata['images'], 'url' ) ),
			'sku' => 'KTK-' . absint( $product['id'] ?? 0 ),
			'brand' => array(
				'@type' => 'Brand',
				'name' => 'Krawl Through Krakow',
			),
		);
		if ( ! empty( $product['productType']['name'] ) ) {
			$schema_product['category'] = self::normalized_text( $product['productType']['name'] );
		}
		if ( isset( $product['price']['amount'], $product['price']['currency'] ) && is_numeric( $product['price']['amount'] ) ) {
			$schema_product['offers'] = array(
				'@type' => 'Offer',
				'url' => add_query_arg( 'book', '1', $metadata['canonical'] ),
				'price' => number_format( (float) $product['price']['amount'], 2, '.', '' ),
				'priceCurrency' => strtoupper( sanitize_text_field( $product['price']['currency'] ) ),
				'availability' => 'https://schema.org/InStock',
				'itemCondition' => 'https://schema.org/NewCondition',
				'seller' => array(
					'@type' => 'Organization',
					'name' => 'Krawl Through Krakow',
					'url' => home_url( '/' ),
				),
			);
		}

		$webpage = array(
			'@type' => 'WebPage',
			'@id' => $metadata['canonical'] . '#webpage',
			'url' => $metadata['canonical'],
			'name' => $metadata['title'],
			'description' => $metadata['description'],
			'mainEntity' => array( '@id' => $metadata['canonical'] . '#product' ),
		);
		if ( ! empty( $metadata['image']['url'] ) ) {
			$webpage['primaryImageOfPage'] = $metadata['image']['url'];
		}
		if ( self::public_html_enabled() && KTK_Storefront_Public_Content::past_campaign( $product ) ) {
			unset( $webpage['mainEntity'] );
			return array( '@context' => 'https://schema.org', '@graph' => array( $webpage ) );
		}

		return array(
			'@context' => 'https://schema.org',
			'@graph' => array(
				$webpage,
				$schema_product,
			),
		);
	}

	public static function exclude_rocket_css( $excluded ) {
		$excluded[] = '/wp-content/plugins/ktk-storefront/assets/storefront.css';
		return array_values( array_unique( $excluded ) );
	}

	public static function exclude_rocket_js( $excluded ) {
		$excluded[] = '/wp-content/plugins/ktk-storefront/assets/storefront.js';
		$excluded[] = 'ktk-storefront/assets/storefront.js';
		$excluded[] = 'window.KTK_STOREFRONT';
		return array_values( array_unique( $excluded ) );
	}

	public static function exclude_storefront_speculation( $excluded_paths ) {
		$excluded_paths[] = '/store2/*';
		return array_values( array_unique( $excluded_paths ) );
	}

	public static function register_rest_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/config',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => array( __CLASS__, 'proxy_storefront_config' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/products',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => array( __CLASS__, 'proxy_product_list' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/products/(?P<slug>[a-z0-9-]+)',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => array( __CLASS__, 'proxy_product_detail' ),
				'permission_callback' => '__return_true',
				'args' => array(
					'slug' => array(
						'required' => true,
						'sanitize_callback' => 'sanitize_title',
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/saved-carts/(?P<public_id>[a-f0-9-]{36})',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => array( __CLASS__, 'proxy_saved_cart' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/ongoing-carts/(?P<public_id>[a-f0-9-]{36})',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => array( __CLASS__, 'proxy_ongoing_cart' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/ongoing-carts/(?P<public_id>[a-f0-9-]{36})/activity',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => array( __CLASS__, 'proxy_ongoing_cart_activity' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/ongoing-carts/session/(?P<session_id>[a-f0-9-]{36})',
			array(
				'methods' => WP_REST_Server::DELETABLE,
				'callback' => array( __CLASS__, 'proxy_dismiss_ongoing_cart' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/cart/quote',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => array( __CLASS__, 'proxy_cart_quote' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/checkout',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => array( __CLASS__, 'proxy_checkout' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/orders/(?P<public_id>[a-f0-9-]{36})/confirm',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => array( __CLASS__, 'proxy_order_confirmation' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/orders/(?P<public_id>[a-f0-9-]{36})',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => array( __CLASS__, 'proxy_order_status' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public static function proxy_storefront_config() {
		return self::proxy_omnilodge_request( '/config', 'config' );
	}

	public static function proxy_product_list() {
		return self::proxy_omnilodge_request( '/products', 'catalog' );
	}

	public static function proxy_product_detail( WP_REST_Request $request ) {
		$slug = sanitize_title( (string) $request->get_param( 'slug' ) );
		return self::proxy_omnilodge_request( '/products/' . rawurlencode( $slug ), 'product_' . $slug );
	}

	public static function proxy_cart_quote( WP_REST_Request $request ) {
		return self::proxy_omnilodge_request( '/cart/quote', '', 'POST', $request->get_json_params() );
	}

	public static function proxy_saved_cart( WP_REST_Request $request ) {
		$public_id = sanitize_text_field( (string) $request->get_param( 'public_id' ) );
		return self::proxy_omnilodge_request( '/saved-carts/' . rawurlencode( $public_id ), '' );
	}

	public static function proxy_ongoing_cart( WP_REST_Request $request ) {
		$public_id = sanitize_text_field( (string) $request->get_param( 'public_id' ) );
		$recovery_token = sanitize_text_field( (string) $request->get_param( 'rt' ) );
		$path = '/ongoing-carts/' . rawurlencode( $public_id );
		if ( preg_match( '/^[a-f0-9-]{36}$/i', $recovery_token ) ) {
			$path .= '?rt=' . rawurlencode( $recovery_token );
		}
		return self::proxy_omnilodge_request( $path, '' );
	}

	public static function proxy_ongoing_cart_activity( WP_REST_Request $request ) {
		$public_id = sanitize_text_field( (string) $request->get_param( 'public_id' ) );
		return self::proxy_omnilodge_request(
			'/ongoing-carts/' . rawurlencode( $public_id ) . '/activity',
			'',
			'POST',
			$request->get_json_params()
		);
	}

	public static function proxy_dismiss_ongoing_cart( WP_REST_Request $request ) {
		$session_id = sanitize_text_field( (string) $request->get_param( 'session_id' ) );
		return self::proxy_omnilodge_request(
			'/ongoing-carts/session/' . rawurlencode( $session_id ),
			'',
			'DELETE'
		);
	}

	public static function proxy_checkout( WP_REST_Request $request ) {
		return self::proxy_omnilodge_request( '/checkout', '', 'POST', $request->get_json_params() );
	}

	public static function proxy_order_confirmation( WP_REST_Request $request ) {
		$public_id = sanitize_text_field( (string) $request->get_param( 'public_id' ) );
		return self::proxy_omnilodge_request(
			'/orders/' . rawurlencode( $public_id ) . '/confirm',
			'',
			'POST',
			$request->get_json_params()
		);
	}

	public static function proxy_order_status( WP_REST_Request $request ) {
		$public_id = sanitize_text_field( (string) $request->get_param( 'public_id' ) );
		return self::proxy_omnilodge_request( '/orders/' . rawurlencode( $public_id ), '' );
	}

	private static function proxy_omnilodge_request( $path, $cache_key = '', $method = 'GET', $body = null ) {
		$transient_key = 'ktk_sf_' . md5( $cache_key );
		$cached = $cache_key ? get_transient( $transient_key ) : false;

		if ( false !== $cached ) {
			return rest_ensure_response( $cached );
		}

		$api_base = defined( 'KTK_STOREFRONT_API_BASE' )
			? KTK_STOREFRONT_API_BASE
			: 'https://omni-lodge.com/api/storefront';
		$api_base = apply_filters( 'ktk_storefront_api_base', $api_base );

		$args = array(
			'method' => $method,
			'timeout' => 20,
			'headers' => array(
				'Accept' => 'application/json',
				'Content-Type' => 'application/json',
			),
		);

		if ( null !== $body ) {
			$args['body'] = wp_json_encode( is_array( $body ) ? $body : array() );
		}

		$response = wp_remote_request(
			untrailingslashit( $api_base ) . $path,
			$args
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'ktk_storefront_unavailable',
				'The experience catalog is temporarily unavailable.',
				array( 'status' => 502 )
			);
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$payload = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $payload ) ) {
			return new WP_Error(
				'ktk_storefront_invalid_response',
				'The experience catalog returned an invalid response.',
				array( 'status' => 502 )
			);
		}

		if ( $status < 200 || $status >= 300 ) {
			// OmniLodge's shared error middleware returns { error: { message } }.
			// Preserve review-required/payment-state messages through the WordPress proxy.
			$message = isset( $payload['message'] ) && is_string( $payload['message'] )
				? $payload['message']
				: ( isset( $payload['error']['message'] ) && is_string( $payload['error']['message'] )
					? $payload['error']['message'] : 'Unable to load the experience catalog.' );
			return new WP_Error(
				'ktk_storefront_api_error',
				sanitize_text_field( $message ),
				array( 'status' => $status > 0 ? $status : 502 )
			);
		}

		if ( $cache_key ) {
			set_transient( $transient_key, $payload, self::CACHE_TTL );
		}
		return rest_ensure_response( $payload );
	}

	public static function filter_pre_document_title( $title ) {
		return self::is_storefront_request() ? self::metadata()['title'] : $title;
	}

	public static function filter_document_title( $parts ) {
		if ( self::is_storefront_request() ) {
			$parts['title'] = self::metadata()['title'];
			unset( $parts['tagline'], $parts['site'] );
		}
		return $parts;
	}

	public static function filter_robots( $robots ) {
		if ( ! self::is_storefront_request() ) {
			return $robots;
		}

		if ( self::metadata()['indexable'] ) {
			unset( $robots['noindex'], $robots['nofollow'], $robots['noarchive'] );
			$robots['index'] = true;
			$robots['follow'] = true;
			$robots['max-image-preview'] = 'large';
			return $robots;
		}

		unset( $robots['index'], $robots['follow'], $robots['max-image-preview'] );
		$robots['noindex'] = true;
		$robots['nofollow'] = true;
		$robots['noarchive'] = true;
		return $robots;
	}

	public static function filter_body_class( $classes ) {
		if ( self::is_storefront_request() ) {
			$classes[] = 'ktk-storefront-page';
		}
		return $classes;
	}

	private const META_ORDERING_BODIES = array(
		'31bd4b0882dd13a90dab3b1fb9795f645979fa959e17f5873865fe1a5f9f912c',
		'de332de462c2f02f6db63e5951badcd3d07cc0f348f75ffa648d48cc670dd34f',
		'b74c94c8bb401c0ae9c115b6e730ab422d27476cb0f4a5ebe7ce51b39f75f41d',
	);

	private const META_ORDERING_HELPER_PATHS = array(
		'/staging/wp-content/plugins/official-facebook-pixel/js/facebook_signal.js',
		'/staging/wp-content/plugins/official-facebook-pixel/core/../js/facebook_signal.js',
	);

	public static function register_meta_ordering() {
		add_filter( 'iubenda_initial_output', array( __CLASS__, 'group_meta_ordering' ) );
		foreach ( array( 'rocket_exclude_js', 'rocket_exclude_defer_js', 'rocket_delay_js_exclusions' ) as $hook ) {
			add_filter( $hook, array( __CLASS__, 'exclude_meta_ordering_helper' ), 20 );
		}
	}

	private static function meta_ordering_enabled() {
		if ( ! KTK_Storefront::public_html_enabled() || ! in_array( $_SERVER['REQUEST_METHOD'] ?? 'GET', array( 'GET', 'HEAD' ), true ) ) {
			return false;
		}
		$path = trim( (string) get_query_var( KTK_Storefront::QUERY_PATH ), '/' );
		if ( preg_match( '/^(?:cart|checkout|orders|saved-carts|ongoing-carts|order-confirmation)(?:-|\/|$)/', $path ) ) { return false; }
		// Catalog or a single public product-shaped slug only: no private/utility descendants.
		return '' === $path || 1 === preg_match( '/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]+$/D', $path );
	}

	public static function exclude_meta_ordering_helper( $excluded ) {
		if ( ! self::meta_ordering_enabled() || ! is_array( $excluded ) ) { return $excluded; }
		return array_values( array_unique( array_merge( $excluded, self::META_ORDERING_HELPER_PATHS ) ) );
	}

	public static function group_meta_ordering( $output ) {
		if ( ! self::meta_ordering_enabled() || ! is_string( $output ) || strlen( $output ) > 2097152 || false !== strpos( $output, 'data-ktk-meta-ordering=' ) ) {
			return $output;
		}
		if ( ! preg_match_all( '~<script\b[^>]*>(.*?)</script\s*>~is', $output, $matches, PREG_OFFSET_CAPTURE ) ) { return $output; }
		$found = array();
		$helper = null;
		foreach ( $matches[0] as $index => $match ) {
			$body = $matches[1][ $index ][0];
			$open = substr( $match[0], 0, strpos( $match[0], '>' ) + 1 );
			if ( preg_match( '/\bid=["\']facebook-signal-js["\']/', $open ) ) {
				if ( null !== $helper || '' !== $body || preg_match( '/\b(?:async|defer|data-rocket-src)\b|rocketlazyloadscript/i', $open ) ) { return $output; }
				$ready = false;
				foreach ( self::META_ORDERING_HELPER_PATHS as $path ) {
					if ( false !== strpos( $open, 'src="https://krawlthroughkrakow.com' . $path . '?ver=5.2.2"' ) ) { $ready = true; }
				}
				if ( ! $ready ) { return $output; }
				$helper = $match[1];
			}
			$part = array_search( hash( 'sha256', $body ), self::META_ORDERING_BODIES, true );
			if ( false === $part ) {
				// Never move a changed initializer, purchase, extra tracker or ambiguous fragment.
				if ( preg_match( '/\b(?:fbq|FacebookSignal)\b/', $body ) ) { return $output; }
				continue;
			}
			$allowed = array( '<script>', '<script type="text/javascript">', "<script type='text/javascript'>" );
			if ( 0 === $part ) { $allowed[] = '<script type="text/plain" class=" _iub_cs_activate-inline" data-iub-purposes="5">'; }
			// Iubenda may receive the already Rocket-optimized normal document.
			if ( 0 !== $part ) { $allowed[] = '<script type="text/rocketlazyloadscript" data-rocket-type="text/javascript">'; }
			if ( 0 !== $part ) { $allowed[] = "<script type=\"text/rocketlazyloadscript\" data-rocket-type='text/javascript'>"; }
			if ( isset( $found[ $part ] ) || ! in_array( $open, $allowed, true ) ) { return $output; }
			$found[ $part ] = array( 'body' => $body, 'offset' => $match[1], 'length' => strlen( $match[0] ) );
		}
		if ( 3 !== count( $found ) || null === $helper || ! ( $helper < $found[0]['offset'] && $found[0]['offset'] < $found[1]['offset'] && $found[1]['offset'] < $found[2]['offset'] ) ) {
			return $output;
		}
		$group = '<script type="text/plain" class="_iub_cs_activate-inline" data-iub-purposes="5" data-ktk-meta-ordering="v1">'
			. $found[0]['body'] . $found[1]['body'] . $found[2]['body'] . '</script>';
		// Change only the three complete tags, working backwards to retain every other byte.
		for ( $part = 2; $part >= 0; $part-- ) {
			$output = substr_replace( $output, 0 === $part ? $group : '', $found[ $part ]['offset'], $found[ $part ]['length'] );
		}
		return $output;
	}
}
