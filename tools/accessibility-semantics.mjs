// Runs against the captured DOM during generation, not against live WordPress.
export function reviseAccessibilitySemantics({key}) {
 if(key==='post-hostel-hangover-cure')return [];
 const main=document.querySelector('#main-content');
 if(!main)throw Error(`${key}: main content required`);
 const evidence=[];
 if(!main.hasAttribute('role')){
  main.setAttribute('role','main');evidence.push({type:'main-landmark'});
 }
 if(!main.hasAttribute('tabindex'))main.tabIndex=-1;
 for(const header of main.querySelectorAll('header.ktk-archive-heading')){
  header.setAttribute('role','presentation');evidence.push({type:'archive-header-not-banner'});
 }
 for(const link of document.querySelectorAll('.et-social-icon > a.icon')){
  if(link.hasAttribute('aria-label'))continue;
  const label=link.querySelector('span')?.textContent.trim();
  if(!label)throw Error(`${key}: social link needs a reviewed source label`);
  link.setAttribute('aria-label',label);evidence.push({type:'social-link-name',label});
 }
 for(const image of document.querySelectorAll('.cont_TA img.TA_image:not([alt])')){
  if(!image.closest('.cont_TA').querySelector('.TA_H'))throw Error('Review image needs accompanying platform text');
  image.setAttribute('alt','');evidence.push({type:'decorative-review-thumbnail'});
 }
 if(key==='about-us')for(const [index,link] of [...main.querySelectorAll('.instagram_image > a')].entries()){
  if(!link.hasAttribute('aria-label')&&!link.textContent.trim()&&link.querySelector('img')?.getAttribute('alt')===''){
   if(!/^https:\/\/www\.instagram\.com\/p\/[\w-]+\//.test(link.getAttribute('href')||''))throw Error('Review changed Instagram destination');
   link.setAttribute('aria-label',`View Instagram post ${index+1}`);evidence.push({type:'instagram-post-link-name',post:index+1});
  }
 }
 for(const frame of main.querySelectorAll('iframe:not([title])')){
  const source=frame.getAttribute('src')||'';
  if(source.startsWith('https://www.google.com/maps/d/embed?')){
   frame.title='Krawl Through Krakow meeting point map';evidence.push({type:'map-frame-title'});
  }
 }
 for(const [index,field] of [...main.querySelectorAll('.et_pb_contact_captcha')].entries()){
  const question=field.closest('form')?.querySelector('.et_pb_contact_captcha_question');
  if(!question)throw Error(`${key}: captcha question required`);
  if(!question.id){
   const id=`ktk-captcha-question-${index}`;
   if(document.getElementById(id))throw Error(`${key}: captcha label ID collision`);
   question.id=id;
  }
  field.setAttribute('aria-labelledby',question.id);evidence.push({type:'captcha-question-label'});
 }
 return evidence;
}
