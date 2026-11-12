<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

function ktk_homepage_review_sources() {
    // Checked 2026-10-08; see review-row-source-evidence.json for snapshot freshness.
    return array(
        // Owner requested 2,400+ display after supplying the rounded 2.4K screenshot.
        array( 'name' => 'Google', 'rating' => '5.0', 'count' => '2,400+', 'logo' => 'review-google.svg',
            'url' => 'https://www.google.com/maps/place/Krawl+Through+Krakow+-+Pub+crawl/@50.0614569,19.9380167,17z/data=!3m1!4b1!4m6!3m5!1s0x47165bf213d4292f:0xb4d3277c5ab6ea20!8m2!3d50.0614569!4d19.9380167!16s%2Fg%2F11t9kqj0yw' ),
        array( 'name' => 'Tripadvisor', 'rating' => '4.9', 'count' => '3,000+', 'logo' => 'review-tripadvisor.png',
            'url' => 'https://www.tripadvisor.com/Attraction_Review-g274772-d2725527-Reviews-Krawl_Through_Krakow_Pub_Crawl-Krakow_Lesser_Poland_Province_Southern_Poland.html' ),
        array( 'name' => 'GetYourGuide', 'rating' => '4.6', 'count' => '100+', 'logo' => 'review-getyourguide.svg',
            'url' => 'https://www.getyourguide.com/krakow-l40/krakow-pub-crawl-1h-open-bar-vip-entry-welcome-shots-t443425/' ),
    );
}
