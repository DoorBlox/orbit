// All ORBIT civil dates use the journal's existing Asia/Jakarta day boundary.
export const DAY_MS = 86_400_000;
export const ORBIT_TIMEZONE = 'Asia/Jakarta';
const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ORBIT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function civilTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return NaN;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day ? date.getTime() : NaN;
}

export const validDateKey = value => Number.isFinite(civilTimestamp(value));

export function todayKey(now = new Date()) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year.padStart(4,'0')}-${parts.month}-${parts.day}`;
}

// V5 backups contain ISO timestamps; V6 stores civil YYYY-MM-DD strings.
export function dateKey(value, now = new Date()) {
  const text = String(value || '');
  if (validDateKey(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}/.test(text) && !validDateKey(text.slice(0, 10))) return todayKey(now);
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? todayKey(new Date(timestamp)) : todayKey(now);
}

export function addCivilDays(value, amount) {
  const timestamp = civilTimestamp(value);
  if (!Number.isFinite(timestamp) || !Number.isInteger(amount)) return '';
  const date = new Date(timestamp + amount * DAY_MS);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return '';
  return date.toISOString().slice(0, 10);
}

export function dateLabel(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  const timestamp = civilTimestamp(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(timestamp)
    : '';
}


/** BP-14: private, client-only RFC 5545 all-day task deadlines. */
const icsEscape = value => String(value??'').replace(/\\/g,'\\\\')
  .replace(/\r\n?|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const icsDate = value => value.replace(/-/g,'');
const icsStamp = date => {
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw Error('Invalid export timestamp.');
  return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
};
// RFC 5545 folds UTF-8 content lines at 75 octets, counting continuation spaces.
function icsFold(line){
  const output=[];let current='',bytes=0;
  for(const ch of line){
    const code=ch.codePointAt(0),length=code<128?1:code<2048?2:code<65536?3:4;
    if(bytes+length>75){output.push(current);current=' ';bytes=1;}
    current+=ch;bytes+=length;
  }
  output.push(current);return output.join('\r\n');
}
export function exportTasksIcs(tasks,{generatedAt=new Date()}={}){
  if(!Array.isArray(tasks)||tasks.length>10000)throw Error('Too many tasks to export.');
  const stamp=icsStamp(generatedAt);
  const entries=[];const seen=new Set();
  for(const task of tasks){
    if(!task||typeof task!=='object'||!validDateKey(task.dueDate)||task.status==='completed'||task.status==='parked')continue;
    const id=String(task.id||'');
    if(!/^[A-Za-z0-9_-]{1,140}$/.test(id)||seen.has(id))continue;
    seen.add(id);
    const end=addCivilDays(task.dueDate,1);
    if(!end)continue;
    const title=String(task.title||'').trim().slice(0,180);
    if(!title)continue;
    const description=['ORBIT task',task.status?'Status: '+String(task.status).slice(0,32):'',
      task.description?String(task.description).slice(0,3000):''].filter(Boolean).join('\n');
    entries.push('BEGIN:VEVENT','UID:'+id+'@orbit.starscene.com','DTSTAMP:'+stamp,
      'DTSTART;VALUE=DATE:'+icsDate(task.dueDate),'DTEND;VALUE=DATE:'+icsDate(end),
      'SUMMARY:'+icsEscape(title),'DESCRIPTION:'+icsEscape(description),'END:VEVENT');
  }
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ORBIT//Private Deadline Export//EN',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:ORBIT task deadlines',...entries,'END:VCALENDAR'];
  return {content:lines.map(icsFold).join('\r\n')+'\r\n',count:entries.filter(v=>v==='BEGIN:VEVENT').length};
}
