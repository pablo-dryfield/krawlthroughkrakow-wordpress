import {readFile,writeFile} from 'node:fs/promises';

// Existing reviewed text interiors and directions only; keep the shared homepage input exact.
const scope='body.ktk-code-page[data-ktk-page="post-all-you-need-to-know-about-visiting-auschwitz"] #main-content ';
const styles='/* BEGIN Memorial mobile text */\n@media (max-width: 600px) {\n  '+scope+':is([data-ktk-memorial-review],[data-ktk-memorial-directions]) { font-size: 16px; line-height: 1.65; }\n  '+scope+'[data-ktk-memorial-review] :is(p,li) { font-size: 16px; line-height: 1.65; }\n  '+scope+'[data-ktk-memorial-review] h2[id^="memorial-"] { scroll-margin-top: 24px; }\n}\n/* END Memorial mobile text */\n';

export async function buildMemorialPhoneTextStyles(file){
 const source=await readFile(file,'utf8'),anchor='/* END Reviewed Stag mobile text */\n';
 if(source.split(anchor).length!==2)throw Error('Stable reviewed Stag style boundary required');
 if(source.includes('/* BEGIN Memorial mobile text */')||source.includes('/* END Memorial mobile text */')){
  if(source.split('/* BEGIN Memorial mobile text */').length!==2||source.split('/* END Memorial mobile text */').length!==2||!source.includes(anchor+styles))throw Error('Memorial mobile text style drift');return;
 }
 await writeFile(file,source.replace(anchor,anchor+styles));
}
