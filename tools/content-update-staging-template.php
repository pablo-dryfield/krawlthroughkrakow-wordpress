<?php
/** Expiring private staging fixture only. No production mode or public application/database writes. */
if (!defined('ABSPATH')) { exit; }
add_action('wp_loaded',static function(){
    $token=$_SERVER['HTTP_X_KTK_CONTENT_UPDATE_TOKEN']??null;$expires=__KTK_CONTROLLER_EXPIRES__;
    if(time()>=$expires||!is_string($token)||!hash_equals('__KTK_CONTROLLER_TOKEN_SHA__',hash('sha256',$token))){return;}
    nocache_headers();header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);header('X-Robots-Tag: noindex, noarchive',true);
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'||strtolower($_SERVER['HTTP_HOST']??'')!=='krawlthroughkrakow.com'||home_url('/')!=='https://krawlthroughkrakow.com/staging/'||site_url('/')!=='https://krawlthroughkrakow.com/staging/'||(int)get_option('blog_public')!==0){wp_send_json(array('error'=>'private_staging_identity_required'),403);}
    set_error_handler(static function($severity,$message,$file,$line){if(!(error_reporting()&$severity)){return false;}throw new ErrorException('Private controller operation failed',0,$severity);});
    try{
        if(basename(__FILE__)!=='__KTK_CONTROLLER_HELPER__'||function_exists('ktk_capture_staging_original_state')||class_exists('KTK_Content_Update_Controller',false)||class_exists('KTK_Active_Content_Transaction',false)){throw new RuntimeException('Exact fresh staging controller required');}
        $raw=file_get_contents('php://input',false,null,0,2049);if(!is_string($raw)||strlen($raw)>2048){throw new RuntimeException('Bounded canonical request required');}
        define('KTK_STAGING_STATE_ALLOWED',true);define('KTK_UPDATE_ENGINE_ALLOWED',true);
        foreach(array('REQUEST','STORE','BACKUP','CONTROLLER') as $component){define('KTK_CONTENT_UPDATE_'.$component.'_ALLOWED',true);}
        /* __KTK_CONTROLLER_STATE__ */
        /* __KTK_CONTROLLER_REQUEST__ */
        /* __KTK_CONTROLLER_STORE__ */
        /* __KTK_CONTROLLER_BACKUP__ */
        /* __KTK_CONTROLLER_ENGINE__ */
        /* __KTK_CONTROLLER_LIFECYCLE__ */
        $packet=json_decode(base64_decode('__KTK_CONTROLLER_PACKET__',true),true,64,JSON_THROW_ON_ERROR);
        $seeds=json_decode(base64_decode('__KTK_CONTROLLER_SEEDS__',true),true,16,JSON_THROW_ON_ERROR);
        if(!is_array($packet)||!is_array($seeds)||$packet['mode']!=='private-staging-rehearsal'){throw new RuntimeException('Compiled private staging packet required');}
        $packet['publicRoot']=str_replace('\\','/',dirname(rtrim(ABSPATH,'/\\')));$packet['helperPath']=str_replace('\\','/',__FILE__);$packet['helperSha256']=hash_file('sha256',__FILE__);
        $initialize=static function(string $private)use($seeds){
            $directory=static function(string $path): void {
                if(str_replace('\\','/',(string)realpath($path))!==$path||!is_dir($path)){throw new RuntimeException('Canonical private fixture directory required');}
                for($part=$path;;$part=dirname($part)){if(is_link($part)){throw new RuntimeException('Private fixture symlink ancestor refused');}if(dirname($part)===$part){break;}}
            };
            foreach(array('source','target') as $folder){
                $directory($private);if(!mkdir($private.'/'.$folder,0700)){throw new RuntimeException('Fresh private fixture directory required');}$directory($private.'/'.$folder);
                foreach($seeds[$folder] as $name=>$encoded){
                    if(!preg_match('/^[A-Za-z0-9._\/-]+$/D',$name)||array_intersect(explode('/',$name),array('','.','..'))){throw new RuntimeException('Exact private fixture name required');}
                    $path=$private.'/'.$folder.'/'.$name;$bytes=base64_decode($encoded,true);if(!is_string($bytes)){throw new RuntimeException('Exact private fixture bytes required');}
                    $directory($private);$parent=$private.'/'.$folder;
                    foreach(array_slice(explode('/',$name),0,-1) as $part){$parent.='/'.$part;if(is_link($parent)||(file_exists($parent)&&!is_dir($parent))){throw new RuntimeException('Changed private fixture ancestor preserved');}if(!is_dir($parent)&&!mkdir($parent,0700)){throw new RuntimeException('Cannot create private fixture ancestor');}$directory($parent);}
                    $handle=fopen($path,'x+b');if(!$handle){throw new RuntimeException('Fresh private fixture file required');}
                    try{$directory($private);$directory(dirname($path));$held=fstat($handle);$current=lstat($path);if(is_link($path)||$held===false||$current===false||$held['dev']!==$current['dev']||$held['ino']!==$current['ino']||!chmod($path,0600)||fwrite($handle,$bytes)!==strlen($bytes)||!fflush($handle)||(function_exists('fsync')&&!fsync($handle))){throw new RuntimeException('Cannot verify private fixture write');}}finally{fclose($handle);}
                    if(hash_file('sha256',$path)!==hash('sha256',$bytes)){throw new RuntimeException('Private fixture bytes differ');}
                }
            }
        };
        $capture=static fn()=>ktk_capture_staging_original_state(__FILE__);
        $controller=new KTK_Content_Update_Controller($packet,$capture,$capture,$initialize);
        $result=$controller->run($raw,$_SERVER['REQUEST_METHOD'],$_SERVER['HTTP_HOST'],$token,time());
        $response=array('helperSha256'=>$packet['helperSha256'],'controller'=>$result);
    }catch(Throwable $error){restore_error_handler();wp_send_json(array('error'=>'private_staging_controller_failed'),409);}
    restore_error_handler();wp_send_json($response);
},-998);
