const MIN_QUERY = 2;

async function fetchColleges(q=''){
  const url = '/api/colleges' + (q ? ('?q=' + encodeURIComponent(q)) : '');
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch colleges');
    return resp.json();
  } catch (e) {
    console.error('Error fetching colleges:', e);
    return [];
  }
}

function renderList(colleges){
  const list = document.getElementById('list');
  const prompt = document.getElementById('prompt');
  
  if (!colleges || colleges.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px 20px;">No colleges found matching your search.</p>';
    prompt.style.display = 'none';
    return;
  }
  
  prompt.style.display = 'none';
  list.innerHTML = '';
  
  colleges.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';
    
    const courseTypes = (c.courseTypes && c.courseTypes.length) 
      ? c.courseTypes.join(', ') 
      : (c.courses ? c.courses.slice(0, 3).join(', ') : 'N/A');
    
    const avgPkg = (c.placements && c.placements.avgPackage) 
      ? `₹${c.placements.avgPackage}` 
      : 'N/A';
    
    const top = (c.placements && c.placements.topRecruiters) 
      ? c.placements.topRecruiters.slice(0, 3).join(', ') 
      : 'N/A';
    
    card.innerHTML = `
      <div class="card-head">
        <h3>#${c.rank} ${c.name}</h3>
        <div class="badges">
          <span class="badge">${c.type || 'Engineering'}</span>
        </div>
      </div>
      <div class="meta">📍 ${c.city || 'Telangana'}</div>
      <p class="small"><strong>📚 Programs:</strong> ${courseTypes}</p>
      <p class="small"><strong>💼 Avg Package:</strong> ${avgPkg}</p>
      <p class="small"><strong>🏢 Top Recruiters:</strong> ${top}</p>
      <p><a class="btn-link" href="/college/${c.rank}">View Full Profile</a></p>
    `;
    list.appendChild(card);
  });
}

async function doSearch(q){
  const list = document.getElementById('list');
  try {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) { dropdown.classList.remove('placeholder'); dropdown.innerHTML = '<div style="color:var(--text-light);padding:12px;">Searching...</div>'; dropdown.setAttribute('aria-hidden','false'); }
    const colleges = await fetchColleges(q);
    // Apply client-side filter (program type) if selected
    const filterEl = document.getElementById('search-filter');
    const filter = filterEl ? filterEl.value : 'all';
    const filtered = (colleges || []).filter(c => {
      if (!filter || filter === 'all') return true;
      const courses = (c.courses || []).join(' ').toLowerCase();
      const ct = (c.courseTypes || []).join(' ').toLowerCase();
      if (filter === 'be') return /b\.?(?:e|tech)|btech|b\.tech/.test(courses) || /undergraduate/.test(ct);
      if (filter === 'mtech') return /m\.?(?:tech|e)|mtech|m\.e/.test(courses) || /postgraduate/.test(ct);
      if (filter === 'mba') return /mba/.test(courses) || /management|business/.test(ct);
      return true;
    });
    renderSearchDropdown(filtered);
  } catch(e) {
    console.error('Search error:', e);
    const dropdown = document.getElementById('search-dropdown'); if (dropdown) { dropdown.classList.remove('placeholder'); dropdown.innerHTML = '<div style="color:var(--danger);padding:12px;">Error loading results</div>'; dropdown.setAttribute('aria-hidden','false'); }
  }
}

