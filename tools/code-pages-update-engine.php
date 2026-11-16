<?php
/** Offline transaction component. No HTTP entry point, WordPress hook or network client. */
if (!defined('KTK_UPDATE_ENGINE_ALLOWED') || KTK_UPDATE_ENGINE_ALLOWED !== true) {
    throw new RuntimeException('This component requires an explicitly configured caller');
}

final class KTK_Active_Content_Transaction
{
    private const ASSETS = 'ktk-code-pages-assets';
    private const RENDERER = 'ktk-code-pages.php';
    private const ACTIVATION = 'ktk-code-pages-production.php';
    private const ACTIVATION_SHA = 'b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833';
    private string $source;
    private string $target;
    private string $private;
    private array $plan;
    private array $journal;
    private array $receiptHashes;
    private $guard;
    private $observer;
    private $lock;
    private bool $replacementPerformed = false;

    public function __construct(string $source, string $target, string $private, array $plan, callable $guard, ?callable $observer = null)
    {
        $this->source = self::root($source);
        $this->target = self::root($target);
        $this->private = self::root($private);
        foreach (array($this->source, $this->target, $this->private) as $a) {
            foreach (array($this->source, $this->target, $this->private) as $b) {
                if ($a !== $b && self::within($a, $b)) { throw new RuntimeException('Transaction roots must be separate'); }
            }
        }
        if (count(array_unique(array_map('strtolower', array($this->source, $this->target, $this->private)))) !== 3) { throw new RuntimeException('Distinct roots required'); }
        if (array_diff(array_keys($plan), array('transactionId', 'applicationCommit', 'protectedStateSha256', 'expected', 'prior')) || count($plan) !== 5 ||
            !preg_match('/^[a-f0-9]{32}$/D', $plan['transactionId'] ?? '') || !preg_match('/^[a-f0-9]{40}$/D', $plan['applicationCommit'] ?? '') ||
            !self::hashString($plan['protectedStateSha256'] ?? null) || !is_array($plan['expected'] ?? null) || !is_array($plan['prior'] ?? null)) {
            throw new RuntimeException('Exact immutable transaction plan required');
        }
        foreach (array('expected', 'prior') as $key) {
            $seen = array();
            foreach ($plan[$key] as $name => $hash) {
                self::name($name, $key === 'prior');
                if (!self::hashString($hash) || isset($seen[strtolower($name)])) { throw new RuntimeException('Invalid or ambiguous checksum inventory'); }
                $seen[strtolower($name)] = true;
            }
            ksort($plan[$key]);
        }
        foreach (array(self::RENDERER, self::ASSETS . '/registry.php', self::ASSETS . '/runtime.css', self::ASSETS . '/runtime.js') as $name) {
            if (!isset($plan['expected'][$name], $plan['prior'][$name])) { throw new RuntimeException('An already active complete content release is required'); }
        }
        if (($plan['prior'][self::ACTIVATION] ?? null) !== self::ACTIVATION_SHA || array_diff_key($plan['prior'], $plan['expected'], array(self::ACTIVATION => true))) {
            throw new RuntimeException('Unknown prior file or activation marker');
        }
        $this->plan = $plan;
        $this->guard = $guard;
        $this->observer = $observer;
        // All cooperating transactions for this target share one lock, including different transaction IDs.
        $lockPath = $this->private . '/target-' . hash('sha256', $this->target) . '.lock';
        if (is_link($lockPath)) { throw new RuntimeException('Unsafe transaction lock'); }
        $this->lock = fopen($lockPath, 'c+b');
        if (!$this->lock || !flock($this->lock, LOCK_EX | LOCK_NB)) { throw new RuntimeException('Another transaction call holds this lock'); }
        $directory = $this->private . '/' . $plan['transactionId'];
        if (is_link($directory) || (file_exists($directory) && !is_dir($directory))) { throw new RuntimeException('Unsafe transaction directory'); }
        if (!is_dir($directory) && !mkdir($directory, 0700)) { throw new RuntimeException('Cannot create private transaction directory'); }
        $this->private = self::root($directory);
        $binding = hash('sha256', json_encode(array($this->source, $this->target, $this->private, $plan), JSON_THROW_ON_ERROR));
        $journalPath = $this->private . '/journal.json';
        $this->receiptHashes = array('plan.json' => self::digest($this->private . '/plan.json'), 'journal.json' => self::digest($journalPath));
        if (is_file($journalPath)) {
            $bytes = file_get_contents($journalPath);
            if ($bytes === false || hash('sha256', $bytes) !== $this->receiptHashes['journal.json']) { throw new RuntimeException('Journal changed while loading'); }
            $this->journal = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
            if (($this->journal['binding'] ?? null) !== $binding || !is_array($this->journal['intents'] ?? null) ||
                array_diff_key($this->journal['intents'], $plan['expected'])) { throw new RuntimeException('Transaction binding differs'); }
            foreach ($this->journal['intents'] as $name => $value) {
                if ($value !== true || $this->plan['expected'][$name] === ($this->plan['prior'][$name] ?? null)) { throw new RuntimeException('Invalid transaction intent'); }
            }
        } else {
            $this->journal = array('binding' => $binding, 'phase' => 'unprepared', 'intents' => array(), 'backups' => array(), 'events' => array());
        }
    }

