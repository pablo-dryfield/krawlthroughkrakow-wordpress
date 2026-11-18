"""Reversible local complete-prefix SHA256 prototype; no compiler integration."""
from tools import full_private_engine_controller as compiler
from tools import preparation_inspection_diagnostics as diagnostic

MARKER = b'/* KTK LOCAL COMPLETE PREFIX HASH PROTOTYPE */'
HELPER = b'''    /* KTK LOCAL COMPLETE PREFIX HASH PROTOTYPE */
    private static function completeBufferDigest($handle,int $size): ?string
    {
        if (PHP_INT_SIZE<8 || !function_exists('openssl_digest') || $size<0 || $size>67108864) { return null; }
        $setting=strtoupper(trim((string)ini_get('memory_limit')));
        if (preg_match('/^([0-9]{1,9})([KMG]?)$/D',$setting,$parts)!==1) { return null; }
        $unit=array(''=>1,'K'=>1024,'M'=>1048576,'G'=>1073741824)[$parts[2]];
        $limit=(int)$parts[1]*$unit;
        if ($limit<1 || memory_get_usage(true)+2*$size+16777216>$limit) { return null; }
        // Read the already held private handle; never reopen by pathname or reuse a digest.
        $bytes=stream_get_contents($handle,$size+1);
        if (!is_string($bytes) || strlen($bytes)!==$size) { throw new RuntimeException('Changed streaming prefix preserved'); }
        $digest=@openssl_digest($bytes,'sha256'); unset($bytes);
        if (is_string($digest) && preg_match('/^[a-f0-9]{64}$/D',$digest)===1) { return $digest; }
        if (fseek($handle,0)!==0) { throw new RuntimeException('Cannot rewind private streaming prefix'); }
        return null;
    }
'''


def exact(data, before, after):
    if data.count(before) != 1:
        raise ValueError('One exact complete-prefix prototype anchor required')
    return data.replace(before, after, 1)


def edits():
    return [
        (b'    private function prefix(string $path,string $name): array\n',
         HELPER + b'    private function prefix(string $path,string $name): array\n'),
        (b'            self::held($h,$path,$s[\'size\']);\n            for ($offset=0;$offset<$s[\'size\'];$offset+=strlen($bytes)) {',
         b'            self::held($h,$path,$s[\'size\']);\n            $digest=$complete?self::completeBufferDigest($h,$s[\'size\']):null;\n            for ($offset=0;$digest===null && $offset<$s[\'size\'];$offset+=strlen($bytes)) {'),
        (b"            self::held($h,$path,$s['size']); $digest=hash_final($hash);",
         b"            self::held($h,$path,$s['size']); if ($digest===null) { $digest=hash_final($hash); }"),
    ]


def apply(source):
    if type(source) is not bytes or source != compiler.stream_source():
        raise ValueError('Exact original compiled stream required for local prototype')
    result = source
    for before, after in edits():
        result = exact(result, before, after)
    if restore(result) != source:
        raise ValueError('Complete original stream inverse required')
    return result


def restore(source):
    if type(source) is not bytes:
        raise ValueError('Complete prototype bytes required')
    for before, after in reversed(edits()):
        source = exact(source, after, before)
    if source != compiler.stream_source():
        raise ValueError('Stream changed outside complete-prefix prototype')
    return source


def timed(source):
    result = diagnostic.instrument_stream(source)
    for before, after in edits():
        result = exact(result, before, after)
    if restore_timed(result) != source:
        raise ValueError('Complete timed prototype inverse required')
    return result


def restore_timed(source):
    for before, after in reversed(edits()):
        source = exact(source, after, before)
    return diagnostic.restore_stream(source)
