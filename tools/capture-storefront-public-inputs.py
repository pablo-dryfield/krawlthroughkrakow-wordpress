"""Capture only public catalog and cancellation text for isolated storefront tests."""
import argparse
import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE='https://krawlthroughkrakow.com/staging/wp-json/ktk-storefront/v1'


def read(path):
    request=urllib.request.Request(BASE+path,headers={'User-Agent':'Mozilla/5.0 KTK public SEO audit/1.0','Accept':'application/json'})
    with urllib.request.urlopen(request,timeout=60) as response:
        if response.status!=200 or response.url!=BASE+path: raise RuntimeError('Expected unchanged public API route')
        body=response.read()
        return json.loads(body),hashlib.sha256(body).hexdigest()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True);args=parser.parse_args()
    output=ROOT/args.output
    if output.exists(): raise RuntimeError('Preserve earlier public capture; choose another filename')
    catalog,catalog_hash=read('/products');regular,regular_hash=read('/products/pub-crawl-28')
    products=catalog.get('products'); identities=[item['id'] for item in products or []]
    if not products or len(set(identities))!=len(identities) or not {28,32}<=set(identities): raise RuntimeError('Complete public catalog required')
    result={'capturedAt':datetime.now(timezone.utc).isoformat(),'products':products,
            'cancellationPolicy':regular.get('storefrontConfig',{}).get('cancellationPolicy'),
            'sourceHashes':{'catalog':catalog_hash,'regular':regular_hash}}
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,indent=2,ensure_ascii=True)+'\n',encoding='utf-8')
    print(json.dumps({'products':len(products),'output':args.output}))
