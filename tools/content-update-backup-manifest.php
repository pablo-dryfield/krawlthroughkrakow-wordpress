<?php
/** Metadata-only private rollback manifest. No hook, archive, application/database write or authorization. */
if (!defined('KTK_CONTENT_UPDATE_BACKUP_ALLOWED') || KTK_CONTENT_UPDATE_BACKUP_ALLOWED !== true) {
    throw new RuntimeException('Explicit private backup manifest caller required');
}

final class KTK_Content_Update_Backup_Manifest
{
    private const ACTIVATION='ktk-code-pages-production.php';
    private const ACTIVATION_SHA='b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833';
    private static function encode($value): string { return json_encode($value,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function canonical($value) {
        if (!is_array($value)) { return $value; }
        if (!array_is_list($value)) { ksort($value); }
        foreach ($value as $key=>$part) { $value[$key]=self::canonical($part); }return $value;
    }
    private static function digest($value): bool { return is_string($value)&&preg_match('/^[a-f0-9]{64}$/D',$value)===1; }
    private static function name($name,bool $activation=false): void
    {
        if (!is_string($name)||!preg_match('/^[A-Za-z0-9._\/-]+$/D',$name)||array_intersect(explode('/',$name),array('','.','..'))||
            !($name==='ktk-code-pages.php'||str_starts_with($name,'ktk-code-pages-assets/')||($activation&&$name===self::ACTIVATION))) { throw new RuntimeException('Exact code-page backup member required'); }
    }
    private static function directory(string $path): string
    {
        $real=realpath($path);if ($real===false||!is_dir($real)) { throw new RuntimeException('Private prior directory missing'); }
        for ($p=$path;;$p=dirname($p)) { if (is_link($p)) { throw new RuntimeException('Private prior symlink refused'); }if(dirname($p)===$p){break;} }
        if (str_replace('\\','/',$real)!==$path) { throw new RuntimeException('Canonical private prior directory required'); }return $path;
    }
    public static function build(KTK_Content_Update_Private_Store $store,array $plan): array
    {
        if (!defined('KTK_CONTENT_UPDATE_BACKUP_ALLOWED')||KTK_CONTENT_UPDATE_BACKUP_ALLOWED!==true) { throw new RuntimeException('Explicit private backup manifest caller required'); }
        $keys=array_keys($plan);sort($keys);
        if ($keys!==array('applicationCommit','expected','prior','protectedStateSha256','transactionId')||($plan['transactionId']??null)!==$store->transactionId()||
            !is_string($plan['applicationCommit'])||!preg_match('/^[a-f0-9]{40}$/D',$plan['applicationCommit'])||!self::digest($plan['protectedStateSha256'])||!is_array($plan['expected'])||!is_array($plan['prior'])) { throw new RuntimeException('Exact immutable backup plan required'); }
        foreach(array('expected','prior') as $kind){$seen=array();foreach($plan[$kind] as $name=>$hash){self::name($name,$kind==='prior');if(!self::digest($hash)||isset($seen[strtolower($name)])){throw new RuntimeException('Exact unambiguous backup checksum required');}$seen[strtolower($name)]=true;}}
        if (($plan['prior'][self::ACTIVATION]??null)!==self::ACTIVATION_SHA||isset($plan['expected'][self::ACTIVATION])||array_diff_key($plan['prior'],$plan['expected'],array(self::ACTIVATION=>true))) { throw new RuntimeException('Immutable existing activation and reviewed prior inventory required'); }
        foreach(array('ktk-code-pages.php','ktk-code-pages-assets/registry.php','ktk-code-pages-assets/runtime.css','ktk-code-pages-assets/runtime.js') as $name){if(!isset($plan['expected'][$name],$plan['prior'][$name])){throw new RuntimeException('Complete active code-page plan required');}}
        $raw=$store->read('original-state.json');$controlRaw=$store->read('controller-plan.json');
        if ($raw===null||$controlRaw===null) { throw new RuntimeException('Private original state and controller plan required before export'); }
        try {$state=json_decode($raw,true,64,JSON_THROW_ON_ERROR);$control=json_decode($controlRaw,true,64,JSON_THROW_ON_ERROR);}catch(Throwable $error){throw new RuntimeException('Private snapshot/plan format invalid');}
        if (!is_array($state)||!is_array($control)||($state['schemaVersion']??null)!==1||!in_array($state['scope']??null,array('production-protected-original-state','staging-protected-original-state'),true)||
            ($state['ownedInventoryIncluded']??true)!==true||!is_array($state['ownedContentFiles']??null)||count($state['ownedContentFiles'])<2||
            ($state['databaseWrites']??null)!==0||($state['applicationWrites']??null)!==0||($state['cachePurges']??null)!==0||
            !is_array($state['database']??null)||!is_array($state['protectedFiles']??null)||!is_array($state['identity']??null)) { throw new RuntimeException('Full original snapshot required; fingerprint cannot be a backup'); }
        $databaseKeys=array_keys($state['database']);sort($databaseKeys);
        if ($databaseKeys!==array('options','postmeta','posts','term_relationships','term_taxonomy','termmeta','terms')||
            hash('sha256',self::encode($state['database']))!==($state['databaseSha256']??null)||
            hash('sha256',self::encode(array('identity'=>$state['identity'],'databaseSha256'=>$state['databaseSha256'],'files'=>$state['protectedFiles'])))!==($state['protectedStateSha256']??null)||
            $state['protectedStateSha256']!==$plan['protectedStateSha256']) { throw new RuntimeException('Original selected-state hashes differ'); }
        $mode=$state['scope']==='production-protected-original-state'?'production':'private-staging-rehearsal';$home=$mode==='production'?'https://krawlthroughkrakow.com/':'https://krawlthroughkrakow.com/staging/';
        if (($state['identity']['home']??null)!==$home||($state['identity']['siteurl']??null)!==$home||($state['identity']['blogPublic']??null)!==($mode==='production'?1:0)||
            ($control['schemaVersion']??null)!==1||($control['mode']??null)!==$mode||($control['transactionId']??null)!==$plan['transactionId']||($control['applicationCommit']??null)!==$plan['applicationCommit']||
            ($control['originalStateSha256']??null)!==hash('sha256',$raw)||self::canonical($control['enginePlan']??null)!==self::canonical($plan)) { throw new RuntimeException('Private snapshot context or controller plan differs'); }
        if($mode==='production'){$ownedPrior=$plan['prior'];unset($ownedPrior[self::ACTIVATION]);if(self::canonical($state['ownedContentFiles'])!==self::canonical($ownedPrior)||($state['protectedFiles']['mu/'.self::ACTIVATION]??null)!==self::ACTIVATION_SHA){throw new RuntimeException('Original complete production-owned inventory differs from target prior state');}}
        $required=array(self::ACTIVATION=>self::ACTIVATION_SHA,'ktk-code-pages.php'=>$plan['prior']['ktk-code-pages.php'],'ktk-code-pages-assets/registry.php'=>$plan['prior']['ktk-code-pages-assets/registry.php']);
        foreach($plan['expected'] as $name=>$hash){if(isset($plan['prior'][$name])&&$plan['prior'][$name]!==$hash){$required[$name]=$plan['prior'][$name];}}ksort($required);
        $prior=self::directory($store->privateRoot().'/engine/'.$plan['transactionId'].'/prior');$directories=array();
        foreach(array_keys($required) as $name){for($dir=dirname($name);$dir!=='.';$dir=dirname($dir)){$directories[$dir]=true;}}
        $actual=array();$seenDirs=array();$iterator=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($prior,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST);
        foreach($iterator as $entry){if($entry->isLink()){throw new RuntimeException('Private prior symlink refused');}$name=str_replace('\\','/',substr($entry->getPathname(),strlen($prior)+1));if($entry->isDir()){$seenDirs[$name]=true;continue;}if(!$entry->isFile()){throw new RuntimeException('Unexpected private prior member');}$actual[$name]=hash_file('sha256',$entry->getPathname());}
        ksort($actual);ksort($seenDirs);ksort($directories);if($actual!==$required||$seenDirs!==$directories){throw new RuntimeException('Unknown or changed private prior member preserved');}
        $members=array('records/original-state.json'=>$store->recordDescriptor('original-state.json'),'records/controller-plan.json'=>$store->recordDescriptor('controller-plan.json'));$total=0;
        foreach($required as $name=>$hash){$path=$prior.'/'.$name;$bytes=filesize($path);if($bytes===false||$bytes>16777216){throw new RuntimeException('Private prior member exceeds export budget');}$members['prior/'.$name]=array('source'=>'engine/'.$plan['transactionId'].'/prior/'.$name,'sha256'=>$hash,'bytes'=>$bytes);}
        ksort($members);foreach($members as $row){$total+=$row['bytes'];}if($total>134217728){throw new RuntimeException('Private backup export budget exceeded');}
        $manifest=array('schemaVersion'=>1,'scope'=>'code-pages-private-rollback-manifest','mode'=>$mode,'transactionId'=>$plan['transactionId'],'applicationCommit'=>$plan['applicationCommit'],'rootBinding'=>$store->rootBinding(),'enginePlanSha256'=>hash('sha256',self::encode(self::canonical($plan))),'originalStateSha256'=>hash('sha256',$raw),'protectedStateSha256'=>$plan['protectedStateSha256'],'members'=>$members,'bytes'=>$total,'activationWrites'=>0,'databaseWrites'=>0,'applicationWrites'=>0,'cachePurges'=>0);
        $manifest['manifestSha256']=hash('sha256',self::encode(self::canonical($manifest)));return $manifest;
    }
}
