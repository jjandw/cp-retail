export const RATE_URL = 'https://api.frankfurter.dev/v1/latest?base=THB&symbols=CNY,USD';

export function validateRates(value) {
  return value?.base === 'THB' && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && ['CNY', 'USD'].every(code => typeof value.rates?.[code] === 'number' && Number.isFinite(value.rates[code]) && value.rates[code] > 0);
}

export function formatCurrencyText(text, currency, rates, language) {
  const rate = rates?.[currency];
  if (!Number.isFinite(rate) || rate <= 0) return text;
  const formatter = new Intl.NumberFormat(language === 'zh-CN' ? 'zh-CN' : 'en-US', {style: 'currency', currency, currencyDisplay: 'symbol', minimumFractionDigits: 2, maximumFractionDigits: 2});
  // Match monetary amounts only. Counts, percentages, IDs and input values are untouched.
  let result = text.replace(/(?:฿|THB\s+)([+−-]?\d[\d,]*(?:\.\d+)?)(k)?/g, (_, amount, thousands) => (amount.startsWith('+') ? '+' : '') + formatter.format(Number(amount.replaceAll(',', '').replace('−', '-')) * (thousands ? 1000 : 1) * rate));
  const name = currency === 'CNY' ? (language === 'zh-CN' ? '人民币' : 'Chinese yuan') : (language === 'zh-CN' ? '美元' : 'US dollars');
  result = result.replace(/Thai baht \(THB\)|泰铢（THB）/g, `${name} (${currency})`).replace(/\bTHB\b/g, currency).replaceAll('泰铢', name);
  return result;
}