    public function __destruct()
    {
        if (is_resource($this->lock)) { flock($this->lock, LOCK_UN); fclose($this->lock); }
    }

    private static function hashString($value): bool { return is_string($value) && preg_match('/^[a-f0-9]{64}$/D', $value) === 1; }
    private static function within(string $child, string $parent): bool { return str_starts_with(strtolower($child) . '/', strtolower($parent) . '/'); }

    private static function root(string $path): string
    {
        clearstatcache(true, $path);
        $real = realpath($path);
        if ($real === false || !is_dir($real)) { throw new RuntimeException('Existing absolute directory required'); }
        // Check both the supplied path and all resolved ancestors, including a symlink above the root.
        foreach (array($path, $real) as $candidate) {
            for ($p = $candidate; ; $p = dirname($p)) {
                clearstatcache(true, $p);
                if (is_link($p)) { throw new RuntimeException('Symlink root/ancestor rejected'); }
                if (dirname($p) === $p) { break; }
            }
        }
        return str_replace('\\', '/', $real);
    }

    private static function name($name, bool $activation = false): void
    {
        if (!is_string($name) || !preg_match('/^[A-Za-z0-9._\/-]+$/D', $name) || array_intersect(explode('/', $name), array('', '.', '..')) ||
            ($name !== self::RENDERER && !str_starts_with($name, self::ASSETS . '/') && !($activation && $name === self::ACTIVATION))) {
            throw new RuntimeException('Unowned or unsafe content path');
        }
    }

    private static function path(string $root, string $name, bool $make = false): string
    {
        if (self::root($root) !== $root) { throw new RuntimeException('Root changed during transaction'); }
        self::name($name, true);
        $parts = explode('/', $name);
        $directory = $root;
        foreach (array_slice($parts, 0, -1) as $part) {
            $directory .= '/' . $part;
            if (is_link($directory) || (file_exists($directory) && !is_dir($directory))) { throw new RuntimeException('Unsafe path ancestor'); }
            if (!is_dir($directory) && $make && !mkdir($directory, 0755)) { throw new RuntimeException('Cannot create dependency directory'); }
            if (is_dir($directory) && !self::within(self::root($directory), $root)) { throw new RuntimeException('Path escaped its root'); }
        }
        $path = $root . '/' . $name;
        if (is_link($path) || (file_exists($path) && !is_file($path))) { throw new RuntimeException('Unsafe content file'); }
        return $path;
    }

    private static function digest(string $path): ?string
    {
        clearstatcache(true, $path);
        if (is_link($path)) { throw new RuntimeException('Symlink file rejected'); }
        if (!file_exists($path)) { return null; }
        $hash = is_file($path) ? hash_file('sha256', $path) : false;
        if ($hash === false) { throw new RuntimeException('Unreadable content file'); }
        return $hash;
    }

    private function inventory(string $root, bool $activation): array
    {
        $result = array();
        $assets = $root . '/' . self::ASSETS;
        if (is_link($assets) || !is_dir($assets)) { throw new RuntimeException('Existing non-symlink content directory required'); }
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($assets, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST);
        foreach ($iterator as $file) {
            if ($file->isLink()) { throw new RuntimeException('Symlink content tree rejected'); }
            $name = self::ASSETS . '/' . str_replace('\\', '/', substr($file->getPathname(), strlen($assets) + 1));
            self::name($name);
            if (!$file->isDir()) { $result[$name] = self::digest(self::path($root, $name)); }
        }
        foreach ($activation ? array(self::RENDERER, self::ACTIVATION) : array(self::RENDERER) as $name) {
            $hash = self::digest(self::path($root, $name));
            if ($hash !== null) { $result[$name] = $hash; }
        }
        ksort($result);
        return $result;
    }

    private function protectedCheck(): void
    {
        if (self::root($this->private) !== $this->private) { throw new RuntimeException('Private transaction root changed'); }
        if (self::digest(self::path($this->target, self::ACTIVATION)) !== self::ACTIVATION_SHA || ($this->guard)() !== $this->plan['protectedStateSha256']) {
            throw new RuntimeException('Activation or protected state changed; no database restoration is allowed');
        }
    }

    private function preflight(bool $resume): array
    {
        $this->protectedCheck();
        if ($this->inventory($this->source, false) !== $this->plan['expected']) { throw new RuntimeException('Staging source drift'); }
        $actual = $this->inventory($this->target, true);
        if (array_diff_key($actual, $this->plan['expected'], array(self::ACTIVATION => true))) { throw new RuntimeException('Unknown target files require review'); }
        foreach ($this->plan['expected'] as $name => $hash) {
            $current = $actual[$name] ?? null;
            $prior = $this->plan['prior'][$name] ?? null;
            if ($current !== $prior && !($resume && isset($this->journal['intents'][$name]) && $current === $hash)) {
                throw new RuntimeException('Concurrent target change: ' . $name);
            }
            self::path($this->target, $name); // Validate missing-path ancestors before any application mutation.
        }
        return $actual;
    }

