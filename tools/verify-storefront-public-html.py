"""Read-only HTTP/source verification of the staging public storefront release."""
import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import urllib.request
from datetime import datetime,timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,parse_qs

ROOT=Path(__file__).resolve().parents[1]
ORIGIN='https://krawlthroughkrakow.com'
SPEC=importlib.util.spec_from_file_location('discovery_verify',ROOT/'tools/verify-seo-discovery.py')
shared=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(shared)
AGENTS=shared.parser_module.DEVICES
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}


class PublicHTML(HTMLParser):
    def __init__(self):
        super().__init__();self.stack=[];self.public_depth=None;self.text=[];self.links=[];self.images=[];self.hidden_root=False;self.marker=False;self.version=None;self.styles=[];self.scripts=[];self.h1=[];self.in_h1=False
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if attrs.get('id')=='ktk-storefront-public-content':self.public_depth=len(self.stack);self.marker=True;self.version=attrs.get('data-public-content')
        if tag=='link' and attrs.get('rel')=='stylesheet':self.styles.append(attrs)
        if attrs.get('id')=='ktk-storefront-root':self.hidden_root='hidden' in attrs
        if tag=='script' and attrs.get('src'):self.scripts.append(attrs['src'])
        if tag=='h1':self.h1.append('');self.in_h1=True
        if self.public_depth is not None:
            self.text.append(' ')
            if tag=='a':self.links.append(attrs.get('href',''))
            if tag=='img':self.images.append(attrs)
        if tag not in VOID:self.stack.append(tag)
    def handle_endtag(self,tag):
        if tag=='h1':self.in_h1=False
        if tag in self.stack:
            index=len(self.stack)-1-self.stack[::-1].index(tag)
            self.stack=self.stack[:index]
            if self.public_depth is not None and len(self.stack)<=self.public_depth:self.public_depth=None
    def handle_data(self,data):
        if self.in_h1:self.h1[-1]+=data
        if self.public_depth is not None and not {'script','style','noscript'}&set(self.stack):self.text.append(data)


def normalize(value):return re.sub(r'\s+',' ',str(value or '')).strip()
def renderer_version(source):
    matches=re.findall(r"^\s*const VERSION = '([0-9]+(?:\.[0-9]+){3})';\s*$",source,re.MULTILINE)
    if len(matches)!=1:raise ValueError('Expected one explicit public renderer version')
    return matches[0]


def current_renderer(public,expected_version):
    return public.version==expected_version and any(urlsplit(item.get('href','')).path.endswith('/assets/storefront.css') and item.get('data-no-minify')=='1' for item in public.styles)


