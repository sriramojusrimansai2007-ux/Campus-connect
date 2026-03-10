async function loadProfile(){
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  const rank = parts.length >= 2 ? parts[1] : null;
  const container = document.getElementById('profile');
  
  if (!rank) { 
    container.innerHTML = '<p style="color: var(--danger);">Invalid college ID.</p>'; 
    return;
  }
  
  try{
    const resp = await fetch('/api/colleges/' + encodeURIComponent(rank));
    if (!resp.ok) { 
      container.innerHTML = '<p style="color: var(--danger);">College not found.</p>'; 
      return;
    }
    
    const c = await resp.json();
    const types = (c.courseTypes || []).join(', ');
    const avg = c.placements && c.placements.avgPackage ? `₹${c.placements.avgPackage}` : 'N/A';
    const top = c.placements && c.placements.topRecruiters ? c.placements.topRecruiters.slice(0, 4).join(', ') : 'N/A';
    const facilities = (c.facilities || []).join(', ');
    
    // Rich, animated profile layout
    container.innerHTML = `
      <div class="profile-hero">
        <div class="hero-left">
          <h2 class="profile-title">#${c.rank} ${c.name}</h2>
          <div class="profile-meta">📍 ${c.city || 'Telangana'} · ${c.type || 'Engineering College'}</div>
          <p class="profile-tagline">${c.tagline || c.description || 'An acclaimed institute with a legacy of excellence.'}</p>

          <div class="stat-cards">
            <div class="stat-card">
              <div class="stat-value">${c.students || c.studentCount || '—'}</div>
              <div class="stat-label">Students</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${(c.courses || []).length || '—'}</div>
              <div class="stat-label">Courses</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${avg}</div>
              <div class="stat-label">Avg Package</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${c.rating || 'N/A'}</div>
              <div class="stat-label">Rating</div>
            </div>
          </div>

          <div class="profile-cta">
            <a class="btn-primary" href="#apply">Apply Now</a>
            ${c.website ? `<a class="btn-outline" href="${c.website}" target="_blank" rel="noopener">Visit Site</a>` : ''}
            <a class="btn-ghost" href="#contact">Enquire</a>
          </div>
        </div>

        <div class="hero-right">
          <div class="profile-image-wrap">
            <img src="${c.image || '/images/college-1.svg'}" alt="${c.name}" class="college-image" />
          </div>
        </div>
      </div>

      <div class="profile-main">
        <div class="profile-grid">
          <div class="profile-content">
            <h3>About</h3>
            <p>${c.description || 'A premier engineering institution with strong academics and campus life.'}</p>

            <div class="quick-facts">
              <div><strong>Established:</strong> ${c.established || 'N/A'}</div>
              <div><strong>Accreditation:</strong> ${c.accreditation || 'N/A'}</div>
              <div><strong>Annual Intake:</strong> ${c.intake || 'N/A'}</div>
              <div><strong>Fees (ann.):</strong> ${c.annualFees || 'N/A'}</div>
            </div>

            <h3>Academic Programs</h3>
            <p><strong>Program Types:</strong> ${types || 'N/A'}</p>
            <p><strong>Popular Courses:</strong> ${(c.courses || []).slice(0, 8).join(', ') || 'N/A'}</p>

            <h3>Placements & Career</h3>
            <div class="placement-row">
              <div class="placement-left">
                <p><strong>Average Package:</strong> ${avg}</p>
                <p><strong>Top Recruiters:</strong> ${top}</p>
              </div>
              <div class="placement-right">
                <div class="placement-bar-wrap">
                  <div class="placement-bar" style="--pct: ${Math.min(100, (c.placements && c.placements.placementPercent) || 70)}%;"></div>
                </div>
                <div class="placement-note">Placement rate estimated from recent drives</div>
              </div>
            </div>

            <h3>Infrastructure & Facilities</h3>
            <p><strong>Facilities:</strong> ${facilities || 'N/A'}</p>
            <div class="facility-chips">
              ${(c.facilities || []).slice(0, 8).map(f => `<span class="feature-chip">${f}</span>`).join('')}
            </div>

            <h3 id="gallery">Campus Gallery</h3>
            <div class="gallery">
              ${(c.gallery || ['/images/college-1.svg','/images/college-2.svg']).slice(0,6).map(src => `
                <div class="gallery-item"><img src="${src}" alt="${c.name} photo"/></div>
              `).join('')}
            </div>

            <h3 id="contact">Contact & Location</h3>
            <p><strong>Address:</strong> ${c.address || 'N/A'}</p>
            <p><strong>Phone:</strong> ${c.phone || 'N/A'}</p>
            <div class="map-placeholder">Map preview not available in local preview</div>
          </div>

          <aside class="profile-side">
            <div class="card card-highlight">
              <h4>Admissions Info</h4>
              <p><strong>Application Deadline:</strong> ${c.admissionDeadline || 'TBD'}</p>
              <p><strong>Eligibility:</strong> ${c.eligibility || 'See official site'}</p>
              <a href="#apply" class="btn-primary full">Start Application</a>
            </div>

            <div class="card">
              <h4>Top Recruiters</h4>
              <p>${top}</p>
            </div>

            <div class="card">
              <h4>Quick Links</h4>
              <a class="btn-link" href="/all">Browse Similar Colleges</a>
            </div>
          </aside>
        </div>

        <!-- Reviews (existing logic wires this up) -->
      </div>
    `;
    
    // Comments section
    const commentsHtml = `
      <div class="review-section">
        <h3>⭐ Student Reviews & Feedback</h3>
        <div id="comments-list" style="margin: 20px 0;">Loading reviews...</div>
        
        <div id="comment-form" style="margin-top: 24px; padding: 20px; background: var(--bg-light); border-radius: var(--radius-lg);">
          <h4 style="margin-bottom: 14px; color: var(--primary-dark);">Share Your Experience</h4>
          
          <div class="form-group">
            <label for="comment-text">Your Review</label>
            <textarea id="comment-text" placeholder="Share your experience, insights, and feedback about this college..." rows="4"></textarea>
          </div>
          
          <div class="form-group">
            <label for="comment-rating">Rating</label>
            <select id="comment-rating" style="width: auto;">
              <option value="5">⭐⭐⭐⭐⭐ 5 - Excellent</option>
              <option value="4">⭐⭐⭐⭐ 4 - Very Good</option>
              <option value="3">⭐⭐⭐ 3 - Good</option>
              <option value="2">⭐⭐ 2 - Fair</option>
              <option value="1">⭐ 1 - Poor</option>
            </select>
          </div>
          
          <button id="submit-comment" class="btn-primary" style="width: auto; padding: 10px 24px;">Post Review</button>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', commentsHtml);
    
    // Load and wire comments
    const rankId = c.rank;
    
    async function loadComments(){
      const el = document.getElementById('comments-list');
      el.textContent = 'Loading reviews...';
      try {
        const r = await fetch(`/api/colleges/${encodeURIComponent(rankId)}/comments`);
        const list = await r.json();
        
        if (!list || list.length === 0) { 
          el.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 20px;">No reviews yet — be the first to share your experience!</p>'; 
          return;
        }
        
        el.innerHTML = list.map(cm => {
          const stars = '⭐'.repeat(cm.rating);
          const date = new Date(cm.createdAt).toLocaleDateString();
          return `
            <div class="card" style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div>
                  <strong style="color: var(--primary-dark);">${cm.username}</strong>
                  <div style="font-size: 13px; color: var(--text-light);">${date}</div>
                </div>
                <span style="color: var(--accent); font-size: 14px; font-weight: 600;">${stars} ${cm.rating}/5</span>
              </div>
              <p style="margin: 0; color: var(--text);">${cm.text}</p>
            </div>
          `;
        }).join('');
      } catch(e) { 
        console.error('Error loading comments:', e);
        el.innerHTML = '<p style="color: var(--danger);">Error loading reviews. Please try again.</p>';
      }
    }
    
    loadComments();
    
    document.getElementById('submit-comment').addEventListener('click', async () => {
      const text = document.getElementById('comment-text').value.trim();
      const rating = document.getElementById('comment-rating').value;
      
      if (!text) { 
        alert('Please enter a review before posting'); 
        return;
      }
      
      const token = localStorage.getItem('campus_token');
      const body = { text, rating };
      const headers = { 'Content-Type': 'application/json' };
      
      if (!token) {
        const uname = prompt('Enter your name or email to post as (optional):');
        if (uname) body.username = uname;
        else body.username = 'Anonymous Student';
      } else {
        headers['Authorization'] = 'Bearer ' + token;
      }
      
      try {
        const r = await fetch(`/api/colleges/${encodeURIComponent(rankId)}/comments`, { 
          method: 'POST', 
          headers, 
          body: JSON.stringify(body) 
        });
        const j = await r.json();
        
        if (j && j.success) {
          document.getElementById('comment-text').value = '';
          loadComments();
          alert('✓ Review posted successfully!');
        } else {
          alert((j && j.message) || 'Failed to post review. Please try again.');
        }
      } catch(e) { 
        console.error('Error posting comment:', e);
        alert('Error posting review. Please try again.');
      }
    });
  } catch(e) { 
    console.error('Error loading profile:', e);
    container.innerHTML = '<p style="color: var(--danger);">Error loading college profile. Please try again.</p>';
  }
}

loadProfile();
