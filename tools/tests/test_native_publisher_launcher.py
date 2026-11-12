import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHELL = shutil.which('powershell') or shutil.which('pwsh')


@unittest.skipUnless(SHELL, 'PowerShell is required for the native launcher contract')
class NativePublisherLauncherTests(unittest.TestCase):
    def run_fixture(self, exit_code):
        with tempfile.TemporaryDirectory(prefix='ktk-native-launcher-') as directory:
            fixture = Path(directory) / 'progress.py'
            fixture.write_text('import sys\nprint("fixture progress", file=sys.stderr)\nprint("fixture result")\nsys.exit(int(sys.argv[1]))\n')
            quote = lambda value: "'" + str(value).replace("'", "''") + "'"
            command = ("$ErrorActionPreference='Stop'; . " + quote(ROOT / 'tools/invoke-ktk-native.ps1')
                       + '; Invoke-KtkNativeCommand -Command ' + quote(sys.executable)
                       + ' -Arguments @(' + quote(fixture) + ',' + quote(exit_code)
                       + ') 2>&1; exit $KtkNativeExitCode')
            return subprocess.run([SHELL, '-NoProfile', '-NonInteractive', '-Command', command], capture_output=True, text=True)

    def test_progress_stderr_does_not_abort_a_successful_child(self):
        result = self.run_fixture(0)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('fixture progress', result.stdout + result.stderr)
        self.assertIn('fixture result', result.stdout)

    def test_actual_nonzero_child_exit_remains_a_failure(self):
        result = self.run_fixture(7)
        self.assertEqual(result.returncode, 7)
        self.assertIn('fixture progress', result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
