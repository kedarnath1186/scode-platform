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
  Globe,
  Bot,
  CreditCard,
  QrCode,
  Download,
  RefreshCw,
  AlertCircle,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckSquare,
  XCircle,
  Eye,
  History,
  ShieldAlert,
  FileCheck,
  Archive,
  RotateCcw,
  FileText,
  TrendingUp,
  Percent,
  UserCheck
} from 'lucide-react';
import AdminChatbot from '../components/AdminChatbot';
import ScodeLogo from '../components/ScodeLogo';

const AdminDashboardPage = () => {
  const [token, setToken] = useState(localStorage.getItem('scode_admin_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('scode_admin_user') || '{}'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  // Dashboard Stats & Needs Attention
  const [stats, setStats] = useState(null);
  const [needsAttention, setNeedsAttention] = useState(null);

  // Approvals Queue State (Feature 1b)
  const [approvalsList, setApprovalsList] = useState([]);
  const [approvalsFilter, setApprovalsFilter] = useState('pending_review');
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalActionModal, setApprovalActionModal] = useState({
    open: false,
    type: null, // 'reject' | 'changes' | 'history' | 'edit'
    item: null,
    reason: '',
    historyLogs: []
  });
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Businesses State & Soft-Delete Trash State
  const [businesses, setBusinesses] = useState([]);
  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState('all');
  const [trashList, setTrashList] = useState([]);
  const [bizViewMode, setBizViewMode] = useState('active'); // 'active' | 'trash'

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

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

  // Billing & Subscriptions State
  const [billingData, setBillingData] = useState(null);
  const [plansList, setPlansList] = useState([]);
  const [manualPaymentModalOpen, setManualPaymentModalOpen] = useState(false);
  const [manualPaymentLoading, setManualPaymentLoading] = useState(false);
  const [manualPaymentForm, setManualPaymentForm] = useState({
    business_id: '',
    plan_id: '',
    amount: '',
    payment_method: 'offline',
    notes: ''
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
    loadPlans();
    loadNeedsAttention();
  }, [token, activeTab]);

  const authHeader = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/billing/plans');
      const json = await res.json();
      if (json.success) setPlansList(json.data);
    } catch (e) {
      console.warn('Error fetching plans', e);
    }
  };

  const loadNeedsAttention = async () => {
    try {
      const res = await fetch('/api/approvals/needs-attention', { headers: authHeader() });
      const json = await res.json();
      if (json.success) setNeedsAttention(json.data);
    } catch (e) {
      console.warn('Error fetching needs attention', e);
    }
  };

  const loadApprovals = async (status = approvalsFilter) => {
    try {
      setApprovalsLoading(true);
      const res = await fetch(`/api/approvals/pending?status=${status}`, { headers: authHeader() });
      const json = await res.json();
      if (json.success) {
        setApprovalsList(json.data);
      }
    } catch (e) {
      console.error('Error loading approvals', e);
    } finally {
      setApprovalsLoading(false);
    }
  };

  const loadTrash = async () => {
    try {
      const res = await fetch('/api/businesses/admin/trash', { headers: authHeader() });
      const json = await res.json();
      if (json.success) setTrashList(json.data);
    } catch (e) {
      console.warn('Error fetching trash', e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await fetch('/api/stats/audit-logs', { headers: authHeader() });
      const json = await res.json();
      if (json.success) setAuditLogs(json.data);
    } catch (e) {
      console.error('Error fetching audit logs', e);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRestoreBusiness = async (id, name) => {
    if (!confirm(`Restore "${name}" from trash?`)) return;
    try {
      const res = await fetch(`/api/businesses/admin/trash/${id}/restore`, {
        method: 'POST',
        headers: authHeader()
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        loadData();
        loadTrash();
      } else {
        alert(json.message || 'Error restoring business');
      }
    } catch (e) {
      alert('Error restoring business');
    }
  };

  const handlePermanentDelete = async (id, name) => {
    if (!confirm(`⚠️ PERMANENT DELETE: Are you sure you want to permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/businesses/admin/trash/${id}`, {
        method: 'DELETE',
        headers: authHeader()
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        loadTrash();
      } else {
        alert(json.message || 'Error permanently deleting business');
      }
    } catch (e) {
      alert('Error permanently deleting business');
    }
  };

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const res = await fetch('/api/stats/dashboard', { headers: authHeader() });
        const json = await res.json();
        if (json.success) setStats(json.data);
        loadNeedsAttention();
      } else if (activeTab === 'approvals') {
        loadApprovals();
        loadNeedsAttention();
      } else if (activeTab === 'businesses') {
        const res = await fetch('/api/businesses', { headers: authHeader() });
        const json = await res.json();
        if (json.success) setBusinesses(json.data);
        loadTrash();
      } else if (activeTab === 'leads') {
        const res = await fetch('/api/leads', { headers: authHeader() });
        const json = await res.json();
        if (json.success) setLeads(json.data);
      } else if (activeTab === 'billing') {
        const res = await fetch('/api/billing/admin/overview', { headers: authHeader() });
        const json = await res.json();
        if (json.success) setBillingData(json.data);
        // Also ensure businesses are loaded for dropdowns
        const bizRes = await fetch('/api/businesses', { headers: authHeader() });
        const bizJson = await bizRes.json();
        if (bizJson.success) setBusinesses(bizJson.data);
      } else if (activeTab === 'audit') {
        loadAuditLogs();
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success) setSettings(json.data);
      }
    } catch (err) {
      console.error('Error fetching admin data', err);
    }
  };

  // Execute Approval Actions
  const handleApprove = async (biz) => {
    if (!confirm(`Are you sure you want to approve "${biz.name}" and publish its website live?`)) return;
    try {
      setActionSubmitting(true);
      const res = await fetch(`/api/approvals/${biz.id}/action`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ action: 'approve' })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        loadApprovals();
        loadNeedsAttention();
      } else {
        alert(json.message || 'Approval failed');
      }
    } catch (e) {
      alert('Error approving business');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleOpenRejectModal = (biz) => {
    setApprovalActionModal({
      open: true,
      type: 'reject',
      item: biz,
      reason: '',
      historyLogs: []
    });
  };

  const handleOpenChangesModal = (biz) => {
    setApprovalActionModal({
      open: true,
      type: 'changes',
      item: biz,
      reason: biz.change_request_notes || '',
      historyLogs: []
    });
  };

  const handleOpenHistoryModal = async (biz) => {
    try {
      const res = await fetch(`/api/approvals/${biz.id}/history`, { headers: authHeader() });
      const json = await res.json();
      setApprovalActionModal({
        open: true,
        type: 'history',
        item: biz,
        reason: '',
        historyLogs: json.success ? json.data : []
      });
    } catch (e) {
      alert('Failed to load audit history');
    }
  };

  const handleConfirmActionModal = async (e) => {
    e.preventDefault();
    if (!approvalActionModal.item) return;

    try {
      setActionSubmitting(true);
      const { type, item, reason } = approvalActionModal;
      let action = type === 'reject' ? 'reject' : 'request_changes';

      const res = await fetch(`/api/approvals/${item.id}/action`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          action,
          reason,
          change_notes: reason
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setApprovalActionModal({ open: false, type: null, item: null, reason: '', historyLogs: [] });
        loadApprovals();
        loadNeedsAttention();
      } else {
        alert(json.message || 'Action failed');
      }
    } catch (e) {
      alert('Network error executing action');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Open Manual Payment Modal (Superadmin only)
  const handleOpenManualPayment = (bizId = '', planId = '') => {
    if (user?.role !== 'superadmin') {
      alert('🔒 Access Denied: Only users with the "superadmin" role can record manual offline payments. (Current role: ' + (user?.role || 'admin') + ')');
      return;
    }
    const selectedPlan = plansList.find(p => p.id === parseInt(planId, 10)) || plansList[0];
    setManualPaymentForm({
      business_id: bizId ? bizId.toString() : (businesses.length > 0 ? businesses[0].id.toString() : ''),
      plan_id: planId ? planId.toString() : (selectedPlan ? selectedPlan.id.toString() : ''),
      amount: selectedPlan ? selectedPlan.price.toString() : '299900',
      payment_method: 'offline',
      notes: ''
    });
    setManualPaymentModalOpen(true);
  };

  // Save Manual Payment
  const handleSaveManualPayment = async (e) => {
    e.preventDefault();
    if (!manualPaymentForm.business_id || !manualPaymentForm.plan_id) {
      alert('Please select both a business and a hosting plan.');
      return;
    }

    try {
      setManualPaymentLoading(true);
      const res = await fetch('/api/billing/admin/manual-payment', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          business_id: parseInt(manualPaymentForm.business_id, 10),
          plan_id: parseInt(manualPaymentForm.plan_id, 10),
          amount: parseInt(manualPaymentForm.amount, 10),
          payment_method: manualPaymentForm.payment_method,
          notes: manualPaymentForm.notes
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setManualPaymentModalOpen(false);
        loadData();
      } else {
        alert(json.message || 'Failed to record manual payment');
      }
    } catch (err) {
      alert('Network error recording payment');
    } finally {
      setManualPaymentLoading(false);
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

  // Delete Business (Soft-delete to trash)
  const handleDeleteBusiness = async (id, name) => {
    if (confirm(`Move "${name}" to trash (soft-delete)? You can restore it later from the Trash tab.`)) {
      try {
        const res = await fetch(`/api/businesses/${id}`, {
          method: 'DELETE',
          headers: authHeader()
        });
        const json = await res.json();
        if (json.success) {
          loadData();
          loadTrash();
        } else {
          alert(json.message || 'Error moving business to trash');
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

  // Refund Payment
  const handleRefundPayment = async (payment) => {
    const reason = prompt(`Are you sure you want to refund ₹${((payment.amount || 0)/100).toLocaleString('en-IN')} for payment #${payment.id}? Enter optional reason:`, 'Customer requested refund');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/billing/admin/refund/${payment.id}`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ reason })
      });
      const json = await res.json();
      if (json.success) {
        alert('Payment refunded successfully!');
        loadData();
      } else {
        alert(json.message || 'Refund failed');
      }
    } catch (err) {
      alert('Network error while processing refund');
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
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ScodeLogo size="sm" />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>SCode Admin</h2>
            <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>React + Node.js CMS</small>
          </div>
        </div>

        <ul style={{ padding: '20px 12px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            {
              id: 'approvals',
              label: 'Approvals & QC',
              icon: <ShieldAlert size={18} />,
              badge: needsAttention?.pendingApprovals?.count || 0
            },
            { id: 'chatbot', label: 'AI User Search', icon: <Bot size={18} /> },
            { id: 'businesses', label: 'Businesses', icon: <Building size={18} /> },
            { id: 'billing', label: 'Billing & Plans', icon: <CreditCard size={18} /> },
            { id: 'leads', label: 'Inquiries / Leads', icon: <MessageSquare size={18} /> },
            { id: 'audit', label: 'Audit Trail', icon: <History size={18} /> },
            { id: 'settings', label: 'Platform CMS', icon: <Settings size={18} /> }
          ].map(tab => (
            <li key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                {tab.badge > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}>
                    {tab.badge}
                  </span>
                )}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Overview Dashboard</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>Welcome back! Monitor your multi-business platform performance and quality control.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setActiveTab('approvals')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                  <ShieldAlert size={16} /> Review Pending ({needsAttention?.pendingApprovals?.count || 0})
                </button>
                <button onClick={handleOpenCreate} className="btn btn-primary">
                  <Plus size={18} /> Add New Business
                </button>
              </div>
            </div>

            {/* Feature 1b: Single Combined "Needs Attention" Panel */}
            {needsAttention && (needsAttention.totalAttentionCount > 0 || needsAttention.pendingApprovals.count > 0) && (
              <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '14px', padding: '24px', marginBottom: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Needs Attention (Daily Command Center)</h3>
                      <small style={{ color: '#94a3b8' }}>Surfacing self-serve approvals, expiring domains, and failed payment alerts</small>
                    </div>
                  </div>
                  <span style={{ padding: '4px 12px', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700 }}>
                    {needsAttention.totalAttentionCount} Item{needsAttention.totalAttentionCount === 1 ? '' : 's'} Requiring Action
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {/* Card 1: Pending Approvals */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Pending Approvals</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>
                        {needsAttention.pendingApprovals.count}
                      </span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '12px' }}>
                      {needsAttention.pendingApprovals.over24hCount > 0 ? (
                        <strong style={{ color: '#ef4444' }}>⚠️ {needsAttention.pendingApprovals.over24hCount} submission(s) pending over 24h!</strong>
                      ) : (
                        'All submissions received within 24h.'
                      )}
                    </p>
                    <button
                      onClick={() => setActiveTab('approvals')}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Open Approvals Queue →
                    </button>
                  </div>

                  {/* Card 2: Expiring Subscriptions (7 Days) */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Expiring in 7 Days</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: needsAttention.expiringSoon.count7Days > 0 ? '#ef4444' : '#34d399' }}>
                        {needsAttention.expiringSoon.count7Days}
                      </span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '12px' }}>
                      {needsAttention.expiringSoon.count30Days} expiring across next 30 days.
                    </p>
                    <button
                      onClick={() => setActiveTab('billing')}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      View Expiring Domains →
                    </button>
                  </div>

                  {/* Card 3: Failed Payments */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Failed Payment Alerts</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: needsAttention.failedPayments.count > 0 ? '#ef4444' : '#34d399' }}>
                        {needsAttention.failedPayments.count}
                      </span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '12px' }}>
                      {needsAttention.failedPayments.count > 0 ? 'Requires customer follow-up.' : 'Zero declined transactions.'}
                    </p>
                    <button
                      onClick={() => setActiveTab('billing')}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Inspect Payment Logs →
                    </button>
                  </div>
                </div>
              </div>
            )}

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

        {/* VIEW 1.5: APPROVALS & QUALITY CONTROL QUEUE (Feature 1b) */}
        {activeTab === 'approvals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={28} color="#fbbf24" />
                  <span>Pending Approvals &amp; Quality Control Queue</span>
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
                  Review self-serve business registrations, verify Razorpay payments, run completeness checklists, and approve before websites go live.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => loadApprovals()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <RefreshCw size={15} className={approvalsLoading ? 'spin' : ''} /> Refresh Queue
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'pending_review', label: 'Pending Review' },
                { id: 'rejected', label: 'Rejected Submissions' },
                { id: 'all', label: 'All Review Records' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setApprovalsFilter(f.id);
                    loadApprovals(f.id);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: approvalsFilter === f.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.06)',
                    color: approvalsFilter === f.id ? '#fff' : '#94a3b8'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Submissions List */}
            {approvalsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                <Loader2 size={36} className="spin" style={{ margin: '0 auto 12px' }} />
                <p>Loading quality control queue...</p>
              </div>
            ) : approvalsList.length === 0 ? (
              <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '50px 20px', textAlign: 'center' }}>
                <CheckCircle size={44} color="#34d399" style={{ margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>Approvals Queue is Clear!</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
                  There are no business submissions currently waiting for review under this filter. New self-serve hosting orders will automatically appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {approvalsList.map(item => {
                  const isPending = item.status === 'pending_review';
                  const isRejected = item.status === 'rejected';

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#131c2e',
                        border: `1px solid ${item.is_over_24h ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '14px',
                        padding: '24px',
                        boxShadow: item.is_over_24h ? '0 0 20px rgba(239, 68, 68, 0.15)' : 'none'
                      }}
                    >
                      {/* Item Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={item.logo_url || 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=100'}
                            alt={item.name}
                            style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{item.name}</h3>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>
                                #{item.id}
                              </span>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
                              {item.category} · Preview Subdomain: <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{item.slug}.scode.in</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Age Badge */}
                          {item.is_over_24h ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8rem', fontWeight: 700 }}>
                              <AlertTriangle size={14} /> PENDING OVER 24H ({item.pending_hours}h)
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                              <Clock size={14} /> Received {item.pending_hours}h ago
                            </span>
                          )}

                          {/* Status Tag */}
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: isPending ? 'rgba(245, 158, 11, 0.15)' : (isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                            color: isPending ? '#fbbf24' : (isRejected ? '#f87171' : '#34d399')
                          }}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* 3-Column Inspection Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        
                        {/* Column 1: Details */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '16px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                            Business &amp; Contact Profile
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                            <div><strong style={{ color: '#cbd5e1' }}>Phone:</strong> {item.phone || 'None'}</div>
                            <div><strong style={{ color: '#cbd5e1' }}>Email:</strong> {item.email || 'None'}</div>
                            <div><strong style={{ color: '#cbd5e1' }}>Location:</strong> {item.address ? `${item.address}, ${item.city}` : item.city}</div>
                            {item.tagline && <div><strong style={{ color: '#cbd5e1' }}>Tagline:</strong> "{item.tagline}"</div>}
                            <div style={{ color: '#94a3b8', marginTop: '4px', lineHeight: 1.4, fontSize: '0.8rem' }}>
                              <strong style={{ color: '#cbd5e1' }}>Description:</strong> {item.description ? (item.description.slice(0, 120) + (item.description.length > 120 ? '...' : '')) : 'No description entered'}
                            </div>
                            {item.rejection_reason && (
                              <div style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8rem' }}>
                                <strong>Rejection Reason:</strong> {item.rejection_reason}
                              </div>
                            )}
                            {item.change_request_notes && (
                              <div style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '0.8rem' }}>
                                <strong>Changes Requested:</strong> {item.change_request_notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Payment Cross-Check */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '16px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={16} /> Verified Payment Cross-Check
                          </h4>
                          {item.payment ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8' }}>Plan:</span>
                                <strong>{item.payment.plan_name || item.plan_name || 'Hosting Plan'}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8' }}>Amount Paid:</span>
                                <strong style={{ color: '#34d399', fontSize: '1rem' }}>₹{((item.payment.amount || item.plan_price || 0) / 100).toLocaleString('en-IN')}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8' }}>Payment Status:</span>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700, fontSize: '0.75rem' }}>
                                  {item.payment.status.toUpperCase()}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginTop: '6px' }}>
                                <div>Order: {item.payment.razorpay_order_id}</div>
                                {item.payment.razorpay_payment_id && <div style={{ color: '#60a5fa' }}>PayID: {item.payment.razorpay_payment_id}</div>}
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                              <div>Plan: <strong>{item.plan_name || 'Standard Plan'}</strong></div>
                              <div style={{ color: '#fbbf24', marginTop: '6px' }}>Payment recorded via self-serve verification</div>
                            </div>
                          )}
                        </div>

                        {/* Column 3: Auto-Generated Completeness Checklist */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', margin: 0 }}>
                              Completeness Checklist
                            </h4>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: item.checklist.score >= 80 ? '#34d399' : '#fbbf24' }}>
                              {item.checklist.score}%
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem' }}>
                            {item.checklist.items.map((chk, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: chk.passed ? '#cbd5e1' : '#94a3b8' }}>
                                {chk.passed ? (
                                  <CheckCircle size={13} color="#34d399" />
                                ) : (
                                  <XCircle size={13} color="#f87171" />
                                )}
                                <span style={{ textDecoration: chk.passed ? 'none' : 'line-through', opacity: chk.passed ? 1 : 0.7 }}>
                                  {chk.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Duplicate Alert Box (Feature 1b) */}
                      {item.has_duplicates && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
                          <h5 style={{ color: '#f87171', fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                            <AlertTriangle size={16} /> Duplicate Detection Warning
                          </h5>
                          <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                            This business matches existing records in the database:
                            <ul style={{ margin: '6px 0 0 20px', padding: 0 }}>
                              {item.duplicates.map((dup, idx) => (
                                <li key={idx}>
                                  <strong>{dup.business_name}</strong> (#{dup.business_id}) — Matched: <span style={{ color: '#fca5a5' }}>{dup.matched_fields.join(', ')}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {/* Live Preview Button */}
                          <Link
                            to={`/b/${item.slug}`}
                            target="_blank"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              textDecoration: 'none',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            <Eye size={15} /> Preview Sub-Site (QC)
                          </Link>

                          {/* Quick Edit */}
                          <button
                            onClick={() => handleOpenEdit(item.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            <Edit2 size={14} /> Quick Edit
                          </button>

                          {/* Audit History */}
                          <button
                            onClick={() => handleOpenHistoryModal(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            <History size={14} /> Audit Log
                          </button>
                        </div>

                        {/* Approval Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleOpenChangesModal(item)}
                            disabled={actionSubmitting}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 16px',
                              borderRadius: '8px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              color: '#fbbf24',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.85rem'
                            }}
                          >
                            Request Changes
                          </button>

                          <button
                            onClick={() => handleOpenRejectModal(item)}
                            disabled={actionSubmitting}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 16px',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.85rem'
                            }}
                          >
                            <XCircle size={15} /> Reject
                          </button>

                          <button
                            onClick={() => handleApprove(item)}
                            disabled={actionSubmitting}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 20px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                            }}
                          >
                            <CheckCircle size={16} /> Approve &amp; Publish Live
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: BUSINESSES */}
        {activeTab === 'businesses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Business Websites Directory</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>Create, edit, soft-delete, and restore dynamic business profile sites.</p>
              </div>
              <button onClick={handleOpenCreate} className="btn btn-primary">
                <Plus size={18} /> Create Business Site
              </button>
            </div>

            {/* View Mode Toggle: Active vs Trash */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                onClick={() => setBizViewMode('active')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: bizViewMode === 'active' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                  color: '#fff'
                }}
              >
                Active Directory ({businesses.length})
              </button>
              <button
                onClick={() => { setBizViewMode('trash'); loadTrash(); }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: bizViewMode === 'trash' ? '#ef4444' : 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} /> Trash / Deleted ({trashList.length})
              </button>
            </div>

            {bizViewMode === 'active' ? (
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

                            <a
                              href={`/api/qr?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/b/' + b.slug : 'https://scode.in/b/' + b.slug)}&download=true&filename=${b.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Download Signage QR Code (PNG)"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.25)',
                                color: '#c084fc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none'
                              }}
                            >
                              <QrCode size={14} />
                            </a>

                            <button
                              onClick={() => handleOpenManualPayment(b.id, b.current_plan_id)}
                              title={user?.role === 'superadmin' ? "Record Offline Payment / Renew Subscription" : "Superadmin required for manual payment"}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: '#34d399',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: user?.role === 'superadmin' ? 1 : 0.5
                              }}
                            >
                              <CreditCard size={14} />
                            </button>

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
                              title="Move to Trash (Soft Delete)"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
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
            ) : (
              /* Trash / Soft-Deleted Businesses View */
              <div style={{ background: '#131c2e', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trash2 size={18} /> Soft-Deleted Businesses in Trash ({trashList.length})
                  </h3>
                  <button onClick={loadTrash} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    <RefreshCw size={14} /> Refresh Trash
                  </button>
                </div>

                {trashList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <CheckCircle size={32} color="#34d399" style={{ margin: '0 auto 12px' }} />
                    <p>Trash is empty. No soft-deleted businesses found.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px' }}>ID</th>
                        <th style={{ padding: '12px 16px' }}>Business Name</th>
                        <th style={{ padding: '12px 16px' }}>Category</th>
                        <th style={{ padding: '12px 16px' }}>Deleted At</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                        <th style={{ padding: '12px 16px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trashList.map(tb => (
                        <tr key={tb.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>#{tb.id}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <strong>{tb.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tb.slug}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>{tb.category}</td>
                          <td style={{ padding: '14px 16px', color: '#f87171', fontSize: '0.85rem' }}>
                            {tb.deleted_at ? new Date(tb.deleted_at).toLocaleString() : 'Recent'}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.75rem', fontWeight: 700 }}>
                              TRASHED
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleRestoreBusiness(tb.id, tb.name)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                              >
                                <RotateCcw size={14} /> Restore
                              </button>

                              {user?.role === 'superadmin' ? (
                                <button
                                  onClick={() => handlePermanentDelete(tb.id, tb.name)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <Trash2 size={14} /> Permanent Delete
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>
                                  (Superadmin required to permanently delete)
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
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

        {/* VIEW 3.5: BILLING & PLANS */}
        {activeTab === 'billing' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Hosting Plans &amp; Billing</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
                  Track subscription revenue, Razorpay payments, expiring domains, and manual offline renewals.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => loadData()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <RefreshCw size={15} /> Refresh
                </button>
                <button onClick={() => handleOpenManualPayment()} className="btn btn-primary">
                  <CreditCard size={18} /> Record Offline Payment
                </button>
              </div>
            </div>

            {/* Billing Revenue KPI Cards */}
            {billingData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                      ₹{(billingData.revenue.totalRupees || 0).toLocaleString('en-IN')}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Revenue (All-Time)</p>
                  </div>
                </div>

                <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                      ₹{(billingData.revenue.thisMonthRupees || 0).toLocaleString('en-IN')}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Revenue This Month</p>
                  </div>
                </div>

                <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                      ₹{(billingData.revenue.todayRupees || 0).toLocaleString('en-IN')}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Revenue Today</p>
                  </div>
                </div>

                <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                      {billingData.counts.activeSubscriptions}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Active Subscriptions</p>
                  </div>
                </div>
              </div>
            )}

            {/* Growth & Retention Metrics */}
            {billingData && billingData.growth && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} color="#3b82f6" /> SaaS Growth &amp; Retention Analytics
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  {/* MRR Card */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, #131c2e 100%)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Monthly Recurring Revenue (MRR)</span>
                      <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                        <TrendingUp size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1.1 }}>
                      ₹{(billingData.growth.mrr?.mrrRupees || 0).toLocaleString('en-IN')}
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '8px' }}>
                      Normalized monthly value across {billingData.growth.mrr?.activePaidBusinesses || 0} active paid subscriptions
                    </p>
                  </div>

                  {/* Churn Rate Card */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, #131c2e 100%)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>30-Day Churn Rate</span>
                      <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                        <Percent size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: (billingData.growth.churn?.churnRatePercent || 0) > 0 ? '#f87171' : '#34d399', lineHeight: 1.1 }}>
                      {billingData.growth.churn?.churnRatePercent || 0}%
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '8px' }}>
                      {billingData.growth.churn?.unrenewedCount || 0} unrenewed of {billingData.growth.churn?.expiredInLast30Days || 0} expired in last 30d
                    </p>
                  </div>

                  {/* Lead-to-Paid Conversion Card */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, #131c2e 100%)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Lead-to-Paid Conversion</span>
                      <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                        <UserCheck size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', lineHeight: 1.1 }}>
                      {billingData.growth.leadConversion?.conversionRatePercent || 0}%
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '8px' }}>
                      {billingData.growth.leadConversion?.paidConversionsInLast30Days || 0} paid conversions / {billingData.growth.leadConversion?.leadsInLast30Days || 0} leads in last 30d
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Overdue Subscriptions Alert Section (Flagged — lifecycle automation missed) */}
            {billingData && billingData.growth && billingData.growth.overdue && billingData.growth.overdue.count > 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '24px', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color="#f87171" /> Overdue Businesses ({billingData.growth.overdue.count})
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
                  These businesses are still set to <strong style={{ color: '#fff' }}>"live"</strong> but their subscription expiry date has passed. Record a payment or suspend their status.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {billingData.growth.overdue.businesses.map(ob => (
                    <div key={ob.id} style={{ background: '#131c2e', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '1rem', color: '#fff' }}>{ob.name}</strong>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 600 }}>
                          OVERDUE
                        </span>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '12px' }}>
                        Expired on: <strong style={{ color: '#f87171' }}>{ob.expiry_date}</strong> • Plan: {ob.plan_name || 'Standard'}
                      </p>
                      <button
                        onClick={() => handleOpenManualPayment(ob.id, ob.current_plan_id)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CreditCard size={14} /> Record Renewal Payment
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expiring Subscriptions Section */}
            <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#fbbf24" /> Subscriptions Expiring in Next 30 Days ({billingData?.expiringBusinesses?.length || 0})
              </h2>

              {billingData && billingData.expiringBusinesses && billingData.expiringBusinesses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {billingData.expiringBusinesses.map(eb => (
                    <div key={eb.id} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '1rem', color: '#fff' }}>{eb.name}</strong>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 600 }}>
                          {eb.plan_name || 'Hosting Plan'}
                        </span>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '14px' }}>
                        Expires on: <strong style={{ color: '#fbbf24' }}>{eb.expiry_date}</strong>
                      </p>
                      <button
                        onClick={() => handleOpenManualPayment(eb.id, eb.current_plan_id)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#60a5fa',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CreditCard size={14} /> Renew / Record Payment
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                  ✅ All business subscriptions are active. No renewals due in the next 30 days.
                </p>
              )}
            </div>

            {/* Payments Transaction History Table */}
            <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>Payments &amp; Transactions History</h2>

              {billingData && billingData.payments && billingData.payments.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>ID</th>
                      <th style={{ padding: '12px 16px' }}>Business</th>
                      <th style={{ padding: '12px 16px' }}>Plan</th>
                      <th style={{ padding: '12px 16px' }}>Amount</th>
                      <th style={{ padding: '12px 16px' }}>Method</th>
                      <th style={{ padding: '12px 16px' }}>Order / Payment ID</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>#{p.id}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <strong>{p.business_name || 'New Registration'}</strong>
                          {p.business_slug && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.business_slug}.scode.in</div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>{p.plan_name || 'Standard Plan'}</td>
                        <td style={{ padding: '14px 16px', color: '#34d399', fontWeight: 700 }}>
                          ₹{((p.amount || 0) / 100).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textTransform: 'capitalize', fontSize: '0.85rem' }}>
                          {p.payment_method || 'razorpay'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          <div>{p.razorpay_order_id}</div>
                          {p.razorpay_payment_id && <div style={{ color: '#60a5fa' }}>{p.razorpay_payment_id}</div>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: p.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : (p.status === 'refunded' ? 'rgba(239, 68, 68, 0.15)' : (p.status === 'created' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)')),
                            color: p.status === 'paid' ? '#34d399' : (p.status === 'refunded' ? '#f87171' : (p.status === 'created' ? '#60a5fa' : '#f87171'))
                          }}>
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {p.status === 'paid' && (
                            <button
                              onClick={() => handleRefundPayment(p)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                            >
                              Refund
                            </button>
                          )}
                          {p.status === 'refunded' && (
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Refunded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#94a3b8', margin: 0 }}>No payment transactions found.</p>
              )}
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

        {/* VIEW 5: AI USER SEARCH CHATBOT */}
        {activeTab === 'chatbot' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bot size={32} color="#60a5fa" />
                <span>AI User Search Assistant</span>
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '4px' }}>
                Search and retrieve any user record across the system using natural language queries.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '24px' }}>
              {/* Quick Query Guide Card */}
              <div style={{ background: '#131c2e', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '14px', color: '#60a5fa' }}>
                  Natural Language Query Examples
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
                  The backend parser safely translates natural language into secure, parameterized database searches:
                </p>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {[
                    { label: 'Search by Name', example: 'Find user Rahul', desc: 'Finds all matching users with name "Rahul"' },
                    { label: 'Search by Full Name', example: 'Search for Kedarnath', desc: 'Matches exact or partial name "Kedarnath"' },
                    { label: 'Search by Email', example: 'Find the user with email rahul@gmail.com', desc: 'Extracts email address parameter' },
                    { label: 'Search by City', example: 'Show users from Pune', desc: 'Filters users living or based in Pune' },
                    { label: 'Search by Phone', example: 'Find user whose phone number is 9876543210', desc: 'Matches 10-digit mobile number' },
                    { label: 'Search by User ID', example: 'Find user with ID 1', desc: 'Direct lookup by exact user ID' },
                    { label: 'List All Users', example: 'Show all users', desc: 'Lists up to 50 users in database' }
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>
                          {item.label}
                        </span>
                        <div style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.9rem', marginTop: '2px' }}>
                          "{item.example}"
                        </div>
                        <small style={{ color: '#64748b', fontSize: '0.78rem' }}>{item.desc}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chatbot Highlights & Security Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#34d399' }}>
                    🔒 Security & Architecture
                  </h3>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#94a3b8' }}>
                    <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#34d399' }}>✓</span>
                      <span><strong>Controlled Execution:</strong> No arbitrary SQL strings are executed by the AI or user.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#34d399' }}>✓</span>
                      <span><strong>Parameterized SQL:</strong> All searches use safe parameter bindings.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#34d399' }}>✓</span>
                      <span><strong>Admin-Only Protected:</strong> Only authenticated admins with valid JWT token can query users.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#34d399' }}>✓</span>
                      <span><strong>Zero Sensitive Data Leaks:</strong> Passwords, hashes, and auth tokens are stripped.</span>
                    </li>
                  </ul>
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                  <Bot size={40} color="#60a5fa" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                    Floating Assistant is Ready
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Use the floating chat widget at the bottom right corner anytime while browsing any section of the admin panel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: AUDIT TRAIL & SECURITY LOGS */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <History size={28} color="#60a5fa" />
                  <span>Administrative Audit Trail</span>
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
                  Real-time immutable audit log of administrative actions, business modifications, soft-deletes, restorations, manual payments, and approvals.
                </p>
              </div>
              <button onClick={loadAuditLogs} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={15} /> Refresh Logs
              </button>
            </div>

            <div style={{ background: '#131c2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '24px' }}>
              {auditLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
                  <p>Loading audit logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p>No audit logs recorded yet.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>ID</th>
                      <th style={{ padding: '12px 16px' }}>Admin</th>
                      <th style={{ padding: '12px 16px' }}>Action</th>
                      <th style={{ padding: '12px 16px' }}>Entity Type</th>
                      <th style={{ padding: '12px 16px' }}>Entity ID</th>
                      <th style={{ padding: '12px 16px' }}>Details</th>
                      <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => {
                      const getActionBadgeColor = (action) => {
                        switch (action) {
                          case 'CREATE': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
                          case 'UPDATE': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
                          case 'SOFT_DELETE': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
                          case 'RESTORE': return { bg: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' };
                          case 'HARD_DELETE': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171' };
                          case 'MANUAL_PAYMENT': return { bg: 'rgba(139, 92, 246, 0.2)', color: '#c084fc' };
                          case 'APPROVE': return { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399' };
                          case 'REJECT': return { bg: 'rgba(244, 63, 94, 0.2)', color: '#fb7185' };
                          default: return { bg: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1' };
                        }
                      };
                      const badge = getActionBadgeColor(log.action);

                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>#{log.id}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <strong>{log.admin_username || `Admin #${log.admin_id || 'System'}`}</strong>
                            {log.admin_role && (
                              <div style={{ fontSize: '0.75rem', color: log.admin_role === 'superadmin' ? '#c084fc' : '#94a3b8' }}>
                                {log.admin_role}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.color
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#cbd5e1' }}>
                            {log.entity_type}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>
                            {log.entity_id ? `#${log.entity_id}` : '-'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#94a3b8', maxWidth: '300px', wordBreak: 'break-word' }}>
                            {log.details ? (
                              <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
                                {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Floating AI Chatbot Assistant */}
      <AdminChatbot token={token} />

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
                  {['general', 'contact', 'branding', 'services', 'qrcode'].map(tabKey => (
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
                      {tabKey === 'general' ? 'General Info' : tabKey === 'contact' ? 'Contact & Location' : tabKey === 'branding' ? 'Theme & Media' : tabKey === 'services' ? 'Services' : 'Signage QR'}
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
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Lifecycle Status</label>
                        <select
                          value={bizForm.status}
                          onChange={(e) => setBizForm({ ...bizForm, status: e.target.value })}
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        >
                          <option value="live">Live (Active Website)</option>
                          <option value="pending_review">Pending Review (Quality Control)</option>
                          <option value="upcoming">Upcoming (Launching Soon)</option>
                          <option value="suspended">Suspended (Expired Hosting)</option>
                          <option value="rejected">Rejected</option>
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
                  </div>
                )}

                {/* TAB 2: Contact */}
                {modalTab === 'contact' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                        <input
                          type="tel"
                          value={bizForm.phone}
                          onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>WhatsApp Number</label>
                        <input
                          type="tel"
                          value={bizForm.whatsapp}
                          onChange={(e) => setBizForm({ ...bizForm, whatsapp: e.target.value })}
                          placeholder="+91 98765 43210"
                          style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                        />
                      </div>
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
                        onClick={() => setBizForm({ ...bizForm, services: [...bizForm.services, { title: '', price: '', description: '', icon: 'bi-check2-circle' }] })}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        <Plus size={14} /> Add Service
                      </button>
                    </div>

                    {bizForm.services.map((s, idx) => (
                      <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Service #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = bizForm.services.filter((_, i) => i !== idx);
                              setBizForm({ ...bizForm, services: updated });
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '10px' }}>
                          <input
                            type="text"
                            value={s.title}
                            onChange={(e) => {
                              const updated = [...bizForm.services];
                              updated[idx].title = e.target.value;
                              setBizForm({ ...bizForm, services: updated });
                            }}
                            placeholder="Service Title *"
                            style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.9rem' }}
                          />
                          <input
                            type="text"
                            value={s.price || ''}
                            onChange={(e) => {
                              const updated = [...bizForm.services];
                              updated[idx].price = e.target.value;
                              setBizForm({ ...bizForm, services: updated });
                            }}
                            placeholder="Price (e.g. ₹499/mo)"
                            style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={s.description || ''}
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

                {/* TAB 5: QR Code Signage (Feature 2) */}
                {modalTab === 'qrcode' && (
                  <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
                      Physical Signage &amp; Standee QR Code
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 20px' }}>
                      Provide this high-resolution QR code to the business owner to print on storefronts, standees, menus, and business cards.
                    </p>

                    {bizForm.slug ? (
                      <div>
                        <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', marginBottom: '20px' }}>
                          <img
                            src={`/api/qr?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/b/' + bizForm.slug : 'https://scode.in/b/' + bizForm.slug)}&size=200&margin=2`}
                            alt="Business QR Code"
                            style={{ width: '180px', height: '180px', display: 'block' }}
                          />
                        </div>
                        <div style={{ fontFamily: 'monospace', color: '#60a5fa', fontSize: '0.9rem', marginBottom: '16px' }}>
                          https://{bizForm.slug}.scode.in
                        </div>
                        <a
                          href={`/api/qr?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/b/' + bizForm.slug : 'https://scode.in/b/' + bizForm.slug)}&download=true&filename=${bizForm.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            background: '#3b82f6',
                            color: '#fff',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}
                        >
                          <Download size={16} /> Download Signage PNG
                        </a>
                      </div>
                    ) : (
                      <p style={{ color: '#94a3b8' }}>Please enter a business slug first to generate the QR code.</p>
                    )}
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

      {/* ========== APPROVAL ACTIONS & AUDIT MODAL (Feature 1b) ========== */}
      {approvalActionModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', width: '100%', maxWidth: '540px', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {approvalActionModal.type === 'reject' ? (
                  <>
                    <XCircle size={20} color="#f87171" /> Reject Submission
                  </>
                ) : approvalActionModal.type === 'changes' ? (
                  <>
                    <AlertTriangle size={20} color="#fbbf24" /> Request Submission Changes
                  </>
                ) : (
                  <>
                    <History size={20} color="#60a5fa" /> Audit Log History
                  </>
                )}
              </h3>
              <button
                onClick={() => setApprovalActionModal({ open: false, type: null, item: null, reason: '', historyLogs: [] })}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Reject or Request Changes Form */}
            {(approvalActionModal.type === 'reject' || approvalActionModal.type === 'changes') && (
              <form onSubmit={handleConfirmActionModal}>
                <div style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#fff' }}>{approvalActionModal.item?.name}</strong> (#{approvalActionModal.item?.id})
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Domain: {approvalActionModal.item?.slug}.scode.in</div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      {approvalActionModal.type === 'reject' ? 'Reason for Rejection *' : 'Details of Changes Required *'}
                    </label>
                    <textarea
                      rows="4"
                      required
                      value={approvalActionModal.reason}
                      onChange={(e) => setApprovalActionModal({ ...approvalActionModal, reason: e.target.value })}
                      placeholder={approvalActionModal.type === 'reject' ? 'Explain why this submission was rejected (e.g. Inappropriate content, invalid phone number, duplicate business)...' : 'Detail what the business owner needs to correct before approval...'}
                      style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setApprovalActionModal({ open: false, type: null, item: null, reason: '', historyLogs: [] })}
                    style={{ padding: '10px 18px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      background: approvalActionModal.type === 'reject' ? '#ef4444' : '#f59e0b',
                      color: '#fff'
                    }}
                  >
                    {actionSubmitting ? <Loader2 size={16} className="spin" /> : approvalActionModal.type === 'reject' ? 'Confirm Rejection' : 'Submit Change Request'}
                  </button>
                </div>
              </form>
            )}

            {/* Audit History Log View */}
            {approvalActionModal.type === 'history' && (
              <div style={{ padding: '24px', maxHeight: '450px', overflowY: 'auto' }}>
                {approvalActionModal.historyLogs.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>No audit history records found for this business.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {approvalActionModal.historyLogs.map((log) => (
                      <div key={log.id} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: log.action === 'approve' ? 'rgba(16, 185, 129, 0.2)' : log.action === 'reject' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: log.action === 'approve' ? '#34d399' : log.action === 'reject' ? '#f87171' : '#60a5fa',
                            textTransform: 'uppercase'
                          }}>
                            {log.action}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: '6px 0 0' }}>
                          {log.reason || 'No description entered'}
                        </p>
                        {log.admin_username && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                            By Admin: <strong>{log.admin_username}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========== OFFLINE PAYMENT MODAL ========== */}
      {manualPaymentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#34d399" /> Record Offline Payment
              </h2>
              <button onClick={() => setManualPaymentModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveManualPayment}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Select Business *
                  </label>
                  <select
                    value={manualPaymentForm.business_id}
                    onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, business_id: e.target.value })}
                    required
                    style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }}
                  >
                    <option value="">-- Choose Business --</option>
                    {businesses.map(b => (
                      <option key={b.id} value={b.id} style={{ background: '#111827' }}>
                        {b.name} (#{b.id}) — {b.slug}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Subscription Plan *
                  </label>
                  <select
                    value={manualPaymentForm.plan_id}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const plan = plansList.find(p => p.id === parseInt(pid, 10));
                      setManualPaymentForm({
                        ...manualPaymentForm,
                        plan_id: pid,
                        amount: plan ? plan.price.toString() : manualPaymentForm.amount
                      });
                    }}
                    required
                    style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }}
                  >
                    <option value="">-- Choose Plan --</option>
                    {plansList.map(p => (
                      <option key={p.id} value={p.id} style={{ background: '#111827' }}>
                        {p.name} — ₹{(p.price / 100).toLocaleString('en-IN')} / {p.duration_months} mo
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      Amount (in Paise) *
                    </label>
                    <input
                      type="number"
                      value={manualPaymentForm.amount}
                      onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, amount: e.target.value })}
                      required
                      placeholder="e.g. 299900"
                      style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }}
                    />
                    <small style={{ color: '#34d399', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      = ₹{((parseInt(manualPaymentForm.amount || 0, 10)) / 100).toLocaleString('en-IN')}
                    </small>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      Payment Method
                    </label>
                    <select
                      value={manualPaymentForm.payment_method}
                      onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, payment_method: e.target.value })}
                      style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }}
                    >
                      <option value="offline" style={{ background: '#111827' }}>Offline Cash</option>
                      <option value="bank_transfer" style={{ background: '#111827' }}>Bank Transfer / NEFT</option>
                      <option value="upi_direct" style={{ background: '#111827' }}>Direct UPI Transfer</option>
                      <option value="cheque" style={{ background: '#111827' }}>Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Notes / Reference ID
                  </label>
                  <textarea
                    rows="2"
                    value={manualPaymentForm.notes}
                    onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, notes: e.target.value })}
                    placeholder="e.g. Cash collected by Field Officer, Ref: UTR12345678"
                    style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setManualPaymentModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualPaymentLoading}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {manualPaymentLoading ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                  Activate / Renew Subscription
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
