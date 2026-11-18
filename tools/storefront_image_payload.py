"""Reviewed responsive photo payload for the staging public storefront only."""
import hashlib
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PLUGIN=ROOT/'staging/wp-content/plugins/ktk-storefront'
LEDGER=ROOT/'tools/fixtures/product-image-sizes.json'
MANIFEST='includes/product-image-sizes.json'


def descriptors():
    ledger=json.loads(LEDGER.read_text(encoding='utf-8'))
    if ledger.get('schemaVersion')!=1 or ledger.get('productId')!=28 or len(ledger.get('images',{}))!=8:
        raise ValueError('Reviewed eight-photo product-28 ledger required')
    result={}
    for index,(url,image) in enumerate(ledger['images'].items(),1):
        if not re.fullmatch(r'https://media\.krawlthroughkrakow\.com/products/28/[A-Za-z0-9._-]+\.(jpg|webp)',url):
            raise ValueError('Exact public product-28 photo scope required')
        if not re.fullmatch(r'[a-f0-9]{64}',image['sha256']) or image['width']<1080 or image['height']<=0 or image['bytes']<=0:
            raise ValueError('Reviewed original photo descriptor required')
        if [r['width'] for r in image['variants']]!=[360,720,1080]:
            raise ValueError('Exactly three downscale sizes required')
        extension='jpg' if url.endswith('.jpg') else 'webp'
        for row in image['variants']:
            expected=f"product-images/pub-crawl-{index:02d}-{row['width']}-{row['sha256'][:12]}.{extension}"
            if row['path']!=expected or not re.fullmatch(r'[a-f0-9]{64}',row['sha256']) or row['width']>=image['width'] or not 0<row['bytes']<image['bytes'] or abs(row['height']-row['width']*image['height']/image['width'])>.5:
                raise ValueError('Exact reviewed format, dimensions, path and smaller bytes required')
            name='assets/'+row['path']
            if name in result:raise ValueError('Duplicate reviewed photo path')
            result[name]=row
    if len(result)!=24:raise ValueError('Complete twenty-four-file responsive photo cohort required')
    return ledger,result


def files():
    _,rows=descriptors()
    return (MANIFEST,*sorted(rows))


def validate(payload):
    ledger,rows=descriptors()
    manifest=json.loads(payload[MANIFEST])
    if set(manifest)!={'schemaVersion','productId','sizes','images'} or manifest['schemaVersion']!=1 or manifest['productId']!=28 or set(manifest['sizes'])!={'stage','thumbnail'}:
        raise ValueError('Exact runtime photo manifest required')
    expected={url:{'width':image['width'],'height':image['height'],'variants':[{'path':r['path'],'width':r['width']} for r in image['variants']]} for url,image in ledger['images'].items()}
    if manifest['images']!=expected:raise ValueError('Runtime photo manifest differs from the reviewed original cohort')
    for role,size in manifest['sizes'].items():
        if not isinstance(size,str) or len(size)>512 or not size or any(c in size for c in ['"',"'",'<','>',';','{','}']):raise ValueError('Bounded source-size expression required')
    for name,row in rows.items():
        raw=payload[name]
        source=PLUGIN/'frontend/public'/name.removeprefix('assets/')
        if len(raw)!=row['bytes'] or hashlib.sha256(raw).hexdigest()!=row['sha256'] or source.read_bytes()!=raw:
            raise ValueError('Built photo differs from its reviewed source bytes: '+name)
    return rows
