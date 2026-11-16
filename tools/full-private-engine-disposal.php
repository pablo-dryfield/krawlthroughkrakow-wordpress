<?php
/** Exact archived, rolled-back full private payload disposal. No copy or public/database writer. */
if (!defined('KTK_FULL_PRIVATE_ENGINE_DISPOSAL_ALLOWED') || KTK_FULL_PRIVATE_ENGINE_DISPOSAL_ALLOWED!==true) { throw new RuntimeException('Explicit archived full private disposal required'); }
final class KTK_Full_Private_Engine_Disposal
{
    private array $config;
    private array $binding;
    private array $directories;
    private $guard;
    private $observer;
    private static function json($v): string { return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function canonical($v) { if(is_array($v)){if(!array_is_list($v)){ksort($v);}foreach($v as $k=>$p){$v[$k]=self::canonical($p);}}return $v; }
    private static function sha($v): string { return hash('sha256',self::json(self::canonical($v))); }
    private static function digest($v): bool { return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1; }
    private static function directory(string $p): void
    {
        clearstatcache(true,$p);if(!is_dir($p)||str_replace('\\','/',(string)realpath($p))!==$p){throw new RuntimeException('Canonical private disposal directory required');}
        for($a=$p;;$a=dirname($a)){if(is_link($a)){throw new RuntimeException('Private disposal link ancestor preserved');}if(dirname($a)===$a){break;}}
    }
    public function __construct(array $config,callable $guard,?callable $observer=null)
    {
        $keys=array_keys($config);sort($keys);
        if($keys!==array('authority','expires','ownershipKey','publicRoot','tokenSha256')||!is_int($config['expires'])||!self::digest($config['ownershipKey'])||!self::digest($config['tokenSha256'])){throw new RuntimeException('Exact separate archived disposal configuration required');}
        $a=$config['authority'];$ak=array_keys($a);sort($ak);
        if($ak!==array('applicationCommit','authoritySha256','originalArchiveSha256','originalManifestSha256','payload','plan','retained','rollbackArchiveSha256','rollbackManifestSha256','schemaVersion','scope','transactionId')||$a['schemaVersion']!==1||$a['scope']!=='archived-rolled-back-full-private-disposal'||!preg_match('/^[a-f0-9]{32}$/D',$a['transactionId'])||!preg_match('/^[a-f0-9]{40}$/D',$a['applicationCommit'])){throw new RuntimeException('Exact archived disposal authority required');}
        foreach(array('authoritySha256','originalArchiveSha256','originalManifestSha256','rollbackArchiveSha256','rollbackManifestSha256') as $n){if(!self::digest($a[$n])){throw new RuntimeException('Exact archive authority digests required');}}
        $unsigned=$a;unset($unsigned['authoritySha256']);if(!hash_equals(self::sha($unsigned),$a['authoritySha256'])||$a['plan']['transactionId']!==$a['transactionId']||$a['plan']['applicationCommit']!==$a['applicationCommit']){throw new RuntimeException('Disposal authority or plan differs');}
        $root=dirname($config['publicRoot']).'/.ktk-content-update-'.$a['transactionId'];$lock='engine/target-'.hash('sha256',$root.'/target').'.lock';$engine='engine/'.$a['transactionId'];
        $fixed=array('owner.marker','controller.lock','control/closed.json','control/backup-ack.json',$engine.'/plan.json',$engine.'/journal.json',$lock);sort($fixed);$names=array_keys($a['retained']);sort($names);
        if($names!==$fixed||!is_array($a['payload'])||count($a['payload'])>20000||array_intersect_key($a['payload'],$a['retained'])){throw new RuntimeException('Exact seven retained recovery records required');}
        $dirs=array('control'=>true,'engine'=>true,$engine=>true,$engine.'/receipts'=>true,$engine.'/pending'=>true);
        foreach(array('payload','retained') as $kind){foreach($a[$kind] as $n=>$row){
            if(!is_string($n)||!preg_match('/^[A-Za-z0-9._\/-]+$/D',$n)||array_intersect(explode('/',$n),array('','.','..'))||!is_array($row)||array_keys($row)!==array('sha256','bytes')||!self::digest($row['sha256'])||!is_int($row['bytes'])||$row['bytes']<0||$row['bytes']>1073741824){throw new RuntimeException('Exact bounded disposal member required');}
            if($kind==='payload'&&!str_starts_with($n,'source/')&&!str_starts_with($n,'target/')&&!str_starts_with($n,$engine.'/prior/')&&!in_array($n,array('control/original-state.json','control/controller-plan.json'),true)){throw new RuntimeException('Unknown disposable scope preserved');}
            for($d=dirname($n);$d!=='.';$d=dirname($d)){$dirs[$d]=true;}
        }}
        if($a['retained'][$lock]!==array('sha256'=>hash('sha256',''),'bytes'=>0)){throw new RuntimeException('Empty exact target lock required');}
        $this->directories=$dirs;$this->config=$config;$this->guard=$guard;$this->observer=$observer;$this->binding=array('transactionId'=>$a['transactionId'],'applicationCommit'=>$a['applicationCommit'],'authoritySha256'=>$a['authoritySha256']);
    }
    private function bytes(string $root,string $name,array $row): string
    {
        $p=$root.'/'.$name;self::directory(dirname($p));clearstatcache(true,$p);$before=@lstat($p);
        if(is_link($p)||!is_file($p)||$before===false||($before['nlink']??0)!==1||$before['size']!==$row['bytes']||hash_file('sha256',$p)!==$row['sha256']){throw new RuntimeException('Changed private member preserved');}
        $body=file_get_contents($p);clearstatcache(true,$p);$after=@lstat($p);
        if(!is_string($body)||strlen($body)!==$row['bytes']||hash('sha256',$body)!==$row['sha256']||$after===false||is_link($p)||$before['dev']!==$after['dev']||$before['ino']!==$after['ino']||$before['size']!==$after['size']||($after['nlink']??0)!==1){throw new RuntimeException('Private member changed while reading');}return $body;
    }
    private function closure(KTK_Content_Update_Private_Store $store): void
    {
        $a=$this->config['authority'];$b=array('schemaVersion'=>1,'mode'=>'private-staging-rehearsal','transactionId'=>$a['transactionId'],'applicationCommit'=>$a['applicationCommit'],'planSha256'=>self::sha($a['plan']),'exportSha256'=>$a['rollbackManifestSha256'],'archiveSha256'=>$a['rollbackArchiveSha256']);
        $closed=json_decode($store->read('closed.json')??'null',true,32,JSON_THROW_ON_ERROR);$ack=json_decode($store->read('backup-ack.json')??'null',true,32,JSON_THROW_ON_ERROR);
        foreach(array($closed,$ack) as $v){if(!is_array($v)){throw new RuntimeException('Signed closure and archive acknowledgment required');}foreach($b as $k=>$x){if(($v[$k]??null)!==$x){throw new RuntimeException('Archived terminal closure differs');}}}
        if(array_diff_key($closed,$b,array('terminalPhase'=>true,'stateSha256'=>true,'payloadRetained'=>true))||count($closed)!==count($b)+3||$closed['terminalPhase']!=='rolled-back'||$closed['payloadRetained']!==true||!self::digest($closed['stateSha256'])||array_diff_key($ack,$b,array('acknowledgedStateSha256'=>true))||count($ack)!==count($b)+1||!self::digest($ack['acknowledgedStateSha256'])){throw new RuntimeException('Exact rolled-back archive closure required');}
    }
    private function inspect(KTK_Content_Update_Private_Store $store): array
    {
        ($this->guard)();$this->closure($store);$root=$store->privateRoot();$a=$this->config['authority'];$present=array();$dirs=array();$visited=0;
        foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $e){
            if(++$visited>40000||$e->isLink()){throw new RuntimeException('Unsafe private disposal namespace preserved');}$n=substr(str_replace('\\','/',$e->getPathname()),strlen($root)+1);
            if($e->isDir()){if(!isset($this->directories[$n])){throw new RuntimeException('Unknown private directory preserved');}self::directory($root.'/'.$n);$dirs[]=$n;}
            elseif($e->isFile()){$row=$a['retained'][$n]??$a['payload'][$n]??null;if($row===null){throw new RuntimeException('Unknown private payload preserved');}
                if($n==='controller.lock'){$s=lstat($root.'/'.$n);$held=$store->rootBinding();if($s===false||($s['nlink']??0)!==1||$row!==array('sha256'=>hash('sha256',$held),'bytes'=>64)){throw new RuntimeException('Authenticated held controller lock differs');}}
                elseif(isset($a['retained'][$n])){$this->bytes($root,$n,$row);}else{$p=$root.'/'.$n;clearstatcache(true,$p);$s=lstat($p);if($s===false||($s['nlink']??0)!==1||$s['size']!==$row['bytes']||hash_file('sha256',$p)!==$row['sha256']){throw new RuntimeException('Changed disposal payload preserved');}}$present[$n]=$row;
            }else{throw new RuntimeException('Unknown private type preserved');}
        }
        if(array_diff_key($a['retained'],$present)){throw new RuntimeException('Retained recovery metadata missing');}
        $engine='engine/'.$a['transactionId'];$rawPlan=$this->bytes($root,$engine.'/plan.json',$a['retained'][$engine.'/plan.json']);$journal=json_decode($this->bytes($root,$engine.'/journal.json',$a['retained'][$engine.'/journal.json']),true,64,JSON_THROW_ON_ERROR);
        $required=array();foreach($a['plan']['prior'] as $n=>$h){if(($a['plan']['expected'][$n]??null)!==$h){$required[$n]=$h;}}ksort($required);
        $storedPlan=json_decode($rawPlan,true,64,JSON_THROW_ON_ERROR);$enginePlan=$a['plan'];ksort($enginePlan['expected']);ksort($enginePlan['prior']);$expectedBinding=hash('sha256',json_encode(array($root.'/source',$root.'/target',$root.'/'.$engine,$enginePlan),JSON_THROW_ON_ERROR));
        if(self::canonical($storedPlan)!==self::canonical($a['plan'])||!is_array($journal)||array_keys($journal)!==array('binding','phase','intents','backups','events')||$journal['binding']!==$expectedBinding||$journal['phase']!=='rolled-back'||$journal['backups']!==$required||!is_array($journal['intents'])||!is_array($journal['events'])||count($journal['events'])>5000){throw new RuntimeException('Known terminal engine metadata required');}
        foreach($journal['intents'] as $n=>$v){if($v!==true||!isset($a['plan']['expected'][$n])||$a['plan']['expected'][$n]===($a['plan']['prior'][$n]??null)){throw new RuntimeException('Unknown terminal intent preserved');}}
        foreach($journal['events'] as $v){if(!is_string($v)||strlen($v)<1||strlen($v)>1024){throw new RuntimeException('Unknown terminal event preserved');}}
        ksort($present);sort($dirs);($this->guard)();$store->rootBinding();$payload=array_intersect_key($present,$a['payload']);
        $proof=array('binding'=>$this->binding,'present'=>$present,'directories'=>$dirs);$retainedDirs=array('control','engine',$engine,$engine.'/receipts',$engine.'/pending');
        return array('schemaVersion'=>1,'scope'=>'full-private-engine-disposal')+$this->binding+array('stateSha256'=>self::sha($proof),'phase'=>count($payload)===0&&array_diff($dirs,$retainedDirs)===array()?'disposed':'disposing','payloadFiles'=>count($payload),'payloadBytes'=>array_sum(array_column($payload,'bytes')),'present'=>$present,'directories'=>$dirs,'operation'=>null,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0);
    }
    public function run(string $raw,string $method,string $host,string $token,int $now): array
    {
        if($method!=='POST'||strtolower($host)!=='krawlthroughkrakow.com'||$now>=$this->config['expires']||!hash_equals($this->config['tokenSha256'],hash('sha256',$token))||strlen($raw)>2048){throw new RuntimeException('Authenticated current staging-only disposal required');}
        $r=json_decode($raw,true,16,JSON_THROW_ON_ERROR);$actions=array('inspect'=>array(),'cleanup'=>array('stateSha256'));
        if(!is_array($r)||!isset($actions[$r['action']??''])||array_keys($r)!==array_merge(array('schemaVersion','action'),array_keys($this->binding),$actions[$r['action']])||$r['schemaVersion']!==1||self::json($r)!==$raw){throw new RuntimeException('Exact canonical disposal request required');}
        foreach($this->binding as $k=>$v){if(($r[$k]??null)!==$v){throw new RuntimeException('Private disposal binding differs');}}
        $a=$this->config['authority'];$root=dirname($this->config['publicRoot']).'/.ktk-content-update-'.$a['transactionId'];$store=new KTK_Content_Update_Private_Store($root,$this->config['publicRoot'],$a['transactionId'],$this->config['ownershipKey']);$state=$this->inspect($store);
        if($r['action']==='inspect'){return $state;}if(!self::digest($r['stateSha256'])||!hash_equals($state['stateSha256'],$r['stateSha256'])){throw new RuntimeException('Stale private disposal; inspect without retry');}
        $deleted=0;$removed=0;$present=array_intersect_key($state['present'],$a['payload']);$names=array_keys($present);
        usort($names,static function($x,$y){$rank=static fn($n)=>str_starts_with($n,'target/')?0:(str_starts_with($n,'source/')?1:(str_starts_with($n,'engine/')?2:($n==='control/controller-plan.json'?3:4)));return($rank($x)<=>$rank($y))?:strcmp($x,$y);});
        foreach($names as $n){if($deleted>=256){break;}$p=$root.'/'.$n;self::directory(dirname($p));$store->rootBinding();clearstatcache(true,$p);$before=lstat($p);
            if($this->observer!==null){($this->observer)('before-full-engine-delete',$n,$p);}clearstatcache(true,$p);$s=@lstat($p);$row=$a['payload'][$n];
            if(is_link($p)||!is_file($p)||$s===false||$before===false||$s['dev']!==$before['dev']||$s['ino']!==$before['ino']||($s['nlink']??0)!==1||$s['size']!==$row['bytes']||hash_file('sha256',$p)!==$row['sha256']||!unlink($p)){throw new RuntimeException('Changed payload preserved before deletion');}$deleted++;
            if($this->observer!==null){($this->observer)('after-full-engine-delete',$n,$p);}
        }
        $retainedDirs=array('control'=>true,'engine'=>true,'engine/'.$a['transactionId']=>true,'engine/'.$a['transactionId'].'/receipts'=>true,'engine/'.$a['transactionId'].'/pending'=>true);
        $dirs=$state['directories'];usort($dirs,static fn($x,$y)=>(strlen($y)<=>strlen($x))?:strcmp($x,$y));
        foreach($dirs as $n){if($removed>=256){break;}if(isset($retainedDirs[$n])){continue;}$p=$root.'/'.$n;self::directory($p);$store->rootBinding();if(array_values(array_diff(scandir($p),array('.','..')))!==array()){continue;}if(!rmdir($p)){throw new RuntimeException('Private empty directory changed');}$removed++;}
        $out=$this->inspect($store);$out['operation']=array('payloadFilesDeleted'=>$deleted,'payloadDirectoriesRemoved'=>$removed);return $out;
    }
}
