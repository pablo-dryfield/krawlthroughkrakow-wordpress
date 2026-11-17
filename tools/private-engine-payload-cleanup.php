<?php
/** Bounded known-payload deletion under a fresh one-use termination context. */
if(!defined('KTK_PRIVATE_ENGINE_PAYLOAD_CLEANUP_ALLOWED')||KTK_PRIVATE_ENGINE_PAYLOAD_CLEANUP_ALLOWED!==true){throw new RuntimeException('Explicit bounded private payload caller required');}
final class KTK_Private_Engine_Payload_Cleanup
{
    private array $config;
    private $capture;
    private $observer;
    private $clock;
    private static function json($v): string {return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
    private static function canonical($v){if(is_array($v)){if(!array_is_list($v)){ksort($v);}foreach($v as $k=>$x){$v[$k]=self::canonical($x);}}return $v;}
    private static function sha($v): string {return hash('sha256',self::json(self::canonical($v)));}
    private static function directory(string $p): void {
        clearstatcache(true,$p);if(!is_dir($p)||is_link($p)||str_replace('\\','/',(string)realpath($p))!==$p){throw new RuntimeException('Canonical existing cleanup directory required');}
        for($a=$p;;$a=dirname($a)){if(is_link($a)){throw new RuntimeException('Cleanup link ancestor preserved');}if(dirname($a)===$a){break;}}
    }
    public function __construct(array $config,callable $capture,?callable $observer=null,?callable $clock=null){
        $keys=array_keys($config);sort($keys);
        if($keys!==array('authority','claim','fenced')||!is_array($config['authority'])||!is_array($config['fenced'])||!is_array($config['claim'])||($config['authority']['operation']??null)!=='cleanup'||($config['claim']['operation']??null)!=='cleanup'||($config['claim']['operationId']??null)!==($config['authority']['operationId']??null)||($config['claim']['contextConsumed']??null)!==true||($config['claim']['receiptDurablyReadBack']??null)!==true){throw new RuntimeException('Consumed current cleanup context required');}
        $this->config=$config;$this->capture=$capture;$this->observer=$observer;$this->clock=$clock??static fn()=>time();
    }
    private function time(): void {
        $now=($this->clock)();$expires=$this->config['authority']['expires'];
        if(!is_int($now)||!is_int($expires)||$now>=$expires||$expires>$now+3600){throw new RuntimeException('Current bounded cleanup lifetime ended; preserve consumed context');}
    }
    private function fresh(): void {
        $this->time();$s=($this->capture)();$this->time();$a=$this->config['authority'];$keys=is_array($s)?array_keys($s):array();sort($keys);
        if($keys!==array('ownedContentFiles','protectedStateSha256')||$s['protectedStateSha256']!==$a['freshProtectedStateSha256']||!is_array($s['ownedContentFiles'])||!hash_equals(self::sha($s['ownedContentFiles']),$a['freshPublicOwnedSha256'])){throw new RuntimeException('Complete current cleanup witness changed; preserve every value');}
    }
    private function event(string $event,string $name,string $path): void {if($this->observer!==null){($this->observer)($event,$name,$path);}}
    private static function same(array $before,$after): bool {
        return is_array($after)&&$before['dev']===$after['dev']&&$before['ino']===$after['ino']&&$before['size']===$after['size']&&$before['mtime']===$after['mtime']&&$before['ctime']===$after['ctime']&&($after['nlink']??0)===1;
    }
    private function claim(KTK_Content_Update_Private_Store $store): void {
        $a=$this->config['authority'];$c=$this->config['claim'];$f=$this->config['fenced'];$path=dirname($f['publicRoot']).'/.ktk-engine-termination-'.$a['operationId'];self::directory($path);$p=$path.'/claim.json';
        if(($c['path']??null)!==$path||array_values(array_diff(scandir($path),array('.','..')))!==array('claim.json')){throw new RuntimeException('Exact retained operation receipt required');}
        clearstatcache(true,$p);$before=@lstat($p);if($before===false||is_link($p)||!is_file($p)||($before['nlink']??0)!==1||$before['size']!==($c['receiptBytes']??null)||$before['size']>4096){throw new RuntimeException('Changed operation receipt preserved');}
        $raw=file_get_contents($p);clearstatcache(true,$p);$after=@lstat($p);
        if(!is_string($raw)||!self::same($before,$after)||hash('sha256',$raw)!==($c['receiptSha256']??null)){throw new RuntimeException('Consumed receipt bytes changed; preserve them');}
        $v=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
        foreach(array('operationId','operation','transactionId','applicationCommit','metadataArchiveSha256','inspectionStateSha256','closureSha256','freshProtectedStateSha256','freshPublicOwnedSha256','witnessArchiveSha256') as $n){if(($v[$n]??null)!==$a[$n]){throw new RuntimeException('Consumed cleanup receipt provenance differs');}}
        if(($v['scope']??null)!=='consumed-private-engine-termination-operation'||($v['rootBinding']??null)!==$store->rootBinding()){throw new RuntimeException('Consumed cleanup root binding differs');}
    }
    public function run(KTK_Content_Update_Private_Store $store,KTK_Private_Engine_Fenced_Inspection $reader,array $expected): array {
        $f=$this->config['fenced'];$a=$this->config['authority'];$root=dirname($f['publicRoot']).'/.ktk-content-update-'.$a['transactionId'];
        if($store->privateRoot()!==$root||$store->transactionId()!==$a['transactionId']||$store->rootBinding()!==$f['initialInspection']['rootBinding']){throw new RuntimeException('Exact held original cleanup namespace required');}
        $this->fresh();$this->claim($store);$state=$reader->inspect($store);
        if(($expected['stateSha256']??null)!==$state['stateSha256']||!$state['signedClosureComplete']||!$state['originalExecutionHelperAbsent']){throw new RuntimeException('Exact freshly inspected complete signed closure required');}
        $names=array_keys(array_intersect_key($state['files'],$f['payload']));sort($names);$deleted=0;$removed=0;
        foreach($names as $n){
            if($deleted>=256){break;}$p=$root.'/'.$n;$row=$f['payload'][$n];self::directory(dirname($p));clearstatcache(true,$p);$before=@lstat($p);
            $this->event('before-private-payload-delete',$n,$p);$this->fresh();$this->claim($store);
            if($deleted===0&&$reader->inspect($store)['stateSha256']!==$state['stateSha256']){throw new RuntimeException('Cleanup state changed before first removal; preserve it');}
            self::directory(dirname($p));clearstatcache(true,$p);$current=@lstat($p);
            if($before===false||!self::same($before,$current)||is_link($p)||!is_file($p)||$current['size']!==$row['bytes']){throw new RuntimeException('Changed known payload preserved before read');}
            $h=@fopen($p,'rb');if(!$h){throw new RuntimeException('Known payload cannot be read; preserve it');}
            try{
                $held=fstat($h);$hash=hash_init('sha256');$bytes=hash_update_stream($hash,$h,$row['bytes']+1);$digest=hash_final($hash);$end=fstat($h);clearstatcache(true,$p);$named=@lstat($p);
                if($held===false||($held['nlink']??0)!==1||$held['dev']!==$before['dev']||$held['ino']!==$before['ino']||$held['size']!==$row['bytes']||!self::same($held,$end)||!self::same($before,$named)||is_link($p)||$bytes!==$row['bytes']||$digest!==$row['sha256']){throw new RuntimeException('Known payload changed while hashing; preserve it');}
            }finally{fclose($h);}
            $this->time();self::directory(dirname($p));$store->rootBinding();clearstatcache(true,$p);$last=@lstat($p);
            if(!self::same($before,$last)||is_link($p)||!@unlink($p)){throw new RuntimeException('Changed payload preserved at removal boundary');}
            $deleted++;$this->event('after-private-payload-delete',$n,$p);
        }
        $dirs=$state['directories'];usort($dirs,static fn($x,$y)=>(strlen($y)<=>strlen($x))?:strcmp($x,$y));
        foreach($dirs as $n){
            if($removed>=256){break;}if($n!=='source'&&$n!=='target'&&!str_starts_with($n,'source/')&&!str_starts_with($n,'target/')){continue;}
            $p=$root.'/'.$n;self::directory($p);$before=lstat($p);$this->event('before-private-payload-directory',$n,$p);$this->fresh();$this->claim($store);self::directory($p);$store->rootBinding();clearstatcache(true,$p);$after=lstat($p);
            if($before['dev']!==$after['dev']||$before['ino']!==$after['ino']){throw new RuntimeException('Changed known directory preserved');}
            if(array_values(array_diff(scandir($p),array('.','..')))!==array()){continue;}
            $this->time();if(!@rmdir($p)){throw new RuntimeException('Changed empty directory preserved');}$removed++;$this->event('after-private-payload-directory',$n,$p);
        }
        $this->fresh();$this->claim($store);$after=$reader->inspect($store);
        return array('state'=>$after,'payloadDeletes'=>$deleted,'payloadDirectoriesRemoved'=>$removed);
    }
}
