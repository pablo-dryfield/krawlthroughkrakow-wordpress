"""Generate the owner-facing roadmap from explicit ticket status and the full plan."""
import base64
import hashlib
import html
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

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
DELIVERY_LABELS = {'staging_verified': 'Verified on staging', 'in_progress': 'In progress', 'live_verified': 'Verified live'}
BATCH_LABELS = {'verification': 'In verification', 'planned': 'Planned', 'complete': 'Complete'}


def remaining_model(data):
    work = data.get('remainingWork')
    if not isinstance(work, dict) or set(work) != {'revision', 'scope', 'changeRule', 'batches', 'gates', 'recurring', 'deferred'}:
        raise ValueError('Explicit remaining-work inventory required')
    if type(work['revision']) is not int or work['revision'] < 1:
        raise ValueError('Remaining-work revision required')
    for key in ('scope', 'changeRule'):
        if not isinstance(work[key], str) or not work[key].strip():
            raise ValueError('Remaining-work scope and change rule required')
    seen, covered = set(), set()
    for group, prefix in (('batches', 'B'), ('gates', 'H'), ('recurring', 'R'), ('deferred', 'X')):
        if not isinstance(work[group], list):
            raise ValueError('Remaining-work groups must be explicit lists')
        for row in work[group]:
            required = {'id', 'title', 'workstreams', 'next'}
            required |= {'status', 'summary', 'doneWhen', 'dependsOn', 'blockedBy'} if group == 'batches' else {'owner'}
            if group == 'gates': required.add('status')
            allowed = required | ({'evidence', 'verifiedOn'} if group == 'batches' else set())
            if not isinstance(row, dict) or not required <= row.keys() or row.keys() - allowed:
                raise ValueError('Complete remaining-work fields required; unknown fields rejected')
            if not isinstance(row['id'], str) or not re.fullmatch(prefix + r'\d{2}', row['id']) or row['id'] in seen:
                raise ValueError('Unique remaining-work identity required')
            seen.add(row['id'])
            for key in required - {'workstreams', 'dependsOn', 'blockedBy'}:
                if not isinstance(row[key], str) or not row[key].strip():
                    raise ValueError('Readable remaining-work fields required')
            ids = row['workstreams']
            if not isinstance(ids, list) or not ids or any(not isinstance(i, str) or i not in data['tickets'] for i in ids) or len(set(ids)) != len(ids):
                raise ValueError('Remaining work must reference existing distinct workstreams')
            if group != 'batches' or row['status'] != 'complete': covered.update(ids)
            if group == 'gates' and row['status'] != 'waiting':
                raise ValueError('Unresolved gate must remain waiting')
            if group == 'deferred' and any(data['tickets'][i]['status'] != 'deferred' for i in ids):
                raise ValueError('Deferred inventory must match explicit ticket deferrals')
            if group == 'batches':
                if row['status'] not in BATCH_LABELS:
                    raise ValueError('Explicit batch status required')
                if 'evidence' in row:
                    url = urlsplit(row['evidence'])
                    if url.scheme != 'https' or not url.hostname or url.username or url.password or any(c.isspace() for c in row['evidence']):
                        raise ValueError('Batch evidence must be a safe HTTPS reference')
                if row['status'] == 'complete':
                    if not row.get('evidence') or date.fromisoformat(row.get('verifiedOn', '')) > date.fromisoformat(data['updatedOn']):
                        raise ValueError('Completed batch requires dated evidence')
                elif 'verifiedOn' in row:
                    raise ValueError('Unfinished batch cannot have a verification date')
    batches = {row['id']: row for row in work['batches']}
    gates = {row['id'] for row in work['gates']}
    for row in batches.values():
        for key, valid in (('dependsOn', set(batches) - {row['id']}), ('blockedBy', gates)):
            refs = row[key]
            if not isinstance(refs, list) or any(not isinstance(i, str) or i not in valid for i in refs) or len(set(refs)) != len(refs):
                raise ValueError('Invalid batch dependency')
    def visit(identity, trail):
        if identity in trail: raise ValueError('Cyclic batch dependency')
        for dependency in batches[identity]['dependsOn']: visit(dependency, trail | {identity})
    for identity in batches: visit(identity, set())
    open_ids = {i for i, row in data['tickets'].items() if row['status'] != 'live_verified'}
    if not open_ids <= covered:
        raise ValueError('Every open workstream needs a remaining batch, gate, recurring responsibility or deferral')
    counts = {status: sum(row['status'] == status for row in batches.values()) for status in BATCH_LABELS}
    return {**work, 'counts': counts, 'remaining': counts['verification'] + counts['planned']}


