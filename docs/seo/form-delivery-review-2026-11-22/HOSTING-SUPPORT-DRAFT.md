# Prepared hosting review request - not sent

Destination: KTK’s existing hosting-provider support account for cPanel user `krawlthroughkrak` on `nl1-tr101.supercp.com`. Submit through that authenticated portal, with no guessed support email address. One support message, no attachments. Separate owner approval is pending.

This requests transaction correlation and review only. It does not authorise a Not Spam action, message release/resend, provider configuration or production change. The earlier three-test approval is consumed and does not authorise this new external message.

Subject: **Review two MailChannels rejections for KTK staging form-delivery tests**

## Exact message body

Hello,

Please review two outbound MailChannels rejection records for our hosting account krawlthroughkrak on nl1-tr101.supercp.com (domain krawlthroughkrakow.com).

On 22 November 2026 at 19:52 Europe/Warsaw (18:52 UTC), we made one owner-approved internal test submission each through staging Contact and Jobs. Both forms returned success, but neither verification ID was found in the intended Gmail mailbox, including Spam and Trash. They were clearly labelled internal tests, not customer enquiries or job applications.

cPanel Track Delivery shows these two WordPress-to-Gmail failures in the same minute:

1. Exim ID: 1xVCg3-0000000H7ha-2aQR
   MailChannels transaction: 327e70475367a35a
   Size shown: 1.83 KB
2. Exim ID: 1xVCg7-0000000H7kc-1mHt
   MailChannels transaction: 364e746618d11385
   Size shown: 2.43 KB

Both records show:
Envelope sender: krawlthroughkrak@nl1-tr101.supercp.com
Header sender: wordpress@krawlthroughkrakow.com
Recipient: pubthroughkrakow@gmail.com
Router / transport: send_via_mailchannels / mailchannels_smtp
Delivery host: smtp.mailchannels.net
Response after DATA: 550 5.7.1 [CS] Message blocked

cPanel displays 19:52:19 for the cohort. Our client POST starts were 18:52:36.744 UTC (Contact) and 18:52:41.533 UTC (Jobs). The report does not expose subjects or bodies, so please correlate each transaction with the original message before confirming which form it belongs to. Expected subjects are “[Krawl Through Krakow] Contact | Krawl Through Krakow” and “[Krawl Through Krakow] Pub Crawl Jobs | Krawl Through Krakow”; their internal body IDs are KTK-STAGING-DELIVERY-20261122-CONTACT-01 and KTK-STAGING-DELIVERY-20261122-JOBS-01.

In the same controlled run, Student Trips sent to info@krawlthroughkrakow.com and forwarded to the Gmail INBOX successfully. Its forwarding Exim ID 1xVCgB-0000000H7rB-1SH1 matches the received headers, which report SPF and DKIM pass. That receipt does not establish authentication results for the two blocked messages.

Please identify the block reason and advise whether these are false positives and what narrowly scoped remedy is appropriate. This request authorises review only. Do not release, requeue or resend messages; create a broad sender/domain allowlist; disable filtering; or change production, DNS, SMTP, recipients, forwarding or account settings without a separate owner decision.

Thank you,
KTK website operations
