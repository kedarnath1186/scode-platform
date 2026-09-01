import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building,
  MessageSquare,
  Settings,
  LogOut,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  X,
  PlusCircle,
  Globe
} from 'lucide-react';

const AdminDashboardPage = () => {
  const [token, setToken] = useState(localStorage.getItem('scode_admin_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('scode_admin_user') || '{}'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  // Dashboard Stats
  const [stats, setStats] = useState(null);

  // Businesses State
  const [businesses, setBusinesses] = useState([]);
  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState('all');

  // Leads State
  const [leads, setLeads] = useState([]);
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');

  // Settings State
  const [settings, setSettings] = useState({
    platform_tagline: '',
    platform_description: '',
    contact_phone: '',
    contact_whatsapp: '',
    contact_email: '',
    stat_businesses_count: ''
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('general');
  const [editingId, setEditingId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Business Form Data
  const [bizForm, setBizForm] = useState({
    name: '',
    slug: '',
    category: '',
    status: 'live',
    tagline: '',
    description: '',
    about_text: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    google_map_url: '',
    theme_color: '#3b82f6',
    logo_url: '',
    hero_bg_url: '',
    services: [],
    testimonials: []
  });

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [token, activeTab]);

  const authHeader = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const res = await fetch('/api/stats/dashboard', { headers: authHeader() });
        const json = await res.json();
        if (json.success) setStats(json.data);
      } else if (activeTab === 'businesses') {
        const res = await fetch('/api/businesses', { headers: authHeader() });
        const json = await res.json();
        if (json.success) setBusinesses(json.data);
      } else if (activeTab === 'leads') {
        const res = await fetch('/api/leads', { headers: authHeader() });
        const json = await res.json();
        if (json.success) setLeads(json.data);
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success) setSettings(json.data);
      }
    } catch (err) {
      console.error('Error fetching admin data', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('scode_admin_token');
    localStorage.removeItem('scode_admin_user');
    navigate('/admin/login');
  };

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setBizForm({
      name: '',
      slug: '',
      category: '',
      status: 'live',
      tagline: '',
      description: '',
      about_text: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      google_map_url: '',
      theme_color: '#3b82f6',
      logo_url: '',
      hero_bg_url: '',
      services: [
        { title: '', price: '', description: '', icon: 'bi-check2-circle' },
        { title: '', price: '', description: '', icon: 'bi-check2-circle' }
      ],
      testimonials: []
    });
    setModalTab('general');
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = async (id) => {
    try {
      setModalLoading(true);
      setEditingId(id);
      const res = await fetch(`/api/businesses/${id}`, { headers: authHeader() });
      const json = await res.json();
      if (json.success) {
        const b = json.data;
        setBizForm({
          name: b.name || '',
          slug: b.slug || '',
          category: b.category || '',
          status: b.status || 'live',
          tagline: b.tagline || '',
          description: b.description || '',
          about_text: b.about_text || '',
          phone: b.phone || '',
          whatsapp: b.whatsapp || '',
          email: b.email || '',
          address: b.address || '',
          google_map_url: b.google_map_url || '',
          theme_color: b.theme_color || '#3b82f6',
          logo_url: b.logo_url || '',
          hero_bg_url: b.hero_bg_url || '',
          services: b.services && b.services.length > 0 ? b.services : [{ title: '', price: '', description: '' }],
          testimonials: b.testimonials || []
        });
        setModalTab('general');
        setModalOpen(true);
      }
    } catch (e) {
      alert('Error fetching business detail');
    } finally {
      setModalLoading(false);
    }
  };

  // Save Business Form
  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId ? `/api/businesses/${editingId}` : '/api/businesses';

      const res = await fetch(endpoint, {
        method,
        headers: authHeader(),
        body: JSON.stringify(bizForm)
      });
      const json = await res.json();

      if (json.success) {
        setModalOpen(false);
        loadData();
      } else {
        alert(json.message || 'Failed to save business');
      }
    } catch (err) {
      alert('Network error while saving');
    }
  };

  // Delete Business
  const handleDeleteBusiness = async (id, name) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        const res = await fetch(`/api/businesses/${id}`, {
          method: 'DELETE',
          headers: authHeader()
        });
        const json = await res.json();
        if (json.success) {
          loadData();
        }
      } catch (err) {
        alert('Error deleting business');
      }
    }
  };

  // Update Lead Status
  const handleLeadStatusChange = async (id, newStatus) => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err) {
      alert('Error updating status');
    }
  };

  // Delete Lead
  const handleDeleteLead = async (id) => {
    if (confirm('Delete this inquiry?')) {
      try {
        await fetch(`/api/leads/${id}`, {
          method: 'DELETE',
          headers: authHeader()
        });
        loadData();
      } catch (err) {
        alert('Error deleting lead');
      }
    }
  };

  // Save Platform Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify(settings)
      });
      const json = await res.json();
      if (json.success) {
        alert('Platform settings saved successfully!');
      }
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  // Filtered lists
  const filteredBusinesses = businesses.filter(b => {
    const matchesStatus = bizStatusFilter === 'all' || b.status === bizStatusFilter;
    const q = bizSearch.toLowerCase().trim();
    const matchesQ = !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
    return matchesStatus && matchesQ;
  });

  const filteredLeads = leads.filter(l => {
    return leadStatusFilter === 'all' || l.status === leadStatusFilter;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ========== SIDEBAR ========== */}
      <aside style={{
        width: '260px',
        background: '#0f172a',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Globe size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>SCode Admin</h2>
            <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>React + Node.js CMS</small>
          </div>
        </div>

        <ul style={{ padding: '20px 12px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { id: 'businesses', label: 'Businesses', icon: <Building size={18} /> },
            { id: 'leads', label: 'Inquiries / Leads', icon: <MessageSquare size={18} /> },
            { id: 'settings', label: 'Platform CMS', icon: <Settings size={18} /> }
          ].map(tab => (
            <li key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activeTab === tab.id ? '#60a5fa' : '#94a3b8',
                  textAlign: 'left'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            </li>
          ))}

          <li style={{ marginTop: 'auto' }}>
            <Link
              to="/"
              target="_blank"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: '#60a5fa',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
            >
              <ExternalLink size={18} /> View Public Portal
            </Link>
          </li>
        </ul>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.username || 'Admin'}</div>
            <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Superadmin</small>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ========== MAIN VIEW CONTENT ========== */}
      <main style={{ marginLeft: '260px', flex: 1, padding: '30px 40px' }}>
        
        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'dashboard' && stats && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Overview Dashboard</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>Welcome back! Monitor your multi-business platform performance.</p>
              </div>
              <button onClick={handleOpenCreate} className="btn btn-primary">
                <Plus size={18} /> Add New Business
              </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>{stats.totalBusinesses}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Businesses</p>
                </div>
              </div>

              <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>{stats.liveBusinesses}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Live Websites</p>
                </div>
              </div>

              <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>{stats.upcomingBusinesses}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Upcoming Sites</p>
                </div>
              </div>

              <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>{stats.totalLeads}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Leads (<span style={{ color: '#34d399' }}>{stats.newLeads} new</span>)</p>
                </div>
              </div>
            </div>

            {/* Recent Leads Table */}
            <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Customer Inquiries</h2>
                <button
                  onClick={() => setActiveTab('leads')}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  View All Leads →
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Customer</th>
                    <th style={{ padding: '12px 16px' }}>Target Business</th>
                    <th style={{ padding: '12px 16px' }}>Service Requested</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentLeads.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <strong>{l.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{l.phone}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{l.business_name || 'SCode Main Portal'}</td>
                      <td style={{ padding: '14px 16px' }}>{l.service_requested || 'General'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: l.status === 'new' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                          color: l.status === 'new' ? '#60a5fa' : '#c084fc'
                        }}>
                          {l.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: BUSINESSES */}
        {activeTab === 'businesses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Business Websites Directory</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>Create, edit, and manage dynamic sub-business profile sites.</p>
              </div>
              <button onClick={handleOpenCreate} className="btn btn-primary">
                <Plus size={18} /> Create Business Site
              </button>
            </div>

            <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <input
                  type="text"
                  value={bizSearch}
                  onChange={(e) => setBizSearch(e.target.value)}
                  placeholder="Search by name, category, slug..."
                  style={{
                    minWidth: '300px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
                <select
                  value={bizStatusFilter}
                  onChange={(e) => setBizStatusFilter(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="live">Live</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>ID</th>
                    <th style={{ padding: '12px 16px' }}>Business Name &amp; Slug</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Services</th>
                    <th style={{ padding: '12px 16px' }}>Phone</th>
                    <th style={{ padding: '12px 16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBusinesses.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>#{b.id}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={b.logo_url || 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=80'}
                            alt={b.name}
                            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                          <div>
                            <strong>{b.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{b.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{b.category}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: b.status === 'live' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: b.status === 'live' ? '#34d399' : '#fbbf24'
                        }}>
                          {b.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#60a5fa', fontWeight: 600 }}>
                        {b.services ? b.services.length : 0}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>{b.phone || '-'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            to={`/b/${b.slug}`}
                            target="_blank"
                            title="Preview Sub-Site"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#34d399',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none'
                            }}
                          >
                            <ExternalLink size={14} />
                          </Link>

                          <button
                            onClick={() => handleOpenEdit(b.id)}
                            title="Edit Business"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#60a5fa',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteBusiness(b.id, b.name)}
                            title="Delete Business"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: LEADS CRM */}
        {activeTab === 'leads' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Customer Inquiries &amp; Leads CRM</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>All inquiries from main platform and sub-business websites saved into single database.</p>
              </div>
            </div>

            <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Inquiries</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>ID</th>
                    <th style={{ padding: '12px 16px' }}>Customer Info</th>
                    <th style={{ padding: '12px 16px' }}>Target Business</th>
                    <th style={{ padding: '12px 16px' }}>Requirement</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Received</th>
                    <th style={{ padding: '12px 16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(l => {
                    const cleanPhone = l.phone.replace(/[^0-9]/g, '');
                    const waLink = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(l.name)}%2C%20thank%20you%20for%20your%20inquiry%20regarding%20${encodeURIComponent(l.service_requested || 'our services')}.`;

                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>#{l.id}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <strong>{l.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{l.phone} {l.email ? `· ${l.email}` : ''}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 600, color: '#60a5fa' }}>{l.business_name || 'SCode Main Portal'}</span>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{l.service_requested || 'General Inquiry'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '240px', fontSize: '0.85rem' }}>
                          {l.message || 'No extra notes'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            value={l.status}
                            onChange={(e) => handleLeadStatusChange(l.id, e.target.value)}
                            style={{
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              color: '#fff',
                              fontSize: '0.8rem'
                            }}
                          >
                            <option value="new">NEW</option>
                            <option value="contacted">CONTACTED</option>
                            <option value="closed">CLOSED</option>
                          </select>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                          {new Date(l.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Reply on WhatsApp"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: 'rgba(37, 211, 102, 0.15)',
                                border: '1px solid rgba(37, 211, 102, 0.3)',
                                color: '#25d366',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none'
                              }}
                            >
                              <MessageSquare size={14} />
                            </a>

                            <button
                              onClick={() => handleDeleteLead(l.id)}
                              title="Delete Lead"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Platform CMS &amp; Settings</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>Configure main portal hero text, counters, and contact details.</p>
            </div>

            <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', maxWidth: '800px' }}>
              <form onSubmit={handleSaveSettings}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Main Portal Hero Headline</label>
                  <input
                    type="text"
                    value={settings.platform_tagline}
                    onChange={(e) => setSettings({ ...settings, platform_tagline: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#fff'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Portal Subtitle / Description</label>
                  <textarea
                    rows="3"
                    value={settings.platform_description}
                    onChange={(e) => setSettings({ ...settings, platform_description: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#fff'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Support Phone</label>
                    <input
                      type="text"
                      value={settings.contact_phone}
                      onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#fff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>WhatsApp Contact</label>
                    <input
                      type="text"
                      value={settings.contact_whatsapp}
                      onChange={(e) => setSettings({ ...settings, contact_whatsapp: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#fff'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Support Email</label>
                    <input
                      type="email"
                      value={settings.contact_email}
                      onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#fff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Hero Businesses Counter (e.g. 45+)</label>
                    <input
                      type="text"
                      value={settings.stat_businesses_count}
                      onChange={(e) => setSettings({ ...settings, stat_businesses_count: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#fff'
                      }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  Save Platform Settings
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ========== CREATE / EDIT BUSINESS MODAL ========== */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#131c2e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {editingId ? 'Edit Business Profile' : 'Create New Business Website'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBusiness} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px' }}>
                  {['general', 'contact', 'branding', 'services'].map(tabKey => (
                    <button
                      key={tabKey}
                      type="button"
                      onClick={() => setModalTab(tabKey)}
                      style={{
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        color: modalTab === tabKey ? '#3b82f6' : '#94a3b8',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        borderBottom: modalTab === tabKey ? '2px solid #3b82f6' : '2px solid transparent',
                        textTransform: 'capitalize'
                      }}
                    >
                      {tabKey === 'general' ? 'General Info' : tabKey === 'contact' ? 'Contact & Location' : tabKey === 'branding' ? 'Theme & Media' : 'Services'}
                    </button>
                  ))}
                </div>

                {/* TAB 1: General */}
                {modalTab === 'general' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Business Name *</label>
                        <input
                          type="text"
                          value={bizForm.name}
                          onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                          placeholder="e.g. Clean Water Solutions"
                          required
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Subsite URL Slug (e.g. clean-water-solutions)</label>
                        <input
                          type="text"
                          value={bizForm.slug}
                          onChange={(e) => setBizForm({ ...bizForm, slug: e.target.value })}
                          placeholder="clean-water-solutions"
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Category *</label>
                        <input
                          type="text"
                          value={bizForm.category}
                          onChange={(e) => setBizForm({ ...bizForm, category: e.target.value })}
                          placeholder="e.g. Water Treatment & AMC"
                          required
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Status</label>
                        <select
                          value={bizForm.status}
                          onChange={(e) => setBizForm({ ...bizForm, status: e.target.value })}
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        >
                          <option value="live">Live (Active Website)</option>
                          <option value="upcoming">Upcoming (Launching Soon)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Tagline / Headline</label>
                      <input
                        type="text"
                        value={bizForm.tagline}
                        onChange={(e) => setBizForm({ ...bizForm, tagline: e.target.value })}
                        placeholder="e.g. Clean Water Initiative — 10+ Years Excellence"
                        style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Short Description (for cards)</label>
                      <textarea
                        rows="2"
                        value={bizForm.description}
                        onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })}
                        placeholder="Brief summary..."
                        style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>About Us Story</label>
                      <textarea
                        rows="3"
                        value={bizForm.about_text}
                        onChange={(e) => setBizForm({ ...bizForm, about_text: e.target.value })}
                        placeholder="Company history, team, and credibility points..."
                        style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: Contact */}
                {modalTab === 'contact' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                        <input
                          type="text"
                          value={bizForm.phone}
                          onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>WhatsApp Number</label>
                        <input
                          type="text"
                          value={bizForm.whatsapp}
                          onChange={(e) => setBizForm({ ...bizForm, whatsapp: e.target.value })}
                          placeholder="+91 98765 43210"
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Business Email</label>
                        <input
                          type="email"
                          value={bizForm.email}
                          onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                          placeholder="contact@example.com"
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Google Maps Location URL</label>
                        <input
                          type="url"
                          value={bizForm.google_map_url}
                          onChange={(e) => setBizForm({ ...bizForm, google_map_url: e.target.value })}
                          placeholder="https://maps.google.com/?q=..."
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Complete Address</label>
                      <textarea
                        rows="2"
                        value={bizForm.address}
                        onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })}
                        placeholder="Shop No, Street, City, Pincode"
                        style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: Branding */}
                {modalTab === 'branding' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Theme Color</label>
                        <input
                          type="color"
                          value={bizForm.theme_color}
                          onChange={(e) => setBizForm({ ...bizForm, theme_color: e.target.value })}
                          style={{ width: '100%', height: '42px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '4px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Logo Image URL</label>
                        <input
                          type="url"
                          value={bizForm.logo_url}
                          onChange={(e) => setBizForm({ ...bizForm, logo_url: e.target.value })}
                          placeholder="https://images.unsplash.com/..."
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Hero Background Image URL</label>
                      <input
                        type="url"
                        value={bizForm.hero_bg_url}
                        onChange={(e) => setBizForm({ ...bizForm, hero_bg_url: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: Services */}
                {modalTab === 'services' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4>Offerings &amp; Services Catalog</h4>
                      <button
                        type="button"
                        onClick={() => setBizForm({ ...bizForm, services: [...bizForm.services, { title: '', price: '', description: '' }] })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        <PlusCircle size={14} /> Add Service
                      </button>
                    </div>

                    {bizForm.services.map((svc, idx) => (
                      <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '14px', marginBottom: '12px', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...bizForm.services];
                            updated.splice(idx, 1);
                            setBizForm({ ...bizForm, services: updated });
                          }}
                          style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Service Title</label>
                            <input
                              type="text"
                              value={svc.title}
                              onChange={(e) => {
                                const updated = [...bizForm.services];
                                updated[idx].title = e.target.value;
                                setBizForm({ ...bizForm, services: updated });
                              }}
                              placeholder="e.g. Industrial RO Water Treatment"
                              required
                              style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.9rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Price / Tag</label>
                            <input
                              type="text"
                              value={svc.price}
                              onChange={(e) => {
                                const updated = [...bizForm.services];
                                updated[idx].price = e.target.value;
                                setBizForm({ ...bizForm, services: updated });
                              }}
                              placeholder="e.g. From ₹4,999 / Free Quote"
                              style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Service Description</label>
                          <textarea
                            rows="2"
                            value={svc.description}
                            onChange={(e) => {
                              const updated = [...bizForm.services];
                              updated[idx].description = e.target.value;
                              setBizForm({ ...bizForm, services: updated });
                            }}
                            placeholder="Brief service description..."
                            style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Business Website
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboardPage;
