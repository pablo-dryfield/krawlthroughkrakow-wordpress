<?php
/** Known private staging seeds only. No public application, database, endpoint or production authorization. */
if (!defined('KTK_CONTENT_UPDATE_SEEDS_ALLOWED') || KTK_CONTENT_UPDATE_SEEDS_ALLOWED !== true) { throw new RuntimeException('Explicit private preparation seed caller required'); }

final class KTK_Content_Update_Preparation_Seeds
{
    private array $files = array();
    private array $directories = array();
    private string $id;
    private $observer;

    public function __construct(array $seeds, array $plan, ?callable $observer = null)
    {
        if (!defined('KTK_CONTENT_UPDATE_SEEDS_ALLOWED') || KTK_CONTENT_UPDATE_SEEDS_ALLOWED !== true || array_keys($seeds) !== array('source','target') || !is_string($plan['transactionId'] ?? null) || !preg_match('/^[a-f0-9]{32}$/D',$plan['transactionId'])) { throw new RuntimeException('Exact private seed plan required'); }
        $total = 0; $this->id = $plan['transactionId']; $this->observer = $observer;
        foreach (array('source'=>'expected','target'=>'prior') as $folder=>$kind) {
            if (!is_array($seeds[$folder]) || !is_array($plan[$kind] ?? null) || count($seeds[$folder]) < 4 || count($seeds[$folder]) > 10000 || array_diff_key($seeds[$folder],$plan[$kind]) || array_diff_key($plan[$kind],$seeds[$folder])) { throw new RuntimeException('Complete declared private seed inventory required'); }
            $seen = array(); $this->directories[$folder] = true;
            foreach ($seeds[$folder] as $name=>$encoded) {
                if (!is_string($name) || !preg_match('/^[A-Za-z0-9._\/-]+$/D',$name) || array_intersect(explode('/',$name),array('','.','..')) || !($name==='ktk-code-pages.php' || str_starts_with($name,'ktk-code-pages-assets/') || ($folder==='target' && $name==='ktk-code-pages-production.php')) || isset($seen[strtolower($name)]) || !is_string($encoded)) { throw new RuntimeException('Exact unambiguous private seed name required'); }
                $bytes = base64_decode($encoded,true); $hash = $plan[$kind][$name];
                if (!is_string($bytes) || strlen($bytes)>16777216 || !is_string($hash) || !preg_match('/^[a-f0-9]{64}$/D',$hash) || hash('sha256',$bytes)!==$hash || ($total+=strlen($bytes))>134217728) { throw new RuntimeException('Private seed bytes differ or exceed budget'); }
                $seen[strtolower($name)] = true; $this->files[$folder.'/'.$name] = $bytes;
                for ($dir=dirname($folder.'/'.$name);$dir!=='.';$dir=dirname($dir)) { $this->directories[$dir] = true; }
            }
        }
        if (($plan['prior']['ktk-code-pages-production.php']??null)!=='b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833' || isset($plan['expected']['ktk-code-pages-production.php'])) { throw new RuntimeException('Exact private activation fixture required'); }
    }
    private static function directory(string $path): void
    {
        if (str_replace('\\','/',(string)realpath($path))!==$path || !is_dir($path)) { throw new RuntimeException('Canonical private seed directory required'); }
        for ($p=$path;;$p=dirname($p)) { if (is_link($p)) { throw new RuntimeException('Private seed symlink ancestor refused'); } if (dirname($p)===$p) { break; } }
    }
    private function read(string $path,string $expected): string
    {
        $path=str_replace('\\','/',$path);self::directory(dirname($path));clearstatcache(true,$path);$stat=@lstat($path);
        if (is_link($path)||!is_file($path)||$stat===false||($stat['nlink']??0)!==1||$stat['size']>strlen($expected)) { throw new RuntimeException('Unsafe private seed file preserved'); }
        $bytes=file_get_contents($path,false,null,0,strlen($expected)+1);
        if (!is_string($bytes)||!str_starts_with($expected,$bytes)||hash_file('sha256',$path)!==hash('sha256',$bytes)) { throw new RuntimeException('Changed private seed prefix preserved'); }return $bytes;
    }
    public function inspect(KTK_Content_Update_Private_Store $store): array
    {
        if ($store->transactionId()!==$this->id) { throw new RuntimeException('Private seed transaction differs'); }
        $root=$store->privateRoot();self::directory($root);$files=array();$dirs=array();$visited=0;$complete=array('source'=>true,'target'=>true);
        foreach (array('source','target') as $folder) {
            $path=$root.'/'.$folder;
            if (!file_exists($path)&&!is_link($path)) { $complete[$folder]=false;continue; }self::directory($path);$dirs[$folder]=true;
            $iterator=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST);
            foreach ($iterator as $entry) {
                if (++$visited>20000||$entry->isLink()) { throw new RuntimeException('Unsafe private seed tree preserved'); }
                $path=str_replace('\\','/',$entry->getPathname());$name=substr($path,strlen($root)+1);
                if ($entry->isDir()) { if (!isset($this->directories[$name])) { throw new RuntimeException('Unknown private seed directory preserved'); }self::directory($path);$dirs[$name]=true;continue; }
                if (!$entry->isFile()||!isset($this->files[$name])) { throw new RuntimeException('Unknown private seed file preserved'); }
                $bytes=$this->read($path,$this->files[$name]);$files[$name]=array('sha256'=>hash('sha256',$bytes),'bytes'=>strlen($bytes));
            }
        }
        foreach ($this->files as $name=>$expected) { $folder=explode('/',$name,2)[0];if (($files[$name]['sha256']??null)!==hash('sha256',$expected)) { $complete[$folder]=false; } }
        if (isset($dirs['target'])&&!$complete['source']) { throw new RuntimeException('Private target cannot precede complete candidate seeds'); }
        ksort($files);ksort($dirs);$state=array('rootBinding'=>$store->rootBinding(),'files'=>$files,'directories'=>array_keys($dirs));
        return array('stateSha256'=>hash('sha256',json_encode($state,JSON_THROW_ON_ERROR)),'files'=>$files,'directories'=>array_keys($dirs),'sourceComplete'=>$complete['source'],'targetComplete'=>$complete['target'],'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0);
    }
    public function complete(KTK_Content_Update_Private_Store $store,string $stateSha256): array
    {
        $state=$this->inspect($store);
        if (!preg_match('/^[a-f0-9]{64}$/D',$stateSha256)||!hash_equals($state['stateSha256'],$stateSha256)) { throw new RuntimeException('Stale private seed state; inspect before completion'); }
        foreach ($this->files as $name=>$expected) {
            $this->inspect($store);$root=$store->privateRoot();$parent=$root;
            foreach (array_slice(explode('/',$name),0,-1) as $part) { self::directory($parent);$parent.='/'.$part;if (!file_exists($parent)&&!is_link($parent)&&!mkdir($parent,0700)) { throw new RuntimeException('Cannot create known private seed directory'); }self::directory($parent); }
            $path=$root.'/'.$name;$exists=file_exists($path)||is_link($path);$before=$exists?$this->read($path,$expected):'';if ($exists&&$before===$expected) { continue; }
            $handle=fopen($path,$exists?'r+b':'x+b');if (!$handle) { throw new RuntimeException('Cannot open known private seed file'); }
            try {
                if ($this->observer!==null) { ($this->observer)('after-seed-file-open',$name,$path); }self::directory($store->privateRoot());self::directory(dirname($path));clearstatcache(true,$path);$held=fstat($handle);$current=@lstat($path);
                if ($held===false||$current===false||$held['dev']!==$current['dev']||$held['ino']!==$current['ino']||($held['nlink']??0)!==1||$this->read($path,$expected)!==$before||!chmod($path,0600)||fseek($handle,strlen($before))!==0) { throw new RuntimeException('Private seed file changed before completion'); }
                $offset=strlen($before);while ($offset<strlen($expected)) { $n=fwrite($handle,substr($expected,$offset));if ($n===false||$n===0) { throw new RuntimeException('Private seed write interrupted'); }$offset+=$n; }
                if (!fflush($handle)||(function_exists('fsync')&&!fsync($handle))) { throw new RuntimeException('Private seed flush failed'); }
            } finally { fclose($handle); }
            if ($this->read($path,$expected)!==$expected) { throw new RuntimeException('Completed private seed differs'); }
            if ($this->observer!==null) { ($this->observer)('after-seed-file-complete',$name,$path); }
        }
        $state=$this->inspect($store);if (!$state['sourceComplete']||!$state['targetComplete']) { throw new RuntimeException('Complete private seed inventories required'); }return $state;
    }
}
