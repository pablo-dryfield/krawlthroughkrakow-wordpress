"""Explicit per-request PHP ceilings for a distinct hosted rehearsal profile.

No default compiler changes, credentials, connection, configuration-file writes
or production mode. Existing stricter request limits are preserved.
"""
from __future__ import annotations
import re

PROFILE='php-60s-256m-v1'
STEP_BYTES=16777216
STEP_FILES=64
GUARD=b'''    /* KTK EXPLICIT HOSTED RUNTIME BOUNDS V1 */
    $ktkBoundsReady=false;
    try {
        if (PHP_INT_SIZE!==8 || !function_exists('ini_get') || !function_exists('ini_set') || !function_exists('set_time_limit')) { throw new RuntimeException('Runtime controls required'); }
        $ktkLimitBytes=static function($value) {
            $value=strtoupper(trim((string)$value));
            if ($value==='-1') { return -1; }
            if (preg_match('/^([0-9]{1,9})([KMG]?)$/D',$value,$parts)!==1) { throw new RuntimeException('Exact memory setting required'); }
            return (int)$parts[1]*array(''=>1,'K'=>1024,'M'=>1048576,'G'=>1073741824)[$parts[2]];
        };
        $ktkBeforeMemory=trim((string)ini_get('memory_limit'));$ktkBeforeBytes=$ktkLimitBytes($ktkBeforeMemory);
        $ktkBeforeTime=(string)ini_get('max_execution_time');
        if (preg_match('/^[0-9]{1,9}$/D',$ktkBeforeTime)!==1 || ($ktkBeforeBytes!==-1 && $ktkBeforeBytes<1)) { throw new RuntimeException('Valid existing runtime limits required'); }
        $ktkMemoryTarget=$ktkBeforeBytes>0 && $ktkBeforeBytes<268435456?$ktkBeforeMemory:'256M';
        $ktkTimeTarget=(int)$ktkBeforeTime>0?min(60,(int)$ktkBeforeTime):60;
        if (@ini_set('memory_limit',$ktkMemoryTarget)===false || !@set_time_limit($ktkTimeTarget)) { throw new RuntimeException('Cannot enforce request limits'); }
        $ktkAfterBytes=$ktkLimitBytes(ini_get('memory_limit'));$ktkAfterTime=(string)ini_get('max_execution_time');
        if (!is_int($ktkAfterBytes) || $ktkAfterBytes<1 || $ktkAfterBytes>268435456 || ($ktkBeforeBytes>0 && $ktkAfterBytes>$ktkBeforeBytes) || preg_match('/^[0-9]{1,9}$/D',$ktkAfterTime)!==1 || (int)$ktkAfterTime<1 || (int)$ktkAfterTime>$ktkTimeTarget) { throw new RuntimeException('Enforced runtime limits differ'); }
        $ktkBoundsReady=true;
    } catch (Throwable $ktkBoundsError) { $ktkBoundsReady=false; }
    if (!$ktkBoundsReady) {
        header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);
        header('X-Robots-Tag: noindex, noarchive',true);header('Content-Type: application/json',true);
        http_response_code(503);echo '{"error":"private_runtime_bounds_unavailable"}';exit;
    }
    header('X-KTK-Enforced-Runtime: php-60s-256m-v1');
    header('X-KTK-Memory-Limit: '.ini_get('memory_limit'));
    header('X-KTK-Execution-Limit: '.ini_get('max_execution_time'));
'''
AUTH={'snapshot':b'HTTP_X_KTK_SNAPSHOT_TOKEN','engine':b'HTTP_X_KTK_FULL_ENGINE_TOKEN','disposal':b'HTTP_X_KTK_FULL_DISPOSAL_TOKEN'}

def bind(source,role):
    if type(source) is not bytes or role not in AUTH or GUARD in source:
        raise ValueError('Exact fresh hosted runtime profile required')
    anchor=b'    nocache_headers();'
    if source.count(anchor)!=1 or source.count(AUTH[role])!=1 or source.index(AUTH[role])>source.index(anchor):
        raise ValueError('One authenticated pre-operation runtime anchor required')
    return source.replace(anchor,GUARD+anchor,1)

def engine_work(source):
    old=b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:33554432; $this->stepFiles=$profile==='default'?self::STEP_FILES:128;"
    new=b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:16777216; $this->stepFiles=$profile==='default'?self::STEP_FILES:64;"
    if type(source) is not bytes or source.count(old)!=1:
        raise ValueError('Exact reviewed full-engine work profile required')
    return source.replace(old,new,1)

def diagnostic_headers(headers,token):
    result={}
    for name in ('X-KTK-Enforced-Runtime','X-KTK-Memory-Limit','X-KTK-Execution-Limit'):
        value=headers.get(name) if headers is not None else None
        if value is not None:
            value=value if isinstance(value,str) else '[invalid header value]'
            result[name]=''.join(c if 32<=ord(c)<127 else '?' for c in value.replace(token,'[redacted]'))[:160]
    return result

def memory_bytes(value):
    if not isinstance(value,str):raise ValueError('Exact finite memory setting required')
    match=re.fullmatch(r'([0-9]{1,9})([KMG]?)',value.strip().upper())
    if match is None:raise ValueError('Exact finite memory setting required')
    return int(match[1])*{'':1,'K':1024,'M':1048576,'G':1073741824}[match[2]]

def verify_response(headers,peak=None):
    memory=memory_bytes(headers.get('X-KTK-Memory-Limit'))
    execution=headers.get('X-KTK-Execution-Limit')
    if headers.get('X-KTK-Enforced-Runtime')!=PROFILE or not 0<memory<=268435456 or not isinstance(execution,str) or re.fullmatch(r'[0-9]{1,9}',execution) is None or not 0<int(execution)<=60 or peak is not None and (type(peak) is not int or not 0<peak<=268435456):
        raise ValueError('Required hosted60s/256MiB ceiling is unverified')
    return True
