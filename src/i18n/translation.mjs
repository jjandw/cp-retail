import { zh } from './zh.mjs';

// Numeric templates cover rule-generated advice, including the server's bounded
// AI renderers. Translation never changes stored evidence or model inputs.
const templates = [
  [/^([+−\d,. -]+) units$/, '$1 件'],
  [/^Subtracts ((?:THB |฿)[+−-]?[\d,]+(?:\.\d+)?) supplied operating cost$/, '减去已填写的运营成本 $1'],
  [/^([\d.]+)% must return$/, '至少需要 $1% 回流'],
  [/^Show all ([\d,]+) customers$/, '显示全部 $1 位顾客'],
  [/^([\d,]+) customers made 2 or more visits$/, '$1 位顾客至少消费两次'],
  [/^([\d,]+) decisions waiting$/, '$1 条待审核决策'],
  [/^([\d,]+) units remain$/, '剩余 $1 件'],
  [/^They made ([\d,]+) purchases \((฿[\d,.]+), ([\d.]+)% of sales\) in the last (\d+) days\.$/, '最近 $4 天完成 $1 次消费，消费金额 $2，占销售额 $3%。'],
  [/^([+−\d,. -]+)% last 7 days vs the 7 before$/, '最近七天较此前七天变化 $1%'],
  [/^The proposed change includes (.+) of additional operating cost\.$/, '此调整包含额外运营成本 $1。'],
  [/^Its modeled profit after that cost is (.+)\.$/, '模拟方案扣除该成本后的利润为 $1。'],
  [/^Check that the (.+) operating-cost assumption covers the proposed change\.$/, '请检查运营成本假设 $1 是否覆盖此次调整。'],
  [/^Verify the working unit cost of (.+) and obtain a cost for the original before comparing profit\.$/, '比较利润前，请核对单位成本 $1，并补充原方案的成本。'],
  [/^The change assumes (.+) additional stock units, taking modeled stock to (.+)\.$/, '此调整假设补货 $1 件，模拟库存达到 $2 件。'],
  [/^The supplied reserve target is (.+) stock units; a changed action still needs to meet the comparison limits\.$/, '安全库存目标为 $1 件；调整方案仍需满足比较限制。'],
  [/^Use (.+)% discount with (.+) assumed units over (.+) days\.$/, '使用 $1% 折扣，假设 $3 天内销售 $2 件。'],
  [/^Compared (.+) explicit demand assumptions against the discount, margin and stock limits\.$/, '已对比 $1 组销量假设，并检查折扣、毛利及库存限制。'],
  [/^Keep the reference price, cap sales at (.+) assumed units and reserve a (.+)-unit buffer\.$/, '保持参考售价，假设销量上限为 $1 件，并预留 $2 件安全库存。'],
  [/^Your no-discount assumption is (.+) units\. That volume already fits the available stock and buffer\.$/, '不打折时的假设销量为 $1 件，现有库存可覆盖销量和安全库存。'],
  [/^Your no-discount assumption is (.+) units\. Reserving the buffer lowers the cap by (.+) units\.$/, '不打折时的假设销量为 $1 件，预留安全库存后销量上限减少 $2 件。'],
  [/^At (.+)% discount, keep stock unchanged and cap assumed sales at (.+) units\.$/, '使用 $1% 折扣，库存保持不变，假设销量上限为 $2 件。'],
  [/^At (.+)% discount, model (.+) additional units and cap assumed sales at (.+) units\.$/, '使用 $1% 折扣，假设补货 $2 件，假设销量上限为 $3 件。'],
  [/^At least (.+)% of this group must return with the offer\. You assumed (.+)%\.$/, '此顾客组至少需要 $1% 回流才能回本；你假设的回流率为 $2%。'],
  [/^At least (.+)% of this group must return with the offer\. You assumed (.+)%, so the discount gives away more than it brings back\.$/, '至少需要 $1% 回流才能回本；你的假设为 $2%，折扣成本将超过新增收益。'],
  [/^Assumed (.+)% with the offer$/, '有优惠时假设回流率 $1%'],
  [/^(.+) customers \((.+)% of active customers\) made (.+) purchases in the last (.+) days\. Average basket ฿(.+); their latest visit was (.+) days ago on average\.$/, '$1 位顾客（活跃顾客的 $2%）在最近 $4 天完成 $3 次消费。平均客单价 ฿$5；距上次消费平均 $6 天。'],
  [/^(.+) of (.+) customers in this group have not visited for more than 7 days\.$/, '此组 $2 位顾客中，有 $1 位超过七天未到店。'],
  [/^Win back your (.+) Cooling regulars first\.$/, '优先挽回 $1 位待挽回常客。'],
  [/^Give your (.+) occasional customers a reason to return\.$/, '为 $1 位偶尔消费的顾客提供回访理由。'],
  [/^Turn your (.+) recent customers into regulars\.$/, '让 $1 位近期新客逐渐成为常客。'],
  [/^Your (.+) regular customers are steady\. Protect them\.$/, '$1 位活跃常客消费稳定，请优先维护。'],
  [/^Check a (.+)% return offer\. With the starting assumptions below, at least (.+)% of them must come back to pay for it\.$/, '评估 $1% 的回访优惠。按下方起始假设，至少需要 $2% 回流才能回本。'],
  [/^Check a (.+)% return offer carefully: at least (.+)% must come back, more than the (.+)% assumed\.$/, '请谨慎评估 $1% 的回访优惠：至少需要 $2% 回流，高于你假设的 $3%。'],
  [/^A (.+)% offer cannot pay back with these assumptions\. Check a smaller offer or a non-price reason to return\.$/, '在这些假设下，$1% 的优惠无法回本，请考虑降低折扣或采用非价格激励。'],
  [/^A (.+)% discount is unlikely to pay back: it is at least the gross margin\.$/, '$1% 的折扣可能无法回本，因为折扣不低于毛利率。'],
  [/^A (.+)% discount is unlikely to pay back: at least (.+)% of this group would need to return\.$/, '$1% 的折扣可能无法回本，至少需要此组 $2% 的顾客回流。'],
  [/^At least ([\d,]+) sales are needed, versus ([\d,]+) assumed\. Reserve-constrained sales capacity is ([\d,]+)(?: units)?\.$/, '至少需要销售 $1 件；你的假设为 $2 件。预留安全库存后，最多可销售 $3 件。'],
  [/^At ([\d,]+) sales, revenue is ((?:THB |฿)[+−-]?[\d,]+(?:\.\d+)?); profit after operating cost is ((?:THB |฿)[+−-]?[\d,]+(?:\.\d+)?)\.$/, '销售 $1 件时，收入为 $2；扣除运营成本后的利润为 $3。'],
  [/^At (.+) sales, revenue is (.+); profit remains unavailable\.$/, '销售 $1 件时，收入为 $2；利润仍无法计算。'],
  [/^The selected financial measure is (.+) (above|below|level with) the unchanged original\.$/, m => `所选财务指标${{above:'比原方案高',below:'比原方案低','level with':'与原方案相同，差额为'}[m[2]]} ${m[1]}。`],
  [/^(.+) units above the reserve after assumed sales\.$/, '按假设销量完成后，仍高于安全库存 $1 件。'],
  [/^The plan requires (.+) additional units\.$/, '此方案需要补充 $1 件库存。'],
  [/^The scenario assumes (.+) sales and (.+) available units: (.+) units short\. Compare a lower sales cap or explicitly allow additional stock\.$/, '方案假设销售 $1 件，可用库存 $2 件，缺口为 $3 件。请比较较低的销量上限，或允许补货。'],
  [/^The (.+)-unit buffer exceeds (.+) units of stock including the allowed addition\. Lower the buffer or revise the stock limits\.$/, '安全库存目标为 $1 件，超过包含允许补货在内的 $2 件库存。请降低目标或调整库存限制。'],
  [/^Even the reference price cannot meet (.+)% unit margin with the supplied cost\. Check the cost or revise the margin target\.$/, '按当前成本，即使使用参考售价，也无法达到 $1% 的单位毛利率。请核对成本或调整毛利率目标。'],
  [/^Gross profit changes by THB (.+)\.$/, '毛利变化为 THB $1。'],
  [/^([+−\d,. -]+) assumed sales units\.?$/, '假设销量变化 $1 件'],
  [/^([+−\d,. -]+) stock units\.?$/, '库存变化 $1 件'],
  [/^([+−\d,. -]+) percentage points of discount\.?$/, '折扣变化 $1 个百分点'],
  [/^Compared (.+) stock-limited options; each is unchanged or fails at least one limit\.$/, '已比较 $1 个受库存限制的方案，但均与原方案相同或未满足至少一项限制。'],
  [/^Compared (.+) stock-limited options and selected the changed feasible action with the most (gross profit after operating cost|assumed revenue|remaining stock)\.$/, m => `已比较 ${m[1]} 个库存受限方案，选择${translate(m[2], 'zh-CN')}最高的可行调整。`],
  [/^The (.+)% assumption is (.+) units\.$/, '$1% 折扣时假设销量为 $2 件。'],
  [/^Covering it and the buffer needs (.+) extra units; your limit is (.+)\.$/, '满足销量和安全库存需要补货 $1 件；你的上限为 $2 件。'],
  [/^The stock limit leaves (.+) assumed units unserved\.$/, '库存上限使 $1 件假设需求无法得到满足。'],
  [/^None of the changed feasible actions improves (.+) on these assumptions\.$/, m => `按这些假设，没有可行调整能够改善${translate(m[1], 'zh-CN')}。`],
  [/^Task (.+) of (.+)$/, '任务 $1／$2'],
  [/^Done in (.+) s$/, '已完成，用时 $1 秒'],
  [/^([\d,.]+) days$/, '$1 天'],
  [/^([\d,.]+) customers$/, '$1 位顾客'],
  [/^Purchases, last (.+) days$/, '最近 $1 天的消费次数'],
  [/^(.+) customers · (.+)% of active customers$/, '$1 位顾客·活跃顾客的 $2%'],
  [/^They made (.+) purchases \((.+)% of sales\) in the last (.+) days\.$/, '最近 $3 天完成 $1 次消费，占销售额 $2%。'],
  [/^Their latest visit was (.+) days ago on average\.$/, '距上次消费平均 $1 天。'],
  [/^(.+)% off · (.+)% return anyway · (.+)% with the offer · (.+)% gross margin$/, '$1% 折扣·无优惠回流率 $2%·有优惠回流率 $3%·毛利率 $4%'],
  [/^(.+) transactions · analysis date (.+) · saved (to your account|in this browser)$/, m => `${m[1]} 笔交易·分析日期 ${m[2]}·已保存${m[3] === 'to your account' ? '到你的账号' : '在此浏览器中'}`],
  [/^(.+) transactions · analysis date (.+) · not saved yet$/, '$1 笔交易·分析日期 $2·尚未保存'],
  [/^(.+) equivalent (?:result was|results were) combined\.$/, '已合并 $1 个等效结果。'],
  [/^Row (.+): (.+)$/, m => `第 ${m[1]} 行：${translate(m[2], 'zh-CN')}`],
  [/^(.+) is required\.$/, m => `请填写${translate(m[1], 'zh-CN')}。`],
  [/^(.+) must be (a number|a whole number) (.+)\.$/, m => `${translate(m[1], 'zh-CN')}必须为${m[2] === 'a whole number' ? '整数' : '数字'}，范围 ${m[3]}。`],
  // Bounded cloud Advisor answers use these same deterministic templates.
  [/^For the (.+) comparison, the modeled choice uses a (.+)% discount with (.+) assumed sales and (.+) stock units\.$/, m => `以${translate(m[1], 'zh-CN')}为比较目标，模拟方案采用 $2% 折扣，假设销量 $3 件、库存 $4 件。`.replace('$2',m[2]).replace('$3',m[3]).replace('$4',m[4])],
  [/^Its modeled profit after operating cost is (.+)\.$/, '模拟方案扣除运营成本后的利润为 $1。'],
  [/^Its modeled remaining stock is (.+) units\.$/, '模拟方案剩余库存为 $1 件。'],
  [/^Its assumed revenue is (.+)\.$/, '假设收入为 $1。'],
  [/^Keep the saved (.+)% plan with (.+) assumed sales\.$/, '保留已保存的 $1% 折扣方案，假设销量为 $2 件。'],
  [/^It meets the supplied limits, and none of the modeled changes improves (.+) on these assumptions\.$/, m => `原方案满足限制，按这些假设，没有模拟调整能改善${translate(m[1], 'zh-CN')}。`],
  [/^At least (.+) sales are needed to beat the unchanged original on the selected financial measure, versus (.+) assumed sales\.$/, '至少需要销售 $1 件，才能在所选财务指标上优于原方案；当前假设为 $2 件。'],
  [/^Reserve-constrained sales capacity is (.+) units\.$/, '预留安全库存后，最多可销售 $1 件。'],
  [/^Trial stop\/review condition: if the evidence does not support at least (.+) sales over the modeled period, revisit the promotion before extending it\.$/, '试行停止或复核条件：如果证据不足以支持周期内至少销售 $1 件，应先重新评估促销，再考虑扩大范围。'],
  [/^If assumed sales fall by 10%, (.+) sales produce (.+) revenue\.$/, '如果销量比假设减少 10%，销售 $1 件将产生 $2 收入。'],
  [/^Profit after operating cost is (.+)\.$/, '扣除运营成本后的利润为 $1。'],
  [/^(Assumed revenue|Profit after operating cost) (increases|decreases) by (.+) versus the saved original on these assumptions\.$/, m => `${translate(m[1], 'zh-CN')}比原方案${m[2] === 'increases' ? '增加' : '减少'} ${m[3]}。`],
  [/^(Assumed revenue|Profit after operating cost) is unchanged from the saved original on these assumptions\.$/, m => `按这些假设，${translate(m[1], 'zh-CN')}与原方案相同。`],
  [/^The plan leaves (.+) stock units against the (.+)-unit reserve target\.$/, '方案剩余库存 $1 件，安全库存目标为 $2 件。'],
  [/^Confirm available stock and the (.+)-unit reserve before trying a change\.$/, '试行调整前，请确认可用库存和 $1 件安全库存。'],
  [/^Confirm the revised unit-cost assumption of (.+)\.$/, '请确认修正后的单位成本假设 $1。'],
];

