import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadEmbedFallbacks() {
  const identities = {
    "about-us": {
        "sha": "6e4b9608d8b811e49086800a04f1d72b282d67c4670a13210ba09cf00995c8a6",
        "indices": [
            0
        ]
    },
    "faqs": {
        "sha": "b4fe58b2ee407c980e99317a553663c1911eca98b5f58644aa33435ea6facd94",
        "indices": [
            0
        ]
    },
    "how-to-join": {
        "sha": "8ac39c6381242d3adbcedac6e8bcc45690bc19c4b3cc1f89fb5422ae67518bda",
        "indices": [
            0,
            1
        ]
    },
    "krakow-stag-do": {
        "sha": "c8c66dcbcefc50a3c0a0e2c6a381976624f1ab946055c3afcbc7eabf0b4c94c1",
        "indices": [
            0,
            1
        ]
    },
    "meeting-point": {
        "sha": "fc579c884982fe304439b6f030d5d9027cc95ca74df44521956beea44412d65c",
        "indices": [
            0
        ]
    },
    "new-years-eve": {
        "sha": "bf4cc3555e861d082f6cb224453d1207e2ec8e6871e775e10d714898285f3bd2",
        "indices": [
            0
        ]
    },
    "post-2020-krakow-nightlife-guide": {
        "sha": "426b51183b13cac4b0bf69933e6f9fd70cd3c0e8eea5fa6e0ae665de27faed84",
        "indices": [
            0,
            1,
            3,
            5
        ]
    },
    "post-new-years-eve-in-krakow": {
        "sha": "ea30d2cb59abd4f826153b8c4a6a37a6832715c8dfab1a1581309ad5e1f46b3b",
        "indices": [
            0,
            1
        ]
    },
    "post-welcome-to-alcohol": {
        "sha": "c8c83f5ed83be1fa1c6996cbe6d9786350626b58814119c7653190239fa51085",
        "indices": [
            0
        ]
    },
    "pub-crawl-jobs": {
        "sha": "a228d14bb3c9f6d9a1f39db3dcdf50b0b5347444d02c2bb1235bd9239341e916",
        "indices": [
            0
        ]
    },
    "testimonials": {
        "sha": "1f229391a4f6936d57402dcc491ccf60e262f2d94f1bb5adf573f251bbfc376a",
        "indices": [
            0
        ]
    },
    "tour-service-disclaimer": {
        "sha": "b129cdd50231008968eb882142e783274f3763c20fa892839a7e54a36575dbe7",
        "indices": [
            0
        ]
    }
};
  const rows=[];
  for(const [key,{sha,indices}] of Object.entries(identities)){
    const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');
    if(createHash('sha256').update(sourceHtml).digest('hex')!==sha)throw Error('Original embed capture changed: '+key);
    rows.push({key,sourceSha256:sha,sourceHtml,indices,version:'2026-11-15.embed-fallbacks-1'});
  }
  return rows;
}

