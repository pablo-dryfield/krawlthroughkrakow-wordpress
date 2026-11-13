// Executed in a parsed source DOM. Keep captures immutable and assert every edited source contract.
export function reviseCodePageContent({key,reviewCounts,campaignFacts}) {
 const root=document.querySelector('#main-content');
 const evidence=[];
 const one=selector=>{const matches=root.querySelectorAll(selector);if(matches.length!==1)throw new Error(`${key}: expected one ${selector}, found ${matches.length}`);return matches[0];};
 const replace=(selector,from,to)=>{
  const node=one(selector),walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let count=0,current;
  while((current=walker.nextNode()))if(current.textContent.includes(from)){count+=current.textContent.split(from).length-1;current.textContent=current.textContent.replaceAll(from,to);}
  if(count!==1)throw new Error(`${key}: expected one text revision: ${from}, found ${count}`);
  evidence.push({type:'text',selector,from,to});
 };
 if(key==='new-years-eve'){
  if(!campaignFacts||campaignFacts.nyeDate!=='2026-12-31'||campaignFacts.nyeProductId!==32||campaignFacts.nyeSlug!=='nye-pub-crawl-32')throw new Error('Reviewed shared NYE campaign facts required');
  const bookingLinks=[...root.querySelectorAll('a[href]')].filter(a=>a.getAttribute('href').startsWith('https://fareharbor.com/embeds/book/krawlthroughkrakow/'));
  if(![6,7].includes(bookingLinks.length))throw new Error('Review changed NYE booking controls');
  bookingLinks.forEach(a=>a.setAttribute('href','__KTK_HOME_URL__store2/'+campaignFacts.nyeSlug+'/#book'));
  evidence.push({type:'nye-booking-links',count:bookingLinks.length,product:32});
  replace('.et_pb_countdown_timer .title','Krakow New Years Eve Party 2025 / 2026','Krakow New Years Eve Party '+campaignFacts.nyeYear+' / '+campaignFacts.welcomeYear);
  const countdown=one('.et_pb_countdown_timer');
  if(countdown.dataset.endTimestamp!=='1767222000')throw new Error('Review changed NYE countdown source');
  countdown.dataset.endTimestamp=campaignFacts.midnightTimestamp;
  countdown.dataset.eventDate=campaignFacts.nyeDate;
  countdown.dataset.eventTimezone='Europe/Warsaw';
  evidence.push({type:'countdown',date:campaignFacts.midnight});
  replace('.et_pb_text_0 .et_pb_text_inner','start to 2026.','start to '+campaignFacts.welcomeYear+'.');
  replace('.et_pb_text_3 .et_pb_text_inner','Beginning 2026','Beginning '+campaignFacts.welcomeYear);
  replace('.et_pb_text_3 .et_pb_text_inner','venues. The celebrations kick off at 5 pm and 7:30 PM (depending the group you choose),','The celebrations start at '+campaignFacts.nyeEarly+' or '+campaignFacts.nyeLate+', depending on the group you choose,');
  replace('.et_pb_heading_8 h1','All for only 250 zl or just 59 euro','All for only 250 PLN');
  replace('.et_pb_heading_4 h1','VIP Entrance and Welcome Shots','Photos from previous NYE events');
  for(const [selector,time] of [['.et_pb_text_1 .et_pb_text_inner',campaignFacts.nyeEarly],['.et_pb_text_2 .et_pb_text_inner',campaignFacts.nyeLate]]){
   const itinerary=one(selector);
   if(!itinerary.textContent.includes('Choice Music Club'))throw new Error('Review changed original NYE itinerary');
   const entries=[['Start time: ',time],['Meeting point: ','TBA'],['Venue itinerary: ','To be confirmed'],['Midnight: ','Celebrate in the club or at Market Square, with re-entry using your wristband.']];
   itinerary.replaceChildren(...entries.map(([label,text])=>{const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label;p.append(strong,document.createTextNode(text));return p;}));
   evidence.push({type:'itinerary',selector,time,meetingPoint:'TBA'});
  }
  const details=one('.et_pb_text_3 .et_pb_text_inner');
  const limited=[...details.querySelectorAll('p')].filter(p=>p.textContent.includes('We have LIMITED places left'));
  if(limited.length!==1)throw new Error('Review changed NYE availability paragraph');
  limited[0].textContent="Book online to reserve your place for New Year's Eve.";
  const contact=[...details.querySelectorAll('p')].filter(p=>p.textContent.includes('contact form below'));
  if(contact.length!==1)throw new Error('Review changed NYE contact paragraph');
  const link=document.createElement('a');link.href='__KTK_HOME_URL__contact/';link.textContent='Contact our local team.';
  contact[0].replaceChildren(document.createTextNode('Questions about the event or the pub crawl? '),link);
  evidence.push({type:'evergreen-copy',selectors:['limited-place claim','contact form below']});
 }
 if(key==='about-us'){
  for(const [platform,old] of [['Google','582'],['Tripadvisor','2297']]){
   const widgets=[...root.querySelectorAll('.cont_TA')].filter(e=>e.querySelector('.TA_H')?.textContent.toLowerCase().includes(platform.toLowerCase()));
   if(widgets.length!==1||widgets[0].querySelector('.rev')?.textContent.trim()!==`${old} reviews`)throw new Error(`Review changed ${platform} widget`);
   widgets[0].querySelector('.rev').textContent=`${reviewCounts[platform]} reviews`;
   evidence.push({type:'review-count',platform,from:old,to:reviewCounts[platform]});
  }
  const video=one('.et_pb_video_0');
  if(video.querySelector('iframe,video')||!video.querySelector('[data-bg*="ST01LDOOI-4"]'))throw new Error('Review changed original broken About Us media');
  video.remove();evidence.push({type:'remove-empty-video',sourceId:'ST01LDOOI-4'});
  for(const anchor of root.querySelectorAll('.ktk-parity-module-link[aria-label]')){
   const label=anchor.getAttribute('aria-label');
   if(/Tripadvisor/i.test(label))anchor.setAttribute('aria-label',label.replace('2297 reviews',`${reviewCounts.Tripadvisor} reviews`));
   if(/Google/i.test(label))anchor.setAttribute('aria-label',label.replace('582 reviews',`${reviewCounts.Google} reviews`));
  }
 }
 if(key==='krakow-stag-do'){
  const widget=one('[data-single-product-id="637056338"],[data-ktk-legacy-booking="637056338"]');
  const button=one('a.et_pb_button_8');
  if(button.getAttribute('href')!=='#stag_trip_form'||button.textContent.trim()!=='Book Tour')throw new Error('Review original Brewery Tour booking control');
  button.setAttribute('href','__KTK_HOME_URL__store2/brewery-tour-40/#book');button.textContent='Book Brewery Tour';button.dataset.ktkBookingProduct='40';
  const module=widget.closest('.et_pb_code');if(!module)throw new Error('Expected original Ecwid code module');module.remove();
  evidence.push({type:'replace-ecwid-booking',legacyProduct:'637056338',product:40});
 }
 if(key==='post-krakow-new-years-eve'||key==='post-new-years-eve-in-krakow'){
  const paragraph=(prefix,text)=>{
   const matches=[...root.querySelectorAll('p')].filter(p=>p.textContent.trim().startsWith(prefix));
   if(matches.length!==1)throw new Error(`${key}: review changed NYE paragraph: ${prefix}`);
   const from=matches[0].textContent;matches[0].textContent=text;
   evidence.push({type:'nye-editorial-correction',from,to:text});
  };
  if(key==='post-krakow-new-years-eve'){
   paragraph('The best part though? Ski passes', 'Check current lift-pass prices, snow conditions and transport with the resort before planning a ski day. Prices and opening dates vary; an old price comparison is not a current quote.');
  }else{
   const toc=[...root.querySelectorAll('a[href]')].filter(a=>a.getAttribute('href').startsWith('https://docs.google.com/document/')&&a.getAttribute('href').includes('/edit#heading='));
   if(toc.length!==8)throw new Error('Review changed eight NYE contents links');
   const ids=['holiday-getaway','christmas-traditions','new-years-celebrations','nye-pub-crawl','plan-your-getaway','festive-itinerary','closing-thoughts','book-nye'];
   const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
   toc.forEach((anchor,index)=>{
    const matches=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h=>normalize(h.textContent)===normalize(anchor.textContent));
    if(matches.length!==1||matches[0].id||document.getElementById(ids[index]))throw new Error('Review changed NYE contents heading: '+anchor.textContent);
    matches[0].id=ids[index];anchor.setAttribute('href','#'+ids[index]);
    evidence.push({type:'nye-local-contents',id:ids[index]});
   });
   const typo=[...root.querySelectorAll('a[href]')].filter(a=>a.getAttribute('href')==='http://www.krawlthoughkrakow.com');
   if(typo.length!==1)throw new Error('Review changed NYE typo-domain booking link');
   typo[0].setAttribute('href','__KTK_HOME_URL__store2/nye-pub-crawl-32/#book');
   evidence.push({type:'nye-booking-typo',product:32});
   paragraph('With the arrival of winter in Krakow,', 'The Main Market Square sits within Krakow\'s UNESCO-listed Historic Centre. It is a useful starting point for exploring the Old Town in winter; check current Christmas-market dates and opening times before making plans.');
   paragraph('Krakow’s New Year’s Eve Countdown Extravaganza features', 'Krakow offers different ways to spend New Year\'s Eve, from ticketed nightlife events to a meal with friends. A city-centre stage, public countdown or fireworks display is not confirmed by this guide. Check the current city programme and the details of any event you book.');
   paragraph('While the year draws to a close,', 'Do not plan your evening around a promised fireworks display over the Vistula. Check current official announcements and local guidance; previous celebrations do not confirm this year\'s programme.');
   paragraph('The highlight of Krakow’s New Year’s Eve celebration', 'If you want an organised midnight celebration, confirm its location, start time, entry conditions and transport before booking. Do not assume a free Market Square stage or live concert is scheduled.');
   paragraph('And let’s not forget the centerpiece of this experience', 'For the Krawl Through Krakow NYE event, check the current event page for the open-bar and buffet inclusions, available groups, price and meeting-point updates. Do not assume champagne or any named venue is included unless the current offer confirms it.');
   paragraph('It’s important to note that nearly every venue charges', 'New Year\'s Eve entry conditions vary by venue. Compare the current event inclusions rather than relying on historical door-price estimates or assuming every club has space. Follow the confirmed booking details for your group.');
   paragraph('The culmination of this exhilarating journey', 'Your midnight plans depend on the event and group you choose. Follow the confirmed itinerary and meeting-point updates; this article does not promise a city-organised countdown, concert or fireworks display.');
   paragraph('Choosing the best place to spend New Year’s Eve', 'The best place to spend New Year\'s Eve depends on your plans: a ticketed pub crawl, a reserved restaurant or a club event offer different experiences. Check the actual programme, location and entry arrangements rather than assuming a public Market Square countdown is taking place.');
   paragraph('As the clock strikes midnight in Krakow,', 'Krakow can suit a New Year\'s Eve break combining Old Town sightseeing with a booked evening event. Compare the current programmes of restaurants, bars, clubs and guided events, and reserve ahead where required. Check official city announcements separately; this guide does not confirm a Vistula fireworks display or a public concert.');
  }
 }
 const allowedFragments={
  'post-bachelor-party-organisers-krakow':['houseoffearcitygames','differentgamemodesavailable'],
  'post-escape-rooms-for-a-stag-do-in-krakow':['wheretoeatanddrinkafteryouradventure','suggesteditinerariesforafunweekendaway'],
  'post-go-karting-krakow':['makingmemoriesatgokartingkrakow'],
  'post-is-krakow-safe-for-stag':['whichpolishcityisbestforstagparties'],
  'post-krakow-go-karting':['conclusion'],
  'post-krakow-team-building-activities':['krakowteambuildingactivities']
 }[key]||[];
 for(const id of allowedFragments){
  if(document.getElementById(id))continue;
  const anchors=[...root.querySelectorAll('a[href^="#"]')].filter(a=>a.getAttribute('href')==='#'+id);
  if(anchors.length!==1)throw new Error(`${key}: expected one broken contents link ${id}`);
  const anchor=anchors[0],normalize=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
  const headings=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h=>normalize(h.textContent)===normalize(anchor.textContent));
  if(headings.length===1){
   if(headings[0].id)anchor.setAttribute('href','#'+headings[0].id);else headings[0].id=id;
   evidence.push({type:'repair-contents-link',id});
  }else{
   const item=anchor.closest('li');if(!item)throw new Error('Expected a contents list entry');
   item.remove();evidence.push({type:'remove-missing-contents-entry',id});
  }
 }
 return evidence;
}
