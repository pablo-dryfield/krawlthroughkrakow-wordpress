<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

final class KTK_Storefront_Public_Content {
	const VERSION = '2026.11.13.3';

	private static function compact( $values ) {
		return array_values( array_unique( array_filter( $values, function ( $value ) {
			return is_string( $value ) && '' !== trim( $value );
		} ) ) );
	}

	private static function first_text( ...$values ) {
		foreach ( $values as $value ) {
			if ( is_string( $value ) && '' !== $value ) { return $value; }
		}
		return '';
	}

	private static function mapped( $product ) {
		static $fallbacks;
		if ( null === $fallbacks ) {
			$fallbacks = json_decode( file_get_contents( __DIR__ . '/product-content-fallbacks.json' ), true );
			$fallbacks = is_array( $fallbacks ) ? $fallbacks : array();
		}
		return $fallbacks[ $product['slug'] ?? '' ] ?? array();
	}

	public static function past_campaign( $product, $today = null ) {
		$campaign = self::mapped( $product )['pastCampaign'] ?? null;
		if ( ! $campaign || (int) ( $product['id'] ?? 0 ) !== $campaign['productId'] ) { return null; }
		$availability = $product['config']['availability'] ?? array();
		$dates = $availability['allowedDates'] ?? null;
		if ( ( $availability['dateMode'] ?? '' ) !== 'allowed_dates' || ! is_array( $dates )
			|| count( $dates ) !== count( $campaign['lastDates'] )
			|| array_diff( $campaign['lastDates'], $dates ) ) { return null; }
		$today = $today ?? ( new DateTimeImmutable( 'now', new DateTimeZone( 'Europe/Warsaw' ) ) )->format( 'Y-m-d' );
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $today ) ) { return null; }
		foreach ( $campaign['lastDates'] as $date ) { if ( $date >= $today ) { return null; } }
		if ( isset( $availability['dateOverrides'] ) && ! is_array( $availability['dateOverrides'] ) ) { return null; }
		foreach ( $availability['dateOverrides'] ?? array() as $rule ) {
			if ( ( $rule['enabled'] ?? true ) !== false && ! in_array( $rule['mode'] ?? '', array( 'blocked', 'closed' ), true )
				&& ( $rule['date'] ?? '' ) >= $today ) { return null; }
		}
		return $campaign;
	}

	public static function resolve( $product ) {
		$mapped = self::mapped( $product );
		$past_campaign = self::past_campaign( $product );
		$configured = is_array( $product['config']['content'] ?? null ) ? $product['config']['content'] : array();
		$images = array();
		foreach ( ( $product['images'] ?? array() ) as $image ) {
			$images[] = is_array( $image ) ? ( $image['url'] ?? '' ) : $image;
		}
		$gallery = self::compact( array_merge( $images, array( $product['imageUrl'] ?? '' ), $mapped['gallery'] ?? array() ) );
		$highlights = ! empty( $configured['highlights'] ) && is_array( $configured['highlights'] ) ? $configured['highlights']
			: ( ! empty( $product['highlights'] ) && is_array( $product['highlights'] ) ? $product['highlights'] : ( $mapped['highlights'] ?? array() ) );
		$meeting = is_array( $configured['meetingPoint'] ?? null ) ? $configured['meetingPoint'] : null;
		if ( null !== $meeting ) {
			$normalized = array();
			foreach ( array( 'name', 'address', 'instructions', 'mapUrl' ) as $key ) {
				$normalized[ $key ] = trim( (string) ( $meeting[ $key ] ?? '' ) );
			}
			$meeting = $normalized;
		}
		return array(
			'kicker' => self::first_text( $configured['kicker'] ?? '', $product['kicker'] ?? '', $mapped['kicker'] ?? '', $product['productType']['name'] ?? '', 'Krakow experience' ),
			'summary' => self::first_text( $past_campaign['summary'] ?? '', $configured['summary'] ?? '', $product['summary'] ?? '', $mapped['summary'] ?? '', 'A locally operated Krakow experience, ready to become the best part of your trip.' ),
			'description' => self::first_text( $past_campaign['description'] ?? '', $configured['description'] ?? '', $product['description'] ?? '', $mapped['description'] ?? '' ),
			'highlights' => $highlights,
			'importantInformation' => self::compact( is_array( $configured['importantInformation'] ?? null ) ? $configured['importantInformation'] : array() ),
			'meetingPoint' => $meeting,
			'gallery' => $gallery,
			'checkoutUrl' => self::first_text( $product['checkoutUrl'] ?? '', $mapped['checkoutUrl'] ?? '', 'https://krawlthroughkrakow.com/store' ),
			'pastCampaign' => $past_campaign,
		);
	}

	public static function render( $data ) {
		if ( ! is_array( $data ) || ! in_array( $data['kind'] ?? '', array( 'product','catalog' ), true ) ) { return ''; }
		ob_start();
		?><div id="ktk-storefront-public-content" class="ktk-app" data-public-content="<?php echo esc_attr( self::VERSION ); ?>"><?php
		if ( 'product' === $data['kind'] ) { self::product( $data ); } else { self::catalog( $data['products'] ); }
		?></div><?php
		return ob_get_clean();
	}

	private static function price( $product ) {
		$amount = $product['price']['amount'] ?? null;
		if ( ! is_numeric( $amount ) || ! is_finite( (float) $amount ) || $amount < 0 ) { return ''; }
		return strtoupper( (string) ( $product['price']['currency'] ?? 'PLN' ) ) . ' ' . number_format( (float) $amount, 2, '.', ',' );
	}

	private static function catalog( $products ) {
		?><main class="ktk-catalog ktk-public-catalog">
			<header class="ktk-public-catalog__heading"><h1>Krakow experiences</h1><p>Pub crawls, private chaos and group experiences, built by the people who know Krakow after dark.</p></header>
			<div class="ktk-product-grid">
			<?php foreach ( $products as $product ) {
				$url = home_url( '/store2/' . $product['slug'] . '/' );
				$content = self::resolve( $product ); ?>
				<article class="ktk-product-card">
					<?php if ( ! empty( $content['gallery'] ) ) { ?><a class="ktk-product-card__media" href="<?php echo esc_url( $url ); ?>" aria-label="<?php echo esc_attr( $product['name'] ); ?>"><img src="<?php echo esc_url( ! empty( $product['imageUrl'] ) ? $product['imageUrl'] : $content['gallery'][0] ); ?>" alt="<?php echo esc_attr( $product['name'] . ' experience in Krakow' ); ?>" loading="lazy" decoding="async" width="640" height="420"></a><?php } ?>
					<div class="ktk-product-card__body"><p><?php echo esc_html( $product['productType']['name'] ?? 'Experience' ); ?></p>
						<h2><a href="<?php echo esc_url( $url ); ?>"><?php echo esc_html( $product['name'] ); ?></a></h2>
						<div class="ktk-product-card__footer"><strong><?php echo esc_html( $content['pastCampaign'] ? 'Past event - next dates TBA' : ( self::price( $product ) ? 'From ' . self::price( $product ) : '' ) ); ?></strong><a href="<?php echo esc_url( $url ); ?>">View <span aria-hidden="true">&#8599;</span></a></div>
					</div>
				</article>
			<?php } ?>
			</div>
		</main><?php
	}

	private static function product( $data ) {
		$product = $data['product']; $content = self::resolve( $product );
		?><main class="ktk-detail">
			<nav class="ktk-detail__nav" aria-label="Product navigation"><a class="ktk-back" href="<?php echo esc_url( home_url( '/store2/' ) ); ?>"><span aria-hidden="true">&#8592;</span> All experiences</a><span>Local crew. Secure booking.</span></nav>
			<header class="ktk-detail__hero"><div class="ktk-detail__intro"><h1><?php echo esc_html( $product['name'] ); ?></h1><p><?php echo esc_html( $content['summary'] ); ?></p></div>
			<?php if ( ! $content['pastCampaign'] && self::price( $product ) ) { ?><div class="ktk-detail__starting-price"><span>From</span><strong><?php echo esc_html( self::price( $product ) ); ?></strong><small>per person</small></div><?php } ?></header>
			<div class="ktk-detail__layout"><div class="ktk-detail__main">
				<?php if ( ! empty( $content['gallery'] ) ) { ?><section class="ktk-gallery" aria-label="<?php echo esc_attr( $product['name'] . ' gallery' ); ?>"><div class="ktk-gallery__stage"><img src="<?php echo esc_url( $content['gallery'][0] ); ?>" alt="<?php echo esc_attr( $product['name'] . ' experience' ); ?>" decoding="async" fetchpriority="high" data-no-lazy="1" width="1200" height="750"></div></section><?php } ?>
				<?php if ( $content['description'] ) { ?><section class="ktk-product-story"><div><p class="ktk-eyebrow">The experience</p><h2>Organised chaos,<br>handled locally.</h2></div><p><?php echo esc_html( $content['description'] ); ?></p></section><?php } ?>
				<?php if ( ! empty( $content['highlights'] ) ) { ?><section class="ktk-inclusions"><h2 class="ktk-eyebrow ktk-inclusions__heading"><?php echo esc_html( $content['pastCampaign'] ? substr( $content['pastCampaign']['lastDates'][0], 0, 4 ) . ' inclusions' : 'Inclusions' ); ?></h2><div class="ktk-highlights">
					<?php foreach ( $content['highlights'] as $index => $highlight ) { ?><article><span><?php echo esc_html( str_pad( (string) ( $index + 1 ), 2, '0', STR_PAD_LEFT ) ); ?></span><p class="ktk-highlights__text"><?php echo esc_html( $highlight ); ?></p></article><?php } ?>
				</div></section><?php } ?>
				<?php if ( $content['meetingPoint'] || $content['importantInformation'] ) { ?><section class="ktk-practical-info" aria-label="Important product information">
					<?php if ( $content['meetingPoint'] ) { $meeting = $content['meetingPoint']; ?><div class="ktk-practical-info__section ktk-practical-info__section--meeting"><p class="ktk-eyebrow"><?php echo esc_html( $content['pastCampaign'] ? substr( $content['pastCampaign']['lastDates'][0], 0, 4 ) . ' meeting point' : 'Meeting point' ); ?></p>
						<?php if ( $meeting['name'] ) { ?><h2><?php echo esc_html( $meeting['name'] ); ?></h2><?php } ?>
						<?php if ( $meeting['address'] ) { ?><p><?php echo esc_html( $meeting['address'] ); ?></p><?php } ?>
						<?php if ( $meeting['instructions'] ) { ?><strong><?php echo esc_html( $meeting['instructions'] ); ?></strong><?php } ?>
						<?php if ( $meeting['mapUrl'] ) { ?><a href="<?php echo esc_url( $meeting['mapUrl'] ); ?>" target="_blank" rel="noreferrer">Open in Google Maps <span aria-hidden="true">&#8599;</span></a><?php } ?>
					</div><?php } ?>
					<?php if ( $content['importantInformation'] ) { ?><div class="ktk-practical-info__section ktk-practical-info__section--important"><h2 class="ktk-eyebrow">Important information</h2><ul><?php foreach ( $content['importantInformation'] as $item ) { ?><li><?php echo esc_html( $item ); ?></li><?php } ?></ul></div><?php } ?>
				</section><?php } ?>
				<?php if ( ! empty( $data['cancellationPolicy']['title'] ) ) { $policy = $data['cancellationPolicy']; ?><section class="ktk-cancellation-policy"><details><summary class="ktk-cancellation-policy__toggle"><span class="ktk-cancellation-policy__heading"><span class="ktk-eyebrow">Booking terms</span><span class="ktk-cancellation-policy__title" role="heading" aria-level="2"><?php echo esc_html( $policy['title'] ); ?></span></span><span class="ktk-cancellation-policy__icon" aria-hidden="true"></span></summary><div class="ktk-cancellation-policy__content"><?php if ( ! empty( $policy['summary'] ) ) { ?><p><?php echo esc_html( $policy['summary'] ); ?></p><?php } ?><?php foreach ( ( $policy['items'] ?? array() ) as $item ) { ?><article><strong><?php echo esc_html( $item['title'] ?? '' ); ?></strong><p><?php echo esc_html( $item['description'] ?? '' ); ?></p></article><?php } ?></div></details></section><?php } ?>
			</div><?php if ( $content['pastCampaign'] ) { ?><aside class="ktk-public-booking ktk-past-campaign" aria-label="Past event"><h2><?php echo esc_html( $content['pastCampaign']['label'] ); ?></h2><p><?php echo esc_html( $content['pastCampaign']['nextDates'] ); ?></p><a class="ktk-commerce__primary" href="<?php echo esc_url( home_url( '/store2/pub-crawl-28/' ) ); ?>"><span>View regular Pub Crawl</span><span aria-hidden="true">&#8599;</span></a></aside><?php } else { ?><aside class="ktk-public-booking"><h2>Bookings</h2><a class="ktk-commerce__primary" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Contact us</a></aside><?php } ?></div>
		</main><?php
	}
}
