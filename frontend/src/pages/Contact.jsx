import React, { useState } from 'react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  };

  return (
    <div className="contact-page">
      {/* Header */}
      <div className="contact-header">
        <h1>
          Get in <span className="gradient-text">Touch</span>
        </h1>
        <p>Have questions or feedback about CreditPath AI? We'd love to hear from you.</p>
      </div>

      {/* Info cards */}
      <div className="contact-info-row">
        <div className="contact-info-card">
          <div className="contact-icon">📧</div>
          <div className="contact-label">Email</div>
          <div className="contact-value">support@creditpath.ai</div>
        </div>
        <div className="contact-info-card">
          <div className="contact-icon">📍</div>
          <div className="contact-label">Location</div>
          <div className="contact-value">India</div>
        </div>
        <div className="contact-info-card">
          <div className="contact-icon">📞</div>
          <div className="contact-label">Phone</div>
          <div className="contact-value">+91 98765 43210</div>
        </div>
      </div>

      {/* Form */}
      <div className="contact-form">
        <h3>📩 Send a Message</h3>

        {sent ? (
          <div className="success-message">
            ✅ Message sent! We'll get back to you soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact-name">Your Name</label>
                <input
                  id="contact-name"
                  className="form-input"
                  type="text"
                  name="name"
                  placeholder="Alex Morgan"
                  required
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-email">Email Address</label>
                <input
                  id="contact-email"
                  className="form-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="contact-subject">Subject</label>
              <input
                id="contact-subject"
                className="form-input"
                type="text"
                name="subject"
                placeholder="Feedback / Query / Collaboration"
                value={form.subject}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                className="form-input form-textarea"
                name="message"
                placeholder="Write your message here…"
                required
                value={form.message}
                onChange={handleChange}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Sending…
                </>
              ) : (
                'Send Message →'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
