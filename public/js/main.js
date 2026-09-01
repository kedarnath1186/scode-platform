// Orbit9 Main Platform Frontend JavaScript
document.addEventListener('DOMContentLoaded', () => {
  let allBusinesses = [];
  let currentFilter = 'all';

  // Initialize UI & Data
  loadPublicStats();
  loadBusinesses();
  setupLanguageSwitcher();
  setupContactForm();

  // 1. Fetch & Render Public Stats
  async function loadPublicStats() {
    try {
      const res = await fetch('/api/stats/public');
      const data = await res.json();
      if (data.success) {
        const liveEl = document.getElementById('stat-businesses-live');
        const setupEl = document.getElementById('stat-setup-time');
        const domainEl = document.getElementById('stat-domain-hassle');

        if (liveEl) liveEl.innerHTML = `${data.data.liveCount}<span class="accent">+</span>`;
        if (setupEl) setupEl.innerHTML = `${data.data.setupTime}`;
        if (domainEl) domainEl.innerHTML = `${data.data.domainHassle}`;
      }
    } catch (err) {
      console.warn('Failed to load stats:', err);
    }
  }

  // 2. Fetch & Render Portfolio Businesses
  async function loadBusinesses() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    try {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="bi bi-arrow-repeat" style="font-size: 2rem; display: inline-block; animation: spin 1s infinite linear;"></i>
          <p style="margin-top: 10px;">Loading dynamic business profiles...</p>
        </div>
      `;

      const res = await fetch('/api/businesses');
      const json = await res.json();

      if (json.success) {
        allBusinesses = json.data;
        renderBusinesses(allBusinesses);
        setupFilters();
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444;">Failed to load businesses. Please refresh the page.</div>`;
    }
  }

  // Render business cards into the grid
  function renderBusinesses(businesses) {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    if (businesses.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border-color);">
          <i class="bi bi-search" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 12px; display: block;"></i>
          <h3>No businesses found</h3>
          <p style="color: var(--text-muted); margin-top: 6px;">Try adjusting your filter or search keywords.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = businesses.map(b => {
      const isLive = b.status === 'live';
      const statusBadge = isLive
        ? `<span class="portfolio-status status-live"><i class="bi bi-circle-fill" style="font-size:0.5rem"></i> LIVE</span>`
        : `<span class="portfolio-status status-upcoming"><i class="bi bi-clock-fill" style="font-size:0.5rem"></i> UPCOMING</span>`;

      const subsiteUrl = `/b/${b.slug}`;
      const displayDomain = `${b.slug}.orbit9.in`;

      const servicePills = b.services && b.services.length > 0
        ? b.services.slice(0, 3).map(s => `<span class="service-pill"><i class="bi ${s.icon || 'bi-check2'}"></i> ${escapeHtml(s.title)}</span>`).join('')
        : `<span class="service-pill">${escapeHtml(b.category)}</span>`;

      return `
        <div class="portfolio-card" data-status="${b.status}" data-category="${escapeHtml(b.category)}">
          <div class="portfolio-card-header">
            ${statusBadge}
            <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">${escapeHtml(b.category)}</span>
          </div>
          <h3>${escapeHtml(b.name)}</h3>
          <p class="tagline">${escapeHtml(b.tagline || b.category)}</p>
          <p class="desc">${escapeHtml(b.description || 'Professional local business website powered by Orbit9 platform.')}</p>
          
          <div class="portfolio-services-tags">
            ${servicePills}
          </div>

          <a class="card-url" href="${subsiteUrl}" target="_blank">
            <i class="bi bi-globe2"></i> ${displayDomain}
          </a>

          <div class="card-actions">
            <a class="btn-visit" href="${subsiteUrl}" target="_blank">
              <i class="bi bi-box-arrow-up-right"></i> ${isLive ? 'Visit Sub-Site' : 'Preview Profile'}
            </a>
            ${b.whatsapp ? `
              <a class="btn-visit" style="flex:0 0 44px; padding:0;" href="https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(b.name)}%2C%20I%20saw%20your%20website%20on%20Orbit9" target="_blank" title="Chat on WhatsApp">
                <i class="bi bi-whatsapp" style="color:#25d366;"></i>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Filter and Search Logic
  function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('portfolio-search-input');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        applyFilterAndSearch();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        applyFilterAndSearch();
      });
    }

    // Category click handler from "Who We Help" section
    const catCards = document.querySelectorAll('.business-type');
    catCards.forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-cat');
        if (cat && searchInput) {
          searchInput.value = cat;
          document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
          applyFilterAndSearch();
        }
      });
    });
  }

  function applyFilterAndSearch() {
    const searchVal = (document.getElementById('portfolio-search-input')?.value || '').toLowerCase().trim();

    let filtered = allBusinesses.filter(b => {
      // Status filter
      const matchesStatus = currentFilter === 'all' || b.status === currentFilter;

      // Search filter
      const matchesSearch = !searchVal || 
        b.name.toLowerCase().includes(searchVal) ||
        b.category.toLowerCase().includes(searchVal) ||
        (b.tagline && b.tagline.toLowerCase().includes(searchVal)) ||
        (b.description && b.description.toLowerCase().includes(searchVal));

      return matchesStatus && matchesSearch;
    });

    renderBusinesses(filtered);
  }

  // 4. Contact Lead Submission
  function setupContactForm() {
    const form = document.getElementById('platform-contact-form');
    const feedback = document.getElementById('form-feedback');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      const payload = {
        business_id: null, // Platform lead
        name: document.getElementById('contact-name').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        service_requested: document.getElementById('contact-biz-type').value,
        message: document.getElementById('contact-message').value.trim()
      };

      if (!payload.name || !payload.phone) {
        showFeedback('Please provide your name and phone number.', 'error');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation: spin 1s infinite linear;"></i> Submitting...`;

        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          showFeedback('🎉 Thank you! Your request has been received. Our team will contact you within 24 hours.', 'success');
          form.reset();
        } else {
          showFeedback(data.message || 'Failed to submit inquiry', 'error');
        }
      } catch (err) {
        showFeedback('Network error. Please try again or reach us on WhatsApp.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });

    function showFeedback(msg, type) {
      if (!feedback) return;
      feedback.style.display = 'block';
      feedback.style.padding = '14px';
      feedback.style.borderRadius = '8px';
      feedback.style.marginTop = '16px';
      feedback.style.fontSize = '0.95rem';

      if (type === 'success') {
        feedback.style.background = 'rgba(16, 185, 129, 0.15)';
        feedback.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        feedback.style.color = '#34d399';
      } else {
        feedback.style.background = 'rgba(239, 68, 68, 0.15)';
        feedback.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        feedback.style.color = '#f87171';
      }
      feedback.innerHTML = msg;
    }
  }

  // 5. Multi-Language Switcher
  function setupLanguageSwitcher() {
    const langSelect = document.getElementById('lang-select');
    if (!langSelect) return;

    const translations = {
      en: {
        'nav-problem': 'The Problem',
        'nav-solution': 'Our Solution',
        'nav-businesses': 'Who We Help',
        'nav-how': 'How It Works',
        'nav-portfolio': 'Portfolio',
        'nav-contact': 'Get Started',
        'hero-badge': 'Empowering Local Businesses',
        'hero-title': 'Take Your Business',
        'hero-title-gradient': 'Online with Orbit9',
        'hero-desc': 'Many local businesses still don\'t have a website because they think it is expensive, complicated, and requires technical knowledge. At ORBIT9, our goal is simple — help local businesses establish their online presence quickly and affordably.',
        'hero-cta-primary': 'Get Your Business Online',
        'hero-cta-secondary': 'View Portfolio',
        'stat-businesses': 'Businesses Online',
        'stat-domain': 'Domain Hassle',
        'stat-setup': 'Quick Setup',
        'problem-tag': 'The Challenge',
        'problem-title': 'Why Most Local Businesses Are Still Offline',
        'problem-subtitle': 'Many local businesses still don\'t have a website because they believe it\'s out of reach. Here\'s what holds them back.',
        'solution-tag': 'The Orbit9 Way',
        'solution-title': 'Your Business Profile Online',
        'solution-title-highlight': 'Without the Headaches',
        'solution-desc': 'Get your business profile online with a professional website on the Orbit9 platform, without worrying about domain management or server hosting. We handle the tech — you focus on your business.'
      },
      hi: {
        'nav-problem': 'चुनौतियाँ',
        'nav-solution': 'हमारा समाधान',
        'nav-businesses': 'हम किसकी मदद करते हैं',
        'nav-how': 'यह कैसे काम करता है',
        'nav-portfolio': 'पोर्टफोलियो',
        'nav-contact': 'शुरू करें',
        'hero-badge': 'स्थानीय व्यवसायों का सशक्तिकरण',
        'hero-title': 'अपने व्यवसाय को',
        'hero-title-gradient': 'Orbit9 के साथ ऑनलाइन लाएं',
        'hero-desc': 'कई स्थानीय व्यवसायों के पास अभी भी वेबसाइट नहीं है क्योंकि उन्हें लगता है कि यह महंगी और जटिल है। ORBIT9 में हमारा लक्ष्य सरल है — स्थानीय व्यवसायों को तेजी से और किफायती तरीके से ऑनलाइन उपस्थिति स्थापित करने में मदद करना।',
        'hero-cta-primary': 'अपना व्यवसाय ऑनलाइन करें',
        'hero-cta-secondary': 'पोर्टफोलियो देखें',
        'stat-businesses': 'व्यवसाय ऑनलाइन',
        'stat-domain': 'डोमेन का कोई झंझट नहीं',
        'stat-setup': 'तेज़ सेटअप',
        'problem-tag': 'चुनौतियाँ',
        'problem-title': 'अधिकांश स्थानीय व्यवसाय अभी भी ऑफ़लाइन क्यों हैं',
        'problem-subtitle': 'वेबसाइट बनाना अब महंगा या जटिल नहीं है। जानिए क्या उन्हें रोकता है।',
        'solution-tag': 'Orbit9 का तरीका',
        'solution-title': 'आपकी व्यावसायिक प्रोफाइल ऑनलाइन',
        'solution-title-highlight': 'बिना किसी परेशानी के',
        'solution-desc': 'डोमेन प्रबंधन या सर्वर होस्टिंग की चिंता किए बिना Orbit9 प्लेटफॉर्म पर एक पेशेवर वेबसाइट के साथ अपना व्यवसाय ऑनलाइन प्राप्त करें।'
      },
      mr: {
        'nav-problem': 'समस्या',
        'nav-solution': 'आमचे उपाय',
        'nav-businesses': 'आम्ही कोणाला मदत करतो',
        'nav-how': 'प्रक्रिया कशी आहे',
        'nav-portfolio': 'पोर्टफोलिओ',
        'nav-contact': 'सुरू करा',
        'hero-badge': 'स्थानिक व्यवसायांचे सक्षमीकरण',
        'hero-title': 'आपला व्यवसाय',
        'hero-title-gradient': 'Orbit9 सोबत ऑनलाइन आणा',
        'hero-desc': 'अनेक स्थानिक व्यवसायांकडे अजूनही वेबसाइट नाही कारण त्यांना वाटते की हे महाग आणि गुंतागुंतीचे आहे. ORBIT9 मध्ये आमचे ध्येय सोपे आहे — स्थानिक व्यवसायांना वेगाने आणि परवडणाऱ्या दरात डिजिटल ओळख मिळवून देणे.',
        'hero-cta-primary': 'व्यवसाय ऑनलाइन करा',
        'hero-cta-secondary': 'पोर्टफोलिओ पहा',
        'stat-businesses': 'व्यवसाय ऑनलाइन',
        'stat-domain': 'डोमेनचा कोणताही त्रास नाही',
        'stat-setup': 'जलद सेटअप',
        'problem-tag': 'समस्या',
        'problem-title': 'बहुतेक स्थानिक व्यवसाय अजूनही ऑफलाइन का आहेत',
        'problem-subtitle': 'वेबसाइट मिळवणे आता कठीण राहिलेले नाही. जाणून घ्या काय अडथळा येतो.',
        'solution-tag': 'Orbit9 चा मार्ग',
        'solution-title': 'आपल्या व्यवसायाचे डिजिटल प्रोफाइल',
        'solution-title-highlight': 'कोणत्याही त्रासाशिवाय',
        'solution-desc': 'डोमेन किंवा होस्टिंगची चिंता न करता Orbit9 प्लॅटफॉर्मवर आपल्या व्यवसायाची व्यावसायिक वेबसाइट मिळवा. तांत्रिक काम आम्ही सांभाळू — आपण व्यवसायावर लक्ष द्या.'
      }
    };

    langSelect.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      const dict = translations[selectedLang] || translations.en;

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          el.innerText = dict[key];
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
