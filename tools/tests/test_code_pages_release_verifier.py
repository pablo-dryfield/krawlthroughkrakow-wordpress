import importlib.util
import unittest
from pathlib import Path

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


if __name__=='__main__':unittest.main()
