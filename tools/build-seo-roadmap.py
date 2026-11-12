"""Generate the owner-facing roadmap from explicit ticket status and the full plan."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS = {'in_progress':'In progress / partial staging', 'not_started':'Not started',
          'deferred':'Deferred', 'awaiting_cache':'Deployed on staging; cache checks pending',
          'source_verified':'Verified in repository', 'staging_verified':'Verified on staging', 'live_verified':'Verified live'}


def render(data, plan):
    tickets = {}
    for line in plan.splitlines():
        match = re.match(r'^\| ([MTCDLG]\d{2}) \[[ x]\] \| ([^|]+) \| (.+?) \|',line)
        if match: tickets[match[1]] = {'effort':match[2].strip(),'work':match[3].strip()}
    if data.get('schemaVersion') != 1 or len(tickets) != 40 or set(data['tickets']) != set(tickets):
        raise ValueError('Roadmap must cover exactly the full plan, without missing or invented tickets')
    if any(item['status'] not in LABELS or not item.get('note') for item in data['tickets'].values()):
        raise ValueError('Explicit status and next step required for every ticket')
    if any(item['status'] not in LABELS for item in data['milestones']): raise ValueError('Unknown milestone status')
    counts = Counter(item['status'] for item in data['tickets'].values())
    completed = sum(item['status'] in ('source_verified','staging_verified','live_verified') for item in data['milestones'])
    lines = ['# SEO Roadmap And Progress','',
             'Updated: '+data['updatedOn']+' (Europe/Warsaw). Generated from `tools/seo-roadmap.json`; edit that source, not this page.','',
             '## Where We Are','',
             '**Current work:** '+data['current']+'.','',
             f'**Verified foundation milestones:** {completed}. **New SEO production releases:** 0. The original website migration is a separate completed project, not counted as SEO implementation.','',
             '| Full-Plan Status | Workstreams |','| --- | --- |']
    for status in LABELS:
        if counts[status]: lines.append(f'| {LABELS[status]} | {counts[status]} |')
    lines += ['| Total | 40 |','',
              'These are unequal-sized workstreams, not a time-based percentage. Partial work is not counted as finished. A ticket remains open until its full acceptance criteria, approvals, deployment and applicable verification are complete. Recurring reviews continue after launch.','',
              '## Delivery Milestones','','| Milestone | Status |','| --- | --- |']
    for item in data['milestones']: lines.append(f"| {item['name']} | {LABELS[item['status']]} |")
    lines += ['', '## What Still Needs To Happen','',
              '1. Continue technical staging work: heading hierarchy and broken-link review next, followed by contextual links, structured data, media, accessibility and performance. Public HTML and 76 descriptions have passed final clean/HIT cache checks. Preserve established URLs and commerce.','2. Confirm missing operational facts, refresh useful existing guides and secondary offers, and complete measurement/account investigations.','3. Obtain owner sign-off and separate production approval, use a guarded updater, verify device/cache variants, then inspect and submit approved discovery changes in Search Console.','4. Measure qualified visits and completed bookings over comparable periods; maintain seasonal content, reviews, security and monitoring.','',
              '**Dependencies:** OmniLodge changes require separate approval; Google/Search Console/Business Profile work needs the correct account access; missing offer facts need confirmation; consent work stays deferred. No calendar finish date or ranking uplift is promised.','',
              '## Every Workstream','','Acceptance criteria and research: [full improvement plan](SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md).','',
              '| ID | Priority / Effort | Work | Status | Progress / Next Step |','| --- | --- | --- | --- | --- |']
    for identity,item in data['tickets'].items():
        lines.append(f"| {identity} | {tickets[identity]['effort']} | {tickets[identity]['work']} | {LABELS[item['status']]} | {item['note']} |")
    lines += ['', '## Evidence','',
              '- [Eight-page metadata pilot](staging-metadata-pilot-2026-11-12/README.md).','- [Expanded descriptions: 76 covered, one hold](staging-descriptions-2026-11-12/README.md).','- [Public storefront HTML and progressive handoff](staging-public-html-2026-11-12/README.md).','- [Discovery and staging indexing guard](staging-discovery-2026-11-12/README.md).','- [All 24 catalog decisions and preview expansion](staging-catalog-review-2026-11-12/README.md).','',
              'Production is unchanged by this staging SEO program. GitHub stores reviewed source and runs checks; deployment remains manual.']
    return '\n'.join(lines)+'\n'


if __name__ == '__main__':
    data = json.loads((ROOT / 'tools/seo-roadmap.json').read_text())
    result = render(data,(ROOT / 'docs/seo/SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md').read_text(encoding='utf-8'))
    (ROOT / 'docs/seo/ROADMAP.md').write_text(result,encoding='utf-8')
    print('Updated roadmap: 40 explicit workstreams')
