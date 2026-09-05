import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Globe,
  CheckCircle,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Loader2,
  Sparkles,
  Send,
  Building,
  Phone,
  Mail,
  MapPin,
  QrCode,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import ScodeLogo from '../components/ScodeLogo';

const generateSlug = (text) => {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const HostBusinessPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Retail & Shop',
    tagline: '',
    description: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '',
    address: '',
    theme_color: '#3b82f6'
  });

  const [processingPayment, setProcessingPayment] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [createdBusiness, setCreatedBusiness] = useState(null);

  useEffect(() => {
    fetchPlans();
    loadRazorpayScript();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await fetch('/api/billing/plans');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setPlans(json.data);
        // Default to Growth plan or first active
        const defaultPlan = json.data.find(p => p.slug === 'growth') || json.data[0];
        setSelectedPlan(defaultPlan);
      }
    } catch (err) {
      console.error('Error loading plans', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadRazorpayScript = () => {
    if (document.getElementById('razorpay-checkout-js')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlan) {
      setFeedback({ type: 'error', text: 'Please select a hosting plan.' });
      return;
    }

    if (!formData.name || !formData.phone || !formData.email) {
      setFeedback({ type: 'error', text: 'Please fill in required fields (Business Name, Phone, and Email).' });
      return;
    }

    try {
      setProcessingPayment(true);
      setFeedback(null);

      // 1. Create Order on Backend
      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          business_data: formData
        })
      });
      const orderJson = await orderRes.json();

      if (!orderJson.success) {
        throw new Error(orderJson.message || 'Could not initiate payment order');
      }

      const { order_id, amount, key_id } = orderJson.data;

      // 2. Open Razorpay Checkout if valid live/test key or fallback simulator
      const isLiveKey = key_id && !key_id.includes('test_scode') && !key_id.includes('placeholder') && !key_id.includes('mock');

      if (isLiveKey && window.Razorpay) {
        try {
          const options = {
            key: key_id,
            amount: amount,
            currency: 'INR',
            name: 'SCode Platform',
            description: `${selectedPlan.name} Hosting Subscription`,
            order_id: order_id,
            prefill: {
              name: formData.name,
              email: formData.email,
              contact: formData.phone
            },
            theme: {
              color: selectedPlan.slug === 'growth' ? '#3b82f6' : '#8b5cf6'
            },
            handler: async function (response) {
              await verifyPaymentOnServer(response, order_id);
            },
            modal: {
              ondismiss: function () {
                setProcessingPayment(false);
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response) {
            setFeedback({ type: 'error', text: `Payment Failed: ${response.error?.description || 'Transaction declined'}` });
            setProcessingPayment(false);
          });
          rzp.open();
        } catch (rzpErr) {
          console.warn('Razorpay popup error, activating test mode:', rzpErr);
          const simulatedResponse = {
            razorpay_order_id: order_id,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: `sig_sim_${Date.now()}`
          };
          await verifyPaymentOnServer(simulatedResponse, order_id);
        }
      } else {
        // Fallback simulator for development/testing environment
        console.log('Test sandbox mode: completing payment verification...');
        const simulatedResponse = {
          razorpay_order_id: order_id,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: `sig_sim_${Date.now()}`
        };
        await verifyPaymentOnServer(simulatedResponse, order_id);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Payment initiation failed' });
      setProcessingPayment(false);
    }
  };

  const verifyPaymentOnServer = async (paymentResponse, order_id) => {
    try {
      const verifyRes = await fetch('/api/billing/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id || order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          business_data: formData,
          plan_id: selectedPlan.id
        })
      });

      const verifyJson = await verifyRes.json();
      if (verifyJson.success) {
        setCreatedBusiness(verifyJson.data);
      } else {
        setFeedback({ type: 'error', text: verifyJson.message || 'Payment verification failed' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Error verifying payment with server' });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Success Screen
  if (createdBusiness) {
    const publicUrl = `/b/${createdBusiness.slug}`;
    const qrUrl = `/api/qr?url=${encodeURIComponent(window.location.origin + publicUrl)}`;

    return (
      <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', padding: '60px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: '650px', margin: '0 auto', background: '#0f172a', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} />
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Payment Successful!</h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '24px' }}>
            🎉 Congratulations! <strong>{createdBusiness.name}</strong> is now registered on the SCode Platform.
          </p>

          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '28px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Business Profile:</span>
              <strong style={{ color: '#fff' }}>{createdBusiness.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sub-Site URL:</span>
              <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: 600 }}>{createdBusiness.slug}.scode.in</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Subscription Plan:</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>{selectedPlan?.name} (12 Months)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Valid Until:</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>{createdBusiness.expiry_date}</span>
            </div>
          </div>

          {/* QR Code Growth Widget */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px dashed rgba(59, 130, 246, 0.4)', borderRadius: '12px', padding: '20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'left' }}>
            <img src={qrUrl} alt="Business Website QR" style={{ width: '90px', height: '90px', borderRadius: '8px', background: '#fff', padding: '4px' }} />
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <QrCode size={18} color="#60a5fa" /> Your Business QR Code
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Print this QR code on your store entrance or business cards for customers to instantly scan &amp; visit your website.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={publicUrl}
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                background: '#3b82f6',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              <ExternalLink size={18} /> View Your Live Site
            </Link>

            <Link
              to="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Go to Admin Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', padding: '16px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
            <ScodeLogo size="sm" />
          </Link>

          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to SCode Portal
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '50px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600, marginBottom: '14px' }}>
            <Sparkles size={15} /> Instant Self-Serve Hosting Setup
          </div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Launch Your Business Website in Minutes
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
            Select your subscription plan, enter your business profile details, and complete secure payment with UPI, cards, or netbanking.
          </p>
        </div>

        {/* STEP 1: PLAN SELECTION */}
        <div style={{ marginBottom: '48px' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>1</span>
            Select Hosting Subscription Plan
          </h3>

          {loadingPlans ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 10px' }} />
              <p>Loading available hosting plans...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {plans.map(p => {
                const isSelected = selectedPlan && selectedPlan.id === p.id;
                const isGrowth = p.slug === 'growth';
                const priceInRupees = (p.price / 100).toLocaleString('en-IN');

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p)}
                    style={{
                      background: isSelected ? 'linear-gradient(145deg, #1e293b, #0f172a)' : '#0f172a',
                      border: `2px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '16px',
                      padding: '28px',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 0 25px rgba(59, 130, 246, 0.25)' : 'none'
                    }}
                  >
                    {isGrowth && (
                      <span style={{ position: 'absolute', top: '-12px', right: '20px', background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase' }}>
                        Most Popular
                      </span>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{p.name}</h4>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedPlan(p)}
                        style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>₹{priceInRupees}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}> / {p.duration_months} Months</span>
                    </div>

                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px', minHeight: '40px' }}>
                      {p.description}
                    </p>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={15} color="#34d399" /> Dedicated sub-site ({formData.name ? generateSlug(formData.name) : 'yourbiz'}.scode.in)
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={15} color="#34d399" /> Up to {p.max_services} Services in Catalog
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={15} color="#34d399" /> Up to {p.max_gallery_images} Work Gallery Images
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={15} color="#34d399" /> Direct WhatsApp Lead Button &amp; Inquiry Form
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={15} color="#34d399" /> Printable QR Code for Physical Signage
                      </li>
                      {p.is_featured_included ? (
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 600 }}>
                          <Sparkles size={15} color="#fbbf24" /> Featured placement on SCode Directory
                        </li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* STEP 2: BUSINESS DETAILS FORM */}
        <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '36px' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>2</span>
            Business &amp; Contact Details
          </h3>

          <form onSubmit={handleCheckoutSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Business Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Apex Dental Clinic"
                  required
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#fff', outline: 'none' }}
                />
                {formData.name && (
                  <small style={{ color: '#60a5fa', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    Preview Domain: https://{generateSlug(formData.name)}.scode.in
                  </small>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Business Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#fff', outline: 'none' }}
                >
                  <option value="Retail & Shop" style={{ background: '#111827' }}>Retail &amp; Shop</option>
                  <option value="Computer & IT Services" style={{ background: '#111827' }}>Computer &amp; IT Services</option>
                  <option value="Water Treatment & AMC" style={{ background: '#111827' }}>Water Treatment &amp; AMC</option>
                  <option value="Insurance Services" style={{ background: '#111827' }}>Insurance Services</option>
                  <option value="Security Agency" style={{ background: '#111827' }}>Security Agency</option>
                  <option value="Real Estate & Plots" style={{ background: '#111827' }}>Real Estate &amp; Plots</option>
                  <option value="Healthcare & Clinic" style={{ background: '#111827' }}>Healthcare &amp; Clinic</option>
                  <option value="Home Services & Painting" style={{ background: '#111827' }}>Home Services &amp; Painting</option>
                  <option value="Manufacturing" style={{ background: '#111827' }}>Manufacturing</option>
                  <option value="Other Business" style={{ background: '#111827' }}>Other Business</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Mobile / Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                  required
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="owner@yourbusiness.com"
                  required
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Pune, Mumbai, Nashik"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Tagline / Catchphrase
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  placeholder="e.g. 10+ Years of Trusted Care in Pune"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#fff', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Office / Shop Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Shop No. 12, Main Market Road, Pune 411038"
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#fff', outline: 'none' }}
              />
            </div>

            {/* Price Breakdown Banner */}
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>
                  {selectedPlan ? selectedPlan.name : 'Selected Plan'}
                </h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Includes 12 months hosting, sub-site domain, SSL security, QR code, and admin CMS access.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>
                  ₹{selectedPlan ? (selectedPlan.price / 100).toLocaleString('en-IN') : '0'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>All inclusive (₹0 setup fee)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={processingPayment}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                fontSize: '1.05rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
              }}
            >
              {processingPayment ? (
                <>
                  <Loader2 size={20} className="spin" /> Processing Payment &amp; Activation...
                </>
              ) : (
                <>
                  <CreditCard size={20} /> Pay with Razorpay (UPI / Cards / Netbanking)
                </>
              )}
            </button>

            {feedback && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                color: feedback.type === 'error' ? '#f87171' : '#34d399'
              }}>
                {feedback.text}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};

export default HostBusinessPage;
