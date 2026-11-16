<?php
/** Private full-size seed rehearsal only. No production mode, application/DB write, engine activation or HTTP hook. */
if (!defined('KTK_FULL_PRIVATE_SEED_REHEARSAL_ALLOWED') || KTK_FULL_PRIVATE_SEED_REHEARSAL_ALLOWED!==true) { throw new RuntimeException('Explicit full private seed rehearsal caller required'); }

final class KTK_Full_Private_Seed_Rehearsal
{
    private array $config;
    private array $binding;
    private string $root;
    private $capture;
    private $observer;
    private KTK_Content_Update_Streaming_Seeds $seeds;
    private static function canonical($v) { if (is_array($v)) { if (!array_is_list($v)) { ksort($v); } foreach ($v as $k=>$p) { $v[$k]=self::canonical($p); } } return $v; }
    private static function json($v): string { return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function sha($v): string { return hash('sha256',self::json(self::canonical($v))); }
    private static function digest($v): bool { return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1; }
    private static function directory(string $path): void
    {
        clearstatcache(true,$path);if (!is_dir($path)||str_replace('\\','/',(string)realpath($path))!==$path) { throw new RuntimeException('Canonical full private rehearsal directory required'); }
        for ($p=$path;;$p=dirname($p)) { if (is_link($p)) { throw new RuntimeException('Full private rehearsal link ancestor refused'); } if (dirname($p)===$p) { break; } }
    }
    public function __construct(array $config,callable $capture,?callable $observer=null)
    {
        $keys=array_keys($config);sort($keys);
        if ($keys!==array('expires','helperPath','helperSha256','ownershipKey','plan','priorOverrides','publicRoot','sizes','tokenSha256')||!is_int($config['expires'])||!self::digest($config['helperSha256'])||!self::digest($config['ownershipKey'])||!self::digest($config['tokenSha256'])||!is_array($config['plan'])||!is_array($config['sizes'])||!is_array($config['priorOverrides'])||!is_string($config['publicRoot'])||!is_string($config['helperPath'])) { throw new RuntimeException('Exact compiled private seed packet required'); }
        self::directory($config['publicRoot']);$this->config=$config;$this->capture=$capture;$this->observer=$observer;
        $this->seeds=new KTK_Content_Update_Streaming_Seeds($config['publicRoot'],$config['plan'],$config['sizes'],$config['priorOverrides'],fn()=>$this->snapshot()['protectedStateSha256'],$observer,'full-private-host');
        $this->root=dirname($config['publicRoot']).'/.ktk-content-update-'.$config['plan']['transactionId'];
        if ($config['helperPath']!==$config['publicRoot'].'/staging/wp-content/mu-plugins/ktk-transaction-rehearsal-'.$config['plan']['transactionId'].'.php') { throw new RuntimeException('Exact staging-only full seed helper required'); }
        $this->binding=array('transactionId'=>$config['plan']['transactionId'],'applicationCommit'=>$config['plan']['applicationCommit'],'planSha256'=>self::sha($config['plan']));$this->helper();
    }
    private function helper(): void
    {
        $p=$this->config['helperPath'];self::directory(dirname($p));clearstatcache(true,$p);
        if (is_link($p)||!is_file($p)||hash_file('sha256',$p)!==$this->config['helperSha256']) { throw new RuntimeException('Full private seed helper changed'); }
    }
    private function snapshot(): array
    {
        $this->helper();$s=($this->capture)();$keys=is_array($s['database']??null)?array_keys($s['database']):array();sort($keys);
        if (!is_array($s)||($s['schemaVersion']??null)!==1||($s['scope']??null)!=='staging-protected-original-state'||($s['helperSha256']??null)!==$this->config['helperSha256']||($s['identity']['home']??null)!=='https://krawlthroughkrakow.com/staging/'||($s['identity']['siteurl']??null)!=='https://krawlthroughkrakow.com/staging/'||($s['identity']['blogPublic']??null)!==0||$keys!==array('options','postmeta','posts','term_relationships','term_taxonomy','termmeta','terms')||!is_array($s['protectedFiles']??null)||!is_array($s['ownedContentFiles']??null)||self::canonical($s['ownedContentFiles'])!==self::canonical($this->config['plan']['expected'])||($s['databaseWrites']??null)!==0||($s['applicationWrites']??null)!==0||($s['cachePurges']??null)!==0||!is_string($s['capturedAt']??null)||!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/D',$s['capturedAt'])) { throw new RuntimeException('Exact full staging snapshot required'); }
        $db=hash('sha256',self::json($s['database']));$protected=hash('sha256',self::json(array('identity'=>$s['identity'],'databaseSha256'=>$db,'files'=>$s['protectedFiles'])));
        if ($db!==($s['databaseSha256']??null)||$protected!==($s['protectedStateSha256']??null)||$protected!==$this->config['plan']['protectedStateSha256']) { throw new RuntimeException('Full private seed protected state differs; no database restoration'); }return $s;
    }
    private function records(array $snapshot): array
    {
        $original=self::json($snapshot);return array('original-state.json'=>$original,'controller-plan.json'=>self::json(array('schemaVersion'=>1,'mode'=>'private-staging-rehearsal','transactionId'=>$this->binding['transactionId'],'applicationCommit'=>$this->binding['applicationCommit'],'originalStateSha256'=>hash('sha256',$original),'enginePlan'=>$this->config['plan'])));
    }
    private function capsule(KTK_Content_Update_Private_Store $store): array
    {
        $members=array();$total=0;
        foreach (array('original-state.json','controller-plan.json') as $name) {
            $body=$store->read($name);if ($body===null) { throw new RuntimeException('Complete original capsule records required'); }
            $meta=array('name'=>$name,'transactionId'=>$this->binding['transactionId'],'rootBinding'=>$store->rootBinding(),'bytes'=>strlen($body),'sha256'=>hash('sha256',$body));$meta['mac']=hash_hmac('sha256',self::json($meta),$this->config['ownershipKey']);$blob="KTK-PRIVATE-1\n".self::json($meta)."\n".$body;
            $members[$name]=array('source'=>'control/'.$name,'sha256'=>hash('sha256',$blob),'bytes'=>strlen($blob),'payloadSha256'=>hash('sha256',$body));$total+=strlen($blob);
        }
        $m=array('schemaVersion'=>1,'scope'=>'full-private-seeds-original-capsule','transactionId'=>$this->binding['transactionId'],'applicationCommit'=>$this->binding['applicationCommit'],'planSha256'=>$this->binding['planSha256'],'rootBinding'=>$store->rootBinding(),'protectedStateSha256'=>$this->config['plan']['protectedStateSha256'],'members'=>$members,'bytes'=>$total);$m['manifestSha256']=self::sha($m);return $m;
    }
    private function closure(KTK_Content_Update_Private_Store $store,array $capsule,array $request): string
    {
        if (($request['originalManifestSha256']??null)!==$capsule['manifestSha256']||!self::digest($request['originalArchiveSha256']??null)) { throw new RuntimeException('Independently archived original capsule acknowledgment required'); }
        $abandoned=isset($request['abandonedSeedStateSha256']);
        return self::json(array('schemaVersion'=>1,'scope'=>$abandoned?'full-private-seeds-abandoned':'full-private-seeds-closed','transactionId'=>$this->binding['transactionId'],'applicationCommit'=>$this->binding['applicationCommit'],'planSha256'=>$this->binding['planSha256'],'rootBinding'=>$store->rootBinding(),'originalManifestSha256'=>$capsule['manifestSha256'],'originalArchiveSha256'=>$request['originalArchiveSha256'],'terminalSeedStateSha256'=>$abandoned?$request['abandonedSeedStateSha256']:$this->seeds->expectedStateSha256($store),'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0));
    }
    private function inspect(array $request,?KTK_Content_Update_Private_Store $heldStore=null,?array $inspectedSeed=null): array
    {
        $snapshot=$this->snapshot();$store=null;$records=null;$seed=null;$capsule=null;$inventory=array();$members=array();$closed=false;$closing=null;$phase='absent';
        if (file_exists($this->root)||is_link($this->root)) {
            $store=$heldStore??new KTK_Content_Update_Private_Store($this->root,$this->config['publicRoot'],$this->binding['transactionId'],$this->config['ownershipKey'],$this->observer);
            $time=$store->preparationTimestamp();if ($time!==null) { $snapshot['capturedAt']=$time; }$records=$this->records($snapshot);
            foreach (new DirectoryIterator($store->privateRoot()) as $entry) {
                if ($entry->isDot()) { continue; }$name=$entry->getFilename();
                if (!in_array($name,array('owner.marker','controller.lock','control','source','target'),true)||$entry->isLink()||((in_array($name,array('owner.marker','controller.lock'),true))?!$entry->isFile():!$entry->isDir())) { throw new RuntimeException('Unknown full private seed namespace member preserved'); }$members[]=$name;
            }sort($members);
            $complete=true;foreach ($records as $name=>$body) { $raw=$store->read($name);if ($raw===null) { $complete=false; } elseif ($raw!==$body) { throw new RuntimeException('Immutable original capsule differs'); } }
            if (!$complete) {
                if (in_array('source',$members,true)||in_array('target',$members,true)) { throw new RuntimeException('Private payload cannot precede original capsule records'); }
                $preparation=$store->inspectPreparationRecords($records);$inventory=$preparation['files'];$phase='preparing-original';
            } else {
                $capsule=$this->capsule($store);$closing=isset($request['originalArchiveSha256'])?$this->closure($store,$capsule,$request):null;
                $inventory=$closing===null?$store->inventory():$store->inventoryForWrite('closed.json',$closing);
                foreach ($inventory as $name=>$_) { if (!in_array($name,array('original-state.json','controller-plan.json','closed.json'),true)&&!str_starts_with($name,'.ktk-control-closed.json-')) { throw new RuntimeException('Unexpected full seed control record preserved'); } }
                $raw=$store->read('closed.json');$closed=$raw!==null;
                if ($closed&&($closing===null||$raw!==$closing)) { throw new RuntimeException('Matching archived original required for closed seed inspection'); }
                $seed=$inspectedSeed??($closing===null?$this->seeds->inspect($store):$this->seeds->inspectPendingClosure($store,$closing));
                $pending=false;foreach (array_keys($inventory) as $name) { if (str_starts_with($name,'.ktk-control-closed.json-')) { $pending=true; } }
                $abandoned=isset($request['abandonedSeedStateSha256']);
                if ($pending&&($abandoned?$seed['stateSha256']!==$request['abandonedSeedStateSha256']:(!$seed['sourceComplete']||!$seed['targetComplete']))) { throw new RuntimeException('Interrupted closure requires its unchanged inspected private inventory'); }
                if ($closed&&$abandoned) { $phase=count($seed['files'])===0&&count($seed['directories'])===0?'disposed-abandoned':($seed['stateSha256']===$request['abandonedSeedStateSha256']?'abandoned':'disposing-abandoned'); }
                else { $phase=$closed?(count($seed['files'])===0&&count($seed['directories'])===0?'disposed':($seed['sourceComplete']&&$seed['targetComplete']?'closed':'disposing')):($pending?($abandoned?'abandoning-interrupted':'closing-interrupted'):($seed['sourceComplete']&&$seed['targetComplete']?'ready-to-close':'copying')); }
            }
        }
        $proof=array('binding'=>$this->binding,'helperSha256'=>$this->config['helperSha256'],'protectedStateSha256'=>$snapshot['protectedStateSha256'],'rootMembers'=>$members,'control'=>$inventory,'seed'=>$seed,'phase'=>$phase);
        $public=array('schemaVersion'=>1,'scope'=>'full-private-seed-rehearsal')+$this->binding+array('phase'=>$phase,'stateSha256'=>self::sha($proof),'seed'=>$seed,'capsule'=>$capsule,'closed'=>$closed,'operation'=>null,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0,'fullHostTransactionAcceptance'=>false,'quotaVerified'=>false);
        return array($public,$store,$records,$closing);
    }
    private function cleanup(KTK_Content_Update_Private_Store $store,array $seed): array
    {
        $root=$store->privateRoot();$deleted=0;$removed=0;
        foreach (array('target','source') as $folder) {
            if ($folder==='source'&&(file_exists($root.'/target')||is_link($root.'/target'))) { break; }
            foreach ($seed['files'] as $name=>$row) {
                if (!str_starts_with($name,$folder.'/')) { continue; }if ($deleted>=256) { break; }$path=$root.'/'.$name;self::directory(dirname($path));$store->rootBinding();clearstatcache(true,$path);$stat=@lstat($path);
                if ($this->observer!==null) { ($this->observer)('before-full-seed-delete',$name,$path); }
                clearstatcache(true,$path);$latest=@lstat($path);
                if (is_link($path)||!is_file($path)||$stat===false||$latest===false||$stat['dev']!==$latest['dev']||$stat['ino']!==$latest['ino']||($latest['nlink']??0)!==1||$latest['size']!==$row['bytes']||hash_file('sha256',$path)!==$row['sha256']||!unlink($path)) { throw new RuntimeException('Changed private disposal file preserved; inspect without retry'); }$deleted++;
                if ($this->observer!==null) { ($this->observer)('after-full-seed-delete',$name,$path); }
            }
            $dirs=array_values(array_filter($seed['directories'],static fn($p)=>$p===$folder||str_starts_with($p,$folder.'/')));usort($dirs,static fn($a,$b)=>(strlen($b)<=>strlen($a))?:strcmp($a,$b));
            foreach ($dirs as $name) {
                if ($removed>=256) { break; }$path=$root.'/'.$name;self::directory($path);$entries=array_values(array_diff(scandir($path),array('.','..')));if ($entries!==array()) { continue; }if (!rmdir($path)) { throw new RuntimeException('Private disposal directory changed'); }$removed++;
            }
            if ($deleted>=256) { break; }
        }
        return array('payloadFilesDeleted'=>$deleted,'payloadDirectoriesRemoved'=>$removed);
    }
    private function advance(array $request): array
    {
        $store=new KTK_Content_Update_Private_Store($this->root,$this->config['publicRoot'],$this->binding['transactionId'],$this->config['ownershipKey'],$this->observer);
        $seed=$this->seeds->advanceWithControllerFence($store,function(array $seed)use($request,$store): void {
            [$state]=$this->inspect($request,$store,$seed);
            if (!hash_equals($state['stateSha256'],$request['stateSha256'])) { throw new RuntimeException('Stale full seed state; inspect before mutation'); }
            if ($state['closed']||in_array($state['phase'],array('closing-interrupted','abandoning-interrupted'),true)||$state['capsule']===null) { throw new RuntimeException('Open archived full seed preparation required'); }
        });
        $operation=array('payloadBytesWritten'=>$seed['stepBytesWritten'],'payloadFilesOpened'=>$seed['stepFilesOpened']);
        unset($seed['stepBytesWritten'],$seed['stepFilesOpened']);
        $result=$this->inspect($request,$store,$seed)[0];$result['operation']=$operation;return $result;
    }
    public function run(string $raw,string $method,string $host,string $token,int $now): array
    {
        if ($method!=='POST'||strtolower($host)!=='krawlthroughkrakow.com'||$now>=$this->config['expires']||!hash_equals($this->config['tokenSha256'],hash('sha256',$token))||strlen($raw)>2048) { throw new RuntimeException('Authenticated current staging-only full seed request required'); }
        $r=json_decode($raw,true,16,JSON_THROW_ON_ERROR);$actions=array('inspect'=>array(),'begin'=>array('stateSha256'),'recover-begin'=>array('stateSha256'),'inspect-archived'=>array('originalManifestSha256','originalArchiveSha256'),'advance'=>array('stateSha256','originalManifestSha256','originalArchiveSha256'),'close'=>array('stateSha256','originalManifestSha256','originalArchiveSha256'),'cleanup'=>array('stateSha256','originalManifestSha256','originalArchiveSha256'),'inspect-abandoned'=>array('originalManifestSha256','originalArchiveSha256','abandonedSeedStateSha256'),'abandon'=>array('stateSha256','originalManifestSha256','originalArchiveSha256','abandonedSeedStateSha256'),'cleanup-abandoned'=>array('stateSha256','originalManifestSha256','originalArchiveSha256','abandonedSeedStateSha256'));
        if (!is_array($r)||!isset($actions[$r['action']??''])||array_keys($r)!==array_merge(array('schemaVersion','action','transactionId','applicationCommit','planSha256'),$actions[$r['action']])||($r['schemaVersion']??null)!==1||self::json($r)!==$raw) { throw new RuntimeException('Exact canonical full seed request required'); }
        foreach ($this->binding as $k=>$v) { if (($r[$k]??null)!==$v) { throw new RuntimeException('Full seed request binding differs'); } }foreach ($actions[$r['action']] as $k) { if (!self::digest($r[$k])) { throw new RuntimeException('Full seed request digests required'); } }
        $action=$r['action'];if ($action==='advance') { return $this->advance($r); }
        [$state,$store,$records,$closing]=$this->inspect($r);if (in_array($action,array('inspect','inspect-archived','inspect-abandoned'),true)) { return $state; }
        if (!hash_equals($state['stateSha256'],$r['stateSha256'])) { throw new RuntimeException('Stale full seed state; inspect before mutation'); }
        $operation=null;
        if ($action==='begin'||$action==='recover-begin') {
            if (($action==='begin'&&$store!==null)||!in_array($state['phase'],array('absent','preparing-original'),true)) { throw new RuntimeException('Original seed initialization state differs'); }
            if ($store===null) { $snapshot=$this->snapshot();$records=$this->records($snapshot);$store=KTK_Content_Update_Private_Store::create($this->root,$this->config['publicRoot'],$this->binding['transactionId'],$this->config['ownershipKey'],$this->observer); }
            foreach ($records as $name=>$bytes) { $store->writeOnce($name,$bytes); }
        } elseif ($action==='close') {
            if ($store===null||$closing===null||!$state['seed']['sourceComplete']||!$state['seed']['targetComplete']) { throw new RuntimeException('Complete exact private inventories required before closure'); }
            $store->writeOnce('closed.json',$closing);
        } elseif ($action==='abandon') {
            if ($store===null||$closing===null||$state['closed']||$state['seed']===null||($state['seed']['sourceComplete']&&$state['seed']['targetComplete'])||$state['seed']['stateSha256']!==$r['abandonedSeedStateSha256']) { throw new RuntimeException('Fresh exact incomplete private inventory required for abandonment'); }
            $store->writeOnce('closed.json',$closing);
        } elseif ($action==='cleanup'||$action==='cleanup-abandoned') {
            if ($store===null||!$state['closed']||$closing===null) { throw new RuntimeException('Signed full private seed closure required before disposal'); }$operation=$this->cleanup($store,$state['seed']);
        }
        $store=null;$result=$this->inspect($r)[0];$result['operation']=$operation;return $result;
    }
}
