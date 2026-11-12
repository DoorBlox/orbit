/** BP-16: bounded static HTML semantics guard. NOT a full WCAG audit. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

function parseAttributes(source){
  const result=Object.create(null);let i=0;
  while(i<source.length){
    while(i<source.length&&/\s/.test(source[i]))i++;
    if(i>=source.length||source[i]==='/')break;
    const start=i;
    while(i<source.length&&!/[\s=/]/.test(source[i]))i++;
    if(start===i){i++;continue;}
    const name=source.slice(start,i).toLowerCase();
    while(i<source.length&&/\s/.test(source[i]))i++;
    let value='';
    if(source[i]==='='){
      i++;while(i<source.length&&/\s/.test(source[i]))i++;
      const quote=source[i]==='"'||source[i]==="'"?source[i++]:null;
      const begin=i;
      if(quote){while(i<source.length&&source[i]!==quote)i++;value=source.slice(begin,i);if(i<source.length)i++;}
      else{while(i<source.length&&!/\s/.test(source[i]))i++;value=source.slice(begin,i);}
    }
    result[name]=value;
  }
  return result;
}

function scanTags(source){
  const html=source.replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
  const tags=[];
  for(let i=0;i<html.length;i++){
    if(html[i]!=='<'||!/[a-z]/i.test(html[i+1]||''))continue;
    let j=i+1;while(j<html.length&&/[a-z0-9:-]/i.test(html[j]))j++;
    const name=html.slice(i+1,j).toLowerCase();
    if(!name||!/[\s/>]/.test(html[j]||''))continue;
    const start=j;let quote=null;
    while(j<html.length){
      const c=html[j];
      if(quote){if(c===quote)quote=null;}
      else if(c==='"'||c==="'")quote=c;
      else if(c==='>')break;
      j++;
    }
    if(j>=html.length)break;
    tags.push({name,attrs:parseAttributes(html.slice(start,j)),after:j+1,html});
    i=j;
  }
  return tags;
}

export function auditStaticHtmlSemantics(source){
  if(typeof source!=='string'||!source.trim())return {errors:[{code:'invalid-document',subject:'HTML'}],summary:{}};
  const tags=scanTags(source),errors=[],ids=new Map(),refs=[];
  const add=(code,subject)=>errors.push({code,subject});
  let mainCount=0,language=false,buttons=0;
  for(const tag of tags){
    const a=tag.attrs;
    if(tag.name==='main')mainCount++;
    if(tag.name==='html')language=/^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(a.lang||'');
    if(Object.hasOwn(a,'id')){
      if(!/^[A-Za-z][A-Za-z0-9_.:-]*$/.test(a.id))add('invalid-id',tag.name);
      else if(ids.has(a.id))add('duplicate-id',a.id);
      else ids.set(a.id,tag.name);
    }
    for(const ref of ['for','aria-describedby','aria-labelledby','aria-controls']){
      if(Object.hasOwn(a,ref))for(const id of a[ref].split(/\s+/).filter(Boolean))refs.push({ref,id,tag:tag.name});
    }
    if(Object.hasOwn(a,'aria-label')&&!a['aria-label'].trim())add('empty-aria-label',tag.name);
    for(const attr of ['aria-expanded','aria-hidden']){
      if(Object.hasOwn(a,attr)&&!['true','false'].includes(a[attr]))add('invalid-aria-value',tag.name);
    }
    if(Object.hasOwn(a,'aria-pressed')&&!['true','false','mixed'].includes(a['aria-pressed']))add('invalid-aria-value',tag.name);
    if(a['aria-hidden']==='true'&&(
      ['button','input','select','textarea'].includes(tag.name)||
      (tag.name==='a'&&Object.hasOwn(a,'href'))||
      (Object.hasOwn(a,'tabindex')&&Number(a.tabindex)>=0)
    ))add('hidden-focusable',tag.name);
    if(tag.name==='img'&&!Object.hasOwn(a,'alt'))add('missing-alt',tag.name);
    if(tag.name==='iframe'&&!(a.title||'').trim())add('missing-frame-title',tag.name);
    if(tag.name==='a'){
      if(/^\s*(?:javascript:|data:)/i.test(a.href||'')||
         (a.target==='_blank'&&!/\bnoopener\b/.test(a.rel||'')))add('unsafe-link',tag.name);
    }
    if(tag.name==='button'){
      buttons++;
      if(!['button','submit','reset'].includes(a.type))add('missing-button-type',tag.name);
      const rest=tag.html.slice(tag.after),end=rest.search(/<\/button\s*>/i);
      const buttonText=end===-1?'':rest.slice(0,end).replace(/<[^>]*>/g,'').trim();
      if(!buttonText&&!(a['aria-label']||'').trim()&&!(a['aria-labelledby']||'').trim()&&!(a.title||'').trim())
        add('unlabeled-button',a.id||tag.name);
    }
  }
  if(!language)add('missing-language','html');
  if(mainCount!==1)add(mainCount>1?'multiple-main':'missing-main','main');
  for(const {ref,id,tag} of refs)if(!ids.has(id))add('missing-reference',tag+'.'+ref+': '+id);
  return {errors,summary:{elements:tags.length,ids:ids.size,references:refs.length,buttons,mainCount}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const result=auditStaticHtmlSemantics(await readFile('index.html','utf8'));
  if(result.errors.length){
    for(const error of result.errors)console.error('[HTML SEMANTICS] '+error.code+': '+error.subject);
    process.exitCode=1;
  }else console.log('HTML semantic baseline PASS: '+result.summary.elements+' elements, '+result.summary.ids+' IDs, '+result.summary.references+' references, '+result.summary.buttons+' buttons.');
}
