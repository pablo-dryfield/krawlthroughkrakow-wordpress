import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

export async function buildNoJsNavigation(homepage, pages) {
 const source=await readFile(new URL('./nojs-navigation.php',import.meta.url),'utf8'),cssSource=await readFile(new URL('./nojs-navigation.css',import.meta.url),'utf8');
 if(!source.startsWith('<?php\n')||source.split('function ktk_nojs_navigation_body(').length!==2)throw Error('Known navigation PHP blueprint required');
 const block='/* BEGIN No-JS quick links */\n'+cssSource.trim()+'\n/* END No-JS quick links */\n\n',shared='/* BEGIN shared content accessibility */',end='/* END shared content accessibility */',pending=[];
 for(const [directory,prefix,stylesheet,anchor]of [[homepage,'ktk_homepage','parity-runtime.css',shared],[pages,'ktk_pages','runtime.css','/* BEGIN NYE promotion state */']]){
  const helper=path.join(directory,'nojs-navigation.php'),compiled=source.replaceAll('ktk_nojs_',prefix+'_nojs_');let previous=null;
  try{previous=await readFile(helper,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous!==null&&previous!==compiled)throw Error('Existing navigation helper drift');pending.push([helper,previous,compiled]);
  const file=path.join(directory,stylesheet),css=await readFile(file,'utf8');
  if(css.split(shared).length!==2||css.split(end).length!==2||css.slice(css.indexOf(end)+end.length).trim()||css.split(anchor).length!==2)throw Error('Stable navigation and final shared style boundaries required');
  let next;
  if(css.includes('/* BEGIN No-JS quick links */')||css.includes('/* END No-JS quick links */')){
   if(css.split('/* BEGIN No-JS quick links */').length!==2||css.split('/* END No-JS quick links */').length!==2||!css.includes(block+anchor))throw Error('Navigation stylesheet drift');next=css;
  }else next=css.replace(anchor,block+anchor);
  pending.push([file,css,next]);
 }
 // Preflight both namespaces and stylesheets before creating or replacing any output.
 for(const [file,before,after]of pending)if(before!==after)await writeFile(file,after);
}
