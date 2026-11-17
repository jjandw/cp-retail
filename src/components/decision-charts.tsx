import React, {useState,useRef,useEffect} from '@/i18n/react';
import {LanguageContext} from '@/i18n/language';

const money=(n:number)=>'฿'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

export function AssumptionSlider({label,value,onChange,min=0,max=100,step=1,help}:any) {
  const progress=(Number(value)-min)/(max-min||1)*100;
  return <label className="assumption-slider"><span className="slider-heading"><span>{label}</span><output aria-hidden="true">{Number(value).toLocaleString('en-US',{maximumFractionDigits:1})}%</output></span>
    <input type="range" min={min} max={max} step={step} value={value} aria-label={label} aria-valuetext={value+'%'} style={{'--range-fill':progress+'%'} as React.CSSProperties} onChange={e=>onChange(e.target.value)}/>
    <span className="slider-scale" aria-hidden="true"><span>{min}%</span><span>{max}%</span></span>{help&&<small>{help}</small>}
  </label>;
}

export function OfferResponseChart({check}:any) {
  const {language,currency,rates}=React.useContext(LanguageContext);
  const plotRef=useRef<HTMLDivElement|null>(null);
  const [width,setWidth]=useState(800);
  const gradientId='offer-area-'+React.useId().replace(/:/g,'');
  useEffect(()=>{const node=plotRef.current;if(!node)return;const observer=new ResizeObserver(entries=>setWidth(Math.max(260,entries[0].contentRect.width)));observer.observe(node);return()=>observer.disconnect();},[]);
  const i=check.inputs,compact=width<520;
  const rate=rates?.[currency]>0?rates[currency]:1;
  const code=rates?.[currency]>0?currency:'THB';
  const gain=(r:number)=>Math.round(i.customerCount*i.averageBasket*(r/100*(i.marginPercent-i.discountPercent)/100-i.baselineReturnPercent*i.marginPercent/10000)*100)/100;
  const low=Math.min(gain(0)*rate,gain(100)*rate,0),high=Math.max(gain(0)*rate,gain(100)*rate,0);
  const rough=(high-low||4)/4,power=Math.pow(10,Math.floor(Math.log10(rough))),fraction=rough/power;
  const step=([1,2,2.5,5,10].find(v=>v>=fraction)||10)*power;
  const min=Math.floor(low/step)*step,max=Math.ceil(high/step)*step||step;
  const ticks=Array.from({length:Math.round((max-min)/step)+1},(_,n)=>min+n*step);
  const axisMoney=(v:number)=>v===0?'0':new Intl.NumberFormat(language==='zh-CN'?'zh-CN':'en-US',{style:'currency',currency:code,notation:Math.abs(v)>=10000?'compact':'standard',maximumFractionDigits:step<1?2:0}).format(v);
  const left=Math.min(compact?88:108,Math.max(52,...ticks.map(v=>axisMoney(v).length*(compact?6.3:7)+13))),right=width-18;
  const height=compact?252:294,top=32,bottom=height-28;
  const x=(r:number)=>left+r/100*(right-left),y=(v:number)=>top+(max-v*rate)/(max-min)*(bottom-top);
  const zero=y(0),pointX=x(i.offerReturnPercent),pointY=y(check.incrementalGrossProfit);
  const threshold=check.breakEvenReturnPercent,hasThreshold=threshold!==null&&threshold>=0&&threshold<=100;
  const profitable=check.incrementalGrossProfit>=0;
  const start=hasThreshold?threshold:0;
  const positive=gain(100)>0;
  const area=positive?`M ${x(start)} ${zero} L ${x(100)} ${y(gain(100))} L ${x(100)} ${zero} Z`:'';
  const points=Array.from({length:21},(_,n)=>`${x(n*5)},${y(gain(n*5))}`).join(' ');
  const gap=hasThreshold?i.offerReturnPercent-threshold:null;
  return <section className={'offer-response-chart '+(profitable?'is-profitable':'is-below')} aria-label="Offer break-even chart">
    <div className="response-heading"><div><p className="response-kicker">Return offer</p><h3>Offer break-even trend</h3></div><div className="response-total"><span>Extra gross profit at your assumption</span><strong>{(check.incrementalGrossProfit>0?'+':'')+money(check.incrementalGrossProfit)}</strong></div></div>
    <div className="response-plot" ref={plotRef}>
      {hasThreshold&&<div className="response-threshold-label" style={{left:Math.max(left,Math.min(width-108,x(threshold)-42))}}>Break-even <strong>{threshold.toFixed(1)}%</strong></div>}
      <svg className="offer-curve" viewBox={`0 0 ${width} ${height}`} height={height} role="img" aria-label="Extra gross profit across assumed return rates">
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5a9c80" stopOpacity=".19"/><stop offset="100%" stopColor="#5a9c80" stopOpacity=".015"/></linearGradient></defs>
        {ticks.map(value=><g key={value}><line x1={left} x2={right} y1={y(value/rate)} y2={y(value/rate)} className={value===0?'response-zero':'response-grid'}/><text x={left-12} y={y(value/rate)+4} textAnchor="end">{axisMoney(value)}</text></g>)}
        {area&&<path d={area} fill={`url(#${gradientId})`}/>}
        {hasThreshold&&<line x1={x(threshold)} x2={x(threshold)} y1="29" y2={bottom} className="response-threshold"/>}
        <polyline points={points} fill="none" className="response-line-muted"/>
        {positive&&<line x1={x(start)} x2={x(100)} y1={zero} y2={y(gain(100))} className="response-line-positive"/>}
        <line x1={pointX} x2={pointX} y1={pointY+8} y2={bottom} className="response-projection"/>
        <circle cx={pointX} cy={pointY} r="6" className="response-current-point"/>
        {(compact?[0,50,100]:[0,20,40,60,80,100]).map(value=><text key={value} x={x(value)} y={height-7} textAnchor={value===100?'end':value===0?'start':'middle'}>{value}%</text>)}
      </svg>
      <div className="response-point-label" style={{left:Math.max(left,Math.min(width-126,pointX+13)),top:Math.max(32,Math.min(bottom-44,pointY-47))}}><span>Your assumption</span><strong>{i.offerReturnPercent}%</strong></div>
    </div>
    <p className="response-axis-caption">Expected return with an offer (%)</p>
    <div className="response-bottom"><span className="response-status-dot" aria-hidden="true"/>{gap===null?<span>No break-even in this range</span>:Math.abs(gap)<.05?<span>At break-even</span>:<><span>{gap>=0?'Above break-even by':'Below break-even by'}</span><strong>{Math.abs(gap).toFixed(1)}</strong><span>percentage points</span></>}</div>
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
