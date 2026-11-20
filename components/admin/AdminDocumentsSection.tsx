"use client";

import { DocumentPreview } from '../common/DocumentPreview';
import { useAdminLoading } from '../common/AdminLoading';
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import clsx from "clsx";
import {
  listFiles,
  getFileStats,
  uploadFile,
  updateFileMetadata,
  deleteFile,
  triggerFileDownload,
  FileMetadataRecord,
  FileStatsResponse,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getFolderBreadcrumbs,
  DocumentFolderRecord,
} from "../../lib/api/files.api";
import { getBuildings, BackendBuilding } from "../../lib/api/buildings.api";
import { getFlats, BackendFlat } from "../../lib/api/flats.api";
import { hasAnyPermission } from "../../lib/auth/rbac";
import { useToastStore, useAuthStore } from "../../store";
import {
  IconClose,
  IconCheck,
  IconBuilding,
  IconHome,
  IconShield,
  IconFolder,
  IconFileText,
  IconDownload,
  IconEdit,
  IconEye,
  IconMoreVertical,
  IconTrash,
} from "../common/Icons";

/** Mirrors the backend allow-list in file.service.ts. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".txt",
];
const ACCEPT_ATTRIBUTE =
  ".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain";

const DOCUMENT_CATEGORIES = [
  "By-Laws & Rules",
  "Compliance & NOC",
  "Financial & Audit",
  "Legal & Deeds",
  "Maintenance & AMC",
  "Architecture & Plans",
  "General",
];

type ViewTab = "all" | "society" | "flat" | "pending";
type DocumentSortKey = "name" | "category" | "size" | "uploaded" | "status";

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Turns an unknown API error into a message safe to show a user. */
function extractErrorMessage(err: any, fallback: string): string {
  const message =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;
  return Array.isArray(message) ? message.join(", ") : String(message);
}