function debounce(fn, wait){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

const onInput = debounce((e) => {
  const q = e.target.value.trim();
  const prompt = document.getElementById('prompt');
  
  if (q.length < MIN_QUERY) {
    document.getElementById('list').innerHTML = '';
    prompt.style.display = 'block';
    return;
  }
  doSearch(q);
}, 400);

document.getElementById('search').addEventListener('input', onInput);

document.getElementById('refresh').addEventListener('click', () => {
  const searchInput = document.getElementById('search');
  searchInput.value = '';
  const filterEl = document.getElementById('search-filter'); if (filterEl) filterEl.value = 'all';
  searchInput.focus();
  document.getElementById('list').innerHTML = '';
  document.getElementById('prompt').style.display = 'block';
  const dropdown = document.getElementById('search-dropdown'); if (dropdown) { dropdown.innerHTML = 'Search results will appear here'; dropdown.classList.add('placeholder'); dropdown.setAttribute('aria-hidden','true'); }
});

document.getElementById('prompt').style.display = 'block';

async function renderTopList(){
  const container = document.getElementById('top-list');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--text-light);padding:12px;">Loading top colleges...</div>';
  try{
    const all = await fetchColleges('');
    if (!all || !all.length) { container.innerHTML = '<div style="color:var(--text-light);padding:12px;">No colleges available</div>'; return }
    const sorted = all.slice().sort((a,b)=> (a.rank||0) - (b.rank||0)).slice(0,20);
    container.innerHTML = '';
    sorted.forEach(c => {
      const row = document.createElement('div');
      row.className = 'top-list-row';
      row.setAttribute('role','listitem');

      const link = document.createElement('a');
      link.href = '/college/' + encodeURIComponent(c.rank);
      link.className = 'top-list-link';
      link.setAttribute('aria-label', `Open profile for ${c.name}`);
      link.textContent = `#${c.rank}  ${c.name}`;

      row.appendChild(link);
      container.appendChild(row);
    });
  }catch(e){
    console.error('Top list error', e);
    container.innerHTML = '<div style="color:var(--danger);padding:12px;">Failed to load top colleges</div>';
  }
}

renderTopList();

function renderSearchDropdown(colleges){
  const dropdown = document.getElementById('search-dropdown');
  if (!dropdown) return;
  if (!colleges || colleges.length === 0) {
    dropdown.innerHTML = '<div style="color:var(--text-light);padding:12px;">No matches</div>';
    dropdown.setAttribute('aria-hidden','false');
    return;
  }
  const items = colleges.slice(0,8);
  dropdown.innerHTML = '';
  items.forEach(c => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.setAttribute('role','option');
    item.setAttribute('tabindex','0');

    const rank = document.createElement('div'); rank.className = 'search-item-rank'; rank.textContent = `#${c.rank || '-'} `;
    const main = document.createElement('div'); main.className = 'search-item-main';
    const name = document.createElement('div'); name.className = 'search-item-name'; name.textContent = c.name;
    const meta = document.createElement('div'); meta.className = 'search-item-meta';
    const avg = (c.placements && c.placements.avgPackage) ? c.placements.avgPackage : 'N/A';
    meta.textContent = `${c.city || 'Telangana'} · Avg: ${avg}`;
    main.appendChild(name); main.appendChild(meta);

    const cta = document.createElement('a'); cta.className = 'search-item-cta'; cta.href = '/college/' + encodeURIComponent(c.rank); cta.textContent = 'View';

    item.appendChild(rank); item.appendChild(main); item.appendChild(cta);

    item.addEventListener('click', ()=>{ window.location.href = cta.href; });
    item.addEventListener('keydown', (ev)=>{ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); window.location.href = cta.href; } });

    dropdown.appendChild(item);
  });
  dropdown.setAttribute('aria-hidden','false');
  dropdown.classList.remove('placeholder');

  setTimeout(()=>{
    function onDocClick(e){
      const controls = document.querySelector('.controls');
      const dd = document.getElementById('search-dropdown');
      if (!controls.contains(e.target) && dd && !dd.contains(e.target)){
        dd.innerHTML = 'Search results will appear here'; dd.classList.add('placeholder'); dd.setAttribute('aria-hidden','true'); document.removeEventListener('click', onDocClick);
      }
    }
    document.addEventListener('click', onDocClick);
  }, 10);
}

