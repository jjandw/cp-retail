export function opsRound(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

export function opsModel(price, cost, discount, units, stock, fixedCost=0) {
  const unitCents = Math.round(Math.round(price*100)*(100-discount)/100);
  const costCents = cost === null ? null : Math.round(cost*100);
  const revenue = unitCents*units/100;
  const grossProfit = costCents === null ? null : (unitCents-costCents)*units/100;
  return {
    unitPrice:unitCents/100, revenue:opsRound(revenue),
    grossProfit:grossProfit===null?null:opsRound(grossProfit),
    contribution:grossProfit===null?null:opsRound(grossProfit-fixedCost),
    margin:costCents===null || unitCents===0 ? null : (unitCents-costCents)/unitCents*100,
    remaining:stock-units,
  };
}
