import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  CheckCircle2,
  Star,
  Send,
  Loader2,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

const BusinessPage = () => {
  const { slug } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quote Form State
  const [quoteData, setQuoteData] = useState({
    name: '',
    phone: '',
    email: '',
    service: 'General Inquiry',
    message: ''
  });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteFeedback, setQuoteFeedback] = useState(null);

  useEffect(() => {
    fetchBusinessDetail();
  }, [slug]);

  const fetchBusinessDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/businesses/${slug}`);
      const json = await res.json();

      if (!json.success || !json.data) {
        setError(json.message || 'Business profile not found.');
      } else {
        setBusiness(json.data);
        document.title = `${json.data.name} — ${json.data.tagline || json.data.category} | SCode`;
      }
    } catch (err) {
      setError('Unable to load business details. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (!quoteData.name || !quoteData.phone) {
      setQuoteFeedback({ type: 'error', text: 'Please provide your name and phone number.' });
      return;
    }

    try {
      setQuoteSubmitting(true);
      setQuoteFeedback(null);
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          name: quoteData.name,
          phone: quoteData.phone,
          email: quoteData.email,
          service_requested: quoteData.service,
          message: quoteData.message
        })
      });
      const data = await res.json();

      if (data.success) {
        setQuoteFeedback({ type: 'success', text: `🎉 Thank you, ${quoteData.name}! Your inquiry has been sent directly to ${business.name}.` });
        setQuoteData({ name: '', phone: '', email: '', service: 'General Inquiry', message: '' });
      } else {
        setQuoteFeedback({ type: 'error', text: data.message || 'Inquiry failed' });
      }
    } catch (err) {
      setQuoteFeedback({ type: 'error', text: 'Network error. Please message directly on WhatsApp.' });
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const preselectService = (svcTitle) => {
    setQuoteData(prev => ({ ...prev, service: svcTitle }));
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="spin" style={{ margin: '0 auto 16px', color: '#3b82f6' }} />
          <p style={{ color: '#94a3b8' }}>Loading business website profile...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#fff', padding: '24px' }}>
        <div style={{ maxWidth: '480px', background: '#0f172a', padding: '40px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '12px' }}>Profile Not Found</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>{error}</p>
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={18} /> Return to SCode Directory
          </Link>
        </div>
      </div>
    );
  }

  const themeColor = business.theme_color || '#0ea5e9';
  const cleanPhone = (business.whatsapp || business.phone || '').replace(/[^0-9]/g, '');

  return (
    <div style={{ background: '#020617', color: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ========== HEADER ========== */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px 0'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none', color: '#fff' }}>
            <img
              src={business.logo_url || 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=150'}
              alt={business.name}
              style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: `2px solid ${themeColor}` }}
            />
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{business.name}</h1>
              <small style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{business.category}</small>
            </div>
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="#hero" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>Home</a>
              <a href="#about" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>About</a>
              <a href="#services" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>Services</a>
              <a href="#contact" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>Contact</a>
              <Link to="/" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft size={14} /> SCode
              </Link>
            </div>

            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  background: themeColor,
                  color: '#fff',
                  textDecoration: 'none'
                }}
              >
                <Phone size={14} /> Call Now
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ========== HERO BANNER ========== */}
      <section
        id="hero"
        style={{
          position: 'relative',
          padding: '100px 0 80px',
          backgroundImage: `url('${business.hero_bg_url || 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=1600'}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '500px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.92) 0%, rgba(15, 23, 42, 0.85) 100%)',
          zIndex: 1
        }}></div>

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${themeColor}`,
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '20px'
          }}>
            <ShieldCheck size={16} color={themeColor} /> Verified Local Business
          </div>

          <h2 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '20px', maxWidth: '800px' }}>
            {business.tagline || `Welcome to ${business.name}`}
          </h2>

          <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '680px', marginBottom: '36px' }}>
            {business.description || 'Reliable, professional, and trusted services tailored to your exact requirements.'}
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="#contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                background: themeColor,
                color: '#fff',
                textDecoration: 'none'
              }}
            >
              <Send size={16} /> Request a Free Quote
            </a>
            <a
              href="#services"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                textDecoration: 'none'
              }}
            >
              Explore Services
            </a>
          </div>
        </div>
      </section>

      {/* ========== ABOUT SECTION ========== */}
      <section id="about" style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px', alignItems: 'center' }}>
            <div>
              <span style={{ color: themeColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                Overview
              </span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '6px', marginBottom: '20px' }}>
                About {business.name}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.7 }}>
                {business.about_text || business.description || 'Committed to delivering outstanding quality and satisfaction to our esteemed customers.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.8rem', color: themeColor, marginBottom: '4px' }}>100%</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Quality Commitment</span>
              </div>
              <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.8rem', color: themeColor, marginBottom: '4px' }}>24/7</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Support Assistance</span>
              </div>
              <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.8rem', color: themeColor, marginBottom: '4px' }}>Verified</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>SCode Profile</span>
              </div>
              <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.8rem', color: themeColor, marginBottom: '4px' }}>Direct</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>WhatsApp Connect</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SERVICES SECTION ========== */}
      <section id="services" style={{ padding: '80px 0', background: 'rgba(15, 23, 42, 0.5)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Our Core Services</h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '6px' }}>Explore our dedicated range of professional solutions crafted with precision.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {business.services && business.services.length > 0 ? (
              business.services.map(s => (
                <div
                  key={s.id}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '32px 24px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    color: themeColor,
                    marginBottom: '20px'
                  }}>
                    <i className={`bi ${s.icon || 'bi-gear-fill'}`}></i>
                  </div>

                  <h4 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>{s.title}</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px', flexGrow: 1 }}>
                    {s.description || 'Reliable service backed by experienced professionals.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: themeColor }}>
                      {s.price || 'Best Pricing'}
                    </span>
                    <button
                      onClick={() => preselectService(s.title)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Inquire →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8' }}>
                Contact us for full service offerings and tailored quotations.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========== GALLERY (Optional) ========== */}
      {business.gallery && business.gallery.length > 0 && (
        <section style={{ padding: '80px 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Project Gallery &amp; Work</h2>
              <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '6px' }}>Take a visual tour of our recent work and installations.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {business.gallery.map(g => (
                <div key={g.id} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '240px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <img src={g.image_url} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    padding: '12px 16px',
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent)',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    {g.title || g.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== TESTIMONIALS (Optional) ========== */}
      {business.testimonials && business.testimonials.length > 0 && (
        <section style={{ padding: '80px 0', background: 'rgba(15, 23, 42, 0.5)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>What Our Clients Say</h2>
              <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '6px' }}>Authentic feedback from satisfied residential and corporate customers.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {business.testimonials.map(t => (
                <div key={t.id} style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '4px', color: '#f59e0b', marginBottom: '14px' }}>
                    {Array(t.rating || 5).fill(null).map((_, i) => (
                      <Star key={i} size={16} fill="#f59e0b" />
                    ))}
                  </div>

                  <p style={{ fontStyle: 'italic', color: '#f8fafc', fontSize: '0.95rem', marginBottom: '20px', flexGrow: 1 }}>
                    "{t.quote}"
                  </p>

                  <div>
                    <h5 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{t.client_name}</h5>
                    <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{t.client_role} {t.company ? `— ${t.company}` : ''}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== CONTACT & DIRECT QUOTE FORM ========== */}
      <section id="contact" style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Get In Touch</h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '6px' }}>Have questions or need a quotation? Send a direct inquiry.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            {/* Contact Info Card */}
            <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '4px' }}>Phone Number</h5>
                  <a href={`tel:${business.phone}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>
                    {business.phone || 'Not provided'}
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '4px' }}>Email Address</h5>
                  <a href={`mailto:${business.email}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>
                    {business.email || 'Not provided'}
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '4px' }}>Location / Office</h5>
                  <p style={{ color: '#fff', fontWeight: 500 }}>
                    {business.address || 'Pune, Maharashtra, India'}
                  </p>
                  {business.google_map_url && (
                    <a
                      href={business.google_map_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '10px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        color: '#60a5fa',
                        textDecoration: 'none'
                      }}
                    >
                      <MapPin size={14} /> Open in Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Inquiry Form */}
            <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '36px' }}>
              <h3 style={{ marginBottom: '6px' }}>Request a Quote / Callback</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>We will get back to you with competitive quotes promptly.</p>

              <form onSubmit={handleQuoteSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Your Full Name *</label>
                  <input
                    type="text"
                    value={quoteData.name}
                    onChange={(e) => setQuoteData({ ...quoteData, name: e.target.value })}
                    placeholder="e.g. Anand Kulkarni"
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Mobile / WhatsApp Number *</label>
                  <input
                    type="tel"
                    value={quoteData.phone}
                    onChange={(e) => setQuoteData({ ...quoteData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Select Service</label>
                  <select
                    value={quoteData.service}
                    onChange={(e) => setQuoteData({ ...quoteData, service: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  >
                    <option value="General Inquiry" style={{ background: '#111827' }}>General Inquiry</option>
                    {business.services && business.services.map(s => (
                      <option key={s.id} value={s.title} style={{ background: '#111827' }}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Requirement Details</label>
                  <textarea
                    rows="3"
                    value={quoteData.message}
                    onChange={(e) => setQuoteData({ ...quoteData, message: e.target.value })}
                    placeholder="Describe your requirement, timeline, or question..."
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={quoteSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    background: themeColor,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {quoteSubmitting ? (
                    <>
                      <Loader2 size={18} className="spin" /> Sending Inquiry...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Submit Direct Inquiry
                    </>
                  )}
                </button>

                {quoteFeedback && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '14px',
                    fontSize: '0.9rem',
                    background: quoteFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: `1px solid ${quoteFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    color: quoteFeedback.type === 'success' ? '#34d399' : '#f87171'
                  }}>
                    {quoteFeedback.text}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '40px 0', textAlign: 'center' }}>
        <div className="container">
          <p>© 2026 {business.name}. All rights reserved.</p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px' }}>
            ⚡ Business Profile Website Managed on <Link to="/" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>SCode Platform</Link> · Single Database Powered
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      {cleanPhone && (
        <a
          href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(business.name)}%2C%20I%20visited%20your%20website%20and%20want%20to%20inquire%20about%20your%20services.`}
          target="_blank"
          rel="noreferrer"
          title="Chat on WhatsApp"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#25d366',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
            textDecoration: 'none',
            zIndex: 99
          }}
        >
          <MessageSquare size={26} />
        </a>
      )}
    </div>
  );
};

export default BusinessPage;
