<?php
declare(strict_types=1);

// Standalone, nonce-scoped probe fixture. Never bootstrap WordPress or deploy
// this template directly. The offline compiler binds the six exact asset bodies.
/* BEGIN compiled SVG probe manifest */
$manifest = [];
/* END compiled SVG probe manifest */

function ktk_svg_probe_quality(?string $field): ?string {
    // Identity is a valid deterministic choice when the visitor sends no field.
    // Avoid choosing a coding an intermediary may decode for that visitor.
    if ($field === null) { return 'identity'; }
    if (strlen($field) > 1024 || preg_match('/[^\x09\x20-\x7e]/', $field)) {
        throw new InvalidArgumentException('Invalid encoding field');
    }
    $parts = explode(',', $field);
    if (count($parts) > 32) { throw new InvalidArgumentException('Too many codings'); }
    $weights = [];
    foreach ($parts as $part) {
        $part = trim($part, " \t");
        if ($part === '') { continue; }
        if (!preg_match('/^([!#$%&\x27*+.^_`|~0-9A-Za-z-]+)(?:[ \t]*;[ \t]*q=(0(?:\.[0-9]{0,3})?|1(?:\.0{0,3})?))?$/iD', $part, $m)) {
            throw new InvalidArgumentException('Malformed coding or weight');
        }
        $coding = strtolower($m[1]);
        $q = $m[2] ?? '1';
        $weight = $q[0] === '1' ? 1000 : (int) str_pad(explode('.', $q, 2)[1] ?? '', 3, '0');
        if (isset($weights[$coding]) && $weights[$coding] !== $weight) {
            throw new InvalidArgumentException('Conflicting duplicate coding');
        }
        $weights[$coding] = $weight;
    }
    if (!$weights) { return 'identity'; }
    $best = null; $highest = 0;
    foreach (['br', 'gzip'] as $coding) {
        $q = $weights[$coding] ?? $weights['*'] ?? 0;
        if ($q > $highest) { $best = $coding; $highest = $q; }
    }
    // An explicit identity preference participates in ordering. Otherwise it is
    // the acceptable uncompressed fallback, except when excluded by *;q=0.
    $identity = $weights['identity'] ?? (($weights['*'] ?? null) === 0 ? 0 : 1000);
    if (isset($weights['identity']) && $identity > $highest) { return 'identity'; }
    return $best ?? ($identity > 0 ? 'identity' : null);
}

function ktk_svg_probe_tag_matches(string $field, string $digest, bool $weak): bool {
    $field = trim($field, " \t");
    if ($field === '*') { return true; }
    if (strlen($field) > 2048 || !preg_match('/^(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"(?:[ \t]*,[ \t]*(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*")*$/D', $field)) { return false; }
    preg_match_all('/(W\/)?"([^\"]*)"/', $field, $matches, PREG_SET_ORDER);
    foreach ($matches as $tag) {
        if (($weak || $tag[1] === '') && hash_equals($digest, $tag[2])) { return true; }
    }
    return false;
}

function ktk_svg_probe_http_date(string $field): ?int {
    if (strlen($field) > 128) { return null; }
    foreach (['!D, d M Y H:i:s \G\M\T', '!l, d-M-y H:i:s \G\M\T', '!D M j H:i:s Y'] as $format) {
        $date = DateTimeImmutable::createFromFormat($format, $field, new DateTimeZone('GMT'));
        $errors = DateTimeImmutable::getLastErrors();
        if ($date !== false && ($errors === false || (!$errors['warning_count'] && !$errors['error_count']))) {
            if ($format === '!l, d-M-y H:i:s \G\M\T' && $date->getTimestamp() > time() + 50 * 366 * 86400) { $date = $date->modify('-100 years'); }
            return $date->getTimestamp();
        }
    }
    return null;
}

function ktk_svg_probe_error(int $status, string $message, bool $head): never {
    http_response_code($status);
    header_remove('Content-Encoding'); header_remove('ETag'); header_remove('Last-Modified');
    header_remove('X-KTK-Representation-ETag');
    header_remove('X-KTK-Representation-Encoding');
    header('Cache-Control: no-store, max-age=0, no-transform');
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Length: ' . strlen($message));
    if (!$head) { echo $message; }
    exit;
}

