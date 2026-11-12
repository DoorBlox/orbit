import test from 'node:test';
import assert from 'node:assert/strict';
import {exportTasksIcs} from '../src/dates.js';
const base={id:'task-01',title:'Plan, write; review\\then\npublish',dueDate:'2026-11-12',
  status:'ready',description:'À bientôt 🎨\nReview the draft.'};

test('BP-14 exports all-day civil dates, stable UID, escaping and CRLF',()=>{
  const {content,count}=exportTasksIcs([base],{generatedAt:new Date('2026-11-12T06:00:00Z')});
  assert.equal(count,1);
  assert.match(content,/DTSTART;VALUE=DATE:20261112\r\nDTEND;VALUE=DATE:20261113\r\n/);
  assert.match(content,/DTSTAMP:20261112T060000Z/);
  assert.match(content,/UID:task-01@orbit.starscene.com/);
  assert.match(content,/SUMMARY:Plan\\, write\\; review\\\\then\\npublish/);
  assert.ok(content.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!content.replace(/\r\n/g,'').includes('\r'));
});
test('BP-14 excludes completed and undated tasks without mutating inputs',()=>{
  const tasks=[base,{...base,id:'task-02',status:'completed'},{...base,id:'task-03',dueDate:''},base];
  const before=structuredClone(tasks);
  assert.equal(exportTasksIcs(tasks).count,1);
  assert.deepEqual(tasks,before);
});
test('BP-14 escapes injection and folds by UTF-8 octets',()=>{
  const payload={...base,title:'🎨'.repeat(50)+'\nBEGIN:VEVENT'};
  const {content}=exportTasksIcs([payload]);
  assert.equal((content.match(/^BEGIN:VEVENT\r?$/gm)||[]).length,1);
  for(const line of content.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75);
  assert.ok(content.includes('\\nBEGIN:VEVENT'));
});
test('BP-14 supports leap day and year rollover, rejects an invalid timestamp',()=>{
  const a=exportTasksIcs([{...base,dueDate:'2024-02-29'}]).content;
  assert.match(a,/DTEND;VALUE=DATE:20240301/);
  const b=exportTasksIcs([{...base,dueDate:'2026-12-31'}]).content;
  assert.match(b,/DTEND;VALUE=DATE:20270101/);
  assert.throws(()=>exportTasksIcs([base],{generatedAt:new Date(NaN)}),/Invalid export timestamp/);
});