const searchInput = document.getElementById('search');
if (searchInput){
  searchInput.addEventListener('input', onInput);
  searchInput.addEventListener('keydown', (e)=>{
    const dd = document.getElementById('search-dropdown'); if (!dd || dd.getAttribute('aria-hidden') === 'true') return;
    const focusable = Array.from(dd.querySelectorAll('.search-item'));
    if (!focusable.length) return;
    const idx = focusable.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); const next = focusable[(idx+1) < focusable.length ? idx+1 : 0]; next.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); const prev = focusable[(idx-1) >= 0 ? idx-1 : focusable.length-1]; prev.focus(); }
  });
}

// Re-run search when filter changes
const searchFilter = document.getElementById('search-filter');
if (searchFilter) {
  searchFilter.addEventListener('change', (e) => {
    const q = (document.getElementById('search').value || '').trim();
    if (q.length >= MIN_QUERY) doSearch(q);
  });
}

const btnBadges = document.getElementById('btn-badges');
const btnGrid = document.getElementById('btn-grid');

/* ================= AI CHAT WIDGET (injected on all pages) ================= */
(function initChatWidget(){
  function buildWidget(){
    if (document.getElementById('chat-widget')) return; // already present
    const container = document.createElement('div');
    container.id = 'chat-widget';
    container.innerHTML = `
      <button id="chat-toggle" aria-label="Open chat" title="Chat with Campus Connect">💬</button>
      <div id="chat-panel" aria-hidden="true">
        <div class="chat-header">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="chat-title">Campus Connect Assistant</div>
            <span id="chat-status" class="badge badge-amber" style="font-size:12px;padding:4px 8px;border-radius:999px;background:#f0b84d;color:#222">AI: Checking</span>
          </div>
          <button id="chat-close" aria-label="Close chat">✕</button>
        </div>
        <div class="chat-body" id="chat-body" role="log" aria-live="polite"></div>
        <form id="chat-form" class="chat-form">
          <input id="chat-input" type="text" placeholder="Ask about admissions, placements, colleges..." autocomplete="off" />
          <button type="submit" class="btn-cta">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(container);

    const toggle = document.getElementById('chat-toggle');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('chat-close');
    const statusBadge = document.getElementById('chat-status');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const body = document.getElementById('chat-body');

    function openPanel(){ panel.setAttribute('aria-hidden','false'); container.classList.add('open'); input.focus(); }
    function closePanel(){ panel.setAttribute('aria-hidden','true'); container.classList.remove('open'); toggle.focus(); }

    toggle.addEventListener('click', ()=>{ if (container.classList.contains('open')) closePanel(); else openPanel(); });
    closeBtn.addEventListener('click', closePanel);

    function appendMessage(text, who='bot'){
      const msg = document.createElement('div'); msg.className = 'chat-msg ' + (who === 'user' ? 'user' : 'bot');
      msg.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function escapeHtml(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    async function sendMessage(text){
      appendMessage(text, 'user');
      appendMessage('Typing...', 'bot');
      try{
        const resp = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ message: text }) });

        let replyText = 'Sorry, something went wrong.';
        if (resp.ok) {
          try {
            const json = await resp.json();
            replyText = (json && json.reply) ? json.reply : 'Sorry, something went wrong.';
          } catch(parseErr){
            replyText = 'Received invalid response from server.';
            console.error('Chat JSON parse error', parseErr);
          }
        } else {
          let serverBody = '';
          try { serverBody = await resp.text(); } catch(e){ /* ignore */ }
          replyText = `Server error ${resp.status}` + (serverBody ? `: ${serverBody}` : '');
          console.error('Chat API error', resp.status, serverBody);
        }

        // replace last bot "Typing..." with actual reply
        const bots = Array.from(body.querySelectorAll('.chat-msg.bot'));
        if (bots.length) bots[bots.length-1].querySelector('.chat-bubble').textContent = replyText;
      }catch(e){
        const bots = Array.from(body.querySelectorAll('.chat-msg.bot'));
        const msg = 'Failed to reach server: ' + (e && e.message ? e.message : String(e));
        if (bots.length) bots[bots.length-1].querySelector('.chat-bubble').textContent = msg;
        console.error('Chat fetch error', e);
      }
    }

    // Load chat config (shows whether OpenAI is enabled server-side)
    (async function loadChatConfig(){
      try{
        const r = await fetch('/api/chat/config');
        if (!r.ok) return;
        const j = await r.json();
        if (statusBadge) statusBadge.textContent = j.openai ? 'AI: Online' : 'AI: Local';
        if (statusBadge) statusBadge.className = j.openai ? 'badge badge-green' : 'badge badge-amber';
      }catch(e){ console.warn('Failed to load chat config', e); }
    })();

    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const val = input.value.trim();
      if (!val) return; input.value = '';
      sendMessage(val);
    });

    // welcome message
    setTimeout(()=>{ appendMessage('Hi — I can help you find colleges, deadlines, placements, and reviews. Ask me anything!', 'bot'); }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildWidget); else buildWidget();
})();
const btnRanked = document.getElementById('btn-ranked');
const topGrid = document.getElementById('top-grid');
const topList = document.getElementById('top-list');
const topRanked = document.getElementById('top-ranked');

async function renderTopGrid(){
  if (!topGrid) return;
  topGrid.innerHTML = '<div style="color:var(--text-light);padding:12px;">Loading grid...</div>';
  try{
    const all = await fetchColleges('');
    const sorted = all.slice().sort((a,b)=> (a.rank||0) - (b.rank||0)).slice(0,20);
    topGrid.innerHTML = '';
    sorted.forEach(c=>{
      const card = document.createElement('a');
      card.href = '/college/' + encodeURIComponent(c.rank);
      card.className = 'top-card';
      card.setAttribute('aria-label', c.name);
      const img = document.createElement('img');
      img.src = c.image || '/images/college-1.svg';
      img.alt = c.name + ' logo';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.setAttribute('width','160'); img.setAttribute('height','88');
      img.onerror = function(){ this.onerror=null; this.src = '/images/college-1.svg'; };
      const title = document.createElement('div');
      title.style.fontSize = '13px';
      title.style.fontWeight = '600';
      title.style.color = 'var(--primary-dark)';
      title.style.overflow = 'hidden';
      title.style.textOverflow = 'ellipsis';
      title.style.whiteSpace = 'nowrap';
      title.textContent = `${c.rank}. ${c.name}`;
      card.appendChild(img);
      card.appendChild(title);
      topGrid.appendChild(card);
    });
  }catch(e){
    console.error('Top grid error', e);
    topGrid.innerHTML = '<div style="color:var(--danger);padding:12px;">Failed to load grid</div>';
  }
}

if (btnBadges && btnGrid) {
  btnBadges.addEventListener('click', ()=>{
    btnBadges.classList.add('active'); btnBadges.setAttribute('aria-pressed','true');
    btnGrid.classList.remove('active'); btnGrid.setAttribute('aria-pressed','false');
    if (btnRanked) { btnRanked.classList.remove('active'); btnRanked.setAttribute('aria-pressed','false'); }
    topList.style.display = 'flex'; topGrid.style.display = 'none';
    if (topRanked) topRanked.style.display = 'none';
  });
  btnGrid.addEventListener('click', async ()=>{
    btnGrid.classList.add('active'); btnGrid.setAttribute('aria-pressed','true');
    btnBadges.classList.remove('active'); btnBadges.setAttribute('aria-pressed','false');
    if (btnRanked) { btnRanked.classList.remove('active'); btnRanked.setAttribute('aria-pressed','false'); }
    topList.style.display = 'none'; topGrid.style.display = 'grid';
    if (!topGrid.innerHTML || topGrid.innerHTML.indexOf('Loading')!==-1) await renderTopGrid();
  });
}

async function renderTopRankedList(){
  if (!topRanked) return;
  topRanked.innerHTML = '<div style="color:var(--text-light);padding:12px;">Loading ranked list...</div>';
  try{
    const all = await fetchColleges('');
    const sorted = all.slice().sort((a,b)=> (a.rank||0) - (b.rank||0)).slice(0,20);
    topRanked.innerHTML = '';
    sorted.forEach(c=>{
      const row = document.createElement('div');
      row.className = 'ranked-row';
      row.setAttribute('role','link');
      row.setAttribute('tabindex','0');
      row.setAttribute('aria-label', `Open profile for ${c.name}`);

      const targetHref = '/college/' + encodeURIComponent(c.rank);
      row.addEventListener('click', ()=> { window.location.href = targetHref; });
      row.addEventListener('keydown', (ev)=>{
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); window.location.href = targetHref; }
      });

      const rankCol = document.createElement('div'); rankCol.className = 'ranked-rank'; rankCol.textContent = `#${c.rank}`;
      const nameCol = document.createElement('div'); nameCol.className = 'ranked-name'; nameCol.textContent = c.name;
      const metaCol = document.createElement('div'); metaCol.className = 'ranked-meta'; metaCol.textContent = `${c.city || 'Telangana'} · ${c.type || 'Engineering'}`;

      const extraCol = document.createElement('div'); extraCol.className = 'ranked-extra';
      const avgPkg = (c.placements && c.placements.avgPackage) ? c.placements.avgPackage : 'N/A';
      const fees = c.annualFees || 'N/A';
      const cutoff = c.cutoff || '—';
      extraCol.textContent = `Avg: ${avgPkg} · Fees: ${fees} · Cutoff: ${cutoff}`;

      const ctaCol = document.createElement('div'); ctaCol.className = 'ranked-cta';
      const ctaLink = document.createElement('a'); ctaLink.href = targetHref; ctaLink.className = 'btn-link'; ctaLink.textContent = 'View profile';
      ctaCol.appendChild(ctaLink);

      row.appendChild(rankCol);
      row.appendChild(nameCol);
      row.appendChild(metaCol);
      row.appendChild(extraCol);
      row.appendChild(ctaCol);
      topRanked.appendChild(row);
    });
  }catch(e){ topRanked.innerHTML = '<div style="color:var(--danger);padding:12px;">Failed to load ranked list</div>'; }
}

