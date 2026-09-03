import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User,
  Send,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Building,
  ExternalLink,
  ShieldCheck,
  FileText
} from 'lucide-react';

const QUICK_SUGGESTIONS = [
  'Find Rahul',
  'Who owns Clean Water Solutions?',
  'Show Rahul Patil\'s business',
  'Show businesses in Pune',
  'Find customers from Nashik',
  'Businesses related to water treatment',
  'Find customer with email rahul@gmail.com',
  'Show customers with GST number 27AAACP1234A1Z5'
];

const AdminChatbot = ({ token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '👋 **Hello Admin!** I am your SCode AI Assistant.\n\nAsk me any natural-language question to search across **Customers**, **Businesses**, and their relationships in the database.',
      results: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (textToSend = inputMessage) => {
    const query = (typeof textToSend === 'string' ? textToSend : inputMessage).trim();
    if (!query || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const authToken = token || localStorage.getItem('scode_admin_token');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ message: query, sessionId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          intent: data.intent,
          type: data.type,
          text: data.reply || data.message,
          results: data.results || data.users || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          type: 'error',
          text: `⚠️ **Error:** ${data.message || 'Unable to process search query. Please ensure you are logged in as admin.'}`,
          results: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      const networkError = {
        id: Date.now() + 1,
        sender: 'bot',
        type: 'error',
        text: '⚠️ **Network Error:** Could not connect to the backend server. Please verify the server is running.',
        results: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, networkError]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: '🧹 Conversation cleared! What would you like to search today?',
        results: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open AI Admin Search Assistant"
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4), 0 0 20px rgba(139, 92, 246, 0.3)',
            zIndex: 9999,
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ position: 'relative' }}>
            <Bot size={22} />
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #090d16'
            }}></span>
          </div>
          <span>AI Search Chatbot</span>
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: isMinimized ? '320px' : '460px',
            height: isMinimized ? '60px' : '640px',
            maxHeight: 'calc(100vh - 40px)',
            background: '#0f172a',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            transition: 'height 0.3s ease, width 0.3s ease',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
              borderBottom: isMinimized ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isMinimized ? 'pointer' : 'default'
            }}
            onClick={() => isMinimized && setIsMinimized(false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    AI Search Assistant
                  </h4>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                    ADMIN
                  </span>
                </div>
                <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Search Customers &amp; Businesses Relational Data
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!isMinimized && (
                <button
                  onClick={clearChat}
                  title="Clear Chat"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                title={isMinimized ? 'Expand' : 'Minimize'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px'
                }}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                title="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px'
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div
                style={{
                  flex: 1,
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: '#0a0e1a'
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        maxWidth: '92%'
                      }}
                    >
                      {msg.sender === 'bot' && (
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          <Bot size={14} />
                        </div>
                      )}

                      <div
                        style={{
                          background:
                            msg.sender === 'user'
                              ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                              : '#1e293b',
                          color: '#f8fafc',
                          padding: '12px 14px',
                          borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          fontSize: '0.88rem',
                          lineHeight: 1.55,
                          border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {msg.text}

                        {/* Interactive Matching Cards */}
                        {msg.results && msg.results.length > 0 && (
                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {msg.results.slice(0, 4).map((r, i) => {
                              const isCustomer = !!r.email || !!r.owner_name === false;
                              const title = r.name || r.business_name;
                              const subtitle = r.business_name && isCustomer ? `Business: ${r.business_name}` : (r.category || r.business_category || 'Customer Record');
                              const city = r.city || r.business_city || r.owner_city;

                              return (
                                <div
                                  key={i}
                                  style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.9rem' }}>
                                      {title}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                                      ID: #{r.id || r.owner_id || r.business_id}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                    {subtitle}
                                  </div>

                                  {r.email && (
                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Mail size={12} color="#94a3b8" /> {r.email}
                                    </div>
                                  )}

                                  {r.phone && (
                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Phone size={12} color="#94a3b8" /> {r.phone}
                                    </div>
                                  )}

                                  {city && (
                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <MapPin size={12} color="#94a3b8" /> {city} {r.state ? `, ${r.state}` : ''}
                                    </div>
                                  )}

                                  {/* Quick Follow-up Buttons */}
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                    {r.business_name && (
                                      <button
                                        onClick={() => handleSendMessage(`What is ${r.name}'s business?`)}
                                        style={{
                                          fontSize: '0.7rem',
                                          background: 'rgba(59, 130, 246, 0.15)',
                                          border: '1px solid rgba(59, 130, 246, 0.3)',
                                          color: '#93c5fd',
                                          borderRadius: '4px',
                                          padding: '3px 8px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        🏢 View Business
                                      </button>
                                    )}

                                    {r.slug && (
                                      <a
                                        href={`/b/${r.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          fontSize: '0.7rem',
                                          background: 'rgba(16, 185, 129, 0.15)',
                                          border: '1px solid rgba(16, 185, 129, 0.3)',
                                          color: '#34d399',
                                          borderRadius: '4px',
                                          padding: '3px 8px',
                                          textDecoration: 'none',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px'
                                        }}
                                      >
                                        <ExternalLink size={10} /> Preview Sub-Site
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {msg.sender === 'user' && (
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: '#c084fc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          <User size={14} />
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#64748b',
                        marginTop: '4px',
                        marginLeft: msg.sender === 'bot' ? '34px' : '0',
                        marginRight: msg.sender === 'user' ? '34px' : '0'
                      }}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Loader2 size={14} className="spin" />
                    </div>
                    <span>Analyzing intent &amp; searching database...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Suggestions */}
              <div
                style={{
                  padding: '8px 14px',
                  background: '#0d1322',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '999px',
                      color: '#94a3b8',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#60a5fa';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#94a3b8';
                    }}
                  >
                    <Sparkles size={11} color="#60a5fa" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div
                style={{
                  padding: '12px 14px',
                  background: '#0f172a',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything (e.g. Find Rahul, Who owns Clean Water Solutions?)..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || loading}
                  title="Send Query"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: inputMessage.trim() && !loading ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputMessage.trim() && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AdminChatbot;
