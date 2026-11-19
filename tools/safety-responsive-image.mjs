import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export const safetyImageVariants=Object.freeze([
  {jpeg:'6bedcadfd8a4-07rys9-iekc1684325057-1080x675.jpg',jpegSHA256:'1ada81057cab6cb923d05e6bf6e07599b3644bd9f656ccf7981dc4fdd1af4728',avif:'4bf4a4ca1523-safety-1080.avif',avifSHA256:'4bf4a4ca15232af1d563e97229e074fa755db0cef887d9c0c97206569f43f19d',width:1080,height:675},
  {jpeg:'d9efbe66295b-07rys9-iekc1684325057-980x653.jpg',jpegSHA256:'37096e467e58659532eead04a86627ac7aee24a865c2372c877d9ad4470ff877',avif:'f36b4466ea7f-safety-980.avif',avifSHA256:'f36b4466ea7fb91fbdfe688551b1a8737e0406f6a965375ec750eb725ef4d4aa',width:980,height:653},
  {jpeg:'6a5026e758d9-07rys9-iekc1684325057-480x320.jpg',jpegSHA256:'88bae5beb492af3dddb36edb7518b83e8210661404e7ec4702da5c0ceb687a6e',avif:'8d08833addfb-safety-480.avif',avifSHA256:'8d08833addfb2f806c8acc5fcc643a6918af09b6ba737c695ea7137b9f796e41',width:480,height:320},
].map(Object.freeze));

export async function loadSafetyResponsiveImage(assetRoot=new URL('../staging/wp-content/mu-plugins/ktk-code-pages-assets/media/',import.meta.url)){
  for(const row of safetyImageVariants)for(const [name,digest]of [[row.jpeg,row.jpegSHA256],[row.avif,row.avifSHA256]]){
    const bytes=await readFile(new URL(name,assetRoot));
    if(createHash('sha256').update(bytes).digest('hex')!==digest)throw Error('Reviewed Safety image bytes changed: '+name);
  }
  return {key:'post-krakow-safety-guide',version:'2026-11-19.safety-responsive-1',avifSrcset:safetyImageVariants.map(row=>'__KTK_PAGE_ASSETS__media/'+row.avif+' '+row.width+'w').join(', ')};
}

export function reviseSafetyResponsiveImage({key,revision}){
  if(key!=='post-krakow-safety-guide')return [];
  const avifSrcset='__KTK_PAGE_ASSETS__media/4bf4a4ca1523-safety-1080.avif 1080w, __KTK_PAGE_ASSETS__media/f36b4466ea7f-safety-980.avif 980w, __KTK_PAGE_ASSETS__media/8d08833addfb-safety-480.avif 480w';
  if(revision?.key!==key||revision.version!=='2026-11-19.safety-responsive-1'||revision.avifSrcset!==avifSrcset)throw Error('Reviewed Safety responsive image identity required');
  const expected={src:'__KTK_PAGE_ASSETS__media/6bedcadfd8a4-07rys9-iekc1684325057-1080x675.jpg',alt:'Kraków Safety Guide',class:'lazyloaded',width:'1080',height:'675',sizes:'(min-width: 0px) and (max-width: 480px) 480px, (min-width: 481px) and (max-width: 980px) 980px, (min-width: 981px) 1080px, 100vw',srcset:'__KTK_PAGE_ASSETS__media/6bedcadfd8a4-07rys9-iekc1684325057-1080x675.jpg 1080w, __KTK_PAGE_ASSETS__media/d9efbe66295b-07rys9-iekc1684325057-980x653.jpg 980w, __KTK_PAGE_ASSETS__media/6a5026e758d9-07rys9-iekc1684325057-480x320.jpg 480w',decoding:'async',loading:'lazy'};
  const matches=[...document.querySelectorAll('#main-content .et_post_meta_wrapper img')].filter(n=>n.getAttribute('src')===expected.src);
  if(matches.length!==1)throw Error('One exact original Safety featured image required');
  const image=matches[0],picture=image.parentElement,reviewed=picture.tagName==='PICTURE';
  const correctImage=loading=>image.attributes.length===Object.keys(expected).length&&Object.entries({...expected,loading}).every(([k,v])=>image.getAttribute(k)===v);
  if(reviewed){
    const source=picture.firstElementChild;
    if(picture.attributes.length!==1||picture.getAttribute('data-ktk-safety-responsive')!=='2026-11-19'||!picture.parentElement.matches('.et_post_meta_wrapper')||picture.childNodes.length!==2||picture.children.length!==2||picture.lastElementChild!==image||source?.tagName!=='SOURCE'||source.attributes.length!==3||source.getAttribute('type')!=='image/avif'||source.getAttribute('srcset')!==avifSrcset||source.getAttribute('sizes')!==expected.sizes||!correctImage('eager'))throw Error('Reviewed Safety picture changed');
    return [];
  }
  if(!picture.matches('.et_post_meta_wrapper')||!correctImage('lazy'))throw Error('Original Safety image preimage changed');
  const wrapper=document.createElement('picture'),source=document.createElement('source');
  wrapper.dataset.ktkSafetyResponsive='2026-11-19';source.type='image/avif';source.setAttribute('srcset',avifSrcset);source.setAttribute('sizes',expected.sizes);
  // Validate the complete preimage before changing the one image or its parent.
  image.replaceWith(wrapper);image.loading='eager';wrapper.append(source,image);
  return [{type:'safety-responsive-image',key,version:revision.version,originalJPEGFallbackAndAttributesPreserved:true,loading:'eager',fetchPriority:'auto'}];
}