if (btnRanked) {
  btnRanked.addEventListener('click', async ()=>{
    btnRanked.classList.add('active'); btnRanked.setAttribute('aria-pressed','true');
    if (btnBadges) { btnBadges.classList.remove('active'); btnBadges.setAttribute('aria-pressed','false'); }
    if (btnGrid) { btnGrid.classList.remove('active'); btnGrid.setAttribute('aria-pressed','false'); }
    topList.style.display = 'none'; topGrid.style.display = 'none';
    topRanked.style.display = 'block';
    if (!topRanked.innerHTML || topRanked.innerHTML.indexOf('Loading')!==-1) await renderTopRankedList();
  });
}

// Mask username for privacy
function maskUsername(username) {
  if (!username) return 'Anonymous';
  const parts = username.split('_');
  if (parts.length === 1) {
    return username.charAt(0) + '***' + username.slice(-1);
  }
  const firstName = parts[0];
  const masked = firstName.charAt(0) + '***' + (firstName.length > 1 ? firstName.slice(-1) : '');
  return masked;
}

// Calculate average review rating
function calculateAverageReviewRating(reviewRatings) {
  if (!reviewRatings || reviewRatings.length === 0) return 0;
  const sum = reviewRatings.reduce((acc, r) => acc + r, 0);
  return (sum / reviewRatings.length).toFixed(2);
}

