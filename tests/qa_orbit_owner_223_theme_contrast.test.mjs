import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// W6 #223 CSS token-level AA contrast only. This does not replace a
// rendered screenshot / transparency / focus / clipped-text browser audit.
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const names=['parchment','garden','frost','celestial','ember',
  'tidepool','sundown','sakura','graphite','linen'];
const tokens=new Map();
for(const block of css.matchAll(/:root\[data-theme="([^"]+)"\]\s*\{([^}]*)\}/g)){
  const values={...(tokens.get(block[1])||{})};
  for(const property of block[2].matchAll(/(--[a-z-]+)\s*:\s*([^;]+);?/g))
    values[property[1]]=property[2].trim();
  tokens.set(block[1],values);
}
const luminance=color=>{
  assert.match(color??'',/^#[0-9a-fA-F]{6}$/,'Expected concrete opaque theme hex color');
  const srgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
  return srgb.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4)
    .reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
};
const contrast=(a,b)=>{
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};
const pairs=[
  ['--orbit-widget-ink','--orbit-widget-surface','Widget text'],
  ['--orbit-chrome-ink','--orbit-chrome','Control text'],
  ['--orbit-paper-ink','--orbit-paper','Journal text'],
  ['--orbit-caption','--orbit-widget-surface','Widget caption'],
  ['--orbit-sky','--orbit-accent','Selected theme text'],
];

test('W6 #223: all ten documented spatial themes have complete opaque AA test tokens',()=>{
  assert.deepEqual(names.filter(name=>!tokens.has(name)),[]);
  for(const name of names){
    const current=tokens.get(name);
    for(const [foreground,background] of pairs){
      assert.ok(current[foreground]&&current[background],
        name+': missing '+foreground+' or '+background);
      luminance(current[foreground]);luminance(current[background]);
    }
  }
});
for(const name of names){
  test('W6 #223: '+name+' normal text theme token pairs meet 4.5:1 AA',()=>{
    const current=tokens.get(name);
    assert.ok(current,'Missing theme '+name);
    for(const [foreground,background,label] of pairs){
      const ratio=contrast(current[foreground],current[background]);
      assert.ok(ratio>=4.5,
        name+': '+label+' contrast '+ratio.toFixed(2)+
          ' < 4.5:1: '+foreground+' against '+background);
    }
  });
}
