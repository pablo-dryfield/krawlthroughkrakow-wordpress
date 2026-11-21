# Staging monitor installed - 21November2026

[PR138](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/pull/138)
merged as `20b5e2dec9783230046acd8c34071b8f612c1597`, with the exact reviewed
tree `cef2f59ca059b66f8c2e9fa0c06217a2e6ba7b61`. Its candidate required CI passes
1305Python tests/21platform skips,45Windows tests, secret scanning and all65
Linux steps in1858seconds under the original40-minute cap.

The automatic actual-main
[Staging Availability run44881907174](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44881907174)
passes both jobs:

- Availability Scope Contracts136778815551: eight actual-CLI contracts, with
  network disabled, pass.
- Staging HTTP and Indexing Guards136778890875: all six fixed clean staging
  routes return200/HIT, no maintenance page, HTMLnoindex and one self-canonical.
  There are no transport retries or report errors. The regular-product
  X-Robots-Tag header is absent; its HTMLnoindex is present.

Both raw logs name the exact actual-main checkout. The973-byte single-member
artifact14698308273 is reopened: ZIP CRC, member bytes, API size and digest
match SHA-256
`89e8e82711ab9559c9eb34083f7adf05d1e3a1f220fa4a5820be6c6bc2463568`.
The public response report is retained for14days by the workflow; the verified
local evidence is retained independently. This establishes installation and
the first actual run, rather than inferring installation from local tests.

The workflow checks the homepage, About Us, guide-life article, regular product,
NYE product and How to Join. It uses GETs without cookies/site JavaScript and
forbids redirects. It runs after affected main pushes, manual dispatch and on
Mondays at06:17UTC; GitHub may delay scheduled runs. Job limits remain5/8minutes.
The existing mixed availability CLI mode and repository/recovery bounds are
unchanged. No manual duplicate run is dispatched.

GitHub check failure is the review signal. Future cron execution, actual alert
inbox receipt, all-route availability, rendered behavior, CWV, customer/provider
or consent outcomes are not established by this six-route report. KTK's agreed
monthly/seasonal review responsibilities remain; no message, calendar change
or new third-party account is created.

Required actual-main Repository Checks44881907273 are tracked separately from
this accepted monitoring run. The earlier L01 actual-main run44876066099
cancelled at its original40-minute limit, without a complete test summary;
its failure is retained. A successful candidate or monitoring job does not
relabel that cancellation. Current source/main results retain their own scope.

Production and D08 remain excluded. No credentials, scopes, Google account
settings, Cloudflare rules or production site files were changed by monitoring.
