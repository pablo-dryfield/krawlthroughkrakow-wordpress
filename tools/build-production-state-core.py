"""Derive production-only read-only capture from the unchanged reviewed staging core."""
from __future__ import annotations
import argparse,hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'tools/staging-protected-state-core.php'
TARGET=ROOT/'tools/production-protected-state-core.php'
FINGERPRINT_TARGET=ROOT/'tools/production-protected-fingerprint.php'
SOURCE_SHA='223b28dab84918a42a23e750a77dcf85a90ac49bcfb0ee2ec9bc7ceea60844fb'
ACTIVATION_SHA='b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833'
CALLER_GUARD='''    if (!defined('KTK_PRODUCTION_STATE_ALLOWED') || KTK_PRODUCTION_STATE_ALLOWED !== true) {
        throw new RuntimeException('Explicit production state caller required');
    }
'''
ACTIVATION_GUARD='''    $activation = $mu . '/ktk-code-pages-production.php';
    if (is_link($activation) || !is_file($activation) || hash_file('sha256', $activation) !== 'b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833') {
        throw new RuntimeException('Exact existing active-production marker required before state capture');
    }
'''

def substitutions():
 return [
  ('Read-only staging state capture.','Generated production-only read-only state capture; see build-production-state-core.py.' ,1),
  ('KTK_STAGING_STATE_ALLOWED','KTK_PRODUCTION_STATE_ALLOWED',2),
  ('Explicit staging state caller required','Explicit production state caller required',1),
  ('ktk_capture_staging_original_state','ktk_capture_production_original_state',1),
  ("'https://krawlthroughkrakow.com/staging/'","'https://krawlthroughkrakow.com/'",2),
  ("'https://krawlthroughkrakow.com/staging'","'https://krawlthroughkrakow.com'",2),
  ("(int)get_option('blog_public') !== 0","(int)get_option('blog_public') !== 1",1),
  ('Exact staging identity required before state capture','Exact production identity required before state capture',1),
  ('ktk-(?:state-snapshot|transaction-rehearsal)-','ktk-production-(?:state-snapshot|transaction-update)-',1),
  ('Exact existing staging helper path required','Exact existing production helper path required',1),
  ("basename($stage) !== 'staging'","basename($stage) !== 'public_html'",1),
  ('$stage','$site',5),
  ('Exact staging filesystem required','Exact production filesystem required',1),
  ("(string)($saved['blog_public'] ?? '') !== '0'","(string)($saved['blog_public'] ?? '') !== '1'",1),
  ('Saved staging identity differs','Saved production identity differs',1),
  ('staging-protected-original-state','production-protected-original-state',1),
 ]

def render(source):
 if hashlib.sha256(source).hexdigest()!=SOURCE_SHA:raise ValueError('Reviewed staging capture source changed; do not silently broaden production scope')
 text=source.decode('utf-8')
 for old,new,count in substitutions():
  if text.count(old)!=count:raise ValueError('Exact production capture substitution required: '+old)
  text=text.replace(old,new)
 anchor='function ktk_capture_production_original_state(string $helperPath): array\n{\n'
 if text.count(anchor)!=1:raise ValueError('Exact production capture function anchor required')
 text=text.replace(anchor,anchor+CALLER_GUARD,1)
 anchor="    $encode = static fn($value) => json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);\n"
 if text.count(anchor)!=1:raise ValueError('Exact pre-query guard position required')
 text=text.replace(anchor,ACTIVATION_GUARD+anchor,1)
 return text.encode('utf-8')

def inverse(production):
 text=production.decode('utf-8')
 if text.count(CALLER_GUARD)!=1 or text.count(ACTIVATION_GUARD)!=1:raise ValueError('Exact production-only guards required')
 text=text.replace(CALLER_GUARD,'',1).replace(ACTIVATION_GUARD,'',1)
 for old,new,count in reversed(substitutions()):
  if text.count(new)!=count:raise ValueError('Ambiguous production capture inverse: '+new)
  text=text.replace(new,old)
 restored=text.encode('utf-8')
 if hashlib.sha256(restored).hexdigest()!=SOURCE_SHA:raise ValueError('Capture body differs outside reviewed production identity and guards')
 return restored

def fingerprint_substitutions():
 skip="            if ($label === 'mu' && ($name === 'ktk-code-pages.php' || str_starts_with($name, 'ktk-code-pages-assets/'))) { continue; }\n"
 old_complete="    if (!isset($owned['ktk-code-pages.php'], $owned['ktk-code-pages-assets/registry.php'], $protected['mu/ktk-homepage-shortcode.php']) || count($protected) < 3) {"
 new_complete="    if (!is_file($mu . '/ktk-code-pages.php') || !is_file($mu . '/ktk-code-pages-assets/registry.php') || !isset($protected['mu/ktk-homepage-shortcode.php']) || count($protected) < 3) {"
 return [
  ('Generated production-only read-only state capture; see build-production-state-core.py.','Generated production-only protected fingerprint; not an owned-payload backup; see build-production-state-core.py.'),
  ('ktk_capture_production_original_state','ktk_capture_production_protected_fingerprint'),
  ("            $hash = hash_file('sha256', $file->getPathname());",skip+"            $hash = hash_file('sha256', $file->getPathname());"),
  ("            if ($label === 'mu' && ($name === 'ktk-code-pages.php' || str_starts_with($name, 'ktk-code-pages-assets/'))) { $owned[$name] = $hash; }\n            else { $protected[$label . '/' . $name] = $hash; }","            $protected[$label . '/' . $name] = $hash;"),
  (old_complete,new_complete),
  ("'scope' => 'production-protected-original-state'","'scope' => 'production-protected-fingerprint', 'ownedInventoryIncluded' => false"),
 ]

def fingerprint(full):
 text=full.decode('utf-8')
 for old,new in fingerprint_substitutions():
  if text.count(old)!=1:raise ValueError('Exact protected-fingerprint capture anchor required')
  text=text.replace(old,new,1)
 return text.encode('utf-8')

def fingerprint_inverse(value):
 text=value.decode('utf-8')
 for old,new in reversed(fingerprint_substitutions()):
  if text.count(new)!=1:raise ValueError('Exact protected-fingerprint inverse required')
  text=text.replace(new,old,1)
 restored=text.encode('utf-8');inverse(restored);return restored

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--write',action='store_true');args=parser.parse_args();source=SOURCE.read_bytes();result=render(source);guard=fingerprint(result)
 if inverse(result)!=source:raise ValueError('Full capture inverse must recover original bytes')
 if fingerprint_inverse(guard)!=result:raise ValueError('Guard inverse must recover the complete capture')
 outputs={TARGET:result,FINGERPRINT_TARGET:guard}
 if args.write:
  for path,content in outputs.items():path.write_bytes(content)
 elif any(not path.is_file() or path.read_bytes()!=content for path,content in outputs.items()):raise ValueError('Production capture output differs; review source then explicitly regenerate')
 print('Production capture source/inverse exact; no network, helper, database or application operation.')

if __name__=='__main__':main()
