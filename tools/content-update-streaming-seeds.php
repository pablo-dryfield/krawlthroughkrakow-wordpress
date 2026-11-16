<?php
/** Bounded private seed copies from the exact staging inventory. No endpoint, public write or production mode. */
if (!defined('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED') || KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED !== true) {
    throw new RuntimeException('Explicit private streaming seed caller required');
}

final class KTK_Content_Update_Streaming_Seeds
{
    private const MARKER = 'ktk-code-pages-production.php';
    private const MARKER_SHA = 'b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833';
    private const STEP_BYTES = 8388608;
    private const STEP_FILES = 32;
    private const CHUNK = 65536;
    private string $public;
    private string $source;
    private array $plan;
    private array $sizes;
    private array $files = array();
    private array $directories = array();
    private array $overrides = array();
    private $guard;
    private $observer;
    private string $profile;
    private int $stepBytes;
    private int $stepFiles;
    private ?string $pendingClosure=null;
    private ?array $validatedControl=null;
    private $disposalGuard=null;

    private static function encode($value): string
    {
        if (is_array($value)) {
            if (!array_is_list($value)) { ksort($value); }
            foreach ($value as $key=>$part) { $value[$key] = self::canonical($part); }
        }
        return json_encode($value, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    }
    private static function canonical($value)
    {
        if (is_array($value)) { if (!array_is_list($value)) { ksort($value); } foreach ($value as $key=>$part) { $value[$key]=self::canonical($part); } }
        return $value;
    }
    private static function digest($value): bool { return is_string($value) && preg_match('/^[a-f0-9]{64}$/D',$value)===1; }
    private static function directory(string $path): void
    {
        clearstatcache(true,$path);
        if (!is_dir($path) || str_replace('\\','/',(string)realpath($path))!==$path) { throw new RuntimeException('Canonical streaming seed directory required'); }
        for ($p=$path;;$p=dirname($p)) { if (is_link($p)) { throw new RuntimeException('Streaming seed link ancestor refused'); } if (dirname($p)===$p) { break; } }
    }
    private static function file(string $path, int $maximum): array
    {
        self::directory(dirname($path)); clearstatcache(true,$path); $s=@lstat($path);
        if (is_link($path) || !is_file($path) || $s===false || ($s['nlink']??0)!==1 || $s['size']<0 || $s['size']>$maximum) { throw new RuntimeException('Unsafe streaming seed file preserved'); }
        return $s;
    }
    private static function held($handle,string $path,int $size): void
    {
        $s=self::file($path,$size); $h=fstat($handle);
        if ($h===false || $s['size']!==$size || $h['size']!==$size || $h['dev']!==$s['dev'] || $h['ino']!==$s['ino'] || ($h['nlink']??0)!==1) { throw new RuntimeException('Streaming seed open file identity changed'); }
    }
    public function __construct(string $publicRoot,array $plan,array $sizes,array $priorOverrides,callable $guard,?callable $observer=null,string $profile='default')
    {
        if (!defined('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED') || KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED!==true) { throw new RuntimeException('Explicit private streaming seed caller required'); }
        if (!in_array($profile,array('default','full-private-host'),true) || ($profile==='full-private-host' && (!defined('KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED') || KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED!==true))) { throw new RuntimeException('Explicit server-side private host streaming profile required'); }
        $this->profile=$profile; $this->stepBytes=$profile==='default'?self::STEP_BYTES:67108864; $this->stepFiles=$profile==='default'?self::STEP_FILES:256;
        self::directory($publicRoot); $keys=array_keys($plan); sort($keys);
        if (basename($publicRoot)!=='public_html' || $keys!==array('applicationCommit','expected','prior','protectedStateSha256','transactionId') || !is_string($plan['transactionId']) || !preg_match('/^[a-f0-9]{32}$/D',$plan['transactionId']) || !is_string($plan['applicationCommit']) || !preg_match('/^[a-f0-9]{40}$/D',$plan['applicationCommit']) || !self::digest($plan['protectedStateSha256']) || !is_array($plan['expected']) || !is_array($plan['prior']) || count($plan['expected'])<4 || count($plan['expected'])>10000 || array_diff_key($sizes,$plan['expected']) || array_diff_key($plan['expected'],$sizes) || array_diff_key($plan['prior'],$plan['expected'],array(self::MARKER=>true)) || array_diff_key($priorOverrides,$plan['prior'])) { throw new RuntimeException('Exact complete streaming seed plan required'); }
        $this->public=$publicRoot; $this->source=$publicRoot.'/staging/wp-content/mu-plugins'; self::directory($this->source);
        $this->plan=$plan; $this->sizes=$sizes; $this->guard=$guard; $this->observer=$observer;
        $total=0; $inline=0;
        foreach (array('source'=>'expected','target'=>'prior') as $folder=>$kind) {
            $seen=array(); $this->directories[$folder]=true; $inventory=$plan[$kind]; ksort($inventory);
            foreach ($inventory as $name=>$sha) {
                if (!is_string($name) || !preg_match('/^[A-Za-z0-9._\/-]+$/D',$name) || array_intersect(explode('/',$name),array('','.','..')) || !($name==='ktk-code-pages.php' || str_starts_with($name,'ktk-code-pages-assets/') || ($folder==='target' && $name===self::MARKER)) || !self::digest($sha) || isset($seen[strtolower($name)])) { throw new RuntimeException('Exact unambiguous streaming seed inventory required'); }
                $seen[strtolower($name)]=true;
                if ($folder==='target' && array_key_exists($name,$priorOverrides)) {
                    $encoded=$priorOverrides[$name]; $bytes=is_string($encoded)?base64_decode($encoded,true):false;
                    if (!is_string($bytes) || strlen($bytes)>1048576 || ($inline+=strlen($bytes))>4194304 || hash('sha256',$bytes)!==$sha) { throw new RuntimeException('Exact small private prior override required'); }
                    $this->overrides[$name]=$bytes; $size=strlen($bytes);
                } else {
                    $size=$sizes[$name]??null;
                    if (($plan['expected'][$name]??null)!==$sha || !is_int($size) || $size<0 || $size>67108864) { throw new RuntimeException('Exact staging source hash and size required'); }
                }
                if (($total+=$size)>4294967296) { throw new RuntimeException('Private streaming inventory exceeds four-GiB budget'); }
                $this->files[$folder.'/'.$name]=array('sha256'=>$sha,'bytes'=>$size);
                for ($dir=dirname($folder.'/'.$name);$dir!=='.';$dir=dirname($dir)) { $this->directories[$dir]=true; }
            }
        }
        foreach (array('ktk-code-pages.php','ktk-code-pages-assets/registry.php','ktk-code-pages-assets/runtime.css','ktk-code-pages-assets/runtime.js') as $name) { if (!isset($plan['expected'][$name],$plan['prior'][$name])) { throw new RuntimeException('Complete private streaming renderer inventory required'); } }
        $paths=array();
        foreach (array_merge(array_keys($this->directories),array_keys($this->files)) as $path) {
            $folded=strtolower($path);
            if (isset($paths[$folded]) && $paths[$folded]!==$path) { throw new RuntimeException('Streaming seed case alias refused'); } $paths[$folded]=$path;
        }
        foreach ($this->directories as $dir=>$_) { if (isset($this->files[$dir])) { throw new RuntimeException('Streaming seed file-directory collision refused'); } }
        if (($plan['prior'][self::MARKER]??null)!==self::MARKER_SHA || isset($plan['expected'][self::MARKER]) || !isset($this->overrides[self::MARKER]) || array_sum($sizes)>2147483648) { throw new RuntimeException('Exact private marker and bounded staging source required'); }
    }
    private function check(KTK_Content_Update_Private_Store $store,bool $protected=true): string
    {
        if ($store->transactionId()!==$this->plan['transactionId'] || $store->privateRoot()!==dirname($this->public).'/.ktk-content-update-'.$this->plan['transactionId']) { throw new RuntimeException('Private streaming seed root differs'); }
        $inventory=$this->pendingClosure===null?$store->inventory():$store->inventoryForWrite('closed.json',$this->pendingClosure);
        // Every inventory rereads and authenticates all record bytes. Equal digests permit
        // reuse of the decoded plan within this held-lock call, never stat-only trust.
        if ($this->profile==='full-private-host' && !$protected && $this->validatedControl!==null) {
            if ($inventory!==$this->validatedControl) { throw new RuntimeException('Validated private streaming control bytes changed'); }
            return $store->privateRoot();
        }
        $original=$store->read('original-state.json'); $raw=$store->read('controller-plan.json');
        if ($original===null || $raw===null) { throw new RuntimeException('Signed original state and exact plan required before private streaming'); }
        $control=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
        $snapshot=json_decode($original,true,64,JSON_THROW_ON_ERROR);
        if (!is_array($snapshot) || ($snapshot['protectedStateSha256']??null)!==$this->plan['protectedStateSha256'] || !is_array($control) || ($control['mode']??null)!=='private-staging-rehearsal' || ($control['transactionId']??null)!==$this->plan['transactionId'] || ($control['applicationCommit']??null)!==$this->plan['applicationCommit'] || ($control['originalStateSha256']??null)!==hash('sha256',$original) || self::encode($control['enginePlan']??null)!==self::encode($this->plan) || ($protected && $this->disposalGuard===null && ($this->guard)()!==$this->plan['protectedStateSha256'])) { throw new RuntimeException('Private streaming plan or protected state differs; preserve without database restoration'); }
        if ($protected && $this->disposalGuard!==null) { ($this->disposalGuard)(); }
        if ($this->profile==='full-private-host') { $this->validatedControl=$inventory; }
        return $store->privateRoot();
    }
    private function sourceInventory(): void
    {
        self::directory($this->source); $found=array('ktk-code-pages.php'=>true); $assets=$this->source.'/ktk-code-pages-assets'; self::directory($assets); $visited=0;
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($assets,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $entry) {
            if (++$visited>20000 || $entry->isLink()) { throw new RuntimeException('Unsafe staging source inventory'); }
            $path=str_replace('\\','/',$entry->getPathname()); $name=substr($path,strlen($this->source)+1);
            if ($entry->isDir()) { self::directory($path); if (!isset($this->directories['source/'.$name])) { throw new RuntimeException('Unknown staging source directory'); } }
            elseif ($entry->isFile()) { $found[$name]=true; } else { throw new RuntimeException('Unknown staging source member'); }
        }
        if (array_diff_key($found,$this->plan['expected']) || array_diff_key($this->plan['expected'],$found)) { throw new RuntimeException('Staging source inventory changed'); }
        foreach ($found as $name=>$_) { $path=$this->source.'/'.$name; $s=self::file($path,$this->sizes[$name]); if ($s['size']!==$this->sizes[$name] || hash_file('sha256',$path)!==$this->plan['expected'][$name]) { throw new RuntimeException('Staging source bytes changed'); } }
    }
    private function openExpected(string $name)
    {
        [$folder,$relative]=explode('/',$name,2);
        if ($folder==='target' && isset($this->overrides[$relative])) { return null; }
        $path=$this->source.'/'.$relative; $size=$this->sizes[$relative]; self::file($path,$size); $h=fopen($path,'rb');
        if (!$h) { throw new RuntimeException('Cannot read exact staging seed source'); }
        try { self::held($h,$path,$size); return $h; } catch (Throwable $e) { fclose($h); throw $e; }
    }
    private function expected(string $name,int $offset,int $length,$handle): string
    {
        [$folder,$relative]=explode('/',$name,2);
        if ($folder==='target' && isset($this->overrides[$relative])) { return substr($this->overrides[$relative],$offset,$length); }
        $path=$this->source.'/'.$relative; $size=$this->sizes[$relative];
        self::held($handle,$path,$size); if (fseek($handle,$offset)!==0) { throw new RuntimeException('Cannot seek staging seed source'); } $bytes=$length===0?'':fread($handle,$length); self::held($handle,$path,$size); if (!is_string($bytes) || strlen($bytes)!==$length) { throw new RuntimeException('Staging seed source short read'); } return $bytes;
    }
    private function prefix(string $path,string $name): array
    {
        $spec=$this->files[$name]; $s=self::file($path,$spec['bytes']); $h=fopen($path,'rb'); if (!$h) { throw new RuntimeException('Cannot inspect private streaming prefix'); } $hash=hash_init('sha256'); $reader=null;
        try {
            $complete=$s['size']===$spec['bytes'];
            if (!$complete) { $reader=$this->openExpected($name); }
            self::held($h,$path,$s['size']);
            for ($offset=0;$offset<$s['size'];$offset+=strlen($bytes)) {
                $bytes=fread($h,min(self::CHUNK,$s['size']-$offset));
                if (!is_string($bytes) || $bytes==='' || (!$complete && $bytes!==$this->expected($name,$offset,strlen($bytes),$reader))) { throw new RuntimeException('Changed streaming prefix preserved'); } hash_update($hash,$bytes);
            }
            self::held($h,$path,$s['size']); $digest=hash_final($hash);
            if ($s['size']===$spec['bytes'] && $digest!==$spec['sha256']) { throw new RuntimeException('Completed streaming seed differs'); }
            return array('sha256'=>$digest,'bytes'=>$s['size']);
        } finally { if (is_resource($reader)) { fclose($reader); } fclose($h); }
    }
    public function inspect(KTK_Content_Update_Private_Store $store): array
    {
        $root=$this->check($store); $this->sourceInventory(); $files=array(); $dirs=array(); $visited=0; $complete=array('source'=>true,'target'=>true);
        foreach (array('source','target') as $folder) {
            $path=$root.'/'.$folder;
            if (!file_exists($path) && !is_link($path)) { $complete[$folder]=false; continue; }
            self::directory($path); $dirs[$folder]=true;
            foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $entry) {
                if (++$visited>40000 || $entry->isLink()) { throw new RuntimeException('Unsafe private streaming tree preserved'); }
                $path=str_replace('\\','/',$entry->getPathname()); $name=substr($path,strlen($root)+1);
                if ($entry->isDir()) { if (!isset($this->directories[$name])) { throw new RuntimeException('Unknown private streaming directory preserved'); } self::directory($path); $dirs[$name]=true; }
                elseif ($entry->isFile() && isset($this->files[$name])) { $files[$name]=$this->prefix($path,$name); }
                else { throw new RuntimeException('Unknown private streaming file preserved'); }
            }
        }
        foreach ($this->files as $name=>$spec) { if (($files[$name]??null)!==$spec) { $complete[explode('/',$name,2)[0]]=false; } }
        if (isset($dirs['target']) && !$complete['source']) { throw new RuntimeException('Private target cannot precede the complete candidate'); }
        ksort($files); ksort($dirs); $this->check($store);
        $state=array('rootBinding'=>$store->rootBinding(),'planSha256'=>hash('sha256',self::encode($this->plan)),'profile'=>$this->profile,'files'=>$files,'directories'=>array_keys($dirs));
        return array('stateSha256'=>hash('sha256',self::encode($state)),'files'=>$files,'directories'=>array_keys($dirs),'sourceComplete'=>$complete['source'],'targetComplete'=>$complete['target'],'copiedBytes'=>array_sum(array_column($files,'bytes')),'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0);
    }
    public function expectedStateSha256(KTK_Content_Update_Private_Store $store): string
    {
        if ($store->transactionId()!==$this->plan['transactionId']) { throw new RuntimeException('Streaming expected-state transaction differs'); }
        $files=$this->files;$dirs=array_keys($this->directories);ksort($files);sort($dirs);
        return hash('sha256',self::encode(array('rootBinding'=>$store->rootBinding(),'planSha256'=>hash('sha256',self::encode($this->plan)),'profile'=>$this->profile,'files'=>$files,'directories'=>$dirs)));
    }
    public function inspectPendingClosure(KTK_Content_Update_Private_Store $store,string $bytes): array
    {
        if ($this->profile!=='full-private-host') { throw new RuntimeException('Explicit private host closure inspection required'); }
        $this->pendingClosure=$bytes;
        try { return $this->inspect($store); } finally { $this->pendingClosure=null; }
    }
    public function inspectForDisposal(KTK_Content_Update_Private_Store $store,callable $freshGuard,?string $closure=null): array
    {
        if ($this->profile!=='full-private-host' || !defined('KTK_PRIVATE_SEED_DISPOSAL_ALLOWED') || KTK_PRIVATE_SEED_DISPOSAL_ALLOWED!==true || $this->disposalGuard!==null || $this->pendingClosure!==null) { throw new RuntimeException('Explicit read-only private disposal census required'); }
        $this->disposalGuard=$freshGuard;$this->pendingClosure=$closure;
        try { return $this->inspect($store); } finally { $this->disposalGuard=null;$this->pendingClosure=null;$this->validatedControl=null; }
    }
    public function advance(KTK_Content_Update_Private_Store $store,string $stateSha256): array
    {
        if ($this->disposalGuard!==null) { throw new RuntimeException('Private disposal census cannot authorize copying'); }
        $state=$this->inspect($store);
        if (!self::digest($stateSha256) || !hash_equals($state['stateSha256'],$stateSha256)) { throw new RuntimeException('Stale streaming state; inspect before advancing'); }
        return $this->copyInspected($store,$state);
    }
    public function advanceWithControllerFence(KTK_Content_Update_Private_Store $store,callable $beforeWrite): array
    {
        if ($this->disposalGuard!==null) { throw new RuntimeException('Private disposal census cannot authorize copying'); }
        if ($this->profile!=='full-private-host') { throw new RuntimeException('Explicit full private host controller fence required'); }
        $state=$this->inspect($store);
        // Server callback validates the complete controller fence and archive under
        // this same store lock, before any payload directory or file is created.
        $beforeWrite($state);
        return $this->copyInspected($store,$state);
    }
    private function copyInspected(KTK_Content_Update_Private_Store $store,array $state): array
    {
        $written=0; $opened=0;
        foreach ($this->files as $name=>$spec) {
            if (($state['files'][$name]??null)===$spec) { continue; }
            if ($written>=$this->stepBytes || $opened>=$this->stepFiles) { break; }
            if (str_starts_with($name,'target/') && !$state['sourceComplete']) { break; }
            $root=$this->check($store,false); $parent=$root;
            foreach (array_slice(explode('/',$name),0,-1) as $part) {
                self::directory($parent); $parent.='/'.$part;
                if (!file_exists($parent) && !is_link($parent) && !mkdir($parent,0700)) { throw new RuntimeException('Cannot create declared streaming directory'); } self::directory($parent);
            }
            $path=$root.'/'.$name; $exists=file_exists($path)||is_link($path); $before=$exists?$this->prefix($path,$name):array('sha256'=>hash('sha256',''),'bytes'=>0);
            if (isset($state['files'][$name]) && $before!==$state['files'][$name]) { throw new RuntimeException('Streaming prefix changed after inspection'); }
            if (!isset($state['files'][$name]) && $exists) { throw new RuntimeException('New streaming file appeared after inspection'); }
            $h=fopen($path,$exists?'r+b':'x+b'); if (!$h) { throw new RuntimeException('Cannot exclusively open private streaming seed'); } $opened++; $reader=null;
            try {
                if ($this->observer!==null) { ($this->observer)('after-stream-open',$name,$path); }
                $this->check($store,false); self::held($h,$path,$before['bytes']);
                if ($this->prefix($path,$name)!==$before || !chmod($path,0600) || fseek($h,$before['bytes'])!==0) { throw new RuntimeException('Private streaming seed changed before append'); }
                $offset=$before['bytes']; $reader=$this->openExpected($name);
                while ($offset<$spec['bytes'] && $written<$this->stepBytes) {
                    $chunk=$this->expected($name,$offset,min(self::CHUNK,$spec['bytes']-$offset,$this->stepBytes-$written),$reader); $position=0;
                    while ($position<strlen($chunk)) { $n=fwrite($h,substr($chunk,$position)); if ($n===false || $n===0) { throw new RuntimeException('Private streaming append interrupted'); } $position+=$n; $offset+=$n; $written+=$n; }
                    if (!fflush($h) || (function_exists('fsync')&&!fsync($h))) { throw new RuntimeException('Private streaming flush failed'); }
                    self::held($h,$path,$offset);
                    if ($this->observer!==null) { ($this->observer)('after-stream-chunk',$name,$path); }
                }
                if (!fflush($h) || (function_exists('fsync')&&!fsync($h))) { throw new RuntimeException('Private streaming final flush failed'); }
                self::held($h,$path,$offset);
            } finally { if (is_resource($reader)) { fclose($reader); } fclose($h); }
            $this->prefix($path,$name);
            if ($this->observer!==null) { ($this->observer)('after-stream-file',$name,$path); }
        }
        $result=$this->inspect($store); $result['stepBytesWritten']=$written; $result['stepFilesOpened']=$opened; return $result;
    }
}
