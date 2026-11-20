'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import { usePrivateImage } from '../../hooks/usePrivateImage';
import { uploadFile, listFiles, triggerFileDownload, FileMetadataRecord } from '../../lib/api/files.api';
import {
  BackendResident,
  onboardResident,
  updateResident,
  updateResidentAppAccess,
} from '../../lib/api/residents.api';
import type { BackendBuilding } from '../../lib/api/buildings.api';
import type { BackendFloor } from '../../lib/api/floors.api';
import type { BackendFlat } from '../../lib/api/flats.api';
import {
  buildOnboardPayload,
  documentRequirements,
  emptyOnboardForm,
  extractTenDigitPhone,
  formatFileSize,
  OnboardResidentForm,
  OnboardStepIndex,
  RELATIONSHIP_OPTIONS,
  RESIDENT_TYPE_OPTIONS,
  ResidentTypeCode,
  residentTypeLabel,
  resolveFlatContext,
  validateStep,
  validateUploadFile,
} from '../../lib/api/onboarding';
import { LoadingAnimation } from '../common/LoadingAnimation';

const PHOTO_KEY = '__profile_photo__';

interface OnboardResidentWizardProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful create or update so the directory can refresh. */
  onSuccess: () => void;
  buildings: BackendBuilding[];
  floors: BackendFloor[];
  flats: BackendFlat[];
  canManageResidents: boolean;
  canVerifyResidents: boolean;
  showToast: (message: string) => void;
  initialFlatId?: string | null;
  initialBuildingId?: string | null;
  residentToEdit?: BackendResident | null;
}

const STEP_LABELS = ['Personal Details', 'Flat & Occupancy', 'Documents', 'Review'];

/** A single drag-and-drop / click upload slot. */
const UploadSlot: React.FC<{
  documentKey: string;
  label: string;
  required?: boolean;
  help?: string;
  hint?: string;
  accept?: string;
  file?: File;
  previewUrl?: string;
  disabled?: boolean;
  onPick: (key: string, file: File) => void;
  onRemove: (key: string) => void;
}> = ({
  documentKey,
  label,
  required,
  help,
  hint,
  accept,
  file,
  previewUrl,
  disabled,
  onPick,
  onRemove,
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onPick(documentKey, list[0]);
  };

  const isPdf =
    file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="onboard-doc">
      <div className="onboard-doc-head">
        <span className="onboard-doc-label">
          {label}
          {required ? ' *' : ' (optional)'}
        </span>
        {help ? <span className="onboard-doc-help">{help}</span> : null}
      </div>

      {file ? (
        <div className="onboard-file-chip">
          {previewUrl && !isPdf ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={file.name} className="onboard-file-thumb" />
          ) : isPdf ? (
            <span
              className="badge badge-error"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 6px',
                borderRadius: '4px',
                background: '#fee2e2',
                color: '#dc2626',
              }}
            >
              PDF
            </span>
          ) : (
            <span className="onboard-file-icon" aria-hidden>
              📄
            </span>
          )}
          <div className="onboard-file-meta">
            <span className="onboard-file-name" title={file.name}>
              {file.name}
            </span>
            <span className="onboard-file-size">{formatFileSize(file.size)}</span>
          </div>
          <div className="onboard-file-actions">
            <label className="btn btn-xs btn-ghost" style={{ cursor: disabled ? 'default' : 'pointer' }}>
              Replace
              <input
                type="file"
                accept={accept}
                hidden
                disabled={disabled}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              style={{ color: '#ef4444' }}
              onClick={() => onRemove(documentKey)}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          className={clsx('onboard-dropzone', dragOver && 'onboard-dropzone--over')}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!disabled) handleFiles(e.dataTransfer.files);
          }}
          style={{ cursor: disabled ? 'default' : 'pointer' }}
        >
          {previewUrl && <img src={previewUrl} alt={label} className="onboard-file-thumb" onError={event => { event.currentTarget.style.display = 'none'; }} />}
          <span className="onboard-dropzone-icon" aria-hidden>
            ⬆
          </span>
          <span className="onboard-dropzone-text">
            Drag &amp; drop or <strong>browse</strong>
          </span>
          <span className="onboard-dropzone-hint">
            {hint || 'PDF, JPG, PNG, WEBP · max 2 MB'}
          </span>
          <input
            type="file"
            accept={accept}
            hidden
            disabled={disabled}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      )}
    </div>
  );
};

