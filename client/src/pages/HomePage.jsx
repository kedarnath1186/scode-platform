import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Rocket,
  Grid,
  ShieldCheck,
  Building,
  CheckCircle2,
  Search,
  ArrowUpRight,
  Phone,
  MessageSquare,
  Mail,
  Send,
  Loader2,
  Sliders
} from 'lucide-react';
import ScodeLogo from '../components/ScodeLogo';

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
    'hero-title-gradient': 'Online with SCode',
    'hero-desc': 'Many local businesses still don’t have a website because they think it is expensive, complicated, and requires technical knowledge. At SCode, our goal is simple — help local businesses establish their online presence quickly and affordably.',
    'hero-cta-primary': 'Get Your Business Online',
    'hero-cta-secondary': 'View Portfolio',
    'stat-businesses': 'Businesses Online',
    'stat-domain': 'Domain Hassle',
    'stat-setup': 'Quick Setup',
    'problem-tag': 'The Challenge',
    'problem-title': 'Why Most Local Businesses Are Still Offline',
    'problem-subtitle': 'Many local businesses still don’t have a website because they believe it’s out of reach. Here’s what holds them back.',
    'solution-tag': 'The SCode Way',
    'solution-title': 'Your Business Profile Online',
    'solution-title-highlight': 'Without the Headaches',
    'solution-desc': 'Get your business profile online with a professional website on the SCode platform, without worrying about domain management or server hosting. We handle the tech — you focus on your business.'
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
    'hero-title-gradient': 'SCode के साथ ऑनलाइन लाएं',
    'hero-desc': 'कई स्थानीय व्यवसायों के पास अभी भी वेबसाइट नहीं है क्योंकि उन्हें लगता है कि यह महंगी और जटिल है। SCode में हमारा लक्ष्य सरल है — स्थानीय व्यवसायों को तेजी से और किफायती तरीके से ऑनलाइन उपस्थिति स्थापित करने में मदद करना।',
    'hero-cta-primary': 'अपना व्यवसाय ऑनलाइन करें',
    'hero-cta-secondary': 'पोर्टफोलियो देखें',
    'stat-businesses': 'व्यवसाय ऑनलाइन',
    'stat-domain': 'डोमेन का कोई झंझट नहीं',
    'stat-setup': 'तेज़ सेटअप',
    'problem-tag': 'चुनौतियाँ',
    'problem-title': 'अधिकांश स्थानीय व्यवसाय अभी भी ऑफ़लाइन क्यों हैं',
    'problem-subtitle': 'वेबसाइट बनाना अब महंगा या जटिल नहीं है। जानिए क्या उन्हें रोकता है।',
    'solution-tag': 'SCode का तरीका',
    'solution-title': 'आपकी व्यावसायिक प्रोफाइल ऑनलाइन',
    'solution-title-highlight': 'बिना किसी परेशानी के',
    'solution-desc': 'डोमेन प्रबंधन या सर्वर होस्टिंग की चिंता किए बिना SCode प्लेटफॉर्म पर एक पेशेवर वेबसाइट के साथ अपना व्यवसाय ऑनलाइन प्राप्त करें।'
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
    'hero-title-gradient': 'SCode सोबत ऑनलाइन आणा',
    'hero-desc': 'अनेक स्थानिक व्यवसायांकडे अजूनही वेबसाइट नाही कारण त्यांना वाटते की हे महाग आणि गुंतागुंतीचे आहे. SCode मध्ये आमचे ध्येय सोपे आहे — स्थानिक व्यवसायांना वेगाने आणि परवडणाऱ्या दरात डिजिटल ओळख मिळवून देणे.',
    'hero-cta-primary': 'व्यवसाय ऑनलाइन करा',
    'hero-cta-secondary': 'पोर्टफोलिओ पहा',
    'stat-businesses': 'व्यवसाय ऑनलाइन',
    'stat-domain': 'डोमेनचा कोणताही त्रास नाही',
    'stat-setup': 'जलद सेटअप',
    'problem-tag': 'समस्या',
    'problem-title': 'बहुतेक स्थानिक व्यवसाय अजूनही ऑफलाइन का आहेत',
    'problem-subtitle': 'वेबसाइट मिळवणे आता कठीण राहिलेले नाही. जाणून घ्या काय अडथळा येतो.',
    'solution-tag': 'SCode चा मार्ग',
    'solution-title': 'आपल्या व्यवसायाचे डिजिटल प्रोफाइल',
    'solution-title-highlight': 'कोणत्याही त्रासाशिवाय',
    'solution-desc': 'डोमेन किंवा होस्टिंगची चिंता न करता SCode प्लॅटफॉर्मवर आपल्या व्यवसायाची व्यावसायिक वेबसाइट मिळवा. तांत्रिक काम आम्ही सांभाळू — आपण व्यवसायावर लक्ष द्या.'
  }
};

