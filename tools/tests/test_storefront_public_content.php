<?php
require __DIR__ . '/storefront-public-stubs.php';
$checks = 0;
function check( $pass, $name ) { $GLOBALS['checks']++; if (!$pass) { throw new RuntimeException($name); } }
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
echo "Public storefront contracts: $checks/$checks passed\n";
