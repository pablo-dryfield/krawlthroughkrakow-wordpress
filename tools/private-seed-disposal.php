<?php
/** Known private payload disposal with a separate fresh witness; no copy, engine, DB or public writer. */
if (!defined('KTK_PRIVATE_SEED_DISPOSAL_ALLOWED') || KTK_PRIVATE_SEED_DISPOSAL_ALLOWED!==true) { throw new RuntimeException('Explicit private seed disposal caller required'); }
final class KTK_Private_Seed_Disposal
{
    private array $config;
    private array $binding;
    private $capture;
    private $observer;
    private KTK_Content_Update_Streaming_Seeds $seeds;
    private static function canonical($v) { if(is_array($v)){if(!array_is_list($v)){ksort($v);}foreach($v as $k=>$p){$v[$k]=self::canonical($p);}}return $v; }
    private static function json($v): string { return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function sha($v): string { return hash('sha256',self::json(self::canonical($v))); }
    private static function digest($v): bool { return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1; }
    private static function directory(string $p): void
    {
        clearstatcache(true,$p);if(!is_dir($p)||str_replace('\\','/',(string)realpath($p))!==$p){throw new RuntimeException('Canonical private disposal directory required');}
        for($a=$p;;$a=dirname($a)){if(is_link($a)){throw new RuntimeException('Private disposal link ancestor preserved');}if(dirname($a)===$a){break;}}
    }
    public function __construct(array $config,callable $capture,?callable $observer=null)
    {
        $keys=array_keys($config);sort($keys);
        if($keys!==array('disposalId','expires','freshProtectedStateSha256','helperPath','helperSha256','originalArchiveSha256','originalHelperSha256','originalManifest','ownershipKey','plan','priorOverrides','publicRoot','sizes','tokenSha256','witnessArchiveSha256')||!is_int($config['expires'])||!is_string($config['disposalId'])||!preg_match('/^[a-f0-9]{32}$/D',$config['disposalId'])){throw new RuntimeException('Exact separate private disposal packet required');}
        foreach(array('freshProtectedStateSha256','helperSha256','originalArchiveSha256','originalHelperSha256','ownershipKey','tokenSha256','witnessArchiveSha256') as $key){if(!self::digest($config[$key])){throw new RuntimeException('Exact private disposal digests required');}}
        $this->config=$config;$this->capture=$capture;$this->observer=$observer;
        $plan=$config['plan'];$this->binding=array('transactionId'=>$plan['transactionId'],'applicationCommit'=>$plan['applicationCommit'],'planSha256'=>self::sha($plan),'disposalId'=>$config['disposalId']);
        if($config['helperPath']!==$config['publicRoot'].'/staging/wp-content/mu-plugins/ktk-transaction-rehearsal-'.$plan['transactionId'].'.php'){throw new RuntimeException('Exact staging private disposal helper required');}
        $this->helper();$this->seeds=new KTK_Content_Update_Streaming_Seeds($config['publicRoot'],$plan,$config['sizes'],$config['priorOverrides'],static function(){throw new RuntimeException('Disposal witness is never copy authorization');},$observer,'full-private-host');
    }
    private function helper(): void
    {
        $p=$this->config['helperPath'];self::directory(dirname($p));clearstatcache(true,$p);$s=@lstat($p);
        if(is_link($p)||!is_file($p)||$s===false||($s['nlink']??0)!==1||hash_file('sha256',$p)!==$this->config['helperSha256']){throw new RuntimeException('Private disposal helper changed');}
    }
    private function guard(): void
    {
        $this->helper();$s=($this->capture)();$tables=is_array($s['database']??null)?array_keys($s['database']):array();sort($tables);
        if(!is_array($s)||($s['scope']??null)!=='staging-protected-original-state'||($s['schemaVersion']??null)!==1||($s['helperSha256']??null)!==$this->config['helperSha256']||($s['identity']['home']??null)!=='https://krawlthroughkrakow.com/staging/'||($s['identity']['siteurl']??null)!=='https://krawlthroughkrakow.com/staging/'||($s['identity']['blogPublic']??null)!==0||self::canonical($s['ownedContentFiles']??null)!==self::canonical($this->config['plan']['expected'])||($s['applicationWrites']??null)!==0||($s['databaseWrites']??null)!==0||($s['cachePurges']??null)!==0){throw new RuntimeException('Fresh complete private disposal snapshot required');}
        if($tables!==array('options','postmeta','posts','term_relationships','term_taxonomy','termmeta','terms')||!is_array($s['protectedFiles']??null)){throw new RuntimeException('Complete selected-state disposal witness required');}
        $db=hash('sha256',self::json($s['database']));$sha=hash('sha256',self::json(array('identity'=>$s['identity'],'databaseSha256'=>$db,'files'=>$s['protectedFiles'])));
        if($db!==($s['databaseSha256']??null)||$sha!==($s['protectedStateSha256']??null)||$sha!==$this->config['freshProtectedStateSha256']){throw new RuntimeException('Fresh disposal witness changed; preserve without data restoration');}
    }
    private function original(KTK_Content_Update_Private_Store $store): void
    {
        $m=$this->config['originalManifest'];$members=array();$total=0;
        foreach(array('original-state.json','controller-plan.json') as $name){
            $body=$store->read($name);if($body===null){throw new RuntimeException('Complete signed original capsule required');}
            $meta=array('name'=>$name,'transactionId'=>$this->binding['transactionId'],'rootBinding'=>$store->rootBinding(),'bytes'=>strlen($body),'sha256'=>hash('sha256',$body));$meta['mac']=hash_hmac('sha256',self::json($meta),$this->config['ownershipKey']);$blob="KTK-PRIVATE-1\n".self::json($meta)."\n".$body;
            $members[$name]=array('source'=>'control/'.$name,'sha256'=>hash('sha256',$blob),'bytes'=>strlen($blob),'payloadSha256'=>hash('sha256',$body));$total+=strlen($blob);
            if($name==='original-state.json'){$s=json_decode($body,true,64,JSON_THROW_ON_ERROR);if(($s['helperSha256']??null)!==$this->config['originalHelperSha256']||($s['protectedStateSha256']??null)!==$this->config['plan']['protectedStateSha256']){throw new RuntimeException('Original snapshot binding differs');}}
        }
        $expected=array('schemaVersion'=>1,'scope'=>'full-private-seeds-original-capsule','transactionId'=>$this->binding['transactionId'],'applicationCommit'=>$this->binding['applicationCommit'],'planSha256'=>$this->binding['planSha256'],'rootBinding'=>$store->rootBinding(),'protectedStateSha256'=>$this->config['plan']['protectedStateSha256'],'members'=>$members,'bytes'=>$total);$expected['manifestSha256']=self::sha($expected);
        if(self::canonical($m)!==self::canonical($expected)){throw new RuntimeException('Independently archived original capsule differs');}
    }
    private function closure(KTK_Content_Update_Private_Store $store,string $seed): string
    {
        return self::json(array('schemaVersion'=>1,'scope'=>'full-private-seeds-abandoned-with-fresh-guard')+$this->binding+array('rootBinding'=>$store->rootBinding(),'originalManifestSha256'=>$this->config['originalManifest']['manifestSha256'],'originalArchiveSha256'=>$this->config['originalArchiveSha256'],'originalProtectedStateSha256'=>$this->config['plan']['protectedStateSha256'],'freshProtectedStateSha256'=>$this->config['freshProtectedStateSha256'],'witnessArchiveSha256'=>$this->config['witnessArchiveSha256'],'disposalHelperSha256'=>$this->config['helperSha256'],'abandonedSeedStateSha256'=>$seed,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0));
    }
    private function inspect(KTK_Content_Update_Private_Store $store,?string $abandoned): array
    {
        $this->guard();$this->original($store);$members=array();
        foreach(new DirectoryIterator($store->privateRoot()) as $e){if($e->isDot()){continue;}$n=$e->getFilename();if(!in_array($n,array('owner.marker','controller.lock','control','source','target'),true)||$e->isLink()||((in_array($n,array('owner.marker','controller.lock'),true))?!$e->isFile():!$e->isDir())){throw new RuntimeException('Unknown disposal namespace member preserved');}$members[]=$n;}sort($members);
        $closing=$abandoned===null?null:$this->closure($store,$abandoned);$inventory=$closing===null?$store->inventory():$store->inventoryForWrite('closed.json',$closing);$closed=$store->read('closed.json');
        foreach($inventory as $n=>$_){if(!in_array($n,array('original-state.json','controller-plan.json','closed.json'),true)&&!str_starts_with($n,'.ktk-control-closed.json-')){throw new RuntimeException('Unknown disposal control member preserved');}}
        if($closed!==null&&($closing===null||$closed!==$closing)){throw new RuntimeException('Exact fresh-witness abandonment acknowledgment required');}
        $seed=$this->seeds->inspectForDisposal($store,fn()=>$this->guard(),$closing);
        foreach(array_keys($inventory) as $n){if(str_starts_with($n,'.ktk-control-closed.json-')&&$seed['stateSha256']!==$abandoned){throw new RuntimeException('Interrupted abandonment private state changed');}}
        $phase=$closed===null?'open':(count($seed['files'])===0&&count($seed['directories'])===0?'disposed':'disposing');
        $proof=array('binding'=>$this->binding,'helperSha256'=>$this->config['helperSha256'],'freshProtectedStateSha256'=>$this->config['freshProtectedStateSha256'],'members'=>$members,'control'=>$inventory,'seed'=>$seed,'phase'=>$phase);
        return array('schemaVersion'=>1,'scope'=>'private-seed-disposal')+$this->binding+array('stateSha256'=>self::sha($proof),'phase'=>$phase,'seed'=>$seed,'closed'=>$closed!==null,'operation'=>null,'freshProtectedStateSha256'=>$this->config['freshProtectedStateSha256'],'originalProtectedStateSha256'=>$this->config['plan']['protectedStateSha256'],'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0,'fullHostTransactionAcceptance'=>false,'fullPrivateCopyVerified'=>false);
    }
    private function cleanup(KTK_Content_Update_Private_Store $store,array $seed): array
    {
        $root=$store->privateRoot();$deleted=0;$removed=0;
        foreach(array('target','source') as $folder){
            if($folder==='source'&&(file_exists($root.'/target')||is_link($root.'/target'))){break;}
            foreach($seed['files'] as $n=>$row){if(!str_starts_with($n,$folder.'/')){continue;}if($deleted>=256){break;}$p=$root.'/'.$n;self::directory(dirname($p));$store->rootBinding();clearstatcache(true,$p);$before=@lstat($p);
                if($this->observer!==null){($this->observer)('before-disposal-delete',$n,$p);}clearstatcache(true,$p);$s=@lstat($p);
                if(is_link($p)||!is_file($p)||$before===false||$s===false||$s['dev']!==$before['dev']||$s['ino']!==$before['ino']||($s['nlink']??0)!==1||$s['size']!==$row['bytes']||hash_file('sha256',$p)!==$row['sha256']||!unlink($p)){throw new RuntimeException('Changed private disposal file preserved');}$deleted++;
                if($this->observer!==null){($this->observer)('after-disposal-delete',$n,$p);}
            }
            $dirs=array_values(array_filter($seed['directories'],static fn($p)=>$p===$folder||str_starts_with($p,$folder.'/')));usort($dirs,static fn($a,$b)=>(strlen($b)<=>strlen($a))?:strcmp($a,$b));
            foreach($dirs as $n){if($removed>=256){break;}$p=$root.'/'.$n;self::directory($p);if(array_values(array_diff(scandir($p),array('.','..')))!==array()){continue;}if(!rmdir($p)){throw new RuntimeException('Private disposal directory changed');}$removed++;}
            if($deleted>=256){break;}
        }return array('payloadFilesDeleted'=>$deleted,'payloadDirectoriesRemoved'=>$removed);
    }
    public function run(string $raw,string $method,string $host,string $token,int $now): array
    {
        if($method!=='POST'||strtolower($host)!=='krawlthroughkrakow.com'||$now>=$this->config['expires']||!hash_equals($this->config['tokenSha256'],hash('sha256',$token))||strlen($raw)>2048){throw new RuntimeException('Authenticated current staging-only private disposal request required');}
        $r=json_decode($raw,true,16,JSON_THROW_ON_ERROR);$actions=array('inspect'=>array(),'inspect-abandoned'=>array('abandonedSeedStateSha256'),'abandon'=>array('stateSha256','abandonedSeedStateSha256'),'cleanup'=>array('stateSha256','abandonedSeedStateSha256'));
        if(!is_array($r)||!isset($actions[$r['action']??''])||array_keys($r)!==array_merge(array('schemaVersion','action'),array_keys($this->binding),$actions[$r['action']])||($r['schemaVersion']??null)!==1||self::json($r)!==$raw){throw new RuntimeException('Exact private disposal request required');}
        foreach($this->binding as $k=>$v){if(($r[$k]??null)!==$v){throw new RuntimeException('Private disposal request binding differs');}}foreach($actions[$r['action']] as $k){if(!self::digest($r[$k])){throw new RuntimeException('Private disposal digests required');}}
        $root=dirname($this->config['publicRoot']).'/.ktk-content-update-'.$this->binding['transactionId'];$store=new KTK_Content_Update_Private_Store($root,$this->config['publicRoot'],$this->binding['transactionId'],$this->config['ownershipKey'],$this->observer);$abandoned=$r['abandonedSeedStateSha256']??null;$state=$this->inspect($store,$abandoned);
        if(in_array($r['action'],array('inspect','inspect-abandoned'),true)){return $state;}
        if(!hash_equals($state['stateSha256'],$r['stateSha256'])){throw new RuntimeException('Stale private disposal state; inspect without retry');}
        $operation=null;
        if($r['action']==='abandon'){
            if($state['closed']||$state['seed']['stateSha256']!==$abandoned||($state['seed']['sourceComplete']&&$state['seed']['targetComplete'])){throw new RuntimeException('Exact incomplete private copy required for abandonment');}
            $store->writeOnce('closed.json',$this->closure($store,$abandoned));
        }else{if(!$state['closed']){throw new RuntimeException('Signed fresh-witness abandonment required before disposal');}$operation=$this->cleanup($store,$state['seed']);}
        $result=$this->inspect($store,$abandoned);$result['operation']=$operation;return $result;
    }
}
