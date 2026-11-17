// Translate at React's presentation boundary. Model values, CSVs, record names,
// input values and API payloads remain in their original form.
import React, { useContext, forwardRef } from 'react';
import { LanguageContext, translate, translateChildren } from './language';
import { formatCurrencyText } from './currency.mjs';
export { lazy, useState, useRef, useEffect, useSyncExternalStore } from 'react';

const LocalizedHost = forwardRef<any, any>(function LocalizedHost({ tag, children, ...props }, ref) {
  const {language, currency, rates} = useContext(LanguageContext);
  const translated = { ...props, ref };
  for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
    if (typeof translated[name] === 'string') translated[name] = translate(translated[name], language);
  }
  // An option's implicit value must not change when its displayed label changes.
  if (tag === 'option' && props.value === undefined && typeof children === 'string') translated.value = children;
  const preserve = ['script', 'style', 'code', 'pre', 'textarea'].includes(tag) || props.translate === 'no';
  const inputLabel = tag === 'label' && React.Children.toArray(children).some((child: any) => React.isValidElement(child) && (child.props as any).tag === 'input');
  const content = preserve ? children : React.Children.map(translateChildren(children, language), child => {
    if (typeof child !== 'string') return child;
    if (inputLabel) return child.replace(/\bTHB\b/g, language === 'zh-CN' ? '原始泰铢 THB' : 'original THB').replace(/（泰铢）/g, '（原始泰铢 THB）');
    return formatCurrencyText(child, currency, rates, language);
  });
  return React.createElement(tag, translated, content);
});

function createElement(tag: any, props: any, ...children: any[]) {
  if (typeof tag !== 'string') return React.createElement(tag, props, ...children);
  return React.createElement(LocalizedHost, { ...props, tag }, ...children);
}

export default { ...React, createElement };
