import importlib.util
import http.client
import io
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import Mock, patch

SPEC=importlib.util.spec_from_file_location('release_verifier',Path(__file__).resolve().parents[1]/'verify-code-pages-full-release.py')
module=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(module)


class VerifierTests(unittest.TestCase):
    clarity="<script>(function(){var src='https://www.clarity.ms/tag/'; var id='z9d5iuilvn';})();</script>"
    def parse(self,text):
        parser=module.Head();parser.feed(text);return module.integration_bootstraps(parser)
    def test_existing_unlabelled_clarity_counts(self):
        self.assertEqual(self.parse(self.clarity)['Clarity'],1)
    def test_owned_and_existing_duplicate_fails(self):
        self.assertEqual(self.parse(self.clarity+self.clarity.replace('<script>','<script id="ktk-clarity-loader">'))['Clarity'],2)
    def test_external_tag_counts(self):
        text='<script src="https://www.googletagmanager.com/gtm.js?id=GTM-PHXGRZ"></script><script src="https://www.googletagmanager.com/gtag/js?id=AW-956184209"></script><script src="https://www.clarity.ms/tag/z9d5iuilvn"></script>'
        self.assertEqual(self.parse(text),{'GTM':1,'Google Ads':1,'Clarity':1})
    def test_unrelated_ids_do_not_count(self):
        self.assertEqual(self.parse('<script src="https://www.clarity.ms/tag/other"></script>'),{'GTM':0,'Google Ads':0,'Clarity':0})
    def test_retired_project_is_not_current_but_historical_checks_are_explicit(self):
        old = self.clarity.replace('z9d5iuilvn','ufswk29c79')
        self.assertEqual(self.parse(old)['Clarity'],0)
        parser=module.Head();parser.feed(old)
        self.assertEqual(module.integration_bootstraps(parser,'ufswk29c79')['Clarity'],1)
    def test_staging_requires_disabled_loader_and_retained_bridge(self):
        parser=module.Head();parser.feed('<script id="ktk-clarity-consent-bridge">consentBridge();</script>')
        self.assertTrue(all(module.staging_clarity_policy(parser).values()))
    def test_staging_rejects_any_recording_loader_including_other_projects(self):
        for source in [self.clarity, '<script src="https://www.clarity.ms/tag/other"></script>', '<script id="ktk-clarity-loader"></script>']:
            parser=module.Head();parser.feed('<script id="ktk-clarity-consent-bridge"></script>'+source)
            self.assertFalse(module.staging_clarity_policy(parser)['Clarity recording loader disabled on staging'])
    def test_staging_rejects_missing_or_duplicated_consent_bridge(self):
        for source in ['', '<script id="ktk-clarity-consent-bridge"></script>'*2]:
            parser=module.Head();parser.feed(source)
            self.assertFalse(module.staging_clarity_policy(parser)['one Clarity consent bridge retained'])

    def test_sharing_metadata_requires_exact_fields_without_duplicates(self):
        metadata = '<meta property="og:title" content="A &amp; B"><meta property="og:url" content="https://krawlthroughkrakow.com/about-us/"><meta name="twitter:card" content="summary">'
        expected = metadata.replace('https://krawlthroughkrakow.com/', 'https://krawlthroughkrakow.com/staging/')
        for markup, valid in [(expected, True), (expected + '<meta name="description" content="unrelated">', True), (expected + expected, False), (metadata, False), (expected.replace('summary', 'summary_large_image'), False), (expected.replace('og:title', 'og:other'), False)]:
            parsed = module.Head(); parsed.feed(markup)
            self.assertEqual(module.sharing_metadata_matches(parsed, metadata, 'https://krawlthroughkrakow.com/staging'), valid)


class TransportTests(unittest.TestCase):
    def setUp(self):
        module.TRANSPORT_RETRIES.clear()

    def response(self, body):
        response = Mock(status=200, headers={'Content-Type':'text/plain'})
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        if isinstance(body, Exception): response.read.side_effect = body
        else: response.read.return_value = body
        return response

    def test_body_reset_retries_whole_get_and_never_returns_partial_data(self):
        first, second = self.response(http.client.IncompleteRead(b'partial', 8)), self.response(b'complete')
        opener = Mock(); opener.open.side_effect = [first, second]
        with patch.object(module.urllib.request, 'build_opener', return_value=opener), patch.object(module.time, 'sleep'):
            self.assertEqual(module.get('https://krawlthroughkrakow.com/staging/example/?private=value', 'agent'), (200, {'Content-Type':'text/plain'}, b'complete'))
        self.assertEqual(opener.open.call_count, 2)
        self.assertEqual(module.TRANSPORT_RETRIES, [{'path':'/staging/example/','attempt':1,'error':'IncompleteRead'}])
        self.assertEqual(first.__exit__.call_count, 1)
        self.assertTrue(all(call.args[0].get_method() == 'GET' for call in opener.open.call_args_list))

    def test_persistent_transport_error_stops_after_three_attempts(self):
        opener = Mock(); opener.open.side_effect = ConnectionResetError('interrupted')
        with patch.object(module.urllib.request, 'build_opener', return_value=opener), patch.object(module.time, 'sleep'):
            with self.assertRaises(ConnectionResetError): module.get('https://krawlthroughkrakow.com/staging/example/', 'agent')
        self.assertEqual(opener.open.call_count, 3)
        self.assertEqual([row['attempt'] for row in module.TRANSPORT_RETRIES], [1,2])

    def test_real_http_denial_is_reported_without_retry_or_bypass(self):
        error = urllib.error.HTTPError('https://krawlthroughkrakow.com/staging/example/',403,'Forbidden',{},io.BytesIO(b'denied'))
        opener = Mock(); opener.open.side_effect = error
        with patch.object(module.urllib.request, 'build_opener', return_value=opener), patch.object(module.time, 'sleep') as sleep:
            self.assertEqual(module.get(error.url,'agent'),(403,{},b'denied'))
        self.assertEqual(opener.open.call_count,1); sleep.assert_not_called(); self.assertEqual(module.TRANSPORT_RETRIES,[])


if __name__=='__main__':unittest.main()
