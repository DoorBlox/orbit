/** FB-213: first-party manual Money window. No bank/provider integration. */
import { emptyMoneyLedger,normalizeMoneyLedger,moneyMonthlySummary,parseMoneyAmount,
  formatMoney,MONEY_CURRENCIES,MONEY_CATEGORIES } from './money.js';
import { todayKey } from './dates.js';
const el=(tag,css='',text=null)=>{
  const node=document.createElement(tag);
  if(css)node.className=css;
  if(text!==null)node.textContent=text;
  return node;
};
const field=(name,input)=>{
  const wrap=el('label','money-field');
  wrap.append(el('span','money-field-name',name),input);
  return wrap;
};
const button=(text,css)=>{const node=el('button',css,text);node.type='button';return node;};
export class MoneyWidget{
  constructor({readOnly=false,onAdd=()=>false,onRemove=()=>false,onBudget=()=>false,onCurrency=()=>false}={}){
    this.readOnly=readOnly;this.onAdd=onAdd;this.onRemove=onRemove;
    this.onBudget=onBudget;this.onCurrency=onCurrency;
    this.ledger=emptyMoneyLedger();this.month=todayKey().slice(0,7);
    this.element=el('section','glass-widget spatial-item money-widget');
    this.element.id='money-widget';this.element.dataset.widget='money';
    this.element.setAttribute('aria-labelledby','money-title');
    this.element.style.width='550px';this.element.style.height='690px';
    const header=el('header','widget-heading money-heading');
    const grip=button('⠿','widget-grip');grip.setAttribute('aria-label','Move Money widget');
    grip.title='Drag Money. Arrow keys move the window.';
    const titles=el('div','money-heading-titles');
    titles.append(el('span','eyebrow','PRIVATE · MANUAL ENTRY'));
    const heading=el('h2','', 'Money');heading.id='money-title';titles.append(heading);
    header.append(grip,titles);this.element.append(header);
    this.element.append(el('p','money-disclaimer',
      'Record income and expenses privately. No bank connections or automatic currency conversions.'));
    const toolbar=el('div','money-toolbar');
    this.monthPicker=el('input');this.monthPicker.type='month';this.monthPicker.value=this.month;
    this.monthPicker.id='money-month';this.monthPicker.setAttribute('aria-label','Money reporting month');
    this.monthPicker.addEventListener('change',()=>{this.month=this.monthPicker.value;this.render();});
    this.currency=el('select');this.currency.id='money-currency';
    this.currency.setAttribute('aria-label','Ledger currency');
    for(const name of Object.keys(MONEY_CURRENCIES)){
      const option=el('option','',name);option.value=name;this.currency.append(option);
    }
    this.currency.addEventListener('change',()=>{
      if(this.onCurrency(this.currency.value)===false){
        this.currency.value=this.ledger.currency;
        this.setError('Currency cannot change while this ledger has a budget or transactions.');
      }else this.setError('');
    });
    toolbar.append(field('Reporting month',this.monthPicker),field('Currency',this.currency));
    this.element.append(toolbar);
    this.summary=el('div','money-summary');this.summary.id='money-summary';
    this.incomeValue=el('strong','money-number');this.incomeValue.id='money-month-income';
    this.expenseValue=el('strong','money-number');this.expenseValue.id='money-month-expense';
    this.balanceValue=el('strong','money-number');this.balanceValue.id='money-total-balance';
    this.budgetValue=el('strong','money-number');this.budgetValue.id='money-budget-remaining';
    for(const [name,value] of [['Income this month',this.incomeValue],
      ['Expenses this month',this.expenseValue],['Overall balance',this.balanceValue],
      ['Monthly budget remaining',this.budgetValue]]){
      const metric=el('div','money-metric');metric.append(el('span','money-metric-label',name),value);
      this.summary.append(metric);
    }
    this.element.append(this.summary);
    this.budgetForm=el('form','money-budget-form');this.budgetForm.id='money-budget-form';
    this.budgetInput=el('input');this.budgetInput.type='text';this.budgetInput.inputMode='decimal';
    this.budgetInput.placeholder='No limit';this.budgetInput.id='money-budget-input';
    this.budgetInput.maxLength=16;this.budgetInput.disabled=readOnly;
    const budgetSubmit=button('Set budget','money-button');budgetSubmit.type='submit';
    budgetSubmit.disabled=readOnly;
    this.budgetForm.append(field('Monthly expense limit',this.budgetInput),budgetSubmit);
    this.budgetForm.addEventListener('submit',event=>{
      event.preventDefault();if(this.readOnly)return;
      try{
        const amount=this.budgetInput.value.trim()?parseMoneyAmount(this.budgetInput.value,this.ledger.currency):0;
        if(this.onBudget(amount)===false)throw Error('Unable to save budget.');
        this.setError('');
      }catch(error){this.setError(error.message);}
    });
    this.element.append(this.budgetForm);
    this.element.append(el('h3','money-section-title','Add a transaction'));
    this.form=el('form','money-entry-form');this.form.id='money-entry-form';
    this.kind=el('select');this.kind.id='money-entry-kind';
    for(const [id,title] of [['expense','Expense'],['income','Income']]){
      const option=el('option','',title);option.value=id;this.kind.append(option);
    }
    this.category=el('select');this.category.id='money-entry-category';
    this.kind.addEventListener('change',()=>this.updateCategories());
    this.amount=el('input');this.amount.id='money-entry-amount';this.amount.type='text';
    this.amount.inputMode='decimal';this.amount.placeholder='e.g. 50000';
    this.amount.maxLength=16;this.amount.required=true;
    this.date=el('input');this.date.id='money-entry-date';this.date.type='date';
    this.date.value=todayKey();this.date.required=true;
    this.note=el('input');this.note.id='money-entry-note';this.note.type='text';
    this.note.maxLength=140;this.note.placeholder='Optional description';
    this.form.append(field('Type',this.kind),field('Category',this.category),
      field('Amount',this.amount),field('Date',this.date),field('Note',this.note));
    const add=button('Add transaction','money-button money-primary');add.id='money-entry-save';
    add.type='submit';this.form.append(add);
    for(const input of [this.kind,this.category,this.amount,this.date,this.note,add])
      input.disabled=readOnly;
    this.form.addEventListener('submit',event=>{
      event.preventDefault();if(this.readOnly)return;
      try{
        const transaction={
          id:'money_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,11),
          kind:this.kind.value,category:this.category.value,
          date:this.date.value,amountMinor:parseMoneyAmount(this.amount.value,this.ledger.currency),
          note:this.note.value.trim()
        };
        if(this.onAdd(transaction)===false)throw Error('Unable to save transaction.');
        this.amount.value='';this.note.value='';this.setError('');
        this.amount.focus({preventScroll:true});
      }catch(error){this.setError(error.message);}
    });
    this.element.append(this.form);
    this.error=el('p','money-error');this.error.id='money-error';
    this.error.setAttribute('role','alert');this.element.append(this.error);
    this.element.append(el('h3','money-section-title','Spending by category'));
    this.categories=el('div','money-categories');this.categories.id='money-categories';
    this.element.append(this.categories);
    this.element.append(el('h3','money-section-title','Transactions'));
    this.count=el('p','money-count');this.element.append(this.count);
    this.list=el('ul','money-transactions');this.list.id='money-transactions';
    this.element.append(this.list);
    this.element.append(el('p','money-disclaimer money-export-note',
      'Space backups include these financial records as plain text. Keep exported files private.'));
    this.updateCategories();this.render();
  }
  setError(message){this.error.textContent=message;}
  updateCategories(){
    const old=this.category.value;
    this.category.replaceChildren();
    for(const name of MONEY_CATEGORIES[this.kind.value]||[]){
      const option=el('option','',name);option.value=name;this.category.append(option);
    }
    if([...this.category.options].some(o=>o.value===old))this.category.value=old;
  }
  setData(raw){this.ledger=normalizeMoneyLedger(raw??{});this.render();}
  render(){
    let summary;
    try{summary=moneyMonthlySummary(this.ledger,this.month);}
    catch{this.month=todayKey().slice(0,7);this.monthPicker.value=this.month;
      summary=moneyMonthlySummary(this.ledger,this.month);}
    const money=value=>formatMoney(value,summary.currency);
    this.incomeValue.textContent=money(summary.income);
    this.expenseValue.textContent=money(summary.expenses);
    this.balanceValue.textContent=money(summary.balance);
    this.balanceValue.classList.toggle('money-negative',summary.balance<0);
    this.budgetValue.textContent=summary.budget?
      (summary.budgetRemaining<0?'Over by '+money(-summary.budgetRemaining):money(summary.budgetRemaining)):
      'No budget set';
    this.budgetValue.classList.toggle('money-negative',summary.budgetRemaining<0&&summary.budget>0);
    this.currency.value=summary.currency;
    this.currency.disabled=this.readOnly||Boolean(this.ledger.transactions.length||this.ledger.budgetMinor);
    if(document.activeElement!==this.budgetInput)
      this.budgetInput.value=this.ledger.budgetMinor?
        (this.ledger.budgetMinor/10**MONEY_CURRENCIES[summary.currency]).toFixed(MONEY_CURRENCIES[summary.currency]):'';
    this.categories.replaceChildren();
    if(!summary.categories.length)this.categories.append(el('p','money-empty','No expenses in this month.'));
    else for(const [name,value] of summary.categories){
      const item=el('div','money-category');
      item.append(el('span','',name),el('strong','',money(value)));this.categories.append(item);
    }
    this.list.replaceChildren();
    const rows=summary.transactions.slice(0,80);
    this.count.textContent=summary.transactions.length?
      'Showing '+rows.length+' of '+summary.transactions.length+' for '+this.month:
      'No transactions in this month.';
    for(const tx of rows){
      const item=el('li','money-entry');
      const details=el('div','money-entry-details');
      const name=el('strong','money-entry-name',tx.category+(tx.note?' · '+tx.note:''));
      const date=el('time','money-entry-date',tx.date);date.dateTime=tx.date;
      details.append(name,date);
      const amount=el('span','money-entry-value '+(tx.kind==='expense'?'money-negative':''),
        (tx.kind==='expense'?'−':'+')+money(tx.amountMinor));
      item.append(details,amount);
      if(!this.readOnly){
        const remove=button('Remove','money-remove');
        remove.setAttribute('aria-label','Remove '+tx.kind+' '+tx.category+' '+money(tx.amountMinor)+' from '+tx.date);
        remove.addEventListener('click',()=>{
          if(this.onRemove(tx.id)===false)this.setError('Could not remove this transaction.');
          else this.setError('');
        });
        item.append(remove);
      }
      this.list.append(item);
    }
  }
  dispose(){this.element.remove();}
}
