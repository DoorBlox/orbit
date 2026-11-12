import { normalizeExtensions, renderScene } from './scene.js';
import { mountInlineCanvas } from './inline-canvas.js';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const randomId=()=>('note_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8));
/** Persist safe Markdown as plain text; never write raw HTML to private snapshots. */
export function formatStickySelection(value,start,end,kind,href=''){
  const original=String(value||'').slice(0,6000);
  start=Math.max(0,Math.min(original.length,start));end=Math.max(start,Math.min(original.length,end));
  const selected=original.slice(start,end);
  let before='',after='',content=selected||'text';
  if(kind==='bold'){before='**';after='**';}
  else if(kind==='italic'){before='_';after='_';}
  else if(kind==='code'){before='`';after='`';}
  else if(kind==='link'){
    let url;try{url=new URL(href);}catch{throw Error('Paste a valid HTTPS or HTTP link.');}
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Paste a valid public web link.');
    before='[';after=']('+url.href+')';content=selected||'Link';
  }else if(kind==='bullet'||kind==='checklist'){
    const prefix=kind==='bullet'?'- ':'- [ ] ';
    const lineStart=original.lastIndexOf('\n',Math.max(0,start-1))+1;
    const nextNewline=original.indexOf('\n',end),lineEnd=nextNewline<0?original.length:nextNewline;
    const fragment=original.slice(lineStart,lineEnd);
    const changed=fragment.split('\n').map(s=>prefix+s).join('\n');
    if(original.length-fragment.length+changed.length>6000)return null;
    return {value:original.slice(0,lineStart)+changed+original.slice(lineEnd),
      start:lineStart+changed.length,end:lineStart+changed.length};
  }else return null;
  const insertion=before+content+after;
  if(original.length-selected.length+insertion.length>6000)return null;
  return {value:original.slice(0,start)+insertion+original.slice(end),
    start:start+before.length,end:start+before.length+content.length};
}
export function renderStickyMarkdown(value,target){
  target.replaceChildren();
  const pattern=/\*\*([^*\n]+)\*\*|_([^_\n]+)_|`([^`\n]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  function inline(parent,line){
    let at=0;pattern.lastIndex=0;
    for(const match of line.matchAll(pattern)){
      if(match.index>at)parent.append(document.createTextNode(line.slice(at,match.index)));
      const [raw,bold,italic,code,label,href]=match;
      let node;
      if(bold){node=document.createElement('strong');node.textContent=bold;}
      else if(italic){node=document.createElement('em');node.textContent=italic;}
      else if(code){node=document.createElement('code');node.textContent=code;}
      else{
        let valid=false;try{const u=new URL(href);valid=['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{}
        if(valid){node=document.createElement('a');node.href=href;node.rel='noopener noreferrer';node.target='_blank';node.textContent=label;}
        else node=document.createTextNode(raw);
      }
      parent.append(node);at=match.index+raw.length;
    }
    if(at<line.length)parent.append(document.createTextNode(line.slice(at)));
  }
  for(const line of String(value||'').slice(0,6000).split('\n')){
    const element=document.createElement('p');let body=line;
    const task=/^- \[([ xX])\] (.*)$/.exec(line);
    if(task){const check=document.createElement('input');check.type='checkbox';check.disabled=true;check.checked=task[1].toLowerCase()==='x';
      check.setAttribute('aria-label',check.checked?'Complete':'Incomplete');element.append(check);body=task[2];}
    else if(/^[-*] /.test(line)){element.className='sticky-preview-bullet';body=line.slice(2);}
    inline(element,body);target.append(element);
  }
}
export class StickyNotes {
  constructor({world,notes=[],readOnly=false,onChange=()=>{},getScale=()=>1,notify=()=>{},media=null}={}){
    this.world=world;this.readOnly=readOnly;this.onChange=onChange;this.getScale=getScale;this.media=media;
    this.notify=notify;this.disposed=false;this.notes=normalizeExtensions({notes}).notes;
    this.editingNoteId=null;this.activeCanvas=null;this.pendingCanvas=false;
    this.layer=document.createElement('div');this.layer.id='sticky-layer';this.layer.className='sticky-layer';
    this.layer.setAttribute('aria-label','Floating sticky notes');world.append(this.layer);this.render();
  }
  getNotes(){return structuredClone(this.notes);}
  setNotes(notes){if(this.disposed)return;this.notes=normalizeExtensions({notes}).notes;this.render();}
  changed(){if(this.disposed||this.readOnly)return false;return this.onChange(this.getNotes())!==false;}
  canReplaceView(){if(this.activeCanvas?.isDirty()){this.notify('Preview your canvas first to save the latest changes.',6000);return false;}return true;}
  add(){
    if(this.readOnly||this.disposed||this.notes.length>=80||!this.canReplaceView())return false;
    const n=this.notes.length;
    const note={id:randomId(),title:'Untitled note',text:'',x:1510+(n%5)*42,y:1740+(n%5)*46,
      width:310,height:270,color:['sand','peach','lavender','mint'][n%4]};
    this.notes.push(note);this.render();this.changed();this.notify('Sticky note created. Drag its header to move it.');return true;
  }
  duplicate(id){
    if(this.readOnly||this.disposed||this.notes.length>=80||!this.canReplaceView())return false;
    const original=this.notes.find(note=>note.id===id);if(!original)return false;
    const copy=structuredClone(original);
    copy.id=randomId();
    while(this.notes.some(note=>note.id===copy.id))copy.id=randomId();
    copy.title=('Copy of '+original.title).slice(0,100);
    copy.x=clamp(original.x+48,-5000,7500);
    copy.y=clamp(original.y+48,-5000,7500);
    this.notes.push(copy);this.render();this.changed();
    this.notify('Sticky note duplicated.');return true;
  }
  remove(id){
    if(this.readOnly||this.disposed||!this.canReplaceView())return;
    const index=this.notes.findIndex(n=>n.id===id);if(index<0)return;
    if(!window.confirm('Remove this sticky note? Export your space first if it contains something you need.'))return;
    const removed=this.notes.splice(index,1)[0];this.render();this.changed();
    this.notify('Sticky note removed.',6500,{label:'Undo',run:()=>{
      if(this.disposed||this.notes.some(n=>n.id===removed.id))return;
      this.notes.splice(Math.min(index,this.notes.length),0,removed);this.render();this.changed();
    }});
  }
  detachImage(id){
    if(this.readOnly||this.disposed)return false;
    const note=this.notes.find(item=>item.id===id);
    if(!note?.imagePath)return false;
    const path=note.imagePath;delete note.imagePath;
    this.render();this.changed();
    this.notify('Image detached. The private file is kept for your media library.',6500,{label:'Undo',run:()=>{
      if(this.disposed||!this.notes.includes(note)||note.imagePath)return;
      note.imagePath=path;this.render();this.changed();
    }});
    return true;
  }
  startDrag(e,n,element,mode){
    if(this.disposed||this.readOnly||(e.button!==0&&e.pointerType!=='touch'))return;
    e.preventDefault();e.stopPropagation();
    const target=e.currentTarget,pointer=e.pointerId,startX=e.clientX,startY=e.clientY;
    const initial={x:n.x,y:n.y,width:n.width,height:n.height};
    let finished=false;
    const move=event=>{
      if(finished||event.pointerId!==pointer)return;
      event.preventDefault();
      const scale=clamp(Number(this.getScale())||1,.1,5);
      const dx=(event.clientX-startX)/scale,dy=(event.clientY-startY)/scale;
      if(mode==='move'){n.x=clamp(initial.x+dx,-5000,7500);n.y=clamp(initial.y+dy,-5000,7500);}
      else{n.width=Math.round(clamp(initial.width+dx,220,5000));n.height=Math.round(clamp(initial.height+dy,160,5000));}
      element.style.left=n.x+'px';element.style.top=n.y+'px';
      element.style.width=n.width+'px';element.style.height=n.height+'px';
    };
    const end=(event,cancel=false)=>{
      if(finished||(event&&event.pointerId!==pointer))return;
      finished=true;
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',endUp);
      window.removeEventListener('pointercancel',endCancel);
      target.removeEventListener('lostpointercapture',endLost);
      if(cancel){
        Object.assign(n,initial);
        element.style.left=n.x+'px';element.style.top=n.y+'px';
        element.style.width=n.width+'px';element.style.height=n.height+'px';
      }
      try{if(target.hasPointerCapture?.(pointer))target.releasePointerCapture(pointer);}catch{}
      if(!cancel&&Object.keys(initial).some(key=>initial[key]!==n[key]))this.changed();
    };
    const endUp=event=>end(event);
    const endCancel=event=>end(event,true);
    const endLost=event=>end(event,true);
    // Window fallback is essential on hybrid touchscreen laptops when capture
    // silently fails or the finger crosses the resized note's original edge.
    window.addEventListener('pointermove',move,{passive:false});
    window.addEventListener('pointerup',endUp);
    window.addEventListener('pointercancel',endCancel);
    target.addEventListener('lostpointercapture',endLost);
    try{target.setPointerCapture?.(pointer);}catch{}
  }
  render(){
    this.activeCanvas?.dispose();this.activeCanvas=null;
    this.layer.replaceChildren();
    for(const n of this.notes){
      const article=document.createElement('article');article.className='sticky-note sticky-'+n.color;
      article.dataset.noteId=n.id;article.style.left=n.x+'px';article.style.top=n.y+'px';
      article.style.width=n.width+'px';article.style.height=n.height+'px';
      article.setAttribute('aria-label','Sticky note: '+n.title);
      const head=document.createElement('header');head.className='sticky-heading';
      const grip=document.createElement('button');grip.type='button';grip.className='sticky-grip';
      grip.title='Drag to move · Arrow keys move';grip.setAttribute('aria-label','Move sticky note: '+n.title);
      grip.textContent='⋮⋮';
      grip.addEventListener('pointerdown',e=>this.startDrag(e,n,article,'move'));
      grip.addEventListener('keydown',e=>{
        const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
        if(!delta||this.readOnly)return;e.preventDefault();e.stopPropagation();
        n.x=clamp(n.x+delta[0],-5000,7500);n.y=clamp(n.y+delta[1],-5000,7500);
        article.style.left=n.x+'px';article.style.top=n.y+'px';this.changed();
      });
      const title=document.createElement('input');title.type='text';title.maxLength=100;title.value=n.title;
      title.className='sticky-title';title.setAttribute('aria-label','Sticky note title');
      title.disabled=this.readOnly;title.readOnly=!editing;
      title.addEventListener('change',()=>{if(!editing)return;n.title=title.value.slice(0,100);this.changed();});
      const remove=document.createElement('button');remove.type='button';remove.className='sticky-delete';
      remove.textContent='×';remove.title='Remove sticky note';remove.setAttribute('aria-label','Remove sticky note');
      remove.disabled=this.readOnly;remove.hidden=!editing;remove.addEventListener('click',()=>this.remove(n.id));
      grip.disabled=this.readOnly;head.append(grip,title,remove);
      // One surface at a time. Switching never erases the other private data:
      // legacy notes containing both text and scenes remain fully recoverable.
      const mode=n.mode==='canvas'?'canvas':'write';
      const editing=this.editingNoteId===n.id&&!this.readOnly;
      article.dataset.noteMode=mode;article.dataset.view=editing?'edit':'preview';
      const modeTabs=document.createElement('div');modeTabs.className='sticky-mode-tabs';
      modeTabs.setAttribute('role','group');modeTabs.setAttribute('aria-label','Note content mode');
      modeTabs.hidden=!editing;
      for(const [value,label] of [['write','Write'],['canvas','Canvas']]){
        const button=document.createElement('button');button.type='button';
        button.className='sticky-mode-tab';button.textContent=label;
        button.setAttribute('aria-pressed',String(mode===value));
        button.addEventListener('click',async()=>{
          if(!editing||(n.mode===value||(n.mode===undefined&&value==='write')))return;
          button.disabled=true;
          try{
            if(mode==='canvas'){await this.activeCanvas?.save();if(this.disposed)return;}
            else{clearTimeout(timer);n.text=editor.value.slice(0,6000);}
            if(value==='canvas')n.mode='canvas';else delete n.mode;
            if(this.changed()===false){this.notify('Could not store note mode. Keep editing and retry.',6500);return;}
            this.render();
            this.layer.querySelector('[data-note-id="'+n.id+'"] .sticky-mode-tab[aria-pressed="true"]')
              ?.focus({preventScroll:true});
          }catch(error){this.notify('Canvas not saved: '+error.message,6500);}
          finally{button.disabled=false;}
        });
        modeTabs.append(button);
      }
      const editor=document.createElement('textarea');editor.className='sticky-body';editor.rows=5;
      editor.maxLength=6000;editor.value=n.text;editor.disabled=this.readOnly;
      editor.setAttribute('aria-label','Sticky note text');
      let timer=0;
      editor.addEventListener('input',()=>{
        n.text=editor.value.slice(0,6000);clearTimeout(timer);timer=setTimeout(()=>this.changed(),450);
      });
      editor.addEventListener('blur',()=>{if(!editing)return;clearTimeout(timer);n.text=editor.value.slice(0,6000);this.changed();});
      editor.addEventListener('keydown',event=>{
        if(!editing||!(event.metaKey||event.ctrlKey)||event.altKey)return;
        const kind=event.key.toLowerCase()==='b'?'bold':event.key.toLowerCase()==='i'?'italic':
          event.key.toLowerCase()==='k'?'link':event.shiftKey&&event.key==='8'?'bullet':
          event.shiftKey&&event.key==='7'?'checklist':null;
        if(!kind)return;
        event.preventDefault();
        const href=kind==='link'?window.prompt('Paste an HTTPS or HTTP link')||'':'';
        if(kind==='link'&&!href)return;
        try{const change=formatStickySelection(editor.value,editor.selectionStart,editor.selectionEnd,kind,href);
          if(!change)return this.notify('This note reached its text limit.',4000);
          editor.value=change.value;n.text=change.value;editor.setSelectionRange(change.start,change.end);
          this.changed();
        }catch(error){this.notify(error.message,5000);}
      });
      const formatBar=document.createElement('div');formatBar.className='sticky-formatbar';
      formatBar.setAttribute('role','toolbar');formatBar.setAttribute('aria-label','Sticky note text formatting');
      const formatButtons=[['bold','B','Bold'],['italic','I','Italic'],['bullet','≡','Bullet list'],['checklist','☐','Checklist'],['link','↗','Insert link'],['code','</>','Inline code']];
      for(const [kind,label,description] of formatButtons){
        const button=document.createElement('button');button.type='button';button.className='sticky-format-button';
        button.textContent=label;button.title=description;button.setAttribute('aria-label',description);
        button.disabled=this.readOnly;
        button.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')e.preventDefault();});
        button.addEventListener('click',()=>{
          let href='';
          if(kind==='link'){
            href=window.prompt('Paste an HTTPS or HTTP link')||'';
            if(!href)return;
          }
          try{
            const change=formatStickySelection(editor.value,editor.selectionStart,editor.selectionEnd,kind,href);
            if(!change){this.notify('Sticky note has reached its text limit.');return;}
            editor.value=change.value;n.text=change.value;editor.focus();editor.setSelectionRange(change.start,change.end);
            this.changed();
          }catch(error){this.notify(error.message,5000);}
        });formatBar.append(button);
      }
      const done=document.createElement('button');done.type='button';
      done.className='sticky-format-button sticky-done';done.textContent='Done';
      const formatted=document.createElement('div');formatted.className='sticky-text-preview';
      formatted.setAttribute('aria-label','Formatted note');
      const showFormatted=()=>{
        formatted.replaceChildren();
        formatted.classList.toggle('is-empty',!n.text.trim());
        if(n.text.trim())renderStickyMarkdown(n.text,formatted);
        else formatted.textContent='A little space for your thoughts…';
      };
      const editText=editing=>{
        editor.hidden=!editing;
        formatted.hidden=editing||mode==='canvas';
        formatBar.hidden=!editing;
        if(!editing){clearTimeout(timer);showFormatted();if(!this.readOnly)this.changed();}
        else editor.focus({preventScroll:true});
      };
      done.hidden=true;done.addEventListener('click',()=>editText(false));
      formatBar.append(done);
      const preview=document.createElement('div');preview.className='sticky-drawing';
      preview.setAttribute('aria-label','Freeform note canvas');
      renderScene(n.scene,preview,{media:this.media});
      if(mode==='canvas'&&(!n.scene||!n.scene.elements?.some(e=>!e.isDeleted))){
        const empty=document.createElement('p');empty.className='sticky-canvas-empty';
        empty.textContent='Your canvas is ready for text, arrows, shapes and sketches.';
        preview.append(empty);
      }
      editor.hidden=!(editing&&mode==='write');
      formatBar.hidden=!(editing&&mode==='write');
      formatted.hidden=editing||mode==='canvas';preview.hidden=editing||mode!=='canvas';
      if(mode==='write')showFormatted();
      const inlineHost=document.createElement('div');inlineHost.className='sticky-inline-canvas';
      inlineHost.hidden=!(editing&&mode==='canvas');
      let image=null;
      if(n.imagePath&&this.media){
        image=document.createElement('img');image.className='sticky-image';image.alt='Private image attached to '+n.title;
        image.loading='lazy';
        const requested=n.imagePath;
        const status=document.createElement('span');status.className='sticky-image-status';
        status.textContent='Loading private image…';
        const load=this.media.previewUrl?this.media.previewUrl.bind(this.media):this.media.signedUrl.bind(this.media);
        load(requested).then(url=>{
          if(!this.disposed&&image.isConnected&&n.imagePath===requested)image.src=url;
        }).catch(()=>{if(status.isConnected)status.textContent='Private image unavailable. Try reconnecting.';});
        image.addEventListener('load',()=>{status.hidden=true;});
        image.addEventListener('error',()=>{image.hidden=true;status.textContent='Private image could not be displayed.';});
        image._orbitStatus=status;
      }
      const actions=document.createElement('div');actions.className='sticky-actions';
      const primary=document.createElement('button');primary.type='button';
      primary.className='sticky-primary-action';
      primary.textContent=editing?'Preview':'Edit';
      primary.setAttribute('aria-label',editing?'Preview sticky note':'Edit sticky note');
      primary.disabled=this.readOnly;
      primary.addEventListener('click',async()=>{
        if(this.disposed||this.readOnly||this.pendingCanvas)return;
        if(!editing){
          if(!this.canReplaceView())return;
          this.editingNoteId=n.id;this.render();return;
        }
        this.pendingCanvas=true;primary.disabled=true;primary.textContent='Saving…';
        try{
          if(mode==='canvas')await this.activeCanvas?.save();
          else{clearTimeout(timer);n.text=editor.value.slice(0,6000);if(this.changed()===false)throw Error('The note is not saved yet.');}
          if(this.disposed)return;
          this.editingNoteId=null;this.render();
        }catch(error){this.notify('Still editing: '+error.message,6500);primary.disabled=false;primary.textContent='Preview';}
        finally{this.pendingCanvas=false;}
      });
      const tint=document.createElement('details');tint.className='sticky-color-menu';
      const trigger=document.createElement('summary');trigger.className='sticky-color-trigger';
      trigger.setAttribute('aria-label','Choose sticky paper color');trigger.title='Paper color';
      const swatch=document.createElement('span');swatch.className='sticky-color-swatch sticky-swatch-'+n.color;
      trigger.append(swatch,document.createTextNode('Paper'));
      const palette=document.createElement('div');palette.className='sticky-color-options';
      for(const value of ['sand','peach','lavender','mint']){
        const choice=document.createElement('button');choice.type='button';
        choice.className='sticky-color-choice sticky-swatch-'+value;
        choice.textContent=value;choice.setAttribute('aria-pressed',String(value===n.color));
        choice.setAttribute('aria-label',value+' paper');
        choice.disabled=this.readOnly;
        choice.addEventListener('click',()=>{n.color=value;this.render();this.changed();});
        palette.append(choice);
      }
      tint.append(trigger,palette);tint.hidden=!editing;
      if(this.readOnly)trigger.setAttribute('aria-disabled','true');
      const more=document.createElement('details');more.className='sticky-more-menu';
      const moreTrigger=document.createElement('summary');moreTrigger.textContent='More';
      moreTrigger.setAttribute('aria-label','More note actions');
      const moreActions=document.createElement('div');moreActions.className='sticky-more-actions';
      more.append(moreTrigger,moreActions);more.hidden=!editing;
      const duplicate=document.createElement('button');duplicate.className='glass-button sticky-duplicate';
      duplicate.type='button';duplicate.textContent='Duplicate note';duplicate.title='Duplicate this note';
      duplicate.setAttribute('aria-label','Duplicate sticky note');
      duplicate.disabled=this.readOnly||this.notes.length>=80;
      duplicate.addEventListener('click',()=>this.duplicate(n.id));
      moreActions.append(duplicate);
      actions.append(primary,tint,more);
      if(this.media&&!this.readOnly){
        const upload=document.createElement('input');upload.type='file';upload.hidden=true;
        upload.accept='image/png,image/jpeg,image/webp';
        const pick=document.createElement('button');pick.className='glass-button';pick.type='button';
        pick.textContent=n.imagePath?'Replace image':'+ image';
        pick.addEventListener('click',()=>upload.click());
        upload.addEventListener('change',async()=>{
          const file=upload.files?.[0];if(!file)return;
          pick.disabled=true;
          try{const path=await this.media.upload(file);if(this.disposed)return;
            n.imagePath=path;this.changed();this.render();this.notify('Private image attached.');
          }catch(error){this.notify(error.message,6500);}
          finally{pick.disabled=false;upload.value='';}
        });
        moreActions.append(pick,upload);
        if(n.imagePath){
          const detach=document.createElement('button');detach.className='glass-button subtle sticky-detach';
          detach.type='button';detach.textContent='Detach image';
          detach.setAttribute('aria-label','Detach image from sticky note without deleting private file');
          detach.addEventListener('click',()=>this.detachImage(n.id));moreActions.append(detach);
        }
      }
      const resizer=document.createElement('button');resizer.type='button';resizer.className='sticky-resizer';
      resizer.textContent='↘';resizer.title='Resize sticky note';resizer.disabled=this.readOnly;
      resizer.setAttribute('aria-label','Resize sticky note');
      resizer.addEventListener('pointerdown',e=>this.startDrag(e,n,article,'resize'));
      resizer.addEventListener('keydown',e=>{
        const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
        if(!delta||this.readOnly)return;e.preventDefault();e.stopPropagation();
        n.width=clamp(n.width+delta[0],220,5000);n.height=clamp(n.height+delta[1],160,5000);
        article.style.width=n.width+'px';article.style.height=n.height+'px';this.changed();
      });
      article.addEventListener('pointerdown',e=>e.stopPropagation());
      if(image){
        const attachment=document.createElement('div');attachment.className='sticky-attachment';
        attachment.append(image,image._orbitStatus);moreActions.append(attachment);
      }
      article.append(head,modeTabs,formatBar,editor,formatted,preview,inlineHost,actions,resizer);this.layer.append(article);
      if(editing&&mode==='write')editor.focus({preventScroll:true});
      if(editing&&mode==='canvas'){
        this.activeCanvas=mountInlineCanvas({host:inlineHost,scene:n.scene,media:this.media,
          notify:(...args)=>this.notify(...args),
          onSave:scene=>{n.scene=scene;return this.changed();},
          onDirty:dirty=>{article.dataset.dirty=String(dirty);},
        });
        this.activeCanvas.ready.catch(()=>{});
      }
    }
  }
  dispose(){this.disposed=true;this.activeCanvas?.dispose();this.activeCanvas=null;
    this.layer.remove();this.notes=[];}
}
