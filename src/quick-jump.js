/** BR-01: private, in-memory navigation index for ORBIT's spatial world.
 * No network search, no persisted index, no HTML insertion from workspace text.
 */
const lower=value=>String(value??'').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
const PRIORITY=Object.freeze({window:16,task:15,branch:14,note:13,journal:12});

/** Score all query tokens, prefer an exact name over verbose body matches. */
export function searchJumpTargets(items,query,{limit=16}={}){
  if(!Array.isArray(items))return [];
  const terms=lower(String(query??'').slice(0,120)).split(' ').filter(Boolean);
  const ranked=[];
  for(let i=0;i<items.length;i++){
    const item=items[i];
    if(!item||typeof item.id!=='string'||typeof item.kind!=='string'||typeof item.title!=='string')continue;
    const title=lower(item.title),detail=lower(item.detail),body=lower(item.searchText);
    if(!title)continue;
    let score=PRIORITY[item.kind]??0;
    if(terms.length){
      score=0;
      for(const term of terms){
        if(title===term)score+=120;
        else if(title.startsWith(term))score+=85;
        else if(title.includes(term))score+=62;
        else if(detail.includes(term))score+=31;
        else if(body.includes(term))score+=16;
        else {score=-1;break;}
      }
      if(score<0)continue;
      score+=PRIORITY[item.kind]??0;
    }
    ranked.push({item,score,position:i});
  }
  const count=Number.isInteger(limit)?Math.max(1,Math.min(50,limit)):16;
  ranked.sort((a,b)=>b.score-a.score||a.position-b.position);
  return ranked.slice(0,count).map(x=>x.item);
}

const make=(tag,className='',text='')=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text)element.textContent=text;
  return element;
};

