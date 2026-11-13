import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function loadReviewedImageDescriptions({
 reviewFile=new URL('./content-image-descriptions.json',import.meta.url),
 manifestFile=new URL('../docs/code-pages/full-migration/assets.json',import.meta.url),
 assetsDirectory=path.resolve('staging/wp-content/mu-plugins/ktk-code-pages-assets')
}={}) {
 const reviewBytes=await readFile(reviewFile),manifestBytes=await readFile(manifestFile);
 const review=JSON.parse(reviewBytes),manifest=JSON.parse(manifestBytes);
 if(review.schemaVersion!==1||review.status!=='visually-reviewed'||review.assetManifestSha256!==sha(manifestBytes))throw Error('Image review no longer matches its exact asset manifest');
 const result={missing:{},empty:{},sourceSha256:sha(reviewBytes),assetManifestSha256:sha(manifestBytes),reviewedOn:review.reviewedOn,counts:{missing:0,empty:0}};
 const used=new Set();
 for(const [mode,descriptions] of [['missing',review.descriptions],['empty',review.emptyAltOverrides]]){
  if(!descriptions||typeof descriptions!=='object'||Array.isArray(descriptions))throw Error('Explicit reviewed descriptions required');
  for(const [id,alt] of Object.entries(descriptions)){
   if(!/^[a-f0-9]{12}$/.test(id)||typeof alt!=='string'||!alt.trim()||alt!==alt.trim()||alt.length>200||used.has(id)||review.heldImageIds?.includes(id))throw Error('Invalid, repeated or held image description');
   const entries=Object.entries(manifest).filter(([,asset])=>asset.file?.startsWith('media/'+id+'-'));
   if(entries.length!==1)throw Error('Missing or ambiguous reviewed image identity: '+id);
   const [source,asset]=entries[0],root=path.resolve(assetsDirectory),file=path.resolve(root,asset.file);
   if(!file.startsWith(root+path.sep)||!/\.(?:png|jpe?g|webp)$/i.test(file)||sha(await readFile(file))!==asset.sha256)throw Error('Reviewed image bytes changed: '+id);
   result[mode][source]=alt;
   result[mode]['__KTK_PAGE_ASSETS__'+asset.file]=alt;
   used.add(id);result.counts[mode]++;
  }
 }
 if(!result.counts.missing)throw Error('A nonempty reviewed image set is required');
 return result;
}