    private function writePrivate(string $name, string $bytes): void
    {
        if (!array_key_exists($name, $this->receiptHashes)) { throw new RuntimeException('Unknown private receipt'); }
        if (self::root($this->private) !== $this->private) { throw new RuntimeException('Private transaction root changed'); }
        $path = $this->private . '/' . $name;
        if (self::digest($path) !== $this->receiptHashes[$name]) { throw new RuntimeException('Private receipt changed concurrently'); }
        $area = $this->private . '/receipts';
        if (is_link($area) || (file_exists($area) && !is_dir($area))) { throw new RuntimeException('Unsafe private receipt directory'); }
        if (!is_dir($area) && !mkdir($area, 0700)) { throw new RuntimeException('Cannot create private receipt directory'); }
        $this->receiptArtifacts();
        $this->verifyReceiptArea($area);
        $temporary = $area . '/.ktk-receipt-' . substr($name, 0, -5) . '-' . bin2hex(random_bytes(16));
        $handle = fopen($temporary, 'x+b');
        if (!$handle) { throw new RuntimeException('Cannot exclusively create private receipt temporary'); }
        $hash = hash('sha256', $bytes);
        try {
            try {
                if (!chmod($temporary, 0600)) { throw new RuntimeException('Cannot restrict private receipt temporary'); }
                $this->observe('after-private-temporary-create', $name);
                if (fwrite($handle, $bytes) !== strlen($bytes) || !fflush($handle) || (function_exists('fsync') && !fsync($handle))) { throw new RuntimeException('Private receipt write failed'); }
            } finally { fclose($handle); }
            $this->observe('before-private-receipt-rename', $name);
            $this->verifyReceiptArea($area);
            if (self::digest($path) !== $this->receiptHashes[$name] ||
                self::digest($temporary) !== $hash) { throw new RuntimeException('Private receipt changed before commit'); }
            if (!rename($temporary, $path)) { throw new RuntimeException('Private receipt commit failed'); }
            $this->receiptHashes[$name] = $hash;
            $this->observe('after-private-receipt-rename', $name);
            if (self::digest($path) !== $hash) { throw new RuntimeException('Private receipt differs after commit'); }
        } finally {
            // Preserve unknown/partial evidence and never follow a swapped private root during cleanup.
            try {
                if (self::root($this->private) === $this->private && self::root($area) === $area && self::digest($temporary) === $hash) { unlink($temporary); }
            } catch (Throwable $error) { /* Retain uncertain private bytes without masking the original failure. */ }
        }
    }

    private function verifyReceiptArea(string $area): void
    {
        if (self::root($this->private) !== $this->private || self::root($area) !== $area) { throw new RuntimeException('Private receipt root changed'); }
        clearstatcache(true, $area); clearstatcache(true, $this->private);
        $a = stat($area); $b = stat($this->private);
        if ($a === false || $b === false || !isset($a['dev'], $b['dev']) || $a['dev'] !== $b['dev']) {
            throw new RuntimeException('Private receipts must share their destination filesystem');
        }
    }

    private function receiptArtifacts(): array
    {
        if (self::root($this->private) !== $this->private) { throw new RuntimeException('Private transaction root changed'); }
        $area = $this->private . '/receipts';
        if (is_link($area) || (file_exists($area) && !is_dir($area))) { throw new RuntimeException('Unsafe private receipt directory'); }
        if (!file_exists($area)) { return array(); }
        $result = array();
        foreach (new DirectoryIterator($area) as $file) {
            if ($file->isDot()) { continue; }
            if ($file->isLink() || !$file->isFile()) { throw new RuntimeException('Unsafe retained private receipt artifact'); }
            $result[$file->getFilename()] = array('sha256' => self::digest($file->getPathname()), 'bytes' => $file->getSize());
        }
        ksort($result);
        return $result;
    }

