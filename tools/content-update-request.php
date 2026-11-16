<?php
/** Request validation only. No HTTP hook, filesystem/database writes or release authorization. */
if (!defined('KTK_CONTENT_UPDATE_REQUEST_ALLOWED') || KTK_CONTENT_UPDATE_REQUEST_ALLOWED !== true) {
    throw new RuntimeException('Explicit content-update request caller required');
}

final class KTK_Content_Update_Request
{
    public static function parse(string $raw, string $method, string $host, string $token, string $tokenSha256, int $expires, int $now, array $binding): array
    {
        if (!defined('KTK_CONTENT_UPDATE_REQUEST_ALLOWED') || KTK_CONTENT_UPDATE_REQUEST_ALLOWED !== true) {
            throw new RuntimeException('Explicit content-update request caller required');
        }
        if ($method !== 'POST' || strtolower($host) !== 'krawlthroughkrakow.com' || $now <= 0 || $expires <= $now || $expires - $now > 7200 ||
            !preg_match('/^[A-Za-z0-9_-]{43}$/D', $token) || !self::hash($tokenSha256) || !hash_equals($tokenSha256, hash('sha256', $token))) {
            throw new RuntimeException('Content-update authentication rejected');
        }
        if (array_keys($binding) !== array('transactionId', 'applicationCommit', 'planSha256') ||
            !is_string($binding['transactionId']) || !preg_match('/^[a-f0-9]{32}$/D', $binding['transactionId']) ||
            !is_string($binding['applicationCommit']) || !preg_match('/^[a-f0-9]{40}$/D', $binding['applicationCommit']) || !self::hash($binding['planSha256'])) {
            throw new RuntimeException('Exact server-side release binding required');
        }
        if (strlen($raw) > 2048) { throw new RuntimeException('Content-update request budget exceeded'); }
        try {
            $value = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
        } catch (Throwable $error) { throw new RuntimeException('Canonical content-update request required'); }
        if (!is_array($value) || ($value['schemaVersion'] ?? null) !== 1 || !is_string($value['action'] ?? null)) {
            throw new RuntimeException('Canonical content-update request required');
        }
        $extra = match ($value['action']) {
            'prepare', 'inspect', 'export' => array(),
            'acknowledge', 'close' => array('stateSha256', 'exportSha256', 'archiveSha256'),
            'apply', 'rollback' => array('stateSha256', 'archiveSha256'),
            default => throw new RuntimeException('Unsupported content-update action'),
        };
        if (array_keys($value) !== array_merge(array('schemaVersion','action','transactionId','applicationCommit','planSha256'), $extra) ||
            json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) !== $raw) {
            throw new RuntimeException('Canonical content-update request required');
        }
        foreach ($binding as $key => $expected) {
            if (!is_string($value[$key]) || !hash_equals($expected, $value[$key])) { throw new RuntimeException('Content-update release binding differs'); }
        }
        foreach ($extra as $key) { if (!self::hash($value[$key])) { throw new RuntimeException('Exact content-update receipt required'); } }
        // Receipt values still need comparison with durable server state by the controller.
        // Authentication here does not imply owner approval, backup validity or permission to write.
        return $value;
    }

    private static function hash($value): bool { return is_string($value) && preg_match('/^[a-f0-9]{64}$/D', $value) === 1; }
}