const HomePage = () => {
  const [lang, setLang] = useState('en');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ liveCount: 45, domainHassle: '₹0', setupTime: '24hr' });

  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'Retail / Shop',
    message: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  useEffect(() => {
    fetchStats();
    fetchBusinesses();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats/public');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (e) {
      console.warn('Stats fetch error', e);
    }
  };

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/businesses');
      const data = await res.json();
      if (data.success) {
        setBusinesses(data.data);
      }
    } catch (e) {
      console.error('Error fetching businesses', e);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      setFormFeedback({ type: 'error', text: 'Please provide your name and phone number.' });
      return;
    }

    try {
      setFormSubmitting(true);
      setFormFeedback(null);
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: null,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          service_requested: formData.category,
          message: formData.message
        })
      });
      const data = await res.json();

      if (data.success) {
        setFormFeedback({ type: 'success', text: '🎉 Thank you! Your request has been received. Our team will contact you within 24 hours.' });
        setFormData({ name: '', phone: '', email: '', category: 'Retail / Shop', message: '' });
      } else {
        setFormFeedback({ type: 'error', text: data.message || 'Submission failed' });
      }
    } catch (err) {
      setFormFeedback({ type: 'error', text: 'Network error. Please message us on WhatsApp.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filtered Businesses
  const filteredBusinesses = businesses.filter(b => {
    const matchesFilter = filter === 'all' || b.status === filter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      b.name.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      (b.tagline && b.tagline.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="page-wrapper">
      {/* Background Grids & Orbs */}
      <div className="bg-grid"></div>
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* ========== NAVBAR ========== */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 0'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.25rem' }}>
            <ScodeLogo size="sm" />
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '4px', color: '#60a5fa' }}>
              PORTAL
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ display: 'flex', gap: '24px', listStyle: 'none' }}>
              <a href="#problem" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}>{t('nav-problem')}</a>
              <a href="#solution" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}>{t('nav-solution')}</a>
              <a href="#businesses" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}>{t('nav-businesses')}</a>
              <a href="#how" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}>{t('nav-how')}</a>
              <a href="#portfolio" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}>{t('nav-portfolio')}</a>
              <Link to="/host-your-business" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>Plans &amp; Hosting</Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Link to="/host-your-business" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <Rocket size={15} /> Host Business
              </Link>

              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="en" style={{ background: '#111827' }}>English</option>
                <option value="hi" style={{ background: '#111827' }}>हिन्दी</option>
                <option value="mr" style={{ background: '#111827' }}>मराठी</option>
              </select>

              <Link to="/admin" className="btn btn-admin" target="_blank">
                <ShieldCheck size={16} /> Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="section" style={{ padding: '90px 0 60px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '50px', alignItems: 'center' }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 18px',
                borderRadius: '999px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: '#60a5fa',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '24px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }}></span>
                <span>{t('hero-badge')}</span>
              </div>

              <h1 style={{ fontSize: '3.6rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '20px' }}>
                <span>{t('hero-title')}</span><br />
                <span className="text-gradient">{t('hero-title-gradient')}</span>
              </h1>

              <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', marginBottom: '36px', maxWidth: '620px' }}>
                {t('hero-desc')}
              </p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
                <Link to="/host-your-business" className="btn btn-primary">
                  <Rocket size={18} /> {t('hero-cta-primary')}
                </Link>
                <a href="#portfolio" className="btn btn-secondary">
                  <Grid size={18} /> {t('hero-cta-secondary')}
                </a>
              </div>

              <div style={{ display: 'flex', gap: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '28px' }}>
                <div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>
                    {stats.liveCount}<span style={{ color: 'var(--primary)' }}>+</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('stat-businesses')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>
                    {stats.domainHassle}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('stat-domain')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>
                    {stats.setupTime}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('stat-setup')}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Visual Live Card */}
            <div>
              <div style={{
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '4px 12px', fontSize: '0.8rem', color: '#60a5fa', fontFamily: 'monospace' }}>
                    https://yourbusiness.scode.in
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'inline-block', marginBottom: '6px' }}>LIVE SITE</span>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Clean Water Solutions</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Water Treatment & AMC</p>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'inline-block', marginBottom: '6px' }}>LIVE SITE</span>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Glory Computers</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>PC & Laptop Repair</p>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'inline-block', marginBottom: '6px' }}>LIVE SITE</span>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>SS Insurance Partner</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Health & Life Cover</p>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'inline-block', marginBottom: '6px' }}>UPCOMING</span>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Vitech Automation</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Smart IoT Systems</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== THE PROBLEM SECTION ========== */}
      <section className="section" id="problem">
        <div className="container">
          <div className="section-header">
            <span className="section-tag"><i className="bi bi-exclamation-triangle-fill"></i> {t('problem-tag')}</span>
            <h2 className="section-title">{t('problem-title')}</h2>
            <p className="section-subtitle">{t('problem-subtitle')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '32px 28px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>💰</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', fontWeight: 700 }}>Too Expensive</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Small businesses assume getting a website requires high upfront development, hosting, and ongoing IT retainers.
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '32px 28px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🧩</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', fontWeight: 700 }}>Too Complicated</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Registering domains, configuring DNS, SSL certificates, and server management feels daunting for non-technical owners.
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '32px 28px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>⚙️</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', fontWeight: 700 }}>Requires Tech Knowledge</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Many believe they need coding expertise to maintain content, security, or lead capture on their site.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== OUR SOLUTION SECTION ========== */}
      <section className="section" id="solution">
        <div className="container">
          <div style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            alignItems: 'center'
          }}>
            <div>
              <span className="section-tag"><i className="bi bi-stars"></i> {t('solution-tag')}</span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2 }}>
                <span>{t('solution-title')}</span>,<br />
                <span className="text-gradient">{t('solution-title-highlight')}</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '1.05rem' }}>
                {t('solution-desc')}
              </p>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>No Domain Hassle</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Dedicated sub-site route or subdomain instantly configured.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>Zero Server Management</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>We manage uptime, database backups, and hosting maintenance.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>Quick 24-Hour Setup</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Get online in 24 hours at a fraction of traditional agency costs.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>Single Database CRM</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>All customer leads delivered directly to your central admin panel.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== WHO WE HELP (CATEGORIES) ========== */}
      <section className="section" id="businesses">
        <div className="container">
          <div className="section-header">
            <span className="section-tag"><Building size={16} /> Who We Help</span>
            <h2 className="section-title">Built for Every Local Business</h2>
            <p className="section-subtitle">Whether you run a retail shop, hostel, IT service, or consultancy — SCode powers your digital profile.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { emoji: '🏪', title: 'Shops & Retail', desc: 'Local stores & retail outlets', cat: 'Shop' },
              { emoji: '🏠', title: 'PG & Hostels', desc: 'Paying guests & accommodation', cat: 'Hostel' },
              { emoji: '💻', title: 'Computer Business', desc: 'Repair, sales & IT services', cat: 'Computer' },
              { emoji: '🏗️', title: 'Real Estate', desc: 'Consultancy & plot sales', cat: 'Real Estate' },
              { emoji: '🛡️', title: 'Security Agencies', desc: 'Guard & facility management', cat: 'Security' },
              { emoji: '📋', title: 'Insurance Services', desc: 'Policies & advisory firms', cat: 'Insurance' },
              { emoji: '🏭', title: 'Manufacturing', desc: 'Industrial & production units', cat: 'Manufacturing' },
              { emoji: '🌟', title: 'Any Local Business', desc: 'We serve all business types', cat: '' }
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSearch(item.cat);
                  document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '28px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <span style={{ fontSize: '2.4rem', marginBottom: '14px', display: 'block' }}>{item.emoji}</span>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>{item.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS (TIMELINE) ========== */}
      <section className="section" id="how">
        <div className="container">
          <div className="section-header">
            <span className="section-tag"><Rocket size={16} /> How It Works</span>
            <h2 className="section-title">From Zero to Online in 4 Steps</h2>
            <p className="section-subtitle">Getting your business online with SCode is simpler than you think.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {[
              { num: '1', title: 'Reach Out', desc: 'Contact us via WhatsApp, call, or web form. Tell us about your business.' },
              { num: '2', title: 'Share Your Details', desc: 'Provide your business name, services, contact number, photos, and address.' },
              { num: '3', title: 'We Build It', desc: 'Our platform sets up your dynamic sub-site, catalog, and WhatsApp connect in 24 hours.' },
              { num: '4', title: 'Go Live!', desc: 'Your business profile is online ready to receive leads from customers.' }
            ].map((step, idx) => (
              <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '32px 24px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  marginBottom: '20px',
                  boxShadow: '0 0 15px var(--primary-glow)'
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== DYNAMIC PORTFOLIO DIRECTORY ========== */}
      <section className="section" id="portfolio">
        <div className="container">
          <div className="section-header">
            <span className="section-tag"><Grid size={16} /> Our Portfolio</span>
            <h2 className="section-title">Businesses Already on SCode</h2>
            <p className="section-subtitle">Explore live and upcoming business websites powered by the SCode platform single database.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '36px' }}>
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              {['all', 'live', 'upcoming'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: filter === f ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    color: filter === f ? '#fff' : 'var(--text-muted)',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {f === 'all' ? 'All Sites' : f}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: '280px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by business name or category..."
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px 10px 38px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Loader2 size={36} className="spin" style={{ margin: '0 auto 12px' }} />
              <p>Loading dynamic business profiles...</p>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <Search size={40} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
              <h3>No businesses found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Try adjusting your filter or search keywords.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {filteredBusinesses.map(b => {
                const isLive = b.status === 'live';
                return (
                  <div
                    key={b.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isLive ? '#34d399' : '#fbbf24',
                        border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLive ? '#34d399' : '#fbbf24' }}></span>
                        {isLive ? 'LIVE' : 'UPCOMING'}
                      </span>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {b.category}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>{b.name}</h3>
                    <p style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 500, marginBottom: '12px' }}>
                      {b.tagline || b.category}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '18px', flexGrow: 1 }}>
                      {b.description || 'Professional local business website powered by SCode platform.'}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                      {b.services && b.services.length > 0 ? (
                        b.services.slice(0, 3).map((s, idx) => (
                          <span key={idx} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                            {s.title}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                          {b.category}
                        </span>
                      )}
                    </div>

                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={14} /> {b.slug}.scode.in
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                      <Link
                        to={`/b/${b.slug}`}
                        target="_blank"
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          color: '#93c5fd',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '0.9rem'
                        }}
                      >
                        <ArrowUpRight size={16} /> {isLive ? 'Visit Sub-Site' : 'Preview Profile'}
                      </Link>

                      {b.whatsapp && (
                        <a
                          href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(b.name)}%2C%20I%20saw%20your%20website%20on%20SCode`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            width: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(37, 211, 102, 0.15)',
                            border: '1px solid rgba(37, 211, 102, 0.3)',
                            color: '#25d366',
                            borderRadius: 'var(--radius-sm)',
                            textDecoration: 'none'
                          }}
                        >
                          <MessageSquare size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========== CONTACT & CONSULTATION FORM ========== */}
      <section className="section" id="contact">
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
            border: '1px solid var(--border-glow)',
            borderRadius: 'var(--radius-lg)',
            padding: '56px 40px',
            textAlign: 'center',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
          }}>
            <span className="section-tag"><MessageSquare size={16} /> Get Started</span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800 }}>Ready to Take Your Business Online?</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '10px auto 0' }}>
              Fill out the simple form below or contact us on WhatsApp. We will set up your professional digital presence in 24 hours.
            </p>

            <div style={{ maxWidth: '600px', margin: '32px auto 0', textAlign: 'left' }}>
              <form onSubmit={handleContactSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Your Name / Owner Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Patil"
                      required
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      required
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="business@example.com"
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Business Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    >
                      <option value="Retail / Shop" style={{ background: '#111827' }}>Retail / Shop</option>
                      <option value="PG / Hostel" style={{ background: '#111827' }}>PG / Hostel</option>
                      <option value="Computer / IT Repair" style={{ background: '#111827' }}>Computer / IT Repair</option>
                      <option value="Real Estate" style={{ background: '#111827' }}>Real Estate</option>
                      <option value="Security Agency" style={{ background: '#111827' }}>Security Agency</option>
                      <option value="Insurance Consultancy" style={{ background: '#111827' }}>Insurance Consultancy</option>
                      <option value="Manufacturing" style={{ background: '#111827' }}>Manufacturing</option>
                      <option value="Other Business" style={{ background: '#111827' }}>Other Business</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Tell us about your business &amp; requirements
                  </label>
                  <textarea
                    rows="3"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="e.g. I need a website for my computer repair shop in Pune with service listings."
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 size={18} className="spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Submit Website Request
                    </>
                  )}
                </button>

                {formFeedback && (
                  <div style={{
                    padding: '14px',
                    borderRadius: '8px',
                    marginTop: '16px',
                    fontSize: '0.95rem',
                    background: formFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${formFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: formFeedback.type === 'success' ? '#34d399' : '#f87171'
                  }}>
                    {formFeedback.text}
                  </div>
                )}
              </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '36px' }}>
              <a
                href="https://wa.me/919765975757?text=Hello%2C%20I%20want%20to%20add%20my%20business%20profile%20on%20SCode"
                target="_blank"
                rel="noreferrer"
                className="btn btn-whatsapp"
              >
                <MessageSquare size={18} /> WhatsApp +91 97659 75757
              </a>
              <a href="tel:+919765975757" className="btn btn-call">
                <Phone size={18} /> Call +91 97659 75757
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer style={{ background: 'rgba(10, 14, 26, 0.95)', borderTop: '1px solid var(--border-color)', padding: '70px 0 30px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 3fr', gap: '50px', marginBottom: '50px' }}>
            <div>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                <ScodeLogo size="md" />
              </Link>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '16px', maxWidth: '320px' }}>
                Helping local businesses establish their online presence quickly and affordably. From your first online portfolio to complete digital growth.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
              <div>
                <h4 style={{ fontSize: '1rem', marginBottom: '18px', color: '#fff' }}>Quick Links</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><a href="#problem" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>The Problem</a></li>
                  <li><a href="#solution" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Our Solution</a></li>
                  <li><a href="#businesses" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Who We Help</a></li>
                  <li><a href="#portfolio" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Portfolio</a></li>
                </ul>
              </div>

              <div>
                <h4 style={{ fontSize: '1rem', marginBottom: '18px', color: '#fff' }}>Contact</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><a href="tel:+919765975757" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>+91 97659 75757</a></li>
                  <li><a href="https://wa.me/919765975757" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>WhatsApp Support</a></li>
                  <li><a href="mailto:contact@scode.in" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>contact@scode.in</a></li>
                </ul>
              </div>

              <div>
                <h4 style={{ fontSize: '1rem', marginBottom: '18px', color: '#fff' }}>Management</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><Link to="/admin" target="_blank" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '0.9rem' }}>Admin CMS Portal</Link></li>
                  <li><span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>React + Node.js + SQLite</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '24px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            <p>🌐 <strong>scode.in</strong> · Portal Managed By SCode Digital Solutions · Pune, India</p>
            <p>© 2026 SCode Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating Action Buttons */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 99 }}>
        <Link
          to="/admin"
          target="_blank"
          title="Admin Panel"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)'
          }}
        >
          <Sliders size={24} />
        </Link>
        <a
          href="https://wa.me/919765975757?text=Hello%20SCode%2C%20I%20want%20to%20create%20a%20website"
          target="_blank"
          rel="noreferrer"
          title="Chat on WhatsApp"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#25d366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)'
          }}
        >
          <MessageSquare size={24} />
        </a>
      </div>
    </div>
  );
};

export default HomePage;
