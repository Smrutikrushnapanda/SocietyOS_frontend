export interface DocumentFolder {
  id: string;
  name: string;
  description?: string;
  category: 'society' | 'flat-specific' | 'legal' | 'financial' | 'kyc';
  assignedFlat?: string | null; // e.g., 'A-101' or null for all flats
  assignedTower?: string | null;
  createdAt: string;
  color?: string;
}

export interface SocietyDocument {
  id: string;
  folderId: string;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'image' | 'xlsx';
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  assignedFlat?: string | null; // null = all society, 'A-101' = specific flat
  isPublicToAll: boolean;
  category: string;
  description?: string;
  downloadUrl?: string;
  fileId?: string; // Backend file_metadata ID for GET /api/v1/files/:id
}
