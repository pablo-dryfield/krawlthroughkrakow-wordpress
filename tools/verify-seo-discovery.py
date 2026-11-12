"""Read-only live checks for staging noindex and the canonical sitemap preview."""
import argparse
import hashlib
import json
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://krawlthroughkrakow.com'
OUT = ROOT / 'docs/seo/staging-discovery-2026-11-12'
SPEC = importlib.util.spec_from_file_location('head_parser',ROOT / 'tools/verify-code-pages-full-release.py')
parser_module = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(parser_module)
NS = {'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
STOREFRONT = ['/store2/','/store2/pub-crawl-28/','/store2/nye-pub-crawl-32/','/store2/cart/','/store2/checkout/']


def fetch(url, agent, method='GET'):
    request = urllib.request.Request(url, headers={'User-Agent':agent}, method=method)
    try: response = urllib.request.urlopen(request,timeout=60)
    except urllib.error.HTTPError as error: response = error
    with response:
        return response.status, {key.lower():value for key,value in response.headers.items()}, response.read()


def flags(robots):
    return set(re.split(r'[,\s]+',' '.join(robots).lower())) - {''}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase',choices=('before','after'),default='after')
    parser.add_argument('--cache-bust',action='store_true')
    parser.add_argument('--output',required=True)
    args = parser.parse_args()
    output = ROOT / args.output
    if output.exists(): raise RuntimeError('Keep earlier results; select a new output filename')
    data = json.loads((ROOT / 'staging/wp-content/mu-plugins/ktk-seo-sitemap-assets/data.json').read_text())
    checks = []; responses = []; controls = []
    def check(name,passed,detail=None): checks.append({'name':name,'passed':bool(passed),'detail':detail})
    query = '?ktk_discovery_check=' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S') if args.cache_bust else ''
    for device, agent in parser_module.DEVICES.items():
        for route in STOREFRONT:
            status,headers,body = fetch(ORIGIN+'/staging'+route+query,agent)
            head = parser_module.Head();head.feed(body.decode('utf-8'))
            robots = [meta.get('content','') for meta in head.meta if meta.get('name') == 'robots']
            row = {'device':device,'route':'/staging'+route,'status':status,'robots':robots,'header':headers.get('x-robots-tag'),
                   'cache':headers.get('cf-cache-status'),'canonical':[link.get('href') for link in head.links if link.get('rel')=='canonical']}
            responses.append(row)
            check(device+route+' HTTP 200',status==200)
            check(device+route+' correct staging canonical',row['canonical']==[ORIGIN+'/staging'+route])
            if args.phase == 'after':
                directives = flags(robots)
                check(device+route+' one noindex/nofollow meta without index/follow',len(robots)==1 and {'noindex','nofollow'} <= directives and not {'index','follow'} & directives,robots)
                check(device+route+' header never contradicts noindex',row['header'] is None or 'noindex' in row['header'])
                if args.cache_bust: check(device+route+' fresh header denies indexing',row['header'] is not None and 'noindex' in row['header'])
        for route in STOREFRONT[:3]:
            status,headers,body = fetch(ORIGIN+route,agent)
            head = parser_module.Head();head.feed(body.decode('utf-8'))
            robots = [meta.get('content','') for meta in head.meta if meta.get('name')=='robots']
            check(device+route+' production indexing/canonical unchanged',status==200 and 'noindex' not in flags(robots) and 'noindex' not in headers.get('x-robots-tag','') and [link.get('href') for link in head.links if link.get('rel')=='canonical']==[ORIGIN+route])
        if args.phase == 'after':
            for filename,group in [('sitemap.xml','index'),('content.xml','content'),('storefront.xml','storefront'),('robots.txt','robots')]:
                url = ORIGIN+'/staging/seo-preview/'+filename
                status,headers,body = fetch(url+query,agent)
                name = device+' preview '+filename
                check(name+' HTTP 200',status==200)
                check(name+' noindex and no-store', 'noindex' in headers.get('x-robots-tag','') and 'no-store' in headers.get('cache-control',''))
                check(name+' code-owned version',headers.get('x-ktk-seo-preview')=='2026.11.12.1')
                if group=='robots':
                    check(name+' proposal only with both discovery endpoints',body.decode()==data['robotsPreview'] and b'/staging/' not in body and b'Sitemap: https://krawlthroughkrakow.com/wp-sitemap.xml' in body)
                else:
                    check(name+' XML content type', 'xml' in headers.get('content-type',''))
                    root = ET.fromstring(body)
                    expected_tag = '{' + NS['s'] + '}' + ('sitemapindex' if group=='index' else 'urlset')
                    check(name+' native XML root without unavailable stylesheet',root.tag==expected_tag and b'<?xml-stylesheet' not in body)
                    locs = [element.text for element in root.findall('.//s:loc',NS)]
                    expected = [ORIGIN+'/staging/seo-preview/content.xml',ORIGIN+'/staging/seo-preview/storefront.xml'] if group=='index' else [row['loc'] for row in data[group]]
                    check(name+' exact canonical entries',locs==expected)
                    check(name+' no duplicate or invented change dates',len(set(locs))==len(locs) and not root.findall('.//s:lastmod',NS))
            status,headers,body = fetch(ORIGIN+'/staging/seo-preview/sitemap.xml',agent,'HEAD')
            check(device+' HEAD preview has no body and remains noindex',status==200 and not body and 'noindex' in headers.get('x-robots-tag',''))
    for route in ['/robots.txt','/wp-sitemap.xml','/wp-sitemap-ecstore-1.xml']:
        status,headers,body = fetch(ORIGIN+route,parser_module.DEVICES['desktop'])
        control = {'route':route,'status':status,'sha256':hashlib.sha256(body).hexdigest()}
        if route.endswith('.xml') and status==200:
            control['locs'] = [node.text for node in ET.fromstring(body).findall('.//s:loc',NS)]
        controls.append(control)
        check(route+' original production endpoint retained',status==200)
    status,headers,body = fetch(ORIGIN+'/staging/store/',parser_module.DEVICES['desktop'])
    head=parser_module.Head();head.feed(body.decode('utf-8'))
    legacy={'status':status,'robots':[m.get('content','') for m in head.meta if m.get('name')=='robots'],'canonical':[l.get('href') for l in head.links if l.get('rel')=='canonical']}
    if args.phase=='after':
        before=json.loads((OUT/'before.json').read_text())
        check('Production robots and sitemap index bytes unchanged',all(row==next(old for old in before['controls'] if old['route']==row['route']) for row in controls if row['route']!='/wp-sitemap-ecstore-1.xml'))
        check('Legacy Ecwid discovery URLs retained',controls[-1].get('locs')==before['controls'][-1].get('locs'))
        check('Legacy staging store SEO policy untouched',legacy==before['legacyStore'])
        status,_,_=fetch(ORIGIN+'/staging/wp-content/mu-plugins/ktk-seo-sitemap-assets/data.json',parser_module.DEVICES['desktop'])
        check('Raw generated source not publicly served',status in (403,404))
        status,headers,_=fetch(ORIGIN+'/seo-preview/sitemap.xml',parser_module.DEVICES['desktop'])
        check('No production preview endpoint activated',status==404 and 'x-ktk-seo-preview' not in headers)
        status,_,_=fetch(ORIGIN+'/staging/wp-sitemap.xml',parser_module.DEVICES['desktop'])
        check('Native staging sitemap remains intentionally disabled',status==404)
    report={'checkedAt':datetime.now(timezone.utc).isoformat(),'phase':args.phase,'cacheBust':args.cache_bust,
            'summary':{'passed':sum(row['passed'] for row in checks),'total':len(checks)},'responses':responses,'controls':controls,'legacyStore':legacy,'checks':checks}
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'summary':report['summary'],'failed':[row for row in checks if not row['passed']],'responses':responses if args.phase=='before' else []},indent=2))
    return int(any(not row['passed'] for row in checks))


if __name__=='__main__': raise SystemExit(main())
