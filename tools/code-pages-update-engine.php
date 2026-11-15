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
        if (is_link($journalPath)) { throw new RuntimeException('Unsafe journal'); }
        if (is_file($journalPath)) {
            $this->journal = json_decode(file_get_contents($journalPath), true, 512, JSON_THROW_ON_ERROR);
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
        if (self::root($this->private) !== $this->private) { throw new RuntimeException('Private transaction root changed'); }
        $path = $this->private . '/' . $name;
        if (is_link($path)) { throw new RuntimeException('Unsafe private file'); }
        $temporary = tempnam($this->private, '.ktk-journal-');
        if ($temporary === false) { throw new RuntimeException('Cannot create private temporary file'); }
        try {
            $handle = fopen($temporary, 'wb');
            if (!$handle) { throw new RuntimeException('Cannot open private temporary file'); }
            try {
                if (fwrite($handle, $bytes) !== strlen($bytes) || !fflush($handle) || (function_exists('fsync') && !fsync($handle))) { throw new RuntimeException('Private receipt write failed'); }
            } finally { fclose($handle); }
            if (!chmod($temporary, 0600) || !rename($temporary, $path)) { throw new RuntimeException('Private receipt commit failed'); }
        } finally { if (is_file($temporary)) { unlink($temporary); } }
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
        $temporary = tempnam($directory, '.ktk-content-');
        if ($temporary === false) { throw new RuntimeException('Cannot create dependency temporary file'); }
        try {
            if (!copy($from, $temporary) || self::digest($temporary) !== $hash || !chmod($temporary, 0644)) { throw new RuntimeException('Temporary copy verification failed'); }
            $this->observe('before-rename', $name);
            $this->protectedCheck();
            self::root(dirname($from));
            if (self::digest(self::path($this->target, $name)) !== $current || self::digest($from) !== $hash) { throw new RuntimeException('Source or target changed during copying'); }
            // Atomic replacement, with an immediate compare-before-write. External writers must be excluded by the release window.
            if (!rename($temporary, $target)) { throw new RuntimeException('Atomic dependency replacement failed'); }
            $this->replacementPerformed = true;
            if (str_ends_with($name, '.php') && function_exists('opcache_invalidate')) { @opcache_invalidate($target, true); }
            $this->observe('after-rename', $name);
            if (self::digest(self::path($this->target, $name)) !== $hash) { throw new RuntimeException('Final dependency mismatch'); }
        } finally { if (is_file($temporary)) { unlink($temporary); } }
    }

    public function apply(): array
    {
        if (!in_array($this->journal['phase'], array('prepared', 'applying', 'uncertain', 'applied'), true)) { throw new RuntimeException('Prepared recoverable transaction required'); }
        $this->verifyBackup();
        $this->preflight(true);
        $this->save('applying');
        try {
            foreach (self::order(array_keys($this->plan['expected'])) as $name) {
                $hash = $this->plan['expected'][$name];
                $current = self::digest(self::path($this->target, $name));
                if ($current === $hash) {
                    if ($hash !== ($this->plan['prior'][$name] ?? null) && !isset($this->journal['intents'][$name])) { throw new RuntimeException('Unowned concurrent installation'); }
                    continue;
                }
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
            }
            $this->protectedCheck();
            $expected = $this->plan['expected'] + array(self::ACTIVATION => self::ACTIVATION_SHA); ksort($expected);
            if ($this->inventory($this->target, true) !== $expected || $this->inventory($this->source, false) !== $this->plan['expected']) { throw new RuntimeException('Final complete inventories differ'); }
            $this->save('applied', 'complete-owned-hashes-and-protected-state-verified');
        } catch (Throwable $error) {
            $this->save('uncertain', 'interruption-inspect-before-recovery');
            throw $error;
        }
        return $this->inspect();
    }

    public function rollback(): array
    {
        if (!in_array($this->journal['phase'], array('prepared', 'applying', 'uncertain', 'applied', 'rolling-back'), true)) { throw new RuntimeException('Recoverable transaction required'); }
        $this->verifyBackup();
        $this->protectedCheck();
        // Rollback does not require staging to remain unchanged, but every target must be ours before the first restoration.
        $actual = $this->inventory($this->target, true);
        if (array_diff_key($actual, $this->plan['expected'], array(self::ACTIVATION => true))) { throw new RuntimeException('Unknown target prevents rollback'); }
        foreach ($this->plan['expected'] as $name => $hash) {
            $current = $actual[$name] ?? null; $prior = $this->plan['prior'][$name] ?? null;
            if ($current !== $prior && !(isset($this->journal['intents'][$name]) && $current === $hash)) { throw new RuntimeException('Concurrent target prevents rollback: ' . $name); }
        }
        $this->save('rolling-back');
        foreach (self::order(array_keys($this->journal['intents'])) as $name) {
            $this->protectedCheck();
            $prior = $this->plan['prior'][$name] ?? null;
            $current = self::digest(self::path($this->target, $name));
            if ($current === $prior) { continue; }
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
        }
        $this->protectedCheck();
        if ($this->inventory($this->target, true) !== $this->plan['prior']) { throw new RuntimeException('Restored inventory mismatch'); }
        $this->save('rolled-back', 'exact-prior-inventory-and-retained-activation-verified');
        return $this->inspect();
    }

    public function inspect(): array
    {
        $backupVerified = false;
        try { if ($this->journal['phase'] !== 'unprepared') { $this->verifyBackup(); $backupVerified = true; } } catch (Throwable $error) { /* Expose uncertainty, never repair during inspection. */ }
        $protectedVerified = false;
        try { $this->protectedCheck(); $protectedVerified = true; } catch (Throwable $error) { /* Actual file inventory still helps manual recovery. */ }
        $actual = $this->inventory($this->target, true);
        $expected = $this->plan['expected'] + array(self::ACTIVATION => self::ACTIVATION_SHA); ksort($expected);
        return array('transactionId' => $this->plan['transactionId'], 'phase' => $this->journal['phase'], 'actual' => $actual,
            'currentExpectedInventoryVerified' => $actual === $expected, 'currentPriorInventoryVerified' => $actual === $this->plan['prior'],
            'intentFiles' => array_keys($this->journal['intents']), 'backupVerified' => $backupVerified, 'protectedStateVerified' => $protectedVerified,
            'verifiedBackupFiles' => $backupVerified ? count($this->journal['backups']) : 0,
            'activationWrites' => 0, 'databaseWrites' => 0, 'cachePurges' => 0, 'events' => $this->journal['events']);
    }
}
