import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const output=process.argv[2],files=['Jenga.pdf','Kingscup-2.pdf','5-second-rule-.pdf','Never-have-i-ever-.pdf'];
if(!output)throw Error('Fresh report required');try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const report={checkedAt:new Date().toISOString(),scope:'Sequential public read-only GETs; no PDF writes, website changes or credentials.',resources:[],errors:[]};
try{
 for(const file of files){
  const rows=[];for(const prefix of ['https://krawlthroughkrakow.com/','https://krawlthroughkrakow.com/staging/',...(file==='Jenga.pdf'?['https://krawlthroughkrakow.b-cdn.net/']:[])]){
   const url=prefix+'wp-content/uploads/2020/04/'+file,response=await fetch(url,{signal:AbortSignal.timeout(180000),redirect:'error',headers:{'User-Agent':'KTK-public-resource-audit/1.0'}});if(response.status!==200||!/^application\/pdf(?:;|$)/i.test(response.headers.get('content-type')||'')){const failed={url,status:response.status,type:response.headers.get('content-type')};await response.body?.cancel();if(prefix==='https://krawlthroughkrakow.b-cdn.net/'){report.legacyCdn={...failed,pdfAvailable:false};continue;}throw Error('Expected original PDF200: '+url);}
   const hash=createHash('sha256');let bytes=0,head=Buffer.alloc(0);for await(const chunk of response.body){bytes+=chunk.byteLength;if(bytes>60*1024*1024)throw Error('PDF audit size bound exceeded');hash.update(chunk);if(head.length<5)head=Buffer.concat([head,Buffer.from(chunk)]).subarray(0,5);}
   if(head.toString('ascii')!=='%PDF-')throw Error('PDF signature required');rows.push({url,status:response.status,type:response.headers.get('content-type'),bytes,sha256:hash.digest('hex')});
  }
  if(!rows.every(r=>r.bytes===rows[0].bytes&&r.sha256===rows[0].sha256))throw Error('Original PDF environment/CDN parity mismatch: '+file);
  if(file==='Jenga.pdf'&&(rows[0].bytes!==47823024||rows[0].sha256!=='44e998c0e4f3ae652a3b2731d407974e58abe267be06f3b78821a759749097f9'))throw Error('Preserved Jenga source changed');report.resources.push({file,parity:true,responses:rows});console.log(file+': '+rows[0].bytes+' bytes, exact '+rows.length+'-destination parity');
 }
}catch(e){report.errors.push(e.stack);}await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({resources:report.resources.length,errors:report.errors},null,2));if(report.errors.length)process.exitCode=1;
