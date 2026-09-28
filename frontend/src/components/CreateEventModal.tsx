import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, MapPin, User, Mail, Phone, FileText, Image, Sparkles, MessageCircle } from 'lucide-react';
import { InstagramIcon } from './SocialIcons';
import { createEvent } from '../services/api';
import type { CreateEventData, EventType } from '../types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'WEDDING', label: '💍 Wedding' },
  { value: 'ENGAGEMENT', label: '💎 Engagement' },
  { value: 'RECEPTION', label: '🥂 Reception' },
  { value: 'BIRTHDAY', label: '🎂 Birthday' },
  { value: 'PARTY', label: '🎉 Party' },
  { value: 'CORPORATE', label: '🏢 Corporate' },
  { value: 'OTHER', label: '📸 Other' },
];

const INITIAL_FORM: CreateEventData = {
  eventName: '',
  eventType: 'WEDDING',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  eventDate: '',
  location: '',
  description: '',
  coverImage: '',
  instagramHandle: '',
  whatsappNumber: '',
};

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState<CreateEventData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setError(null);
      setSuccess(false);
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.eventName.trim()) return setError('Event name is required.');
    if (!form.customerName.trim()) return setError('Client name is required.');
    if (!form.eventDate) return setError('Event date is required.');

    setLoading(true);
    try {
      await createEvent({
        ...form,
        eventName: form.eventName.trim(),
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail?.trim() || undefined,
        customerPhone: form.customerPhone?.trim() || undefined,
        location: form.location?.trim() || undefined,
        description: form.description?.trim() || undefined,
        coverImage: form.coverImage?.trim() || undefined,
        instagramHandle: form.instagramHandle?.trim() || undefined,
        whatsappNumber: form.whatsappNumber?.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => !loading && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          animation: 'ceModalFadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-event-modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(145deg, #12151c, #0e1118)',
          border: '1px solid rgba(226, 184, 85, 0.2)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(226, 184, 85, 0.08)',
          animation: 'ceModalSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky',
          top: 0,
          background: 'linear-gradient(145deg, #12151c, #0e1118)',
          borderRadius: '20px 20px 0 0',
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #e2b855 0%, #b88628 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(226, 184, 85, 0.35)',
              flexShrink: 0,
            }}>
              <Sparkles size={18} color="#08090c" />
            </div>
            <div>
              <h2 id="create-event-modal-title" style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                lineHeight: 1.2,
              }}>
                Create New Event
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0, marginTop: '2px' }}>
                Set up a private gallery for your client
              </p>
            </div>
          </div>
          <button
            id="close-create-event-modal"
            onClick={() => !loading && onClose()}
            title="Close (Esc)"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#6b7280',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '7px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Error banner */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#f87171',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div style={{
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#34d399',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              ✅ Event created successfully!
            </div>
          )}

          {/* Event Name */}
          <Field label="Event Name" icon={<Sparkles size={13} />} required>
            <input
              ref={firstInputRef}
              id="ce-eventName"
              name="eventName"
              type="text"
              placeholder="e.g. Wedding of Marcus & Sophia"
              value={form.eventName}
              onChange={handleChange}
              required
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          {/* Type + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Event Type" required>
              <select
                id="ce-eventType"
                name="eventType"
                value={form.eventType}
                onChange={handleChange}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Event Date" icon={<Calendar size={13} />} required>
              <input
                id="ce-eventDate"
                name="eventDate"
                type="date"
                value={form.eventDate}
                onChange={handleChange}
                required
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </Field>
          </div>

          {/* Customer Name */}
          <Field label="Client Name" icon={<User size={13} />} required>
            <input
              id="ce-customerName"
              name="customerName"
              type="text"
              placeholder="e.g. Marcus & Sophia Sterling"
              value={form.customerName}
              onChange={handleChange}
              required
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          {/* Email + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Client Email" icon={<Mail size={13} />}>
              <input
                id="ce-customerEmail"
                name="customerEmail"
                type="email"
                placeholder="client@email.com"
                value={form.customerEmail}
                onChange={handleChange}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </Field>
            <Field label="Client Phone" icon={<Phone size={13} />}>
              <input
                id="ce-customerPhone"
                name="customerPhone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.customerPhone}
                onChange={handleChange}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </Field>
          </div>

          {/* Location */}
          <Field label="Venue / Location" icon={<MapPin size={13} />}>
            <input
              id="ce-location"
              name="location"
              type="text"
              placeholder="e.g. Villa Cetinale, Tuscany, Italy"
              value={form.location}
              onChange={handleChange}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          {/* Description */}
          <Field label="Description" icon={<FileText size={13} />}>
            <textarea
              id="ce-description"
              name="description"
              placeholder="Brief description of the event…"
              value={form.description}
              onChange={handleChange}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          {/* Cover Image */}
          <Field label="Cover Image URL" icon={<Image size={13} />}>
            <input
              id="ce-coverImage"
              name="coverImage"
              type="text"
              placeholder="/wedding_couple_hero.jpg"
              value={form.coverImage}
              onChange={handleChange}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          {/* Social Branding & Contact: Instagram & WhatsApp */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Studio Instagram" icon={<InstagramIcon size={13} />}>
              <input
                id="ce-instagramHandle"
                name="instagramHandle"
                type="text"
                placeholder="@yourphotostudio"
                value={form.instagramHandle || ''}
                onChange={handleChange}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </Field>

            <Field label="Studio WhatsApp" icon={<MessageCircle size={13} />}>
              <input
                id="ce-whatsappNumber"
                name="whatsappNumber"
                type="tel"
                placeholder="+1 555 123 4567"
                value={form.whatsappNumber || ''}
                onChange={handleChange}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(226,184,85,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,184,85,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </Field>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '6px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              type="button"
              id="cancel-create-event"
              onClick={() => !loading && onClose()}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '10px 18px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: '#9ca3af', fontWeight: 600, fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
                transition: 'background 0.2s',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-event"
              disabled={loading || success}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: success
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #e2b855 0%, #b88628 100%)',
                color: '#08090c', fontWeight: 700, fontSize: '0.9rem',
                cursor: loading || success ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                minWidth: '160px', justifyContent: 'center',
                boxShadow: success ? '0 4px 16px rgba(16,185,129,0.3)' : '0 4px 16px rgba(226,184,85,0.3)',
                transition: 'all 0.3s',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '14px', height: '14px',
                    border: '2px solid rgba(8,9,12,0.3)',
                    borderTopColor: '#08090c',
                    borderRadius: '50%',
                    animation: 'ceSpin 0.6s linear infinite',
                    display: 'inline-block',
                    flexShrink: 0,
                  }} />
                  Creating…
                </>
              ) : success ? (
                <> ✓ Created! </>
              ) : (
                <> <Sparkles size={14} /> Create Event </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes ceModalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ceModalSlideUp {
          from { opacity: 0; transform: translate(-50%, -44%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes ceSpin {
          to { transform: rotate(360deg); }
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5);
          cursor: pointer;
        }
        select option {
          background: #12151c;
          color: #ffffff;
        }
      `}</style>
    </>
  );
};

/* ── Field wrapper ─────────────────────────────────────────────── */
const Field: React.FC<{
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, icon, required, children }) => (
  <div>
    <label style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      fontSize: '0.78rem', fontWeight: 600, color: '#9ca3af',
      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px',
    }}>
      {icon} {label}
      {required && <span style={{ color: '#e2b855', marginLeft: '1px' }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '11px 14px',
  color: '#ffffff',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};
