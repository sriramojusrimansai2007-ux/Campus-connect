const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'colleges.json');
const outPath = path.join(__dirname, '..', 'data', 'course-audit.md');

let raw = fs.readFileSync(dataPath, 'utf8');
let colleges = [];
try { colleges = JSON.parse(raw); } catch(e){ console.error('Failed to parse colleges.json', e); process.exit(1); }

function has(col, regex){
  const cs = (col.courses || []).join(' ').toLowerCase();
  const ct = (col.courseTypes || []).join(' ').toLowerCase();
  return regex.test(cs) || regex.test(ct);
}

const rows = [];
rows.push('# Course Audit Report');
rows.push('Generated: ' + new Date().toISOString());
rows.push('');
rows.push('| Rank | College | B.E / B.Tech | M.Tech / M.E | MBA | PhD | Notes |');
rows.push('|---:|---|:--:|:--:|:--:|:--:|---|');

colleges.forEach(c => {
  const be = has(c, /\b(b\.?e|b\.?tech|btech|b\.tech)\b/);
  const mtech = has(c, /\b(m\.?tech|mtech|m\.?e|m\.e)\b/);
  const mba = has(c, /\bmba\b/);
  const phd = has(c, /ph\.?d|phd|ph\.d/);
  const notes = [];
  // Normalize some obvious missing cases
  if (!be && !mtech && !mba && !phd) notes.push('No program tags');
  rows.push(`| ${c.rank || ''} | ${c.name.replace(/\|/g,'')} | ${be ? '✅' : '—'} | ${mtech ? '✅' : '—'} | ${mba ? '✅' : '—'} | ${phd ? '✅' : '—'} | ${notes.join('; ') || ''} |`);
});

fs.writeFileSync(outPath, rows.join('\n'), 'utf8');
console.log('Wrote', outPath);
