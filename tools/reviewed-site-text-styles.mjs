import {readFile,writeFile} from 'node:fs/promises';

export const reviewedSiteTextTargets=Object.freeze([
  Object.freeze({key:'how-to-join',marker:'.et_pb_text_1 [data-ktk-offer-copy="2026-11-13"]',roots:1}),
  Object.freeze({key:'meeting-point',marker:'.et_pb_text_1 [data-ktk-offer-copy="2026-11-13"]',roots:1}),
  Object.freeze({key:'contact',marker:'.et_pb_text_2 [data-ktk-contact-copy="2026-11-14"]',roots:1}),
  Object.freeze({key:'faqs',marker:'[data-ktk-offer-copy="2026-11-13"]',roots:15}),
  Object.freeze({key:'krakow-nightlife',marker:'[data-ktk-editorial-review="2026-11-13"]',roots:9}),
]);
export const reviewedSiteTextScope=':is('+reviewedSiteTextTargets.map(t=>'body.ktk-code-page[data-ktk-page="'+t.key+'"] #main-content '+t.marker).join(',')+')';
export const reviewedSiteTitleScope='body.ktk-code-page:is('+reviewedSiteTextTargets.map(t=>'[data-ktk-page="'+t.key+'"]').join(',')+') #main-content .et_pb_text_0 .et_pb_text_inner';
export const reviewedSiteAccordionScope='body.ktk-code-page[data-ktk-page="faqs"] #main-content .et_pb_accordion_0';
export const reviewedSiteOtherHeadingScope='body.ktk-code-page[data-ktk-page="how-to-join"] #main-content .et_pb_blurb_3 .et_pb_module_header,\n  body.ktk-code-page[data-ktk-page="contact"] #main-content .et_pb_heading_0 .et_pb_heading_container';
export const reviewedSiteFaqPanelScope=reviewedSiteAccordionScope+' .et_pb_toggle_content[data-ktk-offer-copy="2026-11-13"]';
// The unchanged runtime's inline display wins after enhancement. Before it runs,
// all twelve existing text answers remain readable, including script-load failure.
export const reviewedSiteTextStyles='/* BEGIN Reviewed site reading text */\n'+reviewedSiteFaqPanelScope+' { display: block; }\n@media (max-width: 980px) {\n  '+reviewedSiteTextScope+' :is(p,li) { font-size: 16px; line-height: 1.65; text-align: left; }\n}\n@media (max-width: 600px) {\n  '+reviewedSiteTextScope+':not(.et_pb_toggle_content),\n  '+reviewedSiteTitleScope+',\n  '+reviewedSiteAccordionScope+',\n  '+reviewedSiteOtherHeadingScope+' { padding-right: 24px; }\n}\n/* END Reviewed site reading text */\n';
const anchor='/* END Reviewed guide reading text */\n';

export async function buildReviewedSiteTextStyles(file){
  const source=await readFile(file,'utf8');
  if(source.split(anchor).length!==2)throw Error('Exact prior guide reading boundary required');
  if(source.includes('/* BEGIN Reviewed site reading text */')||source.includes('/* END Reviewed site reading text */')){
    if(source.split('/* BEGIN Reviewed site reading text */').length!==2||source.split('/* END Reviewed site reading text */').length!==2||!source.includes(anchor+reviewedSiteTextStyles))throw Error('Reviewed site reading style drift');
    return;
  }
  await writeFile(file,source.replace(anchor,anchor+reviewedSiteTextStyles));
}
