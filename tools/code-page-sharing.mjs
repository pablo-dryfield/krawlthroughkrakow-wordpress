import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const origin='https://krawlthroughkrakow.com';
const brand='Krawl Through Krakow';
const hold='/hostel-hangover-cure/';
const categories={'drinking-games':'Drinking Games','hen-do':'Hen do','krakow-guides':'Krakow Guides','krakow-nightlife':'Krak\u00f3w Nightlife','party-tips':'Party Tips','stag-do':'Stag do','uncategorized':'Uncategorized'};
const tags={'drinking-games':'Drinking Games','krakow-food':'Krakow Food','krakow-nightlife':'Krakow Nightlife','krakow-party':'Krakow Party','krakow':'Krakow','krawl-through-krakow':brand,'party-ideas':'party ideas','pub-crawl':'Pub Crawl','tips':'tips','to-do-list':'to do list','why-choose-us':'Why Choose Us'};
const authors={dpbowman:'DPBowman',jessie:'Jess Campbell',pubthroughkrakow:'pubthroughkrakow',thirsty:'Krusty'};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const routeCheck=route=>{if(typeof route!=='string'||!/^\/(?:[a-z0-9][a-z0-9-]*\/)+$/.test(route)||/^\/(?:staging|store2?|wp-admin|wp-json)\//.test(route))throw Error('Known content route required for sharing');};
const text=value=>{if(typeof value!=='string'||value!==value.trim()||/[<>\u0000-\u001f]/.test(value))throw Error('Plain metadata text required');return value;};
const escape=value=>text(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

export function codePageHeadDescription(route,capturedDescription){
 routeCheck(route);
 if(!/^\/(?:category|tag|author)\//.test(route))return capturedDescription;
 const match=route.match(/^\/(category|tag|author)\/([a-z0-9-]+)\/(?:page\/([2-9]|[1-9]\d+)\/)?$/);
 if(!match)throw Error('Unreviewed archive description route');
 const [,type,slug,page]=match,label={category:categories,tag:tags,author:authors}[type][slug];
 const sourceName={category:'Category',tag:'Tag',author:'Author'}[type];
 if(!label||capturedDescription!==sourceName+': <span>'+label+'</span>')throw Error('Archive description no longer matches reviewed identity');
 const copy=type==='author'?'Read articles by '+label+' in the '+brand+' blog archive.':type==='tag'?'Browse '+brand+' blog articles tagged "'+label+'".':'Browse the '+label+' category in the '+brand+' blog archive.';
 return copy+(page?' Page '+page+'.':'');
}

export function codePageTitle(route,capturedTitle){
 routeCheck(route);text(capturedTitle);
 const match=route.match(/^\/(category|tag|author)\/([a-z0-9-]+)\/(?:page\/([2-9]|[1-9]\d+)\/)?$/);
 if(!match){if(/^\/(?:category|tag|author)\//.test(route))throw Error('Unreviewed archive title route');return capturedTitle;}
 const [,type,slug,page]=match,labels={category:categories,tag:tags,author:authors},label=labels[type][slug];
 if(!label||capturedTitle!==label+' | '+brand)throw Error('Archive title no longer matches reviewed identity');
 const name=type==='author'?'Articles by '+label:type==='tag'?'Articles tagged '+label:label+' Articles';
 return name+(page?' - Page '+page:'')+' | '+brand;
}

export async function loadSharingImagePolicy({expectedManifestSha256,manifestFile='docs/code-pages/full-migration/assets.json',assetsDirectory='staging/wp-content/mu-plugins/ktk-code-pages-assets'}={}){
 const raw=await readFile(manifestFile);
 if(!/^[a-f0-9]{64}$/.test(expectedManifestSha256||'')||digest(raw)!==expectedManifestSha256)throw Error('Sharing images need the exact reviewed manifest');
 const manifest=JSON.parse(raw),cache=new Map();
 return async image=>{
  if(!image)return null;
  if(!/^__KTK_PAGE_ASSETS__media\/[a-f0-9]{12}-[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)$/i.test(image.src||'')||!image.alt)return null;
  text(image.alt);
  const relative=image.src.replace('__KTK_PAGE_ASSETS__',''),matches=Object.values(manifest).filter(row=>row.file===relative);
  if(matches.length!==1)throw Error('Sharing image identity is missing or ambiguous');
  const root=path.resolve(assetsDirectory),file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep))throw Error('Sharing image escapes owned assets');
  if(!cache.has(relative)){
   const bytes=await readFile(file);
   if(digest(bytes)!==matches[0].sha256)throw Error('Sharing image bytes changed');
   const size=JSON.parse(execFileSync('php',['-r',"$s=getimagesize($argv[1]); if(!$s){exit(1);} echo json_encode(array('width'=>$s[0],'height'=>$s[1],'mime'=>$s['mime']));",file],{encoding:'utf8',maxBuffer:4096}));
   if(!['image/jpeg','image/png','image/webp'].includes(size.mime)||!Number.isSafeInteger(size.width)||!Number.isSafeInteger(size.height)||size.width<1||size.height<1)throw Error('Real supported image dimensions required');
   cache.set(relative,{file:relative,...size,bytes:bytes.length,sha256:matches[0].sha256});
  }
  return {...cache.get(relative),alt:image.alt};
 };
}

export function buildCodePageSharing({route,kind,title,description,inherited='',image=null}){
 routeCheck(route);
 if(route===hold)return inherited;
 if(inherited!=='')throw Error('Unexpected inherited metadata requires review before replacement');
 if(!text(title))throw Error('Nonempty sharing title required');text(description);
 const fields=[['property','og:type',kind==='blog post'?'article':'website'],['property','og:site_name',brand],['property','og:title',title],['property','og:url',origin+route]];
 if(description)fields.push(['property','og:description',description]);
 const usable=image&&image.width>=144&&image.height>=144&&image.bytes<=5*1024*1024;
 if(usable){
  if(!/^media\/[a-f0-9]{12}-[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)$/i.test(image.file)||!Number.isSafeInteger(image.width)||!Number.isSafeInteger(image.height)||!Number.isSafeInteger(image.bytes)||image.bytes<1||!/^image\/(?:jpeg|png|webp)$/.test(image.mime)||!text(image.alt))throw Error('Validated actual sharing image required');
  const url=origin+'/wp-content/mu-plugins/ktk-code-pages-assets/'+image.file;
  fields.push(['property','og:image',url],['property','og:image:width',String(image.width)],['property','og:image:height',String(image.height)],['property','og:image:type',image.mime],['property','og:image:alt',image.alt],['name','twitter:image',url],['name','twitter:image:alt',image.alt]);
 }
 const large=usable&&image.width>=300&&image.height>=157&&image.width/image.height>=1.5;
 fields.push(['name','twitter:card',large?'summary_large_image':'summary'],['name','twitter:title',title]);
 if(description)fields.push(['name','twitter:description',description]);
 return fields.map(([attribute,key,value])=>'<meta '+attribute+'="'+key+'" content="'+escape(value)+'">').join('\n');
}
