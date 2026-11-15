<?php
/** Private staging-host fixture only. No HTTP entry point, WordPress hook or network client. */
if (!defined('KTK_STAGING_FIXTURE_ALLOWED') || KTK_STAGING_FIXTURE_ALLOWED !== true) {
    throw new RuntimeException('Explicit private staging fixture caller required');
}

final class KTK_Staging_Private_Fixture
{
    private const ASSETS = 'ktk-code-pages-assets/';
    private const MARKER = 'ktk-code-pages-production.php';
    private string $stage;
    private string $publicRoot;
    private string $root;
    private string $helper;
    private string $helperSha;
    private string $id;
    private string $commit;
    private array $owned;
    private array $old;
    private array $new;
    private $capture;
    private $lock;

    public function __construct(string $stage, string $helper, string $id, string $commit, array $owned, string $activation, callable $capture)
    {
        if (!preg_match('/^[a-f0-9]{32}$/D', $id) || !preg_match('/^[a-f0-9]{40}$/D', $commit) || !$owned ||
            hash('sha256', $activation) !== 'b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833') { throw new RuntimeException('Exact fixture bindings required'); }
        $this->stage = self::directory($stage);
        $this->publicRoot = self::directory(dirname($this->stage));
        $outside = self::directory(dirname($this->publicRoot));
        if (basename($this->stage) !== 'staging' || basename($this->publicRoot) !== 'public_html' ||
            self::directory(dirname($helper)) !== $this->stage . '/wp-content/mu-plugins' ||
            basename($helper) !== 'ktk-transaction-rehearsal-' . $id . '.php' || is_link($helper) || !is_file($helper)) { throw new RuntimeException('Exact staging helper filesystem required'); }
        foreach ($owned as $name => $hash) {
            if (!is_string($name) || ($name !== 'ktk-code-pages.php' && !str_starts_with($name, self::ASSETS)) || !self::hash($hash) ||
                array_intersect(explode('/', $name), array('', '.', '..')) || !preg_match('/^[A-Za-z0-9._\/-]+$/D', $name)) { throw new RuntimeException('Exact public owned map required'); }
        }
        ksort($owned); $this->owned = $owned;
        $this->root = $outside . '/.ktk-staging-rehearsal-' . $id;
        if (str_starts_with(strtolower($this->root) . '/', strtolower($this->publicRoot) . '/')) { throw new RuntimeException('Private root must be outside the complete public root'); }
        $this->helper = str_replace('\\', '/', $helper); $this->helperSha = self::digest($this->helper);
        $this->id = $id; $this->commit = $commit; $this->capture = $capture;
        $this->old = array('ktk-code-pages.php' => "<?php /* isolated prior renderer; never executed */\n",
            self::ASSETS . 'registry.php' => "<?php /* isolated prior registry; never executed */\n",
            self::ASSETS . 'runtime.css' => "/* isolated prior css */\n", self::ASSETS . 'runtime.js' => "/* isolated unchanged javascript */\n",
            self::ASSETS . 'content/unchanged.html' => "<p>Isolated unchanged content.</p>\n", self::MARKER => $activation);
        $this->new = $this->old; unset($this->new[self::MARKER]);
        $this->new['ktk-code-pages.php'] = "<?php /* isolated candidate renderer; never executed */\n";
        $this->new[self::ASSETS . 'registry.php'] = "<?php /* isolated candidate registry; never executed */\n";
        $this->new[self::ASSETS . 'runtime.css'] = "/* isolated candidate css */\n";
        $this->new[self::ASSETS . 'content/introduced.html'] = "<p>Isolated introduced content.</p>\n";
        $this->new[self::ASSETS . 'shells/introduced.php'] = "<?php /* isolated introduced shell; never executed */\n";
    }

