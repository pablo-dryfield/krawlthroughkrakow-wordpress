"""Exact opt-in hashing for the distinct private recovery helper only.

Original/default compilers and raw capture remain unchanged; no output or network.
"""
from tools import full_private_engine_controller as compiler
from tools import staging_state_fast_capture as fast
from tools import content_update_backup as backup

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


def render_stream(source):
    if type(source) is not bytes or source != compiler.stream_source():
        raise ValueError('Exact original compiled stream required for local prototype')
    result = source
    for before, after in edits():
        result = exact(result, before, after)
    if restore_stream(result) != source:
        raise ValueError('Complete original stream inverse required')
    return result


def restore_stream(source):
    if type(source) is not bytes:
        raise ValueError('Complete prototype bytes required')
    for before, after in reversed(edits()):
        source = exact(source, after, before)
    if source != compiler.stream_source():
        raise ValueError('Stream changed outside complete-prefix prototype')
    return source



def stream_source(legacy_source=None):
    return render_stream(compiler.stream_source(legacy_source))


CAPTURE_32_SHA = 'cc98563838d020958e359d74c66a9e0ae495a327b1a706432a598f111b1b8c0b'
CAPTURE_64_SHA = '3bc39c8524f252f9ad0266c94f126848f5d1cfd266e54c461bf710999b9871c6'
CAPTURE_32_ANCHOR = b'$size > 33554432'
CAPTURE_64_ANCHOR = b'$size > 67108864'


def enlarge_capture(source):
    if type(source) is not bytes or backup.sha(source) != CAPTURE_32_SHA:
        raise ValueError('Exact original bounded32 capture required')
    result = exact(source, CAPTURE_32_ANCHOR, CAPTURE_64_ANCHOR)
    if backup.sha(result) != CAPTURE_64_SHA or restore_capture(result) != source:
        raise ValueError('Exact measured bounded64 capture and complete inverse required')
    return result


def restore_capture(source):
    if type(source) is not bytes or backup.sha(source) != CAPTURE_64_SHA:
        raise ValueError('Exact measured bounded64 capture required')
    result = exact(source, CAPTURE_64_ANCHOR, CAPTURE_32_ANCHOR)
    if backup.sha(result) != CAPTURE_32_SHA:
        raise ValueError('Capture changed outside eligibility')
    return result


def capture_source(raw_source=None):
    source = fast.SOURCE.read_bytes() if raw_source is None else raw_source
    return enlarge_capture(fast.embedded(source))
