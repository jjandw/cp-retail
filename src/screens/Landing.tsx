import React, { useState, useRef, useEffect } from 'react';
import { NavigationAction } from '@/components/navigation-action';
import { useNavigation, useNavigationSetting, useTextSetting } from '@/lib/editable-settings';
import { useCurrentUser } from '@/lib/user';

function BrandMark({size=34,className=''}:{size?:number;className?:string}) {
  return <svg className={'brand-logo '+className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="15" fill="#21675D"/><path d="M19 24h26l-2.6 23.2a3 3 0 0 1-3 2.8H24.6a3 3 0 0 1-3-2.8z" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinejoin="round"/><path d="M25.5 24v-3a6.5 6.5 0 0 1 13 0v3" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round"/><path d="M25.6 36.4l4.6 4.6 8.6-9" fill="none" stroke="#DCECE6" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// BEGIN V2 LANDING
const LANDING_MARGIN = 30, LANDING_DISCOUNT = 10;
// Break-even return rate b·m/(m−d) for the landing examples; assumptions shown beside the figures.
const landingBreakEven = (baseline: number) => Math.round(baseline * LANDING_MARGIN / (LANDING_MARGIN - LANDING_DISCOUNT));
const LANDING_GROUPS = [['Regular', 80], ['Cooling', 20], ['Recent', 30]] as const;

function LandingCount({to}: {to: number}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setValue(to); return; }
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (now: number) => { const k = Math.min(1, (now - start) / 1200); setValue(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) frame = requestAnimationFrame(step); };
      frame = requestAnimationFrame(step);
    }, {threshold: .4});
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [to]);
  return <span ref={ref}>{value.toLocaleString('en-US')}</span>;
}

// Product visuals are live miniatures of the real screens (no images), so they stay sharp and match the app.
const LANDING_GROUP_MIX = [['Regular', 40], ['Recent', 35], ['Cooling', 30], ['Occasional', 45]] as const;

function LandingDevice({label, children}: {label: string; children: React.ReactNode}) {
  return <div className="l-device lv d3" role="img" aria-label={label}><div className="l-device-bar" aria-hidden="true"><i/><i/><i/></div><div className="l-device-body">{children}</div></div>;
}

function LandingGroupsMock() {
  return <div className="l-mock">
    <div className="l-mock-kpis"><div><small>Recorded sales</small><b>฿35,499</b></div><div><small>Customers</small><b>150</b></div><div><small>Repeat</small><b>64.7%</b></div></div>
    <div className="l-mock-groups">{LANDING_GROUP_MIX.map(([name, n]) => <div key={name} className={name === 'Cooling' ? 'hot' : ''}><span>{name}</span><i style={{width: (n / 45 * 100) + '%'}}/><b>{n}</b></div>)}</div>
    <p className="l-mock-note">Cooling regulars · 30 customers · last visit 10.9 days ago</p>
  </div>;
}

function LandingDecisionMock() {
  return <div className="l-mock">
    <div className="l-mock-head"><span className="l-tag">Pending decision</span><small>Saved with its evidence</small></div>
    <h3>Win back cooling regulars — 10% off the next visit</h3>
    <div className="l-mock-row"><span>Break-even return</span><b>30%</b></div>
    <div className="l-mock-row"><span>You expect</span><b>45%</b></div>
    <p className="l-mock-label">Verify first</p>
    <ol><li>Run a small return-offer trial and count who comes back.</li><li>Check for a stock-out around when they stopped visiting.</li></ol>
  </div>;
}

