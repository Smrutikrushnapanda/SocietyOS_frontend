import apiClient from "./client";

export interface FileMetadataRecord {
  id: string;
  organization_id: string;
  uploaded_by: string;
  original_filename: string;
  stored_key: string;
  mime_type: string;
  size_bytes: number;
  storage_provider: string;
  is_active: boolean;
  document_scope?: string;
  category?: string;
  building_id?: string | null;
  floor_id?: string | null;
  flat_id?: string | null;
  folder_id?: string | null;
  status?: string;
  description?: string | null;
  created_at: string;
}

/** A folder in the document repository. */
export interface DocumentFolderRecord {
  id: string;
  organization_id: string;
  created_by: string;
  parent_id: string | null;
  name: string;
  folder_type: string;
  description: string | null;
  building_id: string | null;
  floor_id: string | null;
  flat_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  document_count?: number;
  child_folder_count?: number;
}

export interface FolderListResponse {
  data: DocumentFolderRecord[];
  total: number;
}

export interface FolderListParams {
  folderType?: string;
  parentId?: string;
  flatId?: string;
  buildingId?: string;
  search?: string;
}

export interface CreateFolderPayload {
  name: string;
  description?: string | null;
  folderType: "SOCIETY" | "FLAT";
  parentId?: string | null;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
}

export interface FileListResponse {
  data: FileMetadataRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface FileStatsResponse {
  total: number;
  societyCount: number;
  flatCount: number;
  pendingReviewCount: number;
}

export interface FileFilterParams {
  scope?: string;
  category?: string;
  buildingId?: string;
  floorId?: string;
  flatId?: string;
  residentId?: string;
  folderId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "category" | "size" | "uploaded" | "status";
  sortOrder?: "ASC" | "DESC";
}

export interface UploadFileMetadata {
  purpose?: 'DOCUMENT' | 'PROFILE_PHOTO' | 'ATTACHMENT';
  documentScope?: "SOCIETY" | "FLAT";
  category?: string;
  buildingId?: string;
  floorId?: string;
  flatId?: string;
  residentId?: string;
  folderId?: string;
  status?: string;
  description?: string;
}

/**
 * Generic uploads default to attachments. Vault uploads require purpose DOCUMENT.
 * Backend: POST /api/v1/files/upload
 * Permission: file:upload
 */
export async function uploadFile(
  file: File,
  metadata?: UploadFileMetadata,
): Promise<FileMetadataRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata) {
    if (metadata.purpose) formData.append("purpose", metadata.purpose);
    if (metadata.documentScope)
      formData.append("documentScope", metadata.documentScope);
    if (metadata.category) formData.append("category", metadata.category);
    if (metadata.buildingId) formData.append("buildingId", metadata.buildingId);
    if (metadata.floorId) formData.append("floorId", metadata.floorId);
    if (metadata.flatId) formData.append("flatId", metadata.flatId);
    if (metadata.residentId) formData.append("residentId", metadata.residentId);
    if (metadata.folderId) formData.append("folderId", metadata.folderId);
    if (metadata.status) formData.append("status", metadata.status);
    if (metadata.description)
      formData.append("description", metadata.description);
  }

  const { data } = await apiClient.post<FileMetadataRecord>(
    "/files/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
}

/**
 * List files with server-side filtering and pagination.
 * Backend: GET /api/v1/files
 * Permission: file:read
 */
export async function listFiles(
  params?: FileFilterParams,
): Promise<FileListResponse> {
  const { data } = await apiClient.get<FileListResponse>("/files", { params });
  return data;
}

/**
 * Retrieve document vault statistics.
 * Backend: GET /api/v1/files/stats
 * Permission: file:read
 */
export async function getFileStats(): Promise<FileStatsResponse> {
  const { data } = await apiClient.get<FileStatsResponse>("/files/stats");
  return data;
}

/**
 * Update document metadata (category, description, status, flat association).
 * Backend: PATCH /api/v1/files/:id
 * Permission: file:manage
 */
export async function updateFileMetadata(
  id: string,
  data: {
    category?: string;
    description?: string;
    status?: string;
    flatId?: string | null;
    buildingId?: string;
    floorId?: string;
    folderId?: string | null;
  },
): Promise<FileMetadataRecord> {
  const res = await apiClient.patch<FileMetadataRecord>(`/files/${id}`, data);
  return res.data;
}

/**
 * Retrieve binary file stream / blob.
 * Backend: GET /api/v1/files/:id
 * Permission: file:read
 */
export async function downloadFile(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/files/${id}`, {
    responseType: "blob",
  });
  return response.data;
}

/**
 * Deactivate / delete a file by ID.
 * Backend: DELETE /api/v1/files/:id
 * Permission: file:manage
 */
export async function deleteFile(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/files/${id}`);
  return data;
}

/* ────────────────────────────────────────────────────────────────
 * Document Repository folders
 * Backend: /api/v1/files/folders
 * Reuses existing file permissions — no new permission required.
 * ──────────────────────────────────────────────────────────────── */

/**
 * List folders visible to the current user.
 * Permission: file:read
 */
export async function listFolders(
  params?: FolderListParams,
): Promise<FolderListResponse> {
  const { data } = await apiClient.get<FolderListResponse>("/files/folders", {
    params,
  });
  return data;
}

/**
 * Create a folder (society folder or flat vault).
 * Permission: file:upload
 */
export async function createFolder(
  payload: CreateFolderPayload,
): Promise<DocumentFolderRecord> {
  const { data } = await apiClient.post<DocumentFolderRecord>(
    "/files/folders",
    payload,
  );
  return data;
}

/**
 * Rename a folder and/or update its description.
 * Permission: file:manage
 */
export async function renameFolder(
  id: string,
  payload: { name?: string; description?: string | null },
): Promise<DocumentFolderRecord> {
  const { data } = await apiClient.patch<DocumentFolderRecord>(
    `/files/folders/${id}`,
    payload,
  );
  return data;
}

/**
 * Move a folder to a different parent.
 * Permission: file:manage
 */
export async function moveFolder(
  id: string,
  parentId: string | null,
): Promise<DocumentFolderRecord> {
  const { data } = await apiClient.patch<DocumentFolderRecord>(
    `/files/folders/${id}/move`,
    { parentId },
  );
  return data;
}

/**
 * Delete a folder. A non-empty folder must specify how its contents are
 * handled, otherwise the API rejects the request.
 * Permission: file:manage
 */
export async function deleteFolder(
  id: string,
  contentHandling?: "detach" | "archive",
): Promise<{ message: string; detachedFiles: number; archivedFiles: number }> {
  const { data } = await apiClient.delete<{
    message: string;
    detachedFiles: number;
    archivedFiles: number;
  }>(`/files/folders/${id}`, {
    data: contentHandling ? { contentHandling } : {},
  });
  return data;
}

/**
 * Ancestor chain (root → parent) for breadcrumb rendering.
 * Permission: file:read
 */
export async function getFolderBreadcrumbs(
  id: string,
): Promise<{ data: DocumentFolderRecord[]; folder: DocumentFolderRecord }> {
  const { data } = await apiClient.get<{
    data: DocumentFolderRecord[];
    folder: DocumentFolderRecord;
  }>(`/files/folders/${id}/breadcrumbs`);
  return data;
}

/**
 * Convenience helper to download a file in browser by ID.
 */
export async function triggerFileDownload(
  id: string,
  filename: string,
): Promise<void> {
  const blob = await downloadFile(id);
  if (typeof window !== "undefined") {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
