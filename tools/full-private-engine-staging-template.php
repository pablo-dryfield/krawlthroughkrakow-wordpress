<?php
/** Explicit expiring full private staging engine fixture. No public application or database writer. */
if (!defined('ABSPATH')) { exit; }
add_action('wp_loaded',static function () {
    $token=$_SERVER['HTTP_X_KTK_FULL_ENGINE_TOKEN']??null;
    if (time()>=__KTK_FULL_ENGINE_EXPIRES__||!is_string($token)||!hash_equals('__KTK_FULL_ENGINE_TOKEN_SHA__',hash('sha256',$token))||($_GET['ktk_full_private_engine']??null)!=='__KTK_FULL_ENGINE_ID__') { return; }
    nocache_headers();header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);header('X-Robots-Tag: noindex, noarchive',true);
    if (($_SERVER['REQUEST_METHOD']??'')!=='POST'||strtolower($_SERVER['HTTP_HOST']??'')!=='krawlthroughkrakow.com'||home_url('/')!=='https://krawlthroughkrakow.com/staging/'||site_url('/')!=='https://krawlthroughkrakow.com/staging/'||(int)get_option('blog_public')!==0) { wp_send_json(array('error'=>'private_staging_identity_required'),403); }
    set_error_handler(static function($severity,$message,$file,$line){if (!(error_reporting()&$severity)) { return false; }throw new ErrorException('Full private engine operation failed',0,$severity);});
    try {
        if (basename(__FILE__)!=='__KTK_FULL_ENGINE_HELPER__'||function_exists('ktk_capture_staging_original_state')||class_exists('KTK_Full_Private_Engine_Controller',false)||class_exists('KTK_Active_Content_Transaction',false)) { throw new RuntimeException('Exact fresh full private staging caller required'); }
        $raw=file_get_contents('php://input',false,null,0,4097);$outer=is_string($raw)?json_decode($raw,true,32,JSON_THROW_ON_ERROR):null;
        if (!is_string($raw)||strlen($raw)>4096||!is_array($outer)||array_keys($outer)!==array('privateProfile','request','originalArchive')||$outer['privateProfile']!=='full-private-engine-v1'||!is_array($outer['request'])||($outer['originalArchive']!==null&&!is_array($outer['originalArchive']))||json_encode($outer,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)!==$raw) { throw new RuntimeException('Exact canonical full private request envelope required'); }
        define('KTK_STAGING_STATE_ALLOWED',true);define('KTK_UPDATE_ENGINE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED',true);define('KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED',true);define('KTK_FULL_PRIVATE_ENGINE_PREPARATION_ALLOWED',true);
        foreach(array('REQUEST','STORE','BACKUP','CONTROLLER') as $part){define('KTK_CONTENT_UPDATE_'.$part.'_ALLOWED',true);}
        /* __KTK_FULL_ENGINE_STATE__ */
        /* __KTK_FULL_ENGINE_REQUEST__ */
        /* __KTK_FULL_ENGINE_STORE__ */
        /* __KTK_FULL_ENGINE_BACKUP__ */
        /* __KTK_FULL_ENGINE_ENGINE__ */
        /* __KTK_FULL_ENGINE_STREAM__ */
        /* __KTK_FULL_ENGINE_PREPARATION__ */
        /* __KTK_FULL_ENGINE_CONTROLLER__ */
        $packet=json_decode(base64_decode('__KTK_FULL_ENGINE_PACKET__',true),true,64,JSON_THROW_ON_ERROR);$seeds=json_decode(base64_decode('__KTK_FULL_ENGINE_SEEDS__',true),true,64,JSON_THROW_ON_ERROR);
        if(!is_array($packet)||!is_array($seeds)||$packet['mode']!=='private-staging-rehearsal'){throw new RuntimeException('Compiled private-only engine packet required');}
        $stage=str_replace('\\','/',rtrim(ABSPATH,'/\\'));$packet['publicRoot']=str_replace('\\','/',dirname($stage));$packet['helperPath']=str_replace('\\','/',__FILE__);$packet['helperSha256']=hash_file('sha256',__FILE__);
        if(str_replace('\\','/',(string)realpath($stage))!==$stage||basename($stage)!=='staging'||basename($packet['publicRoot'])!=='public_html'){throw new RuntimeException('Canonical staging private context required');}
        $capture=static fn()=>ktk_capture_staging_original_state(__FILE__);
        $guard=static function()use($capture,$packet){$s=$capture();$owned=$s['ownedContentFiles'];ksort($owned);if($s['protectedStateSha256']!==$packet['plan']['protectedStateSha256']||hash('sha256',json_encode($owned,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR))!==$packet['publicOwnedSha256']){throw new RuntimeException('Original selected/public state differs; no restoration');}return $s['protectedStateSha256'];};
        $prefix='__KTK_FULL_ENGINE_PREFIX_PATH__';$engineFault='__KTK_FULL_ENGINE_FAULT_PATH__';
        $streamObserver=static function($event,$name,$path)use($prefix){if($prefix!==''&&$event==='after-stream-chunk'&&$name==='source/'.$prefix){clearstatcache(true,$path);if(filesize($path)===65536){exit;}}};
        $engineObserver=static function($event,$name)use($engineFault){if($engineFault!==''&&$event==='after-rename'&&$name===$engineFault){exit;}};
        $preparation=new KTK_Full_Private_Engine_Preparation($packet['publicRoot'],$packet['plan'],$seeds['sizes'],$seeds['overrides'],$packet['ownershipKey'],$packet['helperSha256'],$guard,$streamObserver);
        $initialize=static fn($private,$store)=>$preparation->initialize($private,$store);$inspect=static fn($store)=>$preparation->inspect($store);$complete=static fn($store,$fence)=>$preparation->advance($store,$fence,$outer['originalArchive']);
        $controller=new KTK_Full_Private_Engine_Controller($packet,$capture,$capture,$initialize,$engineObserver,$inspect,$complete);
        $request=$outer['request'];$inner=json_encode($request,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        if(($request['action']??null)==='private-roots'){
            $plan=$packet['plan'];$canonical=$plan;foreach(array('expected','prior') as $kind){ksort($canonical[$kind]);}ksort($canonical);$planSha=hash('sha256',json_encode($canonical,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
            $expected=array('schemaVersion'=>1,'action'=>'private-roots','transactionId'=>$plan['transactionId'],'applicationCommit'=>$plan['applicationCommit'],'planSha256'=>$planSha);
            if($request!==$expected||$outer['originalArchive']!==null){throw new RuntimeException('Exact archived terminal root-context request required');}
            $store=new KTK_Content_Update_Private_Store(dirname($packet['publicRoot']).'/.ktk-content-update-'.$plan['transactionId'],$packet['publicRoot'],$plan['transactionId'],$packet['ownershipKey']);$closed=json_decode($store->read('closed.json')??'null',true,32,JSON_THROW_ON_ERROR);
            if(!is_array($closed)||($closed['schemaVersion']??null)!==1||($closed['mode']??null)!=='private-staging-rehearsal'||($closed['transactionId']??null)!==$plan['transactionId']||($closed['applicationCommit']??null)!==$plan['applicationCommit']||($closed['planSha256']??null)!==$planSha||($closed['terminalPhase']??null)!=='rolled-back'||($closed['payloadRetained']??null)!==true){throw new RuntimeException('Signed rolled-back closure required before private root exchange');}
            $guard();$response=array('privateProfile'=>'full-private-engine-v1','helperSha256'=>$packet['helperSha256'],'privateRoots'=>array('publicRoot'=>$packet['publicRoot'],'privateRoot'=>$store->privateRoot(),'rootBinding'=>$store->rootBinding()));
        }elseif(($request['action']??null)==='original'){
            $plan=$packet['plan'];$canonical=$plan;foreach(array('expected','prior') as $kind){ksort($canonical[$kind]);}ksort($canonical);
            $expected=array('schemaVersion'=>1,'action'=>'original','transactionId'=>$plan['transactionId'],'applicationCommit'=>$plan['applicationCommit'],'planSha256'=>hash('sha256',json_encode($canonical,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)));
            if($request!==$expected||$outer['originalArchive']!==null){throw new RuntimeException('Exact read-only original capsule request required');}
            $check=$request;$check['action']='inspect-preparation';$controller->run(json_encode($check,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),'POST',$_SERVER['HTTP_HOST'],$token,time());
            $store=new KTK_Content_Update_Private_Store(dirname($packet['publicRoot']).'/.ktk-content-update-'.$plan['transactionId'],$packet['publicRoot'],$plan['transactionId'],$packet['ownershipKey']);$response=array('privateProfile'=>'full-private-engine-v1','helperSha256'=>$packet['helperSha256'],'originalCapsule'=>$preparation->capsule($store));
        }else{
            $result=$controller->run($inner,'POST',$_SERVER['HTTP_HOST'],$token,time());$response=array('privateProfile'=>'full-private-engine-v1','helperSha256'=>$packet['helperSha256'],'controller'=>$result);
        }
        header('X-KTK-PHP-Version: '.PHP_VERSION_ID);header('X-KTK-Peak-Allocated: '.memory_get_peak_usage(true));header('X-KTK-Memory-Limit: '.ini_get('memory_limit'));header('X-KTK-Execution-Limit: '.ini_get('max_execution_time'));
    }catch(Throwable $error){restore_error_handler();wp_send_json(array('error'=>'full_private_engine_operation_failed'),409);}
    restore_error_handler();wp_send_json($response);
},-998);
