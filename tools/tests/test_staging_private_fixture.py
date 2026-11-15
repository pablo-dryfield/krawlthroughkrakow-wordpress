"""Real PHP private-host lifecycle against isolated filesystem and protected-state fixtures."""
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from tools.tests.test_active_content_transaction import ACTIVATION

ROOT = Path(__file__).resolve().parents[2]
COMPONENT = ROOT / 'tools/staging-private-fixture.php'
ENGINE = ROOT / 'tools/code-pages-update-engine.php'


def sha(data):
    return hashlib.sha256(data).hexdigest()


DRIVER = r'''<?php
define('KTK_UPDATE_ENGINE_ALLOWED',true); define('KTK_STAGING_FIXTURE_ALLOWED',true);
require $argv[1]; require $argv[2];
$c=json_decode(file_get_contents($argv[3]),true,512,JSON_THROW_ON_ERROR);
$capture=static function()use($c){$s=json_decode(file_get_contents($c['state']),true,512,JSON_THROW_ON_ERROR);$s['helperSha256']=hash_file('sha256',$c['helper']);return $s;};
try{
 $fixture=new KTK_Staging_Private_Fixture($c['stage'],$c['helper'],$c['id'],$c['commit'],$c['owned'],base64_decode($c['activation'],true),$capture);
 $result=$fixture->run($argv[4],$c['exportSha']??null,$c['archiveSha']??null);
 echo json_encode(array('ok'=>true,'result'=>$result),JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo json_encode(array('ok'=>false,'error'=>$e->getMessage()),JSON_THROW_ON_ERROR);exit(2);}
'''


