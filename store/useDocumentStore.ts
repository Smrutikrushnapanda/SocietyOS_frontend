'use client';

import { create } from 'zustand';
import { DocumentFolder, SocietyDocument } from '../types/document';

interface DocumentState {
  folders: DocumentFolder[];
  documents: SocietyDocument[];
  createFolder: (folder: Omit<DocumentFolder, 'id' | 'createdAt'>) => DocumentFolder;
  deleteFolder: (folderId: string) => void;
  uploadDocument: (doc: Omit<SocietyDocument, 'id' | 'uploadedAt'>) => SocietyDocument;
  deleteDocument: (docId: string) => void;
  assignDocumentToFlat: (docId: string, flat: string | null) => void;
  getDocumentsByFolder: (folderId: string) => SocietyDocument[];
  getDocumentsForResident: (flat: string) => { societyWide: SocietyDocument[]; flatSpecific: SocietyDocument[] };
}

const initialFolders: DocumentFolder[] = [
  {
    id: 'f-society-bylaws',
    name: 'Society By-Laws & Rules',
    description: 'Official society constitution, pet rules & parking guidelines',
    category: 'society',
    assignedFlat: null,
    createdAt: '2026-01-15',
    color: '#2e7559'
  },
  {
    id: 'f-legal-noc',
    name: 'Municipal & Fire NOCs',
    description: 'Government compliance, OC, Fire Safety & environmental clearance',
    category: 'legal',
    assignedFlat: null,
    createdAt: '2026-02-10',
    color: '#0284c7'
  },
  {
    id: 'f-agm-minutes',
    name: 'AGM & Committee Minutes',
    description: 'Annual General Meeting resolutions & audited balance sheets',
    category: 'financial',
    assignedFlat: null,
    createdAt: '2026-04-01',
    color: '#8b5cf6'
  },
  {
    id: 'f-flat-a101',
    name: 'Unit A-101 Resident Vault',
    description: 'Possession letter, share certificate & renovation NOC for Flat A-101',
    category: 'flat-specific',
    assignedFlat: 'A-101',
    assignedTower: 'Tower A',
    createdAt: '2026-03-12',
    color: '#e08a2c'
  },
  {
    id: 'f-flat-b302',
    name: 'Unit B-302 Tenant Registry',
    description: 'Police verification & tenant agreement for Flat B-302',
    category: 'flat-specific',
    assignedFlat: 'B-302',
    assignedTower: 'Tower B',
    createdAt: '2026-05-20',
    color: '#e08a2c'
  }
];

