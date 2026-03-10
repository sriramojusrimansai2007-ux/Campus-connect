document.getElementById('sendBtn').addEventListener('click', async ()=>{
  const ident = document.getElementById('identify').value.trim();
  const msg = document.getElementById('msg');
  if (!ident) { msg.textContent = 'Enter username or email'; return }
  msg.textContent = 'Sending...';
  try{
    const body = { };
    // if looks like email
    if (ident.includes('@')) body.email = ident; else body.username = ident;
    const r = await fetch('/api/forgot-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await r.json();
    if (j && j.success) {
      msg.textContent = 'If an account exists, a reset link was sent (or saved to outbox).';
    } else {
      msg.textContent = (j && j.message) || 'Error sending reset link';
    }
  }catch(e){ msg.textContent = 'Network error' }
});