<?php
/** Immutable private records only. No HTTP hook, release approval, application or database operation. */
if (!defined('KTK_CONTENT_UPDATE_STORE_ALLOWED') || KTK_CONTENT_UPDATE_STORE_ALLOWED !== true) {
    throw new RuntimeException('Explicit private content-update store caller required');
}

final class KTK_Content_Update_Private_Store
{
    private const NAMES = array('original-state.json','controller-plan.json','backup-ack.json','closed.json');
    private string $root;
    private string $public;
    private string $id;
    private string $key;
    private string $owner;
    private $lock;
    private $observer;

    private static function caller(): void
    {
        if (!defined('KTK_CONTENT_UPDATE_STORE_ALLOWED') || KTK_CONTENT_UPDATE_STORE_ALLOWED !== true) { throw new RuntimeException('Explicit private content-update store caller required'); }
    }
    private static function encode(array $value): string { return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR); }
    private static function directory(string $path): string
    {
        $real=realpath($path);
        if ($real===false || !is_dir($real)) { throw new RuntimeException('Exact existing private directory required'); }
        foreach (array($path,$real) as $candidate) { for ($p=$candidate;;$p=dirname($p)) { if (is_link($p)) { throw new RuntimeException('Symlink private ancestor refused'); } if (dirname($p)===$p) { break; } } }
        $normal=str_replace('\\','/',$real);
        if (rtrim(str_replace('\\','/',$path),'/')!==$normal) { throw new RuntimeException('Canonical private directory required'); }
        return $normal;
    }
    private static function identity(string $root,string $public,string $id,string $key,bool $existing): array
    {
        self::caller();
        if (!preg_match('/^[a-f0-9]{32}$/D',$id) || !preg_match('/^[a-f0-9]{64}$/D',$key)) { throw new RuntimeException('Exact private ownership identity required'); }
        $public=self::directory($public);$parent=self::directory(dirname($public));
        if (basename($public)!=='public_html' || $root!==$parent.'/.ktk-content-update-'.$id) { throw new RuntimeException('Private store must be the exact sibling outside the complete public root'); }
        if ($existing) { $root=self::directory($root); }
        elseif (file_exists($root) || is_link($root)) { throw new RuntimeException('Existing private namespace preserved'); }
        $owner=hash_hmac('sha256',self::encode(array('publicRoot'=>$public,'transactionId'=>$id,'privateRoot'=>$root)),$key);
        return array($root,$public,$owner);
    }
    public static function create(string $root,string $public,string $id,string $key,?callable $observer=null): self
    {
        [$root,$public,$owner]=self::identity($root,$public,$id,$key,false);
        if (!mkdir($root,0700) || !mkdir($root.'/control',0700)) { throw new RuntimeException('Cannot create fresh private control namespace'); }
        foreach (array('owner.marker','controller.lock') as $name) {
            if (self::directory($root)!==$root) { throw new RuntimeException('Private root changed during initialization'); }
            $handle=fopen($root.'/'.$name,'x+b');
            if (!$handle) { throw new RuntimeException('Exclusive private ownership record required'); }
            try { if (!chmod($root.'/'.$name,0600) || fwrite($handle,$owner)!==64 || !fflush($handle) || (function_exists('fsync') && !fsync($handle))) { throw new RuntimeException('Cannot secure private ownership record'); } }
            finally { fclose($handle); }
        }
        return new self($root,$public,$id,$key,$observer);
    }
    public function __construct(string $root,string $public,string $id,string $key,?callable $observer=null)
    {
        [$this->root,$this->public,$this->owner]=self::identity($root,$public,$id,$key,true);$this->id=$id;$this->key=$key;$this->observer=$observer;
        $this->verifyRoot(false);$this->lock=fopen($this->root.'/controller.lock','r+b');
        if (!$this->lock || !flock($this->lock,LOCK_EX|LOCK_NB)) { throw new RuntimeException('Another private controller call holds the lock'); }
        $this->verifyRoot();
    }
    public function __destruct() { if (is_resource($this->lock)) { flock($this->lock,LOCK_UN);fclose($this->lock); } }
    private function verifyRoot(bool $readLock=true): void
    {
        self::caller();
        if (self::directory($this->public)!==$this->public || self::directory($this->root)!==$this->root || self::directory($this->root.'/control')!==$this->root.'/control') { throw new RuntimeException('Private control roots changed'); }
        foreach (array('owner.marker','controller.lock') as $name) {
            $path=$this->root.'/'.$name;clearstatcache(true,$path);
            if (is_link($path) || !is_file($path) || filesize($path)!==64) { throw new RuntimeException('Private ownership record changed'); }
            if ($name==='controller.lock' && !$readLock) { continue; }
            if ($name==='controller.lock' && is_resource($this->lock)) {
                $position=ftell($this->lock);$held=fstat($this->lock);$current=lstat($path);
                if ($position===false || $held===false || $current===false || $held['dev']!==$current['dev'] || $held['ino']!==$current['ino'] || fseek($this->lock,0)!==0) { throw new RuntimeException('Private lock identity changed'); }
                $bytes=fread($this->lock,65);
                if (fseek($this->lock,$position)!==0) { throw new RuntimeException('Cannot restore private lock position'); }
            } else { $bytes=file_get_contents($path,false,null,0,65); }
            if ($bytes!==$this->owner) { throw new RuntimeException('Private ownership record changed'); }
        }
    }
    private static function limit(string $name): int
    {
        if (!in_array($name,self::NAMES,true)) { throw new RuntimeException('Exact private record name required'); }
        return $name==='original-state.json'?16777216:($name==='controller-plan.json'?1048576:16384);
    }
    private function blob(string $name,string $bytes): string
    {
        if (strlen($bytes)>self::limit($name)) { throw new RuntimeException('Private record budget exceeded'); }
        $meta=array('name'=>$name,'transactionId'=>$this->id,'rootBinding'=>$this->owner,'bytes'=>strlen($bytes),'sha256'=>hash('sha256',$bytes));$meta['mac']=hash_hmac('sha256',self::encode($meta),$this->key);
        return "KTK-PRIVATE-1\n".self::encode($meta)."\n".$bytes;
    }
    private function decode(string $name,string $blob): string
    {
        $parts=explode("\n",$blob,3);
        if (count($parts)!==3 || $parts[0]!=='KTK-PRIVATE-1' || strlen($parts[1])>1024 || strlen($parts[2])>self::limit($name)) { throw new RuntimeException('Private record envelope invalid'); }
        try { $meta=json_decode($parts[1],true,8,JSON_THROW_ON_ERROR); } catch (Throwable $error) { throw new RuntimeException('Private record envelope invalid'); }
        if (!is_array($meta) || $this->blob($name,$parts[2])!==$blob) { throw new RuntimeException('Private record signature or bytes differ'); }
        return $parts[2];
    }
    private function readBlob(string $path,int $limit): string
    {
        clearstatcache(true,$path);$stat=@lstat($path);
        if (is_link($path) || !is_file($path) || $stat===false || ($stat['nlink']??0)!==1 || filesize($path)>$limit) { throw new RuntimeException('Unsafe or oversized private record'); }
        $bytes=file_get_contents($path,false,null,0,$limit+1);if ($bytes===false || strlen($bytes)>$limit) { throw new RuntimeException('Private record read failed'); }return $bytes;
    }
    private static function snapshotTimestamp(string $bytes): ?string
    {
        try{$value=json_decode($bytes,true,64,JSON_THROW_ON_ERROR);}catch(Throwable $error){return null;}
        $raw=is_array($value)?($value['capturedAt']??null):null;
        if(!is_string($raw)||!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/D',$raw)){return null;}
        $time=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:sP',$raw,new DateTimeZone('UTC'));
        return $time!==false&&$time->format('c')===$raw?$raw:null;
    }
    private function temporaryName(string $name,string $bytes,string $hash): string
    {
        $time=$name==='original-state.json'?self::snapshotTimestamp($bytes):null;
        $stamp=$time===null?'':str_replace(array('-','T',':'),'',substr($time,0,19)).'-';
        $signed=$name.'|'.($stamp===''?'':substr($stamp,0,-1).'|').$hash;
        return '.ktk-control-'.$name.'-'.$stamp.$hash.'-'.substr(hash_hmac('sha256',$signed,$this->key),0,16).'.tmp';
    }
    private function temporaryIdentity(string $name): array
    {
        if(!preg_match('/^\.ktk-control-(original-state|controller-plan|backup-ack|closed)\.json-(?:(\d{14})-)?([a-f0-9]{64})-([a-f0-9]{16})\.tmp$/D',$name,$m)){throw new RuntimeException('Unknown private control member preserved');}
        $logical=$m[1].'.json';$stamp=$m[2]??'';
        if($stamp!==''&&$logical!=='original-state.json'){throw new RuntimeException('Timestamp binding is only valid for original snapshots');}
        $signed=$logical.'|'.($stamp===''?'':$stamp.'|').$m[3];
        if(!hash_equals(substr(hash_hmac('sha256',$signed,$this->key),0,16),$m[4])){throw new RuntimeException('Unowned private temporary preserved');}
        return array($logical,$m[3],$stamp);
    }
    private function scan(?string $recoveryName=null,?string $recoveryBlob=null): array
    {
        $this->verifyRoot();$result=array();
        foreach (new DirectoryIterator($this->root.'/control') as $entry) {
            if ($entry->isDot()) { continue; }$name=$entry->getFilename();
            if ($entry->isLink() || !$entry->isFile()) { throw new RuntimeException('Unknown private control member preserved'); }
            if (in_array($name,self::NAMES,true)) { $blob=$this->readBlob($entry->getPathname(),self::limit($name)+2048);$this->decode($name,$blob);$result[$name]=hash('sha256',$blob);continue; }
            [$logical,$hash,$stamp]=$this->temporaryIdentity($name);
            $bytes=$this->readBlob($entry->getPathname(),self::limit($logical)+2048);
            if (hash('sha256',$bytes)===$hash) { $this->decode($logical,$bytes);$result[$name]=$hash;continue; }
            if ($name!==$recoveryName || $recoveryBlob===null || strlen($bytes)>=strlen($recoveryBlob) || !str_starts_with($recoveryBlob,$bytes)) { throw new RuntimeException('Changed or partial private temporary preserved; matching write must recover it'); }
            $result[$name]=hash('sha256',$bytes);
        }
        ksort($result);return $result;
    }
    public function inventory(): array { return $this->scan(); }
    public function inventoryForWrite(string $name,string $bytes): array
    {
        $blob=$this->blob($name,$bytes);$hash=hash('sha256',$blob);
        return $this->scan($this->temporaryName($name,$bytes,$hash),$blob);
    }
    public function privateRoot(): string { $this->verifyRoot();return $this->root; }
    public function transactionId(): string { $this->verifyRoot();return $this->id; }
    public function rootBinding(): string { $this->verifyRoot();return $this->owner; }
    public function preparationTimestamp(): ?string
    {
        $this->verifyRoot();$original=$this->read('original-state.json');$found=null;
        foreach(new DirectoryIterator($this->root.'/control') as $entry){
            if($entry->isDot()||!str_starts_with($entry->getFilename(),'.ktk-control-original-state.json-')){continue;}
            [$logical,$hash,$stamp]=$this->temporaryIdentity($entry->getFilename());
            if($found!==null||$original!==null){throw new RuntimeException('Ambiguous original snapshot temporary preserved');}
            $bytes=$this->readBlob($entry->getPathname(),self::limit($logical)+2048);
            if($stamp===''){
                if(hash('sha256',$bytes)!==$hash){throw new RuntimeException('Legacy partial original snapshot has no authenticated timestamp');}
                $found=self::snapshotTimestamp($this->decode($logical,$bytes));
            }else{
                $found=substr($stamp,0,4).'-'.substr($stamp,4,2).'-'.substr($stamp,6,2).'T'.substr($stamp,8,2).':'.substr($stamp,10,2).':'.substr($stamp,12,2).'+00:00';
                if(self::snapshotTimestamp(json_encode(array('capturedAt'=>$found),JSON_THROW_ON_ERROR))!==$found){throw new RuntimeException('Invalid authenticated snapshot timestamp');}
            }
            if($found===null){throw new RuntimeException('Valid authenticated original snapshot timestamp required');}
        }
        if($original!==null){$found=self::snapshotTimestamp($original);if($found===null){throw new RuntimeException('Valid original snapshot timestamp required');}}
        return $found;
    }
    public function inspectPreparationRecords(array $records): array
    {
        if(array_keys($records)!==array('original-state.json','controller-plan.json')||!is_string($records['original-state.json'])||!is_string($records['controller-plan.json'])){throw new RuntimeException('Exact preparation record pair required');}
        $this->verifyRoot();$expected=array();$temporaries=array();$members=array();$finals=array();$pending=array();
        foreach($records as $name=>$raw){
            $blob=$this->blob($name,$raw);$hash=hash('sha256',$blob);$expected[$name]=$blob;$temporary=$this->temporaryName($name,$raw,$hash);$temporaries[$temporary]=array($name,$blob,true);
            $legacy='.ktk-control-'.$name.'-'.$hash.'-'.substr(hash_hmac('sha256',$name.'|'.$hash,$this->key),0,16).'.tmp';
            if($legacy!==$temporary){$temporaries[$legacy]=array($name,$blob,false);}
        }
        foreach(new DirectoryIterator($this->root.'/control') as $entry){
            if($entry->isDot()){continue;}$name=$entry->getFilename();
            if($entry->isLink()||!$entry->isFile()){throw new RuntimeException('Unknown preparation control member preserved');}
            if(isset($expected[$name])){
                $blob=$this->readBlob($entry->getPathname(),strlen($expected[$name]));if($blob!==$expected[$name]){throw new RuntimeException('Changed immutable preparation record preserved');}$finals[$name]=true;
            }elseif(isset($temporaries[$name])){
                [$logical,$whole,$prefix]=$temporaries[$name];$blob=$this->readBlob($entry->getPathname(),strlen($whole));if(($prefix?!str_starts_with($whole,$blob):$blob!==$whole)||isset($pending[$logical])){throw new RuntimeException('Changed or ambiguous preparation record prefix preserved');}$pending[$logical]=$name;
            }else{throw new RuntimeException('Unknown or later-lifecycle preparation record preserved');}
            $members[$name]=array('sha256'=>hash('sha256',$blob),'bytes'=>strlen($blob));
        }
        foreach($pending as $logical=>$name){if(isset($finals[$logical])){throw new RuntimeException('Redundant preparation temporary preserved');}}
        if(!isset($finals['original-state.json'])&&(isset($finals['controller-plan.json'])||isset($pending['controller-plan.json']))){throw new RuntimeException('Preparation plan cannot precede the original snapshot');}
        ksort($members);return array('files'=>$members,'originalComplete'=>isset($finals['original-state.json']),'planComplete'=>isset($finals['controller-plan.json']),'stateSha256'=>hash('sha256',self::encode($members)));
    }
    public function recordDescriptor(string $name): array
    {
        $this->scan();$bytes=$this->read($name);if ($bytes===null) { throw new RuntimeException('Required private record missing'); }
        $blob=$this->readBlob($this->root.'/control/'.$name,self::limit($name)+2048);$this->decode($name,$blob);
        return array('source'=>'control/'.$name,'sha256'=>hash('sha256',$blob),'bytes'=>strlen($blob),'payloadSha256'=>hash('sha256',$bytes));
    }
    public function read(string $name): ?string
    {
        self::limit($name);$this->verifyRoot();$path=$this->root.'/control/'.$name;
        if (!file_exists($path) && !is_link($path)) { return null; }
        return $this->decode($name,$this->readBlob($path,self::limit($name)+2048));
    }
    public function writeOnce(string $name,string $bytes): string
    {
        $blob=$this->blob($name,$bytes);$hash=hash('sha256',$blob);$temporary=$this->temporaryName($name,$bytes,$hash);$members=$this->scan($temporary,$blob);$path=$this->root.'/control/'.$name;
        $legacy='.ktk-control-'.$name.'-'.$hash.'-'.substr(hash_hmac('sha256',$name.'|'.$hash,$this->key),0,16).'.tmp';
        if($legacy!==$temporary&&isset($members[$legacy])&&!isset($members[$temporary])&&$members[$legacy]===$hash&&$this->readBlob($this->root.'/control/'.$legacy,self::limit($name)+2048)===$blob){$temporary=$legacy;}
        foreach (array_keys($members) as $member) { if (str_starts_with($member,'.ktk-control-'.$name.'-') && $member!==$temporary) { throw new RuntimeException('Different pending immutable private record preserved'); } }
        $existing=$this->read($name);if ($existing!==null) { if ($existing!==$bytes) { throw new RuntimeException('Existing immutable private record preserved'); }return hash('sha256',$bytes); }
        $pending=$this->root.'/control/'.$temporary;$offset=0;
        if (file_exists($pending) || is_link($pending)) { $prior=$this->readBlob($pending,self::limit($name)+2048);if (!str_starts_with($blob,$prior)) { throw new RuntimeException('Changed private temporary preserved'); }$offset=strlen($prior);$handle=fopen($pending,'r+b'); }
        else { $handle=fopen($pending,'x+b'); }
        if (!$handle) { throw new RuntimeException('Cannot open owned private temporary'); }
        try {
            if (!chmod($pending,0600) || fseek($handle,$offset)!==0) { throw new RuntimeException('Cannot secure owned private temporary'); }
            if ($this->observer!==null) { ($this->observer)('after-temporary-open',$pending,$blob); }
            $this->verifyRoot();
            clearstatcache(true,$pending);$held=fstat($handle);$current=lstat($pending);
            if($held===false||$current===false||$held['dev']!==$current['dev']||$held['ino']!==$current['ino']||($held['nlink']??0)!==1||$this->readBlob($pending,self::limit($name)+2048)!==substr($blob,0,$offset)){throw new RuntimeException('Private temporary changed before writing');}
            while ($offset<strlen($blob)) { $count=fwrite($handle,substr($blob,$offset));if ($count===false || $count===0) { throw new RuntimeException('Private temporary write failed'); }$offset+=$count; }
            if (!fflush($handle) || (function_exists('fsync') && !fsync($handle))) { throw new RuntimeException('Private temporary flush failed'); }
        } finally { fclose($handle); }
        if ($this->observer!==null) { ($this->observer)('before-record-rename',$pending,$blob); }
        $this->scan($temporary,$blob);
        if (file_exists($path) || is_link($path) || $this->readBlob($pending,self::limit($name)+2048)!==$blob || !rename($pending,$path)) { throw new RuntimeException('Private record changed before activation'); }
        if ($this->observer!==null) { ($this->observer)('after-record-rename',$path,$blob); }
        if ($this->read($name)!==$bytes) { throw new RuntimeException('Activated private record differs'); }
        return hash('sha256',$bytes);
    }
}
