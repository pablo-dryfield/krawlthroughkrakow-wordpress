import {readFile,writeFile} from 'node:fs/promises';

// These existing module classes resolve to13 original Stag text leaves and5 NYE text leaves.
// Reviewed nested Stag blocks are excluded; parent containers are deliberately omitted to avoid double padding.
const scope=key=>'body.ktk-code-page[data-ktk-page="'+key+'"] #main-content ';
const stag=scope('krakow-stag-do')+':is('+[1,2,3,5,7,8,9,10,11,12,13].map(i=>'.et_pb_text_'+i).join(',')+') > .et_pb_text_inner:not([data-ktk-group-activity-review])';
const nye=scope('new-years-eve')+':is('+[0,1,2,3,12].map(i=>'.et_pb_text_'+i).join(',')+') > .et_pb_text_inner';
const styles='/* BEGIN Stag and NYE mobile text */\n@media (max-width: 600px) {\n  '+stag+',\n  '+nye+' { box-sizing: border-box; padding-right: 24px; font-size: 16px; line-height: 1.65; }\n  '+stag+' :is(p,li),\n  '+nye+' :is(p,li) { font-size: 16px; line-height: 1.65; text-align: left !important; }\n  '+scope('new-years-eve')+'.et_pb_row_12 { padding-bottom: 72px; }\n}\n/* END Stag and NYE mobile text */\n';

export async function buildStagNyeTextStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* END Jobs page accessibility */\n';
 if(css.split(anchor).length!==2)throw Error('Stable Jobs style boundary required');
 if(css.includes('/* BEGIN Stag and NYE mobile text */')||css.includes('/* END Stag and NYE mobile text */')){
  if(css.split('/* BEGIN Stag and NYE mobile text */').length!==2||css.split('/* END Stag and NYE mobile text */').length!==2||!css.includes(anchor+styles))throw Error('Stag/NYE text style drift');return;
 }
 await writeFile(file,css.replace(anchor,anchor+styles));
}
