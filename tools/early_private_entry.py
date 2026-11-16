"""Explicit single-site early entry for authenticated private staging helpers only.

Rebind reviewed legacy compiler output; all raw capture/store/controller bytes remain.
Unauthenticated/expired requests return through the unchanged authentication gate first.
"""
from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OLD_HOOK=b"add_action('wp_loaded',"
EARLY_HOOK=b"add_action('muplugins_loaded',"
ANCHOR=b'    nocache_headers();'
GUARD=b'''    // Explicit private early profile: refuse unverified bootstrap context before private queries/writes.
    $ktkPrivateEarlyReady=true;
    foreach (array('home_url','site_url','get_option','nocache_headers','wp_send_json','did_action','is_multisite') as $ktkPrivateEarlyFunction) {
        if (!function_exists($ktkPrivateEarlyFunction)) { $ktkPrivateEarlyReady=false; }
    }
    if (!$ktkPrivateEarlyReady || did_action('muplugins_loaded')!==1 || did_action('plugins_loaded')!==0 || did_action('wp_loaded')!==0 || is_multisite()) {
        header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0',true);
        header('Content-Type: application/json; charset=UTF-8',true);
        header('X-Robots-Tag: noindex, noarchive',true);
        http_response_code(409);echo '{"error":"private_early_context_unavailable"}';exit;
    }
'''

def rebind(source):
    if not isinstance(source,bytes) or not source.startswith(b'<?php\n') or source.count(OLD_HOOK)!=1 or EARLY_HOOK in source or source.count(ANCHOR)!=1 or GUARD in source:
        raise ValueError('Exact legacy private helper output required before early binding')
    auth=source.find(b'    $token')
    if auth<0 or not auth<source.index(b'hash_equals(')<source.index(ANCHOR) or b'{ return; }' not in source[auth:source.index(ANCHOR)]:
        raise ValueError('Unchanged token/expiry return gate must precede private early context guard')
    return source.replace(OLD_HOOK,EARLY_HOOK,1).replace(ANCHOR,GUARD+ANCHOR,1)

def snapshot_source(name,token,expires):
    spec=importlib.util.spec_from_file_location('ktk_early_private_snapshot_source',ROOT/'tools/snapshot-staging-update-state.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return rebind(module.helper_source(name,token,expires))
