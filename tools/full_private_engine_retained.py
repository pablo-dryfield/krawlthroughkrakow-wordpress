"""Read/check only exact retained private engine metadata over injected FTPS. No login or mutation."""
from __future__ import annotations
import re
from tools import content_update_backup as backup
from tools import full_private_engine_disposal as disposal
from tools import full_private_engine_disposal_recovery as recovery
from tools.content_update_staging_transport import mlst_facts

class FullEngineRetainedReader:
    def __init__(self,connection,transaction,public_root):
        _,names=disposal.metadata_names(transaction,public_root);self.connection=connection;self.root='/.ktk-content-update-'+transaction;self.names=set(names);self.allowed={'': 'dir'}
        for name in names:
            parts=name.split('/')
            for index in range(1,len(parts)+1):self.allowed['/'.join(parts[:index])]='file' if index==len(parts) else 'dir'
    def path(self,name):
        if name not in self.allowed:raise ValueError('Only exact private retained members and parents may be read')
        return self.root+('/'+name if name else '')
    def facts(self,name,kind):
        if self.allowed.get(name)!=kind:raise ValueError('Exact retained metadata role required')
        path=self.path(name);v=mlst_facts(self.connection.sendcmd('MLST '+path),path)
        if v.get('type')!=kind:raise ValueError('Private metadata alias or changed type preserved')
        return v
    def __call__(self,name):
        if name not in self.names:raise ValueError('Exact retained metadata read required')
        parts=name.split('/');parents=['']+['/'.join(parts[:i]) for i in range(1,len(parts))];before={p:self.facts(p,'dir') for p in parents};f=self.facts(name,'file')
        if re.fullmatch('[0-9]+',f.get('size','')) is None or int(f['size'])>1048576:raise ValueError('Bounded retained metadata member required')
        chunks=[];size=0
        def receive(data):
            nonlocal size
            if not isinstance(data,bytes):raise ValueError('Binary private metadata transfer required')
            size+=len(data)
            if size>int(f['size']):raise ValueError('Retained metadata transfer budget exceeded')
            chunks.append(data)
        self.connection.retrbinary('RETR '+self.path(name),receive)
        if size!=int(f['size']) or self.facts(name,'file')!=f or any(self.facts(p,'dir')!=v for p,v in before.items()):raise ValueError('Retained metadata changed while reading; inspect without retry')
        return b''.join(chunks)

def verify_retained(connection,packet,archive_verifier):
    recovery.validate_packet(packet)
    if not callable(archive_verifier) or archive_verifier() is not True:raise ValueError('Both independently reopened archives required before retained metadata audit')
    a=packet['authority'];reader=FullEngineRetainedReader(connection,packet['transactionId'],packet['publicRoot']);tx=packet['transactionId'];dirs={'control','engine','engine/'+tx,'engine/'+tx+'/receipts','engine/'+tx+'/pending'};reader.allowed.update({n:'dir' for n in dirs});actual_files=set();actual_dirs=set()
    for directory in ['',*sorted(dirs)]:
        reader.facts(directory,'dir');expected={}
        for name,kind in reader.allowed.items():
            if not name:continue
            parent,_,leaf=name.rpartition('/')
            if parent==directory:expected[leaf]=kind
        found={}
        for name,facts in connection.mlsd(reader.path(directory)):
            if name in ('.','..'):
                if facts.get('type')!=('cdir' if name=='.' else 'pdir'):raise ValueError('Unknown private dot metadata preserved')
                continue
            if name in found or name not in expected or facts.get('type')!=expected[name]:raise ValueError('Unknown retained namespace member or payload tree preserved')
            found[name]=facts['type'];relative=(directory+'/' if directory else '')+name
            (actual_dirs if facts['type']=='dir' else actual_files).add(relative)
        if found!=expected:raise ValueError('Complete exact retained private namespace required')
    if actual_files!=set(a['retained']) or actual_dirs!=dirs:raise ValueError('Exactly seven retained recovery files and five directories required')
    rows={}
    for name in sorted(actual_files):
        data=reader(name);row={'sha256':backup.sha(data),'bytes':len(data)}
        if row!=a['retained'][name]:raise ValueError('Independently read retained bytes differ from archived disposal authority')
        rows[name]=row
    if archive_verifier() is not True:raise ValueError('Private archives changed during retained metadata verification')
    return {'scope':'independent-archived-full-private-engine-retained-audit','transactionId':tx,'authoritySha256':a['authoritySha256'],'payloadTreesAbsent':True,'exactRetainedMetadataFiles':7,'exactRetainedDirectories':5,'metadata':rows,'originalAndRollbackArchivesReopened':True,'publicApplicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0}
