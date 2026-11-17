"""Compile an explicit private-only deferred controller from exact reviewed legacy bytes.

No helper endpoint, filesystem output, connection or production approval. The old
controller/helper compilers remain unchanged. Only the preparation boundary differs.
"""
from __future__ import annotations
from pathlib import Path
from tools import content_update_backup as backup

ROOT=Path(__file__).resolve().parents[1]
LEGACY=ROOT/'tools/content-update-controller.php'
LEGACY_SHA='6a25452410a0d921e79e36d82268049bc37f13b3b825c5725373ecc3e86b227c'
STREAM=ROOT/'tools/content-update-streaming-seeds.php'
STREAM_SHA='6eda331b618a42f9ae6d7c14e75eecc557461f6c9ae62492877155e1a3615fad'
PRIVATE_GUARD=b'''        if(($packet['mode']??null)!=='private-staging-rehearsal'||$initializePrivateFixture===null||$inspectPrivateFixture===null||$completePrivateFixture===null){throw new RuntimeException('Explicit private deferred preparation and paired callbacks required');}
'''
RECOVER=b'''            if($seed!==null){
                $completeBefore=($seed['sourceComplete']??null)===true&&($seed['targetComplete']??null)===true;
                ($this->completePrivateFixture)($store,$seed['stateSha256']);
                $nextSeed=($this->inspectPrivateFixture)($store);
                if(!is_array($nextSeed)||!self::digest($nextSeed['stateSha256']??null)||!is_bool($nextSeed['sourceComplete']??null)||!is_bool($nextSeed['targetComplete']??null)){throw new RuntimeException('Verified bounded private seed result required');}
                if(!$completeBefore||!$nextSeed['sourceComplete']||!$nextSeed['targetComplete']){return $this->preparation($store,$nextSeed)[0];}
            }
'''
ENGINE_PREPARATION=b'''            $engine=$this->engine();$inspection=$engine->inspectPreparation();
            if($inspection['phase']==='unprepared'&&$inspection['files']===array()&&$inspection['directories']===array()&&$inspection['pendingReceipts']===array()){$engine->prepare();}
            else{$engine->resumePreparation($inspection['stateSha256']);}
            $completed=$engine->inspectPreparation();
            if($completed['phase']!=='prepared'||$completed['currentPriorInventoryVerified']!==true||$completed['protectedStateVerified']!==true||$completed['pendingReceipts']!==array()){throw new RuntimeException('Complete freshly inspected private engine preparation required');}
            KTK_Content_Update_Backup_Manifest::build($store,$this->packet['plan']);return $this->result($store,$engine);
'''

def controller_source(source=None):
    raw=LEGACY.read_bytes() if source is None else source
    if not isinstance(raw,bytes) or backup.sha(raw)!=LEGACY_SHA:
        raise ValueError('Exact reviewed legacy controller required; no default or production rewrite')
    changes=[
        (b'final class KTK_Content_Update_Controller\n',b'final class KTK_Full_Private_Engine_Controller\n'),
        (b'        self::caller();$keys=array_keys($packet);sort($keys);\n',b'        self::caller();$keys=array_keys($packet);sort($keys);\n'+PRIVATE_GUARD),
        (b'    private function preparation(): array\n',b'    private function preparation(?KTK_Content_Update_Private_Store $heldStore=null,?array $inspectedSeed=null): array\n'),
        (b"            $store=new KTK_Content_Update_Private_Store($this->root,$this->packet['publicRoot'],$this->binding['transactionId'],$this->packet['ownershipKey']);$time=$store->preparationTimestamp();\n",b"            $store=$heldStore??new KTK_Content_Update_Private_Store($this->root,$this->packet['publicRoot'],$this->binding['transactionId'],$this->packet['ownershipKey']);$time=$store->preparationTimestamp();\n"),
        (b'                $seed=($this->inspectPrivateFixture)($store);\n',b'                $seed=$inspectedSeed??($this->inspectPrivateFixture)($store);\n'),
        (b"'seedFiles'=>$seed['files']??array(),'engineFiles'",b"'seedFiles'=>$seed['files']??array(),'fullSeed'=>$seed,'rootBinding'=>$store===null?null:$store->rootBinding(),'engineFiles'"),
        (b"            if($seed!==null){($this->completePrivateFixture)($store,$seed['stateSha256']);}\n",RECOVER),
        (b"            $engine=$this->engine();$inspection=$engine->inspectPreparation();$engine->resumePreparation($inspection['stateSha256']);KTK_Content_Update_Backup_Manifest::build($store,$this->packet['plan']);return $this->result($store,$engine);\n",ENGINE_PREPARATION),
        (b"            if($this->initialize!==null){($this->initialize)($this->root);}\n            $engine=$this->engine();$engine->prepare();KTK_Content_Update_Backup_Manifest::build($store,$this->packet['plan']);return $this->result($store,$engine);\n",b"            if($this->initialize!==null){($this->initialize)($this->root,$store);}\n            $seed=($this->inspectPrivateFixture)($store);return $this->preparation($store,$seed)[0];\n"),
    ]
    if any(raw.count(old)!=1 for old,_ in changes):raise ValueError('Exact deferred controller anchors required before compilation')
    compiled=raw
    for old,new in changes:compiled=compiled.replace(old,new,1)
    return compiled

def stream_source(source=None):
    raw=STREAM.read_bytes() if source is None else source
    if not isinstance(raw,bytes) or backup.sha(raw)!=STREAM_SHA:raise ValueError('Exact reviewed streaming component required')
    old_flush=b"                    if (!fflush($h) || (function_exists('fsync')&&!fsync($h))) { throw new RuntimeException('Private streaming flush failed'); }"
    full_flush=b"                    $mustSync=$this->profile!=='full-private-host'||($before['bytes']===0&&$offset<=self::CHUNK)||$offset%1048576===0||$offset===$spec['bytes'];\n                    if (!fflush($h) || ($mustSync&&function_exists('fsync')&&!fsync($h))) { throw new RuntimeException('Private streaming flush failed'); }"
    changes=[(b'final class KTK_Content_Update_Streaming_Seeds\n',b'final class KTK_Full_Private_Engine_Streaming_Seeds\n'),(b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:67108864; $this->stepFiles=$profile==='default'?self::STEP_FILES:256;",b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:33554432; $this->stepFiles=$profile==='default'?self::STEP_FILES:128;"),(old_flush,full_flush)]
    if any(raw.count(a)!=1 for a,_ in changes):raise ValueError('Exact bounded engine-stream anchors required')
    for a,b in changes:raw=raw.replace(a,b,1)
    return raw
