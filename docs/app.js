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
  'Operational or manageability concerns', 'Security or data privacy concerns',
  'Strict data loss and availability SLAs', 'Critical performance requirements', 'Other'
];
const TECH_STACK = [
  ['compute','Compute'], ['vmsContainers','VMs/Containers'], ['storage','Storage'],
  ['database','Database'], ['integration','Integration'], ['networking','Networking'],
  ['security','Security'], ['highAvailability','High Availability'],
  ['disasterRecovery','Disaster Recovery'], ['other','Other']
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
const SERVICE_CATEGORIES = ['Compute', 'GPU Compute', 'VMware', 'Oracle Kubernetes Engine', 'Block Storage', 'Object Storage', 'Database', 'Gen AI Service', 'Integration', 'Functions, Streaming, Events', 'FastConnect', 'Logging and Observability'];
const HOSTING_ENVIRONMENTS = ['On-Premise','AWS','GCP','Azure','Other'];
const DISPOSITIONS = ['Rehost', 'Replatform', 'Refactor', 'Retain', 'Retire', 'Repurchase'];
const CALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CALL_TIMES = Array.from({length:29},(_,i)=>{const hour=6+Math.floor(i/2);const minute=i%2?'30':'00';return `${hour>12?hour-12:hour}:${minute} ${hour<12?'AM':'PM'}`;});

let draft = null;
let editingId = null;
let auth = sessionStorage.getItem('launchSession') || '';

function blankWorkload() {
  return {techStack:{},concerns:{},concernOtherMarkdown:'',blockers:[{},{}]};
}
function blankEntry() {
  return {
    schemaVersion: 1,
    profile: {}, summaryMarkdown: '', stakeholders: [{},{}], meetings: [{},{}],
    reasons: {}, reasonOtherMarkdown: '', goals: {}, goalOtherMarkdown: '', successMeasures: [{},{}],
    workloads: [blankWorkload()], readiness: {}, artifacts: {}
  };
}
function normalizeEntry(entry, forForm=false) {
  const next=JSON.parse(JSON.stringify(entry));
  next.workloads=Array.isArray(next.workloads)?next.workloads:[];
  if(!next.workloads.length&&(forForm||next.blockers?.length||Object.keys(next.concerns||{}).length))next.workloads=[blankWorkload()];
  next.workloads=next.workloads.filter(Boolean).map((workload,index)=>{
    const w={...workload,techStack:{...workload.techStack},concerns:{...workload.concerns},blockers:[...(workload.blockers||[])]};
    const oldNotes=[w.sourceTechnologies,w.considerationsMarkdown].filter(Boolean).join('\n\n');
    if(oldNotes)w.techStack.other=[w.techStack.other,oldNotes].filter(Boolean).join('\n\n');
    if(index===0){
      if(!Object.keys(w.concerns).length)w.concerns={...next.concerns};
      if(!w.concernOtherMarkdown)w.concernOtherMarkdown=next.concernOtherMarkdown||'';
      if(!w.blockers.some(item=>Object.keys(item||{}).length)&&next.blockers?.length)w.blockers=[...next.blockers];
      for(const [oldKey,key] of [['applications','vmsContainers'],['data','database'],['network','networking'],['security','security'],['resilience','disasterRecovery'],['other','other']]){
        const old=next.assessment?.[oldKey];
        const text=old?[old.currentState,old.requirements&&`Requirements: ${old.requirements}`,old.gaps&&`Open Decisions: ${old.gaps}`].filter(Boolean).join('\n\n'):'';
        if(text&&!w.techStack[key])w.techStack[key]=text;
      }
    }
    w.blockers=w.blockers.filter(Boolean).map(item=>({
      name:item.name||'',hardBlocker:item.hardBlocker??item.impact==='Hard requirement',
      descriptionMarkdown:item.descriptionMarkdown||'',owner:item.owner||'',ticket:item.ticket||'',
      eta:item.eta||'',nextStepMarkdown:item.nextStepMarkdown||''
    }));
    if(forForm&&!w.blockers.length)w.blockers=[{},{}];
    for(const key of ['businessUnits','sourceTechnologies','migrationWave','considerationsMarkdown'])delete w[key];
    return w;
  });
  for(const key of ['exclusions','concerns','concernOtherMarkdown','blockers','assessment'])delete next[key];
  for(const item of Object.values(next.readiness||{}))delete item.owner;
  return next;
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
function field(path, label, {type='text', options=[], full=false, hint='', placeholder='', selectPrompt='Select, if known', revealOnYes=false, autoGrow=false, compact=false, short=false, autoGrowOther=false}={}) {
  const id = `f-${path.replace(/[^a-z0-9]/gi, '-')}`;
  const value = getPath(draft, path) ?? '';
  let control = '';
  if (type === 'select') {
    const otherPath = `${path}Other`;
    const otherValue = getPath(draft, otherPath) ?? '';
    control = `<select id="${id}" data-path="${esc(path)}" ${options.includes('Other') ? `data-other-path="${esc(otherPath)}"` : ''} ${revealOnYes ? 'data-reveal-on-yes="true"' : ''}><option value="">${esc(selectPrompt)}</option>${options.map(option => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
    if (options.includes('Other')) control += `<div class="other-detail" data-other-for="${esc(path)}" ${value === 'Other' ? '' : 'hidden'}><label for="${id}-other">${esc(label)} Details</label>${autoGrowOther ? `<textarea id="${id}-other" class="auto-grow compact-autogrow" data-min-height="40" rows="1" data-path="${esc(otherPath)}" placeholder="Add details">${esc(otherValue)}</textarea>` : `<input id="${id}-other" data-path="${esc(otherPath)}" type="text" value="${esc(otherValue)}" placeholder="Add details">`}</div>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${id}" class="${autoGrow ? `auto-grow ${compact ? 'compact-autogrow' : ''}` : ''} ${short ? 'short-textarea' : ''}" ${autoGrow ? `data-min-height="${compact ? 40 : 92}" rows="${compact ? 1 : 3}"` : `rows="${short ? 2 : 3}"`} data-path="${esc(path)}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  } else {
    control = `<input id="${id}" data-path="${esc(path)}" type="${esc(type)}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  }
  return `<div class="field ${full ? 'full' : ''}"><label for="${id}">${esc(label)}</label>${control}${hint ? `<p class="hint">${esc(hint)}</p>` : ''}</div>`;
}
function grid(items, third=false) { return `<div class="grid ${third ? 'thirds' : ''}">${items.join('')}</div>`; }
function section(id, title, content, description='', open=false) {
  return `<details class="section" data-section="${id}" ${open ? 'open' : ''}><summary>${esc(title)}</summary><div class="section-body">${description ? `<p class="section-description">${esc(description)}</p>` : ''}${content}</div></details>`;
}
function subsection(id, title, content, description='', className='') {
  return `<details class="subsection ${esc(className)}" data-subsection="${esc(id)}" open><summary>${esc(title)}</summary><div class="subsection-body">${description ? `<p class="subsection-description">${esc(description)}</p>` : ''}${content}</div></details>`;
}
function repeatCards(path, title, fields, addLabel, defaultItem={}, third=false) {
  const values = getPath(draft, path) || [];
  return `<div class="repeat-list">${values.map((_, i) => `<div class="repeat-card"><div class="repeat-head"><h3>${esc(title)} ${i + 1}</h3><button type="button" class="button button-quiet button-small" data-remove="${esc(path)}" data-index="${i}" aria-label="Remove ${esc(title)} ${i + 1}">Remove</button></div>${grid(fields(`${path}.${i}`, i),third)}</div>`).join('')}</div><button type="button" class="button button-outline button-small add-row" data-add="${esc(path)}" data-template="${esc(JSON.stringify(defaultItem))}">+ ${esc(addLabel)}</button>`;
}
function editableTable(path, headers, row, addLabel, className='') {
  const values=getPath(draft,path)||[];
  const rowLabel=addLabel.replace(/^Add /,'');
  const rows=values.map((_,i)=>`<tr>${row(`${path}.${i}`,i)}<td class="editable-row-action"><button type="button" class="button button-quiet button-small" data-remove="${esc(path)}" data-index="${i}" aria-label="Remove ${esc(rowLabel)} ${i+1}">Remove</button></td></tr>`).join('');
  return `<div class="table-wrap editable-table-wrap"><table class="editable-table ${esc(className)}"><thead><tr>${headers.map(label=>`<th scope="col">${esc(label)}</th>`).join('')}<th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows||`<tr><td colspan="${headers.length+1}" class="record-empty">No rows. Add one below.</td></tr>`}</tbody></table></div><button type="button" class="button button-outline button-small add-row" data-add="${esc(path)}" data-template="{}">+ ${esc(addLabel)}</button>`;
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
    const note = getPath(draft, `${prefix}.note`) || '';
    return `<div class="choice-table-row"><span class="choice-label">${esc(titleCaseLabel(label))}</span><label class="choice-check"><input type="checkbox" data-path="${prefix}.selected" aria-label="Applies to this migration: ${esc(label)}" ${selected ? 'checked' : ''}><span class="choice-mobile-label">Applies to This Migration</span></label><textarea class="choice-note auto-grow" rows="1" data-path="${prefix}.note" aria-label="Notes and More Details for ${esc(label)}" placeholder="Add details if useful">${esc(note)}</textarea></div>`;
  }).join('');
}
function choiceRows(path, values, label='Item', offset=0) {
  return `<div class="choice-table"><div class="choice-table-head"><span>${esc(label)}</span><span>Applies to This Migration</span><span>Notes and More Details</span></div>${choiceRowItems(path,values,offset)}</div>`;
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
    return `<div class="goal-group"><div class="goal-group-label"><span>${esc(titleCaseLabel(group))}</span></div><div class="goal-group-rows">${rows}</div></div>`;
  }).join('');
  return `<div class="choice-table goals-table"><div class="choice-table-head"><span aria-hidden="true"></span><span>Target Goals</span><span>Applies to This Migration</span><span>Notes and More Details</span></div>${groups}</div>`;
}
function checklist(path, values) {
  const selected = getPath(draft, path) || [];
  return `<div class="choice-grid">${values.map(option => `<label class="checkbox-line"><input type="checkbox" data-array-path="${esc(path)}" data-option="${esc(option)}" ${selected.includes(option) ? 'checked' : ''}>${esc(option)}</label>`).join('')}</div>`;
}
function profileSection() {
  return section('profile', '1. Workload Profile', grid([
    field('profile.customerOrganization','Account Name'), field('profile.workloadName','Workload Name'),
    field('profile.engagementType','Engagement Type',{type:'select',options:['Net-new tenancy','Modernization','Migration','Disaster recovery','Other']}),
    field('profile.opportunityId','Opp ID'), field('profile.accountExecutive','Account Exec'),
    field('profile.solutionArchitect','Solution Architect'),
    field('profile.implementationPartner','Implementation Partner'),
    field('profile.targetGoLive','Target Go-Live',{type:'date'}),
    field('profile.plannedStart','Planned Migration Start',{type:'date'}),
    field('summaryMarkdown','Describe the workload or migration in your own words',{type:'textarea',full:true,hint:'Markdown supported in the published entry.'})
  ],true), 'Identify the account and proposed workload so Launch can route the handoff and align timing. Include the opportunity and leads already involved. A brief workload summary is enough; link detailed pursuit work in Section 6.', true);
}
function peopleSection() {
  const people=editableTable('stakeholders',['Name','Role','Influence on Workload','Note'],prefix=>`
    <td>${field(`${prefix}.name`,'Name')}</td>
    <td>${field(`${prefix}.role`,'Role')}</td>
    <td>${field(`${prefix}.influence`,'Influence on Workload',{type:'textarea',autoGrow:true,compact:true})}</td>
    <td>${field(`${prefix}.notes`,'Note',{type:'textarea',autoGrow:true,compact:true})}</td>`,'Add Contact Row');
  const meetings=editableTable('meetings',['Topic','Day and Time','Cadence','Customer Audience','Note'],prefix=>`
    <td>${field(`${prefix}.topic`,'Topic')}</td>
    <td><div class="schedule-controls">${field(`${prefix}.day`,'Day',{type:'select',options:CALL_DAYS,selectPrompt:'Day'})}${field(`${prefix}.time`,'Time',{type:'select',options:CALL_TIMES,selectPrompt:'Time'})}</div></td>
    <td>${field(`${prefix}.cadence`,'Cadence',{type:'select',options:['Weekly','Biweekly','Monthly','One-Time','Other'],selectPrompt:'Cadence'})}</td>
    <td>${field(`${prefix}.audience`,'Customer Audience',{type:'textarea',autoGrow:true,compact:true})}</td>
    <td>${field(`${prefix}.notes`,'Note',{type:'textarea',autoGrow:true,compact:true})}</td>`,'Add Cadence Call Row');
  return section('people','2. People and Meetings',subsection('people-contacts','Key Customer Contacts',people)+subsection('people-meetings','Customer Cadence Calls',meetings),'List customer stakeholders who make decisions or own delivery, plus the calls already scheduled or planned. Capture the cadence and audience so Launch joins the right discussions. The customer or its implementation partner owns delivery.');
}
function outcomesSection() {
  const reasons = `<details class="subsection" data-subsection="reasons" open><summary>Reasons to Migrate</summary><div class="subsection-body"><p class="subsection-description">Select the business or timing drivers behind this move. Add only the context Launch needs for the handoff.</p>${choiceRows('reasons',REASONS.slice(0,-1),'Reason to Migrate')}${grid([
    field('reasonOtherMarkdown','Other Reason to Migrate',{type:'textarea',full:true,short:true,hint:'Markdown supported in the published entry.'})
  ])}</div></details>`;
  const goals = `<details class="subsection" data-subsection="goals" open><summary>Goals and Improvements</summary><div class="subsection-body"><p class="subsection-description">Select the outcomes the customer expects from OCI. Note details already agreed, especially where they affect launch priorities.</p>${allGoalRows()}${grid([
    field('goalOtherMarkdown','Other Goal or Improvement',{type:'textarea',full:true,short:true})
  ])}</div></details>`;
  const success=editableTable('successMeasures',['Success Metric','Description','Hard Blocker?','If Measurable, What Is the Target?'],(prefix,i)=>{
    const item=getPath(draft,prefix)||{};
    const hardBlocker=item.hardBlocker===true||(item.hardBlocker==null&&item.impactsGoNoGo==='Yes');
    return `<td>${field(`${prefix}.name`,'Success Metric')}</td>
      <td>${field(`${prefix}.shortDescription`,'Description',{type:'textarea',autoGrow:true,compact:true})}</td>
      <td class="success-check"><label class="choice-check"><input type="checkbox" data-path="${esc(`${prefix}.hardBlocker`)}" aria-label="Hard blocker for success metric ${i+1}" ${hardBlocker?'checked':''}></label></td>
      <td>${field(`${prefix}.targetGoal`,'Target',{type:'textarea',autoGrow:true,compact:true})}</td>`;
  },'Add Success Metric Row');
  const successSubsection = `<details class="subsection" data-subsection="success" open><summary>Success Measures</summary><div class="subsection-body"><p class="subsection-description">List criteria the customer will use to judge launch readiness. Mark any hard blocker and provide a measurable target when one exists.</p>${success}</div></details>`;
  return section('outcomes','3. Business Case and Success',`${reasons}${goals}${successSubsection}`,'Record why the customer chose OCI and how they will judge progress. Select active drivers and goals, then capture success measures already agreed with the customer.');
}
function workloadTechStack(prefix) {
  const rows=TECH_STACK.map(([key,label])=>`<tr><th scope="row">${esc(label)}</th><td>${field(`${prefix}.techStack.${key}`,`${label} Details`,{type:'textarea',autoGrow:true,compact:true})}</td></tr>`).join('');
  return `<div class="table-wrap editable-table-wrap"><table class="editable-table tech-stack-table"><thead><tr><th scope="col">Category</th><th scope="col">Current Environment, Requirements, or Dependencies</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function workloadBlockers(prefix) {
  return editableTable(`${prefix}.blockers`,['Blocker Title','Hard Blocker?','Requirement Description','PM or Owner','Ticket ID or Link','Resolution ETA','Immediate Next Step'],(path,i)=>{
    const item=getPath(draft,path)||{};
    return `<td>${field(`${path}.name`,'Blocker Title',{type:'textarea',autoGrow:true,compact:true})}</td>
      <td class="success-check"><label class="choice-check"><input type="checkbox" data-path="${esc(`${path}.hardBlocker`)}" aria-label="Hard blocker for blocker ${i+1}" ${item.hardBlocker?'checked':''}></label></td>
      <td>${field(`${path}.descriptionMarkdown`,'Requirement Description',{type:'textarea',autoGrow:true,compact:true})}</td>
      <td>${field(`${path}.owner`,'PM or Owner')}</td>
      <td>${field(`${path}.ticket`,'Ticket ID or Link')}</td>
      <td>${field(`${path}.eta`,'Resolution ETA',{type:'date'})}</td>
      <td>${field(`${path}.nextStepMarkdown`,'Immediate Next Step',{type:'textarea',autoGrow:true,compact:true})}</td>`;
  },'Add Blocker Row','blockers-table');
}
function workloadSection() {
  const workloads=(draft.workloads||[]).map((_,i)=>{
    const prefix=`workloads.${i}`;
    const fields=grid([
      field(`${prefix}.name`,'Workload Title',{type:'textarea',autoGrow:true,compact:true}),
      field(`${prefix}.disposition`,'Migration Approach',{type:'select',options:DISPOSITIONS}),
      field(`${prefix}.currentHostingEnvironment`,'Current Hosting Environment',{type:'select',options:HOSTING_ENVIRONMENTS,autoGrowOther:true}),
      field(`${prefix}.applicationVendor`,'Application Name and Vendor',{type:'textarea',autoGrow:true,compact:true}),
      field(`${prefix}.applicationUse`,'Application Use',{type:'select',options:['Internal','Customer-Facing','Supporting Technology','Other'],autoGrowOther:true}),
      field(`${prefix}.applicationType`,'Application Type',{type:'select',options:['Custom or proprietary','Vendor application','Oracle application','Mixed']}),
      field(`${prefix}.eta`,'Migration Start Date',{type:'date'}),
      field(`${prefix}.goLiveDate`,'Go-Live Date',{type:'date'}),
      field(`${prefix}.customerOwner`,'Customer Owner',{type:'textarea',autoGrow:true,compact:true}),
      field(`${prefix}.descriptionMarkdown`,'Description',{type:'textarea',full:true,short:true})
    ],true);
    const stack=subsection(`${prefix}-tech-stack`,'Current Tech Stack',workloadTechStack(prefix),'Briefly describe the current environment and services used for each category. Include specific technical requirements or dependencies that affect the migration.');
    const services=subsection(`${prefix}-services`,'Target OCI Service Categories',`<div class="service-categories">${checklist(`${prefix}.serviceCategories`,SERVICE_CATEGORIES)}</div>${grid([field(`${prefix}.otherOciServicesMarkdown`,'Other OCI Services Planned',{type:'textarea',full:true,short:true})])}`);
    const risks=subsection(`${prefix}-risks`,'Challenges and Risks',choiceRows(`${prefix}.concerns`,CONCERNS.slice(0,-1),'Challenge or Risk')+grid([field(`${prefix}.concernOtherMarkdown`,'Other Challenge or Risk',{type:'textarea',full:true,short:true})]),'','workload-risks');
    const blockers=subsection(`${prefix}-blockers`,'Blockers',workloadBlockers(prefix),'Capture open requirements, the owner, and the immediate action needed to resolve each blocker.','workload-blockers');
    return `<article class="repeat-card workload-card" data-workload-index="${i}"><div class="repeat-head"><h3>Workload ${i+1}</h3><button type="button" class="button button-quiet button-small" data-remove="workloads" data-index="${i}" aria-label="Remove workload ${i+1}">Remove Workload</button></div>${fields}${stack}${services}${risks}${blockers}</article>`;
  }).join('');
  const add=`<button type="button" class="button button-outline button-small add-row" data-add="workloads" data-template="${esc(JSON.stringify(blankWorkload()))}">+ Add Workload</button>`;
  return section('workloads','4. Workloads and Migration Plan',subsection('workloads-in-scope','In-Scope Workloads',workloads+add),'Describe each workload, its source environment, migration dates, planned OCI services, risks, and blockers. Keep technical details and open requirements with the workload they affect.',true);
}
function readinessSection() {
  const rows = READINESS.map(([key,label]) => {
    const prefix = `readiness.${key}`;
    const status = getPath(draft,`${prefix}.status`);
    const requirement = getPath(draft,`${prefix}.evidenceMarkdown`) || '';
    return `<div class="choice-table-row readiness-row"><span class="choice-label">${esc(label)}</span><label class="choice-check"><input type="checkbox" data-readiness-status="${esc(`${prefix}.status`)}" aria-label="Complete: ${esc(label)}" ${status === 'Complete' || status === true ? 'checked' : ''}><span class="choice-mobile-label">Complete?</span></label><label class="readiness-requirement-field"><span class="choice-mobile-label">Details</span><textarea class="choice-note auto-grow" rows="1" data-path="${esc(`${prefix}.evidenceMarkdown`)}" aria-label="Details for ${esc(label)}" placeholder="Add details">${esc(requirement)}</textarea></label></div>`;
  }).join('');
  const table = `<div class="choice-table readiness-table"><div class="choice-table-head"><span>OCI Foundation Element</span><span>Complete?</span><span>Details</span></div>${rows}</div>`;
  return section('readiness','5. OCI Foundation Readiness',table,'Show the OCI foundation elements needed for the migration. Mark completed elements and add details about requirements still to address.');
}
function artifactOwner(item) {
  return item.owner ?? String(item.ownerDue || '').replace(/,\s*\d{4}-\d{2}-\d{2}$/, '');
}
function artifactSection() {
  const rows = ARTIFACTS.map(([key,label]) => {
    const item = draft.artifacts?.[key] || {};
    const owner = artifactOwner(item);
    return `<div class="choice-table-row artifact-row"><span class="choice-label">${esc(label)}</span><label class="artifact-input-field"><span class="choice-mobile-label">Location / Link</span><input type="text" data-path="${esc(`artifacts.${key}.link`)}" aria-label="Location or link for ${esc(label)}" value="${esc(item.link || '')}"></label><label class="artifact-input-field"><span class="choice-mobile-label">Owner</span><input type="text" data-path="${esc(`artifacts.${key}.owner`)}" aria-label="Owner for ${esc(label)}" value="${esc(owner)}"></label></div>`;
  }).join('');
  const table = `<div class="choice-table artifact-table"><div class="choice-table-head"><span>Artifact</span><span>Location / Link</span><span>Owner</span></div>${rows}</div>`;
  return section('artifacts','6. Artifact Links',table,'Link existing pursuit artifacts and identify the owner for each item. Add a location or link when an artifact is available.');
}

function autoGrowNote(el) {
  if (el.closest('details:not([open])')) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(Number(el.dataset.minHeight) || 36,el.scrollHeight + 2)}px`;
}
function renderForm() {
  const open = new Set([...app.querySelectorAll('details[data-section][open]')].map(el => el.dataset.section));
  const existingSubsections = app.querySelector('details[data-subsection]');
  const knownSubsections = new Set([...app.querySelectorAll('details[data-subsection]')].map(el=>el.dataset.subsection));
  const openSubsections = new Set([...app.querySelectorAll('details[data-subsection][open]')].map(el => el.dataset.subsection));
  const isEditing = !!editingId;
  app.innerHTML = `<div class="form-intro"><div><p class="eyebrow">${isEditing ? 'Edit entry' : 'Workload intake'}</p><h1>Launch Engine Project Intake and Qualification Worksheet</h1><p class="form-subtitle">Phase 1 intake for OCI launches and migrations</p><p>Use this worksheet to transfer the proposed workload, customer contacts, existing pursuit work, and open decisions to Launch Engine. The customer or its implementation partner owns delivery. Launch Engine provides sales architecture guidance and helps coordinate the path to launch. Link existing artifacts where available and identify the owner of any gap needed for the next step.</p></div><a class="button button-outline" href="#/">Back to catalog</a></div>
    <div class="notice">This catalog and its records are public. Use fictional or approved public information.</div>
    <form id="intake-form" novalidate>
      ${profileSection()}${peopleSection()}${outcomesSection()}${workloadSection()}${readinessSection()}${artifactSection()}
      <div class="form-actions"><span class="muted">Every field is optional. Markdown works in text areas.</span><div class="actions"><a class="button button-outline" href="#/">Cancel</a><button class="button" type="submit">${isEditing ? 'Save changes' : 'Submit entry'}</button></div></div>
    </form>`;
  if (open.size) app.querySelectorAll('details[data-section]').forEach(el => { el.open = open.has(el.dataset.section); });
  if (existingSubsections) app.querySelectorAll('details[data-subsection]').forEach(el => { el.open = !knownSubsections.has(el.dataset.subsection)||openSubsections.has(el.dataset.subsection); });
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
function valueText(value) { return value == null || value === '' ? '' : esc(value).replace(/\n/g,'<br>'); }
function detail(label, value, markdown=false, full=false) {
  if (value == null || value === '') return '';
  return `<div class="detail ${full ? 'full' : ''}"><dt>${esc(label)}</dt><dd class="${markdown ? 'markdown-body' : ''}">${markdown ? renderMarkdown(value) : valueText(value)}</dd></div>`;
}
function linkText(value) {
  if (!value) return '';
  let url;
  try { url = new URL(String(value)); } catch { return valueText(value); }
  if (!['https:', 'http:'].includes(url.protocol)) return valueText(value);
  return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(value)}</a>`;
}
function detailLink(label, value) {
  if (!value) return '';
  return `<div class="detail"><dt>${esc(label)}</dt><dd>${linkText(value)}</dd></div>`;
}
function recordValue(value, markdown=false) {
  if (value == null || value === '') return '<span class="record-blank">Not provided</span>';
  return markdown ? `<div class="markdown-body">${renderMarkdown(value)}</div>` : valueText(value);
}
function recordTable(headers, rows, className='') {
  const body = rows.length ? rows.join('') : `<tr><td class="record-empty" colspan="${headers.length}">No information provided.</td></tr>`;
  return `<div class="table-wrap record-table-wrap"><table class="record-table ${className}">${headers.length ? `<thead><tr>${headers.map(label=>`<th scope="col">${esc(label)}</th>`).join('')}</tr></thead>` : ''}<tbody>${body}</tbody></table></div>`;
}
function recordSubsection(title, body, tone='', level=3) {
  return `<section class="record-subsection ${tone}"><h${level}>${esc(title)}</h${level}>${body}</section>`;
}
function recordPanel(title, body) {
  return `<section class="panel record-section"><h2>${esc(title)}</h2>${body}</section>`;
}
function matrix(rows) {
  return `<div class="table-wrap record-table-wrap"><table class="record-table record-matrix"><tbody>${rows.map(([label,value,markdown=false,link=false])=>`<tr><th scope="row">${esc(label)}</th><td>${link ? linkText(value) || recordValue('') : recordValue(value,markdown)}</td></tr>`).join('')}</tbody></table></div>`;
}
function choiceTable(object, choices, otherMarkdown='', withCategory=false, itemLabel='Label') {
  const rows = choices.map(({label,category,index})=>{
    const item=object?.[index];
    if (!item?.selected && !item?.note) return '';
    const cells=[withCategory ? `<td class="record-category">${esc(category)}</td>` : '',`<th scope="row">${esc(titleCaseLabel(label))}</th>`,`<td class="record-status">${item.selected ? 'Yes' : 'No'}</td>`,`<td>${recordValue(item.note,true)}</td>`];
    return `<tr>${cells.join('')}</tr>`;
  }).filter(Boolean);
  if (otherMarkdown) rows.push(`<tr>${withCategory ? '<td class="record-category">Other</td>' : ''}<th scope="row">Other</th><td class="record-status">Yes</td><td>${recordValue(otherMarkdown,true)}</td></tr>`);
  return recordTable([...(withCategory?['Category']:[]),itemLabel,'Applies to This Migration?','Notes and More Details'],rows,'record-choice-table');
}
function recordBody(record) {
  record=normalizeEntry(record);
  const p=record.profile || {};
  const profileFields=[
    [['Account Name',p.customerOrganization],['Workload Name',p.workloadName],['Engagement Type',p.engagementType==='Other'&&p.engagementTypeOther?`Other: ${p.engagementTypeOther}`:p.engagementType]],
    [['Opp ID',p.opportunityId],['Account Exec',p.accountExecutive],['Solution Architect',p.solutionArchitect]],
    [['Implementation Partner',p.implementationPartner],['Target Go-Live',p.targetGoLive],['Planned Migration Start',p.plannedStart]]
  ];
  const profileRows=profileFields.map(group=>`<tr>${group.map(([label,value])=>`<td><span class="record-field-label">${esc(label)}</span><div>${recordValue(value)}</div></td>`).join('')}</tr>`);
  const profile=`${recordTable([],profileRows,'record-profile-table')}<div class="record-description"><h3>Description</h3>${recordValue(record.summaryMarkdown,true)}</div>`;

  const contacts=(record.stakeholders||[]).filter(v=>v&&['name','role','influence','notes'].some(key=>String(v[key]??'').trim())).map(v=>`<tr><th scope="row">${recordValue(v.name)}</th><td>${recordValue(v.role)}</td><td>${recordValue(v.influence)}</td><td>${recordValue(v.notes,true)}</td></tr>`);
  const meetings=(record.meetings||[]).filter(v=>v&&['topic','day','dateTime','time','cadence','audience','notes'].some(key=>String(v[key]??'').trim())).map(v=>{const schedule=[v.day||v.dateTime,v.time].filter(Boolean).join(' · ');return `<tr><th scope="row">${recordValue(v.topic)}</th><td>${recordValue(schedule)}</td><td>${recordValue(v.cadence==='Other'&&v.cadenceOther?`Other: ${v.cadenceOther}`:v.cadence)}</td><td>${recordValue(v.audience)}</td><td>${recordValue(v.notes,true)}</td></tr>`;});
  const people=recordSubsection('Key Customer Contacts',recordTable(['Name','Role','Influence on Workload','Note'],contacts,'record-contacts'))+recordSubsection('Customer Cadence Calls',recordTable(['Topic','Day and Time','Cadence','Customer Audience','Note'],meetings,'record-meetings'));

  const reasonChoices=REASONS.slice(0,-1).map((label,index)=>({label,index}));
  const goalChoices=Object.entries(GOALS).flatMap(([category,labels])=>labels.map(label=>({category,label}))).map((item,index)=>({...item,index}));
  const concernChoices=CONCERNS.slice(0,-1).map((label,index)=>({label,index}));
  const successRows=(record.successMeasures||[]).filter(v=>v&&['name','shortDescription','targetGoal'].some(key=>String(v[key]??'').trim())||(v?.hardBlocker===true)).map((v,i)=>`<tr><th scope="row">${recordValue(v.name||`Success Metric ${i+1}`)}</th><td>${recordValue(v.shortDescription,true)}</td><td class="record-status">${v.hardBlocker===true||(v.hardBlocker==null&&v.impactsGoNoGo==='Yes')?'Yes':'No'}</td><td>${recordValue(v.targetGoal,true)}</td></tr>`);
  const outcomes=recordSubsection('Reasons to Migrate',choiceTable(record.reasons,reasonChoices,record.reasonOtherMarkdown,false,'Reason to Migrate'))+recordSubsection('Goals and Improvements',choiceTable(record.goals,goalChoices,record.goalOtherMarkdown,true,'Target Goals'))+recordSubsection('Success Measures',recordTable(['Success Metric','Description','Hard Blocker?','If Measurable, What Is the Target?'],successRows,'record-success')+(record.successMeasuresMarkdown?`<div class="record-description"><h4>Earlier Success Measures</h4>${recordValue(record.successMeasuresMarkdown,true)}</div>`:''));

  const workloads=(record.workloads||[]).map((v,i)=>{
    const profile=matrix([['Migration Approach',v.disposition],['Current Hosting Environment',v.currentHostingEnvironment==='Other'&&v.currentHostingEnvironmentOther?`Other: ${v.currentHostingEnvironmentOther}`:v.currentHostingEnvironment],['Application Name and Vendor',v.applicationVendor,true],['Application Use',v.applicationUse==='Other'&&v.applicationUseOther?`Other: ${v.applicationUseOther}`:v.applicationUse],['Application Type',v.applicationType],['Migration Start Date',v.eta],['Go-Live Date',v.goLiveDate],['Customer Owner',v.customerOwner,true],['Description',v.descriptionMarkdown,true]]);
    const stack=recordSubsection('Current Tech Stack',matrix(TECH_STACK.map(([key,label])=>[label,v.techStack?.[key],true])),'',5);
    const services=recordSubsection('Target OCI Service Categories',matrix([['Planned OCI Service Categories',(v.serviceCategories||[]).join(', ')],['Other OCI Services Planned',v.otherOciServicesMarkdown,true]]),'',5);
    const risks=recordSubsection('Challenges and Risks',choiceTable(v.concerns,concernChoices,v.concernOtherMarkdown,false,'Challenge or Risk'),'scope-risks',5);
    const blockerRows=(v.blockers||[]).map(item=>`<tr><th scope="row">${recordValue(item.name)}</th><td class="record-status">${item.hardBlocker?'Yes':'No'}</td><td>${recordValue(item.descriptionMarkdown,true)}</td><td>${recordValue(item.owner)}</td><td>${linkText(item.ticket)||recordValue('')}</td><td>${recordValue(item.eta)}</td><td>${recordValue(item.nextStepMarkdown,true)}</td></tr>`);
    const blockers=recordSubsection('Blockers',recordTable(['Blocker Title','Hard Blocker?','Requirement Description','PM or Owner','Ticket ID or Link','Resolution ETA','Immediate Next Step'],blockerRows,'record-blockers'),'scope-blockers',5);
    return `<article class="record-entity record-workload"><h4>${esc(v.name||`Workload ${i+1}`)}</h4>${profile}${stack}${services}${risks}${blockers}</article>`;
  }).join('')||'<p class="record-empty">No in-scope workloads entered.</p>';
  const plan=recordSubsection('In-Scope Workloads',workloads,'scope-in');

  const readinessRows=READINESS.map(([key,label])=>{const v=record.readiness?.[key]||{};const complete=v.status==='Complete'||v.status===true?'Yes':v.status==='Open'||v.status===false?'No':v.status||'';return `<tr><th scope="row">${esc(label)}</th><td class="record-status">${recordValue(complete)}</td><td>${recordValue(v.evidenceMarkdown,true)}</td></tr>`;});
  const artifactsRows=ARTIFACTS.map(([key,label])=>{const v=record.artifacts?.[key]||{};return `<tr><th scope="row">${esc(label)}</th><td>${linkText(v.link)||recordValue('')}</td><td>${recordValue(artifactOwner(v))}</td></tr>`;});
  return [
    recordPanel('1. Workload Profile',profile),
    recordPanel('2. People and Meetings',people),
    recordPanel('3. Business Case and Success',outcomes),
    recordPanel('4. Workloads and Migration Plan',plan),
    recordPanel('5. OCI Foundation Readiness',recordTable(['OCI Foundation Element','Complete?','Details'],readinessRows,'readiness-view')),
    recordPanel('6. Artifact Links',recordTable(['Artifact','Location / Link','Owner'],artifactsRows,'artifact-view'))
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
    try {
      const snapshot=await fetch(`./data/entries/${encodeURIComponent(id)}.json`,{cache:'no-store'});
      if (snapshot.ok) {
        const entry=await snapshot.json();
        if (entry.id===id) return {entry};
      }
    } catch {}
    const response=await fetch(`${base}/${encodeURIComponent(id)}.json`,{headers:{Accept:'application/vnd.github+json'}});
    if (!response.ok) throw new Error(`Entry unavailable (${response.status})`);
    const file=await response.json();
    return {entry:JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))))};
  }
  try {
    const snapshot=await fetch('./data/catalog.json',{cache:'no-store'});
    if (snapshot.ok) return await snapshot.json();
  } catch {}
  const response=await fetch(base,{headers:{Accept:'application/vnd.github+json'}});
  if (!response.ok) throw new Error(`Catalog unavailable (${response.status})`);
  const files=await response.json();
  const entries=await Promise.all(files.filter(file=>file.type==='file'&&file.name.endsWith('.json')).map(async file=>{
    const {entry}=await publicRead(`/api/entries/${file.name.slice(0,-5)}`);
    return {id:entry.id,customerOrganization:entry.profile?.customerOrganization||'',workloadName:entry.profile?.workloadName||entry.workloads?.[0]?.name||'',engagementType:entry.profile?.engagementType||'',solutionArchitect:entry.profile?.solutionArchitect||'',targetRegions:entry.profile?.targetRegions||'',targetGoLive:entry.profile?.targetGoLive||'',updatedAt:entry.updatedAt||''};
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
    const {entries:listed}=await api('/api/entries');
    const entries=await Promise.all(listed.map(async entry=>{
      if ('solutionArchitect' in entry) return entry;
      try {const full=await publicRead(`/api/entries/${entry.id}`);return {...entry,solutionArchitect:full.entry.profile?.solutionArchitect||''};}
      catch {return {...entry,solutionArchitect:''};}
    }));
    const rows=entries.map(entry=>`<tr><td>${esc(entry.customerOrganization || '—')}</td><td><a href="#/entry/${encodeURIComponent(entry.id)}">${esc(entry.workloadName || 'Untitled entry')}</a></td><td>${esc(entry.engagementType || '—')}</td><td>${esc(entry.solutionArchitect || '—')}</td><td>${esc(entry.targetGoLive || '—')}</td></tr>`).join('');
    app.querySelector('.loading-card').innerHTML=`<div class="toolbar"><span class="count" id="entry-count">${entries.length} ${entries.length===1?'entry':'entries'}</span><label class="search"><span class="sr-only">Search entries</span><input id="catalog-search" type="search" placeholder="Search catalog"></label></div><div class="table-wrap"><table class="catalog-table catalog-summary"><thead><tr><th>Account</th><th>Workload Name</th><th>Engagement Type</th><th>Solution Architect</th><th>Target Go-Live</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty">No entries yet. Start with a new intake.</td></tr>`}</tbody></table></div>`;
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
  draft=normalizeEntry(draft,true);
  renderForm();
}
function compactRows(rows, keys) {
  return (rows||[]).filter(row=>row&&keys.some(key=>String(row[key]??'').trim())).map(row=>Object.fromEntries(keys.filter(key=>String(row[key]??'').trim()).map(key=>[key,row[key]])));
}
function hasContent(value) {
  if(Array.isArray(value))return value.some(hasContent);
  if(value&&typeof value==='object')return Object.values(value).some(hasContent);
  return value===true||(typeof value==='string'&&!!value.trim());
}
function prepareSubmission(entry) {
  const payload=normalizeEntry(entry);
  ['targetRegions','customerLocation','industry','orderNumber','bookingDate','oracleDeliveryLead'].forEach(key=>delete payload.profile?.[key]);
  payload.stakeholders=compactRows(payload.stakeholders,['name','role','influence','notes']);
  payload.meetings=compactRows(payload.meetings,['topic','day','time','cadence','cadenceOther','audience','notes']);
  for(const key of ['reasons','goals'])Object.values(payload[key]||{}).forEach(item=>delete item.executiveMandate);
  payload.successMeasures=(payload.successMeasures||[]).filter(v=>v&&(['name','shortDescription','targetGoal'].some(key=>String(v[key]??'').trim())||v.hardBlocker===true)).map(v=>({
    name:v.name||'',shortDescription:v.shortDescription||'',
    hardBlocker:v.hardBlocker===true||(v.hardBlocker==null&&v.impactsGoNoGo==='Yes'),targetGoal:v.targetGoal||''
  }));
  payload.workloads=payload.workloads.map(workload=>({
    ...workload,
    techStack:Object.fromEntries(Object.entries(workload.techStack||{}).filter(([,value])=>hasContent(value))),
    concerns:Object.fromEntries(Object.entries(workload.concerns||{}).filter(([,item])=>item&&(item.selected||item.note?.trim())).map(([key,item])=>[key,{selected:!!item.selected,note:item.note||''}])),
    blockers:workload.blockers.filter(hasContent)
  })).filter(hasContent);
  return payload;
}
async function submitForm() {
  if (!auth) {login();return;}
  const button=app.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Saving…';
  try {
    const path=editingId?`/api/entries/${encodeURIComponent(editingId)}`:'/api/entries';
    const method=editingId?'PUT':'POST';
    const payload=prepareSubmission(draft);
    const {entry}=await api(path,{method,body:JSON.stringify(payload)});
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
  if(el.dataset.readinessStatus && draft)setPath(draft,el.dataset.readinessStatus,el.checked?'Complete':'Open');
  if(el.dataset.path && draft)setPath(draft,el.dataset.path,el.type==='checkbox'?el.checked:el.value);
  if(el.dataset.otherPath && draft){const detail=app.querySelector(`[data-other-for="${CSS.escape(el.dataset.path)}"]`);if(detail)detail.hidden=el.value!=='Other';if(el.value!=='Other')setPath(draft,el.dataset.otherPath,'');}
  if(el.dataset.revealOnYes){const detail=app.querySelector(`[data-reveal-for="${CSS.escape(el.dataset.path)}"]`);if(detail)detail.hidden=el.value!=='Yes';if(el.dataset.path.endsWith('.futurePhase')&&el.value!=='Yes'){setPath(draft,el.dataset.path.replace(/\.futurePhase$/,'.estimatedTargetDate'),'');const date=detail?.querySelector('input[type="date"]');if(date)date.value='';}}
});
app.addEventListener('toggle',event=>{
  if(event.target.matches('details[data-section],details[data-subsection]') && event.target.open)event.target.querySelectorAll('textarea.auto-grow').forEach(autoGrowNote);
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
  if(add&&draft){const list=getPath(draft,add.dataset.add)||[];list.push(JSON.parse(add.dataset.template||'{}'));setPath(draft,add.dataset.add,list);renderForm();const sectionName=add.dataset.add.startsWith('workloads')?'workloads':['stakeholders','meetings'].includes(add.dataset.add)?'people':'outcomes';app.querySelector(`[data-section="${sectionName}"]`).open=true;return;}
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
