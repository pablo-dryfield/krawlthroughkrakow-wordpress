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

## Initial Checkpoint

Commit `0cec9853877d06eb1ffee21bba296b76553828c2` uploaded the reviewed source.
[GitHub checks 43258102004](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/43258102004)
passed both jobs, including a fresh dependency installation, 50 frontend tests,
93 isolated publisher tests, shared JS/PHP contracts, syntax and storefront build.
The pre-upload Gitleaks scan of the exact staged checkout found no unreviewed
secrets. GitHub's scan passed too. All 358 required build inputs are tracked.

GitHub reports a private repository, default `main`, zero Actions secrets and
zero webhooks. Application deployment tools and all application bytes are
unchanged. Follow-up only updates official action pins and setup documentation.

The owner asked whether SSH was available. The existing local `ktk-hosting`
alias/key configuration was found, but a read-only key-authenticated probe
returned `Permission denied (publickey,password)`. No password authentication,
access-policy change or remote write was attempted. Continue using the existing
manual FTPS publishers unless SSH access is subsequently verified and an
equivalent guarded SSH publisher is deliberately implemented.
