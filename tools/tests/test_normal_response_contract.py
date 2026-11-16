import copy,hashlib,unittest
from tools.normal_response_contract import decoded_payload,projection,equivalent

A=b'<a href="/cdn-cgi/l/email-protection#204160420e43"><span class="__cf_email__" data-cfemail="016041632f62">[email protected]</span></a>'
B=A.replace(b'204160420e43',b'ff9ebf9dd19c').replace(b'016041632f62',b'204160420e43')

def response(raw,method='GET'):
 return {'status':200,'method':method,'mime':'text/html','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'projection':projection(raw)}

class NormalResponseContractTests(unittest.TestCase):
 def test_independent_fixed_vectors_decode_identical_payload_for_distinct_keys(self):
  for value in ('204160420e43','016041632f62','ff9ebf9dd19c'):self.assertEqual(decoded_payload(value),b'a@b.c')
 def test_only_email_encoding_bytes_may_differ_and_raw_mismatch_is_retained(self):
  a=response(A);b=response(B);self.assertNotEqual(a['sha256'],b['sha256']);self.assertTrue(equivalent(a,b));self.assertEqual(len(a['projection']['emailFields']),2);self.assertTrue(all(f['decodedPayloadSha256']==hashlib.sha256(b'a@b.c').hexdigest() for f in a['projection']['emailFields']));self.assertNotIn('a@b.c',repr(a['projection']))
 def test_changed_decoded_email_is_refused_even_with_identical_raw_field_length(self):
  self.assertFalse(equivalent(response(A),response(B.replace(b'204160420e43',b'204160420e44'))))
 def test_form_nonce_action_body_text_classes_and_links_are_not_normalized(self):
  raw=b'<form action="/send"><input name="nonce" value="n0"></form>'+A
  for changed in [raw.replace(b'n0',b'n1'),raw.replace(b'/send',b'/evil'),raw.replace(b'[email protected]',b'changed'),raw.replace(b'__cf_email__',b'other'),raw.replace(b'/cdn-cgi/',b'https://evil.invalid/cdn-cgi/')]:self.assertFalse(equivalent(response(raw),response(changed)))
 def test_no_whitespace_quote_entity_or_unrelated_attribute_tolerance(self):
  for changed in [A+b' ',A.replace(b'<a ',b'<a  '),A.replace(b'href="',b"href='").replace(b'43">',b"43'>"),b'<div data-random="new"></div>'+A]:self.assertFalse(equivalent(response(A),response(changed)))
 def test_blocked_elements_and_unrelated_cf_like_data_are_left_byte_exact(self):
  for tag in ('head','script','noscript','textarea','xmp'):
   raw=('<'+tag+'>').encode()+A+('</'+tag+'>').encode();p=projection(raw);self.assertEqual(p['sha256'],hashlib.sha256(raw).hexdigest());self.assertFalse(p['emailFields'])
  raw=b'<div data-cfemail="204160420e43"></div>';self.assertEqual(projection(raw)['sha256'],hashlib.sha256(raw).hexdigest())
 def test_unicode_and_line_offsets_preserve_all_non_email_bytes(self):
  prefix='Krak\u00f3w\n\u2028'.encode();self.assertTrue(equivalent(response(prefix+A),response(prefix+B)));self.assertFalse(equivalent(response(prefix+A),response(prefix.replace(b'K',b'X')+B)))
 def test_malformed_ambiguous_or_non_utf8_protection_payload_never_passes(self):
  for bad in [b'0',b'zz',b'00',b'00ff40ff',b'200a4062']:
   with self.assertRaises(ValueError):projection(A.replace(b'204160420e43',bad))
  with self.assertRaises(ValueError):projection(b'<span class="__cf_email__" data-cfemail="204160420e43" data-cfemail="016041632f62"></span>')
 def test_response_method_status_mime_and_missing_projection_are_not_accepted(self):
  a=response(A)
  for key,value in [('status',403),('method','POST'),('mime','application/json')]:b=copy.deepcopy(a);b[key]=value;self.assertFalse(equivalent(a,b))
  b=copy.deepcopy(a);b.pop('projection')
  with self.assertRaises(ValueError):equivalent(a,b)
 def test_no_email_protection_means_exact_raw_html_comparison(self):
  raw=b'<html><input name="nonce" value="abc"></html>';r=response(raw);self.assertEqual(r['projection']['sha256'],r['sha256']);self.assertEqual(r['projection']['bytes'],r['bytes']);self.assertFalse(r['projection']['emailFields']);self.assertFalse(equivalent(r,response(raw+b'\n')))

if __name__=='__main__':unittest.main()
