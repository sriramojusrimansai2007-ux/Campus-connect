const PAGE_SIZE = 10;
let collegesData = [];
let filtered = [];
let page = 1;

function parseLPA(val){
  if (!val) return 0;
  // examples: "22 LPA", "~₹2,00,000" (fees), handle only placements like '22 LPA'
  const m = String(val).match(/([0-9]+(\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function renderCard(c){
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start;">
      <img src="${c.image||'/images/college-1.svg'}" alt="${c.name}" loading="lazy" decoding="async" width="84" height="64" onerror="this.onerror=null;this.src='/images/college-1.svg'" style="width:84px;height:64px;object-fit:contain;border-radius:8px;border:1px solid var(--border);background:var(--bg-light)"/>
      <div style="flex:1;">
        <h3 style="margin:0;font-size:16px;">${c.rank}. ${c.name}</h3>
        <div class="meta">${c.city} · ${c.type}</div>
        <p class="small">Avg package: ${c.placements && c.placements.avgPackage ? c.placements.avgPackage : 'N/A'}</p>
        <p style="margin-top:8px;"><a class="btn-link" href="/college/${c.rank}">View profile</a></p>
      </div>
    </div>
  `;
  return card;
}

function renderPage(){
  const list = document.getElementById('all-list');
  list.innerHTML = '';
  const start = (page-1)*PAGE_SIZE;
  const slice = filtered.slice(start, start+PAGE_SIZE);
  slice.forEach(c=> list.appendChild(renderCard(c)));
  // pager
  const pager = document.getElementById('pager');
  pager.innerHTML = '';
  const total = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const prev = document.createElement('button'); prev.textContent='Prev'; prev.disabled = page<=1;
  const next = document.createElement('button'); next.textContent='Next'; next.disabled = page>=total;
  prev.addEventListener('click', ()=>{ page--; renderPage(); });
  next.addEventListener('click', ()=>{ page++; renderPage(); });
  pager.appendChild(prev);
  pager.appendChild(document.createTextNode(` Page ${page} / ${total} `));
  pager.appendChild(next);
}

function applyFilters(){
  const city = document.getElementById('filter-city').value;
  const fees = document.getElementById('filter-fees').value;
  const minpkg = parseFloat(document.getElementById('filter-minpkg').value) || 0;
  filtered = collegesData.filter(c=>{
    if (city && c.city && !c.city.toLowerCase().includes(city.toLowerCase())) return false;
    if (fees) {
      // parse annualFees rough: contains digits
      const feesStr = String(c.annualFees||'');
      const num = (feesStr.match(/([0-9,]+)/)||[])[1];
      const n = num ? parseInt(num.replace(/,/g,'')) : 0; // in rupees
      if (fees==='lt1' && !(n && n<=100000)) return false;
      if (fees==='1-2' && !(n && n>100000 && n<=200000)) return false;
      if (fees==='gt2' && !(n && n>200000)) return false;
    }
    if (minpkg){
      const pkg = parseLPA(c.placements && c.placements.avgPackage);
      if (pkg < minpkg) return false;
    }
    return true;
  });
  page = 1; renderPage();
}

async function init(){
  try{
    const resp = await fetch('/api/colleges');
    const all = await resp.json();
    collegesData = all.slice().sort((a,b)=> (a.rank||0)-(b.rank||0));
    // populate city filter
    const citySet = new Set();
    collegesData.forEach(c=> { if (c.city) citySet.add(c.city.split(',')[0].trim()); });
    const citySel = document.getElementById('filter-city');
    Array.from(citySet).sort().forEach(ct=> { const op = document.createElement('option'); op.value=ct; op.textContent=ct; citySel.appendChild(op); });
    filtered = collegesData.slice();
    renderPage();
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
  }catch(e){ console.error('All page init error', e); document.getElementById('all-list').innerHTML = '<p style="color:var(--danger)">Failed to load colleges</p>'; }
}

init();
