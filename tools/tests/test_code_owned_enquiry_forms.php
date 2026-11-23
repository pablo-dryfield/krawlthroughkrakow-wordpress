<?php
/** Local capture-only processor checks: no WordPress DB, plugin, SMTP or real HTTP. */
define('ABSPATH', dirname(__DIR__, 2));define('MINUTE_IN_SECONDS',60);
define('KTK_ENQUIRY_API_URL','https://receiver.example.test/api/website-enquiries/staging');
define('KTK_ENQUIRY_SIGNING_SECRET','local-only-unit-key-not-a-real-integration-secret');
class EnquiryResult extends RuntimeException { public $payload; public function __construct($success,$data,$status) { $this->payload=compact('success','data','status'); } }
$staging=true;$requests=array();$rates=array();$reply_mode='sent';$checks=0;
function check($condition,$label){global $checks;++$checks;if(!$condition)throw new RuntimeException($label);}
function ktk_pages_is_staging(){global $staging;return $staging;}
function ktk_pages_environment_enabled(){global $staging;return $staging;}
function ktk_pages_definition($route){$m=ktk_pages_enquiry_manifest();foreach($m['forms']as$f)if($f['route']===$route)return array('key'=>$f['id'],'route'=>$route,'forms'=>array(array('index'=>0)));return null;}
function get_post(...$args){throw new RuntimeException('No Divi database read');}
function get_post_meta(...$args){throw new RuntimeException('No CF7 database read');}
function get_option(...$args){throw new RuntimeException('No mail settings database read');}
function get_shortcode_regex(...$args){throw new RuntimeException('No shortcode dependency');}
function add_action(...$args){}
function wp_salt($name){return 'local-unit-salt';}
function wp_create_nonce($action){return 'valid';}
function wp_verify_nonce($value,$action){return $value==='valid';}
function wp_generate_uuid4(){return '5273d05b-4cf9-4b50-9ed1-35297b1f6097';}
function sanitize_key($value){return preg_replace('/[^a-z0-9_-]/','',strtolower($value));}
function sanitize_textarea_field($value){return trim(strip_tags($value));}
function wp_unslash($value){return $value;}
function is_email($value){return (bool)filter_var($value,FILTER_VALIDATE_EMAIL);}
function get_transient($key){global $rates;return $rates[$key]??0;}
function set_transient($key,$value,$seconds){global $rates;$rates[$key]=$value;}
function home_url($path=''){return 'https://krawlthroughkrakow.com/staging/'.ltrim($path,'/');}
function admin_url($path){return home_url('wp-admin/'.$path);}
function esc_attr($value){return htmlspecialchars($value,ENT_QUOTES);}
function esc_url($value){return $value;}
function nocache_headers(){}
function wp_json_encode($value,$flags=0){return json_encode($value,$flags);}
function wp_send_json_error($data,$status){throw new EnquiryResult(false,$data,$status);}
function wp_send_json_success($data){throw new EnquiryResult(true,$data,200);}
function wp_mail(...$args){throw new RuntimeException('SMTP fallback forbidden');}
function is_wp_error($value){return $value instanceof RuntimeException;}
function wp_remote_retrieve_response_code($value){return $value['status'];}
function wp_remote_retrieve_header($value,$key){return $value['headers'][$key]??'';}
function wp_remote_retrieve_body($value){return $value['body'];}
function wp_remote_post($url,$options){
 global $requests,$reply_mode;
 $payload=json_decode($options['body'],true);$requests[]=compact('url','options','payload');
 if($reply_mode==='timeout')return new RuntimeException('Captured unknown transport');
 $data=$reply_mode==='sent'?array('status'=>'sent','requestId'=>$payload['requestId'],'deduplicated'=>false):array('status'=>'error');
 if($reply_mode==='wrong-id')$data=array('status'=>'sent','requestId'=>'not-the-submitted-id');
 if($reply_mode==='field-error')$data=array('code'=>'invalid_field','field'=>'number-people');
 return array('status'=>$reply_mode==='field-error'?422:($reply_mode==='unconfirmed'?503:200),'headers'=>array('content-type'=>$reply_mode==='html'?'text/html':'application/json'),'body'=>json_encode($data));
}
require ABSPATH.'/staging/wp-content/mu-plugins/ktk-code-pages-assets/forms.php';
function submit($key,$overrides=array()){
 global $rates;$rates=array();$context=ktk_pages_contact_context($key,'0');$post=array('route_key'=>$key,'form_index'=>'0','_ktk_nonce'=>'valid','_ktk_website'=>'','_ktk_request_id'=>wp_generate_uuid4());
 foreach($context['form']['fields']as$field){
  $name=str_ends_with($field['name'],'[]')?substr($field['name'],0,-2):$field['name'];
  $value=$field['type']==='email'?'local-test@example.test':($field['type']==='date'?'2026-12-01':($field['type']==='number'?'4':'LOCAL TEST'));
  if($field['type']==='multiselect')$value=str_ends_with($field['name'],'[]')?array($field['options'][0]):json_encode(array($field['options'][0]));
  $post[$name]=$value;
 }
 $challenge=ktk_pages_challenge($key,'0',4,9);$post['_ktk_challenge']=$challenge['token'];$post['captcha']='13';
 $_POST=array_replace($post,$overrides);$_SERVER=array('REQUEST_METHOD'=>'POST','HTTP_ORIGIN'=>'https://krawlthroughkrakow.com','REMOTE_ADDR'=>'192.0.2.50');
 try{ktk_pages_contact_submit();}catch(EnquiryResult$result){return$result->payload;}throw new RuntimeException('No terminating response');
}
foreach(ktk_pages_enquiry_manifest()['forms']as$form){
 $before=count($requests);$result=submit($form['id'],array('recipient'=>'attacker@example.test','cc'=>'attacker@example.test'));
 check($result['success'],'Every form passes capture transport');check(count($requests)===$before+1,'One bridge call per submit');
 $request=$requests[$before];check(array_keys($request['payload'])===array('requestId','formId','schemaSha256','fields'),'Public recipient/header instructions cannot cross bridge');
 check($request['payload']['formId']===$form['id'],'Exact form identity');check($request['options']['redirection']===0&&$request['options']['sslverify']===true&&$request['options']['reject_unsafe_urls']===true,'No redirect/TLS bypass');
 check(strlen($request['options']['body'])<131072&&$request['options']['limit_response_size']===16384,'Request and response bounds retained');
 check(hash_equals(hash_hmac('sha256',$request['options']['headers']['X-KTK-Enquiry-Timestamp']."\n".$request['options']['body'],KTK_ENQUIRY_SIGNING_SECRET),$request['options']['headers']['X-KTK-Enquiry-Signature']),'Exact byte signature');
 check(!str_contains($request['options']['body'],KTK_ENQUIRY_SIGNING_SECRET)&&!str_contains($request['options']['body'],'192.0.2.50'),'No signing secret or visitor IP in payload');
 check($result['data']['message']===$form['successMessage'],'Code-owned feedback');
}
$before=count($requests);
foreach(array(array('_ktk_nonce'=>'invalid'),array('_ktk_website'=>'bot'),array('captcha'=>'99'),array('_ktk_request_id'=>'wrong'),array('et_pb_contact_name_0'=>''),array('et_pb_contact_name_0'=>array('bad')),array('et_pb_contact_email_0'=>'bad'),array('et_pb_contact_name_0'=>str_repeat('x',10001)))as$invalid){check(!submit('contact',$invalid)['success'],'Invalid form rejected');check(count($requests)===$before,'No bridge for invalid input');}
check(!submit('krakow-hen-do',array('et_pb_contact_selection_0'=>'["Unregistered option"]'))['success'],'Unknown checkbox option rejected');
check(!submit('stagshens',array('date-370'=>'2026-02-30'))['success'],'Invalid date rejected');
check(!submit('stagshens',array('number-people'=>'-1'))['success'],'Invalid headcount rejected');
check(!submit('post-welcome-to-alcohol',array('your-name'=>str_repeat('🙂',201)))['success'],'Browser UTF16 maxlength enforced without an optional PHP extension');
foreach(array('timeout','html','wrong-id','unconfirmed')as$mode){$reply_mode=$mode;$before=count($requests);$result=submit('contact');check(!$result['success']&&$result['data']['delivery_state']==='unconfirmed','Unknown delivery is explicit');check(count($requests)===$before+1,'Unknown delivery never retries or falls back');}
$reply_mode='field-error';$result=submit('stagshens');check($result['status']===422&&$result['data']['field']==='number-people','Remote field IDs map to the original accessible control');
$staging=false;check(ktk_pages_contact_context('contact','0')===null,'New bridge never accepts production website forms');$staging=true;
$_GET=array('route_key'=>'contact','form_index'=>'0');try{ktk_pages_contact_token();}catch(EnquiryResult$result){check($result->payload['data']['requestId']===wp_generate_uuid4(),'Fresh token includes a submission UUID');}
echo "Code-owned enquiry forms: {$checks}/{$checks} checks; HTTP captured, SMTP/Gmail sends zero.\n";
