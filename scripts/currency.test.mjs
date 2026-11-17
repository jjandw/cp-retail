import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCurrencyText, validateRates } from '../src/i18n/currency.mjs';

test('currency conversion changes display amounts without changing quantities, percentages or source values', () => {
  const source = '฿1,000.00 · 150 customers · 10%';
  assert.equal(formatCurrencyText(source, 'USD', { USD: 0.03 }, 'en'), '$30.00 · 150 customers · 10%');
  assert.equal(formatCurrencyText('฿-100.00', 'USD', { USD: 0.03 }, 'en'), '-$3.00');
  assert.equal(formatCurrencyText('THB +100.00', 'USD', { USD: 0.03 }, 'en'), '+$3.00');
  assert.equal(formatCurrencyText('฿35.5k', 'USD', { USD: 0.03 }, 'en'), '$1,065.00');
  assert.equal(source, '฿1,000.00 · 150 customers · 10%');
  assert.equal(formatCurrencyText('฿1,000.00', 'CNY', { CNY: 0.2 }, 'zh-CN'), '¥200.00');
});

test('unavailable rates keep amounts and labels in THB, never silently relabel', () => {
  for (const rates of [null, {}, {USD:0}, {USD:NaN}, {USD:-1}]) {
    assert.equal(formatCurrencyText('Revenue (THB): ฿500.00', 'USD', rates, 'en'), 'Revenue (THB): ฿500.00');
  }
});

test('only dated THB quotes with both supported currencies are accepted', () => {
  assert.ok(validateRates({base:'THB',date:'2026-11-17',rates:{USD:0.03,CNY:0.2}}));
  assert.ok(!validateRates({base:'USD',date:'2026-11-17',rates:{USD:0.03,CNY:0.2}}));
  assert.ok(!validateRates({base:'THB',date:'today',rates:{USD:0.03,CNY:0.2}}));
  assert.ok(!validateRates({base:'THB',date:'2026-11-17',rates:{USD:0.03,CNY:Infinity}}));
});
