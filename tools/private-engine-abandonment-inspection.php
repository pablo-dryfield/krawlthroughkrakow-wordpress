<?php
/** Read-only private fixture census. No hook, authority, closure or deletion writer. */
if (!defined('KTK_PRIVATE_ENGINE_ABANDONMENT_INSPECTION_ALLOWED') || KTK_PRIVATE_ENGINE_ABANDONMENT_INSPECTION_ALLOWED!==true) {
    throw new RuntimeException('Explicit private abandonment inspection required');
}

final class KTK_Private_Engine_Abandonment_Inspection
{
    private array $config;
    private $freshCapture;
    private KTK_Full_Private_Engine_Preparation $preparation;
    private ?KTK_Read_Only_Private_Engine $heldEngine=null;
    private static function canonical($v) { if(is_array($v)){if(!array_is_list($v)){ksort($v);}foreach($v as $k=>$x){$v[$k]=self::canonical($x);}}return $v; }
    private static function json($v): string { return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function sha($v): string { return hash('sha256',self::json(self::canonical($v))); }
    private static function digest($v): bool { return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1; }
    private static function directory(string $path): void
    {
        if(is_link($path)||!is_dir($path)||str_replace('\\','/',(string)realpath($path))!==$path){throw new RuntimeException('Canonical existing private directory required');}
    }
    public function releaseEngineLock(): void { $this->heldEngine=null; }
    public function __destruct() { $this->releaseEngineLock(); }
    public function __construct(array $config,callable $freshCapture)
    {
        $keys=array_keys($config);sort($keys);
        if($keys!==array('freshProtectedStateSha256','originalHelperSha256','originalManifestSha256','overrides','ownershipKey','plan','publicRoot','sizes')||!is_array($config['plan'])||!is_array($config['sizes'])||!is_array($config['overrides'])||!is_string($config['publicRoot'])||basename($config['publicRoot'])!=='public_html'){
            throw new RuntimeException('Exact private inspection context required');
        }
        foreach(array('freshProtectedStateSha256','originalHelperSha256','originalManifestSha256','ownershipKey') as $key){if(!self::digest($config[$key])){throw new RuntimeException('Exact private inspection digests required');}}
        self::directory($config['publicRoot']);$this->config=$config;$this->freshCapture=$freshCapture;
        $this->preparation=new KTK_Full_Private_Engine_Preparation($config['publicRoot'],$config['plan'],$config['sizes'],$config['overrides'],$config['ownershipKey'],$config['originalHelperSha256'],fn()=>$this->privatePlanGuard());
    }
    private function fresh(): array
    {
        $value=($this->freshCapture)();$keys=is_array($value)?array_keys($value):array();sort($keys);
        if($keys!==array('ownedContentFiles','protectedStateSha256')||$value['protectedStateSha256']!==$this->config['freshProtectedStateSha256']||!is_array($value['ownedContentFiles'])||self::canonical($value['ownedContentFiles'])!==self::canonical($this->config['plan']['expected'])){
            throw new RuntimeException('Complete fresh protected/public witness changed; no restoration');
        }
        return $value;
    }
    private function privatePlanGuard(): string
    {
        // This is an internal private-plan compatibility binding. The current
        // complete raw witness is checked independently; original equality is
        // reported separately and an archived capture is never returned.
        $this->fresh();return $this->config['plan']['protectedStateSha256'];
    }
    private function walk(string $root,KTK_Content_Update_Private_Store $store): array
    {
        self::directory($root);$files=array();$directories=array();$count=0;$total=0;$limit=2*array_sum($this->config['sizes'])+134217728;
        foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $entry){
            if(++$count>20000||$entry->isLink()){throw new RuntimeException('Unknown or linked private member preserved');}
            $path=str_replace('\\','/',$entry->getPathname());$name=substr($path,strlen($root)+1);
            if($entry->isDir()){self::directory($path);$directories[$name]=true;continue;}
            clearstatcache(true,$path);$before=@lstat($path);
            if(!$entry->isFile()||$before===false||($before['nlink']??0)!==1||$before['size']<0||($total+=$before['size'])>$limit){throw new RuntimeException('Unsafe or oversized private file preserved');}
            if($name==='controller.lock'){
                // The frozen store verifies these 64 ownership bytes through
                // its held handle, including inode and position checks.
                $owner=$store->rootBinding();clearstatcache(true,$path);$after=@lstat($path);
                if($before['size']!==64||$after===false||is_link($path)||$after['dev']!==$before['dev']||$after['ino']!==$before['ino']||$after['size']!==64||($after['nlink']??0)!==1){throw new RuntimeException('Held controller ownership record changed');}
                $files[$name]=array('sha256'=>hash('sha256',$owner),'bytes'=>64);continue;
            }
            $h=fopen($path,'rb');if(!$h){throw new RuntimeException('Cannot read held private member');}
            try{
                $held=fstat($h);if($held===false||$held['dev']!==$before['dev']||$held['ino']!==$before['ino']||$held['size']!==$before['size']){throw new RuntimeException('Private member changed while opening');}
                // Windows may deny reading an exclusively held empty lock.
                // Its exact empty digest needs no read; all held/path identity
                // and size checks still run before and after this branch.
                $hash=hash_init('sha256');$bytes=$before['size']===0?0:@hash_update_stream($hash,$h);$after=fstat($h);clearstatcache(true,$path);$current=@lstat($path);
                if($bytes!==$before['size']||$after===false||$current===false||is_link($path)||$after['dev']!==$before['dev']||$after['ino']!==$before['ino']||$after['size']!==$before['size']||$current['dev']!==$before['dev']||$current['ino']!==$before['ino']||$current['size']!==$before['size']||($current['nlink']??0)!==1){throw new RuntimeException('Private member changed while reading');}
                $files[$name]=array('sha256'=>hash_final($hash),'bytes'=>$bytes);
            }finally{fclose($h);}
        }
        ksort($files);ksort($directories);return array('files'=>$files,'directories'=>array_keys($directories));
    }
    private static function below(array $files,string $prefix): array
    {
        $result=array();foreach($files as $name=>$row){if(str_starts_with($name,$prefix)){$result[substr($name,strlen($prefix))]=$row;}}ksort($result);return $result;
    }
    private static function hashes(array $files): array { $v=array();foreach($files as $n=>$r){$v[$n]=$r['sha256'];}ksort($v);return $v; }
    private static function parents(array &$dirs,string $name): void
    {
        for($p=dirname($name);$p!=='.';$p=dirname($p)){$dirs[$p]=true;}
    }
    private function journal(string $path,array $plan): array
    {
        if(filesize($path)>16777216){throw new RuntimeException('Bounded private journal required');}
        $j=json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR);$keys=is_array($j)?array_keys($j):array();sort($keys);
        if($keys!==array('backups','binding','events','intents','phase')||!is_array($j['intents'])||!is_array($j['backups'])||!is_array($j['events'])||!array_is_list($j['events'])||count($j['events'])>5000||!in_array($j['phase'],array('unprepared','prepared','applying','uncertain','applied','rolling-back','rolled-back'),true)){throw new RuntimeException('Known private journal schema and phase required');}
        foreach($j['intents'] as $name=>$v){if($v!==true||!isset($plan['expected'][$name])||$plan['expected'][$name]===($plan['prior'][$name]??null)){throw new RuntimeException('Known private intent required');}}
        $fixed=array('verified-prior-files-before-first-application-write','complete-owned-hashes-and-protected-state-verified','interruption-inspect-before-recovery','exact-prior-inventory-and-retained-activation-verified');
        foreach($j['events'] as $event){
            if(!is_string($event)||strlen($event)>1024){throw new RuntimeException('Unknown private event preserved');}
            if(in_array($event,$fixed,true)){continue;}$known=false;
            foreach(array('intent:','cancelled-before-replacement:','installed:','restored:') as $prefix){if(str_starts_with($event,$prefix)){$name=substr($event,strlen($prefix));$known=isset($plan['expected'][$name])&&$plan['expected'][$name]!==($plan['prior'][$name]??null);break;}}
            if(!$known){throw new RuntimeException('Unknown private event preserved');}
        }
        return $j;
    }
    private function controls(KTK_Content_Update_Private_Store $store,array $plan,string $phase,bool $hasEngine): array
    {
        $base=array('schemaVersion'=>1,'mode'=>'private-staging-rehearsal','transactionId'=>$plan['transactionId'],'applicationCommit'=>$plan['applicationCommit'],'planSha256'=>self::sha($plan));$result=array();
        foreach(array('backup-ack.json','closed.json') as $name){
            $raw=$store->read($name);if($raw===null){$result[$name]=null;continue;}
            $v=json_decode($raw,true,64,JSON_THROW_ON_ERROR);$keys=is_array($v)?array_keys($v):array();sort($keys);
            $expected=$name==='backup-ack.json'?array('acknowledgedStateSha256','applicationCommit','archiveSha256','exportSha256','mode','planSha256','schemaVersion','transactionId'):array('applicationCommit','archiveSha256','exportSha256','mode','payloadRetained','planSha256','schemaVersion','stateSha256','terminalPhase','transactionId');
            if($keys!==$expected){throw new RuntimeException('Unknown signed control schema preserved');}
            foreach($base as $key=>$value){if($v[$key]!==$value){throw new RuntimeException('Signed control binding differs');}}
            foreach(array('archiveSha256','exportSha256',$name==='backup-ack.json'?'acknowledgedStateSha256':'stateSha256') as $key){if(!self::digest($v[$key])){throw new RuntimeException('Signed archive/control digest required');}}
            if(!$hasEngine||$phase==='unprepared'){throw new RuntimeException('Archive acknowledgment cannot precede a prepared engine');}
            if($name==='closed.json'&&($phase!=='rolled-back'||$v['terminalPhase']!=='rolled-back'||$v['payloadRetained']!==true)){throw new RuntimeException('Only an original rolled-back closure may enter initial inspection');}
            $result[$name]=$v;
        }
        if(in_array($phase,array('applying','uncertain','applied','rolling-back','rolled-back'),true)&&$result['backup-ack.json']===null){throw new RuntimeException('Original signed archive acknowledgment required for an active engine');}
        if($result['closed.json']!==null&&($result['backup-ack.json']===null||$result['closed.json']['archiveSha256']!==$result['backup-ack.json']['archiveSha256']||$result['closed.json']['exportSha256']!==$result['backup-ack.json']['exportSha256'])){throw new RuntimeException('Signed terminal archive bindings differ');}
        return $result;
    }
    public function inspect(KTK_Content_Update_Private_Store $store): array
    {
        if($this->heldEngine!==null){throw new RuntimeException('Retain the existing census until its caller releases the engine lock');}
        $fresh=$this->fresh();$plan=$this->config['plan'];$root=dirname($this->config['publicRoot']).'/.ktk-content-update-'.$plan['transactionId'];
        if($store->privateRoot()!==$root||$store->transactionId()!==$plan['transactionId']){throw new RuntimeException('Exact owned private fixture required');}
        $capsule=$this->preparation->capsule($store);if($capsule['manifestSha256']!==$this->config['originalManifestSha256']){throw new RuntimeException('Original archived capsule differs');}
        $control=$store->inventory();$before=$this->walk($root,$store);$allowed=array('owner.marker'=>true,'controller.lock'=>true);$dirs=array('control'=>true);
        if(($before['files']['controller.lock']??null)!==array('sha256'=>hash('sha256',$store->rootBinding()),'bytes'=>64)){throw new RuntimeException('Existing authenticated controller lock required');}
        foreach($control as $name=>$digest){if(!in_array($name,array('original-state.json','controller-plan.json','backup-ack.json','closed.json'),true)){throw new RuntimeException('Retained control temporary needs explicit ownership validation');}$key='control/'.$name;if(($before['files'][$key]['sha256']??null)!==$digest){throw new RuntimeException('Authenticated control bytes differ');}$allowed[$key]=true;}
        $originalControl=json_decode($store->read('controller-plan.json'),true,64,JSON_THROW_ON_ERROR);$originalPlan=$originalControl['enginePlan'];
        $engine='engine/'.$plan['transactionId'];$lock='engine/target-'.hash('sha256',$root.'/target').'.lock';$engineFiles=self::below($before['files'],$engine.'/');$phase='seeding';$view=null;$seed=null;
        $hasEngine=in_array($engine,$before['directories'],true);$hasLock=isset($before['files'][$lock]);$artifacts=array();
        if(in_array('engine',$before['directories'],true)){$dirs['engine']=true;}
        if($hasLock){if($before['files'][$lock]['bytes']!==0){throw new RuntimeException('Known empty engine lock required');}$allowed[$lock]=true;}
        if(!$hasEngine){
            $seed=$this->preparation->inspect($store);
            if($hasLock&&(!$seed['sourceComplete']||!$seed['targetComplete'])){throw new RuntimeException('Engine lock cannot precede complete seeds');}
            if($hasLock){$phase='engine-lock-only';}
            foreach($seed['files'] as $name=>$row){if(($before['files'][$name]??null)!==$row){throw new RuntimeException('Known private prefix differs');}$allowed[$name]=true;}
            foreach($seed['directories'] as $name){$dirs[$name]=true;}
        }else{
            if(!$hasLock){throw new RuntimeException('Existing engine lock required; read-only inspection cannot initialize it');}
            $source=self::below($before['files'],'source/');$target=self::below($before['files'],'target/');
            if(self::hashes($source)!==self::canonical($plan['expected'])){throw new RuntimeException('Complete original private source required before engine inspection');}
            foreach($source as $name=>$row){if($row['bytes']!==$this->config['sizes'][$name]){throw new RuntimeException('Private source size differs');}$allowed['source/'.$name]=true;}
            foreach($target as $name=>$row){if(!isset($plan['expected'][$name])&&!isset($plan['prior'][$name])){throw new RuntimeException('Unknown private target preserved');}$allowed['target/'.$name]=true;}
            $j=isset($engineFiles['journal.json'])?$this->journal($root.'/'.$engine.'/journal.json',$plan):null;
            $phase=$j['phase']??'unprepared';
            // The separately compiled reader cannot create a missing lock or
            // transaction directory, even if either disappears after census.
            $transaction=new KTK_Read_Only_Private_Engine($root.'/source',$root.'/target',$root.'/engine',$originalPlan,fn()=>$this->privatePlanGuard());
            $this->heldEngine=$transaction;
            try{
                if($phase==='unprepared'){
                    $view=$transaction->inspectPreparation();
                    foreach($view['files'] as $name=>$row){if(($engineFiles[$name]??null)!==$row){throw new RuntimeException('Private preparation artifact differs');}$allowed[$engine.'/'.$name]=true;}
                    foreach($view['directories'] as $name){$dirs[$engine.'/'.$name]=true;}
                }else{
                    $view=$transaction->inspect();
                    if(!$view['backupVerified']||!$view['protectedStateVerified']||!$view['privateTemporaryInspectionVerified']||!$view['privateReceiptInspectionVerified']){
                        throw new RuntimeException('Intact private engine required before artifact ownership validation');
                    }
                    if($phase==='prepared'&&($j['intents']!==array()||$j['events']!==array('verified-prior-files-before-first-application-write')||!$view['currentPriorInventoryVerified'])){throw new RuntimeException('Exact original prepared journal required');}
                    $actual=self::hashes($target);if($actual!==$view['actual']){throw new RuntimeException('Complete private target inventory differs');}
                    foreach($plan['prior'] as $name=>$hash){if(!isset($actual[$name])||($actual[$name]!==$hash&&$actual[$name]!==($plan['expected'][$name]??null))){throw new RuntimeException('Changed private prior preserved');}}
                    foreach($actual as $name=>$hash){if($hash!==($plan['prior'][$name]??null)&&($hash!==($plan['expected'][$name]??null)||!isset($j['intents'][$name]))){throw new RuntimeException('Unowned private replacement preserved');}}
                    if(($phase==='applied'&&!$view['currentExpectedInventoryVerified'])||($phase==='rolled-back'&&!$view['currentPriorInventoryVerified'])){throw new RuntimeException('Private terminal inventory differs');}
                    $required=array('ktk-code-pages-production.php'=>$plan['prior']['ktk-code-pages-production.php'],'ktk-code-pages.php'=>$plan['prior']['ktk-code-pages.php'],'ktk-code-pages-assets/registry.php'=>$plan['prior']['ktk-code-pages-assets/registry.php']);
                    foreach($plan['expected'] as $name=>$hash){if(isset($plan['prior'][$name])&&$plan['prior'][$name]!==$hash){$required[$name]=$plan['prior'][$name];}}
                    ksort($required);if($j['backups']!==$required){throw new RuntimeException('Exact private backup inventory required');}
                    $allowed[$engine.'/plan.json']=$allowed[$engine.'/journal.json']=true;
                    foreach($required as $name=>$hash){$key=$engine.'/prior/'.$name;if(($before['files'][$key]['sha256']??null)!==$hash){throw new RuntimeException('Changed private backup preserved');}$allowed[$key]=true;self::parents($dirs,$key);}
                    $artifacts=KTK_Private_Engine_Abandonment_Artifacts::inspect($root,$engine,$plan,$j,$actual,$before['files'],$view);
                    foreach($artifacts as $key=>$proof){$allowed[$key]=true;}
                    $dirs[$engine.'/receipts']=$dirs[$engine.'/pending']=true;
                }
            }finally{unset($transaction);}
            $dirs['source']=$dirs['target']=$dirs[$engine]=true;
            foreach(array_keys($source) as $name){self::parents($dirs,'source/'.$name);}
            foreach(array_keys($target) as $name){self::parents($dirs,'target/'.$name);}
        }
        $controls=$this->controls($store,$plan,$phase,$hasEngine);
        foreach($before['files'] as $name=>$row){if(!isset($allowed[$name])){throw new RuntimeException('Unknown private member preserved');}}
        foreach($before['directories'] as $name){if(!isset($dirs[$name])){throw new RuntimeException('Unknown private directory preserved');}}
        $this->fresh();if($this->walk($root,$store)!==$before||$store->inventory()!==$control){throw new RuntimeException('Private census changed; inspect again without mutation');}$store->rootBinding();
        if(is_array($view)){unset($view['protectedStateVerified']);}
        $result=array('schemaVersion'=>1,'scope'=>'private-engine-abandonment-readonly-inspection','transactionId'=>$plan['transactionId'],'applicationCommit'=>$plan['applicationCommit'],'rootBinding'=>$store->rootBinding(),'originalManifestSha256'=>$capsule['manifestSha256'],'freshWitnessProtectedStateSha256'=>$fresh['protectedStateSha256'],'originalProtectedStateStillExact'=>$fresh['protectedStateSha256']===$plan['protectedStateSha256'],'freshWitnessVerified'=>true,'privatePlanGuardMeaning'=>'original private-plan compatibility after an independent complete fresh witness check','phase'=>$phase,'seed'=>$seed,'engine'=>$view,'files'=>$before['files'],'directories'=>$before['directories'],'control'=>$control,'originalRollbackAcknowledged'=>$controls['backup-ack.json']!==null,'originalRolledBackClosurePresent'=>$controls['closed.json']!==null,'readOnly'=>true,'closureWrites'=>0,'payloadWrites'=>0,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0);
        $result['validatedArtifacts']=$artifacts;$result['stateSha256']=self::sha($result);return $result;
    }
}
