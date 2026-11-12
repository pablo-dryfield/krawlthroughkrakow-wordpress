# Version Control Setup

Started November 12, 2026 at the owner's request, before SEO application changes.
Repository: private `pablo-dryfield/krawlthroughkrakow-wordpress`.
Default branch: `main`. Publishing a commit does not deploy any website code.

## Included

- Maintained KTK homepage, content-page, integrations and storefront source.
- Deployable generated assets, including the existing media/font/vector files.
- Source generators, guarded publishers, isolated tests and maintained plans.
- Immutable public captures required for content builds and original Illustrator
  artwork for reproducible statue extraction. Source artwork is never deployed.

Existing media are intentionally retained in ordinary Git for the initial
reproducible checkpoint. The largest owned file is approximately 34 MiB, below
the 50 MiB project guard. This is not a new media-hosting or optimization release.

## Excluded

Credentials and encrypted exports, `Keys`, `wp-config.php`, server/database
backups, third-party plugin/theme trees, dependencies, browser state, private
operational reports and historical screenshots/logs. Nothing was deleted or
moved from the original workspace. Git does not replace offsite backups.

## Verification

- `tools/check-repository.py` checks tracked paths, file sizes and 358 build
  inputs. It also rejects tracked files that bypass `.gitignore`.
- Gitleaks v8.30.1 scans the exact reviewed checkout before upload. Its official
  release binary is SHA-256 verified. CI runs the same pinned version.
- Initial default-rule findings were reviewed: public Iubenda browser setup,
  captured Ecwid CSS class selectors and `.htaccess` SHA-256 manifest values.
  `.gitleaks.toml` exempts only these narrow file/context combinations; all
  default detection rules remain enabled. The public JS key distinction is
  documented by [Iubenda](https://www.iubenda.com/en/help/6473-consent-solution-js-documentation/).
- Existing production-promotion code is unchanged. Its formerly time-dependent
  unit test now exercises approved/fresh evidence with fixtures and explicitly
  rejects stale/mismatched evidence rather than assuming an old release can
  still be promoted.
- CI uses commit-pinned official actions, read-only repository permissions and
  no deployment credentials. Tests do not submit live orders, messages or
  payments. Production, staging and OmniLodge remain unchanged by setup.

The complete local historical scan reports remain outside Git in
`deploy-backups/github-*-secret-scan.json`; sensitive matches are redacted.
The presence of source in Git is not approval to publish it publicly.
