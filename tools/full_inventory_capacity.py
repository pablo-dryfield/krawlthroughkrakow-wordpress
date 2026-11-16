"""Compile/validate a metadata-only staging census. No credentials, connection, payload copy or production mode."""
from __future__ import annotations
import base64,re,time
from pathlib import Path
from tools import content_update_backup as backup

ROOT=Path(__file__).resolve().parents[1]
TEMPLATE=ROOT/'tools/staging-full-inventory-capacity-template.php'
CORE=ROOT/'tools/staging-protected-state-core.php'
CORE_SHA='223b28dab84918a42a23e750a77dcf85a90ac49bcfb0ee2ec9bc7ceea60844fb'
URL='https://krawlthroughkrakow.com/staging/'


def inventory(owned,sizes):
    if not isinstance(owned,dict) or not isinstance(sizes,dict) or not 2<=len(owned)<=10000 or not all(isinstance(n,str) for n in owned) or set(owned)!=set(sizes) or not {'ktk-code-pages.php','ktk-code-pages-assets/registry.php'}<=set(owned) or len({n.casefold() for n in owned})!=len(owned):
        raise ValueError('Complete unambiguous public inventory and byte sizes required')
    for name,digest in owned.items():
        backup.owned_name(name)
        if not backup.digest(digest) or type(sizes[name]) is not int or not 0<=sizes[name]<=67108864:
            raise ValueError('Exact bounded public metadata required')
    if sum(sizes.values())>2147483648:
        raise ValueError('Read-only inventory exceeds declared two-GiB census budget')
    return dict(sorted(owned.items())),dict(sorted(sizes.items()))


def helper_source(name,token,expires,owned,sizes,protected_sha):
    owned,sizes=inventory(owned,sizes)
    if not isinstance(name,str) or not re.fullmatch(r'ktk-state-snapshot-[a-f0-9]{32}\.php',name) or not isinstance(token,str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}',token) or type(expires) is not int or not int(time.time())<expires<=int(time.time())+900 or not backup.digest(protected_sha):
        raise ValueError('Exact expiring staging-only capacity binding required')
    core=CORE.read_bytes()
    if backup.sha(core)!=CORE_SHA or not core.startswith(b'<?php\n'):
        raise ValueError('Unchanged reviewed staging capture core required')
    source=TEMPLATE.read_bytes()
    replacements={'EXPIRES':str(expires).encode(),'TOKEN_SHA':backup.sha(token.encode()).encode(),'HELPER':name.encode(),'OWNED':base64.b64encode(backup.encode(owned)),'SIZES':base64.b64encode(backup.encode(sizes)),'PROTECTED':protected_sha.encode()}
    for key,value in replacements.items():
        marker=('__KTK_CAPACITY_'+key+'__').encode()
        if source.count(marker)!=1:raise ValueError('Exact capacity binding marker required')
        source=source.replace(marker,value)
    marker=b'/* __KTK_CAPACITY_STATE_CORE__ */'
    if source.count(marker)!=1:raise ValueError('Exact shared capture embedding required')
    source=source.replace(marker,core[len(b'<?php\n'):])
    if b'__KTK_CAPACITY_' in source:raise ValueError('Unresolved capacity marker')
    return source


def validate(value,helper_sha,owned,sizes,protected_sha):
    owned,sizes=inventory(owned,sizes)
    fields={'schemaVersion','scope','helperSha256','identity','databaseSha256','protectedStateSha256','rowCounts','protectedFileCount','inventory','filesystem','runtime','twoCapturesExact','fullHostAcceptance','privateAllocationBytes','applicationWrites','databaseWrites','cachePurges','productionOperations'}
    if not isinstance(value,dict) or set(value)!=fields or type(value['schemaVersion']) is not int or value['schemaVersion']!=1 or value['scope']!='staging-full-inventory-capacity' or value['helperSha256']!=helper_sha or not backup.digest(helper_sha) or not backup.digest(protected_sha) or not backup.digest(value['databaseSha256']) or value['protectedStateSha256']!=protected_sha or value['twoCapturesExact'] is not True or value['fullHostAcceptance'] is not False:
        raise ValueError('Exact metadata-only staging capacity response required')
    identity=value['identity']
    if not isinstance(identity,dict) or set(identity)!={'home','siteurl','blogPublic','frontPageId','wordpressEnvironment'} or identity['home']!=URL or identity['siteurl']!=URL or type(identity['blogPublic']) is not int or identity['blogPublic']!=0 or type(identity['frontPageId']) is not int or identity['frontPageId']<0 or not (identity['wordpressEnvironment'] is None or isinstance(identity['wordpressEnvironment'],str) and 1<=len(identity['wordpressEnvironment'])<=64 and all(32<=ord(c)<=126 for c in identity['wordpressEnvironment'])):
        raise ValueError('Complete staging identity required; environment label grants no production scope')
    if any(type(value[k]) is not int or value[k]!=0 for k in ('privateAllocationBytes','applicationWrites','databaseWrites','cachePurges','productionOperations')):
        raise ValueError('Capacity census must remain read-only')
    rows=value['rowCounts']
    if not isinstance(rows,dict) or set(rows)!={'posts','postmeta','options','terms','term_taxonomy','term_relationships','termmeta'} or any(type(x) is not int or x<0 for x in rows.values()) or not rows['posts'] or not rows['options'] or type(value['protectedFileCount']) is not int or value['protectedFileCount']<3:
        raise ValueError('Complete selected state counters required')
    expected={'files':len(owned),'bytes':sum(sizes.values()),'ownedMapSha256':backup.sha(backup.encode(owned)),'sizeMapSha256':backup.sha(backup.encode(sizes)),'largestFiles':[{'path':n,'bytes':sizes[n]} for n in sorted(sizes,key=lambda n:(-sizes[n],n))[:3]],'twoUnmodifiedCopiesBytes':sum(sizes.values())*2}
    item=value['inventory']
    if item!=expected or any(type(item[k]) is not int for k in ('files','bytes','twoUnmodifiedCopiesBytes')) or any(type(row['bytes']) is not int for row in item['largestFiles']):raise ValueError('Actual public inventory differs from the reviewed build')
    fs=value['filesystem']
    if not isinstance(fs,dict) or set(fs)!={'availableBytes','totalBytes','privateParentWritable','quotaVerified'} or any(type(fs[k]) is not int for k in ('availableBytes','totalBytes')) or not 0<=fs['availableBytes']<=fs['totalBytes'] or fs['totalBytes']<=0 or type(fs['privateParentWritable']) is not bool or fs['quotaVerified'] is not False:
        raise ValueError('Filesystem observations are not account-quota proof')
    runtime=value['runtime'];runtime_fields={'phpVersionId','phpIntBytes','sapi','memoryLimit','maxExecutionTime','peakAllocatedBytes','captureNanoseconds'}
    if not isinstance(runtime,dict) or set(runtime)!=runtime_fields or type(runtime['phpVersionId']) is not int or runtime['phpVersionId']<80000 or runtime['phpIntBytes']!=8 or type(runtime['peakAllocatedBytes']) is not int or runtime['peakAllocatedBytes']<=0 or any(not isinstance(runtime[k],str) or not 1<=len(runtime[k])<=64 or any(ord(c)<32 or ord(c)>126 for c in runtime[k]) for k in ('sapi','memoryLimit','maxExecutionTime')):
        raise ValueError('Exact PHP runtime observations required')
    ns=runtime['captureNanoseconds']
    if not isinstance(ns,list) or len(ns)!=2 or any(type(n) is not int or n<0 or n>600000000000 for n in ns):raise ValueError('Two bounded monotonic capture durations required')
    return value
