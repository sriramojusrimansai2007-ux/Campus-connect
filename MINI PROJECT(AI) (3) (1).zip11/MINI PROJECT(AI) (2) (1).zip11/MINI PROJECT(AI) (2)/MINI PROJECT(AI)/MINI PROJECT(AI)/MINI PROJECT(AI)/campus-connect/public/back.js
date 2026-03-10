// Inject a small back button into every page. Uses history.back() when possible.
(function(){
  try{
    const btn = document.createElement('button');
    btn.className = 'back-btn';
    btn.setAttribute('aria-label','Go back');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      if (window.history && window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    });

    // Hide when explicitly on the homepage to avoid redundant control
    function updateVisibility(){
      const onHome = location.pathname === '/' || location.pathname === '' || location.pathname.toLowerCase().endsWith('index.html');
      if (onHome) btn.setAttribute('aria-hidden','true'); else btn.removeAttribute('aria-hidden');
    }

    document.addEventListener('DOMContentLoaded', ()=>{
      document.body.appendChild(btn);
      updateVisibility();
    });

    // In case SPA navigation updates path without reload
    window.addEventListener('popstate', updateVisibility);
    window.addEventListener('pushstate', updateVisibility);
  }catch(e){console.error('back button failed', e)}
})();
