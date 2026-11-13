import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const recipes=[
 ['post-krakow-techno-clubs','532a684966644f496c0c18bb1d98149fc63b02387c6d4d3524697aa59d28f4f8','techno-venues.html'],
 ['post-krakow-techno-clubs-2','f15d17f73a7a0eb1ecdc8d990ce33d0bb8ca08ef125a48f834c860290f424858','techno-planning.html'],
 ['post-irish-bars-krakow','912da7b58319f6604628955e340a3c9c2053a54f2772609bb72962cd863793bf','irish-bars.html'],
 ['post-krakow-nightclubs','cfd21f8d25c1a743e13ff31825781c7fd8ccd49f84df960e0031eded4796a653','nightclubs.html'],
 ['post-krakow-bars-jewish-quarter','f7d14c70bb8661a2afb59d3b5aa7a3e2ab4583e6be69b170022052216aa34726','kazimierz-bars.html'],
 ['post-krakow-shot-bar','1c5be0d915484714b44d92bdcaa41280769782dd54f3c9c4180569a268991517','shot-bars.html']
];

export async function loadVenueEditorial(){
 const revisions=[];
 for(const [key,sourceSha256,file] of recipes){
  const bytes=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url));
  if(createHash('sha256').update(bytes).digest('hex')!==sourceSha256)throw Error('Review changed venue-guide capture before refreshing it');
  revisions.push({key,sourceSha256,sourceHtml:bytes.toString('utf8'),reviewedOn:'2026-11-13',version:'2026-11-13.venues-1',markup:await readFile(new URL('./content/'+file,import.meta.url),'utf8')});
 }
 return revisions;
}

