"""Compile a noncreating, inspection-only private engine from the frozen kernel.

No source mutation, network, authority renewal or default-engine rewrite.
"""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'tools/code-pages-update-engine.php'
SOURCE_SHA256 = '9d70440db6f2aa496dd3e65326525db6e1e746882233c34c3208b7214293eba5'


def read_only_source(source=None):
    raw = SOURCE.read_bytes() if source is None else source
    if not isinstance(raw, bytes) or hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('Exact frozen engine required for read-only private compilation')
    lock_before = b"""        $this->lock = fopen($lockPath, 'c+b');
        if (!$this->lock || !flock($this->lock, LOCK_EX | LOCK_NB)) { throw new RuntimeException('Another transaction call holds this lock'); }"""
    lock_after = b"""        clearstatcache(true,$lockPath);$readOnlyBefore=@lstat($lockPath);
        if(is_link($lockPath)||!is_file($lockPath)||$readOnlyBefore===false||($readOnlyBefore['nlink']??0)!==1||$readOnlyBefore['size']!==0){throw new RuntimeException('Existing empty read-only engine lock required');}
        $this->lock=@fopen($lockPath,'r+b');
        if(!$this->lock||!flock($this->lock,LOCK_EX|LOCK_NB)){if(is_resource($this->lock)){fclose($this->lock);}$this->lock=null;throw new RuntimeException('Existing read-only engine lock cannot be held');}
        $readOnlyHeld=fstat($this->lock);clearstatcache(true,$lockPath);$readOnlyCurrent=@lstat($lockPath);
        if($readOnlyHeld===false||$readOnlyCurrent===false||is_link($lockPath)||$readOnlyHeld['dev']!==$readOnlyBefore['dev']||$readOnlyHeld['ino']!==$readOnlyBefore['ino']||$readOnlyHeld['size']!==0||($readOnlyHeld['nlink']??0)!==1||$readOnlyCurrent['dev']!==$readOnlyBefore['dev']||$readOnlyCurrent['ino']!==$readOnlyBefore['ino']||$readOnlyCurrent['size']!==0||($readOnlyCurrent['nlink']??0)!==1){fclose($this->lock);$this->lock=null;throw new RuntimeException('Held read-only engine lock changed');}"""
    directory_before = b"        if (!is_dir($directory) && !mkdir($directory, 0700)) { throw new RuntimeException('Cannot create private transaction directory'); }"
    directory_after = b"        if (!is_dir($directory)) { throw new RuntimeException('Existing private transaction directory required for read-only inspection'); }"
    changes = [
        (b'final class KTK_Active_Content_Transaction\n{', b"""final class KTK_Read_Only_Private_Engine
{
    public function borrowReadOnlyEngineLock()
    {
        if(!is_resource($this->lock)){throw new RuntimeException('Existing held read-only engine lock required');}
        return $this->lock;
    }
"""),
        (lock_before, lock_after), (directory_before, directory_after),
    ]
    methods = [
        (b'    public function prepare(): array', b'\n    private function preparationBlueprint(): array', b'prepare'),
        (b'    public function resumePreparation(string $stateSha256): array', b'\n    private function verifyBackup(): void', b'resumePreparation'),
        (b'    public function apply($limit = null): array', b'\n    private function rollbackInventory(): array', b'apply'),
        (b'    public function rollback($limit = null): array', b'\n    public function inspect(): array', b'rollback'),
    ]
    for signature, following, name in methods:
        if raw.count(signature) != 1 or raw.count(following) != 1:
            raise ValueError('Exact frozen engine method boundaries required')
        start = raw.index(signature);end = raw.index(following, start)
        before = raw[start:end]
        after = signature+b"\n    {\n        throw new RuntimeException('"+name+b" unavailable in read-only private profile');\n    }\n"
        changes.append((before, after))
    if any(raw.count(a) != 1 for a, _ in changes):
        raise ValueError('Exact read-only engine anchors required before compilation')
    result = raw
    for before, after in changes:
        result = result.replace(before, after, 1)
    inverse = result
    for before, after in reversed(changes):
        if inverse.count(after) != 1:
            raise ValueError('Exact read-only engine inverse required')
        inverse = inverse.replace(after, before, 1)
    if inverse != raw:
        raise ValueError('Original engine must remain byte-exact')
    return result
