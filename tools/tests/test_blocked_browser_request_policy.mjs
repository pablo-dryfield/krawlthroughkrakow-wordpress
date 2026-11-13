import test from 'node:test';
import assert from 'node:assert/strict';
import {isBlockedOptimizerFeedback} from '../blocked-browser-request-policy.mjs';

const base='https://krawlthroughkrakow.com/staging/store2/';
const known={blocked:true,origin:'https://krawlthroughkrakow.com',path:'/staging/wp-admin/admin-ajax.php',method:'POST',contentType:'multipart/form-data',action:'rocket_beacon'};

test('only acknowledged blocked staging optimization feedback is classified',()=>{
 assert.equal(isBlockedOptimizerFeedback(known,base),true);
 assert.equal(isBlockedOptimizerFeedback({...known,origin:'http://127.0.0.1:5187',path:'/wp-admin/admin-ajax.php'},'http://127.0.0.1:5187/store2/'),true);
});

test('unblocked, unknown, commerce, form, foreign and production requests never qualify',()=>{
 for(const change of [
  {blocked:false},{blocked:undefined},{action:null},{action:'contact_form'},{action:'checkout'},
  {path:'/staging/wp-admin/admin-post.php'},{path:'/staging/wp-json/ktk-storefront/v1/checkout'},
  {path:'/staging/wp-json/ktk-storefront/v1/ongoing-carts'},{path:'/wp-admin/admin-ajax.php'},
  {method:'GET'},{method:'DELETE'},{contentType:'application/json'},{origin:'https://example.invalid'},
 ])assert.equal(isBlockedOptimizerFeedback({...known,...change},base),false);
 for(const address of ['https://krawlthroughkrakow.com/store2/','https://example.invalid/staging/store2/','invalid']){
  assert.equal(isBlockedOptimizerFeedback(known,address),false);
 }
 assert.equal(isBlockedOptimizerFeedback(null,base),false);
});