/** Modal stays outside the scaled canvas. Source material is rendered with textContent. */
export function createQuickJump({getItems,onNavigate,triggerParent}={}){
  if(typeof getItems!=='function'||typeof onNavigate!=='function'||!triggerParent)
    throw Error('Spatial Jump requires local items, navigation and a visible trigger.');
  const trigger=make('button','orbit-jump-trigger','Jump');
  trigger.type='button';trigger.title='Search your space (Ctrl/⌘ K)';
  trigger.setAttribute('aria-label','Jump to a task, branch, note, journal page or window');
  trigger.id='orbit-jump-trigger';
  const shortcut=make('kbd','orbit-jump-shortcut','⌘ K');shortcut.setAttribute('aria-hidden','true');
  trigger.append(shortcut);triggerParent.append(trigger);

  const dialog=make('dialog','orbit-jump-dialog');dialog.id='orbit-jump-dialog';
  dialog.setAttribute('aria-labelledby','orbit-jump-title');
  const shell=make('div','orbit-jump-shell');
  const header=make('div','orbit-jump-heading');
  const heading=make('h2','','Go anywhere');heading.id='orbit-jump-title';
  const dismiss=make('button','orbit-jump-dismiss','×');dismiss.type='button';
  dismiss.setAttribute('aria-label','Close spatial search');
  header.append(heading,dismiss);
  const caption=make('p','orbit-jump-caption','Search across the space without moving any saved window.');
  const input=make('input','orbit-jump-input');
  input.type='search';input.autocomplete='off';input.spellcheck=false;input.maxLength=120;
  input.placeholder='Task, branch, note, or journal…';
  input.setAttribute('aria-label','Search your private space');
  input.setAttribute('role','combobox');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-expanded','true');
  input.setAttribute('aria-controls','orbit-jump-results');
  input.setAttribute('aria-describedby','orbit-jump-hint');
  const results=make('div','orbit-jump-results');
  results.id='orbit-jump-results';results.setAttribute('role','listbox');
  results.setAttribute('aria-label','Places in your space');
  const footer=make('p','orbit-jump-hint','↑ ↓ to explore · Enter to jump · Esc to close');
  footer.id='orbit-jump-hint';
  const status=make('p','orbit-jump-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  shell.append(header,caption,input,results,footer,status);dialog.append(shell);
  document.body.append(dialog);
  let disposed=false,entries=[],visible=[],selection=0,previousFocus=null,focusAfter=null;
  const highlight=()=>{
    for(let i=0;i<results.children.length;i++){
      const node=results.children[i];
      const active=i===selection;
      node.setAttribute('aria-selected',String(active));node.classList.toggle('is-active',active);
    }
    const active=visible[selection];
    if(active){
      input.setAttribute('aria-activedescendant','orbit-jump-option-'+selection);
      results.children[selection]?.scrollIntoView?.({block:'nearest'});
    }else input.removeAttribute('aria-activedescendant');
  };
  const choose=index=>{
    if(disposed||!visible[index])return;
    let destination;
    try{destination=onNavigate(visible[index]);}
    catch{status.textContent='That place could not be opened. Your data is unchanged.';return;}
    if(destination===false){status.textContent='Save or preview your current canvas before jumping.';return;}
    focusAfter=destination instanceof HTMLElement?destination:null;
    dialog.close();
    // The native close event may be queued until the next task. Restore focus
    // synchronously so a rapid second Ctrl/⌘ K cannot land on a hidden input.
    const target=focusAfter?.isConnected?focusAfter:previousFocus?.isConnected?previousFocus:trigger;
    target?.focus?.({preventScroll:true});
  };
  const render=()=>{
    visible=searchJumpTargets(entries,input.value);
    selection=0;results.replaceChildren();status.textContent='';
    if(!visible.length){
      const empty=make('p','orbit-jump-empty',input.value?'Nothing found. Try another word.':'Your space is ready for your first idea.');
      results.append(empty);input.removeAttribute('aria-activedescendant');
    }else{
      visible.forEach((item,i)=>{
        const row=make('div','orbit-jump-option');row.id='orbit-jump-option-'+i;
        row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===0));
        const meta=make('span','orbit-jump-kind',item.kind);meta.setAttribute('aria-hidden','true');
        const title=make('span','orbit-jump-option-title',item.title);
        const detail=make('span','orbit-jump-option-detail',item.detail||'');
        row.append(meta,title,detail);
        row.addEventListener('pointerenter',()=>{selection=i;highlight();});
        row.addEventListener('pointerdown',event=>event.preventDefault());
        row.addEventListener('click',()=>choose(i));
        results.append(row);
      });
      highlight();
    }
    results.setAttribute('aria-label',visible.length+' matching places');
  };
  const open=()=>{
    if(disposed)return;
    if(dialog.open){input.focus();return;}
    previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:trigger;
    const indexed=getItems();entries=Array.isArray(indexed)?indexed:[];
    focusAfter=null;input.value='';
    dialog.showModal();render();input.focus({preventScroll:true});
  };
  const close=()=>{if(dialog.open)dialog.close();};
  trigger.addEventListener('click',open);
  dismiss.addEventListener('click',close);
  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();event.stopPropagation();
      if(visible.length)selection=(selection+(event.key==='ArrowDown'?1:-1)+visible.length)%visible.length;
      highlight();return;
    }
    if(event.key==='Enter'){event.preventDefault();event.stopPropagation();choose(selection);return;}
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
  });
  dialog.addEventListener('close',()=>{
    entries=[];visible=[];results.replaceChildren();input.removeAttribute('aria-activedescendant');
    const target=focusAfter?.isConnected?focusAfter:previousFocus?.isConnected?previousFocus:trigger;
    focusAfter=null;
    if(!disposed)queueMicrotask(()=>{if(target?.isConnected)target.focus?.({preventScroll:true});});
  });
  return {open,close,get isOpen(){return dialog.open;},dispose(){
    if(disposed)return;disposed=true;close();trigger.remove();dialog.remove();entries=[];visible=[];
  }};
}
