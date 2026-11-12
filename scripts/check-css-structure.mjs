/**
 * BP-16: fail closed on unclosed CSS blocks, strings, comments or brackets.
 * ORBIT's BP-07 visual regression came from one forgotten closing brace.
 * This intentionally does not claim to be a complete CSS semantic validator.
 */
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

export function inspectCssStructure(source){
  const frames=[];let quote='',comment=false,escaped=false,line=1;
  for(let i=0;i<source.length;i++){
    const char=source[i],next=source[i+1];
    if(char==='\n')line++;
    if(comment){if(char==='*'&&next==='/'){comment=false;i++;}continue;}
    if(quote){
      if(escaped){escaped=false;continue;}
      if(char==='\\'){escaped=true;continue;}
      if(char===quote)quote='';
      continue;
    }
    if(char==='/'&&next==='*'){comment=true;i++;continue;}
    if(char==='"'||char==="'"){quote=char;continue;}
    if(char==='\\'){i++;continue;}
    if(char==='{'||char==='('||char==='['){frames.push({char,line});continue;}
    if(char==='}'||char===')'||char===']'){
      const expected=char==='}'?'{':char===')'?'(':'[';
      const last=frames.pop();
      if(!last||last.char!==expected)throw Error('CSS delimiter mismatch at line '+line+': '+char);
    }
  }
  if(comment)throw Error('CSS comment is not closed.');
  if(quote)throw Error('CSS string is not closed.');
  if(frames.length){const last=frames.at(-1);throw Error('Unclosed CSS '+last.char+' from line '+last.line);}
  return true;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const css=await readFile('src/styles.css','utf8');
  inspectCssStructure(css);
  console.log('CSS structure verified: balanced blocks, quotes, comments and delimiters.');
}
