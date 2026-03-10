// read token from querystring
function qs(name){
  const p = new URLSearchParams(window.location.search);
  return p.get(name);
}

const token = qs('token');
const msg = document.getElementById('msg');
if (!token) msg.textContent = 'Missing token in URL.';

document.getElementById('resetBtn').addEventListener('click', async ()=>{
  const p1 = document.getElementById('newpass').value;
  const p2 = document.getElementById('newpass2').value;
  if (!p1 || !p2) { msg.textContent = 'Enter and confirm your new password'; return }
  if (p1 !== p2) { msg.textContent = 'Passwords do not match'; return }
  msg.textContent = 'Resetting...';
  try{
    const r = await fetch('/api/reset-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token, newPassword: p1 }) });
    const j = await r.json();
    if (j && j.success) { msg.textContent = 'Password updated — you can now login.'; setTimeout(()=>{ location.href='/login' }, 1500); }
    else { msg.textContent = (j && j.message) || 'Error resetting password'; }
  }catch(e){ msg.textContent = 'Network error' }
});