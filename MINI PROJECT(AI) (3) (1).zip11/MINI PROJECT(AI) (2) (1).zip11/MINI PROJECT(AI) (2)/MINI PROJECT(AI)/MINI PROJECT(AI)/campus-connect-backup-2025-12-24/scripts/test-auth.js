// Simple auth test script using global fetch (Node 18+)
(async ()=>{
  const base = 'http://localhost:3000';
  const username = 'testuser_' + Math.floor(Math.random()*10000);
  const password = 'pass1234';
  console.log('Testing signup for', username);
  try{
    let r = await fetch(base + '/api/signup', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
    let j = await r.json();
    console.log('/api/signup', r.status, j);
    console.log('Now testing login...');
    r = await fetch(base + '/api/login', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
    j = await r.json();
    console.log('/api/login', r.status, j);
  }catch(e){
    console.error('Error connecting to server:', e.message || e);
    process.exit(2);
  }
})();
