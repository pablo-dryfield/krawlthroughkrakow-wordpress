"""Generate the owner-facing roadmap from explicit ticket status and the full plan."""
import base64
import hashlib
import html
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS = {'in_progress':'In progress / partial staging', 'not_started':'Not started',
          'deferred':'Deferred', 'awaiting_cache':'Deployed on staging; cache checks pending',
          'source_verified':'Verified in repository', 'staging_verified':'Verified on staging', 'live_verified':'Verified live'}
GROUPS = {'M': ('Measurement', 'chart-no-axes-combined'), 'T': ('Technical SEO', 'globe'),
          'C': ('Content & offers', 'book-open'), 'D': ('Website experience', 'accessibility'),
          'L': ('Local visibility', 'globe'), 'G': ('Governance & release', 'shield-check')}
BUCKETS = {'live_verified': 'complete', 'not_started': 'not_started', 'deferred': 'deferred',
           'in_progress': 'in_progress', 'awaiting_cache': 'in_progress',
           'source_verified': 'in_progress', 'staging_verified': 'in_progress'}


def parse_plan(plan):
    tickets = {}
    for line in plan.splitlines():
        match = re.fullmatch(r'\| ([MTCDLG]\d{2}) \[([ x])\] \| ([^|]+) \| (.+?) \| (.+?) \|', line)
        if match:
            identity = match[1]
            if identity in tickets:
                raise ValueError('Duplicate plan workstream: ' + identity)
            tickets[identity] = {'effort': match[3].strip(), 'work': match[4].strip(), 'acceptance': match[5].strip()}
    return tickets