const initialDocuments: SocietyDocument[] = [
  {
    id: 'doc-1',
    folderId: 'f-society-bylaws',
    title: 'Greenwood Heights Registered By-Laws (2026)',
    fileName: 'Greenwood_Heights_ByLaws_2026.pdf',
    fileType: 'pdf',
    fileSize: '4.2 MB',
    uploadedBy: 'Anand Deshmukh (Secretary)',
    uploadedAt: '15 Jan 2026',
    assignedFlat: null,
    isPublicToAll: true,
    category: 'Rules & By-Laws',
    description: 'Complete model bye-laws registered under Cooperative Societies Act.'
  },
  {
    id: 'doc-2',
    folderId: 'f-society-bylaws',
    title: 'Electric Vehicle (EV) Charging Policy & Tariffs',
    fileName: 'EV_Charging_Station_Rules.pdf',
    fileType: 'pdf',
    fileSize: '1.1 MB',
    uploadedBy: 'Managing Committee',
    uploadedAt: '02 Feb 2026',
    assignedFlat: null,
    isPublicToAll: true,
    category: 'Facility Policy',
    description: 'Guidelines for overnight charger allocation and metered tariffs.'
  },
  {
    id: 'doc-3',
    folderId: 'f-legal-noc',
    title: 'Municipal Fire Safety Clearance Certificate',
    fileName: 'Fire_Dept_NOC_Renewal_2026.pdf',
    fileType: 'pdf',
    fileSize: '2.8 MB',
    uploadedBy: 'AMC Facility Manager',
    uploadedAt: '10 Feb 2026',
    assignedFlat: null,
    isPublicToAll: true,
    category: 'Safety Compliance',
    description: 'Valid until February 2027 for all towers A, B, C & Clubhouse.'
  },
  {
    id: 'doc-4',
    folderId: 'f-agm-minutes',
    title: 'Minutes of the 12th Annual General Meeting',
    fileName: 'AGM_12_Resolution_Minutes.pdf',
    fileType: 'pdf',
    fileSize: '3.5 MB',
    uploadedBy: 'Anand Deshmukh (Secretary)',
    uploadedAt: '01 Apr 2026',
    assignedFlat: null,
    isPublicToAll: true,
    category: 'AGM Records',
    description: 'Passed resolutions regarding solar terrace array and lift modernization.'
  },
  {
    id: 'doc-5',
    folderId: 'f-flat-a101',
    title: 'Flat A-101 Possession Certificate & Handover',
    fileName: 'Unit_A101_Possession_Certificate.pdf',
    fileType: 'pdf',
    fileSize: '1.8 MB',
    uploadedBy: 'RWA Office',
    uploadedAt: '12 Mar 2026',
    assignedFlat: 'A-101',
    isPublicToAll: false,
    category: 'Possession Deed',
    description: 'Original builder handover document with builder stamp.'
  },
  {
    id: 'doc-6',
    folderId: 'f-flat-a101',
    title: 'Interior Renovation & Drilling NOC Approval',
    fileName: 'NOC_Renovation_Flat_A101.pdf',
    fileType: 'pdf',
    fileSize: '650 KB',
    uploadedBy: 'Estate Officer',
    uploadedAt: '25 Aug 2026',
    assignedFlat: 'A-101',
    isPublicToAll: false,
    category: 'Renovation NOC',
    description: 'Permission granted for modular kitchen and acoustic ceiling works.'
  },
  {
    id: 'doc-7',
    folderId: 'f-flat-a101',
    title: 'Electricity Meter Transfer Confirmation Deed',
    fileName: 'MSEDCL_Meter_A101_Transfer.pdf',
    fileType: 'pdf',
    fileSize: '920 KB',
    uploadedBy: 'Accounts Dept',
    uploadedAt: '04 Sep 2026',
    assignedFlat: 'A-101',
    isPublicToAll: false,
    category: 'Utility Transfer',
    description: 'Utility consumer number updated to resident name Aarav Sharma.'
  },
  {
    id: 'doc-8',
    folderId: 'f-flat-b302',
    title: 'Flat B-302 Tenant Agreement & Police Verification',
    fileName: 'Tenant_Agreement_B302_2026.pdf',
    fileType: 'pdf',
    fileSize: '2.4 MB',
    uploadedBy: 'RWA Office',
    uploadedAt: '20 May 2026',
    assignedFlat: 'B-302',
    isPublicToAll: false,
    category: 'Tenant KYC',
    description: '11-month lease agreement registered with local police station.'
  }
];

export const useDocumentStore = create<DocumentState>((set, get) => ({
  folders: initialFolders,
  documents: initialDocuments,

  createFolder: (folderData) => {
    const newFolder: DocumentFolder = {
      ...folderData,
      id: `folder-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    set((state) => ({
      folders: [newFolder, ...state.folders]
    }));
    return newFolder;
  },

  deleteFolder: (folderId) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folderId),
      documents: state.documents.filter((d) => d.folderId !== folderId)
    }));
  },

  uploadDocument: (docData) => {
    const newDoc: SocietyDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
      uploadedAt: 'Today'
    };
    set((state) => ({
      documents: [newDoc, ...state.documents]
    }));
    return newDoc;
  },

  deleteDocument: (docId) => {
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== docId)
    }));
  },

  assignDocumentToFlat: (docId, flat) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === docId
          ? { ...d, assignedFlat: flat, isPublicToAll: !flat }
          : d
      )
    }));
  },

  getDocumentsByFolder: (folderId) => {
    return get().documents.filter((d) => d.folderId === folderId);
  },

  getDocumentsForResident: (flat) => {
    const allDocs = get().documents;
    const societyWide = allDocs.filter((d) => d.isPublicToAll || !d.assignedFlat);
    const flatSpecific = allDocs.filter(
      (d) => d.assignedFlat && (d.assignedFlat.toLowerCase() === flat.toLowerCase() || d.assignedFlat.replace('-', '') === flat.replace('-', ''))
    );
    return { societyWide, flatSpecific };
  }
}));