export function reviseEmbedFallbacks({key,revision}) {
  const identities = {
    "about-us": {
        "sha": "6e4b9608d8b811e49086800a04f1d72b282d67c4670a13210ba09cf00995c8a6",
        "indices": [
            0
        ]
    },
    "faqs": {
        "sha": "b4fe58b2ee407c980e99317a553663c1911eca98b5f58644aa33435ea6facd94",
        "indices": [
            0
        ]
    },
    "how-to-join": {
        "sha": "8ac39c6381242d3adbcedac6e8bcc45690bc19c4b3cc1f89fb5422ae67518bda",
        "indices": [
            0,
            1
        ]
    },
    "krakow-stag-do": {
        "sha": "c8c66dcbcefc50a3c0a0e2c6a381976624f1ab946055c3afcbc7eabf0b4c94c1",
        "indices": [
            0,
            1
        ]
    },
    "meeting-point": {
        "sha": "fc579c884982fe304439b6f030d5d9027cc95ca74df44521956beea44412d65c",
        "indices": [
            0
        ]
    },
    "new-years-eve": {
        "sha": "bf4cc3555e861d082f6cb224453d1207e2ec8e6871e775e10d714898285f3bd2",
        "indices": [
            0
        ]
    },
    "post-2020-krakow-nightlife-guide": {
        "sha": "426b51183b13cac4b0bf69933e6f9fd70cd3c0e8eea5fa6e0ae665de27faed84",
        "indices": [
            0,
            1,
            3,
            5
        ]
    },
    "post-new-years-eve-in-krakow": {
        "sha": "ea30d2cb59abd4f826153b8c4a6a37a6832715c8dfab1a1581309ad5e1f46b3b",
        "indices": [
            0,
            1
        ]
    },
    "post-welcome-to-alcohol": {
        "sha": "c8c83f5ed83be1fa1c6996cbe6d9786350626b58814119c7653190239fa51085",
        "indices": [
            0
        ]
    },
    "pub-crawl-jobs": {
        "sha": "a228d14bb3c9f6d9a1f39db3dcdf50b0b5347444d02c2bb1235bd9239341e916",
        "indices": [
            0
        ]
    },
    "testimonials": {
        "sha": "1f229391a4f6936d57402dcc491ccf60e262f2d94f1bb5adf573f251bbfc376a",
        "indices": [
            0
        ]
    },
    "tour-service-disclaimer": {
        "sha": "b129cdd50231008968eb882142e783274f3763c20fa892839a7e54a36575dbe7",
        "indices": [
            0
        ]
    }
};
  if(!Object.hasOwn(identities,key))return [];
  const expected=identities[key],version='2026-11-15.embed-fallbacks-1';
  if(revision?.key!==key||revision.sourceSha256!==expected.sha||revision.version!==version||JSON.stringify(revision.indices)!==JSON.stringify(expected.indices)||typeof revision.sourceHtml!=='string')throw Error('Reviewed embed identity required');
  const original=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),main=document.querySelector('#main-content'),source=original.querySelector('#main-content');
  if(!main||!source)throw Error('Original content root required');
  const frames=root=>[...root.querySelectorAll('iframe')].filter(n=>!n.closest('noscript'));
  const old=frames(source),current=frames(main),states=[],plans=[];
  if(old.length!==current.length||!old.length||new Set(expected.indices).size!==expected.indices.length)throw Error('Complete original frame census required');
  const attrs=n=>JSON.stringify([...n.attributes].filter(a=>a.name!=='data-ktk-embed-fallback').map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0])));
  const normalized=node=>{
    const n=node.cloneNode(false);
    for(const a of [...n.attributes])if(/^on/i.test(a.name)||/^data-(wpr-|rocket-|cmp-|suppressedsrc|iub-)/.test(a.name))n.removeAttribute(a.name);
    n.classList.remove('_iub_cs_activate','cmplazyload','et-waypoint','entered','exited','lazyloading');
    if(n.querySelector('iframe,form'))n.classList.remove('et_clickable');
    return n;
  };
  const frameSource=n=>n.dataset.lazySrc||n.dataset.suppressedsrc||n.dataset.cmpSrc||n.getAttribute('src');
  const prepared=(node,index)=>{
    const src=frameSource(node);if(!src||src==='about:blank')throw Error('Recoverable original provider source required');
    const u=new URL(src,'https://krawlthroughkrakow.com/');if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Original HTTPS provider source required');
    if(u.hostname==='www.instagram.com'){u.search='';u.hash='';}
    const n=normalized(node);
    if(u.hostname==='app.shapo.io'){n.id='ktk-shapo-widget-'+u.pathname.split('/').filter(Boolean).at(-1);n.classList.add('ktk-shapo-widget');}
    n.dataset.ktkEmbedSrc=u.href;n.src='about:blank';n.title=n.title||`Embedded ${/google.*maps/.test(src)?'map':/youtube|vimeo/.test(src)?'video':'content'} ${index+1}`;
    n.removeAttribute('data-lazy-src');n.removeAttribute('data-ll-status');n.loading='lazy';return n;
  };
  const alternative=(n)=>{
    const u=new URL(frameSource(n),'https://krawlthroughkrakow.com/');let kind,label,href;
    if(u.hostname==='www.google.com'&&u.pathname.startsWith('/maps/')){kind='map';label='Open this map on Google Maps';href=u.href;}
    else if(u.hostname==='www.youtube.com'&&/^\/embed\/[A-Za-z0-9_-]{11}$/.test(u.pathname)){kind='video';label='Open this video on YouTube';href='https://www.youtube.com/watch?v='+u.pathname.split('/').at(-1);}
    else if(u.hostname==='player.vimeo.com'&&u.pathname==='/video/892352668'&&u.searchParams.get('h')==='df4cdc75d0'){kind='video';label='Open this video on Vimeo';href=u.href;}
    else if(u.hostname==='www.instagram.com'&&/^\/p\/[A-Za-z0-9_-]+\/embed\/$/.test(u.pathname)){kind='post';label='Open this post on Instagram';href='https://www.instagram.com'+u.pathname.replace(/embed\/$/,'');}
    else if(u.hostname==='www.facebook.com'&&u.pathname==='/plugins/video.php'){
      const native=new URL(u.searchParams.get('href'));if(native.origin!=='https://www.facebook.com'||native.pathname!=='/krawlthroughkrakow/videos/1121102991356886/'||native.search||native.hash)throw Error('Original Facebook video identity required');
      kind='video';label='Open this video on Facebook';href=native.href;
    }else if(u.hostname==='app.shapo.io'&&u.pathname==='/widgets/c03d8874cf23743d1c78'){
      if(!main.querySelector('#ktk-review-platform-title'))throw Error('Existing native review section required');
      kind='reviews';label='Read reviews on the original platforms';href='#ktk-review-platform-title';
    }else throw Error('Unreviewed provider or embedded resource');
    return {kind,label,href};
  };
  // Inspect every frame, including the three retained Instagram/native alternatives, before planning edits.
  for(let i=0;i<old.length;i++){
    const a=old[i],b=current[i],preparedFrame=prepared(a,i);
    if(b.outerHTML!==a.outerHTML&&b.outerHTML!==preparedFrame.outerHTML)throw Error('Original iframe attributes changed: '+i);
    if(!expected.indices.includes(i))continue;
    const parent=b.parentElement,oldParent=a.parentElement,module=b.closest('.et_pb_code,.et_pb_video,.et_pb_text,.et_pb_module')||parent,oldModule=a.closest('.et_pb_code,.et_pb_video,.et_pb_text,.et_pb_module')||oldParent;
    const normalParent=normalized(oldParent),normalModule=normalized(oldModule);
    if(oldModule.querySelector('iframe,form'))normalModule.classList.remove('et_clickable');
    if(parent.tagName!==oldParent.tagName||module.tagName!==oldModule.tagName||![attrs(oldParent),attrs(normalParent)].includes(attrs(parent))||![attrs(oldModule),attrs(normalModule)].includes(attrs(module))||module.querySelectorAll('iframe').length!==1||parent.textContent.trim()&&!parent.hasAttribute('data-ktk-embed-fallback'))throw Error('Original single-frame parent/module required: '+i);
    const identity=key+'-'+i,{kind,label,href}=alternative(a),notice=document.createElement('p'),bar=document.createElement('p'),link=document.createElement('a');
    notice.dataset.ktkEmbedNotice=identity;notice.textContent=kind==='reviews'?'Embedded reviews are off until you allow embedded content in privacy settings.':`This embedded ${kind} is off until you allow embedded content in privacy settings.`;
    bar.dataset.ktkEmbedAlternative=identity;link.href=href;link.textContent=label;
    if(!href.startsWith('#')){link.target='_blank';link.rel='noopener noreferrer';}
    bar.append(link);
    const done=parent.hasAttribute('data-ktk-embed-fallback');
    if(done){
      if(parent.dataset.ktkEmbedFallback!==identity||parent.children.length!==2||parent.children[0]!==b||parent.children[1].outerHTML!==notice.outerHTML||module.nextElementSibling?.outerHTML!==bar.outerHTML)throw Error('Reviewed embed fallback changed: '+i);
    }else if(parent.children.length!==1||parent.children[0]!==b||main.querySelector(`[data-ktk-embed-notice="${identity}"],[data-ktk-embed-alternative="${identity}"]`))throw Error('Original iframe-only insertion slot required: '+i);
    states.push(done);plans.push({parent,module,notice,bar,identity,index:i});
  }
  if(plans.length!==expected.indices.length||states.some(Boolean)&&!states.every(Boolean))throw Error('Incomplete or partially revised embed fallback state');
  const count=states.every(Boolean)?plans.length:0;
  if(main.querySelectorAll('[data-ktk-embed-fallback]').length!==count||main.querySelectorAll('[data-ktk-embed-notice]').length!==count||main.querySelectorAll('[data-ktk-embed-alternative]').length!==count)throw Error('Unknown embed fallback marker');
  if(count)return [];
  // All late frames, original attributes, existing alternatives and new destinations passed before any mutation.
  for(const p of plans){p.parent.dataset.ktkEmbedFallback=p.identity;p.parent.append(p.notice);p.module.after(p.bar);}
  return plans.map(p=>({type:'withheld-embed-native-alternative',index:p.index,version}));
}