def render(data, plan):
    tickets = parse_plan(plan)
    if data.get('schemaVersion') != 1 or len(tickets) != 40 or set(data['tickets']) != set(tickets):
        raise ValueError('Roadmap must cover exactly the full plan, without missing or invented tickets')
    if any(item['status'] not in LABELS or not item.get('note') for item in data['tickets'].values()):
        raise ValueError('Explicit status and next step required for every ticket')
    if any(item['status'] not in LABELS for item in data['milestones']): raise ValueError('Unknown milestone status')
    releases = data.get('websiteProductionReleases', 0)
    if type(releases) is not int or releases < 0:
        raise ValueError('Website production release count must be a nonnegative integer')
    counts = Counter(item['status'] for item in data['tickets'].values())
    completed = sum(item['status'] in ('source_verified','staging_verified','live_verified') for item in data['milestones'])
    lines = ['# SEO Roadmap And Progress','',
             'Updated: '+data['updatedOn']+' (Europe/Warsaw). Generated from `tools/seo-roadmap.json`; edit that source, not this page.','',
             '**Visual dashboard:** [Open ROADMAP.html](ROADMAP.html). The HTML and this Markdown view use the same maintained source.','',
             '## Where We Are','',
             '**Current work:** '+data['current']+'.','',
             f'**Verified foundation milestones:** {completed}. **Website SEO production releases:** {releases}. The original website migration is a separate completed project, not counted as SEO implementation. Separately authorized OmniLodge reporting has its own release status.','',
             '| Full-Plan Status | Workstreams |','| --- | --- |']
    for status in LABELS:
        if counts[status]: lines.append(f'| {LABELS[status]} | {counts[status]} |')
    lines += ['| Total | 40 |','',
              'These are unequal-sized workstreams, not a time-based percentage. Partial work is not counted as finished. A ticket remains open until its full acceptance criteria, approvals, deployment and applicable verification are complete. Recurring reviews continue after launch.','',
              '## Delivery Milestones','','| Milestone | Status |','| --- | --- |']
    for item in data['milestones']: lines.append(f"| {item['name']} | {LABELS[item['status']]} |")
    lines += ['', '## What Still Needs To Happen','',
              '1. Continue technical staging work: contextual links, structured data, media, accessibility and performance. Heading hierarchy, reviewed aliases, public HTML and76 descriptions have passed cached staging checks. Preserve established URLs and commerce.','2. Confirm missing operational facts, refresh useful existing guides and secondary offers, and complete measurement/account investigations.','3. Obtain owner sign-off and separate production approval, use a guarded updater, verify device/cache variants, then inspect and submit approved discovery changes in Search Console.','4. Measure qualified visits and completed bookings over comparable periods; maintain seasonal content, reviews, security and monitoring.','',
              '**Dependencies:** OmniLodge M01 reporting implementation/deployment is approved; additional OmniLodge work requires separate approval. Google/Search Console/Business Profile work needs the correct account access; missing offer facts need confirmation; consent work stays deferred. No calendar finish date or ranking uplift is promised.','',
              '## Every Workstream','','Acceptance criteria and research: [full improvement plan](SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md).','',
              '| ID | Priority / Effort | Work | Status | Progress / Next Step |','| --- | --- | --- | --- | --- |']
    for identity,item in data['tickets'].items():
        lines.append(f"| {identity} | {tickets[identity]['effort']} | {tickets[identity]['work']} | {LABELS[item['status']]} | {item['note']} |")
    lines += ['', '## Evidence','',
              '- [Dated search baseline and query/device/market coverage](search-baseline-2026-11-12/README.md).','- [Stored Google indexing inspections and limitations](indexing-review-2026-11-13/README.md).','- [All 56 article triage decisions](article-triage-2026-11-13/README.md).',
              '- [Eight-page metadata pilot](staging-metadata-pilot-2026-11-12/README.md).','- [Expanded descriptions: 76 covered, one hold](staging-descriptions-2026-11-12/README.md).','- [Public storefront HTML and progressive handoff](staging-public-html-2026-11-12/README.md).','- [Discovery and staging indexing guard](staging-discovery-2026-11-12/README.md).','- [All 24 catalog decisions and preview expansion](staging-catalog-review-2026-11-12/README.md).','- [Heading hierarchy and reviewed links](staging-headings-links-2026-11-12/README.md).','- [Structured data and original-content guards](staging-schema-2026-11-12/README.md).','- [Performance measurements and photo loading](staging-performance-2026-11-12/README.md).','- [OmniLodge reporting delivery and real-account checks](omnilodge-reporting-2026-11-12/README.md).','',
              ('The production website is unchanged by this staging SEO program. ' if releases == 0 else 'Website SEO production releases are recorded separately from OmniLodge reporting. ') + 'GitHub stores reviewed source and runs checks; website deployment remains manual.']
    return '\n'.join(lines)+'\n'


def build_model(data, plan):
    render(data, plan)
    plan_tickets = parse_plan(plan)
    view = data.get('view', {})
    if set(view.get('tickets', {})) != set(data['tickets']):
        raise ValueError('Visual titles and remaining work must cover all 40 workstreams')
    if not view.get('summary') or len(view.get('milestoneTitles', [])) != len(data['milestones']) or any(not title.strip() for title in view.get('milestoneTitles', [])):
        raise ValueError('Visual summary and every milestone title are required')
    if len(set(view.get('focus', []))) != len(view.get('focus', [])):
        raise ValueError('Duplicate focus workstream')
    for identity in view.get('focus', []):
        if identity not in data['tickets'] or BUCKETS[data['tickets'][identity]['status']] != 'in_progress':
            raise ValueError('Focus must reference existing active work, not completed/deferred tasks')
    for identity, reference in view.get('evidence', {}).items():
        target = (ROOT / 'docs/seo' / reference).resolve()
        if identity not in data['tickets'] or ROOT not in target.parents or target.suffix != '.md' or not target.is_file():
            raise ValueError('Invalid evidence reference')
    tickets = []
    for identity, state in data['tickets'].items():
        display = view['tickets'][identity]
        if not display.get('title', '').strip() or not display.get('remaining', '').strip():
            raise ValueError('Readable title and remaining work required')
        priority, effort = plan_tickets[identity]['effort'].split(' / ', 1)
        tickets.append({'id': identity, 'group': identity[0], 'title': display['title'],
                        'remaining': display['remaining'], 'priority': priority, 'effort': effort,
                        'status': state['status'], 'bucket': BUCKETS[state['status']], 'statusLabel': LABELS[state['status']],
                        'note': state['note'], 'work': plan_tickets[identity]['work'],
                        'acceptance': plan_tickets[identity]['acceptance'], 'evidence': view.get('evidence', {}).get(identity)})
    counts = {key: sum(row['bucket'] == key for row in tickets) for key in ('complete', 'in_progress', 'not_started', 'deferred')}
    milestones = [{'title': title, **state} for title, state in zip(view['milestoneTitles'], data['milestones'])]
    return {'updatedOn': data['updatedOn'], 'summary': view['summary'], 'current': data['current'],
            'tickets': tickets, 'milestones': milestones, 'counts': counts, 'total': len(tickets),
            'verifiedMilestones': sum(row['status'] in ('source_verified', 'staging_verified', 'live_verified') for row in milestones),
            'websiteProductionReleases': data.get('websiteProductionReleases', 0), 'focus': view['focus'],
            'groups': [{'id': key, 'name': name, 'icon': icon} for key, (name, icon) in GROUPS.items()],
            'sourceSha256': hashlib.sha256((json.dumps(data, sort_keys=True) + plan).encode()).hexdigest()}