@unittest.skipUnless(shutil.which('php'), 'PHP is required for isolated private lifecycle fixtures')
class StagingPrivateFixtureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ktk-host-private-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.stage = self.root / 'public_html/staging'
        mu = self.stage / 'wp-content/mu-plugins'
        mu.mkdir(parents=True)
        self.identity = {'home': 'https://krawlthroughkrakow.com/staging/', 'siteurl': 'https://krawlthroughkrakow.com/staging/', 'blogPublic': 0}
        self.owned = {'ktk-code-pages.php': sha(b'real public renderer unchanged'), 'ktk-code-pages-assets/registry.php': sha(b'real public registry unchanged')}
        for name, data in [('ktk-code-pages.php', b'real public renderer unchanged'), ('ktk-code-pages-assets/registry.php', b'real public registry unchanged'), ('ktk-homepage-shortcode.php', b'real homepage unchanged')]:
            p = mu / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(data)
        self.helper = mu / ('ktk-transaction-rehearsal-' + 'a' * 32 + '.php')
        self.helper.write_bytes(b'<?php /* isolated helper identity only */\n')
        self.state = self.root / 'real-protected-state.json'
        self.state_value = {'schemaVersion': 1, 'scope': 'staging-protected-original-state', 'identity': self.identity,
                            'ownedContentFiles': dict(sorted(self.owned.items())), 'protectedStateSha256': sha(b'real protected fixture state'),
                            'database': {k: [] for k in ['posts', 'postmeta', 'options', 'terms', 'term_taxonomy', 'term_relationships', 'termmeta']},
                            'rowCounts': {k: 0 for k in ['posts', 'postmeta', 'options', 'terms', 'term_taxonomy', 'term_relationships', 'termmeta']},
                            'protectedFiles': {'mu/ktk-homepage-shortcode.php': sha(b'real homepage unchanged')},
                            'databaseWrites': 0, 'applicationWrites': 0, 'cachePurges': 0}
        self.save_state()
        self.config = {'stage': str(self.stage), 'helper': str(self.helper), 'id': 'a' * 32, 'commit': 'c' * 40,
                       'owned': self.owned, 'activation': base64.b64encode(ACTIVATION).decode(), 'state': str(self.state)}
        self.config_file = self.root / 'config.json'
        self.driver = self.root / 'driver.php'; self.driver.write_bytes(DRIVER.encode())
        self.private = self.root / ('.ktk-staging-rehearsal-' + 'a' * 32)
        self.public_before = self.tree(self.stage)

    def save_state(self):
        self.state.write_bytes(json.dumps(self.state_value).encode())

    def tree(self, directory):
        return {p.relative_to(directory).as_posix(): p.read_bytes() for p in directory.rglob('*') if p.is_file() and not p.is_symlink()}

    def call(self, action, success=True, interrupted=False, export=None):
        c = dict(self.config)
        if export is not None:
            c.update(exportSha=export, archiveSha='d' * 64)
        self.config_file.write_bytes(json.dumps(c).encode())
        r = subprocess.run(['php', '-d', 'allow_url_fopen=0', str(self.driver), str(ENGINE), str(COMPONENT), str(self.config_file), action],
                           capture_output=True, timeout=30)
        self.assertEqual(r.returncode, 73 if interrupted else 0 if success else 2, r.stdout + r.stderr)
        if interrupted:
            return None
        value = json.loads(r.stdout)
        self.assertIs(value['ok'], success)
        self.assertEqual(self.tree(self.stage), self.public_before)
        return value.get('result') if success else value['error']

    def complete(self):
        prepared = self.call('prepare')
        self.assertEqual(prepared['status']['phase'], 'prepared')
        for i in range(5):
            row = self.call('apply')
            self.assertEqual(row['status']['phase'], 'applied' if i == 4 else 'applying')
        for i in range(5):
            row = self.call('rollback')
            self.assertEqual(row['status']['phase'], 'rolled-back' if i == 4 else 'rolling-back')
        return self.call('export')

    def test_direct_component_has_no_default_entrypoint(self):
        result = subprocess.run(['php', str(COMPONENT)], capture_output=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.private.exists())
        self.assertEqual(self.tree(self.stage), self.public_before)

    def test_unknown_action_and_wrong_activation_create_no_private_root(self):
        self.call('unknown', success=False)
        self.assertFalse(self.private.exists())
        self.config['activation'] = base64.b64encode(b'wrong marker').decode()
        self.call('prepare', success=False)
        self.assertFalse(self.private.exists())

    def test_actual_full_lifecycle_keeps_public_state_and_two_private_closure_files(self):
        exported = self.complete()
        private = exported['privateExport']
        for name, row in private['manifest']['files'].items():
            data = base64.b64decode(private['fileBytesBase64'][name], validate=True)
            self.assertEqual(len(data), row['bytes']); self.assertEqual(sha(data), row['sha256'])
        result = self.call('cleanup', export=private['sha256'])
        self.assertEqual(result['status']['phase'], 'closed')
        self.assertEqual(set(self.tree(self.private)), {'lifecycle.lock', 'closed.json'})
        self.assertTrue(result['status']['rawOriginalStateRemoved'])
        self.assertTrue(result['status']['fixtureAndPriorPayloadRemoved'])
        self.assertEqual(set(self.call('inspect')['status']['retainedPrivateFiles']), {'lifecycle.lock', 'closed.json'})
        before = self.tree(self.private)
        self.call('prepare', success=False)
        self.call('apply', success=False)
        self.assertEqual(self.tree(self.private), before)

    def test_actual_exit_after_replacement_preserves_intent_and_fragment_then_recovers(self):
        self.call('prepare')
        self.call('interrupt', interrupted=True)
        status = self.call('inspect')['status']
        self.assertEqual(status['phase'], 'applying')
        self.assertEqual(len(status['intentFiles']), 1)
        self.assertEqual(len(status['pendingApplyFiles']), 4)
        self.assertEqual(len(status['retainedPrivateReceiptArtifacts']), 1)
        self.assertEqual(next(iter(status['retainedPrivateReceiptArtifacts'].values()))['sha256'], sha(b'partial'))
        self.call('interrupt', success=False)
        for _ in range(4): self.call('apply')
        for _ in range(5): self.call('rollback')
        exported = self.call('export')
        self.assertEqual(exported['status']['retainedPrivateReceiptArtifacts'], status['retainedPrivateReceiptArtifacts'])
        self.call('cleanup', export=exported['privateExport']['sha256'])
        self.assertEqual(set(self.tree(self.private)), {'lifecycle.lock', 'closed.json'})

    def test_wrong_export_digest_preserves_every_private_file(self):
        self.complete()
        before = self.tree(self.private)
        self.call('cleanup', export='0' * 64, success=False)
        self.assertEqual(self.tree(self.private), before)

    def test_changed_original_capture_blocks_recovery_and_cleanup(self):
        self.call('prepare')
        path = self.private / 'original-state.json'; path.write_bytes(b'foreign original capture')
        self.call('apply', success=False)
        self.call('rollback', success=False)
        self.assertEqual(path.read_bytes(), b'foreign original capture')

    def test_real_protected_change_blocks_without_restoring_database(self):
        self.call('prepare'); self.call('apply')
        self.state_value['protectedStateSha256'] = sha(b'owner changed state'); self.save_state()
        before = self.tree(self.private)
        self.call('apply', success=False); self.call('rollback', success=False)
        self.assertEqual(self.tree(self.private), before)
        self.assertEqual(json.loads(self.state.read_bytes())['protectedStateSha256'], sha(b'owner changed state'))

    def test_unknown_private_file_and_directory_are_preserved_before_cleanup(self):
        exported = self.complete()
        foreign = self.private / 'unrelated.txt'; foreign.write_bytes(b'foreign private bytes')
        self.call('cleanup', export=exported['privateExport']['sha256'], success=False)
        self.assertEqual(foreign.read_bytes(), b'foreign private bytes')
        foreign.unlink(); (self.private / 'unrelated-dir').mkdir()
        self.call('cleanup', export=exported['privateExport']['sha256'], success=False)
        self.assertTrue((self.private / 'unrelated-dir').is_dir())
        self.assertTrue((self.private / 'original-state.json').exists())

    def test_root_collision_is_not_overwritten(self):
        self.private.mkdir(); (self.private / 'foreign').write_bytes(b'unrelated')
        self.call('prepare', success=False)
        self.assertEqual(self.tree(self.private), {'foreign': b'unrelated'})

    def test_symlink_private_root_is_rejected(self):
        elsewhere = self.root / 'elsewhere'; elsewhere.mkdir()
        try: self.private.symlink_to(elsewhere, target_is_directory=True)
        except OSError as e: self.skipTest('OS does not permit fixture symlinks: ' + type(e).__name__)
        self.call('prepare', success=False)
        self.assertFalse(list(elsewhere.iterdir()))


if __name__ == '__main__':
    unittest.main()
