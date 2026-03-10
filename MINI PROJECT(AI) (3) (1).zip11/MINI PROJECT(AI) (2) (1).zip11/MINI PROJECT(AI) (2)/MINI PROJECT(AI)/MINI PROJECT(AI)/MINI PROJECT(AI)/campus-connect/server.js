const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Safety logging for uncaught errors (helps diagnose startup crashes)
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/colleges', (req, res) => {
  fs.readFile(path.join(__dirname, 'data', 'colleges.json'), 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read data' });
    let colleges = JSON.parse(data);
    const q = (req.query.q || '').toLowerCase();
    if (q) {
      colleges = colleges.filter(c => {
        const name = (c.name || '').toLowerCase();
        const city = (c.city || '').toLowerCase();
        const type = (c.type || '').toLowerCase();
        return name.includes(q) || city.includes(q) || type.includes(q);
      });
    }
    res.json(colleges);
  });
});

// Placements API: return placement details for a college (merges college-level and central placements file)
app.get('/api/placements/:rank', (req, res) => {
  const rank = String(req.params.rank);
  const placementsPath = path.join(__dirname, 'data', 'placements.json');
  readJSON(placementsPath, {}, (err, placements) => {
    // read college's own placements if available
    const collegesPath = path.join(__dirname, 'data', 'colleges.json');
    readJSON(collegesPath, [], (err2, colleges) => {
      const college = colleges.find(c => String(c.rank) === String(rank)) || {};
      const collegePlacements = college.placements || {};
      const central = placements[rank] || {};
      // merge: central has precedence for structured fields, fallback to collegePlacements
      const merged = Object.assign({}, collegePlacements, central);
      return res.json(merged);
    });
  });
});

// Single college by rank (uses rank as identifier)
app.get('/api/colleges/:rank', (req, res) => {
  fs.readFile(path.join(__dirname, 'data', 'colleges.json'), 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read data' });
    const colleges = JSON.parse(data);
    const rank = parseInt(req.params.rank, 10);
    const college = colleges.find(c => c.rank === rank);
    if (!college) return res.status(404).json({ error: 'College not found' });
    res.json(college);

  // API endpoint to get testimonials
  app.get('/api/testimonials', (req, res) => {
    fs.readFile(path.join(__dirname, 'data', 'testimonials.json'), 'utf8', (err, data) => {
      if (err) return res.status(500).json({ error: 'Failed to read testimonials' });
      try {
        const testimonials = JSON.parse(data);
        res.json(testimonials);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse testimonials' });
      }
    });
  });
  });
});

// Serve testimonials filtered by collegeRank
app.get('/api/colleges/:rank/testimonials', (req, res) => {
  const rank = Number(req.params.rank);
  fs.readFile(path.join(__dirname, 'data', 'testimonials.json'), 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read testimonials' });
    try{
      const list = JSON.parse(data || '[]');
      const filtered = list.filter(t => Number(t.collegeRank) === Number(rank));
      return res.json(filtered);
    } catch(e){ return res.status(500).json({ error: 'Failed to parse testimonials' }); }
  });
});

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'campus-demo-secret';

// Small helpers to read/write JSON files
function readJSON(filePath, defaultValue, cb) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return cb(null, defaultValue);
    try { return cb(null, JSON.parse(data)); } catch (e) { return cb(null, defaultValue); }
  });
}

function writeJSON(filePath, data, cb) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', cb || (()=>{}));
}

// Email sender: supports three modes
// 1) Real SMTP when SMTP_HOST set
// 2) Ethereal test account when USE_ETHEREAL=true
// 3) Fallback: write to data/outbox.json
let etherealTransporter = null;
async function ensureEthereal() {
  if (etherealTransporter) return etherealTransporter;
  const testAccount = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
  console.log('Ethereal test account ready:', testAccount.user);
  return etherealTransporter;
}

