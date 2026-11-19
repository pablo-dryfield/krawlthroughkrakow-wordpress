<?php
/** Noncreating inspection of an immutable archived private census and known signed closure prefix. */
if (!defined('KTK_PRIVATE_ENGINE_FENCED_INSPECTION_ALLOWED') || KTK_PRIVATE_ENGINE_FENCED_INSPECTION_ALLOWED!==true) { throw new RuntimeException('Explicit fenced private read-only inspection required'); }

final class KTK_Private_Engine_Fenced_Inspection
{
    private array $config;
    private array $directories;
    private string $body;
    private string $blob;
    private string $temporary;
    private ?string $engineLockName=null;
    private $engineLock=null;
    private ?KTK_Private_Engine_Abandonment_Inspection $engineLockOwner=null;
    private bool $ownsEngineLock=false;
    private bool $inspectionComplete=false;
    private $freshCapture;
    private static function canonical($v) { if(is_array($v)){if(!array_is_list($v)){ksort($v);}foreach($v as $k=>$x){$v[$k]=self::canonical($x);}}return $v; }
    private static function json($v): string { return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function sha($v): string { return hash('sha256',self::json(self::canonical($v))); }
    private static function digest($v): bool { return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1; }
    private static function name($n): bool { return is_string($n)&&preg_match('/^[A-Za-z0-9._\/-]+$/D',$n)===1&&!array_intersect(explode('/',$n),array('','.','..')); }
    private static function directory(string $p): void
    {
        clearstatcache(true,$p);if(!is_dir($p)||is_link($p)||str_replace('\\','/',(string)realpath($p))!==$p){throw new RuntimeException('Canonical existing fenced inspection directory required');}
        for($a=$p;;$a=dirname($a)){if(is_link($a)){throw new RuntimeException('Fenced inspection link ancestor preserved');}if(dirname($a)===$a){break;}}
    }
    public function __construct(array $config,callable $freshCapture,?KTK_Private_Engine_Abandonment_Inspection $engineLockOwner=null)
    {
        $this->engineLockOwner=$engineLockOwner;
        $keys=array_keys($config);sort($keys);
        if($keys!==array('closureBlob','fence','freshProtectedStateSha256','freshPublicOwnedSha256','initialInspection','ownershipKey','payload','plan','publicRoot','retained','schemaVersion','scope','sizes')||$config['schemaVersion']!==1||$config['scope']!=='immutable-archive-fenced-private-inspection'||!is_string($config['publicRoot'])||basename($config['publicRoot'])!=='public_html'||!self::digest($config['ownershipKey'])||!self::digest($config['freshProtectedStateSha256'])||!self::digest($config['freshPublicOwnedSha256'])){throw new RuntimeException('Exact immutable archive/current witness inspection configuration required');}
        $p=$config['plan'];$pk=is_array($p)?array_keys($p):array();sort($pk);
        if($pk!==array('applicationCommit','expected','prior','protectedStateSha256','transactionId')||!is_string($p['transactionId'])||preg_match('/^[a-f0-9]{32}$/D',$p['transactionId'])!==1||!is_string($p['applicationCommit'])||preg_match('/^[a-f0-9]{40}$/D',$p['applicationCommit'])!==1||!self::digest($p['protectedStateSha256'])||!is_array($p['expected'])||!is_array($p['prior'])){throw new RuntimeException('Exact original private plan required');}
        if(!is_array($config['sizes'])||count($config['sizes'])<2||count($config['sizes'])>10000||array_diff_key($config['sizes'],$p['expected'])||array_diff_key($p['expected'],$config['sizes'])){throw new RuntimeException('Complete original source sizes required');}
        foreach($config['sizes'] as $n=>$size){if(!self::name($n)||!is_int($size)||$size<0||$size>67108864||!self::digest($p['expected'][$n])){throw new RuntimeException('Exact bounded source size/hash required');}}
        if(array_sum($config['sizes'])>2147483648){throw new RuntimeException('Original two-GiB source inventory bound retained');}
        $i=$config['initialInspection'];$unsigned=$i;if(is_array($unsigned)){unset($unsigned['stateSha256']);}
        if(!is_array($i)||($i['schemaVersion']??null)!==1||($i['scope']??null)!=='private-engine-abandonment-readonly-inspection'||($i['transactionId']??null)!==$p['transactionId']||($i['applicationCommit']??null)!==$p['applicationCommit']||($i['readOnly']??null)!==true||!self::digest($i['rootBinding']??null)||!self::digest($i['originalManifestSha256']??null)||!self::digest($i['stateSha256']??null)||!hash_equals(self::sha($unsigned),$i['stateSha256'])||!is_array($i['files']??null)||!is_array($i['directories']??null)||count($i['files'])>20000||count($i['directories'])>20000||!is_bool($i['originalRolledBackClosurePresent']??null)){throw new RuntimeException('Exact archived initial native census required');}
        foreach(array('closureWrites','payloadWrites','applicationWrites','databaseWrites','cachePurges','productionOperations') as $n){if(($i[$n]??null)!==0){throw new RuntimeException('Archived native census must be read-only');}}
        if(!in_array($i['phase']??null,array('seeding','engine-lock-only','unprepared','prepared','applying','uncertain','applied','rolling-back','rolled-back'),true)){throw new RuntimeException('Known initial private engine phase required');}
        $union=array();$folded=array();$engine='engine/'.$p['transactionId'];$global='engine/target-'.hash('sha256',dirname($config['publicRoot']).'/.ktk-content-update-'.$p['transactionId'].'/target').'.lock';$total=0;$metadataBytes=0;
        foreach(array('retained','payload') as $kind){if(!is_array($config[$kind])){throw new RuntimeException('Exact archived metadata/payload maps required');}foreach($config[$kind] as $n=>$row){
            if(!self::name($n)||isset($union[$n])||!is_array($row)||array_diff_key($row,array('sha256'=>true,'bytes'=>true))||count($row)!==2||!self::digest($row['sha256']??null)||!is_int($row['bytes']??null)||$row['bytes']<0||$row['bytes']>1073741824){throw new RuntimeException('Exact unambiguous archived private descriptor required');}
            if($kind==='payload'&&!str_starts_with($n,'source/')&&!str_starts_with($n,'target/')&&!preg_match('/^'.preg_quote($engine,'/').'\/pending\/\.ktk-content-[a-f0-9]{32}$/D',$n)){throw new RuntimeException('Only archived source/target/validated content payload belongs to disposable scope');}
            if($kind==='retained'&&!in_array($n,array('owner.marker','controller.lock','control/original-state.json','control/controller-plan.json','control/backup-ack.json','control/closed.json',$global,$engine.'/plan.json',$engine.'/journal.json'),true)&&!str_starts_with($n,$engine.'/prior/')&&!preg_match('/^'.preg_quote($engine,'/').'\/receipts\/\.ktk-receipt-(plan|journal)-[a-f0-9]{32}$/D',$n)){throw new RuntimeException('Unknown archived recovery metadata preserved');}
            if($n===$global){if($kind!=='retained'||self::canonical($row)!==self::canonical(array('sha256'=>hash('sha256',''),'bytes'=>0))){throw new RuntimeException('Exact retained existing empty engine lock required');}$this->engineLockName=$n;}
            if(isset($folded[strtolower($n)])){throw new RuntimeException('Ambiguous archived private name preserved');}$folded[strtolower($n)]=true;
            $union[$n]=$row;$total+=$row['bytes'];if($kind==='retained'){$metadataBytes+=$row['bytes'];}
        }}
        if(self::canonical($union)!==self::canonical($i['files'])||!isset($config['retained']['owner.marker'],$config['retained']['controller.lock'],$config['retained']['control/original-state.json'],$config['retained']['control/controller-plan.json'])||count($union)>20000||$total>2*array_sum($config['sizes'])+134217728||$metadataBytes>134217728||strlen(self::json($i))>2097152){throw new RuntimeException('Complete bounded initial metadata/payload partition required');}
        if($i['phase']!=='seeding'&&$this->engineLockName===null){throw new RuntimeException('Every reached engine phase requires its archived existing engine lock');}
        $dirs=$i['directories'];$sorted=$dirs;sort($sorted);if($dirs!==$sorted||count(array_unique($dirs))!==count($dirs)){throw new RuntimeException('Exact sorted initial private directories required');}$allowed=array();
        foreach($dirs as $n){if(!self::name($n)){throw new RuntimeException('Exact safe initial directory required');}$allowed[$n]=true;}
        foreach($union as $n=>$row){for($d=dirname($n);$d!=='.';$d=dirname($d)){if(!isset($allowed[$d])){throw new RuntimeException('Archived parent directory missing');}}}
        $this->config=$config;$this->directories=$allowed;$this->freshCapture=$freshCapture;$this->closure();
    }
    private function closure(): void
    {
        $c=$this->config;$i=$c['initialInspection'];$p=$c['plan'];$f=$c['fence'];$fk=is_array($f)?array_keys($f):array();sort($fk);
        if($fk!==array('metadataArchiveSha256','operationId','originalArchiveSha256','witnessArchiveSha256')||!is_string($f['operationId'])||preg_match('/^[a-f0-9]{32}$/D',$f['operationId'])!==1||$f['operationId']===$p['transactionId']){throw new RuntimeException('Exact immutable initial fence provenance required');}
        foreach(array('metadataArchiveSha256','originalArchiveSha256','witnessArchiveSha256') as $n){if(!self::digest($f[$n])){throw new RuntimeException('Exact immutable fence archive digests required');}}
        if(!is_string($c['closureBlob'])||strlen($c['closureBlob'])>24576||($blob=base64_decode($c['closureBlob'],true))===false||strlen($blob)>18432){throw new RuntimeException('Bounded exact signed closure bytes required');}
        $parts=explode("\n",$blob,3);if(count($parts)!==3||$parts[0]!=='KTK-PRIVATE-1'||strlen($parts[2])>16384){throw new RuntimeException('Exact signed closure envelope required');}$raw=$parts[2];
        $meta=array('name'=>'closed.json','transactionId'=>$p['transactionId'],'rootBinding'=>$i['rootBinding'],'bytes'=>strlen($raw),'sha256'=>hash('sha256',$raw));$meta['mac']=hash_hmac('sha256',self::json($meta),$c['ownershipKey']);
        if(self::json($meta)!==$parts[1]){throw new RuntimeException('Signed closure ownership/root/bytes differ');}
        $v=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
        if($i['originalRolledBackClosurePresent']){
            $row=$c['retained']['control/closed.json']??null;
            if(!is_array($v)||($v['terminalPhase']??null)!=='rolled-back'||($v['payloadRetained']??null)!==true||self::canonical($row)!==self::canonical(array('sha256'=>hash('sha256',$blob),'bytes'=>strlen($blob)))){throw new RuntimeException('Original signed rolled-back closure must remain byte-exact');}
        }else{
            $expected=array('schemaVersion'=>1,'scope'=>'private-engine-abandoned-with-fresh-guard','transactionId'=>$p['transactionId'],'applicationCommit'=>$p['applicationCommit'],'planSha256'=>self::sha($p),'rootBinding'=>$i['rootBinding'],'originalManifestSha256'=>$i['originalManifestSha256'],'originalArchiveSha256'=>$f['originalArchiveSha256'],'metadataArchiveSha256'=>$f['metadataArchiveSha256'],'inspectionStateSha256'=>$i['stateSha256'],'fenceOperationId'=>$f['operationId'],'freshProtectedStateSha256'=>$i['freshWitnessProtectedStateSha256'],'witnessArchiveSha256'=>$f['witnessArchiveSha256'],'terminalPhase'=>'abandoned','observedEnginePhase'=>$i['phase'],'payloadRetained'=>true,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0);
            if($raw!==self::json(self::canonical($expected))||isset($c['retained']['control/closed.json'])){throw new RuntimeException('Exact independently derived initial abandonment closure required');}
        }
        $hash=hash('sha256',$blob);$this->temporary='.ktk-control-closed.json-'.$hash.'-'.substr(hash_hmac('sha256','closed.json|'.$hash,$c['ownershipKey']),0,16).'.tmp';$this->blob=$blob;$this->body=$raw;
    }
    private function fresh(): void
    {
        $v=($this->freshCapture)();$keys=is_array($v)?array_keys($v):array();sort($keys);
        if($keys!==array('ownedContentFiles','protectedStateSha256')||$v['protectedStateSha256']!==$this->config['freshProtectedStateSha256']||!is_array($v['ownedContentFiles'])||!hash_equals(self::sha($v['ownedContentFiles']),$this->config['freshPublicOwnedSha256'])){throw new RuntimeException('Complete current protected/public witness changed; no exclusions or restoration');}
    }
    public function releaseEngineLock(): void
    {
        if($this->ownsEngineLock&&is_resource($this->engineLock)){flock($this->engineLock,LOCK_UN);fclose($this->engineLock);}$this->engineLock=null;$this->ownsEngineLock=false;$this->inspectionComplete=false;
    }
    public function __destruct() { $this->releaseEngineLock(); }
    private function held(string $p,array $before,$handle): void
    {
        if(!is_resource($handle)){throw new RuntimeException('Held existing engine lock lost; never reacquire it implicitly');}
        $held=fstat($handle);clearstatcache(true,$p);$named=@lstat($p);
        if($held===false||$named===false||is_link($p)||$held['dev']!==$before['dev']||$held['ino']!==$before['ino']||$held['dev']!==$named['dev']||$held['ino']!==$named['ino']||$held['size']!==0||$named['size']!==0||($held['nlink']??0)!==1||($named['nlink']??0)!==1){throw new RuntimeException('Held existing engine lock identity changed');}
        $probe=@fopen($p,'r+b');if(!$probe){throw new RuntimeException('Existing engine lock ownership cannot be verified');}
        $unheld=flock($probe,LOCK_EX|LOCK_NB);if($unheld){flock($probe,LOCK_UN);}fclose($probe);
        if($unheld){throw new RuntimeException('Existing engine descriptor does not hold its exclusive lock');}
        $final=fstat($handle);clearstatcache(true,$p);$after=@lstat($p);
        if($final===false||$after===false||is_link($p)||$final['dev']!==$held['dev']||$final['ino']!==$held['ino']||$final['dev']!==$after['dev']||$final['ino']!==$after['ino']||$final['size']!==0||$after['size']!==0||($final['nlink']??0)!==1||($after['nlink']??0)!==1){throw new RuntimeException('Held engine lock changed during ownership verification');}
    }
    private function lock(string $root): void
    {
        if($this->engineLockName===null){if($this->engineLockOwner!==null&&$this->engineLockOwner->borrowEngineLock()!==null){throw new RuntimeException('Borrowed owner cannot hold an unarchived engine lock');}return;}
        $p=$root.'/'.$this->engineLockName;self::directory(dirname($p));clearstatcache(true,$p);$before=@lstat($p);
        if($before===false||is_link($p)||!is_file($p)||($before['nlink']??0)!==1||$before['size']!==0){throw new RuntimeException('Existing exact zero-byte engine lock required; never create it');}
        if($this->engineLock!==null){$this->held($p,$before,$this->engineLock);return;}
        if($this->engineLockOwner!==null){
            $borrowed=$this->engineLockOwner->borrowEngineLock();
            if($borrowed!==null){$this->held($p,$before,$borrowed);$this->engineLock=$borrowed;$this->ownsEngineLock=false;return;}
            if(!in_array($this->config['initialInspection']['phase'],array('seeding','engine-lock-only'),true)){throw new RuntimeException('Original engine lock owner released its lock; never reacquire implicitly');}
        }
        $h=@fopen($p,'r+b');if(!$h||!flock($h,LOCK_EX|LOCK_NB)){if(is_resource($h)){fclose($h);}throw new RuntimeException('Existing engine lock is busy or unavailable');}
        $held=fstat($h);clearstatcache(true,$p);$named=@lstat($p);
        if($held===false||$named===false||is_link($p)||$held['dev']!==$before['dev']||$held['ino']!==$before['ino']||$held['dev']!==$named['dev']||$held['ino']!==$named['ino']||$held['size']!==0||$named['size']!==0||($held['nlink']??0)!==1||($named['nlink']??0)!==1){fclose($h);throw new RuntimeException('Held existing engine lock identity changed');}$this->engineLock=$h;$this->ownsEngineLock=true;
    }
    private function file(string $root,string $n,KTK_Content_Update_Private_Store $store,?array $expected): array
    {
        $p=$root.'/'.$n;self::directory(dirname($p));clearstatcache(true,$p);$before=@lstat($p);
        if($before===false||is_link($p)||!is_file($p)||($before['nlink']??0)!==1||$before['size']<0||$before['size']>1073741824){throw new RuntimeException('Unsafe or changed private member preserved');}
        if($expected!==null&&$before['size']!==$expected['bytes']||$expected===null&&$before['size']>strlen($this->blob)){throw new RuntimeException('Declared private member size differs before hashing; preserve it');}
        if($n==='controller.lock'){$owner=$store->rootBinding();$hash=hash('sha256',$owner);if($before['size']!==64){throw new RuntimeException('Held controller ownership lock changed');}}
        elseif($n===$this->engineLockName){$held=fstat($this->engineLock);if($held===false||$before['dev']!==$held['dev']||$before['ino']!==$held['ino']||$held['size']!==0||($held['nlink']??0)!==1){throw new RuntimeException('Held engine lock differs');}$hash=hash('sha256','');}
        else{$hash=hash_file('sha256',$p);if(!is_string($hash)){throw new RuntimeException('Cannot read current private member');}}
        clearstatcache(true,$p);$after=@lstat($p);
        if($after===false||is_link($p)||($after['nlink']??0)!==1||$before['dev']!==$after['dev']||$before['ino']!==$after['ino']||$before['size']!==$after['size']||$before['mtime']!==$after['mtime']||$before['ctime']!==$after['ctime']){throw new RuntimeException('Private member changed during read-only census');}
        return array('sha256'=>$hash,'bytes'=>$before['size']);
    }
    private function census(string $root,KTK_Content_Update_Private_Store $store): array
    {
        $c=$this->config;$i=$c['initialInspection'];$control=$store->inventoryForWrite('closed.json',$this->body);$closed=$store->read('closed.json');$hasTemporary=isset($control[$this->temporary]);$closedComplete=$closed!==null;
        if($closedComplete&&$closed!==$this->body||$closedComplete&&$hasTemporary){throw new RuntimeException('Changed or redundant signed closure evidence preserved');}
        $allowed=$c['retained']+$c['payload'];$allowed['control/closed.json']=array('sha256'=>hash('sha256',$this->blob),'bytes'=>strlen($this->blob));
        $files=array();$dirs=array();$visited=0;$prefix=false;
        foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $e){
            if(++$visited>40000||$e->isLink()){throw new RuntimeException('Unknown private path/link preserved');}$n=substr(str_replace('\\','/',$e->getPathname()),strlen($root)+1);
            if($e->isDir()){if(!isset($this->directories[$n])){throw new RuntimeException('Unknown private directory preserved');}self::directory($root.'/'.$n);$dirs[]=$n;continue;}
            if(!$e->isFile()){throw new RuntimeException('Unknown private member type preserved');}
            if($n!=='control/'.$this->temporary&&!isset($allowed[$n])){throw new RuntimeException('Unknown private member preserved before reading');}
            $row=$this->file($root,$n,$store,$allowed[$n]??null);
            if($n==='control/'.$this->temporary){
                if($i['originalRolledBackClosurePresent']||$closedComplete||!$hasTemporary||$row['bytes']>strlen($this->blob)){throw new RuntimeException('Unknown or redundant closure prefix preserved');}
                $bytes=file_get_contents($root.'/'.$n,false,null,0,18433);if(!is_string($bytes)||strlen($bytes)!==$row['bytes']||hash('sha256',$bytes)!==$row['sha256']||!str_starts_with($this->blob,$bytes)){throw new RuntimeException('Changed signed closure prefix preserved');}$prefix=true;
            }elseif(!isset($allowed[$n])||self::canonical($row)!==self::canonical($allowed[$n])){throw new RuntimeException('Unknown or changed archived private member preserved');}
            $files[$n]=$row;
        }
        if(array_diff_key($c['retained'],$files)||$hasTemporary!==$prefix||!$closedComplete&&$i['originalRolledBackClosurePresent']){throw new RuntimeException('Retained recovery metadata or closure missing');}
        ksort($files);sort($dirs);$payload=array_intersect_key($files,$c['payload']);
        if(!$closedComplete&&(self::canonical($payload)!==self::canonical($c['payload'])||$dirs!==$i['directories'])){throw new RuntimeException('Payload/directory loss before complete signed closure preserved');}
        $plan=json_decode($store->read('controller-plan.json')??'null',true,64,JSON_THROW_ON_ERROR);
        if(!is_array($plan)||self::canonical($plan['enginePlan']??null)!==self::canonical($c['plan'])){throw new RuntimeException('Retained original private plan differs');}
        return array('files'=>$files,'directories'=>$dirs,'control'=>$control,'closureState'=>$closedComplete?($i['originalRolledBackClosurePresent']?'original-rolled-back':'complete'):($prefix?'known-prefix':'absent'),'payload'=>$payload);
    }
    public function assertHeldEngineLock(KTK_Content_Update_Private_Store $store): void
    {
        if(!$this->inspectionComplete){throw new RuntimeException('Complete current inspection required before held-lock readback');}
        $c=$this->config;$root=dirname($c['publicRoot']).'/.ktk-content-update-'.$c['plan']['transactionId'];
        if($store->privateRoot()!==$root||$store->transactionId()!==$c['plan']['transactionId']||!hash_equals($c['initialInspection']['rootBinding'],$store->rootBinding())){throw new RuntimeException('Exact previously inspected private ownership required');}
        if($this->engineLockName!==null&&!is_resource($this->engineLock)){throw new RuntimeException('Previously inspected engine lock must remain held; never reacquire it');}
        // Verify the existing descriptor and named inode. This is not a new census.
        $this->lock($root);
    }
    public function inspect(KTK_Content_Update_Private_Store $store): array
    {
        $this->inspectionComplete=false;
        $c=$this->config;$i=$c['initialInspection'];$root=dirname($c['publicRoot']).'/.ktk-content-update-'.$c['plan']['transactionId'];self::directory($c['publicRoot']);self::directory($root);$this->fresh();
        if($store->privateRoot()!==$root||$store->transactionId()!==$c['plan']['transactionId']||!hash_equals($i['rootBinding'],$store->rootBinding())){throw new RuntimeException('Exact held original private namespace required');}
        foreach(array('owner.marker','controller.lock') as $n){if(self::canonical($c['retained'][$n])!==self::canonical(array('sha256'=>hash('sha256',$store->rootBinding()),'bytes'=>64))){throw new RuntimeException('Archived ownership binding differs');}}
        $this->lock($root);$before=$this->census($root,$store);$this->fresh();$store->rootBinding();if($this->census($root,$store)!==$before){throw new RuntimeException('Private census changed; preserve it and inspect under a new context');}$this->fresh();$store->rootBinding();
        $closed=in_array($before['closureState'],array('complete','original-rolled-back'),true);$mu=$c['publicRoot'].'/staging/wp-content/mu-plugins';$old=$mu.'/ktk-transaction-rehearsal-'.$c['plan']['transactionId'].'.php';
        $result=array('schemaVersion'=>1,'scope'=>'fenced-private-engine-readonly-inspection','transactionId'=>$c['plan']['transactionId'],'applicationCommit'=>$c['plan']['applicationCommit'],'rootBinding'=>$store->rootBinding(),'initialInspectionStateSha256'=>$i['stateSha256'],'fenceOperationId'=>$c['fence']['operationId'],'metadataArchiveSha256'=>$c['fence']['metadataArchiveSha256'],'closureSha256'=>hash('sha256',$this->blob),'closureState'=>$before['closureState'],'signedClosureComplete'=>$closed,'closureOnlyRecoveryRequired'=>!$closed,'files'=>$before['files'],'directories'=>$before['directories'],'remainingPayloadFiles'=>count($before['payload']),'remainingPayloadBytes'=>array_sum(array_column($before['payload'],'bytes')),'retainedInitialMetadataFiles'=>count($c['retained']),'freshProtectedStateSha256'=>$c['freshProtectedStateSha256'],'freshPublicOwnedSha256'=>$c['freshPublicOwnedSha256'],'originalProtectedStateStillExact'=>$c['freshProtectedStateSha256']===$c['plan']['protectedStateSha256'],'freshWitnessVerified'=>true,'originalExecutionHelperAbsent'=>!file_exists($old)&&!is_link($old),'operationClaimsNotTraversed'=>true,'originalPrivateTreeFullyRemoved'=>false,'readOnly'=>true,'closureWrites'=>0,'payloadDeletes'=>0,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0);
        $result['stateSha256']=self::sha($result);$this->inspectionComplete=true;return $result;
    }
}
