# Krawl Through Krakow Website

Private source repository for KTK's code-managed homepage, content pages,
shared integrations and custom storefront. WordPress still supplies hosting,
routing and selected backend services. OmniLodge is a separate application.

Read [AGENTS.md](AGENTS.md) before development or deployment. Its newest
instructions take precedence over historical release notes.

## Project Layout

| Path | Purpose |
| --- | --- |
| `staging/wp-content/mu-plugins/ktk-homepage*` | Homepage renderer, sources and deployable assets |
| `staging/wp-content/mu-plugins/ktk-code-pages*` | Content-page renderer and generated pages/media |
| `staging/wp-content/mu-plugins/ktk-site-integrations*` | Shared attribution and integration helpers |
| `staging/wp-content/mu-plugins/ktk-clarity.php` | Company-owned Clarity integration |
| `staging/wp-content/plugins/ktk-storefront/frontend` | React storefront source and lockfile |
| `staging/wp-content/plugins/ktk-storefront/assets` | Compiled storefront deployment payload |
| `tools` | Builders, tests and guarded publishers |
| `docs` | Maintained plans and selected immutable public build inputs |

The `staging` directory is the existing source layout, not permission to deploy
to production. Publishers select their remote destination separately.

## Local Checks

Use Node.js 22, Python 3.12+ and PHP 8.3+:

```powershell
npm.cmd ci --prefix staging/wp-content/plugins/ktk-storefront/frontend
npm.cmd test --prefix staging/wp-content/plugins/ktk-storefront/frontend
python tools/check-repository.py
python -m unittest discover -s tools/tests -p "test_*.py"
node --test tools/tests/test_booking_destinations.mjs
php tools/tests/test_storefront_proxy.php
```

Frontend development and builds:

```powershell
cd staging/wp-content/plugins/ktk-storefront/frontend
npm.cmd run dev
npm.cmd run build
```

The development server proxies public API requests to OmniLodge by default.
Do not submit real orders, payments or messages while testing. Use the existing
isolated browser fixtures for those workflows.

Content generators retain their original capture inputs. Do not manually edit
generated content/CSS. Some legacy capture/browser tools still require the
local Codex Playwright runtime and historical screenshot/report archives;
those tools are not portable CI checks. See
[the migration process](docs/code-pages/MIGRATION-PROCESS.md).

## Change and Release Workflow

1. Start a small feature branch from `main`; keep related code, tests and docs
   in the same pull request.
2. Run automated checks and review the diff, including generated output.
3. Back up and deploy only the approved environment using its existing guarded
   publisher. Verify deployed hashes and device-specific cached responses.
4. Get explicit production approval before promoting staging improvements.
5. Merge the reviewed change and record the actual deployment separately.

GitHub Actions runs checks only. A push or merge never deploys the website.
No hosting credentials are stored in GitHub Actions. The SEO improvement work
authorized on November 12, 2026 is **staging only**.

File line endings are deliberately preserved: remote release checks and
historical manifests depend on exact SHA-256 values. Do not bulk-normalize
existing files.

## Secrets, Backups and Recovery

The repository excludes `wp-config.php`, `Keys`, encrypted credential exports,
database dumps, dependencies, third-party plugins/themes, server backups,
screenshots, private operational evidence and browser authentication state.
The root allowlist also keeps unknown new directories out until reviewed.

Only the known KTK code and its deployable assets are versioned. Original
WordPress data, server configuration, uploads outside the owned assets, historical
release reports and rollback ZIPs remain outside Git. Referenced old evidence
may therefore be available only in the original workspace/private backups.

The FTPS password remains in the existing Windows DPAPI store. The established
PowerShell publisher wrappers decrypt it only for their child publisher process;
never paste it into a command, source file, issue or workflow secret.

Git is a source-history and review system, not a replacement for database/media
backups. Restore application files only through the scoped release procedure;
do not restore an old database to roll back a code change.

## SEO Roadmap

The backlog is in
[SEO and Website Improvement Plan](docs/seo/SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md).
First work: dated technical baseline, URL-role map, code-owned metadata pilot
and discovery safeguards, all on staging. OmniLodge reporting work and external
account changes require separate approval.
