import React, {useState} from '@/i18n/react';

const money=(n:number)=>'฿'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

export function AssumptionSlider({label,value,onChange,min=0,max=100,step=1,help}:any) {
  const progress=(Number(value)-min)/(max-min||1)*100;
  return <label className="assumption-slider"><span className="slider-heading"><span>{label}</span><output aria-hidden="true">{Number(value).toLocaleString('en-US',{maximumFractionDigits:1})}%</output></span>
    <input type="range" min={min} max={max} step={step} value={value} aria-label={label} aria-valuetext={value+'%'} style={{'--range-fill':progress+'%'} as React.CSSProperties} onChange={e=>onChange(e.target.value)}/>
    <span className="slider-scale" aria-hidden="true"><span>{min}%</span><span>{max}%</span></span>{help&&<small>{help}</small>}
  </label>;
}

export function OfferResponseChart({check}:any) {
  const i=check.inputs;
  const gain=(rate:number)=>Math.round(i.customerCount*i.averageBasket*(rate/100*(i.marginPercent-i.discountPercent)/100-i.baselineReturnPercent*i.marginPercent/10000)*100)/100;
  const ends=[gain(0),gain(100),0];
  const low=Math.min(...ends),high=Math.max(...ends);
  const pad=Math.max((high-low)*.12,1);
  const min=low-pad,max=high+pad;
  const x=(n:number)=>96+n*4.7,y=(n:number)=>28+(max-n)/(max-min)*174;
  const zero=y(0),pointX=x(i.offerReturnPercent),pointY=y(check.incrementalGrossProfit);
  const threshold=check.breakEvenReturnPercent;
  const hasThreshold=threshold!==null&&threshold>=0&&threshold<=100;
  const points=Array.from({length:21},(_,n)=>`${x(n*5)},${y(gain(n*5))}`).join(' ');
  return <section className="offer-response-chart" aria-label="Offer break-even chart">
    <div className="row between"><h3>Where does the offer pay back?</h3><span className="small muted">Extra gross profit (THB)</span></div>
    <div className="chart-key small"><span><i className="key-line"/>Extra gross profit</span><span><i className="key-threshold"/>Break-even threshold</span><span><i className="key-dot"/>Your assumption</span></div>
    <svg className="offer-curve" viewBox="0 0 600 256" role="img" aria-label="Extra gross profit across assumed return rates">
      <rect x="96" y="28" width="470" height={Math.max(0,zero-28)} fill="#e8f3ed"/>
      {[low,0,high].filter((v,n,a)=>a.indexOf(v)===n).map(value=><g key={value}><line x1="96" x2="566" y1={y(value)} y2={y(value)} stroke={value===0?'#8b9b94':'#e1e8e3'} strokeDasharray={value===0?'4 4':undefined}/><text className={"curve-money-label "+(value===0?"is-zero":"")} x="84" y={y(value)+4} textAnchor="end">{value===0?'0':money(value)}</text></g>)}
      {[0,25,50,75,100].map(value=><g key={value}><line x1={x(value)} x2={x(value)} y1="28" y2="202" stroke="#e7ece8"/><text x={x(value)} y="224" textAnchor="middle">{value}%</text></g>)}
      {hasThreshold&&<line className="curve-threshold" x1={x(threshold)} x2={x(threshold)} y1="24" y2="202" stroke="#a47a43" strokeWidth="2" strokeDasharray="5 5"/>}
      <polyline points={points} fill="none" stroke="#21675d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1={pointX} x2={pointX} y1={pointY} y2="202" stroke="#21675d" opacity=".3"/>
      <circle cx={pointX} cy={pointY} r="6" fill="#21675d" stroke="#fff" strokeWidth="2"/>
      <text x="331" y="249" textAnchor="middle">Expected return with an offer (%)</text>
    </svg>
    <div className="chart-outcome row between"><span>{hasThreshold?<><span>Break-even return:</span> <strong>{threshold.toFixed(1)}%</strong></>:<strong>No break-even in this range</strong>}</span><span>Your assumption: <strong>{i.offerReturnPercent}%</strong> · {money(check.incrementalGrossProfit)}</span></div>
  </section>;
}

function MeasureBars({rows,field,currency=false,threshold,selected,onChoose}:any) {
  const numeric=rows.map((r:any)=>r[field]).filter((v:any)=>typeof v==='number'&&Number.isFinite(v));
  const low=Math.min(0,...numeric),high=Math.max(0,...numeric,threshold??0),span=high-low||1;
  const pct=(v:number)=>(v-low)/span*100;
  return <div className="comparison-bars">{rows.map((r:any)=>{
    const value=r[field],known=typeof value==='number'&&Number.isFinite(value),active=selected===r.id;
    return <button type="button" key={r.id} className={'comparison-bar-row '+(active?'is-selected':'')+(!r.canSave?' is-unavailable':'')+(r.id==='source'?' original':'')} disabled={!r.canSave} onClick={()=>onChoose(r.plan)} aria-pressed={active}>
      <span className="comparison-bar-label"><span>{r.title}</span><strong>{known?currency?money(value):value.toLocaleString('en-US'):'Unknown'}</strong></span>
      <span className="comparison-bar-track" aria-hidden="true"><i className="bar-zero" style={{left:pct(0)+'%'}}/>{known&&<i className={'bar-value '+(value<0?'negative':'')} style={{left:Math.min(pct(0),pct(value))+'%',width:Math.abs(pct(value)-pct(0))+'%'}}/>}{threshold!==undefined&&<i className="bar-reserve" style={{left:Math.min(99.5,pct(threshold))+'%'}}/>}</span>
      {!r.canSave&&r.id!=='source'&&<small>Needs adjustment</small>}
    </button>;
  })}</div>;
}

export function ScenarioComparisonChart({run,plans,selected,onChoose}:any) {
  const [metric,setMetric]=useState(run.source.cost===null?'revenue':'contribution');
  const rows=[{id:'source',title:'Saved original',canSave:false,...run.baseline},...plans].map((p:any)=>({id:p.id,title:p.title,canSave:p.canSave,plan:p,financial:p.metrics[metric],remaining:p.metrics.remaining}));
  return <section className="scenario-visual" aria-label="Visual action comparison">
    <div className="row between"><h3>See the trade-off</h3><label className="chart-metric">Compare<select className="input" aria-label="Compare" value={metric} onChange={e=>setMetric(e.target.value)}><option value="contribution">After operating cost</option><option value="revenue">Assumed revenue</option></select></label></div>
    <div className="decision-chart-grid"><div><h3>{metric==='contribution'?'After operating cost (THB)':'Revenue (THB)'}</h3><MeasureBars rows={rows} field="financial" currency selected={selected} onChoose={onChoose}/></div><div><div className="row between"><h3>Remaining stock (units)</h3><span className="small muted">Safety stock: {run.constraints.safetyStock}</span></div><MeasureBars rows={rows} field="remaining" threshold={run.constraints.safetyStock} selected={selected} onChoose={onChoose}/></div></div>
    <p className="small muted">Select an available bar to choose that action. Values use your assumptions.</p>
  </section>;
}
