// Dynamic Business Sub-Site Engine
document.addEventListener('DOMContentLoaded', async () => {
  // Extract slug from URL (e.g. /b/clean-water-solutions -> clean-water-solutions)
  const pathParts = window.location.pathname.split('/');
  const slugIndex = pathParts.indexOf('b');
  const slug = slugIndex !== -1 && pathParts[slugIndex + 1] ? pathParts[slugIndex + 1] : null;

  if (!slug) {
    showError('No business specified in URL.');
    return;
  }

  try {
    const res = await fetch(`/api/businesses/${slug}`);
    const json = await res.json();

    if (!json.success || !json.data) {
      showError(json.message || 'Business profile not found.');
      return;
    }

    const b = json.data;
    renderBusinessSite(b);
  } catch (err) {
    console.error('Error fetching business:', err);
    showError('Unable to load business details. Please check your connection.');
  }

  function renderBusinessSite(b) {
    // 1. Set Page Title & Theme Color
    document.title = `${b.name} — ${b.tagline || b.category} | Orbit9`;
    if (b.theme_color) {
      document.documentElement.style.setProperty('--biz-theme', b.theme_color);
    }

    // 2. Branding (Header & Logo)
    const brandName = document.getElementById('biz-brand-name');
    const brandCategory = document.getElementById('biz-brand-category');
    const brandLogo = document.getElementById('biz-brand-logo');
    const callBtn = document.getElementById('biz-call-btn');

    if (brandName) brandName.innerText = b.name;
    if (brandCategory) brandCategory.innerText = b.category;
    if (brandLogo) {
      brandLogo.src = b.logo_url || 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=150&auto=format&fit=crop&q=80';
      brandLogo.alt = b.name;
    }
    if (callBtn && b.phone) {
      callBtn.href = `tel:${b.phone.replace(/[^0-9+]/g, '')}`;
      callBtn.style.display = 'inline-flex';
    }

    // 3. Hero Section
    const heroBg = document.getElementById('biz-hero-section');
    const heroBadge = document.getElementById('biz-hero-badge');
    const heroTitle = document.getElementById('biz-hero-title');
    const heroDesc = document.getElementById('biz-hero-desc');

    if (heroBg && b.hero_bg_url) {
      heroBg.style.backgroundImage = `url('${b.hero_bg_url}')`;
    }
    if (heroBadge) heroBadge.innerHTML = `<i class="bi bi-patch-check-fill"></i> ${escapeHtml(b.category)}`;
    if (heroTitle) heroTitle.innerText = b.tagline || `Welcome to ${b.name}`;
    if (heroDesc) heroDesc.innerText = b.description || 'Providing premier services with trust and excellence.';

    // 4. About Us Section
    const aboutTitle = document.getElementById('biz-about-title');
    const aboutText = document.getElementById('biz-about-text');
    if (aboutTitle) aboutTitle.innerText = `About ${b.name}`;
    if (aboutText) aboutText.innerHTML = `<p>${escapeHtml(b.about_text || b.description || 'Committed to delivering outstanding quality and satisfaction to our esteemed customers.')}</p>`;

    // 5. Core Services
    const servicesContainer = document.getElementById('biz-services-grid');
    const serviceSelect = document.getElementById('inquiry-service-select');
    if (servicesContainer && b.services && b.services.length > 0) {
      servicesContainer.innerHTML = b.services.map(s => `
        <div class="service-card">
          <div class="service-icon">
            <i class="bi ${s.icon || 'bi-gear-fill'}"></i>
          </div>
          <h4>${escapeHtml(s.title)}</h4>
          <p>${escapeHtml(s.description || 'Reliable service backed by experienced professionals.')}</p>
          <div class="service-footer">
            <span class="service-price">${escapeHtml(s.price || 'Best Pricing')}</span>
            <button class="btn-inquire-service" onclick="preselectService('${escapeHtml(s.title)}')">
              Inquire <i class="bi bi-arrow-right-short"></i>
            </button>
          </div>
        </div>
      `).join('');

      if (serviceSelect) {
        serviceSelect.innerHTML = `
          <option value="General Inquiry">General Inquiry</option>
          ${b.services.map(s => `<option value="${escapeHtml(s.title)}">${escapeHtml(s.title)}</option>`).join('')}
        `;
      }
    } else if (servicesContainer) {
      servicesContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--biz-muted);">Contact us for full service offerings and tailored quotations.</div>`;
    }

    // 6. Gallery / Solutions
    const gallerySection = document.getElementById('biz-gallery-section');
    const galleryContainer = document.getElementById('biz-gallery-grid');
    if (b.gallery && b.gallery.length > 0 && galleryContainer) {
      gallerySection.style.display = 'block';
      galleryContainer.innerHTML = b.gallery.map(g => `
        <div class="gallery-item">
          <img src="${g.image_url}" alt="${escapeHtml(g.title || 'Gallery image')}">
          <div class="gallery-caption">${escapeHtml(g.title || g.category || 'Project')}</div>
        </div>
      `).join('');
    } else if (gallerySection) {
      gallerySection.style.display = 'none';
    }

    // 7. Testimonials
    const testSection = document.getElementById('biz-testimonials-section');
    const testContainer = document.getElementById('biz-testimonials-grid');
    if (b.testimonials && b.testimonials.length > 0 && testContainer) {
      testSection.style.display = 'block';
      testContainer.innerHTML = b.testimonials.map(t => {
        const stars = Array(t.rating || 5).fill('<i class="bi bi-star-fill"></i>').join('');
        return `
          <div class="testimonial-card">
            <div class="test-stars">${stars}</div>
            <p class="test-quote">"${escapeHtml(t.quote)}"</p>
            <div class="test-author">
              <h5>${escapeHtml(t.client_name)}</h5>
              <small>${escapeHtml(t.client_role || '')} ${t.company ? '— ' + escapeHtml(t.company) : ''}</small>
            </div>
          </div>
        `;
      }).join('');
    } else if (testSection) {
      testSection.style.display = 'none';
    }

    // 8. Contact & Map Info
    const contactPhone = document.getElementById('biz-contact-phone');
    const contactEmail = document.getElementById('biz-contact-email');
    const contactAddress = document.getElementById('biz-contact-address');
    const mapLink = document.getElementById('biz-map-link');

    if (contactPhone && b.phone) {
      contactPhone.innerHTML = `<a href="tel:${b.phone}">${escapeHtml(b.phone)}</a>`;
    }
    if (contactEmail && b.email) {
      contactEmail.innerHTML = `<a href="mailto:${b.email}">${escapeHtml(b.email)}</a>`;
    }
    if (contactAddress && b.address) {
      contactAddress.innerText = b.address;
    }
    if (mapLink && b.google_map_url) {
      mapLink.href = b.google_map_url;
      mapLink.style.display = 'inline-flex';
    }

    // 9. Floating WhatsApp Button
    const waBtn = document.getElementById('biz-floating-wa');
    if (waBtn && (b.whatsapp || b.phone)) {
      const cleanPhone = (b.whatsapp || b.phone).replace(/[^0-9]/g, '');
      waBtn.href = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(b.name)}%2C%20I%20visited%20your%20website%20and%20want%20to%20inquire%20about%20your%20services.`;
      waBtn.style.display = 'flex';
    }

    // 10. Quote / Inquiry Submission
    const quoteForm = document.getElementById('biz-quote-form');
    const formFeedback = document.getElementById('biz-form-feedback');
    if (quoteForm) {
      quoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = quoteForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        const payload = {
          business_id: b.id, // Tagged to this business in single SQLite DB
          name: document.getElementById('quote-name').value.trim(),
          phone: document.getElementById('quote-phone').value.trim(),
          email: document.getElementById('quote-email').value.trim(),
          service_requested: document.getElementById('inquiry-service-select')?.value || 'General Inquiry',
          message: document.getElementById('quote-message').value.trim()
        };

        if (!payload.name || !payload.phone) {
          showFeedback('Please provide your name and phone number.', 'error');
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Sending Inquiry...';

          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();

          if (data.success) {
            showFeedback(`🎉 Thank you, ${payload.name}! Your inquiry has been sent directly to ${b.name}.`, 'success');
            quoteForm.reset();
          } else {
            showFeedback(data.message || 'Failed to submit inquiry', 'error');
          }
        } catch (err) {
          showFeedback('Network error. Please call or message on WhatsApp directly.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
    }

    function showFeedback(msg, type) {
      if (!formFeedback) return;
      formFeedback.style.display = 'block';
      formFeedback.style.padding = '12px';
      formFeedback.style.borderRadius = '8px';
      formFeedback.style.marginTop = '14px';
      formFeedback.style.fontSize = '0.9rem';

      if (type === 'success') {
        formFeedback.style.background = 'rgba(16, 185, 129, 0.2)';
        formFeedback.style.border = '1px solid rgba(16, 185, 129, 0.4)';
        formFeedback.style.color = '#34d399';
      } else {
        formFeedback.style.background = 'rgba(239, 68, 68, 0.2)';
        formFeedback.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        formFeedback.style.color = '#f87171';
      }
      formFeedback.innerHTML = msg;
    }
  }

  function showError(msg) {
    document.body.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: #fff; text-align: center; padding: 24px;">
        <div style="max-width: 500px; background: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 16px; display: block;"></i>
          <h2 style="margin-bottom: 10px;">Website Profile Not Found</h2>
          <p style="color: #94a3b8; margin-bottom: 24px;">${msg}</p>
          <a href="/" style="display: inline-block; padding: 10px 24px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Return to Orbit9 Directory</a>
        </div>
      </div>
    `;
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

// Helper for pre-selecting service in quote form
window.preselectService = function(serviceTitle) {
  const select = document.getElementById('inquiry-service-select');
  if (select) {
    select.value = serviceTitle;
  }
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
};
