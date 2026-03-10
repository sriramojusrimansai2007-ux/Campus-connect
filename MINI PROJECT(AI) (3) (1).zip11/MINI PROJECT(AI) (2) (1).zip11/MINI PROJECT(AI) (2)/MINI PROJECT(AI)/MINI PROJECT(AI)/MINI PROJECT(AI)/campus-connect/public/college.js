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
    
    // No hard-coded college-specific logic — keep subtitles plain
    const wrapSubtitle = (text) => text;
    
    // Rich, animated profile layout
    container.innerHTML = `
      <div class="profile-hero">
        <div class="hero-left">
          <h2 class="profile-title">#${c.rank} ${c.name}</h2>
          <div class="profile-meta">📍 ${c.city || 'Telangana'} · ${c.type || 'Engineering College'}</div>
          <div class="accreditation-badges" style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${(() => {
              const badges = [];
              // Explicit fields (preferred)
              if (c.nba) badges.push(`<span class="badge" title="NBA Accreditation">NBA: ${c.nba}</span>`);
              if (c.naac) badges.push(`<span class="badge" title="NAAC Accreditation">NAAC: ${c.naac}</span>`);
              // Fallback: parse accreditation string for common tokens
              const acc = (c.accreditation || '').toString().toLowerCase();
              if (!c.nba && acc.indexOf('nba') !== -1) badges.push(`<span class="badge" title="NBA Accreditation">NBA</span>`);
              if (!c.naac && acc.indexOf('naac') !== -1) badges.push(`<span class="badge" title="NAAC Accreditation">NAAC</span>`);
              // Show accreditation type if nothing else
              if (!badges.length && c.accreditation) badges.push(`<span class="badge">${c.accreditation}</span>`);
              return badges.join('');
            })()}
          </div>
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
            <h3>${wrapSubtitle('About')}</h3>
            <p>${c.description || 'A premier engineering institution with strong academics and campus life.'}</p>

            <div class="quick-facts">
              <div><strong>Established:</strong> ${c.established || 'N/A'}</div>
              <div><strong>Accreditation:</strong> ${c.accreditation || 'N/A'}</div>
              <div><strong>Annual Intake:</strong> ${c.intake || 'N/A'}</div>
              <div><strong>Fees (ann.):</strong> ${c.annualFees || 'N/A'}</div>
            </div>

              <h3>${wrapSubtitle('Accreditations')}</h3>
              <div class="accreditation-details" style="display:flex;gap:12px;margin-bottom:12px">
                <div><strong>NBA:</strong> ${c.nba || 'Not available'}</div>
                <div><strong>NAAC:</strong> ${c.naac || 'Not available'}</div>
              </div>

            <h3>${wrapSubtitle('Academic Programs')}</h3>
            <p><strong>Program Types:</strong> ${types || 'N/A'}</p>
            <p><strong>Popular Courses:</strong></p>
            <div class="courses-list" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
              ${(() => {
                function courseSlug(name){
                  if(!name) return '';
                  const n = name.toString().toLowerCase();
                  if (/\bph\.?d\b/.test(n)) return 'phd';
                  if (/\bm\.?tech\b/.test(n)) return 'mtech';
                  if (/\bmba\b/.test(n)) return 'mba';
                  if (/\bb\.?e\b|\bbe\b|\bb\.tech\b|\bb\.?tech\b/.test(n)) return 'be';
                  return n.replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
                }

                // Determine college identifier from URL (single source of truth)
                const collegeId = rank;

                function offersCourse(courseList, keywordRegex){
                  return (courseList || []).some(s => keywordRegex.test(String(s)));
                }

                return (c.courses || []).slice(0, 8).map(course => {
                  const slug = courseSlug(course);

                  // Determine if this course entry is offered by the college (undergrad or postgrad)
                  // Detect common name variants for B.E/B.Tech, M.Tech/M.E and MBA
                  const isOffered = /\b(b\.?e|b\.?tech|btech|b\.e|b\.tech|m\.?tech|mtech|m\.?e|m\.e|mba)\b/i.test(String(course)) || ['be','b-tech','btech','mtech','m.e','me','mba','ms','phd'].includes(slug);

                  // Check for sub-specializations in multiple possible keys
                  let hasSubCourses = false;
                  if (c.subCourses) {
                    // keys may be original course names or slugs
                    hasSubCourses = Boolean(c.subCourses[course] || c.subCourses[slug] || c.subCourses[course.toString().toLowerCase()]);
                  }

                    // Ph.D entries are intentionally hidden from the popular-courses list
                    const isPhd = /\bph\.?d\b/i.test(String(course)) || slug === 'phd';
                    if (isPhd) {
                      return '';
                    }

                    // If course is offered by college, render link; otherwise render disabled span
                    if (isOffered) {
                      // Allow only BE, MTech, MBA to be active links
                      if (slug === 'be' || slug === 'mtech' || slug === 'mba') {
                        // Use global course pages rather than per-college embeds
                        const label = slug === 'be' ? 'BE / B.Tech' : (slug === 'mtech' ? 'M.Tech' : 'MBA');
                        return `
                          <a class="course-link" href="/course/${slug}" style="padding: 8px 16px; background: var(--primary); color: white; border-radius: var(--radius-sm); text-decoration: none; display:inline-block; font-weight:500;" data-course="${slug}">${label}</a>
                        `;
                      }
                      // Other courses: render a neutral label (not clickable)
                      return `<span title="Course available" style="padding: 8px 16px; background: var(--bg-light); color: var(--text); border-radius: var(--radius-sm); border: 1px solid var(--border);">${course}</span>`;
                    } else {
                      return `<span title="Course not available" style="padding: 8px 16px; background: var(--bg-light); color: var(--text); border-radius: var(--radius-sm); border: 1px solid var(--border); opacity:0.7;">${course} (Not available)</span>`;
                    }
                }).join('');
              })()}
            </div>

            <h3>${wrapSubtitle('Placements & Career')}</h3>
            <div class="placement-row">
              <div class="placement-left">
                <p><strong>Average Package:</strong> ${avg}</p>
                <p><strong>Top Recruiters:</strong> ${top}</p>
              </div>
            </div>

            <h3>${wrapSubtitle('Infrastructure & Facilities')}</h3>
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

            <h3 id="contact">${wrapSubtitle('Contact & Location')}</h3>
            <p><strong>Address:</strong> ${c.address || 'N/A'}</p>
            <p><strong>Phone:</strong> ${c.phone || 'N/A'}</p>
            <div class="map-placeholder">Map preview not available in local preview</div>
          </div>

          <aside class="profile-side">
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
    
    // Insert a testimonials wrapper before comments
    const testimonialsHtml = `
      <section id="testimonials-wrapper" style="margin-top:24px">
        <h3>💬 Testimonials</h3>
        <div id="testimonials-list" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">Loading testimonials...</div>
      </section>
    `;
    container.insertAdjacentHTML('beforeend', testimonialsHtml);
    container.insertAdjacentHTML('beforeend', commentsHtml);
    
    // Load and wire comments
    // Use the URL-derived `rank` as the single source of truth for college identifier
    const rankId = rank;
    
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
    // Load testimonials for this college (college id derived from URL rank)
    (async function loadTestimonials(){
      const el = document.getElementById('testimonials-list');
      el.textContent = 'Loading testimonials...';
      try{
        const r = await fetch('/api/colleges/' + encodeURIComponent(rankId) + '/testimonials');
        if (!r.ok) throw new Error('No testimonials');
        const list = await r.json();
        if (!list || list.length === 0) { el.innerHTML = '<p style="color: var(--text-light)">No testimonials yet for this college.</p>'; return; }

        // Build carousel structure
        const items = list.map(t => {
          const initials = (t.username || t.collegeName || '').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase() || 'S';
          return `
            <article class="testimonial-card" data-id="${t.id || ''}">
              <div class="testimonial-avatar">${initials}</div>
              <div class="testimonial-body">
                <div class="testimonial-meta"><strong>${t.username || 'Anonymous'}</strong>${t.branch ? ' · ' + t.branch : ''}${t.year ? ' · ' + t.year : ''}</div>
                <blockquote class="testimonial-text">${t.text}</blockquote>
              </div>
            </article>
          `;
        }).join('');

        el.innerHTML = `
          <div class="testimonial-carousel">
            <button class="carousel-btn prev" aria-label="Previous">◀</button>
            <div class="carousel-track-wrap"><div class="carousel-track">${items}</div></div>
            <button class="carousel-btn next" aria-label="Next">▶</button>
          </div>
          <div style="margin-top:10px"><button id="view-more-testimonials" class="btn-link">View more testimonials</button></div>
        `;

        // Wire carousel actions
        const trackWrap = el.querySelector('.carousel-track-wrap');
        const track = el.querySelector('.carousel-track');
        const prev = el.querySelector('.carousel-btn.prev');
        const next = el.querySelector('.carousel-btn.next');

        function scrollByWidth(direction = 1){
          const card = track.querySelector('.testimonial-card');
          if (!card) return;
          const gap = 12; // matches CSS gap
          const cardWidth = card.getBoundingClientRect().width + gap;
          trackWrap.scrollBy({ left: direction * cardWidth * 2, behavior: 'smooth' });
        }

        prev.addEventListener('click', () => scrollByWidth(-1));
        next.addEventListener('click', () => scrollByWidth(1));

        // View more opens modal with full list
        document.getElementById('view-more-testimonials').addEventListener('click', () => {
          const modal = document.createElement('div');
          modal.className = 'testimonial-modal';
          modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-card">
              <button class="modal-close" aria-label="Close">✕</button>
              <h3>All Testimonials</h3>
              <div class="modal-list">${list.map(t => {
                const initials = (t.username || t.collegeName || '').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase() || 'S';
                return `
                  <article class="testimonial-card" style="width:100%;">
                    <div class="testimonial-avatar">${initials}</div>
                    <div class="testimonial-body">
                      <div class="testimonial-meta"><strong>${t.username || 'Anonymous'}</strong>${t.branch ? ' · ' + t.branch : ''}${t.year ? ' · ' + t.year : ''}</div>
                      <blockquote class="testimonial-text">${t.text}</blockquote>
                    </div>
                  </article>
                `;
              }).join('')}</div>
            </div>
          `;
          document.body.appendChild(modal);
          modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
          modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.remove());
        });

      }catch(e){ console.error('testimonials error', e); el.innerHTML = '<p style="color: var(--danger)">Unable to load testimonials.</p>'; }
    })();
    
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
    
    // Course links now navigate to course pages (e.g. /course/be). No modal.
  } catch(e) { 
    console.error('Error loading profile:', e);
    container.innerHTML = '<p style="color: var(--danger);">Error loading college profile. Please try again.</p>';
  }
}

loadProfile();
