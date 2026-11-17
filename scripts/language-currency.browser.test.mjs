import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';

async function assertChineseUI(page, location) {
  const remaining=await page.evaluate(()=>{const out=new Set();const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode()) {const parent=node.parentElement;if(!parent||parent.closest('script,style,code,pre,input,textarea,select,svg,[aria-hidden="true"],.cp-language-toggle')||!parent.checkVisibility({checkVisibilityCSS:true}))continue;
    const text=node.textContent.trim();const prose=text.replace(/CP Retail|DeepSeek|RFM|CSV|THB|CNY|USD|\bAI\b|\bID\b|M\d+|demo@cp-retail.invalid|CUST-[\w-]+/g,'');if(/\b[A-Za-z]{2,}\b/.test(prose))out.add(text);
   }return [...out];});assert.deepEqual(remaining,[],location);
 }

test('account preferences preserve drafts, persist language/currency and keep the workspace uncluttered', {timeout:60000}, async t => {
 const root=fileURLToPath(new URL('../',import.meta.url));
 const server=await createServer({configFile:false,root,envDir:false,resolve:{alias:{'@':root+'src'}},server:{host:'127.0.0.1',port:4177,strictPort:true,hmr:false}});
 t.after(()=>server.close());await server.listen();
 const browser=await chromium.launch({channel:process.env.CP_RETAIL_BROWSER_CHANNEL||undefined});t.after(()=>browser.close());
 const page=await browser.newPage();page.setDefaultTimeout(8000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{base:'THB',date:'2026-11-17',rates:{CNY:0.2,USD:0.03}}}));
 await page.goto('http://127.0.0.1:4177/workspace?view=recommendations');
 await page.getByRole('heading',{name:'Compare actions',exact:true}).waitFor();
 assert.equal(await page.locator('.cp-language-bar').count(),0);
 assert.equal(await page.locator('.brand img').getAttribute('src'),'/cp-retail-sidebar-mark-v2.png');
 await page.getByLabel(/^Starting scenario/).selectOption('demo-snack-drink-baseline');
 await page.getByLabel('Maximum discount (%)',{exact:true}).fill('12');
 await page.getByRole('button',{name:'Account',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.waitFor();
 await dialog.getByLabel('Language',{exact:true}).selectOption('zh-CN');
 assert.equal(await dialog.locator('#cp-currency').inputValue(),'CNY');
 assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
 assert.ok(!await dialog.getByText(/1 THB/).isVisible());
 await dialog.locator('#cp-currency').selectOption('USD');
 await dialog.getByRole('button',{name:'完成',exact:true}).click();
 assert.equal(await page.getByLabel('最大折扣（%）',{exact:true}).inputValue(),'12');
 await page.getByText('US$2.85',{exact:true}).waitFor();
 await page.getByRole('button',{name:'账号',exact:true}).click();
 assert.equal(await dialog.locator('#cp-currency').inputValue(),'USD');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await page.reload();await page.getByRole('heading',{name:'比较行动方案',exact:true}).waitFor();
 await page.getByRole('button',{name:'账号',exact:true}).click();
 assert.equal(await dialog.locator('#cp-currency').inputValue(),'USD');
 await dialog.locator('#cp-language').selectOption('en');assert.equal(await dialog.locator('#cp-currency').inputValue(),'USD');
 await dialog.getByRole('button',{name:'Done',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Account',exact:true}).click();
 assert.ok(await dialog.getByLabel('Language',{exact:true}).isVisible());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 assert.deepEqual(errors,[]);
});

test('the Chinese demo workflow has no untranslated interface prose', {timeout:60000}, async t => {
 const root=fileURLToPath(new URL('../',import.meta.url));
 const server=await createServer({configFile:false,root,envDir:false,resolve:{alias:{'@':root+'src'}},server:{host:'127.0.0.1',port:4177,strictPort:true,hmr:false}});
 t.after(()=>server.close());await server.listen();
 const browser=await chromium.launch({channel:process.env.CP_RETAIL_BROWSER_CHANNEL||undefined});t.after(()=>browser.close());
 const page=await browser.newPage({reducedMotion:'reduce'});page.setDefaultTimeout(8000);
 await page.addInitScript(()=>localStorage.setItem('cp-retail-language','zh-CN'));
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{base:'THB',date:'2026-11-17',rates:{CNY:0.2,USD:0.03}}}));
 const audit=location=>assertChineseUI(page,location);
 await page.goto('http://127.0.0.1:4177/workspace');await page.getByRole('heading',{name:'三步完成你的第一个决策。',exact:true}).waitFor();await audit('Start');
 await page.getByRole('button',{name:/打开演示店铺/}).first().click();await page.getByRole('heading',{name:'顾客画像',exact:true}).waitFor();await audit('Customers');
 await page.getByRole('button',{name:/待挽回常客/}).first().click();await page.getByText('了解此顾客组',{exact:true}).click();await page.getByRole('button',{name:'解释此顾客组',exact:true}).click();await audit('Group explanation');
 for(const [view,title]of [['start','继续上次的工作。'],['dashboard','门店经营看板'],['my-scenarios','已保存方案'],['my-decisions','决策记录'],['test','体验任务与反馈']]) {
  await page.goto('http://127.0.0.1:4177/workspace?view='+view);await page.getByRole('heading',{name:title,exact:true}).waitFor();await audit(view);
 }
 await page.goto('http://127.0.0.1:4177/workspace?view=recommendations');await page.getByRole('heading',{name:'比较行动方案',exact:true}).waitFor();
 await page.getByLabel(/^起始方案/).selectOption('demo-snack-drink-baseline');await page.getByRole('button',{name:'比较行动方案',exact:true}).last().click();await page.getByRole('heading',{name:'调整后会有什么变化',exact:true}).waitFor();await audit('Comparison results');
 await page.goto('http://127.0.0.1:4177/');await page.getByRole('heading',{level:1}).waitFor();await audit('Landing');
});

