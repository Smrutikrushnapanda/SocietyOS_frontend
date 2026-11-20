'use client';

import { create } from 'zustand';
import { DocumentFolder, SocietyDocument } from '../types/document';
import { deleteFile } from '../lib/api/files.api';
import { useAuthStore } from './useAuthStore';

interface DocumentState {
  folders: DocumentFolder[];
  documents: SocietyDocument[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  createFolder: (folder: Omit<DocumentFolder, 'id' | 'createdAt'>) => DocumentFolder;
  deleteFolder: (folderId: string) => void;
  uploadDocument: (doc: Omit<SocietyDocument, 'id' | 'uploadedAt'>) => SocietyDocument;
  deleteDocument: (docId: string) => Promise<void>;
  assignDocumentToFlat: (docId: string, flat: string | null) => void;
  getDocumentsByFolder: (folderId: string) => SocietyDocument[];
  getDocumentsForResident: (flat: string) => { societyWide: SocietyDocument[]; flatSpecific: SocietyDocument[] };
  reset: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  folders: [],
  documents: [],
  isLoading: false,
  error: null,
  hasLoaded: false,

  createFolder: (folderData) => {
    const newFolder: DocumentFolder = {
      ...folderData,
      id: `folder-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    set((state) => ({
      folders: [newFolder, ...state.folders],
    }));
    return newFolder;
  },

  deleteFolder: (folderId) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folderId),
      documents: state.documents.filter((d) => d.folderId !== folderId),
    }));
  },

  uploadDocument: (docData) => {
    const newDoc: SocietyDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };
    set((state) => ({
      documents: [newDoc, ...state.documents],
    }));
    return newDoc;
  },

  deleteDocument: async (docId) => {
    const doc = get().documents.find((d) => d.id === docId);
    if (doc?.fileId) {
      try {
        await deleteFile(doc.fileId);
      } catch (err) {
        console.warn('[Documents] Failed to delete remote file attachment:', err);
      }
    }
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== docId),
    }));
  },

  assignDocumentToFlat: (docId, flat) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === docId
          ? { ...d, assignedFlat: flat, isPublicToAll: !flat }
          : d,
      ),
    }));
  },

  getDocumentsByFolder: (folderId) => {
    return get().documents.filter((d) => d.folderId === folderId);
  },

  getDocumentsForResident: (flat) => {
    const allDocs = get().documents;
    const societyWide = allDocs.filter((d) => d.isPublicToAll || !d.assignedFlat);
    const flatSpecific = allDocs.filter(
      (d) =>
        d.assignedFlat &&
        (d.assignedFlat.toLowerCase() === flat.toLowerCase() ||
          d.assignedFlat.replace('-', '') === flat.replace('-', '')),
    );
    return { societyWide, flatSpecific };
  },

  reset: () => {
    set({ folders: [], documents: [], isLoading: false, error: null, hasLoaded: false });
  },
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId) {
      useDocumentStore.getState().reset();
    }
  });
}
