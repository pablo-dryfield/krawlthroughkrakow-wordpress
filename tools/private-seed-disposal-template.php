<?php
/** Separate expiring staging-only disposal helper; no copy, transaction, public or database writer. */
if(!defined('ABSPATH')){exit;}
add_action('wp_loaded',static function(){
    $token=$_SERVER['HTTP_X_KTK_DISPOSAL_TOKEN']??null;
    if(time()>=__KTK_DISPOSAL_EXPIRES__||!is_string($token)||!hash_equals('__KTK_DISPOSAL_TOKEN_SHA__',hash('sha256',$token))){return;}
    nocache_headers();header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);header('X-Robots-Tag: noindex, noarchive',true);
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'||strtolower($_SERVER['HTTP_HOST']??'')!=='krawlthroughkrakow.com'||home_url('/')!=='https://krawlthroughkrakow.com/staging/'||site_url('/')!=='https://krawlthroughkrakow.com/staging/'||(int)get_option('blog_public')!==0){wp_send_json(array('error'=>'staging_identity_required'),403);}
    set_error_handler(static function($severity,$message,$file,$line){if(!(error_reporting()&$severity)){return false;}throw new ErrorException('Private disposal failed',0,$severity);});
    try{
        $raw=file_get_contents('php://input',false,null,0,2049);
        if(basename(__FILE__)!=='__KTK_DISPOSAL_HELPER__'||PHP_INT_SIZE!==8||!is_string($raw)||strlen($raw)>2048||function_exists('ktk_capture_staging_original_state')||class_exists('KTK_Private_Seed_Disposal',false)){throw new RuntimeException('Exact fresh private disposal helper required');}
        define('KTK_STAGING_STATE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED',true);define('KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED',true);define('KTK_PRIVATE_SEED_DISPOSAL_ALLOWED',true);
        /* __KTK_DISPOSAL_STATE__ */
        /* __KTK_DISPOSAL_STORE__ */
        /* __KTK_DISPOSAL_STREAM__ */
        /* __KTK_DISPOSAL_CONTROLLER__ */
        $config=json_decode(base64_decode('__KTK_DISPOSAL_PACKET__',true),true,64,JSON_THROW_ON_ERROR);$stage=str_replace('\\','/',rtrim(ABSPATH,'/\\'));$config['publicRoot']=str_replace('\\','/',dirname($stage));$config['helperPath']=str_replace('\\','/',__FILE__);$config['helperSha256']=hash_file('sha256',__FILE__);
        if(str_replace('\\','/',(string)realpath($stage))!==$stage||basename($stage)!=='staging'||basename($config['publicRoot'])!=='public_html'){throw new RuntimeException('Canonical staging disposal path required');}
        $controller=new KTK_Private_Seed_Disposal($config,static fn()=>ktk_capture_staging_original_state(__FILE__));$value=$controller->run($raw,'POST',$_SERVER['HTTP_HOST'],$token,time());
        $response=array('helperSha256'=>$config['helperSha256'],'controller'=>$value,'runtime'=>array('phpVersionId'=>PHP_VERSION_ID,'peakAllocatedBytes'=>memory_get_peak_usage(true),'memoryLimit'=>ini_get('memory_limit'),'maxExecutionTime'=>ini_get('max_execution_time')));
    }catch(Throwable $error){restore_error_handler();wp_send_json(array('error'=>'private_disposal_failed'),409);}
    restore_error_handler();wp_send_json($response);
},-998);
