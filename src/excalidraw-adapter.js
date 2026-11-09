/** EX-00: a tested, framework-neutral seam for the official upstream React Excalidraw island.
 *
 * The existing ORBIT drawing model is .excalidraw v2 with files:{}.
 * This adapter intentionally stores only durable drawing data. Private binary
 * assets require the separately reviewed EX-02 storage/backup extension.
 *
 * This module contains NO React imports or browser side effects.
 */
import { emptyScene, normalizeScene } from './scene.js';

const MAX_ELEMENTS=400;
const BLOCKED_TYPES=new Set(['image','embeddable','iframe']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hexColor=value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
const safeUrl=href=>{
  if(typeof href!=='string'||href.length>1000)return false;
  let url;
  try{url=new URL(href);}catch{return false;}
  return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;
};
const sanitizeAppState=appState=>({
  viewBackgroundColor:hexColor(appState?.viewBackgroundColor)
    ? appState.viewBackgroundColor
    : emptyScene().appState.viewBackgroundColor,
});

function assertSceneSafety(elements,files){
  if(!Array.isArray(elements)||!object(files)||Object.keys(files).length)
    throw Error('Drawing scene cannot include embedded image files.');
  const ids=new Set();
  for(const item of elements){
    if(!object(item)||BLOCKED_TYPES.has(item.type))
      throw Error('Drawing scene contains unsupported binary images or remote embeds.');
    if(ids.has(item.id))throw Error('Duplicate drawing element ID.');
    ids.add(item.id);
    if(item.link&& !safeUrl(item.link))
      throw Error('Drawing scene contains an unsafe external link.');
  }
}

/** Data for official <Excalidraw initialData={...}/>; never hands it the live ORBIT object. */
export function createEmbeddedInitialData(savedScene){
  const normalized=normalizeScene(savedScene)||emptyScene();
  assertSceneSafety(normalized.elements,normalized.files);
  // The legacy native pen allows a single-pointer click: 0x0 with one point.
  // Upstream Excalidraw treats such strokes as invisible and drops them during
  // restoration. Expand the *clone* to a minimal visible dot, never mutate the
  // original saved scene. Otherwise merely opening the editor could erase it.
  const elements=structuredClone(normalized.elements).map(element=>{
    if(element.type!=='freedraw'||element.isDeleted||
       element.width!==0||element.height!==0||
       !Array.isArray(element.points)||element.points.length!==1)return element;
    const start=element.points[0];
    return {...element,width:4,height:4,
      points:[[start[0],start[1]],[start[0]+4,start[1]+4]],
      pressures:[0.5,0.5]};
  });
  return {
    elements,
    appState:sanitizeAppState(normalized.appState),
    files:{},
  };
}

/** From official onChange(elements, appState, files) at EXPLICIT Save time only.
 * No transient appState (collaborators, selections, dialogs, menus) enters storage.
 * A failed save leaves the previous drawing intact.
 */
export function captureEmbeddedScene(elements,appState,files){
  assertSceneSafety(elements,files);
  const visible=elements.filter(element=>element.isDeleted!==true);
  if(visible.length>MAX_ELEMENTS)throw Error('Drawing scene is larger than the supported 400 elements.');
  const draft={
    ...emptyScene(),
    elements:visible,
    appState:sanitizeAppState(appState),
    files:{},
  };
  return normalizeScene(draft);
}

/** Curated page themes; dark canvas only for intentionally dark themes. */
export function embeddedEditorTheme(themeId){
  return ['garden','graphite'].includes(themeId)?'dark':'light';
}

/** Until EX-02, image uploads and remote embeds cannot be persisted or backed up.
 * Keep built-in remote scene import/export actions hidden; ORBIT owns Save/Cancel.
 */
export const embeddedEditorOptions=Object.freeze({
  tools:Object.freeze({image:false}),
  canvasActions:Object.freeze({
    changeViewBackgroundColor:true,
    clearCanvas:true,
    loadScene:false,
    saveToActiveFile:false,
    export:false,
    saveAsImage:false,
    toggleTheme:false,
  }),
});
