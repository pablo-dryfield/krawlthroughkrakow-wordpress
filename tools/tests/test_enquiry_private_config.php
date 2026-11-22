<?php
/** Offline metadata/contract checks; no real settings, filesystem writes or messages. */
define('ABSPATH', __DIR__);
require __DIR__ . '/../../staging/wp-content/mu-plugins/ktk-code-pages-assets/enquiry-private-config.php';
$checks = 0;
function check_config($pass, $label) { global $checks; $checks++; if (!$pass) { fwrite(STDERR, 'FAIL: ' . $label . PHP_EOL); exit(1); } }
$value = array('version' => 1, 'url' => 'https://omni-lodge.com/api/website-enquiries/staging', 'signingSecret' => str_repeat('local-test-only-', 3));
$file = array('uid' => 123, 'mode' => 0100600); $directory = array('uid' => 123, 'mode' => 0040700);
check_config(ktk_pages_enquiry_private_config_values(json_encode($value), $file, $directory, 123) === $value, 'exact private settings accepted');
foreach (array('https://attacker.invalid/api/website-enquiries/staging', 'https://omni-lodge.com/api/website-enquiries/production', 'http://omni-lodge.com/api/website-enquiries/staging', $value['url'].'?recipient=bad', 'https://user:pass@omni-lodge.com/api/website-enquiries/staging') as $bad) {
    $other=$value; $other['url']=$bad; check_config(ktk_pages_enquiry_private_config_values(json_encode($other),$file,$directory,123)===null,'reject changed endpoint');
}
foreach (array('',str_repeat('x',31),str_repeat('x',257),str_repeat('x',32)."\n",array('x')) as $bad) {
    $other=$value; $other['signingSecret']=$bad; check_config(ktk_pages_enquiry_private_config_values(json_encode($other),$file,$directory,123)===null,'reject malformed secret');
}
foreach (array('extra','missing','version','array','oversize','invalid-json') as $case) {
    $other=$value;
    if($case==='extra')$other['recipient']='bad';elseif($case==='missing')unset($other['url']);elseif($case==='version')$other['version']='1';elseif($case==='array')$other=array($value);
    $bytes=$case==='oversize'?str_repeat('x',4097):($case==='invalid-json'?'{':json_encode($other));
    check_config(ktk_pages_enquiry_private_config_values($bytes,$file,$directory,123)===null,'reject '.$case);
}
foreach (array(0640,0644,0666,0700,0777,0) as $mode) { $other=$file;$other['mode']=$mode;check_config(ktk_pages_enquiry_private_config_values(json_encode($value),$other,$directory,123)===null,'reject file permissions'); }
foreach (array(0750,0755,0777,0600,0) as $mode) { $other=$directory;$other['mode']=$mode;check_config(ktk_pages_enquiry_private_config_values(json_encode($value),$file,$other,123)===null,'reject directory permissions'); }
$other=$file;$other['uid']=999;check_config(ktk_pages_enquiry_private_config_values(json_encode($value),$other,$directory,123)===null,'reject file owner');
$other=$directory;$other['uid']=999;check_config(ktk_pages_enquiry_private_config_values(json_encode($value),$file,$other,123)===null,'reject directory owner');
check_config(ktk_pages_enquiry_private_config_values(json_encode($value),null,$directory,123)===null,'reject missing file metadata');
check_config(ktk_pages_enquiry_private_config_values(json_encode($value),$file,null,123)===null,'reject missing directory metadata');
check_config(ktk_pages_enquiry_load_private_config()===false,'ordinary/non-staging requests never load private settings');
check_config(!defined('KTK_ENQUIRY_SIGNING_SECRET')&&!defined('KTK_ENQUIRY_API_URL'),'no constants defined by rejected bootstrap');
echo 'Private staging enquiry configuration: '.$checks.'/'.$checks.' passed; no actual secrets/files/messages.' . PHP_EOL;
