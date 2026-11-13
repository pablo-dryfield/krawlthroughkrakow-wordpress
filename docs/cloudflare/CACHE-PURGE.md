# Cloudflare Cache Purge Access

## Established Connection

On 13 November 2026 the owner reauthorized the existing **`cloudflare` MCP agent**
and asked that future sessions retain this access context. Use that authenticated
connection for approved KTK edge-cache purges instead of repeatedly asking the
owner to purge through the dashboard or create another API token.

| Setting | Value |
| --- | --- |
| Domain | `krawlthroughkrakow.com` |
| Zone ID | `4303f6a45f815c5570bb4bba5f86a423` |
| Account ID | `ddfd57890e03c243c120f480d65f15de` |
| MCP connection | `cloudflare`, endpoint host `mcp.cloudflare.com` |
| Available tools | `mcp__cloudflare__whoami`, `mcp__cloudflare__search`, `mcp__cloudflare__execute` |
| Purge endpoint | `POST /zones/{zone_id}/purge_cache` |

These IDs are identifiers, not credentials. Do not export OAuth tokens, create a
replacement Global API key, or store authentication material in this repository.
The separate `cloudflare-docs` connection only supplies documentation. The old
Wrangler login is not the credential source for this MCP connection.

## What Was Verified

- MCP identity authentication succeeds.
- `GET /zones?name=krawlthroughkrakow.com` returns the one expected active zone.
- A separate `GET /zones/4303f6a45f815c5570bb4bba5f86a423` succeeds and reports
  `#cache_purge:edit` in its legacy membership-permission list.
- The current API specification requires `Cache Purge` for the purge endpoint.
- First approved purge POST succeeded on **2026-11-13 at12:00:05.494UTC**, scoped
  only to `krawlthroughkrakow.com/staging/`, following the SEO accessibility
  staging release. API `success:true`; returned result ID
  `4303f6a45f815c5570bb4bba5f86a423`. No host-wide/production purge was sent.
  The initial documentation checkpoint had not tested writes; that historical
  limitation is now superseded by actual scoped execution, not just membership.
- Clean homepage desktop/Android/iPad responses and all10 active asset hashes
  pass after that purge. Full content clean/repeat verification is recorded in
  [the release evidence](../seo/content-accessibility-2026-11-13/README.md), not
  inferred from API acceptance alone.

The generic `/user/tokens/verify` request returned 401 through this connection,
while subsequent zone GETs still succeeded. Do not use that endpoint alone to
declare this MCP connection broken or demand another login. The earlier missing
OAuth-issuer startup error was resolved by owner reauthorization. If a relevant
zone/purge request actually fails authentication, diagnose that current failure
and request reconnection only when needed; never weaken auth validation.

## Scope And Authorization

Remembering access is not blanket permission to change Cloudflare. Use this
connection for purges within the current user-approved release scope. Keep all
website SEO work staging-only unless separately authorized. If purge scope is
unclear or would expand to production, other hosts or the whole zone, obtain the
owner's approval first. Do not repeatedly ask the owner to perform an already
approved purge manually when this connection works.

Prefer the narrowest affected URL/asset prefix. A staging-only purge body is:

```json
{"prefixes":["krawlthroughkrakow.com/staging/"]}
```

Prefix values have no scheme, query or fragment. This prefix also clears staging
store responses, not their carts/orders/settings. Never substitute the bare
domain prefix, `hosts`, or `purge_everything` for a staging prefix. Production
root/homepage purges and broad asset scopes need the separately approved scope;
do not assume `/` means homepage-only in prefix matching.

## Release Procedure

1. Read the current repository `AGENTS.md` and confirm the authorized deployment
   and purge scope. Finish the existing guarded payload/origin checks first.
2. Use the MCP `search` tool to retrieve the current endpoint and accepted
   permissions. Read the exact zone through `execute`; validate its name, zone ID
   and account ID before any write. Recheck if the account/zone has changed.
3. Send only the approved body through `execute`, passing the account ID above.
   Do not modify DNS, rules, security, cache configuration or other resources.
4. Require API `success: true`, retaining the requested scope, time and purge
   result ID in the release evidence without credentials. Stop on auth/scope
   errors; do not broaden permissions or purge scope automatically. Respect 429
   retry timing instead of repeatedly submitting requests.
5. Verify normal clean desktop/Android/iPad URLs and current asset hashes after
   the purge. A successful API response is acceptance, not proof that stale
   content was evicted. For cacheable content, inspect fresh responses and repeat
   for warmed HIT responses; retain stale/error evidence. A cache-busting query
   does not establish clean-URL cache correctness.

WP Rocket/origin-cache invalidation remains a separate, existing publisher duty.
Do not replace it with an edge purge. Do not purge anything simply to test access.
No account settings or authentication files were changed. The initial runbook
was documentation-only; the later approved staging purge is recorded above.

Primary reference: [Cloudflare purge API](https://developers.cloudflare.com/api/resources/cache/methods/purge/).
