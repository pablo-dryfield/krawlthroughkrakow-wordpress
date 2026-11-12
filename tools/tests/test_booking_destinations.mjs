import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingDestination,legacyProductSlugs} from '../booking-destinations.mjs';

test('every mapped Ecwid identity reaches the corresponding code-managed product',()=>{
 for(const [id,slug] of Object.entries(legacyProductSlugs))assert.equal(bookingDestination(`https://krawlthroughkrakow.com/store/Old-product-p${id}`),`__KTK_HOME_URL__store2/${slug}/#book`);
});
test('old and current brunch identities share the current product',()=>{
 assert.equal(bookingDestination('/store/Bottomless-Brunch-p661114244'),'__KTK_HOME_URL__store2/bottomless-brunch-29/#book');
 assert.equal(bookingDestination('/staging/store/2-Hour-Bottomless-Brunch-p808765006'),'__KTK_HOME_URL__store2/bottomless-brunch-29/#book');
});
test('store categories and unknown legacy products reach the catalog',()=>{
 for(const value of ['/store/','/staging/store/Category-c123','__KTK_HOME_URL__store/Unknown-p999999999'])assert.equal(bookingDestination(value),'__KTK_HOME_URL__store2/');
});
test('known FareHarbor offers use the matching product, not obsolete calendar dates',()=>{
 assert.equal(bookingDestination('https://fareharbor.com/embeds/book/krawlthroughkrakow/items/216331/calendar/2020/03/?flow=no'),'__KTK_HOME_URL__store2/pub-crawl-28/#book');
 assert.equal(bookingDestination('https://fareharbor.com/embeds/book/krawlthroughkrakow/items/342685/?flow=362322'),'__KTK_HOME_URL__store2/nye-pub-crawl-32/#book');
});
test('generic own FareHarbor calendars reach the catalog and drop visitor payload',()=>{
 assert.equal(bookingDestination('https://fareharbor.com/embeds/book/krawlthroughkrakow/items/calendar/?u=old-visitor&back=about:blank&flow=660691'),'__KTK_HOME_URL__store2/');
});
test('real attribution is preserved, unrelated legacy configuration is not',()=>{
 assert.equal(bookingDestination('https://fareharbor.com/embeds/book/krawlthroughkrakow/items/342685/?utm_source=partner&utm_campaign=Winter%20event&gclid=click&u=old&flow=1'),'__KTK_HOME_URL__store2/nye-pub-crawl-32/?utm_source=partner&utm_campaign=Winter+event&gclid=click#book');
});
test('unrelated operators, providers, ports and current storefront URLs are untouched',()=>{
 for(const value of ['https://example.org/store/Old-p637047413','https://krawlthroughkrakow.com.evil.test/store/Old-p637047413','https://krawlthroughkrakow.com:444/store/','https://fareharbor.com/embeds/book/another-company/items/216331/','https://krawlthroughkrakow.com/store2/pub-crawl-28/#book','mailto:pubthroughkrakow@gmail.com','#book','javascript:alert(1)'])assert.equal(bookingDestination(value),null,value);
});
test('HTTP and www variants use environment-portable destinations',()=>{
 assert.equal(bookingDestination('http://www.krawlthroughkrakow.com/store/Old-p637047413'),'__KTK_HOME_URL__store2/pub-crawl-28/#book');
});