    public function __destruct() { if (is_resource($this->lock)) { flock($this->lock, LOCK_UN); fclose($this->lock); } }
    private static function hash($value): bool { return is_string($value) && preg_match('/^[a-f0-9]{64}$/D', $value) === 1; }
    private static function encode($value): string { return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); }
    private static function directory(string $path): string
    {
        clearstatcache(true, $path); $real = realpath($path);
        if ($real === false || !is_dir($real)) { throw new RuntimeException('Existing fixture directory required'); }
        foreach (array($path, $real) as $candidate) {
            for ($p = $candidate; ; $p = dirname($p)) {
                clearstatcache(true, $p); if (is_link($p)) { throw new RuntimeException('Symlink fixture ancestor rejected'); }
                if (dirname($p) === $p) { break; }
            }
        }
        return str_replace('\\', '/', $real);
    }
    private static function digest(string $path): ?string
    {
        clearstatcache(true, $path); if (is_link($path)) { throw new RuntimeException('Symlink fixture file rejected'); }
        if (!file_exists($path)) { return null; }
        $hash = is_file($path) ? hash_file('sha256', $path) : false;
        if ($hash === false) { throw new RuntimeException('Unreadable fixture file'); } return $hash;
    }
    private function helperCheck(): void
    {
        if (self::directory($this->stage) !== $this->stage || self::digest($this->helper) !== $this->helperSha) { throw new RuntimeException('Staging helper changed'); }
    }
    private function realState(): array
    {
        $this->helperCheck(); $state = ($this->capture)(); $identity = $state['identity'] ?? array();
        if (($state['schemaVersion'] ?? null) !== 1 || ($state['scope'] ?? null) !== 'staging-protected-original-state' ||
            ($state['helperSha256'] ?? null) !== $this->helperSha || ($identity['home'] ?? null) !== 'https://krawlthroughkrakow.com/staging/' ||
            ($identity['siteurl'] ?? null) !== 'https://krawlthroughkrakow.com/staging/' || ($identity['blogPublic'] ?? null) !== 0 ||
            ($state['ownedContentFiles'] ?? null) !== $this->owned || !self::hash($state['protectedStateSha256'] ?? null) ||
            ($state['databaseWrites'] ?? null) !== 0 || ($state['applicationWrites'] ?? null) !== 0 || ($state['cachePurges'] ?? null) !== 0) {
            throw new RuntimeException('Real staging identity, owned content or protected capture differs');
        }
        return $state;
    }
    private function guard(string $expected): string
    {
        $actual = $this->realState()['protectedStateSha256'];
        if ($actual !== $expected) { throw new RuntimeException('Real protected state changed; never restore database state'); } return $actual;
    }
    private function path(string $name, bool $make = false): string
    {
        if (self::directory($this->root) !== $this->root || !preg_match('/^[A-Za-z0-9._\/-]+$/D', $name) ||
            array_intersect(explode('/', $name), array('', '.', '..'))) { throw new RuntimeException('Unsafe private fixture path'); }
        $directory = $this->root;
        foreach (array_slice(explode('/', $name), 0, -1) as $part) {
            $directory .= '/' . $part;
            if (is_link($directory) || (file_exists($directory) && !is_dir($directory))) { throw new RuntimeException('Unsafe private fixture ancestor'); }
            if (!is_dir($directory) && $make && !mkdir($directory, 0700)) { throw new RuntimeException('Cannot create private fixture ancestor'); }
            if (is_dir($directory) && self::directory($directory) !== $directory) { throw new RuntimeException('Private fixture ancestor changed'); }
        }
        $path = $this->root . '/' . $name;
        if (is_link($path) || (file_exists($path) && !is_file($path))) { throw new RuntimeException('Unsafe private fixture file'); } return $path;
    }
    private function put(string $name, string $bytes): void
    {
        $path = $this->path($name, true); if (file_exists($path)) { throw new RuntimeException('Existing private fixture bytes preserved'); }
        $handle = fopen($path, 'x+b'); if (!$handle) { throw new RuntimeException('Exclusive private fixture create failed'); }
        try {
            if (!chmod($path, 0600) || fwrite($handle, $bytes) !== strlen($bytes) || !fflush($handle) ||
                (function_exists('fsync') && !fsync($handle))) { throw new RuntimeException('Private fixture write failed'); }
        } finally { fclose($handle); }
        if (self::digest($this->path($name)) !== hash('sha256', $bytes)) { throw new RuntimeException('Private fixture bytes differ'); }
    }
    private function open(bool $prepare): void
    {
        $this->helperCheck(); clearstatcache(true, $this->root);
        if (is_link($this->root) || (file_exists($this->root) && !is_dir($this->root))) { throw new RuntimeException('Private fixture root collision preserved'); }
        if ($prepare) {
            if (file_exists($this->root) || disk_free_space(dirname($this->root)) < 67108864 || !mkdir($this->root, 0700)) { throw new RuntimeException('Fresh private fixture root and adequate space required'); }
        } elseif (!is_dir($this->root)) { throw new RuntimeException('Existing private fixture required'); }
        if (self::directory($this->root) !== $this->root) { throw new RuntimeException('Private fixture root changed'); }
        $path = $this->path('lifecycle.lock'); $this->lock = fopen($path, $prepare ? 'x+b' : 'r+b');
        if (!$this->lock || !flock($this->lock, LOCK_EX | LOCK_NB)) { throw new RuntimeException('Private fixture lifecycle is busy'); }
        $binding = hash('sha256', $this->helperSha . $this->id . $this->stage);
        if ($prepare) {
            if (!chmod($path, 0600) || fwrite($this->lock, $binding) !== strlen($binding) || !fflush($this->lock)) { throw new RuntimeException('Private lifecycle receipt failed'); }
        } elseif ($this->lockBytes() !== $binding) { throw new RuntimeException('Private lifecycle binding differs'); }
        $this->helperCheck();
    }
    private function lockBytes(): string
    {
        $path = $this->path('lifecycle.lock'); clearstatcache(true, $path);
        $actual = stat($path); $opened = is_resource($this->lock) ? fstat($this->lock) : false;
        if ($actual === false || $opened === false || $actual['dev'] !== $opened['dev'] || $actual['ino'] !== $opened['ino'] ||
            !rewind($this->lock)) { throw new RuntimeException('Private lifecycle handle/path differs'); }
        $bytes = stream_get_contents($this->lock);
        if ($bytes === false) { throw new RuntimeException('Unreadable private lifecycle handle'); } return $bytes;
    }
    private function hashes(array $files): array { $result = array(); foreach ($files as $n => $b) { $result[$n] = hash('sha256', $b); } ksort($result); return $result; }
    private function plan(array $control): array
    {
        return array('transactionId' => $this->id, 'applicationCommit' => $this->commit, 'protectedStateSha256' => $control['protectedStateSha256'],
            'expected' => $this->hashes($this->new), 'prior' => $this->hashes($this->old));
    }
    private function control(): array
    {
        $value = json_decode(file_get_contents($this->path('control.json')), true, 512, JSON_THROW_ON_ERROR);
        if (($value['transactionId'] ?? null) !== $this->id || ($value['applicationCommit'] ?? null) !== $this->commit ||
            ($value['helperSha256'] ?? null) !== $this->helperSha || ($value['ownedMapSha256'] ?? null) !== hash('sha256', self::encode($this->owned)) ||
            !self::hash($value['protectedStateSha256'] ?? null) || self::digest($this->path('original-state.json')) !== ($value['originalStateSha256'] ?? null)) { throw new RuntimeException('Private control/original capture differs'); }
        $original = json_decode(file_get_contents($this->path('original-state.json')), true, 512, JSON_THROW_ON_ERROR);
        if (($original['protectedStateSha256'] ?? null) !== $value['protectedStateSha256']) { throw new RuntimeException('Original protected capture differs'); }
        $this->guard($value['protectedStateSha256']); return $value;
    }
    private function tree(): array
    {
        if (self::directory($this->root) !== $this->root) { throw new RuntimeException('Private fixture root changed'); }
        $files = array(); $directories = array(); $total = 0;
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->root, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST) as $entry) {
            if ($entry->isLink()) { throw new RuntimeException('Private export rejects symlinks'); }
            $name = str_replace('\\', '/', substr($entry->getPathname(), strlen($this->root) + 1));
            if ($entry->isDir()) { $directories[] = $name; continue; }
            $path = $this->path($name); $bytes = filesize($path);
            if (!is_int($bytes) || $bytes < 0) { throw new RuntimeException('Unreadable private export size'); } $total += $bytes;
            if ($total > 33554432) { throw new RuntimeException('Private export size limit exceeded'); }
            $files[$name] = array('sha256' => $name === 'lifecycle.lock' ? hash('sha256', $this->lockBytes()) : self::digest($path), 'bytes' => $bytes);
        }
        ksort($files); sort($directories); return array('files' => $files, 'directories' => $directories, 'bytes' => $total);
    }
    private function ownedNames(): array
    {
        $names = array('lifecycle.lock', 'control.json', 'original-state.json', 'engine/target-' . hash('sha256', $this->root . '/active') . '.lock',
            'engine/' . $this->id . '/plan.json', 'engine/' . $this->id . '/journal.json');
        foreach (array_keys($this->new) as $n) { $names[] = 'source/' . $n; }
        foreach (array_keys($this->old + $this->new) as $n) { $names[] = 'active/' . $n; }
        foreach (array('ktk-code-pages.php', self::ASSETS . 'registry.php', self::ASSETS . 'runtime.css', self::MARKER) as $n) { $names[] = 'engine/' . $this->id . '/prior/' . $n; }
        return $names;
    }
    private function knownTree(array $tree): void
    {
        $names = $this->ownedNames(); $dirs = array('engine/' . $this->id . '/pending', 'engine/' . $this->id . '/receipts');
        foreach (array_merge($names, $dirs) as $name) { for ($p = dirname($name); $p !== '.'; $p = dirname($p)) { $dirs[] = $p; } }
        foreach (array_keys($tree['files']) as $name) {
            if (!in_array($name, $names, true) && !preg_match('~^engine/' . $this->id . '/(?:pending/\.ktk-content-[a-f0-9]{32}|receipts/\.ktk-receipt-(?:plan|journal)-[a-f0-9]{32})$~D', $name)) { throw new RuntimeException('Unknown private file preserved before cleanup'); }
        }
        foreach ($tree['directories'] as $name) { if (!in_array($name, $dirs, true)) { throw new RuntimeException('Unknown private directory preserved before cleanup'); } }
    }
    private function result(string $action, array $status, array $control): array
    {
        $state = $this->realState(); if ($state['protectedStateSha256'] !== $control['protectedStateSha256']) { throw new RuntimeException('Protected state changed during fixture call'); }
        return array('schemaVersion' => 1, 'scope' => 'staging-private-active-transaction-fixture', 'action' => $action, 'transactionId' => $this->id,
            'applicationCommit' => $this->commit, 'helperSha256' => $this->helperSha, 'identity' => $state['identity'], 'rowCounts' => $state['rowCounts'],
            'realProtectedStateSha256' => $state['protectedStateSha256'], 'realOwnedMapSha256' => hash('sha256', self::encode($this->owned)),
            'protectedFileCount' => count($state['protectedFiles']), 'ownedContentFileCount' => count($this->owned), 'privateRootName' => basename($this->root),
            'privateRootOutsideCompletePublicRoot' => true, 'fixtureChangedFiles' => 5, 'fixturePriorBackupFiles' => 4, 'status' => $status,
            'publicApplicationWrites' => 0, 'publicActivationWrites' => 0, 'databaseWrites' => 0, 'cachePurges' => 0);
    }
    private function replaceClosed(array $value, ?string $expected): void
    {
        $temporary = '.ktk-closure-' . bin2hex(random_bytes(16)) . '.tmp'; $bytes = self::encode($value) . "\n";
        $this->put($temporary, $bytes); $path = $this->path('closed.json');
        if (self::digest($path) !== $expected || !rename($this->path($temporary), $path) || self::digest($this->path('closed.json')) !== hash('sha256', $bytes)) { throw new RuntimeException('Private closure commit refused'); }
    }
    private function finishCleanup(array $closed): array
    {
        $this->guard($closed['protectedStateSha256']); $tree = $this->tree();
        foreach ($tree['files'] as $name => $row) {
            if (in_array($name, array('lifecycle.lock', 'closed.json'), true)) { continue; }
            if (($closed['files'][$name] ?? null) !== $row) { throw new RuntimeException('Changed private cleanup file preserved'); }
        }
        $this->knownTree(array('files' => array_diff_key($tree['files'], array('closed.json' => true)), 'directories' => $tree['directories']));
        foreach ($tree['files'] as $name => $row) {
            if (in_array($name, array('lifecycle.lock', 'closed.json'), true)) { continue; }
            $this->helperCheck(); $path = $this->path($name);
            if (self::digest($path) !== $row['sha256'] || !unlink($path)) { throw new RuntimeException('Private cleanup refused changed bytes'); }
        }
        usort($tree['directories'], static fn($a, $b) => strlen($b) <=> strlen($a));
        foreach ($tree['directories'] as $name) {
            $path = $this->root . '/' . $name;
            if (self::directory($path) !== $path || !rmdir($path)) { throw new RuntimeException('Private directory cleanup incomplete'); }
        }
        $this->guard($closed['protectedStateSha256']); $closed['phase'] = 'closed';
        $this->replaceClosed($closed, self::digest($this->path('closed.json')));
        $left = $this->tree(); if (array_keys($left['files']) !== array('closed.json', 'lifecycle.lock') || $left['directories']) { throw new RuntimeException('Unexpected retained private closure state'); }
        return $this->result('cleanup', array('phase' => 'closed', 'retainedPrivateFiles' => $left['files'], 'rawOriginalStateRemoved' => true,
            'fixtureAndPriorPayloadRemoved' => true, 'serverExportSha256' => $closed['exportSha256'], 'clientVerifiedArchiveSha256' => $closed['archiveSha256']), $closed);
    }
    public function run(string $action, ?string $exportSha = null, ?string $archiveSha = null): array
    {
        if (!in_array($action, array('prepare', 'inspect', 'apply', 'interrupt', 'rollback', 'export', 'cleanup'), true) ||
            ($action === 'cleanup' ? (!self::hash($exportSha) || !self::hash($archiveSha)) : ($exportSha !== null || $archiveSha !== null))) { throw new RuntimeException('Exact fixture action required'); }
        $this->open($action === 'prepare');
        if (file_exists($this->path('closed.json'))) {
            $closed = json_decode(file_get_contents($this->path('closed.json')), true, 512, JSON_THROW_ON_ERROR);
            if (($closed['transactionId'] ?? null) !== $this->id || ($closed['applicationCommit'] ?? null) !== $this->commit || ($closed['helperSha256'] ?? null) !== $this->helperSha ||
                ($closed['ownedMapSha256'] ?? null) !== hash('sha256', self::encode($this->owned)) || !self::hash($closed['protectedStateSha256'] ?? null) || !in_array($closed['phase'] ?? null, array('closing','closed'), true)) { throw new RuntimeException('Private closure binding differs'); }
            if (!self::hash($closed['originalStateSha256'] ?? null) || !self::hash($closed['exportSha256'] ?? null) ||
                !self::hash($closed['archiveSha256'] ?? null) || !is_array($closed['files'] ?? null)) { throw new RuntimeException('Incomplete private closure receipt'); }
            $this->guard($closed['protectedStateSha256']);
            if ($action === 'cleanup' && $closed['phase'] === 'closing' && $closed['exportSha256'] === $exportSha && $closed['archiveSha256'] === $archiveSha) { return $this->finishCleanup($closed); }
            if ($action !== 'inspect' || $closed['phase'] !== 'closed') { throw new RuntimeException('Closed transaction cannot be replayed'); }
            $tree = $this->tree(); if (array_keys($tree['files']) !== array('closed.json','lifecycle.lock') || $tree['directories']) { throw new RuntimeException('Unexpected retained private closure state'); }
            return $this->result('inspect', array('phase' => 'closed', 'retainedPrivateFiles' => $tree['files'], 'rawOriginalStateRemoved' => true,
                'fixtureAndPriorPayloadRemoved' => true, 'serverExportSha256' => $closed['exportSha256'], 'clientVerifiedArchiveSha256' => $closed['archiveSha256']), $closed);
        }
        if ($action === 'prepare') {
            $state = $this->realState(); $bytes = self::encode($state) . "\n"; if (strlen($bytes) > 16777216) { throw new RuntimeException('Original state exceeds private fixture budget'); }
            $this->put('original-state.json', $bytes);
            foreach ($this->new as $n => $b) { $this->put('source/' . $n, $b); }
            foreach ($this->old as $n => $b) { $this->put('active/' . $n, $b); }
            if (!mkdir($this->root . '/engine', 0700)) { throw new RuntimeException('Fresh private engine directory required'); }
            $control = array('transactionId' => $this->id, 'applicationCommit' => $this->commit, 'helperSha256' => $this->helperSha,
                'ownedMapSha256' => hash('sha256', self::encode($this->owned)), 'protectedStateSha256' => $state['protectedStateSha256'], 'originalStateSha256' => hash('sha256', $bytes));
            $this->put('control.json', self::encode($control) . "\n");
        } else { $control = $this->control(); }
        $renamed = false;
        $observer = $action !== 'interrupt' ? null : function ($event) use (&$renamed): void {
            if ($event === 'after-rename') { $renamed = true; }
            if ($event === 'after-private-temporary-create' && $renamed) {
                $area = $this->root . '/engine/' . $this->id . '/receipts';
                foreach (new DirectoryIterator($area) as $file) { if ($file->isFile() && !$file->isLink()) { file_put_contents($file->getPathname(), 'partial'); break; } }
                // Controlled request/process termination after actual private replacement, before journal commit.
                if (PHP_SAPI !== 'cli') { header('Content-Type: application/json'); header('Content-Length: 999'); echo '{'; }
                exit(73);
            }
        };
        $engine = new KTK_Active_Content_Transaction($this->root . '/source', $this->root . '/active', $this->root . '/engine', $this->plan($control),
            fn() => $this->guard($control['protectedStateSha256']), $observer);
        if ($action === 'prepare') { return $this->result($action, $engine->prepare(), $control); }
        if ($action === 'interrupt') {
            $initial = $engine->inspect();
            if ($initial['phase'] !== 'prepared' || $initial['intentFiles']) { throw new RuntimeException('Only one initial controlled interruption is allowed'); }
        }
        if ($action === 'apply' || $action === 'interrupt') { return $this->result($action, $engine->apply(1), $control); }
        if ($action === 'rollback') { return $this->result($action, $engine->rollback(1), $control); }
        $status = $engine->inspect();
        if ($action === 'inspect') { return $this->result($action, $status, $control); }
        if (!$status['backupVerified'] || !$status['protectedStateVerified'] || !$status['currentPriorInventoryVerified'] || $status['phase'] !== 'rolled-back') { throw new RuntimeException('Exact private rollback required before export/cleanup'); }
        // The outer lifecycle lock still excludes cooperating calls; release the inner lock before reading its file on Windows.
        unset($engine);
        $tree = $this->tree(); $this->knownTree($tree); $fingerprint = hash('sha256', self::encode($tree));
        if ($action === 'export') {
            $result = $this->result($action, $status, $control); $blobs = array();
            foreach ($tree['files'] as $n => $row) { $b = $n === 'lifecycle.lock' ? $this->lockBytes() : file_get_contents($this->path($n)); if ($b === false || hash('sha256', $b) !== $row['sha256']) { throw new RuntimeException('Private export changed while reading'); } $blobs[$n] = base64_encode($b); }
            if ($this->tree() !== $tree) { throw new RuntimeException('Private export changed during capture'); }
            $result['privateExport'] = array('manifest' => $tree, 'sha256' => $fingerprint, 'fileBytesBase64' => $blobs); return $result;
        }
        if ($fingerprint !== $exportSha) { throw new RuntimeException('Private cleanup export binding differs'); }
        $closed = $control + array('phase' => 'closing', 'exportSha256' => $exportSha, 'archiveSha256' => $archiveSha, 'files' => $tree['files']);
        $this->replaceClosed($closed, null); return $this->finishCleanup($closed);
    }
}
