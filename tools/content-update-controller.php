<?php
/** Authenticated, fenced code-page controller library. No HTTP hook, deployment or approval inference. */
if (!defined('KTK_CONTENT_UPDATE_CONTROLLER_ALLOWED') || KTK_CONTENT_UPDATE_CONTROLLER_ALLOWED !== true) {
    throw new RuntimeException('Explicit content-update controller caller required');
}

final class KTK_Content_Update_Controller
{
    private array $packet;
    private array $binding;
    private string $root;
    private string $source;
    private string $target;
    private $capture;
    private $fingerprint;
    private $initialize;
    private $observer;
    private $inspectPrivateFixture;
    private $completePrivateFixture;
    private $targetLock=null;
    private ?string $targetLockPath=null;
    private ?string $targetLockBytes=null;
    private const MARKER='ktk-code-pages-production.php';
    private const MARKER_SHA='b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833';

    private static function caller(): void
    {
        if (!defined('KTK_CONTENT_UPDATE_CONTROLLER_ALLOWED') || KTK_CONTENT_UPDATE_CONTROLLER_ALLOWED!==true) { throw new RuntimeException('Explicit content-update controller caller required'); }
    }
    private static function encode($value): string { return json_encode($value,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function canonical($value) { if(is_array($value)){if(!array_is_list($value)){ksort($value);}foreach($value as $key=>$part){$value[$key]=self::canonical($part);}}return $value; }
    private static function digest($value): bool { return is_string($value)&&preg_match('/^[a-f0-9]{64}$/D',$value)===1; }
    private static function directory(string $path): string
    {
        clearstatcache(true,$path);$real=realpath($path);
        if($real===false||!is_dir($real)||str_replace('\\','/',$real)!==$path){throw new RuntimeException('Canonical controller directory required');}
        for($part=$path;;$part=dirname($part)){if(is_link($part)){throw new RuntimeException('Controller symlink ancestor refused');}if(dirname($part)===$part){break;}}return $path;
    }
    private static function validatePlan(array $plan): void
    {
        $keys=array_keys($plan);sort($keys);
        if($keys!==array('applicationCommit','expected','prior','protectedStateSha256','transactionId')||!is_string($plan['transactionId'])||!preg_match('/^[a-f0-9]{32}$/D',$plan['transactionId'])||!is_string($plan['applicationCommit'])||!preg_match('/^[a-f0-9]{40}$/D',$plan['applicationCommit'])||!self::digest($plan['protectedStateSha256'])||!is_array($plan['expected'])||!is_array($plan['prior'])){throw new RuntimeException('Exact controller engine plan required');}
        foreach(array('expected','prior') as $kind){$seen=array();foreach($plan[$kind] as $name=>$hash){if(!is_string($name)||!preg_match('/^[A-Za-z0-9._\/-]+$/D',$name)||array_intersect(explode('/',$name),array('','.','..'))||!($name==='ktk-code-pages.php'||str_starts_with($name,'ktk-code-pages-assets/')||($kind==='prior'&&$name===self::MARKER))||!self::digest($hash)||isset($seen[strtolower($name)])){throw new RuntimeException('Exact unambiguous code-page controller inventory required');}$seen[strtolower($name)]=true;}}
        if(($plan['prior'][self::MARKER]??null)!==self::MARKER_SHA||isset($plan['expected'][self::MARKER])||array_diff_key($plan['prior'],$plan['expected'],array(self::MARKER=>true))){throw new RuntimeException('Immutable active controller plan required');}
        foreach(array('ktk-code-pages.php','ktk-code-pages-assets/registry.php','ktk-code-pages-assets/runtime.css','ktk-code-pages-assets/runtime.js') as $name){if(!isset($plan['expected'][$name],$plan['prior'][$name])){throw new RuntimeException('Complete active controller inventory required');}}
    }
    public function __construct(array $packet,callable $capture,callable $fingerprint,?callable $initializePrivateFixture=null,?callable $observer=null,?callable $inspectPrivateFixture=null,?callable $completePrivateFixture=null)
    {
        self::caller();$keys=array_keys($packet);sort($keys);
        if($keys!==array('expires','helperPath','helperSha256','mode','ownershipKey','plan','productionAuthorizationSha256','publicOwnedSha256','publicRoot','stepLimit','tokenSha256')||!in_array($packet['mode'],array('production','private-staging-rehearsal'),true)||!is_array($packet['plan'])||!self::digest($packet['ownershipKey'])||!self::digest($packet['helperSha256'])||!self::digest($packet['tokenSha256'])||!is_int($packet['expires'])||!is_int($packet['stepLimit'])||$packet['stepLimit']<1||$packet['stepLimit']>100||!is_string($packet['publicRoot'])||!is_string($packet['helperPath'])){throw new RuntimeException('Exact server-side controller packet required');}
        self::validatePlan($packet['plan']);$plan=$packet['plan'];$planSha=hash('sha256',self::encode(self::canonical($plan)));
        $public=self::directory($packet['publicRoot']);if(basename($public)!=='public_html'){throw new RuntimeException('Complete public root required');}
        $this->root=self::directory(dirname($public)).'/.ktk-content-update-'.$plan['transactionId'];
        $this->binding=array('transactionId'=>$plan['transactionId'],'applicationCommit'=>$plan['applicationCommit'],'planSha256'=>$planSha);
        if($packet['mode']==='production'){
            $approval=array('transactionId'=>$plan['transactionId'],'planSha256'=>$planSha,'approvalSha256'=>$packet['productionAuthorizationSha256']);
            if(!self::digest($packet['productionAuthorizationSha256'])||$packet['publicOwnedSha256']!==null||$initializePrivateFixture!==null||$inspectPrivateFixture!==null||$completePrivateFixture!==null||!defined('KTK_CONTENT_UPDATE_PRODUCTION_AUTHORIZATION')||KTK_CONTENT_UPDATE_PRODUCTION_AUTHORIZATION!==$approval){throw new RuntimeException('Separate exact server-side production authorization required');}
            $expectedHelper=$public.'/wp-content/mu-plugins/ktk-production-transaction-update-'.$plan['transactionId'].'.php';$this->source=$public.'/staging/wp-content/mu-plugins';$this->target=$public.'/wp-content/mu-plugins';
        }else{
            if($packet['productionAuthorizationSha256']!==null||!self::digest($packet['publicOwnedSha256'])||$initializePrivateFixture===null){throw new RuntimeException('Explicit private staging fixture packet required');}
            $expectedHelper=$public.'/staging/wp-content/mu-plugins/ktk-transaction-rehearsal-'.$plan['transactionId'].'.php';$this->source=$this->root.'/source';$this->target=$this->root.'/target';
        }
        if($packet['helperPath']!==$expectedHelper){throw new RuntimeException('Exact controller helper required');}
        if(($inspectPrivateFixture===null)!==($completePrivateFixture===null)){throw new RuntimeException('Paired explicit private preparation callbacks required');}
        $this->packet=$packet;$this->capture=$capture;$this->fingerprint=$fingerprint;$this->initialize=$initializePrivateFixture;$this->observer=$observer;$this->inspectPrivateFixture=$inspectPrivateFixture;$this->completePrivateFixture=$completePrivateFixture;$this->helperCheck();
    }
    private function helperCheck(): void
    {
        self::caller();self::directory($this->packet['publicRoot']);$path=$this->packet['helperPath'];self::directory(dirname($path));clearstatcache(true,$path);
        if(is_link($path)||!is_file($path)||hash_file('sha256',$path)!==$this->packet['helperSha256']){throw new RuntimeException('Controller helper changed');}
        if(is_resource($this->targetLock)){$this->verifyTargetLock();}
    }
    public function __destruct()
    {
        if(is_resource($this->targetLock)){flock($this->targetLock,LOCK_UN);fclose($this->targetLock);}
    }
    private function verifyTargetLock(): void
    {
        $path=$this->targetLockPath;clearstatcache(true,$path);$held=fstat($this->targetLock);$current=lstat($path);
        if(is_link($path)||!is_file($path)||$held===false||$current===false||$held['dev']!==$current['dev']||$held['ino']!==$current['ino']||$current['size']!==strlen($this->targetLockBytes)||fseek($this->targetLock,0)!==0||fread($this->targetLock,strlen($this->targetLockBytes)+1)!==$this->targetLockBytes){throw new RuntimeException('Shared production target lock changed; preserve for review');}
    }
    private function lockTarget(): void
    {
        if($this->packet['mode']!=='production'){return;}
        if(is_resource($this->targetLock)){$this->verifyTargetLock();return;}
        $parent=self::directory(dirname($this->packet['publicRoot']));$path=$parent.'/.ktk-content-update-production-target.lock';$bytes="KTK-CONTENT-UPDATE-TARGET-1\n".hash('sha256',$this->packet['publicRoot']);
        clearstatcache(true,$path);if(is_link($path)||(file_exists($path)&&(!is_file($path)||filesize($path)!==strlen($bytes)))){throw new RuntimeException('Unknown shared target lock preserved');}
        $fresh=!file_exists($path);$handle=fopen($path,$fresh?'x+b':'r+b');
        if(!$handle||!flock($handle,LOCK_EX|LOCK_NB)){if(is_resource($handle)){fclose($handle);}throw new RuntimeException('Another production controller call holds the shared target lock');}
        try{
            if($fresh&&(!chmod($path,0600)||fwrite($handle,$bytes)!==strlen($bytes)||!fflush($handle)||(function_exists('fsync')&&!fsync($handle)))){throw new RuntimeException('Cannot secure fresh shared target lock');}
            $this->targetLock=$handle;$this->targetLockPath=$path;$this->targetLockBytes=$bytes;$this->verifyTargetLock();
        }catch(Throwable $error){flock($handle,LOCK_UN);fclose($handle);$this->targetLock=null;throw $error;}
    }
    private function stateCheck(array $state,bool $full,bool $matchBaseline=true): void
    {
        $production=$this->packet['mode']==='production';$home='https://krawlthroughkrakow.com/'.($production?'':'staging/');$scope=$production?($full?'production-protected-original-state':'production-protected-fingerprint'):'staging-protected-original-state';
        if(($state['schemaVersion']??null)!==1||($state['scope']??null)!==$scope||($state['helperSha256']??null)!==$this->packet['helperSha256']||!is_array($state['identity']??null)||!is_array($state['database']??null)||!is_array($state['protectedFiles']??null)||!is_array($state['ownedContentFiles']??null)||($state['identity']['home']??null)!==$home||($state['identity']['siteurl']??null)!==$home||($state['identity']['blogPublic']??null)!==($production?1:0)||($state['databaseWrites']??null)!==0||($state['applicationWrites']??null)!==0||($state['cachePurges']??null)!==0){throw new RuntimeException('Exact protected controller capture required');}
        $keys=array_keys($state['database']);sort($keys);
        if($keys!==array('options','postmeta','posts','term_relationships','term_taxonomy','termmeta','terms')||hash('sha256',self::encode($state['database']))!==($state['databaseSha256']??null)||hash('sha256',self::encode(array('identity'=>$state['identity'],'databaseSha256'=>$state['databaseSha256'],'files'=>$state['protectedFiles'])))!==($state['protectedStateSha256']??null)||($matchBaseline&&$state['protectedStateSha256']!==$this->packet['plan']['protectedStateSha256'])){throw new RuntimeException('Protected controller state differs; database restoration is forbidden');}
        if($production){
            if($full){$prior=$this->packet['plan']['prior'];unset($prior[self::MARKER]);if(($state['ownedInventoryIncluded']??true)!==true||self::canonical($state['ownedContentFiles'])!==self::canonical($prior)){throw new RuntimeException('Full original production-owned inventory required');}}
            elseif(($state['ownedInventoryIncluded']??null)!==false||$state['ownedContentFiles']!==array()){throw new RuntimeException('Separate production protected fingerprint required');}
            if(($state['protectedFiles']['mu/'.self::MARKER]??null)!==self::MARKER_SHA){throw new RuntimeException('Immutable real production activation required');}
        }elseif(($state['ownedInventoryIncluded']??true)!==true||hash('sha256',self::encode(self::canonical($state['ownedContentFiles'])))!==$this->packet['publicOwnedSha256']){throw new RuntimeException('Real staging owned application changed');}
    }
    private function guard(): string
    {
        $this->helperCheck();$state=($this->fingerprint)();$this->stateCheck($state,false);return $state['protectedStateSha256'];
    }
    private function engine(): KTK_Active_Content_Transaction
    {
        self::directory($this->source);self::directory($this->target);self::directory($this->root.'/engine');
        return new KTK_Active_Content_Transaction($this->source,$this->target,$this->root.'/engine',$this->packet['plan'],fn()=>$this->guard(),$this->observer);
    }
    private function control(): array
    {
        return array('schemaVersion'=>1,'mode'=>$this->packet['mode'],'transactionId'=>$this->binding['transactionId'],'applicationCommit'=>$this->binding['applicationCommit']);
    }
    private function result(KTK_Content_Update_Private_Store $store,KTK_Active_Content_Transaction $engine): array
    {
        $inspection=$engine->inspect();$inventory=$store->inventory();$stateSha=hash('sha256',self::encode(self::canonical(array('binding'=>$this->binding,'helperSha256'=>$this->packet['helperSha256'],'engine'=>$inspection,'control'=>$inventory))));
        $public=$inspection;$public['actualInventorySha256']=hash('sha256',self::encode(self::canonical($inspection['actual'])));$public['actualInventoryFiles']=count($inspection['actual']);unset($public['actual']);
        return $this->control()+array('planSha256'=>$this->binding['planSha256'],'stateSha256'=>$stateSha,'engine'=>$public,'archiveAcknowledged'=>$store->read('backup-ack.json')!==null,'closed'=>$store->read('closed.json')!==null,'productionAuthorizationProvided'=>$this->packet['mode']==='production','databaseWrites'=>0,'activationWrites'=>0,'cachePurges'=>0);
    }
    private function healthy(array $state): void
    {
        foreach(array('backupVerified','protectedStateVerified','privateTemporaryInspectionVerified','privateReceiptInspectionVerified') as $key){if(($state['engine'][$key]??null)!==true){throw new RuntimeException('Uncertain controller state requires inspection and review');}}
    }
    private function acknowledgment(KTK_Content_Update_Private_Store $store,array $manifest,array $request): array
    {
        $raw=$store->read('backup-ack.json');if($raw===null){throw new RuntimeException('Independently verified private archive acknowledgment required before application writes');}$ack=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
        if(!is_array($ack)||($ack['schemaVersion']??null)!==1||($ack['transactionId']??null)!==$this->binding['transactionId']||($ack['applicationCommit']??null)!==$this->binding['applicationCommit']||($ack['planSha256']??null)!==$this->binding['planSha256']||($ack['exportSha256']??null)!==$manifest['manifestSha256']||($ack['archiveSha256']??null)!==$request['archiveSha256']||!self::digest($ack['acknowledgedStateSha256']??null)){throw new RuntimeException('Durable private archive acknowledgment differs');}return $ack;
    }
    private function preparation(): array
    {
        $current=($this->capture)();$this->stateCheck($current,true);$stable=$current;unset($stable['capturedAt']);
        $rootExists=file_exists($this->root)||is_link($this->root);$store=null;$records=null;$control=null;$seed=null;$engine=null;$rootMembers=array();$engineMembers=array();$time=null;
        if($rootExists){
            $store=new KTK_Content_Update_Private_Store($this->root,$this->packet['publicRoot'],$this->binding['transactionId'],$this->packet['ownershipKey']);$time=$store->preparationTimestamp();
            if($time!==null){$current['capturedAt']=$time;}
            $original=self::encode($current);$records=array('original-state.json'=>$original,'controller-plan.json'=>self::encode($this->control()+array('originalStateSha256'=>hash('sha256',$original),'enginePlan'=>$this->packet['plan'])));
            $control=$store->inspectPreparationRecords($records);
            $allowed=$this->packet['mode']==='production'?array('owner.marker','controller.lock','control','engine'):array('owner.marker','controller.lock','control','engine','source','target');
            foreach(new DirectoryIterator($store->privateRoot()) as $entry){
                if($entry->isDot()){continue;}$name=$entry->getFilename();
                if(!in_array($name,$allowed,true)||$entry->isLink()||(($name==='owner.marker'||$name==='controller.lock')?!$entry->isFile():!$entry->isDir())){throw new RuntimeException('Unknown preparation namespace member preserved');}$rootMembers[]=$name;
            }sort($rootMembers);
            if(!$control['planComplete']&&(in_array('engine',$rootMembers,true)||in_array('source',$rootMembers,true)||in_array('target',$rootMembers,true))){throw new RuntimeException('Private initialization cannot precede complete immutable records');}
            if($this->packet['mode']!=='production'){
                if($this->inspectPrivateFixture===null||$this->completePrivateFixture===null){throw new RuntimeException('Explicit private preparation recovery callbacks required');}
                $seed=($this->inspectPrivateFixture)($store);
                if(!is_array($seed)||!self::digest($seed['stateSha256']??null)||!is_bool($seed['sourceComplete']??null)||!is_bool($seed['targetComplete']??null)){throw new RuntimeException('Verified private seed inspection required');}
            }
            if(in_array('engine',$rootMembers,true)){
                self::directory($this->root.'/engine');$lock='target-'.hash('sha256',$this->target).'.lock';$id=$this->binding['transactionId'];
                foreach(new DirectoryIterator($this->root.'/engine') as $entry){
                    if($entry->isDot()){continue;}$name=$entry->getFilename();$path=str_replace('\\','/',$entry->getPathname());
                    if($entry->isLink()){throw new RuntimeException('Unsafe preparation engine member preserved');}
                    if($name===$lock&&$entry->isFile()){$stat=lstat($path);if($entry->getSize()!==0||$stat===false||($stat['nlink']??0)!==1){throw new RuntimeException('Changed preparation engine lock preserved');}$engineMembers[$name]='empty-lock';}
                    elseif($name===$id&&$entry->isDir()){self::directory($path);$engineMembers[$name]='transaction-directory';}
                    else{throw new RuntimeException('Unknown preparation engine member preserved');}
                }ksort($engineMembers);
                if(isset($engineMembers[$id])){
                    if(!isset($engineMembers[$lock])||($seed!==null&&(!$seed['sourceComplete']||!$seed['targetComplete']))){throw new RuntimeException('Engine preparation cannot precede complete seeds and its lock');}
                    $engine=$this->engine()->inspectPreparation();
                }
            }
        }
        $proof=array('binding'=>$this->binding,'helperSha256'=>$this->packet['helperSha256'],'currentSnapshotSha256'=>hash('sha256',self::encode($stable)),'rootExists'=>$rootExists,'originalCaptureTime'=>$time,'rootMembers'=>$rootMembers,'control'=>$control,'seed'=>$seed,'engineMembers'=>$engineMembers,'engine'=>$engine);
        $public=$this->control()+array('planSha256'=>$this->binding['planSha256'],'stateSha256'=>hash('sha256',self::encode(self::canonical($proof))),'preparation'=>array('rootExists'=>$rootExists,'originalCaptureTime'=>$time,'recordsComplete'=>$control!==null&&$control['originalComplete']&&$control['planComplete'],'seedsComplete'=>$seed===null?$this->packet['mode']==='production':$seed['sourceComplete']&&$seed['targetComplete'],'enginePhase'=>$engine['phase']??null,'controlFiles'=>$control['files']??array(),'seedFiles'=>$seed['files']??array(),'engineFiles'=>$engine['files']??array()),'productionAuthorizationProvided'=>$this->packet['mode']==='production','applicationWrites'=>0,'databaseWrites'=>0,'activationWrites'=>0,'cachePurges'=>0);
        return array($public,$records,$store,$seed);
    }
    public function run(string $raw,string $method,string $host,string $token,int $now): array
    {
        self::caller();$request=KTK_Content_Update_Request::parse($raw,$method,$host,$token,$this->packet['tokenSha256'],$this->packet['expires'],$now,$this->binding);$this->helperCheck();
        // Even creation of the private shared lock follows authenticated production identity/protected-state verification.
        if($this->packet['mode']==='production'){$current=($this->fingerprint)();$this->stateCheck($current,false,$request['action']!=='inspect');}
        $this->lockTarget();$action=$request['action'];
        if($action==='inspect-preparation'||$action==='recover-preparation'){
            [$state,$records,$store,$seed]=$this->preparation();if($action==='inspect-preparation'){return $state;}
            if(!hash_equals($state['stateSha256'],$request['stateSha256'])){throw new RuntimeException('Stale controller preparation state; inspect before recovery');}
            if($store===null){return $this->run(self::encode(array('schemaVersion'=>1,'action'=>'prepare')+$this->binding),$method,$host,$token,$now);}
            foreach($records as $name=>$bytes){if($store->read($name)===null){$store->writeOnce($name,$bytes);}}
            if(!file_exists($this->root.'/engine')&&!mkdir($this->root.'/engine',0700)){throw new RuntimeException('Cannot create known private preparation engine root');}self::directory($this->root.'/engine');
            if($seed!==null){($this->completePrivateFixture)($store,$seed['stateSha256']);}
            $engine=$this->engine();$inspection=$engine->inspectPreparation();$engine->resumePreparation($inspection['stateSha256']);KTK_Content_Update_Backup_Manifest::build($store,$this->packet['plan']);return $this->result($store,$engine);
        }
        if($action==='prepare'){
            if(file_exists($this->root)||is_link($this->root)){throw new RuntimeException('Existing controller transaction must be inspected; initialization is not blindly retried');}
            $state=($this->capture)();$this->stateCheck($state,true);$original=self::encode($state);
            $store=KTK_Content_Update_Private_Store::create($this->root,$this->packet['publicRoot'],$this->binding['transactionId'],$this->packet['ownershipKey']);
            $store->writeOnce('original-state.json',$original);$store->writeOnce('controller-plan.json',self::encode($this->control()+array('originalStateSha256'=>hash('sha256',$original),'enginePlan'=>$this->packet['plan'])));
            if(!mkdir($this->root.'/engine',0700)){throw new RuntimeException('Fresh private engine root required');}
            if($this->initialize!==null){($this->initialize)($this->root);}
            $engine=$this->engine();$engine->prepare();KTK_Content_Update_Backup_Manifest::build($store,$this->packet['plan']);return $this->result($store,$engine);
        }
        $store=new KTK_Content_Update_Private_Store($this->root,$this->packet['publicRoot'],$this->binding['transactionId'],$this->packet['ownershipKey']);
        $planRaw=$store->read('controller-plan.json');$original=$store->read('original-state.json');$expected=$this->control()+array('originalStateSha256'=>hash('sha256',$original??''),'enginePlan'=>$this->packet['plan']);
        if($original===null||$planRaw!==self::encode($expected)){throw new RuntimeException('Incomplete or changed initialization preserved for manual review');}
        $engine=$this->engine();$state=$this->result($store,$engine);
        if($action==='inspect'){return $state;}
        $manifest=KTK_Content_Update_Backup_Manifest::build($store,$this->packet['plan']);
        if($action==='export'){return $state+array('export'=>$manifest);}
        if(!hash_equals($state['stateSha256'],$request['stateSha256'])){throw new RuntimeException('Stale controller state; inspect before any further mutation');}
        $this->healthy($state);if($state['closed']){throw new RuntimeException('Closed controller transaction is read-only');}
        if($action==='acknowledge'){
            if($state['engine']['phase']!=='prepared'||!$state['engine']['currentPriorInventoryVerified']||$request['exportSha256']!==$manifest['manifestSha256']){throw new RuntimeException('Exact prepared rollback export required before acknowledgment');}
            $ack=$this->control()+array('planSha256'=>$this->binding['planSha256'],'exportSha256'=>$manifest['manifestSha256'],'archiveSha256'=>$request['archiveSha256'],'acknowledgedStateSha256'=>$state['stateSha256']);$store->writeOnce('backup-ack.json',self::encode($ack));
        }else{
            $this->acknowledgment($store,$manifest,$request);
            if($action==='apply'){$engine->apply($this->packet['stepLimit']);}
            elseif($action==='rollback'){$engine->rollback($this->packet['stepLimit']);}
            elseif($action==='close'){
                if($request['exportSha256']!==$manifest['manifestSha256']||!(($state['engine']['phase']==='applied'&&$state['engine']['currentExpectedInventoryVerified'])||($state['engine']['phase']==='rolled-back'&&$state['engine']['currentPriorInventoryVerified']))){throw new RuntimeException('Verified terminal inventory and matching archive required before closure');}
                $store->writeOnce('closed.json',self::encode($this->control()+array('planSha256'=>$this->binding['planSha256'],'terminalPhase'=>$state['engine']['phase'],'stateSha256'=>$state['stateSha256'],'exportSha256'=>$manifest['manifestSha256'],'archiveSha256'=>$request['archiveSha256'],'payloadRetained'=>true)));
            }else{throw new RuntimeException('Unsupported controller mutation');}
        }
        return $this->result($store,$engine);
    }
}