def remaining_markdown(work):
    lines = ['## Remaining Implementation Batches', '',
             f"**{work['remaining']} batches remain: {work['counts']['verification']} in verification and {work['counts']['planned']} planned.**", '',
             work['scope'], '', work['changeRule'], '',
             '| Batch | Status | Scope | Done When | Dependencies |', '| --- | --- | --- | --- | --- |']
    for row in work['batches']:
        title = f"{row['id']} — {row['title']}"
        if row.get('evidence'): title = f"[{title}]({row['evidence']})"
        lines.append(f"| {title} | {BATCH_LABELS[row['status']]} | {row['summary']} Next: {row['next']} | {row['doneWhen']} | {', '.join(row['dependsOn'] + row['blockedBy']) or 'None'} |")
    for group, title in (('gates', 'Owner, Account And Manual Gates'), ('recurring', 'Recurring Responsibilities'), ('deferred', 'Explicit Deferrals')):
        lines += ['', '### ' + title, '', '| Item | Owner | What Remains |', '| --- | --- | --- |']
        for row in work[group]: lines.append(f"| {row['id']} — {row['title']} | {row['owner']} | {row['next']} |")
    return lines + ['']


def remaining_html(work, prefix=''):
    esc = html.escape
    section_id = prefix + 'remaining-batches'
    result = f'<section class="remaining-progress" id="{section_id}" aria-labelledby="{section_id}-title"><div class="remaining-heading"><div><h2 id="{section_id}-title">Remaining implementation batches</h2><p>{esc(work["scope"])}</p></div><div class="remaining-total"><strong data-remaining-count>{work["remaining"]}</strong><span>batches remaining</span></div></div>'
    result += f'<p class="batch-counts">{work["counts"]["verification"]} in verification · {work["counts"]["planned"]} planned</p><p class="batch-rule">{esc(work["changeRule"])}</p><ol class="remaining-list">'
    for row in work['batches']:
        result += f'<li class="remaining-row" data-planned-batch="{row["id"]}"><div class="batch-line"><span class="batch-number">{row["id"]}</span><h3>{esc(row["title"])}</h3><span class="batch-status {row["status"]}">{BATCH_LABELS[row["status"]]}</span></div><p class="batch-summary">{esc(row["summary"])}</p><details class="batch-details"><summary>Next step and completion criteria<span class="sr-only"> for {esc(row["id"])}</span></summary><p><strong>Next:</strong> {esc(row["next"])}</p><p><strong>Done when:</strong> {esc(row["doneWhen"])}</p>'
        result += '<p><strong>Related workstreams:</strong> ' + esc(', '.join(row['workstreams'])) + '</p>'
        result += '<p><strong>Dependencies:</strong> ' + esc(', '.join(row['dependsOn'] + row['blockedBy']) or 'None') + '</p>'
        if row.get('evidence'): result += '<p><a href="' + esc(row['evidence'], quote=True) + '">Review evidence for ' + row['id'] + '</a></p>'
        if row.get('verifiedOn'): result += '<p>Verified: ' + esc(row['verifiedOn']) + '</p>'
        result += '</details></li>'
    result += '</ol><div class="remaining-boundaries"><p>Dependencies may limit part of a batch. Feasible staging work continues while those answers are pending.</p>'
    for group, title, explanation in (
        ('gates', 'Owner, account and manual gates', 'Separate from the implementation count; these need external evidence, decisions or human checks.'),
        ('recurring', 'Recurring responsibilities', 'Ongoing after the finite implementation batches.'),
        ('deferred', 'Explicit deferrals', 'Preserved boundaries; excluded from the implementation count.')):
        result += f'<details class="dependency-group" data-remaining-group="{group}"><summary>{title} <span>({len(work[group])})</span></summary><p>{explanation}</p><ul>'
        for row in work[group]:
            result += f'<li data-remaining-item="{row["id"]}"><h3>{row["id"]} — {esc(row["title"])}</h3><p><strong>Owner:</strong> {esc(row["owner"])}</p><p>{esc(row["next"])}</p><p class="muted">Related workstreams: {esc(", ".join(row["workstreams"]))}</p></li>'
        result += '</ul></details>'
    return result + '</div></section>'


