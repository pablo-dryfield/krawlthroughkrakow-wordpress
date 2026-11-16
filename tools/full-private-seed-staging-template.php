<?php
/** Expiring staging-only full private copy rehearsal. No public application/database write or production mode. */
if (!defined('ABSPATH')) { exit; }
add_action('wp_loaded',static function () {
    $token=$_SERVER['HTTP_X_KTK_FULL_SEED_TOKEN']??null;
    if (time()>=__KTK_FULL_SEED_EXPIRES__||!is_string($token)||!hash_equals('__KTK_FULL_SEED_TOKEN_SHA__',hash('sha256',$token))) { return; }
    nocache_headers();header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);header('X-Robots-Tag: noindex, noarchive',true);
    if (($_SERVER['REQUEST_METHOD']??'')!=='POST'||strtolower($_SERVER['HTTP_HOST']??'')!=='krawlthroughkrakow.com'||home_url('/')!=='https://krawlthroughkrakow.com/staging/'||site_url('/')!=='https://krawlthroughkrakow.com/staging/'||(int)get_option('blog_public')!==0) { wp_send_json(array('error'=>'staging_identity_required'),403); }
    set_error_handler(static function($severity,$message,$file,$line){if (!(error_reporting()&$severity)) { return false; }throw new ErrorException('Private full seed operation failed',0,$severity);});
    try {
        $raw=file_get_contents('php://input',false,null,0,2049);
        if (basename(__FILE__)!=='__KTK_FULL_SEED_HELPER__'||PHP_INT_SIZE!==8||!is_string($raw)||strlen($raw)>2048||function_exists('ktk_capture_staging_original_state')||class_exists('KTK_Full_Private_Seed_Rehearsal',false)) { throw new RuntimeException('Exact full private staging caller required'); }
        define('KTK_STAGING_STATE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED',true);define('KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED',true);define('KTK_FULL_PRIVATE_SEED_REHEARSAL_ALLOWED',true);
        /* __KTK_FULL_SEED_STATE__ */
        /* __KTK_FULL_SEED_STORE__ */
        /* __KTK_FULL_SEED_STREAM__ */
        /* __KTK_FULL_SEED_CONTROLLER__ */
        $packet=json_decode(base64_decode('__KTK_FULL_SEED_PACKET__',true),true,64,JSON_THROW_ON_ERROR);
        $stage=str_replace('\\','/',rtrim(ABSPATH,'/\\'));$packet['publicRoot']=str_replace('\\','/',dirname($stage));$packet['helperPath']=str_replace('\\','/',__FILE__);$packet['helperSha256']=hash_file('sha256',__FILE__);
        if (str_replace('\\','/',(string)realpath($stage))!==$stage||basename($stage)!=='staging'||basename($packet['publicRoot'])!=='public_html') { throw new RuntimeException('Canonical staging filesystem required'); }
        $faultPath='__KTK_FULL_SEED_FAULT_PATH__';$observer=static function($event,$name,$path)use($faultPath){
            if ($faultPath!==''&&$event==='after-stream-chunk'&&$name==='source/'.$faultPath) { clearstatcache(true,$path);if (filesize($path)===65536) { exit; } }
        };
        $controller=new KTK_Full_Private_Seed_Rehearsal($packet,static fn()=>ktk_capture_staging_original_state(__FILE__),$observer);
        $value=$controller->run($raw,'POST',$_SERVER['HTTP_HOST'],$token,time());
        $response=array('helperSha256'=>$packet['helperSha256'],'controller'=>$value,'runtime'=>array('phpVersionId'=>PHP_VERSION_ID,'peakAllocatedBytes'=>memory_get_peak_usage(true),'memoryLimit'=>ini_get('memory_limit'),'maxExecutionTime'=>ini_get('max_execution_time')));
    } catch (Throwable $error) { restore_error_handler();wp_send_json(array('error'=>'full_private_seed_operation_failed'),409); }
    restore_error_handler();wp_send_json($response);
},-998);
