<?php
/** Expiring metadata-only entry probe. No copy, update, database writer or normal-request output. */
if(!defined('ABSPATH')){exit;}
$ktkEntryProbe=static function(string $profile): void {
    $token=$_SERVER['HTTP_X_KTK_ENTRY_PROBE_TOKEN']??null;
    if(time()>=__KTK_ENTRY_EXPIRES__||!is_string($token)||!hash_equals('__KTK_ENTRY_TOKEN_SHA__',hash('sha256',$token))){return;}
    if(($_GET['ktk_private_entry_probe']??null)!=='__KTK_ENTRY_ID__'){return;}
    $requested=$_GET['entry']??null;
    if(!in_array($requested,array('early','late'),true)||$requested!==$profile){return;}
    $respond=static function(array $value,int $status=200): void {
        if(function_exists('wp_send_json')){wp_send_json($value,$status);}
        http_response_code($status);header('Content-Type: application/json; charset=UTF-8',true);echo json_encode($value,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);exit;
    };
    header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);header('X-Robots-Tag: noindex, noarchive',true);
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'||strtolower($_SERVER['HTTP_HOST']??'')!=='krawlthroughkrakow.com'){$respond(array('error'=>'entry_request_required'),403);}
    $required=array();foreach(array('home_url','site_url','get_option','nocache_headers','wp_send_json','did_action','is_multisite') as $name){$required[$name]=function_exists($name);}
    if(in_array(false,$required,true)){$respond(array('error'=>'entry_capability_unavailable','requiredFunctions'=>$required),409);}
    nocache_headers();header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);
    if(home_url('/')!=='https://krawlthroughkrakow.com/staging/'||site_url('/')!=='https://krawlthroughkrakow.com/staging/'||(int)get_option('blog_public')!==0){$respond(array('error'=>'staging_identity_required'),403);}
    set_error_handler(static function($severity,$message,$file,$line){if(!(error_reporting()&$severity)){return false;}throw new ErrorException('Private entry probe failed',0,$severity);});
    try{
        if(basename(__FILE__)!=='__KTK_ENTRY_HELPER__'||PHP_INT_SIZE!==8||function_exists('ktk_capture_staging_original_state')){throw new RuntimeException('Exact fresh private entry helper required');}
        $raw=file_get_contents('php://input',false,null,0,1025);
        if(!is_string($raw)||$raw!=='{"schemaVersion":1,"action":"inspect"}'){throw new RuntimeException('Exact read-only entry request required');}
        define('KTK_STAGING_STATE_ALLOWED',true);
        /* __KTK_ENTRY_STATE__ */
        $snapshot=ktk_capture_staging_original_state(__FILE__);
        $canonical=static function($v)use(&$canonical){if(is_array($v)){if(!array_is_list($v)){ksort($v);}foreach($v as $k=>$p){$v[$k]=$canonical($p);}}return $v;};
        $sha=static fn($v)=>hash('sha256',json_encode($canonical($v),JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
        if($sha($snapshot['ownedContentFiles'])!=='__KTK_ENTRY_OWNED_SHA__'||count($snapshot['ownedContentFiles'])!==__KTK_ENTRY_OWNED_COUNT__){throw new RuntimeException('Exact unchanged staging application inventory required');}
        $normalized=$snapshot;unset($normalized['capturedAt']);$included=array_map(static fn($p)=>str_replace('\\','/',$p),get_included_files());$active=get_option('active_plugins');
        if(!is_array($active)||count($active)>1000||!defined('WP_PLUGIN_DIR')){throw new RuntimeException('Bounded active plugin entry inventory required');}
        $loaded=0;$ecwidDeclared=false;$ecwidLoaded=false;
        foreach($active as $name){
            if(!is_string($name)||!preg_match('/^[A-Za-z0-9._\/-]+\.php$/D',$name)||array_intersect(explode('/',$name),array('','.','..'))){throw new RuntimeException('Unambiguous regular plugin entry names required');}
            $entry=realpath(WP_PLUGIN_DIR.'/'.$name);$present=$entry!==false&&in_array(str_replace('\\','/',$entry),$included,true);$loaded+=(int)$present;
            if(str_contains(strtolower($name),'ecwid')){$ecwidDeclared=true;$ecwidLoaded=$ecwidLoaded||$present;}
        }
        $value=array('schemaVersion'=>1,'scope'=>'staging-private-entry-readonly','profile'=>$profile,'hook'=>$profile==='early'?'muplugins_loaded':'wp_loaded','helperSha256'=>hash_file('sha256',__FILE__),'serverEpoch'=>time(),'requiredFunctions'=>$required,'isMultisite'=>is_multisite(),'phases'=>array('muplugins_loaded'=>did_action('muplugins_loaded'),'plugins_loaded'=>did_action('plugins_loaded'),'wp_loaded'=>did_action('wp_loaded')),'regularPlugins'=>array('declared'=>count($active),'included'=>$loaded,'ecwidDeclared'=>$ecwidDeclared,'ecwidIncluded'=>$ecwidLoaded),'snapshot'=>array('protectedStateSha256'=>$snapshot['protectedStateSha256'],'databaseSha256'=>$snapshot['databaseSha256'],'identitySha256'=>$sha($snapshot['identity']),'ownedFilesSha256'=>$sha($snapshot['ownedContentFiles']),'protectedFilesSha256'=>$sha($snapshot['protectedFiles']),'normalizedSnapshotSha256'=>$sha($normalized),'rowCounts'=>$snapshot['rowCounts'],'ownedFileCount'=>count($snapshot['ownedContentFiles']),'protectedFileCount'=>count($snapshot['protectedFiles'])),'runtime'=>array('phpVersionId'=>PHP_VERSION_ID,'peakAllocatedBytes'=>memory_get_peak_usage(true),'memoryLimit'=>ini_get('memory_limit'),'maxExecutionTime'=>ini_get('max_execution_time')),'applicationWrites'=>0,'databaseWrites'=>0,'cachePurges'=>0,'productionOperations'=>0);
    }catch(Throwable $error){restore_error_handler();$respond(array('error'=>'private_entry_probe_failed','failureType'=>get_class($error)),409);}
    restore_error_handler();$respond($value);
};
add_action('muplugins_loaded',static fn()=>$ktkEntryProbe('early'),-998);
add_action('wp_loaded',static fn()=>$ktkEntryProbe('late'),-998);
