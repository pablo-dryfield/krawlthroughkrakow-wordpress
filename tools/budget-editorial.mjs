import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const key='post-wheres-the-cheap-places-to-drink-in-krakow';
const sourceSha256='b8b4c727c03826406a45676f62861ffbc3c02549e9bfc7c3e106cde983cf982f';
export async function loadBudgetEditorial() {
 const source=await readFile(new URL('../docs/code-pages/full-migration/captures/post-wheres-the-cheap-places-to-drink-in-krakow/production-1920.html',import.meta.url));
 if(createHash('sha256').update(source).digest('hex')!==sourceSha256)throw Error('Review changed budget-guide capture before applying the revision');
 return {key,sourceSha256,reviewedOn:'2026-11-13',markup:await readFile(new URL('./content/budget-drinks.html',import.meta.url),'utf8')};
}

// Build-time only: one reviewed article module, original history and assets retained.
export function reviseBudgetEditorial({key,revision}) {
 if(key!=='post-wheres-the-cheap-places-to-drink-in-krakow')return [];
 if(revision?.key!==key||revision.sourceSha256!=='b8b4c727c03826406a45676f62861ffbc3c02549e9bfc7c3e106cde983cf982f'||revision.reviewedOn!=='2026-11-13')throw Error('Reviewed budget-guide source identity required');
 const main=document.querySelector('#main-content');if(!main)throw Error('Budget-guide main content required');
 const targets=main.querySelectorAll('.et_pb_text_0 .et_pb_text_inner');
 if(targets.length!==1)throw Error('Expected one original budget-guide text module');
 const target=targets[0],source=document.createElement('template');source.innerHTML=revision.markup;
 const allowedTags=new Set(['P','H2','H3','UL','LI','A','STRONG','TIME','SMALL','SPAN','TEMPLATE']);
 const ids=new Set(['main-toc','divebarsinkrakow','banilukapopularamongsportsenthusiastswithbigscreensforgames','pubpropagandaagrungyspotperfectforbudgetfriendlydrinks','freepubanotheroptionforcheapdrinkswhileminglingwithfellowtravellers','pijalniawodkiipiwachainyourgotoforaffordablebooze','banialukaahavenfornightowlsandearlybirdsalike','budgetfriendlydrinkingspotsinjewishquarter','ulicakrokodylibarandcafe','duffysirishbar','historicbarmlecznyestablishments','faqsinrelationtowheresthecheapplacestodrinkinkrakow','arethereanyhappyhourspecialsatpubsandbarsinkrakow','wherecanifindthecheapestbeerinkrakow','arethereanystudentdiscountsavailableondrinksinkrakow','conclusion']);
 const candidateIds=new Set([...ids,'oldsmobil-cocktail-examples','chicas-krakow-menus','compare-drink-prices']);
 const allowedLinks=new Set(['https://banialuka.com/index.php/home/','https://banialuka.com/index.php/menu/','https://oldsmobilpub.pl/contact/','https://oldsmobilpub.pl/menu/','https://www.chicasgorillas.pl/menu','__KTK_HOME_URL__krakow-nightlife/','__KTK_HOME_URL__store2/pub-crawl-28/#book',...[...candidateIds].map(id=>'#'+id)]);
 for(const node of source.content.querySelectorAll('*')){
  if(!allowedTags.has(node.tagName))throw Error('Unexpected budget-guide element');
  const attributes=node.tagName==='A'?['href']:node.tagName==='TIME'?['datetime']:node.tagName==='TEMPLATE'?['data-ktk-original-photo']:['H2','H3','P','SPAN'].includes(node.tagName)?['id']:[];
  if([...node.attributes].some(attr=>!attributes.includes(attr.name)))throw Error('Unexpected budget-guide attribute');
  if(node.tagName==='A'&&(!allowedLinks.has(node.getAttribute('href'))||!node.textContent.trim()))throw Error('Unreviewed budget-guide destination');
  if(node.tagName==='TIME'&&(node.getAttribute('datetime')!==revision.reviewedOn||!node.textContent.trim()))throw Error('Changed budget-guide review date');
 }
 const newIds=[...source.content.querySelectorAll('[id]')].map(node=>node.id);
 if(newIds.length!==candidateIds.size||new Set(newIds).size!==candidateIds.size||newIds.some(id=>!candidateIds.has(id)))throw Error('Preserve every original budget-guide heading fragment and only reviewed additions exactly once');
 const slots=source.content.querySelectorAll('template');
 if(slots.length!==1||slots[0].dataset.ktkOriginalPhoto!=='4'||slots[0].innerHTML.trim())throw Error('Only the reviewed original Banialuka photo slot is allowed');
 let originalPhoto;
 if(target.dataset.ktkEditorialReview){
  if(target.dataset.ktkEditorialReview!==revision.reviewedOn)throw Error('Changed existing budget-guide revision');
  const photos=[...target.querySelectorAll('img')].filter(node=>!node.closest('noscript'));if(photos.length!==1)throw Error('Unexpected reviewed budget-guide photo count');
  originalPhoto=photos[0];
 }else{
  if(target.querySelector('form,input,iframe,video,script')||!target.textContent.replace(/\s+/g,' ').trim().startsWith('For those seeking cheap places to drink in Krakow'))throw Error('Review changed original budget-guide body');
  const oldIds=[...target.querySelectorAll('h2[id],h3[id],h4[id]')].map(node=>node.id),photos=[...target.querySelectorAll('img')].filter(node=>!node.closest('noscript'));
  const auxiliary=new Map([...ids].filter(id=>id!=='main-toc').map(id=>[id+'-toc',1]));
  auxiliary.set('isPasted',7);auxiliary.set('649572abe76e6_70523',1);auxiliary.set('649572abe76ea_70523',3);
  const actualAuxiliary=new Map();
  for(const node of target.querySelectorAll('[id]:not(h2):not(h3):not(h4)'))actualAuxiliary.set(node.id,(actualAuxiliary.get(node.id)||0)+1);
  if(oldIds.length!==ids.size||new Set(oldIds).size!==ids.size||oldIds.some(id=>!ids.has(id))||photos.length!==9||actualAuxiliary.size!==auxiliary.size||[...auxiliary].some(([id,count])=>actualAuxiliary.get(id)!==count))throw Error('Review changed original budget-guide heading fragments, known paste/navigation IDs or photos');
  originalPhoto=photos[4];
 }
 const photoSource=originalPhoto.getAttribute('data-lazy-src')||originalPhoto.getAttribute('src');
 const photoWrapper=originalPhoto.parentElement.cloneNode(true);photoWrapper.querySelectorAll('noscript').forEach(node=>node.remove());
 if(!['__KTK_PAGE_ASSETS__media/f4ea622b0d0b-1684562704_1684562701337.png','https://app.contentatscale.ai/uploader/uploads/2023/05/1684562704_1684562701337.png'].includes(photoSource)||photoWrapper.tagName!=='P'||photoWrapper.textContent.trim()||photoWrapper.children.length!==1||photoWrapper.firstElementChild.tagName!=='IMG')throw Error('Review changed original Banialuka photo identity');
 slots[0].replaceWith(photoWrapper);
 const expected=source.innerHTML;
 if(target.dataset.ktkEditorialReview){if(target.innerHTML!==expected)throw Error('Changed existing reviewed budget-guide content');return [];}
 target.innerHTML=expected;target.dataset.ktkEditorialReview=revision.reviewedOn;
 return [{type:'reviewed-budget-guide',reviewedOn:revision.reviewedOn,retainedOriginalPhotos:[4],removedBodyPhotos:8,preservedFragmentIds:newIds}];
}
