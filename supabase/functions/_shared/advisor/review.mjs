import {opsAiContext,opsAiFingerprint} from './context.mjs';
import {opsDecisionReview} from './checks.mjs';
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function keys(value,expected){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==expected.split(' ').sort().join('|'))throw Error('Invalid numerical context shape. Recalculate the comparison.');}
export function sanitize(raw){
  if(typeof raw!=='string'||!raw||raw.length>16384)throw Error('Invalid numerical context size.');
  const c=JSON.parse(raw);
  keys(c,'version currency objective source originalSource constraints baseline plans keepOriginal');
  if(!['ops-ai-1.1','ops-ai-1.2'].includes(c.version)||c.currency!=='THB')throw Error('Unsupported comparison version.');
  for(const source of [c.source,c.originalSource])keys(source,'price cost discount units stock period');
  keys(c.constraints,'maxDiscount minMargin safetyStock maxRestock fixedCost demand');
  if(!Array.isArray(c.constraints.demand)||!Array.isArray(c.plans))throw Error('Invalid comparison lists.');
  for(const d of c.constraints.demand)keys(d,'discount units');
  keys(c.baseline,'discount units stock operatingCost metrics');
  const metrics='unitPrice revenue grossProfit remaining contribution';keys(c.baseline.metrics,metrics);
  for(const p of c.plans){keys(p,'id discount units stock additionalStock metrics delta canSave needsCostReview isRecommended');keys(p.metrics,metrics);keys(p.delta,'revenue grossProfit contribution remaining');}
  const recommended=c.plans.filter(p=>p.isRecommended===true);
  if(recommended.length>1)throw Error('Conflicting recommendations.');
  const checked=opsAiContext({errors:[],source:c.source,originalSource:c.originalSource,constraints:{...c.constraints,goal:c.objective},baseline:c.baseline,plans:c.plans,recommendedId:recommended[0]?.id??null,keepOriginal:c.keepOriginal});
  checked.version=c.version;
  const originalUnknown=c.originalSource.cost===null,workingUnknown=c.source.cost===null;
  if(c.keepOriginal&&c.objective==='profit'&&(originalUnknown||workingUnknown||c.source.cost!==c.originalSource.cost||c.baseline.metrics.contribution===null||c.baseline.metrics.grossProfit===null))throw Error('Keeping the original by profit requires matching known costs.');
  if(originalUnknown&&['grossProfit','contribution'].some(k=>c.baseline.metrics[k]!==null))throw Error('Unknown original cost cannot have profit.');
  for(const p of c.plans){
    if(typeof p.isRecommended!=='boolean'||p.needsCostReview!==workingUnknown)throw Error('Invalid plan flags.');
    if(workingUnknown&&['grossProfit','contribution'].some(k=>p.metrics[k]!==null))throw Error('Unknown working cost cannot have profit.');
    if((originalUnknown||workingUnknown)&&['grossProfit','contribution'].some(k=>p.delta[k]!==null))throw Error('Unknown comparison cost cannot have a profit change.');
  }
  return checked;
}
export {opsAiFingerprint};
const moneyFormat=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const unitsFormat=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const money=n=>'THB '+moneyFormat.format(n);
const units=n=>unitsFormat.format(n);
const planFor=c=>c.keepOriginal?null:c.plans.find(p=>p.isRecommended&&p.canSave)??null;
const delta=(label,n)=>n===0?label+' is unchanged from the saved original on these assumptions.':label+' '+(n>0?'increases':'decreases')+' by '+money(Math.abs(n))+' versus the saved original on these assumptions.';
export function choices(c){
  const p=planFor(c),current=c.keepOriginal?c.baseline:p;
  const f={},checks={demand:'Check whether the assumed sales volumes are realistic for this period; they are not a forecast.',buffer:'Confirm available stock and the '+units(c.constraints.safetyStock)+'-unit reserve before trying a change.'};
  if(c.source.cost===null)f.unknown_cost='The working unit cost is unknown, so gross profit, profit after operating cost and unit margin are unavailable.';
  if(c.originalSource.cost===null)f.original_profit_unknown='The saved original has no unit cost, so its profit and any profit improvement versus it are unavailable.';
  if(p){
    if(p.delta.revenue!==null)f.revenue_delta=delta('Assumed revenue',p.delta.revenue);
    if(c.source.cost!==null&&c.originalSource.cost!==null&&p.delta.contribution!==null)f.profit_delta=delta('Profit after operating cost',p.delta.contribution);
    if(p.additionalStock>0)f.additional_stock='The change assumes '+units(p.additionalStock)+' additional stock units, taking modeled stock to '+units(p.stock)+'. This is not an order.';
  }
  f.stock_buffer=current&&current.metrics.remaining!==null?'The plan leaves '+units(current.metrics.remaining)+' stock units against the '+units(c.constraints.safetyStock)+'-unit reserve target.':'The supplied reserve target is '+units(c.constraints.safetyStock)+' stock units; a changed action still needs to meet the comparison limits.';
  if(c.constraints.fixedCost>0&&p)f.operating_cost='The proposed change includes '+money(c.constraints.fixedCost)+' of additional operating cost. Its modeled profit after that cost is '+(p.metrics.contribution!==null?money(p.metrics.contribution)+'.':'unavailable while the working unit cost is unknown.');
  if(c.source.cost===null)checks.cost='Obtain a reliable unit cost before using profit or margin to choose a plan.';
  else if(c.originalSource.cost===null)checks.cost='Verify the working unit cost of '+money(c.source.cost)+' and obtain a cost for the original before comparing profit.';
  else if(c.source.cost!==c.originalSource.cost)checks.cost='Confirm the revised unit-cost assumption of '+money(c.source.cost)+'.';
  if(p?.additionalStock>0)checks.replenishment='Confirm supply, lead time, expiry and purchasing funds before obtaining extra stock.';
  if(c.constraints.fixedCost>0&&p)checks.operating_cost='Check that the '+money(c.constraints.fixedCost)+' operating-cost assumption covers the proposed change.';
  if(c.version==='ops-ai-1.1')return {focuses:f,checks};
  checks.demand='Run a small trial, record actual sales for the same period, and revise the demand assumptions before extending the promotion.';
  checks.buffer='Count usable stock and ring-fence the reserve before the trial; stop if the reserve is at risk.';
  if(!p){f.choice=c.keepOriginal?'Keep the original under these assumptions; no modeled change improves the selected objective within the limits.':'No changed action is eligible; revise the comparison before choosing.';return {focuses:f,checks};}
  const r=opsDecisionReview(c);
  if(r.minimumSales!==null){
    f.sales_threshold='At least '+units(r.minimumSales)+' sales are needed to beat the unchanged original on the selected financial measure, versus '+units(p.units)+' assumed sales. Reserve-constrained sales capacity is '+units(Math.max(0,p.stock-c.constraints.safetyStock))+' units.';
    checks.trial_threshold='Trial stop/review condition: if the evidence does not support at least '+units(r.minimumSales)+' sales over the modeled period, revisit the promotion before extending it.';
  }
  f.demand_stress='If assumed sales fall by 10%, '+units(r.stressUnits)+' sales produce '+money(r.stressRevenue)+' revenue. '+(r.stressProfit===null?'Profit remains unavailable because unit cost is unknown.':'Profit after operating cost is '+money(r.stressProfit)+'.');
  if(r.stressDelta!==null)f.demand_stress+=' The selected financial measure is '+money(Math.abs(r.stressDelta))+(r.stressDelta>0?' above':r.stressDelta<0?' below':' level with')+' the unchanged original.';
  f.demand_stress+=' This is a sensitivity check, not a forecast; the original is held fixed.';
  return {focuses:f,checks};
}
export function selection(raw,c,allowed=choices(c)){
  if(typeof raw!=='string'||raw.length>2000)throw Error('The AI returned an invalid review selection.');
  const s=JSON.parse(raw);keys(s,'focus checks');
  if(typeof s.focus!=='string'||!own(allowed.focuses,s.focus)||!Array.isArray(s.checks)||s.checks.length<1||s.checks.length>2||new Set(s.checks).size!==s.checks.length||s.checks.some(k=>typeof k!=='string'||!own(allowed.checks,k)))throw Error('The AI selected unavailable review checks.');
  return s;
}
export function render(c,selected,allowed=choices(c)){
  const s=selection(JSON.stringify(selected),c,allowed),p=planFor(c),o={profit:'profit after operating cost',revenue:'assumed revenue',buffer:'remaining stock'}[c.objective];let first;
  if(c.keepOriginal){first='Keep the saved '+c.baseline.discount+'% plan with '+units(c.baseline.units)+' assumed sales. It meets the supplied limits, and none of the modeled changes improves '+o+' on these assumptions.';if(c.objective==='profit'&&c.baseline.metrics.contribution!==null)first+=' Its modeled profit after operating cost is '+money(c.baseline.metrics.contribution)+'.';}
  else if(p){first='For the '+o+' comparison, the modeled choice uses a '+p.discount+'% discount with '+units(p.units)+' assumed sales and '+units(p.stock)+' stock units.';if(c.objective==='profit'&&p.metrics.contribution!==null)first+=' Its modeled profit after operating cost is '+money(p.metrics.contribution)+'.';else if(c.objective==='buffer')first+=' Its modeled remaining stock is '+units(p.metrics.remaining)+' units.';else first+=' Its assumed revenue is '+money(p.metrics.revenue)+'.';if(c.source.cost===null&&c.objective==='profit')first+=' With cost unknown, this does not establish a profit ranking.';}
  else first='No changed action meets the supplied limits. Review the comparison assumptions before choosing a change.';
  const {focuses:f,checks}=allowed;let second=f[s.focus];
  if(c.originalSource.cost===null&&s.focus!=='original_profit_unknown')second+=' '+f.original_profit_unknown;
  if(c.source.cost===null&&s.focus!=='unknown_cost')second+=' '+f.unknown_cost;
  if(c.version==='ops-ai-1.2')return 'AI decision review · v1.2\n\nModeled choice\n'+first+'\n\nPriority to verify\n'+second+'\n\nBefore the manager decides\n'+s.checks.map((k,i)=>(i+1)+'. '+checks[k]).join('\n')+'\n\nAI prioritises these checks; calculations are deterministic. This is not an approval or a sales forecast.';
  return 'AI-assisted summary · v1.1\n\n'+first+'\n\n'+second+'\n\n'+s.checks.map(k=>checks[k]).join(' ');
}
export function validAnswer(answer,c){
  if(typeof answer!=='string'||!answer.trim()||answer.length>12000)return false;
  if(!answer.startsWith(c.version==='ops-ai-1.2'?'AI decision review · v1.2\n\n':'AI-assisted summary · v1.1\n\n'))return false;
  const allowed=choices(c),{focuses,checks}=allowed,ids=Object.keys(checks);
  for(const focus of Object.keys(focuses))for(const a of ids){if(render(c,{focus,checks:[a]},allowed)===answer)return true;for(const b of ids)if(a!==b&&render(c,{focus,checks:[a,b]},allowed)===answer)return true;}
  return false;
}
