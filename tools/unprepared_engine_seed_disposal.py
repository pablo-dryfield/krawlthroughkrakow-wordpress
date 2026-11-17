"""Separate fresh-witness disposal of incomplete seeds with an exactly empty engine root.

The default disposal, stream, store, capture and engine sources remain unchanged.
This profile never prepares an engine or resumes a copy, and cannot write public data.
"""
from __future__ import annotations

import os
import time

from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import early_private_entry as early
from tools import full_private_engine_recovery as original
from tools import private_seed_disposal as legacy

ROOT = backup.ROOT
SCOPE = 'witnessed-unprepared-engine-seed-disposal'
MAGIC = b'KTK-DPAPI-UNPREPARED-ENGINE-SEED-DISPOSAL-1\n'
FIELDS = legacy.FIELDS | {'entryProfile', 'originalToolingCommit'}

ENGINE_INSPECTION = b'''
        $emptyEngine=$store->privateRoot().'/engine';
        if(file_exists($emptyEngine)||is_link($emptyEngine)){
            self::directory($emptyEngine);
            if(array_values(array_diff(scandir($emptyEngine),array('.','..')))!==array()){throw new RuntimeException('Only an exactly empty unprepared engine directory may be disposed');}
        }elseif($closed===null||file_exists($store->privateRoot().'/source')||is_link($store->privateRoot().'/source')||file_exists($store->privateRoot().'/target')||is_link($store->privateRoot().'/target')){
            throw new RuntimeException('Missing unprepared engine directory before terminal disposal');
        }
'''

ENGINE_REMOVAL = b'''    private function finishEmptyEngine(KTK_Content_Update_Private_Store $store,array $operation): array
    {
        $root=$store->privateRoot();
        if(file_exists($root.'/source')||is_link($root.'/source')||file_exists($root.'/target')||is_link($root.'/target')){return $operation;}
        $engine=$root.'/engine';
        if(!file_exists($engine)&&!is_link($engine)){return $operation;}
        $this->guard();self::directory($engine);$store->rootBinding();$before=lstat($engine);
        if(array_values(array_diff(scandir($engine),array('.','..')))!==array()){throw new RuntimeException('Unknown engine artifacts preserved after payload disposal');}
        if($this->observer!==null){($this->observer)('before-empty-engine-rmdir','engine',$engine);}
        $store->rootBinding();self::directory($engine);clearstatcache(true,$engine);$after=lstat($engine);
        if($before===false||$after===false||$before['dev']!==$after['dev']||$before['ino']!==$after['ino']||array_values(array_diff(scandir($engine),array('.','..')))!==array()||$operation['payloadDirectoriesRemoved']>=256||!rmdir($engine)){throw new RuntimeException('Changed empty engine directory preserved');}
        $operation['payloadDirectoriesRemoved']++;
        if($this->observer!==null){($this->observer)('after-empty-engine-rmdir','engine',$engine);}
        return $operation;
    }
'''


def controller_source():
    """Apply a reversible, exact overlay to the private-only disposal component."""
    source = (ROOT / 'tools/private-seed-disposal.php').read_bytes()
    if not source.startswith(b'<?php\n'):
        raise ValueError('Exact legacy private disposal source required')
    changes = [
        (b"array('owner.marker','controller.lock','control','source','target')",
         b"array('owner.marker','controller.lock','control','source','target','engine')"),
        (b"$closed=$store->read('closed.json');",
         b"$closed=$store->read('closed.json');" + ENGINE_INSPECTION),
        (b'if($removed>=256){break;}', b'if($removed>=255){break;}'),
        (b"$operation=$this->cleanup($store,$state['seed']);",
         b"$operation=$this->cleanup($store,$state['seed']);$operation=$this->finishEmptyEngine($store,$operation);"),
        (b'    public function run(', ENGINE_REMOVAL + b'    public function run('),
    ]
    before = source
    for old, new in changes:
        if source.count(old) != 1 or new in source:
            raise ValueError('Exact unprepared-engine disposal overlay boundary required')
        source = source.replace(old, new, 1)
    recovered = source
    for old, new in reversed(changes):
        if recovered.count(new) != 1:
            raise ValueError('Exact private disposal inverse required')
        recovered = recovered.replace(new, old, 1)
    if recovered != before:
        raise ValueError('Every legacy disposal byte must survive the private profile')
    return source


def legacy_packet(value):
    """Internal protocol projection; it is never persisted as a legacy context."""
    return {key: ('witnessed-private-seed-disposal' if key == 'scope' else value[key])
            for key in legacy.FIELDS}


def validate_packet(value, now=None):
    if (not isinstance(value, dict) or set(value) != FIELDS
            or value.get('scope') != SCOPE or value.get('entryProfile') != 'early'
            or not backup.identifier(value.get('originalToolingCommit'), 40)):
        raise ValueError('Exact distinct early unprepared-engine disposal context required')
    legacy.validate_packet(legacy_packet(value), now)
    if len(backup.encode(value)) > crypto.LIMIT:
        raise ValueError('Bounded distinct disposal context required')
    return value


def validate_original_binding(value, old):
    original.validate_packet(old)
    if (value['originalToolingCommit'] != old['toolingCommit']
            or value['transactionId'] != old['transactionId']
            or value['applicationCommit'] != old['applicationCommit']
            or value['disposalId'] == old['transactionId'] or value['token'] == old['token']):
        raise ValueError('Exact original engine identity/provenance required')


