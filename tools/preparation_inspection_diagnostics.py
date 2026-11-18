"""Exact reversible local observer; no compiler, endpoint or authority change."""
import json
from tools import full_private_engine_controller as compiler
from tools.tests import test_full_private_engine_preparation as native

MARKER = '/* KTK LOCAL PREPARATION INSPECTION OBSERVER */'
PHP = r'''
/* KTK LOCAL PREPARATION INSPECTION OBSERVER */
$GLOBALS['ktk_preparation_observer']=array('start'=>hrtime(true),'spans'=>array());
function ktk_preparation_observer_span(string $label,callable $work) {
    $start=hrtime(true);$failed=false;
    try{return $work();}catch(Throwable $error){$failed=true;throw $error;}
    finally{$ns=hrtime(true)-$start;$rows=&$GLOBALS['ktk_preparation_observer']['spans'];if(!isset($rows[$label])){$rows[$label]=array('count'=>0,'totalNs'=>0,'maxNs'=>0,'failures'=>0);}$rows[$label]['count']++;$rows[$label]['totalNs']+=$ns;$rows[$label]['maxNs']=max($rows[$label]['maxNs'],$ns);$rows[$label]['failures']+=(int)$failed;}
}
function ktk_preparation_observer_report(int $controllerNs=0): array {
    return array('schemaVersion'=>1,'localObserverOnly'=>true,'inclusiveSpansMayOverlap'=>true,
      'elapsedNs'=>hrtime(true)-$GLOBALS['ktk_preparation_observer']['start'],'controllerNs'=>$controllerNs,
      'spans'=>$GLOBALS['ktk_preparation_observer']['spans'],'peakAllocatedBytes'=>memory_get_peak_usage(true),
      'memoryLimit'=>ini_get('memory_limit'),'phpVersion'=>PHP_VERSION,'platform'=>PHP_OS_FAMILY,
      'opensslAvailable'=>function_exists('openssl_digest'),'queries'=>$GLOBALS['wpdb']->queries);
}
'''


def exact(text, old, new, count=1):
    if text.count(old) != count:
        raise ValueError('Exact preparation observer anchor/count required')
    return text.replace(old, new)


def native_driver():
    return native.old.DRIVER.replace(" foreach($c['components'] as $component){require $component;}",
                                    native.DEFINE + " foreach($c['components'] as $component){require $component;}").replace(native.ANCHOR, native.BRIDGE)


def driver_edits():
    base = native_driver()
    capture = next(line for line in base.splitlines() if line.startswith(' $capture=static function()use($c){'))
    opening = ' $capture=static function()use($c){'
    wrapped = opening + "return ktk_preparation_observer_span('public-capture',static function()use($c){" + capture[len(opening):-2] + '});};'
    snapshot = "echo json_encode(array('ok'=>true,'state'=>$capture()),JSON_THROW_ON_ERROR);"
    snapshot_new = "$snapshot=$capture();echo json_encode(array('ok'=>true,'state'=>$snapshot,'observer'=>ktk_preparation_observer_report()),JSON_THROW_ON_ERROR);"
    controller = "$value=$controller->run($c['request'],$c['method'],$c['host'],$c['token'],$c['now']);echo json_encode(array('ok'=>true,'value'=>$value),JSON_THROW_ON_ERROR);"
    measured = "$ktkStart=hrtime(true);$value=$controller->run($c['request'],$c['method'],$c['host'],$c['token'],$c['now']);$ktkElapsed=hrtime(true)-$ktkStart;echo json_encode(array('ok'=>true,'value'=>$value,'observer'=>ktk_preparation_observer_report($ktkElapsed)),JSON_THROW_ON_ERROR);"
    return [('<?php\n', '<?php\n' + PHP), (capture, wrapped), (snapshot, snapshot_new), (controller, measured)]


def instrument_driver(source):
    if source != native_driver() or MARKER in source:
        raise ValueError('Exact fresh native preparation driver required')
    for old, new in driver_edits():
        source = exact(source, old, new)
    if restore_driver(source) != native_driver():
        raise ValueError('Complete preparation driver inverse required')
    return source


def restore_driver(source):
    for old, new in reversed(driver_edits()):
        source = exact(source, new, old)
    if source != native_driver():
        raise ValueError('Preparation driver changed outside observer')
    return source


def stream_edits():
    source = compiler.stream_source()
    start = source.index(b'    public function inspect(KTK_Content_Update_Private_Store $store): array')
    end = source.index(b'    public function expectedStateSha256(', start)
    old = source[start:end]
    new = exact(old, b'$this->sourceInventory()', b"ktk_preparation_observer_span('source-inventory',fn()=>$this->sourceInventory())")
    new = exact(new, b'$this->prefix($path,$name)', b"ktk_preparation_observer_span('private-prefix',fn()=>$this->prefix($path,$name))")
    new = exact(new, b'$this->check($store)', b"ktk_preparation_observer_span('control-and-guard',fn()=>$this->check($store))", 2)
    return old, new


def instrument_stream(source):
    if source != compiler.stream_source():
        raise ValueError('Exact reviewed preparation stream required')
    old, new = stream_edits()
    result = exact(source, old, new)
    if restore_stream(result) != source:
        raise ValueError('Complete preparation stream inverse required')
    return result


def restore_stream(source):
    old, new = stream_edits()
    result = exact(source, new, old)
    if result != compiler.stream_source():
        raise ValueError('Preparation stream changed outside observer')
    return result


def validate(value):
    fields = {'schemaVersion', 'localObserverOnly', 'inclusiveSpansMayOverlap', 'elapsedNs', 'controllerNs', 'spans',
              'peakAllocatedBytes', 'memoryLimit', 'phpVersion', 'platform', 'opensslAvailable', 'queries'}
    if not isinstance(value, dict) or set(value) != fields or value['schemaVersion'] != 1 or value['localObserverOnly'] is not True or value['inclusiveSpansMayOverlap'] is not True:
        raise ValueError('Exact local preparation observer shape required')
    def number(n):
        if type(n) is not int or not 0 <= n <= 600000000000:
            raise ValueError('Bounded native monotonic counter required')
    for key in ('elapsedNs', 'controllerNs', 'peakAllocatedBytes'):
        number(value[key])
    if value['controllerNs'] > value['elapsedNs'] or any(type(value[k]) is not str or not 0 < len(value[k]) <= 128 for k in ('phpVersion', 'platform')):
        raise ValueError('Consistent native timing/platform fields required')
    if value['memoryLimit'] != '256M' or not 0 < value['peakAllocatedBytes'] < 268435456 or type(value['opensslAvailable']) is not bool:
        raise ValueError('Original256M process bound required')
    if not isinstance(value['queries'], list) or not all(type(q) is str and q.startswith('SELECT ') for q in value['queries']):
        raise ValueError('Selected read-only fixture queries required')
    spans = value['spans']
    if not isinstance(spans, dict) or set(spans) - {'public-capture', 'source-inventory', 'private-prefix', 'control-and-guard'}:
        raise ValueError('Closed observer labels required')
    for row in spans.values():
        if not isinstance(row, dict) or set(row) != {'count', 'totalNs', 'maxNs', 'failures'}:
            raise ValueError('Closed observer counters required')
        for n in row.values():
            number(n)
        if row['count'] < 1 or row['failures'] > row['count'] or row['maxNs'] > row['totalNs'] or row['totalNs'] > value['elapsedNs']:
            raise ValueError('Consistent inclusive observer counters required')
    if len(json.dumps(value).encode()) > 65536:
        raise ValueError('Bounded preparation observer output required')
    return value