$head = ($_SERVER['REQUEST_METHOD'] ?? '') === 'HEAD';
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
header('Vary: Accept-Encoding');
try {
    if (($manifest['schemaVersion'] ?? null) !== 1 || !preg_match('/^[a-f0-9]{32}$/D', $manifest['token'] ?? '') || !in_array($manifest['cacheMode'] ?? null, ['no-store', 'public'], true) || !is_int($manifest['generatedAt'] ?? null) || !is_int($manifest['expiresAt'] ?? null) || $manifest['expiresAt'] !== $manifest['generatedAt'] + 3600 || array_keys($manifest['assets'] ?? []) !== ['regular', 'seasonal']) {
        throw new RuntimeException('Invalid compiled manifest');
    }
    header('X-KTK-Encoding-Probe: ' . $manifest['token']);
    $raw = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? null;
    if ($raw !== null && !is_string($raw)) { throw new RuntimeException('Invalid server header'); }
    header('X-KTK-Accept-Encoding-Present: ' . ($raw === null ? '0' : '1'));
    // HTTP field-edge OWS is not part of the meaningful value. PHP's server
    // parser drops leading OWS and can retain trailing OWS; normalize both here.
    // Token order, internal whitespace and every quality value remain bound.
    header('X-KTK-Accept-Encoding-SHA256: ' . hash('sha256', $raw === null ? "absent\0" : "present\0" . trim($raw, " \t")));
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) {
        header('Allow: GET, HEAD'); ktk_svg_probe_error(405, "Method not allowed\n", $head);
    }
    $asset = $_GET['asset'] ?? null;
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (!is_string($asset) || !isset($manifest['assets'][$asset]) || $path !== '/staging/ktk-svg-encoding-probe-' . $manifest['token'] . '/' . $asset . '.svg') {
        ktk_svg_probe_error(404, "Not found\n", $head);
    }
    if (time() >= $manifest['expiresAt']) { ktk_svg_probe_error(410, "Probe expired\n", $head); }
    if ($manifest['generatedAt'] > time() + 5) { throw new RuntimeException('Future manifest'); }
    try { $coding = ktk_svg_probe_quality($raw); }
    catch (InvalidArgumentException $e) { ktk_svg_probe_error(400, "Invalid Accept-Encoding\n", $head); }
    if ($coding === null) { ktk_svg_probe_error(406, "No acceptable representation\n", $head); }
    $entry = $manifest['assets'][$asset][$coding] ?? null;
    $filename = $asset . '.' . ['identity' => 'identity', 'br' => 'br', 'gzip' => 'gz'][$coding];
    if (!is_array($entry) || ($entry['file'] ?? null) !== $filename || !is_int($entry['bytes'] ?? null) || $entry['bytes'] < 1 || $entry['bytes'] > 1000000 || !preg_match('/^[a-f0-9]{64}$/D', $entry['sha256'] ?? '') || is_link(__DIR__ . '/' . $filename) || !is_file(__DIR__ . '/' . $filename)) { throw new RuntimeException('Unknown representation'); }
    $body = @file_get_contents(__DIR__ . '/' . $filename, false, null, 0, 1000001);
    if (!is_string($body) || strlen($body) !== $entry['bytes'] || !hash_equals($entry['sha256'], hash('sha256', $body))) { throw new RuntimeException('Representation changed'); }
    if (time() >= $manifest['expiresAt']) { ktk_svg_probe_error(410, "Probe expired\n", $head); }
    $digest = $entry['sha256']; $modified = $manifest['generatedAt'];
    if (isset($_SERVER['HTTP_IF_MATCH'])) {
        if (!ktk_svg_probe_tag_matches($_SERVER['HTTP_IF_MATCH'], $digest, false)) { ktk_svg_probe_error(412, "Precondition failed\n", $head); }
    } elseif (isset($_SERVER['HTTP_IF_UNMODIFIED_SINCE'])) {
        $date = ktk_svg_probe_http_date($_SERVER['HTTP_IF_UNMODIFIED_SINCE']);
        if ($date !== null && $modified > $date) { ktk_svg_probe_error(412, "Precondition failed\n", $head); }
    }
    header('Cache-Control: ' . ($manifest['cacheMode'] === 'public' ? 'public, max-age=' . min(60, $manifest['expiresAt'] - time()) . ', no-transform' : 'no-store, max-age=0, no-transform'));
    header('Content-Type: image/svg+xml');
    header('ETag: "' . $digest . '"');
    // A nonce-local response rule can restore this exact validator after an
    // inherited Header unset ETag, without changing the parent configuration.
    header('X-KTK-Representation-ETag: "' . $digest . '"');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $modified) . ' GMT');
    header('Accept-Ranges: none');
    if (isset($_SERVER['HTTP_IF_NONE_MATCH'])) {
        $notModified = ktk_svg_probe_tag_matches($_SERVER['HTTP_IF_NONE_MATCH'], $digest, true);
    } else {
        $date = isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) ? ktk_svg_probe_http_date($_SERVER['HTTP_IF_MODIFIED_SINCE']) : null;
        $notModified = $date !== null && $modified <= $date;
    }
    if ($notModified) { http_response_code(304); header_remove('Content-Length'); exit; }
    if ($coding !== 'identity') {
        header('Content-Encoding: ' . $coding);
        // LiteSpeed can omit Content-Encoding on HEAD or wildcard requests.
        // The nonce-local late response rule restores the selected coding.
        header('X-KTK-Representation-Encoding: ' . $coding);
    }
    header('Content-Length: ' . strlen($body));
    if (!$head) { echo $body; }
} catch (Throwable $e) {
    ktk_svg_probe_error(503, "SVG probe unavailable\n", $head);
}