const styles=`/* BEGIN Withheld embed alternatives */
body.ktk-code-page #main-content [data-ktk-embed-fallback] { position: relative; }
body.ktk-code-page #main-content [data-ktk-embed-notice] { position: absolute; inset: 0; margin: 0; padding: 12px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; color: #222; background: #f5f5f5; border: 1px solid #767676; font-family: inherit; font-size: 16px; line-height: 1.5; text-align: center; pointer-events: none; }
body.ktk-code-page #main-content iframe:not([src="about:blank"]) + [data-ktk-embed-notice] { display: none; }
body.ktk-code-page #main-content [data-ktk-embed-alternative] { margin: 0 0 20px; padding: 0 12px; color: #222; background: #fff; box-sizing: border-box; font-family: inherit; font-size: 16px; line-height: 1.5; text-align: left; }
body.ktk-code-page #main-content [data-ktk-embed-alternative] a { display: inline-block; box-sizing: border-box; min-height: 44px; padding: 10px 0; color: inherit; text-decoration: underline; text-underline-offset: .15em; overflow-wrap: anywhere; }
body.ktk-code-page #main-content [data-ktk-embed-alternative] a:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
@media (max-width: 600px) {
  body.ktk-code-page #main-content :is([data-ktk-embed-notice],[data-ktk-embed-alternative]) { padding-right: 24px; }
}
/* END Withheld embed alternatives */
`;
export async function buildEmbedFallbackStyles(file){
  const css=await readFile(file,'utf8'),anchor='/* END Operator identity and trust */\n';
  if(css.split(anchor).length!==2)throw Error('Stable operator/trust style boundary required');
  if(css.includes('/* BEGIN Withheld embed alternatives */')||css.includes('/* END Withheld embed alternatives */')){
    if(css.split('/* BEGIN Withheld embed alternatives */').length!==2||css.split('/* END Withheld embed alternatives */').length!==2||!css.includes(anchor+styles))throw Error('Embed fallback stylesheet drift');return;
  }
  await writeFile(file,css.replace(anchor,anchor+styles));
}