test('Chinese scenario creation, comparison and pending-decision saving remain fully translated', {timeout:60000}, async t => {
 const root=fileURLToPath(new URL('../',import.meta.url));
 const server=await createServer({configFile:false,root,envDir:false,resolve:{alias:{'@':root+'src'}},server:{host:'127.0.0.1',port:4177,strictPort:true,hmr:false}});
 t.after(()=>server.close());await server.listen();
 const browser=await chromium.launch({channel:process.env.CP_RETAIL_BROWSER_CHANNEL||undefined});t.after(()=>browser.close());
 const page=await browser.newPage({reducedMotion:'reduce'});page.setDefaultTimeout(8000);
 await page.addInitScript(()=>localStorage.setItem('cp-retail-language','zh-CN'));
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{base:'THB',date:'2026-11-17',rates:{CNY:0.2,USD:0.03}}}));
 const audit=location=>assertChineseUI(page,location);
 await page.goto('http://127.0.0.1:4177/workspace');
 await page.getByRole('button',{name:/打开演示店铺/}).first().click();
 await page.getByRole('button',{name:/待挽回常客/}).first().click();
 assert.equal(await page.getByRole('slider',{name:/^无优惠时，预计再次到店/}).inputValue(),'20');
 const initialPoint=await page.locator('.offer-curve circle').getAttribute('cx');const offerSlider=page.getByRole('slider',{name:/^有优惠时，预计再次到店/});assert.equal(await offerSlider.inputValue(),'50');await offerSlider.press('Home');assert.equal(await offerSlider.inputValue(),'20');await page.getByText('未达到回本条件',{exact:true}).waitFor();await offerSlider.press('End');assert.equal(await offerSlider.inputValue(),'100');assert.notEqual(await page.locator('.offer-curve circle').getAttribute('cx'),initialPoint);
 assert.equal(await page.getByRole('slider',{name:/^毛利率/}).inputValue(),'35');
 await page.getByRole('button',{name:'下一步：比较行动方案',exact:true}).click();
 await page.getByRole('heading',{name:'创建方案',exact:true}).waitFor();await audit('create-form');
 assert.equal(await page.getByLabel(/^比较顾客组/).inputValue(),'待挽回常客');
 assert.equal(await page.getByLabel(/^折扣百分比/).inputValue(),'10');
 assert.equal(await page.getByLabel(/^参考售价/).inputValue(),'19');
 await page.getByLabel(/^方案名称/).fill('演示测试方案');
 await page.getByLabel(/^单位成本假设/).fill('13.30');await page.getByLabel(/^假设销量/).selectOption('100');await page.getByLabel(/^可用库存/).selectOption('500');
 await page.getByRole('button',{name:'创建方案',exact:true}).click();
 await page.getByRole('heading',{name:'比较行动方案',exact:true}).waitFor();await audit('carried-context');
 assert.ok(await page.getByRole('region',{name:'已记录的顾客组'}).count() || await page.locator('.profile-context').count());
 assert.equal(await page.getByLabel(/^比较用单位成本/).inputValue(),'13.3');
 await page.getByRole('button',{name:'账号',exact:true}).click();const dialog=page.getByRole('dialog');
 await dialog.locator('#cp-currency').selectOption('USD');await dialog.getByRole('button',{name:'完成',exact:true}).click();
 assert.equal(await page.getByLabel(/^比较用单位成本/).inputValue(),'2');
 await page.getByRole('button',{name:'账号',exact:true}).click();await dialog.locator('#cp-currency').selectOption('CNY');await dialog.getByRole('button',{name:'完成',exact:true}).click();
 assert.equal(await page.getByLabel(/^比较用单位成本/).inputValue(),'13.3');
 await page.getByText('更多假设',{exact:true}).click();await page.getByLabel(/^安全库存目标/).fill('400');await page.getByLabel('假设销量，折扣为 0% 时',{exact:true}).fill('80');await page.getByLabel('假设销量，折扣为 5% 时',{exact:true}).fill('100');await page.getByLabel('假设销量，折扣为 10% 时',{exact:true}).fill('130');
 await page.getByRole('button',{name:'比较行动方案',exact:true}).last().click();await page.getByRole('heading',{name:'调整后会有什么变化',exact:true}).waitFor();await audit('results');const chartValues=await page.locator('.decision-chart-grid').first().innerText();await page.getByLabel('对比指标',{exact:true}).selectOption('revenue');assert.notEqual(await page.locator('.decision-chart-grid').first().innerText(),chartValues);await page.getByLabel('对比指标',{exact:true}).selectOption('contribution');
 await page.locator('.comparison-bar-row:not(:disabled)').first().click();await audit('save-form');assert.ok((await page.getByLabel(/^新方案名称/).inputValue()).startsWith('运营 - '));await page.getByLabel(/^店长选择理由/).fill('先核对需求与库存，再小范围试行。');await page.getByRole('button',{name:'另存为新方案',exact:true}).click();await page.getByRole('heading',{name:'新方案已保存',exact:true}).waitFor();await audit('plan-saved');
 await page.getByRole('button',{name:'保存待审核决策',exact:true}).click();await page.getByText('待审核决策已保存',{exact:true}).waitFor();await audit('decision-saved');

});