def fetch(url,agent):
    request=urllib.request.Request(url,headers={'User-Agent':agent,'Accept':'text/html,application/json;q=0.9'})
    with urllib.request.urlopen(request,timeout=60) as response:return response.status,{key.lower():value for key,value in response.headers.items()},response.read()


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True);parser.add_argument('--cache-bust',action='store_true');args=parser.parse_args()
    output=ROOT/args.output
    if output.exists():raise RuntimeError('Preserve prior source report; select a new filename')
    expected_version=renderer_version((ROOT/'staging/wp-content/plugins/ktk-storefront/includes/class-ktk-storefront-public-content.php').read_text(encoding='utf-8'))
    _,_,body=fetch(ORIGIN+'/staging/wp-json/ktk-storefront/v1/products',AGENTS['desktop'])
    products=json.loads(body)['products']
    resolved=json.loads(subprocess.run(['php','tools/tests/storefront-public-fixture.php'],input=json.dumps({'action':'resolve','products':products}).encode(),capture_output=True,check=True,cwd=ROOT).stdout)
    expected={product['slug']:content for product,content in zip(products,resolved)}
    checks=[];responses=[]
    def check(name,passed,detail=None):checks.append({'name':name,'passed':bool(passed),'detail':detail})
    query='?ktk_public_html='+datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S') if args.cache_bust else ''
    for device,agent in AGENTS.items():
        for product in [None]+products:
            slug=product['slug'] if product else '';route='/staging/store2/'+(slug+'/' if slug else '')
            status,headers,body=fetch(ORIGIN+route+query,agent);html=body.decode('utf-8')
            head=shared.parser_module.Head();head.feed(html);public=PublicHTML();public.feed(html)
            title=product['name'] if product else 'Krakow experiences';text=normalize(''.join(public.text));name=device+' '+route
            h1=[normalize(value) for value in public.h1]
            check(name+' HTTP/public marker',status==200 and public.marker and public.hidden_root)
            check(name+' optimizer-safe current public renderer',current_renderer(public,expected_version),{'expectedVersion':expected_version,'actualVersion':public.version})
            check(name+' one actual primary heading',h1==[title],h1)
            robots=[item.get('content','').lower() for item in head.meta if item.get('name')=='robots']
            check(name+' noindex and exact staging canonical','noindex' in ','.join(robots) and [item.get('href') for item in head.links if item.get('rel')=='canonical']==[ORIGIN+route])
            if product:
                content=expected[slug]
                check(name+' shared description/inclusions',all(normalize(value) in text for value in [content['summary'],content['description']]+content['highlights'] if value))
                check(name+' actual meeting text',not content['meetingPoint'] or all(normalize(value) in text for key,value in content['meetingPoint'].items() if key!='mapUrl' and value))
                check(name+' honest first image',not content['gallery'] or public.images and public.images[0].get('src')==content['gallery'][0] and public.images[0].get('fetchpriority')=='high' and public.images[0].get('data-no-lazy')=='1')
            else:check(name+' every public product has a native link',all(ORIGIN+'/staging/store2/'+item['slug']+'/' in public.links for item in products))
            for filename in ['storefront.js','storefront.css']:
                digest=hashlib.sha256((ROOT/'staging/wp-content/plugins/ktk-storefront/assets'/filename).read_bytes()).hexdigest()
                values=public.scripts+[item.get('href','') for item in head.links]
                check(name+' current '+filename+' version',any(urlsplit(value).path.endswith('/assets/'+filename) and parse_qs(urlsplit(value).query).get('ver')==[digest[:12]] for value in values))
            responses.append({'device':device,'route':route,'status':status,'cache':headers.get('cf-cache-status'),'h1':h1,'public':public.marker})
        for route in ['/staging/store2/cart/','/staging/store2/checkout/','/staging/store2/checkout/success/','/staging/store/']:
            _,_,body=fetch(ORIGIN+route+query,agent)
            check(device+route+' no public product/private-data rendering',b'id="ktk-storefront-public-content"' not in body)
    for filename in ['storefront.js','storefront.css','storefront-montserrat-latin.woff2','storefront-montserrat-latin-ext.woff2','storefront-oswald-latin.woff2','storefront-oswald-latin-ext.woff2']:
        value=(ROOT/'staging/wp-content/plugins/ktk-storefront/assets'/filename).read_bytes();digest=hashlib.sha256(value).hexdigest()
        _,_,body=fetch(ORIGIN+'/staging/wp-content/plugins/ktk-storefront/assets/'+filename+'?ver='+digest[:12],AGENTS['desktop'])
        check('staging asset SHA256 '+filename,hashlib.sha256(body).hexdigest()==digest)
    for route in ['/store2/','/store2/pub-crawl-28/','/store2/nye-pub-crawl-32/']:
        _,_,body=fetch(ORIGIN+route,AGENTS['desktop'])
        check('production still uses prior renderer '+route,b'id="ktk-storefront-public-content"' not in body)
    for filename in ['storefront.js','storefront.css']:
        old=subprocess.run(['git','show','dc22fa6c03734644ccde3f2ce725f2900151ff61:staging/wp-content/plugins/ktk-storefront/assets/'+filename],capture_output=True,check=True,cwd=ROOT).stdout
        _,_,body=fetch(ORIGIN+'/wp-content/plugins/ktk-storefront/assets/'+filename,AGENTS['desktop'])
        check('production original asset '+filename,hashlib.sha256(body).hexdigest()==hashlib.sha256(old).hexdigest())
    report={'checkedAt':datetime.now(timezone.utc).isoformat(),'cacheBust':args.cache_bust,'expectedRendererVersion':expected_version,'products':len(products),'summary':{'passed':sum(item['passed'] for item in checks),'total':len(checks)},'checks':checks,'responses':responses}
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'summary':report['summary'],'failed':[item for item in checks if not item['passed']]},indent=2))
    return int(report['summary']['passed']!=report['summary']['total'])


if __name__=='__main__':raise SystemExit(main())