async function sendEmail(to, subject, text, html) {
  // 1) real SMTP
  if (process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: !!process.env.SMTP_SECURE,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      const info = await transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@campus-connect.local', to, subject, text, html });
      console.log('Email sent to', to, 'messageId=', info.messageId);
      return true;
    } catch (err) {
      console.error('SMTP send error', err);
    }
  }

  // 2) Ethereal (dev only if requested)
  if (process.env.USE_ETHEREAL === '1' || process.env.USE_ETHEREAL === 'true') {
    try {
      const t = await ensureEthereal();
      const info = await t.sendMail({ from: process.env.SMTP_FROM || 'no-reply@campus-connect.local', to, subject, text, html });
      const preview = nodemailer.getTestMessageUrl(info);
      console.log('Ethereal preview URL:', preview);
      // also save to outbox for consistency
      const outboxPath = path.join(__dirname, 'data', 'outbox.json');
      readJSON(outboxPath, [], (err, outbox) => {
        outbox.push({ to, subject, text, html, date: new Date().toISOString(), previewUrl: preview });
        writeJSON(outboxPath, outbox);
      });
      return true;
    } catch (err) {
      console.error('Ethereal send error', err);
    }
  }

  // 3) fallback: write to data/outbox.json
  const outboxPath = path.join(__dirname, 'data', 'outbox.json');
  readJSON(outboxPath, [], (err, outbox) => {
    outbox.push({ to, subject, text, html, date: new Date().toISOString() });
    writeJSON(outboxPath, outbox);
  });
  console.log('Email (fallback) saved to outbox for', to);
  return true;
}

// Login endpoint (uses bcrypt + JWT). Also migrates plaintext passwords on first successful login.
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, message: 'Missing credentials' });
  const usersPath = path.join(__dirname, 'data', 'users.json');
  fs.readFile(usersPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ success: false, message: 'User store read error' });
    let users = [];
    try { users = JSON.parse(data); } catch(e) { users = []; }
    const userIndex = users.findIndex(x => x.username === username);
    if (userIndex === -1) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const user = users[userIndex];
    const stored = user.password || '';
    const isHash = stored.startsWith('$2');
    if (isHash) {
      bcrypt.compare(password, stored, (err, ok) => {
        if (err) return res.status(500).json({ success: false, message: 'Auth error' });
        if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
        return res.json({ success: true, token });
      });
    } else {
      // plaintext stored (legacy) - validate then migrate to hashed password
      if (password !== stored) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      // migrate: hash and replace
      bcrypt.hash(password, 10, (err, hash) => {
        if (!err) {
          users[userIndex].password = hash;
          fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8', () => {});
        }
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
        return res.json({ success: true, token });
      });
    }
  });
});

// Signup endpoint: hash password before saving
app.post('/api/signup', (req, res) => {
  const { username, password, email } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, message: 'Missing username or password' });
  const usersPath = path.join(__dirname, 'data', 'users.json');
  fs.readFile(usersPath, 'utf8', (err, data) => {
    let users = [];
    if (!err) {
      try { users = JSON.parse(data); } catch(e) { users = []; }
    }
    if (users.find(u => u.username === username || (email && u.email === email))) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to hash password' });
      users.push({ username, password: hash, email: email || null });
      fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8', (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to save user' });
        // send welcome email (async, best-effort)
        const to = email || ((username && username.includes('@')) ? username : null);
        if (to) {
          sendEmail(to, 'Welcome to Campus Connect', `Hello ${username},\n\nYour account has been created.`, `<p>Hello ${username},</p><p>Your account has been created on Campus Connect.</p>`).catch(()=>{});
        }
        return res.json({ success: true, message: 'User created' });
      });
    });
  });
});

// Comments API: store comments per college rank in data/comments.json
app.get('/api/colleges/:rank/comments', (req, res) => {
  const rank = String(req.params.rank);
  const commentsPath = path.join(__dirname, 'data', 'comments.json');
  readJSON(commentsPath, {}, (err, comments) => {
    return res.json(comments[rank] || []);
  });
});

