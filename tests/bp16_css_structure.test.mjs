import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCssStructure} from '../scripts/check-css-structure.mjs';

test('BP-16 accepts nested CSS, strings, functions and comments',()=>{
  assert.equal(inspectCssStructure('/* { */ :root{ --name: "a}b"; color: rgb(2 3 4); } @media (min-width: 320px) {.a{color: var(--name);}}'),true);
});
test('BP-16 catches the exact BP-07 class of missing root brace',()=>{
  assert.throws(()=>inspectCssStructure(':root { --a: red;\n .button{color:red;}'),/Unclosed CSS \{/);
});
test('BP-16 catches mismatched closures, unclosed strings and comments',()=>{
  assert.throws(()=>inspectCssStructure('.x{ color: red; ]'),/mismatch/);
  assert.throws(()=>inspectCssStructure('.x{content:"hello;}'),/string is not closed/);
  assert.throws(()=>inspectCssStructure('.x{color:red;} /* bad'),/comment is not closed/);
});
