export function reviewedArticleAuditLink(link,base){
 const clean=value=>(value||'').replace(/\s+/g,' ').trim(),url=new URL(link.href||'',base);let text=clean(link.text);
 if(url.origin===new URL(base).origin&&url.pathname==='/cdn-cgi/l/email-protection'){
  const decode=hex=>{if(typeof hex!=='string'||!/^(?:[a-f0-9]{2}){2,256}$/i.test(hex))throw Error('Malformed Cloudflare email identity');const key=parseInt(hex.slice(0,2),16),bytes=Uint8Array.from(hex.slice(2).match(/.{2}/g),v=>parseInt(v,16)^key),raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(/[<>\u0000-\u001f]/.test(raw))throw Error('Malformed Cloudflare email identity');const address=raw.replace(/^ +| +$/g,'');if(!address||/\s/.test(address)||!address.includes('@'))throw Error('Malformed Cloudflare email identity');return address;};
  if(url.search)throw Error('Changed Cloudflare email query');const address=decode(url.hash.slice(1));
  if(decode(link.encoded)!==address||!['[email protected]',address].includes(text))throw Error('Changed Cloudflare email text');
  return ['mailto:'+address,address];
 }
 return [url.href.replace(/^mailto:\s+/i,'mailto:'),text];
}
