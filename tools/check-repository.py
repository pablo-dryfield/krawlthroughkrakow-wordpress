#!/usr/bin/env python3
"""Check the Git index for forbidden files and missing build inputs, offline."""
from pathlib import Path, PurePosixPath
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MAX_FILE_BYTES = 50 * 1024 * 1024


def main():
    paths = subprocess.check_output(
        ['git', 'ls-files', '-z'], cwd=ROOT,
    ).decode('utf-8').split('\0')
    paths = [name for name in paths if name]
    if not paths:
        raise RuntimeError('No tracked files; stage the reviewed project first.')
    ignored = subprocess.run(
        ['git', 'check-ignore', '--no-index', '-z', '--stdin'], cwd=ROOT,
        input=('\0'.join(paths) + '\0').encode(), capture_output=True,
    )
    if ignored.returncode not in (0, 1):
        raise RuntimeError('git check-ignore failed')
    errors = ['Tracked file violates .gitignore: ' + name
              for name in ignored.stdout.decode().split('\0') if name]
    total = 0
    tracked = set(paths)
    for name in paths:
        file = ROOT / name
        if file.is_symlink():
            errors.append('Symlinks require review: ' + name)
            continue
        size = file.stat().st_size
        total += size
        if size > MAX_FILE_BYTES:
            errors.append('File exceeds the reviewed 50 MiB limit: ' + name)
        if PurePosixPath(name).parts[0] not in {
            '.gitignore', '.gitattributes', '.gitleaks.toml', '.github', 'README.md', 'AGENTS.md',
            'staging', 'tools', 'docs',
        }:
            errors.append('Unreviewed root path: ' + name)

    required = {
        'docs/homepage-parity/production-source-rendered-1920.html',
        'docs/homepage-parity/production-source-styles-1920.json',
        'docs/homepage-parity/parity-build.json',
        'docs/code-pages/how-to-join/build.json',
        'docs/code-pages/how-to-join/production-rendered-1920.html',
        'docs/code-pages/how-to-join/production-styles-1920.json',
        'docs/code-pages/full-migration/assets.json',
        'docs/code-pages/full-migration/manifest.json',
        'docs/code-pages/production-readiness/production-seo-baseline.json',
        'staging/wp-content/plugins/ktk-storefront/frontend/package-lock.json',
    }
    manifest = json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text())
    for route in manifest['routes']:
        for suffix in ['production-1920.html', 'production-1920.json', 'production-390.json']:
            required.add(route['source'] + '/' + suffix)
    for name in sorted(required - tracked):
        errors.append('Missing tracked build input: ' + name)
    print(json.dumps({'tracked_files': len(paths), 'total_bytes': total,
                      'required_build_inputs': len(required), 'errors': errors}, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
