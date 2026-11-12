// Customer-group explanation (profile-ai-1.0). Same contract as review.mjs:
// sanitize -> choices -> model picks ids -> render owns every number.
const VERSION='profile-ai-1.0';
const SEGMENTS=['regular','recent','cooling','occasional'];
const UNPROFITABLE=['cannot-pay-back','discount-exceeds-margin','below-break-even'];
const OFFER_STATUSES=[...UNPROFITABLE,'pays-back'];

function keys(o,list){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join()!==list.split(' ').sort().join())throw Error('Unexpected group context fields.');}
function num(v,min,max){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Group context number out of range.');}
function int(v,min,max){num(v,min,max);if(!Number.isInteger(v))throw Error('Group context count must be whole.');}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

export function sanitize(raw){
  if(typeof raw!=='string'||!raw||raw.length>4096)throw Error('Invalid group context size.');
  const c=JSON.parse(raw);
  keys(c,'version windowDays segment totals rfm offer');
  if(c.version!==VERSION||![30,60,90].includes(c.windowDays))throw Error('Unsupported group context version.');
  keys(c.segment,'id customerCount transactionCount averageBasket averageRecencyDays share');
  if(!SEGMENTS.includes(c.segment.id))throw Error('Unknown customer group.');
  int(c.segment.customerCount,1,100000);int(c.segment.transactionCount,1,1000000);num(c.segment.averageBasket,0,1000000);num(c.segment.averageRecencyDays,0,90);num(c.segment.share,0,100);
  keys(c.totals,'customerCount repeatCustomerShare');int(c.totals.customerCount,1,100000);num(c.totals.repeatCustomerShare,0,100);
  keys(c.rfm,'r f m');for(const k of ['r','f','m']){if(!Array.isArray(c.rfm[k])||c.rfm[k].length!==5)throw Error('RFM counts must have five scores.');c.rfm[k].forEach(v=>int(v,0,100000));}
  if(c.offer!==null){keys(c.offer,'discountPercent breakEvenReturnPercent status');if(![5,10,15,20].includes(c.offer.discountPercent)||!OFFER_STATUSES.includes(c.offer.status))throw Error('Invalid offer check.');if(c.offer.breakEvenReturnPercent!==null)num(c.offer.breakEvenReturnPercent,0,100000);}
  return c;
}

const RISK={
  regular:'They already come back often, so a discount mostly goes to visits you would get anyway.',
  recent:'Most have visited only once or twice, so it is too early to tell who will become a regular.',
  cooling:'They used to visit often but have not come in recently; some may already shop elsewhere.',
  occasional:'They visit rarely and their response to offers is unknown, so expected returns are a guess.',
};
const CHECKS={
  regular:{reward:'Check whether a non-price reward (priority stock, a stamp card) keeps visits steady.',track:'Track their visit frequency for two weeks before changing prices.',margin:'Confirm the margin on their usual items before any discount.'},
  recent:{second_visit:'Watch how many make a second visit within 14 days.',small_test:'Test a small reason to return on a few customers first.',basket:'Note what they buy on the first visit before choosing an offer.'},
  cooling:{trial:'Run a small return-offer trial and measure how many actually come back.',cause:'Check whether a stock-out or price change happened around when they stopped.',break_even:'Compare the break-even return rate with what you expect before scaling.'},
  occasional:{small_offer:'Keep any offer small and time-limited.',redemptions:'Measure redemptions before assuming any repeat visits.',timing:'Check which days they do visit before timing an offer.'},
};

function who(c){const s=c.segment;return s.customerCount+' customers ('+s.share+'% of active customers) made '+s.transactionCount+' purchases in the last '+c.windowDays+' days. Average basket ฿'+s.averageBasket.toFixed(2)+'; their latest visit was '+s.averageRecencyDays+' days ago on average.';}

export function choices(c){
  const focuses={group_risk:RISK[c.segment.id]};
  const lapsed=c.rfm.r[0]+c.rfm.r[1]+c.rfm.r[2];
  if(lapsed>0)focuses.lapsing=lapsed+' of '+c.segment.customerCount+' customers in this group have not visited for more than 7 days.';
  if(c.offer&&UNPROFITABLE.includes(c.offer.status))focuses.offer='A '+c.offer.discountPercent+'% discount is unlikely to pay back: '+(c.offer.breakEvenReturnPercent===null?'it is at least the gross margin.':'at least '+c.offer.breakEvenReturnPercent+'% of this group would need to return.');
  return {focuses,checks:{...CHECKS[c.segment.id]}};
}

export function selection(raw,c,allowed=choices(c)){
  if(typeof raw!=='string'||raw.length>2000)throw Error('The AI returned an invalid group selection.');
  const s=JSON.parse(raw);keys(s,'focus checks');
  if(typeof s.focus!=='string'||!own(allowed.focuses,s.focus)||!Array.isArray(s.checks)||s.checks.length<1||s.checks.length>2||new Set(s.checks).size!==s.checks.length||s.checks.some(k=>typeof k!=='string'||!own(allowed.checks,k)))throw Error('The AI selected an unavailable group explanation.');
  return s;
}

export function render(c,selected,allowed=choices(c)){
  const s=selection(JSON.stringify(selected),c,allowed);
  return 'AI group explanation · v1.0\n\nWho they are\n'+who(c)+'\n\nWhat to watch\n'+allowed.focuses[s.focus]+'\n\nVerify first\n'+s.checks.map((k,i)=>(i+1)+'. '+allowed.checks[k]).join('\n')+'\n\nAI prioritises these checks; figures are calculated from your data. This is not a forecast.';
}

export function validAnswer(answer,c){
  if(typeof answer!=='string'||!answer.startsWith('AI group explanation · v1.0\n\n'))return false;
  const allowed=choices(c),ids=Object.keys(allowed.checks);
  for(const focus of Object.keys(allowed.focuses))for(const a of ids){if(render(c,{focus,checks:[a]},allowed)===answer)return true;for(const b of ids)if(a!==b&&render(c,{focus,checks:[a,b]},allowed)===answer)return true;}
  return false;
}

export const PROMPT = "Act as a retail analyst explaining one customer group to a convenience-store manager.\nYou do not write facts or numbers; they are already calculated.\n\nReturn one JSON object only, with exactly these two keys:\n{\"focus\":\"one ID from allowedFocus\",\"checks\":[\"one or two distinct IDs from allowedChecks\"]}\n\nRead the group context and the evidence behind each ID. Choose the focus that most\naffects whether the manager should act on this group now: prefer offer when an offer\ncheck shows it will not pay back, lapsing when many members have stopped visiting,\notherwise group_risk. Choose two useful, distinct checks in priority order.\nReturn only IDs. No prose, markdown, numbers, translations or extra keys.\n";
export const CONTEXT_KEY='group';
