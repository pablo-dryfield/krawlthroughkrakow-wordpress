"""Construct in-memory private server configuration from independently reopened archives.

Contains the original private ownership key. Do not print or save this object as
a report. No connector, authority renewal, helper installation or execution.
"""
import base64

from tools import content_update_backup as backup
from tools import private_engine_termination_authority as authority
from tools import private_engine_termination_binding as binding


def configuration(value,old,*,source_root,original_path,witness_path,metadata_path=None,rollback_path=None,predecessor=None,fence_packet=None,public_root=None,now=None):
    checked=binding.validate_archives(value,old,source_root,original_path,witness_path,metadata_path,rollback_path,predecessor,fence_packet,now)
    original=binding.original_context(old)
    initial={**original,'publicRoot':public_root,'originalManifestSha256':value['originalManifestSha256'],'freshProtectedStateSha256':value['freshProtectedStateSha256']}
    fields=('schemaVersion','scope','operation','operationId','transactionId','applicationCommit','expires','freshProtectedStateSha256','freshPublicOwnedSha256','originalArchiveSha256','originalManifestSha256','witnessArchiveSha256','metadataArchiveSha256','inspectionStateSha256','closureSha256','fenceOperationId')
    server_authority={**{k:value[k] for k in fields},'tokenSha256':backup.sha(value['token'].encode()),'originalTokenSha256':backup.sha(old['token'].encode())}
    fenced=None
    if value['operation']!='inspect':
        fence=value if value['operation']=='fence' else fence_packet
        fenced=dict(schemaVersion=1,scope='immutable-archive-fenced-private-inspection',publicRoot=public_root,ownershipKey=original['ownershipKey'],plan=original['plan'],sizes=original['sizes'],initialInspection=checked['inspection'],retained=checked['retained'],payload=checked['payload'],closureBlob=base64.b64encode(checked['closureBlob']).decode(),fence={n:fence[n] for n in ('operationId','metadataArchiveSha256','originalArchiveSha256','witnessArchiveSha256')},freshProtectedStateSha256=value['freshProtectedStateSha256'],freshPublicOwnedSha256=value['freshPublicOwnedSha256'])
    return dict(schemaVersion=1,scope='current-witness-private-engine-termination',authority=server_authority,initial=initial,fenced=fenced)


def request(value,action,state_sha256=None):
    authority.validate_packet(value)
    actions={'inspect':'inspect','inspect-fenced':'inspect-fenced','fence':'fence','cleanup':'complete-closure'}
    if action!=actions[value['operation']]:raise ValueError('Exact typed private termination action required')
    raw=dict(schemaVersion=1,action=action,**{k:value[k] for k in ('operation','operationId','transactionId','applicationCommit','metadataArchiveSha256','inspectionStateSha256','closureSha256')})
    if value['operation']=='cleanup':
        if not backup.digest(state_sha256):raise ValueError('Exact independently inspected remaining state required')
        raw['stateSha256']=state_sha256
    elif state_sha256 is not None:raise ValueError('Only closure-only recovery carries a remaining-state fence')
    encoded=backup.encode(raw)
    if len(encoded)>2048:raise ValueError('Bounded termination request required')
    return encoded
