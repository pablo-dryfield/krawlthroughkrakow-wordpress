import importlib.util
import unittest
from pathlib import Path

SPEC=importlib.util.spec_from_file_location('description_scope',Path(__file__).resolve().parents[1]/'audit-seo-description-scope.py')
module=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(module)


class DescriptionScopeTests(unittest.TestCase):
    def test_only_description_may_change(self):
        before={'description':'','title':'Original','production_seo':{'canonical':['https://example.com/']},'main_file':'content/original.html'}
        self.assertTrue(module.description_only(before,{**before,'description':'Reviewed summary'}))
        self.assertFalse(module.description_only(before,before))
        for key,value in [('title','Changed'),('production_seo',{'canonical':[]}),('main_file','content/changed.html')]:
            with self.subTest(key=key):self.assertFalse(module.description_only(before,{**before,'description':'Reviewed summary',key:value}))


if __name__=='__main__':unittest.main()
