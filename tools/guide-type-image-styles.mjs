import {readFile,writeFile} from 'node:fs/promises';

// Historical paragraph interiors only. Preserve all copy, heading type and original media.
export const guideParagraphModules=Object.freeze([0,3,5,7,9,11,14,18,22,26,30,34,36,40,44,48,52,56,58,62,66,70,74,78,80,84,88,92,94,98,102,106,108,112,115,119,121,125,129,133,135]);
export const guideParagraphSelector='body.ktk-code-page[data-ktk-page="post-2020-krakow-nightlife-guide"] #main-content :is('+guideParagraphModules.map(n=>'.et_pb_text_'+n).join(',')+') .et_pb_text_inner';
const memorial='body.ktk-code-page[data-ktk-page="post-all-you-need-to-know-about-visiting-auschwitz"] #main-content ';
export const guideImageStyles='/* BEGIN Guide type and image geometry */\n@media (max-width: 600px) {\n  '+guideParagraphSelector+' { padding-right: 24px; }\n  '+guideParagraphSelector+' :is(p,li) { font-size: 16px; line-height: 1.65; }\n}\n@media (max-width: 980px) {\n  '+memorial+'.et_pb_image :is(img.wp-image-2689,img.wp-image-2688,img.wp-image-2687) { width: 150px; }\n}\n'+memorial+'.et_post_meta_wrapper > img[src*="e8063d1c3832-"] { aspect-ratio: auto 4 / 5; }\n/* END Guide type and image geometry */\n';

export async function buildGuideTypeImageStyles(file){
 const source=await readFile(file,'utf8'),anchor='/* END Memorial mobile text */\n';
 if(source.split(anchor).length!==2)throw Error('Stable Memorial phone style boundary required');
 if(source.includes('/* BEGIN Guide type and image geometry */')||source.includes('/* END Guide type and image geometry */')){
  if(source.split('/* BEGIN Guide type and image geometry */').length!==2||source.split('/* END Guide type and image geometry */').length!==2||!source.includes(anchor+guideImageStyles))throw Error('Guide type/image geometry style drift');return;
 }
 await writeFile(file,source.replace(anchor,anchor+guideImageStyles));
}