def icon_sprite():
    symbols = []
    for file in sorted((ROOT / 'tools/seo-roadmap-assets/lucide').glob('*.svg')):
        root = ET.fromstring(file.read_text(encoding='utf-8'))
        for node in root.iter():
            node.tag = node.tag.rsplit('}', 1)[-1]
        children = ''.join(ET.tostring(child, encoding='unicode') for child in root)
        symbols.append('<symbol id="icon-' + file.stem + '" viewBox="0 0 24 24">' + children + '</symbol>')
    if len(symbols) != 17:
        raise ValueError('Expected exact vendored Lucide icon set')
    return '<svg class="svg-defs" aria-hidden="true"><defs>' + ''.join(symbols) + '</defs></svg>'


def render_html(data, plan):
    model = build_model(data, plan)
    template = (ROOT / 'tools/seo-roadmap-view.html').read_text(encoding='utf-8')
    logo = base64.b64encode((ROOT / 'staging/wp-content/mu-plugins/ktk-homepage-assets/logo.webp').read_bytes()).decode()
    license_text = (ROOT / 'tools/seo-roadmap-assets/lucide/LICENSE').read_text(encoding='utf-8')
    fallback = '<table><caption>All 40 workstreams</caption><thead><tr><th>ID</th><th>Work</th><th>Status</th><th>Remaining</th></tr></thead><tbody>'
    for row in model['tickets']:
        fallback += '<tr>' + ''.join('<td>' + html.escape(row[key]) + '</td>' for key in ('id', 'title', 'statusLabel', 'remaining')) + '</tr>'
    fallback += '</tbody></table>'
    replacements = {'__KTK_MODEL__': json.dumps(model, ensure_ascii=True).replace('<', '\\u003c'),
                    '__KTK_ICONS__': icon_sprite(), '__KTK_LOGO__': 'data:image/webp;base64,' + logo,
                    '__KTK_FALLBACK__': fallback, '__KTK_LICENSE__': license_text.replace('--', '- -'),
                    '__KTK_UPDATED__': html.escape(data['updatedOn'])}
    for marker, value in replacements.items():
        if template.count(marker) != 1:
            raise ValueError('Missing or repeated template marker: ' + marker)
        template = template.replace(marker, value)
    return template


if __name__ == '__main__':
    data = json.loads((ROOT / 'tools/seo-roadmap.json').read_text())
    plan = (ROOT / 'docs/seo/SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md').read_text(encoding='utf-8')
    result = render(data, plan)
    document = render_html(data, plan)
    (ROOT / 'docs/seo/ROADMAP.md').write_text(result,encoding='utf-8')
    (ROOT / 'docs/seo/ROADMAP.html').write_text(document, encoding='utf-8')
    print('Updated Markdown and offline HTML roadmap: 40 explicit workstreams')
