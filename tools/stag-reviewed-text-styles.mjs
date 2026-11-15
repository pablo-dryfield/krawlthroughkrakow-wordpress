import {readFile,writeFile} from 'node:fs/promises';

// Seven existing reviewed text interiors; existing padding and headings stay in place.
const scope='body.ktk-code-page[data-ktk-page="krakow-stag-do"] #main-content :is([data-ktk-group-planning-review],[data-ktk-group-activity-review])';
const styles='/* BEGIN Reviewed Stag mobile text */\n@media (max-width: 600px) {\n  '+scope+' { font-size: 16px; line-height: 1.65; }\n  '+scope+' :is(p,li) { font-size: 16px; line-height: 1.65; }\n}\n/* END Reviewed Stag mobile text */\n';

export async function buildStagReviewedTextStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* END Stag and NYE mobile text */\n';
 if(css.split(anchor).length!==2)throw Error('Stable Stag/NYE style boundary required');
 if(css.includes('/* BEGIN Reviewed Stag mobile text */')||css.includes('/* END Reviewed Stag mobile text */')){
  if(css.split('/* BEGIN Reviewed Stag mobile text */').length!==2||css.split('/* END Reviewed Stag mobile text */').length!==2||!css.includes(anchor+styles))throw Error('Reviewed Stag text style drift');return;
 }
 await writeFile(file,css.replace(anchor,anchor+styles));
}
