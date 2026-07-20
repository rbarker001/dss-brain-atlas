import { ANATOMY } from './data/anatomy.js';
import { DSS_DOMAINS, EVENTS } from './data/events.js';
import { SEQUENCE } from './data/sequence.js';

const $=id=>document.getElementById(id);
const title=$('regionTitle'),desc=$('description'),eyebrow=$('eyebrow'),facts=$('facts'),context=$('contextBanner');
const brain=$('brainSvg'),eventBox=$('events'),eventChooser=$('eventChooser'),explanation=$('explanation');
const domainBadge=$('domainBadge');
const domainGuide=$('domainGuide');
const regionLegend=$('regionLegend');
let selectedRegion=null,selectedEvent=null,currentTab='anatomy',currentView='lobes',sequenceIndex=0;

const REGION_LEGENDS={
  lobes:[['frontal','Frontal'],['parietal','Parietal'],['temporal','Temporal'],['occipital','Occipital'],['cerebellum','Cerebellum'],['brainstem','Brainstem']],
  internal:[['hippocampus','Hippocampus'],['thalamus','Thalamus'],['cingulate','Cingulate network']]
};

function renderFacts(items){facts.innerHTML=items.map(([label,copy])=>`<div class="fact"><b>${label}</b><span>${copy}</span></div>`).join('');}
function setContext(label,copy){context.innerHTML=`<span>${label}</span>${copy}`;}
function highlightRegion(id){document.querySelectorAll('.region').forEach(el=>el.classList.toggle('active',el.dataset.region===id));regionLegend.querySelectorAll('.legend-region').forEach(el=>el.classList.toggle('active',el.dataset.region===id));selectedRegion=id;}
function renderLegend(view){
  const items=REGION_LEGENDS[view]; regionLegend.hidden=!items;
  if(!items){regionLegend.innerHTML='';return;}
  regionLegend.innerHTML=items.map(([id,label])=>`<button class="legend-region${selectedRegion===id?' active':''}" data-region="${id}"><span class="legend-swatch" aria-hidden="true"></span>${label}</button>`).join('');
  regionLegend.querySelectorAll('.legend-region').forEach(button=>button.addEventListener('click',()=>showAnatomy(button.dataset.region)));
}
function setTab(tab){
  currentTab=tab;
  $('anatomyTab').classList.toggle('active',tab==='anatomy');
  $('eventTab').classList.toggle('active',tab==='event');
  $('anatomyTab').setAttribute('aria-selected',tab==='anatomy');
  $('eventTab').setAttribute('aria-selected',tab==='event');
  eventChooser.hidden=tab!=='event';
}

function showAnatomy(id){
  const item=ANATOMY[id]; if(!item)return;
  brain.classList.remove('event-internal');
  domainBadge.hidden=true;
  domainGuide.hidden=true;
  setTab('anatomy'); highlightRegion(id);
  eyebrow.textContent=item.eye; title.textContent=item.title; desc.textContent=item.desc; renderFacts(item.facts);
  setContext('Selected anatomy',`${item.title} is highlighted on the illustration. Choose another region to compare.`);
}

function showEvent(event){
  const domain=DSS_DOMAINS[event.domain];
  selectedEvent=event; setTab('event'); highlightRegion(event.region);
  brain.classList.toggle('event-internal',['hippocampus','thalamus','cingulate'].includes(event.region));
  renderLegend(['hippocampus','thalamus','cingulate'].includes(event.region)?'internal':'lobes');
  document.querySelectorAll('.event').forEach(el=>el.classList.toggle('active',Number(el.dataset.i)===EVENTS.indexOf(event)));
  domainBadge.hidden=false;domainBadge.dataset.domain=event.domain;domainBadge.innerHTML=`<span>DSS Domain ${domain.number}</span><b>${domain.name}</b>`;
  domainGuide.hidden=false;domainGuide.href=domain.guideUrl;domainGuide.setAttribute('aria-label',`Explore the ${domain.name} DSS Field Guide`);domainGuide.querySelector('b').textContent=`Explore Domain ${domain.number}: ${domain.name}`;
  eyebrow.textContent='Observation guide'; title.textContent=event.name; desc.textContent=event.summary;
  renderFacts([['Why this DSS domain',event.domainReason],['Why it may raise concern',event.factors],['Important mimics',event.mimics],['What to document',event.document],['Cross-domain note','DSS organizes this observation in a primary domain. One event may include features from several domains, and classification does not establish its cause.']]);
  setContext('Possible network association',`The highlighted ${ANATOMY[event.region]?.title || 'region'} is one plausible association, not a diagnosis.`);
}

function renderEvents(query=''){
  const q=query.trim().toLowerCase();
  const matches=EVENTS.filter(event=>(event.name+' '+event.summary+' '+event.mimics).toLowerCase().includes(q)).sort((a,b)=>DSS_DOMAINS[a.domain].number.localeCompare(DSS_DOMAINS[b.domain].number));
  const groups=Object.entries(DSS_DOMAINS).sort(([,a],[,b])=>a.number.localeCompare(b.number)).map(([domainKey,domain])=>{
    const domainEvents=matches.filter(event=>event.domain===domainKey);
    if(!domainEvents.length)return '';
    const buttons=domainEvents.map(event=>`<button class="event${event===selectedEvent?' active':''}" data-domain="${event.domain}" data-i="${EVENTS.indexOf(event)}"><span class="event-name">${event.name}</span></button>`).join('');
    return `<section class="event-group" aria-labelledby="event-domain-${domain.number}"><h3 id="event-domain-${domain.number}"><span>Domain ${domain.number}</span>${domain.name}</h3><div class="event-group-items">${buttons}</div></section>`;
  }).join('');
  eventBox.innerHTML=groups||'<p class="empty-state">No matching observed events.</p>';
  eventBox.querySelectorAll('.event').forEach(button=>button.addEventListener('click',()=>showEvent(EVENTS[Number(button.dataset.i)])));
}

