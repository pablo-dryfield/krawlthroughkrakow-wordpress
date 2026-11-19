import {readFile,writeFile} from 'node:fs/promises';

const start='/* BEGIN shared content accessibility */';
const end='/* END shared content accessibility */';
export async function buildContentAccessibilityStyles(file,{additionalStyles=''}={}) {
 const source=await readFile(file,'utf8');
 const stylesheet=await readFile(new URL('./content-accessibility.css',import.meta.url),'utf8');
 if(typeof additionalStyles!=='string'||additionalStyles.includes(start)||additionalStyles.includes(end))throw Error('Plain additional content styles required');
 const first=source.indexOf(start),last=source.indexOf(end);
 if((first<0)!==(last<0)||first>=0&&(last<first||source.indexOf(start,first+1)>=0))throw Error('Ambiguous shared accessibility stylesheet markers');
 const base=first<0?source.trimEnd():source.slice(0,first).trimEnd();
 if(last>=0&&source.slice(last+end.length).trim())throw Error('Shared accessibility block must be last');
 await writeFile(file,`${base}\n\n${start}\n${stylesheet.trim()}${additionalStyles?'\n'+additionalStyles.trim():''}\n${end}\n`);
}
