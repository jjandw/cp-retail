import React, { createContext, useEffect, useState, useRef } from 'react';
import { translate } from './translation.mjs';
export { translate } from './translation.mjs';
import { RATE_URL, validateRates } from './currency.mjs';
export type Language = 'en' | 'zh-CN';
export type Currency = 'CNY' | 'USD';
const storageKey = 'cp-retail-language';
export const LanguageContext = createContext<any>({ language: 'en', currency: 'USD', rates: null, setLanguage: () => {}, setCurrency: () => {} });

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

export function DisplayPreferences() {
  const {language, setLanguage, currency, setCurrency, rates, rateDate, rateStatus, retryRates} = React.useContext(LanguageContext);
  const chinese = language === 'zh-CN';
  return <section className="cp-preferences">
    <h2>{chinese ? '语言与显示' : 'Language & display'}</h2>
    <p className="cp-preferences-intro">{chinese ? '选择你习惯的语言和金额显示方式。设置会自动保存。' : 'Choose your preferred language and display currency. Changes save automatically.'}</p>
    <div className="cp-preference-field"><label htmlFor="cp-language">{chinese ? '界面语言' : 'Language'}</label><select id="cp-language" value={language} onChange={e => setLanguage(e.target.value as Language)}>
      <option value="en" lang="en">English</option><option value="zh-CN" lang="zh-CN">简体中文</option>
    </select></div>
    <div className="cp-preference-field"><label htmlFor="cp-currency">{chinese ? '显示币种' : 'Display currency'}</label><select id="cp-currency" value={currency} onChange={e => setCurrency(e.target.value)}>
      <option value="CNY">{chinese ? '人民币（CNY）' : 'Chinese yuan (CNY)'}</option><option value="USD">{chinese ? '美元（USD）' : 'US dollar (USD)'}</option>
    </select></div>
    <details className="cp-rate-details"><summary>{chinese ? '金额换算说明' : 'About converted amounts'}</summary>
      <p>{chinese ? '金额输入和结果使用所选币种。CSV 和已保存数据保留原始泰铢。' : 'Money inputs and results use your selected currency. CSVs and saved data retain their original THB basis.'}</p>
      <p role="status">{rates ? `${chinese ? '汇率日期' : 'Rate date'}: ${rateDate} · 1 THB = ${rates[currency]} ${currency}${rateStatus === 'error' ? (chinese ? '（缓存汇率）' : ' (cached)') : ''}` : chinese ? '汇率暂未就绪，金额保留原币 THB。' : 'No rate available yet; amounts remain in THB.'}</p>
      {rateStatus === 'error' && <button type="button" onClick={retryRates}>{chinese ? '重新获取汇率' : 'Retry exchange rates'}</button>}
    </details>
  </section>;
}

export function AccountPreferencesDialog() {
  const {language} = React.useContext(LanguageContext);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const chinese = language === 'zh-CN';
  useEffect(() => {
    const show = () => { trigger.current = document.activeElement as HTMLElement; setOpen(true); };
    window.addEventListener('cp-open-preferences', show);
    return () => window.removeEventListener('cp-open-preferences', show);
  }, []);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); }, [open]);
  const close = () => dialog.current?.close();
  return <dialog className="cp-preferences-dialog" ref={dialog} aria-labelledby="cp-preferences-title" onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={e => { if(e.target === e.currentTarget) { const rect=e.currentTarget.getBoundingClientRect(); if(e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom) close(); } }}>
    <header><div><span>CP Retail</span><h1 id="cp-preferences-title">{chinese ? '账号设置' : 'Account settings'}</h1></div><button type="button" className="cp-dialog-close" onClick={close} aria-label={chinese ? '关闭设置' : 'Close settings'}>×</button></header>
    {open && <DisplayPreferences />}
    <footer><a href="/account">{chinese ? '管理账号资料' : 'Manage account profile'}</a><button type="button" className="cp-preferences-done" onClick={close}>{chinese ? '完成' : 'Done'}</button></footer>
  </dialog>;
}

export function LanguageToggle() {
  const {language, setLanguage} = React.useContext(LanguageContext);
  return <button type="button" className="cp-language-toggle" onClick={() => setLanguage(language === 'zh-CN' ? 'en' : 'zh-CN')}>{language === 'zh-CN' ? 'English' : '简体中文'}</button>;
}
