<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

// BEGIN reviewed hero offer facts
function ktk_homepage_hero_offer_facts() {
    return array(
        'brand' => 'Krawl Through Krakow',
        'regularProductId' => 28,
        'regularSlug' => 'pub-crawl-28',
        'regularTime' => '9 PM',
        'regularMeetingShort' => 'Adam Statue',
        'nyeProductId' => 32,
        'nyeSlug' => 'nye-pub-crawl-32',
        'nyeDate' => '2026-12-31',
        'nyeDateLabel' => '31 December 2026',
        'nyeYear' => '2026',
        'welcomeYear' => '2027',
        'nyeEarly' => '5:00 PM',
        'nyeLate' => '7:30 PM',
        'midnight' => '2027-01-01T00:00:00+01:00',
        'midnightTimestamp' => '1798758000',
    );
}
// END reviewed hero offer facts

function ktk_homepage_hero_campaign() {
    $campaign = defined( 'KTK_HOMEPAGE_HERO_CAMPAIGN' ) ? KTK_HOMEPAGE_HERO_CAMPAIGN : 'nye';
    // Preview variants on staging without changing the published campaign or its canonical URL.
    if ( ktk_homepage_is_staging() && isset( $_GET['ktk_hero'] ) && is_string( $_GET['ktk_hero'] ) ) {
        $campaign = $_GET['ktk_hero'];
    }
    return in_array( $campaign, array( 'halloween', 'nye' ), true ) ? $campaign : 'nye';
}

function ktk_homepage_hero_rays( $seasonal = false ) {
    // Original Illustrator fan geometry; keep its two opacity levels and panel offset.
    return '<svg class="ktk-hero-rays" viewBox="0 0 ' . ( $seasonal ? '800.31897' : '799.68103' ) . ' 750" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
        . '<g transform="translate(' . ( $seasonal ? '2.20238' : '0' ) . ' 0)">'
        . '<g fill="currentColor" opacity="0.149994"><path d="M426.963 746.226 105.046 0H255.318Z"/>'
        . '<path d="M421.821 746.197 332.813 0H508.527Z"/><path d="M426.208 743.825-2.744 259.775V49.503Z"/>'
        . '<path d="M422.542 740.746-3.094 617.6V437.02Z"/><path d="M409.693 746.226 731.61 0H581.338Z"/>'
        . '<path d="M413.775 740.746 800 617.6V437.02Z"/></g>'
        . '<path d="M410.448 743.825 799.681 259.775V49.503Z" fill="#eaead0" opacity="0.100006"/></g>'
        . '</svg>';
}

