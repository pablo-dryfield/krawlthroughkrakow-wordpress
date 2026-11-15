<?php
define('ABSPATH', dirname(__DIR__, 2));
require ABSPATH . '/tools/nojs-navigation.php';
$checks = array();
function nav_check($name, $condition) { global $checks; $checks[] = array('name' => $name, 'pass' => (bool) $condition); }
function nav_refuses($name, $html, $root = 'https://krawlthroughkrakow.com/staging/') {
    try { ktk_nojs_navigation_body($html, $root); nav_check($name, false); }
    catch (InvalidArgumentException | RuntimeException $error) { nav_check($name, true); }
}
$opening = '<div id="main-content" data-ktk-semantic-headings="1"';
$original = '<header>Header unchanged</header>' . $opening . ' role="main" data-example="quoted > value"><h1>Original</h1><form action="/unchanged" method="post"><input name="action" value="unchanged"></form><noscript><img src="original.jpg" alt="Original"></noscript><iframe src="about:blank" data-ktk-purpose="3"></iframe></div><footer>Footer unchanged</footer>';
$result = ktk_nojs_navigation_body($original, 'https://krawlthroughkrakow.com/staging/');
preg_match('~<noscript data-ktk-nojs-navigation="2026-11-15">.*?</noscript>~s', $result, $block);
nav_check('exact whole-body inverse preserves forms/media/old noscript/consent/header/footer', count($block) === 1 && str_replace($block[0], '', $result) === $original);
nav_check('idempotent same body and root', ktk_nojs_navigation_body($result, 'https://krawlthroughkrakow.com/staging/') === $result);
preg_match_all('~<a href="([^"]+)">([^<]+)</a>~', $block[0], $links, PREG_SET_ORDER);
nav_check('nine reviewed native internal destinations', array_column($links, 1) === array_map(fn($path) => 'https://krawlthroughkrakow.com/staging/' . $path, array('', 'about-us/how-to-join/', 'meeting-point/', 'about-us/', 'gallery/', 'faqs/', 'blog/', 'other-tours/', 'contact/')));
nav_check('new markup has no forms/providers/scripts/media/headings or event handlers', !preg_match('~<(?:form|input|iframe|script|img|video|svg|h[1-6])\b|\son[a-z]+\s*=~i', $block[0]));
foreach (array('https://krawlthroughkrakow.com/', 'http://127.0.0.1:5184/', 'http://127.0.0.1:5185/') as $root) {
    $local = ktk_nojs_navigation_body($original, $root);
    nav_check('exact declared alternate root ' . $root, str_contains($local, 'href="' . $root . 'gallery/"'));
}
foreach (array('', 'javascript:alert(1)', '//example.test/', 'https://example.test/', 'https://krawlthroughkrakow.com/staging', 'https://krawlthroughkrakow.com/staging-else/', 'https://krawlthroughkrakow.com/staging/?next=x', 'https://krawlthroughkrakow.com/staging/#x', "https://krawlthroughkrakow.com/staging/\n") as $root) { nav_refuses('unknown site root refused ' . json_encode($root), $original, $root); }
foreach (array(
    '' => 'empty',
    '<div id="main-content"><p>Raw unprepared body</p></div>' => 'raw unprepared',
    $original . $opening . '></div>' => 'duplicate main',
    '<!--' . $opening . '></div>-->' => 'comment only',
    '<script>' . $opening . '></div></script>' => 'script only',
    '<style>' . $opening . '></div></style>' => 'style only',
    '<template>' . $opening . '></div></template>' => 'template only',
    '<textarea>' . $opening . '></div></textarea>' => 'textarea only',
    '<noscript>' . $opening . '></div></noscript>' => 'noscript only',
    '<p data-example=\'' . $opening . '>\'>attribute only</p>' => 'attribute only',
    '<script>' . $opening . '></div>' => 'unclosed script',
    $opening . ' data-example="unfinished></div>' => 'unclosed opening quote',
    str_replace('2026-11-15', '2026-11-16', $result) => 'changed marker',
    str_replace('/staging/gallery/', '/staging/other/', $result) => 'changed navigation href',
    $block[0] . $original => 'displaced navigation',
    $result . $block[0] => 'duplicate navigation',
) as $html => $name) { nav_refuses($name, $html); }
$failed = array_values(array_filter($checks, fn($row) => !$row['pass']));
echo json_encode(array('passed' => count($checks) - count($failed), 'total' => count($checks), 'failed' => $failed), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
exit($failed ? 1 : 0);
