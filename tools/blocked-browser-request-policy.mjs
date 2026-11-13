// This classifies an already-aborted request log; it never authorizes transmission.
export function isBlockedOptimizerFeedback(record,base){
 try{
  const url=new URL(base);
  const staging=url.origin==='https://krawlthroughkrakow.com'&&url.pathname==='/staging/store2/';
  const local=url.protocol==='http:'&&url.hostname==='127.0.0.1'&&url.pathname==='/store2/';
  return (staging||local)&&record?.blocked===true&&record.origin===url.origin
   &&record.path===new URL('../wp-admin/admin-ajax.php',url).pathname
   &&record.method==='POST'&&record.contentType==='multipart/form-data'&&record.action==='rocket_beacon';
 }catch{return false;}
}
