import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {iconFontFiles} from './homepage-icon-font.mjs';
const [output]=process.argv.slice(2);if(!output)throw Error('Fresh report required');
try{await readFile(output);throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const base='https://krawlthroughkrakow.com/staging/',root='staging/wp-content/mu-plugins/ktk-homepage-assets/',checks=[],devices=[],assets=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cssBytes=await readFile(root+'parity-runtime.css'),cssHash=hash(cssBytes);
const agents={desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',ipad:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'};
const url=base+(process.argv.includes('--cache-bust')?'?ktk_font_check='+Date.now():'');
for(const [device,userAgent]of Object.entries(agents)){
 const response=await fetch(url,{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(60000)}),html=await response.text();
 const href=html.match(/href=["']([^"']*\/ktk-homepage-assets\/parity-runtime\.css(?:\?[^"']*)?)["']/)?.[1]?.replaceAll('&amp;','&');
 check(device+' homepage200',response.status===200,response.status);
 check(device+' staging stays noindex',/<meta\b(?=[^>]*name=["']robots["'])(?=[^>]*content=["'][^"']*noindex)[^>]*>/i.test(html));
 check(device+' current CSS version',!!href&&new URL(href,base).searchParams.get('v')===cssHash.slice(0,12),href);
 if(href){
  const cssResponse=await fetch(new URL(href,base),{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(60000)}),bytes=Buffer.from(await cssResponse.arrayBuffer());
  check(device+' exact active CSS bytes',cssResponse.status===200&&hash(bytes)===cssHash);
  const modern=new URL('etmodules-full.woff2',new URL(href,base)),fontResponse=await fetch(modern,{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(60000)}),font=Buffer.from(await fontResponse.arrayBuffer());
  const detail={device,url:modern.href,status:fontResponse.status,bytes:font.length,hash:hash(font),type:fontResponse.headers.get('content-type'),encoding:fontResponse.headers.get('content-encoding'),cache:fontResponse.headers.get('cf-cache-status'),age:fontResponse.headers.get('age')};assets.push(detail);
  check(device+' full WOFF2 bytes200',detail.status===200&&detail.bytes===29392&&detail.hash===iconFontFiles['etmodules-full.woff2'],detail);
  check(device+' declared full WOFF2 and original fallbacks',bytes.includes(Buffer.from('url("etmodules-full.woff2") format("woff2")'))&&bytes.includes(Buffer.from('url("parity/e5109a227107-modules.woff")'))&&bytes.includes(Buffer.from('url("parity/4ec95df48507-modules.ttf")')));
 }
 devices.push({device,status:response.status,cache:response.headers.get('cf-cache-status'),age:response.headers.get('age'),css:href});
}
for(const [file,expected]of Object.entries(iconFontFiles).filter(([file])=>file.startsWith('parity/'))){
 const response=await fetch(base+'wp-content/mu-plugins/ktk-homepage-assets/'+file,{signal:AbortSignal.timeout(60000)}),bytes=Buffer.from(await response.arrayBuffer());
 check('original fallback '+file+' exact200',response.status===200&&hash(bytes)===expected,{status:response.status,bytes:bytes.length,hash:hash(bytes)});
}
const report={checkedAt:new Date().toISOString(),url,cacheBusted:url!==base,scope:'HTTP source/device/asset evidence only, not browser font selection, performance uplift or consent verification.',devices,assets,passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,devices,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
