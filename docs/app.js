/* Launch Engine Intake. All form fields are optional; records live in the public repository. */
const API = 'https://launch-engine-intake.msheerin01.workers.dev';
const REPO = 'https://github.com/michaelsheerin/launch-engine-intake';
const app = document.querySelector('#app');
const authButton = document.querySelector('#auth-button');

const REASONS = [
  'Transformation or innovation', 'Growth or support for a new business',
  'Data center exit or CSP contract expiration', 'License or support contract expiration',
  'Merger or acquisition', 'Other'
];
const GOALS = {
  'General goals': ['Transformation or modernization', 'Business growth or new markets', 'Access to OCI cloud services', 'Lower cost'],
  'Business value': ['Improved business agility', 'Operational resiliency', 'Faster time to market'],
  'Financial improvements': ['Consumption-based spending', 'Cost transparency and control', 'Lower license and vendor support fees', 'Lower facilities and hardware cost'],
  'Technical improvements': ['Service flexibility and infrastructure elasticity', 'High availability and disaster recovery', 'Security and compliance']
};
const CONCERNS = [
  'Technical debt in legacy systems', 'Technical debt in source infrastructure or another CSP',
  'Complexity of the source workload', 'Compliance, regulatory, or data sovereignty requirements',
  'Operational or manageability concerns', 'Security or data privacy',
  'Data loss or service availability', 'Performance', 'Other'
];
const ASSESSMENT = [
  ['applications', 'Applications, servers, VMs, and containers'],
  ['data', 'Database, storage, and data integration'],
  ['network', 'Network topology'],
  ['security', 'Security topology'],
  ['resilience', 'HA, DR, backup, SLAs, RTO, and RPO']
];
const READINESS = [
  ['tenancy', 'Tenancy model, compartments, naming, tagging, cost ownership'],
  ['iam', 'IAM, MFA, SSO or federation, break-glass access'],
  ['network', 'VCN, subnets, DRG, gateways, DNS, FastConnect or VPN'],
  ['security', 'WAF, firewall, NSGs, Cloud Guard, Security Zones, Vault'],
  ['observability', 'Logging, SIEM, monitoring, alerts, on-call routing'],
  ['operations', 'Backup, restore, DR, change/release, incident, data governance'],
  ['capacity', 'Capacity, quotas, service limits, budgets, cost alerts']
];
const ARTIFACTS = [
  ['charter', 'Program charter, scope, success measures, stakeholder roster'],
  ['governance', 'RACI, meeting cadence, escalation matrix, decision log'],
  ['currentArchitecture', 'Current architecture, network diagram, discovery inventory'],
  ['targetArchitecture', 'Target architecture, landing zone, IAM, security, DR design'],
  ['sizing', 'Sizing, capacity, quota, and cost ownership inputs'],
  ['migration', 'Migration wave plan, runbooks, test, UAT, rollback plans'],
  ['pursuit', 'Pursuit artifacts, customer approvals, discovery assumptions']
];
const SERVICE_CATEGORIES = ['Compute', 'Block Storage', 'Object Storage', 'Database', 'Networking', 'Identity and Security', 'Observability', 'Other'];
const DISPOSITIONS = ['Rehost', 'Replatform', 'Refactor', 'Retain', 'Retire', 'Repurchase'];
const CALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CALL_TIMES = Array.from({length:29},(_,i)=>{const hour=6+Math.floor(i/2);const minute=i%2?'30':'00';return `${hour>12?hour-12:hour}:${minute} ${hour<12?'AM':'PM'}`;});
const CALL_TIME_ZONES = ['UTC','Eastern (ET)','Central (CT)','Mountain (MT)','Pacific (PT)','Alaska (AKT)','Hawaii (HT)','Other'];

let draft = null;
let editingId = null;
let auth = sessionStorage.getItem('launchSession') || '';

