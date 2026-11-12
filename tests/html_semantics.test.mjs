import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditStaticHtmlSemantics} from '../scripts/check-html-semantics.mjs';

const shell=(body)=>`<!doctype html><html lang="en"><body><main>${body}</main></body></html>`;
const pass=(body)=>assert.deepEqual(auditStaticHtmlSemantics(shell(body)).errors,[]);
const fail=(body,code)=>assert.ok(auditStaticHtmlSemantics(shell(body)).errors.some(e=>e.code===code),`Expected ${code}`);

test('semantic baseline accepts native accessible controls and referenced descriptions',()=>{
  pass(`<label for="name">Name</label><input id="name" aria-describedby="help"><span id="help">Help</span><button type="button"><svg aria-hidden="true"></svg>Save</button><img src="x.png" alt="Diagram"><button type="button" aria-label="Close"><svg aria-hidden="true"></svg></button>`);
  pass(`<button type="button" title="Go home"><svg aria-hidden="true"></svg></button><div id="one"></div><span aria-labelledby="one"></span>`);
});

test('duplicate, empty and malformed IDs are rejected regardless of whitespace',()=>{
  fail(`<div id="same"></div><button id="same" type="button">Save</button>`,'duplicate-id');
  fail(`<div id=" "></div>`,'invalid-id');
  fail(`<div id="oops space"></div>`,'invalid-id');
});

test('broken ARIA and label references are rejected (not just syntax)',()=>{
  fail(`<button type="button" aria-describedby="missing">Open</button>`,'missing-reference');
  fail(`<button type="button" aria-controls="missing">Open</button>`,'missing-reference');
  fail(`<p aria-labelledby="first second"></p><div id="first"></div>`,'missing-reference');
  fail(`<label for="unknown">Name</label>`,'missing-reference');
  fail(`<button type="button" aria-expanded="maybe">More</button>`,'invalid-aria-value');
  fail(`<button type="button" aria-pressed="yes">More</button>`,'invalid-aria-value');
});

test('static buttons require explicit type and accessible name; images require alt',()=>{
  fail(`<button>Hi</button>`,'missing-button-type');
  fail(`<button type="button"><svg aria-hidden="true"><use href="#icon"/></svg></button>`,'unlabeled-button');
  fail(`<button type="button" aria-label=" "><svg aria-hidden="true"></svg></button>`,'empty-aria-label');
  fail(`<img src="x.png">`,'missing-alt');
  fail(`<iframe src="https://example.test"></iframe>`,'missing-frame-title');
});

test('ignore comments and quoted > in attributes; still reject unsafe blank-target links',()=>{
  pass(`<!-- <div id="dup"></div><div id="dup"></div> --><button type="button" aria-label="More > fewer">✓</button>`);
  fail(`<a href="javascript:alert(1)" target="_blank">Risk</a>`,'unsafe-link');
  fail(`<a href="https://example.test" target="_blank">External</a>`,'unsafe-link');
  pass(`<a href="https://example.test" target="_blank" rel="noopener noreferrer">External</a>`);
});

test('document must have a language, one main, and no aria-hidden focusables',()=>{
  const noLang=auditStaticHtmlSemantics('<html><body><main>Text</main></body></html>');
  assert.ok(noLang.errors.some(e=>e.code==='missing-language'));
  fail(`<main>Extra main</main>`,'multiple-main');
  fail(`<button type="button" aria-hidden="true">Hidden but focusable</button>`,'hidden-focusable');
});

test('checked-in ORBIT index preserves its static semantic contract',async()=>{
  const markup=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const result=auditStaticHtmlSemantics(markup);
  assert.deepEqual(result.errors,[]);
  assert.ok(result.summary.buttons>=40,'Button inventory must be exercised, not silently empty.');
  assert.ok(result.summary.references>=10,'Cross-reference inventory must be exercised.');
});
