/** EX-01: the only React island in ORBIT. No global React app.
 * This file is compiled to a separate, on-demand same-origin ESM chunk;
 * it must never be imported from the default bootstrap or sign-in shell.
 */
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Excalidraw} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

export function mountEmbeddedEditor(host,{initialData,onChange,theme='light',uiOptions}={}){
  if(!(host instanceof HTMLElement)||!initialData||typeof onChange!=='function')
    throw Error('A valid Excalidraw host and scene are required.');
  const root=createRoot(host);
  root.render(React.createElement(Excalidraw,{
    initialData,
    onChange,
    theme:theme==='dark'?'dark':'light',
    UIOptions:uiOptions,
    autoFocus:false,
    handleKeyboardGlobally:false,
    validateEmbeddable:()=>false,
    viewModeEnabled:false,
    zenModeEnabled:false,
  }));
  let disposed=false;
  return {dispose(){
    if(disposed)return;
    disposed=true;
    root.unmount();
  }};
}
