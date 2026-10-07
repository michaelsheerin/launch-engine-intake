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

let draft = null;
let editingId = null;
let auth = sessionStorage.getItem('launchSession') || '';

function blankEntry() {
  return {
    schemaVersion: 1,
    profile: {}, summaryMarkdown: '', stakeholders: [], meetings: [],
    reasons: {}, goals: {}, goalOtherMarkdown: '', workloads: [], exclusions: [],
    concerns: {}, blockers: [], successMeasuresMarkdown: '',
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
function field(path, label, {type='text', options=[], full=false, hint='', placeholder='', markdown=false}={}) {
  const id = `f-${path.replace(/[^a-z0-9]/gi, '-')}`;
  const value = getPath(draft, path) ?? '';
  let control = '';
  if (type === 'select') {
    control = `<select id="${id}" data-path="${esc(path)}"><option value="">Select, if known</option>${options.map(option => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${id}" data-path="${esc(path)}" ${markdown ? 'data-markdown="true"' : ''} placeholder="${esc(placeholder)}">${esc(value)}</textarea>${markdown ? `<div class="markdown-preview" data-preview-for="${esc(path)}">${renderMarkdown(value)}</div>` : ''}`;
  } else {
    control = `<input id="${id}" data-path="${esc(path)}" type="${esc(type)}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  }
  return `<div class="field ${full ? 'full' : ''}"><label for="${id}">${esc(label)}</label>${control}${hint ? `<p class="hint">${esc(hint)}</p>` : ''}</div>`;
}
function grid(items, third=false) { return `<div class="grid ${third ? 'thirds' : ''}">${items.join('')}</div>`; }
function section(id, title, content, description='', open=false) {
  return `<details class="section" data-section="${id}" ${open ? 'open' : ''}><summary>${esc(title)}</summary><div class="section-body">${description ? `<p class="section-description">${esc(description)}</p>` : ''}${content}</div></details>`;
}
function repeatCards(path, title, fields, addLabel, defaultItem={}) {
  const values = getPath(draft, path) || [];
  return `<div class="repeat-list">${values.map((_, i) => `<div class="repeat-card"><div class="repeat-head"><h3>${esc(title)} ${i + 1}</h3><button type="button" class="button button-quiet button-small" data-remove="${esc(path)}" data-index="${i}" aria-label="Remove ${esc(title)} ${i + 1}">Remove</button></div>${grid(fields(`${path}.${i}`, i))}</div>`).join('')}</div><button type="button" class="button button-outline button-small add-row" data-add="${esc(path)}" data-template="${esc(JSON.stringify(defaultItem))}">+ ${esc(addLabel)}</button>`;
}
function choiceRows(path, values, mandate=false) {
  return `<div class="choice-header"><span>Choose any ${mandate ? 'and mark executive mandates' : ''}</span><span>Optional note</span></div>${values.map((label, index) => {
    const key = String(index);
    const prefix = `${path}.${key}`;
    const selected = !!getPath(draft, `${prefix}.selected`);
    const executive = !!getPath(draft, `${prefix}.executiveMandate`);
    const note = getPath(draft, `${prefix}.note`) || '';
    return `<div class="choice-row"><div><label class="checkbox-line"><input type="checkbox" data-path="${prefix}.selected" ${selected ? 'checked' : ''}>${esc(label)}</label>${mandate ? `<label class="checkbox-line muted"><input type="checkbox" data-path="${prefix}.executiveMandate" ${executive ? 'checked' : ''}>Executive mandate</label>` : ''}</div><input type="text" data-path="${prefix}.note" value="${esc(note)}" aria-label="Note for ${esc(label)}" placeholder="Add context"></div>`;
  }).join('')}`;
}
function goalOptions() {
  const out = [];
  Object.values(GOALS).forEach(values => values.forEach(value => out.push(value)));
  return out;
}
function allGoalRows() {
  let cursor = 0;
  return Object.entries(GOALS).map(([group, values]) => {
    const html = values.map(label => {
      const key = cursor++;
      const prefix = `goals.${key}`;
      const checked = !!getPath(draft, `${prefix}.selected`);
      const note = getPath(draft, `${prefix}.note`) || '';
      return `<div class="choice-row"><label class="checkbox-line"><input type="checkbox" data-path="${prefix}.selected" ${checked ? 'checked' : ''}>${esc(label)}</label><input type="text" data-path="${prefix}.note" value="${esc(note)}" aria-label="Note for ${esc(label)}" placeholder="Add context"></div>`;
    }).join('');
    return `<h3 class="subheading">${esc(group)}</h3>${html}`;
  }).join('');
}
function checklist(path, values) {
  const selected = getPath(draft, path) || [];
  return `<div class="choice-grid">${values.map(option => `<label class="checkbox-line"><input type="checkbox" data-array-path="${esc(path)}" data-option="${esc(option)}" ${selected.includes(option) ? 'checked' : ''}>${esc(option)}</label>`).join('')}</div>`;
}
function profileSection() {
  return section('profile', '1. Workload profile', grid([
    field('profile.customerOrganization','Customer organization'), field('profile.workloadName','Workload name'),
    field('profile.engagementType','Engagement type',{type:'select',options:['Net-new tenancy','Modernization','Migration','Disaster recovery','Other']}),
    field('profile.targetRegions','Target OCI region(s)',{hint:'Separate multiple regions with commas.'}),
    field('profile.customerLocation','Customer location'), field('profile.industry','Industry'),
    field('profile.customerOciExperience','Customer OCI experience',{type:'select',options:['No OCI experience','Customer operates OCI','Partner operates OCI','Limited in-house OCI experience','Unknown']}),
    field('profile.opportunityId','Opportunity ID'), field('profile.orderNumber','Order number'),
    field('profile.bookingDate','Booking date',{type:'date'}), field('profile.accountExecutive','Account executive'),
    field('profile.oracleDeliveryLead','Oracle delivery lead'), field('profile.solutionArchitect','Solution architect'),
    field('profile.implementationPartner','Implementation partner and lead'),
    field('profile.targetGoLive','Target production go-live',{type:'date'}),
    field('profile.plannedStart','Planned workload start',{type:'date'}),
    field('summaryMarkdown','Describe the workload or migration in your own words',{type:'textarea',markdown:true,full:true,hint:'Markdown supported.'})
  ]), 'Quick identification and context. Leave unknown fields blank.', true);
}
function peopleSection() {
  const people = repeatCards('stakeholders','Contact', prefix => [
    field(`${prefix}.name`,'Name'), field(`${prefix}.role`,'Role'),
    field(`${prefix}.contact`,'Email or contact'), field(`${prefix}.influence`,'Influence on workload'),
    field(`${prefix}.notes`,'Additional notes',{type:'textarea',full:true})
  ],'Add contact');
  const meetings = repeatCards('meetings','Meeting',prefix => [
    field(`${prefix}.dateTime`,'Date and time',{type:'datetime-local'}), field(`${prefix}.cadence`,'Cadence',{type:'select',options:['One time','Weekly','Biweekly','Monthly','Other']}),
    field(`${prefix}.topic`,'Topic'), field(`${prefix}.audience`,'Customer audience'),
    field(`${prefix}.notes`,'Additional notes',{type:'textarea',full:true})
  ],'Add meeting');
  return section('people','2. People and meetings',`<h3>Contacts</h3>${people}<h3>Meetings</h3>${meetings}`,'Add only people and meetings relevant to this handoff.');
}
function outcomesSection() {
  const reasons = `<h3>Reasons to migrate</h3>${choiceRows('reasons',REASONS,true)}`;
  const goals = `<h3>Goals and improvements</h3>${allGoalRows()}`;
  return section('outcomes','3. Business case and success',`${reasons}${goals}${grid([
    field('goalOtherMarkdown','Other goal or improvement',{type:'textarea',markdown:true,full:true}),
    field('successMeasuresMarkdown','Success measures',{type:'textarea',markdown:true,full:true,hint:'Describe how the customer will judge progress or completion.'})
  ])}`,'Choose only relevant items; use notes for context.');
}
function workloadSection() {
  const workloads = repeatCards('workloads','Workload',prefix => [
    field(`${prefix}.name`,'Name'), field(`${prefix}.businessUnits`,'Key business units'),
    field(`${prefix}.geographies`,'Key geographic regions'), field(`${prefix}.sourceTechnologies`,'Key technologies or software in use'),
    field(`${prefix}.applicationType`,'Application type',{type:'select',options:['Custom or proprietary','Vendor application','Oracle application','Mixed']}),
    field(`${prefix}.applicationVendor`,'Application vendor and product'),
    field(`${prefix}.oracleProducts`,'Existing Oracle products'),
    field(`${prefix}.targetServices`,'Target OCI services'), field(`${prefix}.migrationWave`,'Migration wave'),
    field(`${prefix}.eta`,'ETA',{type:'date'}), field(`${prefix}.disposition`,'Disposition and approach',{type:'select',options:DISPOSITIONS}),
    field(`${prefix}.customerOwner`,'Customer owner'),
    field(`${prefix}.descriptionMarkdown`,'Description',{type:'textarea',markdown:true,full:true}),
    `<div class="field full"><label>Target OCI service categories</label>${checklist(`${prefix}.serviceCategories`,SERVICE_CATEGORIES)}</div>`,
    field(`${prefix}.considerationsMarkdown`,'Additional considerations',{type:'textarea',markdown:true,full:true})
  ],'Add workload');
  const exclusions = repeatCards('exclusions','Out-of-scope item',prefix => [
    field(`${prefix}.item`,'Item'), field(`${prefix}.futurePhase`,'Planned for future phase?',{type:'select',options:['Yes','No','Unknown']}),
    field(`${prefix}.description`,'Exclusion description',{type:'textarea',full:true}),
    field(`${prefix}.assumptions`,'Assumptions',{type:'textarea',full:true})
  ],'Add out-of-scope item');
  const blockers = repeatCards('blockers','Blocker',prefix => [
    field(`${prefix}.name`,'Blocker name'), field(`${prefix}.category`,'Category',{type:'select',options:['Service feature','Security enhancement','Compatibility','Capacity','Other']}),
    field(`${prefix}.impact`,'Blocker impact',{type:'select',options:['Hard requirement','Soft requirement','Unknown']}),
    field(`${prefix}.status`,'Current status',{type:'select',options:['Open','In progress','Resolved']}),
    field(`${prefix}.owner`,'PM or owner'), field(`${prefix}.eta`,'Next step ETA',{type:'date'}),
    field(`${prefix}.ticket`,'Ticket ID or link'),
    field(`${prefix}.descriptionMarkdown`,'Short description',{type:'textarea',markdown:true,full:true}),
    field(`${prefix}.nextStepMarkdown`,'Next step',{type:'textarea',markdown:true,full:true})
  ],'Add blocker');
  return section('workloads','4. Workloads and migration plan',`<h3>In-scope workloads</h3>${workloads}<h3>Out of scope</h3>${exclusions}<h3>Challenges or concerns</h3>${choiceRows('concerns',CONCERNS)}<h3>Blockers</h3>${blockers}`,'Add as many workloads, exclusions, and blockers as needed.',true);
}
function assessmentSection() {
  return section('assessment','5. Current state assessment',ASSESSMENT.map(([key,label]) => `<h3 class="subheading">${esc(label)}</h3>${grid([
    field(`assessment.${key}.currentState`,'Current state',{type:'textarea',markdown:true}),
    field(`assessment.${key}.targetState`,'Target state',{type:'textarea',markdown:true}),
    field(`assessment.${key}.requirements`,'Technical requirements or dependencies',{type:'textarea',markdown:true}),
    field(`assessment.${key}.gaps`,'Gaps or decisions needed',{type:'textarea',markdown:true}),
    field(`assessment.${key}.customerOwner`,'Customer owner')
  ])}`).join(''),'Link existing discovery in your descriptions where useful.');
}
function readinessSection() {
  return section('readiness','6. OCI foundation readiness',READINESS.map(([key,label]) => `<h3 class="subheading">${esc(label)}</h3>${grid([
    field(`readiness.${key}.status`,'Status',{type:'select',options:['Complete','Open','Unknown']}),
    field(`readiness.${key}.owner`,'Owner'),
    field(`readiness.${key}.evidenceMarkdown`,'Requirement, decision, or evidence',{type:'textarea',markdown:true,full:true})
  ])}`).join(''),'Record known status and evidence.');
}
function raidSection() {
  const raid = repeatCards('raid','RAID item',prefix => [
    field(`${prefix}.type`,'Type',{type:'select',options:['Risk','Assumption','Issue','Dependency','Decision']}),
    field(`${prefix}.owner`,'Owner'), field(`${prefix}.dueDate`,'Due date',{type:'date'}),
    field(`${prefix}.evidence`,'Evidence or link'),
    field(`${prefix}.descriptionMarkdown`,'Description',{type:'textarea',markdown:true,full:true}),
    field(`${prefix}.impactMarkdown`,'Impact or decision required',{type:'textarea',markdown:true,full:true})
  ],'Add RAID item');
  const artifacts = ARTIFACTS.map(([key,label]) => `<h3 class="subheading">${esc(label)}</h3>${grid([
    field(`artifacts.${key}.available`,'Available?',{type:'select',options:['Yes','No','Unknown']}),
    field(`artifacts.${key}.link`,'Location or link'),
    field(`artifacts.${key}.ownerDue`,'Owner and gap closure date',{full:true})
  ])}`).join('');
  return section('raid','7. RAID and artifact links',`<h3>Risks, assumptions, issues, dependencies, decisions</h3>${raid}<h3>Artifact links</h3>${artifacts}`,'Add open items and link existing pursuit material.');
}

function renderForm() {
  const open = new Set([...app.querySelectorAll('details[data-section][open]')].map(el => el.dataset.section));
  const isEditing = !!editingId;
  app.innerHTML = `<div class="form-intro"><div><p class="eyebrow">${isEditing ? 'Edit entry' : 'New entry'}</p><h1>${isEditing ? 'Edit workload intake' : 'New workload intake'}</h1><p>Move through the sections in any order. Every field is optional.</p></div><a class="button button-outline" href="#/">Back to catalog</a></div>
    <div class="notice">This catalog and its records are public. Use fictional or approved public information.</div>
    <form id="intake-form" novalidate>
      ${profileSection()}${peopleSection()}${outcomesSection()}${workloadSection()}${assessmentSection()}${readinessSection()}${raidSection()}
      <div class="form-actions"><span class="muted">Every field is optional. Markdown works in long-text fields.</span><div class="actions"><a class="button button-outline" href="#/">Cancel</a><button class="button" type="submit">${isEditing ? 'Save changes' : 'Submit entry'}</button></div></div>
    </form>`;
  if (open.size) app.querySelectorAll('details[data-section]').forEach(el => { el.open = open.has(el.dataset.section); });
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
    const item = object?.[i]; if (!item?.selected && !item?.note) return '';
    return `<div class="item-card"><span class="tag">${esc(label)}</span>${!item?.selected ? '<span class="tag tag-muted">Not selected</span>' : ''}${mandate && item?.executiveMandate ? '<span class="tag">Executive mandate</span>' : ''}${item?.note ? `<p>${esc(item.note)}</p>` : ''}</div>`;
  }).join('');
}
function recordBody(record) {
  const p = record.profile || {};
  const profile = `<div class="detail-grid">${[
    detail('Customer organization',p.customerOrganization),detail('Workload name',p.workloadName),detail('Engagement type',p.engagementType),
    detail('Target OCI regions',p.targetRegions),detail('Customer location',p.customerLocation),detail('Industry',p.industry),
    detail('Customer OCI experience',p.customerOciExperience),detail('Opportunity ID',p.opportunityId),detail('Order number',p.orderNumber),detail('Booking date',p.bookingDate),
    detail('Account executive',p.accountExecutive),detail('Oracle delivery lead',p.oracleDeliveryLead),
    detail('Solution architect',p.solutionArchitect),detail('Implementation partner',p.implementationPartner),
    detail('Target go-live',p.targetGoLive),detail('Planned start',p.plannedStart),
    detail('Description',record.summaryMarkdown,true)
  ].join('')}</div>`;
  const people = cards(record.stakeholders,(v,i)=>`<h3>Contact ${i+1}</h3><div class="detail-grid">${detail('Name',v.name)}${detail('Role',v.role)}${detail('Contact',v.contact)}${detail('Influence',v.influence)}${detail('Notes',v.notes)}</div>`);
  const meetings = cards(record.meetings,(v,i)=>`<h3>Meeting ${i+1}</h3><div class="detail-grid">${detail('Date and time',v.dateTime)}${detail('Cadence',v.cadence)}${detail('Topic',v.topic)}${detail('Audience',v.audience)}${detail('Notes',v.notes)}</div>`);
  const goals = selectedRows(record.goals,goalOptions());
  const outcomes = `${selectedRows(record.reasons,REASONS,true)}${goals}${record.goalOtherMarkdown ? `<h3>Other goal</h3><div class="markdown-body">${renderMarkdown(record.goalOtherMarkdown)}</div>` : ''}${record.successMeasuresMarkdown ? `<h3>Success measures</h3><div class="markdown-body">${renderMarkdown(record.successMeasuresMarkdown)}</div>` : ''}`;
  const workloads = cards(record.workloads,(v,i)=>`<h3>${esc(v.name || `Workload ${i+1}`)}</h3><div class="detail-grid">${detail('Business units',v.businessUnits)}${detail('Geographies',v.geographies)}${detail('Technologies in use',v.sourceTechnologies)}${detail('Application type',v.applicationType)}${detail('Vendor and product',v.applicationVendor)}${detail('Oracle products',v.oracleProducts)}${detail('Target OCI services',v.targetServices)}${detail('Service categories',(v.serviceCategories||[]).join(', '))}${detail('Wave',v.migrationWave)}${detail('ETA',v.eta)}${detail('Approach',v.disposition)}${detail('Customer owner',v.customerOwner)}${detail('Description',v.descriptionMarkdown,true)}${detail('Considerations',v.considerationsMarkdown,true)}</div>`);
  const exclusions = cards(record.exclusions,(v,i)=>`<h3>${esc(v.item || `Out-of-scope item ${i+1}`)}</h3><div class="detail-grid">${detail('Future phase',v.futurePhase)}${detail('Description',v.description)}${detail('Assumptions',v.assumptions)}</div>`);
  const concerns = selectedRows(record.concerns,CONCERNS);
  const blockers = cards(record.blockers,(v,i)=>`<h3>${esc(v.name || `Blocker ${i+1}`)}</h3><div class="detail-grid">${detail('Category',v.category)}${detail('Impact',v.impact)}${detail('Status',v.status)}${detail('Owner',v.owner)}${detail('ETA',v.eta)}${detail('Ticket',v.ticket)}${detail('Description',v.descriptionMarkdown,true)}${detail('Next step',v.nextStepMarkdown,true)}</div>`);
  const assessment = ASSESSMENT.map(([key,label])=>{const v=record.assessment?.[key]||{};const d=[detail('Current state',v.currentState,true),detail('Target state',v.targetState,true),detail('Requirements or dependencies',v.requirements,true),detail('Gaps or decisions',v.gaps,true),detail('Customer owner',v.customerOwner)].join('');return d?`<h3>${esc(label)}</h3><div class="detail-grid">${d}</div>`:'';}).join('');
  const readiness = READINESS.map(([key,label])=>{const v=record.readiness?.[key]||{};const d=[detail('Status',v.status),detail('Owner',v.owner),detail('Evidence',v.evidenceMarkdown,true)].join('');return d?`<h3>${esc(label)}</h3><div class="detail-grid">${d}</div>`:'';}).join('');
  const raid = cards(record.raid,(v,i)=>`<h3>${esc(v.type || `RAID item ${i+1}`)}</h3><div class="detail-grid">${detail('Description',v.descriptionMarkdown,true)}${detail('Impact or decision',v.impactMarkdown,true)}${detail('Owner',v.owner)}${detail('Due date',v.dueDate)}${detail('Evidence',v.evidence)}</div>`);
  const artifacts = ARTIFACTS.map(([key,label])=>{const v=record.artifacts?.[key]||{};const d=[detail('Available',v.available),detail('Link',v.link),detail('Owner and date',v.ownerDue)].join('');return d?`<h3>${esc(label)}</h3><div class="detail-grid">${d}</div>`:'';}).join('');
  return [
    detailPanel('1. Workload profile',profile), detailPanel('2. People and meetings',`${people}${meetings}`),
    detailPanel('3. Business case and success',outcomes), detailPanel('4. Workloads and migration plan',`${workloads}${exclusions}${concerns}${blockers}`),
    detailPanel('5. Current state assessment',assessment), detailPanel('6. OCI foundation readiness',readiness),
    detailPanel('7. RAID and artifact links',`${raid}${artifacts}`)
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
  app.innerHTML=`<div class="page-heading"><div><p class="eyebrow">Workload catalog</p><h1>Launch Engine intake</h1><p>Review submitted workloads and open an entry for its full details.</p></div><a class="button" href="#/new">+ New entry</a></div><div class="panel loading-card"><div class="loading">Loading entries…</div></div>`;
  try {
    const {entries}=await api('/api/entries');
    const rows=entries.map(entry=>`<tr><td><a href="#/entry/${encodeURIComponent(entry.id)}">${esc(entry.workloadName || 'Untitled entry')}</a></td><td>${esc(entry.customerOrganization || '—')}</td><td>${esc(entry.engagementType || '—')}</td><td>${esc(entry.targetRegions || '—')}</td><td>${esc(entry.targetGoLive || '—')}</td><td>${esc((entry.updatedAt||'').slice(0,10))}</td></tr>`).join('');
    app.querySelector('.loading-card').innerHTML=`<div class="toolbar"><span class="count" id="entry-count">${entries.length} ${entries.length===1?'entry':'entries'}</span><label class="search"><span class="sr-only">Search entries</span><input id="catalog-search" type="search" placeholder="Search customer or workload"></label></div><div class="table-wrap"><table class="catalog-table"><thead><tr><th>Workload</th><th>Customer</th><th>Type</th><th>OCI region</th><th>Target go-live</th><th>Updated</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="empty">No entries yet. Start with a new intake.</td></tr>`}</tbody></table></div>`;
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
  if (id) {
    app.innerHTML='<div class="loading">Loading entry…</div>';
    try { const {entry}=await api(`/api/entries/${encodeURIComponent(id)}`);draft=entry; }
    catch(error) { app.innerHTML=message(`Could not load entry: ${error.message}`,true);return; }
  } else {
    const saved=sessionStorage.getItem('launchDraft');
    if(saved){try{const item=JSON.parse(saved);draft=item.draft;editingId=item.editingId;}catch{draft=blankEntry();}sessionStorage.removeItem('launchDraft');}
    else draft=blankEntry();
  }
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
  if(el.dataset.path && draft){setPath(draft,el.dataset.path,el.type==='checkbox'?el.checked:el.value);if(el.dataset.markdown){const preview=app.querySelector(`[data-preview-for="${CSS.escape(el.dataset.path)}"]`);if(preview)preview.innerHTML=renderMarkdown(el.value);}}
});
app.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.path && draft)setPath(draft,el.dataset.path,el.type==='checkbox'?el.checked:el.value);
  if(el.dataset.arrayPath && draft){const list=getPath(draft,el.dataset.arrayPath)||[];const next=el.checked?[...new Set([...list,el.dataset.option])]:list.filter(x=>x!==el.dataset.option);setPath(draft,el.dataset.arrayPath,next);}
});
app.addEventListener('click',event=>{
  const add=event.target.closest('[data-add]');
  if(add&&draft){const list=getPath(draft,add.dataset.add)||[];list.push(JSON.parse(add.dataset.template||'{}'));setPath(draft,add.dataset.add,list);renderForm();app.querySelector(`[data-section="${add.dataset.add==='workloads'||add.dataset.add==='blockers'||add.dataset.add==='exclusions'?'workloads':add.dataset.add==='stakeholders'||add.dataset.add==='meetings'?'people':'raid'}"]`).open=true;return;}
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
