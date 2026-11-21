/** FB-213: manual, owner-private money ledger. No bank or third-party API. */
import { validDateKey } from './dates.js';
export const MONEY_CURRENCIES=Object.freeze({IDR:0,USD:2,EUR:2,GBP:2});
export const MONEY_CATEGORIES=Object.freeze({
  income:Object.freeze(['Salary','Freelance','Gift','Refund','Other']),
  expense:Object.freeze(['Food','Transport','Housing','Bills','Education','Health','Shopping','Other'])
});
export const MONEY_MAX_TRANSACTIONS=600;
const MAX_AMOUNT=1_000_000_000_000;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const safeId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x)&&
  !['__proto__','prototype','constructor'].includes(x);
const validMoney=x=>Number.isSafeInteger(x)&&x>=0&&x<=MAX_AMOUNT;
export const emptyMoneyLedger=()=>({version:1,currency:'IDR',budgetMinor:0,transactions:[]});
export function normalizeMoneyLedger(raw={}){
  if(!object(raw))throw Error('Invalid private money ledger.');
  const value={...emptyMoneyLedger(),...raw};
  if(value.version!==1||!Object.hasOwn(MONEY_CURRENCIES,value.currency)||
      !validMoney(value.budgetMinor)||!Array.isArray(value.transactions)||
      value.transactions.length>MONEY_MAX_TRANSACTIONS||
      Object.keys(raw).some(k=>!['version','currency','budgetMinor','transactions'].includes(k)))
    throw Error('Invalid private money ledger.');
  const ids=new Set();
  const entries=value.transactions.map(tx=>{
    if(!object(tx)||Object.keys(tx).some(k=>!['id','date','kind','category','amountMinor','note'].includes(k))||
        !safeId(tx.id)||ids.has(tx.id)||!validDateKey(tx.date)||
        !Object.hasOwn(MONEY_CATEGORIES,tx.kind)||!MONEY_CATEGORIES[tx.kind].includes(tx.category)||
        !Number.isSafeInteger(tx.amountMinor)||tx.amountMinor<=0||tx.amountMinor>MAX_AMOUNT||
        typeof tx.note!=='string'||tx.note.length>140)
      throw Error('Invalid or duplicate money transaction.');
    ids.add(tx.id);
    return {id:tx.id,date:tx.date,kind:tx.kind,category:tx.category,
      amountMinor:tx.amountMinor,note:tx.note};
  });
  entries.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  return {version:1,currency:value.currency,budgetMinor:value.budgetMinor,transactions:entries};
}
export function parseMoneyAmount(input,currency){
  if(!Object.hasOwn(MONEY_CURRENCIES,currency))throw Error('Unsupported currency.');
  const decimals=MONEY_CURRENCIES[currency],str=String(input??'').trim();
  const pattern=decimals===0?/^\d{1,13}$/:/^\d{1,13}(?:\.\d{1,2})?$/;
  if(!pattern.test(str))throw Error(decimals?'Use a positive amount with up to two decimals.':'Enter whole currency units without commas.');
  const [whole,fraction='']=str.split('.');
  const minor=BigInt(whole)*BigInt(10**decimals)+BigInt((fraction.padEnd(decimals,'0'))||'0');
  if(minor<=0n||minor>BigInt(MAX_AMOUNT))throw Error('Amount is out of range.');
  return Number(minor);
}
export function formatMoney(minor,currency){
  if(!Number.isSafeInteger(minor)||Math.abs(minor)>MAX_AMOUNT*MONEY_MAX_TRANSACTIONS||
     !Object.hasOwn(MONEY_CURRENCIES,currency))throw Error('Invalid money amount.');
  const digits=MONEY_CURRENCIES[currency];
  return new Intl.NumberFormat('en-ID',{style:'currency',currency,
    minimumFractionDigits:digits,maximumFractionDigits:digits}).format(minor/10**digits);
}
export function addMoneyTransaction(raw,transaction){
  const ledger=normalizeMoneyLedger(raw);
  if(ledger.transactions.length>=MONEY_MAX_TRANSACTIONS)throw Error('Money ledger is full. Export a private backup before continuing.');
  return normalizeMoneyLedger({...ledger,transactions:[transaction,...ledger.transactions]});
}
export function removeMoneyTransaction(raw,id){
  const ledger=normalizeMoneyLedger(raw);
  if(!safeId(id)||!ledger.transactions.some(x=>x.id===id))throw Error('Money transaction does not exist.');
  return normalizeMoneyLedger({...ledger,transactions:ledger.transactions.filter(x=>x.id!==id)});
}
export function setMoneyBudget(raw,budgetMinor){
  const ledger=normalizeMoneyLedger(raw);
  if(!validMoney(budgetMinor))throw Error('Invalid monthly budget.');
  return {...ledger,budgetMinor};
}
export function setMoneyCurrency(raw,currency){
  const ledger=normalizeMoneyLedger(raw);
  if(!Object.hasOwn(MONEY_CURRENCIES,currency))throw Error('Unsupported currency.');
  if(currency!==ledger.currency&&(ledger.transactions.length||ledger.budgetMinor))
    throw Error('Currency cannot change while transactions or a budget exist. Export a private backup first.');
  return {...ledger,currency};
}
export function moneyMonthlySummary(raw,month){
  const ledger=normalizeMoneyLedger(raw);
  if(typeof month!=='string'||!/^\d{4}-\d{2}$/.test(month)||!validDateKey(month+'-01'))
    throw Error('Invalid money reporting month.');
  const rows=ledger.transactions.filter(t=>t.date.startsWith(month));
  const income=rows.filter(t=>t.kind==='income').reduce((sum,t)=>sum+t.amountMinor,0);
  const expenses=rows.filter(t=>t.kind==='expense').reduce((sum,t)=>sum+t.amountMinor,0);
  const balance=ledger.transactions.reduce((sum,t)=>sum+(t.kind==='income'?t.amountMinor:-t.amountMinor),0);
  const categories=Object.entries(rows.filter(t=>t.kind==='expense').reduce((group,t)=>{
    group[t.category]=(group[t.category]||0)+t.amountMinor;return group;
  },{})).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return {currency:ledger.currency,month,income,expenses,net:income-expenses,balance,
    budget:ledger.budgetMinor,budgetRemaining:ledger.budgetMinor-expenses,
    categories,transactions:rows};
}
