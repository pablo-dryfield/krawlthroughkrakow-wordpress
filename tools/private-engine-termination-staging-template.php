<?php
/** Distinct expiring private termination caller. No original authority renewal or public writer. */
if (!defined('ABSPATH')) { exit; }
add_action('wp_loaded',static function () {
    $token=$_SERVER['HTTP_X_KTK_PRIVATE_TERMINATION_TOKEN']??null;
    if(time()>=__KTK_PRIVATE_TERMINATION_EXPIRES__||!is_string($token)||!hash_equals('__KTK_PRIVATE_TERMINATION_TOKEN_SHA__',hash('sha256',$token))||($_GET['ktk_private_engine_termination']??null)!=='__KTK_PRIVATE_TERMINATION_ID__') { return; }
    nocache_headers();header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);header('X-Robots-Tag: noindex, noarchive',true);
    if(!function_exists('wp_json_encode')){http_response_code(409);header('Content-Type: application/json; charset=UTF-8',true);echo '{"error":"private_termination_encoding_unavailable"}';exit;}
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'||strtolower($_SERVER['HTTP_HOST']??'')!=='krawlthroughkrakow.com'||home_url('/')!=='https://krawlthroughkrakow.com/staging/'||site_url('/')!=='https://krawlthroughkrakow.com/staging/'||(int)get_option('blog_public')!==0){wp_send_json(array('error'=>'private_staging_identity_required'),403);}
    set_error_handler(static function($severity,$message,$file,$line){if(!(error_reporting()&$severity)){return false;}throw new ErrorException('Private termination operation failed',0,$severity);});
    try{
        if(basename(__FILE__)!=='__KTK_PRIVATE_TERMINATION_HELPER__'||PHP_INT_SIZE!==8||function_exists('ktk_capture_staging_original_state')){throw new RuntimeException('Exact fresh private termination caller required');}
        foreach(array('KTK_Content_Update_Private_Store','KTK_Read_Only_Private_Engine','KTK_Active_Content_Transaction','KTK_Full_Private_Engine_Controller','KTK_Full_Private_Engine_Preparation','KTK_Private_Engine_Abandonment_Inspection','KTK_Private_Engine_Fenced_Inspection','KTK_Private_Engine_Termination_Claim','KTK_Private_Engine_Cleanup_Budget','KTK_Private_Engine_Payload_Cleanup','KTK_Private_Engine_Termination') as $class){if(class_exists($class,false)){throw new RuntimeException('Private component already loaded; preserve state');}}
        $raw=file_get_contents('php://input',false,null,0,2049);
        if(!is_string($raw)||strlen($raw)>2048){throw new RuntimeException('Bounded canonical private termination request required');}
        $request=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
        if(!is_array($request)||json_encode($request,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)!==$raw){throw new RuntimeException('Canonical private termination request required');}
        $config=json_decode(base64_decode('__KTK_PRIVATE_TERMINATION_CONFIG__',true),true,64,JSON_THROW_ON_ERROR);
        $stage=str_replace('\\','/',rtrim(ABSPATH,'/\\'));$public=str_replace('\\','/',dirname($stage));
        if(str_replace('\\','/',(string)realpath($stage))!==$stage||basename($stage)!=='staging'||basename($public)!=='public_html'||str_replace('\\','/',dirname(__FILE__))!==$stage.'/wp-content/mu-plugins'){throw new RuntimeException('Canonical staging private caller required');}
        if($config['initial']['publicRoot']!==null&&$config['initial']['publicRoot']!==$public){throw new RuntimeException('Archived public root differs; preserve state');}
        $config['initial']['publicRoot']=$public;
        if($config['fenced']!==null){if($config['fenced']['publicRoot']!==null&&$config['fenced']['publicRoot']!==$public){throw new RuntimeException('Fenced public root differs; preserve state');}$config['fenced']['publicRoot']=$public;}
        foreach(array('KTK_STAGING_STATE_ALLOWED','KTK_CONTENT_UPDATE_STORE_ALLOWED','KTK_UPDATE_ENGINE_ALLOWED','KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED','KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED','KTK_FULL_PRIVATE_ENGINE_PREPARATION_ALLOWED','KTK_PRIVATE_ENGINE_ABANDONMENT_INSPECTION_ALLOWED','KTK_PRIVATE_ENGINE_FENCED_INSPECTION_ALLOWED','KTK_PRIVATE_ENGINE_TERMINATION_CLAIM_ALLOWED','KTK_PRIVATE_ENGINE_PAYLOAD_CLEANUP_ALLOWED','KTK_PRIVATE_ENGINE_TERMINATION_ALLOWED') as $flag){if(defined($flag)){throw new RuntimeException('Private caller flag already defined');}define($flag,true);}
        /* __KTK_PRIVATE_TERMINATION_STATE__ */
        /* __KTK_PRIVATE_TERMINATION_STORE__ */
        /* __KTK_PRIVATE_TERMINATION_ENGINE__ */
        /* __KTK_PRIVATE_TERMINATION_STREAM__ */
        /* __KTK_PRIVATE_TERMINATION_PREPARATION__ */
        /* __KTK_PRIVATE_TERMINATION_ARTIFACTS__ */
        /* __KTK_PRIVATE_TERMINATION_INITIAL__ */
        /* __KTK_PRIVATE_TERMINATION_FENCED__ */
        /* __KTK_PRIVATE_TERMINATION_CLAIM__ */
        /* __KTK_PRIVATE_TERMINATION_PAYLOAD__ */
        /* __KTK_PRIVATE_TERMINATION_CONTROLLER__ */
        $capture=static function(){$snapshot=ktk_capture_staging_original_state(__FILE__);return array('ownedContentFiles'=>$snapshot['ownedContentFiles'],'protectedStateSha256'=>$snapshot['protectedStateSha256']);};
        $controller=new KTK_Private_Engine_Termination($config,$capture);
        $result=$controller->run($raw,'POST',$_SERVER['HTTP_HOST'],$token,time());
        $response=array('privateProfile'=>'current-witness-private-engine-termination-v1','helperSha256'=>hash_file('sha256',__FILE__),'controller'=>$result,'runtime'=>array('phpVersionId'=>PHP_VERSION_ID,'peakAllocatedBytes'=>memory_get_peak_usage(true),'memoryLimit'=>ini_get('memory_limit'),'maxExecutionTime'=>ini_get('max_execution_time'),'isMultisite'=>is_multisite(),'phases'=>array('muplugins_loaded'=>did_action('muplugins_loaded'),'plugins_loaded'=>did_action('plugins_loaded'),'wp_loaded'=>did_action('wp_loaded'))));
        $encoded=wp_json_encode($response);
        if(!is_string($encoded)||strlen($encoded)>2097152||time()>=$config['authority']['expires']){throw new RuntimeException('Bounded current encoded termination reply required; preserve consumed context');}
        header('X-KTK-PHP-Version: '.PHP_VERSION_ID);header('X-KTK-Peak-Allocated: '.memory_get_peak_usage(true));header('X-KTK-Memory-Limit: '.ini_get('memory_limit'));header('X-KTK-Execution-Limit: '.ini_get('max_execution_time'));
    }catch(Throwable $error){restore_error_handler();wp_send_json(array('error'=>'private_termination_operation_failed'),409);}
    restore_error_handler();wp_send_json($response);
},-998);
