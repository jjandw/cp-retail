// Translate at React's presentation boundary. Model values, CSVs, record names,
// input values and API payloads remain in their original form.
import React, { useContext, forwardRef, useState, useEffect, useRef } from 'react';
import { LanguageContext, translate, translateChildren } from './language';
import { formatCurrencyText } from './currency.mjs';
export { lazy, Suspense, useState, useRef, useEffect, useSyncExternalStore } from 'react';

const LocalizedHost = forwardRef<any, any>(function LocalizedHost({ tag, children, moneyInput, ...props }, ref) {
  const {language, currency, rates} = useContext(LanguageContext);
  const translated = { ...props, ref };
  for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
    if (typeof translated[name] === 'string') translated[name] = translate(translated[name], language);
  }
  // An option's implicit value must not change when its displayed label changes.
  if (tag === 'option' && props.value === undefined && typeof children === 'string') translated.value = children;
  const preserve = ['script', 'style', 'code', 'pre', 'textarea'].includes(tag) || props.translate === 'no';
  const moneyLabel = tag === 'label' && React.Children.toArray(children).some(child => typeof child === 'string' && child.includes('THB'));
  const content = preserve ? children : React.Children.map(translateChildren(children, language), child => {
    if (moneyLabel && React.isValidElement(child) && (child.props as any).tag === 'input') return React.cloneElement(child as any, {moneyInput: true});
    return typeof child === 'string' ? formatCurrencyText(child, currency, rates, language) : child;
  });
  if (moneyInput) return React.createElement(CurrencyInput, {...translated, currency, rates});
  return React.createElement(tag, translated, content);
});

// Edit in the display currency; callbacks and stored values keep their THB basis.
const CurrencyInput = forwardRef<any, any>(function CurrencyInput({currency, rates, value, onChange, ...props}, ref) {
  const rate = rates?.[currency] > 0 ? rates[currency] : 1;
  const display = () => value === '' || value == null ? '' : String(Math.round(Number(value) * rate * 100) / 100);
  const [draft, setDraft] = useState(display);
  const editing = useRef(false);
  useEffect(() => { if (!editing.current) setDraft(display()); }, [value]);
  useEffect(() => { setDraft(display()); }, [rate, currency]);
  return React.createElement('input', {...props, ref, value: draft,
    min: props.min == null ? undefined : Number(props.min) * rate,
    max: props.max == null ? undefined : Number(props.max) * rate,
    placeholder: props.placeholder?.startsWith('e.g. ') ? undefined : props.placeholder,
    step: props.step == null ? undefined : '0.01',
    onFocus: event => { editing.current = true; props.onFocus?.(event); },
    onBlur: event => { editing.current = false; setDraft(display()); props.onBlur?.(event); },
    onChange: event => {
      const next = event.target.value;
      setDraft(next);
      const raw = next === '' ? '' : String(Math.round(Number(next) / rate * 100) / 100);
      onChange?.({...event, target: {...event.target, value: raw}, currentTarget: {...event.currentTarget, value: raw}});
    }
  });
});

function createElement(tag: any, props: any, ...children: any[]) {
  if (typeof tag !== 'string') return React.createElement(tag, props, ...children);
  return React.createElement(LocalizedHost, { ...props, tag }, ...children);
}

export default { ...React, createElement };
