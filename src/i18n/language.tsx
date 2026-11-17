import React, { createContext, useEffect, useState, useRef, useLayoutEffect } from 'react';
import { zh } from './zh';
import { RATE_URL, validateRates } from './currency.mjs';
export type Language = 'en' | 'zh-CN';
export type Currency = 'CNY' | 'USD';
const storageKey = 'cp-retail-language';
export const LanguageContext = createContext<any>({ language: 'en', currency: 'USD', rates: null, setLanguage: () => {}, setCurrency: () => {} });

export function translate(text: string, language: Language): string {
  if (language === 'en') return text;
  const core = text.trim();
  if (!core) return text;
  const match = zh[core];
  if (match) return text.replace(core, match);
  const patterns: [RegExp, string][] = [
    [/^Use (.+)% discount with (.+) assumed units over (.+) days\.$/, '使用 $1% 折扣，假设 $3 天内销售 $2 件。'],
    [/^Compared (.+) explicit demand assumptions against the discount, margin and stock limits\.$/, '已对比 $1 组明确的销量假设，并检查折扣、毛利和库存限制。'],
    [/^Keep the reference price, cap sales at (.+) assumed units and reserve a (.+)-unit buffer\.$/, '保持参考售价，假设销量上限为 $1 件，并预留 $2 件安全库存。'],
    [/^Your no-discount assumption is (.+) units\. That volume already fits the available stock and buffer\.$/, '不打折时的假设销量为 $1 件，现有库存可覆盖销量和安全库存。'],
    [/^Your no-discount assumption is (.+) units\. Reserving the buffer lowers the cap by (.+) units\.$/, '不打折时的假设销量为 $1 件，预留安全库存后销量上限减少 $2 件。'],
    [/^At (.+)% discount, keep stock unchanged and cap assumed sales at (.+) units\.$/, '使用 $1% 折扣，库存保持不变，假设销量上限为 $2 件。'],
    [/^At (.+)% discount, model (.+) additional units and cap assumed sales at (.+) units\.$/, '使用 $1% 折扣，假设补货 $2 件，假设销量上限为 $3 件。'],
    [/^At least (.+)% of this group must return with the offer\. You assumed (.+)%\.$/, '有优惠时，此顾客组至少需要 $1% 回流才能回本；你假设的回流率为 $2%。'],
    [/^Assumed (.+)% with the offer$/, '有优惠时假设回流率 $1%'],
    [/^(.+) days$/, '$1 天'],
    [/^(.+) customers$/, '$1 位顾客'],
    [/^Task (.+) of (.+)$/, '任务 $1／$2'],
    [/^Done in (.+) s$/, '已完成，用时 $1 秒'],
  ];
  for (const [pattern, replacement] of patterns) if (pattern.test(core)) return text.replace(core, core.replace(pattern, replacement));
  // Concatenated validation errors are translated sentence by sentence.
  if (core.includes('. ')) return text.replace(core, core.split(/(?<=\.) /).map(sentence => zh[sentence] || sentence).join(' '));
  return text;
}

export function translateChildren(children: React.ReactNode, language: Language): React.ReactNode {
  return React.Children.map(children, child => typeof child === 'string' ? translate(child, language) : child);
}

export function LanguageProvider({children}: {children: React.ReactNode}) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem(storageKey) === 'zh-CN' ? 'zh-CN' : 'en'; } catch { return 'en'; }
  });
  const [override, setOverride] = useState<Currency | null>(() => {
    try { const value = localStorage.getItem('cp-retail-currency'); return value === 'CNY' || value === 'USD' ? value : null; } catch { return null; }
  });
  const [quote, setQuote] = useState<any>(() => {
    try { const value = JSON.parse(localStorage.getItem('cp-retail-exchange-rates') || 'null'); return validateRates(value) ? value : null; } catch { return null; }
  });
  const [rateStatus, setRateStatus] = useState('loading');
  const [retry, setRetry] = useState(0);
  const currency = override || (language === 'zh-CN' ? 'CNY' : 'USD');
  const changeLanguage = (value: Language) => { setLanguage(value); setOverride(null); try { localStorage.removeItem('cp-retail-currency'); } catch {} };
  const setCurrency = (value: Currency) => { setOverride(value); try { localStorage.setItem('cp-retail-currency', value); } catch {} };
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let current = true;
    setRateStatus('loading');
    fetch(RATE_URL, { signal: controller.signal }).then(response => { if (!response.ok) throw Error('Rates unavailable'); return response.json(); }).then(value => {
      if (!validateRates(value)) throw Error('Invalid exchange rates');
      if (!current) return;
      setQuote(value); setRateStatus('ready');
      try { localStorage.setItem('cp-retail-exchange-rates', JSON.stringify(value)); } catch {}
    }).catch(() => { if (current) setRateStatus('error'); }).finally(() => clearTimeout(timer));
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [retry]);
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem(storageKey, language); } catch { /* Storage can be disabled. */ }
  }, [language]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) { setLanguage(event.newValue === 'zh-CN' ? 'zh-CN' : 'en'); setOverride(null); }
      if (event.key === 'cp-retail-currency') setOverride(event.newValue === 'CNY' || event.newValue === 'USD' ? event.newValue : null);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <LanguageContext.Provider value={{language, setLanguage: changeLanguage, currency, setCurrency, rates: quote?.rates || null, rateDate: quote?.date, rateStatus, retryRates: () => setRetry(value => value + 1)}}>{children}</LanguageContext.Provider>;
}

export function LanguageSwitcher() {
  const {language, setLanguage, currency, setCurrency, rates, rateDate, rateStatus, retryRates} = React.useContext(LanguageContext);
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const measure = () => document.documentElement.style.setProperty('--cp-toolbar-height', `${bar.current?.getBoundingClientRect().height || 0}px`);
    measure();
    const observer = new ResizeObserver(measure);
    if (bar.current) observer.observe(bar.current);
    return () => observer.disconnect();
  }, []);
  return <div className="cp-language-bar" ref={bar}><div className="cp-display-choice"><label htmlFor="cp-language">{language === 'zh-CN' ? '界面语言' : 'Language'}</label>
    <select id="cp-language" value={language} onChange={e => setLanguage(e.target.value as Language)}>
      <option value="en" lang="en">English</option><option value="zh-CN" lang="zh-CN">简体中文</option>
    </select></div><div className="cp-display-choice"><label htmlFor="cp-currency">{language === 'zh-CN' ? '显示币种' : 'Display currency'}</label>
    <select id="cp-currency" value={currency} onChange={e => setCurrency(e.target.value)}><option value="CNY">人民币 CNY</option><option value="USD">US Dollar USD</option></select></div>
    <small className="cp-exchange-note" role="status">{rates ? `Frankfurter · ${rateStatus === 'error' ? (language === 'zh-CN' ? '缓存汇率' : 'Cached rates') : (language === 'zh-CN' ? '汇率日期' : 'Rate date')}: ${rateDate} · 1 THB = ${rates[currency]} ${currency}` : rateStatus === 'loading' ? (language === 'zh-CN' ? '正在加载汇率，暂显示原币 THB' : 'Loading rates; amounts currently in THB') : language === 'zh-CN' ? '汇率暂不可用，金额仍显示原币 THB' : 'Rates unavailable: amounts remain in THB'}<br/>{language === 'zh-CN' ? '输入与 CSV 使用原始泰铢；换算用于查看结果。' : 'Inputs and CSV use original THB; results are converted for display.'}</small>
    {rateStatus === 'error' && <button type="button" onClick={retryRates}>{language === 'zh-CN' ? '重试汇率' : 'Retry rates'}</button>}
    </div>;
}
