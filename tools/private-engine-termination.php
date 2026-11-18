<?php
/** Separate current-witness private operations. No public, database or payload-deletion writer. */
if (!defined('KTK_PRIVATE_ENGINE_TERMINATION_ALLOWED') || KTK_PRIVATE_ENGINE_TERMINATION_ALLOWED!==true) { throw new RuntimeException('Explicit current-witness private termination caller required'); }

final class KTK_Private_Engine_Termination
{
    private array $config;
    private $capture;
    private $observer;
    private $clock;
    private $budgetClock;
    private ?KTK_Private_Engine_Cleanup_Budget $budget=null;
    private static function json($v): string { return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function canonical($v) { if(is_array($v)){if(!array_is_list($v)){ksort($v);}foreach($v as $k=>$x){$v[$k]=self::canonical($x);}}return $v; }
    private static function sha($v): string { return hash('sha256',self::json(self::canonical($v))); }
    private static function digest($v): bool { return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1; }
    public function __construct(array $config,callable $capture,?callable $observer=null,?callable $clock=null,?callable $budgetClock=null)
    {
        $keys=array_keys($config);sort($keys);
        if($keys!==array('authority','fenced','initial','schemaVersion','scope')||$config['schemaVersion']!==1||$config['scope']!=='current-witness-private-engine-termination'||!is_array($config['initial'])||!is_array($config['authority'])){throw new RuntimeException('Exact separate private termination configuration required');}
        $a=$config['authority'];$keys=array_keys($a);sort($keys);
        if($keys!==array('applicationCommit','closureSha256','expires','fenceOperationId','freshProtectedStateSha256','freshPublicOwnedSha256','inspectionStateSha256','metadataArchiveSha256','operation','operationId','originalArchiveSha256','originalManifestSha256','originalTokenSha256','schemaVersion','scope','tokenSha256','transactionId','witnessArchiveSha256')||$a['schemaVersion']!==1||$a['scope']!=='fresh-witness-private-engine-termination'||!in_array($a['operation'],array('inspect','inspect-fenced','fence','cleanup'),true)||!is_string($a['operationId'])||preg_match('/^[a-f0-9]{32}$/D',$a['operationId'])!==1||!is_string($a['transactionId'])||preg_match('/^[a-f0-9]{32}$/D',$a['transactionId'])!==1||$a['operationId']===$a['transactionId']||!is_string($a['applicationCommit'])||preg_match('/^[a-f0-9]{40}$/D',$a['applicationCommit'])!==1||!is_int($a['expires'])){throw new RuntimeException('Exact typed termination authority required');}
        foreach(array('freshProtectedStateSha256','freshPublicOwnedSha256','originalArchiveSha256','originalManifestSha256','witnessArchiveSha256','originalTokenSha256','tokenSha256') as $n){if(!self::digest($a[$n])){throw new RuntimeException('Exact fresh/original source and witness digests required');}}
        if(hash_equals($a['originalTokenSha256'],$a['tokenSha256'])){throw new RuntimeException('Original execution token cannot authorize termination');}
        $i=$config['initial'];$ik=array_keys($i);sort($ik);
        if($ik!==array('freshProtectedStateSha256','originalHelperSha256','originalManifestSha256','overrides','ownershipKey','plan','publicRoot','sizes')||!is_array($i['plan'])||!is_array($i['sizes'])||!is_array($i['overrides'])||!is_string($i['publicRoot'])||basename($i['publicRoot'])!=='public_html'||!self::digest($i['originalHelperSha256'])||!self::digest($i['ownershipKey'])){throw new RuntimeException('Exact private initial inspection scope required');}
        if(($i['plan']['transactionId']??null)!==$a['transactionId']||($i['plan']['applicationCommit']??null)!==$a['applicationCommit']||($i['originalManifestSha256']??null)!==$a['originalManifestSha256']||($i['freshProtectedStateSha256']??null)!==$a['freshProtectedStateSha256']){throw new RuntimeException('Original private plan/current authority differ');}
        if($a['operation']==='inspect'){
            if($config['fenced']!==null||$a['metadataArchiveSha256']!==null||$a['inspectionStateSha256']!==null||$a['closureSha256']!==null||$a['fenceOperationId']!==null){throw new RuntimeException('Initial read-only inspection cannot carry mutation bindings');}
        }else{
            foreach(array('metadataArchiveSha256','inspectionStateSha256','closureSha256') as $n){if(!self::digest($a[$n])){throw new RuntimeException('Exact immutable metadata/census/closure digests required');}}
            if(!is_string($a['fenceOperationId'])||preg_match('/^[a-f0-9]{32}$/D',$a['fenceOperationId'])!==1||$a['fenceOperationId']===$a['transactionId']||(($a['fenceOperationId']===$a['operationId'])!==($a['operation']==='fence'))||!is_array($config['fenced'])){throw new RuntimeException('Exact immutable initial fence provenance required');}
            $f=$config['fenced'];
            foreach(array('publicRoot','ownershipKey','plan','sizes') as $n){if(!isset($i[$n],$f[$n])||self::canonical($i[$n])!==self::canonical($f[$n])){throw new RuntimeException('Initial/fenced private source scope differs');}}
            if(($f['freshProtectedStateSha256']??null)!==$a['freshProtectedStateSha256']||($f['freshPublicOwnedSha256']??null)!==$a['freshPublicOwnedSha256']||($f['initialInspection']['stateSha256']??null)!==$a['inspectionStateSha256']||($f['initialInspection']['originalManifestSha256']??null)!==$a['originalManifestSha256']||($f['fence']['operationId']??null)!==$a['fenceOperationId']||($f['fence']['metadataArchiveSha256']??null)!==$a['metadataArchiveSha256']||($f['fence']['originalArchiveSha256']??null)!==$a['originalArchiveSha256']||!is_string($f['closureBlob']??null)||($blob=base64_decode($f['closureBlob'],true))===false||hash('sha256',$blob)!==$a['closureSha256']){throw new RuntimeException('Exact archived fence/current witness binding differs');}
            if($a['operation']==='fence'&&(($f['fence']['witnessArchiveSha256']??null)!==$a['witnessArchiveSha256']||($f['initialInspection']['freshWitnessProtectedStateSha256']??null)!==$a['freshProtectedStateSha256'])){throw new RuntimeException('Initial fence requires its exact complete inspected witness state');}
        }
        $this->config=$config;$this->capture=$capture;$this->observer=$observer;$this->clock=$clock??static fn()=>time();$this->budgetClock=$budgetClock;
    }
    private function currentTime(): int
    {
        $now=($this->clock)();$expires=$this->config['authority']['expires'];
        if(!is_int($now)||$now>=$expires||$expires>$now+3600){throw new RuntimeException('Current bounded termination lifetime ended; preserve state and context');}return $now;
    }
    private function fresh(): array
    {
        $started=$this->budget===null?null:$this->budget->now();
        $this->currentTime();
        $v=($this->capture)();$this->currentTime();$keys=is_array($v)?array_keys($v):array();sort($keys);$a=$this->config['authority'];
        if($keys!==array('ownedContentFiles','protectedStateSha256')||$v['protectedStateSha256']!==$a['freshProtectedStateSha256']||!is_array($v['ownedContentFiles'])||!hash_equals(self::sha($v['ownedContentFiles']),$a['freshPublicOwnedSha256'])){throw new RuntimeException('Complete current protected/public witness changed; preserve every value');}
        if($this->budget!==null){$this->budget->witness($started);}return $v;
    }
    private function census(callable $capture): array {return $this->budget===null?$capture():$this->budget->census($capture);}
    private function claim(KTK_Content_Update_Private_Store $store,string $method,string $host,string $token,int $now): array
    {
        $a=$this->config['authority'];$names=array('schemaVersion','scope','operation','operationId','transactionId','applicationCommit','expires','tokenSha256','freshProtectedStateSha256','freshPublicOwnedSha256','witnessArchiveSha256','metadataArchiveSha256','inspectionStateSha256','closureSha256');$c=array_intersect_key($a,array_fill_keys($names,true));$c['publicRoot']=$this->config['initial']['publicRoot'];$c['rootBinding']=$store->rootBinding();
        $observer=$this->observer===null?null:function($event,$path){($this->observer)($event,$path,null);};
        $claim=new KTK_Private_Engine_Termination_Claim($c,$store,function(){$this->fresh();return true;},$observer);return $claim->consume($method,$host,$token,$this->currentTime());
    }
    private function fenceReceipt(KTK_Content_Update_Private_Store $store,KTK_Private_Engine_Fenced_Inspection $reader,array $before,int $writes): array
    {
        $a=$this->config['authority'];$reader->assertHeldEngineLock($store);$this->currentTime();
        if(($before['scope']??null)!=='fenced-private-engine-readonly-inspection'||($before['initialInspectionStateSha256']??null)!==$a['inspectionStateSha256']||($before['freshWitnessVerified']??null)!==true||($before['originalExecutionHelperAbsent']??null)!==true){throw new RuntimeException('Exact current pre-mutation archived census required');}
        $parts=explode("\n",base64_decode($this->config['fenced']['closureBlob'],true),3);$closed=$store->read('closed.json');$descriptor=$store->recordDescriptor('closed.json');
        if($closed!==$parts[2]||$descriptor['sha256']!==$a['closureSha256']){throw new RuntimeException('Exact signed closure readback required; preserve consumed context');}
        $old=$this->config['initial']['publicRoot'].'/staging/wp-content/mu-plugins/ktk-transaction-rehearsal-'.$a['transactionId'].'.php';
        if(file_exists($old)||is_link($old)){throw new RuntimeException('Original execution helper must remain absent after fencing');}
        $reader->assertHeldEngineLock($store);$this->currentTime();
        $receipt=array('schemaVersion'=>1,'scope'=>'private-engine-fence-write-receipt','transactionId'=>$a['transactionId'],'applicationCommit'=>$a['applicationCommit'],'rootBinding'=>$store->rootBinding(),'fenceOperationId'=>$a['fenceOperationId'],'closureSha256'=>$a['closureSha256'],'closureState'=>$before['closureState']==='original-rolled-back'?'original-rolled-back':'complete','signedClosureComplete'=>true,'preMutationCensusVerified'=>true,'preMutationInspection'=>$before,'postMutationCensusVerified'=>false,'freshInspectionRequiredBeforeCleanup'=>true,'freshProtectedStateSha256'=>$a['freshProtectedStateSha256'],'freshPublicOwnedSha256'=>$a['freshPublicOwnedSha256'],'freshWitnessVerified'=>true,'readOnly'=>false,'closureWrites'=>$writes,'payloadDeletes'=>0,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0);
        $receipt['stateSha256']=self::sha($receipt);return $receipt;
    }
    public function run(string $raw,string $method,string $host,string $token,int $now): array
    {
        $a=$this->config['authority'];
        if($method!=='POST'||strtolower($host)!=='krawlthroughkrakow.com'||$now>=$a['expires']||$a['expires']>$now+3600||!hash_equals($a['tokenSha256'],hash('sha256',$token))||strlen($raw)>2048){throw new RuntimeException('Current distinct staging-only termination authority required');}
        $r=json_decode($raw,true,16,JSON_THROW_ON_ERROR);$actions=array('inspect'=>array('inspect'),'inspect-fenced'=>array('inspect-fenced'),'fence'=>array('fence'),'cleanup'=>array('complete-closure','cleanup-payload'));
        $keys=array('schemaVersion','action','operation','operationId','transactionId','applicationCommit','metadataArchiveSha256','inspectionStateSha256','closureSha256');if($a['operation']==='cleanup'){$keys[]='stateSha256';}
        if(!is_array($r)||array_keys($r)!==$keys||($r['schemaVersion']??null)!==1||!in_array($r['action']??null,$actions[$a['operation']],true)||self::json($r)!==$raw){throw new RuntimeException('Exact canonical typed termination request required');}
        foreach(array('operation','operationId','transactionId','applicationCommit','metadataArchiveSha256','inspectionStateSha256','closureSha256') as $n){if($r[$n]!==$a[$n]){throw new RuntimeException('Termination request authority differs');}}
        if($a['operation']==='cleanup'&&!self::digest($r['stateSha256'])){throw new RuntimeException('Exact freshly inspected remaining state required');}
        if($a['operation']==='cleanup'&&$r['action']==='cleanup-payload'){$this->budget=new KTK_Private_Engine_Cleanup_Budget($this->budgetClock);}
        $this->fresh();$i=$this->config['initial'];$root=dirname($i['publicRoot']).'/.ktk-content-update-'.$a['transactionId'];$store=new KTK_Content_Update_Private_Store($root,$i['publicRoot'],$a['transactionId'],$i['ownershipKey'],$this->observer);$owner=null;$reader=null;$claim=null;$writes=0;$deleted=0;$removed=0;$budgetStopped=false;$initialVerified=false;
        try{
            if($a['operation']==='inspect'){
                $owner=new KTK_Private_Engine_Abandonment_Inspection($i,fn()=>$this->fresh());$initial=$owner->inspect($store);
                $state=$initial;$initialVerified=true;
            }
            if($a['operation']!=='inspect'){
                $reader=new KTK_Private_Engine_Fenced_Inspection($this->config['fenced'],fn()=>$this->fresh(),$owner);$state=$this->census(static fn()=>$reader->inspect($store));
                if($a['operation']==='fence'||$a['operation']==='cleanup'){
                    if(!$state['originalExecutionHelperAbsent']){throw new RuntimeException('Original execution helper must remain absent before mutation');}
                    if($a['operation']==='cleanup'){if(!hash_equals($state['stateSha256'],$r['stateSha256'])){throw new RuntimeException('Exact freshly inspected cleanup state required');}if($r['action']==='complete-closure'&&!$state['closureOnlyRecoveryRequired']){throw new RuntimeException('Exact incomplete closure state required; no payload deletion in this invocation');}if($r['action']==='cleanup-payload'){if(!$state['signedClosureComplete']){throw new RuntimeException('Complete the same signed closure in a separate invocation before payload cleanup');}$dirs=array_filter($state['directories'],static fn($n)=>$n==='source'||$n==='target'||str_starts_with($n,'source/')||str_starts_with($n,'target/'));if($state['remainingPayloadFiles']===0&&count($dirs)===0){throw new RuntimeException('No known payload or source-target directories remain; preserve context');}}}
                    $claim=$this->claim($store,$method,$host,$token,$now);$this->fresh();$latest=$this->census(static fn()=>$reader->inspect($store));
                    if($latest['stateSha256']!==$state['stateSha256']){throw new RuntimeException('Private state changed after claim; preserve consumed context');}
                    if($a['operation']==='cleanup'&&$r['action']==='cleanup-payload'){
                        $cleanup=new KTK_Private_Engine_Payload_Cleanup(array('authority'=>$a,'fenced'=>$this->config['fenced'],'claim'=>$claim),fn()=>$this->fresh(),$this->observer,$this->clock,$this->budget);$op=$cleanup->run($store,$reader,$latest);$state=$op['state'];$deleted=$op['payloadDeletes'];$removed=$op['payloadDirectoriesRemoved'];$budgetStopped=$op['stoppedForRuntimeBudget'];
                    }else{
                    $parts=explode("\n",base64_decode($this->config['fenced']['closureBlob'],true),3);$existing=$store->read('closed.json');
                    if($existing===null){$this->currentTime();$store->writeOnce('closed.json',$parts[2]);$writes=1;}
                    elseif($existing!==$parts[2]){throw new RuntimeException('Accepted original closure must remain exact');}
                    $descriptor=$store->recordDescriptor('closed.json');if($descriptor['sha256']!==$a['closureSha256']){throw new RuntimeException('Signed closure bytes differ after write');}
                    if($a['operation']==='fence'){
                        // Both complete archived censuses above precede the only closure write.
                        // Return its signed readback, never an invented post-write payload census.
                        $state=$this->fenceReceipt($store,$reader,$latest,$writes);
                    }else{
                        $state=$this->census(static fn()=>$reader->inspect($store));if(!$state['signedClosureComplete']){throw new RuntimeException('Closure reply uncertain; use a new witnessed context');}
                    }
                    }
                }
            }
            $this->fresh();$result=array('schemaVersion'=>1,'scope'=>'current-witness-private-engine-termination','operationId'=>$a['operationId'],'operation'=>$a['operation'],'action'=>$r['action'],'transactionId'=>$a['transactionId'],'applicationCommit'=>$a['applicationCommit'],'initialNativeInspectionVerified'=>$initialVerified,'state'=>$state,'claim'=>$claim,'closureWrites'=>$writes,'payloadDeletes'=>$deleted,'payloadDirectoriesRemoved'=>$removed,'cleanupStoppedForRuntimeBudget'=>$budgetStopped,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0,'fullHostTransactionAcceptance'=>false);
            if(strlen(self::json($result))>2095104){throw new RuntimeException('Bounded termination response required; preserve context and state');}return $result;
        }finally{if($reader!==null){$reader->releaseEngineLock();}if($owner!==null){$owner->releaseEngineLock();}}
    }
}
