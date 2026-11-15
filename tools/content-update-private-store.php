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
        if (is_link($path) || !is_file($path) || filesize($path)>$limit) { throw new RuntimeException('Unsafe or oversized private record'); }
        $bytes=file_get_contents($path,false,null,0,$limit+1);if ($bytes===false || strlen($bytes)>$limit) { throw new RuntimeException('Private record read failed'); }return $bytes;
    }
    private function scan(?string $recoveryName=null,?string $recoveryBlob=null): array
    {
        $this->verifyRoot();$result=array();
        foreach (new DirectoryIterator($this->root.'/control') as $entry) {
            if ($entry->isDot()) { continue; }$name=$entry->getFilename();
            if ($entry->isLink() || !$entry->isFile()) { throw new RuntimeException('Unknown private control member preserved'); }
            if (in_array($name,self::NAMES,true)) { $blob=$this->readBlob($entry->getPathname(),self::limit($name)+2048);$this->decode($name,$blob);$result[$name]=hash('sha256',$blob);continue; }
            if (!preg_match('/^\.ktk-control-(original-state|controller-plan|backup-ack|closed)\.json-([a-f0-9]{64})-([a-f0-9]{16})\.tmp$/D',$name,$match)) { throw new RuntimeException('Unknown private control member preserved'); }
            $logical=$match[1].'.json';$mac=substr(hash_hmac('sha256',$logical.'|'.$match[2],$this->key),0,16);
            if (!hash_equals($mac,$match[3])) { throw new RuntimeException('Unowned private temporary preserved'); }
            $bytes=$this->readBlob($entry->getPathname(),self::limit($logical)+2048);
            if (hash('sha256',$bytes)===$match[2]) { $this->decode($logical,$bytes);$result[$name]=$match[2];continue; }
            if ($name!==$recoveryName || $recoveryBlob===null || strlen($bytes)>=strlen($recoveryBlob) || !str_starts_with($recoveryBlob,$bytes)) { throw new RuntimeException('Changed or partial private temporary preserved; matching write must recover it'); }
            $result[$name]=hash('sha256',$bytes);
        }
        ksort($result);return $result;
    }
    public function inventory(): array { return $this->scan(); }
    public function privateRoot(): string { $this->verifyRoot();return $this->root; }
    public function transactionId(): string { $this->verifyRoot();return $this->id; }
    public function rootBinding(): string { $this->verifyRoot();return $this->owner; }
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
        $blob=$this->blob($name,$bytes);$hash=hash('sha256',$blob);$temporary='.ktk-control-'.$name.'-'.$hash.'-'.substr(hash_hmac('sha256',$name.'|'.$hash,$this->key),0,16).'.tmp';$members=$this->scan($temporary,$blob);$path=$this->root.'/control/'.$name;
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
            if ($this->readBlob($pending,self::limit($name)+2048)!==substr($blob,0,$offset)) { throw new RuntimeException('Private temporary changed before writing'); }
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
