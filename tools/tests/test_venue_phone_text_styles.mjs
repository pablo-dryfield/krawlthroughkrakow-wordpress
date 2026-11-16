import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {buildVenuePhoneTextStyles,venuePhoneStyles} from '../venue-phone-text-styles.mjs';
const anchor='/* END Guide type and image geometry */\n';
async function temporary(run){const directory=await mkdtemp(path.join(tmpdir(),'ktk-venue-type-'));try{await run(path.join(directory,'runtime.css'));}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-venue-type-'));await rm(directory,{recursive:true,force:true});}}
test('generation retains every old stylesheet byte at its existing boundary and repeats without writes',async()=>temporary(async file=>{
 const source=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),base=source.replace(venuePhoneStyles,'');
 await writeFile(file,base);await buildVenuePhoneTextStyles(file);const once=await readFile(file,'utf8');assert.equal(once.replace(venuePhoneStyles,''),base);assert.equal(once,base.replace(anchor,anchor+venuePhoneStyles));await buildVenuePhoneTextStyles(file);assert.equal(await readFile(file,'utf8'),once);
}));
test('unknown boundaries and partial, duplicated, moved or changed prior output refuse atomically',async()=>temporary(async file=>{
 const base='/* previous */\n'+anchor+'/* following */\n',once=base.replace(anchor,anchor+venuePhoneStyles);
 for(const source of [base.replace(anchor,''),base+anchor,once.replace('/* END Reviewed venue phone text */','missing'),once+'/* BEGIN Reviewed venue phone text */',once.replace('font-size: 16px','font-size: 15px'),once.replace(anchor,anchor+'/* moved */\n')]){await writeFile(file,source);await assert.rejects(()=>buildVenuePhoneTextStyles(file));assert.equal(await readFile(file,'utf8'),source);}
}));
