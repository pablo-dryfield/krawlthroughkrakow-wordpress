"""Local candidate: derive a staging-only capture from the immutable raw core.

No caller uses this candidate yet. The production builder/raw core stay exact.
Every invocation still reads and hashes the whole current file; no digest cache.
"""
from pathlib import Path
import argparse
import hashlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tools/staging-protected-state-core.php'
TARGET = ROOT / 'tools/staging-protected-state-fast-core.php'
SOURCE_SHA = '223b28dab84918a42a23e750a77dcf85a90ac49bcfb0ee2ec9bc7ceea60844fb'
BLOCK = r'''    // Read-only SHA256 acceleration; complete bytes, bounded memory, original fallback.
    $hashCurrentFile = static function (string $path, $size) {
        if (PHP_INT_SIZE < 8 || !function_exists('openssl_digest') || !is_int($size) || $size < 0 || $size > 33554432) {
            return hash_file('sha256', $path);
        }
        $setting = strtoupper(trim((string)ini_get('memory_limit')));
        if (preg_match('/^([0-9]{1,9})([KMG]?)$/D', $setting, $parts) !== 1) {
            return hash_file('sha256', $path);
        }
        $unit = array('' => 1, 'K' => 1024, 'M' => 1048576, 'G' => 1073741824)[$parts[2]];
        $limit = (int)$parts[1] * $unit;
        if ($limit < 1 || memory_get_usage(true) + 2 * $size + 16777216 > $limit) {
            return hash_file('sha256', $path);
        }
        $bytes = @file_get_contents($path, false, null, 0, $size + 1);
        if (is_string($bytes) && strlen($bytes) === $size) {
            $digest = @openssl_digest($bytes, 'sha256');
            unset($bytes);
            if (is_string($digest) && preg_match('/^[a-f0-9]{64}$/D', $digest) === 1) { return $digest; }
        }
        return hash_file('sha256', $path);
    };
'''


def changes():
    return [
        ('Read-only staging state capture.', 'Derived staging-only state capture with bounded same-SHA256 hashing.'),
        ('    $walk = static function (string $directory, string $label) use ($root, $helperPath, &$owned, &$protected): void {', BLOCK + '    $walk = static function (string $directory, string $label) use ($root, $helperPath, &$owned, &$protected, $hashCurrentFile): void {'),
        ("            $hash = hash_file('sha256', $file->getPathname());", "            $hash = $hashCurrentFile($file->getPathname(), $file->getSize());"),
    ]


def render(source):
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA:
        raise ValueError('Immutable reviewed capture changed; no implicit scope update')
    text = source.decode('utf-8')
    for old, new in changes():
        if text.count(old) != 1: raise ValueError('Exact complete capture anchor required')
        text = text.replace(old, new, 1)
    return text.encode('utf-8')


def inverse(candidate):
    text = candidate.decode('utf-8')
    for old, new in reversed(changes()):
        if text.count(new) != 1: raise ValueError('Exact bounded capture inverse required')
        text = text.replace(new, old, 1)
    result = text.encode('utf-8')
    if hashlib.sha256(result).hexdigest() != SOURCE_SHA:
        raise ValueError('Capture changed outside the bounded hash implementation')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    source = SOURCE.read_bytes(); candidate = render(source)
    if inverse(candidate) != source: raise ValueError('Complete original scope inverse required')
    if args.write: TARGET.write_bytes(candidate)
    elif not TARGET.is_file() or TARGET.read_bytes() != candidate: raise ValueError('Derived local candidate differs')
    print('Staging-only candidate/inverse exact; no caller integration, credentials, network or publication.')


if __name__ == '__main__': main()