function ktk_homepage_hero_art( $theme ) {
    $offers = ktk_homepage_hero_offer_facts();
    $regular = 'regular' === $theme;
    $statue = $regular ? 'hero-statue-regular.svg' : 'hero-statue-seasonal.svg';
    $width = $regular ? 490 : 296;
    $height = $regular ? 613 : 617;
    ob_start(); ?>
    <div class="ktk-hero-art ktk-hero-art--<?php echo esc_attr( $theme ); ?>" aria-hidden="true">
        <?php if ( 'halloween' === $theme ) : ?>
        <svg class="ktk-hero-halloween-art" viewBox="0 0 320 680" aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" stroke-width="1.3" opacity=".5">
                <path d="M320 0 183 0M320 0 208 39M320 0 220 85M320 0 256 121M320 0 300 149M320 0V163"/>
                <path d="M210 0Q218 11 229 31Q232 50 240 68Q250 77 269 96Q281 97 304 113Q311 117 320 118M250 0Q252 9 261 20Q263 33 269 43Q277 49 286 63Q297 67 310 74Q313 79 320 80M287 0Q288 6 295 9Q296 16 299 18Q306 22 307 26Q313 30 316 30Q318 34 320 34"/>
            </g>
            <g fill="currentColor">
                <path d="m69 91 13-19 7 12 8-9 5 17c22-11 31-5 47-26-1 26-7 30-15 35-5-7-11-6-16-1-8-3-14 2-17 12-7 1-10-1-12-8-8-8-14-7-19-2-6-7-13-7-20-2-8-6-14-15-16-34 17 21 23 17 35 25Z"/>
                <path d="m202 177 8-12 4 8 5-6 3 11c14-7 21-4 31-17-1 17-4 21-10 24-3-5-7-4-10-1-5-2-9 1-11 8-5 0-7-1-8-5-5-6-9-5-13-2-4-4-8-5-12-1-6-4-10-10-11-23 11 14 15 11 24 16Z"/>
                <path d="m37 245 6-9 4 5 3-4 3 8c10-5 14-3 22-12-1 11-3 15-8 17-2-4-4-3-7-1-3-1-6 1-8 5-3 1-5 0-6-3-3-4-7-4-9-1-3-4-6-4-9-1-4-3-7-7-8-17 8 10 11 8 17 13Z"/>
            </g>
        </svg>
        <?php endif; ?>
        <?php if ( 'nye' === $theme ) : ?>
        <svg class="ktk-hero-confetti" viewBox="0 0 320 680" aria-hidden="true" focusable="false">
            <g fill="currentColor"><path d="m34 71 8-3 7 18-8 3ZM104 31l7 6-12 13-7-6ZM271 82l9 1-2 18-9-1ZM222 175l5-8 16 10-5 8ZM42 286l6-7 15 14-6 7ZM285 329l-7-5 10-16 8 5ZM147 121l7-4 5 10-7 4Z"/>
            <path d="m180 28 3 10 10 3-10 3-3 10-3-10-10-3 10-3ZM48 188l4 12 12 4-12 4-4 12-4-12-12-4 12-4Z"/></g>
        </svg>
        <?php endif; ?>
        <div class="ktk-hero-statue-scene" style="--statue-aspect: <?php echo $width; ?> / <?php echo $height; ?>">
        <?php if ( 'nye' === $theme ) : ?>
        <svg class="ktk-hero-flag" viewBox="0 0 296 617" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
            <path d="M292.44 68.27C290.65 66.42 288.87 64.57 287.08 62.71C283.73 59.33 279.04 57.67 275.89 54.03C270.42 50.83 267.41 45.13 262.74 41.1C260.02 38.76 258.21 35.41 254.77 33.85C253.62 35.12 252.54 35.39 251.6 33.63C246.87 39.96 241.46 45.71 236.26 51.65C228.45 60.57 220.92 69.75 213.24 78.79C210.71 81.76 208.06 84.64 205.47 87.56C204.97 88.75 203.94 89.26 202.82 89.65C202.76 89.9 202.6 90.07 202.35 90.15C202.24 90.6 202.13 91.05 202.02 91.51C201.18 92.15 200.34 92.79 199.51 93.43C199.51 93.47 199.51 93.52 199.52 93.56C199.57 94.55 199.62 95.54 198.21 95.67L198.27 96.07C186.51 110.64 173.83 124.41 161.66 138.63C143.61 159.73 125.6 180.87 107.65 202.05C106.34 203.6 105.64 204.4 104.62 202.04C101.91 199.81 102 198.08 104.53 195.25C114.81 183.74 124.72 171.91 134.76 160.19C137.69 156.13 141.04 152.45 144.64 148.98C144.64 148.98 144.64 148.98 144.64 148.98C150.1 141.24 156.83 134.56 162.79 127.22C166.59 122.53 170.77 118.13 174.78 113.61C181.7 104.96 188.88 96.54 196.43 88.43C200.67 82.82 205.16 77.42 210.12 72.43C211.18 70.29 213.03 68.81 214.59 67.1L215.82 65.84C225.27 54.6 234.74 43.36 244.17 32.11C247.86 27.71 251.45 23.24 255.61 19.27C265.67 7.31 275.71 -4.68 285.79 -16.62C303.63 -37.73 321.49 -58.82 339.34 -79.91L340.56 -81.04C340.56 -81.05 340.56 -81.05 340.56 -81.05C341.15 -81.43 341.51 -82.19 341.87 -82.95C342.6 -84.49 343.32 -86.03 346 -84.36C349.47 -82.26 348.92 -80.36 345.71 -78.59C345.61 -78.32 345.43 -78.11 345.19 -77.94C345.17 -76.92 345.14 -75.89 345.12 -74.86C347.3 -71.14 349.49 -67.41 351.67 -63.68L352.69 -62.27C360.85 -50.05 370.29 -38.82 379.55 -27.45C379.93 -26.99 380.16 -26.51 379.87 -25.92C380.21 -25.51 380.55 -25.1 380.88 -24.69C383.95 -22.49 387.38 -20.6 387.91 -16.29C387.91 -16.29 387.92 -16.29 387.92 -16.29C388.31 -15.89 388.71 -15.5 389.1 -15.11C392.28 -14.7 393.69 -11.97 395.53 -9.97C403.21 -1.61 411.78 5.8 420.3 13.26C425.02 16.32 428.61 20.55 432.01 24.9C436.67 30.84 441.48 36.62 446.69 42.09C452.58 48.28 457.11 55.41 461.17 62.89C462.11 64.61 463.65 65.99 464.83 67.59C465.18 68.07 465.59 68.53 466 68.98C467.16 70.27 468.32 71.56 468.25 73.57C468.44 74.06 468.83 74.45 469.21 74.83C469.87 75.51 470.53 76.18 470.21 77.36C471.45 78.2 472.08 79.48 472.64 80.8L475.04 83.92C476.77 84.78 478.59 85.52 479.68 87.27C480.03 87.72 480.38 88.18 480.73 88.64C481.98 89.83 483.23 91.02 484.48 92.22C484.61 92.35 484.75 92.48 484.9 92.6C485.49 93.11 486.08 93.61 485.65 94.62C492.17 96.4 494.46 100.41 491.81 106.42C489.93 110.68 489.23 115.18 487.97 119.56C483.98 125.67 479.99 131.79 475.98 137.89C473.34 141.89 470.67 145.88 467.25 149.29C463.73 153.21 459.96 156.57 454.85 158.59C450.82 160.18 447.53 163.57 443.52 165.24C442.1 165.83 440.7 166.48 439.29 167.12C433.5 169.78 427.67 172.46 420.8 171.36C418.88 171.06 417.42 172.63 416.74 174.55C416.17 176.17 415.55 177.74 413.94 178.64C411.43 181.91 408.6 184.81 404.69 186.41C402.76 187.84 399.91 187.01 398.23 189.04C398.44 189.2 398.54 189.41 398.52 189.68C399.83 192.23 399.96 194.91 399.42 197.67C399.29 198.87 399.17 200.07 399.05 201.26C398.99 203.11 398.15 206.08 397.17 205.83C394.95 205.26 392.75 203.56 392.69 200.59C392.66 200.3 392.63 200 392.59 199.71C392.41 199.47 392.21 199.23 392.01 198.99C391.01 197.77 390 196.55 390.61 194.68C389.36 193.41 390.23 192.64 391.26 191.9C384.27 173.86 374.81 157.27 362.39 142.4C360.84 140.54 359.42 138.59 357.94 136.68C353.98 132.14 350.02 127.61 346.06 123.08C341.17 118.59 336.28 114.1 331.38 109.61C330.25 109.14 329.35 108.38 328.73 107.31C324.89 103.76 319.36 102.22 316.69 97.26C313.57 96.18 312.75 93.03 310.88 90.82C310.35 90.14 309.83 89.46 309.3 88.79C306.11 84.76 302.93 80.74 299.74 76.72C297.8 75.4 296.41 73.57 295.12 71.65C297.1 69.51 296.02 68.44 294.8 67.22C294.75 67.18 294.71 67.13 294.66 67.09C294.71 67.13 294.75 67.18 294.8 67.22C296.02 68.44 297.1 69.51 295.11 71.65C294.22 70.53 293.33 69.4 292.44 68.27ZM254.72 28.05C255.26 27.64 255.98 27.57 256.7 27.51C257.88 27.4 259.06 27.29 259.46 25.64C265.1 21.65 269.23 16.15 274 11.29C293.97 -9.05 313.08 -30.14 329.75 -53.31C333.22 -58.14 337.11 -62.83 338.64 -68.94C337.53 -69.05 337.12 -68.49 336.73 -67.96C336.54 -67.69 336.35 -67.44 336.09 -67.28L335.26 -68.25C335.54 -67.93 335.81 -67.6 336.08 -67.28C327.89 -57.28 319.7 -47.27 311.47 -37.3C310.77 -36.45 309.76 -35.85 308.9 -35.13C308.77 -34.92 308.6 -34.75 308.39 -34.63C308.54 -33.8 308.26 -33.51 307.46 -33.9C307.31 -33.75 307.17 -33.6 307.02 -33.46C307.3 -32.59 306.79 -32.03 306.27 -31.47L306.22 -31.41L306.01 -31.3L305.86 -31.48C302.33 -25.75 297.45 -21.1 293.32 -15.84C293.06 -15.5 292.77 -15.35 292.48 -15.35C292.62 -14.65 292.07 -14.13 291.6 -13.68C291.44 -13.54 291.29 -13.4 291.18 -13.26C286.73 -7.79 282.16 -2.42 277.59 2.95C277.26 3.34 276.63 3.49 276.15 3.76C276.15 3.76 276.15 3.76 276.15 3.75C274.97 4.93 273.78 6.1 272.6 7.27C269.88 13.06 265.1 17.26 261.18 22.13C260.98 22.37 260.75 22.6 260.51 22.82C259.74 23.55 258.96 24.29 259.46 25.63C259.06 27.28 257.88 27.39 256.7 27.5C255.98 27.57 255.26 27.63 254.72 28.05ZM202.02 91.51C202.13 91.06 202.24 90.6 202.36 90.15C202.37 90.19 202.37 90.22 202.38 90.26C202.47 90.73 202.56 91.2 202.02 91.51Z" fill="#1f2022"/>
            <text x="365" y="65" fill="#fff" font-size="65" font-weight="900" text-anchor="middle" dominant-baseline="central" transform="rotate(47 365 65)"><?php echo esc_html( $offers['welcomeYear'] ); ?></text>
        </svg>
        <?php endif; ?>
        <img class="ktk-hero-statue" src="<?php echo esc_url( ktk_homepage_asset( $statue ) ); ?>" alt="" width="<?php echo $width; ?>" height="<?php echo $height; ?>" decoding="async" fetchpriority="high">
        </div>
        <?php if ( 'halloween' === $theme ) : ?>
        <svg class="ktk-hero-pumpkin" viewBox="0 0 140 130" aria-hidden="true" focusable="false">
            <path d="M63 33q-7-21 8-30l11 6q-13 8-10 26" fill="#658656"/>
            <path d="M71 30C21 5-10 67 14 104c11 20 33 16 55 14 27 6 46 3 57-19 19-41-10-85-55-69Z" fill="#ff7b30"/>
            <path d="M59 31C35 39 23 91 45 116M82 31c26 21 30 57 14 84" fill="none" stroke="#da4b22" stroke-width="7"/>
            <path d="m34 60 23 5-21 14Zm72 0-24 5 22 14ZM72 72l-9 15h16ZM30 92l19 7 7-5 8 9 16-1 6-9 8 3 17-7-13 21-51 2Z" fill="#131014"/>
        </svg>
        <?php endif; ?>
    </div>
    <?php return ob_get_clean();
}

