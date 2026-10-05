'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useDocumentStore, useToastStore } from '../../store';
import { DocumentFolder, SocietyDocument } from '../../types/document';
import {
  IconClose,
  IconDownload,
  IconCheck
} from '../common/Icons';

export const AdminDocumentsSection: React.FC = () => {
  const {
    folders,
    documents,
    createFolder,
    deleteFolder,
    uploadDocument,
    deleteDocument,
    assignDocumentToFlat
  } = useDocumentStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'all' | 'society' | 'flat-vaults'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flatFilter, setFlatFilter] = useState('all');

  // Modal states
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<SocietyDocument | null>(null);
  const [reassignDoc, setReassignDoc] = useState<SocietyDocument | null>(null);

  // Form states for Create Folder
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState<'society' | 'flat-specific' | 'legal' | 'financial'>('society');
  const [newFolderFlat, setNewFolderFlat] = useState('');

  // Form states for Upload Document
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState(folders[0]?.id || '');
  const [uploadCategory, setUploadCategory] = useState('By-Laws & Rules');
  const [uploadScope, setUploadScope] = useState<'society' | 'flat'>('society');
  const [uploadFlat, setUploadFlat] = useState('A-101');
  const [uploadDesc, setUploadDesc] = useState('');

  // Filtered list
  const filteredFolders = folders.filter((f) => {
    if (activeTab === 'society') return f.category !== 'flat-specific';
    if (activeTab === 'flat-vaults') return f.category === 'flat-specific';
    if (flatFilter !== 'all') return f.assignedFlat === flatFilter;
    return true;
  });

  const filteredDocuments = documents.filter((d) => {
    if (selectedFolderId && d.folderId !== selectedFolderId) return false;
    if (activeTab === 'society' && d.assignedFlat) return false;
    if (activeTab === 'flat-vaults' && !d.assignedFlat) return false;
    if (flatFilter !== 'all' && d.assignedFlat !== flatFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        (d.assignedFlat && d.assignedFlat.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    const created = createFolder({
      name: newFolderName.trim(),
      description: newFolderDesc.trim() || undefined,
      category: newFolderCategory,
      assignedFlat: newFolderCategory === 'flat-specific' ? newFolderFlat.trim() || 'A-101' : null,
      color: newFolderCategory === 'flat-specific' ? '#e08a2c' : '#2e7559'
    });

    setShowCreateFolderModal(false);
    setNewFolderName('');
    setNewFolderDesc('');
    setNewFolderFlat('');
    showToast(`Folder "${created.name}" created successfully!`);
  };

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      alert('Please enter a document title');
      return;
    }

    const fName = uploadFileName.trim() || `${uploadTitle.trim().replace(/\s+/g, '_')}.pdf`;
    const assignedFlat = uploadScope === 'flat' ? uploadFlat : null;

    const created = uploadDocument({
      folderId: uploadFolderId || folders[0]?.id || 'general',
      title: uploadTitle.trim(),
      fileName: fName,
      fileType: 'pdf',
      fileSize: `${(Math.random() * 3 + 0.8).toFixed(1)} MB`,
      uploadedBy: 'Anand Deshmukh (Secretary)',
      assignedFlat,
      isPublicToAll: !assignedFlat,
      category: uploadCategory,
      description: uploadDesc.trim() || undefined
    });

    setShowUploadModal(false);
    setUploadTitle('');
    setUploadFileName('');
    setUploadDesc('');
    showToast(
      assignedFlat
        ? `Document assigned to Flat ${assignedFlat} and synced to Resident App!`
        : `Document "${created.title}" published to Society Repository!`
    );
  };

  const handleOpenPreview = (doc: SocietyDocument) => {
    setPreviewDoc(doc);
    setShowPreviewModal(true);
  };

  const handleSaveReassign = (flat: string | null) => {
    if (!reassignDoc) return;
    assignDocumentToFlat(reassignDoc.id, flat);
    showToast(
      flat
        ? `Document reassigned to Flat ${flat}! Resident can now see it on their mobile app.`
        : 'Document made public to entire society.'
    );
    setReassignDoc(null);
  };

  return (
    <div className="admin-section active" id="section-documents">
      {/* 1. Header KPIs & Vault Stats */}
      <div className="section-header-banner" style={{ marginBottom: '20px' }}>
        <div className="header-text-block">
          <h2 className="header-title">Document Repository & Flat Vaults</h2>
          <p className="header-subtitle">
            Manage society bye-laws, compliance certificates, and assign confidential deeds &amp; NOCs to specific flats
          </p>
        </div>
        <div className="header-actions-row" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowCreateFolderModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <span>New Folder</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowUploadModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: 'rgba(46, 117, 89, 0.12)', color: 'var(--pine)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Total Documents</span>
            <h3 className="kpi-value">{documents.length} Files</h3>
            <span className="kpi-subtext" style={{ color: 'var(--pine)' }}>16.4 MB Cloud Storage</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Folders</span>
            <h3 className="kpi-value">{folders.length} Folders</h3>
            <span className="kpi-subtext">Categorized &amp; Structured</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: 'rgba(224, 138, 44, 0.12)', color: 'var(--saffron-dark)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Flat-Assigned Vaults</span>
            <h3 className="kpi-value">
              {documents.filter((d) => d.assignedFlat).length} Confidential Docs
            </h3>
            <span className="kpi-subtext" style={{ color: 'var(--saffron-dark)' }}>
              Visible on Resident Mobile App
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Society Compliance</span>
            <h3 className="kpi-value">100% Up to Date</h3>
            <span className="kpi-subtext" style={{ color: '#10b981' }}>Fire NOC &amp; OC Active</span>
          </div>
        </div>
      </div>

      {/* 2. Subnav & Search Controls */}
      <div className="admin-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div className="module-subnav" style={{ margin: 0 }}>
          <button
            type="button"
            className={clsx('subnav-btn', activeTab === 'all' && 'active')}
            onClick={() => {
              setActiveTab('all');
              setSelectedFolderId(null);
            }}
          >
            All Folders &amp; Files
          </button>
          <button
            type="button"
            className={clsx('subnav-btn', activeTab === 'society' && 'active')}
            onClick={() => {
              setActiveTab('society');
              setSelectedFolderId(null);
            }}
          >
            Society Compliance &amp; By-Laws
          </button>
          <button
            type="button"
            className={clsx('subnav-btn', activeTab === 'flat-vaults' && 'active')}
            onClick={() => {
              setActiveTab('flat-vaults');
              setSelectedFolderId(null);
            }}
          >
            Flat-Specific Resident Vaults
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Flat Filter Dropdown */}
          <select
            className="select"
            style={{ fontSize: '0.8125rem', padding: '6px 12px', minWidth: '140px' }}
            value={flatFilter}
            onChange={(e) => setFlatFilter(e.target.value)}
          >
            <option value="all">Filter: All Flats</option>
            <option value="A-101">Flat A-101 (Aarav Sharma)</option>
            <option value="A-102">Flat A-102 (Vikram Malhotra)</option>
            <option value="B-201">Flat B-201 (Pooja Nair)</option>
            <option value="B-302">Flat B-302 (Karan Singhania)</option>
            <option value="C-501">Flat C-501 (Dr. Ramesh Rao)</option>
          </select>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder="Search documents, tags, flats..."
              style={{ fontSize: '0.8125rem', padding: '6px 12px 6px 32px', minWidth: '220px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Folder Cards Strip */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ink)' }}>
            Folders &amp; Document Categories
          </h4>
          {selectedFolderId && (
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => setSelectedFolderId(null)}
            >
              Clear Folder Filter
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {filteredFolders.map((folder) => {
            const count = documents.filter((d) => d.folderId === folder.id).length;
            const isSelected = selectedFolderId === folder.id;

            return (
              <div
                key={folder.id}
                className="card folder-card"
                style={{
                  padding: '14px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--pine)' : '1px solid var(--border)',
                  backgroundColor: isSelected ? 'var(--surface-sunken)' : '#ffffff',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: folder.category === 'flat-specific' ? 'rgba(224, 138, 44, 0.15)' : 'rgba(46, 117, 89, 0.15)',
                      color: folder.category === 'flat-specific' ? 'var(--saffron-dark)' : 'var(--pine)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>

                  <span
                    className={clsx(
                      'badge',
                      folder.category === 'flat-specific' ? 'badge-warning' : 'badge-pine'
                    )}
                    style={{ fontSize: '0.625rem' }}
                  >
                    {folder.assignedFlat ? `Flat ${folder.assignedFlat}` : 'All Society'}
                  </span>
                </div>

                <strong style={{ fontSize: '0.875rem', color: 'var(--ink)', display: 'block', marginBottom: '2px' }}>
                  {folder.name}
                </strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px', lineHeight: 1.3 }}>
                  {folder.description || 'General documents repository'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--neutral)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  <span>{count} Document{count !== 1 ? 's' : ''}</span>
                  <span>{folder.createdAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Documents Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Uploaded Files &amp; Certificates ({filteredDocuments.length})
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
              {selectedFolderId
                ? `Showing files in folder: ${folders.find((f) => f.id === selectedFolderId)?.name}`
                : 'Showing all society & resident flat documents'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setShowUploadModal(true)}
          >
            + Upload New File
          </button>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Document Title &amp; File</th>
                <th>Category</th>
                <th>Assigned Target Scope</th>
                <th>Size</th>
                <th>Uploaded By &amp; Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--neutral)' }}>
                    No documents found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const folder = folders.find((f) => f.id === doc.folderId);
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.875rem', color: 'var(--ink)' }}>
                              {doc.title}
                            </strong>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)', fontFamily: 'monospace' }}>
                              {doc.fileName} • Folder: {folder?.name || 'General'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                          {doc.category}
                        </span>
                      </td>
                      <td>
                        {doc.assignedFlat ? (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Flat {doc.assignedFlat} (Private)
                          </span>
                        ) : (
                          <span
                            className="badge badge-success"
                            style={{ fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                            </svg>
                            Entire Society (Public)
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--neutral)', fontFamily: 'monospace' }}>
                        {doc.fileSize}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink)', fontWeight: 500 }}>
                          {doc.uploadedBy}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--neutral)' }}>
                          {doc.uploadedAt}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-primary"
                            onClick={() => handleOpenPreview(doc)}
                            title="Preview Document"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => setReassignDoc(doc)}
                            title="Assign to specific flat"
                          >
                            Assign Flat
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-danger"
                            onClick={() => {
                              if (confirm(`Delete document "${doc.title}"?`)) {
                                deleteDocument(doc.id);
                                showToast(`Document "${doc.title}" deleted.`);
                              }
                            }}
                            title="Delete Document"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------
       * MODAL 1: Create New Folder
       * ------------------------------------------------------------- */}
      {showCreateFolderModal && (
        <div className="modal-overlay" onClick={() => setShowCreateFolderModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Document Folder</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateFolderModal(false)}>
                <IconClose size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Folder Name *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Unit A-102 Possession Deeds"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Confidential sale deed & meter transfer files"
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Folder Scope &amp; Target Category</label>
                  <select
                    className="form-select"
                    value={newFolderCategory}
                    onChange={(e) => setNewFolderCategory(e.target.value as any)}
                  >
                    <option value="society">Society General (All Residents)</option>
                    <option value="legal">Legal &amp; Compliance (Fire NOC, OC)</option>
                    <option value="financial">Financial &amp; AGM Records</option>
                    <option value="flat-specific">Flat-Specific Private Vault (Assigned to One Flat)</option>
                  </select>
                </div>

                {newFolderCategory === 'flat-specific' && (
                  <div className="form-group">
                    <label className="form-label">Target Resident Flat *</label>
                    <select
                      className="form-select"
                      value={newFolderFlat}
                      onChange={(e) => setNewFolderFlat(e.target.value)}
                    >
                      <option value="A-101">Flat A-101 (Aarav Sharma)</option>
                      <option value="A-102">Flat A-102 (Vikram Malhotra)</option>
                      <option value="B-201">Flat B-201 (Pooja Nair)</option>
                      <option value="B-302">Flat B-302 (Karan Singhania)</option>
                      <option value="C-501">Flat C-501 (Dr. Ramesh Rao)</option>
                    </select>
                    <small style={{ color: 'var(--saffron-dark)', marginTop: '4px', display: 'block' }}>
                      Residents of this flat will be able to view and download these documents directly on their phone app.
                    </small>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateFolderModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * MODAL 2: Upload Document
       * ------------------------------------------------------------- */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Document &amp; Assign Scope</h3>
              <button className="modal-close-btn" onClick={() => setShowUploadModal(false)}>
                <IconClose size={18} />
              </button>
            </div>
            <form onSubmit={handleUploadDocument}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Target Folder *</label>
                  <select
                    className="form-select"
                    value={uploadFolderId}
                    onChange={(e) => setUploadFolderId(e.target.value)}
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.assignedFlat ? `(Flat ${f.assignedFlat})` : '(Society Wide)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Document Title *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Unit A-101 Possession Letter"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">File Name (Simulated)</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Unit_A101_Possession.pdf"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Document Category</label>
                  <select
                    className="form-select"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                  >
                    <option value="By-Laws & Rules">By-Laws &amp; Rules</option>
                    <option value="Safety Compliance">Safety Compliance</option>
                    <option value="AGM Records">AGM Records</option>
                    <option value="Possession Deed">Possession Deed</option>
                    <option value="Renovation NOC">Renovation NOC</option>
                    <option value="Tenant KYC">Tenant KYC</option>
                    <option value="Utility Transfer">Utility Transfer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Access &amp; Visibility Scope</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      className={clsx('btn btn-sm', uploadScope === 'society' ? 'btn-primary' : 'btn-secondary')}
                      onClick={() => setUploadScope('society')}
                    >
                      All Society (Public)
                    </button>
                    <button
                      type="button"
                      className={clsx('btn btn-sm', uploadScope === 'flat' ? 'btn-primary' : 'btn-secondary')}
                      onClick={() => setUploadScope('flat')}
                    >
                      Assign to Flat (Private)
                    </button>
                  </div>
                </div>

                {uploadScope === 'flat' && (
                  <div className="form-group">
                    <label className="form-label">Assign to Flat Number *</label>
                    <select
                      className="form-select"
                      value={uploadFlat}
                      onChange={(e) => setUploadFlat(e.target.value)}
                    >
                      <option value="A-101">Flat A-101 (Aarav Sharma)</option>
                      <option value="A-102">Flat A-102 (Vikram Malhotra)</option>
                      <option value="B-201">Flat B-201 (Pooja Nair)</option>
                      <option value="B-302">Flat B-302 (Karan Singhania)</option>
                      <option value="C-501">Flat C-501 (Dr. Ramesh Rao)</option>
                    </select>
                    <small style={{ color: 'var(--saffron-dark)', marginTop: '4px', display: 'block' }}>
                      Only the resident in this flat will see this confidential document in their resident app vault.
                    </small>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Description / Remarks</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Notes regarding approval date, signatory, or reference IDs..."
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Upload &amp; Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * MODAL 3: Reassign Flat
       * ------------------------------------------------------------- */}
      {reassignDoc && (
        <div className="modal-overlay" onClick={() => setReassignDoc(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reassign Document Scope</h3>
              <button className="modal-close-btn" onClick={() => setReassignDoc(null)}>
                <IconClose size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
                Reassign target visibility for <strong>{reassignDoc.title}</strong>:
              </p>

              <div className="form-group">
                <label className="form-label">Select Visibility Target</label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', marginBottom: '8px', textAlign: 'left' }}
                  onClick={() => handleSaveReassign(null)}
                >
                  Entire Society (Make Public to all residents)
                </button>
                {['A-101', 'A-102', 'B-201', 'B-302', 'C-501'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '6px', textAlign: 'left' }}
                    onClick={() => handleSaveReassign(f)}
                  >
                    Assign to Flat {f} (Private to Resident)
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * MODAL 4: Document Preview
       * ------------------------------------------------------------- */}
      {showPreviewModal && previewDoc && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <h3 style={{ margin: 0 }}>{previewDoc.title}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowPreviewModal(false)}>
                <IconClose size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--pine)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <h4 style={{ fontSize: '1rem', color: 'var(--ink)', marginBottom: '4px' }}>
                  {previewDoc.fileName}
                </h4>
                <span className="badge badge-success" style={{ marginBottom: '8px' }}>
                  Digitally Signed &amp; Stamped
                </span>
                <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)', maxWidth: '400px', margin: '0 auto' }}>
                  {previewDoc.description || 'Verified society record under Greenwood Heights RWA Management System.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8125rem', marginBottom: '12px' }}>
                <div>
                  <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.7rem' }}>SCOPE</span>
                  <strong>{previewDoc.assignedFlat ? `Private to Flat ${previewDoc.assignedFlat}` : 'Public to All Society'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.7rem' }}>FILE SIZE</span>
                  <strong>{previewDoc.fileSize}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.7rem' }}>UPLOADED BY</span>
                  <strong>{previewDoc.uploadedBy}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.7rem' }}>DATE</span>
                  <strong>{previewDoc.uploadedAt}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowPreviewModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  showToast(`Downloading ${previewDoc.fileName}...`);
                  setShowPreviewModal(false);
                }}
              >
                <IconDownload size={16} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