app.post('/api/colleges/:rank/comments', (req, res) => {
  const rank = String(req.params.rank);
  const { username, text, rating } = req.body || {};
  if (!text || (!username && !req.headers.authorization)) return res.status(400).json({ success: false, message: 'Missing comment text or username' });
  let author = username;
  // if Authorization header with Bearer token, try to decode username
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    try { const payload = jwt.verify(auth.slice(7), JWT_SECRET); if (payload && payload.username) author = payload.username; } catch(e) {}
  }
  const commentsPath = path.join(__dirname, 'data', 'comments.json');
  readJSON(commentsPath, {}, (err, comments) => {
    comments[rank] = comments[rank] || [];
    const id = crypto.randomBytes(8).toString('hex');
    const entry = { id, username: author || 'anonymous', text, rating: Number(rating) || 0, createdAt: new Date().toISOString() };
    comments[rank].push(entry);
    writeJSON(commentsPath, comments, () => {
      return res.json({ success: true, comment: entry });
    });
  });
});

// Forgot password: create reset token and email link (one-hour expiry)
app.post('/api/forgot-password', (req, res) => {
  const { username, email } = req.body || {};
  if (!username && !email) return res.status(400).json({ success: false, message: 'Provide username or email' });
  const usersPath = path.join(__dirname, 'data', 'users.json');
  readJSON(usersPath, [], (err, users) => {
    const user = users.find(u => (
      (username && (u.username === username || u.email === username)) ||
      (email && (u.username === email || u.email === email))
    ));
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const token = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour
    const resetsPath = path.join(__dirname, 'data', 'password_resets.json');
    readJSON(resetsPath, [], (err, resets) => {
      resets.push({ username: user.username, token, expires });
      writeJSON(resetsPath, resets, () => {
        const link = `${req.protocol}://${req.get('host')}/reset.html?token=${token}`;
        const to = (user.email) || (user.username && user.username.includes('@') ? user.username : null) || (email || null);
        if (to) sendEmail(to, 'Password reset for Campus Connect', `Use this link to reset your password: ${link}`, `<p>Use the link to reset your password: <a href="${link}">${link}</a></p>`).catch(()=>{});
        return res.json({ success: true, message: 'Reset token generated (email sent if address available)' });
      });
    });
  });
});
// Reset password using token
app.post('/api/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Missing token or newPassword' });
  const resetsPath = path.join(__dirname, 'data', 'password_resets.json');
  readJSON(resetsPath, [], (err, resets) => {
    const idx = resets.findIndex(r => r.token === token && r.expires > Date.now());
    if (idx === -1) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    const username = resets[idx].username;
    // remove token
    resets.splice(idx, 1);
    writeJSON(resetsPath, resets);
    // update user password
    const usersPath = path.join(__dirname, 'data', 'users.json');
    readJSON(usersPath, [], (err, users) => {
      const uidx = users.findIndex(u => u.username === username);
      if (uidx === -1) return res.status(404).json({ success: false, message: 'User not found' });
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) return res.status(500).json({ success: false, message: 'Hash error' });
        users[uidx].password = hash;
        writeJSON(usersPath, users, () => {
          return res.json({ success: true, message: 'Password updated' });
        });
      });
    });
  });
});

// Serve college detail page for /college/:rank
app.get('/college/:rank', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'college.html'));
});

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Serve about and contact pages
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Dev helper: view outbox (fallback emails) in browser when not in production
app.get('/dev/outbox', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).send('Not found');
  const outboxPath = path.join(__dirname, 'data', 'outbox.json');
  readJSON(outboxPath, [], (err, outbox) => {
    res.json(outbox);
  });
});

// Dev UI: simple HTML view of outbox items (for previewing saved emails)
app.get('/dev/outbox/view', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).send('Not found');
  const outboxPath = path.join(__dirname, 'data', 'outbox.json');
  readJSON(outboxPath, [], (err, outbox) => {
    const rows = (outbox || []).map((m, i) => `
      <article style="border:1px solid #ddd;padding:12px;margin:12px;border-radius:8px;">
        <div style="font-size:13px;color:#666">#${i+1} — ${m.date} — to: ${m.to}</div>
        <h3 style="margin:6px 0">${m.subject}</h3>
        <div style="margin:8px 0;padding:8px;background:#fff;border-radius:6px;">${m.html || '<pre>'+ (m.text||'') +'</pre>'}</div>
        ${m.previewUrl ? `<div><a href="${m.previewUrl}" target="_blank">Preview (Ethereal)</a></div>` : ''}
      </article>
    `).join('');
    res.send(`
      <html><head><title>Outbox</title><meta charset="utf-8"></head><body style="font-family:system-ui,Arial,Helvetica;background:#f6f7fb;padding:18px">
      <h2>Dev Outbox</h2>
      ${rows || '<p>No messages</p>'}
      </body></html>
    `);
  });
});

