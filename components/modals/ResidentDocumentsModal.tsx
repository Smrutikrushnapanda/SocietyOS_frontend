'use client';

import React, { useState } from 'react';
import { useModalStore, useToastStore, useResidentStore } from '../../store';
import { useDocumentStore } from '../../store/useDocumentStore';
import { SocietyDocument } from '../../types/document';
import {
  IconClose,
  IconFolder,
  IconFileText,
  IconDownload,
  IconCheck,
  IconLock
} from '../common/Icons';
import clsx from 'clsx';

export const ResidentDocumentsModal: React.FC = () => {
  const { closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const { resident } = useResidentStore();
  const { getDocumentsForResident, folders } = useDocumentStore();

  const residentFlat = resident.flat || 'A-101';
  const { societyWide, flatSpecific } = getDocumentsForResident(residentFlat);

  const [activeTab, setActiveTab] = useState<'my-flat' | 'society'>('my-flat');
  const [selectedDoc, setSelectedDoc] = useState<SocietyDocument | null>(null);

  const displayedDocs = activeTab === 'my-flat' ? flatSpecific : societyWide;

  const handleDownload = (doc: SocietyDocument) => {
    showToast(`Downloading "${doc.fileName}" (${doc.fileSize})...`);
  };

  return (
    <div
      className="mobile-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(46, 117, 89, 0.12)',
                color: 'var(--pine)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <IconFolder size={20} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--pine-dark)',
                  margin: 0
                }}
              >
                Documents &amp; Flat Vault
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
                Flat {residentFlat} • Secure Encrypted Repository
              </p>
            </div>
          </div>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--neutral)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={closeModal}
            aria-label="Close"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '8px 16px',
            gap: '8px',
            background: 'var(--surface-sunken)',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <button
            type="button"
            className={clsx(
              'btn btn-sm',
              activeTab === 'my-flat' ? 'btn-primary' : 'btn-ghost'
            )}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.8125rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => {
              setActiveTab('my-flat');
              setSelectedDoc(null);
            }}
          >
            <IconLock size={14} />
            <span>Flat {residentFlat} Vault ({flatSpecific.length})</span>
          </button>
          <button
            type="button"
            className={clsx(
              'btn btn-sm',
              activeTab === 'society' ? 'btn-primary' : 'btn-ghost'
            )}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.8125rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => {
              setActiveTab('society');
              setSelectedDoc(null);
            }}
          >
            <IconFileText size={14} />
            <span>Society Compliance ({societyWide.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {selectedDoc ? (
            /* Document Preview & Details */
            <div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: '12px', padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={() => setSelectedDoc(null)}
              >
                ← Back to Documents
              </button>

              <div
                style={{
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  background: 'var(--surface)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(2, 132, 199, 0.12)',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <IconFileText size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--pine-dark)', margin: '0 0 4px' }}>
                      {selectedDoc.title}
                    </h4>
                    <span className="badge badge-pine" style={{ fontSize: '0.6875rem' }}>
                      {selectedDoc.category}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)', lineHeight: 1.5, marginBottom: '14px' }}>
                  {selectedDoc.description || 'Verified society record document.'}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-sunken)',
                    fontSize: '0.75rem',
                    marginBottom: '16px'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--neutral)', display: 'block' }}>File Format</span>
                    <strong>{selectedDoc.fileType.toUpperCase()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--neutral)', display: 'block' }}>File Size</span>
                    <strong>{selectedDoc.fileSize}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--neutral)', display: 'block' }}>Uploaded By</span>
                    <strong>{selectedDoc.uploadedBy}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--neutral)', display: 'block' }}>Upload Date</span>
                    <strong>{selectedDoc.uploadedAt}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={() => handleDownload(selectedDoc)}
                >
                  <IconDownload size={16} />
                  <span>Download Official PDF Copy</span>
                </button>
              </div>
            </div>
          ) : (
            /* Document List */
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--neutral)',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                >
                  {activeTab === 'my-flat' ? `Unit ${residentFlat} Private Records` : 'Society Public Repository'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                  {displayedDocs.length} {displayedDocs.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              {displayedDocs.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 16px' }}>
                  <div className="empty-state-title">No Documents in this Vault</div>
                  <div className="empty-state-desc">Documents uploaded by the society committee will appear here.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="card"
                      style={{
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor:
                              doc.fileType === 'pdf'
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(2, 132, 199, 0.12)',
                            color: doc.fileType === 'pdf' ? '#dc2626' : '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <IconFileText size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <strong
                            style={{
                              fontSize: '0.8125rem',
                              color: 'var(--pine-dark)',
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {doc.title}
                          </strong>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
                            {doc.category} • {doc.fileSize}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 8px', flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc);
                        }}
                        title="Download"
                      >
                        <IconDownload size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
