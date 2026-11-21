import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMoneyLedger,parseMoneyAmount,addMoneyTransaction,removeMoneyTransaction,
 setMoneyBudget,setMoneyCurrency,moneyMonthlySummary,formatMoney,
 MONEY_MAX_TRANSACTIONS} from '../src/money.js';
import {normalizeExtensions} from '../src/scene.js';
const entry=(id,kind='expense',amountMinor=25000,date='2026-11-22',category=kind==='expense'?'Food':'Salary')=>
 ({id,kind,amountMinor,date,category,note:'A test transaction'});
test('whole IDR and decimal USD parse to exact minor units without floating point rounding',()=>{
 assert.equal(parseMoneyAmount('50000','IDR'),50000);
 assert.equal(parseMoneyAmount('0.01','USD'),1);
 assert.equal(parseMoneyAmount('37.05','EUR'),3705);
 for(const bad of ['1,000','-2','0','1e5','NaN','Infinity','0.001','  '])
   assert.throws(()=>parseMoneyAmount(bad,'USD'));
 assert.throws(()=>parseMoneyAmount('1.5','IDR'));
 assert.match(formatMoney(50000,'IDR'),/50[.,]000/);
});
test('manual ledger monthly summary and cumulative balance remain independent',()=>{
 let data=normalizeMoneyLedger();
 data=addMoneyTransaction(data,entry('a','income',250000));
 data=addMoneyTransaction(data,entry('b','expense',50000));
 data=addMoneyTransaction(data,entry('c','expense',17000,'2026-10-31'));
 data=setMoneyBudget(data,80000);
 const current=moneyMonthlySummary(data,'2026-11');
 assert.equal(current.income,250000);
 assert.equal(current.expenses,50000);
 assert.equal(current.net,200000);
 assert.equal(current.balance,183000);
 assert.equal(current.budgetRemaining,30000);
 assert.deepEqual(current.categories,[['Food',50000]]);
 assert.equal(current.transactions.length,2);
 assert.equal(moneyMonthlySummary(data,'2026-10').expenses,17000);
 assert.deepEqual(data,normalizeMoneyLedger(data));
 const removed=removeMoneyTransaction(data,'b');
 assert.equal(removed.transactions.length,2);
 assert.equal(data.transactions.length,3);
});
test('malformed, duplicate and hostile financial data fail closed, not silently dropped',()=>{
 const original=normalizeMoneyLedger({transactions:[entry('good')]});
 const bads=[
  {transactions:[entry('duplicate'),entry('duplicate')]},
  {transactions:[entry('__proto__')]},
  {transactions:[entry('bad','expense',0)]},
  {transactions:[{...entry('date'),date:'2026-02-30'}]},
  {transactions:[{...entry('type'),kind:'transfer'}]},
  {transactions:[{...entry('text'),note:'x'.repeat(141)}]},
  {transactions:[{...entry('fraction'),amountMinor:1.5}]},
  {transactions:[{...entry('extra'),outside:1}]},
  {transactions:'not-an-array'},
  {budgetMinor:-1},{currency:'JPY'},
  {transactions:Array.from({length:MONEY_MAX_TRANSACTIONS+1},(_,i)=>entry('id'+i))},
  {unknown:1}
 ];
 for(const bad of bads)assert.throws(()=>normalizeMoneyLedger(bad));
 assert.throws(()=>addMoneyTransaction(original,entry('good')),/duplicate/);
 assert.throws(()=>setMoneyCurrency(original,'USD'),/Currency cannot change/);
 assert.throws(()=>moneyMonthlySummary(original,'2026-13'));
});
test('private extensions round-trip ledger, legacy snapshots retain exact default schema',()=>{
 const old=normalizeExtensions({});
 assert.equal(Object.hasOwn(old,'moneyLedger'),false);
 const original=normalizeMoneyLedger({transactions:[entry('tx1')]});
 assert.deepEqual(normalizeExtensions({moneyLedger:original}).moneyLedger,original);
 assert.deepEqual(normalizeExtensions(normalizeExtensions({moneyLedger:original})).moneyLedger,original);
 assert.throws(()=>normalizeExtensions({moneyLedger:{transactions:[entry('__proto__')]}}));
 const changed=setMoneyCurrency(normalizeMoneyLedger(),'USD');
 assert.equal(changed.currency,'USD');
 assert.equal(normalizeMoneyLedger().currency,'IDR');
});
