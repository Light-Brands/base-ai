'use client';

import { useState, useEffect } from 'react';

interface CredentialsModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  credentials: {
    label: string;
    value: string;
    sensitive?: boolean;
  }[];
  warning?: string;
  onClose: () => void;
}

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
    <path d="M12 9v4"/>
    <path d="M12 17h.01"/>
  </svg>
);

export default function CredentialsModal({
  isOpen,
  title,
  subtitle,
  credentials,
  warning,
  onClose,
}: CredentialsModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (copiedIndex !== null) {
      const timer = setTimeout(() => setCopiedIndex(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedIndex]);

  if (!isOpen) return null;

  async function handleCopy(value: string, index: number) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <div className="credentials-modal-overlay" onClick={onClose}>
      <div className="credentials-modal" onClick={(e) => e.stopPropagation()}>
        <button className="credentials-modal-close" onClick={onClose}>
          <XIcon />
        </button>

        <div className="credentials-modal-icon">
          <CheckCircleIcon />
        </div>

        <h2 className="credentials-modal-title">{title}</h2>
        {subtitle && <p className="credentials-modal-subtitle">{subtitle}</p>}

        <div className="credentials-modal-items">
          {credentials.map((cred, index) => (
            <div key={index} className="credentials-modal-item">
              <label className="credentials-modal-label">{cred.label}</label>
              <div className="credentials-modal-value-container">
                <code className="credentials-modal-value">{cred.value}</code>
                <button
                  className={`credentials-modal-copy-btn ${copiedIndex === index ? 'copied' : ''}`}
                  onClick={() => handleCopy(cred.value, index)}
                  title="Copy to clipboard"
                >
                  {copiedIndex === index ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {warning && (
          <div className="credentials-modal-warning">
            <WarningIcon />
            <span>{warning}</span>
          </div>
        )}

        <button className="credentials-modal-confirm-btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
