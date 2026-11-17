<?php
/** Separate expiring early staging disposal route; no copying, engine or public/database writer. */
if(!defined('ABSPATH')){exit;}
add_action('wp_loaded',static function(){
    $token=$_SERVER['HTTP_X_KTK_FULL_DISPOSAL_TOKEN']??null;
    if(time()>=__KTK_FULL_DISPOSAL_EXPIRES__||!is_string($token)||!hash_equals('__KTK_FULL_DISPOSAL_TOKEN_SHA__',hash('sha256',$token))||($_GET['ktk_full_private_disposal']??null)!=='__KTK_FULL_DISPOSAL_ID__'){ return; }
    nocache_headers();header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);header('X-Robots-Tag: noindex, noarchive',true);
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'||strtolower($_SERVER['HTTP_HOST']??'')!=='krawlthroughkrakow.com'||home_url('/')!=='https://krawlthroughkrakow.com/staging/'||site_url('/')!=='https://krawlthroughkrakow.com/staging/'||(int)get_option('blog_public')!==0){wp_send_json(array('error'=>'private_staging_identity_required'),403);}
    set_error_handler(static function($severity,$message,$file,$line){if(!(error_reporting()&$severity)){return false;}throw new ErrorException('Full private disposal failed',0,$severity);});
    try{
        $raw=file_get_contents('php://input',false,null,0,2049);
        if(basename(__FILE__)!=='__KTK_FULL_DISPOSAL_HELPER__'||PHP_INT_SIZE!==8||!is_string($raw)||strlen($raw)>2048||function_exists('ktk_capture_staging_original_state')||class_exists('KTK_Full_Private_Engine_Disposal',false)){throw new RuntimeException('Exact fresh archived private disposal helper required');}
        define('KTK_STAGING_STATE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);define('KTK_FULL_PRIVATE_ENGINE_DISPOSAL_ALLOWED',true);
        /* __KTK_FULL_DISPOSAL_STATE__ */
        /* __KTK_FULL_DISPOSAL_STORE__ */
        /* __KTK_FULL_DISPOSAL_CONTROLLER__ */
        $config=json_decode(base64_decode('__KTK_FULL_DISPOSAL_PACKET__',true),true,64,JSON_THROW_ON_ERROR);$stage=str_replace('\\','/',rtrim(ABSPATH,'/\\'));$public=str_replace('\\','/',dirname($stage));
        if(str_replace('\\','/',(string)realpath($stage))!==$stage||basename($stage)!=='staging'||basename($public)!=='public_html'||$public!==$config['publicRoot']){throw new RuntimeException('Exact canonical archived private context required');}
        $guard=static function()use($config){$s=ktk_capture_staging_original_state(__FILE__);$a=$config['authority'];$owned=$s['ownedContentFiles'];ksort($owned);if($s['protectedStateSha256']!==$a['plan']['protectedStateSha256']||$owned!==$a['plan']['expected']){throw new RuntimeException('Original selected/public state differs; preserve without restoration');}};
        $controller=new KTK_Full_Private_Engine_Disposal($config,$guard);$value=$controller->run($raw,'POST',$_SERVER['HTTP_HOST'],$token,time());
        $response=array('privateProfile'=>'full-private-engine-disposal-v1','helperSha256'=>hash_file('sha256',__FILE__),'controller'=>$value,'runtime'=>array('phpVersionId'=>PHP_VERSION_ID,'peakAllocatedBytes'=>memory_get_peak_usage(true),'memoryLimit'=>ini_get('memory_limit'),'maxExecutionTime'=>ini_get('max_execution_time')));
    }catch(Throwable $error){restore_error_handler();wp_send_json(array('error'=>'full_private_disposal_failed'),409);}
    restore_error_handler();wp_send_json($response);
},-998);