export function translate(text, language = 'zh-CN') {
  if (language !== 'zh-CN' || typeof text !== 'string') return text;
  const core = text.trim();
  if (!core) return text;
  const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const date = core.match(/^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}), (\d{2}:\d{2})$/);
  if (date) return text.replace(core, `${date[3]}-${months[date[2]]}-${date[1].padStart(2,'0')} ${date[4]}`);
  const day = core.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})$/);
  if (day) return text.replace(core, `${Number(months[day[1]])}月${day[2]}日`);
  if (zh[core]) return text.replace(core, zh[core]);
  for (const [pattern, replacement] of templates) {
    const match = core.match(pattern);
    if (match) return text.replace(core, typeof replacement === 'function' ? replacement(match) : core.replace(pattern, replacement));
  }
  if (core.includes('\n')) return text.split('\n').map(line => translate(line, language)).join('\n');
  const numbered = core.match(/^(\d+\.\s+)(.+)$/);
  if (numbered) return text.replace(core, numbered[1] + translate(numbered[2], language));
  const sentences = core.split(/(?<=[.!?])\s+(?=[A-Z])/);
  if (sentences.length > 1) return text.replace(core, sentences.map(sentence => translate(sentence, language)).join(' '));
  const clauses = core.split('; ');
  if (clauses.length > 1) { const translated = clauses.map(clause => translate(clause, language)); if (translated.some((clause,index) => clause !== clauses[index])) return text.replace(core, translated.join('；')); }
  if (core.endsWith('.') && zh[core.slice(0,-1)]) return text.replace(core, zh[core.slice(0,-1)] + '。');
  return text;
}
