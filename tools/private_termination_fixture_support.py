"""Offline fixture reporting guards and compact, lossless evidence references."""
from pathlib import Path, PurePosixPath
import hashlib,io,json,os,re,shutil,subprocess,zipfile


class FixtureRefusal(RuntimeError):
    def __init__(self,code):self.code=code;super().__init__(code)


def require(condition,code):
    if not condition:raise FixtureRefusal(code)


def digest(path):
    with Path(path).open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def report_paths(root,argument):
    root=Path(root).resolve();folder=root/'docs/seo/private-engine-early-termination-2026-11-17'
    require(not folder.is_symlink() and not folder.is_junction() and folder.resolve()==folder,'report-folder-outside-workspace')
    value=root/argument
    require(not value.is_symlink() and value.absolute().parent==folder and re.fullmatch(r'actual-inventory-[A-Za-z0-9-]+\.json',value.name) is not None,'fresh-scoped-report-path-required')
    archive=value.with_suffix('.evidence.zip');require(not value.exists() and not archive.exists() and not archive.is_symlink(),'preserve-existing-report-or-evidence')
    folder.mkdir(parents=True,exist_ok=True);return value,archive


def ensure_space(path,public_bytes,private_bytes):
    required=3*public_bytes+2*private_bytes+536870912
    free=shutil.disk_usage(path).free
    require(free>required,'local-fixture-space-required-not-host-quota')
    return {'freeBytes':free,'requiredBytes':required,'scope':'Runner-local only; not hosting account quota'}


def verify_reviewed_sources(root,commit,inputs):
    root=Path(root).resolve();require(isinstance(commit,str) and re.fullmatch(r'[a-f0-9]{40}',commit) is not None,'exact-helper-source-commit-required')
    require(isinstance(inputs,dict) and 1<=len(inputs)<=96,'bounded-source-inputs-required')
    for name,expected in inputs.items():
        require(isinstance(name,str) and name.startswith('tools/') and '\\' not in name and ':' not in name and PurePosixPath(name).as_posix()==name and '..' not in PurePosixPath(name).parts and re.fullmatch(r'[a-f0-9]{64}',expected) is not None,'canonical-reviewed-source-required')
        path=root/name;require(not path.is_symlink() and path.resolve().is_relative_to(root/'tools') and digest(path)==expected,'working-source-drift')
        raw=subprocess.check_output(['git','show',commit+':'+name],cwd=root)
        require(hashlib.sha256(raw).hexdigest()==expected,'declared-git-source-differs')


def public_reference(name,size,sha,owned,sizes):
    parts=name.split('/',1)
    if len(parts)==2 and parts[0] in ('source','target') and parts[1] in owned and sizes[parts[1]]==size and owned[parts[1]]==sha:
        return {'kind':'immutable-public-application','path':parts[1]}
    return None


def preserve_fixture(private,archives,fixture_root,application_commit,owned,sizes,destination,public_digest):
    private=Path(private);fixture_root=Path(fixture_root).resolve();destination=Path(destination)
    require(not private.is_symlink() and not private.is_junction() and private.resolve().is_relative_to(fixture_root) and not destination.exists() and not destination.is_symlink(),'fresh-owned-fixture-evidence-required')
    rows=[];stored=set();archive_rows=[]
    with zipfile.ZipFile(destination,'x',zipfile.ZIP_DEFLATED,compresslevel=3) as output:
        for parent,dirs,files in os.walk(private,followlinks=False) if private.exists() else []:
            for name in dirs:
                p=Path(parent,name);require(not p.is_symlink() and not p.is_junction(),'unsafe-evidence-directory-preserved')
            for name in sorted(files):
                p=Path(parent,name);require(not p.is_symlink() and p.is_file() and p.resolve().is_relative_to(fixture_root),'unsafe-evidence-file-preserved')
                raw=p.read_bytes();sha=hashlib.sha256(raw).hexdigest();relative=p.relative_to(private).as_posix();info=p.stat()
                row={'path':relative,'bytes':len(raw),'sha256':sha,'links':info.st_nlink,'device':info.st_dev,'inode':info.st_ino};reference=public_reference(relative,len(raw),sha,owned,sizes)
                if reference is not None:row['reference']=reference
                else:
                    row['blob']='blobs/'+sha
                    if sha not in stored:output.writestr(row['blob'],raw);stored.add(sha)
                rows.append(row)
        for path in archives:
            path=Path(path);require(not path.is_symlink() and path.resolve().is_relative_to(fixture_root),'unsafe-fixture-archive-preserved')
            member='archives/'+path.relative_to(fixture_root).as_posix();output.write(path,member);archive_rows.append({'member':member,'bytes':path.stat().st_size,'sha256':digest(path)})
        manifest={'scope':'Synthetic LOCAL evidence: full metadata/unknown/changed bytes retained; exact known public payload references immutable application Git bytes','applicationCommit':application_commit,'files':rows,'archives':archive_rows}
        output.writestr('private-tree-manifest.json',json.dumps(manifest,separators=(',',':')))
    verify_fixture_evidence(destination,public_digest)
    return {'path':str(destination),'bytes':destination.stat().st_size,'sha256':digest(destination),'privateFiles':len(rows),'storedUniqueBlobs':len(stored),'immutablePublicPayloadReferences':sum('reference' in r for r in rows),'allStoredMembersReferencesAndCRCVerified':True,'qualification':'Not a hosting backup; known public payload must be read from the declared immutable Git application cohort'}


def verify_fixture_evidence(path,public_digest):
    cache={}
    with zipfile.ZipFile(path) as archive:
        require(archive.testzip() is None,'fixture-evidence-crc-failed');manifest=json.loads(archive.read('private-tree-manifest.json'))
        expected={'private-tree-manifest.json'}
        for row in manifest['files']:
            if 'reference' in row:
                reference=row['reference'];require(reference['kind']=='immutable-public-application','unknown-evidence-reference')
                name=reference['path']
                if name not in cache:cache[name]=public_digest(name)
                require(cache[name]==(row['bytes'],row['sha256']),'immutable-public-reference-differs')
            else:
                expected.add(row['blob']);raw=archive.read(row['blob']);require(len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256'],'stored-private-evidence-differs')
        for row in manifest['archives']:
            expected.add(row['member']);raw=archive.read(row['member']);require(len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256'],'retained-fixture-archive-differs')
            with zipfile.ZipFile(io.BytesIO(raw)) as nested:require(nested.testzip() is None,'retained-fixture-archive-crc-failed')
        require(set(archive.namelist())==expected and len(archive.namelist())==len(expected),'unknown-fixture-evidence-member')
    return manifest
