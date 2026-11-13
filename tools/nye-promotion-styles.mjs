import {readFile,writeFile} from 'node:fs/promises';

export async function buildNyePromotionStyles(file){
 const start='/* BEGIN NYE promotion state */',end='/* END NYE promotion state */';
 const original=await readFile(file,'utf8');let source=original;
 const a=source.split(start).length-1,b=source.split(end).length-1;
 if(a||b){if(a!==1||b!==1||source.indexOf(start)>source.indexOf(end))throw Error('Malformed NYE-promotion style markers');source=source.slice(0,source.indexOf(start))+source.slice(source.indexOf(end)+end.length);}
 const marker='/* BEGIN shared content accessibility */',index=source.indexOf(marker);
 if(index<0||source.indexOf(marker,index+1)>=0)throw Error('Preserve the shared native accessibility cascade');
 const block=start+'\n'+(await readFile(new URL('./nye-promotion.css',import.meta.url),'utf8')).trim()+'\n'+end+'\n\n';
 const output=source.slice(0,index).trimEnd()+'\n\n'+block+source.slice(index);
 if(output!==original)await writeFile(file,output);
}
