import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const shortViewportBookingScope='body.ktk-code-page #ktk-cta';
export const shortViewportBookingHeadingBodySHA256='2e28998154f19b8d625f1c4d1f22a03ea42431f038334336e2e8db3c087b15eb';
export const shortViewportBookingHeadingTargets=Object.freeze([
  {key:'how-to-join',selector:'.et_pb_blurb_4 .et_pb_module_header',bodySHA256:shortViewportBookingHeadingBodySHA256},
  {key:'contact',selector:'.et_pb_text_3 .et_pb_text_inner > h2',bodySHA256:'00f06aa289be5f09bcedc016d230e96a96d53d8e0c281a00a24877a5a3bede6a'},
  {key:'faqs',selector:'.et_pb_text_3 .et_pb_text_inner > h2',bodySHA256:'620e4e6ccf56150d465276da79a5a5ac285399506e36cf06c6e4cea507e2b98b'},
  {key:'krakow-nightlife',selector:'.et_pb_text_9 .et_pb_text_inner > h2',bodySHA256:'773eccde5d0eb77c7a49f340056c0ab768fb91405a6a44e73c677ecb57918e39'},
  {key:'blog',selector:'.et_pb_text_0 .et_pb_text_inner > h2',bodySHA256:'a0885c3afd2b9a8408ccc0cfbf664bbb24cbf9ce16e3ca3904265674b50d36ce'},
  {key:'tour-service-disclaimer',selector:'.et_pb_text_2 .et_pb_text_inner > h2',bodySHA256:'acc92eb41bfb7012c40a9c89c0eb8ac758ade9807e0a14501156ca100397a036'}
].map(Object.freeze));
export const shortViewportBookingHeadingScope=':is('+shortViewportBookingHeadingTargets.map(t=>'body.ktk-code-page[data-ktk-page="'+t.key+'"] #main-content '+t.selector).join(',')+')';
export const shortViewportBookingStyles='/* BEGIN Short viewport booking control */\n'+shortViewportBookingScope+' { right: 26px; }\n@media (max-height: 300px) {\n  '+shortViewportBookingScope+' { top: 8px; right: 23px; font-size: clamp(10px, 10vh, 20px); line-height: 20px; padding: 12px; }\n}\n@media (max-height: 300px) and (max-width: 600px) {\n  '+shortViewportBookingHeadingScope+' { padding-right: 32px; }\n}\n'+shortViewportBookingScope+':focus-visible { outline: 3px solid #fff; outline-offset: -3px; }\n/* END Short viewport booking control */\n';
const anchor='/* END Preserved reading text */\n';

export async function buildShortViewportBookingStyles(file){
  const source=await readFile(file,'utf8');
  if(source.split(anchor).length!==2)throw Error('Exact preserved reading boundary required');
  const exists=source.includes('/* BEGIN Short viewport booking control */')||source.includes('/* END Short viewport booking control */');
  if(exists&&(source.split('/* BEGIN Short viewport booking control */').length!==2||source.split('/* END Short viewport booking control */').length!==2||!source.includes(anchor+shortViewportBookingStyles)))throw Error('Short viewport booking style drift');
  for(const target of shortViewportBookingHeadingTargets){
    const body=await readFile(path.join(path.dirname(file),'content',target.key+'.html'));
    if(createHash('sha256').update(body).digest('hex')!==target.bodySHA256)throw Error('Exact short viewport heading body source required: '+target.key);
  }
  if(!exists)await writeFile(file,source.replace(anchor,anchor+shortViewportBookingStyles));
}
