<?php
require __DIR__ . '/storefront-public-stubs.php';
$checks = 0;
function check( $pass, $name ) { $GLOBALS['checks']++; if (!$pass) { throw new RuntimeException($name); } }
function remove_action( $hook, $callback, $priority = 10 ) { $GLOBALS['removed_actions'][] = array($hook,$callback,$priority); }
$GLOBALS['removed_actions']=array();
KTK_Storefront::allow_staging_storefront_zoom();
check($GLOBALS['removed_actions']===array(array('wp_head','et_add_viewport_meta',10)),'Only the observed duplicate Divi viewport callback is removed on owned staging storefront');
foreach (array(
    array('https://krawlthroughkrakow.com/','https://krawlthroughkrakow.com/','1'),
    array('https://example.com/staging/','https://example.com/staging/','1'),
    array('https://krawlthroughkrakow.com/staging/','https://krawlthroughkrakow.com/','1'),
    array('https://krawlthroughkrakow.com/staging/','https://krawlthroughkrakow.com/staging/','0')
) as $context) {
    list($GLOBALS['home'],$GLOBALS['site'],$GLOBALS['query']['ktk_storefront'])=$context;
    $GLOBALS['removed_actions']=array();KTK_Storefront::allow_staging_storefront_zoom();
    check(!$GLOBALS['removed_actions'],'Production, foreign, mixed and non-store viewport behavior is untouched');
}
$GLOBALS['home']=$GLOBALS['site']='https://krawlthroughkrakow.com/staging/';$GLOBALS['query']['ktk_storefront']='1';
$product = array('id'=>28,'slug'=>'pub-crawl-28','name'=>'Pub Crawl','price'=>array('amount'=>135,'currency'=>'PLN'),
    'images'=>array(array('url'=>'https://example.com/crawl.jpg')),'config'=>array('content'=>array(
        'description'=>'Actual crawl description','highlights'=>array('Actual inclusion'),
        'meetingPoint'=>array('name'=>'Adam Statue','address'=>'Krakow','instructions'=>'Meet the guide','mapUrl'=>'https://maps.example.com/'),
        'importantInformation'=>array('Bring valid ID'))));
check(KTK_Storefront::public_html_enabled(),'Staging storefront enabled');
foreach (array('https://krawlthroughkrakow.com/','https://example.com/staging/','http://krawlthroughkrakow.com/staging/') as $home) {
    $GLOBALS['home']=$home; $GLOBALS['site']=$home;
    check(!KTK_Storefront::public_html_enabled() && null===KTK_Storefront::public_html_data(),'Production/foreign environment unchanged');
}
$GLOBALS['home']='https://krawlthroughkrakow.com/staging/'; $GLOBALS['site']=$GLOBALS['home'];
$GLOBALS['query']['ktk_storefront']='0';
check(!KTK_Storefront::public_html_enabled(),'Non-store request excluded');
$GLOBALS['query']['ktk_storefront']='1';
foreach (array('cart','checkout','checkout/success','orders/example','saved-carts/example') as $path) {
    $GLOBALS['query']['ktk_storefront_path']=$path;
    check(null===KTK_Storefront::public_html_data(),'Private/utility route never gets public content');
}
check(!$GLOBALS['requests'],'No product/API reads on excluded routes');
$GLOBALS['query']['ktk_storefront_path']='pub-crawl-28';
$GLOBALS['transients']['ktk_sf_'.md5('product_pub-crawl-28')]=array('product'=>$product,'customer'=>array('email'=>'private@example.invalid'),
    'storefrontConfig'=>array('cancellationPolicy'=>array('title'=>'Cancellation policy','summary'=>'Actual terms'),'journeyReplay'=>array('enabled'=>true,'projectId'=>'private-marker')));