// API endpoint to rate reviews (mark as helpful/not helpful)
app.post('/api/rate-review', (req, res) => {
  const { reviewId, isHelpful } = req.body;
  
  if (typeof reviewId !== 'number' || typeof isHelpful !== 'boolean') {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }
  
  fs.readFile(path.join(__dirname, 'data', 'testimonials.json'), 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read testimonials' });
    
    try {
      const testimonials = JSON.parse(data);
      const review = testimonials.find(t => t.id === reviewId);
      
      if (!review) return res.status(404).json({ error: 'Review not found' });
      
      // Update counts
      if (isHelpful) {
        review.helpfulCount = (review.helpfulCount || 0) + 1;
      }
      review.totalRatings = (review.totalRatings || 0) + 1;
      
      // Write updated data back
      fs.writeFile(path.join(__dirname, 'data', 'testimonials.json'), JSON.stringify(testimonials, null, 2), 'utf8', (writeErr) => {
        if (writeErr) return res.status(500).json({ error: 'Failed to save rating' });
        res.json({ success: true, helpfulCount: review.helpfulCount, totalRatings: review.totalRatings });
      });
    } catch (parseErr) {
      return res.status(500).json({ error: 'Failed to parse testimonials' });
    }
  });
});

// API endpoint to rate review authenticity (1-5 stars)
app.post('/api/rate-review-authenticity', (req, res) => {
  const { reviewId, rating } = req.body;
  
  if (typeof reviewId !== 'number' || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }
  
  fs.readFile(path.join(__dirname, 'data', 'testimonials.json'), 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read testimonials' });
    
    try {
      const testimonials = JSON.parse(data);
      const review = testimonials.find(t => t.id === reviewId);
      
      if (!review) return res.status(404).json({ error: 'Review not found' });
      
      // Initialize reviewRatings array if it doesn't exist
      if (!Array.isArray(review.reviewRatings)) {
        review.reviewRatings = [];
      }
      
      // Add the new rating
      review.reviewRatings.push(rating);
      
      // Calculate average rating
      const avgRating = (review.reviewRatings.reduce((sum, r) => sum + r, 0) / review.reviewRatings.length).toFixed(2);
      
      // Write updated data back
      fs.writeFile(path.join(__dirname, 'data', 'testimonials.json'), JSON.stringify(testimonials, null, 2), 'utf8', (writeErr) => {
        if (writeErr) return res.status(500).json({ error: 'Failed to save rating' });
        res.json({ success: true, rating: rating, avgRating: avgRating, totalRatings: review.reviewRatings.length });
      });
    } catch (parseErr) {
      return res.status(500).json({ error: 'Failed to parse testimonials' });
    }
  });
});

// AI chat endpoint — uses OpenAI ChatGPT if API key set, else local fallback
// Quick health-check for chat
app.get('/api/chat/health', (req, res) => {
  return res.json({ ok: true, timestamp: Date.now() });
});

