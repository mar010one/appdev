'use client';

import { useState } from 'react';
import { X, Eye } from 'lucide-react';
import ModalPortal from './ModalPortal';

interface PreviewModalProps {
  url: string;
  name: string;
  label?: string;
}

export default function PreviewModal({ url, name, label }: PreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!url) return null;

  const isPDF = url.toLowerCase().endsWith('.pdf');

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary small"
        style={{ flex: '1 0 auto' }}
      >
        <Eye size={16} />
        {label || 'View'}
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content preview-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{name} - Verification Document</h3>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body preview-modal-body">
              {isPDF ? (
                <iframe
                  src={url}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', borderRadius: '16px', minHeight: '60vh' }}
                />
              ) : (
                <img
                  src={url}
                  alt="Verification Document"
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '16px', display: 'block', margin: '0 auto' }}
                />
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
