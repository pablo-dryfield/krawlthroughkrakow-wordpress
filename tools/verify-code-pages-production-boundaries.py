"""Read-only post-cutover staging indexing and production storefront isolation checks."""
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('boundaries_release',ROOT/'tools/verify-code-pages-full-release.py')
release=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(release)
checks=[]
def check(name,passed,detail=None): checks.append({'name':name,'passed':bool(passed),'detail':detail})

for device,agent in release.DEVICES.items():
    for route in ['/','/about-us/','/new-years-eve/']:
        url='https://krawlthroughkrakow.com/staging'+route
        status,headers,body=release.get(url,agent)
        page=release.Head();page.feed(body.decode('utf-8'))
        robots=[item.get('content','') for item in page.meta if item.get('name')=='robots']
        bookings=[value for value in page.targets if urlparse(value).hostname=='krawlthroughkrakow.com' and '/store2/' in urlparse(value).path]
        check(device+' staging '+route+' remains noindex',status==200 and any('noindex' in value for value in robots),robots)
        check(device+' staging '+route+' canonical remains staging',[item.get('href') for item in page.links if item.get('rel')=='canonical']==[url])
        check(device+' staging '+route+' booking links remain staging',bookings and all(urlparse(value).path.startswith('/staging/store2/') for value in bookings))
    for route in ['/store2/pub-crawl-28/','/store2/nye-pub-crawl-32/']:
        status,_,body=release.get('https://krawlthroughkrakow.com'+route,agent)
        page=release.Head();page.feed(body.decode('utf-8'))
        check(device+' '+route+' storefront remains separate',status==200 and b'id="ktk-storefront-root"' in body and 'ktk-code-page' not in page.body.get('class',''))

report={'checkedAt':datetime.now(timezone.utc).isoformat(),'passed':sum(row['passed'] for row in checks),'total':len(checks),'checks':checks,'readOnly':True,'noOrdersOrMessages':True}
(ROOT/'docs/code-pages/production-release/boundaries.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'passed':report['passed'],'total':report['total'],'failed':[row for row in checks if not row['passed']]},indent=2))
raise SystemExit(report['passed']!=report['total'])
