import {readFile,writeFile} from 'node:fs/promises';

export const venuePhonePageKeys=Object.freeze(['post-krakow-techno-clubs','post-krakow-techno-clubs-2','post-irish-bars-krakow','post-krakow-nightclubs','post-krakow-bars-jewish-quarter','post-krakow-shot-bar']);
export const venuePhoneScope='body.ktk-code-page:is('+venuePhonePageKeys.map(key=>'[data-ktk-page="'+key+'"]').join(',')+') #main-content [data-ktk-venue-review="2026-11-13.venues-1"]';
export const venuePhoneSelector=venuePhoneScope+' :is(p,li,th,td)';
export const venuePhoneStyles='/* BEGIN Reviewed venue phone text */\n@media (max-width: 600px) {\n  '+venuePhoneSelector+' { font-size: 16px; line-height: 1.65; text-align: left; }\n  '+venuePhoneScope+' h2 { font-size: 24px; line-height: 1.3; }\n  '+venuePhoneScope+' h3 { font-size: 20px; line-height: 1.4; }\n  '+venuePhoneScope+' .ktk-venue-comparison { table-layout: auto; }\n  '+venuePhoneScope+' .ktk-venue-comparison :is(th,td):first-child { width: 30%; overflow-wrap: normal; word-break: normal; }\n}\n'+venuePhoneScope+' :is(h2,h3)[id] { scroll-margin-top: 24px; }\n/* END Reviewed venue phone text */\n';

export async function buildVenuePhoneTextStyles(file){
 const source=await readFile(file,'utf8'),anchor='/* END Guide type and image geometry */\n';
 if(source.split(anchor).length!==2)throw Error('Stable reviewed guide type boundary required');
 if(source.includes('/* BEGIN Reviewed venue phone text */')||source.includes('/* END Reviewed venue phone text */')){
  if(source.split('/* BEGIN Reviewed venue phone text */').length!==2||source.split('/* END Reviewed venue phone text */').length!==2||!source.includes(anchor+venuePhoneStyles))throw Error('Reviewed venue phone text style drift');return;
 }
 await writeFile(file,source.replace(anchor,anchor+venuePhoneStyles));
}
