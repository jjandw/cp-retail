import { opsAiContextText } from '../../functions/_shared/advisor/context.mjs';
import { opsModel } from '../../../src/lib/scenario-math.mjs';

export const group = {
  version: 'profile-ai-1.0', windowDays: 30,
  segment: { id: 'cooling', customerCount: 30, transactionCount: 142, averageBasket: 63.31, averageRecencyDays: 10.9, share: 20 },
  totals: { customerCount: 150, repeatCustomerShare: 64.7 },
  rfm: { r: [0, 4, 26, 0, 0], f: [0, 0, 9, 12, 9], m: [2, 10, 12, 5, 1] },
  offer: null,
};

const source = { price: 95, cost: 62.51, discount: 0, units: 1000, stock: 1350, period: 30 };
const baseline = opsModel(95, 62.51, 0, 1000, 1350);
const trial = opsModel(95, 62.51, 5, 1250, 1350, 17);
export const comparison = opsAiContextText({
  errors: [], source, originalSource: source, keepOriginal: false, recommendedId: 'promotion',
  constraints: { goal: 'profit', maxDiscount: 10, minMargin: 20, safetyStock: 100, maxRestock: 0, fixedCost: 17, demand: [{ discount: 5, units: 1250 }] },
  baseline: { discount: 0, units: 1000, stock: 1350, operatingCost: 0, metrics: baseline },
  plans: [{
    id: 'promotion', discount: 5, units: 1250, stock: 1350, additionalStock: 0,
    metrics: trial, canSave: true, needsCostReview: false,
    delta: {
      revenue: trial.revenue - baseline.revenue, grossProfit: trial.grossProfit - baseline.grossProfit,
      contribution: trial.contribution - baseline.contribution, remaining: trial.remaining - baseline.remaining,
    },
  }],
});
