/* A tiny, dependency-free rich-text notebook for the offline prototype.
 * Persist only an allowlisted subset of HTML. Production replacement: Tiptap JSON in Supabase.
 */
const KEY='orbit.v5.journal';
const validDateKey=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;
  const [y,m,d]=s.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;
};
const todayKey=()=>{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date());
  const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${o.year}-${o.month}-${o.day}`;
};
const dateKey=value=>{
  const str=String(value||'');if(validDateKey(str))return str;
  if(!Number.isFinite(Date.parse(str)))return todayKey();
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date(str));
  const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${o.year}-${o.month}-${o.day}`;
};
const MAX_ENTRIES=600;
const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','U','H2','H3','UL','OL','LI','BLOCKQUOTE','A']);
const safeHref=url=>{try{const u=new URL(url,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
export function sanitizeJournal(html){
  const doc=new DOMParser().parseFromString(String(html||'').slice(0,140000),'text/html');
  const parent=document.createElement('div');
  const walk=(from,to,depth)=>{
    if(depth>40)return;
    for(const child of from.childNodes){
      if(child.nodeType===3){to.append(document.createTextNode(child.textContent?.slice(0,60000)||''));continue;}
      if(child.nodeType!==1)continue;
      if(['SCRIPT','STYLE','IFRAME','SVG','OBJECT','EMBED','FORM','VIDEO','AUDIO','IMG','TEMPLATE','MATH'].includes(child.tagName))continue;
      const tag=allowed.has(child.tagName)?child.tagName.toLowerCase():null;
      const next=tag?document.createElement(tag):document.createDocumentFragment();
      if(tag==='a'){const href=safeHref(child.getAttribute('href'));if(href){next.setAttribute('href',href);next.setAttribute('rel','noopener noreferrer');next.setAttribute('target','_blank');}}
      walk(child,next,depth+1);to.append(next);
    }
  };
  walk(doc.body,parent,0);return parent.innerHTML.slice(0,80000);
}
const id=()=>`journal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const empty=(date=todayKey())=>({id:id(),date:dateKey(date),title:'',html:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
export function normalizeEntries(input){
  if(!Array.isArray(input))return [empty()];
  const seen=new Set();const entries=[];
  for(const raw of input.slice(0,MAX_ENTRIES)){
    if(!raw||typeof raw!=='object')continue;
    const uid=typeof raw.id==='string'&&raw.id.length<100?raw.id:id();if(seen.has(uid))continue;seen.add(uid);
    const date=dateKey(raw.date);
    entries.push({id:uid,date,title:String(raw.title||'').slice(0,120),html:sanitizeJournal(raw.html),createdAt:raw.createdAt||date,updatedAt:raw.updatedAt||date});
  }
  return entries.length?entries:[empty()];
}
const save=(entries)=>{try{localStorage.setItem(KEY,JSON.stringify(entries));return true;}catch{return false;}};
function load(){try{return normalizeEntries(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return [empty()];}}
const fmtDate=s=>new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${dateKey(s)}T12:00:00Z`));
function toMarkdown(html){
  const doc=new DOMParser().parseFromString(sanitizeJournal(html),'text/html');
  const inline=n=>{if(n.nodeType===3)return n.textContent||'';if(n.nodeType!==1)return '';
    const v=[...n.childNodes].map(inline).join('');
    if(['B','STRONG'].includes(n.tagName))return `**${v}**`;
    if(['I','EM'].includes(n.tagName))return `*${v}*`;
    if(n.tagName==='BR')return '\n';
    if(n.tagName==='A')return `[${v}](${n.getAttribute('href')||''})`;
    return v;
  };
  const blocks=n=>[...n.childNodes].map(ch=>{
    if(ch.nodeType===3)return ch.textContent||'';
    if(ch.nodeType!==1)return '';
    if(ch.tagName==='UL')return [...ch.children].map(li=>'- '+inline(li)).join('\n')+'\n\n';
    if(ch.tagName==='OL')return [...ch.children].map((li,i)=>(i+1)+'. '+inline(li)).join('\n')+'\n\n';
    if(ch.tagName==='H2')return '## '+inline(ch)+'\n\n';
    if(ch.tagName==='H3')return '### '+inline(ch)+'\n\n';
    if(ch.tagName==='BLOCKQUOTE')return '> '+inline(ch)+'\n\n';
    return inline(ch)+'\n\n';
  }).join('');
  return blocks(doc.body).replace(/\n{3,}/g,'\n\n').trim();
}
export class Journal {
  constructor({notify,onEntriesChange}={}){
    this.notify=notify||(()=>{});this.onEntriesChange=onEntriesChange||(()=>{});this.entries=load();this.index=this.entries.length-1;
    this.title=document.getElementById('journal-entry-title');this.editor=document.getElementById('journal-editor');
    this.dateInput=document.getElementById('journal-entry-date');
    this.saveIndicator=document.getElementById('journal-save-state');this.timer=0;
    this.title.addEventListener('input',()=>this.queueSave());this.editor.addEventListener('input',()=>this.queueSave());
    this.dateInput.addEventListener('change',()=>{this.commit();});
    this.editor.addEventListener('paste',()=>this.handlePaste());
    this.editor.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();this.commit();}});
    document.getElementById('journal-new').addEventListener('click',()=>this.newPage());
    document.getElementById('journal-prev').addEventListener('click',()=>this.go(-1));
    document.getElementById('journal-next').addEventListener('click',()=>this.go(1));
    document.getElementById('journal-export').addEventListener('click',()=>this.exportPage());
    document.getElementById('journal-delete').addEventListener('click',()=>this.deletePage());
    for(const tool of document.querySelectorAll('[data-format]')){
      tool.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')e.preventDefault();});
      tool.addEventListener('click',()=>this.format(tool.dataset.format));
    }
    this.render();
  }
  getEntries(){this.commit();return structuredClone(this.entries);}
  replaceEntries(input){this.entries=normalizeEntries(input);this.index=this.entries.length-1;save(this.entries);this.render();this.onEntriesChange(this.entries);}
  updateCount(){const text=this.editor.textContent?.trim()||'';document.getElementById('journal-wordcount').textContent=`${text?text.split(/\s+/).length:0} words`;}
  queueSave(){this.saveIndicator.textContent='writing…';this.updateCount();clearTimeout(this.timer);this.timer=setTimeout(()=>this.commit(),500);}
  commit(){clearTimeout(this.timer);const entry=this.entries[this.index];if(!entry)return;
    const beforeDate=entry.date,beforeTitle=entry.title,beforeHtml=entry.html;
    entry.title=this.title.value.trim().slice(0,120);
    entry.date=validDateKey(this.dateInput.value)?this.dateInput.value:beforeDate;
    entry.html=sanitizeJournal(this.editor.innerHTML);entry.updatedAt=new Date().toISOString();
    const ok=save(this.entries);this.saveIndicator.textContent=ok?'saved on this device':'not saved — export a backup';
    if(beforeDate!==entry.date||beforeTitle!==entry.title||beforeHtml!==entry.html)this.onEntriesChange(this.entries);
  }
  render(){const entry=this.entries[this.index];if(!entry)return;
    this.title.value=entry.title;this.editor.innerHTML=sanitizeJournal(entry.html);
    this.dateInput.value=dateKey(entry.date);
    document.getElementById('journal-date-label').textContent=fmtDate(entry.date).toUpperCase();
    document.getElementById('journal-page-number').textContent=String(this.index+1).padStart(2,'0');
    document.getElementById('journal-page-label').textContent=`Page ${this.index+1} of ${this.entries.length}`;
    document.getElementById('journal-prev').disabled=this.index===0;
    document.getElementById('journal-next').disabled=this.index===this.entries.length-1;
    this.saveIndicator.textContent='saved on this device';this.updateCount();
  }
  newPage(date=todayKey()){this.commit();if(this.entries.length>=MAX_ENTRIES){this.notify('Journal page limit reached. Export a backup before adding more.');return;}
    this.entries.push(empty(date));this.index=this.entries.length-1;save(this.entries);this.render();this.onEntriesChange(this.entries);this.title.focus();}
  openEntry(entryId){const index=this.entries.findIndex(e=>e.id===entryId);if(index<0)return false;
    this.commit();this.index=index;this.render();return true;}
  go(step){const next=this.index+step;if(next<0||next>=this.entries.length)return;
    this.commit();this.index=next;this.render();}
  format(kind){this.editor.focus();
    // For the offline prototype, legacy editing commands supply clean native selection behavior.
    // The saved result is sanitized. Migrate to a structured editor (Tiptap) for production.
    if(kind==='bold')document.execCommand('bold',false);
    if(kind==='italic')document.execCommand('italic',false);
    if(kind==='heading')document.execCommand('formatBlock',false,'H2');
    if(kind==='list')document.execCommand('insertUnorderedList',false);
    this.queueSave();
  }
  handlePaste(){requestAnimationFrame(()=>{this.editor.innerHTML=sanitizeJournal(this.editor.innerHTML);this.queueSave();});}
  deletePage(){
    this.commit();const removed=this.entries[this.index],oldIndex=this.index;
    this.entries.splice(oldIndex,1);
    if(!this.entries.length)this.entries.push(empty());
    this.index=Math.min(oldIndex,this.entries.length-1);save(this.entries);this.render();this.onEntriesChange(this.entries);
    this.notify('Page removed. You can undo.',6500,{label:'Undo',run:()=>{
      this.entries.splice(oldIndex,0,removed);this.index=oldIndex;save(this.entries);this.render();this.onEntriesChange(this.entries);this.notify('Page restored.');
    }});
  }
  exportPage(){this.commit();const entry=this.entries[this.index];const title=entry.title||'Untitled';
    const markdown=`# ${title}\n\n${fmtDate(entry.date)}\n\n${toMarkdown(entry.html)}\n`;
    const filename=`orbit-journal-${entry.date.slice(0,10)}.md`,blob=new Blob([markdown],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
    document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);
    this.notify('Journal page exported as Markdown.');
  }
}