// Render authenticity badge
function renderAuthenticityBadge(reviewId, reviewRatings) {
  if (!reviewRatings || reviewRatings.length === 0) {
    return `
      <div class="review-authenticity-badge">
        <div class="authenticity-score">-</div>
        <div class="authenticity-text">
          <div class="authenticity-label">No ratings yet</div>
          <div class="authenticity-stars">Be the first to rate this review</div>
        </div>
      </div>
    `;
  }
  
  const avgRating = calculateAverageReviewRating(reviewRatings);
  const stars = '★'.repeat(Math.floor(avgRating)) + (avgRating % 1 >= 0.5 ? '⭐' : '');
  const ratingCount = reviewRatings.length;
  
  let authenticity = 'Unverified';
  if (avgRating >= 4.5) authenticity = 'Verified Authentic';
  else if (avgRating >= 4) authenticity = 'Mostly Authentic';
  else if (avgRating >= 3) authenticity = 'Somewhat Authentic';
  else authenticity = 'Questionable';
  
  return `
    <div class="review-authenticity-badge">
      <div class="authenticity-score">${avgRating}</div>
      <div class="authenticity-text">
        <div class="authenticity-label">${authenticity}</div>
        <div class="authenticity-stars">${stars} (${ratingCount} ratings)</div>
      </div>
    </div>
  `;
}