def delivery_model(data):
    rows = data.get('deliveries')
    if not isinstance(rows, list) or not rows:
        raise ValueError('Explicit evidence-backed deliveries required')
    updated = date.fromisoformat(data['updatedOn'])
    result, seen = [], set()
    required = {'id', 'title', 'workstreams', 'stage', 'environment', 'summary', 'remaining', 'evidence'}
    for row in rows:
        if not isinstance(row, dict) or not required <= row.keys() or row.keys() - (required | {'verifiedOn'}):
            raise ValueError('Complete delivery fields required; unknown fields rejected')
        if not isinstance(row['id'], str) or not re.fullmatch(r'[a-z][a-z0-9-]+', row['id']) or row['id'] in seen:
            raise ValueError('Unique delivery identity required')
        seen.add(row['id'])
        if row['stage'] not in DELIVERY_LABELS or row['environment'] not in ('website', 'omnilodge'):
            raise ValueError('Explicit delivery stage and environment required')
        if any(not isinstance(row[key], str) or not row[key].strip() for key in ('title', 'summary', 'remaining', 'evidence')):
            raise ValueError('Readable delivery scope, remaining work and evidence required')
        ids = row['workstreams']
        if not isinstance(ids, list) or not ids or any(not isinstance(identity, str) or identity not in data['tickets'] for identity in ids) or len(set(ids)) != len(ids):
            raise ValueError('Delivery must reference existing distinct workstreams')
        target = (ROOT / 'docs/seo' / row['evidence']).resolve()
        if not row['evidence'].endswith('.md') or (ROOT / 'docs/seo').resolve() not in target.parents or not target.is_file():
            raise ValueError('Existing local delivery evidence required')
        if row['stage'] == 'in_progress':
            if 'verifiedOn' in row:
                raise ValueError('Unfinished delivery cannot have a verification date')
        else:
            verified = date.fromisoformat(row.get('verifiedOn', ''))
            if verified > updated:
                raise ValueError('Future delivery verification is not evidence')
        if row['stage'] == 'staging_verified' and row['environment'] != 'website':
            raise ValueError('Website staging and OmniLodge live evidence are separate')
        if row['stage'] == 'live_verified' and row['environment'] == 'website' and data.get('websiteProductionReleases', 0) < 1:
            raise ValueError('Website live delivery requires a recorded production release')
        result.append({**row, 'stageLabel': DELIVERY_LABELS[row['stage']]})
    return {'items': result, 'counts': {stage: sum(row['stage'] == stage for row in result) for stage in DELIVERY_LABELS}}


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
    remaining = remaining_model(data)
    counts = Counter(item['status'] for item in data['tickets'].values())
    deliveries = delivery_model(data)
    completed = sum(item['status'] in ('source_verified','staging_verified','live_verified') for item in data['milestones'])
    lines = ['# SEO Roadmap And Progress','',
             'Updated: '+data['updatedOn']+' (Europe/Warsaw). Generated from `tools/seo-roadmap.json`; edit that source, not this page.','',
             '**Visual dashboard:** [Open ROADMAP.html](ROADMAP.html). The HTML and this Markdown view use the same maintained source.','',
             '## Where We Are','',
             '**Current work:** '+data['current']+'.','',
             f'**Verified foundation milestones:** {completed}. **Website production releases in this plan:** {releases}. Read each delivery scope: an isolated functional hotfix does not promote the staged SEO batches. The original website migration is a separate completed project. Separately authorized OmniLodge reporting has its own release status.','',
             *remaining_markdown(remaining),
             '## Delivery Progress', '',
             'These are scoped batches, not completed whole workstreams. A verified staging batch can still need owner review and production approval. OmniLodge live delivery is separate from website production.', '',
             '| Delivery Stage | Batches |', '| --- | ---: |']
    for stage, count in deliveries['counts'].items():
        lines.append(f'| {DELIVERY_LABELS[stage]} | {count} |')
    lines += ['', '| Batch | Related Work | Stage | Verified | What Remains |', '| --- | --- | --- | --- | --- |']
    for row in deliveries['items']:
        lines.append(f"| [{row['title']}]({row['evidence']}) | {', '.join(row['workstreams'])} | {row['stageLabel']} ({row['environment']}) | {row.get('verifiedOn', 'Not yet')} | {row['remaining']} |")
    lines += ['', '## End-to-End Plan Status', '', '| Full-Plan Status | Workstreams |','| --- | --- |']
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
              ('The production website is unchanged by this staging SEO program. ' if releases == 0 else 'Only separately approved website release scopes are live; this does not promote the remaining staged SEO batches. ') + 'GitHub stores reviewed source and runs checks; website deployment remains manual.']
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
            'deliveries': delivery_model(data), 'remainingWork': remaining_model(data),
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
    fallback = remaining_html(model['remainingWork'], 'fallback-') + '<h2>Delivery progress</h2><p>Scoped batches, not completed whole workstreams. Staging and live delivery remain separate.</p><ul class="delivery-fallback">'
    for row in model['deliveries']['items']:
        fallback += '<li><strong>' + html.escape(row['title']) + '</strong>: ' + html.escape(row['stageLabel'] + ' / ' + row['environment']) + '<p>' + html.escape(row['summary']) + '</p><p>Next: ' + html.escape(row['remaining']) + '</p><a href="' + html.escape(row['evidence'], quote=True) + '">Evidence</a></li>'
    fallback += '</ul><table><caption>All 40 workstreams</caption><thead><tr><th>ID</th><th>Work</th><th>Status</th><th>Remaining</th></tr></thead><tbody>'
    for row in model['tickets']:
        fallback += '<tr>' + ''.join('<td>' + html.escape(row[key]) + '</td>' for key in ('id', 'title', 'statusLabel', 'remaining')) + '</tr>'
    fallback += '</tbody></table>'
    replacements = {'__KTK_MODEL__': json.dumps(model, ensure_ascii=True).replace('<', '\\u003c'),
                    '__KTK_ICONS__': icon_sprite(), '__KTK_LOGO__': 'data:image/webp;base64,' + logo,
                    '__KTK_FALLBACK__': fallback, '__KTK_REMAINING__': remaining_html(model['remainingWork']), '__KTK_LICENSE__': license_text.replace('--', '- -'),
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
