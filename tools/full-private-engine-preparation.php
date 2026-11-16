<?php
/** Private-only streamed engine preparation and original archive gate. No HTTP hook or public writer. */
if (!defined('KTK_FULL_PRIVATE_ENGINE_PREPARATION_ALLOWED') || KTK_FULL_PRIVATE_ENGINE_PREPARATION_ALLOWED!==true) { throw new RuntimeException('Explicit full private engine preparation required'); }

final class KTK_Full_Private_Engine_Preparation
{
    private array $plan;
    private string $public;
    private string $key;
    private string $helperSha;
    private KTK_Full_Private_Engine_Streaming_Seeds $stream;
    private static function json($v): string { return json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function canonical($v) { if(is_array($v)){if(!array_is_list($v)){ksort($v);}foreach($v as $k=>$x){$v[$k]=self::canonical($x);}}return $v; }
    private static function sha($v): string { return hash('sha256',self::json(self::canonical($v))); }
    private static function digest($v): bool { return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1; }
    public function __construct(string $public,array $plan,array $sizes,array $overrides,string $key,string $helperSha,callable $guard,?callable $observer=null)
    {
        if(!self::digest($key)||!self::digest($helperSha)){throw new RuntimeException('Exact private preparation ownership and helper required');}
        $this->stream=new KTK_Full_Private_Engine_Streaming_Seeds($public,$plan,$sizes,$overrides,$guard,$observer,'full-private-host');$this->public=$public;$this->plan=$plan;$this->key=$key;$this->helperSha=$helperSha;
    }
    private function root(KTK_Content_Update_Private_Store $store): string
    {
        $expected=dirname($this->public).'/.ktk-content-update-'.$this->plan['transactionId'];
        $owner=hash_hmac('sha256',json_encode(array('publicRoot'=>$this->public,'transactionId'=>$this->plan['transactionId'],'privateRoot'=>$expected),JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),$this->key);
        if($store->transactionId()!==$this->plan['transactionId']||$store->privateRoot()!==$expected||!hash_equals($store->rootBinding(),$owner)){throw new RuntimeException('Full engine preparation store differs');}return $expected;
    }
    public function inspect(KTK_Content_Update_Private_Store $store): array
    {
        $root=$this->root($store);
        if($store->read('original-state.json')===null||$store->read('controller-plan.json')===null){
            foreach(array('source','target','engine') as $name){if(file_exists($root.'/'.$name)||is_link($root.'/'.$name)){throw new RuntimeException('Payload cannot precede complete signed original records');}}
            $files=array();$dirs=array();$state=array('rootBinding'=>$store->rootBinding(),'planSha256'=>self::sha($this->plan),'profile'=>'full-private-host','files'=>$files,'directories'=>$dirs);
            return array('stateSha256'=>self::sha($state),'files'=>$files,'directories'=>$dirs,'sourceComplete'=>false,'targetComplete'=>false,'copiedBytes'=>0,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0);
        }
        return $this->stream->inspect($store);
    }
    public function initialize(string $private,KTK_Content_Update_Private_Store $store): void
    {
        if($private!==$this->root($store)){throw new RuntimeException('Exact private initialization root required');}$this->inspect($store);
    }
    public function capsule(KTK_Content_Update_Private_Store $store): array
    {
        $this->root($store);$raw=$store->read('original-state.json');$planRaw=$store->read('controller-plan.json');
        if($raw===null||$planRaw===null){throw new RuntimeException('Complete signed original records required before export');}
        $s=json_decode($raw,true,128,JSON_THROW_ON_ERROR);$c=json_decode($planRaw,true,64,JSON_THROW_ON_ERROR);$tables=is_array($s['database']??null)?array_keys($s['database']):array();sort($tables);
        if(!is_array($s)||($s['schemaVersion']??null)!==1||($s['scope']??null)!=='staging-protected-original-state'||($s['helperSha256']??null)!==$this->helperSha||($s['identity']['home']??null)!=='https://krawlthroughkrakow.com/staging/'||($s['identity']['siteurl']??null)!=='https://krawlthroughkrakow.com/staging/'||($s['identity']['blogPublic']??null)!==0||$tables!==array('options','postmeta','posts','term_relationships','term_taxonomy','termmeta','terms')||($s['databaseWrites']??null)!==0||($s['applicationWrites']??null)!==0||($s['cachePurges']??null)!==0||self::canonical($s['ownedContentFiles']??null)!==self::canonical($this->plan['expected'])){throw new RuntimeException('Exact complete original staging snapshot required');}
        $db=hash('sha256',self::json($s['database']));$protected=hash('sha256',self::json(array('identity'=>$s['identity'],'databaseSha256'=>$db,'files'=>$s['protectedFiles'])));
        if($db!==($s['databaseSha256']??null)||$protected!==($s['protectedStateSha256']??null)||$protected!==$this->plan['protectedStateSha256']){throw new RuntimeException('Original selected state differs; no restoration or exclusions');}
        $expected=array('schemaVersion'=>1,'mode'=>'private-staging-rehearsal','transactionId'=>$this->plan['transactionId'],'applicationCommit'=>$this->plan['applicationCommit'],'originalStateSha256'=>hash('sha256',$raw),'enginePlan'=>$this->plan);
        if(self::canonical($c)!==self::canonical($expected)){throw new RuntimeException('Original immutable controller plan differs');}
        $members=array();$total=0;
        foreach(array('original-state.json','controller-plan.json') as $name){$row=$store->recordDescriptor($name);$members[$name]=$row;$total+=$row['bytes'];}
        $m=array('schemaVersion'=>1,'scope'=>'full-private-seeds-original-capsule','transactionId'=>$this->plan['transactionId'],'applicationCommit'=>$this->plan['applicationCommit'],'planSha256'=>self::sha($this->plan),'rootBinding'=>$store->rootBinding(),'protectedStateSha256'=>$this->plan['protectedStateSha256'],'members'=>$members,'bytes'=>$total);$m['manifestSha256']=self::sha($m);return $m;
    }
    public function advance(KTK_Content_Update_Private_Store $store,string $fence,?array $archive): array
    {
        if($archive===null){$state=$this->inspect($store);if($state['files']||$state['directories']){throw new RuntimeException('Explicit original archive acknowledgement required for existing payload');}return $state;}
        $keys=array_keys($archive);sort($keys);if($keys!==array('originalArchiveSha256','originalManifestSha256')||!self::digest($archive['originalArchiveSha256'])||!self::digest($archive['originalManifestSha256'])){throw new RuntimeException('Exact independently verified original archive acknowledgement required');}
        return $this->stream->advanceWithControllerFence($store,function($state)use($store,$fence,$archive){
            $m=$this->capsule($store);if(!self::digest($fence)||!hash_equals($state['stateSha256'],$fence)||!hash_equals($m['manifestSha256'],$archive['originalManifestSha256'])){throw new RuntimeException('Original archive or private preparation fence differs');}
        });
    }
}
