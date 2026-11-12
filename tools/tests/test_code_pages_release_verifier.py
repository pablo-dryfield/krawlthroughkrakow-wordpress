import importlib.util
import unittest
from pathlib import Path

SPEC=importlib.util.spec_from_file_location('release_verifier',Path(__file__).resolve().parents[1]/'verify-code-pages-full-release.py')
module=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(module)


class VerifierTests(unittest.TestCase):
    clarity="<script>(function(){var src='https://www.clarity.ms/tag/'; var id='ufswk29c79';})();</script>"
    def parse(self,text):
        parser=module.Head();parser.feed(text);return module.integration_bootstraps(parser)
    def test_existing_unlabelled_clarity_counts(self):
        self.assertEqual(self.parse(self.clarity)['Clarity'],1)
    def test_owned_and_existing_duplicate_fails(self):
        self.assertEqual(self.parse(self.clarity+self.clarity.replace('<script>','<script id="ktk-clarity-loader">'))['Clarity'],2)
    def test_external_tag_counts(self):
        text='<script src="https://www.googletagmanager.com/gtm.js?id=GTM-PHXGRZ"></script><script src="https://www.googletagmanager.com/gtag/js?id=AW-956184209"></script><script src="https://www.clarity.ms/tag/ufswk29c79"></script>'
        self.assertEqual(self.parse(text),{'GTM':1,'Google Ads':1,'Clarity':1})
    def test_unrelated_ids_do_not_count(self):
        self.assertEqual(self.parse('<script src="https://www.clarity.ms/tag/other"></script>'),{'GTM':0,'Google Ads':0,'Clarity':0})


if __name__=='__main__':unittest.main()
