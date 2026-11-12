import {createRequire} from 'node:module';

const require=createRequire(new URL('../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const postcss=require('postcss');
const selectorParser=require('postcss-selector-parser');
const headingTags=new Set(['h1','h2','h3','h4','h5','h6','p']);

export function preserveHeadingSelector(selector) {
 if(selector.includes('data-ktk-heading-origin'))return selector;
 const ast=selectorParser().astSync(selector),tags=[];
 ast.walkTags(node=>{if(!node.namespace&&headingTags.has(node.value.toLowerCase()))tags.push(node);});
 for(const node of tags){
  const tag=node.value.toLowerCase();
  // The alias keeps the original type-selector specificity and responsive cascade.
  const alias=selectorParser().astSync(`:is(${tag}:where(:not([data-ktk-heading-origin])),:where([data-ktk-heading-origin="${tag}"]))`).first.first;
  alias.spaces={...node.spaces};node.replaceWith(alias);
 }
 return ast.toString();
}

export function preserveHeadingCss(css) {
 const root=postcss.parse(css);
 root.walkRules(rule=>{if(rule.selector)rule.selector=preserveHeadingSelector(rule.selector);});
 return root.toString();
}

// Runs only inside a parsed source DOM during a build, never on a live page.
export function reviseSemanticHeadings({key,kind,title,route,externalPrimary=false}) {
 const main=document.querySelector('#main-content');
 if(!main)throw new Error(`${key}: main content required for heading revision`);
 if(main.dataset.ktkSemanticHeadings==='1')return [];
 const evidence=[];
 const clean=value=>(value||'').replace(/\s+/g,' ').trim();
 const rename=(node,tag)=>{
  const original=node.tagName.toLowerCase();if(original===tag)return node;
  const replacement=document.createElement(tag);
  for(const attr of node.attributes)replacement.setAttribute(attr.name,attr.value);
  replacement.dataset.ktkHeadingOrigin=original;
  if(replacement.getAttribute('role')==='heading')replacement.removeAttribute('role');
  replacement.removeAttribute('aria-level');
  replacement.append(...node.childNodes);node.replaceWith(replacement);
  evidence.push({type:'heading-level',from:original,to:tag,text:clean(replacement.textContent),id:replacement.id});
  return replacement;
 };
 let primary=externalPrimary?null:main.querySelector('#ktk-hero-title,h1.entry-title,h1');
 const titleText={faqs:'Read our most Frequently Asked Questions','privacy-policy':'PRIVACY POLICY',
  'terms-and-conditions':'TERMS AND CONDITIONS','tour-service-disclaimer':'KRAWL THROUGH KRAKOW TOURS SERVICE DISCLAIMER'}[key];
 if(titleText){
  const titles=[...main.querySelectorAll('.et_pb_text_0 h2,.et_pb_text_0 p')].filter(node=>clean(node.textContent)===titleText);
  if(titles.length!==1)throw new Error(`${key}: review changed visible page title`);
  primary=rename(titles[0],'h1');
 }
 if(/^\/(?:category|tag|author)\//.test(route)){
  const area=main.querySelector('#left-area');if(!area)throw new Error(`${key}: archive list container required`);
  const label=title.split('|')[0].trim();if(!label)throw new Error(`${key}: archive title required`);
  const page=route.match(/\/page\/(\d+)\/$/)?.[1];
  const text=(route.startsWith('/author/')?'Articles by '+label:route.startsWith('/tag/')?label+' Articles':label)+(page?' - Page '+page:'');
  const header=document.createElement('header');header.className='ktk-archive-heading';
  primary=document.createElement('h1');primary.textContent=text;header.append(primary);area.prepend(header);
  evidence.push({type:'archive-heading',text});
 }else if(!primary&&!externalPrimary){
  if(key!=='post-krawl-through-krakow-winter-newsletter')throw new Error(`${key}: review missing primary heading`);
  const titles=[...main.querySelectorAll('h2')].filter(node=>clean(node.textContent)==='KTK Winter Newsletter');
  if(titles.length!==1)throw new Error('Review changed newsletter title');
  primary=rename(titles[0],'h1');
 }
 if(primary&&!clean(primary.textContent))throw new Error(`${key}: empty primary heading`);
 let previous=1;
 const levels={2:2};
 for(const original of [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]){
  if(original===primary)continue;
  const text=clean(original.textContent),source=Number(original.tagName.slice(1));
  if(!text||/^(?:\d[\d\s,.]*\s*(?:zl|zł|PLN|EUR)$|\+\d[\d\s()-]+$|All for only \d)/i.test(text)){
   rename(original,'p');continue;
  }
  let level;
  if(source<=2||original.closest('#sidebar,.footer-widget')){
   level=2;for(const rank of [3,4,5,6])delete levels[rank];
  }else{
   for(const rank of [3,4,5,6])if(rank>source)delete levels[rank];
   level=levels[source]??Math.min(source,previous+1);levels[source]=level;
  }
  rename(original,'h'+level);previous=level;
 }
 main.dataset.ktkSemanticHeadings='1';
 if(!externalPrimary&&document.querySelectorAll('h1').length!==1)throw new Error(`${key}: exactly one primary heading required`);
 return evidence;
}
