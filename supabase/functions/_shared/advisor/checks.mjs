// Immediate, deterministic decision checks. These are not model output or forecasts.
export function opsDecisionReview(context) {
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
export const OPS_AI_WAIT_MS = 30000;
export function opsAiWaitState(status, startedAt, now) {
  const waiting = status === 'Queued' || status === 'Processing';
  const elapsed = startedAt ? Math.max(0, now - startedAt) : 0;
  return {waiting, elapsedSeconds:Math.floor(elapsed / 1000), delayed:waiting && elapsed >= OPS_AI_WAIT_MS};
}
