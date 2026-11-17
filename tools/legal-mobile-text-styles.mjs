import {readFile,writeFile} from 'node:fs/promises';

export const legalMobilePageKeys=Object.freeze(['privacy-policy','terms-and-conditions']);
export const legalMobileScope='body.ktk-code-page:is('+legalMobilePageKeys.map(key=>'[data-ktk-page="'+key+'"]').join(',')+') #main-content .et_pb_text_1 .et_pb_text_inner';
export const legalMobileStyles='/* BEGIN Legal mobile text clearance */\n@media (max-width: 980px) {\n  '+legalMobileScope+' :is(p,li) { font-size: 16px; line-height: 1.65; }\n}\n@media (max-width: 600px) {\n  '+legalMobileScope+' { padding-right: 24px; }\n}\n/* END Legal mobile text clearance */\n';

export async function buildLegalMobileTextStyles(file){
 const source=await readFile(file,'utf8'),anchor='/* END Reviewed venue phone text */\n';
 if(source.split(anchor).length!==2)throw Error('Stable reviewed venue style boundary required');
 if(source.includes('/* BEGIN Legal mobile text clearance */')||source.includes('/* END Legal mobile text clearance */')){
  if(source.split('/* BEGIN Legal mobile text clearance */').length!==2||source.split('/* END Legal mobile text clearance */').length!==2||!source.includes(anchor+legalMobileStyles))throw Error('Legal mobile text style drift');return;
 }
 await writeFile(file,source.replace(anchor,anchor+legalMobileStyles));
}
