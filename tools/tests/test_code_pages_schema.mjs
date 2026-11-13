import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCodePageSchema,visiblePublicationDate} from '../code-pages-schema.mjs';

const routes = [
  {route:'/blog/',title:'The Pub Crawl Blog'},
  {route:'/about-us/',title:'About Us'},
  {route:'/about-us/how-to-join/',title:'How to Join!'},
  {route:'/contact/',title:'Contact'},
  {route:'/category/party-tips/',title:'Party Tips | Krawl Through Krakow'},
  {route:'/category/party-tips/page/2/',title:'Party Tips | Krawl Through Krakow'},
  {route:'/author/dpbowman/',title:'DPBowman | Krawl Through Krakow'},
  {route:'/author/jessie/',title:'Jess Campbell | Krawl Through Krakow'},
  {route:'/article/',title:'Original article'},
  {route:'/hostel-hangover-cure/',title:'Held article'},
];
const args = {route:'/article/',kind:'blog post',description:'Existing description',routes,
  facts:{headline:'Original article',published:'Jun 17, 2023',author:{name:'DPBowman',url:'__KTK_HOME_URL__author/dpbowman/'},
    image:{src:'__KTK_PAGE_ASSETS__media/123-photo.jpg',width:'1080',height:'675'}}};
const graph = input => buildCodePageSchema(input)[0]['@graph'];

test('article identity, original visible date/byline and featured image share the established site identity', () => {
  const [page,breadcrumb,article] = graph(args);
  assert.equal(page.name,args.facts.headline);
  assert.equal(page.isPartOf['@id'],'https://krawlthroughkrakow.com/#website');
  assert.equal(article.publisher['@id'],'https://krawlthroughkrakow.com/#organization');
  assert.equal(article.mainEntityOfPage['@id'],page['@id']);
  assert.equal(page.mainEntity['@id'],article['@id']);
  assert.equal(article.datePublished,'2023-06-17');
  assert.equal(article.author.name,'DPBowman');
  assert.equal(article.image,'https://krawlthroughkrakow.com/wp-content/mu-plugins/ktk-code-pages-assets/media/123-photo.jpg');
  assert.deepEqual(breadcrumb.itemListElement.map(row=>row.name),['Home','Blog','Original article']);
  for (const forbidden of ['dateModified','review','aggregateRating','offers','event','medicalSpecialty']) assert.equal(article[forbidden],undefined);
});

test('missing/ambiguous authors and dates stay absent; inline icons and remote guesses are not promoted', () => {
  for (const author of [null,{name:'pubthroughkrakow',url:'__KTK_HOME_URL__author/pubthroughkrakow/'},{name:'Unknown',url:'https://example.com/author/dpbowman/'}]) {
    const article=graph({...args,facts:{headline:'Original article',published:'',author,image:{src:'__KTK_PAGE_ASSETS__media/icon.png',width:'150',height:'150'}}})[2];
    assert.equal(article.author,undefined);assert.equal(article.datePublished,undefined);assert.equal(article.image,undefined);
  }
});

test('page/collection types and breadcrumbs use registered navigation parents only', () => {
  for (const [route,type] of [['/about-us/','AboutPage'],['/contact/','ContactPage'],['/blog/','CollectionPage'],['/category/party-tips/page/2/','CollectionPage'],['/about-us/how-to-join/','WebPage']]) {
    const rows=graph({...args,route,kind:'page'});
    assert.equal(rows[0]['@type'],type);assert.equal(rows.length,2);
    const crumbs=rows[1].itemListElement;
    assert.equal(new Set(crumbs.map(row=>row.item)).size,crumbs.length);
    assert.ok(crumbs.every((row,index)=>row.position===index+1));
    assert.ok(crumbs.every(row=>row.item==='https://krawlthroughkrakow.com/'||routes.some(route=>'https://krawlthroughkrakow.com'+route.route===row.item)));
    assert.ok(!crumbs.some(row=>/\/category\/$|\/page\/$/.test(row.item)));
  }
});

test('hold/inherited schema retained byte-for-byte, conflicts and unreviewed/private paths fail closed', () => {
  const inherited=[{'@context':'https://schema.org','@type':'WebPage',name:'Inherited'}];
  assert.deepEqual(buildCodePageSchema({...args,route:'/hostel-hangover-cure/',inherited}),inherited);
  assert.deepEqual(buildCodePageSchema({...args,inherited})[0],inherited[0]);
  assert.throws(()=>buildCodePageSchema({...args,inherited:[{'@id':'https://krawlthroughkrakow.com/article/#webpage'}]}));
  for (const route of ['/store2/cart/','/staging/article/','/unknown/','//example.com/','/article/?query=x']) assert.throws(()=>buildCodePageSchema({...args,route}));
});

test('visible publication dates keep their original calendar day, never migration timestamps', () => {
  assert.equal(visiblePublicationDate('Apr 5, 2020'),'2020-04-05');
  assert.equal(visiblePublicationDate('Feb 29, 2024'),'2024-02-29');
  assert.equal(visiblePublicationDate('unverified'),null);
  assert.throws(()=>visiblePublicationDate('Feb 30, 2024'));
});
