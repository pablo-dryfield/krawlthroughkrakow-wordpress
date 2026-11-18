"""Opt-in local fixture instrumentation. Never a deployable helper/compiler path.

Exact reversible source substitutions measure inclusive spans and retain a safe
failure classification before the original unchanged generic HTTP error. They
add overhead; diagnostic timings are not an uninstrumented/hosted benchmark.
"""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MARKER = b'/* KTK LOCAL FIXTURE DIAGNOSTICS ONLY */'
KINDS = {'public-capture', 'initial-inspect', 'fenced-inspect', 'payload-hash', 'cleanup-claim'}
REASONS = {'cleanup-lifetime', 'termination-lifetime', 'encoded-reply-boundary', 'public-witness-drift', 'php-warning-converted', 'unclassified'}
STREAM = 'KTK_LOCAL_DIAG_V1='
PHP = r'''
/* KTK LOCAL FIXTURE DIAGNOSTICS ONLY */
$GLOBALS['ktk_fixture_diag']=array('start'=>hrtime(true),'sequence'=>0,'spans'=>array(),'events'=>array(),'first'=>array(),'last'=>array(),'failure'=>null);
function ktk_fixture_diag_stream(string $event,string $label,array $extra=array()): void {
    if(getenv('KTK_LOCAL_DIAGNOSTIC_STREAM')!=='1'||!defined('STDERR')){return;}$d=&$GLOBALS['ktk_fixture_diag'];
    if($d['sequence']>=4096){return;}$d['sequence']++;
    $row=array('schemaVersion'=>1,'sequence'=>$d['sequence'],'atNs'=>hrtime(true)-$d['start'],'event'=>$event,'label'=>$label)+$extra;
    @fwrite(STDERR,'KTK_LOCAL_DIAG_V1='.json_encode($row,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n");
}
function ktk_fixture_diag_failure(Throwable $error): void {
    $map=array('Current bounded cleanup lifetime ended; preserve consumed context'=>'cleanup-lifetime','Current bounded termination lifetime ended; preserve state and context'=>'termination-lifetime','Bounded current encoded termination reply required; preserve consumed context'=>'encoded-reply-boundary','Complete current cleanup witness changed; preserve every value'=>'public-witness-drift','Complete current protected/public witness changed; preserve every value'=>'public-witness-drift','Private termination operation failed'=>'php-warning-converted');
    $frames=array();foreach(array_slice($error->getTrace(),0,16) as $frame){$v=array();foreach(array('class','function') as $key){if(isset($frame[$key])&&is_string($frame[$key])&&preg_match('/^[A-Za-z_{}][A-Za-z0-9_{}\\:]*$/D',$frame[$key])===1&&strlen($frame[$key])<=128){$v[$key]=$frame[$key];}}if(isset($frame['line'])&&is_int($frame['line'])){$v['line']=$frame['line'];}$frames[]=$v;}
    $class=get_class($error);if(preg_match('/^[A-Za-z_][A-Za-z0-9_\\\\]{0,127}$/D',$class)!==1){$class='UnclassifiedThrowable';}
    $GLOBALS['ktk_fixture_diag']['failure']=array('class'=>$class,'reason'=>$map[$error->getMessage()]??'unclassified','messageSHA256'=>hash('sha256',$error->getMessage()),'line'=>$error->getLine(),'frames'=>$frames);
    ktk_fixture_diag_stream('failure','exception',array('reason'=>$map[$error->getMessage()]??'unclassified','class'=>$class,'messageSHA256'=>hash('sha256',$error->getMessage())));
}
function ktk_fixture_diag_span(string $name,callable $operation) {
    $start=hrtime(true);$failed=false;ktk_fixture_diag_stream('span-start',$name);
    try{return $operation();}catch(Throwable $error){$failed=true;ktk_fixture_diag_failure($error);throw $error;}
    finally{$ns=hrtime(true)-$start;$s=&$GLOBALS['ktk_fixture_diag']['spans'];if(!isset($s[$name])){$s[$name]=array('count'=>0,'totalNs'=>0,'maxNs'=>0,'failures'=>0);}$s[$name]['count']++;$s[$name]['totalNs']+=$ns;$s[$name]['maxNs']=max($s[$name]['maxNs'],$ns);$s[$name]['failures']+=(int)$failed;ktk_fixture_diag_stream('span-end',$name,array('durationNs'=>$ns));}
}
function ktk_fixture_diag_event(string $event,...$ignored): void {
    if(preg_match('/^[a-z][a-z-]{0,79}$/D',$event)!==1){$event='unrecognised-event';}
    $d=&$GLOBALS['ktk_fixture_diag'];$ns=hrtime(true)-$d['start'];
    if(!isset($d['events'][$event])){$d['events'][$event]=array('count'=>0,'firstNs'=>$ns,'lastNs'=>$ns);}$d['events'][$event]['count']++;$d['events'][$event]['lastNs']=$ns;
    $row=array('event'=>$event,'atNs'=>$ns);if(count($d['first'])<16){$d['first'][]=$row;}$d['last'][]=$row;if(count($d['last'])>32){array_shift($d['last']);}
    ktk_fixture_diag_stream('boundary',$event);
}
function ktk_fixture_diag_report(): array {
    $d=$GLOBALS['ktk_fixture_diag'];return array('schemaVersion'=>1,'localInstrumentedFixtureOnly'=>true,'inclusiveSpansMayOverlap'=>true,'elapsedNs'=>hrtime(true)-$d['start'],'spans'=>$d['spans'],'events'=>$d['events'],'firstEvents'=>$d['first'],'lastEvents'=>$d['last'],'failure'=>$d['failure']);
}
'''.encode()