// Render star rating input
function renderStarRatingInput(reviewId) {
  return `
    <div class="star-rating-input">
      <span class="star-rating-label">Is this review authentic?</span>
      <div class="star-rating-buttons">
        <button class="star-btn" data-review-id="${reviewId}" data-rating="1" title="Not authentic">★</button>
        <button class="star-btn" data-review-id="${reviewId}" data-rating="2" title="Somewhat authentic">★</button>
        <button class="star-btn" data-review-id="${reviewId}" data-rating="3" title="Authentic">★</button>
        <button class="star-btn" data-review-id="${reviewId}" data-rating="4" title="Very authentic">★</button>
        <button class="star-btn" data-review-id="${reviewId}" data-rating="5" title="Completely authentic">★</button>
      </div>
    </div>
  `;
}

// Load testimonials
async function loadTestimonials() {
  try {
    const resp = await fetch('/api/testimonials');
    if (!resp.ok) throw new Error('Failed to load testimonials');
    const testimonials = await resp.json();
    renderTestimonials(testimonials);
  } catch (e) {
    console.error('Error loading testimonials:', e);
  }
}

function calculateCollegeAverageRating(testimonials) {
  const collegeRatings = {};
  
  testimonials.forEach(t => {
    if (!collegeRatings[t.collegeRank]) {
      collegeRatings[t.collegeRank] = { ratings: [], reviews: [], college: t.collegeName };
    }
    collegeRatings[t.collegeRank].ratings.push(t.rating);
    collegeRatings[t.collegeRank].reviews.push({
      helpful: t.helpfulCount,
      total: t.totalRatings
    });
  });
  
  const result = {};
  Object.keys(collegeRatings).forEach(key => {
    const data = collegeRatings[key];
    const avgRating = (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(2);
    const totalHelpful = data.reviews.reduce((sum, r) => sum + r.helpful, 0);
    const totalVotes = data.reviews.reduce((sum, r) => sum + r.total, 0);
    const helpfulPercent = totalVotes > 0 ? Math.round((totalHelpful / totalVotes) * 100) : 0;
    
    result[key] = {
      college: data.college,
      avgRating: parseFloat(avgRating),
      reviewCount: data.ratings.length,
      helpfulPercent: helpfulPercent,
      totalHelpful: totalHelpful,
      totalVotes: totalVotes
    };
  });
  
  return result;
}

function renderCollegeRatingSummary(collegeRank, collegeStats) {
  if (!collegeStats || !collegeStats[collegeRank]) return '';
  
  const stats = collegeStats[collegeRank];
  const stars = '★'.repeat(Math.floor(stats.avgRating)) + (stats.avgRating % 1 >= 0.5 ? '⭐' : '');
  
  return `
    <div class="college-ratings-summary">
      <div class="rating-stat">
        <div class="rating-stat-value">${stats.avgRating}</div>
        <div class="rating-stat-stars">${stars}</div>
        <div class="rating-stat-label">College Rating</div>
      </div>
      <div class="rating-stat">
        <div class="rating-stat-value">${stats.reviewCount}</div>
        <div class="rating-stat-label">Total Reviews</div>
      </div>
      <div class="rating-stat">
        <div class="rating-stat-value">${stats.helpfulPercent}%</div>
        <div class="rating-stat-label">Found Helpful</div>
      </div>
    </div>
  `;
}

function renderTestimonials(testimonials) {
  const carousel = document.getElementById('testimonials-carousel');
  if (!carousel || !testimonials || testimonials.length === 0) return;
  
  carousel.innerHTML = '';
  
  const collegeGroups = {};
  testimonials.forEach(t => {
    if (!collegeGroups[t.collegeRank]) {
      collegeGroups[t.collegeRank] = { college: t.collegeName, reviews: [] };
    }
    collegeGroups[t.collegeRank].reviews.push(t);
  });
  
  const collegeStats = calculateCollegeAverageRating(testimonials);
  
  Object.keys(collegeGroups).forEach(rank => {
    const collegeGroup = collegeGroups[rank];
    
    const summaryHTML = renderCollegeRatingSummary(rank, collegeStats);
    if (summaryHTML) {
      const summaryDiv = document.createElement('div');
      summaryDiv.innerHTML = summaryHTML;
      carousel.appendChild(summaryDiv);
    }
    
    collegeGroup.reviews.forEach(t => {
      const card = document.createElement('div');
      card.className = 'testimonial-card';
      
      const maskedUsername = maskUsername(t.username);
      const initials = maskedUsername.split('')[0].toUpperCase();
      const stars = '★'.repeat(Math.floor(t.rating)) + (t.rating % 1 !== 0 ? '⭐' : '');
      const helpfulPercent = t.totalRatings > 0 ? Math.round((t.helpfulCount / t.totalRatings) * 100) : 0;
      
      const authenticityBadge = renderAuthenticityBadge(t.id, t.reviewRatings);
      const starRatingInput = renderStarRatingInput(t.id);
      
      card.innerHTML = `
        <div class="testimonial-header">
          <div class="testimonial-avatar">${initials}</div>
          <div class="testimonial-info">
            <h4><span class="masked-username">${maskedUsername}</span></h4>
            <div class="testimonial-college">${t.collegeName.split('(')[1]?.replace(')', '') || t.collegeName}</div>
            <div class="testimonial-meta">
              <span>${t.branch}</span> • <span>${t.year}</span>
            </div>
            <div class="testimonial-stars">${stars} ${t.rating}/5</div>
          </div>
        </div>
        <div class="testimonial-text">
          <span class="testimonial-quote-icon">"</span>
          ${t.text}
        </div>
        ${authenticityBadge}
        ${starRatingInput}
        <div class="testimonial-footer">
          <div class="review-helpfulness">
            <button class="helpful-btn" data-review-id="${t.id}" data-helpful="true" title="Mark as helpful">
              👍 Helpful
            </button>
            <button class="helpful-btn" data-review-id="${t.id}" data-helpful="false" title="Mark as not helpful">
              👎 Not
            </button>
            <span class="helpful-count"><span class="review-rating-percent">${helpfulPercent}%</span> (${t.helpfulCount}/${t.totalRatings})</span>
          </div>
        </div>
      `;
      carousel.appendChild(card);
    });
  });
  
  document.querySelectorAll('.helpful-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const reviewId = this.dataset.reviewId;
      const isHelpful = this.dataset.helpful === 'true';
      rateReview(reviewId, isHelpful);
    });
  });
  
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const reviewId = this.dataset.reviewId;
      const rating = parseInt(this.dataset.rating);
      rateReviewAuthenticity(reviewId, rating);
    });
  });
}

// Rate review as helpful
async function rateReview(reviewId, isHelpful) {
  try {
    const response = await fetch('/api/rate-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: parseInt(reviewId), isHelpful })
    });
    
    if (response.ok) {
      loadTestimonials();
    }
  } catch (e) {
    console.error('Error rating review:', e);
  }
}

// Rate review authenticity
async function rateReviewAuthenticity(reviewId, rating) {
  try {
    const response = await fetch('/api/rate-review-authenticity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: parseInt(reviewId), rating: rating })
    });
    
    if (response.ok) {
      loadTestimonials();
    }
  } catch (e) {
    console.error('Error rating review authenticity:', e);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadTestimonials();
});