$data=KTK_Storefront::public_html_data(); $html=KTK_Storefront_Public_Content::render($data);
$document=new DOMDocument();@$document->loadHTML($html);$xpath=new DOMXPath($document);
check($xpath->query('//main')->length===1 && $xpath->query('//main//main')->length===0,'Product initial HTML has one non-nested main landmark');
check($xpath->query('//main//h1')->length===1 && $xpath->query('//main//aside')->length===1,'Product heading and booking contact are inside its main landmark');
foreach (array('<h1>Pub Crawl</h1>','Actual crawl description','Actual inclusion','Adam Statue','Bring valid ID','Actual terms','PLN 135.00','crawl.jpg','/staging/store2/','/staging/contact/') as $text) {
    check(str_contains($html,$text),'Initial HTML includes '.$text);
}
foreach (array('private@example.invalid','private-marker','<script','<iframe','<form','clientSecret') as $text) {
    check(!str_contains($html,$text),'No private state, tracking or booking engine emitted');
}
check(str_contains($html,'data-no-lazy="1"'),'First public product image is never lazy rewritten');
check(KTK_Storefront::public_style_tag('<link>','unrelated-style')==='<link>','Unrelated stylesheet remains unchanged');
check(!$GLOBALS['requests'],'Existing public cache reused without second product request');
$attack=$product; $attack['name']='<script>alert(1)</script>'; $attack['config']['content']['description']='<img src=x onerror=alert(1)>';
$attack['config']['content']['meetingPoint']['mapUrl']='javascript:alert(1)';
$html=KTK_Storefront_Public_Content::render(array('kind'=>'product','product'=>$attack));
check(!str_contains($html,'<script>') && !str_contains($html,'<img src=x') && !str_contains($html,'javascript:'),'Untrusted text/URL escaped');
$GLOBALS['query']['ktk_storefront_path']='';
$GLOBALS['transients']['ktk_sf_'.md5('catalog')]=array('products'=>array($product,array('name'=>'Bad','slug'=>'../cart')));
$data=KTK_Storefront::public_html_data(); $html=KTK_Storefront_Public_Content::render($data);
check(count($data['products'])===1 && str_contains($html,'/staging/store2/pub-crawl-28/'),'Catalog links are clean, native and validated');
check(substr_count($html,'<h1>')===1 && str_contains($html,'<h2>'),'Catalog has one primary heading and product subheadings');
check(!$GLOBALS['requests'],'Catalog cache reused');
unset($GLOBALS['transients']['ktk_sf_'.md5('catalog')]);
$GLOBALS['response']=array('status'=>200,'body'=>array('products'=>array($product)));
check(KTK_Storefront::public_html_data()['products'][0]['id']===28,'Catalog fetched on cache miss');
check($GLOBALS['requests'][0][0]==='https://omni-lodge.com/api/storefront/products' && $GLOBALS['requests'][0][1]['timeout']===8,'Only bounded public GET used');
unset($GLOBALS['transients']['ktk_sf_'.md5('catalog')]); $GLOBALS['response']=new WP_Error();
check(null===KTK_Storefront::public_html_data(),'Outage leaves existing client fallback, never fabricated offers');
$fallback=KTK_Storefront_Public_Content::resolve(array('slug'=>'bubble-football-43','config'=>array()));
check(str_contains($fallback['description'],'Bubble Football') && count($fallback['gallery'])===3,'Existing frontend fallback is shared with PHP');
check(''===KTK_Storefront_Public_Content::render(null),'Missing data is not rendered');
$food = array('id'=>48,'slug'=>'food-tour-krakow-48','name'=>'Food Tour Krakow','config'=>array('content'=>array('highlights'=>array('13-14 Polish food tastings'))));
check(str_contains(KTK_Storefront_Public_Content::resolve($food)['summary'],'13-14 Polish food tastings'),'Confirmed tasting count fills missing Food Tour summary');
$food['config']['content']['summary']='Current configured summary';
check(KTK_Storefront_Public_Content::resolve($food)['summary']==='Current configured summary','Existing configured Food Tour summary has precedence');
$halloween = array('id'=>51,'slug'=>'halloween-pub-crawl-51','name'=>'Halloween Pub Crawl','price'=>array('amount'=>135,'currency'=>'PLN'),
    'config'=>array('availability'=>array('dateMode'=>'allowed_dates','allowedDates'=>array('2026-10-29','2026-10-30','2026-10-31')),
        'content'=>array('description'=>'Original upcoming campaign','highlights'=>array('Original inclusion'))));
