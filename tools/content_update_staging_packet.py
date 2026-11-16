"""Compile only an expiring private staging fixture. No filesystem output, HTTP/FTP client or deployment."""
from __future__ import annotations
import ast,base64,time,re
from pathlib import Path
from tools import content_update_backup as backup

ROOT=Path(__file__).resolve().parents[1]
TEMPLATE=ROOT/'tools/content-update-staging-template.php'
COMPONENTS={'STATE':'staging-protected-state-core.php','REQUEST':'content-update-request.php','STORE':'content-update-private-store.php','BACKUP':'content-update-backup-manifest.php','ENGINE':'code-pages-update-engine.php','LIFECYCLE':'content-update-controller.php'}

def seeds():
 tree=ast.parse((ROOT/'tools/promote-code-pages-production.py').read_text(encoding='utf-8'))
 activation=next(ast.literal_eval(node.value) for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='ACTIVATION_SOURCE' for target in node.targets))
 if backup.sha(activation)!=backup.ACTIVATION_SHA:raise ValueError('Exact immutable private activation fixture required')
 old={'ktk-code-pages.php':b'<?php /* isolated prior renderer; never executed */\n','ktk-code-pages-assets/registry.php':b'<?php /* isolated prior registry; never executed */\n','ktk-code-pages-assets/runtime.css':b'/* isolated prior css */\n','ktk-code-pages-assets/runtime.js':b'/* isolated unchanged javascript */\n','ktk-code-pages-assets/content/unchanged.html':b'<p>Isolated unchanged content.</p>\n',backup.ACTIVATION:activation}
 new={name:value for name,value in old.items() if name!=backup.ACTIVATION};new.update({'ktk-code-pages.php':b'<?php /* isolated candidate renderer; never executed */\n','ktk-code-pages-assets/registry.php':b'<?php /* isolated candidate registry; never executed */\n','ktk-code-pages-assets/runtime.css':b'/* isolated candidate css */\n','ktk-code-pages-assets/content/introduced.html':b'<p>Isolated introduced content.</p>\n','ktk-code-pages-assets/shells/introduced.php':b'<?php /* isolated introduced shell; never executed */\n'})
 return {'source':new,'target':old}

def fixture_plan(transaction,commit,protected_sha):
 if not backup.identifier(transaction,32) or not backup.identifier(commit,40) or not backup.digest(protected_sha):raise ValueError('Exact staging fixture release binding required')
 values=seeds();return {'transactionId':transaction,'applicationCommit':commit,'protectedStateSha256':protected_sha,'expected':{name:backup.sha(value) for name,value in values['source'].items()},'prior':{name:backup.sha(value) for name,value in values['target'].items()}}

def binding(plan):return {'transactionId':plan['transactionId'],'applicationCommit':plan['applicationCommit'],'planSha256':backup.sha(backup.encode(plan,sort=True))}

def helper_source(name,token,expires,commit,owned,protected_sha,key):
 match=re.fullmatch('ktk-transaction-rehearsal-([a-f0-9]{32})\\.php',name) if isinstance(name,str) else None
 if match is None or not isinstance(token,str) or not re.fullmatch('[A-Za-z0-9_-]{43}',token) or type(expires) is not int or not int(time.time())<expires<=int(time.time())+3600 or not backup.digest(key):raise ValueError('Exact expiring private staging helper binding required')
 if not isinstance(owned,dict) or not 2<=len(owned)<=10000 or not all(isinstance(name,str) for name in owned) or not {'ktk-code-pages.php','ktk-code-pages-assets/registry.php'}<=set(owned) or len({name.casefold() for name in owned})!=len(owned):raise ValueError('Complete unambiguous public owned inventory required')
 for path,value in owned.items():
  backup.owned_name(path)
  if not backup.digest(value):raise ValueError('Exact public owned checksum required')
 plan=fixture_plan(match[1],commit,protected_sha);packet={'mode':'private-staging-rehearsal','plan':plan,'ownershipKey':key,'tokenSha256':backup.sha(token.encode()),'expires':expires,'stepLimit':1,'publicOwnedSha256':backup.sha(backup.encode(owned,sort=True)),'productionAuthorizationSha256':None}
 payload={folder:{path:base64.b64encode(value).decode() for path,value in rows.items()} for folder,rows in seeds().items()}
 values={'EXPIRES':str(expires).encode(),'TOKEN_SHA':backup.sha(token.encode()).encode(),'HELPER':name.encode(),'PACKET':base64.b64encode(backup.encode(packet)),'SEEDS':base64.b64encode(backup.encode(payload))};source=TEMPLATE.read_bytes()
 for part,value in values.items():
  marker=('__KTK_CONTROLLER_'+part+'__').encode()
  if source.count(marker)!=1:raise ValueError('Exact staging controller binding marker required')
  source=source.replace(marker,value)
 for part,file in COMPONENTS.items():
  marker=('/* __KTK_CONTROLLER_'+part+'__ */').encode();body=(ROOT/'tools'/file).read_bytes()
  if source.count(marker)!=1 or not body.startswith(b'<?php\n'):raise ValueError('Exact reviewed controller component embedding required')
  source=source.replace(marker,body[len(b'<?php\n'):])
 if b'__KTK_CONTROLLER_' in source:raise ValueError('Unresolved staging controller marker')
 return source
