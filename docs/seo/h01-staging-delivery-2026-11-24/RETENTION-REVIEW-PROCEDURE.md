# Practical retention review procedure

Prepared 24 November 2026 for the KTK team. This supplies an operational procedure for adoption and implementation. No first completed team review, deletion capability or automatic expiry is claimed. It does not authorise deletion of actual enquiries, mailbox messages, backups, transaction records or retained recovery evidence.

## Ownership and review points

The KTK team already monitors `pubthroughkrakow@gmail.com`; use that team as the contact for privacy and retention reviews. Review a record when the request/recruitment/competition purpose ends and include unresolved records in a monthly review. This is the proposed working cadence, not evidence that the team has already performed it.

| Record group | Review trigger | Decision to record |
| --- | --- | --- |
| Active service enquiries | Request resolved, withdrawn or no longer being pursued | Whether further handling is needed; close the handling task separately from the retention decision |
| Closed enquiries without bookings | Closure and the monthly review | Remove unnecessary personal details when there is no continuing justified purpose; otherwise record the particular purpose and next review date |
| Enquiries linked to bookings or disputes | Enquiry closure, transaction/dispute milestones | Which specific records are needed for an actual obligation or assessed claim purpose, and the applicable retention/review limit; do not preserve the entire conversation automatically |
| Recruitment applications | Relevant recruitment ends | Necessary retained scope/basis and review limit; future recruitment needs its own justified arrangement, not newsletter enrolment |
| Competition entries | Monthly judging and prize administration finish | Treatment of unsuccessful entries, necessary winner/prize records and any separately permitted publication; do not silently apply new restrictions to earlier entries |
| Privacy requests | Request resolved and any justified response record retained | What evidence of handling is necessary, any applicable exception and the next review/expiry decision |

There is no universal fixed period adopted for all groups. “Keep indefinitely” is not the review outcome unless a continuing, specific basis actually justifies the necessary scope; convenience or an unexamined possibility of later use does not supply one. The Commission explains purpose-based necessity and erasure/review limits. [Storage limitation](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en).

## Record a review without copying message bodies

For each reviewed item record its internal ID/reference, record group, whether its purpose has ended, any actual obligation/claim reason, the necessary retained fields, decision, responsible reviewer and next review/expiry date. Use minimal notes; do not duplicate the original message, identity document or unrelated sensitive details in a review spreadsheet.

An unanswered enquiry is not automatically a continuing purpose forever. A Closed status records handling state and currently leaves the saved contents/notification intact. A general claims label must not be used to keep every record without assessment. Applicable statutory periods and employment/claim questions still need the actual legal and operational facts; this procedure invents none.

## Coordinate systems before an authorised removal

1. Identify the relevant OmniLodge enquiry, immutable notification snapshot, delivery reference, notes and audit history; identify the corresponding Gmail copy and any genuine exports. Do not assume deleting one removes the others.
2. Check necessary obligations or active claims and limit any hold to the relevant data. Handle identity verification proportionately when responding to a person's request.
3. Prepare the exact affected-record scope and technical method for review. Existing immutable-record/rollback guards must not be bypassed by ad hoc SQL or mailbox bulk actions. A proper removal/anonymisation facility is a separate implementation where needed.
4. Cover backups and restoration handling. Current Drive storage/schedule settings do not establish expiry. Define how removed data remains out of normal use and how it is handled if a backup is later restored before claiming this works.
5. Record completion and any justified exception after verification. Do not record a request as completed merely because the enquiry was closed or one email copy was removed.

The remaining technical dependency is a reviewed cross-system disposal method, including immutable records and backups. No such deletion was run in this content batch. The separately retained B03 originals, signed metadata, operation markers and recovery evidence remain under their explicit owner-review/cleanup boundary.
