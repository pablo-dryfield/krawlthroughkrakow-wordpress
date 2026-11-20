# B03 hosting quota evidence review

Local unpublished preparation,19November2026. This adds no website delivery, changes no batch criterion or status, and authorizes no hosted recovery transaction.

The retained authenticated FTPS capability read at23:46UTC18November identifies Pure-FTPd and advertises no account-quota query through FEAT/HELP/SITE HELP. That is a dated observation, not proof that every installed extension is absent. No new hosting connection or credential load was made for this documentation review.

Upstream documentation distinguishes FTP virtual limits from system quotas, including different limits for accounts sharing a UID. Its `.ftpquota` file records usage rather than the configured maximum. Thus even an FTP quota figure would not, by itself, establish the account capacity available to PHP. This is an inference from the documented architecture, not a measurement of the installed daemon or hosting configuration. [Official Pure-FTPd documentation](https://github.com/jedisct1/pure-ftpd/blob/master/README).

The reviewed upstream quota implementation can open/create bookkeeping during quota display. It is not evidence of such a change on this host. No quota utility, repair operation, speculative command or extra login was attempted. [Quota implementation](https://github.com/jedisct1/pure-ftpd/blob/master/src/quotas.c), [login/display integration](https://github.com/jedisct1/pure-ftpd/blob/master/src/ftpd.c).

The remaining H06 facts stay unchanged:

| Required evidence | Current position |
|---|---|
| Actual hosting-account allocation, current use and usable headroom | Not supplied by the available FTPS capability evidence. Local Windows free space does not supply it. |
| The PHP filesystem actor, its effective permissions and the limits governing its writes | Not established by FTP access, file readability or an assumed shared UID. |
| An exclusive private-recovery rehearsal window | No B03-specific window is recorded in the reviewed evidence. The resolved B04 public-asset window is separate. |
| Retention of private originals, signed metadata and operation markers | The B03 policy remains unresolved; no expiry or cleanup authority is inferred. |

The next useful evidence is from the hosting account owner/provider, covering both account capacity and the actual PHP writer. The existing original B03 gates and helper/runtime limits remain. This review does not replace the mandatory guarded hosted rehearsal, accept the earlier failed attempt, replay consumed authority, or add a new full-fixture gate.

B04's temporary pilots are cleaned and its durable two-staging-path SVG rule remains verified. PR133 is merged at the reviewed tree; its separate automatic main CI44627704145 is independently accepted. This resolves B04 source closure, without supplying the distinct B03 hosting facts. Production, commerce/Ecwid, forms and real messages/orders/payments, functional consent, OmniLodge and the native Windows automation stop remain preserved.
