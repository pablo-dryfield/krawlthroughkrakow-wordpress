<?php
/** Authenticated read-only staging capacity census. No payload copy, private allocation, database write or purge. */
if (!defined('ABSPATH')) { exit; }
add_action('wp_loaded', static function () {
    $token=$_SERVER['HTTP_X_KTK_SNAPSHOT_TOKEN']??null;
    if(time()>=__KTK_CAPACITY_EXPIRES__||!is_string($token)||!hash_equals('__KTK_CAPACITY_TOKEN_SHA__',hash('sha256',$token))){return;}
    nocache_headers();header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);header('X-Robots-Tag: noindex, noarchive',true);
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'||strtolower($_SERVER['HTTP_HOST']??'')!=='krawlthroughkrakow.com'||home_url('/')!=='https://krawlthroughkrakow.com/staging/'||site_url('/')!=='https://krawlthroughkrakow.com/staging/'||(int)get_option('blog_public')!==0){wp_send_json(array('error'=>'staging_identity_required'),403);}
    set_error_handler(static function($severity,$message,$file,$line){if(!(error_reporting()&$severity)){return false;}throw new ErrorException('Private capacity read failed',0,$severity);});
    try{
        if(basename(__FILE__)!=='__KTK_CAPACITY_HELPER__'||function_exists('ktk_capture_staging_original_state')||PHP_INT_SIZE!==8||file_get_contents('php://input',false,null,0,3)!=='{}'){throw new RuntimeException('Exact read-only staging caller required');}
        define('KTK_STAGING_STATE_ALLOWED',true);
        /* __KTK_CAPACITY_STATE_CORE__ */
        $owned=json_decode(base64_decode('__KTK_CAPACITY_OWNED__',true),true,32,JSON_THROW_ON_ERROR);
        $sizes=json_decode(base64_decode('__KTK_CAPACITY_SIZES__',true),true,32,JSON_THROW_ON_ERROR);
        $start=hrtime(true);if(!is_int($start)||$start<0){throw new RuntimeException('Monotonic 64-bit clock required');}
        $first=ktk_capture_staging_original_state(__FILE__);$firstNs=hrtime(true)-$start;
        if($first['ownedContentFiles']!==$owned||$first['protectedStateSha256']!=='__KTK_CAPACITY_PROTECTED__'){throw new RuntimeException('Reviewed public/protected state differs');}
        $stage=str_replace('\\','/',rtrim(ABSPATH,'/\\'));$mu=$stage.'/wp-content/mu-plugins';$parent=str_replace('\\','/',dirname(dirname($stage)));
        if(str_replace('\\','/',(string)realpath($parent))!==$parent||!is_dir($parent)){throw new RuntimeException('Canonical existing private parent required');}
        for($p=$parent;;$p=dirname($p)){if(is_link($p)){throw new RuntimeException('Private parent alias refused');}if(dirname($p)===$p){break;}}
        $actualSizes=array();$largest=array();$bytes=0;
        foreach($owned as $name=>$digest){$path=$mu.'/'.$name;clearstatcache(true,$path);$size=filesize($path);if(is_link($path)||!is_file($path)||!is_int($size)||$size<0){throw new RuntimeException('Exact public file size required');}$actualSizes[$name]=$size;$bytes+=$size;$largest[]=array('path'=>$name,'bytes'=>$size);}
        if($actualSizes!==$sizes){throw new RuntimeException('Public sizes differ from the reviewed build');}
        usort($largest,static fn($a,$b)=>($b['bytes']<=>$a['bytes'])?:strcmp($a['path'],$b['path']));$largest=array_slice($largest,0,3);
        $available=disk_free_space($parent);$total=disk_total_space($parent);
        if(!is_float($available)||!is_float($total)||!is_finite($available)||!is_finite($total)||$available<0||$total<=0||$available>$total||$total>PHP_INT_MAX){throw new RuntimeException('Valid filesystem capacity figures required');}
        $start=hrtime(true);$second=ktk_capture_staging_original_state(__FILE__);$secondNs=hrtime(true)-$start;
        foreach(array('identity','database','databaseSha256','protectedFiles','ownedContentFiles','protectedStateSha256','rowCounts') as $key){if($first[$key]!==$second[$key]){throw new RuntimeException('Protected/public state changed during read-only census');}}
        $memory=ini_get('memory_limit');$execution=ini_get('max_execution_time');if(!is_string($memory)||!is_string($execution)||$firstNs<0||$secondNs<0){throw new RuntimeException('Exact runtime observations required');}
        $response=array('schemaVersion'=>1,'scope'=>'staging-full-inventory-capacity','helperSha256'=>hash_file('sha256',__FILE__),'identity'=>$first['identity'],'databaseSha256'=>$first['databaseSha256'],'protectedStateSha256'=>$first['protectedStateSha256'],'rowCounts'=>$first['rowCounts'],'protectedFileCount'=>count($first['protectedFiles']),
            'inventory'=>array('files'=>count($owned),'bytes'=>$bytes,'ownedMapSha256'=>hash('sha256',json_encode($owned,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)),'sizeMapSha256'=>hash('sha256',json_encode($sizes,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)),'largestFiles'=>$largest,'twoUnmodifiedCopiesBytes'=>$bytes*2),
            'filesystem'=>array('availableBytes'=>(int)$available,'totalBytes'=>(int)$total,'privateParentWritable'=>is_writable($parent),'quotaVerified'=>false),
            'runtime'=>array('phpVersionId'=>PHP_VERSION_ID,'phpIntBytes'=>PHP_INT_SIZE,'sapi'=>PHP_SAPI,'memoryLimit'=>$memory,'maxExecutionTime'=>$execution,'peakAllocatedBytes'=>memory_get_peak_usage(true),'captureNanoseconds'=>array($firstNs,$secondNs)),
            'twoCapturesExact'=>true,'fullHostAcceptance'=>false,'privateAllocationBytes'=>0,'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0);
    }catch(Throwable $error){restore_error_handler();wp_send_json(array('error'=>'read_only_capacity_failed'),409);}
    restore_error_handler();wp_send_json($response);
},-998);
