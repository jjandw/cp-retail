import assert from 'node:assert/strict';
import test from 'node:test';
import { translate } from '../src/i18n/translation.mjs';
import * as profile from '../supabase/functions/_shared/advisor/profile.mjs';
import * as review from '../supabase/functions/_shared/advisor/review.mjs';
import { group, comparison } from '../supabase/tests/fixtures/advisor-contexts.mjs';

const english = text => text.replace(/CP Retail|DeepSeek|THB|RFM|\bAI\b|v\d\.\d/g, '').match(/\b[A-Za-z]{2,}\b/g);
function isChinese(text) { const result=translate(text,'zh-CN');assert.ok(!english(result), result);return result; }

test('all bounded customer Advisor choices render in Chinese, including numeric group summaries', () => {
 for(const id of ['regular','recent','cooling','occasional']) for(const offer of [null,{discountPercent:10,breakEvenReturnPercent:30,status:'below-break-even'}]) {
  const context=structuredClone(group);context.segment.id=id;context.offer=offer;
  const allowed=profile.choices(context);
  for(const focus of Object.keys(allowed.focuses)) for(const check of Object.keys(allowed.checks)) {
   const original=profile.render(context,{focus,checks:[check]});const translated=isChinese(original);
   assert.ok(translated.includes('63.31'));assert.equal(translate(original,'en'),original);
  }
 }
});

test('operations Advisor headings, sensitivity checks, priorities and financial statements render in Chinese', () => {
 for(const objective of ['profit','revenue','buffer']) for(const keepOriginal of [false,true]) {
  const context=review.sanitize(comparison);context.objective=objective;context.keepOriginal=keepOriginal;
  const allowed=review.choices(context);
  for(const focus of Object.keys(allowed.focuses)) for(const check of Object.keys(allowed.checks)) isChinese(review.render(context,{focus,checks:[check]}));
 }
});

test('saved user text and CSV identifiers retain their content; dates and generated trade-offs localize', () => {
 assert.equal(translate('My summer store plan','zh-CN'),'My summer store plan');
 const csv='transaction_id,customer_id,purchased_on,amount_thb';assert.equal(translate(csv,'zh-CN'),csv);
 assert.equal(translate('17 Nov 2026, 16:49','zh-CN'),'2026-11-17 16:49');
 assert.equal(translate('17 Nov 2026 at 16:49','zh-CN'),'2026-11-17 16:49');
 isChinese('+5 percentage points of discount. Gross profit changes by THB -950.00.');
 isChinese('Compared 3 stock-limited options and selected the changed feasible action with the most gross profit after operating cost. The 5% assumption is 1,000 units. Covering it and the buffer needs 0 extra units; your limit is 0.');
});