// Build-time only: retain the source scaffold and meaningful fragments, not stale claims.
export function reviseVenueEditorial({key,revision}){
 const expected={
  'post-krakow-techno-clubs':['532a684966644f496c0c18bb1d98149fc63b02387c6d4d3524697aa59d28f4f8',[0]],
  'post-krakow-techno-clubs-2':['f15d17f73a7a0eb1ecdc8d990ce33d0bb8ca08ef125a48f834c860290f424858',[0]],
  'post-irish-bars-krakow':['912da7b58319f6604628955e340a3c9c2053a54f2772609bb72962cd863793bf',[0]],
  'post-krakow-nightclubs':['cfd21f8d25c1a743e13ff31825781c7fd8ccd49f84df960e0031eded4796a653',[2]],
  'post-krakow-bars-jewish-quarter':['f7d14c70bb8661a2afb59d3b5aa7a3e2ab4583e6be69b170022052216aa34726',[1,8]],
  'post-krakow-shot-bar':['1c5be0d915484714b44d92bdcaa41280769782dd54f3c9c4180569a268991517',[4]]
 };
 if(!Object.hasOwn(expected,key))return [];
 const [hash,indices]=expected[key];
 if(revision?.key!==key||revision.sourceSha256!==hash||revision.reviewedOn!=='2026-11-13'||revision.version!=='2026-11-13.venues-1'||typeof revision.sourceHtml!=='string'||typeof revision.markup!=='string')throw Error('Reviewed venue-guide source identity required');
 const source=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),main=document.querySelector('#main-content'),originalMain=source.querySelector('#main-content');
 const clean=s=>(s||'').replace(/\s+/g,' ').trim();
 for(const selector of ['h1.entry-title','.published']){
  if(main?.querySelectorAll(selector).length!==1||originalMain?.querySelectorAll(selector).length!==1||clean(main.querySelector(selector).textContent)!==clean(originalMain.querySelector(selector).textContent))throw Error('Review changed venue publication identity');
 }
 const selector=key==='post-krakow-nightclubs'?'.entry-content .et_pb_text_0 .et_pb_text_inner':'.entry-content';
 if(main.querySelectorAll(selector).length!==1||originalMain.querySelectorAll(selector).length!==1)throw Error('One original venue text module required');
 const body=main.querySelector(selector),original=originalMain.querySelector(selector),current=body.dataset.ktkVenueReview;
 if(current&&current!==revision.version)throw Error('Unknown existing venue revision');
 const ids=node=>[...node.querySelectorAll('[id]')].map(n=>n.id),counts=list=>JSON.stringify([...list.reduce((m,id)=>m.set(id,(m.get(id)||0)+1),new Map())].sort((a,b)=>a[0].localeCompare(b[0])));
 const originalIds=ids(original),meaningful=originalIds.filter(id=>id==='main-toc'||(!id.endsWith('-toc')&&!/^649[0-9a-f]+_\d+$/.test(id)&&id!=='isPasted'));
 if(new Set(meaningful).size!==meaningful.length)throw Error('Review unexpected duplicate source fragments');
 if(!current&&(counts(ids(body))!==counts(originalIds)||clean(body.querySelector('p')?.textContent)!==clean(original.querySelector('p')?.textContent)))throw Error('Review changed original venue text or fragments');
 if(body.querySelector('form,iframe,video,script')||original.querySelector('form,iframe,video'))throw Error('Unexpected venue media/form contract');
 const template=document.createElement('template');template.innerHTML=revision.markup;
 const links=new Set([
  'https://www.prozakclub.com/','https://www.facebook.com/szpitalna1/','https://www.facebook.com/stolarska5','https://www.facebook.com/klubpocztaglowna','https://www.facebook.com/addnocekkrk','https://www.facebook.com/mashroomclub','https://www.facebook.com/roofpartykrk',
  'https://www.unsound.pl/en/2026/warszawa-krakow','https://www.unsound.pl/en/2026/warszawa-krakow/terms-and-conditions','https://shape-platform.eu/artist/olivia/','https://krakowlovesadana.bandcamp.com/','https://www.catzndogz.pl/','https://marcinczubala.bandcamp.com/',
  'https://www.facebook.com/DUFFYSIRISHBAR','https://podpapugami.krakow.pl/kontakt/','https://podpapugami.krakow.pl/','https://www.ronniedrews.pl/','https://krakow.shineclub.com.pl/kontakt/','https://krakow.shineclub.com.pl/o-klubie/','https://cococlub.pl/en/',
  'https://galiciajewishmuseum.org/en/visit/city-tours/','https://galiciajewishmuseum.org/en/museum/','https://eszeweria-krakow.pl/','https://www.pubpropaganda.eu/English','https://www.instagram.com/kochanka_folk_shotbar/','https://www.hevre.pl/',
  'https://szotobar.pl/','https://wodkabar.pl/','https://www.facebook.com/shotbarbangbang','https://www.facebook.com/AmbasadaSledzia/','https://www.instagram.com/cosmic_minigolf_pub/','https://banialuka.com/','https://pwip.com.pl/lokale/',
  'https://www.gov.uk/foreign-travel-advice/poland/safety-and-security','https://www.gov.pl/web/mswia-en/emergency-number-112','https://ztp.krakow.pl/en/kmk-public-transport/kmk-timetables','https://ztp.krakow.pl/en/kmk-public-transport/kmk-ticket-guide',
  ...['krakow-techno-clubs','krakow-techno-clubs-2','krakow-nightlife','krakow-live-music','jazz-bars-in-krakow','krakow-bars-jewish-quarter','irish-bars-krakow','wheres-the-cheap-places-to-drink-in-krakow'].map(slug=>'__KTK_HOME_URL__'+slug+'/'),
  '__KTK_HOME_URL__store2/pub-crawl-28/#book',...meaningful.map(id=>'#'+id)
 ]);
 for(const node of template.content.querySelectorAll('*')){
  if(!['P','H2','H3','UL','LI','A','STRONG','TIME','TEMPLATE','TABLE','CAPTION','THEAD','TBODY','TR','TH','TD'].includes(node.tagName))throw Error('Unexpected venue-guide element');
  const attrs=node.tagName==='A'?['href']:node.tagName==='TIME'?['datetime']:node.tagName==='TEMPLATE'?['data-ktk-original-photo']:node.tagName==='TABLE'?['class']:node.tagName==='TH'?['scope']:['H2','H3'].includes(node.tagName)?['id']:[];
  if([...node.attributes].some(a=>!attrs.includes(a.name)))throw Error('Unexpected venue-guide attribute');
  if(node.tagName==='A'&&(!links.has(node.getAttribute('href'))||!clean(node.textContent)))throw Error('Unreviewed venue-guide destination');
  if(node.tagName==='TH'&&!['row','col'].includes(node.getAttribute('scope')))throw Error('Venue table headers require scope');
  if(node.tagName==='TABLE'&&node.className!=='ktk-venue-comparison')throw Error('Only reviewed venue comparison tables allowed');
 }
 if(counts(ids(template.content))!==counts(meaningful))throw Error('Preserve meaningful venue fragments exactly once');
 const dates=template.content.querySelectorAll('time');
 if(dates.length!==1||dates[0].getAttribute('datetime')!==revision.reviewedOn||dates[0].textContent!=='13 November 2026')throw Error('One actual venue source review date required');
 const tables=template.content.querySelectorAll('table');
 if(tables.length!==1||tables[0].querySelectorAll('caption').length!==1||tables[0].querySelectorAll('thead th[scope="col"]').length!==2||[...tables[0].querySelectorAll('tbody tr')].some(row=>row.children.length!==2||row.querySelectorAll('th[scope="row"]').length!==1))throw Error('Reviewed two-column venue table required');
 const slots=[...template.content.querySelectorAll('template')];
 if(slots.length!==indices.length||slots.some((node,i)=>node.dataset.ktkOriginalPhoto!==String(indices[i])||node.innerHTML.trim()))throw Error('Only reviewed original venue photo slots allowed');
 const photos=node=>[...node.querySelectorAll('img')].filter(n=>!n.closest('noscript'));
 const originalPhotos=photos(original),actualPhotos=photos(body);
 if(actualPhotos.length!==(current?indices.length:originalPhotos.length))throw Error('Review changed venue photograph count');
 const replacements=indices.map((index,i)=>{
  const photo=actualPhotos[current?i:index],reference=originalPhotos[index];
  const src=n=>n?.getAttribute('data-lazy-src')||n?.getAttribute('src');
  const originalSrc=src(reference),actualSrc=src(photo),name=originalSrc?new URL(originalSrc,'https://krawlthroughkrakow.com/').pathname.split('/').pop():'';
  const portable=actualSrc?.startsWith('__KTK_PAGE_ASSETS__media/')?actualSrc.slice('__KTK_PAGE_ASSETS__media/'.length):'';
  const exact=actualSrc===originalSrc||(/^[0-9a-f]{12}-/.test(portable)&&portable.slice(13)===name);
  if(!photo||!reference||!name||!exact)throw Error('Review changed retained venue photograph identity');
  const wrapper=photo.parentElement.cloneNode(true);wrapper.querySelectorAll('noscript').forEach(n=>n.remove());
  if(wrapper.tagName!=='P'||wrapper.textContent.trim()||wrapper.children.length!==1||wrapper.firstElementChild.tagName!=='IMG')throw Error('Review changed original venue photo wrapper');
  return wrapper;
 });
 slots.forEach((slot,i)=>slot.replaceWith(replacements[i]));
 if(current){if(body.innerHTML!==template.innerHTML)throw Error('Changed reviewed venue-guide content');return [];}
 body.innerHTML=template.innerHTML;body.dataset.ktkVenueReview=revision.version;
 return [{type:'reviewed-venue-guide',reviewedOn:revision.reviewedOn,preservedFragments:meaningful,retainedOriginalPhotos:indices,removedBodyPhotos:originalPhotos.length-indices.length}];
}