function setView(view){
  currentView=view;
  brain.classList.remove('event-internal');
  document.querySelectorAll('.mode').forEach(button=>{const active=button.dataset.view===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
  brain.classList.toggle('internal-view',view==='internal'); brain.classList.toggle('sequence-view',view==='sequence');
  $('sequencePanel').hidden=view!=='sequence';
  renderLegend(view);
  if(view==='lobes'){
    $('viewCue').innerHTML='<b>Lobe view</b><span>Select any colored region.</span>';
    setTab('anatomy'); showAnatomy(selectedRegion && !['hippocampus','thalamus','cingulate'].includes(selectedRegion)?selectedRegion:'frontal');
  }else if(view==='internal'){
    $('viewCue').innerHTML='<b>Internal structures</b><span>Outer lobes remain visible for orientation.</span>';
    showAnatomy(['hippocampus','thalamus','cingulate'].includes(selectedRegion)?selectedRegion:'hippocampus');
  }else{
    $('viewCue').innerHTML='<b>Example sequence</b><span>Use the five-stage timeline to see what changes.</span>';
    sequenceIndex=0; renderSequence();
  }
}

function renderTimeline(){
  $('timeline').innerHTML=SEQUENCE.map((step,index)=>`<button data-step="${index}" class="${index<sequenceIndex?'complete ':''}${index===sequenceIndex?'active':''}" aria-current="${index===sequenceIndex?'step':'false'}"><span>STEP ${index+1}</span><b>${step.title}</b></button>`).join('');
  $('timeline').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{sequenceIndex=Number(button.dataset.step);renderSequence();}));
}

function renderSequence(){
  const step=SEQUENCE[sequenceIndex]; setTab('anatomy');
  domainBadge.hidden=true;domainGuide.hidden=true;
  renderLegend('sequence');
  brain.className.baseVal=`brain-svg sequence-view sequence-stage-${sequenceIndex+1}`;
  $('sequenceStep').textContent=`Step ${sequenceIndex+1} of ${SEQUENCE.length}`; $('sequenceTitle').textContent=step.title; $('sequenceCopy').textContent=step.copy;
  for(let i=1;i<=3;i++)$('path'+i).classList.toggle('complete',i<=step.paths);
  for(let i=1;i<=4;i++){
    const node=$('node'+i); node.classList.toggle('complete',i<=step.nodes); node.classList.toggle('current',i===Math.max(1,step.nodes));
  }
  highlightRegion(step.region); renderTimeline();
  $('prevStep').disabled=sequenceIndex===0; $('nextStep').disabled=sequenceIndex===SEQUENCE.length-1;
  eyebrow.textContent='Example network sequence'; title.textContent=step.title; desc.textContent=step.copy;
  const visual=sequenceIndex===0?'The first numbered site marks a vulnerable network.':sequenceIndex===4?'Blue recovery rings replace the active yellow pathway to show post-event suppression and recovery.':'Solid yellow segments and numbered sites show how far this example has progressed.';
  renderFacts([['What changed on the brain',visual],['How to read this','This is a staged educational example. It is not a fixed pathway and cannot reconstruct an observed event.']]);
  setContext('Sequence mode',`Stage ${sequenceIndex+1} is shown on both the timeline and brain.`);
}

document.querySelectorAll('.region').forEach(region=>{
  region.setAttribute('tabindex','0'); region.setAttribute('role','button'); region.setAttribute('aria-label',`Show ${ANATOMY[region.dataset.region]?.title || region.dataset.region} details`);
  region.addEventListener('click',()=>showAnatomy(region.dataset.region));
  region.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showAnatomy(region.dataset.region);}});
});
document.querySelectorAll('.mode').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
$('anatomyTab').addEventListener('click',()=>selectedRegion?showAnatomy(selectedRegion):setView(currentView));
$('eventTab').addEventListener('click',()=>{setTab('event');if(selectedEvent)showEvent(selectedEvent);else{eyebrow.textContent='Observation guide';title.textContent='What did you notice?';desc.textContent='Choose an observed event above. The atlas will show one possible network association and the details worth documenting.';renderFacts([['Important','No observed behavior by itself confirms a seizure. Timing, recurrence, recovery, and competing explanations matter.']]);setContext('Observed events','Start with the behavior, then compare possible explanations.');}});
$('search').addEventListener('input',event=>renderEvents(event.target.value));
$('prevStep').addEventListener('click',()=>{if(sequenceIndex>0){sequenceIndex--;renderSequence();}});
$('nextStep').addEventListener('click',()=>{if(sequenceIndex<SEQUENCE.length-1){sequenceIndex++;renderSequence();}});
$('reset').addEventListener('click',()=>{selectedRegion=null;selectedEvent=null;$('search').value='';renderEvents();setView('lobes');});

renderEvents();
renderLegend('lobes');
renderFacts([['How to begin','Choose a brain view above, select a colored region, or open Observed events.'],['Clinical boundary','This tool supports observation and education. It does not diagnose seizures or epilepsy.']]);
