import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const iconFontFiles = {
 'parity/e5109a227107-modules.woff':'fe67b77ac7e0ef4b482dafb86adfa403db1b89a2f337d2dc8bd1278cfe975196',
 'parity/4ec95df48507-modules.ttf':'e157a805df2257515250ff4c91e5abde50f7e0d9634946878dbb132159e0e97e',
 'etmodules-full.woff2':'492ad8fed6d9b9c10e8e2f4c0f669c4930e807082594460a05ded9662eeecc2d',
};
const start='/* BEGIN homepage full icon font delivery */';
const end='/* END homepage full icon font delivery */';
const anchor='/* BEGIN shared content accessibility */';
export function homepageIconFontStyles(source,files){
 for(const [name,hash] of Object.entries(iconFontFiles)){
  if(!files[name]||createHash('sha256').update(files[name]).digest('hex')!==hash)throw Error('Review changed homepage font: '+name);
 }
 const block=`${start}\n@font-face {\n  font-family: "ETmodules";\n  font-style: normal;\n  font-weight: 400;\n  font-display: block;\n  src: url("etmodules-full.woff2") format("woff2"),\n    url("parity/e5109a227107-modules.woff") format("woff"),\n    url("parity/4ec95df48507-modules.ttf") format("truetype");\n}\n${end}`;
 const first=source.indexOf(start),last=source.indexOf(end);
 if((first<0)!==(last<0)||first>=0&&(last<first||source.indexOf(start,first+1)>=0||source.indexOf(end,last+1)>=0))throw Error('Ambiguous homepage font markers');
 const base=first>=0?source.slice(0,first)+source.slice(last+end.length).replace(/^\n\n/,''):source;
 const shared=base.indexOf(anchor),offer='/* BEGIN homepage offer clearance */',offerIndex=base.indexOf(offer);
 if(shared<0||base.indexOf(anchor,shared+1)>=0)throw Error('Expected homepage accessibility stylesheet anchor');
 if(offerIndex>=0&&(offerIndex>shared||base.indexOf(offer,offerIndex+1)>=0))throw Error('Ambiguous homepage offer anchor');
 const index=offerIndex>=0?offerIndex:shared;
 return base.slice(0,index)+block+'\n\n'+base.slice(index);
}
export async function buildHomepageIconFontStyles(assets){
 if(path.basename(assets)!=='ktk-homepage-assets')throw Error('Homepage-only icon font scope required');
 const files={};
 for(const name of Object.keys(iconFontFiles))files[name]=await readFile(path.join(assets,name));
 const file=path.join(assets,'parity-runtime.css'),source=await readFile(file,'utf8');
 await writeFile(file,homepageIconFontStyles(source,files));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 await buildHomepageIconFontStyles(path.resolve('staging/wp-content/mu-plugins/ktk-homepage-assets'));
}