def helper_source(value, old, manifest):
    validate_packet(value, time.time())
    validate_original_binding(value, old)
    source = legacy.helper_source(legacy_packet(value), old, manifest)
    before = (ROOT / 'tools/private-seed-disposal.php').read_bytes()[6:]
    after = controller_source()[6:]
    if source.count(before) != 1:
        raise ValueError('Exact private disposal component embedding required')
    source = source.replace(before, after, 1)
    # The legacy disposal gate has compact whitespace. Keep its final bytes exact,
    # while presenting the existing rebinder with its one reviewed return spelling.
    start = source.index(b'    if(time()>=')
    end = source.index(b'\n', start) + 1
    gate = source[start:end]
    if gate.count(b'{return;}') != 1 or b'hash_equals(' not in gate:
        raise ValueError('Exact legacy disposal authentication return gate required')
    spaced = gate.replace(b'{return;}', b'{ return; }', 1)
    source = early.rebind(source[:start] + spaced + source[end:])
    if source.count(spaced) != 1:
        raise ValueError('Exact disposal gate must survive early binding')
    source = source.replace(spaced, gate, 1)
    inverse = source.replace(early.GUARD, b'', 1).replace(early.EARLY_HOOK, early.OLD_HOOK, 1)
    if inverse.replace(after, before, 1) != legacy.helper_source(legacy_packet(value), old, manifest):
        raise ValueError('Only private engine-directory and early-entry changes are permitted')
    return source


def seal(value):
    validate_packet(value)
    raw = backup.encode(value)
    inner = backup.encode({'scope': SCOPE, 'disposalId': value['disposalId'],
                           'payloadSha256': backup.sha(raw), 'packet': value})
    cipher = crypto._dpapi(inner, value['disposalId'], True)
    return MAGIC + value['disposalId'].encode() + b'\n' + backup.sha(cipher).encode() + b'\n' + cipher


def unseal(blob, identifier):
    if (not backup.identifier(identifier, 32) or not isinstance(blob, bytes)
            or len(blob) > crypto.LIMIT + 16384):
        raise ValueError('Bounded distinct encrypted disposal context required')
    parts = blob.split(b'\n', 3)
    if (len(parts) != 4 or parts[0] + b'\n' != MAGIC or parts[1] != identifier.encode()
            or parts[2] != backup.sha(parts[3]).encode()):
        raise ValueError('Unprepared-engine disposal ciphertext identity/checksum differs')
    raw = crypto._dpapi(parts[3], identifier, False)
    inner = backup.decode(raw)
    if (not isinstance(inner, dict) or set(inner) != {'scope', 'disposalId', 'payloadSha256', 'packet'}
            or inner['scope'] != SCOPE or inner['disposalId'] != identifier
            or backup.encode(inner) != raw
            or inner['payloadSha256'] != backup.sha(backup.encode(inner['packet']))):
        raise ValueError('Distinct disposal decrypted context differs')
    value = validate_packet(inner['packet'])
    if value['disposalId'] != identifier:
        raise ValueError('Distinct disposal recovered identity differs')
    return value


class UnpreparedEngineDisposalVault(crypto.RecoveryPacketVault):
    def load(self, identifier):
        path = self.path(identifier)
        self.directory(path.parent)
        if path.is_symlink() or not path.is_file() or path.stat().st_size > crypto.LIMIT + 16384:
            raise ValueError('Exact encrypted unprepared-engine disposal file required')
        before = path.stat()
        with path.open('rb') as stream:
            held = os.fstat(stream.fileno())
            data = stream.read(crypto.LIMIT + 16385)
            after = path.lstat()
            final = os.fstat(stream.fileno())
            if (path.is_symlink()
                    or any(getattr(before, k) != getattr(after, k) or getattr(held, k) != getattr(final, k)
                           for k in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns'))
                    or any(getattr(after, k) != getattr(final, k)
                           for k in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns'))):
                raise ValueError('Distinct disposal ciphertext changed during read')
        self.directory(path.parent)
        return unseal(data, identifier)

    def save(self, value, now=None):
        validate_packet(value, time.time() if now is None else now)
        blob = seal(value)
        path = self.path(value['disposalId'], True)
        self.directory(path.parent)
        if path.exists() or path.is_symlink():
            raise ValueError('Existing unprepared-engine disposal context preserved')
        with path.open('xb') as stream:
            held = os.fstat(stream.fileno())
            current = path.lstat()
            if path.is_symlink() or (held.st_dev, held.st_ino) != (current.st_dev, current.st_ino):
                raise ValueError('Distinct disposal ciphertext identity changed')
            os.chmod(path, 0o600)
            if stream.write(blob) != len(blob):
                raise ValueError('Distinct disposal ciphertext short write')
            stream.flush()
            os.fsync(stream.fileno())
        if self.load(value['disposalId']) != value:
            raise ValueError('Durable distinct disposal DPAPI readback differs')
        return {'scope': 'unprepared-engine-seed-disposal-encrypted-recovery',
                'disposalId': value['disposalId'], 'bytes': len(blob),
                'ciphertextSha256': backup.sha(blob), 'durableDecryptReadbackVerified': True,
                'productionAuthorized': False}


class UnpreparedEngineDisposalTransport(legacy.DisposalTransport):
    def __init__(self, value, old, manifest, source_root, opener=None, clock=time.time):
        validate_packet(value, clock())
        validate_original_binding(value, old)
        super().__init__(legacy_packet(value), old, manifest, source_root, opener, clock)


def verify_retained_metadata(connection, path, value, old, manifest, abandoned):
    validate_packet(value)
    validate_original_binding(value, old)
    return legacy.verify_retained_metadata(connection, path, legacy_packet(value), old, manifest, abandoned)
