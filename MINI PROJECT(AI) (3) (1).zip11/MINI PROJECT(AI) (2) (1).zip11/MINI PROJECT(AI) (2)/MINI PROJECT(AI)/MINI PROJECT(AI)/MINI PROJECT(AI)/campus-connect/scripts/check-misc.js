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
    const colleges = JSON.parse(api.body);
    for(const c of colleges.slice(0,8)){
      const r = c.rank;
      const page = await get('/college/' + r);
      const hasPhdLink = page.body.includes('Ph.D') || page.body.includes('phd') || page.body.includes('Coming Soon');
      console.log(`${r}: ${c.name} — PhD label present? ${hasPhdLink}`);
      const mtech = await get('/college/' + r + '/course/mtech');
      console.log(`  mtech status: ${mtech.statusCode}`);
      const mba = await get('/college/' + r + '/course/mba');
      console.log(`  mba status: ${mba.statusCode}`);
    }
    console.log('Done');
  }catch(e){ console.error(e); process.exit(1);} 
})();