// Chat configuration: whether OpenAI is enabled (safe, no key returned)
app.get('/api/chat/config', (req, res) => {
  return res.json({ openai: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};
  console.log('Incoming chat request:', typeof message === 'string' ? (message.length>200?message.slice(0,200)+'...':message) : message);
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing message' });

  // Try OpenAI ChatGPT if API key available. If OpenAI is enabled but returns an error,
  // respond with 502 so clients can surface the problem (client may still show a fallback message).
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const payload = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful, knowledgeable AI assistant. Answer the user concisely and helpfully.' },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.6
      };

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!openaiResponse.ok) {
        const errData = await openaiResponse.text();
        console.error('OpenAI API error:', openaiResponse.status, errData);
        return res.status(502).json({ error: 'OpenAI API error', detail: errData.slice(0, 1000) });
      }

      const json = await openaiResponse.json();
      if (json && json.choices && json.choices[0] && json.choices[0].message) {
        const reply = json.choices[0].message.content.trim();
        return res.json({ reply });
      }

      console.error('OpenAI responded with unexpected body', JSON.stringify(json).slice(0, 1000));
      return res.status(502).json({ error: 'OpenAI unexpected response' });
    } catch (e) {
      console.error('OpenAI request failed:', e && e.message ? e.message : e);
      return res.status(502).json({ error: 'OpenAI request failed', detail: String(e && e.message ? e.message : e) });
    }
  }

  // Local fallback (general responses)
  const lc = message.toLowerCase();
  let reply = "I'm here to help! Ask me anything and I'll do my best to answer.";
  
  if (lc.includes('hello') || lc.includes('hi ') || lc.includes('hey')) {
    reply = 'Hello! I\'m an AI assistant ready to help you with any question. What would you like to know?';
  } else if (lc.includes('who are you') || lc.includes('what are you')) {
    reply = 'I\'m an AI assistant integrated into Campus Connect. I can answer questions on any topic - from education and careers to science, history, technology, and much more!';
  } else if (lc.includes('admission') || lc.includes('apply') || lc.includes('application')) {
    reply = 'To apply to engineering colleges, you typically need to appear in entrance exams like JEE Main, then follow the college\'s admission process. Would you like guidance on application deadlines or eligibility?';
  } else if (lc.includes('scholar') || lc.includes('scholarship')) {
    reply = 'Many colleges offer merit-based and need-based scholarships. Check each college\'s official website for details. What type of scholarship are you interested in?';
  } else if (lc.includes('placement') || lc.includes('package') || lc.includes('recruit') || lc.includes('salary')) {
    reply = 'Placement statistics vary year to year. I can show you average packages and top recruiters if you tell me which college or rank interests you.';
  } else if (lc.includes('recommend') || lc.includes('best') || lc.includes('top colleges')) {
    reply = 'I can recommend colleges based on your preferences. Tell me: your preferred city, budget range, branch of engineering, or your JEE rank?';
  } else if (lc.includes('help') || lc.includes('question')) {
    reply = 'I can help with any topic! Try asking me about: colleges, admissions, careers, science, history, technology, math, writing, coding, or anything else you\'re curious about.';
  } else if (lc.length < 10) {
    reply = 'Could you please ask a more complete question? I\'m ready to help with any topic!';
  } else {
    reply = 'That\'s a great question! I can help with topics like education, careers, science, technology, history, current events, and much more. Feel free to ask me anything!';
  }

  setTimeout(() => res.json({ reply }), 300 + Math.floor(Math.random() * 300));
});

// Course routes: serve course pages and specialization pages from /public/course/<slug>/
app.get('/course/:slug/:spec', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const spec = req.params.spec.toLowerCase();
  const file = path.join(__dirname, 'public', 'course', slug, `${spec}.html`);
  if (fs.existsSync(file)) return res.sendFile(file);
  return res.status(404).send('Specialization not found');
});

app.get('/course/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const indexFile = path.join(__dirname, 'public', 'course', slug, 'index.html');
  const altFile = path.join(__dirname, 'public', `${slug}.html`);
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  if (fs.existsSync(altFile)) return res.sendFile(altFile);
  return res.status(404).send('Course not found');
});