def sha(raw): return hashlib.sha256(raw).hexdigest()


def exact(raw, old, new, count):
    if raw.count(old) != count: raise ValueError('Exact diagnostic source anchor/count required')
    return raw.replace(old, new)


def edits():
    """Region replacements ensure an unrelated same-named call cannot move."""
    pairs = []
    for filename, changes in [
        ('private-engine-payload-cleanup.php', [
            (b'$reader->inspect($store)', b"ktk_fixture_diag_span('fenced-inspect',static fn()=>$reader->inspect($store))", 3),
            (b'$this->claim($store)', b"ktk_fixture_diag_span('cleanup-claim',fn()=>$this->claim($store))", 4),
            (b"hash_update_stream($hash,$h,$row['bytes']+1)", b"ktk_fixture_diag_span('payload-hash',static fn()=>hash_update_stream($hash,$h,$row['bytes']+1))", 1),
        ]),
        ('private-engine-termination.php', [
            (b'$reader->inspect($store)', b"ktk_fixture_diag_span('fenced-inspect',static fn()=>$reader->inspect($store))", 3),
            (b'$owner->inspect($store)', b"ktk_fixture_diag_span('initial-inspect',static fn()=>$owner->inspect($store))", 1),
        ]),
    ]:
        raw = (ROOT / 'tools' / filename).read_bytes()
        if not raw.startswith(b'<?php\n'): raise ValueError('Exact frozen PHP component opening required')
        old = raw[6:]; new = old
        for before, after, count in changes: new = exact(new, before, after, count)
        pairs.append((old, new, 1))
    capture = b"$capture=static function(){$snapshot=ktk_capture_staging_original_state(__FILE__);return array('ownedContentFiles'=>$snapshot['ownedContentFiles'],'protectedStateSha256'=>$snapshot['protectedStateSha256']);};"
    pairs.extend([
        (capture, b"$capture=static function(){return ktk_fixture_diag_span('public-capture',static function(){$snapshot=ktk_capture_staging_original_state(__FILE__);return array('ownedContentFiles'=>$snapshot['ownedContentFiles'],'protectedStateSha256'=>$snapshot['protectedStateSha256']);});};", 1),
        (b'new KTK_Private_Engine_Termination($config,$capture)', b"new KTK_Private_Engine_Termination($config,$capture,'ktk_fixture_diag_event')", 1),
        (b'}catch(Throwable $error){restore_error_handler();wp_send_json(', b'}catch(Throwable $error){ktk_fixture_diag_failure($error);restore_error_handler();wp_send_json(', 1),
    ])
    return pairs


