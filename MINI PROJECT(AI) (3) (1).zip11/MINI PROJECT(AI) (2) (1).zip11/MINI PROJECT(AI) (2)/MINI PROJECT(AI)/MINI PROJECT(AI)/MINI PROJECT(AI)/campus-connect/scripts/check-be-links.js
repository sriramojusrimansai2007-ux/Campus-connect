const http = require('http');

function get(path){
  return new Promise((resolve, reject) => {
    const options = { hostname: 'localhost', port: 3000, path, method: 'GET' };
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async function(){
  try{
    const api = await get('/api/colleges');
    if (api.statusCode !== 200) { console.error('Failed to fetch colleges:', api.statusCode); process.exit(1); }
    const colleges = JSON.parse(api.body);
    const problems = [];
      for (const c of colleges){
        const rank = c.rank;
        const courses = c.courses || [];
        const hasBE = courses.some(s => /\b(b\.?e|b\.?tech|btech|b\.e|b\.tech)\b/i.test(String(s)));
        let coursePageRes = { statusCode: 404 };
        if (hasBE) {
          // Request the college-scoped course landing page to ensure it exists server-side
          coursePageRes = await get('/college/' + encodeURIComponent(rank) + '/course/be');
        }
        const pageOk = coursePageRes && coursePageRes.statusCode && coursePageRes.statusCode === 200;
        console.log(`${rank}: ${c.name} — BE offered: ${hasBE} — course page OK: ${pageOk} (status ${coursePageRes.statusCode})`);
        if (hasBE && !pageOk) problems.push(`${rank} ${c.name} — offers BE but course page returned ${coursePageRes.statusCode}`);
        if (!hasBE && pageOk) problems.push(`${rank} ${c.name} — no BE but course page exists`);
    }
    if (problems.length){
      console.error('\nPROBLEMS:');
      problems.forEach(p => console.error('- ' + p));
      process.exit(2);
    }
    console.log('\nAll colleges OK: B.E links are present where expected.');
    process.exit(0);
  }catch(err){
    console.error('Error during checks:', err);
    process.exit(1);
  }
})();
