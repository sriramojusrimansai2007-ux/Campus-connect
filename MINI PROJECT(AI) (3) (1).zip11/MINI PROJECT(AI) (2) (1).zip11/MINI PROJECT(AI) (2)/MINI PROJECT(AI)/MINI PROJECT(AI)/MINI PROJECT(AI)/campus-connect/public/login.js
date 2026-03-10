document.getElementById('loginBtn').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  msg.textContent = '';
  
  if (!u || !p) { 
    msg.textContent = '⚠️ Please enter username and password'; 
    return;
  }
  
  try {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    
    const data = await resp.json();
    
    if (resp.ok && data.success) {
      localStorage.setItem('campus_token', data.token);
      msg.textContent = '✓ Login successful! Redirecting...';
      msg.style.color = 'var(--success)';
      setTimeout(() => window.location.href = '/', 1000);
    } else {
      msg.textContent = '✗ ' + (data.message || 'Login failed. Please check your credentials.');
      msg.style.color = 'var(--danger)';
    }
  } catch(e) { 
    console.error('Login error:', e);
    msg.textContent = '✗ Network error. Please try again.'; 
    msg.style.color = 'var(--danger)';
  }
});