def restore(instrumented):
    if not isinstance(instrumented, bytes) or instrumented.count(PHP) != 1 or not instrumented.startswith(b'<?php\n' + PHP):
        raise ValueError('Exact local diagnostic prefix required')
    raw = instrumented.replace(PHP, b'', 1)
    for old, new, count in reversed(edits()): raw = exact(raw, new, old, count)
    if MARKER in raw: raise ValueError('Unexpected remaining instrumentation')
    return raw


def instrument(source):
    if not isinstance(source, bytes) or not source.startswith(b'<?php\n') or MARKER in source or b'ktk_fixture_diag_' in source:
        raise ValueError('Fresh exact owned fixture helper required')
    raw = source
    for old, new, count in edits(): raw = exact(raw, old, new, count)
    raw = raw[:6] + PHP + raw[6:]
    if restore(raw) != source: raise ValueError('Instrumentation must have an exact complete inverse')
    receipt = {'unmodifiedFixtureSHA256': sha(source), 'instrumentedFixtureSHA256': sha(raw), 'exactInverseVerified': True, 'scope': 'Local source-qualified diagnostic overhead; no hosted or uninstrumented benchmark', 'componentHashes': {p: sha((ROOT / 'tools' / p).read_bytes()) for p in ('private-engine-payload-cleanup.php', 'private-engine-termination.php')}}
    return raw, receipt


def validate(value):
    """Whitelist bounded counters/labels/hashes; never expose arguments/values."""
    if not isinstance(value, dict) or set(value) != {'schemaVersion', 'localInstrumentedFixtureOnly', 'inclusiveSpansMayOverlap', 'elapsedNs', 'spans', 'events', 'firstEvents', 'lastEvents', 'failure'} or value['schemaVersion'] != 1 or value['localInstrumentedFixtureOnly'] is not True or value['inclusiveSpansMayOverlap'] is not True:
        raise ValueError('Qualified exact diagnostic shape required')
    def number(n):
        if type(n) is not int or not 0 <= n <= 86400000000000: raise ValueError('Bounded monotonic integer required')
    number(value['elapsedNs'])
    for kind, fields in [('spans', {'count', 'totalNs', 'maxNs', 'failures'}), ('events', {'count', 'firstNs', 'lastNs'})]:
        rows = value[kind]
        if not isinstance(rows, dict) and rows != []: raise ValueError('Diagnostic mapping required')
        if len(rows) > 32: raise ValueError('Bounded diagnostic label inventory required')
        for name, row in (rows.items() if isinstance(rows, dict) else []):
            if not isinstance(name, str) or not re.fullmatch('[a-z][a-z-]{0,79}', name) or kind == 'spans' and name not in KINDS or set(row) != fields: raise ValueError('Closed diagnostic labels/fields required')
            for n in row.values(): number(n)
    for key, maximum in [('firstEvents', 16), ('lastEvents', 32)]:
        if not isinstance(value[key], list) or len(value[key]) > maximum: raise ValueError('Bounded event samples required')
        for row in value[key]:
            if set(row) != {'event', 'atNs'} or not re.fullmatch('[a-z][a-z-]{0,79}', row['event']): raise ValueError('Only safe event labels may be returned')
            number(row['atNs'])
    failure = value['failure']
    if failure is not None:
        if set(failure) != {'class', 'reason', 'messageSHA256', 'line', 'frames'} or failure['reason'] not in REASONS or not re.fullmatch('[a-f0-9]{64}', failure['messageSHA256']) or not isinstance(failure['frames'], list) or len(failure['frames']) > 16: raise ValueError('Closed nonsecret failure diagnosis required')
        if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_\\]{0,127}', failure['class']): raise ValueError('Safe exception class required')
        number(failure['line'])
        for frame in failure['frames']:
            if not isinstance(frame, dict) or set(frame) - {'class', 'function', 'line'}: raise ValueError('Trace arguments/paths must never be exported')
            for key, item in frame.items():
                if key == 'line': number(item)
                elif not isinstance(item, str) or not re.fullmatch(r'[A-Za-z_{}][A-Za-z0-9_{}\\:]{0,127}', item): raise ValueError('Safe trace label required')
    if len(json.dumps(value, allow_nan=False).encode()) > 65536: raise ValueError('Bounded local diagnostic output required')
    return value


