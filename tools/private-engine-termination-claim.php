<?php
/** One-use private operation claim only. No fence, cleanup, application or database writer. */
if (!defined('KTK_PRIVATE_ENGINE_TERMINATION_CLAIM_ALLOWED') || KTK_PRIVATE_ENGINE_TERMINATION_CLAIM_ALLOWED!==true) { throw new RuntimeException('Explicit private termination claim caller required'); }

final class KTK_Private_Engine_Termination_Claim
{
    private array $config;
    private KTK_Content_Update_Private_Store $store;
    private $guard;
    private $observer;
    private static function json(array $v): string { return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function digest($v): bool { return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1; }
    private static function directory(string $p): void
    {
        clearstatcache(true,$p);if(!is_dir($p)||is_link($p)||str_replace('\\','/',(string)realpath($p))!==$p){throw new RuntimeException('Canonical existing private claim directory required');}
        for($a=$p;;$a=dirname($a)){if(is_link($a)){throw new RuntimeException('Private claim link ancestor preserved');}if(dirname($a)===$a){break;}}
    }
    public function __construct(array $config,KTK_Content_Update_Private_Store $store,callable $guard,?callable $observer=null)
    {
        $keys=array_keys($config);sort($keys);
        if($keys!==array('applicationCommit','closureSha256','expires','freshProtectedStateSha256','freshPublicOwnedSha256','inspectionStateSha256','metadataArchiveSha256','operation','operationId','publicRoot','rootBinding','schemaVersion','scope','tokenSha256','transactionId','witnessArchiveSha256')||$config['schemaVersion']!==1||$config['scope']!=='fresh-witness-private-engine-termination'||!in_array($config['operation'],array('fence','cleanup'),true)||!is_string($config['operationId'])||preg_match('/^[a-f0-9]{32}$/D',$config['operationId'])!==1||!is_string($config['transactionId'])||preg_match('/^[a-f0-9]{32}$/D',$config['transactionId'])!==1||$config['operationId']===$config['transactionId']||!is_string($config['applicationCommit'])||preg_match('/^[a-f0-9]{40}$/D',$config['applicationCommit'])!==1||!is_int($config['expires'])||!is_string($config['publicRoot'])||basename($config['publicRoot'])!=='public_html'){
            throw new RuntimeException('Exact separate mutation claim configuration required');
        }
        foreach(array('closureSha256','freshProtectedStateSha256','freshPublicOwnedSha256','inspectionStateSha256','metadataArchiveSha256','rootBinding','tokenSha256','witnessArchiveSha256') as $key){if(!self::digest($config[$key])){throw new RuntimeException('Exact private mutation claim digests required');}}
        $this->config=$config;$this->store=$store;$this->guard=$guard;$this->observer=$observer;
    }
    private function roots(): void
    {
        $c=$this->config;self::directory($c['publicRoot']);self::directory(dirname($c['publicRoot']));
        $mu=$c['publicRoot'].'/staging/wp-content/mu-plugins';self::directory($mu);
        if($this->store->privateRoot()!==dirname($c['publicRoot']).'/.ktk-content-update-'.$c['transactionId']||!hash_equals($c['rootBinding'],$this->store->rootBinding())){throw new RuntimeException('Exact held original private ownership required');}
        $old=$mu.'/ktk-transaction-rehearsal-'.$c['transactionId'].'.php';
        if(file_exists($old)||is_link($old)){throw new RuntimeException('Original execution helper must be absent before consuming mutation authority');}
    }
    private function fresh(): void
    {
        $this->roots();if(($this->guard)()!==true){throw new RuntimeException('Complete fresh current witness must be independently verified');}$this->roots();
    }
    private function event(string $event,string $path): void { if($this->observer!==null){($this->observer)($event,$path);} }
    private static function sameDirectory(string $path,array $before): void
    {
        self::directory($path);$after=lstat($path);if($after===false||$before['dev']!==$after['dev']||$before['ino']!==$after['ino']){throw new RuntimeException('Consumed private operation directory changed; preserve it');}
    }
    public function consume(string $method,string $host,string $token,int $now): array
    {
        $c=$this->config;
        if($method!=='POST'||strtolower($host)!=='krawlthroughkrakow.com'||$now>=$c['expires']||$c['expires']>$now+3600||!hash_equals($c['tokenSha256'],hash('sha256',$token))){throw new RuntimeException('Current distinct staging mutation claim authentication required');}
        if(!function_exists('fsync')){throw new RuntimeException('Native claim sync required before consuming mutation authority');}
        $this->roots();$path=dirname($c['publicRoot']).'/.ktk-engine-termination-'.$c['operationId'];
        if(file_exists($path)||is_link($path)){throw new RuntimeException('Operation context already consumed or preexisting path preserved; use a new independently witnessed context');}
        $this->fresh();$this->event('before-private-claim-mkdir',$path);$this->roots();
        if(file_exists($path)||is_link($path)||!@mkdir($path,0700)){throw new RuntimeException('Exclusive one-use operation directory required; never retry this context');}
        // Directory existence consumes the operation, even if the process exits
        // before creating a file, writes only a prefix, or loses its reply.
        self::directory($path);$stamp=lstat($path);if($stamp===false){throw new RuntimeException('Consumed operation directory cannot be inspected');}
        $this->event('after-private-claim-mkdir',$path);self::sameDirectory($path,$stamp);$this->roots();
        $body=$c;unset($body['tokenSha256'],$body['publicRoot']);$body['scope']='consumed-private-engine-termination-operation';ksort($body);$raw=self::json($body);
        if(strlen($raw)>4096){throw new RuntimeException('Bounded operation receipt required; preserve consumed directory');}
        $file=$path.'/claim.json';$handle=@fopen($file,'x+b');if(!$handle){throw new RuntimeException('Exclusive consumed operation receipt required');}
        try{
            self::sameDirectory($path,$stamp);$held=fstat($handle);clearstatcache(true,$file);$current=lstat($file);
            if($held===false||$current===false||is_link($file)||($held['nlink']??0)!==1||($current['nlink']??0)!==1||$held['dev']!==$current['dev']||$held['ino']!==$current['ino']||$held['size']!==0||!chmod($file,0600)){throw new RuntimeException('Consumed operation receipt identity differs');}
            $this->event('after-private-claim-open',$file);
            self::sameDirectory($path,$stamp);clearstatcache(true,$file);$check=fstat($handle);$named=lstat($file);
            if($check===false||$named===false||is_link($file)||($check['nlink']??0)!==1||($named['nlink']??0)!==1||$held['dev']!==$check['dev']||$held['ino']!==$check['ino']||$check['dev']!==$named['dev']||$check['ino']!==$named['ino']||$check['size']!==0||$named['size']!==0){throw new RuntimeException('Changed new claim bytes preserved before write');}
            if(fwrite($handle,$raw)!==strlen($raw)||!fflush($handle)){throw new RuntimeException('Consumed operation receipt write failed; preserve it');}
            $this->event('before-private-claim-sync',$file);
            if(!fsync($handle)){throw new RuntimeException('Consumed operation receipt sync failed; preserve it');}
            $this->event('after-private-claim-synced',$file);self::sameDirectory($path,$stamp);$this->fresh();
            clearstatcache(true,$file);$final=fstat($handle);$after=lstat($file);
            if($final===false||$after===false||is_link($file)||($final['nlink']??0)!==1||($after['nlink']??0)!==1||$held['dev']!==$final['dev']||$held['ino']!==$final['ino']||$final['dev']!==$after['dev']||$final['ino']!==$after['ino']||$final['size']!==strlen($raw)||$after['size']!==strlen($raw)||fseek($handle,0)!==0||stream_get_contents($handle,4097)!==$raw||array_values(array_diff(scandir($path),array('.','..')))!==array('claim.json')){throw new RuntimeException('Consumed operation receipt changed; preserve all evidence');}
        }finally{fclose($handle);}
        return array('schemaVersion'=>1,'scope'=>'consumed-private-engine-termination-operation','operationId'=>$c['operationId'],'operation'=>$c['operation'],'path'=>$path,'receiptSha256'=>hash('sha256',$raw),'receiptBytes'=>strlen($raw),'contextConsumed'=>true,'receiptDurablyReadBack'=>true,'fenceWrites'=>0,'payloadDeletes'=>0,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0);
    }
}
