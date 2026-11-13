// Guarded, narrow additions to existing source modules; no current-offer facts invented.
export function reviseContextualLinks({key}) {
 if(key==='post-hostel-hangover-cure')return [];
 const root=document.querySelector('#main-content'),evidence=[];
 const policies={
  stagshens:{selector:'.et_pb_text_1 .et_pb_text_inner > p',prefix:'KTK has been organizing events',parts:['Plan your ',{text:'stag do in Krakow',route:'krakow-stag-do/'},' or ',{text:'hen party in Krakow',route:'krakow-hen-do/'},'.']},
  'post-bachelor-party-organisers-krakow':{selector:'.entry-content > p',prefix:'If you\u2019re seeking top-notch bachelor',parts:['Planning a group trip? See our ',{text:'Krakow stag do options',route:'krakow-stag-do/'},'.']},
  'post-hen-do-ideas-abroad':{selector:'.entry-content > p',prefix:'Hen do ideas abroad',parts:['Organising a trip to Krakow? Browse our ',{text:'hen party options',route:'krakow-hen-do/'},'.']},
  'post-krakow-hen-party-reviews':{selector:'.et_builder_inner_content > p',prefix:'If you\u2019re searching for the best Krakow hen party',parts:['For group planning, see our ',{text:'Krakow hen party page',route:'krakow-hen-do/'},'.']},
  'post-best-pub-crawls-in-europe':{selector:'.et_pb_text_0 .et_pb_text_inner > p',prefix:'Malta Pub Crawl',before:true,parts:['See our ',{text:'directory of other pub crawls',route:'otherbarcrawls/'},' for operator links.']}
 };
 const policy=Object.hasOwn(policies,key)?policies[key]:null;
 if(policy){
  const paragraph=document.createElement('p');paragraph.dataset.ktkContextualLinks=key;
  for(const part of policy.parts){
   if(typeof part==='string')paragraph.append(document.createTextNode(part));
   else {const link=document.createElement('a');link.setAttribute('href','__KTK_HOME_URL__'+part.route);link.textContent=part.text;paragraph.append(link);}
  }
  const existing=root.querySelector('[data-ktk-contextual-links]');
  if(existing){if(existing.outerHTML!==paragraph.outerHTML)throw Error('Review changed contextual-link block: '+key);}
  else {
   const original=[...root.querySelectorAll(policy.selector)].filter(p=>p.textContent.trim().startsWith(policy.prefix));
   if(original.length!==1)throw Error('Review changed contextual-link source: '+key);
   policy.before?original[0].before(paragraph):original[0].after(paragraph);
   evidence.push({type:'contextual-planning-links',key,targets:policy.parts.filter(part=>typeof part==='object').map(part=>'/'+part.route)});
  }
 }
 if(key==='krakow-stag-do'){
  const buttons=root.querySelectorAll('a.et_pb_button_16');
  if(buttons.length!==1||![...buttons[0].closest('.et_pb_row').querySelectorAll('h1,h2,h3,h4')].some(h=>h.textContent.trim()==='Krakow Go-Karting'))throw Error('Review changed Go-Karting row');
  const button=buttons[0],target='__KTK_HOME_URL__store2/go-karting-30/#book';
  if(button.getAttribute('href')===''&&button.textContent.trim()==='Book Tour'){
   button.setAttribute('href',target);button.textContent='Book Go-Karting';button.setAttribute('aria-label','Book Go-Karting');button.dataset.ktkBookingProduct='30';
   evidence.push({type:'repair-empty-go-karting-booking',product:30});
  }else if(button.getAttribute('href')!==target||button.textContent!=='Book Go-Karting'||button.getAttribute('aria-label')!=='Book Go-Karting'||button.dataset.ktkBookingProduct!=='30')throw Error('Review changed Go-Karting booking control');
 }
 return evidence;
}