export const OnboardResidentWizard: React.FC<OnboardResidentWizardProps> = ({
  open,
  onClose,
  onSuccess,
  buildings,
  floors,
  flats,
  canManageResidents,
  canVerifyResidents,
  showToast,
  initialFlatId,
  initialBuildingId,
  residentToEdit,
}) => {
  const isEdit = Boolean(residentToEdit);
  const [step, setStep] = useState<OnboardStepIndex>(0);
  const [maxStep, setMaxStep] = useState<OnboardStepIndex>(0);
  const [form, setForm] = useState<OnboardResidentForm>(emptyOnboardForm());
  const [files, setFiles] = useState<Record<string, File>>({});
  const [existingDocuments, setExistingDocuments] = useState<FileMetadataRecord[]>([]);
  const [isLoadingExistingDocuments, setIsLoadingExistingDocuments] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [verifyKyc, setVerifyKyc] = useState(true);
  const [grantAppAccess, setGrantAppAccess] = useState(true);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const existingPhoto = usePrivateImage(residentToEdit?.profile_photo_file_id);

  // Reset or populate form every time the wizard is opened.
  useEffect(() => {
    if (open) {
      setStep(0);
      setMaxStep(residentToEdit ? 3 : 0);
      setPhotoRemoved(false);
      if (residentToEdit) {
        const matchedFlat = flats.find((f) => f.id === residentToEdit.flat_id);
        const matchedBuildingId = matchedFlat?.building_id || initialBuildingId || '';
        const loadedMobile = extractTenDigitPhone(residentToEdit.user?.mobileNumber || '');
        setForm({
          fullName: residentToEdit.name || '',
          mobile: loadedMobile,
          email: residentToEdit.email || '',
          dateOfBirth: (residentToEdit as any).date_of_birth || '',
          emergencyName: (residentToEdit as any).emergency_contact_name || '',
          emergencyRelationship: (residentToEdit as any).emergency_contact_relationship || '',
          emergencyPhone: (residentToEdit as any).emergency_contact_phone || '',
          residentType: (residentToEdit.resident_type as ResidentTypeCode) || 'OWNER',
          buildingId: matchedBuildingId,
          flatId: residentToEdit.flat_id || '',
          moveInDate: (residentToEdit as any).move_in_date || '',
          relationshipToPrimary: (residentToEdit as any).relationship_to_primary || '',
          ownerName: (residentToEdit as any).owner_name || '',
          ownerContact: (residentToEdit as any).owner_contact || '',
          isPrimary: Boolean(residentToEdit.is_primary),
          vehicles: Array.isArray((residentToEdit as any).vehicle_details)
            ? (residentToEdit as any).vehicle_details
            : [],
        });
        setVerifyKyc(residentToEdit.kyc_status === 'VERIFIED');
        setGrantAppAccess(Boolean(residentToEdit.app_access_status));
      } else {
        const initForm = emptyOnboardForm();
        if (initialFlatId) {
          initForm.flatId = initialFlatId;
          const matchedFlat = flats.find((f) => f.id === initialFlatId);
          if (matchedFlat?.building_id) {
            initForm.buildingId = matchedFlat.building_id;
          } else if (initialBuildingId) {
            initForm.buildingId = initialBuildingId;
          }
        } else if (initialBuildingId) {
          initForm.buildingId = initialBuildingId;
        }
        setForm(initForm);
        setVerifyKyc(true);
        setGrantAppAccess(true);
      }
      setFiles({});
      setErrors([]);
      setSubmitError(null);
      setProgress(null);
    }
  }, [open, residentToEdit, initialFlatId, initialBuildingId, flats]);

  useEffect(() => {
    if (!open || !residentToEdit) { setExistingDocuments([]); return; }
    setIsLoadingExistingDocuments(true);
    void listFiles({ residentId: residentToEdit.id, limit: 100 }).then((response) => setExistingDocuments(response.data)).catch(() => setExistingDocuments([])).finally(() => setIsLoadingExistingDocuments(false));
  }, [open, residentToEdit]);

  // Object URLs for image previews; revoked when files change / unmount.
  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const [key, file] of Object.entries(files)) {
      if (file.type.startsWith('image/')) urls[key] = URL.createObjectURL(file);
    }
    setPreviews(urls);
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const set = <K extends keyof OnboardResidentForm>(
    key: K,
    value: OnboardResidentForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadedMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const key of Object.keys(files)) map[key] = true;
    return map;
  }, [files]);

  const flatContext = useMemo(
    () => resolveFlatContext(form.flatId, flats, floors, buildings),
    [form.flatId, flats, floors, buildings],
  );

  const buildingFlats = useMemo(
    () => flats.filter((f) => f.building_id === form.buildingId),
    [flats, form.buildingId],
  );

  if (!open) return null;

  const docReqs = documentRequirements(form.residentType);

  const handlePick = (key: string, file: File) => {
    const err = validateUploadFile(file, key);
    if (err) {
      showToast(err);
      return;
    }
    setFiles((prev) => ({ ...prev, [key]: file }));
    if (key === PHOTO_KEY) {
      setPhotoRemoved(false);
    }
  };

  const handleRemove = (key: string) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key === PHOTO_KEY) {
      setPhotoRemoved(true);
    }
  };

  const goToStep = (target: OnboardStepIndex) => {
    setErrors([]);
    setStep(target);
  };

  const next = () => {
    const stepErrors = validateStep(step, form, uploadedMap, isEdit);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors([]);
    const nextStep = Math.min(step + 1, 3) as OnboardStepIndex;
    setMaxStep((m) => (nextStep > m ? nextStep : m));
    setStep(nextStep);
  };

  const back = () => {
    setErrors([]);
    setStep((s) => (s > 0 ? ((s - 1) as OnboardStepIndex) : s));
  };

  const resetAndClose = () => {
    setStep(0);
    setMaxStep(0);
    setForm(emptyOnboardForm());
    setFiles({});
    setErrors([]);
    setSubmitError(null);
    setProgress(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return; // prevent duplicate submissions
    if (!canManageResidents) {
      showToast('Permission denied: resident:manage required.');
      return;
    }

    // Re-validate every step before touching the network.
    const allErrors = [
      ...validateStep(0, form, uploadedMap, isEdit),
      ...validateStep(1, form, uploadedMap, isEdit),
      ...validateStep(2, form, uploadedMap, isEdit),
    ];
    if (allErrors.length > 0) {
      setErrors(allErrors);
      showToast(allErrors[0]);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const scope = form.flatId ? 'FLAT' : 'SOCIETY';
    const failedDocs: string[] = [];

    try {
      // 1. Profile photo (uploaded first so its id can be attached).
      let profilePhotoFileId: string | null | undefined =
        (residentToEdit as any)?.profile_photo_file_id || undefined;
      const photo = files[PHOTO_KEY];
      if (photo) {
        setProgress('Uploading profile photo…');
        const record = await uploadFile(photo, {
          documentScope: scope,
          category: 'Profile Photo',
          purpose: 'PROFILE_PHOTO',
          flatId: form.flatId || undefined,
          residentId: residentToEdit?.id,
          description: `${residentTypeLabel(form.residentType)} profile photo`,
        });
        profilePhotoFileId = record.id;
      } else if (photoRemoved) {
        profilePhotoFileId = null;
      }

      if (residentToEdit) {
        // Edit flow
        setProgress('Updating resident profile…');
        await updateResident(residentToEdit.id, {
          name: form.fullName.trim(),
          phone: form.mobile.trim(),
          email: form.email.trim() || undefined,
          flat_id: form.flatId || undefined,
          resident_type: form.residentType,
          is_primary: form.isPrimary,
          kyc_status: verifyKyc
            ? 'VERIFIED'
            : residentToEdit.kyc_status === 'VERIFIED'
            ? 'PENDING'
            : residentToEdit.kyc_status,
          date_of_birth: form.dateOfBirth || undefined,
          emergency_contact_name: form.emergencyName || undefined,
          emergency_contact_relationship: form.emergencyRelationship || undefined,
          emergency_contact_phone: form.emergencyPhone || undefined,
          move_in_date: form.moveInDate || undefined,
          relationship_to_primary: form.relationshipToPrimary || undefined,
          owner_name: form.ownerName || undefined,
          owner_contact: form.ownerContact || undefined,
          profile_photo_file_id: profilePhotoFileId as any,
          vehicle_details: form.vehicles.length > 0 ? form.vehicles : undefined,
        });

        // Attach any newly uploaded documents
        const pending = docReqs.filter((r) => files[r.id]);
        for (let i = 0; i < pending.length; i += 1) {
          const req = pending[i];
          setProgress(`Uploading document ${i + 1} of ${pending.length}…`);
          try {
            await uploadFile(files[req.id], {
              purpose: 'DOCUMENT',
              documentScope: scope,
              category: req.id,
              flatId: form.flatId || undefined,
              residentId: residentToEdit.id,
              description: `${residentTypeLabel(form.residentType)} • ${req.label}`,
            });
          } catch {
            failedDocs.push(req.label);
          }
        }

        if (grantAppAccess !== residentToEdit.app_access_status) {
          setProgress('Updating app access…');
          try {
            await updateResidentAppAccess(residentToEdit.id, {
              app_access_status: grantAppAccess,
            });
          } catch {
            failedDocs.push('App access update');
          }
        }

        if (failedDocs.length > 0) {
          showToast(
            `${form.fullName.trim()} profile updated, but some documents failed: ${failedDocs.join(
              ', ',
            )}.`,
          );
        } else {
          showToast(`${form.fullName.trim()} profile updated successfully.`);
        }
        onSuccess();
        resetAndClose();
      } else {
        // Create the resident (auth user + profile + RESIDENT role).
        setProgress('Creating resident…');
        const resident = await onboardResident(
          buildOnboardPayload(form, { profilePhotoFileId: profilePhotoFileId || undefined }),
        );

        // Attach remaining documents to the resident.
        const pending = docReqs.filter((r) => files[r.id]);
        for (let i = 0; i < pending.length; i += 1) {
          const req = pending[i];
          setProgress(`Uploading document ${i + 1} of ${pending.length}…`);
          try {
            await uploadFile(files[req.id], {
              purpose: 'DOCUMENT',
              documentScope: scope,
              category: req.id,
              flatId: form.flatId || undefined,
              residentId: resident.id,
              description: `${residentTypeLabel(form.residentType)} • ${req.label}`,
            });
          } catch {
            failedDocs.push(req.label);
          }
        }

        // Verification and app access
        if (verifyKyc) {
          setProgress('Marking KYC verified…');
          try {
            await updateResident(resident.id, { kyc_status: 'VERIFIED' });
          } catch {
            failedDocs.push('KYC verification');
          }
        }
        if (grantAppAccess) {
          setProgress('Granting app access…');
          try {
            await updateResidentAppAccess(resident.id, { app_access_status: true });
          } catch {
            failedDocs.push('App access');
          }
        }

        if (failedDocs.length > 0) {
          showToast(
            `${form.fullName.trim()} onboarded, but some steps failed: ${failedDocs.join(', ')}.`,
          );
        } else {
          showToast(`${form.fullName.trim()} onboarded successfully.`);
        }
        onSuccess();
        resetAndClose();
      }
    } catch (err: unknown) {
      const msg = getUserFriendlyErrorMessage(
        err,
        isEdit ? 'Failed to update resident profile.' : 'Failed to onboard resident.',
      );
      setSubmitError(msg);
      showToast(msg);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit resident profile' : 'Onboard new resident'}
    >
      <div className="modal-dialog onboard-wizard">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Resident Profile' : '+ Onboard New Resident'}</h3>
          <button
            className="modal-close-btn"
            onClick={resetAndClose}
            aria-label="Close"
            disabled={submitting}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Stepper */}
        <ol className="onboard-steps" aria-label="Onboarding progress">
          {STEP_LABELS.map((label, i) => {
            const reachable = i <= maxStep || i < step;
            return (
              <li
                key={label}
                className={clsx(
                  'onboard-step',
                  i === step && 'onboard-step--active',
                  i < step && 'onboard-step--done',
                )}
              >
                <button
                  type="button"
                  className="onboard-step-btn"
                  disabled={!reachable || submitting}
                  onClick={() => reachable && goToStep(i as OnboardStepIndex)}
                >
                  <span className="onboard-step-num">{i + 1}</span>
                  <span className="onboard-step-label">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="modal-body onboard-body">
          {/* ── Step 1: Personal details ─────────────────────────────── */}
          {step === 0 && (
            <div className="onboard-panel">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Riya Patel"
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number (10 Digits) *</label>
                  <input
                    type="tel"
                    className={clsx(
                      'form-control',
                      form.mobile && form.mobile.length !== 10 && 'form-control-error',
                    )}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '');
                      set('mobile', digits.slice(0, 10));
                    }}
                  />
                  {form.mobile && form.mobile.length !== 10 ? (
                    <small className="onboard-error" style={{ color: '#ef4444', display: 'block', marginTop: 4 }}>
                      Phone number must be exactly 10 digits (currently {form.mobile.length}).
                    </small>
                  ) : (
                    <small className="onboard-hint">
                    </small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. riya@example.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.dateOfBirth}
                    onChange={(e) => set('dateOfBirth', e.target.value)}
                  />
                </div>
              </div>

              <fieldset className="onboard-fieldset">
                <legend>Emergency Contact</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.emergencyName}
                      onChange={(e) => set('emergencyName', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relationship</label>
                    <select
                      className="form-select"
                      value={form.emergencyRelationship}
                      onChange={(e) => set('emergencyRelationship', e.target.value)}
                    >
                      <option value="">— Select relationship —</option>
                      {RELATIONSHIP_OPTIONS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      value={form.emergencyPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, '');
                        set('emergencyPhone', digits.slice(0, 10));
                      }}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="onboard-fieldset">
                <legend>Profile Photo</legend>
                <UploadSlot
                  documentKey={PHOTO_KEY}
                  label="Resident Photo"
                  help="A clear face photo (JPG, JPEG, PNG, WEBP · max 2 MB)."
                  hint="JPG, JPEG, PNG, WEBP · max 2 MB"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  file={files[PHOTO_KEY]}
                  previewUrl={
                    previews[PHOTO_KEY] ||
                    (!photoRemoved && (residentToEdit as any)?.profile_photo_file_id
                      ? existingPhoto
                      : undefined)
                  }
                  disabled={submitting}
                  onPick={handlePick}
                  onRemove={handleRemove}
                />
              </fieldset>
            </div>
          )}

          {/* ── Step 2: Flat & occupancy ─────────────────────────────── */}
          {step === 1 && (
            <div className="onboard-panel">
              <div className="form-group">
                <label className="form-label">Resident Type *</label>
                <div className="onboard-radio-row">
                  {RESIDENT_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={clsx(
                        'onboard-radio',
                        form.residentType === opt.value && 'onboard-radio--active',
                      )}
                    >
                      <input
                        type="radio"
                        name="residentType"
                        value={opt.value}
                        checked={form.residentType === opt.value}
                        onChange={() => set('residentType', opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Building *</label>
                  <select
                    className="form-select"
                    value={form.buildingId}
                    onChange={(e) => {
                      set('buildingId', e.target.value);
                      set('flatId', '');
                    }}
                  >
                    <option value="">— Select building —</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.code ? ` (${b.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Flat *</label>
                  <select
                    className="form-select"
                    value={form.flatId}
                    onChange={(e) => set('flatId', e.target.value)}
                    disabled={!form.buildingId}
                  >
                    <option value="">
                      {form.buildingId ? '— Select flat —' : '— Select a building first —'}
                    </option>
                    {buildingFlats.map((f) => (
                      <option key={f.id} value={f.id}>
                        Flat {f.flat_identifier}
                        {f.flat_type ? ` · ${f.flat_type}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.flatId && (
                <div className="onboard-flat-summary">
                  <span className="onboard-flat-summary-label">Selected flat</span>
                  <span>
                    {flatContext.buildingName || 'Building'}
                    {flatContext.flatIdentifier ? ` · Flat ${flatContext.flatIdentifier}` : ''}
                    {flatContext.floorNumber !== null
                      ? ` · Floor ${flatContext.floorNumber}`
                      : ''}
                    {flatContext.flatType ? ` · ${flatContext.flatType}` : ''}
                  </span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Move-in Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.moveInDate}
                    onChange={(e) => set('moveInDate', e.target.value)}
                  />
                </div>
                {form.residentType === 'FAMILY' && (
                  <div className="form-group">
                    <label className="form-label">Relationship to Owner / Primary Resident *</label>
                    <select
                      className="form-select"
                      value={form.relationshipToPrimary}
                      onChange={(e) => set('relationshipToPrimary', e.target.value)}
                    >
                      <option value="">— Select relationship —</option>
                      {RELATIONSHIP_OPTIONS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {form.residentType === 'TENANT' && (
                <fieldset className="onboard-fieldset">
                  <legend>Owner Details</legend>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Owner Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.ownerName}
                        onChange={(e) => set('ownerName', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Owner Contact (10 Digits)</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        value={form.ownerContact}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^0-9]/g, '');
                          set('ownerContact', digits.slice(0, 10));
                        }}
                      />
                    </div>
                  </div>
                </fieldset>
              )}

              <fieldset className="onboard-fieldset">
                <legend>Vehicles (optional)</legend>
                {form.vehicles.map((v, idx) => (
                  <div className="form-row onboard-vehicle-row" key={idx} style={{ alignItems: 'flex-start' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Registration Number *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. MH-02-CB-4491"
                        value={v.registration ?? ''}
                        onChange={(e) => {
                          const next = [...form.vehicles];
                          next[idx] = { ...next[idx], registration: e.target.value.toUpperCase() };
                          set('vehicles', next);
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Vehicle Type *</label>
                      <select
                        className="form-select"
                        value={v.type ?? '4W'}
                        onChange={(e) => {
                          const next = [...form.vehicles];
                          next[idx] = { ...next[idx], type: e.target.value };
                          set('vehicles', next);
                        }}
                      >
                        <option value="4W">Four Wheeler (Car/SUV)</option>
                        <option value="2W">Two Wheeler (Bike/Scooter)</option>
                        <option value="EV">Electric Vehicle (EV)</option>
                        <option value="OTHER">Other / Commercial</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Make &amp; Model</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Honda City"
                        value={v.make ?? ''}
                        onChange={(e) => {
                          const next = [...form.vehicles];
                          next[idx] = { ...next[idx], make: e.target.value };
                          set('vehicles', next);
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Color</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Silver"
                        value={v.color ?? ''}
                        onChange={(e) => {
                          const next = [...form.vehicles];
                          next[idx] = { ...next[idx], color: e.target.value };
                          set('vehicles', next);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      style={{ color: '#ef4444', marginTop: '28px' }}
                      title="Remove vehicle"
                      onClick={() =>
                        set(
                          'vehicles',
                          form.vehicles.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() =>
                    set('vehicles', [
                      ...form.vehicles,
                      { type: '4W', make: '', model: '', registration: '', color: '' },
                    ])
                  }
                >
                  + Add vehicle
                </button>
              </fieldset>

              <div className="form-group">
                <label className="onboard-checkbox">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(e) => set('isPrimary', e.target.checked)}
                  />
                  Mark as primary contact for this flat
                </label>
              </div>
            </div>
          )}

          {/* ── Step 3: Documents ────────────────────────────────────── */}
          {step === 2 && (
            <div className="onboard-panel">
              <p className="onboard-note">
                {isEdit
                  ? 'Attach any new or replacement documents for this resident. Documents are optional when editing.'
                  : `Upload the documents that apply for a ${residentTypeLabel(form.residentType)}. Identity proof is required; the rest are required where noted. A full unmasked Aadhaar copy is never required — mask it or use another government ID.`}
              </p>
              {isEdit && <section className="onboard-existing-documents"><h4>Uploaded documents</h4>{isLoadingExistingDocuments ? <p>Loading documents…</p> : existingDocuments.length > 0 ? <ul>{existingDocuments.map((document) => <li key={document.id}><button type="button" className="btn btn-sm btn-ghost" onClick={() => { void triggerFileDownload(document.id, document.original_filename).catch(() => showToast('Download failed')); }}>{document.original_filename}</button><span>{document.category || 'General'}</span></li>)}</ul> : <p>No documents uploaded for this resident.</p>}</section>}
              <div className="onboard-docs">
                {docReqs.map((req) => {
                  const isOwnership = req.id === 'Ownership Proof';
                  const hint = isOwnership
                    ? 'JPG, JPEG, PNG, WEBP, PDF, TXT · max 2 MB'
                    : 'JPG, JPEG, PNG, WEBP, PDF · max 2 MB';
                  const accept = isOwnership
                    ? '.jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain'
                    : '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';

                  return (
                    <UploadSlot
                      key={req.id}
                      documentKey={req.id}
                      label={req.label}
                      required={isEdit ? false : req.required}
                      help={req.help}
                      hint={hint}
                      accept={accept}
                      file={files[req.id]}
                      previewUrl={previews[req.id]}
                      disabled={submitting}
                      onPick={handlePick}
                      onRemove={handleRemove}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Review ───────────────────────────────────────── */}
          {step === 3 && (
            <div className="onboard-panel">
              <div className="onboard-review">
                <div className="onboard-review-block">
                  <h4>Personal</h4>
                  <dl>
                    <dt>Name</dt>
                    <dd>{form.fullName || '—'}</dd>
                    <dt>Mobile</dt>
                    <dd>{form.mobile || '—'}</dd>
                    <dt>Email</dt>
                    <dd>{form.email || '—'}</dd>
                    <dt>Date of birth</dt>
                    <dd>{form.dateOfBirth || '—'}</dd>
                    <dt>Emergency contact</dt>
                    <dd>
                      {form.emergencyName
                        ? `${form.emergencyName}${
                            form.emergencyRelationship ? ` (${form.emergencyRelationship})` : ''
                          }${form.emergencyPhone ? ` · ${form.emergencyPhone}` : ''}`
                        : '—'}
                    </dd>
                  </dl>
                </div>

                <div className="onboard-review-block">
                  <h4>Flat &amp; Occupancy</h4>
                  <dl>
                    <dt>Resident type</dt>
                    <dd>{residentTypeLabel(form.residentType)}</dd>
                    <dt>Flat</dt>
                    <dd>
                      {flatContext.buildingName || '—'}
                      {flatContext.flatIdentifier ? ` · Flat ${flatContext.flatIdentifier}` : ''}
                      {flatContext.floorNumber !== null ? ` · Floor ${flatContext.floorNumber}` : ''}
                    </dd>
                    <dt>Unit type</dt>
                    <dd>{flatContext.flatType || '—'}</dd>
                    <dt>Move-in date</dt>
                    <dd>{form.moveInDate || '—'}</dd>
                    {form.residentType === 'FAMILY' && (
                      <>
                        <dt>Relationship</dt>
                        <dd>{form.relationshipToPrimary || '—'}</dd>
                      </>
                    )}
                    {form.residentType === 'TENANT' && (
                      <>
                        <dt>Owner</dt>
                        <dd>
                          {form.ownerName || '—'}
                          {form.ownerContact ? ` · ${form.ownerContact}` : ''}
                        </dd>
                      </>
                    )}
                    <dt>Primary contact</dt>
                    <dd>{form.isPrimary ? 'Yes' : 'No'}</dd>
                    <dt>Vehicles</dt>
                    <dd>
                      {form.vehicles.filter((v) => v.registration || v.make || v.model).length ||
                        '—'}
                    </dd>
                  </dl>
                </div>

                <div className="onboard-review-block">
                  <h4>Documents</h4>
                  <ul className="onboard-review-docs">
                    {files[PHOTO_KEY] && <li>Profile photo — {files[PHOTO_KEY].name}</li>}
                    {docReqs
                      .filter((r) => files[r.id])
                      .map((r) => (
                        <li key={r.id}>
                          {r.label} — {files[r.id].name}
                        </li>
                      ))}
                    {!files[PHOTO_KEY] &&
                      docReqs.every((r) => !files[r.id]) && (
                        <li className="onboard-muted">No documents attached.</li>
                      )}
                  </ul>
                </div>
              </div>

              <fieldset className="onboard-fieldset">
                <legend>Additional (optional)</legend>
                <label className="onboard-checkbox">
                  <input
                    type="checkbox"
                    checked={verifyKyc}
                    disabled={!canVerifyResidents}
                    onChange={(e) => setVerifyKyc(e.target.checked)}
                  />
                  Mark KYC / documents as verified now
                  {!canVerifyResidents ? ' (requires resident:manage)' : ''}
                </label>
                <label className="onboard-checkbox">
                  <input
                    type="checkbox"
                    checked={grantAppAccess}
                    onChange={(e) => setGrantAppAccess(e.target.checked)}
                  />
                  Grant resident app access now
                </label>
                <p className="onboard-hint" style={{ marginTop: 4 }}>
                  Account activation stays separate from document verification and uses the
                  existing sign-in / invitation flow.
                </p>
              </fieldset>

              {submitError ? (
                <div className="onboard-error" role="alert">
                  {submitError}
                </div>
              ) : null}
            </div>
          )}

          {errors.length > 0 && (
            <ul className="onboard-errors" role="alert">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          {submitting ? (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(248, 250, 252, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-live="polite"
            >
              <LoadingAnimation
                message={progress || (isEdit ? 'Updating resident record…' : 'Onboarding resident…')}
                size={110}
                centered={false}
              />
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={step === 0 ? resetAndClose : back}
            disabled={submitting}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={next} disabled={submitting}>
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={submitting || !canManageResidents}
            >
              {submitting
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                ? 'Save Changes'
                : 'Create Resident'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