function ktk_homepage_hero_cta( $campaign, $product_id, $slug, $label ) {
    return '<a class="ktk-hero-cta" data-book="hero-' . esc_attr( $campaign ) . '" data-product-id="' . esc_attr( $product_id )
        . '" href="' . esc_url( ktk_homepage_product_url( $slug ) ) . '"><span>' . esc_html( $label ) . '</span>'
        . ktk_homepage_icon( 'arrow-up-right', 'ktk-hero-cta-icon' ) . '</a>';
}

function ktk_homepage_seasonal_hero() {
    $campaign = ktk_homepage_hero_campaign();
    $nye = 'nye' === $campaign;
    $offers = ktk_homepage_hero_offer_facts();
    $meeting_words = explode( ' ', $offers['regularMeetingShort'], 2 );
    ob_start(); ?>
    <section id="ktk-seasonal-hero" class="et_pb_section et_pb_section_0 ktk-seasonal-hero" aria-label="Krakow pub crawls">
        <div class="ktk-hero-panels">
        <article class="ktk-hero-panel ktk-hero-panel--regular<?php echo $nye ? '' : ' ktk-hero-panel--pink'; ?>" aria-labelledby="ktk-hero-title">
            <?php echo ktk_homepage_hero_rays(); ?>
            <p class="ktk-hero-banner ktk-hero-banner--first">The original &amp; best</p>
            <div class="ktk-hero-copy">
                <p class="ktk-hero-brand"><?php echo esc_html( $offers['brand'] ); ?></p>
                <h1 id="ktk-hero-title" class="ktk-hero-heading"><span class="ktk-hero-city">Krakow</span> <span class="ktk-hero-pub">Pub</span> <span class="ktk-hero-crawl">Crawl</span></h1>
                <p class="ktk-hero-schedule"><span>Every<br> night</span><strong><?php echo esc_html( $offers['regularTime'] ); ?></strong><span><?php echo esc_html( $meeting_words[0] ); ?><br> <?php echo esc_html( $meeting_words[1] ); ?></span></p>
                <?php echo ktk_homepage_hero_cta( 'regular', $offers['regularProductId'], $offers['regularSlug'], 'Book now' ); ?>
                <p class="ktk-hero-bottomline">The night starts here.</p>
            </div>
            <?php echo ktk_homepage_hero_art( 'regular' ); ?>
        </article>
        <article class="ktk-hero-panel ktk-hero-panel--seasonal ktk-hero-panel--<?php echo esc_attr( $campaign ); ?>" data-campaign="<?php echo esc_attr( $campaign ); ?>"<?php if ( $nye ) : ?> data-event-date="<?php echo esc_attr( $offers['nyeDate'] ); ?>" data-event-timezone="Europe/Warsaw"<?php endif; ?> aria-labelledby="ktk-hero-season-title">
            <?php echo ktk_homepage_hero_rays( true ); ?>
            <p class="ktk-hero-banner ktk-hero-banner--last">Pubcrawl in Krakow</p>
            <div class="ktk-hero-copy">
                <h2 id="ktk-hero-season-title" class="ktk-hero-heading"><span class="ktk-hero-occasion"><?php echo $nye ? 'NYE' : 'Halloweekend'; ?></span> <span class="ktk-hero-brand"><?php echo esc_html( $offers['brand'] ); ?></span> <span class="ktk-hero-city">Krakow</span> <span class="ktk-hero-season-name"><span class="ktk-hero-season-pub">Pub</span> <span class="ktk-hero-season-crawl">Crawl</span></span></h2>
                <?php if ( $nye ) : ?>
                <p class="ktk-hero-date">New Year's Eve<br><strong><?php echo esc_html( $offers['nyeDateLabel'] ); ?></strong></p>
                <dl class="ktk-hero-times"><div><dt>First group</dt><dd><?php echo esc_html( $offers['nyeEarly'] ); ?></dd></div><div><dt>Second group</dt><dd><?php echo esc_html( $offers['nyeLate'] ); ?></dd></div></dl>
                <?php echo ktk_homepage_hero_cta( 'nye', $offers['nyeProductId'], $offers['nyeSlug'], 'Book NYE' ); ?>
                <?php else : ?>
                <p class="ktk-hero-season-line">Thursday 29<br>Friday 30<br>&amp; Saturday 31</p>
                <p class="ktk-hero-halloween-detail"><strong>9 PM</strong></p>
                <?php echo ktk_homepage_hero_cta( 'halloween', 51, 'halloween-pub-crawl-51', 'Book Halloween' ); ?>
                <?php endif; ?>
                <p class="ktk-hero-bottomline"><?php echo $nye ? 'One last night. A whole new year.' : 'Best costumes win prizes.'; ?></p>
            </div>
            <?php echo ktk_homepage_hero_art( $campaign ); ?>
        </article>
        </div>
        <nav class="ktk-hero-reviews" aria-label="Guest reviews on independent platforms">
            <div class="ktk-hero-reviews-inner">
            <?php foreach ( ktk_homepage_review_sources() as $review ) :
                $rating = isset( $review['rating'] ) ? (string) (float) $review['rating'] : '';
            ?>
                <a href="<?php echo esc_url( $review['url'] ); ?>" target="_blank" rel="noopener noreferrer" aria-describedby="ktk-review-new-tab-note">
                    <?php if ( ! empty( $review['logo'] ) ) : ?><span class="ktk-hero-review-logo" aria-hidden="true"><img src="<?php echo esc_url( ktk_homepage_asset( $review['logo'] ) ); ?>" alt="" width="40" height="40" decoding="async"></span><?php endif; ?>
                    <span class="ktk-hero-review-copy"><span class="ktk-hero-review-name"><?php echo esc_html( $review['name'] ); ?></span><span class="ktk-hero-review-details"><?php if ( '' !== $rating ) : ?><strong class="ktk-hero-review-rating"><?php echo esc_html( $rating ); ?>/5</strong><?php endif; ?><span class="ktk-hero-review-count"><?php echo empty( $review['count'] ) ? 'Read reviews' : esc_html( $review['count'] ) . ' reviews'; ?></span></span></span>
                    <?php echo ktk_homepage_icon( 'arrow-up-right', 'ktk-hero-review-icon' ); ?>
                </a>
            <?php endforeach; ?>
            </div>
            <span id="ktk-review-new-tab-note" class="ktk-hero-review-note">Opens in a new tab</span>
        </nav>
    </section>
    <?php return ob_get_clean();
}
