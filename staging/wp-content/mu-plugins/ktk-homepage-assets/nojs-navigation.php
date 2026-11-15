<?php
/** Source blueprint for the two generated, namespace-isolated navigation helpers. */
if (!defined('ABSPATH')) { exit; }

function ktk_homepage_nojs_navigation_body($html, $home_url) {
    $roots = array('https://krawlthroughkrakow.com/', 'https://krawlthroughkrakow.com/staging/', 'http://127.0.0.1:5184/', 'http://127.0.0.1:5185/');
    if (!is_string($html) || !is_string($home_url) || !in_array($home_url, $roots, true)) {
        throw new InvalidArgumentException('Known captured body and site root required');
    }
    $prefix = '<div id="main-content" data-ktk-semantic-headings="1"';
    if (substr_count($html, $prefix) !== 1) { throw new RuntimeException('Unique captured main opening required'); }
    // Tokenize complete tags so a quoted attribute, comment or raw-text block cannot supply the opening.
    $pattern = '~<!--.*?-->|<(script|style|template|textarea|noscript)\b(?:"[^"]*"|\'[^\']*\'|[^\'">])*>.*?</\1\s*>|<(?:"[^"]*"|\'[^\']*\'|[^\'">])*>~is';
    if (preg_match_all($pattern, $html, $tokens, PREG_OFFSET_CAPTURE) === false) { throw new RuntimeException('Captured body tokenization failed'); }
    $openings = array();
    foreach ($tokens[0] as $token) {
        if (str_starts_with($token[0], '<!--')) {
            if (!str_ends_with($token[0], '-->')) { throw new RuntimeException('Unclosed captured comment'); }
            continue;
        }
        if (preg_match('~^<(script|style|template|textarea|noscript)\b~i', $token[0], $raw)) {
            if (!preg_match('~</' . $raw[1] . '\s*>$~i', $token[0])) { throw new RuntimeException('Unclosed captured raw-text block'); }
            if (strtolower($raw[1]) === 'template' && preg_match_all('~<template\b~i', $token[0]) !== 1) { throw new RuntimeException('Nested captured template requires review'); }
            continue;
        }
        if (str_starts_with($token[0], $prefix)) { $openings[] = $token; }
    }
    if (count($openings) !== 1) { throw new RuntimeException('Captured main must be an actual opening tag'); }
    $position = $openings[0][1] + strlen($openings[0][0]);
    $links = array(
        '' => 'Pub Crawl',
        'about-us/how-to-join/' => 'How to Join',
        'meeting-point/' => 'Meeting Point',
        'about-us/' => 'About Us',
        'gallery/' => 'Gallery',
        'faqs/' => 'FAQ',
        'blog/' => 'Blog',
        'other-tours/' => 'Other Tours',
        'contact/' => 'Contact',
    );
    $navigation = '<noscript data-ktk-nojs-navigation="2026-11-15"><nav class="ktk-nojs-navigation" aria-label="Quick links"><p>Quick links</p><ul>';
    foreach ($links as $path => $label) {
        $navigation .= '<li><a href="' . htmlspecialchars($home_url . $path, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '">' . $label . '</a></li>';
    }
    $navigation .= '</ul></nav></noscript>';
    if (str_contains($html, 'data-ktk-nojs-navigation=')) {
        if (substr_count($html, $navigation) !== 1 || substr($html, $position, strlen($navigation)) !== $navigation) { throw new RuntimeException('Changed or displaced no-JS navigation'); }
        return $html;
    }
    return substr($html, 0, $position) . $navigation . substr($html, $position);
}
