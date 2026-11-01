/* A tiny, dependency-free rich-text notebook for the offline prototype.
 * Persist only an allowlisted subset of HTML. Production replacement: Tiptap JSON in Supabase.
 */
import { validDateKey, todayKey, dateKey } from './dates.js';
import { markStorageIssue, isStorageWriteBlocked } from './storage.js';
const KEY='orbit.v5.journal';
const MAX_ENTRIES=600;
const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','U','H2','H3','UL','OL','LI','BLOCKQUOTE','A']);
const safeHref=url=>{if(typeof url!=='string'||!url.trim())return '';try{const u=new URL(url,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
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
const save=(entries)=>{try{if(isStorageWriteBlocked(KEY))return false;localStorage.setItem(KEY,JSON.stringify(entries));return true;}catch{return false;}};
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw===null)return {entries:[empty()],saved:false};
    const value=JSON.parse(raw),seen=new Set();
    const valid=Array.isArray(value)&&value.length<=MAX_ENTRIES&&value.every(e=>{
      if(!e||typeof e.id!=='string'||!e.id||e.id.length>=100||seen.has(e.id)||typeof e.html!=='string'||e.html.length>140000||typeof e.title!=='string'||e.title.length>120)return false;
      if(!validDateKey(e.date)&&!(typeof e.date==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(e.date)&&validDateKey(e.date.slice(0,10))&&Number.isFinite(Date.parse(e.date))))return false;
      seen.add(e.id);return true;
    });
    if(!valid)markStorageIssue(KEY,'Journal needs recovery. Original saved data is protected.',raw);
    return {entries:normalizeEntries(value),saved:valid};
  }catch{markStorageIssue(KEY,'Journal cannot be read. Original saved data is protected.');return {entries:[empty()],saved:false};}
}
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
    this.notify=notify||(()=>{});this.onEntriesChange=onEntriesChange||(()=>{});const loaded=load();this.entries=loaded.entries;this.saved=loaded.saved;this.index=this.entries.length-1;
    this.title=document.getElementById('journal-entry-title');this.editor=document.getElementById('journal-editor');
    this.dateInput=document.getElementById('journal-entry-date');
    this.saveIndicator=document.getElementById('journal-save-state');this.timer=0;
    this.title.addEventListener('input',()=>this.queueSave());this.editor.addEventListener('input',()=>this.queueSave());
    this.dateInput.addEventListener('change',()=>{this.commit();});
    this.editor.addEventListener('paste',e=>this.handlePaste(e));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.commit();});
    window.addEventListener('pagehide',()=>this.commit());
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
  replaceEntries(input,{persist=true}={}){clearTimeout(this.timer);this.entries=normalizeEntries(input);this.index=this.entries.length-1;this.saved=persist?save(this.entries):true;this.render();this.onEntriesChange(this.entries);return this.saved;}
  updateCount(){const text=this.editor.textContent?.trim()||'';document.getElementById('journal-wordcount').textContent=`${text?text.split(/\s+/).length:0} words`;}
  queueSave(){this.saved=false;this.saveIndicator.textContent='writing…';this.updateCount();clearTimeout(this.timer);this.timer=setTimeout(()=>this.commit(),500);}
  commit(){clearTimeout(this.timer);const entry=this.entries[this.index];if(!entry)return;
    const beforeDate=entry.date,beforeTitle=entry.title,beforeHtml=entry.html;
    entry.title=this.title.value.trim().slice(0,120);
    entry.date=validDateKey(this.dateInput.value)?this.dateInput.value:beforeDate;
    entry.html=sanitizeJournal(this.editor.innerHTML);entry.updatedAt=new Date().toISOString();
    this.saved=save(this.entries);this.saveIndicator.textContent=this.saved?'saved on this device':'not saved — export a backup';
    document.getElementById('journal-date-label').textContent=fmtDate(entry.date).toUpperCase();
    if(beforeDate!==entry.date||beforeTitle!==entry.title||beforeHtml!==entry.html)this.onEntriesChange(this.entries);
    return this.saved;
  }
  render(){const entry=this.entries[this.index];if(!entry)return;
    this.title.value=entry.title;this.editor.innerHTML=sanitizeJournal(entry.html);
    this.dateInput.value=dateKey(entry.date);
    document.getElementById('journal-date-label').textContent=fmtDate(entry.date).toUpperCase();
    document.getElementById('journal-page-number').textContent=String(this.index+1).padStart(2,'0');
    document.getElementById('journal-page-label').textContent=`Page ${this.index+1} of ${this.entries.length}`;
    document.getElementById('journal-prev').disabled=this.index===0;
    document.getElementById('journal-next').disabled=this.index===this.entries.length-1;
    this.saveIndicator.textContent=this.saved?'saved on this device':'not saved — export a backup';this.updateCount();
  }
  newPage(date=todayKey()){this.commit();if(this.entries.length>=MAX_ENTRIES){this.notify('Journal page limit reached. Export a backup before adding more.');return;}
    this.entries.push(empty(date));this.index=this.entries.length-1;this.saved=save(this.entries);this.render();this.onEntriesChange(this.entries);this.title.focus();}
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
  handlePaste(event){
    // Never let untrusted clipboard HTML enter the live DOM before sanitizing.
    event.preventDefault();
    const clipboard=event.clipboardData;if(!clipboard)return;
    const html=clipboard.getData('text/html'),text=clipboard.getData('text/plain');
    this.editor.focus();
    const selection=window.getSelection();let range=selection.rangeCount?selection.getRangeAt(0):null;
    if(!range||!this.editor.contains(range.commonAncestorContainer)){
      range=document.createRange();range.selectNodeContents(this.editor);range.collapse(false);
    }
    const fragment=html?range.createContextualFragment(sanitizeJournal(html)):document.createTextNode(text.slice(0,80000));
    const last=fragment.lastChild||fragment;range.deleteContents();range.insertNode(fragment);
    if(last.parentNode){range.setStartAfter(last);range.collapse(true);selection.removeAllRanges();selection.addRange(range);}
    this.queueSave();
  }
  deletePage(){
    this.commit();const removed=this.entries[this.index],oldIndex=this.index,wasLast=this.entries.length===1;
    this.entries.splice(oldIndex,1);
    if(!this.entries.length)this.entries.push(empty());
    const replacementId=wasLast?this.entries[0].id:null;
    this.index=Math.min(oldIndex,this.entries.length-1);this.saved=save(this.entries);this.render();this.onEntriesChange(this.entries);
    this.notify(this.saved?'Page removed. You can undo.':'Page removed for this session; not saved. Export a backup.',6500,{label:'Undo',run:()=>{
      this.commit();
      if(this.entries.length===1&&this.entries[0].id===replacementId&&!this.entries[0].title&&!this.entries[0].html)this.entries=[];
      this.entries.splice(oldIndex,0,removed);this.index=oldIndex;this.saved=save(this.entries);this.render();this.onEntriesChange(this.entries);this.notify(this.saved?'Page restored.':'Page restored for this session; not saved. Export a backup.');
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