def read_stream(raw, incomplete=False):
    """Only fixture marker lines; any unrelated stderr remains a failure."""
    if isinstance(raw, str): raw = raw.encode('utf-8')
    if not isinstance(raw, bytes) or len(raw) > 2097152: raise ValueError('Bounded exact diagnostic stderr required')
    pieces = raw.split(b'\n'); tail = pieces.pop()
    if tail and not incomplete: raise ValueError('Incomplete diagnostic stream is not a successful observation')
    if tail and (len(tail) > 1024 or not tail.startswith(STREAM.encode()[:min(len(tail), len(STREAM))])): raise ValueError('Unknown incomplete stderr preserved')
    rows=[]; previous=-1
    for line in pieces:
        if len(line) > 1024 or not line.startswith(STREAM.encode()): raise ValueError('Unrelated PHP stderr must never be hidden')
        row=json.loads(line[len(STREAM):])
        keys={'schemaVersion','sequence','atNs','event','label'}
        if row.get('event')=='span-end':keys.add('durationNs')
        if row.get('event')=='failure':keys|={'reason','class','messageSHA256'}
        if set(row)!=keys or row['schemaVersion']!=1 or row['sequence']!=len(rows)+1 or len(rows)>=4096: raise ValueError('Exact consecutive diagnostic stream required')
        for key in ('sequence','atNs'):
            if type(row[key]) is not int or not 0<=row[key]<=86400000000000: raise ValueError('Bounded monotonic stream integers required')
        if row['atNs']<previous: raise ValueError('Monotonic checkpoint order required')
        previous=row['atNs']
        if row['event'] in ('span-start','span-end'):
            if row['label'] not in KINDS: raise ValueError('Unknown timed diagnostic span')
            if row['event']=='span-end' and (type(row['durationNs']) is not int or not 0<=row['durationNs']<=86400000000000): raise ValueError('Bounded diagnostic duration required')
        elif row['event']=='boundary':
            if not isinstance(row['label'],str) or not re.fullmatch('[a-z][a-z-]{0,79}',row['label']): raise ValueError('Safe checkpoint event required')
        elif row['event']=='failure':
            if row['label']!='exception' or row['reason'] not in REASONS or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_\\]{0,127}',row['class']) or not re.fullmatch('[a-f0-9]{64}',row['messageSHA256']): raise ValueError('Safe stream failure classification required')
        else: raise ValueError('Closed checkpoint kind required')
        rows.append(row)
    return {'records':len(rows),'lastCheckpoint':rows[-1] if rows else None,'failureCheckpoints':[r for r in rows if r['event']=='failure'],'truncatedTailBytes':len(tail),'truncatedTailSHA256':sha(tail) if tail else None,'boundedStreamMayStopAt4096':True,'scope':'Local diagnostic checkpoints; timeout/incomplete output never grants a success or replay'}


def retain_stream(root, number, raw, incomplete=False):
    root=Path(root)
    if type(number) is not int or not 1<=number<100000 or root.is_symlink() or root.resolve()!=root.absolute() or not root.is_dir(): raise ValueError('Exact owned local diagnostic destination required')
    if isinstance(raw,str):raw=raw.encode('utf-8')
    if not isinstance(raw,bytes) or len(raw)>2097152:raise ValueError('Bounded raw diagnostic stream required')
    path=root/f'local-diagnostic-call-{number:05d}.zip'
    with zipfile.ZipFile(path,'x',zipfile.ZIP_DEFLATED,compresslevel=3) as archive:archive.writestr('checkpoints.jsonl',raw)
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None or archive.read('checkpoints.jsonl')!=raw:raise ValueError('Diagnostic stream CRC/readback differs')
    result=read_stream(raw,incomplete)
    return {'archive':path.name,'archiveSHA256':sha(path.read_bytes()),'rawBytes':len(raw),'rawSHA256':sha(raw),**result}
