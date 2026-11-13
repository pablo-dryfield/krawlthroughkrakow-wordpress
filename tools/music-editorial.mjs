import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadMusicEditorial(){
 const profiles=[
  ['post-jazz-bars-in-krakow','64a6ab3ac4e3b25e71f6d97f1aafdb90b64e2760d5b116454e35f1b04ecebb1c','jazz-guide.html'],
  ['post-krakow-live-music','1a28337151e3dd74645f69bb662bc3bddaa59ba41abe0c5f587d4a2e95f9a468','live-music-guide.html']
 ];
 const result=[];
 for(const [key,sourceSha256,file] of profiles){
  const bytes=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url));
  if(createHash('sha256').update(bytes).digest('hex')!==sourceSha256)throw Error('Review changed music-guide capture before refreshing it');
  result.push({key,sourceSha256,reviewedOn:'2026-11-13',version:'2026-11-13.music-1',markup:await readFile(new URL('./content/'+file,import.meta.url),'utf8')});
 }
 return result;
}

// Two reviewed article bodies only; original files/history and meaningful fragments remain.
export function reviseMusicEditorial({key,revision}){
 if(!['post-jazz-bars-in-krakow','post-krakow-live-music'].includes(key))return [];
 const jazz=key==='post-jazz-bars-in-krakow';
 const sourceSha256=jazz?'64a6ab3ac4e3b25e71f6d97f1aafdb90b64e2760d5b116454e35f1b04ecebb1c':'1a28337151e3dd74645f69bb662bc3bddaa59ba41abe0c5f587d4a2e95f9a468';
 if(revision?.key!==key||revision.sourceSha256!==sourceSha256||revision.reviewedOn!=='2026-11-13'||revision.version!=='2026-11-13.music-1'||typeof revision.markup!=='string')throw Error('Reviewed music-guide source identity required');
 const main=document.querySelector('#main-content'),bodies=main?.querySelectorAll('.entry-content');
 const title=jazz?'Jazz Bars in Krakow: Experience Vibrant Nightlife & Charm':'Krakow Live Music: Explore Top Venues & Unforgettable Nights';
 if(bodies?.length!==1||main.querySelector('h1.entry-title')?.textContent.trim()!==title||main.querySelector('.published')?.textContent.trim()!==(jazz?'Jul 18, 2023':'Jul 13, 2023'))throw Error('Review changed music-guide publication identity');
 const body=bodies[0],current=body.dataset.ktkMusicReview;
 if(current&&current!==revision.version)throw Error('Unknown existing music revision');
 const ids=(jazz?'main-toc|legendaryjazzbarsinkrakow|harrispianojazzbarthebirthplaceofpolishjazz|piecartacousticjazzclubacozyhavenformusiclovers|upscaleandstylishvenues|thepianorougevaultedceilingsandcontemporarydesignelements|jazzbarsinkrakow|alchemiajazzclubalegendaryvenue|umuniakaajazzinstitution|alternativevenuesforanunconventionalnightout|hevrebaramprestauranthistoriccharmmeetscontemporarystyle|faqsinrelationtojazzbarsinkrakow|whatisajazzbar|whatiskrakowfamousfor|conclusion':'main-toc|jazzclubsinkrakow|hardrockcafeaglobalbrandwithanimpressivelineupoflivejazzperformances|harrispianojazzbarenjoysmoothtuneswhilesippingonsignaturecocktails|piecartacousticjazzclubdiscoverthishiddengemtuckedawayfromthebustlingstreets|historiclivemusicvenues|piwnicapodbaranami|thepianorougerestaurantwinebar|livemusiclocationsforaclassynightout|umuniakajazzclubahighenddestinationforjazzenthusiasts|fortykleparztwinbarsfeaturingeclectickrakowlivemusicacts|conclusion').split('|');
 const allowedIds=new Set(ids),template=document.createElement('template');template.innerHTML=revision.markup;
 const links=new Set(['https://harris.krakow.pl/o-nas/','https://www.piecart.pl/?lang=pl','https://jazzumuniaka.club/','https://jazzumuniaka.club/regulamin/','https://www.thepianorouge.com.pl/en/home-page/','https://alchemia.com.pl/kontakt/','https://alchemia.com.pl/program/','https://www.hevre.pl/','https://cafe.hardrock.com/krakow/','https://cafe.hardrock.com/krakow/event-calendar.aspx','https://piwnicapodbaranami.pl/','https://piwnicapodbaranami.pl/nowo%C5%9Bci','https://fortykleparz.pl/music-club/','__KTK_HOME_URL__jazz-bars-in-krakow/','__KTK_HOME_URL__krakow-live-music/','__KTK_HOME_URL__krakow-nightlife/','__KTK_HOME_URL__store2/pub-crawl-28/#book',...ids.map(id=>'#'+id)]);
 for(const node of template.content.querySelectorAll('*')){
  if(!['P','H2','H3','UL','LI','A','STRONG','TIME','TEMPLATE'].includes(node.tagName))throw Error('Unexpected music-guide element');
  const attributes=node.tagName==='A'?['href']:node.tagName==='TIME'?['datetime']:node.tagName==='TEMPLATE'?['data-ktk-original-photo']:['H2','H3'].includes(node.tagName)?['id']:[];
  if([...node.attributes].some(attr=>!attributes.includes(attr.name)))throw Error('Unexpected music-guide attribute');
  if(node.tagName==='A'&&(!links.has(node.getAttribute('href'))||!node.textContent.trim()))throw Error('Unreviewed music-guide destination');
  if(node.tagName==='TIME'&&(node.getAttribute('datetime')!==revision.reviewedOn||!node.textContent.trim()))throw Error('Changed music review date');
 }
 const nextIds=[...template.content.querySelectorAll('[id]')].map(node=>node.id);
 if(nextIds.length!==ids.length||new Set(nextIds).size!==ids.length||nextIds.some(id=>!allowedIds.has(id)))throw Error('Preserve original music section fragments exactly once');
 if(template.content.querySelectorAll('time').length!==1)throw Error('One visible music review date required');
 const slots=template.content.querySelectorAll('template'),index=jazz?0:1;
 if(slots.length!==1||slots[0].dataset.ktkOriginalPhoto!==String(index)||slots[0].innerHTML.trim())throw Error('Only the reviewed original music photograph slot is allowed');
 const photos=[...body.querySelectorAll('img')].filter(node=>!node.closest('noscript'));
 if(photos.length!==(current?1:jazz?6:7))throw Error('Review changed original music photograph count');
 if(!current){
  const actualIds=[...body.querySelectorAll('[id]')].map(node=>node.id),counts=new Map();
  for(const id of actualIds)counts.set(id,(counts.get(id)||0)+1);
  const expected=new Map(ids.map(id=>[id,1]));
  if(!jazz){for(const id of ids.filter(id=>id!=='main-toc'))expected.set(id+'-toc',1);expected.set('64941e1890a1c_58150',1);expected.set('64941e1890a1f_58150',3);}
  if(counts.size!==expected.size||[...expected].some(([id,count])=>counts.get(id)!==count))throw Error('Review changed original music fragments or known navigation markers');
  const intro=jazz?'When it comes to jazz bars in Krakow':'As a city steeped in rich cultural history';
  if(![...body.querySelectorAll('p')].some(node=>node.textContent.trim().startsWith(intro))||body.querySelector('form,iframe,video,script'))throw Error('Review changed original music body');
 }
 const photo=photos[current?0:index],src=photo.getAttribute('data-lazy-src')||photo.getAttribute('src');
 const name=jazz?'1683868105_1683868101952.png':'1684926401_1684926398108.png',hash=jazz?'3ba6b2583586':'f7a107de5f06';
 const wrapper=photo.parentElement.cloneNode(true);wrapper.querySelectorAll('noscript').forEach(node=>node.remove());
 if(!['__KTK_PAGE_ASSETS__media/'+hash+'-'+name,'https://app.contentatscale.ai/uploader/uploads/2023/05/'+name].includes(src)||wrapper.tagName!=='P'||wrapper.textContent.trim()||wrapper.children.length!==1||wrapper.firstElementChild.tagName!=='IMG')throw Error('Review changed retained music photograph identity');
 slots[0].replaceWith(wrapper);
 if(current){if(body.innerHTML!==template.innerHTML)throw Error('Changed reviewed music-guide content');return [];}
 body.innerHTML=template.innerHTML;body.dataset.ktkMusicReview=revision.version;
 return [{type:'reviewed-music-guide',reviewedOn:revision.reviewedOn,retainedOriginalPhotos:[index],removedBodyPhotos:jazz?5:6,preservedFragments:ids}];
}
