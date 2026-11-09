import { normalizeExtensions, renderScene, openSceneEditor } from './scene.js';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const randomId=()=>('note_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8));
export class StickyNotes {
  constructor({world,notes=[],readOnly=false,onChange=()=>{},getScale=()=>1,notify=()=>{},media=null}={}){
    this.world=world;this.readOnly=readOnly;this.onChange=onChange;this.getScale=getScale;this.media=media;
    this.notify=notify;this.disposed=false;this.notes=normalizeExtensions({notes}).notes;
    this.layer=document.createElement('div');this.layer.id='sticky-layer';this.layer.className='sticky-layer';
    this.layer.setAttribute('aria-label','Floating sticky notes');world.append(this.layer);this.render();
  }
  getNotes(){return structuredClone(this.notes);}
  setNotes(notes){if(this.disposed)return;this.notes=normalizeExtensions({notes}).notes;this.render();}
  changed(){if(this.disposed||this.readOnly)return;this.onChange(this.getNotes());}
  add(){
    if(this.readOnly||this.disposed||this.notes.length>=80)return false;
    const n=this.notes.length;
    const note={id:randomId(),title:'Untitled note',text:'',x:1510+(n%5)*42,y:1740+(n%5)*46,
      width:310,height:270,color:['sand','peach','lavender','mint'][n%4]};
    this.notes.push(note);this.render();this.changed();this.notify('Sticky note created. Drag its header to move it.');return true;
  }
  duplicate(id){
    if(this.readOnly||this.disposed||this.notes.length>=80)return false;
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
    if(this.readOnly||this.disposed)return;
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
    if(this.disposed||this.readOnly||e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    const startX=e.clientX,startY=e.clientY,initial={x:n.x,y:n.y,width:n.width,height:n.height};
    const target=e.currentTarget;target.setPointerCapture(e.pointerId);
    const move=event=>{
      const scale=clamp(Number(this.getScale())||1,.1,5);
      const dx=(event.clientX-startX)/scale,dy=(event.clientY-startY)/scale;
      if(mode==='move'){n.x=clamp(initial.x+dx,-5000,7500);n.y=clamp(initial.y+dy,-5000,7500);}
      else{n.width=clamp(initial.width+dx,220,850);n.height=clamp(initial.height+dy,160,850);}
      element.style.left=n.x+'px';element.style.top=n.y+'px';
      element.style.width=n.width+'px';element.style.height=n.height+'px';
    };
    const finish=()=>{
      target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);
      target.removeEventListener('pointercancel',finish);this.changed();
    };
    target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);
    target.addEventListener('pointercancel',finish);
  }
  render(){
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
      title.disabled=this.readOnly;title.addEventListener('change',()=>{n.title=title.value.slice(0,100);this.changed();});
      const remove=document.createElement('button');remove.type='button';remove.className='sticky-delete';
      remove.textContent='×';remove.title='Remove sticky note';remove.setAttribute('aria-label','Remove sticky note');
      remove.disabled=this.readOnly;remove.addEventListener('click',()=>this.remove(n.id));
      grip.disabled=this.readOnly;head.append(grip,title,remove);
      const editor=document.createElement('textarea');editor.className='sticky-body';editor.rows=5;
      editor.maxLength=6000;editor.value=n.text;editor.disabled=this.readOnly;
      editor.setAttribute('aria-label','Sticky note text');
      let timer=0;
      editor.addEventListener('input',()=>{
        n.text=editor.value.slice(0,6000);clearTimeout(timer);timer=setTimeout(()=>this.changed(),450);
      });
      editor.addEventListener('blur',()=>{clearTimeout(timer);this.changed();});
      const preview=document.createElement('div');preview.className='sticky-drawing';
      renderScene(n.scene,preview);
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
      const draw=document.createElement('button');draw.className='glass-button';draw.type='button';
      draw.textContent=n.scene?'Edit drawing':'Draw';draw.disabled=this.readOnly;
      draw.addEventListener('click',()=>openSceneEditor(n.scene,{title:'Drawing on '+n.title,notify:this.notify,
        onSave:scene=>{n.scene=scene;renderScene(scene,preview);draw.textContent='Edit drawing';this.changed();}}));
      const tint=document.createElement('select');tint.className='sticky-color';tint.disabled=this.readOnly;
      tint.setAttribute('aria-label','Sticky note color');
      for(const color of ['sand','peach','lavender','mint']){const option=document.createElement('option');option.value=color;option.textContent=color;tint.append(option);}
      tint.value=n.color;tint.addEventListener('change',()=>{article.classList.replace('sticky-'+n.color,'sticky-'+tint.value);n.color=tint.value;this.changed();});
      const duplicate=document.createElement('button');duplicate.className='glass-button sticky-duplicate';
      duplicate.type='button';duplicate.textContent='Copy';duplicate.title='Duplicate this note';
      duplicate.setAttribute('aria-label','Duplicate sticky note');
      duplicate.disabled=this.readOnly||this.notes.length>=80;
      duplicate.addEventListener('click',()=>this.duplicate(n.id));
      actions.append(draw,duplicate,tint);
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
        actions.append(pick,upload);
        if(n.imagePath){
          const detach=document.createElement('button');detach.className='glass-button subtle sticky-detach';
          detach.type='button';detach.textContent='Detach image';
          detach.setAttribute('aria-label','Detach image from sticky note without deleting private file');
          detach.addEventListener('click',()=>this.detachImage(n.id));actions.append(detach);
        }
      }
      const resizer=document.createElement('button');resizer.type='button';resizer.className='sticky-resizer';
      resizer.textContent='↘';resizer.title='Resize sticky note';resizer.disabled=this.readOnly;
      resizer.setAttribute('aria-label','Resize sticky note');
      resizer.addEventListener('pointerdown',e=>this.startDrag(e,n,article,'resize'));
      resizer.addEventListener('keydown',e=>{
        const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
        if(!delta||this.readOnly)return;e.preventDefault();e.stopPropagation();
        n.width=clamp(n.width+delta[0],220,850);n.height=clamp(n.height+delta[1],160,850);
        article.style.width=n.width+'px';article.style.height=n.height+'px';this.changed();
      });
      article.addEventListener('pointerdown',e=>e.stopPropagation());
      article.append(head,editor,preview);if(image)article.append(image,image._orbitStatus);article.append(actions,resizer);this.layer.append(article);
    }
  }
  dispose(){this.disposed=true;this.layer.remove();this.notes=[];}
}