function Landing({brand}: {brand: string}) {
  const loginLink = useNavigationSetting({name:'landing-login',label:'Landing: log in page',initialValue:{destination:'/login',openIn:'SELF'}});
  const signupLink = useNavigationSetting({name:'landing-signup',label:'Landing: sign-up page',initialValue:{destination:'/sign-up',openIn:'SELF'}});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold: .18});
    root.querySelectorAll('.lv').forEach(el => io.observe(el));
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // On `/` the landing sits in its own scrolling overlay; elsewhere the window scrolls.
    const scroller: any = root.closest('.cp-landing-overlay') || window;
    const offset = () => scroller === window ? window.scrollY : scroller.scrollTop;
    let ticking = false;
    const onScroll = () => { if (ticking || reduce) return; ticking = true; requestAnimationFrame(() => { glowRef.current?.style.setProperty('--p', Math.min(offset(), 900) * .35 + 'px'); ticking = false; }); };
    scroller.addEventListener('scroll', onScroll, {passive: true});
    return () => { io.disconnect(); scroller.removeEventListener('scroll', onScroll); };
  }, []);
  return <div className="cp-landing" ref={rootRef}><style>{landingCss}</style>
    <header className="l-nav"><div className="l-wrap l-row"><span className="l-brand"><BrandMark size={26}/>{brand}</span><nav className="l-row l-links"><a href="#how">How it works</a><NavigationAction navigation={loginLink} className="l-link">Preview access</NavigationAction><NavigationAction navigation={signupLink} className="l-pill">Try demo</NavigationAction></nav></div></header>
    <section className="l-hero"><div className="l-glow" ref={glowRef} aria-hidden="true"/><div className="l-wrap">
      <p className="l-eyebrow lv">For convenience-store managers</p>
      <h1 className="lv d1">Know who to win back.<br/>Before you discount.</h1>
      <p className="l-lead lv d2">See which customers are drifting away, check whether an offer pays for itself, and save the decision — in three steps.</p>
      <img className="l-hero-img lv d2" src="/studio-media/478a380e-df54-42c2-a1aa-116f4493ef46.jpeg" alt="Convenience store" loading="lazy"/>
      <div className="l-cta lv d3"><NavigationAction navigation={signupLink} className="l-pill l-big">Try demo</NavigationAction><a href="#how" className="l-more">See how it works ›</a></div>
      <div className="l-glass lv d4" aria-label="Example result"><p className="l-small">Return offer · Cooling regulars · {LANDING_DISCOUNT}% off</p><p className="l-verdict">Pays back</p><p className="l-small">Break-even return rate <b>{landingBreakEven(20)}%</b> · you expect 45%</p><div className="l-bar"><i style={{width: landingBreakEven(20) + '%'}}/></div></div>
    </div></section>
    <section className="l-feat" id="how"><div className="l-wrap">
      <p className="l-eyebrow lv">Discover</p><h2 className="lv d1">Every regular, read in seconds.</h2>
      <p className="l-lead lv d2">Upload a till export with a member number on each sale. CP Retail groups customers by how recently, how often and how much they buy.</p>
      <p className="l-stat lv d3"><LandingCount to={150}/></p><p className="l-small lv d3">customers profiled in the simulated demo store</p>
      <img className="l-feat-img lv d3" src="/studio-media/706fe44e-e1c0-437c-a53f-ca2f8a0919dc.jpeg" alt="Customer segments" loading="lazy"/>
      <LandingDevice label="Customer groups in the demo store"><LandingGroupsMock/></LandingDevice>
    </div></section>
    <section className="l-feat"><div className="l-wrap">
      <p className="l-eyebrow lv">Check</p><h2 className="lv d1">Discounts that pay for themselves.</h2>
      <p className="l-lead lv d2">Before an offer goes out, see the return rate it needs to break even.</p>
      <div className="l-grid lv d3">{LANDING_GROUPS.map(([name, base]) => <div key={name}><b>{name}</b><span>{landingBreakEven(base) > 100 ? 'Cannot pay back' : landingBreakEven(base) + '% must return'}</span><small>if {base}% come back anyway</small></div>)}</div>
      <img className="l-feat-img lv d4" src="/studio-media/82bbb9e3-2268-4b95-9594-fe089092b753.jpeg" alt="Check before discount" loading="lazy"/>
      <p className="l-small lv d4">Example assumptions: {LANDING_DISCOUNT}% off, {LANDING_MARGIN}% gross margin. Your own figures replace them in the app.</p>
    </div></section>
    <section className="l-feat"><div className="l-wrap">
      <p className="l-eyebrow lv">Decide</p><h2 className="lv d1">AI checks your reasoning,<br/>not your numbers.</h2>
      <p className="l-lead lv d2">Every figure is calculated by rules you can read. AI only points to the assumption to verify first — and you make the call.</p>
      <img className="l-feat-img lv d3" src="/studio-media/08b530f6-ddaf-4aa4-b41e-6542411fd842.jpeg" alt="Decide and verify" loading="lazy"/>
      <LandingDevice label="A saved pending decision"><LandingDecisionMock/></LandingDevice>
      <div className="l-cta lv d3"><NavigationAction navigation={signupLink} className="l-pill l-big">Open demo workspace</NavigationAction><NavigationAction navigation={loginLink} className="l-more">About this preview ›</NavigationAction></div>
    </div></section>
    <section className="l-feat"><div className="l-wrap">
      <p className="l-eyebrow lv">Win back</p><h2 className="lv d1">Bring your regulars home.</h2>
      <img className="l-feat-img lv d3" src="/studio-media/08c64c26-a162-4637-912a-d127dd3009df.jpeg" alt="Win back regulars" loading="lazy"/>
    </div></section>
    <footer className="l-foot"><div className="l-wrap l-row"><span>{brand} · Student prototype, ENT207TC Digital Startup Lab</span><span>All demo figures are simulated.</span></div></footer>
  </div>;
}