function blankEntry() {
  return {
    schemaVersion: 1,
    profile: {}, summaryMarkdown: '', stakeholders: [], meetings: [],
    reasons: {}, reasonOtherMarkdown: '', goals: {}, goalOtherMarkdown: '', successMeasures: [], workloads: [], exclusions: [],
    concerns: {}, blockers: [],
    assessment: {}, readiness: {}, raid: [], artifacts: {}
  };
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function getPath(object, path) {
  return path.split('.').reduce((value, key) => value == null ? undefined : value[key], object);
}
function setPath(object, path, value) {
  const keys = path.split('.'); let current = object;
  keys.slice(0, -1).forEach((key, i) => {
    if (current[key] == null) current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    current = current[key];
  });
  current[keys.at(-1)] = value;
}
function field(path, label, {type='text', options=[], full=false, hint='', placeholder='', selectPrompt='Select, if known', revealOnYes=false}={}) {
  const id = `f-${path.replace(/[^a-z0-9]/gi, '-')}`;
  const value = getPath(draft, path) ?? '';
  let control = '';
  if (type === 'select') {
    const otherPath = `${path}Other`;
    const otherValue = getPath(draft, otherPath) ?? '';
    control = `<select id="${id}" data-path="${esc(path)}" ${options.includes('Other') ? `data-other-path="${esc(otherPath)}"` : ''} ${revealOnYes ? 'data-reveal-on-yes="true"' : ''}><option value="">${esc(selectPrompt)}</option>${options.map(option => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
    if (options.includes('Other')) control += `<div class="other-detail" data-other-for="${esc(path)}" ${value === 'Other' ? '' : 'hidden'}><label for="${id}-other">${esc(label)} Details</label><input id="${id}-other" data-path="${esc(otherPath)}" type="text" value="${esc(otherValue)}" placeholder="Add details"></div>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${id}" data-path="${esc(path)}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  } else {
    control = `<input id="${id}" data-path="${esc(path)}" type="${esc(type)}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  }
  return `<div class="field ${full ? 'full' : ''}"><label for="${id}">${esc(label)}</label>${control}${hint ? `<p class="hint">${esc(hint)}</p>` : ''}</div>`;
}
function grid(items, third=false) { return `<div class="grid ${third ? 'thirds' : ''}">${items.join('')}</div>`; }
function section(id, title, content, description='', open=false) {
  return `<details class="section" data-section="${id}" ${open ? 'open' : ''}><summary>${esc(title)}</summary><div class="section-body">${description ? `<p class="section-description">${esc(description)}</p>` : ''}${content}</div></details>`;
}
function repeatCards(path, title, fields, addLabel, defaultItem={}, third=false) {
  const values = getPath(draft, path) || [];
  return `<div class="repeat-list">${values.map((_, i) => `<div class="repeat-card"><div class="repeat-head"><h3>${esc(title)} ${i + 1}</h3><button type="button" class="button button-quiet button-small" data-remove="${esc(path)}" data-index="${i}" aria-label="Remove ${esc(title)} ${i + 1}">Remove</button></div>${grid(fields(`${path}.${i}`, i),third)}</div>`).join('')}</div><button type="button" class="button button-outline button-small add-row" data-add="${esc(path)}" data-template="${esc(JSON.stringify(defaultItem))}">+ ${esc(addLabel)}</button>`;
}
function titleCaseLabel(value) {
  const smallWords = new Set(['a','an','and','for','in','of','on','or','the','to','with']);
  return String(value).split(' ').map((word, index) => index && smallWords.has(word.toLowerCase()) ? word.toLowerCase() : word.replace(/^[a-z]/, ch => ch.toUpperCase())).join(' ');
}
function choiceRowItems(path, values, offset=0) {
  return values.map((label, index) => {
    const key = String(index + offset);
    const prefix = `${path}.${key}`;
    const selected = !!getPath(draft, `${prefix}.selected`);
    const executive = !!getPath(draft, `${prefix}.executiveMandate`);
    const note = getPath(draft, `${prefix}.note`) || '';
    return `<div class="choice-table-row"><span class="choice-label">${esc(titleCaseLabel(label))}</span><label class="choice-check"><input type="checkbox" data-path="${prefix}.selected" aria-label="Applies to this migration: ${esc(label)}" ${selected ? 'checked' : ''}><span class="choice-mobile-label">Applies to This Migration</span></label><label class="choice-check"><input type="checkbox" data-path="${prefix}.executiveMandate" aria-label="Executive mandate: ${esc(label)}" ${executive ? 'checked' : ''}><span class="choice-mobile-label">Executive Mandate?</span></label><textarea class="choice-note auto-grow" rows="1" data-path="${prefix}.note" aria-label="Notes and More Details for ${esc(label)}" placeholder="Add details if useful">${esc(note)}</textarea></div>`;
  }).join('');
}
function choiceRows(path, values, offset=0) {
  return `<div class="choice-table"><div class="choice-table-head"><span>Item</span><span>Applies to This Migration</span><span>Executive Mandate?</span><span>Notes and More Details</span></div>${choiceRowItems(path,values,offset)}</div>`;
}
function goalOptions() {
  const out = [];
  Object.values(GOALS).forEach(values => values.forEach(value => out.push(value)));
  return out;
}
function allGoalRows() {
  let cursor = 0;
  const groups = Object.entries(GOALS).map(([group, values]) => {
    const rows = choiceRowItems('goals',values,cursor);
    cursor += values.length;
    return `<div class="goal-group"><div class="goal-group-label">${esc(titleCaseLabel(group))}</div><div class="goal-group-rows">${rows}</div></div>`;
  }).join('');
  return `<div class="choice-table goals-table"><div class="choice-table-head"><span aria-hidden="true"></span><span>Item</span><span>Applies to This Migration</span><span>Executive Mandate?</span><span>Notes and More Details</span></div>${groups}</div>`;
}
function checklist(path, values) {
  const selected = getPath(draft, path) || [];
  return `<div class="choice-grid">${values.map(option => `<label class="checkbox-line"><input type="checkbox" data-array-path="${esc(path)}" data-option="${esc(option)}" ${selected.includes(option) ? 'checked' : ''}>${esc(option)}</label>`).join('')}</div>`;
}
function profileSection() {
  return section('profile', '1. Workload Profile', grid([
    field('profile.customerOrganization','Account Name'), field('profile.workloadName','Workload Name'),
    field('profile.engagementType','Engagement Type',{type:'select',options:['Net-new tenancy','Modernization','Migration','Disaster recovery','Other']}),
    field('profile.targetRegions','Target OCI Regions',{hint:'Separate multiple regions with commas.'}),
    field('profile.customerLocation','Customer Location'), field('profile.industry','Industry'),
    field('profile.opportunityId','Opp ID'), field('profile.orderNumber','Order #'),
    field('profile.bookingDate','Booking Date',{type:'date'}), field('profile.accountExecutive','Account Exec'),
    field('profile.oracleDeliveryLead','Oracle Delivery Lead'), field('profile.solutionArchitect','Solution Architect'),
    field('profile.implementationPartner','Implementation Partner'),
    field('profile.targetGoLive','Target Go-Live',{type:'date'}),
    field('profile.plannedStart','Planned Workload Start',{type:'date'}),
    field('summaryMarkdown','Describe the workload or migration in your own words',{type:'textarea',full:true,hint:'Markdown supported in the published entry.'})
  ],true), 'Identify the account and proposed workload so Launch can route the handoff and align timing. Include the opportunity, order, and leads already involved. A brief workload summary is enough; link detailed pursuit work in Section 7.', true);
}
function peopleSection() {
  const people = repeatCards('stakeholders','Contact', prefix => [
    field(`${prefix}.name`,'Name'), field(`${prefix}.role`,'Role'),
    field(`${prefix}.contact`,'Email or Contact Info'), field(`${prefix}.influence`,'Influence on Workload'),
    field(`${prefix}.notes`,'Additional Notes',{type:'textarea',full:true})
  ],'Add customer contact');
  const meetings = repeatCards('meetings','Cadence Call',prefix => [
    field(`${prefix}.day`,'Day',{type:'select',options:CALL_DAYS,selectPrompt:'Choose day'}),
    field(`${prefix}.time`,'Time',{type:'select',options:CALL_TIMES,selectPrompt:'Choose time'}),
    field(`${prefix}.timeZone`,'Time Zone',{type:'select',options:CALL_TIME_ZONES,selectPrompt:'Choose time zone'}),
    field(`${prefix}.cadence`,'Cadence',{type:'select',options:['Weekly','Biweekly','Monthly','One-Time','Other'],selectPrompt:'Choose cadence'}),
    field(`${prefix}.topic`,'Topic'), field(`${prefix}.audience`,'Customer Audience'),
    field(`${prefix}.notes`,'Additional Notes',{type:'textarea',full:true})
  ],'Add Cadence Call',{},true);
  return section('people','2. People and Meetings',`<h3>Key Customer Contacts</h3>${people}<h3>Customer Cadence Calls</h3>${meetings}`,'List customer stakeholders who make decisions or own delivery, plus the calls already scheduled or planned. Capture the cadence and audience so Launch joins the right discussions. The customer or its implementation partner owns delivery.');
}
function outcomesSection() {
  const reasons = `<details class="subsection" data-subsection="reasons" open><summary>Reasons to Migrate</summary><div class="subsection-body"><p class="subsection-description">Select the business or timing drivers behind this move. Mark executive mandates and add only the context Launch needs for the handoff.</p>${choiceRows('reasons',REASONS.slice(0,-1))}${grid([
    field('reasonOtherMarkdown','Other Reason to Migrate',{type:'textarea',full:true,hint:'Markdown supported in the published entry.'})
  ])}</div></details>`;
  const goals = `<details class="subsection" data-subsection="goals" open><summary>Goals and Improvements</summary><div class="subsection-body"><p class="subsection-description">Select the outcomes the customer expects from OCI. Note details already agreed, especially where they affect launch priorities.</p>${allGoalRows()}${grid([
    field('goalOtherMarkdown','Other Goal or Improvement',{type:'textarea',full:true})
  ])}</div></details>`;
  const success = repeatCards('successMeasures','Success Measure',prefix => [
    field(`${prefix}.name`,'Success Measure Name',{full:true}),
    field(`${prefix}.shortDescription`,'Short Description',{type:'textarea',full:true}),
    field(`${prefix}.impactsGoNoGo`,'Will This Impact the Go/No-Go Decision?',{type:'select',options:['Yes','No'],selectPrompt:'Choose yes or no'}),
    field(`${prefix}.isMeasurableMetric`,'Is This a Measurable Metric?',{type:'select',options:['Yes','No'],selectPrompt:'Choose yes or no',revealOnYes:true}),
    `<div class="metric-fields full" data-reveal-for="${esc(`${prefix}.isMeasurableMetric`)}" ${getPath(draft,`${prefix}.isMeasurableMetric`)==='Yes'?'':'hidden'}>${grid([
      field(`${prefix}.metricDescription`,'Metric Description',{type:'textarea',full:true}),
      field(`${prefix}.targetGoal`,'Target Goal',{type:'textarea',full:true})
    ])}</div>`
  ],'Add Success Measure');
  return section('outcomes','3. Business Case and Success',`${reasons}${goals}<h3>Success Measures</h3><p class="subsection-description">Add the criteria the customer will use to judge launch readiness. For measurable targets, describe the metric and target goal.</p>${success}`,'Record why the customer chose OCI and how they will judge progress. Select active drivers and goals, then capture any executive mandate or success measure already agreed with the customer.');
}
function workloadSection() {
  const workloads = repeatCards('workloads','Workload',prefix => [
    field(`${prefix}.name`,'Name'), field(`${prefix}.businessUnits`,'Key Business Units'),
    field(`${prefix}.geographies`,'Key Geographic Regions'), field(`${prefix}.sourceTechnologies`,'Key Technologies or Software in Use'),
    field(`${prefix}.applicationType`,'Application Type',{type:'select',options:['Custom or proprietary','Vendor application','Oracle application','Mixed']}),
    field(`${prefix}.applicationVendor`,'Application Vendor and Product'),
    field(`${prefix}.oracleProducts`,'Existing Oracle Products'),
    field(`${prefix}.targetServices`,'Target OCI Services'), field(`${prefix}.migrationWave`,'Migration Wave'),
    field(`${prefix}.eta`,'ETA',{type:'date'}), field(`${prefix}.disposition`,'Disposition and Approach',{type:'select',options:DISPOSITIONS}),
    field(`${prefix}.customerOwner`,'Customer Owner'),
    field(`${prefix}.descriptionMarkdown`,'Description',{type:'textarea',markdown:true,full:true}),
    `<div class="field full"><label>Target OCI Service Categories</label>${checklist(`${prefix}.serviceCategories`,SERVICE_CATEGORIES)}</div>`,
    field(`${prefix}.considerationsMarkdown`,'Additional Considerations',{type:'textarea',markdown:true,full:true})
  ],'Add workload');
  const exclusions = repeatCards('exclusions','Out-of-scope item',prefix => [
    field(`${prefix}.item`,'Item'), field(`${prefix}.futurePhase`,'Planned for Future Phase?',{type:'select',options:['Yes','No','Unknown']}),
    field(`${prefix}.description`,'Exclusion Description',{type:'textarea',full:true}),
    field(`${prefix}.assumptions`,'Assumptions',{type:'textarea',full:true})
  ],'Add out-of-scope item');
  const blockers = repeatCards('blockers','Blocker',prefix => [
    field(`${prefix}.name`,'Blocker Name'), field(`${prefix}.category`,'Category',{type:'select',options:['Service feature','Security enhancement','Compatibility','Capacity','Other']}),
    field(`${prefix}.impact`,'Blocker Impact',{type:'select',options:['Hard requirement','Soft requirement','Unknown']}),
    field(`${prefix}.status`,'Current Status',{type:'select',options:['Open','In progress','Resolved']}),
    field(`${prefix}.owner`,'PM or Owner'), field(`${prefix}.eta`,'Next Step ETA',{type:'date'}),
    field(`${prefix}.ticket`,'Ticket ID or Link'),
    field(`${prefix}.descriptionMarkdown`,'Short Description',{type:'textarea',markdown:true,full:true}),
    field(`${prefix}.nextStepMarkdown`,'Next Step',{type:'textarea',markdown:true,full:true})
  ],'Add blocker');
  return section('workloads','4. Workloads and Migration Plan',`<h3>In-Scope Workloads</h3>${workloads}<h3>Out of Scope</h3>${exclusions}<h3>Challenges or Concerns</h3>${choiceRows('concerns',CONCERNS)}<h3>Blockers</h3>${blockers}`,'List each workload in scope, its OCI services, approach, wave, and ETA. Mark exclusions and active blockers so Launch understands the planned work and the decisions still open.',true);
}
function assessmentSection() {
  return section('assessment','5. Current State Assessment',ASSESSMENT.map(([key,label]) => `<h3 class="subheading">${esc(label)}</h3>${grid([
    field(`assessment.${key}.currentState`,'Current State',{type:'textarea',markdown:true}),
    field(`assessment.${key}.targetState`,'Target State',{type:'textarea',markdown:true}),
    field(`assessment.${key}.requirements`,'Technical Requirements or Dependencies',{type:'textarea',markdown:true}),
    field(`assessment.${key}.gaps`,'Gaps or Decisions Needed',{type:'textarea',markdown:true}),
    field(`assessment.${key}.customerOwner`,'Customer Owner')
  ])}`).join(''),'Summarize the current architecture and proposed OCI direction for applicable areas. Link pursuit discovery instead of rewriting detailed inventories, and flag gaps affecting the launch plan.');
}
function readinessSection() {
  return section('readiness','6. OCI Foundation Readiness',READINESS.map(([key,label]) => `<h3 class="subheading">${esc(label)}</h3>${grid([
    field(`readiness.${key}.status`,'Status',{type:'select',options:['Complete','Open','Unknown']}),
    field(`readiness.${key}.owner`,'Owner'),
    field(`readiness.${key}.evidenceMarkdown`,'Requirement, Decision, or Evidence',{type:'textarea',markdown:true,full:true})
  ])}`).join(''),'Show the status of OCI foundation elements needed for this workload. Name an owner and link evidence for open items, especially access, network, security, operations, and capacity.');
}
function raidSection() {
  const raid = repeatCards('raid','RAID item',prefix => [
    field(`${prefix}.type`,'Type',{type:'select',options:['Risk','Assumption','Issue','Dependency','Decision']}),
    field(`${prefix}.owner`,'Owner'), field(`${prefix}.dueDate`,'Due Date',{type:'date'}),
    field(`${prefix}.evidence`,'Evidence or Link'),
    field(`${prefix}.descriptionMarkdown`,'Description',{type:'textarea',markdown:true,full:true}),
    field(`${prefix}.impactMarkdown`,'Impact or Decision Required',{type:'textarea',markdown:true,full:true})
  ],'Add RAID item');
  const artifacts = ARTIFACTS.map(([key,label]) => `<h3 class="subheading">${esc(label)}</h3>${grid([
    field(`artifacts.${key}.available`,'Available?',{type:'select',options:['Yes','No','Unknown']}),
    field(`artifacts.${key}.link`,'Location or Link'),
    field(`artifacts.${key}.ownerDue`,'Owner and Gap Closure Date',{full:true})
  ])}`).join('');
  return section('raid','7. RAID and Artifact Links',`<h3>Risks, Assumptions, Issues, Dependencies, and Decisions</h3>${raid}<h3>Artifact Links</h3>${artifacts}`,'Capture unresolved risks, assumptions, issues, dependencies, and decisions with owners. Link existing pursuit artifacts and identify who will close any missing input.');
}

function autoGrowNote(el) {
  if (el.closest('details:not([open])')) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(36,el.scrollHeight + 2)}px`;
}
function renderForm() {
  const open = new Set([...app.querySelectorAll('details[data-section][open]')].map(el => el.dataset.section));
  const existingSubsections = app.querySelector('details[data-subsection]');
  const openSubsections = new Set([...app.querySelectorAll('details[data-subsection][open]')].map(el => el.dataset.subsection));
  const isEditing = !!editingId;
  app.innerHTML = `<div class="form-intro"><div><p class="eyebrow">${isEditing ? 'Edit entry' : 'Workload intake'}</p><h1>Launch Engine Project Intake and Qualification Worksheet</h1><p class="form-subtitle">Phase 1 intake for OCI launches and migrations</p><p>Use this worksheet to transfer the proposed workload, customer contacts, existing pursuit work, and open decisions to Launch Engine. The customer or its implementation partner owns delivery. Launch Engine provides sales architecture guidance and helps coordinate the path to launch. Link existing artifacts where available and identify the owner of any gap needed for the next step.</p></div><a class="button button-outline" href="#/">Back to catalog</a></div>
    <div class="notice">This catalog and its records are public. Use fictional or approved public information.</div>
    <form id="intake-form" novalidate>
      ${profileSection()}${peopleSection()}${outcomesSection()}${workloadSection()}${assessmentSection()}${readinessSection()}${raidSection()}
      <div class="form-actions"><span class="muted">Every field is optional. Markdown works in long-text fields.</span><div class="actions"><a class="button button-outline" href="#/">Cancel</a><button class="button" type="submit">${isEditing ? 'Save changes' : 'Submit entry'}</button></div></div>
    </form>`;
  if (open.size) app.querySelectorAll('details[data-section]').forEach(el => { el.open = open.has(el.dataset.section); });
  if (existingSubsections) app.querySelectorAll('details[data-subsection]').forEach(el => { el.open = openSubsections.has(el.dataset.subsection); });
  app.querySelectorAll('textarea.auto-grow').forEach(autoGrowNote);
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['P','BR','STRONG','EM','DEL','BLOCKQUOTE','H1','H2','H3','H4','H5','H6','UL','OL','LI','PRE','CODE','A','HR','TABLE','THEAD','TBODY','TR','TH','TD']);
  const walk = node => {
    for (const child of [...node.children]) {
      if (!allowed.has(child.tagName)) { child.replaceWith(doc.createTextNode(child.textContent || '')); continue; }
      for (const attribute of [...child.attributes]) {
        const keepHref = child.tagName === 'A' && attribute.name === 'href' && /^(https?:|mailto:|#)/i.test(attribute.value);
        if (!keepHref) child.removeAttribute(attribute.name);
      }
      if (child.tagName === 'A') { child.setAttribute('target','_blank'); child.setAttribute('rel','noopener noreferrer'); }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
function renderMarkdown(value) {
  if (!value) return '';
  if (!window.marked) return esc(value).replace(/\n/g,'<br>');
  return sanitizeHtml(window.marked.parse(String(value), {gfm:true,breaks:true}));
}
function valueText(value) { return value == null || value === '' ? '' : esc(value); }
function detail(label, value, markdown=false) {
  if (value == null || value === '') return '';
  return `<div class="detail"><dt>${esc(label)}</dt><dd class="${markdown ? 'markdown-body' : ''}">${markdown ? renderMarkdown(value) : valueText(value)}</dd></div>`;
}
function detailPanel(title, body) { return body ? `<section class="panel record-section"><h2>${esc(title)}</h2>${body}</section>` : ''; }
function cards(items, render) { return items?.length ? `<div class="item-list">${items.map((item,i)=>`<div class="item-card">${render(item,i)}</div>`).join('')}</div>` : ''; }
function selectedRows(object, labels, mandate=false) {
  return labels.map((label,i) => {
    const item = object?.[i]; if (!item?.selected && !item?.note && !item?.executiveMandate) return '';
    return `<div class="item-card"><span class="tag">${esc(titleCaseLabel(label))}</span>${!item?.selected ? '<span class="tag tag-muted">Not selected</span>' : ''}${mandate && item?.executiveMandate ? '<span class="tag">Executive mandate</span>' : ''}${item?.note ? `<div class="markdown-body">${renderMarkdown(item.note)}</div>` : ''}</div>`;
  }).join('');
}
function recordBody(record) {
  const p = record.profile || {};
  const profile = `<div class="detail-grid">${[
    detail('Account Name',p.customerOrganization),detail('Workload Name',p.workloadName),detail('Engagement Type',p.engagementType === 'Other' && p.engagementTypeOther ? `Other: ${p.engagementTypeOther}` : p.engagementType),
    detail('Target OCI Regions',p.targetRegions),detail('Customer Location',p.customerLocation),detail('Industry',p.industry),
    detail('Opp ID',p.opportunityId),detail('Order #',p.orderNumber),detail('Booking Date',p.bookingDate),
    detail('Account Exec',p.accountExecutive),detail('Oracle Delivery Lead',p.oracleDeliveryLead),
    detail('Solution Architect',p.solutionArchitect),detail('Implementation Partner',p.implementationPartner),
    detail('Target Go-Live',p.targetGoLive),detail('Planned Workload Start',p.plannedStart),
    detail('Description',record.summaryMarkdown,true)
  ].join('')}</div>`;
  const people = cards(record.stakeholders,(v,i)=>`<h3>Contact ${i+1}</h3><div class="detail-grid">${detail('Name',v.name)}${detail('Role',v.role)}${detail('Email or Contact Info',v.contact)}${detail('Influence on Workload',v.influence)}${detail('Additional Notes',v.notes)}</div>`);
  const meetings = cards(record.meetings,(v,i)=>`<h3>Cadence Call ${i+1}</h3><div class="detail-grid">${detail('Day',v.day)}${detail('Time',v.time)}${detail('Time Zone',v.timeZone === 'Other' && v.timeZoneOther ? `Other: ${v.timeZoneOther}` : v.timeZone)}${!v.day && !v.time ? detail('Prior Date and Time',v.dateTime) : ''}${detail('Cadence',v.cadence === 'Other' && v.cadenceOther ? `Other: ${v.cadenceOther}` : v.cadence)}${detail('Topic',v.topic)}${detail('Customer Audience',v.audience)}${detail('Additional Notes',v.notes)}</div>`);
  const reasons = selectedRows(record.reasons,REASONS,true);
  const goals = selectedRows(record.goals,goalOptions(),true);
  const success = cards(record.successMeasures,(v,i)=>`<h3>${esc(v.name || `Success Measure ${i+1}`)}</h3><div class="detail-grid">${detail('Short Description',v.shortDescription)}${detail('Impacts Go/No-Go',v.impactsGoNoGo)}${detail('Measurable Metric',v.isMeasurableMetric)}${v.isMeasurableMetric==='Yes'?detail('Metric Description',v.metricDescription)+detail('Target Goal',v.targetGoal):''}</div>`);
  const outcomes = `${reasons ? `<h3>Reasons to Migrate</h3>${reasons}` : ''}${record.reasonOtherMarkdown ? `<h3>Other Reason to Migrate</h3><div class="markdown-body">${renderMarkdown(record.reasonOtherMarkdown)}</div>` : ''}${goals ? `<h3>Goals and Improvements</h3>${goals}` : ''}${record.goalOtherMarkdown ? `<h3>Other Goal</h3><div class="markdown-body">${renderMarkdown(record.goalOtherMarkdown)}</div>` : ''}${success ? `<h3>Success Measures</h3>${success}` : ''}${record.successMeasuresMarkdown ? `<h3>Earlier Success Measures</h3><div class="markdown-body">${renderMarkdown(record.successMeasuresMarkdown)}</div>` : ''}`;
  const workloads = cards(record.workloads,(v,i)=>`<h3>${esc(v.name || `Workload ${i+1}`)}</h3><div class="detail-grid">${detail('Business units',v.businessUnits)}${detail('Geographies',v.geographies)}${detail('Technologies in use',v.sourceTechnologies)}${detail('Application type',v.applicationType)}${detail('Vendor and product',v.applicationVendor)}${detail('Oracle products',v.oracleProducts)}${detail('Target OCI services',v.targetServices)}${detail('Service categories',(v.serviceCategories||[]).join(', '))}${detail('Wave',v.migrationWave)}${detail('ETA',v.eta)}${detail('Approach',v.disposition)}${detail('Customer owner',v.customerOwner)}${detail('Description',v.descriptionMarkdown,true)}${detail('Considerations',v.considerationsMarkdown,true)}</div>`);
  const exclusions = cards(record.exclusions,(v,i)=>`<h3>${esc(v.item || `Out-of-scope item ${i+1}`)}</h3><div class="detail-grid">${detail('Future phase',v.futurePhase)}${detail('Description',v.description)}${detail('Assumptions',v.assumptions)}</div>`);
  const concerns = selectedRows(record.concerns,CONCERNS,true);
  const blockers = cards(record.blockers,(v,i)=>`<h3>${esc(v.name || `Blocker ${i+1}`)}</h3><div class="detail-grid">${detail('Category',v.category === 'Other' && v.categoryOther ? `Other: ${v.categoryOther}` : v.category)}${detail('Impact',v.impact)}${detail('Status',v.status)}${detail('Owner',v.owner)}${detail('ETA',v.eta)}${detail('Ticket',v.ticket)}${detail('Description',v.descriptionMarkdown,true)}${detail('Next Step',v.nextStepMarkdown,true)}</div>`);
  const assessment = ASSESSMENT.map(([key,label])=>{const v=record.assessment?.[key]||{};const d=[detail('Current state',v.currentState,true),detail('Target state',v.targetState,true),detail('Requirements or dependencies',v.requirements,true),detail('Gaps or decisions',v.gaps,true),detail('Customer owner',v.customerOwner)].join('');return d?`<h3>${esc(label)}</h3><div class="detail-grid">${d}</div>`:'';}).join('');
  const readiness = READINESS.map(([key,label])=>{const v=record.readiness?.[key]||{};const d=[detail('Status',v.status),detail('Owner',v.owner),detail('Evidence',v.evidenceMarkdown,true)].join('');return d?`<h3>${esc(label)}</h3><div class="detail-grid">${d}</div>`:'';}).join('');
  const raid = cards(record.raid,(v,i)=>`<h3>${esc(v.type || `RAID item ${i+1}`)}</h3><div class="detail-grid">${detail('Description',v.descriptionMarkdown,true)}${detail('Impact or decision',v.impactMarkdown,true)}${detail('Owner',v.owner)}${detail('Due date',v.dueDate)}${detail('Evidence',v.evidence)}</div>`);
  const artifacts = ARTIFACTS.map(([key,label])=>{const v=record.artifacts?.[key]||{};const d=[detail('Available',v.available),detail('Link',v.link),detail('Owner and date',v.ownerDue)].join('');return d?`<h3>${esc(label)}</h3><div class="detail-grid">${d}</div>`:'';}).join('');
  return [
    detailPanel('1. Workload Profile',profile), detailPanel('2. People and Meetings',`${people ? `<h3>Key Customer Contacts</h3>${people}` : ''}${meetings ? `<h3>Customer Cadence Calls</h3>${meetings}` : ''}`),
    detailPanel('3. Business Case and Success',outcomes), detailPanel('4. Workloads and Migration Plan',`${workloads}${exclusions}${concerns}${blockers}`),
    detailPanel('5. Current State Assessment',assessment), detailPanel('6. OCI Foundation Readiness',readiness),
    detailPanel('7. RAID and Artifact Links',`${raid}${artifacts}`)
  ].join('');
}

async function api(path, options={}) {
  const headers = {'Accept':'application/json',...(options.body ? {'Content-Type':'application/json'} : {}),...(auth ? {'Authorization':`Bearer ${auth}`} : {})};
  try {
    const response = await fetch(`${API}${path}`,{...options,headers});
    const result = await response.json().catch(()=>({error:`HTTP ${response.status}`}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  } catch (error) {
    if (!options.method || options.method === 'GET') {
      if (path === '/api/entries' || /^\/api\/entries\/[a-zA-Z0-9-]+$/.test(path)) return publicRead(path);
    }
    throw error;
  }
}
async function publicRead(path) {
  const base='https://api.github.com/repos/michaelsheerin/launch-engine-intake/contents/data/entries';
  if (path !== '/api/entries') {
    const id=path.split('/').at(-1);
    const response=await fetch(`${base}/${encodeURIComponent(id)}.json`,{headers:{Accept:'application/vnd.github+json'}});
    if (!response.ok) throw new Error(`Entry unavailable (${response.status})`);
    const file=await response.json();
    return {entry:JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))))};
  }
  const response=await fetch(base,{headers:{Accept:'application/vnd.github+json'}});
  if (!response.ok) throw new Error(`Catalog unavailable (${response.status})`);
  const files=await response.json();
  const entries=await Promise.all(files.filter(file=>file.type==='file'&&file.name.endsWith('.json')).map(async file=>{
    const {entry}=await publicRead(`/api/entries/${file.name.slice(0,-5)}`);
    return {id:entry.id,customerOrganization:entry.profile?.customerOrganization||'',workloadName:entry.profile?.workloadName||entry.workloads?.[0]?.name||'',engagementType:entry.profile?.engagementType||'',targetRegions:entry.profile?.targetRegions||'',targetGoLive:entry.profile?.targetGoLive||'',updatedAt:entry.updatedAt||''};
  }));
  return {entries:entries.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
}
function message(text,error=false) { return `<div class="status ${error ? 'error' : ''}" role="status">${esc(text)}</div>`; }
function login() {
  sessionStorage.setItem('launchReturn',location.hash || '#/');
  if (draft) sessionStorage.setItem('launchDraft',JSON.stringify({draft,editingId}));
  location.href = `${API}/auth/start?return=${encodeURIComponent(location.origin + location.pathname + location.hash)}`;
}
async function updateAuth() {
  if (!auth) { authButton.textContent='Sign in with GitHub'; return; }
  try { const info=await api('/api/me'); authButton.textContent=`${info.login} · Sign out`; authButton.onclick=()=>{sessionStorage.removeItem('launchSession');auth='';authButton.onclick=login;updateAuth();}; }
  catch { sessionStorage.removeItem('launchSession');auth='';authButton.textContent='Sign in with GitHub';authButton.onclick=login; }
}
async function catalog() {
  app.innerHTML=`<div class="page-heading catalog-hero"><div><p class="eyebrow">Launch Engine Workload Catalog</p><h1>Workload handoffs in one place.</h1><p>Review proposed OCI launches and migrations. Open an entry for the full handoff details.</p></div><a class="button" href="#/new">Create an Entry</a></div><section class="catalog-content"><div class="section-title"><p class="eyebrow">Browse Entries</p><h2>Workload Catalog</h2></div><div class="panel loading-card"><div class="loading">Loading entries…</div></div></section>`;
  try {
    const {entries}=await api('/api/entries');
    const rows=entries.map(entry=>`<tr><td><a href="#/entry/${encodeURIComponent(entry.id)}">${esc(entry.workloadName || 'Untitled entry')}</a></td><td>${esc(entry.customerOrganization || '—')}</td><td>${esc(entry.engagementType || '—')}</td><td>${esc(entry.targetRegions || '—')}</td><td>${esc(entry.targetGoLive || '—')}</td><td>${esc((entry.updatedAt||'').slice(0,10))}</td></tr>`).join('');
    app.querySelector('.loading-card').innerHTML=`<div class="toolbar"><span class="count" id="entry-count">${entries.length} ${entries.length===1?'entry':'entries'}</span><label class="search"><span class="sr-only">Search entries</span><input id="catalog-search" type="search" placeholder="Search account or workload"></label></div><div class="table-wrap"><table class="catalog-table"><thead><tr><th>Workload</th><th>Account</th><th>Type</th><th>OCI Region</th><th>Target Go-Live</th><th>Updated</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="empty">No entries yet. Start with a new intake.</td></tr>`}</tbody></table></div>`;
    app.querySelector('#catalog-search').addEventListener('input',event=>{
      const query=event.target.value.toLowerCase(); let visible=0;
      app.querySelectorAll('.catalog-table tbody tr').forEach(row=>{const show=row.textContent.toLowerCase().includes(query);row.hidden=!show;if(show)visible++;});
      app.querySelector('#entry-count').textContent=`${visible} ${visible===1?'entry':'entries'}`;
    });
  } catch(error) { app.querySelector('.loading-card').innerHTML=message(`Could not load entries: ${error.message}`,true); }
}
async function showEntry(id) {
  app.innerHTML='<div class="loading">Loading entry…</div>';
  try {
    const {entry}=await api(`/api/entries/${encodeURIComponent(id)}`);
    app.innerHTML=`<div class="record-header"><div><p class="eyebrow">Submitted intake</p><h1>${esc(entry.profile?.workloadName || 'Untitled entry')}</h1><div class="meta"><span>${esc(entry.profile?.customerOrganization || 'Customer not provided')}</span><span>Updated ${esc((entry.updatedAt||'').slice(0,10))}</span><span>ID ${esc(entry.id)}</span></div></div><div class="actions"><a class="button button-outline" href="#/">Catalog</a><a class="button button-outline" href="#/edit/${encodeURIComponent(id)}">Edit</a><button class="button button-danger" type="button" id="delete-entry">Delete</button></div></div><div class="notice">This entry is public. Edits and deletion require GitHub write access.</div>${recordBody(entry)}`;
    app.querySelector('#delete-entry').addEventListener('click',async()=>{
      if (!auth) return login();
      if (!confirm(`Delete "${entry.profile?.workloadName || 'Untitled entry'}" from the catalog? Git history will retain prior versions.`)) return;
      const button=app.querySelector('#delete-entry');button.disabled=true;
      try { await api(`/api/entries/${encodeURIComponent(id)}`,{method:'DELETE'});location.hash='#/'; }
      catch(error) {button.disabled=false;button.insertAdjacentHTML('afterend',message(`Delete failed: ${error.message}`,true));}
    });
  } catch(error) { app.innerHTML=message(`Could not load entry: ${error.message}`,true); }
}
async function startForm(id=null) {
  editingId=id;
  const saved=sessionStorage.getItem('launchDraft');
  sessionStorage.removeItem('launchDraft');
  let restored=null;
  if(saved){try{const item=JSON.parse(saved);if(item?.draft && item.editingId===id)restored=item.draft;}catch{}}
  if (restored) draft=restored;
  else if (id) {
    app.innerHTML='<div class="loading">Loading entry…</div>';
    try { const {entry}=await api(`/api/entries/${encodeURIComponent(id)}`);draft=entry; }
    catch(error) { app.innerHTML=message(`Could not load entry: ${error.message}`,true);return; }
  } else draft=blankEntry();
  renderForm();
}
async function submitForm() {
  if (!auth) {login();return;}
  const button=app.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Saving…';
  try {
    const path=editingId?`/api/entries/${encodeURIComponent(editingId)}`:'/api/entries';
    const method=editingId?'PUT':'POST';
    const {entry}=await api(path,{method,body:JSON.stringify(draft)});
    draft=null;editingId=null;location.hash=`#/entry/${encodeURIComponent(entry.id)}`;
  } catch(error) {button.disabled=false;button.textContent=editingId?'Save changes':'Submit entry';app.querySelector('.form-actions').insertAdjacentHTML('beforebegin',message(`Save failed: ${error.message}`,true));}
}
async function route() {
  const parts=(location.hash.replace(/^#\/?/,'')||'').split('/').filter(Boolean);
  document.querySelector('#nav-catalog').classList.toggle('active',!parts.length);
  document.querySelector('#nav-new').classList.toggle('active',parts[0]==='new');
  if (!parts.length) return catalog();
  if (parts[0]==='new') return startForm();
  if (parts[0]==='entry'&&parts[1]) return showEntry(parts[1]);
  if (parts[0]==='edit'&&parts[1]) return startForm(parts[1]);
  app.innerHTML=message('Page not found.',true);
}

app.addEventListener('input',event=>{
  const el=event.target;
  if(el.matches('textarea.auto-grow'))autoGrowNote(el);
  if(el.dataset.path && draft)setPath(draft,el.dataset.path,el.type==='checkbox'?el.checked:el.value);
  if(el.dataset.otherPath && draft){const detail=app.querySelector(`[data-other-for="${CSS.escape(el.dataset.path)}"]`);if(detail)detail.hidden=el.value!=='Other';if(el.value!=='Other')setPath(draft,el.dataset.otherPath,'');}
  if(el.dataset.revealOnYes){const detail=app.querySelector(`[data-reveal-for="${CSS.escape(el.dataset.path)}"]`);if(detail)detail.hidden=el.value!=='Yes';}
});
app.addEventListener('toggle',event=>{
  if(event.target.matches('details[data-subsection]') && event.target.open)event.target.querySelectorAll('textarea.auto-grow').forEach(autoGrowNote);
},true);
window.addEventListener('resize',()=>app.querySelectorAll('textarea.auto-grow').forEach(autoGrowNote));
app.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.path && draft)setPath(draft,el.dataset.path,el.type==='checkbox'?el.checked:el.value);
  if(el.dataset.otherPath && draft){const detail=app.querySelector(`[data-other-for="${CSS.escape(el.dataset.path)}"]`);if(detail)detail.hidden=el.value!=='Other';if(el.value!=='Other')setPath(draft,el.dataset.otherPath,'');}
  if(el.dataset.revealOnYes){const detail=app.querySelector(`[data-reveal-for="${CSS.escape(el.dataset.path)}"]`);if(detail)detail.hidden=el.value!=='Yes';}
  if(el.dataset.arrayPath && draft){const list=getPath(draft,el.dataset.arrayPath)||[];const next=el.checked?[...new Set([...list,el.dataset.option])]:list.filter(x=>x!==el.dataset.option);setPath(draft,el.dataset.arrayPath,next);}
});
app.addEventListener('click',event=>{
  const add=event.target.closest('[data-add]');
  if(add&&draft){const list=getPath(draft,add.dataset.add)||[];list.push(JSON.parse(add.dataset.template||'{}'));setPath(draft,add.dataset.add,list);renderForm();app.querySelector(`[data-section="${add.dataset.add==='workloads'||add.dataset.add==='blockers'||add.dataset.add==='exclusions'?'workloads':add.dataset.add==='stakeholders'||add.dataset.add==='meetings'?'people':add.dataset.add==='successMeasures'?'outcomes':'raid'}"]`).open=true;return;}
  const remove=event.target.closest('[data-remove]');
  if(remove&&draft){const list=getPath(draft,remove.dataset.remove)||[];list.splice(Number(remove.dataset.index),1);renderForm();}
});
app.addEventListener('submit',event=>{if(event.target.id==='intake-form'){event.preventDefault();submitForm();}});
authButton.onclick=login;
window.addEventListener('hashchange',route);
const [authRoute,authQuery='']=location.hash.split('?');
const params=new URLSearchParams(authQuery);
if(params.has('session')){auth=params.get('session');sessionStorage.setItem('launchSession',auth);history.replaceState(null,'',`${location.pathname}${authRoute||sessionStorage.getItem('launchReturn')||'#/'} ` .trim());}
if(params.has('auth_error')){const reason=params.get('auth_error');history.replaceState(null,'',`${location.pathname}${authRoute||'#/'} ` .trim());setTimeout(()=>{app.insertAdjacentHTML('afterbegin',message(`GitHub sign-in failed: ${reason}`,true));},0);}
updateAuth();
route();