// Render a simple global BE/B.Tech page listing colleges and linking to their BE page
app.get('/course/be', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'colleges.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    const colleges = JSON.parse(raw || '[]');
    const rows = colleges.filter(c => (c.courses || []).some(x => /b\.?tech|b\.?(e|tech)/i.test(String(x)))).map(c => {
      const id = encodeURIComponent(c.rank);
      const fees = c.annualFees || 'N/A';
      const intake = c.intake || 'N/A';
      const naac = c.naac || (c.accreditation || 'N/A');
      return `<li style="margin:10px 0;padding:10px;border:1px solid #eee;border-radius:6px;list-style:none;">
        <a href="/college/${id}/course/be" style="font-weight:600;color:#0a58ca;text-decoration:none;">#${c.rank} ${c.name}</a>
        <div style="font-size:13px;color:#555;margin-top:6px">City: ${c.city || 'N/A'} · Fees (ann.): ${fees} · Intake: ${intake} · NAAC: ${naac}</div>
      </li>`;
    }).join('\n');

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BE / B.Tech — Campus Connect</title><link rel="stylesheet" href="/styles.css"></head><body><main style="max-width:900px;margin:24px auto;padding:12px"><a href="/" class="btn-link">← Home</a><h1>BE / B.Tech — Colleges</h1><p>Click a college to view simple BE details.</p><ul style="padding:0;margin:12px 0">${rows}</ul></main></body></html>`;
    return res.send(html);
  } catch (e) {
    console.error('Error rendering /course/be', e);
    return res.status(500).send('Server error');
  }
});

// Dynamic per-college BE page (simple details)
app.get('/college/:collegeId/course/be', (req, res) => {
  try {
    const id = req.params.collegeId;
    const dataPath = path.join(__dirname, 'data', 'colleges.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    const colleges = JSON.parse(raw || '[]');
    const college = colleges.find(c => String(c.rank) === String(id));
    if (!college) return res.status(404).send('College not found');

    const name = college.name || 'College';
    const city = college.city || 'N/A';
    const fees = college.annualFees || 'N/A';
    const intake = college.intake || 'N/A';
    const naac = college.naac || college.accreditation || 'N/A';
    const nba = college.nba || 'N/A';
    const desc = college.description || '';
    const img = college.image || '/images/college-1.svg';

    const beSpecializations = (college.subCourses && (college.subCourses.be || college.subCourses['btech'] || college.subCourses['b.tech'])) || [];
    const specsHtml = (Array.isArray(beSpecializations) ? beSpecializations : Object.values(beSpecializations || {})).slice(0,10).map(s => `<li>${s}</li>`).join('') || '<li>Details not available</li>';

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BE — ${name}</title><link rel="stylesheet" href="/styles.css"></head><body><main style="max-width:760px;margin:20px auto;padding:12px"><a href="/course/be" class="btn-link">← Back to BE list</a><h1>${name}</h1><div style="display:flex;gap:16px;align-items:flex-start;margin-top:8px"><img src="${img}" alt="${name}" style="width:180px;height:auto;border-radius:6px;border:1px solid #ddd" onerror="this.src='/images/college-1.svg'"/><div><p style="margin:0;color:#444">${desc}</p><p style="margin:6px 0;font-size:14px;color:#333"><strong>City:</strong> ${city} · <strong>Fees (ann.):</strong> ${fees} · <strong>Intake:</strong> ${intake}</p><p style="margin:6px 0"><strong>Accreditations:</strong> NAAC: ${naac} · NBA: ${nba}</p></div></div><section style="margin-top:18px"><h2>BE / B.Tech: Specializations</h2><ul>${specsHtml}</ul></section><section style="margin-top:18px"><h2>Contact</h2><div>${college.website ? `<a href="${college.website}" target="_blank" rel="noopener">Official website</a>` : 'N/A'} · ${college.phone || ''} · ${college.email || ''}</div></section></main></body></html>`;
    return res.send(html);
  } catch (e) {
    console.error('Error rendering college BE page', e);
    return res.status(500).send('Server error');
  }
});

// College-scoped course routes (dynamic, scalable)
app.get('/college/:collegeId/course/:slug/:spec', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const spec = req.params.spec.toLowerCase();
  const file = path.join(__dirname, 'public', 'course', slug, `${spec}.html`);
  if (fs.existsSync(file)) return res.sendFile(file);
  return res.status(404).send('Specialization not found');
});

app.get('/college/:collegeId/course/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const indexFile = path.join(__dirname, 'public', 'course', slug, 'index.html');
  const altFile = path.join(__dirname, 'public', `${slug}.html`);
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  if (fs.existsSync(altFile)) return res.sendFile(altFile);
  return res.status(404).send('Course not found');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Campus Connect server listening on http://localhost:${PORT}`);
});
