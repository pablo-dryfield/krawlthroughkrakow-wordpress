"""Real engine factory composition, private PHP wire and offline profile provenance."""
import contextlib,copy,hashlib,importlib.util,io,json,subprocess,tempfile,time,types,unittest,sys
from pathlib import Path
from unittest import mock
from tools import full_private_engine_packet as packet
from tools import full_private_recovery_hashing as hashing
from tools import full_private_engine_controller as original
from tools import staging_state_fast_capture as fast
from tools import content_update_backup as backup
from tools.tests import test_private_preparation_fast_capture as previous
from tools.tests import test_full_private_engine_packet as native

PROFILE='bounded-complete-sha256'
spec=importlib.util.spec_from_file_location('ktk_operator_profile_test',packet.ROOT/'tools/rehearse-staging-full-private-engine.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

OPERATOR_EVIDENCE_PATHS=(
    'tools/normal_response_contract.py','tools/private_entry_probe.py',
    'tools/tests/test_content_update_private_store.py','tools/tests/test_full_private_engine_packet.py',
    'tools/tests/test_full_private_engine_recovery.py','tools/tests/test_full_private_recovery_operator.py',
    'tools/tests/test_full_private_seed_recovery.py','tools/tests/test_full_private_seed_rehearsal.py',
    'tools/tests/test_full_private_seed_transport.py','tools/tests/test_private_entry_probe.py',
    'tools/tests/test_staging_protected_state.py',
)

def evidence_source_hashes():
    return {name:backup.sha((packet.ROOT/name).read_bytes()) for name in OPERATOR_EVIDENCE_PATHS}

def require_loaded_source_closure(core,extra):
    if len(extra)!=11 or set(extra)!=set(OPERATOR_EVIDENCE_PATHS) or set(core)&set(extra):
        raise ValueError('Exact disjoint operator evidence domain required')
    for module in tuple(sys.modules.values()):
        location=getattr(module,'__file__',None)
        if location:
            path=Path(location).resolve()
            if path.is_relative_to(packet.ROOT/'tools') and path.suffix=='.py' and path.relative_to(packet.ROOT).as_posix() not in set(core)|set(extra):
                raise ValueError('Loaded repository source outside both reviewed input domains')


class OperatorProfileCompilerContracts(unittest.TestCase):
    def test_whole_real_helper_inverse_preserves_raw_and_bounded32_defaults(self):
        args=previous.arguments();current=packet.helper_source(*args,capture_profile=PROFILE)
        for profile,state in [('raw',fast.SOURCE.read_bytes()),('bounded-sha256',fast.TARGET.read_bytes())]:
            legacy=packet.helper_source(*args,capture_profile=profile)
            inverse=current
            for new,old in [(hashing.capture_source()[6:],state[6:]),(hashing.stream_source()[6:],original.stream_source()[6:])]:
                self.assertEqual(inverse.count(new),1)
                inverse=inverse.replace(new,old,1)
            self.assertTrue(inverse==legacy,'Only the two complete hash components may differ in the real helper')
        self.assertTrue(packet.helper_source(*args)==packet.helper_source(*args,capture_profile='raw'),'Raw factory default must remain byte exact')

    def test_unknown_profile_cannot_select_or_infer_an_operator_mode(self):
        for profile in [None,True,'fast','production',[],{}]:
            with self.assertRaises(ValueError):packet.helper_source(*previous.arguments(),capture_profile=profile)


class OptimizedEnginePacketNativeContracts(native.FullPrivateEnginePacketTests):
    def setUp(self):
        super().setUp()
        bridge=native.bridge
        self.source=packet.helper_source(Path(self.case.cfg['helper']).name,bridge.old.TOKEN,self.expires,
            bridge.old.APP,self.case.owned,self.case.sizes,self.case.plan['protectedStateSha256'],bridge.old.KEY,capture_profile=PROFILE)

    def test_compiled_source_embeds_only_reviewed_components_and_early_private_guard(self):
        source=self.source
        self.assertFalse(b'__KTK_FULL_ENGINE_' in source,'All private helper markers must be resolved')
        self.assertTrue(b"add_action('muplugins_loaded'," in source,'Early private guard must remain')
        for name,filename in packet.COMPONENTS.items():
            component=hashing.capture_source() if name=='STATE' else (packet.ROOT/'tools'/filename).read_bytes()
            self.assertTrue(component[6:] in source,'Exact reviewed component required: '+name)
        self.assertTrue(hashing.stream_source()[6:] in source,'Exact measured stream must be embedded')
        self.assertTrue(original.controller_source()[6:] in source,'Original controller must remain exact')
        self.assertLess(source.index(b'HTTP_X_KTK_FULL_ENGINE_TOKEN'),source.index(b'ktk_capture_staging_original_state(__FILE__)'))
        result=subprocess.run([native.bridge.old.PHP,'-l'],input=source,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)


class OperatorProfileRecoveryContracts(unittest.TestCase):
    def exercise(self,saved_profile,requested_profile,*,correct=False,tampered=False,expired=False,saved_bounds=False,requested_bounds=False):
        args=previous.arguments();name,token,expires,commit,owned,sizes,protected,key=args
        tooling='d'*40;source=packet.helper_source(*args,capture_profile=saved_profile,hosted_runtime_bounds=saved_bounds)
        plan,_,_=packet.full.plan('a'*32,commit,owned,sizes,protected)
        hashes={'tools/fixture-only.py':'e'*64}
        value={'schemaVersion':1,'scope':runner.recovery.SCOPE,'entryProfile':'early','transactionId':'a'*32,
               'applicationCommit':commit,'toolingCommit':tooling,'helperSha256':'f'*64 if tampered else backup.sha(source),
               'sourceHashes':hashes,'expires':int(time.time())-1 if expired else expires,'token':token,'ownershipKey':key,
               'plan':plan,'publicOwned':owned,'publicSizes':sizes,'interruptOriginal':False,'interruptEngine':False}
        before=copy.deepcopy(value)
        class StopBeforeCredentials(Exception):pass
        with tempfile.TemporaryDirectory(prefix='ktk-operator-profile-preflight-') as folder:
            root=Path(folder);output=root/'docs/seo/report.json'
            vault=mock.Mock();vault.load.return_value=copy.deepcopy(value)
            with mock.patch.object(runner,'ROOT',root),mock.patch.object(runner,'reviewed_source',return_value=(owned,sizes,hashes)),\
                 mock.patch.object(runner.recovery,'FullPrivateEngineVault',return_value=vault),\
                 mock.patch.object(runner.shared.snapshot,'load_common',side_effect=StopBeforeCredentials) as common,\
                 mock.patch.object(runner,'BoundedStagingFTPS') as connection,contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(RuntimeError):runner.main(['--inspect-recovery','a'*32,'--application-commit',commit,
                    '--tooling-commit',tooling,'--report',str(output),'--capture-profile',requested_profile]+(['--hosted-runtime-bounds'] if requested_bounds else []))
                connection.assert_not_called()
                if correct:common.assert_called_once_with()
                else:common.assert_not_called()
            report=json.loads(output.read_bytes())
            self.assertEqual(report['captureProfile'],requested_profile)
            self.assertEqual(report.get('captureProfileVerifiedBeforeConnection',False),correct)
            self.assertEqual(report['failureType'],'StopBeforeCredentials' if correct else 'ValueError')
            self.assertEqual(value,before)
            self.assertFalse(any(key in output.read_text() for key in (value['token'],value['ownershipKey'])))
            vault.load.assert_called_once_with('a'*32)

    def test_wrong_profile_refuses_before_credentials_or_connection(self):
        for saved,requested in [('bounded-sha256',PROFILE),(PROFILE,'bounded-sha256')]:
            self.exercise(saved,requested)

    def test_matching_profile_recreates_original_helper_before_credentials(self):
        for profile in ['bounded-sha256',PROFILE]:self.exercise(profile,profile,correct=True)

    def test_changed_helper_pin_refuses_without_profile_coercion(self):
        self.exercise(PROFILE,PROFILE,tampered=True)

    def test_expired_context_never_recompiles_or_refreshes_credentials(self):
        self.exercise(PROFILE,PROFILE,expired=True)

    def test_hosted_bounds_cannot_be_inferred_or_removed_from_saved_context(self):
        self.exercise(PROFILE,PROFILE,saved_bounds=True,requested_bounds=False)
        self.exercise(PROFILE,PROFILE,saved_bounds=False,requested_bounds=True)

    def test_exact_hosted_bounds_profile_is_recreated_before_credentials(self):
        self.exercise(PROFILE,PROFILE,saved_bounds=True,requested_bounds=True,correct=True)


if __name__=='__main__':unittest.main()
