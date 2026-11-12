# Restore the Preserved Homepage Redesign

This is the final code-managed staging redesign checkpoint, preserved before the production-parity work on 2026-10-06. It includes the centered photographic hero, restored story/gallery/film/secondary sections, responsive navigation, consent integrations and verification reports. Production is not part of this restoration.

## Verified Checkpoint

- Archive: `deploy-backups/homepage-redesign-preserved-20261006.zip`
- SHA-256: `BD71C28022C7AD0AAF43F983E1F2AF3EC62F2E9BE4EFA1919705FFC4FA020E58`
- Verified contents: 181 files, 72,535,502 uncompressed bytes.
- Inventory: 20 files under `tools`, 122 under `docs`, 36 under `ktk-homepage-assets`, plus `AGENTS.md` and the two homepage PHP files.
- Deployable homepage payload: 38 files (36 assets/supporting files and two root PHP files).

The archive contains the build source and already prepared assets; image regeneration is not necessary. Historical screenshots and Lighthouse reports describe their recorded revisions, not a future restored deployment.

## Restore Paths

Verify the archive hash first with `Get-FileHash -LiteralPath .\deploy-backups\homepage-redesign-preserved-20261006.zip -Algorithm SHA256`. Preserve any newer work, then expand the archive into a new, separate recovery directory. Do not extract directly over the repository: its PHP files and asset directory are flattened at the archive root.

| Archive path | Repository destination |
| --- | --- |
| `tools/*` | `tools/*` |
| `docs/*` | `docs/*` |
| `ktk-homepage-assets/*` | `staging/wp-content/mu-plugins/ktk-homepage-assets/*` |
| `ktk-homepage-shortcode.php` | `staging/wp-content/mu-plugins/ktk-homepage-shortcode.php` |
| `ktk-homepage-shortcode-content.php` | `staging/wp-content/mu-plugins/ktk-homepage-shortcode-content.php` |
| `AGENTS.md` | Review against current `AGENTS.md`; preserve newer instructions. |

Confirm the extracted inventory has 181 files before remapping. Review shared tools/docs before replacing them, and skip generated `__pycache__` files. Restore both the generated renderer and historical content PHP because the local-source builder reads their metadata. Preserve any newer unrelated assets; they need not be deleted to restore this version.

The later production-parity release added tested FTPS reconnect/retry handling to `tools/publish-homepage-shortcode.py`. Keep those deployment reliability fixes when restoring design files instead of blindly replacing the current publisher with the archived version.

## Build and Publish Staging Only

After deliberate restoration and review, run from the repository root:

```powershell
.\tools\publish-homepage-shortcode.ps1 --build-only
php tools/tests/test_homepage_integration.php
node tools/tests/test_homepage_consent.mjs
python -m unittest discover -s tools/tests -p test_homepage_publisher.py -v
```

The build is offline and requires no deployment credentials. The preserved source uses WordPress to serve its standalone document, but does not use Divi to render the homepage.

When a staging release is authorized, run:

```powershell
.\tools\publish-homepage-shortcode.ps1 --local-source
```

This mode uses local source, backs up staging, verifies the payload and does not read or write production. Do not invoke the no-flag historical production-export workflow or the storefront production publisher for this restoration. Never display or copy the decrypted FTPS credential.

Verify `https://krawlthroughkrakow.com/staging/`, asset responses/checksums, navigation, booking handoff and responsive layouts. If APO remains stale, purge only the `krawlthroughkrakow.com/staging/` prefix and check desktop, mobile and tablet User-Agents; a single-URL purge previously left device variants stale. Keep staging noindex and production unchanged.

## Older Backup Caveat

`ktk-homepage-shortcode-staging-20261006-122619.zip` is the remote backup made before the final centered-hero CSS update; it is not this complete final checkpoint. Its CSS SHA-256 starts `6a0db50833e9`, whereas the preserved redesign CSS starts `ab7acfbdf977`. The earlier `homepage-redesign-local-before-20261006.zip` is the old standalone replica, not the redesign, and is not a pixel-exact production copy.
