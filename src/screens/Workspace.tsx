import { AssumptionSlider, OfferResponseChart, ScenarioComparisonChart } from '@/components/decision-charts';
import { BrandIcon, SidebarBrand } from '@/components/brand-logo';
import { LanguageContext, translate } from '@/i18n/language';
import { opsModel, opsRound } from '@/lib/scenario-math.mjs';
import React, { useState, useRef, useEffect } from '@/i18n/react';
import { BarChart3, LayoutDashboard, UploadCloud, Users, Sparkles, BookmarkCheck, ArrowRight, ArrowLeft, Download, CheckCircle2, ShieldCheck, Package, Search, Store, CalendarDays, RotateCcw, LogIn, Info, ChevronRight, AlertTriangle, DollarSign, Percent, ShoppingCart, Layers, HelpCircle, Menu, X, FileSpreadsheet, ClipboardCheck, Home, Target, ThumbsUp, ThumbsDown } from 'lucide-react';
import { NavigationAction } from '@/components/navigation-action';
import { useNavigationSetting, useTextSetting } from '@/lib/editable-settings';
import { datasource, q, useRecords, useRecord, useRecordCreate, useRecordUpdate, useLinkedRecords } from '@/lib/datasource';
import { workspaceHref, workspaceLocation } from '@/lib/routes.mjs';
import { useCurrentUser } from '@/lib/user';
import { advisorEnabled, cloudEnabled, wakeAdvisorReview as opsWakeCloud } from '@/lib/supabase-client';

const storageLabel = cloudEnabled ? 'Workspace storage' : 'Browser storage';
const saveDataLabel = cloudEnabled ? 'Save to my account' : 'Save in this browser';
const savedLocation = cloudEnabled ? 'to your account' : 'in this browser';

const ds = datasource.define({ scenarios: 'scenarios', decisions: 'decisions', aiRequests: 'aiRequests', datasets: 'datasets', feedback: 'feedback', advisorVotes: 'advisorVotes' });

const money = (n: number) => '฿' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const navItems = [ ['start', 'Start experience', Home], ['dashboard', 'Dashboard', LayoutDashboard], ['profiles', 'Customers', Users], ['recommendations', 'Compare actions', Sparkles], ['my-scenarios', 'Saved scenarios', Layers], ['my-decisions', 'Decision history', BookmarkCheck], ['test', 'Tasks & feedback', ClipboardCheck] ] as const;
const schemaRows = [ ['store_id','String','DEMO-A'], ['sku','String','SKU-9941-BEV'], ['transaction_id','String','TXN-001'], ['cust_hash','Synthetic ID','CUST-88319'], ['stock_on_hand','Integer ≥ 0','46'], ['units_sold','Integer ≥ 1','4'], ['unit_price','Currency (THB)','32.00'], ['timestamp','ISO 8601 date','2026-09-01T14:32:00+07:00'], ['unit_cost','Currency (THB)','21.00'] ];
const seeds = [
  {id:'SAMPLE-001',name:'Snack + drink deal — 5% discount',category:'Snacks & drinks',modeled:true,discount:5,units:1250,price:95,cost:62.51,stock:1350,note:'Trial the 5% offer after confirming stock. Estimated gross profit is ฿34,675; demand and cost inputs are illustrative.',status:'Example'},
  {id:'SAMPLE-002',name:'Dairy shelf-space review',category:'Dairy & Plant-Based',modeled:false,status:'Example'},
  {id:'SAMPLE-003',name:'Lapsed shopper return-visit offer',category:'Everyday essentials',modeled:false,status:'Example'},
  {id:'SAMPLE-004',name:'Beverage restock planning for a busy weekend',category:'Beverage & RTD',modeled:false,status:'Example'}
];
const sampleCsv = 'store_id,sku,transaction_id,cust_hash,stock_on_hand,units_sold,unit_price,timestamp,unit_cost\nDEMO-A,SKU-9941-BEV,TXN-001,CUST-88319,46,4,32.00,2026-09-01T14:32:00+07:00,21.00\n';
function download(name: string, content: string, mime='text/csv;charset=utf-8;') { const url=URL.createObjectURL(new Blob([content],{type:mime})); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
const css = `
.cp-retail{--navy:#002247;--blue:#004889;--cyan:#00a7ad;--ink:#092b50;--muted:#64717d;--line:#cbd5de;font-family:Inter,Arial,sans-serif;color:var(--ink);background:#f5f8fa;min-height:900px;font-size:17px;line-height:1.5;isolation:isolate}.cp-retail *{box-sizing:border-box}.cp-retail h1,.cp-retail h2,.cp-retail h3,.cp-retail p{margin:0}.cp-retail h1{font-size:27px;font-weight:700;line-height:1.3}.cp-retail h2{font-size:25px;font-weight:650;line-height:1.35}.cp-retail h3{font-size:19px;font-weight:650}.cp-retail button,.cp-retail input,.cp-retail select,.cp-retail textarea{font:inherit}.cp-retail button,.cp-retail a{touch-action:manipulation}.cp-retail button{cursor:pointer}.cp-retail button:disabled{cursor:not-allowed;opacity:.55}.cp-retail button:focus-visible,.cp-retail a:focus-visible,.cp-retail input:focus-visible,.cp-retail textarea:focus-visible,.cp-retail select:focus-visible{outline:3px solid #00b8bf;outline-offset:3px}.cp-retail .muted{color:var(--muted)}.cp-retail .small{font-size:15px}.cp-retail .eyebrow{font-size:14px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:650}.cp-retail .row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.cp-retail .between{justify-content:space-between}.cp-retail .stack{display:flex;flex-direction:column;gap:18px}.cp-retail .btn{display:inline-flex;justify-content:center;align-items:center;gap:9px;min-height:38px;padding:9px 15px;border:1px solid var(--line);border-radius:3px;background:transparent;color:var(--ink);text-decoration:none;font-size:15px;font-weight:600}.cp-retail .btn:hover{background:#e7f0f5}.cp-retail .btn.primary{background:var(--blue);color:#fff;border-color:var(--blue)}.cp-retail .btn.primary:hover{background:#003668}.cp-retail .btn.cyan{background:#c0f5f6;border-color:#9de3e6}.cp-retail .pill{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:14px;padding:2px 9px;border:1px solid var(--line);border-radius:20px;line-height:1.5}.cp-retail .pill.aqua{background:#c7f5f6;border-color:#60ced2;color:#00505b}.cp-retail .pill.green{background:#e5fbf0;border-color:#97dabb;color:#00865b}.cp-retail .pill.amber{background:#fff7e8;border-color:#f0cc82;color:#996000}.cp-retail .panel{border:1px solid var(--line);border-radius:4px;background:#f8fafc;padding:20px}.cp-retail .soft{background:#edf4f8}.cp-retail .notice{padding:15px 18px;border:1px solid #77d4d8;border-radius:3px;background:#eafafb;display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}.cp-retail .notice>div{min-width:180px}.cp-retail .notice.warn{background:#fff7e6;border-color:#f0d594}.cp-retail .iconbox{width:42px;height:42px;flex-shrink:0;background:#c8f5f6;display:grid;place-items:center;border-radius:4px;color:#005477}.cp-retail .app{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:1000px}.cp-retail .sidebar{background:var(--navy);color:#dce9f5;display:flex;flex-direction:column;min-width:0}.cp-retail .brand{display:flex;gap:12px;align-items:center;padding:24px 22px;border-bottom:1px solid #123958}.cp-retail .brand .iconbox{background:var(--cyan);color:#00324a;width:36px;height:36px}.cp-retail .side-nav{padding:22px 14px;display:flex;flex-direction:column;gap:7px}.cp-retail .side-nav .eyebrow{padding:0 10px 10px;color:#7893ab}.cp-retail .nav-button{display:flex;align-items:center;gap:11px;text-align:left;background:transparent;border:0;color:#d6e7f7;min-height:42px;border-radius:3px;padding:10px 12px;font-size:15px}.cp-retail .nav-button:hover{background:#07385e}.cp-retail .nav-button.active{background:var(--cyan);color:#001f3f;font-weight:650}.cp-retail .nav-badge{margin-left:auto;padding:1px 6px;border-radius:20px;background:#064270;font-size:14px;color:white}.cp-retail .insights{margin:0 16px;padding:14px;background:#f7fafc;border-radius:4px;color:var(--ink);font-size:14px;display:flex;flex-direction:column;gap:7px}.cp-retail .side-bottom{margin-top:auto;padding:20px 16px;border-top:1px solid #123958;display:flex;flex-direction:column;gap:16px}.cp-retail .side-bottom .btn{color:#cde8fa;border-color:#174469}.cp-retail .avatar{border-radius:50%;background:#07558a;color:white;width:31px;height:31px;display:grid;place-items:center;font-weight:650;flex-shrink:0}.cp-retail .workspace{min-width:0}.cp-retail .topbar{min-height:62px;padding:12px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:16px;justify-content:space-between;background:#f8fafc;font-size:15px}.cp-retail .content{padding:26px 24px 32px;display:flex;flex-direction:column;gap:23px;max-width:1600px;margin:auto}.cp-retail .page-head{display:flex;align-items:flex-start;gap:20px;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid var(--line)}.cp-retail .page-head p{margin-top:7px;max-width:680px;color:var(--muted);font-size:16px}.cp-retail .grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.cp-retail .grid-2>*,.cp-retail .grid-3>*,.cp-retail .grid-4>*,.cp-retail .scenario-layout>*,.cp-retail .decision-layout>*{min-width:0}.cp-retail .grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.cp-retail .grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.cp-retail .metrics .metric{padding:18px 14px;border-bottom:1px solid var(--line)}.cp-retail .metric .number{font-size:30px;font-weight:700;margin:10px 0 2px;line-height:1.25;letter-spacing:-.025em}.cp-retail .positive{color:#00976d}.cp-retail .negative{color:#c54242}.cp-retail .chart{height:255px;display:block;width:100%;margin-top:18px}.cp-retail .categories{display:flex;flex-direction:column;gap:19px;margin-top:30px}.cp-retail .bar-row{display:grid;grid-template-columns:92px 1fr;gap:9px;align-items:center;font-size:14px}.cp-retail .bar{height:29px;background:var(--blue);border-radius:0 4px 4px 0;color:white;display:flex;align-items:center;padding-left:9px}.cp-retail .table-wrap{overflow-x:auto;width:100%;border:1px solid var(--line);border-radius:3px}.cp-retail table{width:100%;border-collapse:collapse;text-align:left;font-size:15px;min-width:600px}.cp-retail th{font-weight:650;background:#edf3f7}.cp-retail th,.cp-retail td{padding:14px 12px;border-bottom:1px solid var(--line);vertical-align:top}.cp-retail tr:last-child td{border-bottom:0}.cp-retail .selected-cell{background:#e7f6f8;font-weight:650}.cp-retail .input{width:100%;background:#fff;border:1px solid var(--line);color:var(--ink);border-radius:3px;padding:9px 11px;min-height:38px}.cp-retail textarea.input{resize:vertical;min-height:90px}.cp-retail label{display:flex;flex-direction:column;gap:6px;font-size:15px;font-weight:600}.cp-retail .tabs{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:10px}.cp-retail .tab{border:1px solid transparent;background:transparent;color:var(--muted);padding:7px 10px;border-radius:3px;font-size:15px}.cp-retail .tab.active{background:var(--blue);color:white}.cp-retail .cohort-card{padding:20px 16px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:17px}.cp-retail .cohort-data{display:grid;grid-template-columns:repeat(3,1fr);background:#edf3f7;padding:10px 0;border:1px solid var(--line);border-radius:3px;text-align:center;font-size:14px}.cp-retail .cohort-data>div+div{border-left:1px solid var(--line)}.cp-retail .progress{height:5px;background:#e2e9ef;border-radius:3px;overflow:hidden;margin-top:7px}.cp-retail .progress span{display:block;height:100%;background:var(--blue)}.cp-retail .offer{padding:18px;border:1px solid var(--line);border-radius:4px;display:flex;flex-direction:column;gap:13px}.cp-retail .offer.selected{border-color:var(--blue);box-shadow:inset 0 3px 0 var(--blue)}.cp-retail .scenario-layout{display:grid;grid-template-columns:minmax(240px,.85fr) minmax(0,1.85fr);gap:20px}.cp-retail .decision-layout{display:grid;grid-template-columns:1.15fr 1fr;gap:20px}.cp-retail .decision-row{display:block;width:100%;padding:18px;text-align:left;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink)}.cp-retail .decision-row:hover,.cp-retail .decision-row.active{background:#e6f3f7}.cp-retail .decision-row.active{box-shadow:inset 3px 0 0 var(--blue)}.cp-retail .upload-box{border:2px dashed #bacbd7;padding:46px 22px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:15px;border-radius:4px}.cp-retail .login{min-height:860px;background:radial-gradient(ellipse at 90% 20%,#00546855,transparent 44%),radial-gradient(ellipse at 15% 85%,#00afba44,transparent 45%),linear-gradient(125deg,#061526,#122643 65%,#051426);color:#e7f1f8;position:relative;overflow:hidden}.cp-retail .network{position:absolute;inset:0;width:100%;height:100%;opacity:.45;pointer-events:none}.cp-retail .login-header,.cp-retail .login-footer{position:relative;padding:22px 34px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #537b8b44}.cp-retail .login-grid{position:relative;max-width:1200px;margin:0 auto;padding:60px 40px 70px;display:grid;grid-template-columns:1.25fr 1fr;gap:75px;align-items:center}.cp-retail .login h1{font-size:38px;max-width:540px;letter-spacing:-.035em;margin:20px 0 15px}.cp-retail .login-copy{font-size:18px;color:#b4cad8;max-width:510px}.cp-retail .login-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:38px}.cp-retail .login-stats>div{padding:16px;background:#03456d66;border:1px solid #308d9b66;border-radius:4px;font-size:15px}.cp-retail .login-card{background:#edf3f7;color:var(--ink);padding:25px;border:1px solid #adc6d4;border-radius:4px;display:flex;flex-direction:column;gap:18px}.cp-retail .role{display:flex;gap:9px;align-items:center;width:100%;text-align:left;background:#f9fbfd;border:1px solid var(--line);padding:11px;border-radius:3px;color:var(--ink)}.cp-retail .role:hover{background:#dff5f6;border-color:var(--cyan)}.cp-retail .role span:last-child{margin-left:auto;color:var(--blue);font-size:15px}.cp-retail .login-footer{border-top:1px solid #537b8b44;border-bottom:0;color:#a1bbcd;font-size:14px}.cp-retail .mobile-menu{display:none}.cp-retail .footer{padding-top:10px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}.cp-retail .empty{padding:36px;text-align:center;color:var(--muted)}.cp-retail .db-table{min-width:900px}.cp-retail .db-facts{margin:0}.cp-retail .db-facts>div{display:grid;grid-template-columns:1fr 1fr;gap:15px;padding:12px 0;border-bottom:1px solid var(--line)}.cp-retail .db-facts dt{color:var(--muted);font-size:15px}.cp-retail .db-facts dd{margin:0;font-size:16px;overflow-wrap:anywhere}

/* BEGIN OPS STYLES */
.cp-retail{font-family:'Segoe UI Variable Text','Segoe UI',Arial,sans-serif;--blue:#174e62;--cyan:#65c7c2;--ink:#203642;--muted:#64737d;--line:#d4dfe4;font-variant-numeric:tabular-nums}
.cp-retail .topbar,.cp-retail .panel{background:#fff}
.cp-retail h1{letter-spacing:-.025em}.cp-retail p{text-wrap:pretty}
.cp-retail .btn{transition:background .18s ease,border-color .18s ease,transform .18s ease;border-radius:4px}
.cp-retail .btn:active:not(:disabled){transform:translateY(1px)}
.cp-retail .pill{border-radius:4px}.cp-retail .nav-button.active{background:var(--cyan)}
.cp-retail .sidebar{position:sticky;top:0;height:100dvh;overflow-y:auto;align-self:start}
.cp-retail .ops{max-width:1190px;gap:28px}
.cp-retail .ops-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:1px solid var(--line);padding:4px 0 24px}
.cp-retail .ops-heading h1{font-size:34px;font-weight:650;line-height:1.15;max-width:26ch}
.cp-retail .ops-heading p{font-size:17px;color:var(--muted);margin-top:10px;max-width:62ch}
.cp-retail .ops-method{font-size:14px;color:#556e78;letter-spacing:.015em;display:inline-block;margin-bottom:9px}
.cp-retail .ops-note{font-size:16px;color:var(--muted);max-width:79ch;line-height:1.6}
.cp-retail .ops-config{padding:24px;background:#fff;border:1px solid var(--line);border-radius:6px;gap:24px}
.cp-retail .ops-config fieldset{border:0;padding:0;margin:0;min-width:0;gap:24px}
.cp-retail .ops-source{padding:16px 18px;background:#edf3f4;border-left:3px solid #6e9d9c;display:flex;flex-direction:column;gap:10px;border-radius:0 4px 4px 0}
.cp-retail .ops-form-note{max-width:85ch;font-size:15px;color:var(--muted);line-height:1.6}
.cp-retail .ops input,.cp-retail .ops select,.cp-retail .ops textarea{border-radius:4px;min-height:42px}
.cp-retail .ops-config label{font-weight:500;gap:8px}.cp-retail .ops-config .input{font-weight:400}
.cp-retail .ops-actions{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.cp-retail .ops-action{display:grid;grid-template-columns:32px minmax(0,1fr) 170px;gap:18px;padding:26px 0;border-bottom:1px solid var(--line)}
.cp-retail .ops-action.chosen{background:#edf5f4;box-shadow:inset 3px 0 #39776f;padding-left:16px;padding-right:16px}
.cp-retail .ops-action-index{font-size:15px;color:#81919a;padding-top:3px}
.cp-retail .ops-action h3{font-size:21px;font-weight:600;letter-spacing:-.012em;max-width:48ch}
.cp-retail .ops-action p{max-width:72ch;font-size:16px;line-height:1.6}
.cp-retail .ops-action-body{display:flex;flex-direction:column;gap:11px}
.cp-retail .ops-action-status{font-size:14px;font-weight:500;color:#49756c;margin-top:4px}
.cp-retail .ops-action-status.caution{color:#956b24}
.cp-retail .ops-action-side{display:flex;flex-direction:column;gap:14px;align-items:flex-end;justify-content:flex-start;text-align:right}
.cp-retail .ops-action-side strong{font-size:26px;font-weight:600;letter-spacing:-.025em}
.cp-retail .ops-action-side small{font-size:14px;color:var(--muted)}
.cp-retail .ops-action-facts{font-size:15px;color:var(--muted)}
.cp-retail .ops-action details{font-size:15px;color:var(--muted)}
.cp-retail .ops-action summary{cursor:pointer;color:#365863;font-weight:500;padding:3px 0}
.cp-retail .ops-action details ul{padding-left:18px;max-width:75ch;line-height:1.6;margin:8px 0 0}
.cp-retail .ops-action .btn{font-size:15px;white-space:normal}
.cp-retail .ops .db-table th:nth-child(n+4),.cp-retail .ops .db-table td:nth-child(n+4){text-align:right}
.cp-retail .ops .db-table td{line-height:1.5;padding-top:18px;padding-bottom:18px}
.cp-retail .ops-save{background:#fff;border:1px solid var(--line);border-top:3px solid #3c746f;border-radius:0 0 6px 6px;padding:24px;display:flex;flex-direction:column;gap:18px}
.cp-retail .ops-saved-steps{font-size:15px;color:var(--muted);letter-spacing:.01em}
.cp-retail .ops-steps{display:flex;flex-wrap:wrap;gap:10px 24px;padding-bottom:16px;border-bottom:1px solid var(--line);font-size:15px;color:var(--muted)}
.cp-retail .ops-steps .current{font-weight:600;color:var(--ink)}
.cp-retail .ops-section-heading{display:flex;gap:13px;align-items:baseline}.cp-retail .ops-section-heading>span{font-size:15px;color:#71878e}.cp-retail .ops-section-heading h2{font-size:24px;font-weight:600;letter-spacing:-.015em}
.cp-retail .ops-config label small{font-weight:400;font-size:14px;line-height:1.5;color:var(--muted)}
.cp-retail .ops-diagnosis{border-left:3px solid #a67b3e;background:#faf8f3;padding:18px 20px}.cp-retail .ops-diagnosis h3{font-size:18px;margin-bottom:10px}
.cp-retail .ops-diagnosis ul{list-style:none;padding:0;margin:0}.cp-retail .ops-diagnosis li{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #e5dfd1}.cp-retail .ops-diagnosis li:last-child{border-bottom:0}.cp-retail .ops-diagnosis strong{font-size:16px;font-weight:600}.cp-retail .ops-diagnosis p{font-size:15px;line-height:1.6;max-width:72ch;margin-top:5px}.cp-retail .ops-diagnosis li.info{color:#536c76}.cp-retail .ops-diagnosis li.error strong{color:#953f24}
.cp-retail .ops-text-action{border:0;padding:3px 0;background:transparent;color:#20596b;text-align:left;font-size:15px;line-height:1.5;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex-shrink:0}.cp-retail .ops-text-action:hover{text-decoration:underline}.cp-retail .ops-text-action:focus-visible{outline:2px solid #287e8d;outline-offset:4px}
.cp-retail .ops-next-step{padding-top:12px;border-top:1px solid #d9cfba;color:#5a4c32}
.cp-retail .ops-demand{display:flex;flex-direction:column;gap:12px;padding-top:20px;border-top:1px solid var(--line)}
.cp-retail .ops-calculation{font-size:15px;color:var(--muted)}.cp-retail .ops-calculation summary{cursor:pointer;color:#365863}.cp-retail .ops-calculation p{margin-top:10px;max-width:80ch;line-height:1.6}
.cp-retail .ops-generate{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.cp-retail .ops-generate>span{font-size:14px;line-height:1.6;color:var(--muted);max-width:50ch}
.cp-retail .ops-results{gap:23px;scroll-margin-top:24px}.cp-retail .ops-results:focus{outline:none}
.cp-retail .ops-deltas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:6px 0}.cp-retail .ops-deltas div{border-top:1px solid var(--line);padding-top:9px}.cp-retail .ops-deltas dt{font-size:14px;color:var(--muted);line-height:1.5}.cp-retail .ops-deltas dd{font-size:17px;font-weight:600;margin:5px 0 0;line-height:1.5}
.cp-retail .ops-tradeoff{color:#475f66}.cp-retail .ops-blockers{padding:10px 10px 10px 26px;margin:0;background:#faf2e8;color:#80551e;font-size:15px;line-height:1.6}
.cp-retail .ops-assumption-changes{display:flex;flex-wrap:wrap;gap:8px 20px;border-left:3px solid #53847c;padding:13px 18px;background:#edf5f3;font-size:15px}.cp-retail .ops-assumption-changes strong,.cp-retail .ops-assumption-changes small{flex-basis:100%}.cp-retail .ops-assumption-changes small{font-size:14px;color:var(--muted)}
.cp-retail .ops-no-plan{border:1px solid #d2b78f;padding:18px;display:flex;flex-direction:column;gap:10px;background:#faf7f0}.cp-retail .ops-no-plan p{font-size:16px;line-height:1.6}.cp-retail .ops-no-plan .btn{align-self:flex-start}
.cp-retail .ops-keep-original{display:flex;flex-direction:column;gap:10px;padding:18px 20px;border-left:3px solid #60867e;background:#edf5f3}.cp-retail .ops-keep-original h3{font-size:18px}.cp-retail .ops-keep-original p{font-size:16px;line-height:1.6;max-width:78ch}.cp-retail .ops-keep-original .btn{align-self:flex-start}
.cp-retail .ops-table-delta{font-size:14px;color:#516d76;margin-top:6px}.cp-retail .ops-save{scroll-margin-top:24px}
.cp-retail .ops-evidence{display:flex;flex-direction:column;gap:10px;padding:18px 20px;border-left:3px solid #53847c;background:#edf5f3}.cp-retail .ops-evidence p{line-height:1.6}.cp-retail .ops-evidence details{font-size:15px}.cp-retail .ops-evidence summary{cursor:pointer;font-weight:600;color:#365863}.cp-retail .ops-evidence ul{padding-left:20px;line-height:1.6}
@media(max-width:950px){.cp-retail .ops-action{grid-template-columns:24px minmax(0,1fr);gap:12px}.cp-retail .ops-action-side{grid-column:2;flex-direction:row;justify-content:space-between;align-items:center;text-align:left}.cp-retail .ops-action-side strong{font-size:22px}.cp-retail .ops .grid-3{grid-template-columns:repeat(2,minmax(0,1fr))}.cp-retail .ops-heading{flex-wrap:wrap}.cp-retail .ops-heading h1{font-size:30px}}
@media(max-width:700px){.cp-retail .sidebar{position:static;height:auto;overflow:visible}.cp-retail .ops{gap:23px}.cp-retail .ops-config,.cp-retail .ops-save{padding:18px}.cp-retail .ops .grid-3{grid-template-columns:1fr}.cp-retail .ops-action{padding:23px 0}.cp-retail .ops-action-side{flex-wrap:wrap}.cp-retail .ops-heading h1{font-size:29px}.cp-retail .ops-action.chosen{padding-left:10px;padding-right:10px}}
@media(prefers-reduced-motion:reduce){.cp-retail .btn{transition:none}.cp-retail .btn:active{transform:none}}
.cp-retail .ops-ai{display:flex;flex-direction:column;gap:15px;border-top:2px solid #66877e;border-bottom:1px solid var(--line);padding:22px 0 25px;scroll-margin-top:24px}.cp-retail .ops-ai-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}.cp-retail .ops-ai-heading h3{font-size:22px;margin-top:5px;letter-spacing:-.02em}.cp-retail .ops-ai-status{font-size:14px;color:#496c64;padding:5px 0}.cp-retail .ops-ai-intro{max-width:72ch;color:#516770;font-size:16px;line-height:1.7}.cp-retail .ops-ai-answer{border-left:3px solid #66877e;padding:16px 20px;background:#edf5f3;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;font-size:16px;max-width:85ch}.cp-retail .ops-ai-wait{display:flex;flex-direction:column;gap:12px;max-width:72ch;font-size:16px;color:#516770;line-height:1.7}.cp-retail .ops-ai-line{display:block;height:5px;background:linear-gradient(90deg,#c4d9d1 0%,#e4ece8 70%);width:72%;border-radius:2px}.cp-retail .ops-ai-context{font-size:15px;color:#526974}.cp-retail .ops-ai-context summary{cursor:pointer}.cp-retail .ops-ai-context pre{max-height:280px;overflow:auto;margin:12px 0 0;padding:14px;background:#eef3f5;border:1px solid var(--line);font-size:14px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.cp-retail .ops-ai-captured{border-top:1px solid #c9dad5;padding-top:12px}.cp-retail .ops-ai-captured p{white-space:pre-wrap;overflow-wrap:anywhere}
@media(max-width:700px){.cp-retail .ops-ai{padding:20px 0}.cp-retail .ops-ai-answer{padding:14px 16px}.cp-retail .ops-ai-heading{gap:8px}.cp-retail .ops-ai .row{align-items:stretch}.cp-retail .ops-ai .btn{width:100%}}
@media(max-width:700px){.cp-retail .ops-diagnosis{padding:16px}.cp-retail .ops-diagnosis li{flex-direction:column;gap:7px}.cp-retail .ops-steps{gap:10px 16px}.cp-retail .ops-deltas{grid-template-columns:1fr;gap:8px}.cp-retail .ops-deltas div{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.cp-retail .ops-deltas dd{font-size:16px;text-align:right}.cp-retail .ops-evidence{padding:16px}.cp-retail .ops-section-heading h2{font-size:21px}}
.ops-readiness{margin:16px 0}.ops-readiness-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:12px}.ops-readiness-grid article{border:1px solid #dce4de;border-radius:10px;padding:14px;background:#f7faf7}.ops-readiness-grid h4{font-size:17px;margin:0 0 8px}.ops-readiness-grid p{font-size:16px;line-height:1.6;margin:7px 0}.ops-ai-answer{white-space:pre-wrap}

/* END OPS STYLES */
@media(min-width:1450px){.cp-retail .content{padding:30px}.cp-retail .app{grid-template-columns:250px minmax(0,1fr)}}
@media(max-width:1100px){.cp-retail .app{grid-template-columns:205px minmax(0,1fr)}.cp-retail .grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}.cp-retail .grid-3{grid-template-columns:1fr}.cp-retail .scenario-layout,.cp-retail .decision-layout{grid-template-columns:1fr}.cp-retail .login-grid{gap:28px;padding:40px 25px}.cp-retail .login h1{font-size:36px}.cp-retail .top-meta{display:none}.cp-retail .page-head{flex-wrap:wrap}}
@media(max-width:700px){.cp-retail{min-height:100vh}.cp-retail .app{display:block;min-height:100vh}.cp-retail .sidebar{display:none}.cp-retail .sidebar.open{display:flex}.cp-retail .sidebar.open .side-bottom,.cp-retail .sidebar.open .insights{display:none}.cp-retail .brand{padding:15px}.cp-retail .side-nav{padding:10px 14px}.cp-retail .mobile-menu{display:inline-flex}.cp-retail .content{padding:20px 14px;gap:20px}.cp-retail .topbar{padding:12px 14px;gap:9px}.cp-retail .breadcrumb{font-size:14px;min-width:0;flex:1}.cp-retail .topbar>.row{min-width:0;flex:1}.cp-retail .topbar>.btn .small{display:none}.cp-retail .grid-2,.cp-retail .grid-4{grid-template-columns:1fr}.cp-retail .metrics{grid-template-columns:1fr 1fr}.cp-retail .metric .number{font-size:26px}.cp-retail .panel{padding:16px}.cp-retail .login-grid{grid-template-columns:1fr;padding:35px 20px;gap:35px}.cp-retail .login-header{padding:18px 20px}.cp-retail .login h1{font-size:36px}.cp-retail .login-stats{gap:8px;margin-top:25px}.cp-retail .login-stats>div{padding:10px;font-size:14px}.cp-retail .login-footer{padding:18px 20px}.cp-retail h1{font-size:25px}.cp-retail h2{font-size:22px}.cp-retail .page-head .btn{font-size:14px}.cp-retail .notice{padding:13px}.cp-retail .chart{height:220px}.cp-retail .btn{min-height:42px}}
/* BEGIN AWARD UI */
/* CP Retail workspace: quiet chrome, clear task order, readable data. */
.cp-retail{--navy:#163f3b;--blue:#21675d;--cyan:#dcece6;--ink:#223b36;--muted:#63716b;--line:#dce3de;background:#f6f7f3;font-family:'Segoe UI Variable Text','Segoe UI',Arial,sans-serif;font-size:17px;line-height:1.55;font-variant-numeric:tabular-nums}
.cp-retail h1{font-size:36px;font-weight:650;letter-spacing:-.035em;line-height:1.18;text-wrap:balance;overflow-wrap:anywhere}
.cp-retail h2{font-size:24px;font-weight:600;letter-spacing:-.018em}.cp-retail h3{font-size:18px;font-weight:600;letter-spacing:-.01em}
.cp-retail .small{font-size:15px;line-height:1.6}.cp-retail .eyebrow{font-size:14px;letter-spacing:.07em}
.cp-retail .app{grid-template-columns:218px minmax(0,1fr);min-height:100dvh}
.cp-retail .sidebar{background:#edf0e9;color:var(--ink);border-right:1px solid var(--line);height:100dvh;position:sticky;top:0}
.cp-retail .brand{padding:25px 20px;border:0;gap:11px}.cp-retail .brand strong{font-size:20px;letter-spacing:-.03em}
.cp-retail .brand .iconbox{background:var(--blue);color:#fff;width:34px;height:34px;border-radius:9px}.cp-retail .brand-mode{display:none}.cp-retail .brand-subtitle{font-size:14px;color:var(--muted);margin-top:2px}
.cp-retail .side-nav{padding:20px 12px;gap:5px}.cp-retail .side-nav .eyebrow{padding:0 12px 9px;color:#6a786e;font-weight:500}
.cp-retail .nav-button{width:100%;color:#53625b;min-height:45px;padding:11px 12px;font-size:16px;gap:10px;border-radius:7px;transition:background .15s ease,color .15s ease}
.cp-retail .nav-button svg{flex-shrink:0;stroke-width:1.7}.cp-retail .nav-button:hover{background:#e1e8df;color:var(--ink)}
.cp-retail .nav-button.active{background:#d8e7dc;color:#1f5e4e;font-weight:650;box-shadow:none}.cp-retail .nav-current-dot{margin-left:auto;width:6px;height:6px;background:#39755d;border-radius:50%;flex-shrink:0}
.cp-retail .nav-examples{margin-top:24px;padding:17px 0 0;border-top:1px solid #d8e0d6}.cp-retail .nav-examples summary{padding:5px 10px;color:#667568;font-size:15px;cursor:pointer}.cp-retail .nav-examples .nav-button{font-size:15px;min-height:39px}.cp-retail .nav-example-note{font-size:14px;color:var(--muted);padding:8px 12px}
.cp-retail .workspace-note{display:flex;gap:9px;margin:24px 10px 0;padding-top:17px;border-top:1px solid #d8e0d6;font-size:14px;color:#647465}.cp-retail .workspace-note strong{font-weight:500;color:#4b6352}.cp-retail .workspace-note p{line-height:1.7;margin-top:5px}.cp-retail .workspace-note-dot{height:6px;width:6px;border-radius:50%;background:#6c8d73;margin-top:5px;flex-shrink:0}
.cp-retail .side-bottom{border-top:1px solid var(--line);padding:18px 16px;gap:15px}.cp-retail .side-bottom .btn{border-color:transparent;color:#586b60;font-weight:500;justify-content:flex-start;padding:8px 0;font-size:15px}.cp-retail .side-bottom .btn:hover{background:transparent;color:#214e3b}.cp-retail .avatar{background:#d3dfd3;color:#294c39;border-radius:9px}.cp-retail .side-bottom .row p{color:var(--muted)!important}
.cp-retail .topbar{background:#fafbf8;min-height:58px;padding:12px 30px;border-color:#e4e8e1}.cp-retail .breadcrumb{font-size:15px}.cp-retail .breadcrumb strong{color:var(--ink)!important;font-weight:500}.cp-retail .top-meta{font-size:14px}.cp-retail .top-meta>.row{display:none}
.cp-retail .content{max-width:1400px;padding:34px 30px 32px;gap:28px;outline:none}.cp-retail .stack{gap:20px}.cp-retail .page-head{padding-bottom:23px;gap:22px;border-color:var(--line)}.cp-retail .page-head p{font-size:17px;max-width:62ch;line-height:1.65}.cp-retail .page-head>.row{gap:8px}.cp-retail .page-head .stack{flex:1}
.cp-retail .btn{font-size:15px;font-weight:600;min-height:40px;border-radius:6px;padding:10px 15px;background:#fff;border-color:#cdd8ce;color:#345447;box-shadow:0 1px 1px #263e2910;white-space:normal}
.cp-retail .btn:hover{background:#eef4ec;border-color:#a8bda8}.cp-retail .btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}.cp-retail .btn.primary:hover{background:#174f47;border-color:#174f47}.cp-retail .btn:disabled{opacity:.5;box-shadow:none}
.cp-retail button:focus-visible,.cp-retail a:focus-visible,.cp-retail input:focus-visible,.cp-retail textarea:focus-visible,.cp-retail select:focus-visible,.cp-retail summary:focus-visible,.cp-retail .table-wrap:focus-visible{outline:3px solid #438a72;outline-offset:3px}
.cp-retail .pill{font-size:14px;font-weight:500;padding:3px 8px;border-radius:4px;border:0;background:#ebeee8;color:#556453;white-space:normal}.cp-retail .pill.green,.cp-retail .pill.aqua{background:#e7f0e8;color:#3c6650}.cp-retail .pill.amber{background:#f7edda;color:#876320}
.cp-retail .panel{background:#fff;border:1px solid #e0e6dd;border-radius:9px;padding:24px;box-shadow:none}.cp-retail .soft{background:#f4f6f0}.cp-retail .notice{border:1px solid #dae5d7;background:#eef4eb;color:#456247;border-radius:6px;padding:14px 16px;font-size:16px;gap:10px}.cp-retail .notice.warn{background:#fcf5e7;border-color:#eadbb7;color:#796130}.cp-retail .notice>svg{flex-shrink:0;margin-top:2px}
.cp-retail label{font-size:15px;font-weight:600;gap:8px;color:#42594c}.cp-retail .input{border-color:#cbd7cc;border-radius:6px;background:#fff;min-height:43px;padding:10px 12px;color:#293f33;font-size:17px;font-weight:400;box-shadow:0 1px 2px #29472b06}.cp-retail .input::placeholder{color:#829083}.cp-retail .input:disabled{background:#f3f5ef;color:#849081}.cp-retail textarea.input{min-height:108px;line-height:1.65}
.cp-retail .grid-2{gap:24px}.cp-retail .grid-3,.cp-retail .grid-4{gap:18px}.cp-retail .metrics{gap:0;border:1px solid var(--line);background:#fff;border-radius:9px;overflow:hidden}.cp-retail .metrics .metric{padding:22px 20px;border-bottom:0}.cp-retail .metrics .metric+.metric{border-left:1px solid var(--line)}.cp-retail .metric .eyebrow{text-transform:none;letter-spacing:0;font-size:15px;font-weight:500}.cp-retail .metric svg{color:#8c9c8b;width:15px}.cp-retail .metric .number{font-size:32px;font-weight:600;letter-spacing:-.04em;margin-top:16px}.cp-retail .metric .small{font-size:14px;max-width:26ch}
.cp-retail .table-wrap{border:1px solid #dfe5dc;border-radius:8px;background:#fff}.cp-retail table{font-size:16px}.cp-retail th{background:#f0f3eb;font-weight:600;font-size:14px;color:#52634e;letter-spacing:.015em}.cp-retail th,.cp-retail td{padding:16px;border-bottom-color:#e5e9e1;line-height:1.55}.cp-retail tbody tr:hover{background:#f8faf5}.cp-retail .selected-cell{background:#edf5e9;font-weight:500}.cp-retail .db-table td strong{font-weight:600}.cp-retail .scenario-table{min-width:820px}.cp-retail .scenario-table th:first-child{width:30%}.cp-retail .scenario-table td:first-child{max-width:290px;overflow-wrap:anywhere}.cp-retail .scenario-table td:nth-child(3),.cp-retail .scenario-table td:nth-child(4){font-weight:600;white-space:nowrap;text-align:right}.cp-retail .scenario-table th:nth-child(3),.cp-retail .scenario-table th:nth-child(4){text-align:right}.cp-retail .scenario-table td:last-child .btn{border:0;box-shadow:none;padding:5px 8px;min-height:32px;background:transparent;font-size:15px}
.cp-retail .data-note{font-size:15px;color:var(--muted);line-height:1.65}.cp-retail .data-note summary{cursor:pointer;color:#4e6753;width:fit-content}.cp-retail .data-note p{padding-top:10px;max-width:75ch}.cp-retail .scenario-record-heading>h1{max-width:35ch;font-size:32px}.cp-retail .scenario-create-form{max-width:1040px}.cp-retail .scenario-create-form .grid-2{gap:24px 30px}.cp-retail .db-facts>div{padding:13px 0;border-bottom-color:#e3e8df}.cp-retail .db-facts dd{font-weight:500}
.cp-retail .decision-row{padding:20px;background:#fff}.cp-retail .decision-row:hover{background:#f4f7ef}.cp-retail .decision-row.active{background:#eaf1e4;box-shadow:inset 3px 0 #4a7654}.cp-retail .tabs{gap:8px;border:0}.cp-retail .tab{background:#edf1e8;border-radius:5px;padding:8px 14px;font-weight:500}.cp-retail .tab.active{background:#dce9d6;color:#34553d}
.cp-retail .footer{font-size:14px;margin-top:14px;border-color:#e1e6dc}.cp-retail .footer .btn{background:transparent;border:0;box-shadow:none}.cp-retail .skip-link{position:absolute;top:8px;left:230px;transform:translateY(-180%);padding:10px 16px;background:#fff;color:#244d39;z-index:3;border:1px solid #21675d;border-radius:5px}.cp-retail .skip-link:focus{transform:none}
/* One working surface: source context on the left, editable assumptions on the right. */
.cp-retail .ops{max-width:none;gap:26px}.cp-retail .ops-heading{padding:0 0 25px;gap:24px;align-items:center}.cp-retail .ops-heading h1{font-size:37px;font-weight:600;max-width:30ch;letter-spacing:-.04em}.cp-retail .ops-heading p{margin-top:12px;font-size:17px;max-width:60ch}.cp-retail .ops-method{font-size:14px;color:#6e806e;letter-spacing:.035em;margin-bottom:10px}.cp-retail .ops-heading>.btn{flex-shrink:0}
.cp-retail .ops-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;border:0;padding:0}.cp-retail .ops-steps>button{display:flex;align-items:center;gap:9px;text-align:left;border:0;border-bottom:2px solid #e1e6db;border-radius:0;background:transparent;color:#6d7c68;font-size:15px;padding:0 8px 14px 0;min-height:40px;line-height:1.45}.cp-retail .ops-steps>button>span{font-size:14px;border:1px solid #d0dbca;border-radius:50%;height:23px;width:23px;display:grid;place-items:center;flex-shrink:0}.cp-retail .ops-steps>button.current{color:#345c40;border-color:#477a53;font-weight:600}.cp-retail .ops-steps>button.current>span{background:#dfead7;border-color:#c5d9b9}.cp-retail .ops-steps>button:disabled{opacity:.48}.cp-retail .ops-steps>button:hover:not(:disabled){color:#1e5839;border-bottom-color:#7f9c71}
.cp-retail .ops-config{padding:0;border:1px solid #dbe3d5;background:#fff;border-radius:10px;overflow:visible}.cp-retail .ops-config .ops-config-grid{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(0,1.45fr);gap:0;padding:0;margin:0;border:0;min-width:0}
.cp-retail .ops-review{background:#f3f6ee;border-right:1px solid #e0e7d9;padding:25px 24px;border-radius:10px 0 0 10px;gap:22px}.cp-retail .ops-assumptions{padding:25px 28px;gap:22px}.cp-retail .ops-review,.cp-retail .ops-assumptions{min-width:0;scroll-margin-top:24px;outline:none}.cp-retail .ops-section-heading{gap:10px;align-items:center}.cp-retail .ops-section-heading>span{font-size:14px;letter-spacing:.03em;color:#809274}.cp-retail .ops-section-heading h2{font-size:21px;font-weight:600;color:#334e36}.cp-retail .ops-form-note{font-size:15px;line-height:1.65;max-width:65ch}
.cp-retail .ops-source{padding:18px 0;border:0;border-top:1px solid #dbe4d2;border-bottom:1px solid #dbe4d2;border-radius:0;background:transparent;gap:16px}.cp-retail .ops-source strong{font-size:18px}.cp-retail .ops-source-facts{margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.cp-retail .ops-source-facts dt{font-size:14px;color:#74816c}.cp-retail .ops-source-facts dd{margin:4px 0 0;font-size:20px;font-weight:600;letter-spacing:-.02em}
.cp-retail .ops-diagnosis{padding:0;background:transparent;border:0}.cp-retail .ops-diagnosis h3{font-size:17px;margin-bottom:6px}.cp-retail .ops-diagnosis li{flex-direction:column;gap:7px;padding:14px 0;border-color:#e0e6d7}.cp-retail .ops-diagnosis strong{font-size:15px;color:#5f684b}.cp-retail .ops-diagnosis li.error strong{color:#8b5836}.cp-retail .ops-diagnosis p{font-size:15px;line-height:1.65;color:#6d7564}.cp-retail .ops-diagnosis li.info strong{color:#4f6653}.cp-retail .ops-next-step{border-color:#dbe3d0;font-size:15px}.cp-retail .ops-text-action{color:#346b4c;font-size:15px}
.cp-retail .ops-start-note{color:#6c7b61;display:flex;flex-direction:column;gap:12px;padding:20px 0;max-width:27ch}.cp-retail .ops-start-note h3{font-size:18px;color:#516b49}.cp-retail .ops-start-note p{font-size:16px;line-height:1.7}
.cp-retail .ops-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:21px 20px}.cp-retail .ops-field-wide{grid-column:1/-1}.cp-retail .ops-config label{font-size:15px;font-weight:600;line-height:1.5;min-width:0}.cp-retail .ops-config .input{font-size:17px;min-width:0;border-radius:6px}.cp-retail .ops-config label small{font-size:14px;line-height:1.6}.cp-retail .ops-demand{gap:13px;border-color:#e2e7dc;padding-top:22px}.cp-retail .ops-demand h3{font-size:18px}.cp-retail .ops-demand .grid-3{grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.cp-retail .ops-calculation{font-size:15px;padding-top:2px}.cp-retail .ops-generate{padding-top:16px;border-top:1px solid #e2e8dc;gap:12px;align-items:flex-start}.cp-retail .ops-generate .btn{width:100%;min-height:45px;justify-content:space-between}.cp-retail .ops-generate>span{font-size:14px;max-width:none}
.cp-retail .ops-results{gap:23px;margin-top:12px}.cp-retail .ops-results-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-top:9px}.cp-retail .ops-results-heading h2{font-size:29px;font-weight:600}.cp-retail .ops-results-heading .small{margin-top:7px}.cp-retail .ops-note{font-size:16px;max-width:82ch;color:#63725f}
.cp-retail .ops-actions{border:1px solid #dae3d3;border-radius:9px;overflow:hidden;background:#fff}.cp-retail .ops-action{grid-template-columns:30px minmax(0,1fr) 170px;padding:26px 24px;gap:16px;border-color:#e1e7da}.cp-retail .ops-action:last-child{border-bottom:0}.cp-retail .ops-action.chosen{background:#eff6e9;box-shadow:inset 3px 0 #507847;padding:26px 24px}.cp-retail .ops-action-index{color:#8c9c80;font-size:14px}.cp-retail .ops-action h3{font-size:21px;font-weight:600;letter-spacing:-.02em}.cp-retail .ops-action-status{color:#55724c;font-size:14px!important;margin-top:5px}.cp-retail .ops-action-status.caution{color:#8b6f35}.cp-retail .ops-action p{font-size:16px;line-height:1.7}.cp-retail .ops-action-side{gap:18px}.cp-retail .ops-action-side strong{font-size:28px;font-weight:600;color:#355237}.cp-retail .ops-action-side .btn{font-size:15px}.cp-retail .ops-action-body{gap:14px}.cp-retail .ops-deltas{gap:14px;margin:4px 0}.cp-retail .ops-deltas div{border-color:#e0e8d8;padding-top:12px}.cp-retail .ops-deltas dd{font-size:18px;color:#3b593a}.cp-retail .ops-blockers{background:#faf3e6;color:#806131;border-radius:5px;padding:12px 12px 12px 29px}.cp-retail .ops-action details{border-top:1px solid #e7ebdf;padding-top:10px}.cp-retail .ops-tradeoff{color:#66745f}
.cp-retail .ops-ai-disclosure{border:1px solid #dce4d5;border-radius:8px;background:#f1f5eb;padding:0 20px}.cp-retail .ops-ai-disclosure>summary{font-size:17px;font-weight:600;color:#476540;padding:18px 0;cursor:pointer}.cp-retail .ops-ai-disclosure>summary small{font-size:14px;font-weight:400;margin-left:14px;color:#6b7d61}.cp-retail .ops-ai-disclosure .ops-ai{border-top:1px solid #dae4d0;border-bottom:0;padding:20px 0 24px}.cp-retail .ops-ai-heading h3{font-size:20px}.cp-retail .ops-ai-answer{background:#fff;border:1px solid #dfe8d5;border-radius:6px;padding:20px;font-size:16px;max-width:none;line-height:1.9}.cp-retail .ops-ai-status{color:#416a40}.cp-retail .ops-ai-intro{font-size:16px}.cp-retail .ops-ai-line{background:#d6e3cc}.cp-retail .ops-ai-context pre{background:#f7f9f2;border-color:#d9e3d1}
.cp-retail .ops-full-comparison{gap:15px}.cp-retail .ops-full-comparison h2{font-size:24px}.cp-retail .ops .db-table{min-width:860px}.cp-retail .ops .db-table th:first-child{width:28%}.cp-retail .ops .db-table td:first-child{max-width:245px}.cp-retail .ops-table-delta{color:#708263}.cp-retail .ops-save{padding:28px;border:1px solid #b7cda9;border-top:3px solid #567f46;border-radius:8px;background:#fbfdf8;gap:20px}.cp-retail .ops-save .btn{align-self:flex-start}.cp-retail .ops-evidence,.cp-retail .ops-assumption-changes,.cp-retail .ops-keep-original{background:#edf4e6;border-color:#7f9e68;border-radius:4px}.cp-retail .ops-evidence summary{color:#4b6a3e}.cp-retail .ops-evidence{padding:20px}.cp-retail .ops-no-plan{border-radius:7px}
@media(min-width:1101px){.cp-retail .decision-layout{grid-template-columns:minmax(270px,.8fr) minmax(0,1.4fr)}}
@media(min-width:1500px){.cp-retail .content{padding:40px 44px}.cp-retail .ops-config .ops-config-grid{grid-template-columns:330px minmax(0,1fr)}.cp-retail .ops-assumptions{padding:30px 36px}.cp-retail .ops-review{padding:30px}}
@media(max-width:1100px){.cp-retail .app{grid-template-columns:195px minmax(0,1fr)}.cp-retail .content{padding:28px 22px}.cp-retail .topbar{padding:12px 22px}.cp-retail .ops-heading{align-items:flex-start;flex-wrap:wrap}.cp-retail .ops-config .ops-config-grid{grid-template-columns:minmax(225px,.8fr) minmax(0,1.3fr)}.cp-retail .ops-review{padding:22px 18px}.cp-retail .ops-assumptions{padding:22px}.cp-retail .ops-demand .grid-3{grid-template-columns:1fr}.cp-retail .ops-action{grid-template-columns:24px minmax(0,1fr)}.cp-retail .ops-action-side{grid-column:2;flex-direction:row;justify-content:space-between;align-items:center;text-align:left}.cp-retail .ops-steps>button{font-size:14px;gap:6px}.cp-retail .nav-button{font-size:15px;gap:8px}.cp-retail .metrics .metric:nth-child(3){border-left:0}.cp-retail .metrics .metric:nth-child(n+3){border-top:1px solid var(--line)}}
@media(max-width:900px){.cp-retail .ops-config .ops-config-grid{grid-template-columns:1fr}.cp-retail .ops-review{border-right:0;border-bottom:1px solid var(--line);border-radius:10px 10px 0 0}.cp-retail .ops-source-facts{grid-template-columns:repeat(4,minmax(0,1fr))}.cp-retail .ops-diagnosis li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px}.cp-retail .ops-demand .grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}.cp-retail .ops-fields{gap:20px}}
@media(max-width:700px){.cp-retail{min-height:100dvh}.cp-retail .app{display:block;min-height:100dvh}.cp-retail .sidebar{position:static;height:auto;border-right:0}.cp-retail .sidebar.open{border-bottom:1px solid var(--line)}.cp-retail .sidebar.open .brand{padding:18px 18px 4px}.cp-retail .sidebar.open .workspace-note{display:none}.cp-retail .side-nav{padding:14px}.cp-retail .nav-button{font-size:17px;min-height:44px}.cp-retail .nav-examples{margin-top:12px;padding-top:12px}.cp-retail .topbar{min-height:60px;padding:11px 16px}.cp-retail .topbar .mobile-menu{padding:8px;min-width:38px;min-height:38px;border:0;background:transparent;box-shadow:none}.cp-retail .breadcrumb{font-size:14px}.cp-retail .content{padding:25px 18px;gap:22px}.cp-retail h1,.cp-retail .scenario-record-heading>h1{font-size:30px}.cp-retail .page-head{gap:18px;padding-bottom:21px}.cp-retail .page-head p{font-size:16px}.cp-retail .page-head>.row{width:100%}.cp-retail .page-head>.row .btn{flex:1}.cp-retail .panel{padding:20px;border-radius:8px}.cp-retail .grid-2{gap:20px}.cp-retail .input{font-size:18px;min-height:45px}.cp-retail .btn{min-height:43px}.cp-retail .metrics .metric{padding:18px 14px}.cp-retail .metric .number{font-size:27px;overflow-wrap:anywhere}.cp-retail .metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cp-retail .metrics .metric:nth-child(odd){border-left:0}.cp-retail .metrics .metric:nth-child(n+3){border-top:1px solid var(--line)}.cp-retail .notice{font-size:15px}.cp-retail .notice>div{min-width:0}.cp-retail .skip-link{left:16px}.cp-retail .ops{gap:22px}.cp-retail .ops-heading{padding-bottom:20px;gap:17px}.cp-retail .ops-heading h1{font-size:31px;max-width:23ch}.cp-retail .ops-heading p{font-size:16px;max-width:37ch}.cp-retail .ops-method{margin-bottom:8px}.cp-retail .ops-heading>.btn{min-height:36px;font-size:14px;padding:8px 12px}.cp-retail .ops-steps{grid-template-columns:repeat(2,minmax(0,1fr));gap:13px 12px}.cp-retail .ops-steps>button{font-size:15px;padding-bottom:10px;gap:8px}.cp-retail .ops-review,.cp-retail .ops-assumptions{padding:20px;gap:20px}.cp-retail .ops-section-heading h2{font-size:20px}.cp-retail .ops-source-facts{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.cp-retail .ops-diagnosis li{display:flex;gap:7px}.cp-retail .ops-fields,.cp-retail .ops-demand .grid-3{grid-template-columns:1fr;gap:20px}.cp-retail .ops-config .input{font-size:18px}.cp-retail .ops-config label{font-size:16px}.cp-retail .ops-config label small{font-size:15px}.cp-retail .ops-form-note{font-size:15px}.cp-retail .ops-results-heading{align-items:flex-start;gap:12px}.cp-retail .ops-results-heading h2{font-size:26px}.cp-retail .ops-results-heading>.btn{padding:8px 10px;font-size:14px;min-height:36px;flex-shrink:0}.cp-retail .ops-action,.cp-retail .ops-action.chosen{grid-template-columns:1fr;padding:21px 18px;gap:9px}.cp-retail .ops-action-index{font-size:14px}.cp-retail .ops-action h3{font-size:21px}.cp-retail .ops-action-side{grid-column:1;margin-top:9px;gap:14px;border-top:1px solid #e2e9da;padding-top:16px;align-items:center;flex-wrap:wrap}.cp-retail .ops-action-side strong{font-size:27px}.cp-retail .ops-action-side .btn{min-height:42px}.cp-retail .ops-deltas{grid-template-columns:1fr;gap:0}.cp-retail .ops-deltas div{padding:9px 0;display:flex;justify-content:space-between;align-items:baseline}.cp-retail .ops-deltas dd{font-size:17px;margin:0;text-align:right}.cp-retail .ops-ai-disclosure{padding:0 17px}.cp-retail .ops-ai-disclosure>summary small{display:block;margin:6px 0 0 17px}.cp-retail .ops-ai-answer{padding:16px;font-size:16px}.cp-retail .ops-save{padding:21px}.cp-retail .ops-save>.btn{width:100%}.cp-retail .ops-full-comparison h2{font-size:22px}.cp-retail .ops-full-comparison .table-wrap{border-radius:6px}.cp-retail .ops-evidence{padding:17px}}
.cp-retail .input:not(:disabled){border-color:#7b8f7c}
.cp-retail .metrics .metric>.row{flex-wrap:nowrap;align-items:flex-start}.cp-retail .metrics .metric>.row svg{flex-shrink:0}
@media(max-width:700px){.cp-retail .metrics .metric>.row{min-height:38px}}
.cp-retail .ops-method,.cp-retail .ops-source-facts dt,.cp-retail .ops-section-heading>span,.cp-retail .ops-action-index,.cp-retail .ops-ai-disclosure>summary small{color:var(--muted)}
@media(prefers-reduced-motion:reduce){.cp-retail *{scroll-behavior:auto!important;transition:none!important;animation:none!important}.cp-retail .btn:active{transform:none}}

/* END AWARD UI */
/* BEGIN AUTH ENTRY UI */
.cp-retail .auth-entry{min-height:100dvh;background:#f5f6f0;color:var(--ink);display:flex;flex-direction:column}
.cp-retail .auth-entry-header,.cp-retail .auth-entry-footer{display:flex;justify-content:space-between;align-items:center;gap:20px;max-width:1240px;width:100%;margin:0 auto;padding:28px 40px}
.cp-retail .auth-entry-header{border-bottom:1px solid var(--line)}
.cp-retail .auth-entry-brand{display:flex;gap:12px;align-items:center}
.cp-retail .auth-entry-brand .iconbox{width:38px;height:38px;background:var(--blue);color:#fff;border-radius:10px}
.cp-retail .auth-entry-brand strong{font-size:20px;letter-spacing:-.03em}
.cp-retail .auth-entry-brand p{font-size:15px;color:var(--muted);margin-top:2px}
.cp-retail .auth-entry-prototype{font-size:14px;line-height:1.4;padding:6px 9px;background:#e8ede3;color:#4f6451;border-radius:4px;text-align:right}
.cp-retail .auth-entry-main{width:100%;max-width:1160px;margin:auto;padding:76px 40px 88px;display:grid;grid-template-columns:minmax(0,1.14fr) minmax(0,1fr);gap:clamp(40px,7vw,92px);align-items:start}
.cp-retail .auth-entry-intro>.eyebrow{color:#5b725e}
.cp-retail .auth-entry h1{font-size:clamp(32px,3.7vw,48px);font-weight:600;line-height:1.12;letter-spacing:-.045em;max-width:14ch;margin:18px 0 22px;text-wrap:balance}
.cp-retail .auth-entry-description{font-size:18px;line-height:1.75;max-width:42ch;color:var(--muted);text-wrap:pretty}
.cp-retail .auth-entry-steps{list-style:none;padding:0;margin:37px 0 0;display:flex;flex-direction:column;gap:22px}
.cp-retail .auth-entry-steps li{display:flex;gap:17px;align-items:flex-start}
.cp-retail .auth-entry-steps li>span{font-size:14px;line-height:26px;color:#5c7b61;font-variant-numeric:tabular-nums;min-width:20px}
.cp-retail .auth-entry-steps strong{font-size:17px;font-weight:600;line-height:26px}
.cp-retail .auth-entry-steps p{font-size:16px;line-height:1.65;color:var(--muted);margin-top:2px}
.cp-retail .auth-entry-access{display:flex;flex-direction:column;gap:18px;min-width:0}
.cp-retail .auth-entry-card{background:#fff;padding:32px;border:1px solid #dce3d8;border-radius:12px;display:flex;flex-direction:column;gap:19px;box-shadow:0 5px 24px #334a3010}
.cp-retail .auth-entry-card h2{font-size:27px;line-height:1.25;letter-spacing:-.025em}
.cp-retail .auth-entry-card>p.muted{font-size:17px;line-height:1.7}
.cp-retail .auth-entry-primary{width:100%;min-height:46px;margin-top:5px}
.cp-retail .auth-entry-primary>svg:last-child{margin-left:auto}
.cp-retail .auth-entry-primary>svg:first-child:not(:last-child){margin-left:auto}
.cp-retail .auth-secondary-links{display:flex;align-items:center;justify-content:space-between;gap:10px 22px;flex-wrap:wrap}
.cp-retail .auth-text-link{display:inline-flex;align-items:center;gap:7px;color:#285e4d;background:transparent;border:0;border-radius:3px;padding:5px 0;min-height:32px;font:inherit;font-size:15px;font-weight:600;line-height:1.5;text-decoration:underline;text-underline-offset:3px;text-align:left;cursor:pointer}
.cp-retail .auth-text-link:hover{color:#153d2f;text-decoration-thickness:2px}
.cp-retail .auth-text-link:focus-visible,.cp-retail .auth-entry summary:focus-visible{outline:3px solid #438a72;outline-offset:4px}
.cp-retail .auth-entry-demo{border:1px solid #dce3d8;border-radius:9px;background:#edf1e8}
.cp-retail .auth-entry-demo summary{display:flex;align-items:center;gap:9px;padding:16px 20px;cursor:pointer;font-size:16px;font-weight:600;list-style:none;border-radius:9px;min-height:50px}
.cp-retail .auth-entry-demo summary::-webkit-details-marker{display:none}
.cp-retail .auth-entry-demo summary:after{content:'+';margin-left:auto;font-size:21px;font-weight:400;color:#526c56}
.cp-retail .auth-entry-demo[open] summary:after{content:'−'}
.cp-retail .auth-entry-demo>div{padding:0 20px 20px;display:flex;align-items:flex-start;flex-direction:column;gap:16px}
.cp-retail .auth-entry-demo p{font-size:15px;line-height:1.8;color:#596c5d;max-width:50ch}
.cp-retail .auth-entry-demo .btn{background:transparent;box-shadow:none}
.cp-retail .auth-entry-footer{border-top:1px solid var(--line);color:var(--muted);font-size:14px;line-height:1.7;padding-top:21px;padding-bottom:21px}
.cp-retail .account-summary{display:flex;align-items:center;gap:11px;min-width:0}
.cp-retail .account-summary .avatar{width:34px;height:34px;flex-shrink:0;font-size:16px}
.cp-retail .account-identity{min-width:0;flex:1}
.cp-retail .account-identity strong{display:block;font-size:15px;font-weight:600;line-height:1.6;overflow-wrap:anywhere}
.cp-retail .account-identity p{font-size:14px;color:var(--muted);line-height:1.6;overflow-wrap:anywhere;margin-top:2px}
.cp-retail .side-bottom{padding-bottom:52px}
.cp-retail .side-bottom .account-settings{color:#285e4d;text-decoration:underline;text-underline-offset:3px;min-height:36px;padding:4px 0;box-shadow:none}
.cp-retail .side-bottom .account-summary+.account-settings{margin-top:-7px;margin-left:45px}
.cp-retail .side-bottom .welcome-help{border-top:1px solid #d8e0d6;border-radius:0;padding-top:16px;margin-top:2px;box-shadow:none}
.cp-retail .topbar>.row:first-child{min-width:0;flex:1}
.cp-retail .topbar-account{flex-shrink:0;min-width:72px;white-space:nowrap;box-shadow:none}
.cp-retail .auth-gate{display:flex;align-items:flex-start;flex-direction:column;gap:17px;padding:32px;max-width:800px}
.cp-retail .auth-gate>h1{max-width:27ch;text-wrap:balance}
.cp-retail .auth-gate>p{max-width:59ch;line-height:1.75}
.cp-retail .auth-gate-actions{display:flex;align-items:center;flex-wrap:wrap;gap:18px 25px;margin-top:5px}
.cp-retail .auth-gate-actions>.btn{min-width:115px}
.cp-retail .auth-gate-demo{width:100%;border-top:1px solid var(--line);padding-top:19px;margin-top:5px;display:flex;flex-direction:column;align-items:flex-start;gap:7px}
.cp-retail .auth-gate-demo p{font-size:15px;color:var(--muted);line-height:1.7}
@media(max-width:900px){.cp-retail .auth-entry-main{gap:35px;padding:52px 28px 62px}.cp-retail .auth-entry-card{padding:27px}.cp-retail .auth-entry-header,.cp-retail .auth-entry-footer{padding-left:28px;padding-right:28px}}
@media(max-width:700px){.cp-retail .auth-entry-access{grid-row:1}.cp-retail .sidebar.open .side-bottom{display:flex;padding:14px 20px;gap:10px}.cp-retail .sidebar.open .side-bottom .account-summary{display:none}.cp-retail .auth-entry-header{padding:21px 20px;gap:15px;align-items:flex-start}.cp-retail .auth-entry-brand strong{font-size:19px}.cp-retail .auth-entry-prototype{max-width:90px;font-size:14px}.cp-retail .auth-entry-main{grid-template-columns:minmax(0,1fr);gap:33px;padding:36px 20px 42px}.cp-retail .auth-entry h1{font-size:36px;max-width:15ch;margin:14px 0 18px}.cp-retail .auth-entry-description{font-size:18px;max-width:42ch}.cp-retail .auth-entry-steps{gap:15px;margin-top:26px}.cp-retail .auth-entry-steps p{font-size:15px}.cp-retail .auth-entry-card{padding:25px 22px;gap:18px}.cp-retail .auth-entry-card h2{font-size:26px}.cp-retail .auth-entry-card>p.muted{font-size:16px}.cp-retail .auth-entry-primary{min-height:46px}.cp-retail .auth-secondary-links{gap:7px 18px}.cp-retail .auth-text-link{min-height:40px;font-size:15px}.cp-retail .auth-entry-demo summary{padding:16px 18px}.cp-retail .auth-entry-demo>div{padding:0 18px 18px}.cp-retail .auth-entry-footer{padding:19px 20px;align-items:flex-start;flex-direction:column;gap:5px}.cp-retail .topbar-account{min-width:66px;min-height:40px;padding:9px 12px;font-size:15px}.cp-retail .topbar>.row:first-child{flex:1;gap:7px}.cp-retail .topbar .breadcrumb{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cp-retail .auth-gate{padding:25px 22px;gap:17px}.cp-retail .auth-gate h1{font-size:29px}.cp-retail .auth-gate-actions{align-items:flex-start;flex-direction:column;gap:12px;width:100%}.cp-retail .auth-gate-actions>.btn{width:100%;min-height:45px}.cp-retail .auth-gate-actions .auth-secondary-links{width:100%}.cp-retail .auth-gate-demo{padding-top:16px}}
/* END AUTH ENTRY UI */
/* BEGIN CUSTOMER PROFILING UI */
.cp-retail .profiling{gap:26px}
.cp-retail .profile-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:1px solid var(--line);padding-bottom:25px}
.cp-retail .profile-heading h1{font-size:36px;letter-spacing:-.035em;line-height:1.2;margin:9px 0 13px}
.cp-retail .profile-heading p:not(.eyebrow){max-width:60ch;color:var(--muted);line-height:1.75}
.cp-retail .profile-source{color:#47634e;font-size:15px;white-space:nowrap;padding:6px 10px;background:#e9eee3;border-radius:4px}
.cp-retail .profile-import{display:flex;flex-direction:column;gap:20px;padding:25px;background:#fff;border:1px solid var(--line);border-radius:9px}
.cp-retail .profile-import h2,.cp-retail .profile-results h2{font-size:26px;letter-spacing:-.02em}
.cp-retail .profile-import .profile-csv{font-family:Consolas,monospace;font-size:15px;line-height:1.7;min-height:165px;max-height:330px;white-space:pre;overflow:auto;resize:vertical}
.cp-retail .profile-file{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.cp-retail .profile-controls{display:grid;grid-template-columns:minmax(150px,1fr) minmax(140px,1fr) auto auto;align-items:end;gap:15px}
.cp-retail .profile-controls .btn{min-height:41px}
.cp-retail .profile-text-btn{display:inline-flex;align-items:center;justify-content:flex-start;gap:4px;background:none;color:#285e4d;border:0;border-radius:3px;padding:6px 0;font:inherit;font-size:15px;text-decoration:underline;text-underline-offset:3px;min-height:32px}
.cp-retail .profile-schema,.cp-retail .profile-rules{font-size:15px;line-height:1.85;color:var(--muted)}
.cp-retail .profile-schema summary,.cp-retail .profile-rules summary{cursor:pointer;font-weight:600;color:var(--ink);padding:4px 0}
.cp-retail .profile-schema p,.cp-retail .profile-rules p{margin:10px 0;max-width:85ch}
.cp-retail .profile-error{padding:16px 18px;border-left:3px solid #a16a25;background:#fcf4e6;color:#77501e;font-size:16px;line-height:1.7;overflow-wrap:anywhere}
.cp-retail .profile-error ul{margin:8px 0 0;padding-left:20px}
.cp-retail .profile-results:focus{outline:0}
.cp-retail .profile-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;border-top:1px solid var(--line)}
.cp-retail .profile-group{display:flex;flex-direction:column;gap:11px;min-width:0;text-align:left;border:0;border-bottom:1px solid var(--line);padding:22px 8px 22px 0;background:transparent;color:var(--ink);border-radius:0;font:inherit}
.cp-retail .profile-group>.row{font-size:20px;letter-spacing:-.02em}
.cp-retail .profile-group>.row>span{font-size:31px;font-variant-numeric:tabular-nums}
.cp-retail .profile-group:hover{background:#edf1e7}
.cp-retail .profile-group.active{box-shadow:inset 3px 0 #3e6d4b;padding-left:14px;background:#edf1e7}
.cp-retail .profile-share{display:block;height:4px;background:#dfe5db}
.cp-retail .profile-share>span{display:block;height:100%;background:#507351}
.cp-retail .profile-search{display:flex;flex-direction:row;align-items:center;gap:10px;max-width:290px}
.cp-retail .profile-table table{min-width:740px}
.cp-retail .profile-detail,.cp-retail .profile-context{display:flex;flex-direction:column;gap:11px;border-left:3px solid #6f896a;padding:19px 22px;background:#eff2e9;line-height:1.7}
.cp-retail .profile-context p{font-size:16px;overflow-wrap:anywhere}
.cp-retail .profile-plan{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:32px;padding:27px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.cp-retail .profile-plan p{margin-top:10px;max-width:55ch;line-height:1.75}
.cp-retail .profile-empty{padding:30px 20px;background:#edf1e7;border-radius:6px;line-height:1.8}
.cp-retail .profile-empty p{color:var(--muted);margin-top:6px}
@media(max-width:900px){.cp-retail .profile-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.cp-retail .profile-plan{grid-template-columns:1fr;gap:22px}}
@media(max-width:700px){.cp-retail .profile-heading{flex-direction:column;gap:13px}.cp-retail .profile-heading h1{font-size:34px}.cp-retail .profile-heading p:not(.eyebrow){font-size:16px}.cp-retail .profile-import{padding:20px 16px}.cp-retail .profile-import>.row{align-items:flex-start}.cp-retail .profile-import>.row>.row{width:100%;gap:10px}.cp-retail .profile-controls{grid-template-columns:1fr}.cp-retail .profile-controls .profile-text-btn{justify-content:center}.cp-retail .profile-groups{grid-template-columns:1fr}.cp-retail .profile-group{padding-top:18px;padding-bottom:18px}.cp-retail .profile-search{width:100%;max-width:none}.cp-retail .profile-search .input{font-size:18px}.cp-retail .profile-results>.row{align-items:flex-start}.cp-retail .profile-plan{padding:20px 0}.cp-retail .profile-plan .btn.primary{width:100%;font-size:14px;min-height:44px}.cp-retail .profile-detail,.cp-retail .profile-context{padding:17px 15px}.cp-retail .profile-rules{font-size:15px}.cp-retail .profile-source{font-size:14px}}
.cp-retail .profile-requirement{margin-top:10px;padding:10px 12px;border-left:3px solid #47634e;background:#eef2ea;color:#2f4a36 !important;line-height:1.6 !important}
.cp-retail .profile-offer{display:flex;flex-direction:column;gap:18px;padding:25px;background:#fff;border:1px solid var(--line);border-radius:9px}
.cp-retail .profile-offer h2{font-size:26px;letter-spacing:-.02em}
.cp-retail .profile-offer>div>p{margin-top:10px;max-width:70ch;color:var(--muted);line-height:1.75}
.cp-retail .profile-offer-inputs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;align-items:start}
.cp-retail .profile-offer-inputs label{display:flex;flex-direction:column;gap:6px}
.cp-retail .profile-offer-verdict{padding:14px 18px;border-left:3px solid #47634e;background:#eef2ea;color:#2f4a36;line-height:1.65}
.cp-retail .profile-offer-verdict p{margin-top:4px}
.cp-retail .profile-offer-verdict.below-break-even,.cp-retail .profile-offer-verdict.cannot-pay-back,.cp-retail .profile-offer-verdict.discount-exceeds-margin{border-left-color:#a16a25;background:#fcf4e6;color:#77501e}
@media(max-width:900px){.cp-retail .profile-offer-inputs{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.cp-retail .profile-offer{padding:20px 16px}.cp-retail .profile-offer-inputs{grid-template-columns:1fr}}

/* END CUSTOMER PROFILING UI */
.cp-retail .brand-logo{display:block;flex:none;border-radius:9px}
/* BEGIN V2 THEME: dark chrome, light canvas */
.cp-retail{--navy:#0c1715;--blue:#21675d;--cyan:#5fd3ae;--ink:#223b36;--muted:#5b6b67;--line:#dce3de;background:#f6f7f3;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
.cp-retail .sidebar{background:#0c1715;color:#a7b8b3}
.cp-retail .sidebar .brand strong,.cp-retail .sidebar .brand{color:#eef5f2}
.cp-retail .sidebar .eyebrow,.cp-retail .brand-subtitle{color:#7f938e}
.cp-retail .sidebar .side-bottom{border-top-color:#263d36}
.cp-retail .sidebar .account-identity strong{color:#eef5f2}
.cp-retail .sidebar .account-identity p{color:#a7b8b3}
.cp-retail .sidebar .side-bottom .btn{background:transparent;color:#c6d5cf;border-color:transparent;box-shadow:none}
.cp-retail .sidebar .side-bottom .btn:hover{background:rgba(255,255,255,.06);color:#eef5f2}
.cp-retail .sidebar .side-bottom .btn:focus-visible{outline-color:#5fd3ae}
.cp-retail .sidebar .side-bottom .account-settings{text-decoration:none}
.cp-retail .sidebar .side-bottom .welcome-help{border-top-color:#263d36}
.cp-retail .nav-button{color:#a7b8b3;border-radius:10px;font-size:16px;transition:background .2s ease,color .2s ease,transform .1s ease-out}
.cp-retail .nav-button:hover{background:rgba(255,255,255,.06);color:#eef5f2}
.cp-retail .nav-button.active{background:rgba(95,211,174,.16);color:#eef5f2;font-weight:650;box-shadow:inset 2px 0 0 #5fd3ae}
.cp-retail .nav-button:active,.cp-retail .btn:active{transform:scale(.97)}
.cp-retail .btn{transition:transform .1s ease-out,background .2s ease,box-shadow .2s ease;border-radius:10px}
.cp-retail .btn.primary{background:#21675d;border-color:#21675d;color:#fff}
.cp-retail .btn.primary:hover{background:#1a564e}
.cp-retail .workspace-note{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08);color:#a7b8b3}
.cp-retail .topbar{background:rgba(246,247,243,.78);backdrop-filter:blur(16px) saturate(170%);-webkit-backdrop-filter:blur(16px) saturate(170%)}
.cp-retail .panel,.cp-retail .metric{border-radius:16px;border-color:#e3e9e5;box-shadow:0 1px 0 rgba(0,0,0,.03),0 12px 32px -22px rgba(33,103,93,.35)}
.cp-retail main.content>*{animation:none}
@keyframes v2Rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.cp-retail .v2-hello h1{font-size:clamp(28px,3.4vw,40px);line-height:1.06;letter-spacing:-.035em;margin:6px 0}
.cp-retail .v2-hello .eyebrow{color:#21675d;font-weight:600}
.cp-retail .v2-steps{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.cp-retail .v2-step{display:grid;grid-template-columns:36px 1fr auto;gap:14px;align-items:center;background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 1px 0 rgba(0,0,0,.04),0 10px 30px -18px rgba(33,103,93,.35);animation:v2Rise .5s cubic-bezier(.2,.8,.2,1) both;transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s}
.cp-retail .v2-step.current:hover{transform:translateY(-2px);box-shadow:0 18px 40px -18px rgba(33,103,93,.5)}
.cp-retail .v2-step.current{outline:2px solid rgba(33,103,93,.18)}
.cp-retail .v2-step.locked{opacity:.5}
.cp-retail .v2-step h3{margin:0;font-size:18px}
.cp-retail .v2-step p{margin:3px 0 0}
.cp-retail .v2-num{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:#e3f1ec;color:#21675d}
.cp-retail .v2-step.done .v2-num{background:#21675d;color:#fff}
.cp-retail .v2-progress{height:6px;border-radius:9px;background:#e3e9e6;overflow:hidden}
.cp-retail .v2-progress i{display:block;height:100%;background:#21675d;transform-origin:left;transition:transform 1s cubic-bezier(.2,.8,.2,1)}
.cp-retail .v2-pending{background:#fff;border-radius:16px;padding:16px 18px;display:grid;gap:8px;box-shadow:0 10px 30px -18px rgba(33,103,93,.35)}
.cp-retail .v2-pending h2{font-size:18px;margin:0}
.cp-retail .v2-pending-row{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#f6f7f3;border:0;border-radius:10px;padding:10px 12px;text-align:left;font:inherit;color:inherit;cursor:pointer;transition:background .2s,transform .1s}
.cp-retail .v2-pending-row:hover{background:#ecf3ef}
.cp-retail .v2-pending-row:active{transform:scale(.99)}
.cp-retail .v2-data{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px;background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 10px 30px -20px rgba(33,103,93,.35)}
.cp-retail .v2-data h2{margin:2px 0;font-size:20px}
.cp-retail .v2-data-actions{flex-wrap:wrap}
.cp-retail .v2-select{display:grid;gap:4px;font-size:15px}
.cp-retail .v2-bars{display:flex;align-items:flex-end;gap:10px;height:200px;padding-top:22px}
.cp-retail .v2-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;gap:6px;min-width:0}
.cp-retail .v2-bar i{display:block;width:100%;max-width:56px;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#5fd3ae,#21675d);transform-origin:bottom;animation:v2Grow .9s cubic-bezier(.2,.8,.2,1) both}
.cp-retail .v2-bar-val{font-size:14px;color:var(--muted);white-space:nowrap}
.cp-retail .v2-bar-lab{font-size:14px;color:var(--muted)}
@keyframes v2Grow{from{transform:scaleY(0)}to{transform:none}}
.cp-retail .v2-hbars{display:grid;gap:10px}
.cp-retail .v2-hbar{display:grid;grid-template-columns:110px 1fr 48px;gap:10px;align-items:center;font-size:16px}
.cp-retail .v2-hbar div{height:10px;border-radius:9px;background:#e8eeea;overflow:hidden}
.cp-retail .v2-hbar i{display:block;height:100%;background:#21675d;border-radius:9px;transform-origin:left;animation:v2Fill .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes v2Fill{from{transform:scaleX(0)}}
.cp-retail .v2-stack{display:flex;height:14px;border-radius:9px;overflow:hidden;gap:2px}
.cp-retail .v2-stack i{display:block;min-width:4px}
.cp-retail .v2-legend{flex-wrap:wrap;gap:14px;font-size:15px;color:var(--muted)}
.cp-retail .v2-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.cp-retail .seg-regular{background:#21675d}.cp-retail .seg-recent{background:#5fd3ae}.cp-retail .seg-cooling{background:#e0a93b}.cp-retail .seg-occasional{background:#a7b8b3}
.cp-retail .v2-explain{background:#fff;border-radius:16px;padding:18px;box-shadow:0 10px 30px -20px rgba(33,103,93,.35);display:grid;gap:12px}
.cp-retail .v2-explain h2{margin:0;font-size:20px}
.cp-retail .v2-explain-body{border-top:1px solid #e3e9e5;padding-top:12px;animation:v2Rise .4s cubic-bezier(.2,.8,.2,1) both}
.cp-retail .v2-explain-body h3{font-size:16px;margin:12px 0 2px;color:#21675d}
.cp-retail .v2-explain-body p,.cp-retail .v2-explain-body li{margin:0;font-size:17px}
.cp-retail .v2-pre{white-space:pre-wrap;margin-top:8px!important}
.cp-retail .v2-testbar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:30;display:flex;flex-wrap:wrap;align-items:center;gap:10px;max-width:min(860px,calc(100vw - 32px));background:rgba(12,23,21,.88);color:#eef5f2;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:16px;padding:10px 14px;box-shadow:0 20px 50px -20px rgba(0,0,0,.5);animation:v2Up .45s cubic-bezier(.2,.8,.2,1) both}
.cp-retail .v2-testbar .btn{background:rgba(255,255,255,.1);color:#eef5f2;border-color:transparent;min-height:30px;padding:4px 10px}
.cp-retail .v2-testbar-step{font-size:14px;color:#5fd3ae;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
@keyframes v2Up{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translateX(-50%)}}
.cp-retail .v2-rate{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}
.cp-retail .v2-rate .btn{min-width:40px;justify-content:center}
.cp-retail .v2-rate .btn[aria-checked="true"]{background:#21675d;border-color:#21675d;color:#fff;font-weight:700}
.cp-retail main.content{padding-bottom:96px}
.cp-retail .v2-empty h1{font-size:31px;letter-spacing:-.03em}
@media (max-width:760px){.cp-retail .v2-step{grid-template-columns:36px 1fr}.cp-retail .v2-step>.row,.cp-retail .v2-step>.btn{grid-column:1/-1}.cp-retail .v2-hbar{grid-template-columns:90px 1fr 42px}.cp-retail .v2-bar-val{display:none}}
@media (prefers-reduced-motion:reduce){.cp-retail main.content>*,.cp-retail .v2-step,.cp-retail .v2-bar i,.cp-retail .v2-hbar i,.cp-retail .v2-testbar,.cp-retail .v2-explain-body{animation:none}.cp-retail .v2-progress i,.cp-retail .btn,.cp-retail .nav-button{transition:none}}
@media (prefers-reduced-transparency:reduce){.cp-retail .topbar{background:#f6f7f3;backdrop-filter:none}.cp-retail .v2-testbar{background:#0c1715;backdrop-filter:none}}
/* Older screens share the v2 surfaces, radii, colours and typography. */
.cp-retail main.content h1{font-size:clamp(26px,2.6vw,34px);line-height:1.1;letter-spacing:-.03em}
.cp-retail main.content h2{letter-spacing:-.015em}
.cp-retail .panel{border-radius:16px;border-color:#e3e9e5;background:#fff}
.cp-retail .notice{border-radius:14px;border-color:#d7e6df;background:#f0f6f3}
.cp-retail .notice.warn{border-color:#efd9a6;background:#fdf8ec}
.cp-retail .btn:hover{background:#eef4f1}
.cp-retail .btn.primary:hover{background:#1a564e}
.cp-retail .pill.aqua{background:#e3f1ec;border-color:#bcdccf;color:#21675d}
.cp-retail .pill.green{background:#e3f1ec;border-color:#bcdccf;color:#1a564e}
.cp-retail .input{border-radius:10px;border-color:#d9e2dd;background:#fff;transition:border-color .15s ease,box-shadow .15s ease}
.cp-retail .input:focus{outline:none;border-color:#21675d;box-shadow:0 0 0 3px rgba(33,103,93,.15)}
.cp-retail .table-wrap{border-radius:14px;border:1px solid #e3e9e5;background:#fff;overflow:auto}
.cp-retail .table-wrap th{background:#f3f6f4;color:#5b6b67;font-weight:600}
.cp-retail .table-wrap tbody tr{transition:background .15s ease}
.cp-retail .table-wrap tbody tr:hover{background:#f6faf8}
.cp-retail .profile-text-btn{color:#21675d}
.cp-retail .v2-show-all{margin-top:10px;align-self:flex-start}
/* CP Retail Advisor: one identity for every piece of AI-assisted advice. */
.cp-retail .v2-advisor{position:relative;overflow:hidden;display:grid;gap:12px;padding:20px 22px;border-radius:20px;border:1px solid transparent;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,#21675d,#5fd3ae 45%,#e0a93b) border-box;box-shadow:0 1px 0 rgba(0,0,0,.03),0 22px 48px -28px rgba(33,103,93,.55);animation:v2Rise .5s cubic-bezier(.2,.8,.2,1) both}
.cp-retail .v2-advisor::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#5fd3ae,transparent);transform:translateX(-100%);opacity:0;pointer-events:none}
.cp-retail .v2-advisor.thinking::after{opacity:1;animation:v2Scan 1.6s cubic-bezier(.4,0,.2,1) infinite}
@keyframes v2Scan{to{transform:translateX(100%)}}
.cp-retail .v2-advisor h2{margin:0;font-size:clamp(19px,2vw,23px);letter-spacing:-.025em;line-height:1.2}
.cp-retail .v2-advisor-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}
.cp-retail .v2-advisor-name{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:700;letter-spacing:.02em;color:#21675d;background:linear-gradient(135deg,rgba(33,103,93,.1),rgba(224,169,59,.14));border-radius:999px;padding:4px 10px 4px 8px}
.cp-retail .v2-advisor-state{font-size:15px;color:var(--muted)}
.cp-retail .v2-advisor-state.answered{color:#1a564e;font-weight:600}
.cp-retail .v2-advisor-state.waiting{animation:v2Breathe 1.4s ease-in-out infinite alternate}
@keyframes v2Breathe{from{opacity:.45}to{opacity:1}}
.cp-retail .v2-advisor-lead{margin:0;color:var(--muted);font-size:17px;max-width:72ch}
.cp-retail .v2-advisor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.cp-retail .v2-advisor-grid>div{background:#f6f7f3;border-radius:14px;padding:12px 14px}
.cp-retail .v2-advisor-grid h3,.cp-retail .v2-advisor .v2-explain-body h3{display:flex;align-items:center;gap:6px;font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:#21675d;margin:0 0 4px}
.cp-retail .v2-advisor-grid p{margin:0;font-size:17px}
.cp-retail .v2-advisor-grid p+p{margin-top:6px}
.cp-retail .v2-ai-tag{font-size:14px;letter-spacing:.04em;font-weight:700;color:#fff;background:linear-gradient(135deg,#21675d,#5fd3ae);border-radius:6px;padding:1px 5px;animation:v2Pop .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes v2Pop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
.cp-retail .v2-advisor .v2-explain-body{border-top:1px solid #e3e9e5;padding-top:4px}
.cp-retail .v2-advisor .v2-explain-body h3{margin-top:12px}
.cp-retail .v2-advisor-why summary{cursor:pointer;font-size:16px;font-weight:600;color:#21675d}
.cp-retail .v2-advisor-why dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px 18px;margin:10px 0 6px}
.cp-retail .v2-advisor-why dl div{display:grid;gap:1px;border-left:2px solid #dce3de;padding-left:10px}
.cp-retail .v2-advisor-why dt{font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.cp-retail .v2-advisor-why dd{margin:0;font-size:16px;font-variant-numeric:tabular-nums}
.cp-retail .v2-advisor-foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}
.cp-retail .v2-advisor-vote{display:inline-flex;align-items:center;gap:6px;margin-left:auto}
.cp-retail .v2-advisor-vote button{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;border:1px solid #dce3de;background:#fff;color:#21675d;cursor:pointer;transition:transform .1s ease-out,background .2s ease}
.cp-retail .v2-advisor-vote button:hover{background:#eef4f1}
.cp-retail .v2-advisor-vote button:active{transform:scale(.92)}
.cp-retail .v2-advisor-note{display:flex;align-items:center;gap:6px;margin:0;font-size:16px;color:#1a564e;background:linear-gradient(135deg,rgba(33,103,93,.08),rgba(224,169,59,.12));border-radius:10px;padding:8px 12px}
.cp-retail .ops-ai.v2-advisor-review{padding:18px 20px;border:1px solid transparent;border-radius:18px;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,#21675d,#5fd3ae 45%,#e0a93b) border-box}
@media (prefers-reduced-motion:reduce){.cp-retail .v2-advisor,.cp-retail .v2-advisor.thinking::after,.cp-retail .v2-advisor-state.waiting,.cp-retail .v2-ai-tag{animation:none}.cp-retail .v2-advisor-vote button{transition:none}}
.cp-retail .v2-giftbox{display:none}
@media(min-width:1024px){.cp-retail .v2-giftbox{display:block}}
.cp-retail .v2-spectacles{display:none}
@media(min-width:1024px){.cp-retail .v2-spectacles{display:block}}
.cp-retail .v2-loyalty{display:none}
.cp-retail .v2-coupon{display:none}
@media(min-width:1024px){.cp-retail .v2-loyalty{display:block}.cp-retail .v2-coupon{display:block}}
.cp-retail .v2-scissors{display:none}
@media(min-width:1024px){.cp-retail .v2-scissors{display:block}}
.cp-retail .profile-heading-side{display:flex;flex-direction:column;align-items:flex-end;gap:12px;flex-shrink:0}
/* END V2 THEME */
.cp-retail .ops-source-only .ops-start-note{max-width:none;align-items:flex-start}.cp-retail .ops-source-only .ops-start-note .btn{min-width:220px}@media(min-width:701px){.cp-retail .sidebar{position:sticky;top:0;height:100dvh;align-self:start}.cp-retail .side-nav{flex:1;overflow-y:auto}.cp-retail .side-nav .workspace-note{display:none}.cp-retail .side-bottom{margin-top:0}.cp-retail .nav-group{padding-top:12px}}
.cp-retail .ops-config .ops-source-only{grid-template-columns:1fr}.cp-retail .ops-source-only .ops-review{border-right:0}.cp-retail .ops-advanced{padding:18px 0;border-top:1px solid var(--line)}.cp-retail .ops-advanced summary,.cp-retail .ops-full-comparison>summary,.cp-retail .profile-import-details>summary{cursor:pointer;font-weight:650;padding:12px 0}.cp-retail .ops-advanced[open]>.ops-fields{padding-top:18px}.cp-retail .ops-conclusion{padding:24px;background:#e8f3ec;border:1px solid #c3d9ce;border-radius:14px;display:grid;gap:12px}.cp-retail .ops-conclusion .btn{justify-self:start}.cp-retail .nav-group{font-size:12px;letter-spacing:.04em;color:#8eaaa0;padding:20px 12px 5px}.cp-retail .v2-scissors{display:none}.cp-retail .v2-giftbox,.cp-retail .v2-loyalty,.cp-retail .v2-coupon{transform:scale(.65);transform-origin:top right}.cp-retail .ops-full-comparison:not([open]){display:block}.cp-retail .profile-import-details{border:1px solid var(--line);border-radius:12px;padding:4px 18px}

`;

function Pill({children,tone='aqua'}:any){return <span className={'pill '+tone}>{children}</span>;}
function Metric({label,value,detail,icon:Icon=DollarSign}:any){return <div className="metric"><div className="row between"><span className="eyebrow">{label}</span><Icon size={17}/></div><div className="number">{value}</div><p className="small muted">{detail}</p></div>;}
function Network(){return <svg className="network" viewBox="0 0 1200 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="cphex" width="140" height="120" patternUnits="userSpaceOnUse"><path d="M35 0L105 0L140 60L105 120L35 120L0 60Z" fill="none" stroke="#40c7d0" strokeWidth=".8"/></pattern></defs><rect width="1200" height="860" fill="url(#cphex)"/>{Array.from({length:14},(_,i)=><g key={i}><path d={`M${i*96-200} 860 Q ${i*84+100} 480 ${i*68+450} -50`} stroke="#52e1e7" fill="none" strokeWidth={i%3===0?2:1}/><circle cx={i*83+30} cy={760-(i%5)*141} r="4" fill="#5ffff3"/></g>)}</svg>;}

const savedScenarioSelect = q.select({
  name: '8O3bj', owner: 'mKkbZ', product: 'pJbQs', notes: 'k9oe3',
  referencePrice: 'crjGF', cost: 'aFEq0', discount: '4FsPF', units: 'Im1uZ',
  stock: '6g9zg', period: 'tHTcw', comparisonGroup: 'bx1oP', createdAt: 'NNdSa',
  source: 'taLw5', inputCheck: 'QsSll', discountedPrice: '42HJu', revenue: 'uscaP',
  grossProfit: '2pJyd', remainingStock: 'iNqTP', costCheck: 'oU8hQ',
  stockCheck: 'sZb7Q', recordCheck: 'Zo570',
});

function dbText(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map(dbText).filter(Boolean).join(', ');
  if (typeof value === 'object') return String(value.label ?? value.title ?? value.name ?? '');
  return String(value);
}
function dbNumber(value: any): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function dbMoney(value: any): string { const n = dbNumber(value); return n === null ? 'Unavailable' : money(n); }
function dbUnits(value: any): string { const n = dbNumber(value); return n === null ? 'Not provided' : n.toLocaleString('en-US'); }
function dbDate(value: any): string {
  const date = new Date(dbText(value));
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleString('en-GB', {timeZone:'Asia/Shanghai',year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function ScenarioChecks({fields}: any) {
  const unknownCost = dbNumber(fields.cost) === null;
  const remaining = dbNumber(fields.remainingStock);
  return <div className="row" style={{gap:6}}>
    <Pill tone={unknownCost?'amber':'green'}>{unknownCost?'Cost unknown':'Cost provided'}</Pill>
    <Pill tone={remaining === null || remaining <= 0 ? 'amber' : 'green'}>{remaining === null ? 'Stock unavailable' : remaining < 0 ? `${dbUnits(-remaining)} units short` : remaining === 0 ? 'No stock buffer' : `${dbUnits(remaining)} units remain`}</Pill>
  </div>;
}
function SavedScenarioDetail({recordId,email,back,onCreate,onRecommend}: any) {
  const {data,status,error,refetch,isRefetching} = useRecord({from:ds.scenarios,select:savedScenarioSelect,recordId});
  const recordLink = useNavigationSetting({name:'saved-scenario-link',label:'Saved scenario detail page',initialValue:{destination:'/pixso-preview',openIn:'SELF'}});
  const owned = !!data && !!email && dbText(data.fields?.owner).toLowerCase() === email.toLowerCase();
  if (status === 'pending') return <div className="panel stack" role="status"><h2>Loading saved scenario…</h2><button className="btn" onClick={back}>Back to My Scenarios</button></div>;
  if (status === 'error' || !data || !owned) return <div className="panel stack" role="status"><h2>Scenario unavailable</h2><p className="muted">This record is unavailable for your account, or it could not be loaded.</p><div className="row"><button className="btn primary" onClick={back}>Back to My Scenarios</button><button className="btn" onClick={()=>refetch()}>Try again</button></div></div>;
  const f = data.fields;
  return <div className="stack">
    <div className="row between"><button className="btn" onClick={back}><ArrowLeft size={14}/>Back to My Scenarios</button><div className="row"><button className="btn" disabled={isRefetching} onClick={()=>refetch()}><RotateCcw size={14}/>{isRefetching?'Refreshing…':'Refresh record'}</button><NavigationAction navigation={recordLink} recordId={data.id} datasourceId="scenarios" className="btn">Open record link <ArrowRight size={14}/></NavigationAction></div></div>
    <section className="panel stack scenario-record-heading"><div className="row between"><Pill tone="green">Saved scenario</Pill><span className="small muted">Created {dbDate(f.createdAt)} · Asia/Shanghai</span></div><h1>{dbText(f.name) || 'Untitled scenario'}</h1><div className="row"><span>{dbText(f.product) || 'Product not provided'}</span><Pill tone="">{dbUnits(f.period)} days</Pill><Pill tone="">{dbUnits(f.discount)}% discount</Pill></div><details className="data-note"><summary>Record information</summary><p>Record ID: <code>{data.id}</code></p></details><ScenarioChecks fields={f}/><div className="notice small"><Info size={18}/><p>{dbText(f.source) || 'Source not provided'}. These are saved assumptions, not sales forecasts.</p></div></section>
    <div className="grid-4 metrics"><Metric label="Discounted unit price" value={dbMoney(f.discountedPrice)} detail="Saved database formula"/><Metric label="Scenario revenue" value={dbMoney(f.revenue)} detail="Hypothetical revenue from assumed units"/><Metric label="Scenario gross profit" value={dbMoney(f.grossProfit)} detail={dbNumber(f.cost)===null?'Unknown cost; gross profit unavailable':'Before any campaign or other costs'}/><Metric label="Remaining stock" value={dbUnits(f.remainingStock)} detail="Negative values represent a stock shortfall" icon={Package}/></div>
    <RecommendationEvidence evidence={opsReadEvidence(dbText(f.notes))}/><div className="grid-2"><section className="panel stack"><h2>Saved assumptions</h2><dl className="db-facts">{[
      ['Product',dbText(f.product)||'Not provided'],['Reference price',dbMoney(f.referencePrice)],['Unit cost assumption',dbNumber(f.cost)===null?'Unknown — not zero':dbMoney(f.cost)],['Discount',dbUnits(f.discount)+'%'],['Assumed units',dbUnits(f.units)],['Available stock',dbUnits(f.stock)],['Period',dbUnits(f.period)+' days'],['Comparison group',dbText(f.comparisonGroup)||'Not provided'],
    ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3>Assumption notes</h3><p className="small" style={{whiteSpace:'pre-wrap'}}>{opsVisibleNotes(dbText(f.notes))||'No notes provided.'}</p></section><section className="panel stack"><h2>Checks & calculation basis</h2>{[
      ['Numeric inputs',dbText(f.inputCheck)==='Valid'?'Numeric checks passed':dbText(f.inputCheck)||'No numeric check result'],['Cost',dbText(f.costCheck)||'No cost check result'],['Stock',dbText(f.stockCheck)||'No stock check result'],['Record completeness',dbText(f.recordCheck)||'No record check result'],
    ].map(([label,value])=><div key={label} className="panel soft"><strong className="small">{label}</strong><p className="small" style={{marginTop:5}}>{value}</p></div>)}<p className="small muted">Discounted price = reference price × (1 − discount / 100), rounded to two decimals. Revenue = discounted price × assumed units. Gross profit = (discounted price − explicit unit cost) × assumed units. Remaining stock = available stock − assumed units.</p><p className="small muted">Passing numeric checks does not imply known cost, sufficient stock or a reliable demand forecast.</p></section></div>
    <div className="panel row between"><div><h3>Compare changes to this scenario</h3><p className="small muted">Use these saved assumptions as your starting point in Recommendations.</p></div><button type="button" className="btn primary" onClick={()=>onRecommend(data.id)}>Compare actions <ArrowRight size={14}/></button></div>
  </div>;
}

const scenarioCreateFields = q.select({
  name:'8O3bj', owner:'mKkbZ', product:'pJbQs', creator:'JrVwO',
  price:'crjGF', cost:'aFEq0', discount:'4FsPF', units:'Im1uZ',
  stock:'6g9zg', period:'tHTcw', group:'bx1oP', notes:'k9oe3', source:'taLw5',
});
const qtyOptions = [0,1,50,60,80,100,500,1000,1200,1250,1300,1350,1500,2000];
const periodOptions = [1,7,14,30,60,90];

function CreateScenario({user,onCancel,onCreated,initialDraft}: any) {
  const [form,setForm] = useState({name:'',product:'',price:'',cost:'',discount:'',units:'',stock:'',period:'',group:'',notes:'',...initialDraft});
  const [formError,setFormError] = useState('');
  const busy = useRef(false);
  const products = useLinkedRecords({from:ds.scenarios,select:q.select({product:'pJbQs'}),field:'product',sortOrder:'ASC',count:1000,enabled:!!user?.email});
  const creators = useLinkedRecords({from:ds.scenarios,select:q.select({creator:'JrVwO'}),field:'creator',search:user?.email ?? '',count:1000,enabled:!!user?.email});
  const productOptions = products.data?.pages.flatMap(p=>p.items) ?? [];
  useEffect(()=>{if(initialDraft&&products.status==='success'){const product=productOptions.find(p=>/snack.*drink/i.test(p.title));if(product)setForm(old=>({...old,product:old.product||product.id}));}},[products.status]);
  const matchingCreators = (creators.data?.pages.flatMap(p=>p.items) ?? []).filter(p=>String(p.title ?? '').trim().toLowerCase()===String(user?.email ?? '').trim().toLowerCase());
  const creatorReady = creators.status==='success' && !creators.hasNextPage && matchingCreators.length===1;
  const createRecord = useRecordCreate({from:ds.scenarios,fields:scenarioCreateFields});
  const set=(name:string,value:string)=>{setForm(old=>({...old,[name]:value}));setFormError('');};
  const validMoney=(v:string)=>/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(v.trim()) && Number(v)<=1000000000;
  const submit=async (event:React.FormEvent)=>{
    event.preventDefault();
    if (busy.current || createRecord.status==='pending') return;
    if (!user?.email || !createRecord.enabled || !creatorReady) {setFormError('Your user record or permission is unavailable. Please refresh and try again.');return;}
    if (!form.name.trim() || form.name.trim().length>1024) {setFormError('Enter a scenario name of up to 1,024 characters.');return;}
    if (!productOptions.some(item=>item.id===form.product)) {setFormError('Select a product from the catalogue.');return;}
    if (!validMoney(form.price) || (form.cost.trim()!=='' && !validMoney(form.cost))) {setFormError('Price and cost must be non-negative amounts with at most two decimal places. Leave cost blank if unknown.');return;}
    if (!/^\d+$/.test(form.discount.trim()) || Number(form.discount)>100) {setFormError('Discount must be a whole number between 0 and 100.');return;}
    if (!qtyOptions.some(n=>String(n)===form.units) || !qtyOptions.some(n=>String(n)===form.stock) || !periodOptions.some(n=>String(n)===form.period)) {setFormError('Choose an available whole-number option for units, stock and period.');return;}
    if (form.group.trim().length>1024) {setFormError('Comparison group must be at most 1,024 characters.');return;}
    const values:any={name:form.name.trim(),owner:user.email,product:[form.product],creator:[matchingCreators[0].id],price:Number(form.price),discount:Number(form.discount),units:Number(form.units),stock:Number(form.stock),period:Number(form.period),source:'Simulated coursework data - assumptions only'};
    if (form.cost.trim()!=='') values.cost=Number(form.cost);
    if (form.group.trim()) values.group=form.group.trim();
    if (form.notes.trim()) values.notes=form.notes.trim();
    busy.current=true;
    try { const record=await createRecord.mutateAsync(values); onCreated(record); }
    catch (err:any) {setFormError(err?.message || 'Could not save the scenario. Your inputs are still here; please try again.');}
    finally {busy.current=false;}
  };
  return <div className="stack">
    <div className="page-head"><div><h1>Create scenario</h1><p>Enter a starting set of assumptions. After saving, compare changes in Recommendations.</p></div><button type="button" className="btn" onClick={onCancel} disabled={createRecord.status==='pending'}><ArrowLeft size={14}/>Cancel</button></div>
    <div className="notice"><Info size={19}/><p className="small">Enter simulated coursework assumptions. Sales volume is an assumption, not a forecast. Leave cost empty when it is unknown.</p></div>
    {(products.status==='error'||creators.status==='error')&&<div className="notice warn" role="alert">The product or user catalogue could not be loaded. Please refresh and try again.</div>}
    {creators.status==='success'&&!creatorReady&&<div className="notice warn" role="alert">A unique user record could not be found for your account. Scenario creation is unavailable until the user connection is corrected.</div>}
    {!createRecord.enabled&&<div className="notice warn" role="status">Your account does not currently have permission to add scenarios.</div>}
    <form className="panel stack scenario-create-form" onSubmit={submit} noValidate>
      <div className="grid-2">
        <label>Scenario name *<input className="input" value={form.name} onChange={e=>set('name',e.target.value)} maxLength={1024} required placeholder="e.g. Snack + drink — 5% trial"/></label>
        <label>Product *<select className="input" value={form.product} onChange={e=>set('product',e.target.value)} required disabled={products.status!=='success'}><option value="">{products.status==='pending'?'Loading products…':'Choose a product'}</option>{productOptions.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>Reference price (THB) *<input className="input" inputMode="decimal" value={form.price} onChange={e=>set('price',e.target.value)} required placeholder="e.g. 95.00"/></label>
        <label>Unit cost assumption (THB)<input className="input" inputMode="decimal" value={form.cost} onChange={e=>set('cost',e.target.value)} placeholder="Leave blank if unknown"/><span className="small muted">Unknown cost is not treated as zero.</span></label>
        <label>Discount percent *<input className="input" inputMode="numeric" value={form.discount} onChange={e=>set('discount',e.target.value)} required placeholder="Whole number from 0 to 100"/></label>
        <label>Assumed units *<select className="input" value={form.units} onChange={e=>set('units',e.target.value)} required><option value="">Select assumed units</option>{qtyOptions.map(n=><option key={n} value={String(n)}>{n.toLocaleString('en-US')}</option>)}</select></label>
        <label>Available stock *<select className="input" value={form.stock} onChange={e=>set('stock',e.target.value)} required><option value="">Select available stock</option>{qtyOptions.map(n=><option key={n} value={String(n)}>{n.toLocaleString('en-US')}</option>)}</select></label>
        <label>Period (days) *<select className="input" value={form.period} onChange={e=>set('period',e.target.value)} required><option value="">Select a period</option>{periodOptions.map(n=><option key={n} value={String(n)}>{n} {n===1?'day':'days'}</option>)}</select></label>
        <label>Comparison group<input className="input" value={form.group} onChange={e=>set('group',e.target.value)} maxLength={1024} placeholder="Optional group for comparable scenarios"/></label>
      </div>
      <label>Assumption notes<textarea className="input" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Explain your assumptions and uncertainties"/></label>
      <p className="small muted">Saved for the signed-in user. Product, owner, inputs and results are stored in the existing Scenarios database.</p>
      {formError&&<div className="notice warn" role="alert">{formError}</div>}
      <div className="row"><button type="submit" className="btn primary" disabled={!createRecord.enabled||!creatorReady||products.status!=='success'||products.hasNextPage||createRecord.status==='pending'}>{createRecord.status==='pending'?'Creating…':'Create scenario'}</button><button type="button" className="btn" onClick={onCancel} disabled={createRecord.status==='pending'}>Cancel</button></div>
      {products.hasNextPage&&<p className="small muted">The product catalogue is incomplete; creation is paused until all products are available.</p>}
    </form>
  </div>;
}

function ConnectedScenarios({loginLink,openDemo,backToList,onRecommend,onOpenScenario,recordId,initialDraft,onFlowCreated,onCancelDraft}: any) {
  const user = useCurrentUser();
  const rowLink=useNavigationSetting({name:'saved-scenario-row-link',label:'Saved scenario row destination',initialValue:{destination:'/pixso-preview',openIn:'SELF'}});
  const [search,setSearch] = useState('');
  const [showCreate,setShowCreate] = useState(!!initialDraft);
  const [savedNotice,setSavedNotice] = useState('');
  const title=useTextSetting({name:'saved-scenarios-title',label:'Saved scenario list title',initialValue:'Saved scenarios'});
  const {data,status,error,refetch,isRefetching,hasNextPage,fetchNextPage,isFetchingNextPage} = useRecords({from:ds.scenarios,
    select:savedScenarioSelect,
    where:q.and(q.text('owner').is(user?.email ?? ''),q.text('owner').isNotEmpty()),
    orderBy:q.desc('createdAt'),count:20,enabled:!!user?.email && !recordId,
  });
  const back=backToList;
  const records = (data?.pages.flatMap(p=>p.items) ?? []).filter(item=>!!user?.email && dbText(item.fields.owner).toLowerCase()===user.email.toLowerCase());
  const visible = records.filter(item=>[dbText(item.fields.name),dbText(item.fields.product),dbText(item.fields.comparisonGroup)].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  if (!user?.email) return <AuthGate loginLink={loginLink} title="Sign in to My Scenarios" description="Create and view your saved scenarios with your account." openDemo={openDemo}/>;
  if (showCreate) return <CreateScenario user={user} initialDraft={initialDraft} onCancel={()=>{setShowCreate(false);onCancelDraft?.();}} onCreated={(record:any)=>{if(initialDraft&&record?.id){onFlowCreated(record);return;}setShowCreate(false);setSavedNotice('Scenario saved successfully.');if(record?.id)onOpenScenario(record.id);else if(recordId)back();else void refetch();}}/>;
  if (recordId) return <SavedScenarioDetail key={user.email+':'+recordId} recordId={recordId} email={user.email} back={back} onCreate={()=>setShowCreate(true)} onRecommend={onRecommend}/>;
  return <div className="stack">
    <div className="page-head"><div className="stack" style={{gap:9}}><div className="row"><h1>{title}</h1><Pill tone="green">{storageLabel}</Pill></div><p>Create a starting scenario, then compare changes in Recommendations.</p><p className="small muted">Signed in as {user.fullName || user.email} · Only your records are shown.</p></div><div className="row"><button className="btn" disabled={isRefetching} onClick={()=>refetch()}><RotateCcw size={14}/>{isRefetching?'Refreshing…':'Refresh records'}</button><button type="button" className="btn primary" onClick={()=>setShowCreate(true)}>Create scenario <ArrowRight size={14}/></button></div></div>
    {savedNotice&&<div className="notice" role="status">{savedNotice}</div>}
    <details className="data-note"><summary>About these scenarios</summary><p>These are your saved database records. Values use simulated coursework assumptions. The original Pixso example is under Explore sample screens.</p></details>
    <div className="row between"><label className="scenario-search" style={{minWidth:0,width:340,maxWidth:'100%'}}>Search saved scenarios<input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Scenario, product or comparison group…"/></label><span className="small muted">{visible.length} of {records.length} loaded records{hasNextPage?' · More available':''}</span></div>
    {status==='pending'?<div className="panel" role="status">Loading your saved scenarios…</div>:status==='error'?<div className="panel stack" role="alert"><h2>Unable to load scenarios</h2><p className="muted">The database could not be reached. Please try again.</p><button className="btn" onClick={()=>refetch()}>Try again</button></div>:visible.length===0?<div className="panel stack" role="status"><div className="row" style={{alignItems:'flex-start',gap:16}}><div aria-hidden="true" style={{width:120,height:120,overflow:'hidden',pointerEvents:'none',flexShrink:0}}><img src="/studio-media/86599a08-7339-4317-b98d-61094eb2268c.png" alt="" style={{position:'relative',width:606.28,height:353.72,left:-166.15,top:-160.62,maxWidth:'none'}}/></div><div className="stack" style={{gap:8}}><h2>{search?'No matching scenarios':'No saved scenarios yet'}</h2><p className="muted">{search?'Try another name, product or comparison group.':'Create your first set of assumptions here.'}</p>{search&&<button className="btn" onClick={()=>setSearch('')}>Clear search</button>}</div></div></div>:<div className="table-wrap"><table className="db-table scenario-table"><thead><tr><th>Scenario / product</th><th>Discount / period</th><th>Revenue (THB)</th><th>Gross profit (THB)</th><th>Cost & stock</th><th>Details</th></tr></thead><tbody>{visible.map(item=><tr key={item.id}><td><strong>{dbText(item.fields.name)||'Untitled scenario'}</strong><p className="small muted" style={{marginTop:5}}>{dbText(item.fields.product)||'Product not provided'}</p><p className="small muted">{dbDate(item.fields.createdAt)}</p></td><td>{dbUnits(item.fields.discount)}%<p className="small muted">{dbUnits(item.fields.period)} days</p></td><td>{dbMoney(item.fields.revenue)}</td><td>{dbMoney(item.fields.grossProfit)}</td><td><ScenarioChecks fields={item.fields}/></td><td><NavigationAction navigation={rowLink} recordId={item.id} datasourceId="scenarios" className="btn">View details <ChevronRight size={14}/></NavigationAction></td></tr>)}</tbody></table></div>}
    {hasNextPage&&<button className="btn" disabled={isFetchingNextPage} onClick={()=>fetchNextPage()}>{isFetchingNextPage?'Loading…':'Load more records'}</button>}
    <p className="small muted">Gross profit is unavailable when cost is unknown. Negative remaining stock means the assumed volume cannot be fulfilled from the stated stock.</p>
  </div>;
}

const decisionSelect = q.select({
  name:'tJKbj', reason:'6Src1', status:'kpXrI', owner:'WCx8e',
  scenario:'amMCr', decidedBy:'oNRE7', date:'ayDEN', snapshot:'NFs9O',
});
const decisionCreateFields = q.select({
  name:'tJKbj', reason:'6Src1', owner:'WCx8e',
  scenario:'amMCr', decidedBy:'oNRE7', snapshot:'NFs9O',
});
const decisionUpdateFields = q.select({reason:'6Src1', status:'kpXrI', date:'ayDEN'});

function linkedIds(value:any):string[] {
  if (Array.isArray(value)) return value.flatMap(linkedIds);
  return value && typeof value==='object' && value.id ? [String(value.id)] : [];
}
function dateInputValue(value:any):string {
  const date = new Date(dbText(value));
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=(type:string)=>parts.find(part=>part.type===type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function ConnectedDecisions({loginLink,openDemo,openScenarios}:any) {
  const user=useCurrentUser();
  const [mode,setMode]=useState<'list'|'create'|'detail'|'edit'>('list');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [form,setForm]=useState({name:'',scenario:'',reason:''});
  const [edit,setEdit]=useState({status:'Pending',reason:'',date:''});
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const busy=useRef(false);
  const decisions=useRecords({
    from:ds.decisions,select:decisionSelect,
    where:q.and(q.text('owner').is(user?.email ?? ''),q.text('owner').isNotEmpty()),
    count:100,enabled:!!user?.email,
  });
  const scenarios=useRecords({
    from:ds.scenarios,select:savedScenarioSelect,
    where:q.and(q.text('owner').is(user?.email ?? ''),q.text('owner').isNotEmpty()),
    orderBy:q.desc('createdAt'),count:100,enabled:!!user?.email && mode==='create',
  });
  const creators=useLinkedRecords({
    from:ds.decisions,select:q.select({decider:'oNRE7'}),field:'decider',
    search:user?.email ?? '',count:1000,enabled:!!user?.email && mode==='create',
  });
  const createDecision=useRecordCreate({from:ds.decisions,fields:decisionCreateFields,onSuccess:()=>emitTestEvent('decision-saved')});
  const updateDecision=useRecordUpdate({from:ds.decisions,fields:decisionUpdateFields});
  const records=(decisions.data?.pages.flatMap(p=>p.items) ?? []).filter(item=>!!user?.email && dbText(item.fields.owner).toLowerCase()===user.email.toLowerCase());
  const scenarioRecords=(scenarios.data?.pages.flatMap(p=>p.items) ?? []).filter(item=>!!user?.email && dbText(item.fields.owner).toLowerCase()===user.email.toLowerCase());
  const matchingCreators=(creators.data?.pages.flatMap(p=>p.items) ?? []).filter(item=>String(item.title ?? '').trim().toLowerCase()===String(user?.email ?? '').trim().toLowerCase());
  const creatorReady=creators.status==='success' && !creators.hasNextPage && matchingCreators.length===1;
  const current=records.find(item=>item.id===selectedId);
  const visible=records.filter(item=>[dbText(item.fields.name),dbText(item.fields.scenario),dbText(item.fields.status),dbText(item.fields.reason)].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  const reset=()=>{setMode('list');setSelectedId(null);setError('');};
  const submitCreate=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(busy.current || createDecision.status==='pending') return;
    if(!user?.email || !createDecision.enabled || !creatorReady){setError('Your user record or permission is unavailable. Please refresh and try again.');return;}
    if(!form.name.trim() || form.name.trim().length>1024 || !form.reason.trim()){setError('Enter a decision name and a reason.');return;}
    const scenario=scenarioRecords.find(item=>item.id===form.scenario);
    if(!scenario){setError('Select one of your saved scenarios.');return;}
    if(decisions.hasNextPage){setError('Load all your decisions before creating another so the existing links can be checked.');return;}
    busy.current=true;
    let created:any;
    try {
      const fresh=await decisions.refetch();
      if(fresh.error || !fresh.data){setError('Could not check existing decisions. Please try again.');return;}
      const all=fresh.data.pages.flatMap(p=>p.items);
      const total=fresh.data.pages[0]?.total;
      if((typeof total==='number' && all.length<total) || fresh.hasNextPage){setError('Load all your decisions before creating another.');return;}
      if(all.some(item=>linkedIds(item.fields.scenario).includes(scenario.id))){setError('A decision already exists for this scenario. Open the existing decision instead.');return;}
      const f=scenario.fields;
      const snapshot=JSON.stringify({
        capturedAt:new Date().toISOString(),scenarioId:scenario.id,
        inputs:{name:dbText(f.name),product:dbText(f.product),referencePrice:f.referencePrice,cost:f.cost,discount:f.discount,units:f.units,stock:f.stock,period:f.period,comparisonGroup:dbText(f.comparisonGroup),notes:dbText(f.notes),source:dbText(f.source)},
        results:{inputCheck:dbText(f.inputCheck),discountedPrice:f.discountedPrice,revenue:f.revenue,grossProfit:f.grossProfit,remainingStock:f.remainingStock,costCheck:dbText(f.costCheck),stockCheck:dbText(f.stockCheck),recordCheck:dbText(f.recordCheck)},
        warning:'Captured simulated assumptions; not a sales forecast. This snapshot is not immutable.',
      },null,2);
      created=await createDecision.mutateAsync({name:form.name.trim(),reason:form.reason.trim(),owner:user.email,scenario:[scenario.id],decidedBy:[matchingCreators[0].id],snapshot});
    } catch(err:any) {setError(err?.message || 'Could not save this decision. Your inputs are still here.');return;}
    finally {busy.current=false;}
    setForm({name:'',scenario:'',reason:''});setSelectedId(created?.id ?? null);setMode(created?.id?'detail':'list');setError('');setNotice('Pending decision saved ' + savedLocation + '.');
    const refreshed=await decisions.refetch();
    if(refreshed.error) setNotice('Decision saved, but the list could not be refreshed. Use Refresh records to load it.');
  };
  const beginEdit=()=>{
    if(!current) return;
    setEdit({status:dbText(current.fields.status)||'Pending',reason:dbText(current.fields.reason),date:dateInputValue(current.fields.date)});
    setError('');setMode('edit');
  };
  const submitEdit=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(busy.current || updateDecision.status==='pending') return;
    if(!current || !user?.email || dbText(current.fields.owner).toLowerCase()!==user.email.toLowerCase() || !updateDecision.enabled){setError('This decision cannot be updated for your account.');return;}
    if(!['Pending','Approved','Rejected'].includes(edit.status) || !edit.reason.trim()){setError('Choose a valid status and enter a reason.');return;}
    if(edit.status!=='Pending' && !edit.date){setError('Approved and rejected decisions require a decision date.');return;}
    const date=edit.status==='Pending'?null:new Date(edit.date+'T00:00:00+08:00').toISOString();
    busy.current=true;
    try{await updateDecision.mutateAsync({recordId:current.id,fields:{status:edit.status,reason:edit.reason.trim(),date}});}
    catch(err:any){setError(err?.message || 'Could not update this decision. Your inputs are still here.');return;}
    finally{busy.current=false;}
    setMode('detail');setError('');setNotice('Decision updated in the database.');
    const refreshed=await decisions.refetch();
    if(refreshed.error) setNotice('Decision updated, but the list could not be refreshed. Use Refresh records to load it.');
  };
  if(!user?.email) return <AuthGate loginLink={loginLink} title="Sign in to My Decisions" description="View your saved decisions and keep track of their status." openDemo={openDemo}/>;
  if(mode==='create') return <div className="stack">
    <div className="page-head"><div><h1>New decision</h1><p>Link a pending decision to one of your saved scenarios.</p></div><button className="btn" onClick={reset} disabled={createDecision.status==='pending'}><ArrowLeft size={14}/>Cancel</button></div>
    <div className="notice"><Info size={18}/><p className="small">The signed-in account and a snapshot of the selected scenario are captured automatically. A new decision starts as Pending; it is not an approval.</p></div>
    {(scenarios.status==='error'||creators.status==='error')&&<div className="notice warn" role="alert">Could not load your scenarios or user record. Please refresh and try again.</div>}
    {creators.status==='success'&&!creatorReady&&<div className="notice warn" role="alert">A unique user record could not be found for your account. Decision creation is unavailable until the user connection is corrected.</div>}
    {!createDecision.enabled&&<div className="notice warn" role="status">Your account does not currently have permission to add decisions.</div>}
    <form className="panel stack" onSubmit={submitCreate} noValidate>
      <label>Decision name *<input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} maxLength={1024} placeholder="e.g. Review the 5% scenario"/></label>
      <label>My scenario *<select className="input" value={form.scenario} onChange={e=>setForm({...form,scenario:e.target.value})} disabled={scenarios.status!=='success'}><option value="">{scenarios.status==='pending'?'Loading your scenarios…':'Choose a saved scenario'}</option>{scenarioRecords.map(item=><option key={item.id} value={item.id}>{dbText(item.fields.name)||'Untitled scenario'} · {dbText(item.fields.product)||'Product not provided'}</option>)}</select></label>
      {scenarios.hasNextPage&&<button type="button" className="btn" onClick={()=>scenarios.fetchNextPage()} disabled={scenarios.isFetchingNextPage}>{scenarios.isFetchingNextPage?'Loading…':'Load more scenarios'}</button>}
      {scenarios.status==='success'&&scenarioRecords.length===0&&<button type="button" className="btn" onClick={openScenarios}>Create a scenario first <ArrowRight size={14}/></button>}
      <label>Reason *<textarea className="input" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Explain why this scenario needs review"/></label>
      {decisions.hasNextPage&&<p className="small muted">Return to My Decisions and load all records before creating a decision.</p>}
      {error&&<div className="notice warn" role="alert">{error}</div>}
      <div className="row"><button type="submit" className="btn primary" disabled={!createDecision.enabled||!creatorReady||scenarios.status!=='success'||decisions.status!=='success'||decisions.hasNextPage||createDecision.status==='pending'}>{createDecision.status==='pending'?'Saving…':'Save decision'}</button><button type="button" className="btn" onClick={reset} disabled={createDecision.status==='pending'}>Cancel</button></div>
    </form>
  </div>;
  if(mode==='edit'&&current) return <div className="stack">
    <div className="page-head"><div><h1>Update decision</h1><p>{dbText(current.fields.name)}</p></div><button className="btn" onClick={()=>{setError('');setMode('detail');}} disabled={updateDecision.status==='pending'}>Cancel</button></div>
    <form className="panel stack" onSubmit={submitEdit} noValidate>
      <label>Status *<select className="input" value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
      <label>Reason *<textarea className="input" value={edit.reason} onChange={e=>setEdit({...edit,reason:e.target.value})}/></label>
      {edit.status!=='Pending'&&<label>Decision date *<input type="date" className="input" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})}/></label>}
      <p className="small muted">Returning to Pending clears the decision date. The linked scenario, account and captured snapshot remain unchanged.</p>
      {error&&<div className="notice warn" role="alert">{error}</div>}
      <button className="btn primary" type="submit" disabled={!updateDecision.enabled||updateDecision.status==='pending'}>{updateDecision.status==='pending'?'Saving…':'Save changes'}</button>
    </form>
  </div>;
  if(mode==='detail') return <div className="stack">
    <div className="row between"><button className="btn" onClick={reset}><ArrowLeft size={14}/>Back to My Decisions</button><button className="btn" onClick={()=>decisions.refetch()} disabled={decisions.isRefetching}><RotateCcw size={14}/>Refresh records</button></div>
    {notice&&<div className="notice" role="status">{notice}</div>}
    {!current?<section className="panel stack"><h2>Decision unavailable</h2><p className="muted">Refresh the list or check that the record belongs to your account.</p></section>:<section className="panel stack">
      <div className="row between"><Pill tone="green">Saved database record</Pill><Pill tone={dbText(current.fields.status)==='Pending'?'amber':'green'}>{dbText(current.fields.status)||'Status not provided'}</Pill></div>
      <h1>{dbText(current.fields.name)||'Untitled decision'}</h1>
      <dl className="db-facts">{[['Scenario',dbText(current.fields.scenario)||'Not provided'],['Decided by',dbText(current.fields.decidedBy)||'Not provided'],['Decision date',dbDate(current.fields.date)],['Owner',dbText(current.fields.owner)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div><h3>Reason</h3><p style={{whiteSpace:'pre-wrap',marginTop:8}}>{dbText(current.fields.reason)||'No reason provided.'}</p></div>
      <RecommendationEvidence evidence={opsSnapshotEvidence(dbText(current.fields.snapshot))}/><details><summary>View captured scenario snapshot</summary><p className="small muted">This is the saved capture and may differ from the current scenario.</p><pre className="small" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{dbText(current.fields.snapshot)||'No snapshot provided.'}</pre></details>
      {updateDecision.enabled&&<button className="btn primary" onClick={beginEdit}>Update status and reason</button>}
    </section>}
  </div>;
  return <div className="stack">
    <div className="page-head"><div className="stack" style={{gap:9}}><div className="row"><h1>Decision history</h1><Pill tone="green">{storageLabel}</Pill></div><p>Review decisions linked to your saved scenarios.</p><p className="small muted">Signed in as {user.fullName || user.email} · Only your records are shown.</p></div><div className="row"><button className="btn" disabled={decisions.isRefetching} onClick={()=>decisions.refetch()}><RotateCcw size={14}/>{decisions.isRefetching?'Refreshing…':'Refresh records'}</button><button className="btn primary" onClick={()=>{setError('');setNotice('');setMode('create');}}>New decision <ArrowRight size={14}/></button></div></div>
    {notice&&<div className="notice" role="status">{notice}</div>}
    <div className="notice"><ShieldCheck size={19}/><p className="small">These are saved Decisions database records. The sample decision log remains a separate walkthrough.</p></div>
    <label style={{width:340,maxWidth:'100%'}}>Search my decisions<input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Decision, scenario or status…"/></label>
    {decisions.status==='pending'?<div className="panel" role="status">Loading your decisions…</div>:decisions.status==='error'?<div className="panel stack" role="alert"><h2>Unable to load decisions</h2><button className="btn" onClick={()=>decisions.refetch()}>Try again</button></div>:visible.length===0?<section className="panel"><div className="row" style={{alignItems:'flex-start',gap:16}}><div aria-hidden="true" style={{width:120,height:127.5,overflow:'hidden',pointerEvents:'none',flexShrink:0}}><img src="/studio-media/b8fa95e6-8d1e-4b58-a3cc-2a6c5e9a1b4f.jpeg" alt="" style={{position:'relative',width:616.125,height:358.875,left:-174.375,top:-157.5,maxWidth:'none'}}/></div><div className="stack" style={{gap:8}}><h2>{search?'No matching decisions':'No saved decisions yet'}</h2><p className="muted">{search?'Try another search.':'Create a decision for one of your scenarios.'}</p></div></div></section>:<div className="table-wrap"><table className="db-table"><thead><tr><th>Decision</th><th>Scenario</th><th>Status</th><th>Decision date</th><th>Details</th></tr></thead><tbody>{visible.map(item=><tr key={item.id}><td><strong>{dbText(item.fields.name)||'Untitled decision'}</strong><p className="small muted" style={{marginTop:5}}>{dbText(item.fields.reason)||'No reason provided'}</p></td><td>{dbText(item.fields.scenario)||'Not provided'}</td><td><Pill tone={dbText(item.fields.status)==='Pending'?'amber':'green'}>{dbText(item.fields.status)||'Not provided'}</Pill></td><td>{dbDate(item.fields.date)}</td><td><button className="btn" onClick={()=>{setSelectedId(item.id);setNotice('');setMode('detail');}}>View details <ChevronRight size={14}/></button></td></tr>)}</tbody></table></div>}
    {decisions.hasNextPage&&<button className="btn" disabled={decisions.isFetchingNextPage} onClick={()=>decisions.fetchNextPage()}>{decisions.isFetchingNextPage?'Loading…':'Load more decisions'}</button>}
  </div>;
}

// BEGIN OPS FEATURE
// Pure rules and arithmetic. Inlined into the Softr block by build-recommendations.py.
const OPS_VERSION = 'rules-1.1';
const OPS_NOTE_MARKER = '\n\n[OPERATIONAL_RECOMMENDATIONS_V1]\n';

function opsNumber(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function opsDiscountLevels(cap, current) {
  const mid = current > 0 && current < cap ? current : Math.floor(cap / 2);
  return [...new Set([0, mid, cap])].sort((a,b)=>a-b);
}
function opsFingerprint(record) {
  const f=record?.fields || {};
  return JSON.stringify([record?.id,f.name,f.owner,f.product,f.referencePrice,f.cost,f.discount,f.units,f.stock,f.period,f.comparisonGroup,f.notes,f.source]);
}
const opsValidInt=(value,min=0,max=1000000)=>Number.isInteger(value)&&value>=min&&value<=max;
const opsValidMoney=value=>value!==null&&value>=0&&value<=1000000&&Math.abs(value*100-Math.round(value*100))<0.00001;
const opsProvided=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
function opsWorkingInputs(record,input={}) {
  const f=record?.fields||{};
  const originalSource={price:opsNumber(f.referencePrice),cost:opsNumber(f.cost),discount:opsNumber(f.discount),units:opsNumber(f.units),stock:opsNumber(f.stock),period:opsNumber(f.period)};
  const overrides=input.overrides||{};
  const costRaw=Object.prototype.hasOwnProperty.call(overrides,'cost')?overrides.cost:f.cost;
  const stockRaw=Object.prototype.hasOwnProperty.call(overrides,'stock')?overrides.stock:f.stock;
  return {originalSource,source:{...originalSource,cost:opsNumber(costRaw),stock:opsNumber(stockRaw)},costRaw,stockRaw};
}
function opsDefaults(record) {
  const stock=opsNumber(record?.fields?.stock),units=opsNumber(record?.fields?.units);
  return {safetyStock:opsValidInt(stock)&&opsValidInt(units)?String(Math.max(0,stock-units)):'0',maxRestock:'0'};
}
function opsDiagnose(record,input={}) {
  const {source,costRaw}=opsWorkingInputs(record,input);
  const items=[];
  const safety=opsNumber(input.safetyStock??opsDefaults(record).safetyStock);
  const restock=opsNumber(input.maxRestock??'0');
  const minimumMargin=opsNumber(input.minMargin);
  const add=(id,severity,title,detail,action)=>items.push({id,severity,title,detail,action});
  if(opsProvided(costRaw)&&!opsValidMoney(source.cost)) add('invalid-cost','error','Correct the unit cost','Enter a non-negative amount with at most two decimals, or leave the cost unknown.','cost');
  else if(source.cost===null) add('unknown-cost','warning','Unit cost is missing','Revenue and stock can be compared. Add a unit cost to check margin and profit, or keep the plan marked for cost review.','cost');
  if(!opsValidInt(source.stock)) add('invalid-stock','error','Correct the stock assumption','Enter a non-negative whole number of available units.','stock');
  else if(opsValidInt(source.units)&&source.units>source.stock) add('stock-shortfall','warning','The recorded volume exceeds stock','The scenario assumes '+source.units.toLocaleString('en-US')+' sales and '+source.stock.toLocaleString('en-US')+' available units: '+(source.units-source.stock).toLocaleString('en-US')+' units short. Compare a lower sales cap or explicitly allow additional stock.','maxRestock');
  if(opsValidInt(source.stock)&&opsValidInt(safety)&&opsValidInt(restock)&&safety>source.stock+restock) add('unreachable-buffer','error','The safety stock target cannot be reached','The '+safety.toLocaleString('en-US')+'-unit buffer exceeds '+(source.stock+restock).toLocaleString('en-US')+' units of stock including the allowed addition. Lower the buffer or revise the stock limits.','safetyStock');
  if(opsValidMoney(source.price)&&opsValidMoney(source.cost)&&minimumMargin!==null&&minimumMargin>=0&&minimumMargin<=100) {
    const reference=opsModel(source.price,source.cost,0,1,1);
    const marginPass=reference.margin!==null?reference.margin+0.0000001>=minimumMargin:minimumMargin===0&&source.cost===0;
    if(!marginPass) add('margin-limit','error','The minimum margin is not achievable','Even the reference price cannot meet '+minimumMargin+'% unit margin with the supplied cost. Check the cost or revise the margin target.','minMargin');
  }
  const demand=Array.isArray(input.demand)?input.demand:[];
  if(demand.length>1&&demand.every(d=>opsValidInt(opsNumber(d?.units)))&&new Set(demand.map(d=>opsNumber(d?.units))).size===1) add('equal-demand','info','Every discount uses the same volume','There is no assumed sales increase from discounting. Keep these values if intentional, or enter a different volume for each option. Equivalent actions will be merged.','demand');
  const first=items.find(item=>item.severity==='error')||items.find(item=>item.severity==='warning')||items[0];
  return {items,nextStep:first?first.detail:'Review the demand assumptions, then compare actions within your limits.'};
}
function opsGenerate(record, input) {
  const errors=[];
  input=input||{};
  const {source,originalSource,costRaw}=opsWorkingInputs(record,input);
  const validInt=opsValidInt,validMoney=opsValidMoney;
  const diagnostics=opsDiagnose(record,input);
  const adjustments=['cost','stock'].filter(field=>source[field]!==originalSource[field]).map(field=>({field,label:field==='cost'?'Unit cost':'Available stock',from:originalSource[field],to:source[field]}));
  if(!validMoney(source.price)) errors.push('The source reference price must be a non-negative amount with at most two decimals.');
  if((opsProvided(costRaw)&&source.cost===null)||(source.cost!==null&&!validMoney(source.cost))) errors.push('The working unit cost must be non-negative with at most two decimals, or left unknown.');
  if(!validInt(source.discount,0,100)||!validInt(source.units,0,1000000)||!validInt(source.stock,0,1000000)||!validInt(source.period,1,3650)) errors.push('The comparison needs whole-number units, stock, discount and a positive period.');
  const constraints={
    goal:input.goal,maxDiscount:opsNumber(input.maxDiscount),minMargin:opsNumber(input.minMargin),
    safetyStock:opsNumber(input.safetyStock),maxRestock:opsNumber(input.maxRestock),fixedCost:opsNumber(input.fixedCost),
    demand:(Array.isArray(input.demand)?input.demand:[]).map(item=>({discount:opsNumber(item?.discount),units:opsNumber(item?.units)})),
  };
  if(!['profit','revenue','buffer'].includes(constraints.goal)) errors.push('Choose a comparison objective.');
  if(!validInt(constraints.maxDiscount,0,100)) errors.push('Maximum discount must be a whole percent from 0 to 100.');
  if(constraints.minMargin===null||constraints.minMargin<0||constraints.minMargin>100) errors.push('Minimum unit margin must be between 0 and 100 percent.');
  if(!validInt(constraints.safetyStock,0,1000000)||!validInt(constraints.maxRestock,0,1000000)) errors.push('Safety stock and additional stock limit must be non-negative whole numbers.');
  if(!validMoney(constraints.fixedCost)) errors.push('Additional operating cost must be non-negative with at most two decimals.');
  const levels=opsDiscountLevels(constraints.maxDiscount,source.discount);
  if(constraints.demand.length!==levels.length || levels.some(discount=>constraints.demand.filter(d=>d.discount===discount).length!==1) || constraints.demand.some(d=>!validInt(d.units,0,1000000))) errors.push('Enter an explicit whole-number demand assumption for every discount option.');
  if(errors.length) return {errors,version:OPS_VERSION,source,originalSource,adjustments,constraints,diagnostics,plans:[],candidates:[],recommendedId:null,mergedCount:0,noFeasibleReason:errors[0],keepOriginal:false,keepOriginalReason:''};
  const model=(discount,units,stock)=>opsModel(source.price,source.cost,discount,units,stock,constraints.fixedCost);
  const originalEvidence=opsReadEvidence(record?.fields?.notes);
  const capturedOperatingCost=opsNumber(originalEvidence?.constraints?.fixedCost);
  const baselineOperatingCost=['rules-1.0','rules-1.1'].includes(originalEvidence?.version)&&['rule-based','rule-based-with-ai-explanation'].includes(originalEvidence?.mode)&&validMoney(capturedOperatingCost)?capturedOperatingCost:0;
  const baselineMetrics=opsModel(originalSource.price,validMoney(originalSource.cost)?originalSource.cost:null,originalSource.discount,originalSource.units,originalSource.stock,baselineOperatingCost);
  if(!opsValidInt(originalSource.stock)) baselineMetrics.remaining=null;
  const baseline={discount:originalSource.discount,units:originalSource.units,stock:originalSource.stock,operatingCost:baselineOperatingCost,metrics:baselineMetrics};
  const marginPass=m=>source.cost===null || (m.margin!==null && m.margin+0.0000001>=constraints.minMargin) || (m.margin===null && constraints.minMargin===0 && source.cost===0);
  const candidates=constraints.demand.map(d=>({...d,stock:source.stock,metrics:model(d.discount,d.units,source.stock)}));
  const score=c=>constraints.goal==='profit'&&source.cost!==null?c.metrics.contribution:constraints.goal==='revenue'?c.metrics.revenue:c.metrics.remaining;
  const ordered=[...candidates].sort((a,b)=>score(b)-score(a)||a.discount-b.discount);
  const feasible=ordered.filter(c=>marginPass(c.metrics)&&c.metrics.remaining>=constraints.safetyStock);
  const marginCandidates=ordered.filter(c=>marginPass(c.metrics));
  const chosen=feasible[0]||marginCandidates[0]||ordered[0];
  const commonRisk='Demand is a supplied assumption. There is no measured sales response or forecast.';
  const assess=(discount,units,stock)=>{
    const metrics=model(discount,units,stock);
    const issues=[];
    if(metrics.remaining<constraints.safetyStock) issues.push('The assumed stock does not cover sales plus the requested safety buffer.');
    if(!marginPass(metrics)) issues.push('The minimum unit margin cannot be met at this price and cost.');
    if(units===0&&originalSource.units>0) issues.push('A zero-sales plan does not address the original demand. Revise the stock or safety target.');
    const isNoOp=discount===originalSource.discount&&units===originalSource.units&&stock===originalSource.stock&&source.cost===originalSource.cost;
    if(isNoOp) issues.push('This action repeats the saved scenario. Keep the original, or change an assumption before saving a new plan.');
    return {metrics,issues,canSave:issues.length===0,needsCostReview:source.cost===null};
  };
  const promotion={
    id:'promotion',title:feasible.length?'Test the discount that fits your objective':'Hold the promotion until the limits change',
    action:'Use '+chosen.discount+'% discount with '+chosen.units.toLocaleString('en-US')+' assumed units over '+source.period+' days.',
    discount:chosen.discount,units:chosen.units,stock:source.stock,additionalStock:0,
    reason:source.cost===null?'Cost is unknown. This option is selected by stock cover or revenue; it is not a profit recommendation.':'Compared '+candidates.length+' explicit demand assumptions against the discount, margin and stock limits.',
    risks:[commonRisk,'The result depends on the unit cost and volume assumptions.'],
    ...assess(chosen.discount,chosen.units,source.stock),
  };
  const protectedBase=candidates.find(c=>c.discount===0);
  const protectedUnits=Math.min(protectedBase.units,Math.max(0,source.stock-constraints.safetyStock));
  const protection={
    id:'stock-protection',title:'Keep prices and reserve stock',
    action:'Keep the reference price, cap sales at '+protectedUnits.toLocaleString('en-US')+' assumed units and reserve a '+constraints.safetyStock.toLocaleString('en-US')+'-unit buffer.',
    discount:0,units:protectedUnits,stock:source.stock,additionalStock:0,
    reason:'Your no-discount assumption is '+protectedBase.units.toLocaleString('en-US')+' units. '+(protectedUnits<protectedBase.units?'Reserving the buffer lowers the cap by '+(protectedBase.units-protectedUnits).toLocaleString('en-US')+' units.':'That volume already fits the available stock and buffer.'),
    risks:[commonRisk,'A sales cap may leave assumed demand unserved; actual lost sales are unknown.'],
    ...assess(0,protectedUnits,source.stock),
  };
  const restockedCandidates=constraints.demand.map(d=>{
    const requiredRestock=Math.max(0,d.units+constraints.safetyStock-source.stock);
    const additionalStock=Math.min(requiredRestock,constraints.maxRestock);
    const stock=source.stock+additionalStock;
    const units=Math.min(d.units,Math.max(0,stock-constraints.safetyStock));
    return {...d,demandUnits:d.units,units,stock,requiredRestock,additionalStock,...assess(d.discount,units,stock)};
  });
  const restockedOrder=(a,b)=>score(b)-score(a)||a.additionalStock-b.additionalStock||a.discount-b.discount;
  const restockedFeasible=restockedCandidates.filter(candidate=>candidate.canSave).sort(restockedOrder);
  const stockTarget=restockedFeasible[0]||[...restockedCandidates].sort(restockedOrder)[0];
  const {requiredRestock,additionalStock,stock:replenishedStock,units:replenishedUnits}=stockTarget;
  const stockObjective=constraints.goal==='profit'&&source.cost!==null?'gross profit after operating cost':constraints.goal==='revenue'?'assumed revenue':'remaining stock';
  const replenishment={
    id:'replenishment',title:!restockedFeasible.length?'Revisit the stock and margin limits':additionalStock?'Plan stock around your objective':'Use the stock-limited comparison',
    action:!restockedFeasible.length?'No distinct stock plan meets the current limits. Review the issues before saving.':additionalStock?'At '+stockTarget.discount+'% discount, model '+additionalStock.toLocaleString('en-US')+' additional units and cap assumed sales at '+replenishedUnits.toLocaleString('en-US')+' units.':'At '+stockTarget.discount+'% discount, keep stock unchanged and cap assumed sales at '+replenishedUnits.toLocaleString('en-US')+' units.',
    discount:stockTarget.discount,units:replenishedUnits,stock:replenishedStock,additionalStock,
    reason:(restockedFeasible.length?'Compared '+restockedCandidates.length+' stock-limited options and selected the changed feasible action with the most '+stockObjective+'.':'Compared '+restockedCandidates.length+' stock-limited options; each is unchanged or fails at least one limit.')+' The '+stockTarget.discount+'% assumption is '+stockTarget.demandUnits.toLocaleString('en-US')+' units. Covering it and the buffer needs '+requiredRestock.toLocaleString('en-US')+' extra units; your limit is '+constraints.maxRestock.toLocaleString('en-US')+'.',
    risks:[commonRisk,'Additional stock is only an assumption. Confirm supply, lead time, expiry and purchasing funds before ordering.',...(additionalStock<requiredRestock?['The stock limit leaves '+(stockTarget.demandUnits-replenishedUnits).toLocaleString('en-US')+' assumed units unserved.']:[])],
    estimatedPurchaseCost:source.cost===null?null:opsRound(additionalStock*source.cost),
    ...assess(stockTarget.discount,replenishedUnits,replenishedStock),
  };
  const rawPlans=[promotion,protection,replenishment];
  const plans=[];
  for(const plan of rawPlans) {
    const existing=plans.find(item=>item.discount===plan.discount&&item.units===plan.units&&item.stock===plan.stock);
    if(existing) {
      existing.mergedStrategies.push(plan.id);
      existing.risks=[...new Set([...existing.risks,...plan.risks])];
      continue;
    }
    const difference=(value,base)=>value===null||base===null?null:opsRound(value-base);
    const delta={revenue:difference(plan.metrics.revenue,baselineMetrics.revenue),grossProfit:difference(plan.metrics.grossProfit,baselineMetrics.grossProfit),contribution:difference(plan.metrics.contribution,baselineMetrics.contribution),remaining:difference(plan.metrics.remaining,baselineMetrics.remaining)};
    const changes=[];
    const signed=value=>(value>0?'+':'')+value.toLocaleString('en-US',{maximumFractionDigits:2});
    if(plan.units!==originalSource.units) changes.push(signed(plan.units-originalSource.units)+' assumed sales units');
    if(plan.stock!==originalSource.stock) changes.push(signed(plan.stock-originalSource.stock)+' stock units');
    if(plan.discount!==originalSource.discount) changes.push(signed(plan.discount-originalSource.discount)+' percentage points of discount');
    if(source.cost!==originalSource.cost) changes.push(source.cost===null?'unit cost left unknown':'unit cost revised to THB '+source.cost.toFixed(2));
    const profitChange=delta.grossProfit===null?'Profit change is unavailable because one comparison cost is unknown.':'Gross profit changes by THB '+signed(delta.grossProfit)+'.';
    const tradeoff=(changes.length?changes.join('; ')+'.':'The business inputs match the saved scenario.')+' '+profitChange+(plan.additionalStock?' Additional stock needs supply and purchasing confirmation.':'');
    plans.push({...plan,mergedStrategies:[plan.id],delta,tradeoff});
  }
  const ranked=plans.filter(p=>p.canSave).sort((a,b)=>{
    const delta=score({metrics:b.metrics})-score({metrics:a.metrics});
    return delta||a.additionalStock-b.additionalStock||plans.indexOf(a)-plans.indexOf(b);
  });
  const originalMarginPass=originalSource.cost===null||(baselineMetrics.margin!==null&&baselineMetrics.margin+0.0000001>=constraints.minMargin)||(baselineMetrics.margin===null&&constraints.minMargin===0&&originalSource.cost===0);
  const originalFeasible=validInt(originalSource.stock,0,1000000)&&originalSource.discount<=constraints.maxDiscount&&originalMarginPass&&baselineMetrics.remaining>=constraints.safetyStock;
  const originalComparable=constraints.goal!=='profit'||(validMoney(originalSource.cost)&&source.cost===originalSource.cost);
  const originalScore=score({metrics:baselineMetrics});
  const keepOriginal=originalFeasible&&originalComparable&&!ranked.some(plan=>score(plan)>originalScore+0.0000001);
  const keepOriginalReason=keepOriginal?'The saved scenario meets the current discount and stock limits.'+(originalSource.cost===null?' Margin and unit cost still need review.':' It also meets the margin limit.')+' None of the changed feasible actions improves '+(constraints.goal==='profit'?'gross profit after operating cost':constraints.goal==='revenue'?'assumed revenue':'remaining stock')+' on these assumptions. Keep the original unless another trade-off matters.':'';
  return {
    errors:[],version:OPS_VERSION,source,originalSource,adjustments,constraints,diagnostics,candidates,plans,baseline,
    mergedCount:rawPlans.length-plans.length,
    noFeasibleReason:ranked.length?'':diagnostics.items.find(item=>item.severity==='error')?.detail||'No distinct action meets the current limits. Check the action issues, adjust the assumptions or keep the original scenario.',
    keepOriginal,keepOriginalReason,
    recommendedId:keepOriginal?null:ranked[0]?.id||null,
    rankingNote:constraints.goal==='profit'&&source.cost===null?'Profit ranking is unavailable because unit cost is unknown. Feasible plans are ordered by remaining stock.':constraints.goal==='profit'?'Eligible plans are ranked by gross profit less the supplied operating cost.':constraints.goal==='revenue'?'Eligible plans are ranked by assumed revenue.':'Eligible plans are ranked by remaining stock after the assumed sales.',
  };
}
function opsReadEvidence(notes) {
  if(typeof notes!=='string'||!notes.includes(OPS_NOTE_MARKER)) return null;
  try{return JSON.parse(notes.slice(notes.indexOf(OPS_NOTE_MARKER)+OPS_NOTE_MARKER.length));}catch{return null;}
}
function opsVisibleNotes(notes) { return String(notes??'').split(OPS_NOTE_MARKER)[0]; }

// Numerical context only. Inlined into the Softr block alongside the rules engine.
// Names, user text, record identifiers and rule prose never enter the AI request.
const OPS_AI_CONTEXT_VERSION = 'ops-ai-1.2';

function opsAiObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid AI context: ' + label + '.');
  return value;
}
function opsAiNumber(value, label, min, max, integer=false, nullable=false, cents=false) {
  if (value === null && nullable) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error('Invalid AI context: ' + label + '.');
  if (cents && Math.abs(value * 100 - Math.round(value * 100)) > 0.0001) throw new Error('Invalid AI context: ' + label + '.');
  return Object.is(value, -0) ? 0 : cents ? Math.round((value + Number.EPSILON) * 100) / 100 : value;
}
function opsAiBoolean(value, label) {
  if (typeof value !== 'boolean') throw new Error('Invalid AI context: ' + label + '.');
  return value;
}
function opsAiSource(value, label) {
  const item = opsAiObject(value, label);
  return {
    price: opsAiNumber(item.price, label + '.price', 0, 1000000, false, false, true),
    cost: opsAiNumber(item.cost, label + '.cost', 0, 1000000, false, true, true),
    discount: opsAiNumber(item.discount, label + '.discount', 0, 100, true),
    units: opsAiNumber(item.units, label + '.units', 0, 1000000, true),
    stock: opsAiNumber(item.stock, label + '.stock', 0, 1000000, true),
    period: opsAiNumber(item.period, label + '.period', 1, 3650, true),
  };
}
function opsAiMetrics(value, label, baseline=false) {
  const item = opsAiObject(value, label);
  return {
    unitPrice: opsAiNumber(item.unitPrice, label + '.unitPrice', 0, 1000000, false, false, true),
    revenue: opsAiNumber(item.revenue, label + '.revenue', 0, 2000000000000, false, false, true),
    grossProfit: opsAiNumber(item.grossProfit, label + '.grossProfit', -2000000000000, 2000000000000, false, true, true),
    remaining: opsAiNumber(item.remaining, label + '.remaining', -1000000, 2000000, true, baseline),
    contribution: opsAiNumber(item.contribution, label + '.contribution', -2000000000000, 2000000000000, false, true, true),
  };
}
function opsAiDelta(value, label) {
  const item = opsAiObject(value, label);
  return {
    revenue: opsAiNumber(item.revenue, label + '.revenue', -4000000000000, 4000000000000, false, true, true),
    grossProfit: opsAiNumber(item.grossProfit, label + '.grossProfit', -4000000000000, 4000000000000, false, true, true),
    contribution: opsAiNumber(item.contribution, label + '.contribution', -4000000000000, 4000000000000, false, true, true),
    remaining: opsAiNumber(item.remaining, label + '.remaining', -3000000, 3000000, true, true),
  };
}

function opsAiContext(run) {
  const item = opsAiObject(run, 'comparison');
  if (!Array.isArray(item.errors) || item.errors.length) throw new Error('Compare valid assumptions before requesting an AI explanation.');
  const constraints = opsAiObject(item.constraints, 'constraints');
  if (!['profit', 'revenue', 'buffer'].includes(constraints.goal)) throw new Error('Invalid AI context: objective.');
  if (!Array.isArray(constraints.demand) || constraints.demand.length < 1 || constraints.demand.length > 3) throw new Error('Invalid AI context: demand.');
  if (!Array.isArray(item.plans) || item.plans.length < 1 || item.plans.length > 3) throw new Error('Invalid AI context: plans.');
  const planIds = ['promotion', 'stock-protection', 'replenishment'];
  if (new Set(item.plans.map(plan => plan?.id)).size !== item.plans.length || item.plans.some(plan => !planIds.includes(plan?.id))) throw new Error('Invalid AI context: plan identifiers.');
  if (item.recommendedId !== null && !item.plans.some(plan => plan.id === item.recommendedId && plan.canSave === true)) throw new Error('Invalid AI context: recommendation.');
  const keepOriginal = opsAiBoolean(item.keepOriginal, 'keepOriginal');
  if (keepOriginal && item.recommendedId !== null) throw new Error('Invalid AI context: original-plan recommendation.');
  const baseline = opsAiObject(item.baseline, 'baseline');
  const context = {
    version: OPS_AI_CONTEXT_VERSION,
    currency: 'THB',
    objective: constraints.goal,
    source: opsAiSource(item.source, 'source'),
    originalSource: opsAiSource(item.originalSource, 'originalSource'),
    constraints: {
      maxDiscount: opsAiNumber(constraints.maxDiscount, 'maxDiscount', 0, 100, true),
      minMargin: opsAiNumber(constraints.minMargin, 'minMargin', 0, 100),
      safetyStock: opsAiNumber(constraints.safetyStock, 'safetyStock', 0, 1000000, true),
      maxRestock: opsAiNumber(constraints.maxRestock, 'maxRestock', 0, 1000000, true),
      fixedCost: opsAiNumber(constraints.fixedCost, 'fixedCost', 0, 1000000, false, false, true),
      demand: constraints.demand.map((demand, index) => {
        const input = opsAiObject(demand, 'demand');
        return {discount: opsAiNumber(input.discount, 'demand.discount', 0, 100, true), units: opsAiNumber(input.units, 'demand.units', 0, 1000000, true)};
      }),
    },
    baseline: {
      discount: opsAiNumber(baseline.discount, 'baseline.discount', 0, 100, true),
      units: opsAiNumber(baseline.units, 'baseline.units', 0, 1000000, true),
      stock: opsAiNumber(baseline.stock, 'baseline.stock', 0, 1000000, true),
      operatingCost: opsAiNumber(baseline.operatingCost, 'baseline.operatingCost', 0, 1000000, false, false, true),
      metrics: opsAiMetrics(baseline.metrics, 'baseline.metrics', true),
    },
    plans: item.plans.map(plan => ({
      id: plan.id,
      discount: opsAiNumber(plan.discount, 'plan.discount', 0, 100, true),
      units: opsAiNumber(plan.units, 'plan.units', 0, 1000000, true),
      stock: opsAiNumber(plan.stock, 'plan.stock', 0, 2000000, true),
      additionalStock: opsAiNumber(plan.additionalStock, 'plan.additionalStock', 0, 1000000, true),
      metrics: opsAiMetrics(plan.metrics, 'plan.metrics'),
      delta: opsAiDelta(plan.delta, 'plan.delta'),
      canSave: opsAiBoolean(plan.canSave, 'plan.canSave'),
      needsCostReview: opsAiBoolean(plan.needsCostReview, 'plan.needsCostReview'),
      isRecommended: item.recommendedId === plan.id,
    })),
    keepOriginal,
  };
  const discounts = context.constraints.demand.map(demand => demand.discount);
  if (new Set(discounts).size !== discounts.length || discounts.some(discount => discount > context.constraints.maxDiscount)) throw new Error('Invalid AI context: demand discounts.');
  return context;
}

function opsAiContextText(run) {
  return JSON.stringify(opsAiContext(run));
}

// Cache lookup only, not a security primitive. Always compare the full context too.
function opsAiFingerprint(serializedContext) {
  if (typeof serializedContext !== 'string' || !serializedContext.length || serializedContext.length > 16384) throw new Error('Invalid AI context size.');
  let first = 2166136261;
  let second = 3335557771;
  for (let i = 0; i < serializedContext.length; i++) {
    const character = serializedContext.charCodeAt(i);
    first = Math.imul(first ^ character, 16777619);
    second = Math.imul(second ^ character, 2246822519);
  }
  return 'ops-ai-1-' + (first >>> 0).toString(16).padStart(8, '0') + (second >>> 0).toString(16).padStart(8, '0');
}

// Immediate, deterministic decision checks. These are not model output or forecasts.
function opsDecisionReview(context) {
  const plan = context.plans.find(p => p.isRecommended && p.canSave);
  const checks = [];
  const add = (id, title, detail, action) => checks.push({id, title, detail, action});
  const money = value => 'THB ' + value.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const count = value => value.toLocaleString('en-US');
  if (context.source.cost === null) add('cost', 'Profit cannot be assessed', 'Unit cost is missing. Revenue alone cannot establish whether a discount pays back.', 'Obtain the purchase cost per unit before judging profit or margin.');
  else if (context.originalSource.cost === null) add('original_cost', 'Profit improvement is unverified', 'The original has no unit cost, so a profit improvement versus it cannot be established.', 'Confirm the original cost using the same cost basis as the proposed plan.');
  if (!plan) {
    add('choice', context.keepOriginal ? 'Keep the original under these assumptions' : 'Revise the comparison before choosing', context.keepOriginal ? 'No modeled change improves the selected objective within the limits.' : 'No changed action is eligible under the supplied limits.', 'Validate demand and stock before changing the limits or choosing another objective.');
    return {checks};
  }
  const priceCents = Math.round(plan.metrics.unitPrice * 100);
  const fixedCents = Math.round(context.constraints.fixedCost * 100);
  const marginCents = context.source.cost === null ? null : priceCents - Math.round(context.source.cost * 100);
  let required = null;
  if (context.objective === 'profit' && marginCents > 0 && context.baseline.metrics.contribution !== null) {
    required = Math.max(0, Math.floor((Math.round(context.baseline.metrics.contribution * 100) + fixedCents) / marginCents) + 1);
  } else if (context.objective === 'revenue' && priceCents > 0) {
    required = Math.floor(Math.round(context.baseline.metrics.revenue * 100) / priceCents) + 1;
  }
  if (required !== null) add('threshold', 'Sales needed to beat the original', 'At least ' + count(required) + ' sales are needed, versus ' + count(plan.units) + ' assumed. Reserve-constrained sales capacity is ' + count(Math.max(0, plan.stock - context.constraints.safetyStock)) + ' units.', 'Validate this minimum with a small trial before extending the promotion.');
  const stressUnits = Math.floor(plan.units * 0.9);
  const stressRevenue = priceCents * stressUnits / 100;
  const stressProfit = marginCents === null ? null : (marginCents * stressUnits - fixedCents) / 100;
  const delta = context.objective === 'profit' && stressProfit !== null && context.baseline.metrics.contribution !== null ? (Math.round(stressProfit * 100) - Math.round(context.baseline.metrics.contribution * 100)) / 100 : context.objective === 'revenue' ? (Math.round(stressRevenue * 100) - Math.round(context.baseline.metrics.revenue * 100)) / 100 : null;
  add('stress', 'If assumed sales fall by 10%', 'At ' + count(stressUnits) + ' sales, revenue is ' + money(stressRevenue) + (stressProfit === null ? '; profit remains unavailable.' : '; profit after operating cost is ' + money(stressProfit) + '.') + (delta === null ? '' : ' The selected financial measure is ' + money(Math.abs(delta)) + (delta > 0 ? ' above' : delta < 0 ? ' below' : ' level with') + ' the unchanged original.'), 'Use the trial result to revise demand. This is a sensitivity check, not a forecast; the original is held fixed.');
  add('stock', 'Stock headroom above the reserve', count(plan.metrics.remaining - context.constraints.safetyStock) + ' units above the reserve after assumed sales.' + (plan.additionalStock > 0 ? ' The plan requires ' + count(plan.additionalStock) + ' additional units.' : ''), plan.additionalStock > 0 ? 'Confirm delivery time, expiry and purchasing funds before adding stock.' : 'Count available stock before running the trial.');
  return {checks, minimumSales:required, stressUnits, stressRevenue, stressProfit, stressDelta:delta};
}

// A bounded presentation deadline; checking never creates another billable request.
const OPS_AI_WAIT_MS = 30000;
function opsAiWaitState(status, startedAt, now) {
  const waiting = status === 'Queued' || status === 'Processing';
  const elapsed = startedAt ? Math.max(0, now - startedAt) : 0;
  return {waiting, elapsedSeconds:Math.floor(elapsed / 1000), delayed:waiting && elapsed >= OPS_AI_WAIT_MS};
}

const opsAiSelect=q.select({name:'cMQ0c',owner:'jeWoT',sourceId:'H6ZBD',context:'02Rf3',answer:'TSTsb',requestStatus:'cP2Qs',errorMessage:'Vwg10',fingerprint:'KSpPc',createdAt:'zUKuD',answeredAt:'ijPNc'});
const opsAiCreateFields=q.select({name:'cMQ0c',sourceId:'H6ZBD',context:'02Rf3',fingerprint:'KSpPc'});

async function opsAiAwait(promise:any,ms=8000) {
  let timer:any;
  try {return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Request deadline exceeded')),ms);})]);}
  finally {clearTimeout(timer);}
}

function RecommendationReadinessEvidence({review}:any) {
  if(!Array.isArray(review?.checks))return null;
  return <details className="ops-ai-captured"><summary>Captured decision readiness checks · calculated locally</summary>{review.checks.map((item:any)=><div key={item.id}><strong>{item.title}</strong><p className="small">{item.detail}</p><p className="small muted">Next step: {item.action}</p></div>)}</details>;
}

function RecommendationAiEvidence({evidence}:any) {
  if(!['ops-ai-1.1',OPS_AI_CONTEXT_VERSION].includes(evidence?.version)||typeof evidence.answer!=='string'||!evidence.answer.trim())return null;
  return <details className="ops-ai-captured"><summary>Captured AI review · DeepSeek</summary><p className="small" style={{whiteSpace:'pre-wrap'}}>{evidence.answer.slice(0,12000)}</p><p className="small muted">Captured with these assumptions. Review priorities apply to the rule-selected action; a different saved action needs its own check.</p></details>;
}

function opsAiMatchingRows(data:any,email:string,context:string,fingerprint:string) {
  return (data?.pages.flatMap((page:any)=>page.items)??[]).filter((row:any)=>dbText(row.fields.owner).toLowerCase()===email.toLowerCase()&&!!email&&dbText(row.fields.context)===context&&dbText(row.fields.fingerprint)===fingerprint);
}

function RecommendationAi({run,email,sourceId,onEvidence,disabled}:any) {
  let context='',fingerprint='',contextError='';
  try {context=opsAiContextText(run);fingerprint=opsAiFingerprint(context);}catch{contextError='Some original inputs cannot be used by the AI service. The rule comparison is still available; check the saved source values.';}
  const history=useRecords({from:ds.aiRequests,select:opsAiSelect,where:q.and(q.text('owner').is(email||''),q.text('owner').isNotEmpty(),q.text('fingerprint').is(fingerprint)),orderBy:q.desc('createdAt'),count:100,enabled:!!email&&!!context});
  const createRequest=useRecordCreate({from:ds.aiRequests,fields:opsAiCreateFields});
  const [localId,setLocalId]=useState('');
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const [uncertain,setUncertain]=useState(false);
  const [pollUntil,setPollUntil]=useState(0);
  const [polling,setPolling]=useState(false);
  const [now,setNow]=useState(Date.now());
  const busy=useRef(false);
  const rows=opsAiMatchingRows(history.data,email||'',context,fingerprint);
  const completed=rows.find((row:any)=>dbText(row.fields.requestStatus)==='Completed'&&!!dbText(row.fields.answer).trim());
  const pending=rows.find((row:any)=>['Queued','Processing'].includes(dbText(row.fields.requestStatus)));
  const latest=completed||pending||rows.find((row:any)=>row.id===localId)||rows[0];
  const status=completed?'Completed':pending?dbText(pending.fields.requestStatus):latest?dbText(latest.fields.requestStatus):localId?'Queued':'';
  const waiting=['Queued','Processing'].includes(status);
  const waitState=opsAiWaitState(status,pollUntil?pollUntil-OPS_AI_WAIT_MS:0,now);
  let review:any=null;
  try {if(context)review=opsDecisionReview(JSON.parse(context));}catch{}
  const answer=completed?dbText(completed.fields.answer).slice(0,12000):'';
  const completedId=completed?.id||'';
  const answeredAt=completed?dbText(completed.fields.answeredAt):'';
  const matchingLocal=!!localId&&rows.some((row:any)=>row.id===localId);

  useEffect(()=>{setLocalId('');setError('');setUncertain(false);setPollUntil(0);setPolling(false);},[context]);
  useEffect(()=>{if(pending?.id){void opsWakeCloud(pending.id);const created=Date.parse(dbText(pending.fields.createdAt));setPollUntil(old=>old||((Number.isFinite(created)?Math.min(created,Date.now()):Date.now())+OPS_AI_WAIT_MS));}},[pending?.id,context]);
  useEffect(()=>{if(!waiting)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[waiting,context]);
  useEffect(()=>{
    onEvidence(answer?{version:OPS_AI_CONTEXT_VERSION,requestId:completedId,model:'DeepSeek-V4-Flash',contextFingerprint:fingerprint,context,answer,answeredAt:answeredAt||null}:null);
  },[answer,completedId,answeredAt,context,fingerprint,onEvidence]);
  useEffect(()=>{
    if(!waiting||!pollUntil){setPolling(false);return;}
    let cancelled=false;
    let timer:any;
    setPolling(true);
    const tick=async()=>{
      if(cancelled)return;
      if(Date.now()>=pollUntil){setPolling(false);return;}
      try {const refreshed=await opsAiAwait(history.refetch());if(!cancelled&&refreshed.error)setError('The review status could not be loaded. The immediate checks remain available.');}catch{if(!cancelled)setError('The review status is taking too long to load. Use the immediate checks or check again.');}
      if(!cancelled)timer=setTimeout(tick,2000);
    };
    timer=setTimeout(tick,1000);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[waiting,pollUntil,context]);
  const requestExplanation=async()=>{
    if(busy.current||sending||uncertain||disabled||!createRequest.enabled||!context||!email)return;
    busy.current=true;setSending(true);setError('');
    let submitted=false,confirmedId='';
    try {
      const refreshed=await opsAiAwait(history.refetch());
      if(refreshed.error){setError('The request history could not be checked. Refresh it before sending another request.');return;}
      const current=opsAiMatchingRows(refreshed.data,email,context,fingerprint);
      const reusable=current.find((row:any)=>dbText(row.fields.requestStatus)==='Completed'&&dbText(row.fields.answer).trim())||current.find((row:any)=>['Queued','Processing'].includes(dbText(row.fields.requestStatus)));
      if(reusable){if(dbText(reusable.fields.requestStatus)!=='Completed')void opsWakeCloud(reusable.id);setLocalId(reusable.id);setNow(Date.now());setPollUntil(Date.now()+OPS_AI_WAIT_MS);return;}
      if(history.hasNextPage){setError('The matching history is too large to check safely. Refresh the page before requesting again.');return;}
      submitted=true;
      const created=await opsAiAwait(createRequest.mutateAsync({name:'Decision review '+new Date().toISOString(),sourceId,context,fingerprint}),10000);
      if(!created?.id){setUncertain(true);setError('The request save could not be confirmed. Check for an answer; another submission is paused to avoid duplicate requests.');return;}
      confirmedId=created.id;void opsWakeCloud(created.id);setLocalId(created.id);setNow(Date.now());setPollUntil(Date.now()+OPS_AI_WAIT_MS);await opsAiAwait(history.refetch());
    }catch{if(submitted&&!confirmedId){setUncertain(true);setError('The request save could not be confirmed. Check the saved review; another submission is paused to avoid duplicate requests.');}else{setError(confirmedId?'The request is saved. Its status could not be loaded; check the saved review later.':'The request history took too long to load. No AI request was sent. Check again before requesting a review.');}}
    finally{busy.current=false;setSending(false);}
  };
  const checkAnswer=async()=>{if(pending?.id||localId)void opsWakeCloud(pending?.id||localId);setError('');setNow(Date.now());setPollUntil(Date.now()+OPS_AI_WAIT_MS);try{const refreshed=await opsAiAwait(history.refetch());if(refreshed.error){setError('The review could not be loaded. Try checking again.');return;}if(opsAiMatchingRows(refreshed.data,email,context,fingerprint).length)setUncertain(false);}catch{setError('The status check took too long. Immediate checks and scenario saving remain available.');}};
  return <section className="ops-ai v2-advisor-review" aria-labelledby="ops-ai-title">
    <div className="ops-ai-heading"><div><span className="v2-advisor-name"><Sparkles size={14}/>CP Retail Advisor · before you decide</span><h3 id="ops-ai-title">Decision readiness review</h3></div>{status&&<span className="ops-ai-status" role="status">{status==='Completed'?'AI review saved':waitState.delayed?'AI review delayed':status==='Processing'?'AI is reviewing':status==='Queued'?'Review queued':status==='Failed'?'AI review unavailable':status}</span>}</div>
    <p className="ops-ai-intro">Check how much demand the proposed action needs and what happens if sales disappoint. {advisorEnabled ? 'The Advisor can prioritise your next checks.' : 'Cloud AI is unavailable in this build.'} The checks below are calculated in this browser.</p>
    {review&&<div className="ops-readiness"><p className="small muted"><strong>Immediate checks · calculated locally</strong> · These concern the rule-selected action and are sensitivity calculations, not AI output or forecasts.</p><div className="ops-readiness-grid">{review.checks.map((item:any)=><article key={item.id}><h4>{item.title}</h4><p>{item.detail}</p><p className="small muted">Next step: {item.action}</p></article>)}</div></div>}
    {contextError?<p className="notice warn" role="status">{contextError}</p>:<>
      {answer?<><div className="ops-ai-answer" aria-live="polite">{answer}</div><p className="small muted">AI ranks the review priorities; all amounts are calculated and checked. {answeredAt?'Saved '+dbDate(answeredAt)+'. ':''}The review is captured with a scenario you save. It does not approve a decision.</p><div className="v2-advisor-foot"><AdvisorVote surface="decision" requestId={completedId} aiAnswered/></div></>:waiting?<div className="ops-ai-wait" role="status">{!waitState.delayed&&polling&&<span className="ops-ai-line"/>}<p>{waitState.delayed?'The AI review has not returned within 30 seconds. Continue with the immediate checks above and save a scenario, or check this same request later. The cloud service can finish while your computer is closed.':(status==='Processing'?'DeepSeek is choosing the review priorities.':'The request is saved and queued for cloud processing.')+' '+waitState.elapsedSeconds+'s elapsed. You can continue using the immediate checks.'}</p>{localId&&!matchingLocal&&<p className="small muted">Request saved; waiting for it to appear in the history.</p>}</div>:status==='Failed'?<div className="notice warn" role="status"><p>{dbText(latest?.fields.errorMessage).slice(0,240)||'The AI review could not finish. Use the immediate checks and check the cloud review status.'} A new request may use the group allowance again.</p></div>:<p className="small muted">DeepSeek receives only numeric assumptions and calculated outcomes. It prioritises validation work; it cannot change the calculations, place orders or approve decisions.</p>}
      {history.status==='error'&&<p className="notice warn" role="alert">The AI request history could not be loaded. Check again before submitting a request.</p>}
      {error&&<p className="notice warn" role="alert">{error}</p>}
      <div className="row">{!answer&&!waiting&&<button type="button" className="btn" onClick={requestExplanation} disabled={disabled||sending||uncertain||!createRequest.enabled||history.status!=='success'||history.isFetching}>{sending?'Saving request…':status==='Failed'?'Request a new AI review':'Ask AI: what should I verify first?'}</button>}<button type="button" className="ops-text-action" onClick={checkAnswer} disabled={sending||history.isFetching}>{history.isFetching?'Checking…':'Check saved review'} <RotateCcw size={13}/></button></div>
      <details className="ops-ai-context"><summary>View the review inputs</summary><pre>{JSON.stringify(JSON.parse(context),null,2)}</pre></details>
    </>}
  </section>;
}

// This fragment is inlined into the single-file Softr block by the build script.
function RecommendationEvidence({evidence}:any) {
  if(!evidence || !['rules-1.0','rules-1.1'].includes(evidence.version)) return null;
  return <section className="ops-evidence"><div className="row"><Info size={18}/><strong>Saved recommendation</strong></div><p>{evidence.plan?.action}</p><p className="small muted">Source: {evidence.sourceName} · Rule based · Captured {dbDate(evidence.generatedAt)}</p>{evidence.plan?.tradeoff&&<p className="small">{evidence.plan.tradeoff}</p>}{evidence.adjustments?.length>0&&<p className="small">Updated assumptions: {evidence.adjustments.map((a:any)=>a.label+': '+(a.from===null?'Unknown':a.from)+' → '+(a.to===null?'Unknown':a.to)).join('; ')}.</p>}<p className="small muted">Operating cost: {dbMoney(evidence.constraints?.fixedCost)}. After that cost: {dbMoney(evidence.plan?.metrics?.contribution)}.</p><details><summary>Why this plan was saved</summary><p className="small">{evidence.managerRationale||'No rationale recorded.'}</p><ul>{(evidence.plan?.risks||[]).map((risk:string,i:number)=><li key={i}>{risk}</li>)}</ul></details><RecommendationReadinessEvidence review={evidence.decisionReadiness}/><ProfileEvidence evidence={evidence.customerProfile}/><RecommendationAiEvidence evidence={evidence.aiExplanation}/></section>;
}
function opsChangeLabel(value:any,currency=true) {
  if(value===null||value===undefined) return 'Unavailable';
  if(value===0) return 'No change';
  return (value>0?'+':'−')+(currency?dbMoney(Math.abs(value)):dbUnits(Math.abs(value))+' units');
}
function RecommendationChanges({plan}:any) {
  if(!plan.delta) return null;
  return <dl className="ops-deltas"><div><dt>Revenue change</dt><dd>{opsChangeLabel(plan.delta.revenue)}</dd></div><div><dt>Gross profit change</dt><dd>{opsChangeLabel(plan.delta.grossProfit)}</dd></div><div><dt>Remaining stock change</dt><dd>{opsChangeLabel(plan.delta.remaining,false)}</dd></div></dl>;
}
function opsSnapshotEvidence(value:string) {
  try {const snapshot=JSON.parse(value);return snapshot.operationalRecommendation||opsReadEvidence(snapshot.inputs?.notes);}catch{return null;}
}
function RecommendationSavedPlan({saved,user,creatorId,onDecisions,onRestart,openSavedScenario}:any) {
  const {language}=React.useContext(LanguageContext);
  const record=useRecord({from:ds.scenarios,select:savedScenarioSelect,recordId:saved.id});
  const createDecision=useRecordCreate({from:ds.decisions,fields:decisionCreateFields,onSuccess:()=>emitTestEvent('decision-saved')});
  const recordLink=useNavigationSetting({name:'ops-saved-scenario-link',label:'Saved recommendation scenario destination',initialValue:{destination:'/pixso-preview',openIn:'SELF'}});
  const [reason,setReason]=useState(saved.reason);
  const [decisionId,setDecisionId]=useState('');
  const [error,setError]=useState('');
  const busy=useRef(false);
  const f=record.data?.fields;
  const owned=!!f&&!!user?.email&&dbText(f.owner).toLowerCase()===user.email.toLowerCase();
  const sameAmount=(a:any,b:any)=>a===null?dbNumber(b)===null:dbNumber(b)!==null&&Math.abs(a-dbNumber(b)!)<0.005;
  const checked=owned&&dbText(f.inputCheck)==='Valid'&&sameAmount(saved.plan.metrics.unitPrice,f.discountedPrice)&&sameAmount(saved.plan.metrics.revenue,f.revenue)&&sameAmount(saved.plan.metrics.grossProfit,f.grossProfit)&&sameAmount(saved.plan.metrics.remaining,f.remainingStock);
  const saveDecision=async()=>{
    if(busy.current||decisionId||createDecision.status==='pending') return;
    if(!checked||!creatorId||!createDecision.enabled||!reason.trim()){setError('Wait for the saved calculations, then enter a decision reason.');return;}
    busy.current=true;
    try {
      const snapshot=JSON.stringify({capturedAt:new Date().toISOString(),scenarioId:saved.id,inputs:{name:dbText(f.name),product:dbText(f.product),referencePrice:f.referencePrice,cost:f.cost,discount:f.discount,units:f.units,stock:f.stock,period:f.period,comparisonGroup:dbText(f.comparisonGroup),notes:dbText(f.notes),source:dbText(f.source)},results:{inputCheck:dbText(f.inputCheck),discountedPrice:f.discountedPrice,revenue:f.revenue,grossProfit:f.grossProfit,remainingStock:f.remainingStock,costCheck:dbText(f.costCheck),stockCheck:dbText(f.stockCheck)},operationalRecommendation:saved.evidence,warning:'Simulated coursework assumptions; pending review is not approval. Snapshot storage is not immutable.'},null,2);
      const created=await createDecision.mutateAsync({name:((language==='zh-CN'?'审核 ':'Review ')+saved.name).slice(0,1024),reason:reason.trim(),owner:user.email,scenario:[saved.id],decidedBy:[creatorId],snapshot});
      if(!created?.id){setError('The save response did not include a record ID. Check My Decisions before attempting another save.');return;}
      setDecisionId(created.id);setError('');
    } catch(err:any){setError((err?.message||'The decision save could not be confirmed.')+' Check My Decisions before retrying.');}
    finally{busy.current=false;}
  };
  return <section className="panel stack">
    <div className="row"><CheckCircle2 size={20}/><h2>New scenario saved</h2><Pill tone="green">Database record</Pill></div>
    <p>{saved.name}</p>
    <p className="small muted">The original scenario remains available as your comparison source. The recommendation, constraints and operating cost are captured with this new scenario.</p>
    {record.status==='pending'?<p role="status">Loading saved calculations…</p>:record.status==='error'||!owned?<div className="notice warn" role="alert">The saved record could not be verified. Refresh its calculations before saving a decision.</div>:<><ScenarioChecks fields={f}/><div className="grid-3 metrics"><Metric label="Saved revenue" value={dbMoney(f.revenue)} detail="Calculated by the database"/><Metric label="Saved gross profit" value={dbMoney(f.grossProfit)} detail={dbNumber(f.cost)===null?'Unit cost remains unknown':'Before additional operating cost'}/><Metric label="Contribution after cost" value={dbMoney(saved.plan.metrics.contribution)} detail={'Subtracts '+dbMoney(saved.evidence.constraints.fixedCost)+' supplied operating cost'}/></div>{!checked&&<div className="notice warn" role="alert">Saved calculations are not yet consistent with the comparison. Refresh and inspect the record before continuing.</div>}</>}
    <div className="row"><button className="btn" onClick={()=>record.refetch()} disabled={record.isRefetching}>Refresh saved calculations</button><span onClickCapture={()=>openSavedScenario(saved.id)}><NavigationAction navigation={recordLink} recordId={saved.id} datasourceId="scenarios" className="btn">View saved scenario <ArrowRight size={14}/></NavigationAction></span></div>
    {decisionId?<div className="notice" role="status"><CheckCircle2 size={19}/><div><strong>Pending decision saved</strong><p className="small">The database decision is linked to this scenario and includes its captured recommendation evidence.</p><button className="btn" style={{marginTop:10}} onClick={onDecisions}>Open My Decisions <ArrowRight size={14}/></button></div></div>:<><h3>Record a decision</h3><label>Decision reason *<textarea className="input" value={reason} onChange={e=>{setReason(e.target.value);setError('');}} placeholder="Explain your choice and remaining checks" disabled={createDecision.status==='pending'}/></label><p className="small muted">This saves a Pending record for review. No order, price change or live operational action is sent.</p>{error&&<div className="notice warn" role="alert">{error}</div>}<button className="btn primary" onClick={saveDecision} disabled={!checked||!creatorId||!createDecision.enabled||createDecision.status==='pending'}>{createDecision.status==='pending'?'Saving decision…':'Save pending decision'}</button></>}
    <button className="btn" onClick={onRestart} disabled={createDecision.status==='pending'}>Compare another change</button>
  </section>;
}
function OperationalRecommendations({initialSourceId,initialProfile,onCreate,onProfiles,loginLink,openScenarios,openDecisions,openSavedScenario,openDemo}:any) {
  const {language}=React.useContext(LanguageContext);
  const user=useCurrentUser();
  const title=useTextSetting({name:'ops-recommendations-title',label:'Operational recommendations title',initialValue:'Compare actions'});
  const [sourceId,setSourceId]=useState(initialSourceId||'');
  const [excludeProfile,setExcludeProfile]=useState(false);
  const [raw,setRaw]=useState<any>({goal:'profit',maxDiscount:String(initialProfile?.offerCheck?.inputs.discountPercent??10),minMargin:'20',safetyStock:null,maxRestock:'0',fixedCost:'0',units0:'',unitsMid:'',unitsMax:'',costOverride:null,stockOverride:null});
  const [run,setRun]=useState<any>(null);
  const [aiEvidence,setAiEvidence]=useState<any>(null);
  const [selected,setSelected]=useState('');
  const [planName,setPlanName]=useState('');
  const [rationale,setRationale]=useState('');
  const [error,setError]=useState('');
  const [saved,setSaved]=useState<any>(null);
  const [saving,setSaving]=useState(false);
  const busy=useRef(false);
  const inputRefs=useRef<any>({});
  const resultsRef=useRef<HTMLDivElement|null>(null);
  const saveRef=useRef<HTMLElement|null>(null);
  const sourceRef=useRef<HTMLElement|null>(null);
  const assumptionsRef=useRef<HTMLElement|null>(null);
  const jumpTo=(ref:any)=>{ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  const scenarios=useRecords({from:ds.scenarios,select:savedScenarioSelect,where:q.and(q.text('owner').is(user?.email??''),q.text('owner').isNotEmpty()),orderBy:q.desc('createdAt'),count:100,enabled:!!user?.email});
  const creators=useLinkedRecords({from:ds.scenarios,select:q.select({creator:'JrVwO'}),field:'creator',search:user?.email??'',count:1000,enabled:!!user?.email});
  const createScenario=useRecordCreate({from:ds.scenarios,fields:scenarioCreateFields});
  const records=(scenarios.data?.pages.flatMap(p=>p.items)??[]).filter(item=>!!user?.email&&dbText(item.fields.owner).toLowerCase()===user.email.toLowerCase());
  const source=records.find(item=>item.id===sourceId);
  const inheritedProfile=opsReadEvidence(dbText(source?.fields.notes))?.customerProfile;
  const candidateProfile=initialProfile||inheritedProfile;
  const customerProfile=!excludeProfile&&profileValidContext(candidateProfile)?candidateProfile:null;
  const matchingCreators=(creators.data?.pages.flatMap(p=>p.items)??[]).filter(item=>String(item.title??'').trim().toLowerCase()===String(user?.email??'').trim().toLowerCase());
  const creatorReady=creators.status==='success'&&!creators.hasNextPage&&matchingCreators.length===1;
  const cap=opsNumber(raw.maxDiscount);
  const levels=cap!==null&&Number.isInteger(cap)&&cap>=0&&cap<=100?opsDiscountLevels(cap,dbNumber(source?.fields.discount)??0):[];
  const volumeKey=(index:number)=>index===0?'units0':index===levels.length-1?'unitsMax':'unitsMid';
  const volumeValue=(index:number)=>raw[volumeKey(index)]!==''?raw[volumeKey(index)]:String(source?.fields.units??'');
  const costValue=raw.costOverride===null?String(source?.fields.cost??''):raw.costOverride;
  const stockValue=raw.stockOverride===null?String(source?.fields.stock??''):raw.stockOverride;
  const bufferValue=raw.safetyStock===null?opsDefaults(source).safetyStock:raw.safetyStock;
  const prepared={...raw,safetyStock:bufferValue,overrides:{cost:costValue,stock:stockValue},demand:levels.map((discount:number,index:number)=>({discount,units:volumeValue(index)}))};
  const diagnosis=source?opsDiagnose(source,prepared):null;
  const stale=!!run&&(!source||opsFingerprint(source)!==run.fingerprint);
  const selectedPlan=run?.plans.find((p:any)=>p.id===selected);
  const displayPlans=run?[...run.plans].sort((a:any,b:any)=>Number(b.canSave)-Number(a.canSave)||Number(b.id===run.recommendedId)-Number(a.id===run.recommendedId)):[];
  const recommendedPlan=displayPlans.find((p:any)=>p.id===run?.recommendedId);
  const limitingInput=run?.diagnostics?.items.find((item:any)=>item.severity==='error')?.action||run?.diagnostics?.items.find((item:any)=>item.severity==='warning')?.action||'demand';
  const clearRun=()=>{setRun(null);setAiEvidence(null);setSelected('');setRationale('');setError('');};
  const change=(key:string,value:string)=>{setRaw((old:any)=>({...old,[key]:value}));clearRun();};
  const changeSource=(id:string)=>{setSourceId(id);setRaw((old:any)=>({...old,safetyStock:null,costOverride:null,stockOverride:null,units0:'',unitsMid:'',unitsMax:''}));clearRun();};
  const remedy=(key:string)=>{const target=inputRefs.current[key];const details=target?.closest('details');if(details)details.open=true;target?.focus();target?.scrollIntoView({block:'center',behavior:'smooth'});};
  const actionLabel:any={cost:'Enter unit cost',stock:'Review available stock',safetyStock:'Adjust safety stock',maxRestock:'Set a stock limit',demand:'Review demand',minMargin:'Review margin',maxDiscount:'Review discount'};
  const generate=(event:React.FormEvent)=>{
    event.preventDefault();
    if(!source){setError('Choose a saved scenario first.');return;}
    const next=opsGenerate(source,prepared);
    if(next.errors.length){setError(next.errors.join(' '));setRun(null);return;}
    setRun({...next,sourceRecord:source,fingerprint:opsFingerprint(source),generatedAt:new Date().toISOString(),runId:source.id+'-'+Date.now().toString(36)});
    setSelected('');setRationale('');setError('');setSaved(null);setAiEvidence(null);
    requestAnimationFrame(()=>resultsRef.current?.scrollIntoView({block:'start',behavior:'smooth'}));
  };
  const selectPlan=(plan:any)=>{
    const strategy=language==='zh-CN'?({'promotion':'促销','stock-protection':'库存保障','replenishment':'补货'}[plan.id]||'调整'):plan.id;
    setSelected(plan.id);setPlanName(((language==='zh-CN'?'运营 - ':'OPS - ')+dbText(source?.fields.name)+' - '+strategy).slice(0,1024));setRationale('');setError('');
    requestAnimationFrame(()=>saveRef.current?.scrollIntoView({block:'start',behavior:'smooth'}));
  };
  const savePlan=async()=>{
    if(busy.current||saving) return;
    if(!run||!source||stale||!selectedPlan?.canSave||!createScenario.enabled||!creatorReady){setError('Generate an eligible action and check your account connection before saving.');return;}
    if(!planName.trim()||planName.trim().length>1024||!rationale.trim()){setError('Enter a scenario name and explain your choice.');return;}
    const productId=linkedIds(source.fields.product)[0];
    if(!productId){setError('The source scenario needs a linked product.');return;}
    busy.current=true;setSaving(true);setError('');
    try {
      const refreshed=await scenarios.refetch();
      const fresh=refreshed.data?.pages.flatMap(p=>p.items).find(item=>item.id===source.id);
      if(refreshed.error||!fresh){setError('The source could not be checked. Refresh your scenarios, then generate again.');return;}
      if(opsFingerprint(fresh)!==run.fingerprint){clearRun();setError('The source changed. Generate again before saving.');return;}
      let capturedAi=null;
      try {if(selectedPlan.id===run.recommendedId&&aiEvidence?.context===opsAiContextText(run))capturedAi=aiEvidence;}catch{}
      let decisionReadiness=null;
      try {const reviewContext=opsAiContext(run);decisionReadiness=opsDecisionReview({...reviewContext,keepOriginal:false,plans:reviewContext.plans.map((plan:any)=>({...plan,isRecommended:plan.id===selectedPlan.id}))});}catch{}
      const evidence={decisionReadiness,version:OPS_VERSION,mode:capturedAi?'rule-based-with-ai-explanation':'rule-based',runId:run.runId,generatedAt:run.generatedAt,sourceScenarioId:source.id,sourceName:dbText(source.fields.name),originalSourceInputs:run.originalSource,sourceInputs:run.source,adjustments:run.adjustments,constraints:run.constraints,baseline:run.baseline,diagnostics:run.diagnostics,rankingNote:run.rankingNote,plan:selectedPlan,managerRationale:rationale.trim(),aiExplanation:capturedAi,customerProfile};
      const notes='Operational recommendation: '+selectedPlan.title+'\nSource: '+dbText(source.fields.name)+'\nAction: '+selectedPlan.action+'\nManager rationale: '+rationale.trim()+OPS_NOTE_MARKER+JSON.stringify(evidence);
      const values:any={name:planName.trim(),owner:user.email,product:[productId],creator:[matchingCreators[0].id],price:run.source.price,discount:selectedPlan.discount,units:selectedPlan.units,stock:selectedPlan.stock,period:run.source.period,group:dbText(source.fields.comparisonGroup)||('OPS-'+source.id),notes,source:'Simulated coursework data - assumptions only'};
      if(run.source.cost!==null) values.cost=run.source.cost;
      const created=await createScenario.mutateAsync(values);
      if(!created?.id){setError('The save did not return a record ID. Check My Scenarios before retrying.');return;}
      setSaved({id:created.id,name:planName.trim(),plan:selectedPlan,evidence,reason:rationale.trim()});
    } catch(err:any){setError((err?.message||'The scenario save could not be confirmed.')+' Check My Scenarios before retrying.');}
    finally{busy.current=false;setSaving(false);}
  };
  if(!user?.email) return <AuthGate loginLink={loginLink} title="Sign in for Recommendations" description="Use your saved scenarios to compare actions and save a new plan." openDemo={openDemo}/>;
  if(saved) return <div className="stack ops"><div className="ops-heading"><div><span className="ops-method">Next · Record a decision</span><h1>{title}</h1><p>Your new scenario is saved. Record the linked decision for review.</p></div></div><RecommendationEvidence evidence={saved.evidence}/><RecommendationSavedPlan key={saved.id} saved={saved} user={user} creatorId={creatorReady?matchingCreators[0].id:null} onDecisions={openDecisions} onRestart={()=>{setSaved(null);clearRun();void scenarios.refetch();}} openSavedScenario={openSavedScenario}/></div>;
  return <div className="stack ops">
    <div className="ops-heading"><div><span className="ops-method">Planning / Your scenarios</span><h1>{title}</h1><p>Choose a saved scenario, compare changes and save your chosen action as a new scenario.</p></div><div className="stack" style={{alignItems:'flex-end',gap:12}}><div aria-hidden="true" className="v2-scissors" style={{width:150,height:51,overflow:'hidden',pointerEvents:'none',position:'relative'}}><img src="/studio-media/a83edec5-5335-49d2-b021-f808179829ea.png" alt="" style={{position:'absolute',width:898.3,height:560.9,left:-727.4,top:-53.8,maxWidth:'none'}} /></div><button className="btn" disabled={scenarios.isRefetching||saving} onClick={()=>{clearRun();void scenarios.refetch();}}><RotateCcw size={14}/>Refresh scenarios</button></div></div>
    <nav className="ops-steps" aria-label="Recommendation steps"><button type="button" className={!source?'current':''} onClick={()=>jumpTo(sourceRef)}><span>01</span>Source & checks</button><button type="button" className={source&&!run?'current':''} disabled={!source} onClick={()=>jumpTo(assumptionsRef)}><span>02</span>Assumptions</button><button type="button" className={run&&!selectedPlan?'current':''} disabled={!run||stale} onClick={()=>jumpTo(resultsRef)}><span>03</span>Compare actions</button><button type="button" className={selectedPlan?'current':''} disabled={!selectedPlan||stale} onClick={()=>jumpTo(saveRef)}><span>04</span>Save scenario</button></nav>
    {scenarios.status==='error'&&<div className="notice warn" role="alert">Your scenarios could not be loaded. Use Refresh scenarios to retry.</div>}
    {customerProfile&&<div className="stack"><ProfileEvidence evidence={customerProfile}/><div className="row"><button type="button" className="profile-text-btn" onClick={onProfiles}>Review customer profiles</button><button type="button" className="profile-text-btn" disabled={saving} onClick={()=>{setExcludeProfile(true);clearRun();}}>Remove segment from this comparison</button></div></div>}
    <form className="ops-config" onSubmit={generate} noValidate><fieldset disabled={saving} className={"ops-config-grid "+(!source?"ops-source-only":"")}>
      <aside className="ops-review stack" ref={sourceRef} tabIndex={-1}>
      <div className="ops-section-heading"><span>01</span><h2>Choose a starting scenario</h2></div>
      <label>Starting scenario *<select className="input" value={sourceId} disabled={scenarios.status!=='success'} onChange={e=>changeSource(e.target.value)}><option value="">{scenarios.status==='pending'?'Loading scenarios…':'Choose a saved scenario'}</option>{records.map(item=><option key={item.id} value={item.id}>{dbText(item.fields.name)||'Untitled scenario'} · {dbText(item.fields.product)}</option>)}</select></label>
      {scenarios.hasNextPage&&<button type="button" className="btn" disabled={scenarios.isFetchingNextPage} onClick={()=>scenarios.fetchNextPage()}>Load more scenarios</button>}
      {scenarios.status==='success'&&records.length===0&&<button type="button" className="btn" onClick={openScenarios}>Create your first scenario in My Scenarios</button>}
      {source&&<>
        <div className="ops-source"><div className="row between"><strong>{dbText(source.fields.product)}</strong><span className="small muted">{dbUnits(source.fields.period)} days</span></div><dl className="ops-source-facts">{[['Price',dbMoney(source.fields.referencePrice)],['Unit cost',dbNumber(source.fields.cost)===null?'Unknown':dbMoney(source.fields.cost)],['Stock',dbUnits(source.fields.stock)],['Assumed sales',dbUnits(source.fields.units)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
        {diagnosis&&<section className="ops-diagnosis" aria-label="Scenario diagnosis"><h3>{diagnosis.items.length?'What needs attention':'Ready to compare'}</h3><ul>{diagnosis.items.map((item:any)=><li key={item.id} className={item.severity}><div><strong>{item.title}</strong><p>{item.detail}</p></div>{actionLabel[item.action]&&<button type="button" className="ops-text-action" onClick={()=>remedy(item.action)}>{actionLabel[item.action]} <ArrowRight size={13}/></button>}</li>)}</ul>{!diagnosis.items.some((item:any)=>item.detail===diagnosis.nextStep)&&<p className="ops-next-step"><strong>Next step:</strong> {diagnosis.nextStep}</p>}</section>}
      </>}
      {!source&&<div className="ops-start-note"><Layers size={24}/><h3>Start from your saved assumptions</h3><p>Choose a saved scenario, or start with editable demo assumptions.</p><button type="button" className="btn primary" onClick={()=>onCreate(customerProfile)}>Start with demo assumptions <ArrowRight size={14}/></button></div>}
      </aside>
      {source&&<section className="ops-assumptions stack" ref={assumptionsRef} tabIndex={-1}>
      <div className="ops-section-heading"><span>02</span><h2>Set your assumptions</h2></div>
      <p className="ops-form-note">Adjust cost, discount and expected sales, then compare the actions.</p>
      <div className="ops-fields">
        <label>Unit cost for comparison (THB)<input ref={node=>{inputRefs.current.cost=node;}} className="input" type="number" min="0" step="0.01" value={costValue} disabled={!source} placeholder="Unknown" onChange={e=>change('costOverride',e.target.value)}/><small>Leave blank if the cost is unknown.</small></label>
        <label>Available stock for comparison (units)<input ref={node=>{inputRefs.current.stock=node;}} className="input" type="number" min="0" step="1" value={stockValue} disabled={!source} onChange={e=>change('stockOverride',e.target.value)}/><small>Stock available before any proposed replenishment.</small></label>
        <label className="ops-field-wide">Comparison objective<select className="input" value={raw.goal} onChange={e=>change('goal',e.target.value)}><option value="profit">Protect profit after operating cost</option><option value="revenue">Compare assumed revenue</option><option value="buffer">Preserve remaining stock</option></select></label>
        <label>Maximum discount (%)<input ref={node=>{inputRefs.current.maxDiscount=node;}} className="input" type="number" min="0" max="100" step="1" value={raw.maxDiscount} onChange={e=>change('maxDiscount',e.target.value)}/></label>

      </div>
      <div className="ops-demand"><h3>Demand to test</h3><p className="ops-form-note">How many units do you expect to sell at each discount? These are your assumptions.</p><div className="grid-3">{levels.map((discount:number,index:number)=><label key={discount}>Assumed units at {discount}% discount<input ref={node=>{if(index===0)inputRefs.current.demand=node;}} className="input" type="number" min="0" step="1" value={volumeValue(index)} onChange={e=>change(volumeKey(index),e.target.value)}/></label>)}</div></div>
      <details className="ops-advanced"><summary>More assumptions</summary><div className="ops-fields">        <label>Minimum unit margin (%)<input ref={node=>{inputRefs.current.minMargin=node;}} className="input" type="number" min="0" max="100" step="0.1" value={raw.minMargin} onChange={e=>change('minMargin',e.target.value)}/></label>
        <label>Safety stock target (units)<input ref={node=>{inputRefs.current.safetyStock=node;}} className="input" type="number" min="0" step="1" value={bufferValue} onChange={e=>change('safetyStock',e.target.value)}/></label>
        <label>Additional stock limit (units)<input ref={node=>{inputRefs.current.maxRestock=node;}} className="input" type="number" min="0" step="1" value={raw.maxRestock} onChange={e=>change('maxRestock',e.target.value)}/><small>The most extra stock you can obtain for this period.</small></label>
        <label className="ops-field-wide">Additional operating cost (THB)<input className="input" type="number" min="0" step="0.01" value={raw.fixedCost} onChange={e=>change('fixedCost',e.target.value)}/><small>Applied to proposed actions. Original uses its recorded cost, or zero.</small></label></div></details>
      <details className="ops-calculation"><summary>Calculation basis and limits</summary><p>Margin = (discounted price − unit cost) ÷ discounted price. Prices round to two decimals before calculating revenue. After operating cost = gross profit − the entered operating cost. Purchasing cash for extra stock is shown separately. Volumes are supplied assumptions, not a sales forecast.</p></details>
      {error&&<div className="notice warn" role="alert">{error}</div>}
      <div className="ops-generate"><button type="submit" className="btn primary" disabled={!source||saving}>{run?'Recalculate actions':'Compare actions'} <ArrowRight size={16}/></button><span>Compare the outcome before you choose.</span></div>
      </section>}
    </fieldset></form>
    {stale&&<div className="notice warn" role="alert">The source changed after this comparison. Recalculate before saving.</div>}
    {run&&!stale&&<div className="stack ops-results" ref={resultsRef} tabIndex={-1}>
      <div className="ops-results-heading"><div className="ops-section-heading"><span>03</span><div><h2>What would change</h2><p className="small muted">{run.plans.filter((plan:any)=>plan.canSave).length} available {run.plans.filter((plan:any)=>plan.canSave).length===1?'action':'actions'} · Generated {dbDate(run.generatedAt)}</p></div></div><button type="button" className="btn" onClick={()=>jumpTo(assumptionsRef)}>Edit assumptions</button></div>
      <section className="ops-conclusion" aria-label="Comparison conclusion"><span className="eyebrow">Your next move</span><h3>{run.keepOriginal?'Keep the saved plan for now':recommendedPlan?.title||'Review the assumptions'}</h3><p>{run.keepOriginal?run.keepOriginalReason:recommendedPlan?.tradeoff||run.noFeasibleReason}</p>{!run.keepOriginal&&recommendedPlan&&<RecommendationChanges plan={recommendedPlan}/>}<p className="small"><strong>Before trying it:</strong> {recommendedPlan?.risks?.[0]||run.diagnostics?.nextStep}</p>{run.keepOriginal&&<button type="button" className="btn" onClick={()=>openSavedScenario(source.id)}>Review the saved original <ArrowRight size={14}/></button>}{!run.keepOriginal&&displayPlans.some((p:any)=>p.id===run.recommendedId&&p.canSave)&&<button type="button" className="btn primary" onClick={()=>selectPlan(recommendedPlan)}>Choose this action <ArrowRight size={14}/></button>}</section>
      <p className="ops-note">{run.rankingNote}{run.mergedCount>0?' '+run.mergedCount+' equivalent '+(run.mergedCount===1?'result was':'results were')+' combined.':''}</p>
      {run.adjustments?.length>0&&<div className="ops-assumption-changes"><strong>Changed for this comparison</strong>{run.adjustments.map((item:any)=><span key={item.field}>{item.label}: {item.from===null?'Unknown':item.field==='cost'?dbMoney(item.from):dbUnits(item.from)} → {item.to===null?'Unknown':item.field==='cost'?dbMoney(item.to):dbUnits(item.to)}</span>)}<small>The original row keeps the saved inputs.</small></div>}
      {run.source.cost===null&&<div className="notice warn" role="status">Unit cost is still unknown. You can compare stock and revenue; profit and margin need review. <button type="button" className="ops-text-action" onClick={()=>remedy('cost')}>Enter a cost assumption</button></div>}

      {run.noFeasibleReason&&<div className="ops-no-plan" role="status"><h3>No action is ready to save</h3><p>{run.noFeasibleReason}</p>{run.diagnostics?.nextStep!==run.noFeasibleReason&&<p>{run.diagnostics?.nextStep}</p>}<button type="button" className="btn" onClick={()=>remedy(limitingInput)}>Review the limiting input</button></div>}
      <ScenarioComparisonChart run={run} plans={displayPlans} selected={selected} onChoose={selectPlan}/>
      <ol className="ops-actions">{displayPlans.map((plan:any,index:number)=><li key={plan.id} className={'ops-action '+(selected===plan.id?'chosen':'')}><span className="ops-action-index">{String(index+1).padStart(2,'0')}</span><article className="ops-action-body"><header><h3>{plan.title}</h3><p className={'ops-action-status '+(!plan.canSave||plan.needsCostReview?'caution':'')}>{!plan.canSave?'Needs a change before saving':plan.needsCostReview?'Stock plan · cost needs review':run.recommendedId===plan.id?'Highest-ranked available change':'Available to compare'}</p></header><p>{plan.action}</p><p className="muted">{plan.reason}</p><RecommendationChanges plan={plan}/><p className="ops-tradeoff">{plan.tradeoff}</p>{!plan.canSave&&<ul className="ops-blockers">{plan.issues.map((issue:string,i:number)=><li key={i}>{issue}</li>)}</ul>}<details><summary>Risks and checks</summary><ul>{plan.risks.map((risk:string,i:number)=><li key={i}>{risk}</li>)}</ul>{plan.mergedStrategies?.includes('replenishment')&&<p>Purchasing cash for extra stock: {dbMoney(plan.estimatedPurchaseCost??(run.source.cost===null?null:plan.additionalStock*run.source.cost))}</p>}</details></article><aside className="ops-action-side"><div><strong>{dbMoney(plan.metrics.grossProfit===null?plan.metrics.revenue:plan.metrics.contribution)}</strong><br/><small>{plan.metrics.grossProfit===null?'assumed revenue':'after operating cost'}</small></div><button type="button" className={'btn '+(selected===plan.id?'primary':'')} onClick={()=>selectPlan(plan)} disabled={!plan.canSave||saving}>{selected===plan.id?'Selected':'Choose this action'}</button></aside></li>)}</ol>
      <details className="ops-ai-disclosure"><summary><span>Check before deciding</span><small>{aiEvidence?'AI review available':'Immediate checks + AI priorities'}</small></summary><RecommendationAi key={run.runId} run={run} email={user.email} sourceId={source.id} onEvidence={setAiEvidence} disabled={saving}/></details>
      <details className="stack ops-full-comparison"><summary>Detailed comparison</summary><div className="row between"><h2>Compare the numbers</h2><span className="small muted">Currency: THB</span></div><p className="ops-form-note">Changes are measured against the saved original. A profit change is unavailable when either unit cost is unknown. Original operating cost: {dbMoney(run.baseline.operatingCost??0)}.</p><div className="table-wrap" tabIndex={0} role="region" aria-label="Full comparison. Scroll horizontally for all metrics."><table className="db-table"><thead><tr><th>Plan</th><th>Discount / units</th><th>Stock / remaining</th><th>Revenue (THB)</th><th>Gross profit (THB)</th><th>After operating cost (THB)</th></tr></thead><tbody>{[{id:'source',title:'Saved original',...run.baseline},...displayPlans].map((plan:any)=><tr key={plan.id} className={selected===plan.id?'selected-cell':''}><td><strong>{plan.title}</strong>{plan.id!=='source'&&<p className="small muted">{plan.canSave?'Available for review':'Needs adjustment'}</p>}</td><td>{plan.discount}%<p className="small muted">{dbUnits(plan.units)} units</p></td><td>{dbUnits(plan.stock)}<p className="small muted">{dbUnits(plan.metrics.remaining)} remaining</p></td><td>{dbMoney(plan.metrics.revenue)}{plan.delta&&<p className="ops-table-delta">{opsChangeLabel(plan.delta.revenue)}</p>}</td><td>{dbMoney(plan.metrics.grossProfit)}{plan.delta&&<p className="ops-table-delta">{opsChangeLabel(plan.delta.grossProfit)}</p>}</td><td>{dbMoney(plan.metrics.contribution)}{plan.delta&&<p className="ops-table-delta">{opsChangeLabel(plan.delta.contribution)}</p>}</td></tr>)}</tbody></table></div></details>
      {selectedPlan&&<section className="ops-save" ref={saveRef} tabIndex={-1} aria-labelledby="ops-save-title"><div className="ops-section-heading"><span>04</span><h2 id="ops-save-title">Save as a new scenario</h2></div><p>{selectedPlan.action}</p><RecommendationChanges plan={selectedPlan}/><p className="small muted">Save this comparison as a new scenario. After its calculations are checked, you can record a linked Pending Decision.</p><label>New scenario name *<input className="input" value={planName} onChange={e=>setPlanName(e.target.value)} maxLength={1024} disabled={saving}/></label><label>Manager rationale *<textarea className="input" value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="Why this action? What should be checked before trying it?" disabled={saving}/></label>{error&&<div className="notice warn" role="alert">{error}</div>}{!creatorReady&&<p className="small muted">One matching user record is needed before saving. Check the user connection if this message remains.</p>}<button type="button" className="btn primary" onClick={savePlan} disabled={!selectedPlan.canSave||!createScenario.enabled||!creatorReady||saving}>{saving?'Saving scenario…':'Save as new scenario'}</button></section>}
    </div>}
  </div>;
}

// END OPS FEATURE

// BEGIN AUTH ENTRY
// Workspace account controls use the standalone sign-in and account routes.
type AuthEntryUser = ReturnType<typeof useCurrentUser>;
type AuthEntryNavigation = ReturnType<typeof useNavigationSetting>;

function AuthSecondaryLinks() {
  const signupLink = useNavigationSetting({name:'real-signup',label:'Create account page',initialValue:{destination:'/sign-up',openIn:'SELF'}});
  const resetLink = useNavigationSetting({name:'real-password-reset',label:'Password recovery page',initialValue:{destination:'/forgot-password',openIn:'SELF'}});
  return <div className="auth-secondary-links" aria-label="Account help">
    <NavigationAction navigation={signupLink} className="auth-text-link">Create account</NavigationAction>
    <NavigationAction navigation={resetLink} className="auth-text-link">Reset password</NavigationAction>
  </div>;
}

function AccountNavigation({user,loginLink,className='auth-text-link',children}: {
  user: AuthEntryUser;
  loginLink: AuthEntryNavigation;
  className?: string;
  children?: React.ReactNode;
}) {
  const accountLink = useNavigationSetting({name:'real-account',label:'Account settings page',initialValue:{destination:'/account',openIn:'SELF'}});
  if (user?.email) return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event('cp-open-preferences'))}>{children ?? 'Account'}</button>;
  return <NavigationAction navigation={user?.email?accountLink:loginLink} className={className}>
    {children ?? (user?.email?'Account':'Sign in')}
  </NavigationAction>;
}

function AccountSummary({user}: {user: AuthEntryUser}) {
  const name = user?.email ? (user.fullName || 'Your account') : 'Not signed in';
  const initial = user?.email ? (user.fullName || user.email).trim().slice(0,1).toUpperCase() : '?';
  return <div className="account-summary">
    <span className="avatar" aria-hidden="true">{initial}</span>
    <div className="account-identity"><strong>{name}</strong>{user?.email&&<p>{user.email}</p>}</div>
  </div>;
}

function AuthGate({loginLink,title,description,openDemo}: {
  loginLink: AuthEntryNavigation;
  title: string;
  description: string;
  openDemo?: () => void;
}) {
  return <section className="panel auth-gate">
    <span className="eyebrow">Your workspace</span>
    <h1>{title}</h1>
    <p className="muted">{description}</p>
    <div className="auth-gate-actions">
      <NavigationAction navigation={loginLink} className="btn primary"><LogIn size={16}/>Sign in</NavigationAction>
      <AuthSecondaryLinks/>
    </div>
    {openDemo&&<div className="auth-gate-demo"><p>Just exploring? Sample screens use synthetic data.</p><button type="button" className="auth-text-link" onClick={openDemo}>Explore sample screens <ArrowRight size={14}/></button></div>}
  </section>;
}

function AuthEntry({brand,user,loginLink,onContinue,onExplore}: {
  brand: string;
  user: AuthEntryUser;
  loginLink: AuthEntryNavigation;
  onContinue: () => void;
  onExplore: () => void;
}) {
  const signedIn = !!user?.email;
  return <section className="auth-entry" aria-labelledby="auth-entry-title">
    <header className="auth-entry-header">
      <div className="auth-entry-brand"><BrandIcon size={40}/><div><strong>{brand}</strong><p>Decision assistant</p></div></div>
      <span className="auth-entry-prototype">Coursework prototype</span>
    </header>
    <main className="auth-entry-main">
      <div className="auth-entry-intro">
        <p className="eyebrow">Welcome to your workspace</p>
        <h1 id="auth-entry-title">Plan your next store action.</h1>
        <p className="auth-entry-description">Create a scenario, compare practical actions and keep a record of your decision.</p>
        <ol className="auth-entry-steps">
          <li><span aria-hidden="true">01</span><div><strong>My Scenarios</strong><p>Save the assumptions you want to test.</p></div></li>
          <li><span aria-hidden="true">02</span><div><strong>Recommendations</strong><p>Compare actions and review the trade-offs.</p></div></li>
          <li><span aria-hidden="true">03</span><div><strong>My Decisions</strong><p>Record your choice and follow its status.</p></div></li>
        </ol>
      </div>
      <div className="auth-entry-access">
        <section className="auth-entry-card" aria-labelledby="auth-entry-account-title">
          <p className="eyebrow">{signedIn?'Your account':'Account access'}</p>
          <h2 id="auth-entry-account-title">{signedIn?'Welcome back':'Sign in to your workspace'}</h2>
          <p className="muted">{cloudEnabled
            ? 'Use your CP Retail account to access scenarios and decisions saved in Supabase.'
            : 'This demo saves scenarios and decisions in this browser.'}</p>
          {advisorEnabled&&<p className="muted">When you request an Advisor review, CP Retail sends customer-group summaries or numerical scenario assumptions and results to DeepSeek.</p>}
          {signedIn&&<AccountSummary user={user}/>}
          {signedIn?<button type="button" className="btn primary auth-entry-primary" onClick={onContinue}>Continue to My Scenarios <ArrowRight size={16}/></button>:<NavigationAction navigation={loginLink} className="btn primary auth-entry-primary"><LogIn size={16}/>Sign in <ArrowRight size={16}/></NavigationAction>}
          {signedIn?<AccountNavigation user={user} loginLink={loginLink}>Account settings</AccountNavigation>:<AuthSecondaryLinks/>}
        </section>
        <details className="auth-entry-demo">
          <summary><HelpCircle size={16} aria-hidden="true"/><span>Just exploring?</span></summary>
          <div><p>Explore the sample store with synthetic transactions.</p><button type="button" className="btn" onClick={onExplore}>Explore sample screens <ArrowRight size={15}/></button></div>
        </details>
      </div>
    </main>
    <footer className="auth-entry-footer"><span>Coursework prototype · No live CP connection</span><span>{cloudEnabled ? 'Saved work requires an account.' : 'Demo work stays in this browser.'}</span></footer>
  </section>;
}
// END AUTH ENTRY

// BEGIN CUSTOMER PROFILING
// Deterministic customer grouping for completed transactions in one currency.
// No customer-level data is included in profileSnapshot().
const PROFILE_VERSION = 'rfm-1.0';

const PROFILE_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'regular', name: 'Regular customers', description: 'Recent purchases and at least four visits in the selected window.', action: 'Review a small loyalty or repeat-visit offer. Check the margin before choosing a discount.' }),
  Object.freeze({ id: 'recent', name: 'Recent customers', description: 'A purchase within seven days, with fewer than four visits in the selected window.', action: 'Test a reason to return. Treat the expected response as an assumption.' }),
  Object.freeze({ id: 'cooling', name: 'Cooling regulars', description: 'At least four visits in the selected window, but no purchase in the last seven days.', action: 'Review a return-visit offer and check whether the purchase gap matters for this store.' }),
  Object.freeze({ id: 'occasional', name: 'Occasional customers', description: 'Fewer than four visits in the selected window, with the latest purchase more than seven days ago.', action: 'Try a limited value offer. Use a small demand assumption until it has been tested.' }),
]);

const PROFILE_HEADERS = ['transaction_id', 'customer_id', 'purchased_on', 'amount_thb'];
const PROFILE_OPTIONAL_HEADER = 'category';
const PROFILE_MAX_ROWS = 2000;
const PROFILE_MAX_TEXT = 250000;
const PROFILE_DAY_MS = 86400000;
const PROFILE_RULES = Object.freeze({
  recency: 'Days since the latest purchase as of the analysis date. R: 5 at 0–1 days; 4 at 2–7; 3 at 8–14; 2 at 15–21; 1 after 21.',
  frequency: 'Completed transactions in the selected window. F: 5 at 8 or more; 4 at 6–7; 3 at 4–5; 2 at 2–3; 1 at 1.',
  monetary: 'Total spend in THB in the selected window. M: 5 at 400 or more; 4 at 250–399.99; 3 at 150–249.99; 2 at 75–149.99; 1 below 75.',
  segmentation: 'Regular: R ≥ 4 and F ≥ 3. Recent: R ≥ 4 and F < 3. Cooling: R < 4 and F ≥ 3. Occasional: R < 4 and F < 3. M describes spend; it does not decide these four groups.',
  window: 'The window includes the analysis date and the preceding windowDays minus one days. F and M use raw totals for that selected window, without normalising to 30 days.',
});

function profileDateDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return null;
  const time = Date.parse(value + 'T00:00:00.000Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return null;
  return time / PROFILE_DAY_MS;
}

function profileDayDate(day) {
  return new Date(day * PROFILE_DAY_MS).toISOString().slice(0, 10);
}

function profileAmountCents(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const source = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(source)) return null;
  const [whole, fraction = ''] = source.split('.');
  const cents = Number(whole + fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

function profileValidId(value) {
  // This checks the identifier format, not whether a person is identifiable.
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
}

function profileValidateRows(rows) {
  const errors = [];
  const normalized = [];
  if (!Array.isArray(rows)) return { rows: [], errors: ['Transactions must be an array.'] };
  if (rows.length > PROFILE_MAX_ROWS) return { rows: [], errors: ['Use at most 2,000 transactions.'] };
  const ids = new Set();
  let totalCents = 0;
  rows.forEach((row, index) => {
    const prefix = 'Transaction ' + (index + 1) + ': ';
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(prefix + 'use the four required transaction fields.');
      return;
    }
    const keys = Object.keys(row);
    const hasCategory = keys.includes(PROFILE_OPTIONAL_HEADER);
    if (keys.length !== (hasCategory ? 5 : 4) || keys.some(key => key !== PROFILE_OPTIONAL_HEADER && !PROFILE_HEADERS.includes(key))) {
      errors.push(prefix + 'use only transaction_id, customer_id, purchased_on and amount_thb.');
      return;
    }
    const transactionId = typeof row.transaction_id === 'string' ? row.transaction_id.trim() : row.transaction_id;
    const customerId = typeof row.customer_id === 'string' ? row.customer_id.trim() : row.customer_id;
    let valid = true;
    if (!profileValidId(transactionId)) {
      errors.push(prefix + 'transaction_id must be 1–64 letters, numbers, hyphens or underscores.');
      valid = false;
    } else if (ids.has(transactionId)) {
      errors.push(prefix + 'transaction_id is duplicated. Each row must be one complete transaction.');
      valid = false;
    } else ids.add(transactionId);
    if (!profileValidId(customerId)) {
      errors.push(prefix + 'customer_id must be a pseudonymous ID of 1–64 letters, numbers, hyphens or underscores. Do not use names or email addresses.');
      valid = false;
    }
    if (profileDateDay(row.purchased_on) === null) {
      errors.push(prefix + 'purchased_on must be a real date in YYYY-MM-DD format.');
      valid = false;
    }
    const cents = profileAmountCents(row.amount_thb);
    if (cents === null) {
      errors.push(prefix + 'amount_thb must be positive with at most two decimal places.');
      valid = false;
    } else if (!Number.isSafeInteger(totalCents + cents)) {
      errors.push(prefix + 'the combined amount is too large to calculate exactly.');
      valid = false;
    } else totalCents += cents;
    const category = hasCategory && typeof row.category === 'string' ? row.category.trim() : row.category;
    if (hasCategory && (typeof category !== 'string' || !/^[^,"]{1,40}$/.test(category) || [...category].some(ch => ch.charCodeAt(0) < 32))) {
      errors.push(prefix + 'category must be 1–40 characters without commas or quotes.');
      valid = false;
    }
    if (valid) normalized.push({ transaction_id: transactionId, customer_id: customerId, purchased_on: row.purchased_on, amount_thb: cents / 100, ...(hasCategory ? { category } : {}) });
  });
  return { rows: errors.length ? [] : normalized, errors };
}

function profileReadCsv(text) {
  const records = [];
  let record = [], cell = '', quoted = false, closed = false;
  const endCell = () => { record.push(cell); cell = ''; closed = false; };
  const endRecord = () => { endCell(); if (record.length !== 1 || record[0].trim() !== '') records.push(record); record = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; }
      } else cell += ch;
      continue;
    }
    if (closed && ch !== ',' && ch !== '\r' && ch !== '\n') return { records: [], error: 'After a closing quote, use a comma or a new line.' };
    if (ch === '"') {
      if (cell !== '') return { records: [], error: 'A quoted CSV value must start with its opening quote.' };
      quoted = true;
    } else if (ch === ',') endCell();
    else if (ch === '\r' || ch === '\n') { endRecord(); if (ch === '\r' && text[i + 1] === '\n') i++; }
    else cell += ch;
  }
  if (quoted) return { records: [], error: 'The CSV contains an unclosed quoted value.' };
  if (cell !== '' || record.length || closed) endRecord();
  return { records, error: null };
}

function parseProfileCsv(text) {
  if (typeof text !== 'string') return { rows: [], errors: ['Paste CSV text or choose a CSV file.'] };
  if (text.length > PROFILE_MAX_TEXT) return { rows: [], errors: ['Use a CSV with at most 250,000 characters.'] };
  const parsed = profileReadCsv(text.replace(/^\uFEFF/, ''));
  if (parsed.error) return { rows: [], errors: [parsed.error] };
  if (!parsed.records.length) return { rows: [], errors: ['Add the four CSV headers before analysing transactions.'] };
  const headers = parsed.records[0].map(value => value.trim());
  const width = headers.includes(PROFILE_OPTIONAL_HEADER) ? 5 : 4;
  if (headers.length !== width || new Set(headers).size !== width || headers.some(header => header !== PROFILE_OPTIONAL_HEADER && !PROFILE_HEADERS.includes(header))) {
    return { rows: [], errors: ['Use exactly these four CSV headers: transaction_id, customer_id, purchased_on, amount_thb, plus an optional category column. Other columns are not accepted.'] };
  }
  if (parsed.records.length - 1 > PROFILE_MAX_ROWS) return { rows: [], errors: ['Use at most 2,000 transactions.'] };
  const rows = [], errors = [];
  parsed.records.slice(1).forEach((values, index) => {
    if (values.length !== width) errors.push('Transaction ' + (index + 1) + ': expected ' + (width === 5 ? 'five' : 'four') + ' CSV values.');
    else rows.push(Object.fromEntries(headers.map((header, i) => [header, header === 'purchased_on' ? values[i].trim() : values[i]])));
  });
  if (errors.length) return { rows: [], errors };
  return profileValidateRows(rows);
}

function profileRScore(days) { return days <= 1 ? 5 : days <= 7 ? 4 : days <= 14 ? 3 : days <= 21 ? 2 : 1; }
function profileFScore(visits) { return visits >= 8 ? 5 : visits >= 6 ? 4 : visits >= 4 ? 3 : visits >= 2 ? 2 : 1; }
function profileMScore(cents) { return cents >= 40000 ? 5 : cents >= 25000 ? 4 : cents >= 15000 ? 3 : cents >= 7500 ? 2 : 1; }
function profilePercent(part, whole) { return whole ? Math.round(part * 1000 / whole) / 10 : 0; }

function analyzeProfiles(rows, options) {
  const asOf = options?.asOf;
  const windowDays = options?.windowDays;
  const endDay = profileDateDay(asOf);
  if (endDay === null) throw new Error('Choose a real analysis date in YYYY-MM-DD format.');
  if (![30, 60, 90].includes(windowDays)) throw new Error('Choose a 30, 60 or 90 day window.');
  const validated = profileValidateRows(rows);
  if (validated.errors.length) throw new Error(validated.errors.join(' '));
  const startDay = endDay - windowDays + 1;
  const grouped = new Map();
  let excludedFutureRows = 0, excludedOutsideWindowRows = 0, totalCents = 0, includedRows = 0;
  for (const row of validated.rows) {
    const day = profileDateDay(row.purchased_on);
    if (day > endDay) { excludedFutureRows++; continue; }
    if (day < startDay) { excludedOutsideWindowRows++; continue; }
    const cents = profileAmountCents(row.amount_thb);
    totalCents += cents;
    includedRows++;
    const group = grouped.get(row.customer_id) ?? { customerId: row.customer_id, visits: 0, cents: 0, lastDay: day };
    group.visits++;
    group.cents += cents;
    group.lastDay = Math.max(group.lastDay, day);
    grouped.set(row.customer_id, group);
  }
  const profiles = Array.from(grouped.values()).map(group => {
    const recencyDays = endDay - group.lastDay;
    const rScore = profileRScore(recencyDays), fScore = profileFScore(group.visits), mScore = profileMScore(group.cents);
    const segmentId = rScore >= 4 ? (fScore >= 3 ? 'regular' : 'recent') : (fScore >= 3 ? 'cooling' : 'occasional');
    return { customerId: group.customerId, visits: group.visits, totalSpend: group.cents / 100, averageBasket: Math.round(group.cents / group.visits) / 100, lastPurchase: profileDayDate(group.lastDay), recencyDays, rScore, fScore, mScore, rfm: [rScore, fScore, mScore].join('-'), segmentId };
  }).sort((a, b) => a.customerId.localeCompare(b.customerId, 'en'));
  const segments = PROFILE_SEGMENTS.map(segment => {
    const members = profiles.filter(profile => profile.segmentId === segment.id);
    const memberCents = members.reduce((sum, profile) => sum + grouped.get(profile.customerId).cents, 0);
    const transactionCount = members.reduce((sum, profile) => sum + profile.visits, 0);
    return { ...segment, customerCount: members.length, transactionCount, totalSpend: memberCents / 100, averageBasket: transactionCount ? Math.round(memberCents / transactionCount) / 100 : 0, share: profilePercent(members.length, profiles.length), averageRecencyDays: members.length ? Math.round(members.reduce((sum, profile) => sum + profile.recencyDays, 0) * 10 / members.length) / 10 : 0 };
  });
  const repeatCustomerCount = profiles.filter(profile => profile.visits >= 2).length;
  return {
    version: PROFILE_VERSION,
    asOf,
    windowDays,
    rules: { ...PROFILE_RULES },
    profiles,
    segments,
    totals: { customerCount: profiles.length, transactionCount: includedRows, totalSpend: totalCents / 100, averageBasket: includedRows ? Math.round(totalCents / includedRows) / 100 : 0, repeatCustomerCount, repeatCustomerShare: profilePercent(repeatCustomerCount, profiles.length) },
    coverage: { inputRows: validated.rows.length, includedRows, excludedFutureRows, excludedOutsideWindowRows, startDate: profileDayDate(startDay), endDate: asOf },
  };
}

function profileSnapshot(analysis, segmentId) {
  if (!analysis || analysis.version !== PROFILE_VERSION || !Array.isArray(analysis.segments)) throw new Error('Analyse the transactions before using a customer group.');
  const segment = analysis.segments.find(item => item.id === segmentId);
  if (!segment || !PROFILE_SEGMENTS.some(item => item.id === segmentId)) throw new Error('Choose a valid customer group.');
  return {
    version: PROFILE_VERSION,
    asOf: analysis.asOf,
    windowDays: analysis.windowDays,
    startDate: analysis.coverage.startDate,
    rules: { ...PROFILE_RULES },
    segmentId: segment.id,
    segmentName: segment.name,
    customerCount: segment.customerCount,
    transactionCount: segment.transactionCount,
    totalSpend: segment.totalSpend,
    averageBasket: segment.averageBasket,
    averageRecencyDays: segment.averageRecencyDays,
    action: segment.action,
    limitation: 'Observed purchases describe a group. They do not predict demand or explain personal reasons. Manager review is required.',
  };
}

function makeProfileSample(asOf = '2026-10-31') {
  const endDay = profileDateDay(asOf);
  if (endDay === null) throw new Error('Choose a real sample date in YYYY-MM-DD format.');
  const firstSupportedDay = profileDateDay('0001-01-01');
  const entries = [
    ['CUST-101', [0, 3, 7, 12, 18, 22, 25, 28], '58.25'],
    ['CUST-102', [2, 5, 14, 21], '42.50'],
    ['CUST-201', [1, 8], '76.00'],
    ['CUST-202', [4], '95.50'],
    ['CUST-301', [10, 14, 19, 25], '81.25'],
    ['CUST-302', [12, 16, 20, 27, 35, 42], '36.75'],
    ['CUST-401', [18], '49.00'],
    ['CUST-402', [25, 28, 38, 53], '67.25'],
  ];
  let number = 0;
  const lines = [PROFILE_HEADERS.join(',')];
  for (const [customer, ages, amount] of entries) {
    for (const age of ages) lines.push(['TX-' + String(++number).padStart(3, '0'), customer, profileDayDate(Math.max(firstSupportedDay, endDay - age)), amount].join(','));
  }
  return lines.join('\n') + '\n';
}

// Return-offer check for one customer group. Pure arithmetic on the group's
// observed size and average basket plus explicit manager assumptions.
const PROFILE_OFFER_VERSION = 'offer-1.0';
const PROFILE_OFFER_DISCOUNTS = Object.freeze([5, 10, 15, 20]);

function offerPercent(value, label, errors, { min = 0, max = 100, decimals = 0 } = {}) {
  if (value === '' || value === null || value === undefined) { errors.push(label + ' is required.'); return null; }
  const n = Number(value);
  const pattern = decimals ? new RegExp('^\\d+(?:\\.\\d{1,' + decimals + '})?$') : /^\d+$/;
  if (!Number.isFinite(n) || !pattern.test(String(value).trim()) || n < min || n > max) {
    errors.push(label + ' must be ' + (decimals ? 'a number' : 'a whole number') + ' from ' + min + ' to ' + max + '.');
    return null;
  }
  return n;
}

function profileOfferCheck(input) {
  const errors = [];
  const customerCount = input?.customerCount;
  const averageBasket = input?.averageBasket;
  if (!Number.isInteger(customerCount) || customerCount <= 0) errors.push('Choose a customer group with at least one customer.');
  if (typeof averageBasket !== 'number' || !Number.isFinite(averageBasket) || averageBasket <= 0) errors.push('The group needs a positive average basket.');
  const discount = offerPercent(input?.discountPercent, 'Discount', errors, { min: 1, max: 50 });
  const baseline = offerPercent(input?.baselineReturnPercent, 'Return without the offer', errors);
  const withOffer = offerPercent(input?.offerReturnPercent, 'Return with the offer', errors);
  const margin = offerPercent(input?.marginPercent, 'Gross margin', errors, { min: 0, max: 100, decimals: 1 });
  if (baseline !== null && withOffer !== null && withOffer < baseline) errors.push('Return with the offer cannot be lower than return without it.');
  if (errors.length) return { errors };
  const n = customerCount, basket = averageBasket, d = discount / 100, b = baseline / 100, r = withOffer / 100, m = margin / 100;
  const round = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const without = { customers: round(n * b), revenue: round(n * b * basket), grossProfit: round(n * b * basket * m) };
  const offered = { customers: round(n * r), revenue: round(n * r * basket * (1 - d)), grossProfit: round(n * r * basket * (m - d)), discountCost: round(n * r * basket * d) };
  const incrementalGrossProfit = round(n * basket * (r * (m - d) - b * m));
  const incrementalRevenue = round(n * basket * (r * (1 - d) - b));
  const discountOnExistingReturns = round(n * b * basket * d);
  const breakEvenReturnPercent = m > d ? round(b * m / (m - d) * 100) : null;
  let status;
  if (m <= d) status = 'discount-exceeds-margin';
  else if (breakEvenReturnPercent > 100) status = 'cannot-pay-back';
  else status = incrementalGrossProfit >= 0 ? 'pays-back' : 'below-break-even';
  return {
    errors: [],
    result: {
      version: PROFILE_OFFER_VERSION,
      inputs: { customerCount: n, averageBasket: basket, discountPercent: discount, baselineReturnPercent: baseline, offerReturnPercent: withOffer, marginPercent: margin, marginSource: typeof input?.marginSource === 'string' ? input.marginSource.slice(0, 160) : 'Manager assumption' },
      withoutOffer: without,
      withOffer: offered,
      incrementalRevenue,
      incrementalGrossProfit,
      discountOnExistingReturns,
      breakEvenReturnPercent,
      status,
      method: 'One redeemed visit per returning customer at the group\'s historical average basket. Gross margin is applied to the whole basket. Return rates are manager assumptions, not forecasts.',
    },
  };
}

function profileOfferValid(check) {
  return !!check && check.version === PROFILE_OFFER_VERSION && ['pays-back', 'below-break-even', 'cannot-pay-back', 'discount-exceeds-margin'].includes(check.status)
    && ['incrementalGrossProfit', 'incrementalRevenue', 'discountOnExistingReturns'].every(k => typeof check[k] === 'number' && Number.isFinite(check[k]))
    && (check.breakEvenReturnPercent === null || (typeof check.breakEvenReturnPercent === 'number' && Number.isFinite(check.breakEvenReturnPercent)))
    && !!check.inputs && ['discountPercent', 'baselineReturnPercent', 'offerReturnPercent', 'marginPercent'].every(k => typeof check.inputs[k] === 'number' && Number.isFinite(check.inputs[k]));
}

// Gross margin from a saved scenario's reference price and unit cost; null when cost is unknown.
function profileScenarioMargin(price, cost) {
  if (typeof price !== 'number' || typeof cost !== 'number' || !Number.isFinite(price) || !Number.isFinite(cost) || price <= 0 || cost < 0 || cost > price) return null;
  return Math.round((price - cost) / price * 1000) / 10;
}

// Inlined with the tested profiling engine into the Softr block.
function profileValidContext(evidence:any) {
  return !!evidence && evidence.version===PROFILE_VERSION && PROFILE_SEGMENTS.some(s=>s.id===evidence.segmentId) && typeof evidence.asOf==='string' && /^\d{4}-\d{2}-\d{2}$/.test(evidence.asOf) && [30,60,90].includes(evidence.windowDays) && ['customerCount','transactionCount','totalSpend','averageBasket'].every(k=>typeof evidence[k]==='number'&&Number.isFinite(evidence[k])&&evidence[k]>=0) && Number.isInteger(evidence.customerCount) && Number.isInteger(evidence.transactionCount) && evidence.customerCount>0;
}
function ProfileEvidence({evidence}:any) {
  if(!profileValidContext(evidence)) return null;
  return <section className="profile-context" aria-label="Captured customer segment"><div className="row between"><h3>Customer segment context</h3><span className="small muted">Captured {evidence.asOf} · {evidence.windowDays} days</span></div><p><strong>{PROFILE_SEGMENTS.find(s=>s.id===evidence.segmentId)?.name}</strong> · {evidence.customerCount} {evidence.customerCount===1?'customer':'customers'} · {evidence.transactionCount} {evidence.transactionCount===1?'transaction':'transactions'} · {money(evidence.totalSpend)} recorded spend</p><p className="small muted">{typeof evidence.dataSource==='string'?evidence.dataSource:'Transaction analysis'} · {PROFILE_SEGMENTS.find(s=>s.id===evidence.segmentId)?.description} This describes past purchases. It does not predict demand or justify a discount.</p>{profileOfferValid(evidence.offerCheck)&&<p className="small"><strong>Return offer check:</strong> {evidence.offerCheck.inputs.discountPercent}% off the next visit · return {evidence.offerCheck.inputs.baselineReturnPercent}% → {evidence.offerCheck.inputs.offerReturnPercent}% assumed · {evidence.offerCheck.inputs.marginPercent}% gross margin · {offerHeadline(evidence.offerCheck)} · extra gross profit {money(evidence.offerCheck.incrementalGrossProfit)}</p>}</section>;
}
function offerHeadline(check:any) {
  if(check.status==='discount-exceeds-margin') return 'discount is at least the margin';
  if(check.status==='cannot-pay-back') return 'cannot pay back even at 100% return';
  return (check.status==='pays-back'?'pays back':'below break-even')+' (break-even '+check.breakEvenReturnPercent.toFixed(1)+'% return)';
}
function useOfferCheck(segment:any,scenario:any,prefill:any=null) {
  const fill=prefill&&segment?.id===prefill.segmentId?prefill:null;
  const [discount,setDiscount]=useState(fill?String(fill.discountPercent):'10');
  const [baseline,setBaseline]=useState(fill?String(fill.baselineReturnPercent):'20');
  const [withOffer,setWithOffer]=useState(fill?String(fill.offerReturnPercent):'50');
  const [hasEdited,setHasEdited]=useState(!!fill);
  const [marginInput,setMarginInput]=useState<string|null>(fill?String(fill.marginPercent):null);
  useEffect(()=>{setBaseline('20');setWithOffer('50');setHasEdited(false);},[segment?.id]);
  useEffect(()=>{setMarginInput(null);},[scenario?.id]);
  const [filledFrom,setFilledFrom]=useState<any>(fill);
  const appliedFill=useRef(0);
  useEffect(()=>{if(!fill||appliedFill.current===fill.nonce)return;appliedFill.current=fill.nonce;setDiscount(String(fill.discountPercent));setBaseline(String(fill.baselineReturnPercent));setWithOffer(String(fill.offerReturnPercent));setMarginInput(String(fill.marginPercent));setFilledFrom(fill);setHasEdited(true);},[segment?.id,fill?.nonce]);
  if(!segment?.customerCount) return {result:null,view:null,hasEdited};
  const scenarioMargin=scenario?profileScenarioMargin(dbNumber(scenario.fields.referencePrice),dbNumber(scenario.fields.cost)):null;
  const margin=marginInput??(scenarioMargin===null?'35':String(scenarioMargin));
  const marginSource=marginInput===null&&scenarioMargin!==null?'Price and unit cost of '+(dbText(scenario.fields.name)||'the selected scenario'):marginInput===null?'Starting margin assumption (editable)':'Manager assumption';
  const started=baseline!==''||withOffer!=='';
  const check=started?profileOfferCheck({customerCount:segment.customerCount,averageBasket:segment.averageBasket,discountPercent:discount,baselineReturnPercent:baseline,offerReturnPercent:withOffer,marginPercent:margin,marginSource}):null;
  const result=check?.result;
  return {result:result&&profileOfferValid(result)?result:null,hasEdited,view:<section className="profile-offer" id="cp-offer" aria-label="Return offer check">
    <div style={{position:'relative'}}><h2>Check a return offer for this group</h2><div aria-hidden="true" className="v2-coupon" style={{position:'absolute',top:0,right:0,width:160,height:67.84,overflow:'hidden',pointerEvents:'none'}}><img src="/studio-media/c9c80e19-f4e8-48a9-a8fa-1a815c207c1d.png" alt="" style={{position:'absolute',width:419.58,height:245.76,left:-227.84,top:-24.32,maxWidth:'none'}} /></div><p>{segment.name}: {segment.customerCount} {segment.customerCount===1?'customer':'customers'}, {money(segment.averageBasket)} average basket in this window. Enter what you expect to happen. The check shows whether a discount on the next visit earns back what it gives away.</p></div>
    {filledFrom&&filledFrom.segmentId===segment.id&&discount===String(filledFrom.discountPercent)&&baseline===String(filledFrom.baselineReturnPercent)&&withOffer===String(filledFrom.offerReturnPercent)&&marginInput===String(filledFrom.marginPercent)&&<p className="v2-advisor-note"><Sparkles size={13}/>Filled in by the CP Retail Advisor as starting assumptions. Replace them with what you expect for this store.</p>}
    <p className="small muted">Starting values are editable assumptions. Drag to test the next 30 days.</p>
    <div className="profile-offer-inputs">
      <AssumptionSlider label="Discount on next visit" value={discount} min={PROFILE_OFFER_DISCOUNTS[0]} max={PROFILE_OFFER_DISCOUNTS[PROFILE_OFFER_DISCOUNTS.length-1]} step={1} onChange={(value:string)=>{setDiscount(value);setHasEdited(true);}}/>
      <AssumptionSlider label="Expected return without an offer (%)" value={baseline} onChange={(value:string)=>{setBaseline(value);if(Number(value)>Number(withOffer))setWithOffer(value);setHasEdited(true);}} help="What share of this group will visit again?"/>
      <AssumptionSlider label="Expected return with an offer (%)" value={withOffer} min={Number(baseline)} onChange={(value:string)=>{setWithOffer(value);setHasEdited(true);}} help="At least the no-offer assumption. Adjust to your expectation."/>
      <AssumptionSlider label="Gross margin (%)" value={margin} step={0.1} onChange={(value:string)=>{setMarginInput(value);setHasEdited(true);}} help={marginInput===null&&scenarioMargin!==null?'From '+(dbText(scenario.fields.name)||'the selected scenario')+"'s price and unit cost":marginInput===null?'Starting margin assumption (editable)':'Your assumption'}/>
    </div>
    {check&&check.errors.length>0&&<div className="profile-error" role="alert"><strong>Check the offer inputs</strong><ul>{check.errors.map((e:string,i:number)=><li key={i}>{e}</li>)}</ul></div>}
    {!started&&<p className="small muted" role="status">Enter both return rates to run the check. They are your expectations for the next 30 days, not forecasts.</p>}
    {result&&<OfferResponseChart check={result}/>}
    {result&&<div className="stack" role="status">
      <div className={'profile-offer-verdict '+result.status}><strong>{result.status==='pays-back'?'Pays back under these assumptions':result.status==='below-break-even'?'Below break-even':result.status==='cannot-pay-back'?'Cannot pay back':'Discount is at least the gross margin'}</strong><p>{result.status==='pays-back'?'At least '+result.breakEvenReturnPercent.toFixed(1)+'% of this group must return with the offer. You assumed '+result.inputs.offerReturnPercent+'%.':result.status==='below-break-even'?'At least '+result.breakEvenReturnPercent.toFixed(1)+'% of this group must return with the offer. You assumed '+result.inputs.offerReturnPercent+'%, so the discount gives away more than it brings back.':result.status==='cannot-pay-back'?'Even if every customer returned, the discount given to customers who would return anyway outweighs the extra margin. Consider a non-price reason to return, or no offer.':'Every redeemed basket loses gross profit. Choose a smaller discount or check the margin.'}</p></div>
      <details className="offer-figures"><summary>Detailed offer figures</summary><div className="grid-4 metrics"><Metric label="Break-even return" value={result.breakEvenReturnPercent===null?'None':result.breakEvenReturnPercent>100?'Above 100%':result.breakEvenReturnPercent.toFixed(1)+'%'} detail={'Assumed '+result.inputs.offerReturnPercent+'% with the offer'}/><Metric label="Extra gross profit" value={money(result.incrementalGrossProfit)} detail="Compared with no offer"/><Metric label="Discount to returners anyway" value={money(result.discountOnExistingReturns)} detail={'Customers expected at '+result.inputs.baselineReturnPercent+'% without the offer'}/><Metric label="Revenue change" value={money(result.incrementalRevenue)} detail="After the discount"/></div></details>
      <details className="small muted"><summary>How this is calculated</summary><p>{result.method} Margin source: {result.inputs.marginSource}.</p></details>
    </div>}
  </section>};
}

function CustomerProfiling({state,setState,onPlan,onCreate,onProfiles,mode='profiles',dataPanel,onSample,intent}:any) {
  const user=useCurrentUser();
  const title=useTextSetting({name:'customer-profile-title',label:'Customer profiling title',initialValue:'Customer profiles'});
  const [segment,setSegment]=useState(()=>advisorFresh(intent)&&state.analysis?.segments.some((s:any)=>s.id===intent.segmentId)?intent.segmentId:'all');
  useEffect(()=>{if(advisorFresh(intent)&&state.analysis)setSegment(intent.segmentId);},[intent?.nonce]);
  const [search,setSearch]=useState('');
  const [showAll,setShowAll]=useState(false);
  useEffect(()=>{setShowAll(false);},[segment]);
  const [selectedCustomer,setSelectedCustomer]=useState('');
  const [sourceId,setSourceId]=useState('');
  const [errors,setErrors]=useState<string[]>([]);
  const [reading,setReading]=useState(false);
  const fileRef=useRef<HTMLInputElement|null>(null);
  const resultRef=useRef<HTMLElement|null>(null);
  const scenarios=useRecords({from:ds.scenarios,select:savedScenarioSelect,where:q.and(q.text('owner').is(user?.email??''),q.text('owner').isNotEmpty()),orderBy:q.desc('createdAt'),count:100,enabled:!!user?.email});
  const records=(scenarios.data?.pages.flatMap(p=>p.items)??[]).filter(item=>!!user?.email&&dbText(item.fields.owner).toLowerCase()===user.email.toLowerCase());
  const analysis=state.analysis;
  const visibleProfiles=(analysis?.profiles||[]).filter((p:any)=>(segment==='all'||p.segmentId===segment)&&p.customerId.toLowerCase().includes(search.trim().toLowerCase()));
  const selected=analysis?.profiles.find((p:any)=>p.customerId===selectedCustomer);
  const chosen=analysis?.segments.find((s:any)=>s.id===segment);
  useEffect(()=>{if(segment!=='all')emitTestEvent('segment-selected');},[segment]);
  const draft=(key:string,value:any)=>{setState((old:any)=>({...old,[key]:value,analysis:null,...(key==='csv'?{origin:'Pasted CSV',source:DATASET_SOURCE.upload}:{})}));setErrors([]);setSelectedCustomer('');};
  const analyze=(event?:React.FormEvent)=>{
    event?.preventDefault();setErrors([]);setSelectedCustomer('');
    const parsed=parseProfileCsv(state.csv);
    if(parsed.errors.length){setErrors(parsed.errors);setState((old:any)=>({...old,analysis:null}));return;}
    try{const next=analyzeProfiles(parsed.rows,{asOf:state.asOf,windowDays:Number(state.windowDays)});setState((old:any)=>({...old,analysis:next}));setSegment('all');setSearch('');requestAnimationFrame(()=>resultRef.current?.scrollIntoView({block:'start',behavior:'smooth'}));}
    catch(err:any){setErrors([err?.message||'The data could not be analyzed.']);setState((old:any)=>({...old,analysis:null}));}
  };
  const loadSample=()=>{
    if(onSample)onSample();else setState(demoState());setErrors([]);setSegment('all');setSearch('');setSelectedCustomer('');
  };
  const readFile=async(event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];if(!file)return;
    setErrors([]);setReading(true);setState((old:any)=>({...old,analysis:null}));
    try{if(!file.name.toLowerCase().endsWith('.csv'))throw Error('Choose a CSV file. Spreadsheet files need to be exported as CSV first.');if(file.size>250000)throw Error('Choose a CSV file smaller than 250 KB.');const csv=await file.text();setState((old:any)=>({...old,csv,origin:'Imported CSV',source:DATASET_SOURCE.upload,analysis:null}));setSelectedCustomer('');}
    catch(err:any){setErrors([err?.message||'The file could not be read.']);}
    finally{setReading(false);event.target.value='';}
  };
  const exportGroups=()=>{if(!analysis)return;const csv=['segment,customers,transactions,spend_thb,average_basket_thb,as_of,window_days',...analysis.segments.map((s:any)=>[s.name,s.customerCount,s.transactionCount,s.totalSpend.toFixed(2),s.averageBasket.toFixed(2),analysis.asOf,analysis.windowDays].join(','))].join('\n');download('customer-segment-summary.csv',csv);};
  const pairedScenario=records.find(r=>r.id===sourceId);
  const offer=useOfferCheck(chosen?.customerCount?chosen:null,pairedScenario,advisorFresh(intent)?intent:null);
  const offerKey=offer?.result&&offer.hasEdited?offer.result.status+':'+offer.result.breakEvenReturnPercent:'';
  useEffect(()=>{if(offerKey)emitTestEvent('offer-checked');},[offerKey]);
  const capture=()=>chosen?.customerCount?{...profileSnapshot(analysis,segment),dataSource:state.origin,...(offer?.result?{offerCheck:offer.result}:{})}:null;
  const plan=()=>{const snapshot=capture();if(!snapshot)return;if(records.some(r=>r.id===sourceId))onPlan(sourceId,snapshot);else onCreate(snapshot);};
  return <div className="stack profiling">
    <header className="profile-heading"><div><p className="eyebrow">Purchase history / RFM</p><h1>{mode==='upload'?'Import transactions':title}</h1><p>See who returned, how often they visited and what they spent. Start with a sample or your own pseudonymous transaction CSV.</p><details className="small profile-requirement"><summary>What data do I need?</summary><p>A customer ID on each sale links visits to the same customer. Use a pseudonymous member or loyalty number.</p></details></div><div className="profile-heading-side"><div aria-hidden="true" className="v2-loyalty" style={{position:'relative',width:160,height:104.62,overflow:'hidden',pointerEvents:'none'}}><img src="/studio-media/26979c6c-0ecb-436e-8095-4720c29fad66.png" alt="" style={{position:'absolute',width:651.08,height:406.56,left:-426.67,top:-49.23,maxWidth:'none'}} /></div><span className="profile-source">{state.origin}</span></div></header>
    {dataPanel}<details open={!analysis} className="profile-import-details"><summary>Import or edit transaction data</summary><form className="profile-import" onSubmit={analyze} noValidate>
      <div className="row between"><div><h2>Transaction data</h2><p className="small muted">One completed transaction per row. Maximum 2,000 rows.</p></div><div className="row"><input type="file" accept=".csv,text/csv" ref={fileRef} onChange={readFile} aria-label="Import transaction CSV" className="profile-file"/><button type="button" className="btn" onClick={()=>fileRef.current?.click()} disabled={reading}>{reading?'Reading CSV…':'Choose CSV'}</button><button type="button" className="btn" onClick={loadSample} disabled={reading}>Use sample data</button></div></div>
      <label>Transactions CSV<textarea className="input profile-csv" aria-label="Transactions CSV" spellCheck={false} maxLength={250000} value={state.csv} onChange={e=>draft('csv',e.target.value)} disabled={reading}/></label>
      <details className="profile-schema"><summary>CSV format and data handling</summary><p>Use these columns: <code>transaction_id,customer_id,purchased_on,amount_thb</code>, plus an optional <code>category</code> column. Dates use YYYY-MM-DD; amounts are positive THB with up to two decimals. Transaction IDs must be unique. Use pseudonymous customer IDs, such as CUST-101, and omit names, email addresses and phone numbers.</p><p>Rows are checked before analysis. Invalid data blocks the calculation; no rows are silently repaired. Analysed transactions stay in this session until you choose {saveDataLabel}, which stores the CSV, including its pseudonymous customer IDs, {cloudEnabled ? 'with your account' : 'in this browser'}. Only a selected segment summary is stored with a new scenario. No raw transaction rows or customer IDs are sent to DeepSeek.</p><button type="button" className="btn" onClick={()=>download('transaction-template.csv','transaction_id,customer_id,purchased_on,amount_thb\nTX-001,CUST-101,2026-10-31,95.00\n')}>Download CSV template <Download size={14}/></button></details>
      <div className="profile-controls"><label>Analysis date<input className="input" type="date" value={state.asOf} onChange={e=>draft('asOf',e.target.value)} disabled={reading}/></label><label>Lookback window<select className="input" value={state.windowDays} onChange={e=>draft('windowDays',e.target.value)} disabled={reading}><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label><button type="submit" className="btn primary" disabled={reading}>Analyze transactions <ArrowRight size={15}/></button><button type="button" className="profile-text-btn" disabled={reading} onClick={()=>{draft('csv','transaction_id,customer_id,purchased_on,amount_thb\n');setSegment('all');}}>Clear data</button></div>
      {errors.length>0&&<div className="profile-error" role="alert"><strong>Check the transaction data</strong><ul>{errors.slice(0,8).map((e,i)=><li key={i}>{e}</li>)}</ul>{errors.length>8&&<p>{errors.length-8} more errors. Correct the CSV and analyze again.</p>}</div>}
      {!analysis&&errors.length===0&&<p className="small muted" role="status">{reading?'Reading your file.':'Analyze to apply the current data, date and window.'}</p>}
    </form></details>
    {analysis&&<section className="stack profile-results" ref={resultRef} tabIndex={-1} aria-label="Customer profiling results">
      <div className="row between"><div><h2>Purchase activity</h2><p className="small muted">{analysis.coverage.startDate} to {analysis.coverage.endDate}, inclusive · {state.origin}</p></div><button className="btn" onClick={exportGroups} disabled={!analysis.totals.customerCount}>Export segment summary <Download size={14}/></button></div>
      <div className="grid-4 metrics"><Metric label="Customers" value={String(analysis.totals.customerCount)} detail="With a transaction in this window" icon={Users}/><Metric label="Transactions" value={String(analysis.totals.transactionCount)} detail="Unique completed purchases" icon={ShoppingCart}/><Metric label="Recorded spend" value={money(analysis.totals.totalSpend)} detail="Historical sales, before costs"/><Metric label="Repeat customers" value={analysis.totals.repeatCustomerShare.toFixed(1)+'%'} detail={analysis.totals.repeatCustomerCount+' customers made 2 or more visits'} icon={RotateCcw}/></div>
      <p className="small muted" role="status">{analysis.coverage.includedRows} of {analysis.coverage.inputRows} transactions included. {analysis.coverage.excludedOutsideWindowRows} outside the window; {analysis.coverage.excludedFutureRows} after the analysis date.</p>
      {analysis.totals.customerCount===0?<div className="profile-empty"><h3>No purchases in this window</h3><p>Change the date or lookback window, add transactions, or load the sample.</p></div>:<>
        <section className="segment-overview"><div className="row between"><h2>Who should you focus on?</h2><span className="small muted">Select a group to explore</span></div><div className="profile-groups profile-comparison" aria-label="Calculated customer segments"><div className="segment-chart-head" aria-hidden="true"><span>Customer group</span><span>Share of customers</span><span>Average basket</span></div>{analysis.segments.map((s:any)=><button type="button" key={s.id} aria-pressed={segment===s.id} className={'profile-group '+(segment===s.id?'active':'')} onClick={()=>{setSegment(s.id);setSelectedCustomer('');}}><span className="segment-name"><strong>{s.name}</strong><span className="small muted">{s.description}</span></span><span className="segment-measure"><span className="segment-value">{s.customerCount} <span className="small muted">· {s.share.toFixed(1)}%</span></span><span className="profile-share" aria-hidden="true"><span style={{width:s.share+'%'}}/></span></span><span className="segment-measure"><span className="segment-value">{money(s.averageBasket)}</span><span className="profile-share basket-share" aria-hidden="true"><span style={{width:s.averageBasket/Math.max(1,...analysis.segments.map((g:any)=>g.averageBasket))*100+'%'}}/></span></span></button>)}</div></section>

        {offer?.view}
        <section className="profile-plan" aria-label="Use a segment in planning"><div><h2>Plan for a customer group</h2><p>{chosen?.customerCount?chosen.action:'Choose a group above, then pair its purchase history with a saved product scenario.'}</p><p className="small muted">Choose a saved product scenario, or continue with editable demo assumptions.</p></div><div className="stack"><label>Planning segment<select className="input" value={segment} onChange={e=>{setSegment(e.target.value);setSelectedCustomer('');}}><option value="all">Choose a customer group</option>{analysis.segments.map((s:any)=><option key={s.id} value={s.id} disabled={!s.customerCount}>{s.name} ({s.customerCount})</option>)}</select></label>{user?.email?<><label>Scenario to compare<select className="input" value={sourceId} disabled={scenarios.status!=='success'} onChange={e=>setSourceId(e.target.value)}><option value="">{scenarios.status==='pending'?'Loading scenarios…':'Choose a saved scenario'}</option>{records.map(r=><option key={r.id} value={r.id}>{dbText(r.fields.name)||'Untitled scenario'}</option>)}</select></label>{scenarios.status==='error'&&<div className="profile-error" role="alert">Saved scenarios could not be loaded. <button type="button" className="profile-text-btn" onClick={()=>scenarios.refetch()}>Try again</button></div>}{scenarios.hasNextPage&&<button type="button" className="btn" onClick={()=>scenarios.fetchNextPage()} disabled={scenarios.isFetchingNextPage}>Load more scenarios</button>}<div className="row"><button type="button" className="btn primary" onClick={plan} disabled={!chosen?.customerCount}>Continue to compare actions <ArrowRight size={14}/></button><button type="button" className="profile-text-btn" onClick={()=>onCreate(capture())} disabled={!chosen?.customerCount}>Create a starting scenario</button></div><p className="small muted">Your selected group and offer check continue with you to the next step.</p></>:<p className="small muted">Sign in to pair this group with your saved scenarios.</p>}</div></section>
        <details><summary>About this customer group</summary><GroupExplain analysis={analysis} segmentId={chosen?.customerCount?chosen.id:null} offer={offer?.result}/></details>
        <div className="row between"><button type="button" className={'btn '+(segment==='all'?'primary':'')} onClick={()=>{setSegment('all');setSelectedCustomer('');}}>All customers ({analysis.totals.customerCount})</button><label className="profile-search"><Search size={16}/><input className="input" aria-label="Search customer ID" placeholder="Find a customer ID" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
        <div className="table-wrap profile-table" role="region" tabIndex={0} aria-label="Calculated RFM profiles. Scroll for all columns."><table><thead><tr><th>Customer ID</th><th>Segment</th><th>Days since purchase</th><th>Visits</th><th>Spend</th><th>R F M</th><th>Detail</th></tr></thead><tbody>{visibleProfiles.slice(0,showAll?visibleProfiles.length:PROFILE_TABLE_ROWS).map((p:any)=><tr key={p.customerId}><td><code>{p.customerId}</code></td><td>{PROFILE_SEGMENTS.find(s=>s.id===p.segmentId)?.name}</td><td>{p.recencyDays}</td><td>{p.visits}</td><td>{money(p.totalSpend)}</td><td><code>{p.rfm}</code></td><td><button type="button" className="profile-text-btn" onClick={()=>setSelectedCustomer(p.customerId)}>Explain <ChevronRight size={13}/></button></td></tr>)}</tbody></table>{visibleProfiles.length===0&&<div className="profile-empty">No matching customer IDs in this segment.</div>}</div>
        {visibleProfiles.length>PROFILE_TABLE_ROWS&&<button type="button" className="btn v2-show-all" onClick={()=>setShowAll((v:boolean)=>!v)}>{showAll?'Show the first '+PROFILE_TABLE_ROWS:'Show all '+visibleProfiles.length+' customers'}</button>}
        {selected&&<section className="profile-detail" aria-label="Customer score explanation"><div className="row between"><h3>{selected.customerId}</h3><button type="button" className="profile-text-btn" onClick={()=>setSelectedCustomer('')}>Close detail</button></div><p>Last purchase: {selected.lastPurchase} ({selected.recencyDays} days ago). {selected.visits} visits and {money(selected.totalSpend)} spent in the selected window; average basket {money(selected.averageBasket)}.</p><p>R {selected.rScore} · F {selected.fScore} · M {selected.mScore}. {PROFILE_SEGMENTS.find(s=>s.id===selected.segmentId)?.description}</p><p className="small muted">{PROFILE_SEGMENTS.find(s=>s.id===selected.segmentId)?.action} This is a purchase pattern, not a personal trait or a churn prediction.</p></section>}
      </>}
      <details className="profile-rules"><summary>How RFM scores and groups are calculated</summary><p>Recency is the number of calendar days since the last included purchase. Frequency is the transaction count; monetary value is total THB spent within the selected {analysis.windowDays}-day window. A customer with no included purchases is not assigned a score.</p><p>R: 5 at 0–1 days; 4 at 2–7; 3 at 8–14; 2 at 15–21; 1 after 21. F: 5 at 8+ visits; 4 at 6–7; 3 at 4–5; 2 at 2–3; 1 at one visit. M: 5 at THB 400+; 4 at 250+; 3 at 150+; 2 at 75+; 1 below 75.</p><p>Regular: R ≥ 4 and F ≥ 3. Recent: R ≥ 4 and F &lt; 3. Cooling: R &lt; 4 and F ≥ 3. Occasional: all other included customers. M describes spend; it does not change these four groups. These fixed coursework thresholds use the selected window, so changing the window can change F, M and the group. They are not a validated retail model.</p></details>
      {mode==='upload'&&<button type="button" className="btn" onClick={onProfiles}>Open customer profiles <ArrowRight size={14}/></button>}
    </section>}
  </div>;
}

// END CUSTOMER PROFILING

// BEGIN BRAND LOGO

// END BRAND LOGO

// BEGIN V2 MODULES
// Deterministic simulated convenience-store transactions for the CP Retail demo store.
// Parameters are team assumptions, not CP or retailer data.
const DEMO_STORE_MARKER = 'demo:207';
const HISTORICAL_DEMO_STORE_MARKER = 'demo:207:softr';
const DEMO_STORE_AS_OF = '2026-11-05';
const DEMO_STORE_NAME = 'Demo store (simulated)';
const DEMO_CATEGORIES = Object.freeze(['Breakfast', 'Coffee', 'Snacks', 'Drinks', 'Ready meals']);

function demoRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// count, basket range in THB, category weights in DEMO_CATEGORIES order, and visit ages (days before asOf).
const DEMO_ARCHETYPES = [
  { count: 40, basket: [45, 75], weights: [3, 4, 1, 2, 1], visits: r => demoSeries(r, Math.floor(r() * 5), 89, 4, 6) },
  { count: 30, basket: [50, 80], weights: [2, 3, 2, 2, 2], visits: r => demoSeries(r, 9 + Math.floor(r() * 5), 89, 3, 4) },
  { count: 35, basket: [60, 110], weights: [1, 2, 2, 2, 3], visits: r => demoSeries(r, Math.floor(r() * 7), 20, 5, 9).slice(0, 1 + Math.floor(r() * 3)) },
  { count: 45, basket: [70, 130], weights: [1, 1, 3, 2, 3], visits: r => demoSeries(r, 8 + Math.floor(r() * 20), 89, 15, 30).slice(0, 1 + Math.floor(r() * 3)) },
];

function demoSeries(r, first, last, minGap, maxGap) {
  const ages = [];
  for (let age = first; age <= last; age += minGap + Math.floor(r() * (maxGap - minGap + 1))) ages.push(age);
  return ages;
}

function demoPick(r, weights) {
  let x = r() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return DEMO_CATEGORIES[i]; }
  return DEMO_CATEGORIES[DEMO_CATEGORIES.length - 1];
}

// True only for the exact generated demo text, so simulated data is never saved as a user upload.
function isDemoCsv(csv, asOf = DEMO_STORE_AS_OF) {
  return typeof csv === 'string' && csv === makeDemoStoreCsv(asOf);
}

function makeDemoStoreCsv(asOf = DEMO_STORE_AS_OF) {
  const end = Date.parse(asOf + 'T00:00:00.000Z');
  if (!Number.isFinite(end)) throw new Error('Choose a real demo date in YYYY-MM-DD format.');
  const r = demoRandom(207);
  const total = DEMO_ARCHETYPES.reduce((n, a) => n + a.count, 0);
  const ids = Array.from({ length: total }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const rows = [];
  let next = 0;
  for (const type of DEMO_ARCHETYPES) {
    for (let c = 0; c < type.count; c++) {
      const customer = 'M' + String(1001 + ids[next++]);
      const usual = type.basket[0] + r() * (type.basket[1] - type.basket[0]);
      for (const age of type.visits(r)) {
        const amount = Math.min(200, Math.max(30, Math.round((usual * (0.7 + r() * 0.6)) * 4) / 4));
        rows.push({ age, customer, amount, category: demoPick(r, type.weights) });
      }
    }
  }
  rows.sort((a, b) => b.age - a.age || a.customer.localeCompare(b.customer));
  const lines = ['transaction_id,customer_id,purchased_on,amount_thb,category'];
  rows.forEach((row, i) => lines.push(['TX-' + String(i + 1).padStart(5, '0'), row.customer, new Date(end - row.age * 86400000).toISOString().slice(0, 10), row.amount.toFixed(2), row.category].join(',')));
  const newline = String.fromCharCode(10); // kept escape-free so the block source survives transport unchanged
  return lines.join(newline) + newline;
}

// Store-level figures for the live dashboard, derived from the same validated rows as customer profiling.

const DASH_DAY_MS = 86400000;
const DASH_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dashDay(value) { return Date.parse(value + 'T00:00:00.000Z') / DASH_DAY_MS; }
function dashLabel(day) { const d = new Date(day * DASH_DAY_MS); return DASH_MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
function dashRound(n) { return Math.round(n * 100) / 100; }

function dashboardMetrics(rows, { asOf, windowDays }) {
  const analysis = analyzeProfiles(rows, { asOf, windowDays });
  const end = dashDay(asOf), start = end - windowDays + 1;
  const buckets = Math.ceil(windowDays / 7);
  const weekly = Array.from({ length: buckets }, (_, i) => {
    const last = end - (buckets - 1 - i) * 7, first = Math.max(start, last - 6);
    return { first, last, label: dashLabel(first) + ' – ' + dashLabel(last), sales: 0, transactions: 0 };
  });
  const last7 = { sales: 0, transactions: 0 }, prev7 = { sales: 0, transactions: 0 };
  const categories = new Map();
  let hasCategory = false;
  for (const row of rows) {
    const day = dashDay(row.purchased_on);
    if (day > end || day < start) continue;
    const bucket = weekly.find(w => day >= w.first && day <= w.last);
    bucket.sales += row.amount_thb; bucket.transactions++;
    const age = end - day;
    if (age < 7) { last7.sales += row.amount_thb; last7.transactions++; }
    else if (age < 14) { prev7.sales += row.amount_thb; prev7.transactions++; }
    if (row.category) { hasCategory = true; categories.set(row.category, (categories.get(row.category) || 0) + row.amount_thb); }
  }
  const total = analysis.totals.totalSpend;
  return {
    asOf, windowDays,
    totals: analysis.totals,
    weekly: weekly.map(({ label, sales, transactions }) => ({ label, sales: dashRound(sales), transactions })),
    last7: { sales: dashRound(last7.sales), transactions: last7.transactions },
    prev7: { sales: dashRound(prev7.sales), transactions: prev7.transactions },
    categories: hasCategory ? Array.from(categories, ([category, sales]) => ({ category, sales: dashRound(sales), share: total ? Math.round(sales * 1000 / total) / 10 : 0 })).sort((a, b) => b.sales - a.sales) : null,
    segments: analysis.segments.map(s => ({ id: s.id, name: s.name, customerCount: s.customerCount, share: s.share })),
  };
}

// Aggregate-only context for explaining one customer group, plus a rule-based explanation
// used until (or whenever) the cloud AI cannot answer. No customer IDs leave this module.
const PROFILE_AI_VERSION = 'profile-ai-1.0';

const PEX_SCORES = [1, 2, 3, 4, 5];
const PEX_UNPROFITABLE = ['cannot-pay-back', 'discount-exceeds-margin', 'below-break-even'];

function profileAiContext(analysis, segmentId, offer) {
  const segment = analysis?.segments?.find(s => s.id === segmentId);
  if (!segment) throw new Error('Choose a valid customer group.');
  const members = analysis.profiles.filter(p => p.segmentId === segmentId);
  const count = key => PEX_SCORES.map(score => members.filter(p => p[key] === score).length);
  return {
    version: PROFILE_AI_VERSION,
    windowDays: analysis.windowDays,
    segment: { id: segment.id, customerCount: segment.customerCount, transactionCount: segment.transactionCount, averageBasket: segment.averageBasket, averageRecencyDays: segment.averageRecencyDays, share: segment.share },
    totals: { customerCount: analysis.totals.customerCount, repeatCustomerShare: analysis.totals.repeatCustomerShare },
    rfm: { r: count('rScore'), f: count('fScore'), m: count('mScore') },
    offer: offer ? { discountPercent: offer.discountPercent, breakEvenReturnPercent: offer.breakEvenReturnPercent, status: offer.status } : null,
  };
}

const PEX_TEXT = {
  regular: { risk: 'They already come back often, so a discount mostly goes to visits you would get anyway.', verify: ['Check whether a non-price reward (priority stock, a stamp card) keeps visits steady.', 'Track their visit frequency for two weeks before changing prices.', 'Confirm the margin on their usual items before any discount.'] },
  recent: { risk: 'Most have visited only once or twice, so it is too early to tell who will become a regular.', verify: ['Watch how many make a second visit within 14 days.', 'Test a small reason to return on a few customers first.'] },
  cooling: { risk: 'They used to visit often but have not come in recently; some may already shop elsewhere.', verify: ['Run a small return-offer trial and measure how many actually come back.', 'Check whether a stock-out or price change happened around when they stopped.', 'Compare the break-even return rate with what you expect before scaling.'] },
  occasional: { risk: 'They visit rarely and their response to offers is unknown, so expected returns are a guess.', verify: ['Keep any offer small and time-limited.', 'Measure redemptions before assuming any repeat visits.'] },
};

// A record hook given no id can still return some row, so only trust the row this page asked for.
function explainAnswer(requestId, record) {
  if (!requestId || !record || record.id !== requestId) return '';
  const value = record.fields?.answer;
  return value && typeof value === 'object' ? String(value.label ?? '') : String(value ?? '');
}

function profileRuleExplanation(context) {
  const s = context.segment, text = PEX_TEXT[s.id];
  const who = s.customerCount + ' customers (' + s.share + '% of active customers) made ' + s.transactionCount + ' purchases in the last ' + context.windowDays + ' days. Average basket ฿' + s.averageBasket.toFixed(2) + '; their latest visit was ' + s.averageRecencyDays + ' days ago on average.';
  const o = context.offer;
  const risk = o && PEX_UNPROFITABLE.includes(o.status)
    ? 'A ' + o.discountPercent + '% discount is unlikely to pay back: ' + (o.breakEvenReturnPercent === null ? 'it is at least the gross margin.' : 'at least ' + o.breakEvenReturnPercent + '% of this group would need to return.')
    : text.risk;
  return { who, risk, verify: text.verify.slice(0, 3) };
}

// Guided usability test: tasks complete from real in-app events, in order.
const TEST_TASKS = Object.freeze([
  Object.freeze({ id: 'find-group', event: 'segment-selected', title: 'Find the customers worth winning back', hint: 'Open Customers and select the group you would act on first.' }),
  Object.freeze({ id: 'check-offer', event: 'offer-checked', title: 'Check whether an offer pays back', hint: 'In the same group, enter both return rates in the return-offer check.' }),
  Object.freeze({ id: 'explain-group', event: 'group-explained', title: 'Ask for an explanation of the group', hint: 'Use "Explain this group" and read what to verify first.' }),
  Object.freeze({ id: 'save-decision', event: 'decision-saved', title: 'Save a decision for review', hint: 'Plan with the group in Recommendations and record a Pending decision.' }),
  Object.freeze({ id: 'follow-advisor', event: 'advisor-rated', title: 'Follow the Advisor and rate its advice', hint: 'On Start, use "Act on this" in the CP Retail Advisor card, then mark whether its advice helped.' }),
]);

function testStart(now) {
  return { startedAt: now, current: 0, tasks: TEST_TASKS.map(t => ({ id: t.id, status: 'open', seconds: null })), taskStartedAt: now };
}

function testFinish(state, status, now, vote = undefined) {
  if (state.current >= TEST_TASKS.length) return state;
  const tasks = state.tasks.map((t, i) => i === state.current ? { ...t, status, seconds: Math.round((now - state.taskStartedAt) / 1000), ...(vote ? { vote } : {}) } : t);
  return { ...state, tasks, current: state.current + 1, taskStartedAt: now };
}

function testApply(state, event, now, detail = undefined) {
  const task = TEST_TASKS[state.current];
  const vote = detail?.vote === 'up' || detail?.vote === 'down' ? detail.vote : undefined;
  return task && task.event === event ? testFinish(state, 'done', now, vote) : state;
}

function testSkip(state, now) { return testFinish(state, 'skipped', now); }

function testSummary(state) {
  return { completed: state.tasks.filter(t => t.status === 'done').length, total: TEST_TASKS.length, tasks: state.tasks };
}

function testFeedbackPayload(state, ratings, comment) {
  for (const key of ['clarity', 'usefulness', 'trust']) {
    const v = ratings?.[key];
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error('Rate ' + key + ' from 1 to 5.');
  }
  const summary = testSummary(state);
  return { completed: summary.completed, tasksJson: JSON.stringify(summary.tasks), clarity: ratings.clarity, usefulness: ratings.usefulness, trust: ratings.trust, comment: String(comment ?? '').trim().slice(0, 500) };
}

// CP Retail Advisor: a rule picks this week's priority group and a starting offer check.
// The AI (profile-ai-1.0) only adds which point to stress; every number here is calculated.

const ADVISOR_VERSION = 'advisor-1.0';
const ADVISOR_ORDER = ['cooling', 'occasional', 'recent', 'regular'];
const ADVISOR_SURFACES = ['home', 'dashboard', 'group', 'decision'];
const ADVISOR_MARGIN = 30;
// Starting assumptions the manager is asked to replace with their own.
const ADVISOR_START = {
  cooling: { discountPercent: 10, baselineReturnPercent: 15, offerReturnPercent: 35 },
  occasional: { discountPercent: 5, baselineReturnPercent: 10, offerReturnPercent: 20 },
  recent: { discountPercent: 5, baselineReturnPercent: 30, offerReturnPercent: 45 },
  regular: { discountPercent: 5, baselineReturnPercent: 70, offerReturnPercent: 75 },
};
const ADVISOR_TEXT = {
  cooling: { headline: n => 'Win back your ' + n + ' Cooling regulars first.', watch: 'They used to visit often but have not come in recently; some may already shop elsewhere.' },
  occasional: { headline: n => 'Give your ' + n + ' occasional customers a reason to return.', watch: 'They visit rarely and their response to offers is unknown, so expected returns are a guess.' },
  recent: { headline: n => 'Turn your ' + n + ' recent customers into regulars.', watch: 'Most have visited only once or twice, so it is too early to tell who will become a regular.' },
  regular: { headline: n => 'Your ' + n + ' regular customers are steady. Protect them.', watch: 'They already come back often, so a discount mostly goes to visits you would get anyway.' },
};

function advisorMoney(n) { return '฿' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function advisorStep(id, offer, a) {
  const d = a.discountPercent, be = offer.breakEvenReturnPercent;
  if (id === 'regular') return 'Keep them without a discount: a ' + d + '% offer would need ' + (be === null ? 'more than the margin' : be + '% of them to return') + ', so try a non-price reward first.';
  if (offer.status === 'pays-back') return 'Check a ' + d + '% return offer. With the starting assumptions below, at least ' + be + '% of them must come back to pay for it.';
  if (offer.status === 'below-break-even') return 'Check a ' + d + '% return offer carefully: at least ' + be + '% must come back, more than the ' + a.offerReturnPercent + '% assumed.';
  return 'A ' + d + '% offer cannot pay back with these assumptions. Check a smaller offer or a non-price reason to return.';
}

function advisorPick(analysis) {
  const total = analysis?.totals?.customerCount;
  if (!Number.isInteger(total) || total <= 0) return null;
  const minimum = Math.max(3, Math.ceil(total * 0.05));
  const segment = ADVISOR_ORDER.map(id => analysis.segments.find(s => s.id === id)).find(s => s && s.customerCount >= minimum);
  if (!segment) return null;
  const a = { ...ADVISOR_START[segment.id], marginPercent: ADVISOR_MARGIN };
  const check = profileOfferCheck({ customerCount: segment.customerCount, averageBasket: segment.averageBasket, ...a, marginSource: 'Advisor starting assumption' });
  if (check.errors.length) return null;
  const r = check.result, offer = { discountPercent: a.discountPercent, breakEvenReturnPercent: r.breakEvenReturnPercent, status: r.status };
  const sales = analysis.totals.totalSpend ? Math.round(segment.totalSpend * 1000 / analysis.totals.totalSpend) / 10 : 0;
  const w = analysis.windowDays;
  const why = 'They made ' + segment.transactionCount + ' purchases (' + advisorMoney(segment.totalSpend) + ', ' + sales + '% of sales) in the last ' + w + ' days.' + (segment.id === 'cooling' ? ' None has visited in the past 7 days.' : '') + ' Their latest visit was ' + segment.averageRecencyDays + ' days ago on average.';
  return {
    version: ADVISOR_VERSION,
    segmentId: segment.id,
    segmentName: segment.name,
    customerCount: segment.customerCount,
    headline: ADVISOR_TEXT[segment.id].headline(segment.customerCount),
    why,
    watch: ADVISOR_TEXT[segment.id].watch,
    firstStep: advisorStep(segment.id, offer, a),
    assumptions: a,
    offer,
    evidence: [
      { label: 'Customers in this group', value: segment.customerCount + ' of ' + total + ' (' + segment.share + '%)' },
      { label: 'Purchases, last ' + w + ' days', value: String(segment.transactionCount) },
      { label: 'Their spend', value: advisorMoney(segment.totalSpend) + ' (' + sales + '% of sales)' },
      { label: 'Average basket', value: advisorMoney(segment.averageBasket) },
      { label: 'Days since last visit', value: segment.averageRecencyDays + ' on average' },
      { label: 'Starting assumptions', value: a.discountPercent + '% off · ' + a.baselineReturnPercent + '% return anyway · ' + a.offerReturnPercent + '% with the offer · ' + a.marginPercent + '% gross margin' },
      { label: 'Break-even return', value: r.breakEvenReturnPercent === null ? 'None: the discount is at least the margin' : r.breakEvenReturnPercent > 100 ? 'Above 100%' : r.breakEvenReturnPercent + '%' },
      { label: 'Why this group', value: 'First group with at least ' + minimum + ' customers in this order: Cooling regulars, Occasional, Recent, Regular.' },
    ],
  };
}

// Splits a grounded profile-ai answer into its sections; anything else yields empty sections.
function advisorAiLines(answer) {
  const out = { who: '', watch: '', verify: [] };
  if (typeof answer !== 'string' || !answer.startsWith('AI group explanation')) return out;
  const nl = String.fromCharCode(10);
  for (const block of answer.split(nl + nl)) {
    const lines = block.split(nl), head = lines[0], body = lines.slice(1);
    if (head === 'Who they are') out.who = body.join(' ').trim();
    else if (head === 'What to watch') out.watch = body.join(' ').trim();
    else if (head === 'Verify first') out.verify = body.map(l => l.replace(/^[0-9]+[.] /, '').trim()).filter(Boolean);
  }
  return out;
}

function advisorVotePayload({ surface, vote, segmentId, requestId, aiAnswered }) {
  if (!ADVISOR_SURFACES.includes(surface)) throw new Error('Unknown Advisor surface.');
  if (vote !== 'up' && vote !== 'down') throw new Error('Vote must be up or down.');
  return { surface, vote, segmentId: String(segmentId ?? '').slice(0, 20), requestId: String(requestId ?? '').slice(0, 40), aiAnswered: !!aiAnswered };
}

// END V2 MODULES
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
    <header className="l-nav"><div className="l-wrap l-row"><span className="l-brand"><BrandIcon size={26}/>{brand}</span><nav className="l-row l-links"><a href="#how">How it works</a><NavigationAction navigation={loginLink} className="l-link">Log in</NavigationAction><NavigationAction navigation={signupLink} className="l-pill">Start free</NavigationAction></nav></div></header>
    <section className="l-hero"><div className="l-glow" ref={glowRef} aria-hidden="true"/><div className="l-wrap">
      <p className="l-eyebrow lv">For convenience-store managers</p>
      <h1 className="lv d1">Know who to win back.<br/>Before you discount.</h1>
      <p className="l-lead lv d2">See which customers are drifting away, check whether an offer pays for itself, and save the decision — in three steps.</p>
      <div className="l-cta lv d3"><NavigationAction navigation={signupLink} className="l-pill l-big">Start free</NavigationAction><a href="#how" className="l-more">See how it works ›</a></div>
      <div className="l-glass lv d4" aria-label="Example result"><p className="l-small">Return offer · Cooling regulars · {LANDING_DISCOUNT}% off</p><p className="l-verdict">Pays back</p><p className="l-small">Break-even return rate <b>{landingBreakEven(20)}%</b> · you expect 45%</p><div className="l-bar"><i style={{width: landingBreakEven(20) + '%'}}/></div></div>
    </div></section>
    <section className="l-feat" id="how"><div className="l-wrap">
      <p className="l-eyebrow lv">Discover</p><h2 className="lv d1">Every regular, read in seconds.</h2>
      <p className="l-lead lv d2">Upload a till export with a member number on each sale. CP Retail groups customers by how recently, how often and how much they buy.</p>
      <p className="l-stat lv d3"><LandingCount to={150}/></p><p className="l-small lv d3">customers profiled in the simulated demo store</p>
      <LandingDevice label="Customer groups in the demo store"><LandingGroupsMock/></LandingDevice>
    </div></section>
    <section className="l-feat"><div className="l-wrap">
      <p className="l-eyebrow lv">Check</p><h2 className="lv d1">Discounts that pay for themselves.</h2>
      <p className="l-lead lv d2">Before an offer goes out, see the return rate it needs to break even.</p>
      <div className="l-grid lv d3">{LANDING_GROUPS.map(([name, base]) => <div key={name}><b>{name}</b><span>{landingBreakEven(base) > 100 ? 'Cannot pay back' : landingBreakEven(base) + '% must return'}</span><small>if {base}% come back anyway</small></div>)}</div>
      <p className="l-small lv d4">Example assumptions: {LANDING_DISCOUNT}% off, {LANDING_MARGIN}% gross margin. Your own figures replace them in the app.</p>
    </div></section>
    <section className="l-feat"><div className="l-wrap">
      <p className="l-eyebrow lv">Decide</p><h2 className="lv d1">AI checks your reasoning,<br/>not your numbers.</h2>
      <p className="l-lead lv d2">Every figure is calculated by rules you can read. AI only points to the assumption to verify first — and you make the call.</p>
      <LandingDevice label="A saved pending decision"><LandingDecisionMock/></LandingDevice>
      <div className="l-cta lv d3"><NavigationAction navigation={signupLink} className="l-pill l-big">Create your workspace</NavigationAction><NavigationAction navigation={loginLink} className="l-more">I already have an account ›</NavigationAction></div>
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
.cp-landing .l-links{gap:22px;font-size:17px;color:var(--mute)}
.cp-landing .l-links a:hover,.cp-landing .l-link:hover{color:var(--fg)}
.cp-landing .l-pill{display:inline-flex;align-items:center;justify-content:center;background:var(--fg);color:var(--bg)!important;border-radius:999px;padding:7px 16px;font-weight:600;font-size:17px;transition:transform .1s ease-out,background .2s}
.cp-landing .l-pill:hover{background:#fff}
.cp-landing .l-pill:active{transform:scale(.97)}
.cp-landing .l-big{padding:12px 24px;font-size:18px}
.cp-landing .l-hero{position:relative;text-align:center;padding:120px 0 96px}
.cp-landing .l-glow{position:absolute;left:50%;top:-180px;width:1100px;height:720px;margin-left:-550px;background:radial-gradient(closest-side,rgba(62,201,160,.32),transparent 70%);transform:translate3d(0,var(--p,0px),0);pointer-events:none}
.cp-landing .l-eyebrow{color:var(--mint);font-weight:600;font-size:18px;margin:0}
.cp-landing h1{position:relative;font-size:clamp(44px,8vw,88px);line-height:1.02;letter-spacing:-.045em;margin:14px 0 20px;font-weight:700;background:linear-gradient(180deg,#fff 30%,#9fd9c6);-webkit-background-clip:text;background-clip:text;color:transparent}
.cp-landing h2{font-size:clamp(34px,5.4vw,60px);line-height:1.05;letter-spacing:-.035em;margin:10px 0 16px;font-weight:700}
.cp-landing .l-lead{position:relative;color:var(--mute);font-size:clamp(17px,2vw,21px);max-width:620px;margin:0 auto}
.cp-landing .l-cta{position:relative;display:flex;flex-wrap:wrap;gap:22px;justify-content:center;align-items:center;margin-top:34px}
.cp-landing .l-more{color:var(--mint)!important;font-weight:600;font-size:18px}
.cp-landing .l-glass{position:relative;max-width:460px;margin:64px auto 0;text-align:left;border-radius:22px;padding:22px 24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 40px 90px -40px rgba(62,201,160,.45)}
.cp-landing .l-small{color:var(--mute);font-size:17px;margin:0}
.cp-landing .l-small b{color:var(--fg)}
.cp-landing .l-verdict{font-size:38px;font-weight:700;letter-spacing:-.03em;color:var(--mint);margin:4px 0}
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
.cp-landing .l-mock{display:grid;gap:12px;font-size:17px}
.cp-landing .l-mock-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cp-landing .l-mock-kpis div{background:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 8px 20px -16px rgba(33,103,93,.5)}
.cp-landing .l-mock small{display:block;color:#5b6b67;font-size:15px}
.cp-landing .l-mock-kpis b{font-size:22px;letter-spacing:-.02em}
.cp-landing .l-mock-groups{display:grid;gap:8px;background:#fff;border-radius:12px;padding:12px 14px}
.cp-landing .l-mock-groups div{display:grid;grid-template-columns:86px 1fr 28px;align-items:center;gap:10px}
.cp-landing .l-mock-groups i{display:block;height:9px;border-radius:9px;background:#cfe3db;transform-origin:left;transform:scaleX(0);transition:transform 1.2s cubic-bezier(.2,.8,.2,1) .4s}
.cp-landing .l-device.in .l-mock-groups i{transform:scaleX(1)}
.cp-landing .l-mock-groups .hot i{background:#21675d}
.cp-landing .l-mock-groups .hot span,.cp-landing .l-mock-groups .hot b{color:#21675d;font-weight:700}
.cp-landing .l-mock-note,.cp-landing .l-mock-label{margin:0;color:#5b6b67;font-size:15px}
.cp-landing .l-mock-label{font-weight:700;color:#21675d;text-transform:uppercase;letter-spacing:.04em}
.cp-landing .l-mock-head{display:flex;justify-content:space-between;align-items:center}
.cp-landing .l-tag{background:#e3f1ec;color:#21675d;border-radius:999px;padding:3px 10px;font-size:15px;font-weight:700}
.cp-landing .l-mock h3{margin:0;font-size:19px;letter-spacing:-.01em}
.cp-landing .l-mock-row{display:flex;justify-content:space-between;background:#fff;border-radius:10px;padding:8px 12px}
.cp-landing .l-mock ol{margin:0;padding-left:18px;display:grid;gap:4px;color:#223b36}
.cp-landing .l-stat{font-size:clamp(72px,12vw,128px);font-weight:700;letter-spacing:-.05em;line-height:1;margin:40px 0 8px;background:linear-gradient(90deg,#fff,var(--mint));-webkit-background-clip:text;background-clip:text;color:transparent}
.cp-landing .l-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:720px;margin:44px auto 18px}
.cp-landing .l-grid div{display:flex;flex-direction:column;gap:4px;padding:22px 12px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
.cp-landing .l-grid b{font-size:18px;color:var(--mute);font-weight:600}
.cp-landing .l-grid span{font-size:27px;font-weight:700;letter-spacing:-.02em}
.cp-landing .l-grid small{color:var(--mute);font-size:15px}
.cp-landing .l-foot{padding:28px 0 40px;color:var(--mute);font-size:16px;border-top:1px solid rgba(255,255,255,.06)}
.cp-landing .lv{opacity:0;transform:translateY(28px);transition:opacity .9s cubic-bezier(.2,.8,.2,1),transform .9s cubic-bezier(.2,.8,.2,1)}
.cp-landing .lv.in{opacity:1;transform:none}
.cp-landing .d1{transition-delay:.1s}.cp-landing .d2{transition-delay:.2s}.cp-landing .d3{transition-delay:.3s}.cp-landing .d4{transition-delay:.42s}
@media (max-width:640px){.cp-landing .l-links a[href^="#"]{display:none}.cp-landing .l-hero{padding:80px 0 64px}.cp-landing .l-feat{padding:64px 0}.cp-landing .l-mock-kpis{grid-template-columns:1fr 1fr}.cp-landing .l-device-body{padding:16px}.cp-landing .l-grid{grid-template-columns:1fr}.cp-landing .l-foot .l-row{flex-direction:column;align-items:flex-start}}
@media (prefers-reduced-motion:reduce){.cp-landing .lv{transform:none;transition:opacity .2s}.cp-landing .l-glow{transform:none}.cp-landing .l-bar i{transition:none;transform:scaleX(1)}.cp-landing .l-device.lv{transform:none}.cp-landing .l-mock-groups i{transition:none;transform:scaleX(1)}}
@media (prefers-reduced-transparency:reduce){.cp-landing .l-nav{background:#07110f;backdrop-filter:none}.cp-landing .l-glass{background:#13211e;backdrop-filter:none}}
`;
// END V2 LANDING

// BEGIN V2 WORKSPACE
const datasetSelect = q.select({name:'NAtCh', owner:'nHOGb', source:'q2Y8k', csv:'p7uW5', rows:'oPGHK', asOf:'7fsWK', windowDays:'8ucyJ', createdAt:'upHaI'});
const datasetCreateFields = q.select({name:'NAtCh', owner:'nHOGb', source:'q2Y8k', csv:'p7uW5', rows:'oPGHK', asOf:'7fsWK', windowDays:'8ucyJ'});
const feedbackCreateFields = q.select({name:'4FQWC', owner:'Vhyro', completed:'GUpre', tasksJson:'fbz4j', clarity:'BWmF4', usefulness:'Txzzg', trust:'migJX', comment:'DuL4m', appVersion:'daLng'});
const advisorVoteFields = q.select({name:'gmvg6', owner:'ETHAd', surface:'eVte2', vote:'BFDnY', segmentId:'3WoL9', requestId:'8VCpn', aiAnswered:'OGNn3', appVersion:'sd63q'});
const DATASET_SOURCE = {demo:'demo', upload:'upload'};
const DATASET_MAX_CHARS = 100000;
const APP_VERSION = cloudEnabled ? 'standalone-supabase-2026-11-10' : 'standalone-preview-2026-11-10';
const PROFILE_TABLE_ROWS = 20;

function emitTestEvent(type: string, extra?: any) { try { window.dispatchEvent(new CustomEvent('cp-test-event', {detail: {...(extra || {}), type}})); } catch {} }

// Group explanation from the cloud AI. A saved answer for the same numbers is reused, so each
// user asks once per dataset and group; auto asks as soon as the page shows the advice.
function useGroupAi(context: any, sourceId: string, auto: boolean) {
  const user = useCurrentUser();
  const email = user?.email ?? '';
  const text = context ? JSON.stringify(context) : '';
  const fingerprint = text ? opsAiFingerprint(text) : '';
  const aiReady = advisorEnabled;
  const [requested, setRequested] = useState('');
  const [polls, setPolls] = useState(0);
  const asked = useRef('');
  const history = useRecords({from: ds.aiRequests, select: opsAiSelect, where: q.and(q.text('owner').is(email), q.text('owner').isNotEmpty(), q.text('fingerprint').is(fingerprint)), orderBy: q.desc('createdAt'), count: 20, enabled: !!email && !!text});
  const createRequest = useRecordCreate({from: ds.aiRequests, fields: opsAiCreateFields});
  useEffect(() => { asked.current = ''; setRequested(''); setPolls(0); }, [text]);
  const rows = opsAiMatchingRows(history.data, email, text, fingerprint);
  const done = rows.find((r: any) => dbText(r.fields.requestStatus) === 'Completed' && !!dbText(r.fields.answer).trim());
  const pending = rows.find((r: any) => ['Queued', 'Processing'].includes(dbText(r.fields.requestStatus)));
  const failed = !done && !pending && rows.some((r: any) => dbText(r.fields.requestStatus) === 'Failed');
  const answer = done ? dbText(done.fields.answer).slice(0, 4000) : '';
  const request = async (manual = true) => {
    if (!text || answer || !aiReady || !createRequest.enabled || !email) return;
    if (pending) { void opsWakeCloud(pending.id); setRequested(text); setPolls(0); return; }
    if (asked.current === text && !(manual && failed)) return;
    asked.current = text;
    try {
      const created: any = await createRequest.mutateAsync({name: 'Group explanation ' + new Date().toISOString(), sourceId, context: text, fingerprint});
      if (created?.id) void opsWakeCloud(created.id);
      setRequested(text); setPolls(0); history.refetch?.();
    } catch { asked.current = ''; }
  };
  // Never retry a failed request automatically: each new request can use the daily allowance.
  useEffect(() => { if (auto && aiReady && text && history.status === 'success' && !history.isFetching && !answer && !failed && requested !== text) void request(false); }, [auto, aiReady, text, history.status, history.isFetching, !!answer, failed, requested]);
  useEffect(() => { if (!requested || answer || failed || polls >= 12) return; const t = setTimeout(() => { history.refetch?.(); setPolls(p => p + 1); }, 2500); return () => clearTimeout(t); }, [requested, answer, failed, polls]);
  const status = answer ? 'answered' : failed ? 'failed' : requested || pending ? (polls >= 12 ? 'slow' : 'waiting') : aiReady ? 'idle' : 'off';
  return {answer, status, request, requestId: done?.id ?? pending?.id ?? '', aiReady};
}

function AdvisorVote({surface, segmentId, requestId, aiAnswered}: any) {
  const user = useCurrentUser();
  const [vote, setVote] = useState('');
  const createVote = useRecordCreate({from: ds.advisorVotes, fields: advisorVoteFields});
  const cast = async (v: string) => {
    if (vote) return;
    setVote(v); emitTestEvent('advisor-rated', {vote: v});
    try {
      const p = advisorVotePayload({surface, vote: v, segmentId, requestId, aiAnswered});
      if (createVote.enabled && user?.email) await createVote.mutateAsync({name: 'Advisor ' + surface + ' ' + new Date().toISOString().slice(0, 16).replace('T', ' '), owner: user.email, ...p, appVersion: APP_VERSION});
    } catch {}
  };
  return <span className="v2-advisor-vote">{vote ? <span className="small muted" role="status">Thanks. Your feedback helps the team tune the Advisor.</span> : <><span className="small muted">Was this helpful?</span><button type="button" aria-label="Helpful" onClick={() => cast('up')}><ThumbsUp size={14}/></button><button type="button" aria-label="Not helpful" onClick={() => cast('down')}><ThumbsDown size={14}/></button></>}</span>;
}

const ADVISOR_STATE: any = {answered: 'AI insight added', waiting: 'AI is reading your numbers…', slow: 'AI is taking longer · showing calculated advice', failed: 'Calculated advice', idle: 'Calculated advice', off: 'Calculated advice'};

// The one look every piece of AI-assisted advice shares: identity, a plain answer, its evidence, and a vote.
function AdvisorCard({surface, ai, title, lead, evidence, action, segmentId, children, showVote = true}: any) {
  return <section className={'v2-advisor ' + (ai?.status === 'waiting' ? 'thinking' : '')} aria-label="CP Retail Advisor">
    <div className="v2-advisor-head"><span className="v2-advisor-name"><Sparkles size={14}/>CP Retail Advisor</span>{ai && <span className={'v2-advisor-state ' + ai.status} role="status">{ADVISOR_STATE[ai.status]}</span>}</div>
    {title && <h2>{title}</h2>}
    {lead && <p className="v2-advisor-lead">{lead}</p>}
    {children}
    {evidence?.length > 0 && <details className="v2-advisor-why"><summary>Based on these numbers</summary><dl>{evidence.map((e: any) => <div key={e.label}><dt>{e.label}</dt><dd>{e.value}</dd></div>)}</dl><p className="small muted">Every figure is calculated from your data. The AI only chooses which point to stress and what to verify; it never writes numbers, changes prices or approves decisions.</p></details>}
    {(action || showVote) && <div className="v2-advisor-foot">{action}{showVote && <AdvisorVote surface={surface} segmentId={segmentId} requestId={ai?.requestId} aiAnswered={!!ai?.answer}/>}</div>}
  </section>;
}

// This week's priority group, shown on Start and the dashboard. The rule answer appears at once;
// the AI line replaces "What to watch" when it arrives.
function HomeAdvisor({state, onAct, surface}: any) {
  const pick = React.useMemo(() => state.analysis ? advisorPick(state.analysis) : null, [state.analysis]);
  const context = React.useMemo(() => { try { return pick ? profileAiContext(state.analysis, pick.segmentId, pick.offer) : null; } catch { return null; } }, [pick]);
  const ai = useGroupAi(context, 'ADVISOR-' + (pick?.segmentId ?? ''), true);
  if (!pick) return null;
  const lines = advisorAiLines(ai.answer);
  return <AdvisorCard surface={surface} ai={ai} segmentId={pick.segmentId} title={pick.headline} lead={pick.why} evidence={pick.evidence}
    action={<button type="button" className="btn primary" onClick={() => { emitTestEvent('advisor-followed'); onAct(pick); }}>Act on this <ArrowRight size={14}/></button>}>
    <div className="v2-advisor-grid">
      <div><h3>What to watch{lines.watch && <span className="v2-ai-tag">AI</span>}</h3><p>{lines.watch || pick.watch}</p></div>
      <div><h3>First step</h3><p>{pick.firstStep}</p>{lines.verify[0] && <p className="small muted">Then verify: {lines.verify[0]}</p>}</div>
    </div>
  </AdvisorCard>;
}
// An Advisor deep link only applies to the Customers page it just opened.
function advisorFresh(intent: any) { return !!intent && Date.now() - intent.nonce < 5000; }
function v2Label(value: any): string { return value && typeof value === 'object' ? String(value.label ?? '') : String(value ?? ''); }
function v2Owned(items: any[], email?: string | null) { const e = (email ?? '').toLowerCase(); return items.filter(r => !!e && v2Label(r.fields.owner).toLowerCase() === e); }

// Turns a saved Datasets row (or the demo marker) into the profiling state used across the workspace.
function datasetState(record: any) {
  const f = record.fields, asOf = v2Label(f.asOf) || DEMO_STORE_AS_OF;
  const raw = v2Label(f.csv);
  const generated = [DEMO_STORE_MARKER, HISTORICAL_DEMO_STORE_MARKER].includes(raw.trim());
  const csv = generated ? makeDemoStoreCsv(asOf) : raw;
  const source = generated || f.source === DATASET_SOURCE.demo ? DATASET_SOURCE.demo : DATASET_SOURCE.upload;
  const windowDays = [30, 60, 90].includes(Number(f.windowDays)) ? Number(f.windowDays) : 30;
  const parsed = parseProfileCsv(csv);
  if (parsed.errors.length) throw Error(parsed.errors[0]);
  return {csv, asOf, windowDays: String(windowDays), source, origin: v2Label(f.name) || 'Saved data', analysis: analyzeProfiles(parsed.rows, {asOf, windowDays}), datasetId: record.id};
}
const emptyProfileState = {csv:'', asOf:DEMO_STORE_AS_OF, windowDays:'30', source:DATASET_SOURCE.upload, origin:'No data yet', analysis:null, datasetId:null};
function demoState() {
  const csv = makeDemoStoreCsv(DEMO_STORE_AS_OF);
  return {csv, asOf: DEMO_STORE_AS_OF, windowDays: '30', source: DATASET_SOURCE.demo, origin: DEMO_STORE_NAME, analysis: analyzeProfiles(parseProfileCsv(csv).rows, {asOf: DEMO_STORE_AS_OF, windowDays: 30}), datasetId: null};
}

function DatasetPanel({state, datasets, onDemo, onSave, onPick, busy, canSave}: any) {
  const rows = state.analysis?.coverage?.inputRows;
  const unsaved = !!state.analysis && !state.datasetId;
  const summary = state.analysis
    ? rows.toLocaleString('en-US') + ' transactions · analysis date ' + state.asOf + (state.datasetId ? ' · saved ' + savedLocation : ' · not saved yet')
    : state.csv && !state.datasetId ? 'Not saved yet. Analyze transactions to save.' : 'Open the simulated demo store, or paste or upload a synthetic CSV below.';
  return <section className="v2-data" aria-label="Your data">
    <div><p className="eyebrow">Your data</p><h2>{state.csv ? state.origin : 'No data loaded yet'}</h2><p className="small muted">{summary}</p></div>
    <div className="row v2-data-actions">
      {datasets.length > 1 && <label className="v2-select">Saved data<select className="input" value={state.datasetId ?? ''} onChange={e => onPick(e.target.value)}><option value="" disabled>Choose…</option>{datasets.map((d: any) => <option key={d.id} value={d.id}>{v2Label(d.fields.name)}</option>)}</select></label>}
      <button type="button" className="btn" disabled={busy} onClick={onDemo}><Store size={14}/>Open demo store</button>
      {unsaved && <button type="button" className="btn primary" disabled={busy || !canSave} onClick={onSave}>{busy ? 'Saving…' : saveDataLabel}</button>}
    </div>
    {unsaved && state.csv.length > DATASET_MAX_CHARS && <p className="small muted">This file is larger than {DATASET_MAX_CHARS.toLocaleString('en-US')} characters, so it is analysed in this session only.</p>}
  </section>;
}

function StartHome({user, datasets, profileState, go, onDemo, busy, offerChecked, onAct}: any) {
  const email = user?.email ?? '';
  const scenariosQ = useRecords({from: ds.scenarios, select: savedScenarioSelect, where: q.text('owner').is(email), count: 100, enabled: !!email});
  const decisionsQ = useRecords({from: ds.decisions, select: decisionSelect, where: q.text('owner').is(email), count: 100, enabled: !!email});
  const scenarios = v2Owned(scenariosQ.data?.pages.flatMap(p => p.items) ?? [], email);
  const decisions = v2Owned(decisionsQ.data?.pages.flatMap(p => p.items) ?? [], email);
  const pending = decisions.filter(d => v2Label(d.fields.status) === 'Pending');
  const done = [datasets.length > 0 || !!profileState.datasetId, offerChecked || scenarios.some(s => v2Label(s.fields.notes).includes('"customerProfile":{"version"')), decisions.length > 0];
  const next = done.indexOf(false);
  const name = user?.firstName || user?.fullName?.split(' ')[0] || 'there';
  const steps = [
    {title: 'Bring in your sales', text: 'Open the demo store with 150 simulated customers, or upload a till export with a member number on each sale.', action: <div className="row"><button type="button" className="btn primary" disabled={busy} onClick={async () => { await onDemo(); go('profiles'); }}>Open demo store <ArrowRight size={14}/></button><button type="button" className="btn" onClick={() => go('profiles')}>Upload CSV</button></div>},
    {title: 'Find who to act on', text: 'Pick the customer group worth winning back and check whether an offer pays back.', action: <button type="button" className="btn primary" onClick={() => go('profiles')}>Open customers <ArrowRight size={14}/></button>},
    {title: 'Plan it and save the decision', text: 'Compare actions, save a plan and record your decision for review.', action: <button type="button" className="btn primary" onClick={() => go('recommendations')}>Compare actions <ArrowRight size={14}/></button>},
  ];
  return <div className="stack v2-start">
    <header className="v2-hello" style={{position:'relative'}}><div aria-hidden="true" className="v2-giftbox" style={{position:'absolute',top:0,right:0,width:180,height:102,overflow:'hidden',pointerEvents:'none'}}><img src="/studio-media/6ba7b6b6-56e4-48c7-8bf3-b057858ba55e.png" alt="" style={{position:'absolute',width:951.6,height:595.2,left:-660,top:-78,maxWidth:'none'}} /></div><p className="eyebrow">{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {name}</p><h1>{next === -1 ? 'Your decisions, in one place.' : done.some(Boolean) ? 'Pick up where you left off.' : 'Your first decision takes three steps.'}</h1><p className="muted">{next === -1 ? 'Review what is waiting, or start a new comparison.' : 'Open the demo, choose a group, then compare and save your decision.'}</p></header>
    {profileState.analysis && <HomeAdvisor state={profileState} onAct={onAct} surface="home"/>}
    {pending.length > 0 && <section className="v2-pending" aria-label="Waiting for your decision"><div className="row between"><h2>Waiting for your decision</h2><button type="button" className="btn" onClick={() => go('my-decisions')}>All decisions <ArrowRight size={14}/></button></div>{pending.slice(0, 3).map(d => <button type="button" key={d.id} className="v2-pending-row" onClick={() => go('my-decisions')}><span>{v2Label(d.fields.name)}</span><Pill>Pending</Pill></button>)}</section>}
    <ol className="v2-steps">{steps.map((s, i) => <li key={s.title} className={'v2-step ' + (done[i] ? 'done' : i === next ? 'current' : 'locked')} style={{animationDelay: (i * 90) + 'ms'}}>
      <span className="v2-num" aria-hidden="true">{done[i] ? <CheckCircle2 size={18}/> : i + 1}</span>
      <div><h3>{s.title}</h3><p className="small muted">{done[i] ? 'Done.' : s.text}</p></div>
      {i === next && s.action}
    </li>)}</ol>
    <div className="v2-progress" aria-label={done.filter(Boolean).length + ' of 3 steps complete'}><i style={{transform: 'scaleX(' + done.filter(Boolean).length / 3 + ')'}}/></div>
    <div className="row v2-quick"><button type="button" className="btn" onClick={() => go('dashboard')}><LayoutDashboard size={14}/>Dashboard</button><button type="button" className="btn" onClick={() => go('my-scenarios')}><Layers size={14}/>Saved scenarios</button><button type="button" className="btn" onClick={() => go('test')}><ClipboardCheck size={14}/>Tasks &amp; feedback</button></div>
  </div>;
}

function LiveDashboard({state, go, pendingCount, onAct}: any) {
  const metrics = React.useMemo(() => {
    if (!state.analysis) return null;
    const parsed = parseProfileCsv(state.csv);
    return parsed.errors.length ? null : dashboardMetrics(parsed.rows, {asOf: state.asOf, windowDays: Number(state.windowDays)});
  }, [state.analysis, state.csv, state.asOf, state.windowDays]);
  if (!metrics) return <div className="stack v2-empty"><h1>No sales data yet</h1><p className="muted">The dashboard is calculated from your own transactions. Open the demo store or upload a CSV to see it.</p><div className="row"><button type="button" className="btn primary" onClick={() => go('start')}>Go to Start <ArrowRight size={14}/></button></div></div>;
  const t = metrics.totals, maxWeek = Math.max(1, ...metrics.weekly.map((w: any) => w.sales));
  const change = metrics.prev7.sales ? Math.round((metrics.last7.sales - metrics.prev7.sales) * 1000 / metrics.prev7.sales) / 10 : null;
  return <div className="stack v2-dash">
    <div className="page-head"><div className="stack" style={{gap: 7}}><div className="row"><h1>Store dashboard</h1><Pill>{state.origin}</Pill></div><p>Calculated from {t.transactionCount.toLocaleString('en-US')} transactions between {state.analysis.coverage.startDate} and {state.asOf}. Figures update when your data changes.</p></div><div className="stack" style={{alignItems:'flex-end',gap:12}}><div aria-hidden="true" className="v2-spectacles" style={{width:160,height:80,overflow:'hidden',pointerEvents:'none',position:'relative'}}><img src="/studio-media/a411e786-f50c-4421-b7ea-fa017b955fc9.png" alt="" style={{position:'absolute',width:1015.68,height:634.24,left:-614.4,top:-76.8,maxWidth:'none'}} /></div><button type="button" className="btn primary" onClick={() => go('profiles')}>See customer groups <ArrowRight size={14}/></button></div></div>
    <HomeAdvisor state={state} onAct={onAct} surface="dashboard"/>
    <div className="grid-4 metrics"><Metric label="Recorded sales" value={money(t.totalSpend)} detail={change === null ? 'Last ' + state.windowDays + ' days' : (change >= 0 ? '+' : '') + change + '% last 7 days vs the 7 before'}/><Metric label="Customers" value={t.customerCount.toLocaleString('en-US')} detail="With a member number" icon={Users}/><Metric label="Repeat customers" value={t.repeatCustomerShare + '%'} detail="Visited at least twice" icon={RotateCcw}/><Metric label="Average basket" value={money(t.averageBasket)} detail={pendingCount + ' decision' + (pendingCount === 1 ? '' : 's') + ' waiting'} icon={ShoppingCart}/></div>
    <div className="grid-2">
      <section className="panel stack"><h2>Weekly sales</h2><p className="small muted">7-day periods ending {state.asOf}. The oldest bar may be a partial week.</p>
        <div className="v2-bars" role="img" aria-label={'Weekly sales: ' + metrics.weekly.map((w: any) => w.label + ' ' + money(w.sales)).join('; ')}>{metrics.weekly.map((w: any, i: number) => <div key={w.label} className="v2-bar"><span className="v2-bar-val">{money(w.sales)}</span><i style={{height: Math.max(3, w.sales / maxWeek * 100) + '%', animationDelay: (i * 70) + 'ms'}}/><span className="v2-bar-lab">{w.label.split(' – ')[1]}</span></div>)}</div>
      </section>
      <section className="panel stack"><h2>{metrics.categories ? 'Sales by category' : 'Customer groups'}</h2><p className="small muted">{metrics.categories ? 'Share of recorded sales in this window.' : 'Add a category column to your CSV to see category sales.'}</p>
        <div className="v2-hbars">{(metrics.categories ?? metrics.segments.map((s: any) => ({category: s.name, share: s.share, sales: null}))).map((c: any, i: number) => <div key={c.category} className="v2-hbar"><span>{c.category}</span><div><i style={{transform: 'scaleX(' + c.share / 100 + ')', animationDelay: (i * 70) + 'ms'}}/></div><b>{c.share}%</b></div>)}</div>
      </section>
    </div>
    {metrics.categories && <section className="panel stack"><div className="row between"><h2>Customer groups</h2><button type="button" className="btn" onClick={() => go('profiles')}>Open customers <ArrowRight size={14}/></button></div><div className="v2-stack" role="img" aria-label={metrics.segments.map((s: any) => s.name + ' ' + s.customerCount).join('; ')}>{metrics.segments.map((s: any) => s.customerCount > 0 && <i key={s.id} className={'seg-' + s.id} style={{flexGrow: s.customerCount}} title={s.name + ': ' + s.customerCount}/>)}</div><div className="row v2-legend">{metrics.segments.map((s: any) => <span key={s.id}><i className={'seg-' + s.id}/>{s.name} · {s.customerCount}</span>)}</div></section>}
  </div>;
}

function GroupExplain({analysis, segmentId, offer}: any) {
  const [shown, setShown] = useState(false);
  useEffect(() => { setShown(false); }, [segmentId, offer?.status, offer?.breakEvenReturnPercent, offer?.inputs?.discountPercent]);
  const context = React.useMemo(() => {
    if (!analysis || !segmentId) return null;
    try { return profileAiContext(analysis, segmentId, offer ? {discountPercent: offer.inputs.discountPercent, breakEvenReturnPercent: offer.breakEvenReturnPercent, status: offer.status} : null); } catch { return null; }
  }, [analysis, segmentId, offer?.status, offer?.breakEvenReturnPercent, offer?.inputs?.discountPercent]);
  const ai = useGroupAi(context, 'PROFILE-' + (segmentId ?? ''), shown);
  if (!context) return null;
  const rules = profileRuleExplanation(context);
  const lines = advisorAiLines(ai.answer);
  const explain = () => { setShown(true); emitTestEvent('group-explained'); void ai.request(); };
  const c = context.segment, o = context.offer;
  return <AdvisorCard surface="group" ai={shown ? ai : null} segmentId={segmentId} showVote={shown}
    title="Explain this group" lead="Who these customers are, the main risk, and what to verify before acting."
    evidence={shown ? [{label: 'Group', value: c.customerCount + ' customers · ' + c.share + '% of active customers'}, {label: 'Purchases', value: c.transactionCount + ' in ' + context.windowDays + ' days'}, {label: 'Average basket', value: '฿' + c.averageBasket.toFixed(2)}, {label: 'Days since last visit', value: c.averageRecencyDays + ' on average'}, {label: 'Offer check', value: o ? o.discountPercent + '% off · ' + (o.breakEvenReturnPercent === null ? 'no break-even' : 'break-even ' + o.breakEvenReturnPercent + '%') : 'Not run yet'}] : null}
    action={!shown || !ai.answer ? <button type="button" className="btn primary" onClick={explain}><Sparkles size={14}/>{shown ? 'Explain again' : 'Explain this group'}</button> : null}>
    {shown && <div className="v2-explain-body" role="status">
      <h3>Who they are</h3><p>{lines.who || rules.who}</p>
      <h3>Main risk{lines.watch && <span className="v2-ai-tag">AI</span>}</h3><p>{lines.watch || rules.risk}</p>
      <h3>Verify first{lines.verify.length > 0 && <span className="v2-ai-tag">AI</span>}</h3><ol>{(lines.verify.length ? lines.verify : rules.verify).map((v: string) => <li key={v}>{v}</li>)}</ol>
    </div>}
  </AdvisorCard>;
}

function TestBar({state, onSkip, go}: any) {
  if (!state || state.current >= TEST_TASKS.length) return null;
  const task = TEST_TASKS[state.current];
  return <div className="v2-testbar" role="status"><span className="v2-testbar-step">Task {state.current + 1} of {TEST_TASKS.length}</span><strong>{task.title}</strong><span className="small">{task.hint}</span><button type="button" className="btn" onClick={() => go('test')}>Details</button><button type="button" className="btn" onClick={onSkip}>Skip</button></div>;
}

function TestMode({state, onStart, onSkip, onReset, go}: any) {
  const user = useCurrentUser();
  const [ratings, setRatings] = useState<any>({});
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const createFeedback = useRecordCreate({from: ds.feedback, fields: feedbackCreateFields});
  const finished = state && state.current >= TEST_TASKS.length;
  const submit = async () => {
    setError('');
    try {
      const p = testFeedbackPayload(state, ratings, comment);
      if (!createFeedback.enabled || !user?.email) throw Error('Sign in to send feedback.');
      await createFeedback.mutateAsync({name: 'Test ' + new Date().toISOString().slice(0, 16).replace('T', ' '), owner: user.email, completed: p.completed, tasksJson: p.tasksJson, clarity: p.clarity, usefulness: p.usefulness, trust: p.trust, comment: p.comment, appVersion: APP_VERSION});
      setSent(true);
    } catch (e: any) { setError(e?.message || 'Feedback could not be saved. Try again.'); }
  };
  return <div className="stack v2-test">
    <div className="page-head"><div className="stack" style={{gap: 7}}><h1>Tasks & feedback</h1><p>Five short tasks, about six minutes. The app notices when you finish each one; you can skip any task. Your answers help the team improve CP Retail.</p></div></div>
    {!state && <section className="panel stack"><h2>Before you start</h2><p className="muted">Work as if you manage a convenience store. Use the demo store if you have no data. Nothing you do changes real prices or orders.</p><div className="row"><button type="button" className="btn primary" onClick={onStart}>Start the test <ArrowRight size={14}/></button></div></section>}
    {state && <ol className="v2-steps">{TEST_TASKS.map((t: any, i: number) => { const r = state.tasks[i]; return <li key={t.id} className={'v2-step ' + (r.status !== 'open' ? 'done' : i === state.current ? 'current' : 'locked')}><span className="v2-num" aria-hidden="true">{r.status === 'done' ? <CheckCircle2 size={18}/> : i + 1}</span><div><h3>{t.title}</h3><p className="small muted">{r.status === 'done' ? 'Done in ' + r.seconds + ' s' : r.status === 'skipped' ? 'Skipped' : t.hint}</p></div>{i === state.current && <div className="row"><button type="button" className="btn primary" onClick={() => go(t.id === 'follow-advisor' ? 'start' : 'profiles')}>Go <ArrowRight size={14}/></button><button type="button" className="btn" onClick={onSkip}>Skip</button></div>}</li>; })}</ol>}
    {finished && !sent && <section className="panel stack"><h2>How was it?</h2>{[['clarity', 'How clear was the app?'], ['usefulness', 'How useful would this be in a store?'], ['trust', 'How much do you trust the results?']].map(([key, label]) => <div key={key} className="v2-rate"><span>{label}</span><div className="row" role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} role="radio" aria-checked={ratings[key] === n} className={'btn ' + (ratings[key] === n ? 'primary' : '')} onClick={() => setRatings((r: any) => ({...r, [key]: n}))}>{n}</button>)}</div></div>)}
      <label>One thing we should change (optional)<textarea className="input" maxLength={500} value={comment} onChange={e => setComment(e.target.value)}/></label>
      {error && <p className="small" role="alert" style={{color: '#b42318'}}>{error}</p>}
      <div className="row"><button type="button" className="btn primary" disabled={createFeedback.status === 'pending'} onClick={submit}>{createFeedback.status === 'pending' ? 'Sending…' : 'Send feedback'}</button></div></section>}
    {sent && <section className="panel stack"><h2>Thank you</h2><p className="muted">Your results were saved. You can keep exploring the app.</p><div className="row"><button type="button" className="btn" onClick={() => { onReset(); setSent(false); setRatings({}); setComment(''); }}>Run the test again</button><button type="button" className="btn primary" onClick={() => go('start')}>Back to Start</button></div></section>}
  </div>;
}
// END V2 WORKSPACE

export default function Block(){
  const {language}=React.useContext(LanguageContext);
  const brand=useTextSetting({name:'retail-brand',label:'Brand name',initialValue:'CP Retail'});
  const loginLink=useNavigationSetting({name:'real-login',label:'Workspace sign-in page',initialValue:{destination:'/login',openIn:'SELF'}});
  const user=useCurrentUser();
  const [listVisit,setListVisit]=useState(0);
  const [{view,recordId},setLocation]=useState(()=>workspaceLocation(window.location));
  const [opsSourceId,setOpsSourceId]=useState('');
  const [opsProfile,setOpsProfile]=useState<any>(null);
  const [scenarioDraft,setScenarioDraft]=useState<any>(null);
  const [profileState,setProfileState]=useState<any>(emptyProfileState);
  const workspaceRootRef=useRef<HTMLDivElement|null>(null);
  const workspaceMainRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{workspaceRootRef.current?.scrollIntoView({block:'start',behavior:'auto'});workspaceMainRef.current?.focus({preventScroll:true});},[view,recordId,listVisit]);
  const [role,setRole]=useState('Store Manager');
  const [menu,setMenu]=useState(false);
  const [selected,setSelected]=useState(5);
  const [note,setNote]=useState('Trial 5% only after checking stock. No prices or replenishment orders are sent to live systems.');
  const [saved,setSaved]=useState<any[]>([]);
  const [decisionId,setDecisionId]=useState('SAMPLE-001');
  const [decisionQuery,setDecisionQuery]=useState('');
  const [message,setMessage]=useState('');
  useEffect(()=>{
    const restoreLocation=()=>{
      setLocation(workspaceLocation(window.location));
      setMenu(false);
      setMessage('');
    };
    window.addEventListener('popstate',restoreLocation);
    return ()=>window.removeEventListener('popstate',restoreLocation);
  },[]);
  const go=(next:string,nextRecordId:string|null=null)=>{
    const current=workspaceLocation(window.location);
    if(current.view!==next||current.recordId!==nextRecordId){
      window.history.pushState(null,'',workspaceHref(next,nextRecordId));
      setLocation(workspaceLocation(window.location));
    }
    if(next==='my-scenarios'&&!nextRecordId)setListVisit(n=>n+1);
    setMenu(false);
    setMessage('');
  };
  const requestRecommendations=(id:string)=>{setOpsProfile(null);setOpsSourceId(id);go('recommendations');};
  const planForProfile=(id:string,snapshot:any)=>{setOpsProfile(snapshot);setOpsSourceId(id);go('recommendations');};
  const createStartingScenario=(snapshot:any=null)=>{
    setOpsProfile(snapshot);
    setScenarioDraft({name:translate('Snack + drink trial', language),product:'',price:'95',cost:'62.51',discount:String(snapshot?.offerCheck?.inputs.discountPercent??5),units:'1000',stock:'1350',period:'30',group:snapshot?translate(snapshot.segmentName,language):'',notes:translate('Demo assumptions — review before comparing.', language)});
    go('my-scenarios');
  };
  const viewSavedScenario=(id:string)=>go('my-scenarios',id);
  const launch=(r:string)=>{setRole(r);go('upload');};
// v2: saved datasets, demo store, pending count and test mode live at the Block level so every view shares them.
  const datasetsQ=useRecords({from:ds.datasets,select:datasetSelect,where:q.text('owner').is(user?.email??''),count:50,enabled:!!user?.email});
  const datasets=v2Owned(datasetsQ.data?.pages.flatMap((p:any)=>p.items)??[],user?.email).sort((a:any,b:any)=>v2Label(b.fields.createdAt).localeCompare(v2Label(a.fields.createdAt)));
  const createDataset=useRecordCreate({from:ds.datasets,fields:datasetCreateFields});
  const [dataBusy,setDataBusy]=useState(false);
  const decisionsAll=useRecords({from:ds.decisions,select:decisionSelect,where:q.text('owner').is(user?.email??''),count:100,enabled:!!user?.email});
  const pendingCount=v2Owned(decisionsAll.data?.pages.flatMap((p:any)=>p.items)??[],user?.email).filter((d:any)=>v2Label(d.fields.status)==='Pending').length;
  const [testState,setTestState]=useState<any>(null);
  const testing=!!testState;
  const [offerChecked,setOfferChecked]=useState(false);
  useEffect(()=>{const h=(e:any)=>{if(e.detail?.type==='offer-checked')setOfferChecked(true);};window.addEventListener('cp-test-event',h);return ()=>window.removeEventListener('cp-test-event',h);},[]);
  useEffect(()=>{if(!testing)return;const h=(e:any)=>setTestState((s:any)=>s&&testApply(s,e.detail?.type,Date.now(),e.detail));window.addEventListener('cp-test-event',h);return ()=>window.removeEventListener('cp-test-event',h);},[testing]);
  useEffect(()=>{
    if (profileState !== emptyProfileState || !datasets.length) return;
    try {
      const saved = datasetState(datasets[0]);
      setProfileState((current:any) => current === emptyProfileState ? saved : current);
    } catch {}
  },[datasets.length]);
  const pickDataset=(id:string)=>{const r=datasets.find((d:any)=>d.id===id);if(!r)return;try{setProfileState(datasetState(r));setOpsProfile(null);}catch(e:any){setMessage(e?.message||'That saved data could not be read.');}};
  const openDemo=async()=>{
    const existing=datasets.find((d:any)=>v2Label(d.fields.csv).trim()===DEMO_STORE_MARKER);
    if(existing){pickDataset(existing.id);return;}
    const st=demoState();setProfileState(st);setOpsProfile(null);
    if(!createDataset.enabled||!user?.email)return;
    setDataBusy(true);
    try {
      const record = await createDataset.mutateAsync({name:DEMO_STORE_NAME,owner:user.email,source:DATASET_SOURCE.demo,csv:DEMO_STORE_MARKER,rows:st.analysis.coverage.inputRows,asOf:st.asOf,windowDays:Number(st.windowDays)});
      const saved = datasetState(record);
      setProfileState((current:any) => current === st ? saved : current);
      datasetsQ.refetch?.();
    }
    catch{setMessage('The demo store is open, but it could not be saved ' + savedLocation + '. It stays open until you reload.');}
    finally{setDataBusy(false);}
  };
  const saveDataset=async()=>{
    const st=profileState;
    if(!st.analysis||st.datasetId||st.csv.length>DATASET_MAX_CHARS||!createDataset.enabled||!user?.email)return;
    setDataBusy(true);
    try {
      const demo = st.source === DATASET_SOURCE.demo || isDemoCsv(st.csv, st.asOf);
      const source = demo ? DATASET_SOURCE.demo : DATASET_SOURCE.upload;
      const rows = st.analysis.coverage.inputRows;
      const name = `${demo ? DEMO_STORE_NAME : 'Upload'} · ${st.asOf} · ${st.windowDays} days (${rows} rows)`;
      const record = await createDataset.mutateAsync({name,owner:user.email,source,csv:st.csv,rows,asOf:st.asOf,windowDays:Number(st.windowDays)});
      // A save can finish after the user edits, re-analyzes, or opens another dataset.
      setProfileState((current:any) => current === st ? {...current, origin:name, source, datasetId:record.id} : current);
      datasetsQ.refetch?.();
    }
    catch(e:any){setMessage('Your data could not be saved ('+(e?.message||'try a smaller file')+'). The analysis stays open in this session.');}
    finally{setDataBusy(false);}
  };
  // The block renders inside its own root, so look up the target from the workspace root rather than document.
  // Advisor deep link: Customers opens on the advised group with the offer check filled in.
  const [advisorIntent,setAdvisorIntent]=useState<any>(null);
  const actOnAdvice=(pick:any)=>{setAdvisorIntent({...pick.assumptions,segmentId:pick.segmentId,nonce:Date.now()});openOffer();};
  const openOffer=()=>{go('profiles');setTimeout(()=>{const root=workspaceRootRef.current;(root?.querySelector('#cp-offer')||root?.querySelector('.profile-groups')||root?.querySelector('.v2-data'))?.scrollIntoView({behavior:'smooth',block:'start'});},450);};
  const cases=[0,5,10].map(d=>{const units=d===0?1000:d===5?1250:1400;const price=95*(1-d/100);const sales=price*units;const profit=(price-62.51)*units;return {d,units,price,sales,profit,margin:profit/sales*100,remaining:1350-units,ratio:units/1964*100};});
  const chosen=cases.find(c=>c.d===selected)!;
  const decisions=[...saved,...seeds];
  const current=decisions.find(d=>d.id===decisionId)||seeds[0];
  const saveSample=()=>{if(!note.trim()){setMessage('Add a manager rationale before saving a sample decision.');return;}const existing=saved.find(d=>d.discount===selected&&d.note===note.trim());if(existing){setDecisionId(existing.id);go('decisions');setMessage('This sample is already in the session log.');return;}const id='SESSION-'+String(saved.length+1).padStart(3,'0');const d={id,name:`Snack + drink deal — ${selected}% discount`,category:'Snacks & drinks',modeled:true,discount:selected,units:chosen.units,price:95,cost:62.51,stock:1350,note:note.trim(),status:'Pending sample review'};setSaved([d,...saved]);setDecisionId(id);go('decisions');setMessage('Sample decision added to this session only. Use My Scenarios for the existing database workflow.');};
  const PageHead=({title,subtitle,children}:any)=><div className="page-head"><div className="stack" style={{gap:7}}><div className="row"><h1>{title}</h1><Pill>Simulated demo data</Pill></div><p>{subtitle}</p></div><div className="row">{children}</div></div>;
  const Next=({to,children,secondary=false}:any)=><button className={'btn '+(secondary?'':'primary')} onClick={()=>go(to)}>{children}<ArrowRight size={15}/></button>;
  const workflowLink=<button className="btn" onClick={()=>go('my-scenarios')}>Saved scenarios <ArrowRight size={14}/></button>;

  const dashboard=<>
    <PageHead title="Commercial Performance Dashboard" subtitle="Sales, basket trends and stock alerts help store managers decide what to check next. Figures are simulated."><button className="btn" onClick={()=>download('sample-weekly-sales.csv','Period,Sales THB\nDays 1-7,36400\nDays 8-14,37800\nDays 15-21,39200\nDays 22-28,37800\nDays 29-30,10830\n')}><Download size={14}/>Export sample CSV</button></PageHead>
    <div className="notice"><span className="iconbox"><ShoppingCart/></span><div style={{flex:1}}><Pill>High impact opportunity</Pill><h3 style={{marginTop:6}}>Snack + drink meal-deal trial</h3><p className="small" style={{marginTop:5}}>Compare three discounts. Review gross profit and available stock before choosing.</p></div><div className="row"><Next to="profiles" secondary>Explore customer groups</Next><Next to="scenarios">Compare meal-deal options</Next></div></div>
    <div className="grid-4 metrics"><Metric label="Sales (sample)" value="฿162.0k" detail="+8.0% · 30-day sample · Target ฿150k"/><Metric label="Gross margin" value="37.6%" detail="+1.2 pts vs. target · Sample gross profit ฿61k" icon={Percent}/><Metric label="Average basket value" value="฿82.50" detail="1,964 sample baskets · 3.4 items / basket" icon={ShoppingCart}/><Metric label="Sell-through rate" value="81.4%" detail="4 sample stock alerts · Packaged snacks low" icon={Package}/></div>
    <div className="grid-2"><section className="stack"><h2>30-day cumulative sales</h2><p className="muted small">Sample total: ฿162,030 vs. target: ฿150,000.</p><div className="row small"><Pill>Sales — teal</Pill><Pill tone="">Target — dashed blue</Pill></div><svg className="chart" viewBox="0 0 560 260" role="img" aria-label="Cumulative simulated sales rise to 162030 baht at day 30; target 150000 baht"><g fill="none" stroke="#dce5ec">{[30,85,140,195].map(y=><path key={y} d={`M52 ${y}H542`}/>)}</g><g fill="#64717d" fontSize="11"><text x="5" y="34">฿180k</text><text x="5" y="89">฿120k</text><text x="9" y="144">฿60k</text><text x="15" y="199">฿0k</text>{[0,5,10,15,20,25,30].map((d,i)=><text key={d} x={45+i*80} y="235">Day {d}</text>)}</g><path d="M52 195L166.333 161.633L280.667 126.983L395 91.05L509.333 56.4L542 46.4725" fill="none" stroke="#008d96" strokeWidth="2.5"/><path d="M52 195L542 57.5" fill="none" stroke="#004889" strokeWidth="2" strokeDasharray="5 4"/></svg></section><section><h2>Sales by category</h2><p className="muted small" style={{marginTop:16}}>Five sample categories; total ฿162,030.</p><div className="categories">{[['Ready-to-Eat',48500],['Beverages',38500],['Snacks',31800],['Essentials',25000],['Dairy',18230]].map(([n,v])=><div key={n} className="bar-row"><span>{n}</span><div className="bar" style={{width:Math.max(25,Number(v)/48500*100)+'%'}}>฿{Number(v).toLocaleString()}</div></div>)}</div></section></div>
    <div className="grid-2"><section className="stack"><h2>Demo Store A — weekly sales</h2><p className="small muted">Four weeks plus two days; all figures are simulated.</p><div className="table-wrap"><table><thead><tr><th>Period</th><th>Store</th><th>Sales</th><th>Margin</th><th>Health</th></tr></thead><tbody>{[['Days 1–7',36400],['Days 8–14',37800],['Days 15–21',39200],['Days 22–28',37800],['Days 29–30',10830]].map(([p,s])=><tr key={p}><td>{p}</td><td>Demo A</td><td>{money(Number(s))}</td><td>37.6%</td><td><Pill>Sample</Pill></td></tr>)}</tbody></table></div></section><section className="stack"><h2>Anomaly & Action Feed</h2><p className="small muted">Sample alerts for the store manager to review.</p><div className="notice warn"><AlertTriangle size={20}/><div><h3>Low stock: packaged snacks</h3><p className="small muted" style={{margin:'7px 0 12px'}}>Review snack stock before the afternoon rush. Alert values are illustrative.</p><Next to="scenarios" secondary>Review stock assumptions</Next></div></div><div className="panel"><h3>RFM Customer Matrix</h3><p className="small muted" style={{margin:'7px 0 12px'}}>Explore three rule-based shopper groups.</p><Next to="profiles" secondary>View RFM</Next></div></section></div>
  </>;

  const updateProfileState=(next:any)=>{
    setProfileState((old:any)=>{
      const state = typeof next === 'function' ? next(old) : next;
      const inputsChanged = state.csv !== old.csv || state.asOf !== old.asOf || state.windowDays !== old.windowDays;
      return inputsChanged ? {...state, datasetId:null} : state;
    });
    setOpsProfile(null);
  };
  const profiles=<CustomerProfiling dataPanel={<DatasetPanel state={profileState} datasets={datasets} onDemo={openDemo} onSave={saveDataset} onPick={pickDataset} busy={dataBusy} canSave={createDataset.enabled&&profileState.csv.length<=DATASET_MAX_CHARS}/>} onSample={openDemo} intent={advisorIntent} state={profileState} setState={updateProfileState} onPlan={planForProfile} onCreate={createStartingScenario} onProfiles={()=>go('profiles')}/>;
  const upload=<CustomerProfiling dataPanel={<DatasetPanel state={profileState} datasets={datasets} onDemo={openDemo} onSave={saveDataset} onPick={pickDataset} busy={dataBusy} canSave={createDataset.enabled&&profileState.csv.length<=DATASET_MAX_CHARS}/>} onSample={openDemo} intent={advisorIntent} state={profileState} setState={updateProfileState} onPlan={planForProfile} onCreate={createStartingScenario} onProfiles={()=>go('profiles')} mode="upload"/>;

  const scenarios=<>
    <PageHead title="Promotion scenarios" subtitle="Compare the original snack + drink example using explicit demand, cost and stock assumptions. All values are simulated."><button className="btn" onClick={()=>{setSelected(5);setNote('Trial 5% only after checking stock. No prices or replenishment orders are sent to live systems.');setMessage('Original 5% sample restored.');}}><RotateCcw size={14}/>Reset</button><button className="btn" onClick={()=>download('sample-promotion-scenarios.csv','Discount %,Assumed units,Price THB,Sales THB,Gross profit THB,Remaining stock\n'+cases.map(c=>[c.d,c.units,c.price.toFixed(2),c.sales.toFixed(2),c.profit.toFixed(2),c.remaining].join(',')).join('\n'))}><Download size={14}/>Sample CSV</button><button className="btn primary" onClick={saveSample}><BookmarkCheck size={15}/>Save sample decision</button></PageHead>
    <div className="notice warn"><ShieldCheck size={24}/><div><strong>Example suggestion; manager review required</strong><p className="small muted" style={{marginTop:5}}>Demand is assumed, not predicted by AI. No price, stock or replenishment changes are sent to live systems.</p></div></div>
    <div className="row between"><h3>1. Offer ideas</h3><span className="small muted">3 ideas · 1 modeled · Currency: Thai baht (THB)</span></div><div className="grid-3">{[{n:'Snack + drink deal',icon:'S+D',price:95,items:'Packaged crisps (40g) · Bottled drink (500ml)',foot:'+฿2,185 gross profit at 5%',cohort:'Lunch Regulars (426)'},{n:'Coffee + sandwich',icon:'C+S',price:85,items:'Chicken sandwich · Bottled water · Ready-to-drink coffee',foot:'Alternative offer · Not simulated',cohort:'Value-focused (512)'},{n:'Cold drink + snack',icon:'D+S',price:76,items:'Sparkling water · Snack multipack · Fruit cup',foot:'Alternative offer · Not simulated',cohort:'Occasional Shoppers (302)'}].map((o,i)=><div className={'offer '+(i===0?'selected':'')} key={o.n}><div className="row"><span className="iconbox"><strong>{o.icon}</strong></span><div><p className="eyebrow">{i===0?'Sample offer under review':'Alternative offer'}</p><h3>{o.n}</h3><span className="small">{money(o.price)} · Base price</span></div></div><div className="panel soft small"><span className="muted">Example items:</span><p style={{marginTop:6}}>{o.items}</p></div><p className="small positive">{o.foot}</p><p className="small muted">{o.cohort}</p></div>)}</div>
    <div className="scenario-layout"><div className="stack"><section className="panel stack"><div className="row between"><h2>Scenario inputs</h2><Pill>Three sample cases</Pill></div><p className="small muted">Demand values are fixed assumptions from Pixso. Choose a discount to inspect its result.</p><label>Selected discount<select className="input" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{[0,5,10].map(d=><option key={d} value={d}>{d}% {d===0?'baseline':d===5?'trial':'comparison'}</option>)}</select></label><div className="row small"><Pill>Stock: 1,350 bundles</Pill><Pill tone="">Cost: ฿62.51</Pill><Pill tone="">30 days</Pill></div><p className="small muted">No campaign cost in this example. Net profit is not estimated.</p><label>Manager rationale<textarea className="input" value={note} onChange={e=>setNote(e.target.value)} maxLength={1200}/></label></section><section className="panel stack"><h2>Why 5% is suggested</h2><p className="small muted">5% gives the highest gross profit here. At 1,250 orders it fits the 1,350-bundle stock limit; the 10% case needs 1,400. Demand is assumed, not predicted by AI.</p><Pill tone="green">5%: best profit; within sample stock.</Pill></section></div><div className="stack"><h2>Snack + drink: 3 sample scenarios</h2><p className="small muted">Price × orders = sales; (price − unit cost) × orders = gross profit.</p><div className="table-wrap"><table><thead><tr><th>Operational metric</th>{cases.map(c=><th key={c.d} className={selected===c.d?'selected-cell':''}><button className="btn" aria-pressed={selected===c.d} onClick={()=>setSelected(c.d)}>{c.d}% {selected===c.d?'selected':''}</button></th>)}</tr></thead><tbody>{[
      ['Bundle price',(c:any)=>money(c.price)],['Assumed 30-day orders',(c:any)=>c.units.toLocaleString()],['Projected sales (sample)',(c:any)=>money(c.sales)],['Gross margin (sample)',(c:any)=>c.margin.toFixed(1)+'%'],['Projected gross profit',(c:any)=>money(c.profit)],['Remaining stock',(c:any)=>c.remaining<0?`${-c.remaining} short`:c.remaining.toLocaleString()],['Orders / sample baskets',(c:any)=>c.ratio.toFixed(1)+'%']
    ].map(([label,format]:any)=><tr key={label}><td>{label}</td>{cases.map(c=><td key={c.d} className={selected===c.d?'selected-cell':''}>{format(c)}</td>)}</tr>)}</tbody></table></div><div className="grid-3"><Metric label="Selected gross profit" value={money(chosen.profit)} detail={`${selected}% discount · Assumed ${chosen.units.toLocaleString()} orders`}/><Metric label="Order / basket ratio" value={chosen.ratio.toFixed(1)+'%'} detail="of 1,964 sample baskets" icon={Percent}/><Metric label="Stock risk" value={chosen.remaining<0?'Shortage':'Within stock'} detail={chosen.remaining<0?`${-chosen.remaining} bundles over available stock`:`${chosen.remaining} bundles remain`} icon={Package}/></div>{chosen.remaining<0&&<div className="notice warn"><AlertTriangle size={20}/><p>10% requires 1,400 bundles, exceeding sample stock by 50. Review availability before deciding.</p></div>}</div></div>
    <div className="panel row between"><div><h3>Save the selected example for review</h3><p className="small muted">Sample saves last for this page session. Existing database records remain in My Scenarios.</p></div><div className="row">{workflowLink}<button className="btn primary" onClick={saveSample}><BookmarkCheck size={16}/>Save sample decision</button></div></div>
  </>;

  const currentPrice=current.modeled?Number(current.price)*(1-Number(current.discount)/100):0;
  const currentSales=currentPrice*Number(current.units||0);
  const currentProfit=(currentPrice-Number(current.cost||0))*Number(current.units||0);
  const savedView=<>
    <PageHead title="Saved decisions log" subtitle="Inspect four original prototype examples and the samples saved during this page session. These are separate from your saved preview records."><Next to="dashboard" secondary>Return to dashboard</Next><Next to="scenarios">Compare another scenario</Next></PageHead>
    <div className="notice"><CheckCircle2 size={24}/><div style={{flex:1}}><strong>Prototype log · {decisions.length} sample records</strong><p className="small muted">Session samples reset on page reload. No live approval or database save is represented here.</p></div>{workflowLink}</div>
    <div className="grid-4 metrics"><Metric label="Sample decisions" value={decisions.length+' records'} detail="4 original examples + session samples" icon={Layers}/><Metric label="Selected offer price" value={current.modeled?money(currentPrice):'Not modeled'} detail={current.modeled?`${current.discount}% off from ฿95`:'Example only'}/><Metric label="Projected gross profit" value={current.modeled?money(currentProfit):'Not modeled'} detail="Simulation only" icon={Percent}/><Metric label="Record status" value="Demo" detail="Sample · No live approval" icon={ShieldCheck}/></div>
    <div className="decision-layout"><section className="panel" style={{padding:0}}><div style={{padding:14}}><label>Search ID / action<input className="input" value={decisionQuery} onChange={e=>setDecisionQuery(e.target.value)} placeholder="Search sample decisions…"/></label></div>{decisions.filter(d=>(d.id+' '+d.name).toLowerCase().includes(decisionQuery.toLowerCase())).map(d=><button key={d.id} className={'decision-row '+(current.id===d.id?'active':'')} onClick={()=>setDecisionId(d.id)}><div className="row between"><code className="small">{d.id}</code><Pill tone={d.id.startsWith('SESSION')?'green':'aqua'}>{d.id.startsWith('SESSION')?'Session sample':'Example'}</Pill></div><h3 style={{fontSize:17,margin:'9px 0'}}>{d.name}</h3><div className="row between small"><span className="muted">{d.category} · Demo Store A</span><span className="positive">{d.modeled?'Simulation':'Not modeled'}</span></div></button>)}{decisions.filter(d=>(d.id+' '+d.name).toLowerCase().includes(decisionQuery.toLowerCase())).length===0&&<div className="empty">No matching sample decisions.</div>}<p className="small muted" style={{padding:15}}>Prototype examples · No statutory audit retention</p></section><section className="panel stack"><div className="row between"><Pill>{current.id}</Pill><Pill tone="">{current.status}</Pill></div><h2>{current.name}</h2><p className="small muted">Author: Demo {role}</p>{current.modeled?<><div className="panel soft stack"><p className="eyebrow">Simulated impact matrix</p><div className="grid-2"><div><p className="small muted">Sample baseline sales</p><strong>{money(95000)}</strong></div><div><p className="small muted">Selected example sales</p><strong className="positive">{money(currentSales)}</strong></div></div><div className="row between small"><span>Assumed orders / stock</span><strong>{Number(current.units).toLocaleString()} / {Number(current.stock).toLocaleString()}</strong></div></div><h3>Manager's note</h3><div className="panel small">{current.note}</div><p className="small muted">Formula: price × orders = sales; (price − ฿62.51) × orders = gross profit. Demand and costs are illustrative assumptions.</p></>:<div className="notice"><Info size={20}/><p className="small">This original Pixso record is a design example only. No financial result or manager decision has been modeled.</p></div>}<h3>Demo review roles</h3><p className="small muted">Not actual approval</p>{[['Manager','Decision owner'],['Analyst','Data review'],['Supervisor','Operations review']].map(([n,desc])=><div className="panel row between" style={{padding:12}} key={n}><div className="row"><span className="avatar">{n[0]}</span><div><strong className="small">Demo {n}</strong><p className="small muted">{desc}</p></div></div><Pill tone="green">Example</Pill></div>)}<button className="btn" onClick={()=>download(current.id+'.json',JSON.stringify({...current,storage:'Prototype/session example only; not a database decision'},null,2),'application/json') }><Download size={15}/>Export this sample</button></section></div>
  </>;

  if(!user?.email)return <Landing brand={brand}/>;
  return <div className="cp-retail" data-view={view} ref={workspaceRootRef}><style>{css}</style>{view!=='login'&&<a className="skip-link" href="#cp-workspace-main">Skip to content</a>}{view==='login'?<AuthEntry brand={brand} user={user} loginLink={loginLink} onContinue={()=>go('my-scenarios')} onExplore={()=>launch('Store Manager')}/>:<div className="app"><aside className={'sidebar '+(menu?'open':'')}><div className="brand cp-workspace-brand"><SidebarBrand name={brand} subtitle={translate('Decision workspace',language)} /></div><nav className="side-nav" aria-label="Store workspace">
      {navItems.map(([key,label,Icon])=><React.Fragment key={key}>{key==='profiles'&&<p className="nav-group">Analysis & decisions</p>}{key==='my-scenarios'&&<p className="nav-group">History & feedback</p>}<button key={key} className={'nav-button '+(view===key?'active':'')} aria-current={view===key?'page':undefined} onClick={()=>go(key)}><Icon size={16}/><span>{label}</span></button></React.Fragment>)}
      <div className="workspace-note"><span className="workspace-note-dot" aria-hidden="true"/><div><strong>{cloudEnabled ? 'CP Retail workspace' : 'Independent preview'}</strong><p>{cloudEnabled ? 'Private workspace records' : 'Simulated data · Saved in this browser'}</p></div></div>
    </nav><div className="side-bottom"><AccountSummary user={user}/><AccountNavigation user={user} loginLink={loginLink} className="btn account-settings">{user?.email?'Account settings':'Sign in'}</AccountNavigation><a href="/welcome" className="btn welcome-help"><HelpCircle size={15}/>Welcome &amp; help</a></div></aside><div className="workspace"><header className="topbar"><div className="row"><button className="btn mobile-menu" aria-label="Toggle workspace navigation" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={17}/>:<Menu size={17}/>}</button><span className="breadcrumb muted">Decision Workspace <ChevronRight size={13} style={{display:'inline',verticalAlign:'middle'}}/> <strong style={{color:'#092b50'}}>{navItems.find(n=>n[0]===view)?.[1]}</strong></span></div><div className="row top-meta">{['my-scenarios','my-decisions','recommendations'].includes(view)?<><Pill tone="green">{storageLabel}</Pill><span className="row"><ShieldCheck size={14}/>{view==='my-decisions'?'Your saved decisions':view==='recommendations'?'Scenario planning':'Your saved scenarios'}</span></>:['profiles','upload'].includes(view)?<><Pill tone="green">{profileState.origin}</Pill><span className="row"><CalendarDays size={14}/>{profileState.windowDays}-day window</span></>:<><Pill tone="green">{profileState.analysis?profileState.origin:'No data yet'}</Pill>{profileState.analysis&&<span className="row"><CalendarDays size={14}/>{profileState.windowDays}-day window</span>}</>}</div><AccountNavigation user={user} loginLink={loginLink} className="btn topbar-account"/></header><TestBar state={view==='test'?null:testState} onSkip={()=>setTestState((s:any)=>s&&testSkip(s,Date.now()))} go={go}/><main className="content" id="cp-workspace-main" ref={workspaceMainRef} tabIndex={-1}>{message&&<div className="notice" role="status"><Info size={18}/><p className="small" style={{flex:1}}>{message}</p><button className="btn" aria-label="Dismiss message" onClick={()=>setMessage('')}><X size={12}/></button></div>}{view==='my-scenarios'?<ConnectedScenarios key={`${listVisit}:${recordId ?? ''}`} recordId={recordId} initialDraft={scenarioDraft} onCancelDraft={()=>setScenarioDraft(null)} onFlowCreated={(record:any)=>{setScenarioDraft(null);setOpsSourceId(record.id);go('recommendations');}} onOpenScenario={viewSavedScenario} loginLink={loginLink} openDemo={()=>launch('Store Manager')} backToList={()=>go('my-scenarios')} onRecommend={requestRecommendations}/>:view==='my-decisions'?<ConnectedDecisions loginLink={loginLink} openDemo={()=>launch('Store Manager')} openScenarios={()=>go('my-scenarios')}/>:view==='recommendations'?<OperationalRecommendations initialSourceId={opsSourceId} initialProfile={opsProfile} onCreate={createStartingScenario} onProfiles={()=>go('profiles')} loginLink={loginLink} openDemo={()=>launch('Store Manager')} openScenarios={()=>go('my-scenarios')} openDecisions={()=>go('my-decisions')} openSavedScenario={viewSavedScenario}/>:view==='start'?<StartHome user={user} datasets={datasets} profileState={profileState} go={go} onDemo={openDemo} busy={dataBusy} offerChecked={offerChecked} onAct={actOnAdvice}/>:view==='test'?<TestMode state={testState} onStart={()=>setTestState(testStart(Date.now()))} onSkip={()=>setTestState((s:any)=>s&&testSkip(s,Date.now()))} onReset={()=>setTestState(null)} go={go}/>:view==='dashboard'?<LiveDashboard state={profileState} go={go} pendingCount={pendingCount} onAct={actOnAdvice}/>:view==='upload'?upload:view==='profiles'?profiles:view==='scenarios'?scenarios:savedView}<footer className="footer row between"><span>Coursework workspace · Explicit assumptions · Manager review required</span>{workflowLink}</footer></main></div></div>}</div>;
}
