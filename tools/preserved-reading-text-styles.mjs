import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Typography only. All original copy/markup and unresolved owner reviews remain.
export const preservedReadingTargets=Object.freeze([
  {
    "key": "about-us",
    "selector": ".et_pb_text_7 .et_pb_text_inner",
    "roots": 1,
    "align": "preserve",
    "bodySHA256": "ea0ad0f5f16c4a425328da4120184243a67115c12a1cadd57c55893d2426d22c"
  },
  {
    "key": "blog",
    "selector": "[data-ktk-blog-teaser-review]",
    "roots": 8,
    "align": "preserve",
    "bodySHA256": "1be790904c6a4638edfdd50745ec0bc70b24a7cf40bf820ecca9fc9abd4982cb"
  },
  {
    "key": "how-to-join",
    "selector": ".et_pb_cta_0 .et_pb_promo_description",
    "roots": 1,
    "align": "preserve",
    "bodySHA256": "2e28998154f19b8d625f1c4d1f22a03ea42431f038334336e2e8db3c087b15eb"
  },
  {
    "key": "krakow-hen-do",
    "selector": ":is(.et_pb_text_0,.et_pb_text_1,.et_pb_text_2,.et_pb_text_3,.et_pb_text_4,.et_pb_text_5,.et_pb_text_6) .et_pb_text_inner",
    "roots": 7,
    "align": "preserve",
    "bodySHA256": "913877c386c36dfc0ca6898b737a0ae3258bcf1beffa28213c2136b04d0552f4"
  },
  {
    "key": "other-tours",
    "selector": ":is(.et_pb_text_0,.et_pb_text_1) .et_pb_text_inner",
    "roots": 2,
    "align": "preserve",
    "bodySHA256": "0e5d5bb7c6f29fdcc577835574fe78f1780f10b344121bfa35a4e5ab40c7ad69"
  },
  {
    "key": "otherbarcrawls",
    "selector": ".et_pb_text_0 .et_pb_text_inner",
    "roots": 1,
    "align": "preserve",
    "bodySHA256": "2a3b998b36638271e036dc37e3fed330016650c6c257c86f08b94338abd4fb22"
  },
  {
    "key": "pub-crawl-jobs",
    "selector": ".et_pb_text_1 .et_pb_text_inner",
    "roots": 1,
    "align": "preserve",
    "bodySHA256": "7e3808036e112f2d6d935c073f7bfca289fb560d026c01eef79470ff6ac08694"
  },
  {
    "key": "student-trips-poland",
    "selector": ".et_pb_text_2 [data-ktk-group-planning-review=\"2026-11-14\"]",
    "roots": 1,
    "align": "preserve",
    "bodySHA256": "acbed35e2e1fe77b01cf2dc4acce20c15754d01ea39db81c1ae9e9f141409391"
  },
  {
    "key": "tour-service-disclaimer",
    "selector": ".et_pb_text_1 .et_pb_text_inner",
    "roots": 1,
    "align": "preserve",
    "bodySHA256": "0daf4cab15418f6caadf9c0f9db081f2d0ecdd2b763cef5a5e1b732c0fb400e7"
  }
].map(Object.freeze));
export const preservedReadingScope=':is('+preservedReadingTargets.map(t=>'body.ktk-code-page[data-ktk-page="'+t.key+'"] #main-content '+t.selector).join(',')+')';
// Preserve original alignment, including the source's inline declarations.
export const preservedReadingClearanceTargets=Object.freeze([
  {key:'about-us',selector:'.et_pb_text_7 .et_pb_text_inner,.et_pb_text_6 h3',roots:2},
  {key:'krakow-hen-do',selector:':is(.et_pb_text_2,.et_pb_text_3,.et_pb_text_4,.et_pb_text_5,.et_pb_text_6) .et_pb_text_inner,:is(.et_pb_heading_1,.et_pb_heading_2,.et_pb_heading_3,.et_pb_heading_7) h2',roots:9},
  {key:'other-tours',selector:':is(.et_pb_text_0,.et_pb_text_1) .et_pb_text_inner',roots:2},
  {key:'otherbarcrawls',selector:'.et_pb_text_0 .et_pb_text_inner,:is(.et_pb_blurb_3,.et_pb_blurb_4) h3',roots:3},
  {key:'student-trips-poland',selector:':is(.et_pb_text_4,.et_pb_text_5) h2',roots:2},
  {key:'tour-service-disclaimer',selector:'.et_pb_text_1 .et_pb_text_inner',roots:1}
].map(Object.freeze));
export const preservedReadingClearanceScope=':is('+preservedReadingClearanceTargets.map(t=>'body.ktk-code-page[data-ktk-page="'+t.key+'"] #main-content :is('+t.selector+')').join(',')+')';
// This single source paragraph has inline justification. The bounded override
// removes large phone word gaps; no other original alignment changes.
export const preservedReadingAlignmentScope='body.ktk-code-page[data-ktk-page="krakow-hen-do"] #main-content .et_pb_text_2 .et_pb_text_inner > p[style="text-align: justify;"]';
export const preservedReadingStyles='/* BEGIN Preserved reading text */\n@media (max-width: 980px) {\n  '+preservedReadingScope+',\n  '+preservedReadingScope+' :is(p,li) { font-size: 16px; line-height: 1.65; }\n  '+preservedReadingAlignmentScope+' { text-align: left !important; }\n}\n@media (max-width: 600px) {\n  '+preservedReadingClearanceScope+' { padding-right: 24px; }\n}\n/* END Preserved reading text */\n';
const anchor='/* END Reviewed site reading text */\n';

export async function buildPreservedReadingTextStyles(file){
  const source=await readFile(file,'utf8');
  if(source.split(anchor).length!==2)throw Error('Exact prior site reading boundary required');
  const exists=source.includes('/* BEGIN Preserved reading text */')||source.includes('/* END Preserved reading text */');
  if(exists&&(source.split('/* BEGIN Preserved reading text */').length!==2||source.split('/* END Preserved reading text */').length!==2||!source.includes(anchor+preservedReadingStyles)))throw Error('Preserved reading style drift');
  // Run after the complete page loop, against finished generated bodies.
  for(const target of preservedReadingTargets){
    const bytes=await readFile(path.join(path.dirname(file),'content',target.key+'.html'));
    if(createHash('sha256').update(bytes).digest('hex')!==target.bodySHA256)throw Error('Preserved reading body source changed: '+target.key);
  }
  if(!exists)await writeFile(file,source.replace(anchor,anchor+preservedReadingStyles));
}
