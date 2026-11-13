// Runs after the reviewed NYE content and semantic revisions, against the complete page DOM.
export function prepareNyePromotion({key,campaignFacts}){
 if(key!=='new-years-eve')return null;
 if(campaignFacts?.nyeDate!=='2026-12-31'||campaignFacts.nyePromotionEndsTimestamp!=='1798801200')throw Error('Owner-reviewed NYE promotion cutoff required');
 const main=document.querySelector('#main-content'),timers=main?.querySelectorAll('.et_pb_countdown_timer'),links=[...document.querySelectorAll('a[href]')].filter(a=>a.getAttribute('href')==='__KTK_HOME_URL__store2/nye-pub-crawl-32/#book');
 const prices=main?.querySelectorAll('.et_pb_heading_8 p[data-ktk-heading-origin="h1"]'),availability=[...main?.querySelectorAll('.et_pb_text_3 p')||[]].filter(p=>p.textContent.trim()==="Book online to reserve your place for New Year's Eve.");
 if(!main||main.hasAttribute('data-ktk-event-promotion')||timers.length!==1||links.length!==8||prices.length!==1||prices[0].textContent.trim()!=='All for only 250 PLN'||availability.length!==1||document.getElementById('nye-updates'))throw Error('Review changed NYE promotion targets before any mutation');
 const ends=campaignFacts.nyePromotionEndsTimestamp,replacements=[];
 const expiredDescription="New Year's Eve updates from Krawl Through Krakow. Next dates are to be announced; read about the previous 31 December 2026 event and contact our team.";
 const component=node=>{node.dataset.ktkEventPromotion='nye';node.dataset.ktkPromotionEnds=ends;node.dataset.ktkPromotionState='current';};
 component(main);
 main.dataset.ktkExpiredDescription=expiredDescription;
 main.dataset.ktkExpiredHeadline="New Year's Eve in Krakow";
 const template=document.createElement('template');template.dataset.ktkPromotionReplaces='.et_pb_countdown_timer';
 template.innerHTML='<aside id="nye-updates" class="ktk-nye-expiry-notice" aria-labelledby="ktk-nye-updates-title" tabindex="-1"><h2 id="ktk-nye-updates-title" data-ktk-promotion-primary="">New Year\'s Eve in Krakow</h2><p><strong>Next dates to be announced.</strong></p><p>This page describes our 31 December 2026 event. Details of the next event have not been confirmed.</p><p>Questions about an existing booking? <a href="__KTK_HOME_URL__contact/">Contact our local team</a>.</p></aside>';
 timers[0].before(template);
 const expiredNotice=document.createElement('div');expiredNotice.append(template.content.cloneNode(true));
 const primary=expiredNotice.querySelector('[data-ktk-promotion-primary]'),heading=document.createElement('h1');
 for(const attribute of primary.attributes)heading.setAttribute(attribute.name,attribute.value);
 heading.append(...primary.childNodes);primary.replaceWith(heading);
 replacements.push([template.outerHTML+timers[0].outerHTML,expiredNotice.innerHTML]);
 links.forEach((link,index)=>{
  link.dataset.ktkEventLink=String(index);link.dataset.ktkExpiredHref='__KTK_HOME_URL__new-years-eve/#nye-updates';
  if(link.textContent.trim())link.dataset.ktkExpiredLabel='NYE updates';else link.dataset.ktkExpiredAriaLabel='Read NYE updates';
  if(link.id==='ktk-cta')component(link);
  const expired=link.cloneNode(true);expired.setAttribute('href',expired.dataset.ktkExpiredHref);expired.removeAttribute('data-product-id');
  if(expired.dataset.ktkExpiredLabel)expired.textContent=expired.dataset.ktkExpiredLabel;
  if(expired.dataset.ktkExpiredAriaLabel)expired.setAttribute('aria-label',expired.dataset.ktkExpiredAriaLabel);
  if(expired.hasAttribute('data-ktk-promotion-state'))expired.dataset.ktkPromotionState='expired';
  replacements.push([link.outerHTML,expired.outerHTML]);
 });
 for(const [node,text]of[[prices[0],'Next event details to be announced'],[availability[0],'Next dates and booking details will be announced here.']]){
  node.dataset.ktkExpiredText=text;const expired=node.cloneNode(true);expired.textContent=text;replacements.push([node.outerHTML,expired.outerHTML]);
 }
 return {ends_at:Number(ends),event_date:campaignFacts.nyeDate,time_zone:'Europe/Warsaw',replacements,
  expired_description:expiredDescription};
}