foreach (array('2026-10-28','2026-10-31','invalid') as $day) {
    check(null===KTK_Storefront_Public_Content::past_campaign($halloween,$day),'Past notice is not premature or based on an invalid date');
}
foreach (array('2026-11-01','2026-11-13') as $day) {
    check(str_contains(KTK_Storefront_Public_Content::past_campaign($halloween,$day)['nextDates'],'to be announced'),'Completed confirmed campaign has no invented future date');
}
foreach (array(
    array('dateMode'=>'fixed','fixedDate'=>'2027-10-31'),
    array('allowedDates'=>array('2027-10-29','2027-10-30','2027-10-31')),
    array('allowedDates'=>array('2026-10-29','2026-10-30','2026-10-31','2027-10-31')),
    array('allowedDates'=>array()),
    array('dateOverrides'=>array(array('date'=>'2026-11-20','mode'=>'available'))),
    array('dateOverrides'=>'invalid')
) as $change) {
    $future=$halloween;$future['config']['availability']=array_merge($future['config']['availability'],$change);
    check(null===KTK_Storefront_Public_Content::past_campaign($future,'2026-11-13'),'New or unknown campaign configuration is not blocked by old editorial data');
}
foreach (array(array('date'=>'2026-11-20','mode'=>'blocked'),array('date'=>'2026-11-20','mode'=>'closed'),array('date'=>'2026-11-20','enabled'=>false)) as $override) {
    $closed=$halloween;$closed['config']['availability']['dateOverrides']=array($override);
    check(null!==KTK_Storefront_Public_Content::past_campaign($closed,'2026-11-13'),'Disabled/closed override does not reopen past event');
}
$wrong=$halloween;$wrong['id']=52;
check(null===KTK_Storefront_Public_Content::past_campaign($wrong,'2026-11-13'),'Wrong product identity never receives campaign notice');
$html=KTK_Storefront_Public_Content::render(array('kind'=>'product','product'=>$halloween));
check(str_contains($html,'Halloweekend 2026 has finished') && str_contains($html,'Next Halloween dates: to be announced.'),'Public past-event message survives without JavaScript');
check(!str_contains($html,'PLN 135.00') && !str_contains($html,'Original upcoming campaign'),'Old price and upcoming promises are not presented as current');
check(str_contains($html,'Original inclusion') && str_contains($html,'/staging/store2/pub-crawl-28/'),'Historical details retained with a native regular-crawl alternative');
$html=KTK_Storefront_Public_Content::render(array('kind'=>'catalog','products'=>array($halloween)));
check(str_contains($html,'Past event - next dates TBA') && !str_contains($html,'PLN 135.00'),'Catalogue retains historical URL without a current price');

function absint($value) { return abs((int)$value); }
function wp_list_pluck($items,$key) { return array_column($items,$key); }
function add_query_arg($key,$value,$url) { return $url.'?'.http_build_query(array($key=>$value)); }
$metadata=array('product'=>$halloween,'canonical'=>'https://krawlthroughkrakow.com/staging/store2/halloween-pub-crawl-51/',
    'description'=>'Past event. Next dates TBA.','title'=>'Halloween Pub Crawl','images'=>array(),'image'=>array());
$schema_method=new ReflectionMethod('KTK_Storefront','product_schema');
$schema=$schema_method->invoke(null,$metadata,'Halloween Pub Crawl');
check(count($schema['@graph'])===1 && $schema['@graph'][0]['@type']==='WebPage','Past event emits WebPage, not an active Product Offer');
check(!str_contains(json_encode($schema),'InStock') && !str_contains(json_encode($schema),'mainEntity'),'Past page schema has no current stock claim or dangling product reference');
$GLOBALS['home']=$GLOBALS['site']='https://krawlthroughkrakow.com/';
$original_schema=$schema_method->invoke(null,$metadata,'Halloween Pub Crawl');
check(count($original_schema['@graph'])===2 && isset($original_schema['@graph'][1]['offers']),'Existing non-staging schema behavior remains untouched');
$GLOBALS['home']=$GLOBALS['site']='https://krawlthroughkrakow.com/staging/';

echo "Public storefront contracts: $checks/$checks passed\n";
require __DIR__ . '/storefront-missing-product-cases.php';