export const AdminDocumentsSection: React.FC = () => {
  const { showToast } = useToastStore();
  const documentRequest = useRef(0);
  const folderRequest = useRef(0);

  // ── Server Data States ───────────────────────────────────────────────────
  const [documents, setDocuments] = useState<FileMetadataRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<FileStatsResponse>({
    total: 0,
    societyCount: 0,
    flatCount: 0,
    pendingReviewCount: 0,
  });
  const [buildings, setBuildings] = useState<BackendBuilding[]>([]);
  const [flats, setFlats] = useState<BackendFlat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Folder State ─────────────────────────────────────────────────────────
  const [folders, setFolders] = useState<DocumentFolderRecord[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderTrail, setFolderTrail] = useState<DocumentFolderRecord[]>([]);
  const [selectedFolder, setSelectedFolder] =
    useState<DocumentFolderRecord | null>(null);

  // ── Filters & Tabs ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ViewTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState("all");
  const [selectedFlatId, setSelectedFlatId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedFolderFilter, setSelectedFolderFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<DocumentSortKey>("uploaded");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // ── Modals & Drawers ─────────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<FileMetadataRecord | null>(
    null,
  );

  // ── Create Folder Form ───────────────────────────────────────────────────
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderType, setFolderType] = useState<"SOCIETY" | "FLAT">("SOCIETY");
  const [folderParentId, setFolderParentId] = useState("");
  const [folderBuildingId, setFolderBuildingId] = useState("");
  const [folderFlatId, setFolderFlatId] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [createFolderError, setCreateFolderError] = useState<string | null>(
    null,
  );

  // ── Rename Folder Form ───────────────────────────────────────────────────
  const [renameValue, setRenameValue] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // ── Delete Folder ────────────────────────────────────────────────────────
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [deleteFolderError, setDeleteFolderError] = useState<string | null>(
    null,
  );

  // ── Upload Form States ───────────────────────────────────────────────────
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadScope, setUploadScope] = useState<"SOCIETY" | "FLAT">("SOCIETY");
  const [uploadCategory, setUploadCategory] = useState("By-Laws & Rules");
  const [uploadBuildingId, setUploadBuildingId] = useState("");
  const [uploadFlatId, setUploadFlatId] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [uploadStatus, setUploadStatus] = useState("ACTIVE");
  const [uploadDescription, setUploadDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Edit Form States ─────────────────────────────────────────────────────
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editFlatId, setEditFlatId] = useState("");
  const [editFolderId, setEditFolderId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Authorization ────────────────────────────────────────────────────────
  // The backend remains the source of truth; this only hides actions the user
  // cannot perform so the UI does not offer guaranteed-failing operations.
  const canManage = hasAnyPermission(["file:manage"]);

  // ── Fetch Buildings & Flats for Filters & Linking ─────────────────────────
  useEffect(() => {
    Promise.all([
      getBuildings().catch(() => []),
      getFlats().catch(() => []),
    ]).then(([bList, fList]) => {
      setBuildings(bList);
      setFlats(fList);
    });
  }, []);

  // ── Fetch Documents & Real Stats ─────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    const request = ++documentRequest.current;
    const scope = useAuthStore.getState();
    const current = () => request === documentRequest.current && scope.organizationId === useAuthStore.getState().organizationId && scope.backendUser?.id === useAuthStore.getState().backendUser?.id;
    setIsLoading(true);
    try {
      const scopeParam =
        activeTab === "society"
          ? "SOCIETY"
          : activeTab === "flat"
            ? "FLAT"
            : undefined;
      const statusParam =
        activeTab === "pending"
          ? "PENDING"
          : selectedStatus !== "all"
            ? selectedStatus
            : undefined;

      // Inside a folder the location is authoritative; otherwise fall back to
      // the folder dropdown in the toolbar.
      const folderParam = currentFolderId
        ? currentFolderId
        : selectedFolderFilter !== "all"
          ? selectedFolderFilter
          : undefined;

      // No catch() fallbacks here — a failed request must surface as an error
      // state rather than silently rendering an empty list.
      const [listResult, statsResult] = await Promise.all([
        listFiles({
          scope: scopeParam,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          buildingId:
            selectedBuildingId !== "all" ? selectedBuildingId : undefined,
          flatId: selectedFlatId !== "all" ? selectedFlatId : undefined,
          folderId: folderParam,
          status: statusParam,
          search: searchQuery.trim() || undefined,
          page,
          limit: pageSize,
          sortBy,
          sortOrder,
        }),
        getFileStats(),
      ]);

      if (!current()) return;
      setDocuments(listResult.data);
      setTotalCount(listResult.total);
      setStats(statsResult);
      setLoadError(null);
    } catch (err: any) {
      if (!current()) return;
      setDocuments([]);
      setTotalCount(0);
      setLoadError(
        extractErrorMessage(
          err,
          "Unable to load documents from the repository.",
        ),
      );
    } finally {
      if (current()) setIsLoading(false);
    }
  }, [
    activeTab,
    selectedCategory,
    selectedBuildingId,
    selectedFlatId,
    selectedStatus,
    selectedFolderFilter,
    currentFolderId,
    searchQuery,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const toggleSort = (column: DocumentSortKey) => {
    setSortOrder((current) =>
      sortBy === column && current === "ASC" ? "DESC" : "ASC",
    );
    setSortBy(column);
    setPage(1);
  };

  const sortIndicator = (column: DocumentSortKey) =>
    sortBy === column ? (sortOrder === "ASC" ? "↑" : "↓") : "↕";

  // ── Folder Loading ───────────────────────────────────────────────────────
  const fetchFolders = useCallback(
    async (parentId: string | null) => {
      const request = ++folderRequest.current;
      setFoldersLoading(true);
      try {
        const { data } = await listFolders(
          parentId ? { parentId } : { parentId: "root" },
        );
        if (request !== folderRequest.current) return;
        setFolders(data);
      } catch (err: any) {
        if (request !== folderRequest.current) return;
        setFolders([]);
        showToast(extractErrorMessage(err, "Unable to load folders"));
      } finally {
        if (request === folderRequest.current) setFoldersLoading(false);
      }
    },
    [showToast],
  );

  // Refresh the breadcrumb trail whenever the active folder changes.
  useEffect(() => {
    let cancelled = false;

    if (!currentFolderId) {
      setFolderTrail([]);
      setSelectedFolder(null);
      return;
    }

    getFolderBreadcrumbs(currentFolderId)
      .then((res) => {
        if (cancelled) return;
        setFolderTrail(res.data);
        setSelectedFolder(res.folder);
      })
      .catch(() => {
        if (cancelled) return;
        setFolderTrail([]);
        setSelectedFolder(null);
      });

    return () => {
      cancelled = true;
    };
  }, [currentFolderId]);

  // Load the folder grid for the current location.
  useEffect(() => {
    void fetchFolders(currentFolderId);
  }, [fetchFolders, currentFolderId]);

  /** Opens a folder: records the breadcrumb and scopes documents to it. */
  const openFolder = (folder: DocumentFolderRecord) => {
    setCurrentFolderId(folder.id);
    setSelectedFolder(folder);
    setPage(1);
    setSearchQuery("");
  };

  /** Navigates to any ancestor in the breadcrumb, or the root when null. */
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setPage(1);
  };

  // Reset page when filters change
  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // ── File Validation ──────────────────────────────────────────────────────
  // Mirrors the backend rules so users get immediate feedback. The backend
  // re-validates regardless — this is convenience, not the security boundary.
  const validateSelectedFile = useCallback(
    (file: File | null): string | null => {
      if (!file) return "Please select a file to upload.";

      const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return `Unsupported file type "${ext || "unknown"}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
      }
      if (file.size === 0) {
        return "The selected file is empty.";
      }
      if (file.size > MAX_FILE_BYTES) {
        return `File is ${formatBytes(file.size)}. Maximum allowed size is ${formatBytes(
          MAX_FILE_BYTES,
          0,
        )}.`;
      }
      return null;
    },
    [],
  );

  const handleFileSelected = (file: File | null) => {
    setUploadFileObj(file);
    setUploadProgress(null);
    setFileValidationError(validateSelectedFile(file));
  };

  const resetUploadForm = () => {
    setUploadFileObj(null);
    setFileValidationError(null);
    setUploadProgress(null);
    setUploadFolderId("");
    setUploadDescription("");
    setUploadFlatId("");
    setUploadBuildingId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Opens the upload modal, pre-selecting the folder the user is browsing. */
  const openUploadModal = (folderIdOverride?: string | null) => {
    const destination =
      folderIdOverride !== undefined ? folderIdOverride : currentFolderId;

    setUploadFolderId(destination || "");
    setFileValidationError(null);
    setUploadProgress(null);
    setShowUploadModal(true);

    // Inherit scope from the destination folder so flat vaults stay private.
    if (destination) {
      const destinationFolder = folders.find((f) => f.id === destination);
      if (destinationFolder) {
        setUploadScope(
          destinationFolder.folder_type === "FLAT" ? "FLAT" : "SOCIETY",
        );
        setUploadFlatId(destinationFolder.flat_id || "");
        setUploadBuildingId(destinationFolder.building_id || "");
        return;
      }
    }

    setUploadScope("SOCIETY");
  };

  // ── Upload Handler ───────────────────────────────────────────────────────
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateSelectedFile(uploadFileObj);
    if (validationError) {
      setFileValidationError(validationError);
      return;
    }
    if (!uploadFileObj) {
      setFileValidationError("Please select a file to upload.");
      return;
    }

    if (uploadScope === "FLAT" && !uploadFlatId) {
      setFileValidationError(
        "Select an authorized flat for this flat vault document.",
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setFileValidationError(null);

    try {
      await uploadFile(uploadFileObj, {
        purpose: 'DOCUMENT',
        documentScope: uploadScope,
        category: uploadCategory,
        buildingId: uploadBuildingId || undefined,
        flatId: uploadScope === "FLAT" ? uploadFlatId : undefined,
        folderId: uploadFolderId || undefined,
        status: uploadStatus,
        description: uploadDescription.trim() || undefined,
      });

      // Only close and clear after the API confirms success.
      showToast(`Document "${uploadFileObj.name}" uploaded successfully`);
      resetUploadForm();
      setShowUploadModal(false);
      await fetchDocuments();
      await fetchFolders(currentFolderId);
    } catch (err: any) {
      // Keep the modal open and retain every field so the user can retry.
      setFileValidationError(
        extractErrorMessage(err, "Failed to upload document"),
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // ── Create Folder Handler ────────────────────────────────────────────────
  const openCreateFolderModal = () => {
    setFolderName("");
    setFolderDescription("");
    // A nested folder inherits its parent's type by design.
    setFolderType(selectedFolder?.folder_type === "FLAT" ? "FLAT" : "SOCIETY");
    setFolderParentId(currentFolderId || "");
    setFolderBuildingId(selectedFolder?.building_id || "");
    setFolderFlatId(selectedFolder?.flat_id || "");
    setCreateFolderError(null);
    setShowCreateFolderModal(true);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!folderName.trim()) {
      setCreateFolderError("Folder name is required.");
      return;
    }
    if (folderType === "FLAT" && !folderFlatId && !folderParentId) {
      setCreateFolderError("A flat vault folder must be assigned to a flat.");
      return;
    }

    setIsCreatingFolder(true);
    setCreateFolderError(null);

    try {
      const created = await createFolder({
        name: folderName.trim(),
        description: folderDescription.trim() || null,
        folderType,
        parentId: folderParentId || null,
        buildingId: folderBuildingId || null,
        flatId: folderFlatId || null,
      });

      showToast(`Folder "${created.name}" created`);
      setShowCreateFolderModal(false);
      await fetchFolders(currentFolderId);
    } catch (err: any) {
      setCreateFolderError(extractErrorMessage(err, "Failed to create folder"));
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // ── Rename Folder Handler ────────────────────────────────────────────────
  const openRenameFolderModal = (folder: DocumentFolderRecord) => {
    setSelectedFolder(folder);
    setRenameValue(folder.name);
    setRenameDescription(folder.description || "");
    setRenameError(null);
    setShowRenameFolderModal(true);
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!renameValue.trim()) {
      setRenameError("Folder name is required.");
      return;
    }
    if (!selectedFolder) return;

    setIsRenamingFolder(true);
    setRenameError(null);

    try {
      await renameFolder(selectedFolder.id, {
        name: renameValue.trim(),
        description: renameDescription.trim() || null,
      });

      showToast("Folder updated");
      setShowRenameFolderModal(false);
      await fetchFolders(selectedFolder.parent_id ?? null);

      // Keep the breadcrumb accurate if the open folder itself was renamed.
      if (currentFolderId === selectedFolder.id) {
        const res = await getFolderBreadcrumbs(selectedFolder.id);
        setFolderTrail(res.data);
        setSelectedFolder(res.folder);
      }
    } catch (err: any) {
      setRenameError(extractErrorMessage(err, "Failed to update folder"));
    } finally {
      setIsRenamingFolder(false);
    }
  };

  // ── Delete Folder Handler ────────────────────────────────────────────────
  const openDeleteFolderModal = (folder: DocumentFolderRecord) => {
    setSelectedFolder(folder);
    setDeleteFolderError(null);
    setShowDeleteFolderModal(true);
  };

  const handleDeleteFolder = async (contentHandling?: "detach" | "archive") => {
    if (!selectedFolder) return;

    setIsDeletingFolder(true);
    setDeleteFolderError(null);

    try {
      const result = await deleteFolder(selectedFolder.id, contentHandling);

      const summary =
        result.archivedFiles > 0
          ? `${result.archivedFiles} document(s) archived`
          : result.detachedFiles > 0
            ? `${result.detachedFiles} document(s) moved to repository root`
            : "";

      showToast(
        summary
          ? `Folder "${selectedFolder.name}" deleted — ${summary}`
          : `Folder "${selectedFolder.name}" deleted`,
      );

      setShowDeleteFolderModal(false);

      // If we deleted the folder we were inside, step back to its parent.
      if (currentFolderId === selectedFolder.id) {
        setCurrentFolderId(selectedFolder.parent_id ?? null);
      }
      setSelectedFolder(null);
      await fetchFolders(currentFolderId);
      await fetchDocuments();
    } catch (err: any) {
      setDeleteFolderError(extractErrorMessage(err, "Failed to delete folder"));
    } finally {
      setIsDeletingFolder(false);
    }
  };
  // ── Edit Metadata Handler ────────────────────────────────────────────────
  const handleOpenEdit = (doc: FileMetadataRecord) => {
    setSelectedDoc(doc);
    setEditCategory(doc.category || "General");
    setEditDescription(doc.description || "");
    setEditStatus(doc.status || "ACTIVE");
    setEditFlatId(doc.flat_id || "");
    setEditFolderId(doc.folder_id || "");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setIsUpdating(true);
    try {
      await updateFileMetadata(selectedDoc.id, {
        category: editCategory,
        description: editDescription.trim() || undefined,
        status: editStatus,
        flatId: editFlatId || null,
        folderId: editFolderId || null,
      });
      showToast("Document metadata updated successfully");
      setShowEditModal(false);
      await fetchDocuments();
      await fetchFolders(currentFolderId);
    } catch (err: any) {
      showToast(extractErrorMessage(err, "Failed to update metadata"));
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Delete Handler ───────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!selectedDoc) return;
    try {
      await deleteFile(selectedDoc.id);
      showToast(`Document "${selectedDoc.original_filename}" removed`);
      setShowDeleteModal(false);
      setSelectedDoc(null);
      await fetchDocuments();
      await fetchFolders(currentFolderId);
    } catch (err: any) {
      showToast(extractErrorMessage(err, "Failed to delete file"));
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getFlatLabel = (flatId?: string | null) => {
    if (!flatId) return null;
    const found = flats.find((f) => f.id === flatId);
    return found
      ? `Flat ${found.flat_identifier}`
      : `Flat ${flatId.substring(0, 8)}`;
  };

  const getBuildingLabel = (buildingId?: string | null) => {
    if (!buildingId) return null;
    const found = buildings.find((b) => b.id === buildingId);
    return found ? found.name : null;
  };

  /** Resolves a folder name from the currently loaded folder set. */
  const getFolderName = (folderId?: string | null) => {
    if (!folderId) return null;
    const found = folders.find((f) => f.id === folderId);
    if (found) return found.name;
    if (folderId === currentFolderId && selectedFolder)
      return selectedFolder.name;
    return null;
  };

  const availableFlatsForUpload = useMemo(() => {
    if (!uploadBuildingId) return flats;
    return flats.filter((f) => f.building_id === uploadBuildingId);
  }, [flats, uploadBuildingId]);

  // Removable chips mirroring whichever filters are currently narrowing results.
  const activeFilterChips = useMemo(() => {
    const chips: {
      key: string;
      label: string;
      value: string;
      clear: () => void;
    }[] = [];

    if (searchQuery.trim()) {
      chips.push({
        key: "search",
        label: "Search",
        value: `"${searchQuery.trim()}"`,
        clear: () => {
          setSearchQuery("");
          setPage(1);
        },
      });
    }
    if (selectedCategory !== "all") {
      chips.push({
        key: "category",
        label: "Category",
        value: selectedCategory,
        clear: () => {
          setSelectedCategory("all");
          setPage(1);
        },
      });
    }
    if (selectedBuildingId !== "all") {
      chips.push({
        key: "building",
        label: "Building",
        value: getBuildingLabel(selectedBuildingId) || "Selected",
        clear: () => {
          setSelectedBuildingId("all");
          setSelectedFlatId("all");
          setPage(1);
        },
      });
    }
    if (selectedFlatId !== "all") {
      chips.push({
        key: "flat",
        label: "Flat",
        value: getFlatLabel(selectedFlatId) || "Selected",
        clear: () => {
          setSelectedFlatId("all");
          setPage(1);
        },
      });
    }
    if (selectedStatus !== "all") {
      chips.push({
        key: "status",
        label: "Status",
        value:
          selectedStatus === "ACTIVE"
            ? "Active"
            : selectedStatus === "PENDING"
              ? "Pending Review"
              : "Archived",
        clear: () => {
          setSelectedStatus("all");
          setPage(1);
        },
      });
    }

    return chips;
  }, [
    searchQuery,
    selectedCategory,
    selectedBuildingId,
    selectedFlatId,
    selectedStatus,
    buildings,
    flats,
  ]);

  useAdminLoading(isLoading || foldersLoading, 'Loading documents and vaults…');

  return (
    <div className="admin-section active" id="section-documents">
      {/* ── 1. Page Header ───────────────────────────────────────────────── */}
      <div className="section-header">
        <div>
          <span className="doc-eyebrow">
            <span className="doc-eyebrow-dot" />
            Secure Document Control
          </span>
          <h2 style={{ margin: 0 }}>Documents &amp; Flat Vaults</h2>
          <p className="doc-page-desc" style={{ marginTop: "6px" }}>
            Organize society documents and securely manage flat-specific files.
          </p>
        </div>
        <div className="section-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={openCreateFolderModal}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <IconFolder size={16} />
            <span>Create Folder</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openUploadModal()}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* ── 2. Real Summary KPI Cards ────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: "24px" }}>
        <div
          className="kpi-card doc-kpi"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          <div
            className="kpi-icon-wrap"
            style={{
              backgroundColor: "rgba(46, 117, 89, 0.1)",
              color: "var(--pine)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Total Documents</span>
            <h3 className="kpi-value" style={{ margin: 0 }}>
              {stats.total}
            </h3>
            <span className="kpi-subtext" style={{ color: "var(--pine)" }}>
              Live Database Records
            </span>
          </div>
        </div>

        <div
          className="kpi-card doc-kpi"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          <div
            className="kpi-icon-wrap"
            style={{
              backgroundColor: "var(--info-tint)",
              color: "var(--info)",
            }}
          >
            <IconBuilding size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Society Documents</span>
            <h3 className="kpi-value" style={{ margin: 0 }}>
              {stats.societyCount}
            </h3>
            <span className="kpi-subtext">Compliance &amp; By-Laws</span>
          </div>
        </div>

        <div
          className="kpi-card doc-kpi"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          <div
            className="kpi-icon-wrap"
            style={{
              backgroundColor: "var(--saffron-tint)",
              color: "var(--saffron-dark)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Flat Documents</span>
            <h3 className="kpi-value" style={{ margin: 0 }}>
              {stats.flatCount}
            </h3>
            <span
              className="kpi-subtext"
              style={{ color: "var(--saffron-dark)" }}
            >
              Confidential Resident Vaults
            </span>
          </div>
        </div>

        <div
          className="kpi-card doc-kpi"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          <div
            className="kpi-icon-wrap"
            style={{
              backgroundColor: "var(--danger-tint)",
              color: "var(--danger)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Pending Review</span>
            <h3 className="kpi-value" style={{ margin: 0 }}>
              {stats.pendingReviewCount}
            </h3>
            <span className="kpi-subtext">Awaiting Verification</span>
          </div>
        </div>
      </div>

      {/* ── 3. Tabs Navigation ───────────────────────────────────────────── */}
      <div
        className="doc-tabs"
        role="tablist"
        aria-label="Document scope views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "all"}
          className={clsx("doc-tab", activeTab === "all" && "active")}
          onClick={() => handleTabChange("all")}
        >
          <span className="doc-tab-icon">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </span>
          <span className="doc-tab-label">All Documents</span>
          <span className="doc-tab-count">{stats.total}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "society"}
          className={clsx(
            "doc-tab",
            "doc-tab--society",
            activeTab === "society" && "active",
          )}
          onClick={() => handleTabChange("society")}
        >
          <span className="doc-tab-icon">
            <IconBuilding size={14} />
          </span>
          <span className="doc-tab-label">Society Repository</span>
          <span className="doc-tab-count">{stats.societyCount}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "flat"}
          className={clsx(
            "doc-tab",
            "doc-tab--flat",
            activeTab === "flat" && "active",
          )}
          onClick={() => handleTabChange("flat")}
        >
          <span className="doc-tab-icon">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </span>
          <span className="doc-tab-label">Flat Vaults</span>
          <span className="doc-tab-count">{stats.flatCount}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pending"}
          className={clsx(
            "doc-tab",
            "doc-tab--pending",
            activeTab === "pending" && "active",
          )}
          onClick={() => handleTabChange("pending")}
        >
          <span className="doc-tab-icon">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <span className="doc-tab-label">Pending Review</span>
          <span className="doc-tab-count">{stats.pendingReviewCount}</span>
        </button>
      </div>

      {/* ── 3b. Breadcrumbs + Folder Browser ─────────────────────────────── */}
      <div className="doc-breadcrumb-bar">
        <nav className="doc-breadcrumbs" aria-label="Folder path">
          <button
            type="button"
            className={clsx("doc-crumb", !currentFolderId && "is-current")}
            onClick={() => navigateToFolder(null)}
          >
            <IconHome size={13} />
            <span>All Documents</span>
          </button>
          {folderTrail.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <span className="doc-crumb-sep" aria-hidden="true">
                /
              </span>
              <button
                type="button"
                className={clsx(
                  "doc-crumb",
                  currentFolderId === crumb.id && "is-current",
                )}
                onClick={() => navigateToFolder(crumb.id)}
              >
                {crumb.folder_type === "FLAT" ? (
                  <IconShield size={13} />
                ) : (
                  <IconFolder size={13} />
                )}
                <span>{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className="doc-breadcrumb-actions">
          {currentFolderId && (
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() =>
                navigateToFolder(selectedFolder?.parent_id ?? null)
              }
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Search & Filter Bar ───────────────────────────────────────── */}
      <div className="card doc-filter-bar">
        <div className="doc-filter-fields">
          {/* Search Box */}
          <div className="doc-filter-field doc-filter-field--grow">
            <label className="doc-filter-label" htmlFor="doc-search-input">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search
            </label>
            <div className="doc-search">
              <input
                id="doc-search-input"
                type="text"
                placeholder="Filename or description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
              <svg
                className="doc-search-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* Category Filter */}
          <div className="doc-filter-field">
            <label className="doc-filter-label" htmlFor="doc-category-select">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Category
            </label>
            <select
              id="doc-category-select"
              className="doc-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Categories</option>
              {DOCUMENT_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          {/* Building Filter */}
          <div className="doc-filter-field">
            <label className="doc-filter-label" htmlFor="doc-building-select">
              <IconBuilding size={11} />
              Building
            </label>
            <select
              id="doc-building-select"
              className="doc-select"
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedFlatId("all");
                setPage(1);
              }}
            >
              <option value="all">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Flat Filter */}
          {activeTab !== "society" && (
            <div className="doc-filter-field">
              <label className="doc-filter-label" htmlFor="doc-flat-select">
                <IconHome size={11} />
                Flat
              </label>
              <select
                id="doc-flat-select"
                className="doc-select"
                value={selectedFlatId}
                onChange={(e) => {
                  setSelectedFlatId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Flats</option>
                {flats
                  .filter(
                    (f) =>
                      selectedBuildingId === "all" ||
                      f.building_id === selectedBuildingId,
                  )
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      Flat {f.flat_identifier}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          {activeTab !== "pending" && (
            <div className="doc-filter-field">
              <label className="doc-filter-label" htmlFor="doc-status-select">
                <IconShield size={11} />
                Status
              </label>
              <select
                id="doc-status-select"
                className="doc-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending Review</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          )}
        </div>

        {/* Active filter chips — each individually removable */}
        {activeFilterChips.length > 0 && (
          <div className="doc-active-filters">
            <span className="doc-active-filters-label">Applied</span>
            {activeFilterChips.map((chip) => (
              <span key={chip.key} className="doc-filter-chip">
                <span className="doc-filter-chip-key">{chip.label}:</span>
                {chip.value}
                <button
                  type="button"
                  className="doc-filter-chip-x"
                  aria-label={`Remove ${chip.label} filter`}
                  onClick={chip.clear}
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              style={{ marginLeft: "auto" }}
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedBuildingId("all");
                setSelectedFlatId("all");
                setSelectedStatus("all");
                setPage(1);
              }}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ── 3c. Folder Grid ──────────────────────────────────────────────── */}
      <section className="doc-folder-section" aria-label="Folders">
        <div className="doc-folder-head">
          <h3 className="doc-folder-title">
            {currentFolderId
              ? `Folders in ${selectedFolder?.name || "folder"}`
              : "All Folders"}
          </h3>
          <span className="doc-folder-count">
            {folders.length} folder{folders.length === 1 ? "" : "s"}
          </span>
        </div>

        {foldersLoading ? (
          <div className="doc-folder-grid">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="doc-folder-card is-skeleton"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="doc-folder-empty">
            <IconFolder size={20} />
            <span>
              {currentFolderId
                ? "No sub-folders here yet."
                : "No folders yet. Create one to organize your documents."}
            </span>
          </div>
        ) : (
          <div className="doc-folder-grid">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={clsx(
                  "doc-folder-card",
                  folder.folder_type === "FLAT" && "is-flat",
                )}
              >
                <button
                  type="button"
                  className="doc-folder-open"
                  onClick={() => openFolder(folder)}
                  aria-label={`Open folder ${folder.name}`}
                >
                  <span className="doc-folder-icon">
                    {folder.folder_type === "FLAT" ? (
                      <IconShield size={18} />
                    ) : (
                      <IconFolder size={18} />
                    )}
                  </span>
                  <span className="doc-folder-body">
                    <span className="doc-folder-name">{folder.name}</span>
                    <span className="doc-folder-meta">
                      {folder.document_count ?? 0} document
                      {(folder.document_count ?? 0) === 1 ? "" : "s"}
                      {(folder.child_folder_count ?? 0) > 0 && (
                        <>
                          {" · "}
                          {folder.child_folder_count} sub-folder
                          {(folder.child_folder_count ?? 0) === 1 ? "" : "s"}
                        </>
                      )}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      "doc-folder-badge",
                      folder.folder_type === "FLAT" ? "is-flat" : "is-society",
                    )}
                  >
                    {folder.folder_type === "FLAT" ? "Flat Vault" : "Society"}
                  </span>
                </button>

                {canManage && (
                  <div className="doc-folder-tools">
                    <button
                      type="button"
                      className="doc-folder-tool"
                      onClick={() => openUploadModal(folder.id)}
                      title="Upload into this folder"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Upload</span>
                    </button>
                    <button
                      type="button"
                      className="doc-folder-tool"
                      onClick={() => openRenameFolderModal(folder)}
                      title="Rename folder"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
                      </svg>
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      className="doc-folder-tool is-danger"
                      onClick={() => openDeleteFolderModal(folder)}
                      title="Delete folder"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Result summary */}
      {!isLoading && documents.length > 0 && (
        <div className="doc-result-summary">
          <span className="doc-result-count">{documents.length}</span>
          <span>
            {documents.length === 1 ? "document" : "documents"} on this page
          </span>
          <span aria-hidden="true">•</span>
          <span className="doc-result-count">{totalCount}</span>
          <span>total match{totalCount === 1 ? "" : "es"}</span>
        </div>
      )}

      {/* ── 5. Documents Table & Empty State ─────────────────────────────── */}
      <div className="card doc-table-card">
        {isLoading ? (
          <div style={{ minHeight: 240 }} />
        ) : loadError ? (
          <div className="doc-error">
            <div className="doc-error-icon">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="doc-error-title">Unable to load documents</h3>
            <p className="doc-error-desc">{loadError}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void fetchDocuments()}
            >
              Try Again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="doc-empty">
            <div className="doc-empty-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="doc-empty-title">No Documents in this View</h3>
            <p className="doc-empty-desc">
              Upload society by-laws, audited statements, or assign confidential
              purchase deeds to flat vaults.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowUploadModal(true)}
            >
              Upload First Document
            </button>
          </div>
        ) : (
          <>
            <div className="doc-table-scroll">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Sl. No.</th>
                    <th
                      aria-sort={
                        sortBy === "name"
                          ? sortOrder === "ASC"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="doc-sort-button"
                        onClick={() => toggleSort("name")}
                      >
                        Document Name{" "}
                        <span aria-hidden="true">{sortIndicator("name")}</span>
                      </button>
                    </th>
                    <th
                      aria-sort={
                        sortBy === "category"
                          ? sortOrder === "ASC"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="doc-sort-button"
                        onClick={() => toggleSort("category")}
                      >
                        Category{" "}
                        <span aria-hidden="true">
                          {sortIndicator("category")}
                        </span>
                      </button>
                    </th>
                    <th>Folder</th>
                    <th>Scope</th>
                    <th>Linked Building / Flat</th>
                    <th
                      aria-sort={
                        sortBy === "size"
                          ? sortOrder === "ASC"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="doc-sort-button"
                        onClick={() => toggleSort("size")}
                      >
                        Size{" "}
                        <span aria-hidden="true">{sortIndicator("size")}</span>
                      </button>
                    </th>
                    <th
                      aria-sort={
                        sortBy === "uploaded"
                          ? sortOrder === "ASC"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="doc-sort-button"
                        onClick={() => toggleSort("uploaded")}
                      >
                        Uploaded{" "}
                        <span aria-hidden="true">
                          {sortIndicator("uploaded")}
                        </span>
                      </button>
                    </th>
                    <th
                      aria-sort={
                        sortBy === "status"
                          ? sortOrder === "ASC"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="doc-sort-button"
                        onClick={() => toggleSort("status")}
                      >
                        Status{" "}
                        <span aria-hidden="true">
                          {sortIndicator("status")}
                        </span>
                      </button>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => {
                    const isFlatScope =
                      doc.document_scope?.toUpperCase() === "FLAT";
                    const flatLabel = getFlatLabel(doc.flat_id);
                    const buildingLabel = getBuildingLabel(doc.building_id);

                    return (
                      <tr key={doc.id}>
                        <td className="doc-serial">
                          {(page - 1) * pageSize + index + 1}
                        </td>
                        <td>
                          <div className="doc-name-cell">
                            <div
                              className={`doc-file-icon doc-file-icon--${isFlatScope ? "flat" : "society"}`}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            </div>
                            <div>
                              <div className="doc-doc-title">
                                {doc.original_filename}
                              </div>
                              {doc.description && (
                                <div className="doc-doc-desc">
                                  {doc.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="doc-category">
                            {doc.category || "General"}
                          </span>
                        </td>

                        <td>
                          {getFolderName(doc.folder_id) ? (
                            <span className="doc-category">
                              <IconFolder size={11} />
                              <span style={{ marginLeft: "5px" }}>
                                {getFolderName(doc.folder_id)}
                              </span>
                            </span>
                          ) : (
                            <span className="doc-muted">Repository root</span>
                          )}
                        </td>

                        <td>
                          {isFlatScope ? (
                            <span className="badge badge-warning">
                              Flat Vault
                            </span>
                          ) : (
                            <span className="badge badge-info">Society</span>
                          )}
                        </td>

                        <td>
                          {isFlatScope ? (
                            <span className="doc-flat-label">
                              {flatLabel || "Unassigned Flat"}
                            </span>
                          ) : buildingLabel ? (
                            <span
                              style={{
                                fontSize: "0.8125rem",
                                color: "var(--ink)",
                              }}
                            >
                              {buildingLabel}
                            </span>
                          ) : (
                            <span className="doc-muted">Entire Society</span>
                          )}
                        </td>

                        <td className="doc-muted">
                          {formatBytes(doc.size_bytes)}
                        </td>

                        <td className="doc-muted">
                          {new Date(doc.created_at).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              doc.status === "ACTIVE"
                                ? "badge badge-success"
                                : doc.status === "PENDING"
                                  ? "badge badge-warning"
                                  : "badge badge-neutral"
                            }
                          >
                            {doc.status || "Active"}
                          </span>
                        </td>

                        <td>
                          <div className="doc-actions">
                            <button
                              type="button"
                              className="doc-action-trigger"
                              onClick={() =>
                                setOpenActionId((id) =>
                                  id === doc.id ? null : doc.id,
                                )
                              }
                              aria-label={`Actions for ${doc.original_filename}`}
                              aria-expanded={openActionId === doc.id}
                              title="Document actions"
                            >
                              <IconMoreVertical size={18} />
                            </button>
                            {openActionId === doc.id && (
                              <div
                                className="doc-actions-menu"
                                role="menu"
                                aria-label={`Actions for ${doc.original_filename}`}
                              >
                                <button
                                  type="button"
                                  className="doc-action-icon"
                                  onClick={() => {
                                    setSelectedDoc(doc);
                                    setShowPreviewModal(true);
                                    setOpenActionId(null);
                                  }}
                                  title="Preview"
                                  aria-label="Preview"
                                  role="menuitem"
                                >
                                  <IconEye size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="doc-action-icon"
                                  onClick={() => {
                                    triggerFileDownload(
                                      doc.id,
                                      doc.original_filename,
                                    );
                                    setOpenActionId(null);
                                  }}
                                  title="Download"
                                  aria-label="Download"
                                  role="menuitem"
                                >
                                  <IconDownload size={16} />
                                </button>
                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      className="doc-action-icon"
                                      onClick={() => {
                                        handleOpenEdit(doc);
                                        setOpenActionId(null);
                                      }}
                                      title="Edit metadata"
                                      aria-label="Edit metadata"
                                      role="menuitem"
                                    >
                                      <IconEdit size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="doc-action-icon doc-action-icon--danger"
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setShowDeleteModal(true);
                                        setOpenActionId(null);
                                      }}
                                      title="Delete"
                                      aria-label="Delete"
                                      role="menuitem"
                                    >
                                      <IconTrash size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 20px",
                borderTop: "1px solid var(--border-subtle)",
                background: "var(--surface)",
                fontSize: "0.8125rem",
                color: "var(--neutral)",
              }}
            >
              <div>
                Showing {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, totalCount)} of {totalCount} records
              </div>

              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: "0.75rem",
                  }}
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>

                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span>Page {page}</span>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  disabled={page * pageSize >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 6. Upload Document Modal ─────────────────────────────────────── */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "520px", width: "100%" }}
          >
            <div className="doc-modal-head">
              <h3 className="doc-modal-title">Upload to Document Repository</h3>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setShowUploadModal(false)}
              >
                <IconClose size={16} />
              </button>
            </div>

            <form
              onSubmit={handleUploadSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* File picker / dropzone */}
              <div className="doc-form-field">
                <span className="doc-form-label">File *</span>
                <input
                  ref={fileInputRef}
                  id="upload-file-input"
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  onChange={(e) =>
                    handleFileSelected(e.target.files?.[0] || null)
                  }
                  style={{ display: "none" }}
                />
                {uploadFileObj ? (
                  <div className="doc-file-selected">
                    <div className="doc-file-selected-icon">
                      <IconFileText size={16} />
                    </div>
                    <div className="doc-file-selected-body">
                      <span className="doc-file-selected-name">
                        {uploadFileObj.name}
                      </span>
                      <span className="doc-file-selected-size">
                        {formatBytes(uploadFileObj.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => {
                        handleFileSelected(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div
                    className={clsx(
                      "doc-dropzone",
                      isDragActive && "is-dragging",
                      fileValidationError && "is-error",
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragActive(false);
                      handleFileSelected(e.dataTransfer.files?.[0] || null);
                    }}
                  >
                    <div className="doc-dropzone-icon">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <span className="doc-dropzone-title">
                      {isDragActive
                        ? "Drop the file here"
                        : "Drag & drop or click to browse"}
                    </span>
                    <span className="doc-dropzone-hint">
                      PDF, PNG, JPG, WEBP or TXT — up to 10 MB
                    </span>
                  </div>
                )}
              </div>

              {/* Destination folder */}
              <div className="doc-form-field">
                <label
                  className="doc-form-label"
                  htmlFor="upload-folder-select"
                >
                  Destination Folder
                </label>
                <select
                  id="upload-folder-select"
                  className="doc-form-input"
                  value={uploadFolderId}
                  onChange={(e) => setUploadFolderId(e.target.value)}
                >
                  <option value="">Repository root (no folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.folder_type === "FLAT" ? " — Flat Vault" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label">Document Scope *</label>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="uploadScope"
                      value="SOCIETY"
                      checked={uploadScope === "SOCIETY"}
                      onChange={() => setUploadScope("SOCIETY")}
                      style={{ accentColor: "var(--pine)" }}
                    />
                    Society-Wide Document
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="uploadScope"
                      value="FLAT"
                      checked={uploadScope === "FLAT"}
                      onChange={() => setUploadScope("FLAT")}
                      style={{ accentColor: "var(--pine)" }}
                    />
                    Flat Confidential Vault
                  </label>
                </div>
              </div>

              {uploadScope === "FLAT" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div className="doc-form-field">
                    <label className="doc-form-label">Building</label>
                    <select
                      className="doc-form-input"
                      value={uploadBuildingId}
                      onChange={(e) => setUploadBuildingId(e.target.value)}
                    >
                      <option value="">Any Building</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="doc-form-field">
                    <label className="doc-form-label">Target Flat *</label>
                    <select
                      className="doc-form-input"
                      value={uploadFlatId}
                      onChange={(e) => setUploadFlatId(e.target.value)}
                      required
                    >
                      <option value="">Select Flat...</option>
                      {availableFlatsForUpload.map((f) => (
                        <option key={f.id} value={f.id}>
                          Flat {f.flat_identifier}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="doc-form-field">
                <label className="doc-form-label">Category *</label>
                <select
                  className="doc-form-input"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  required
                >
                  {DOCUMENT_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label">Status</label>
                <select
                  className="doc-form-input"
                  value={uploadStatus}
                  onChange={(e) => setUploadStatus(e.target.value)}
                >
                  <option value="ACTIVE">Active (Published)</option>
                  <option value="PENDING">Pending Review</option>
                </select>
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label">Description / Notes</label>
                <textarea
                  rows={2}
                  className="doc-form-textarea"
                  placeholder="Optional description or details about this document..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>

              {fileValidationError && (
                <div className="doc-inline-error" role="alert">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{fileValidationError}</span>
                </div>
              )}

              {isUploading && (
                <div className="doc-form-field" style={{ marginBottom: 0 }}>
                  <span className="doc-form-label">Uploading...</span>
                  <div className="doc-progress">
                    <div className="doc-progress-bar" />
                  </div>
                </div>
              )}

              <div className="doc-modal-foot">
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Confirm Upload"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. Preview Modal ─────────────────────────────────────────────── */}
      {showPreviewModal && selectedDoc && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "580px", width: "100%" }}
          >
            <div className="doc-modal-head">
              <h3 className="doc-modal-title">Document Details</h3>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setShowPreviewModal(false)}
              >
                <IconClose size={16} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                fontSize: "0.875rem",
              }}
            >
              <DocumentPreview key={selectedDoc.id} id={selectedDoc.id} mimeType={selectedDoc.mime_type} filename={selectedDoc.original_filename} />
              <div className="doc-detail-panel">
                <div className="doc-detail-name">
                  {selectedDoc.original_filename}
                </div>
                <div className="doc-detail-meta">
                  MIME: {selectedDoc.mime_type} • Size:{" "}
                  {formatBytes(selectedDoc.size_bytes)}
                </div>
              </div>

              <div className="doc-detail-grid">
                <div>
                  <span className="doc-detail-key">Scope</span>
                  <div className="doc-detail-val">
                    {selectedDoc.document_scope || "SOCIETY"}
                  </div>
                </div>
                <div>
                  <span className="doc-detail-key">Category</span>
                  <div className="doc-detail-val">
                    {selectedDoc.category || "General"}
                  </div>
                </div>
                <div>
                  <span className="doc-detail-key">Target Flat</span>
                  <div className="doc-detail-val">
                    {getFlatLabel(selectedDoc.flat_id) || "None (Society)"}
                  </div>
                </div>
                <div>
                  <span className="doc-detail-key">Status</span>
                  <div className="doc-detail-val">
                    {selectedDoc.status || "ACTIVE"}
                  </div>
                </div>
              </div>

              {selectedDoc.description && (
                <div>
                  <span className="doc-detail-key">Description</span>
                  <p
                    className="doc-form-hint"
                    style={{
                      marginTop: "2px",
                      color: "var(--ink)",
                      fontSize: "0.875rem",
                    }}
                  >
                    {selectedDoc.description}
                  </p>
                </div>
              )}

              <div className="doc-modal-foot">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() =>
                    triggerFileDownload(
                      selectedDoc.id,
                      selectedDoc.original_filename,
                    )
                  }
                >
                  Download File
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowPreviewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Edit Metadata Modal ───────────────────────────────────────── */}
      {showEditModal && selectedDoc && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "480px", width: "100%" }}
          >
            <div className="doc-modal-head">
              <h3 className="doc-modal-title">Edit Document Metadata</h3>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setShowEditModal(false)}
              >
                <IconClose size={16} />
              </button>
            </div>

            <form
              onSubmit={handleEditSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div className="doc-form-field">
                <label className="doc-form-label">Category</label>
                <select
                  className="doc-form-input"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {DOCUMENT_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label">Status</label>
                <select
                  className="doc-form-input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label">
                  Assigned Flat (For Flat Vaults)
                </label>
                <select
                  className="doc-form-input"
                  value={editFlatId}
                  onChange={(e) => setEditFlatId(e.target.value)}
                >
                  <option value="">None (Society-Wide)</option>
                  {flats.map((f) => (
                    <option key={f.id} value={f.id}>
                      Flat {f.flat_identifier}
                    </option>
                  ))}
                </select>
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label" htmlFor="edit-folder-select">
                  Folder
                </label>
                <select
                  id="edit-folder-select"
                  className="doc-form-input"
                  value={editFolderId}
                  onChange={(e) => setEditFolderId(e.target.value)}
                >
                  <option value="">Repository root (no folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.folder_type === "FLAT" ? " — Flat Vault" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label">Description / Notes</label>
                <textarea
                  rows={2}
                  className="doc-form-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="doc-modal-foot">
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 9. Delete Confirmation Modal ─────────────────────────────────── */}
      {showDeleteModal && selectedDoc && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "440px", width: "100%" }}
          >
            <div className="doc-modal-head">
              <h3
                className="doc-modal-title"
                style={{ color: "var(--danger)" }}
              >
                Confirm Deletion
              </h3>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--ink)",
                marginBottom: "var(--space-5)",
              }}
            >
              Are you sure you want to remove{" "}
              <strong>&ldquo;{selectedDoc.original_filename}&rdquo;</strong>{" "}
              from the repository? This file will be deactivated.
            </p>
            <div className="doc-modal-foot" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="btn btn-danger"
                style={{
                  flex: 1,
                  backgroundColor: "var(--danger)",
                  color: "#fff",
                }}
                onClick={handleConfirmDelete}
              >
                Delete File
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── 10. Create Folder Modal ──────────────────────────────────────── */}
      {showCreateFolderModal && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "520px", width: "100%" }}
          >
            <div className="doc-modal-head">
              <h3 className="doc-modal-title">Create Folder</h3>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setShowCreateFolderModal(false)}
              >
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder}>
              <div className="doc-form-field">
                <label className="doc-form-label" htmlFor="new-folder-name">
                  Folder Name *
                </label>
                <input
                  id="new-folder-name"
                  type="text"
                  className="doc-form-input"
                  placeholder="e.g. Annual General Meeting 2026"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  maxLength={150}
                  autoFocus
                  required
                />
                <span className="doc-form-hint">
                  Names must be unique within the same location.
                </span>
              </div>

              <div className="doc-form-field">
                <label
                  className="doc-form-label"
                  htmlFor="new-folder-description"
                >
                  Description
                </label>
                <textarea
                  id="new-folder-description"
                  rows={2}
                  className="doc-form-textarea"
                  placeholder="Optional description for this folder..."
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                />
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label" htmlFor="new-folder-type">
                  Folder Type *
                </label>
                <select
                  id="new-folder-type"
                  className="doc-form-input"
                  value={folderType}
                  onChange={(e) =>
                    setFolderType(e.target.value as "SOCIETY" | "FLAT")
                  }
                  // Nested folders inherit the parent's type.
                  disabled={Boolean(currentFolderId)}
                >
                  <option value="SOCIETY">
                    Society Folder — shared repository
                  </option>
                  <option value="FLAT">
                    Flat Vault — confidential, one flat only
                  </option>
                </select>
                {currentFolderId && (
                  <span className="doc-form-hint">
                    Sub-folders inherit the parent folder&apos;s type.
                  </span>
                )}
              </div>

              {!currentFolderId &&
                folders.filter((f) => f.folder_type === folderType).length >
                  0 && (
                  <div className="doc-form-field">
                    <label
                      className="doc-form-label"
                      htmlFor="new-folder-parent"
                    >
                      Parent Folder
                    </label>
                    <select
                      id="new-folder-parent"
                      className="doc-form-input"
                      value={folderParentId}
                      onChange={(e) => setFolderParentId(e.target.value)}
                    >
                      <option value="">Top level (no parent)</option>
                      {folders
                        .filter((f) => f.folder_type === folderType)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

              {folderType === "FLAT" && !folderParentId && (
                <div className="doc-form-field">
                  <label className="doc-form-label" htmlFor="new-folder-flat">
                    Target Flat *
                  </label>
                  <select
                    id="new-folder-flat"
                    className="doc-form-input"
                    value={folderFlatId}
                    onChange={(e) => {
                      setFolderFlatId(e.target.value);
                      const flat = flats.find((f) => f.id === e.target.value);
                      setFolderBuildingId(flat?.building_id || "");
                    }}
                    required
                  >
                    <option value="">Select flat...</option>
                    {flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        Flat {f.flat_identifier}
                      </option>
                    ))}
                  </select>
                  <span className="doc-form-hint">
                    Only residents of this flat and administrators can access
                    its contents.
                  </span>
                </div>
              )}

              {createFolderError && (
                <div className="doc-inline-error" role="alert">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{createFolderError}</span>
                </div>
              )}

              <div className="doc-modal-foot">
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isCreatingFolder}
                >
                  {isCreatingFolder ? "Creating..." : "Create Folder"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateFolderModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 11. Rename Folder Modal ──────────────────────────────────────── */}
      {showRenameFolderModal && selectedFolder && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "480px", width: "100%" }}
          >
            <div className="doc-modal-head">
              <h3 className="doc-modal-title">Rename Folder</h3>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setShowRenameFolderModal(false)}
              >
                <IconClose size={16} />
              </button>
            </div>

            <form onSubmit={handleRenameFolder}>
              <div className="doc-form-field">
                <label className="doc-form-label" htmlFor="rename-folder-input">
                  Folder Name *
                </label>
                <input
                  id="rename-folder-input"
                  type="text"
                  className="doc-form-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  maxLength={150}
                  autoFocus
                  required
                />
              </div>

              <div className="doc-form-field">
                <label className="doc-form-label" htmlFor="rename-folder-desc">
                  Description
                </label>
                <textarea
                  id="rename-folder-desc"
                  rows={2}
                  className="doc-form-textarea"
                  value={renameDescription}
                  onChange={(e) => setRenameDescription(e.target.value)}
                />
              </div>

              {renameError && (
                <div className="doc-inline-error" role="alert">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{renameError}</span>
                </div>
              )}

              <div className="doc-modal-foot">
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isRenamingFolder}
                >
                  {isRenamingFolder ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowRenameFolderModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 12. Delete Folder Modal ──────────────────────────────────────── */}
      {showDeleteFolderModal && selectedFolder && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "520px", width: "100%" }}
          >
            <div className="doc-modal-head">
              <h3
                className="doc-modal-title"
                style={{ color: "var(--danger)" }}
              >
                Delete Folder
              </h3>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setShowDeleteFolderModal(false)}
              >
                <IconClose size={16} />
              </button>
            </div>

            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--ink)",
                marginBottom: "var(--space-4)",
              }}
            >
              Are you sure you want to delete{" "}
              <strong>&ldquo;{selectedFolder.name}&rdquo;</strong>?
            </p>

            <div
              className="doc-detail-panel"
              style={{ marginBottom: "var(--space-4)" }}
            >
              <div className="doc-detail-key">This folder contains</div>
              <div className="doc-detail-val" style={{ marginTop: "4px" }}>
                {selectedFolder.document_count ?? 0} document
                {(selectedFolder.document_count ?? 0) === 1 ? "" : "s"}
                {(selectedFolder.child_folder_count ?? 0) > 0 && (
                  <>
                    {" · "}
                    {selectedFolder.child_folder_count} sub-folder
                    {(selectedFolder.child_folder_count ?? 0) === 1 ? "" : "s"}
                  </>
                )}
              </div>
            </div>

            {(selectedFolder.child_folder_count ?? 0) > 0 ? (
              <p
                className="doc-form-hint"
                style={{ marginBottom: "var(--space-4)" }}
              >
                Sub-folders must be deleted before this folder can be removed.
              </p>
            ) : (selectedFolder.document_count ?? 0) > 0 ? (
              <p
                className="doc-form-hint"
                style={{ marginBottom: "var(--space-4)" }}
              >
                This folder is not empty. Choose how its documents should be
                handled:
              </p>
            ) : null}

            {deleteFolderError && (
              <div
                className="doc-inline-error"
                role="alert"
                style={{ marginBottom: "var(--space-4)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{deleteFolderError}</span>
              </div>
            )}

            <div className="doc-modal-foot">
              {(selectedFolder.document_count ?? 0) > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isDeletingFolder}
                  onClick={() => handleDeleteFolder("detach")}
                  title="Documents stay in the repository without a folder"
                >
                  Keep Documents
                </button>
              )}
              <button
                type="button"
                className="btn btn-danger"
                style={{
                  flex: 1,
                  backgroundColor: "var(--danger)",
                  color: "#fff",
                }}
                disabled={
                  isDeletingFolder ||
                  (selectedFolder.child_folder_count ?? 0) > 0
                }
                onClick={() => handleDeleteFolder("archive")}
              >
                {isDeletingFolder
                  ? "Deleting..."
                  : (selectedFolder.document_count ?? 0) > 0
                    ? "Delete & Archive Documents"
                    : "Delete Folder"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowDeleteFolderModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