    private function save(string $phase, ?string $event = null): void
    {
        $this->journal['phase'] = $phase;
        if ($event !== null) { $this->journal['events'][] = $event; }
        $this->writePrivate('journal.json', json_encode($this->journal, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n");
    }

    private function observe(string $event, string $name = ''): void
    {
        if ($this->observer !== null) { ($this->observer)($event, $name); }
    }

    public function prepare(): array
    {
        if ($this->journal['phase'] !== 'unprepared') { throw new RuntimeException('Existing transaction must be inspected, not prepared again'); }
        if ($this->receiptHashes['plan.json'] !== null) { throw new RuntimeException('Existing private plan requires inspection, not preparation'); }
        $this->preflight(false);
        $required = array(self::ACTIVATION => self::ACTIVATION_SHA, self::RENDERER => $this->plan['prior'][self::RENDERER], self::ASSETS . '/registry.php' => $this->plan['prior'][self::ASSETS . '/registry.php']);
        foreach ($this->plan['expected'] as $name => $hash) {
            if (isset($this->plan['prior'][$name]) && $this->plan['prior'][$name] !== $hash) { $required[$name] = $this->plan['prior'][$name]; }
        }
        ksort($required);
        $backupRoot = $this->private . '/prior';
        if (file_exists($backupRoot) || !mkdir($backupRoot, 0700)) { throw new RuntimeException('Fresh private prior-file directory required'); }
        foreach ($required as $name => $hash) {
            $source = self::path($this->target, $name);
            $target = self::path($backupRoot, $name, true);
            if (!copy($source, $target) || !chmod($target, 0600) || self::digest($target) !== $hash || self::digest($source) !== $hash) { throw new RuntimeException('Prior-file backup mismatch'); }
        }
        $this->journal['backups'] = $required;
        $this->writePrivate('plan.json', json_encode($this->plan, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n");
        $this->preflight(false);
        $this->verifyBackup();
        $this->save('prepared', 'verified-prior-files-before-first-application-write');
        return $this->inspect();
    }

    /** Explicit recovery is limited to private preparation; ordinary prepare/apply/rollback guards are unchanged. */
    private function preparationBlueprint(): array
    {
        $required = array(self::ACTIVATION => self::ACTIVATION_SHA, self::RENDERER => $this->plan['prior'][self::RENDERER], self::ASSETS . '/registry.php' => $this->plan['prior'][self::ASSETS . '/registry.php']);
        foreach ($this->plan['expected'] as $name => $hash) {
            if (isset($this->plan['prior'][$name]) && $this->plan['prior'][$name] !== $hash) { $required[$name] = $this->plan['prior'][$name]; }
        }
        ksort($required);
        $pristine = array('binding' => $this->journal['binding'], 'phase' => 'unprepared', 'intents' => array(), 'backups' => array(), 'events' => array());
        $prepared = $pristine; $prepared['phase'] = 'prepared'; $prepared['backups'] = $required; $prepared['events'][] = 'verified-prior-files-before-first-application-write';
        if ($this->journal !== $pristine && $this->journal !== $prepared) { throw new RuntimeException('Only pristine or completed private preparation can be recovered'); }
        return array($required, $prepared, array('plan.json' => json_encode($this->plan, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n", 'journal.json' => json_encode($prepared, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n"));
    }

    private function preparationBytes(string $path, int $limit): string
    {
        $path = str_replace('\\', '/', $path);
        if (self::root($this->private) !== $this->private || self::root(dirname($path)) !== dirname($path)) { throw new RuntimeException('Private preparation root changed'); }
        clearstatcache(true, $path); $stat = lstat($path);
        if (is_link($path) || !is_file($path) || $stat === false || ($stat['nlink'] ?? 0) !== 1 || $stat['size'] > $limit) { throw new RuntimeException('Unsafe private preparation file preserved'); }
        $bytes = file_get_contents($path, false, null, 0, $limit + 1);
        if ($bytes === false || strlen($bytes) > $limit || self::digest($path) !== hash('sha256', $bytes)) { throw new RuntimeException('Private preparation file changed while reading'); }
        return $bytes;
    }

    public function inspectPreparation(): array
    {
        $this->preflight(false); [$required, $prepared, $records] = $this->preparationBlueprint();
        foreach (array('plan.json', 'journal.json') as $name) {
            if (self::digest($this->private . '/' . $name) !== $this->receiptHashes[$name]) { throw new RuntimeException('Active preparation receipt changed'); }
        }
        $allowedDirectories = array('prior' => true, 'receipts' => true);
        foreach (array_keys($required) as $name) {
            for ($directory = dirname('prior/' . $name); $directory !== '.'; $directory = dirname($directory)) { $allowedDirectories[$directory] = true; }
        }
        $files = array(); $directories = array(); $pending = array(); $bytesTotal = 0; $visited = 0;
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->private, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST);
        foreach ($iterator as $entry) {
            if (++$visited > 20000 || $entry->isLink()) { throw new RuntimeException('Unsafe or oversized private preparation tree preserved'); }
            $name = str_replace('\\', '/', substr($entry->getPathname(), strlen($this->private) + 1));
            if ($entry->isDir()) {
                if (!isset($allowedDirectories[$name]) || self::root($entry->getPathname()) !== str_replace('\\', '/', $entry->getPathname())) { throw new RuntimeException('Unknown private preparation directory preserved'); }
                $directories[$name] = true; continue;
            }
            if (!$entry->isFile()) { throw new RuntimeException('Unknown private preparation member preserved'); }
            $prefixAllowed = false;
            if (isset($records[$name])) { $expected = $records[$name]; }
            elseif (str_starts_with($name, 'prior/') && isset($required[substr($name, 6)])) {
                $logical = substr($name, 6); $source = self::path($this->target, $logical);
                if (filesize($source) > 16777216 || self::digest($source) !== $required[$logical]) { throw new RuntimeException('Original preparation source differs or exceeds budget'); }
                $expected = file_get_contents($source); if ($expected === false || hash('sha256', $expected) !== $required[$logical]) { throw new RuntimeException('Original preparation source changed'); }
                $prefixAllowed = $this->journal['phase'] === 'unprepared';
            } elseif (preg_match('/^receipts\/\.ktk-receipt-(plan|journal)-[a-f0-9]{32}$/D', $name, $match)) {
                $logical = $match[1] . '.json';
                if (isset($pending[$logical]) || $this->receiptHashes[$logical] !== null || $this->journal['phase'] !== 'unprepared') { throw new RuntimeException('Ambiguous private preparation receipt preserved'); }
                $pending[$logical] = $name; $expected = $records[$logical]; $prefixAllowed = true;
            } else { throw new RuntimeException('Unknown private preparation file preserved'); }
            $bytes = $this->preparationBytes($entry->getPathname(), strlen($expected));
            if ($bytes !== $expected && (!$prefixAllowed || !str_starts_with($expected, $bytes))) { throw new RuntimeException('Changed private preparation bytes preserved'); }
            $bytesTotal += strlen($bytes); if ($bytesTotal > 134217728) { throw new RuntimeException('Private preparation budget exceeded'); }
            $files[$name] = array('sha256' => hash('sha256', $bytes), 'bytes' => strlen($bytes));
        }
        ksort($files); ksort($directories); ksort($pending);
        if ($pending || $this->receiptHashes['plan.json'] !== null || $this->receiptHashes['journal.json'] !== null) {
            foreach ($required as $name => $hash) {
                if (($files['prior/' . $name]['sha256'] ?? null) !== $hash) { throw new RuntimeException('Private backup changed after preparation receipts started'); }
            }
        }
        if ($this->journal['phase'] === 'prepared') { $this->verifyBackup(); }
        $binding = array('binding' => $this->journal['binding'], 'files' => $files, 'directories' => array_keys($directories), 'phase' => $this->journal['phase']);
        return array('scope' => 'private-preparation-inspection', 'transactionId' => $this->plan['transactionId'], 'phase' => $this->journal['phase'], 'stateSha256' => hash('sha256', json_encode($binding, JSON_THROW_ON_ERROR)), 'files' => $files, 'directories' => array_keys($directories), 'pendingReceipts' => $pending, 'currentPriorInventoryVerified' => true, 'protectedStateVerified' => true, 'applicationWrites' => 0, 'activationWrites' => 0, 'databaseWrites' => 0, 'cachePurges' => 0);
    }

    private function completePreparationFile(string $path, string $expected, string $logical): void
    {
        $exists = file_exists($path) || is_link($path);
        $before = $exists ? $this->preparationBytes($path, strlen($expected)) : '';
        if (!str_starts_with($expected, $before)) { throw new RuntimeException('Changed private preparation prefix preserved'); }
        if ($exists && $before === $expected) { return; }
        if (self::root($this->private) !== $this->private || self::root(dirname($path)) !== dirname($path)) { throw new RuntimeException('Private preparation path changed'); }
        $handle = fopen($path, file_exists($path) ? 'r+b' : 'x+b');
        if (!$handle) { throw new RuntimeException('Cannot open known private preparation file'); }
        try {
            $this->observe('after-preparation-file-open', $logical); clearstatcache(true, $path); $held = fstat($handle); $current = lstat($path);
            if (self::root($this->private) !== $this->private || self::root(dirname($path)) !== dirname($path) || is_link($path) || $held === false || $current === false || $held['dev'] !== $current['dev'] || $held['ino'] !== $current['ino'] || ($held['nlink'] ?? 0) !== 1 || $this->preparationBytes($path, strlen($expected)) !== $before || !chmod($path, 0600) || fseek($handle, strlen($before)) !== 0) { throw new RuntimeException('Private preparation file identity changed'); }
            $offset = strlen($before);
            while ($offset < strlen($expected)) { $count = fwrite($handle, substr($expected, $offset)); if ($count === false || $count === 0) { throw new RuntimeException('Private preparation write interrupted'); } $offset += $count; }
            if (!fflush($handle) || (function_exists('fsync') && !fsync($handle))) { throw new RuntimeException('Private preparation flush failed'); }
        } finally { fclose($handle); }
        if ($this->preparationBytes($path, strlen($expected)) !== $expected) { throw new RuntimeException('Completed private preparation differs'); }
        $this->observe('after-preparation-file-complete', $logical);
    }

    private function completePreparationReceipt(string $name, string $expected, ?string $pending): void
    {
        if ($this->receiptHashes[$name] !== null) { if ($this->preparationBytes($this->private . '/' . $name, strlen($expected)) !== $expected) { throw new RuntimeException('Existing preparation receipt differs'); } return; }
        if ($pending === null) { $this->writePrivate($name, $expected); return; }
        $path = $this->private . '/' . $pending; $this->completePreparationFile($path, $expected, $pending);
        $this->observe('before-preparation-receipt-rename', $name);
        if (self::root($this->private) !== $this->private || self::root(dirname($path)) !== dirname($path) || self::digest($this->private . '/' . $name) !== null || $this->preparationBytes($path, strlen($expected)) !== $expected || !rename($path, $this->private . '/' . $name)) { throw new RuntimeException('Preparation receipt changed before commit'); }
        $this->receiptHashes[$name] = hash('sha256', $expected);
        $this->observe('after-preparation-receipt-rename', $name);
    }

    public function resumePreparation(string $stateSha256): array
    {
        $inspection = $this->inspectPreparation();
        if (!self::hashString($stateSha256) || !hash_equals($inspection['stateSha256'], $stateSha256)) { throw new RuntimeException('Stale preparation state; inspect before recovery'); }
        if ($inspection['phase'] === 'prepared') { return $this->inspect(); }
        [$required, $prepared, $records] = $this->preparationBlueprint();
        $backupRoot = $this->private . '/prior';
        if (!file_exists($backupRoot) && !mkdir($backupRoot, 0700)) { throw new RuntimeException('Cannot create known preparation backup root'); }
        if (self::root($backupRoot) !== $backupRoot) { throw new RuntimeException('Preparation backup root changed'); }
        foreach ($required as $name => $hash) {
            $this->inspectPreparation(); $source = self::path($this->target, $name);
            if (filesize($source) > 16777216 || self::digest($source) !== $hash) { throw new RuntimeException('Preparation prior source changed or exceeds budget'); }
            $bytes = file_get_contents($source); if ($bytes === false || hash('sha256', $bytes) !== $hash) { throw new RuntimeException('Preparation prior read differs'); }
            $this->completePreparationFile(self::path($backupRoot, $name, true), $bytes, 'prior/' . $name);
        }
        $inspection = $this->inspectPreparation(); $this->completePreparationReceipt('plan.json', $records['plan.json'], $inspection['pendingReceipts']['plan.json'] ?? null);
        $this->preflight(false); $this->journal['backups'] = $required; $this->verifyBackup();
        $this->completePreparationReceipt('journal.json', $records['journal.json'], $inspection['pendingReceipts']['journal.json'] ?? null);
        $this->journal = $prepared; $this->preflight(false); $this->verifyBackup(); return $this->inspect();
    }

    private function verifyBackup(): void
    {
        if (self::root($this->private) !== $this->private) { throw new RuntimeException('Private transaction root changed'); }
        $required = array(self::ACTIVATION => self::ACTIVATION_SHA, self::RENDERER => $this->plan['prior'][self::RENDERER], self::ASSETS . '/registry.php' => $this->plan['prior'][self::ASSETS . '/registry.php']);
        foreach ($this->plan['expected'] as $name => $hash) {
            if (isset($this->plan['prior'][$name]) && $this->plan['prior'][$name] !== $hash) { $required[$name] = $this->plan['prior'][$name]; }
        }
        ksort($required);
        if (is_link($this->private . '/plan.json') || $this->journal['backups'] !== $required || json_decode(file_get_contents($this->private . '/plan.json'), true, 512, JSON_THROW_ON_ERROR) !== $this->plan) { throw new RuntimeException('Backup manifest differs'); }
        foreach ($required as $name => $hash) {
            if (self::digest(self::path($this->private . '/prior', $name)) !== $hash) { throw new RuntimeException('Prior-file backup is not intact'); }
        }
    }

    private static function order(array $names): array
    {
        usort($names, static function ($a, $b) {
            $rank = static fn($name) => $name === self::RENDERER ? 2 : ($name === self::ASSETS . '/registry.php' ? 1 : 0);
            return ($rank($a) <=> $rank($b)) ?: strcmp($a, $b);
        });
        return $names;
    }

    private function atomicCopy(string $from, string $name, string $hash, ?string $current): void
    {
        $target = self::path($this->target, $name, true);
        $directory = dirname($target);
        $pending = $this->temporaryArea($directory);
        // Exclusive creation has no tempnam fallback to a different directory.
        $temporary = $pending . '/.ktk-content-' . bin2hex(random_bytes(16));
        $handle = @fopen($temporary, 'x+b');
        if ($handle === false) { throw new RuntimeException('Cannot create private dependency temporary file'); }
        try {
            if (!fclose($handle) || !chmod($temporary, 0600)) { throw new RuntimeException('Cannot secure private dependency temporary'); }
            $this->observe('after-temporary-create', $name);
            if (!copy($from, $temporary) || self::digest($temporary) !== $hash || !chmod($temporary, 0644)) { throw new RuntimeException('Temporary copy verification failed'); }
            $this->observe('before-rename', $name);
            $this->protectedCheck();
            $this->temporaryArea($directory);
            self::root(dirname($from));
            if (self::digest(self::path($this->target, $name)) !== $current || self::digest($from) !== $hash || self::digest($temporary) !== $hash) { throw new RuntimeException('Source, target or private temporary changed during copying'); }
            // Atomic replacement, with an immediate compare-before-write. External writers must be excluded by the release window.
            if (!rename($temporary, $target)) { throw new RuntimeException('Atomic dependency replacement failed'); }
            $this->replacementPerformed = true;
            if (str_ends_with($name, '.php') && function_exists('opcache_invalidate')) { @opcache_invalidate($target, true); }
            $this->observe('after-rename', $name);
            if (self::digest(self::path($this->target, $name)) !== $hash) { throw new RuntimeException('Final dependency mismatch'); }
        } finally {
            if (is_resource($handle)) { fclose($handle); }
            // An unclean exit can retain a private diagnostic artifact. Never
            // leave an unknown temporary in the public owned-file inventory or
            // follow a swapped private root to clean up somebody else's file.
            try {
                if (self::root($this->private) === $this->private && self::root($pending) === $pending && self::digest($temporary) === $hash) { unlink($temporary); }
            } catch (Throwable $error) { /* Retain uncertain private bytes for inspection. */ }
        }
    }

    private function temporaryArea(string $destination): string
    {
        if (self::root($this->private) !== $this->private) { throw new RuntimeException('Private transaction root changed'); }
        $pending = $this->private . '/pending';
        if (is_link($pending) || (file_exists($pending) && !is_dir($pending))) { throw new RuntimeException('Unsafe private temporary directory'); }
        if (!is_dir($pending) && !mkdir($pending, 0700)) { throw new RuntimeException('Cannot create private temporary directory'); }
        $pending = self::root($pending);
        $this->temporaryArtifacts(); // Unknown/symlink entries must stop before a replacement.
        clearstatcache(true, $pending); clearstatcache(true, $destination);
        $a = stat($pending); $b = stat($destination);
        if ($a === false || $b === false || !isset($a['dev'], $b['dev']) || $a['dev'] !== $b['dev'] ||
            (preg_match('/^[A-Za-z]:\//', $pending) && strcasecmp(substr($pending, 0, 2), substr($destination, 0, 2)) !== 0)) {
            throw new RuntimeException('Private temporary and destination must share one filesystem');
        }
        return $pending;
    }

    private function temporaryArtifacts(): array
    {
        if (self::root($this->private) !== $this->private) { throw new RuntimeException('Private root changed'); }
        $pending = $this->private . '/pending';
        if (!file_exists($pending) && !is_link($pending)) { return array(); }
        if (self::root($pending) !== $pending) { throw new RuntimeException('Unsafe private temporary directory'); }
        $result = array();
        foreach (new DirectoryIterator($pending) as $file) {
            if ($file->isDot()) { continue; }
            if ($file->isLink() || !$file->isFile()) { throw new RuntimeException('Unknown private temporary entry'); }
            $result[$file->getFilename()] = array('sha256' => self::digest($file->getPathname()), 'bytes' => $file->getSize());
        }
        ksort($result);
        return $result;
    }

    private static function stepLimit($limit): void
    {
        if ($limit !== null && (!is_int($limit) || $limit < 1 || $limit > 100)) { throw new RuntimeException('Step limit must be an integer from 1 to 100, or null'); }
    }

    private function rollbackOrder(): array
    {
        $existing = array(); $introduced = array();
        foreach (array_keys($this->journal['intents']) as $name) {
            if (isset($this->plan['prior'][$name])) { $existing[] = $name; } else { $introduced[] = $name; }
        }
        // Restore prior definitions before removing dependencies introduced by the newer definitions.
        return array_merge(self::order($existing), self::order($introduced));
    }

    public function apply($limit = null): array
    {
        self::stepLimit($limit);
        if (!in_array($this->journal['phase'], array('prepared', 'applying', 'uncertain', 'applied'), true)) { throw new RuntimeException('Prepared recoverable transaction required'); }
        $this->verifyBackup();
        $this->preflight(true);
        $this->save('applying');
        $steps = 0; $boundedStop = false;
        try {
            foreach (self::order(array_keys($this->plan['expected'])) as $name) {
                $hash = $this->plan['expected'][$name];
                $current = self::digest(self::path($this->target, $name));
                if ($current === $hash) {
                    if ($hash !== ($this->plan['prior'][$name] ?? null) && !isset($this->journal['intents'][$name])) { throw new RuntimeException('Unowned concurrent installation'); }
                    continue;
                }
                if ($limit !== null && $steps >= $limit) { $boundedStop = true; break; }
                $this->protectedCheck();
                if ($current !== ($this->plan['prior'][$name] ?? null)) { throw new RuntimeException('Concurrent target change before intent'); }
                $this->journal['intents'][$name] = true;
                $this->save('applying', 'intent:' . $name);
                $this->replacementPerformed = false;
                try {
                    $this->atomicCopy(self::path($this->source, $name), $name, $hash, $current);
                } catch (Throwable $error) {
                    if (!$this->replacementPerformed) {
                        unset($this->journal['intents'][$name]);
                        $this->save('applying', 'cancelled-before-replacement:' . $name);
                    }
                    throw $error;
                }
                $this->save('applying', 'installed:' . $name);
                $steps++;
            }
            $actual = $this->preflight(true);
            $expected = $this->plan['expected'] + array(self::ACTIVATION => self::ACTIVATION_SHA); ksort($expected);
            if (!$boundedStop) {
                if ($actual !== $expected) { throw new RuntimeException('Final complete inventories differ'); }
                $this->save('applied', 'complete-owned-hashes-and-protected-state-verified');
            }
        } catch (Throwable $error) {
            $this->save('uncertain', 'interruption-inspect-before-recovery');
            throw $error;
        }
        return $this->inspect();
    }

    private function rollbackInventory(): array
    {
        $this->protectedCheck();
        // Rollback does not require staging to remain unchanged, but every target must be ours before the first restoration.
        $actual = $this->inventory($this->target, true);
        if (array_diff_key($actual, $this->plan['expected'], array(self::ACTIVATION => true))) { throw new RuntimeException('Unknown target prevents rollback'); }
        foreach ($this->plan['expected'] as $name => $hash) {
            $current = $actual[$name] ?? null; $prior = $this->plan['prior'][$name] ?? null;
            if ($current !== $prior && !(isset($this->journal['intents'][$name]) && $current === $hash)) { throw new RuntimeException('Concurrent target prevents rollback: ' . $name); }
        }
        return $actual;
    }

    public function rollback($limit = null): array
    {
        self::stepLimit($limit);
        if (!in_array($this->journal['phase'], array('prepared', 'applying', 'uncertain', 'applied', 'rolling-back'), true)) { throw new RuntimeException('Recoverable transaction required'); }
        $this->verifyBackup();
        $this->rollbackInventory();
        $this->save('rolling-back');
        $steps = 0; $boundedStop = false;
        foreach ($this->rollbackOrder() as $name) {
            $this->protectedCheck();
            $prior = $this->plan['prior'][$name] ?? null;
            $current = self::digest(self::path($this->target, $name));
            if ($current === $prior) { continue; }
            if ($limit !== null && $steps >= $limit) { $boundedStop = true; break; }
            if ($current !== $this->plan['expected'][$name]) { throw new RuntimeException('Concurrent target during rollback'); }
            if ($prior !== null) {
                $this->atomicCopy(self::path($this->private . '/prior', $name), $name, $prior, $current);
            } else {
                $this->observe('before-delete', $name);
                $this->protectedCheck();
                $path = self::path($this->target, $name);
                if (self::digest($path) !== $current || !unlink($path)) { throw new RuntimeException('New-file removal refused'); }
            }
            $this->save('rolling-back', 'restored:' . $name);
            $steps++;
        }
        $actual = $this->rollbackInventory();
        if (!$boundedStop) {
            if ($actual !== $this->plan['prior']) { throw new RuntimeException('Restored inventory mismatch'); }
            $this->save('rolled-back', 'exact-prior-inventory-and-retained-activation-verified');
        }
        return $this->inspect();
    }

    public function inspect(): array
    {
        $backupVerified = false;
        try { if ($this->journal['phase'] !== 'unprepared') { $this->verifyBackup(); $backupVerified = true; } } catch (Throwable $error) { /* Expose uncertainty, never repair during inspection. */ }
        $protectedVerified = false;
        try { $this->protectedCheck(); $protectedVerified = true; } catch (Throwable $error) { /* Actual file inventory still helps manual recovery. */ }
        $temporaryVerified = false; $temporaryArtifacts = null;
        try { $temporaryArtifacts = $this->temporaryArtifacts(); $temporaryVerified = true; } catch (Throwable $error) { /* Expose private uncertainty without speculative cleanup. */ }
        $receiptVerified = false; $receiptArtifacts = null;
        try { $receiptArtifacts = $this->receiptArtifacts(); $receiptVerified = true; } catch (Throwable $error) { /* Retain unsafe private evidence. */ }
        $actual = $this->inventory($this->target, true);
        $expected = $this->plan['expected'] + array(self::ACTIVATION => self::ACTIVATION_SHA); ksort($expected);
        $pendingApply = array(); $pendingRollback = array();
        foreach (self::order(array_keys($this->plan['expected'])) as $name) { if (($actual[$name] ?? null) !== $this->plan['expected'][$name]) { $pendingApply[] = $name; } }
        foreach ($this->rollbackOrder() as $name) { if (($actual[$name] ?? null) !== ($this->plan['prior'][$name] ?? null)) { $pendingRollback[] = $name; } }
        return array('transactionId' => $this->plan['transactionId'], 'phase' => $this->journal['phase'], 'actual' => $actual,
            'currentExpectedInventoryVerified' => $actual === $expected, 'currentPriorInventoryVerified' => $actual === $this->plan['prior'],
            'intentFiles' => array_keys($this->journal['intents']), 'backupVerified' => $backupVerified, 'protectedStateVerified' => $protectedVerified,
            'verifiedBackupFiles' => $backupVerified ? count($this->journal['backups']) : 0,
            'privateTemporaryInspectionVerified' => $temporaryVerified, 'retainedPrivateTemporaryArtifacts' => $temporaryArtifacts,
            'privateReceiptInspectionVerified' => $receiptVerified, 'retainedPrivateReceiptArtifacts' => $receiptArtifacts,
            'pendingApplyFiles' => $pendingApply, 'pendingRollbackFiles' => $pendingRollback,
            'activationWrites' => 0, 'databaseWrites' => 0, 'cachePurges' => 0, 'events' => $this->journal['events']);
    }
}
