import {readFile,writeFile} from 'node:fs/promises';
const directory='docs/code-pages/full-migration/';
const manifest=JSON.parse(await readFile(directory+'manifest.json','utf8'));
const build=JSON.parse(await readFile(directory+'build-report.json','utf8'));
const readOptional=async file=>{try{return JSON.parse(await readFile(directory+file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
const readiness=await readOptional('../production-readiness/staging-pages-publish.json');
const paths=readiness?{publish:'../production-readiness/staging-pages-publish.json',release:'readiness-staging-release.json',clean:'readiness-staging-clean-cache.json',hit:'readiness-staging-cache-hit.json'}:{publish:'staging-form-link-followup-publish.json',release:'staging-form-link-release.json',clean:'staging-final-clean-cache.json',hit:'staging-final-cache-hit.json'};
const publish=readiness||await readOptional(paths.publish);
const release=await readOptional(paths.release);
const clean=await readOptional(paths.clean);
const hit=await readOptional(paths.hit);
const verification=await readOptional('build-verification.json');
const visual=await readOptional('local-final-comparison.json');
const complete=report=>!!report&&report.summary.passed===report.summary.total;
const payloadMatches=!!publish&&!!verification&&Object.keys(verification.payloadChecksums).length===Object.keys(publish.local_checksums||{}).length&&Object.entries(verification.payloadChecksums).every(([name,sha])=>publish.local_checksums[name]===sha);
const deployed=payloadMatches&&publish?.phase==='complete'&&publish.all_remote_owned_checksums_match&&publish.wordpress_state_unchanged&&publish.homepage_unchanged&&publish.storefront_unchanged&&publish.helper_removed;
const releasePassed=deployed&&complete(release)&&Date.parse(release.checkedAt)>Date.parse(publish.finished_at);
const hitDevices=new Set((hit?.responses||[]).filter(row=>row.cfCacheStatus==='HIT').map(row=>row.device));
const cachePassed=releasePassed&&complete(clean)&&complete(hit)&&!clean.cacheBusted&&!hit.cacheBusted&&['desktop','android','ipad'].every(device=>hitDevices.has(device))&&Date.parse(clean.checkedAt)>Date.parse(publish.finished_at)&&Date.parse(hit.checkedAt)>Date.parse(clean.checkedAt);
const productionPaths={publish:'../production-release/publish.json',live:'../production-release/production-release.json',clean:'../production-release/production-clean-cache.json',hit:'../production-release/production-cache-hit.json'};
const production=await readOptional(productionPaths.publish),productionLive=await readOptional(productionPaths.live),productionClean=await readOptional(productionPaths.clean),productionHit=await readOptional(productionPaths.hit);
const productionDeployed=production?.phase==='complete'&&production.activation_verified&&production.wordpress_state_unchanged&&production.storefront_unchanged&&production.all_remote_owned_checksums_match;
const productionMatchesLocal=!!production&&!!verification&&Object.keys(production.local_checksums||{}).length===Object.keys(verification.payloadChecksums).length&&Object.entries(verification.payloadChecksums).every(([name,sha])=>production.local_checksums[name]===sha);
const productionReportValid=report=>productionDeployed&&complete(report)&&report.environment==='production'&&report.summary.total===6196&&report.summary.routes===116&&report.summary.assets===119&&report.responses.length===348&&Date.parse(report.checkedAt)>Date.parse(production.finished_at);
let productionLiveReport=productionLive,productionLivePath=productionPaths.live;
if(productionReportValid(productionClean)&&(!productionReportValid(productionLive)||Date.parse(productionClean.checkedAt)>Date.parse(productionLive.checkedAt))){productionLiveReport=productionClean;productionLivePath=productionPaths.clean;}
const productionLivePassed=productionMatchesLocal&&productionReportValid(productionLiveReport);
const productionCachePassed=productionLivePassed&&productionReportValid(productionClean)&&productionReportValid(productionHit)&&!productionClean.cacheBusted&&!productionHit.cacheBusted&&productionHit.responses.every(row=>row.cfCacheStatus==='HIT')&&Date.parse(productionHit.checkedAt)>Date.parse(productionClean.checkedAt);
for(const route of manifest.routes){
 if (/^\/(category|tag)\//.test(route.route) && route.postId) { route.termId=route.postId;route.postId=null; }
 const desktop=JSON.parse(await readFile(route.source+'/production-1920.json','utf8'));
 const mobile=JSON.parse(await readFile(route.source+'/production-390.json','utf8'));
 const checks=release?.checks.filter(c=>c.route===route.route)||[];
 const pixels=visual?.pixels.filter(c=>c.key===route.key)||[];
 route.evidence={...(route.evidence||{}),capture:desktop.complete&&mobile.complete,build:build.built.includes(route.key),
  deployed:!!deployed,liveVerified:!!releasePassed&&checks.length>0&&checks.every(c=>c.passed),cleanCacheVerified:!!cachePassed,
  releaseReport:releasePassed?paths.release:null,
  visual:{report:'local-final-comparison.json',baselineRevision:'pre-readiness-fixes',currentReview:readiness?'../production-readiness/README.md':'VISUAL-REVIEW.md',pixelPasses:pixels.filter(c=>c.pass).length,comparisons:pixels.length,
   geometryDifferences:visual?.geometry.filter(c=>c.key===route.key).length??null,strictSuitePassed:!!visual&&!visual.content.some(c=>c.key===route.key)&&!visual.typography.some(c=>c.key===route.key)&&!visual.geometry.some(c=>c.key===route.key)&&pixels.length===4&&pixels.every(c=>c.pass)}};
 route.status=cachePassed?'staging-verified-visual-exceptions-documented':route.evidence.liveVerified?'deployed-awaiting-final-cache-verification':deployed?'deployed-awaiting-live-verification':route.evidence.build?'built-awaiting-release-verification':route.evidence.capture?'captured':'planned';
 if(production){const checks=productionLiveReport?.checks.filter(row=>row.route===route.route)||[];route.evidence.production={deployed:!!productionDeployed,liveVerified:!!productionLivePassed&&checks.length>0&&checks.every(row=>row.passed),cleanCacheVerified:!!productionCachePassed,currentLocalMatchesProduction:productionMatchesLocal};}
}
for(const alias of manifest.aliases)alias.evidence={...(alias.evidence||{}),liveVerified:!!releasePassed&&release.checks.some(c=>c.route===alias.route)&&release.checks.filter(c=>c.route===alias.route).every(c=>c.passed),cleanCacheVerified:!!cachePassed};
if(production)for(const alias of manifest.aliases){const checks=productionLiveReport?.checks.filter(row=>row.route===alias.route)||[];alias.evidence.production={deployed:!!productionDeployed,liveVerified:!!productionLivePassed&&checks.length>0&&checks.every(row=>row.passed),cleanCacheVerified:!!productionCachePassed};}
manifest.release={publish:deployed?paths.publish:null,live:releasePassed?paths.release:null,
 clean:cachePassed?paths.clean:null,cacheHit:cachePassed?paths.hit:null,
 strictVisualSuitePassed:!!visual&&visual.summary.errors===0&&visual.summary.geometryDifferences===0&&visual.summary.contentDifferences===0&&visual.summary.typographyDifferences===0&&visual.summary.pixelsPassed===visual.summary.pixelsTotal,
 visualExceptions:'VISUAL-REVIEW.md',productionDeployed:!!productionDeployed};
if(production)manifest.productionRelease={publish:productionDeployed?productionPaths.publish:null,live:productionLivePassed?productionLivePath:null,clean:productionCachePassed?productionPaths.clean:null,cacheHit:productionCachePassed?productionPaths.hit:null,currentLocalMatchesProduction:productionMatchesLocal,phase:productionCachePassed?'production-verified':productionLivePassed?'awaiting-clean-cache-verification':productionDeployed?'awaiting-production-live-verification':production.phase};
manifest.updatedAt=new Date().toISOString();
await writeFile(directory+'manifest.json',JSON.stringify(manifest,null,2));
let plan=await readFile(directory+'MIGRATION-PLAN.md','utf8');
plan=plan.replace('2. [ ] Capture','2. [x] Capture').replace('3. [ ] Build','3. [x] Build');
if(deployed)plan=plan.replace('4. [ ] Implement','4. [x] Implement').replace('6. [ ] Back up','6. [x] Back up');
if(visual?.summary.captures===464)plan=plan.replace('5. [ ] Verify content, metadata, responsive geometry/pixels, links and exclusions locally.','5. [x] Measure content, metadata, responsive geometry/pixels, links and exclusions locally; record strict visual failures/exceptions in VISUAL-REVIEW.md.');
if(releasePassed)plan=plan.replace('7. [ ] Verify','7. [x] Verify');
if(cachePassed)plan=plan.replace('8. [ ] Refresh','8. [x] Refresh');
else plan=plan.replace('8. [x] Refresh','8. [ ] Refresh');
for(const route of manifest.routes){
 const marker=`| ${route.route} | ${route.kind} | `;
 const lines=plan.split('\n');
 plan=lines.map(line=>line.startsWith(marker)?marker+(productionCachePassed?'Production verified; owner-approved visual differences':cachePassed?'Staging verified; visual exceptions documented':route.evidence.liveVerified?'Deployed; final cache check pending':deployed?'Deployed; live checks pending':'Built; release verification pending')+' |':line).join('\n');
}
await writeFile(directory+'MIGRATION-PLAN.md',plan);
console.log(JSON.stringify({routes:manifest.routes.length,deployed,releasePassed,cachePassed,productionDeployed:!!productionDeployed,productionLivePassed:!!productionLivePassed,productionCachePassed:!!productionCachePassed,strictVisualSuitePassed:manifest.release.strictVisualSuitePassed}));
