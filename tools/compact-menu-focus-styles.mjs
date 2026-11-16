import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

export async function buildCompactMenuFocusStyles(homepage,pages) {
 const styles=await readFile(new URL('./compact-menu-focus.css',import.meta.url),'utf8'),navigation=await readFile(new URL('./nojs-navigation.css',import.meta.url),'utf8');
 const start='/* BEGIN compact menu keyboard focus */',end='/* END compact menu keyboard focus */',block=start+'\n'+styles.trim()+'\n'+end+'\n\n',anchor='/* BEGIN No-JS quick links */',navBlock=anchor+'\n'+navigation.trim()+'\n/* END No-JS quick links */\n\n',shared='/* BEGIN shared content accessibility */',sharedEnd='/* END shared content accessibility */',pending=[];
 for(const [directory,file,following]of [[homepage,'parity-runtime.css',shared],[pages,'runtime.css','/* BEGIN NYE promotion state */']]){
  const target=path.join(directory,file),source=await readFile(target,'utf8');
  if(source.split(anchor).length!==2||!source.includes(navBlock+following)||source.split(shared).length!==2||source.split(sharedEnd).length!==2||source.slice(source.indexOf(sharedEnd)+sharedEnd.length).trim())throw Error('Exact existing navigation and final shared boundaries required');
  let next;
  if(source.includes(start)||source.includes(end)){
   if(source.split(start).length!==2||source.split(end).length!==2||!source.includes(block+anchor))throw Error('Compact menu focus stylesheet drift');next=source;
  }else next=source.replace(anchor,block+anchor);
  pending.push([target,source,next]);
 }
 // Both namespaces are preflighted before either stylesheet is changed.
 for(const [file,before,after]of pending)if(before!==after)await writeFile(file,after);
}