const landingCss = `
.cp-landing{--bg:#07110f;--fg:#eef5f2;--mute:#a7b8b3;--mint:#5fd3ae;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;min-height:100dvh;line-height:1.5;overflow-x:hidden}
.cp-landing *{box-sizing:border-box}
.cp-landing a{color:inherit;text-decoration:none}
.cp-landing .l-wrap{max-width:1040px;margin:0 auto;padding:0 24px}
.cp-landing .l-row{display:flex;align-items:center;justify-content:space-between;gap:16px}
.cp-landing .l-nav{position:sticky;top:0;z-index:5;background:rgba(7,17,15,.62);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%)}
.cp-landing .l-nav .l-wrap{height:56px}
.cp-landing .l-brand{display:flex;align-items:center;gap:10px;font-weight:650;letter-spacing:-.01em}
.cp-landing .l-links{gap:22px;font-size:14px;color:var(--mute)}
.cp-landing .l-links a:hover,.cp-landing .l-link:hover{color:var(--fg)}
.cp-landing .l-pill{display:inline-flex;align-items:center;justify-content:center;background:var(--fg);color:var(--bg)!important;border-radius:999px;padding:7px 16px;font-weight:600;font-size:14px;transition:transform .1s ease-out,background .2s}
.cp-landing .l-pill:hover{background:#fff}
.cp-landing .l-pill:active{transform:scale(.97)}
.cp-landing .l-big{padding:12px 24px;font-size:16px}
.cp-landing .l-hero{position:relative;text-align:center;padding:120px 0 96px}
.cp-landing .l-glow{position:absolute;left:50%;top:-180px;width:1100px;height:720px;margin-left:-550px;background:radial-gradient(closest-side,rgba(62,201,160,.32),transparent 70%);transform:translate3d(0,var(--p,0px),0);pointer-events:none}
.cp-landing .l-eyebrow{color:var(--mint);font-weight:600;font-size:15px;margin:0}
.cp-landing h1{position:relative;font-size:clamp(44px,8vw,88px);line-height:1.02;letter-spacing:-.045em;margin:14px 0 20px;font-weight:700;background:linear-gradient(180deg,#fff 30%,#9fd9c6);-webkit-background-clip:text;background-clip:text;color:transparent}
.cp-landing h2{font-size:clamp(34px,5.4vw,60px);line-height:1.05;letter-spacing:-.035em;margin:10px 0 16px;font-weight:700}
.cp-landing .l-lead{position:relative;color:var(--mute);font-size:clamp(17px,2vw,21px);max-width:620px;margin:0 auto}
.cp-landing .l-cta{position:relative;display:flex;flex-wrap:wrap;gap:22px;justify-content:center;align-items:center;margin-top:34px}
.cp-landing .l-more{color:var(--mint)!important;font-weight:600;font-size:16px}
.cp-landing .l-hero-img{position:relative;display:block;max-width:720px;width:100%;margin:40px auto 0;border-radius:22px;border:1px solid rgba(255,255,255,.12);box-shadow:0 50px 120px -50px rgba(62,201,160,.5)}
.cp-landing .l-feat-img{position:relative;display:block;max-width:720px;width:100%;margin:40px auto 0;border-radius:18px;border:1px solid rgba(255,255,255,.1);box-shadow:0 40px 90px -45px rgba(62,201,160,.45)}
.cp-landing .l-glass{position:relative;max-width:460px;margin:64px auto 0;text-align:left;border-radius:22px;padding:22px 24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 40px 90px -40px rgba(62,201,160,.45)}
.cp-landing .l-small{color:var(--mute);font-size:14px;margin:0}
.cp-landing .l-small b{color:var(--fg)}
.cp-landing .l-verdict{font-size:34px;font-weight:700;letter-spacing:-.03em;color:var(--mint);margin:4px 0}
.cp-landing .l-bar{height:8px;border-radius:9px;background:rgba(255,255,255,.1);margin-top:14px;overflow:hidden}
.cp-landing .l-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#2fb38c,#7ae6c3);transform-origin:left;transform:scaleX(0);transition:transform 1.4s cubic-bezier(.2,.8,.2,1) .5s}
.cp-landing .l-glass.in .l-bar i{transform:scaleX(1)}
.cp-landing .l-feat{text-align:center;padding:88px 0;border-top:1px solid rgba(255,255,255,.06)}
.cp-landing .l-device{max-width:620px;margin:40px auto 0;border-radius:18px;background:#f6f7f3;color:#223b36;text-align:left;box-shadow:0 50px 120px -50px rgba(62,201,160,.55),0 0 0 1px rgba(255,255,255,.08);overflow:hidden}
.cp-landing .l-device.lv{transform:translateY(36px) scale(.94)}
.cp-landing .l-device.lv.in{transform:none}
.cp-landing .l-device-bar{display:flex;gap:6px;padding:10px 14px;background:#0c1715}
.cp-landing .l-device-bar i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.18)}
.cp-landing .l-device-body{padding:20px 22px 22px}
.cp-landing .l-mock{display:grid;gap:12px;font-size:14px}
.cp-landing .l-mock-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cp-landing .l-mock-kpis div{background:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 8px 20px -16px rgba(33,103,93,.5)}
.cp-landing .l-mock small{display:block;color:#5b6b67;font-size:12px}
.cp-landing .l-mock-kpis b{font-size:20px;letter-spacing:-.02em}
.cp-landing .l-mock-groups{display:grid;gap:8px;background:#fff;border-radius:12px;padding:12px 14px}
.cp-landing .l-mock-groups div{display:grid;grid-template-columns:86px 1fr 28px;align-items:center;gap:10px}
.cp-landing .l-mock-groups i{display:block;height:9px;border-radius:9px;background:#cfe3db;transform-origin:left;transform:scaleX(0);transition:transform 1.2s cubic-bezier(.2,.8,.2,1) .4s}
.cp-landing .l-device.in .l-mock-groups i{transform:scaleX(1)}
.cp-landing .l-mock-groups .hot i{background:#21675d}
.cp-landing .l-mock-groups .hot span,.cp-landing .l-mock-groups .hot b{color:#21675d;font-weight:700}
.cp-landing .l-mock-note,.cp-landing .l-mock-label{margin:0;color:#5b6b67;font-size:12px}
.cp-landing .l-mock-label{font-weight:700;color:#21675d;text-transform:uppercase;letter-spacing:.04em}
.cp-landing .l-mock-head{display:flex;justify-content:space-between;align-items:center}
.cp-landing .l-tag{background:#e3f1ec;color:#21675d;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700}
.cp-landing .l-mock h3{margin:0;font-size:17px;letter-spacing:-.01em}
.cp-landing .l-mock-row{display:flex;justify-content:space-between;background:#fff;border-radius:10px;padding:8px 12px}
.cp-landing .l-mock ol{margin:0;padding-left:18px;display:grid;gap:4px;color:#223b36}
.cp-landing .l-stat{font-size:clamp(72px,12vw,128px);font-weight:700;letter-spacing:-.05em;line-height:1;margin:40px 0 8px;background:linear-gradient(90deg,#fff,var(--mint));-webkit-background-clip:text;background-clip:text;color:transparent}
.cp-landing .l-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:720px;margin:44px auto 18px}
.cp-landing .l-grid div{display:flex;flex-direction:column;gap:4px;padding:22px 12px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
.cp-landing .l-grid b{font-size:15px;color:var(--mute);font-weight:600}
.cp-landing .l-grid span{font-size:24px;font-weight:700;letter-spacing:-.02em}
.cp-landing .l-grid small{color:var(--mute);font-size:12px}
.cp-landing .l-foot{padding:28px 0 40px;color:var(--mute);font-size:13px;border-top:1px solid rgba(255,255,255,.06)}
.cp-landing .lv{opacity:0;transform:translateY(28px);transition:opacity .9s cubic-bezier(.2,.8,.2,1),transform .9s cubic-bezier(.2,.8,.2,1)}
.cp-landing .lv.in{opacity:1;transform:none}
.cp-landing .d1{transition-delay:.1s}.cp-landing .d2{transition-delay:.2s}.cp-landing .d3{transition-delay:.3s}.cp-landing .d4{transition-delay:.42s}
@media (max-width:640px){.cp-landing .l-links a[href^="#"]{display:none}.cp-landing .l-hero{padding:80px 0 64px}.cp-landing .l-feat{padding:64px 0}.cp-landing .l-mock-kpis{grid-template-columns:1fr 1fr}.cp-landing .l-device-body{padding:16px}.cp-landing .l-grid{grid-template-columns:1fr}.cp-landing .l-foot .l-row{flex-direction:column;align-items:flex-start}}
@media (prefers-reduced-motion:reduce){.cp-landing .lv{transform:none;transition:opacity .2s}.cp-landing .l-glow{transform:none}.cp-landing .l-bar i{transition:none;transform:scaleX(1)}.cp-landing .l-device.lv{transform:none}.cp-landing .l-mock-groups i{transition:none;transform:scaleX(1)}}
@media (prefers-reduced-transparency:reduce){.cp-landing .l-nav{background:#07110f;backdrop-filter:none}.cp-landing .l-glass{background:#13211e;backdrop-filter:none}}
`;
// END V2 LANDING

export default function Block(){
  const brand=useTextSetting({name:'retail-brand',label:'Brand name',initialValue:'CP Retail'});
  const workspace=useNavigationSetting({name:'workspace-home',label:'Workspace page for signed-in users',initialValue:{destination:'/pixso-preview',openIn:'SELF'}});
  const navigate=useNavigation();
  const user=useCurrentUser();
  useEffect(()=>{if(user?.email)navigate(workspace);},[user?.email]);
  if(user?.email)return <div style={{padding:48,textAlign:'center',fontFamily:'system-ui'}}>Opening your workspace…</div>;
  return <div className="cp-landing-overlay" style={{position:'fixed',inset:0,zIndex:2147483000,overflowY:'auto',background:'#07110f'}}><Landing brand={brand}/></div>;
}
