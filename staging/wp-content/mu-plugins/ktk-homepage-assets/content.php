<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

function ktk_homepage_static_body() {
    $offer = ktk_homepage_offer();
    ob_start(); ?>
    <header class="site-header">
        <div class="container header-inner">
            <a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="Krawl Through Krakow home"><img src="<?php echo esc_url( ktk_homepage_asset( 'logo.webp' ) ); ?>" width="317" height="248" alt="Krawl Through Krakow"></a>
            <nav class="main-nav" id="main-nav" aria-label="Main navigation">
                <a href="#the-night">The night</a><a href="#included">What's included</a><a href="#meeting">Meet us</a><a href="#questions">FAQs</a><a href="#more">More experiences</a>
            </nav>
            <?php echo ktk_homepage_book_button( 'header', 'button-small' ); ?>
            <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open menu"><?php echo ktk_homepage_icon( 'menu', 'menu-open-icon' ) . ktk_homepage_icon( 'x', 'menu-close-icon' ); ?></button>
        </div>
    </header>
    <main id="main" tabindex="-1">
        <section class="hero hero-centered" aria-labelledby="hero-title">
            <picture class="hero-photo">
                <source media="(max-width: 767px)" srcset="<?php echo esc_url( ktk_homepage_asset( 'hero-mobile-640.webp' ) ); ?> 640w, <?php echo esc_url( ktk_homepage_asset( 'hero-mobile-848.webp' ) ); ?> 848w" sizes="100vw">
                <img src="<?php echo esc_url( ktk_homepage_asset( 'hero-1600.webp' ) ); ?>" srcset="<?php echo esc_url( ktk_homepage_asset( 'hero-960.webp' ) ); ?> 960w, <?php echo esc_url( ktk_homepage_asset( 'hero-1600.webp' ) ); ?> 1600w" sizes="100vw" width="1600" height="1066" fetchpriority="high" alt="Krawl Through Krakow guests together in the Main Square at night">
            </picture>
            <div class="container hero-content">
                <div class="hero-masthead">
                    <p class="hero-schedule hero-schedule-left">EVERY <br>NIGHT</p>
                    <div class="hero-title-block"><p class="hero-brand">KRAWL THROUGH KRAKOW</p><h1 id="hero-title">KRAKOW <br><span>PUB CRAWL</span></h1></div>
                    <a class="hero-schedule hero-schedule-right" href="#meeting" aria-label="Meet at 9 PM at the Adam Mickiewicz Statue"><strong><?php echo esc_html( $offer['time'] ); ?></strong><span>ADAM <br>STATUE</span></a>
                </div>
                <p class="hero-intro">Good people. Great nights.</p>
                <div class="hero-action">
                    <?php echo ktk_homepage_book_button( 'hero' ); ?>
                </div>
                <nav class="hero-reviews" aria-label="Guest reviews on independent platforms">
                    <?php foreach ( ktk_homepage_review_sources() as $review ) : ?>
                    <a href="<?php echo esc_url( $review['url'] ); ?>" target="_blank" rel="noopener noreferrer"><span class="hero-review-name"><?php echo esc_html( $review['name'] ); ?></span><span class="hero-review-count"><?php if ( ! empty( $review['count'] ) ) : ?><strong><?php echo esc_html( $review['count'] ); ?></strong> reviews<?php else : ?>Read reviews<?php endif; ?></span></a>
                    <?php endforeach; ?>
                </nav>
            </div>
        </section>

        <section class="proof-band" aria-label="Guest reviews">
            <div class="container proof-inner">
                <p>Strangers at <?php echo esc_html( $offer['time'] ); ?>.<br><strong>Stories by the end of the night.</strong></p>
                <blockquote><p>&ldquo;you meet some great people<br class="desktop-break"> from all walks of life.&rdquo;</p><cite>James B &middot; Tripadvisor &middot; March 2023</cite></blockquote>
                <a class="text-link" href="<?php echo esc_url( $offer['reviews'] ); ?>" target="_blank" rel="noopener noreferrer">Read the guest reviews <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a>
            </div>
        </section>

        <section id="included" class="section included">
            <div class="container included-grid">
                <div class="included-copy">
                    <p class="eyebrow">The ticket, unpacked</p>
                    <h2>ONE TICKET.<br>A WHOLE NIGHT.</h2>
                    <p class="section-intro">Less planning. More being there. Join the group and let our local team take it from here.</p>
                    <ol class="inclusions">
                        <?php foreach ( $offer['inclusions'] as $index => $inclusion ) : ?>
                            <li><span class="item-number" aria-hidden="true"><?php echo esc_html( sprintf( '%02d', $index + 1 ) ); ?></span><div><h3><?php echo esc_html( $inclusion[0] ); ?></h3><p><?php echo esc_html( $inclusion[1] ); ?></p></div></li>
                        <?php endforeach; ?>
                    </ol>
                    <?php echo ktk_homepage_book_button( 'inclusions' ); ?>
                </div>
                <figure class="included-photo">
                    <?php echo ktk_homepage_photo( 'friends', 'Guests smiling together with cocktails on a KTK night out' ); ?>
                    <figcaption><span class="eyebrow">Your kind of company</span><strong>Come as you are.<br>Leave with a story.</strong></figcaption>
                </figure>
            </div>
        </section>

        <section id="the-night" class="section night-section">
            <div class="container">
                <div class="section-heading"><div><p class="eyebrow">A little plan. A lot of possibility.</p><h2>THIS IS HOW<br>THE NIGHT GOES.</h2></div><p>Solo, a couple, or already a crew.<br>There's room for you at the table.</p></div>
                <div class="night-grid">
                    <article class="night-step"><div class="step-photo"><?php echo ktk_homepage_photo( 'umbrella', 'KTK guests following the pink umbrella through Krakow', '(max-width: 767px) 100vw, 33vw' ); ?><span class="step-index">01</span></div><p class="eyebrow">Find your people</p><h3>MEET UNDER THE PINK.</h3><p>At <?php echo esc_html( $offer['time'] ); ?>, find our pink umbrella at the Adam Mickiewicz Monument. Say hello to your guides and the group.</p></article>
                    <article class="night-step"><div class="step-photo"><?php echo ktk_homepage_photo( 'games', 'A mixed group of guests laughing around a table of card games', '(max-width: 767px) 100vw, 33vw' ); ?><span class="step-index">02</span></div><p class="eyebrow">Break the ice</p><h3>THE FIRST HOUR IS OURS.</h3><p>Start with the open bar, conversations and games. Order what you enjoy; soft drinks are part of the line-up too.</p></article>
                    <article class="night-step"><div class="step-photo"><?php echo ktk_homepage_photo( 'host', 'A KTK guide wearing a pink lanyard welcoming the group', '(max-width: 767px) 100vw, 33vw' ); ?><span class="step-index">03</span></div><p class="eyebrow">Follow the night</p><h3>OUT INTO KRAKOW.</h3><p>Our guides take you between 4-5 bars and clubs with VIP entrance and welcome shots. No route planning required.</p></article>
                </div>
                <div class="night-bottom"><p>Real nights. Real KTK people.</p><a class="text-link" href="https://www.instagram.com/krawlthroughkrakow/" target="_blank" rel="noopener noreferrer">More from the crawl <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></div>
            </div>
        </section>

        <section id="our-story" class="section story-section" aria-labelledby="story-title">
            <div class="container story-grid">
                <div class="story-heading"><p class="eyebrow">The people behind the pink</p><h2 id="story-title">KRAKOW NIGHTS.<br>SINCE 2008.</h2><p class="story-lead">A city is better <br>when you have someone <br>to share it with.</p></div>
                <div class="story-copy"><p>Krawl Through Krakow has been bringing travellers together since 2008. Our home is Krakow's Old Town; our nights are about the people you meet along the way.</p><p>Travelling solo? Bring yourself. Visiting with friends? Bring the group. The first stop is a chance to settle in, start a conversation and get to know the people you'll be heading out with.</p><p>Our local guides host the evening and lead the way between bars and clubs. From that first hello under the pink umbrella to the photos you look back on afterwards, this is our way of sharing Krakow with you.</p><div class="story-links"><a class="text-link" href="https://krawlthroughkrakow.com/about-us/">Get to know KTK <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a><a class="text-link" href="https://krawlthroughkrakow.com/krakow-nightlife/">Explore Krakow nightlife <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></div></div>
            </div>
        </section>

        <section id="gallery" class="section gallery-section" aria-labelledby="gallery-title">
            <div class="container">
                <div class="section-heading"><div><p class="eyebrow">From our camera roll</p><h2 id="gallery-title">NIGHTS FROM<br>THE KRAWL.</h2></div><p>The faces. The first hellos.<br>The nights we still talk about.</p></div>
                <a id="video-preview" class="video-preview" href="https://vimeo.com/892352668/df4cdc75d0" target="_blank" rel="noopener noreferrer" aria-label="Watch the Krawl film on Vimeo (31 seconds, opens in a new tab)">
                    <span class="video-frame"><?php echo ktk_homepage_photo( 'video-poster', 'A scene from the Krawl Through Krakow film', '(max-width: 767px) 100vw, 80vw', '', 540 ); ?><span class="video-play"><?php echo ktk_homepage_icon( 'play' ); ?></span></span><span class="video-caption"><strong>WATCH THE KRAWL.</strong><span>31 seconds &middot; Watch on Vimeo <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></span></span>
                </a>
                <div class="gallery-grid">
                    <?php
                    $photos = array(
                        array( 'gallery-dance', 'KTK guests dancing together in a Krakow club', 'One more song.', 640 ),
                        array( 'gallery-guests', 'Friends smiling together outdoors on a KTK night', 'Good company, all round.', 539 ),
                        array( 'gallery-sing', 'A smiling guest holding a microphone in a brick-walled bar', 'Your moment in the spotlight.', 640 ),
                        array( 'games', 'KTK guests laughing together around a table of card games', 'It starts with a hello.', 640 ),
                    );
                    foreach ( $photos as $index => $photo ) : ?>
                    <figure><a data-gallery-item data-caption="<?php echo esc_attr( $photo[2] ); ?>" href="<?php echo esc_url( ktk_homepage_asset( $photo[0] . '-960.webp' ) ); ?>" aria-label="View photo <?php echo esc_attr( $index + 1 ); ?>: <?php echo esc_attr( $photo[2] ); ?>"><?php echo ktk_homepage_photo( $photo[0], $photo[1], '(max-width: 767px) 100vw, 45vw', '', $photo[3] ); ?><span class="gallery-expand"><?php echo ktk_homepage_icon( 'expand' ); ?></span></a><figcaption><?php echo esc_html( $photo[2] ); ?></figcaption></figure>
                    <?php endforeach; ?>
                </div>
                <div class="night-bottom"><p>A few moments from past KTK nights.</p><a class="text-link" href="https://krawlthroughkrakow.com/gallery/">See more photos <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></div>
            </div>
        </section>

        <section id="meeting" class="section meeting-section">
            <div class="container meeting-grid">
                <figure class="meeting-photo"><?php echo ktk_homepage_photo( 'meeting', 'A Krawl Through Krakow group at the Adam Mickiewicz Monument in the Main Square' ); ?><figcaption><?php echo ktk_homepage_icon( 'map-pin' ); ?> Adam Mickiewicz Monument</figcaption></figure>
                <div class="meeting-copy"><p class="eyebrow">Same square. New faces.</p><h2>LOOK FOR<br>THE PINK UMBRELLA.</h2><p class="section-intro">Right in the heart of Krakow. Our guides will be there to welcome you.</p><dl class="meeting-details"><div><dt>When</dt><dd><?php echo esc_html( $offer['time'] ); ?> <span>(<?php echo esc_html( $offer['time24'] ); ?>, Krakow time)</span></dd></div><div><dt>Where</dt><dd>Adam Mickiewicz Monument<span>Rynek Glowny, Main Square, Krakow</span></dd></div></dl><a class="button button-dark" href="<?php echo esc_url( $offer['directions'] ); ?>" target="_blank" rel="noopener noreferrer">Get directions <?php echo ktk_homepage_icon( 'map-pin' ); ?></a><p class="meeting-help">Running late or can't find us?<br><a href="tel:<?php echo esc_attr( $offer['phone_uri'] ); ?>">Call <?php echo esc_html( $offer['phone'] ); ?></a></p></div>
            </div>
        </section>

        <section id="questions" class="section faq-section">
            <div class="container faq-grid"><div class="faq-heading"><p class="eyebrow">Good to know</p><h2>LESS GUESSING.<br>MORE GOING.</h2><p>Still have a question?<br><a class="text-link" href="https://krawlthroughkrakow.com/contact/">Ask the local team <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></p></div>
                <div class="faq-list">
                    <?php
                    $faqs = array(
                        array( 'Can I join on my own?', 'Absolutely. Solo travellers are welcome, as are couples and groups of friends. The first stop gives everyone time to meet, chat and join in with the games.' ),
                        array( 'What does my ' . $offer['price'] . ' PLN ticket include?', 'One hour of open bar with beer, vodka, gin, rum, whiskey and soft drinks; VIP entrance to 4-5 bars and clubs; a welcome shot at each venue; local guides and a photographer. Optional upgrades and instant-photo packages are priced separately when you book.' ),
                        array( 'When and where do we meet?', 'We start at ' . $offer['time'] . ' (' . $offer['time24'] . ', Krakow time) at the Adam Mickiewicz Monument in the Main Square. Look for the pink umbrella. Choose your date in the booking form; special dates may have a separate event.' ),
                        array( 'What if I am running late?', 'Call the team on ' . $offer['phone'] . ' so we can help you find the group. Please contact us rather than waiting at the monument after the group has left.' ),
                        array( 'How do I book?', 'Choose your date and group size on our booking page, add your contact details, and complete checkout. Available dates, optional add-ons and the total are shown before you pay.' ),
                        array( 'Can I cancel my booking?', 'With at least 24 hours\' notice, you can receive a full refund or credit. Cancellations within 24 hours and no-shows are not refundable. Contact our team to arrange a cancellation; the full policy is available in the booking page.' ),
                    );
                    foreach ( $faqs as $faq ) : ?>
                    <details><summary><?php echo esc_html( $faq[0] ); ?><?php echo ktk_homepage_icon( 'plus' ); ?></summary><div class="faq-answer"><p><?php echo esc_html( $faq[1] ); ?></p></div></details>
                    <?php endforeach; ?>
                </div>
            </div>
        </section>

        <section class="final-booking" aria-labelledby="final-title"><div class="container final-inner"><div><p class="eyebrow">Your night starts here</p><h2 id="final-title">SEE YOU UNDER<br>THE PINK UMBRELLA.</h2></div><div class="final-action"><p><strong><?php echo esc_html( $offer['price'] ); ?> PLN</strong> per person <span><?php echo esc_html( $offer['time'] ); ?> start &middot; Krakow Main Square</span></p><?php echo ktk_homepage_book_button( 'final', 'button-dark' ); ?></div></div></section>

        <section id="more" class="section more-section"><div class="container">
            <div class="section-heading"><div><p class="eyebrow">Make more of Krakow</p><h2>ANOTHER KIND OF PLAN?</h2></div><a class="text-link" href="<?php echo esc_url( home_url( '/store2/' ) ); ?>">All experiences <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></div>
            <div class="group-experiences">
                <figure><?php echo ktk_homepage_photo( 'gallery-guests', 'A group of friends together on a KTK night out', '(max-width: 767px) 100vw, 45vw', '', 539 ); ?><figcaption>Your people. Our city.</figcaption></figure>
                <div class="group-copy">
                    <article id="private-groups"><p class="eyebrow">Just your people &middot; Groups of 10+</p><h3>YOUR OWN PUB CRAWL.</h3><p>Bring your group and choose a start time. A one-hour open bar, entry to 4-5 bars and clubs, welcome shots, guides and a photographer: the KTK night, together with your own crew.</p><a class="text-link" href="<?php echo esc_url( ktk_homepage_product_url( 'private-pub-crawl-31' ) ); ?>">Plan a private crawl <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></article>
                    <article id="student-trips"><p class="eyebrow">Societies, teams &amp; student groups</p><h3>THE TRIP OUT OF THE GROUP CHAT.</h3><p>Planning a society trip, sports-team weekend or student group visit? Tell us your group size and what you'd like to do. Our team can help put together an offer for your Krakow trip.</p><a class="text-link" href="https://krawlthroughkrakow.com/student-trips-poland/">Plan your group trip <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></article>
                </div>
            </div>
            <div class="special-experiences">
                <article id="new-year"><figure class="experience-photo"><?php echo ktk_homepage_photo( 'nye', 'Guests celebrating together at a past KTK New Year event', '(max-width: 767px) 100vw, 45vw', '', 720 ); ?><figcaption>A past New Year's Eve with KTK</figcaption></figure><p class="eyebrow">31 December 2026</p><h3>NEW YEAR. BIG NIGHT.</h3><p>Celebrate with two hours of open bar, a buffet with vegetarian and vegan options, and a night across three bars and clubs. Choose the 17:00 or 19:30 start for this separate New Year's Eve event.</p><a class="text-link" href="<?php echo esc_url( ktk_homepage_product_url( 'nye-pub-crawl-32' ) ); ?>">Explore New Year's Eve <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></article>
                <article id="brunch"><figure class="experience-photo brunch-photo"><?php echo ktk_homepage_photo( 'brunch', 'A cocktail being prepared at the bar for the KTK brunch experience', '(max-width: 767px) 100vw, 45vw', '', 1440 ); ?><figcaption>A different kind of get-together</figcaption></figure><p class="eyebrow">Make time for the table</p><h3>LET'S DO BRUNCH.</h3><p>A three-course meal, two hours of unlimited drinks and time to catch up with your people. Our bottomless brunch is another way to get friends together for a celebration or a Krakow group trip.</p><a class="text-link" href="<?php echo esc_url( ktk_homepage_product_url( 'bottomless-brunch-29' ) ); ?>">Explore bottomless brunch <?php echo ktk_homepage_icon( 'arrow-up-right' ); ?></a></article>
            </div>
        </div></section>
    </main>
    <dialog id="gallery-dialog" class="gallery-dialog" role="dialog" aria-modal="true" aria-label="KTK photo gallery">
        <div class="gallery-toolbar"><span class="eyebrow">Nights from the Krawl</span><button type="button" class="gallery-control" data-gallery-close aria-label="Close photo gallery" title="Close photo gallery" autofocus><?php echo ktk_homepage_icon( 'x' ); ?></button></div>
        <figure class="gallery-view"><img alt="" width="960" height="640"><figcaption id="gallery-caption" aria-live="polite"></figcaption></figure>
        <div class="gallery-navigation"><button type="button" class="gallery-control" data-gallery-prev aria-label="Previous photo" title="Previous photo"><?php echo ktk_homepage_icon( 'chevron-left' ); ?></button><span class="gallery-counter" aria-live="polite"></span><button type="button" class="gallery-control" data-gallery-next aria-label="Next photo" title="Next photo"><?php echo ktk_homepage_icon( 'chevron-right' ); ?></button></div>
    </dialog>
    <footer class="site-footer" id="footer"><div class="container"><div class="footer-top"><a class="footer-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>"><img src="<?php echo esc_url( ktk_homepage_asset( 'logo.webp' ) ); ?>" alt="Krawl Through Krakow" width="317" height="248" loading="lazy"></a><p>Krakow nights.<br>Good company.</p><?php echo ktk_homepage_book_button( 'footer' ); ?></div><div class="footer-columns">
        <div><h2>Say hello</h2><a href="tel:<?php echo esc_attr( $offer['phone_uri'] ); ?>"><?php echo esc_html( $offer['phone'] ); ?></a><a href="mailto:<?php echo esc_attr( $offer['email'] ); ?>"><?php echo esc_html( $offer['email'] ); ?></a><a href="https://krawlthroughkrakow.com/contact/">Contact the team</a><a href="https://krawlthroughkrakow.com/pub-crawl-jobs/">Work with us</a></div>
        <div><h2>Explore Krakow</h2><a href="https://krawlthroughkrakow.com/about-us/">About KTK</a><a href="https://krawlthroughkrakow.com/krakow-nightlife/">Krakow nightlife</a><a href="https://krawlthroughkrakow.com/stagshens/">Stag &amp; hen trips</a><a href="https://krawlthroughkrakow.com/other-tours/">Other tours</a><a href="https://krawlthroughkrakow.com/blog/">The local blog</a></div>
        <div><h2>Before you go</h2><a href="https://krawlthroughkrakow.com/about-us/how-to-join/">How to join</a><a href="https://krawlthroughkrakow.com/meeting-point/">Meeting point</a><a href="https://krawlthroughkrakow.com/faqs/">More questions</a><a href="https://krawlthroughkrakow.com/testimonials/">Guest stories</a><a href="https://krawlthroughkrakow.com/pub-crawl-drinking-games/">Pub crawl games</a></div>
        <div><h2>Stay in the loop</h2><a href="https://www.instagram.com/krawlthroughkrakow/">Instagram</a><a href="https://www.facebook.com/krawlthroughkrakow">Facebook</a><a href="https://www.tiktok.com/@krawlthroughkrakow">TikTok</a><a href="https://www.youtube.com/@krawlthroughkrakow">YouTube</a><a href="https://krawlthroughkrakow.com/gallery/">Photo gallery</a><a href="https://vimeo.com/892352668/df4cdc75d0">Watch the crawl</a></div>
    </div><div class="footer-bottom"><span>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> Krawl Through Krakow</span><nav aria-label="Legal"><a href="https://krawlthroughkrakow.com/privacy-policy/">Privacy</a><a href="https://krawlthroughkrakow.com/terms-and-conditions/">Terms</a><a href="https://krawlthroughkrakow.com/tour-service-disclaimer/">Tour disclaimer</a><a href="https://www.iubenda.com/privacy-policy/42008139/cookie-policy" class="iubenda-cs-preferences-link">Cookie settings</a></nav></div></div></footer>
    <div class="mobile-booking" hidden aria-label="Book the pub crawl"><p><strong><?php echo esc_html( $offer['price'] ); ?> PLN</strong><span>per person &middot; <?php echo esc_html( $offer['time'] ); ?></span></p><?php echo ktk_homepage_book_button( 'sticky', 'button-small' ); ?></div>
    <?php return ob_get_clean();
}
