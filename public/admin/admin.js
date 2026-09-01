// Orbit9 Admin Panel Client Controller
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('orbit9_admin_token');
  const user = JSON.parse(localStorage.getItem('orbit9_admin_user') || '{}');

  // Verify Auth
  if (!token) {
    window.location.href = '/admin/login';
    return;
  }

  // Display user info
  const adminNameEl = document.getElementById('admin-username');
  if (adminNameEl && user.username) {
    adminNameEl.innerText = user.username;
  }

  // State
  let currentTab = 'dashboard';
  let allBusinesses = [];
  let allLeads = [];
  let editingBusinessId = null;

  // Initialize
  initNavigation();
  loadDashboardData();
  setupModalTabs();
  setupBusinessForm();
  setupSettingsForm();

  // 1. Navigation Switcher
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        if (tab) {
          switchTab(tab);
        }
      });
    });

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {}
        localStorage.removeItem('orbit9_admin_token');
        localStorage.removeItem('orbit9_admin_user');
        window.location.href = '/admin/login';
      });
    }
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tab);
    });

    document.querySelectorAll('.admin-view').forEach(view => {
      view.style.display = view.id === `view-${tab}` ? 'block' : 'none';
    });

    if (tab === 'dashboard') loadDashboardData();
    if (tab === 'businesses') loadBusinessesTable();
    if (tab === 'leads') loadLeadsTable();
    if (tab === 'settings') loadPlatformSettings();
  }

  // Helper for authenticated requests
  async function apiFetch(url, options = {}) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem('orbit9_admin_token');
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }
    return res.json();
  }

  // 2. Dashboard KPIs
  async function loadDashboardData() {
    try {
      const data = await apiFetch('/api/stats/dashboard');
      if (data.success) {
        const stats = data.data;
        document.getElementById('kpi-total-businesses').innerText = stats.totalBusinesses;
        document.getElementById('kpi-live-sites').innerText = stats.liveBusinesses;
        document.getElementById('kpi-upcoming-sites').innerText = stats.upcomingBusinesses;
        document.getElementById('kpi-total-leads').innerText = stats.totalLeads;
        document.getElementById('kpi-new-leads').innerText = stats.newLeads;

        // Render Recent Inquiries Table
        const recentTbody = document.getElementById('recent-leads-tbody');
        if (recentTbody) {
          if (stats.recentLeads.length === 0) {
            recentTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--admin-muted);">No inquiries yet.</td></tr>`;
          } else {
            recentTbody.innerHTML = stats.recentLeads.map(l => `
              <tr>
                <td><strong>${escapeHtml(l.name)}</strong><br><small style="color:var(--admin-muted);">${escapeHtml(l.phone)}</small></td>
                <td>${escapeHtml(l.business_name || 'Orbit9 Main Portal')}</td>
                <td>${escapeHtml(l.service_requested || 'General')}</td>
                <td><span class="badge-status ${l.status}">${l.status.toUpperCase()}</span></td>
                <td>${new Date(l.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('');
          }
        }
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  }

  // 3. Businesses Management (Table & Search)
  async function loadBusinessesTable() {
    const tbody = document.getElementById('businesses-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--admin-muted);"><i class="bi bi-arrow-repeat" style="animation:spin 1s infinite linear;"></i> Loading businesses...</td></tr>`;

    try {
      const res = await apiFetch('/api/businesses');
      if (res.success) {
        allBusinesses = res.data;
        renderBusinessesTable(allBusinesses);
        setupBusinessFilters();
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-red);">Failed to load businesses.</td></tr>`;
    }
  }

  function renderBusinessesTable(businesses) {
    const tbody = document.getElementById('businesses-tbody');
    if (!tbody) return;

    if (businesses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--admin-muted);">No businesses found. Click "Add New Business" to create one.</td></tr>`;
      return;
    }

    tbody.innerHTML = businesses.map(b => {
      const isLive = b.status === 'live';
      const statusBadge = isLive
        ? `<span class="badge-status live">LIVE</span>`
        : `<span class="badge-status upcoming">UPCOMING</span>`;

      return `
        <tr>
          <td><span style="font-family:monospace; color:var(--admin-muted);">#${b.id}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${b.logo_url || 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=80'}" style="width:36px; height:36px; border-radius:8px; object-fit:cover; border:1px solid var(--admin-border);">
              <div>
                <strong>${escapeHtml(b.name)}</strong>
                <div style="font-size:0.75rem; color:var(--admin-muted);">${escapeHtml(b.slug)}</div>
              </div>
            </div>
          </td>
          <td>${escapeHtml(b.category)}</td>
          <td>${statusBadge}</td>
          <td><span style="font-weight:600; color:#60a5fa;">${b.services ? b.services.length : 0}</span></td>
          <td>${escapeHtml(b.phone || '-')}</td>
          <td>
            <div class="action-btns">
              <a href="/b/${b.slug}" target="_blank" class="btn-icon visit" title="Preview Live Sub-Site">
                <i class="bi bi-box-arrow-up-right"></i>
              </a>
              <button class="btn-icon edit" onclick="window.editBusiness(${b.id})" title="Edit Profile & Services">
                <i class="bi bi-pencil-square"></i>
              </button>
              <button class="btn-icon delete" onclick="window.deleteBusiness(${b.id}, '${escapeHtml(b.name)}')" title="Delete Business">
                <i class="bi bi-trash-fill"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function setupBusinessFilters() {
    const searchInput = document.getElementById('search-biz');
    const statusSelect = document.getElementById('filter-biz-status');

    const applyFilter = () => {
      const q = (searchInput?.value || '').toLowerCase().trim();
      const status = statusSelect?.value || 'all';

      const filtered = allBusinesses.filter(b => {
        const matchesStatus = status === 'all' || b.status === status;
        const matchesQuery = !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
        return matchesStatus && matchesQuery;
      });

      renderBusinessesTable(filtered);
    };

    if (searchInput) searchInput.oninput = applyFilter;
    if (statusSelect) statusSelect.onchange = applyFilter;
  }

  // 4. Create & Edit Business Modal
  function setupModalTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.toggle('active', pane.id === target);
        });
      });
    });
  }

  window.openCreateBusinessModal = () => {
    editingBusinessId = null;
    document.getElementById('modal-biz-title').innerText = 'Create New Business Website Profile';
    document.getElementById('biz-form').reset();
    document.getElementById('biz-services-list').innerHTML = '';
    document.getElementById('biz-testimonials-list').innerHTML = '';
    
    // Add 2 default blank service rows
    addServiceRow();
    addServiceRow();

    // Reset tabs to first
    document.querySelector('.tab-btn[data-target="tab-general"]').click();
    document.getElementById('modal-business').classList.add('show');
  };

  window.closeBusinessModal = () => {
    document.getElementById('modal-business').classList.remove('show');
  };

  window.editBusiness = async (id) => {
    editingBusinessId = id;
    document.getElementById('modal-biz-title').innerText = 'Edit Business Website Profile';
    
    try {
      const res = await apiFetch(`/api/businesses/${id}`);
      if (res.success) {
        const b = res.data;
        // Populate Tab 1: General
        document.getElementById('biz-name').value = b.name || '';
        document.getElementById('biz-slug').value = b.slug || '';
        document.getElementById('biz-category').value = b.category || '';
        document.getElementById('biz-status').value = b.status || 'live';
        document.getElementById('biz-tagline').value = b.tagline || '';
        document.getElementById('biz-description').value = b.description || '';
        document.getElementById('biz-about').value = b.about_text || '';

        // Tab 2: Contact
        document.getElementById('biz-phone').value = b.phone || '';
        document.getElementById('biz-whatsapp').value = b.whatsapp || '';
        document.getElementById('biz-email').value = b.email || '';
        document.getElementById('biz-address').value = b.address || '';
        document.getElementById('biz-map').value = b.google_map_url || '';

        // Tab 3: Branding
        document.getElementById('biz-theme-color').value = b.theme_color || '#3b82f6';
        document.getElementById('biz-logo').value = b.logo_url || '';
        document.getElementById('biz-hero-img').value = b.hero_bg_url || '';

        // Tab 4: Services
        const sContainer = document.getElementById('biz-services-list');
        sContainer.innerHTML = '';
        if (b.services && b.services.length > 0) {
          b.services.forEach(s => addServiceRow(s.title, s.description, s.icon, s.price));
        } else {
          addServiceRow();
        }

        // Tab 5: Testimonials
        const tContainer = document.getElementById('biz-testimonials-list');
        tContainer.innerHTML = '';
        if (b.testimonials && b.testimonials.length > 0) {
          b.testimonials.forEach(t => addTestimonialRow(t.client_name, t.company, t.quote, t.rating));
        }

        document.querySelector('.tab-btn[data-target="tab-general"]').click();
        document.getElementById('modal-business').classList.add('show');
      }
    } catch (err) {
      alert('Failed to load business details for editing.');
    }
  };

  window.deleteBusiness = async (id, name) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will remove its sub-site, services, and testimonials.`)) {
      try {
        const res = await apiFetch(`/api/businesses/${id}`, { method: 'DELETE' });
        if (res.success) {
          loadBusinessesTable();
          loadDashboardData();
        } else {
          alert(res.message || 'Failed to delete business');
        }
      } catch (err) {
        alert('Error deleting business');
      }
    }
  };

  // Dynamic Service Rows in Modal
  window.addServiceRow = (title = '', desc = '', icon = 'bi-gear-fill', price = '') => {
    const container = document.getElementById('biz-services-list');
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()" title="Remove Service"><i class="bi bi-x-circle-fill"></i></button>
      <div class="form-row">
        <div class="form-group-adm">
          <label>Service Title</label>
          <input type="text" class="adm-input svc-title" placeholder="e.g. Industrial RO Water Treatment" value="${escapeHtml(title)}" required>
        </div>
        <div class="form-group-adm">
          <label>Price / Tag</label>
          <input type="text" class="adm-input svc-price" placeholder="e.g. From ₹4,999 / Free Quote" value="${escapeHtml(price)}">
        </div>
      </div>
      <div class="form-group-adm" style="margin-bottom:0;">
        <label>Service Description</label>
        <textarea class="adm-input svc-desc" rows="2" placeholder="Brief service details...">${escapeHtml(desc)}</textarea>
      </div>
    `;
    container.appendChild(row);
  };

  // Dynamic Testimonial Rows in Modal
  window.addTestimonialRow = (name = '', company = '', quote = '', rating = 5) => {
    const container = document.getElementById('biz-testimonials-list');
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()" title="Remove Review"><i class="bi bi-x-circle-fill"></i></button>
      <div class="form-row">
        <div class="form-group-adm">
          <label>Client Name</label>
          <input type="text" class="adm-input test-name" placeholder="e.g. Rajesh Kumar" value="${escapeHtml(name)}" required>
        </div>
        <div class="form-group-adm">
          <label>Company / Role</label>
          <input type="text" class="adm-input test-company" placeholder="e.g. ABC Enterprises Ltd." value="${escapeHtml(company)}">
        </div>
      </div>
      <div class="form-group-adm" style="margin-bottom:0;">
        <label>Review Quote</label>
        <textarea class="adm-input test-quote" rows="2" placeholder="What the client said...">${escapeHtml(quote)}</textarea>
      </div>
    `;
    container.appendChild(row);
  };

  // Form Submit (Create / Update)
  function setupBusinessForm() {
    const form = document.getElementById('biz-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-biz');
      const originalText = saveBtn.innerHTML;

      // Extract Services
      const services = [];
      document.querySelectorAll('#biz-services-list .dynamic-row').forEach(row => {
        const title = row.querySelector('.svc-title')?.value.trim();
        const price = row.querySelector('.svc-price')?.value.trim();
        const description = row.querySelector('.svc-desc')?.value.trim();
        if (title) {
          services.push({ title, price, description, icon: 'bi-check2-circle' });
        }
      });

      // Extract Testimonials
      const testimonials = [];
      document.querySelectorAll('#biz-testimonials-list .dynamic-row').forEach(row => {
        const client_name = row.querySelector('.test-name')?.value.trim();
        const company = row.querySelector('.test-company')?.value.trim();
        const quote = row.querySelector('.test-quote')?.value.trim();
        if (client_name && quote) {
          testimonials.push({ client_name, company, quote, rating: 5 });
        }
      });

      const payload = {
        name: document.getElementById('biz-name').value.trim(),
        slug: document.getElementById('biz-slug').value.trim(),
        category: document.getElementById('biz-category').value.trim(),
        status: document.getElementById('biz-status').value,
        tagline: document.getElementById('biz-tagline').value.trim(),
        description: document.getElementById('biz-description').value.trim(),
        about_text: document.getElementById('biz-about').value.trim(),
        phone: document.getElementById('biz-phone').value.trim(),
        whatsapp: document.getElementById('biz-whatsapp').value.trim(),
        email: document.getElementById('biz-email').value.trim(),
        address: document.getElementById('biz-address').value.trim(),
        google_map_url: document.getElementById('biz-map').value.trim(),
        theme_color: document.getElementById('biz-theme-color').value,
        logo_url: document.getElementById('biz-logo').value.trim(),
        hero_bg_url: document.getElementById('biz-hero-img').value.trim(),
        services,
        testimonials
      };

      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat" style="animation:spin 1s infinite linear;"></i> Saving...';

        const method = editingBusinessId ? 'PUT' : 'POST';
        const endpoint = editingBusinessId ? `/api/businesses/${editingBusinessId}` : '/api/businesses';

        const res = await apiFetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.success) {
          closeBusinessModal();
          loadBusinessesTable();
          loadDashboardData();
        } else {
          alert(res.message || 'Error saving business profile');
        }
      } catch (err) {
        alert('Network error while saving');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    });
  }

  // 5. Leads & CRM Management
  async function loadLeadsTable() {
    const tbody = document.getElementById('leads-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--admin-muted);"><i class="bi bi-arrow-repeat" style="animation:spin 1s infinite linear;"></i> Loading leads...</td></tr>`;

    try {
      const res = await apiFetch('/api/leads');
      if (res.success) {
        allLeads = res.data;
        renderLeadsTable(allLeads);
        setupLeadsFilters();
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-red);">Failed to load inquiries.</td></tr>`;
    }
  }

  function renderLeadsTable(leads) {
    const tbody = document.getElementById('leads-tbody');
    if (!tbody) return;

    if (leads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--admin-muted);">No inquiries found.</td></tr>`;
      return;
    }

    tbody.innerHTML = leads.map(l => {
      const cleanPhone = l.phone.replace(/[^0-9]/g, '');
      const waLink = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(l.name)}%2C%20thank%20you%20for%20your%20inquiry%20regarding%20${encodeURIComponent(l.service_requested || 'our services')}.`;

      return `
        <tr>
          <td><span style="font-family:monospace; color:var(--admin-muted);">#${l.id}</span></td>
          <td>
            <strong>${escapeHtml(l.name)}</strong>
            <div style="font-size:0.8rem; color:var(--admin-muted);">${escapeHtml(l.phone)} ${l.email ? '· ' + escapeHtml(l.email) : ''}</div>
          </td>
          <td>
            <span style="font-weight:600; color:#60a5fa;">${escapeHtml(l.business_name || 'Orbit9 Main Portal')}</span>
            <div style="font-size:0.75rem; color:var(--admin-muted);">${escapeHtml(l.service_requested || 'General Inquiry')}</div>
          </td>
          <td>
            <div style="max-width:240px; font-size:0.85rem; color:var(--admin-text);">${escapeHtml(l.message || 'No extra message')}</div>
          </td>
          <td>
            <select class="adm-input" style="padding:4px 8px; font-size:0.8rem;" onchange="window.updateLeadStatus(${l.id}, this.value)">
              <option value="new" ${l.status === 'new' ? 'selected' : ''}>NEW</option>
              <option value="contacted" ${l.status === 'contacted' ? 'selected' : ''}>CONTACTED</option>
              <option value="closed" ${l.status === 'closed' ? 'selected' : ''}>CLOSED</option>
            </select>
          </td>
          <td>${new Date(l.created_at).toLocaleDateString()}</td>
          <td>
            <div class="action-btns">
              <a href="${waLink}" target="_blank" class="btn-icon wa" title="Reply on WhatsApp">
                <i class="bi bi-whatsapp"></i>
              </a>
              <button class="btn-icon delete" onclick="window.deleteLead(${l.id})" title="Delete Inquiry">
                <i class="bi bi-trash-fill"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function setupLeadsFilters() {
    const statusSelect = document.getElementById('filter-lead-status');
    if (statusSelect) {
      statusSelect.onchange = () => {
        const val = statusSelect.value;
        const filtered = val === 'all' ? allLeads : allLeads.filter(l => l.status === val);
        renderLeadsTable(filtered);
      };
    }
  }

  window.updateLeadStatus = async (id, status) => {
    try {
      const res = await apiFetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.success) {
        loadDashboardData();
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  window.deleteLead = async (id) => {
    if (confirm('Delete this inquiry?')) {
      try {
        const res = await apiFetch(`/api/leads/${id}`, { method: 'DELETE' });
        if (res.success) {
          loadLeadsTable();
          loadDashboardData();
        }
      } catch (err) {
        alert('Failed to delete lead');
      }
    }
  };

  // 6. Platform CMS Settings
  async function loadPlatformSettings() {
    try {
      const res = await apiFetch('/api/settings');
      if (res.success) {
        const s = res.data;
        document.getElementById('set-hero-tagline').value = s.platform_tagline || '';
        document.getElementById('set-hero-desc').value = s.platform_description || '';
        document.getElementById('set-phone').value = s.contact_phone || '';
        document.getElementById('set-email').value = s.contact_email || '';
        document.getElementById('set-whatsapp').value = s.contact_whatsapp || '';
        document.getElementById('set-stat-live').value = s.stat_businesses_count || '';
      }
    } catch (err) {}
  }

  function setupSettingsForm() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = form.querySelector('button[type="submit"]');
      const original = saveBtn.innerHTML;

      const payload = {
        platform_tagline: document.getElementById('set-hero-tagline').value.trim(),
        platform_description: document.getElementById('set-hero-desc').value.trim(),
        contact_phone: document.getElementById('set-phone').value.trim(),
        contact_email: document.getElementById('set-email').value.trim(),
        contact_whatsapp: document.getElementById('set-whatsapp').value.trim(),
        stat_businesses_count: document.getElementById('set-stat-live').value.trim()
      };

      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving...';
        const res = await apiFetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.success) {
          alert('Platform settings saved successfully!');
        }
      } catch (err) {
        alert('Failed to save settings');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = original;
      }
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
