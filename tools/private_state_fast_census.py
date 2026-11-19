"""Derive a staging-only fenced census without changing its file/race guards."""
from pathlib import Path
import argparse
import hashlib

from tools import staging_state_fast_capture as public

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tools/private-engine-fenced-inspection.php'
TARGET = ROOT / 'tools/private-engine-fenced-fast-inspection.php'
SOURCE_SHA = '9f5ac439154c35ce3b19bef93f859f18633880d241835e790b085482412de313'


def method():
    old = '    $hashCurrentFile = static function (string $path, $size) {'
    new = '    private static function hashCurrentFile(string $path, $size) {'
    block = public.BLOCK
    if block.count(old) != 1 or not block.endswith('    };\n'):
        raise ValueError('Exact reviewed bounded SHA256 implementation required')
    return block.replace(old, new, 1).removesuffix('    };\n') + '    }\n'


def changes():
    anchor = '    private function file(string $root,string $n,KTK_Content_Update_Private_Store $store,?array $expected): array'
    return [
        ('/** Noncreating inspection of an immutable archived private census and known signed closure prefix. */',
         '/** Derived staging-only fenced census; complete hashing and original file/race guards. */'),
        (anchor, method() + anchor),
        ("else{$hash=hash_file('sha256',$p);if(!is_string($hash))", "else{$hash=self::hashCurrentFile($p,$before['size']);if(!is_string($hash))"),
    ]


def render(source):
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA:
        raise ValueError('Immutable reviewed fenced census changed')
    text = source.decode('utf-8')
    for old, new in changes():
        if text.count(old) != 1:
            raise ValueError('Exact complete fenced census anchor required')
        text = text.replace(old, new, 1)
    return text.encode('utf-8')


def inverse(candidate):
    text = candidate.decode('utf-8')
    for old, new in reversed(changes()):
        if text.count(new) != 1:
            raise ValueError('Exact bounded fenced census inverse required')
        text = text.replace(new, old, 1)
    result = text.encode('utf-8')
    if hashlib.sha256(result).hexdigest() != SOURCE_SHA:
        raise ValueError('Fenced census changed outside bounded complete hashing')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    source = SOURCE.read_bytes()
    candidate = render(source)
    if inverse(candidate) != source:
        raise ValueError('Complete original fenced census inverse required')
    if args.write:
        TARGET.write_bytes(candidate)
    elif not TARGET.is_file() or TARGET.read_bytes() != candidate:
        raise ValueError('Derived private census differs')
    print('Staging-only census/inverse exact; no credentials, network or publication.')


if __name__ == '__main__':
    main()
