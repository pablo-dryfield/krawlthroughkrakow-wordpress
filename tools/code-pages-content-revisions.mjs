// Executed in a parsed source DOM. Keep captures immutable and assert every edited source contract.
export function reviseCodePageContent({key,reviewCounts}) {
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
  const bookingLinks=[...root.querySelectorAll('a[href]')].filter(a=>a.getAttribute('href').startsWith('https://fareharbor.com/embeds/book/krawlthroughkrakow/'));
  if(![6,7].includes(bookingLinks.length))throw new Error('Review changed NYE booking controls');
  bookingLinks.forEach(a=>a.setAttribute('href','__KTK_HOME_URL__store2/nye-pub-crawl-32/#book'));
  evidence.push({type:'nye-booking-links',count:bookingLinks.length,product:32});
  replace('.et_pb_countdown_timer .title','Krakow New Years Eve Party 2025 / 2026','Krakow New Years Eve Party 2026 / 2027');
  const countdown=one('.et_pb_countdown_timer');
  if(countdown.dataset.endTimestamp!=='1767222000')throw new Error('Review changed NYE countdown source');
  countdown.dataset.endTimestamp=String(Date.parse('2027-01-01T00:00:00+01:00')/1000);
  evidence.push({type:'countdown',date:'2027-01-01T00:00:00+01:00'});
  replace('.et_pb_text_0 .et_pb_text_inner','start to 2026.','start to 2027.');
  replace('.et_pb_text_3 .et_pb_text_inner','Beginning 2026','Beginning 2027');
  replace('.et_pb_text_3 .et_pb_text_inner','venues. The celebrations kick off at 5 pm and 7:30 PM (depending the group you choose),','The celebrations start at 5:00 PM or 7:30 PM, depending on the group you choose,');
  replace('.et_pb_heading_8 h1','All for only 250 zl or just 59 euro','All for only 250 PLN');
  replace('.et_pb_heading_4 h1','VIP Entrance and Welcome Shots','Photos from previous NYE events');
  for(const [selector,time] of [['.et_pb_text_1 .et_pb_text_inner','5:00 PM'],['.et_pb_text_2 .et_pb_text_inner','7:30 PM']]){
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
