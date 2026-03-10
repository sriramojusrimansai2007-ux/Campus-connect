document.getElementById('signupBtn').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim();
  const e = (document.getElementById('email') && document.getElementById('email').value.trim()) || '';
  const p = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  msg.textContent = '';
  
  if (!u || !p) { 
    msg.textContent = '⚠️ Username and password are required'; 
    return;
  }
  
  if (p.length < 6) {
    msg.textContent = '⚠️ Password must be at least 6 characters';
    return;
  }
  
  try {
    const payload = { username: u, password: p };
    if (e) payload.email = e;
    
    const resp = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await resp.json();
    
    if (resp.ok && data.success) {
      msg.textContent = '✓ Account created successfully! Redirecting to login...';
      setTimeout(() => window.location.href = '/login', 1500);
    } else {
      msg.textContent = '✗ ' + (data.message || 'Signup failed. Please try again.');
    }
  } catch(e) { 
    console.error('Signup error:', e);
    msg.textContent = '✗ Network error. Please try again.'; 
  }
});

