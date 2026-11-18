import {readFile,writeFile} from 'node:fs/promises';

export const reviewedGuideTextTargets=Object.freeze([
  Object.freeze({key:'post-jazz-bars-in-krakow',marker:'[data-ktk-music-review="2026-11-13.music-1"]',roots:1}),
  Object.freeze({key:'post-krakow-live-music',marker:'[data-ktk-music-review="2026-11-13.music-1"]',roots:1}),
  Object.freeze({key:'post-wheres-the-cheap-places-to-drink-in-krakow',marker:'[data-ktk-editorial-review="2026-11-13"]',roots:1}),
  Object.freeze({key:'post-krakow-new-years-eve',marker:'[data-ktk-established-nye-review="2026-11-14"]',roots:5}),
]);
export const reviewedGuideTextScope=':is('+reviewedGuideTextTargets.map(t=>'body.ktk-code-page[data-ktk-page="'+t.key+'"] #main-content '+t.marker).join(',')+')';
export const reviewedGuideHeaderScope='body.ktk-code-page:is('+reviewedGuideTextTargets.map(t=>'[data-ktk-page="'+t.key+'"]').join(',')+') #main-content .et_post_meta_wrapper > :is(.entry-title,.post-meta)';
export const reviewedGuideTextStyles='/* BEGIN Reviewed guide reading text */\n@media (max-width: 980px) {\n  '+reviewedGuideTextScope+' :is(p,li) { font-size: 16px; line-height: 1.65; text-align: left; }\n  '+reviewedGuideTextScope+' h2 { font-size: 24px; line-height: 1.3; }\n  '+reviewedGuideTextScope+' h3 { font-size: 20px; line-height: 1.4; }\n}\n@media (max-width: 600px) {\n  '+reviewedGuideTextScope+' { padding-right: 24px; }\n  '+reviewedGuideHeaderScope+' { padding-right: 24px; }\n}\n/* END Reviewed guide reading text */\n';
const anchor='/* END Secondary holiday guide */\n';

export async function buildReviewedGuideTextStyles(file){
  const source=await readFile(file,'utf8');
  if(source.split(anchor).length!==2)throw Error('Exact prior holiday-style boundary required');
  if(source.includes('/* BEGIN Reviewed guide reading text */')||source.includes('/* END Reviewed guide reading text */')){
    if(source.split('/* BEGIN Reviewed guide reading text */').length!==2||source.split('/* END Reviewed guide reading text */').length!==2||!source.includes(anchor+reviewedGuideTextStyles))throw Error('Reviewed guide reading style drift');
    return;
  }
  await writeFile(file,source.replace(anchor,anchor+reviewedGuideTextStyles));
}
