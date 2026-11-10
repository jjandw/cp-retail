// Numerical context only. Inlined into the Softr block alongside the rules engine.
// Names, user text, record identifiers and rule prose never enter the AI request.
export const OPS_AI_CONTEXT_VERSION = 'ops-ai-1.2';

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

export function opsAiContext(run) {
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

export function opsAiContextText(run) {
  return JSON.stringify(opsAiContext(run));
}

// Cache lookup only, not a security primitive. Always compare the full context too.
export function opsAiFingerprint(serializedContext) {
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
