import {readFile,writeFile} from 'node:fs/promises';
import {loadOfferFacts,campaignTemplateValues} from './site-offer-facts.mjs';

const start='// BEGIN reviewed hero offer facts',end='// END reviewed hero offer facts';
const quote=value=>"'"+String(value).replaceAll('\\','\\\\').replaceAll("'","\\'")+"'";
export function renderHeroOfferFacts(source,facts){
 const values=campaignTemplateValues(facts);
 if(source.split(start).length!==2||source.split(end).length!==2||source.indexOf(start)>source.indexOf(end))throw Error('Exactly one ordered hero-fact block required');
 const body=start+'\nfunction ktk_homepage_hero_offer_facts() {\n    return array(\n'+Object.entries(values).map(([key,value])=>'        '+quote(key)+' => '+(typeof value==='number'?value:quote(value))+',').join('\n')+'\n    );\n}\n'+end;
 return source.slice(0,source.indexOf(start))+body+source.slice(source.indexOf(end)+end.length);
}
export async function buildHeroOfferFacts(file){
 const source=await readFile(file,'utf8'),output=renderHeroOfferFacts(source,await loadOfferFacts());
 if(output!==source)await writeFile(file,output);
}
