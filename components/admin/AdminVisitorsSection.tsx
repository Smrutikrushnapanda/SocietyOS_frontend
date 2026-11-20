'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useVisitorStore, useToastStore, useAuthStore } from '../../store';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import { getFlats, BackendFlat } from '../../lib/api/flats.api';
import { getResidents, BackendResident } from '../../lib/api/residents.api';
import { createVisitor } from '../../lib/api/visitors.api';

export const AdminVisitorsSection: React.FC = () => {
  const {
    visitors,
    preApprovedPasses,
    approveVisitor,
    checkInVisitor,
    checkOutVisitor,
    rejectVisitor,
    logWalkInVisitor,
    createPass,
    revokePass,
    loadGuardData,
    isLoading,
    error,
    hasLoadedVisitors,
  } = useVisitorStore();
  const organizationId = useAuthStore((state) => state.organizationId);
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'policies' | 'delivery' | 'fastgate'>('pipeline');
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  // Dynamic Flats and Residents metadata
  const [flats, setFlats] = useState<BackendFlat[]>([]);
  const [residents, setResidents] = useState<BackendResident[]>([]);

  // Default visitor policies
  const defaultPolicies = [
    {
      id: 'pol_1',
      type: 'Personal Guest',
      autoApprove: 'Resident Approval Required',
      maxDuration: '4-12 hr',
      photoReq: 'Optional',
      idReq: 'No',
      vehicleReq: 'Mandatory if Vehicle',
      allowedGates: 'All Gates',
      status: 'Active',
    },
    {
      id: 'pol_2',
      type: 'Delivery / Courier',
      autoApprove: 'Pre-Approved Entry',
      maxDuration: '0-4 hr',
      photoReq: 'Mandatory',
      idReq: 'No',
      vehicleReq: 'Mandatory if Vehicle',
      allowedGates: 'Service Gate / Main Gate',
      status: 'Active',
    },
    {
      id: 'pol_3',
      type: 'Cab / Ride Service',
      autoApprove: 'Pre-Approved Entry',
      maxDuration: '0-4 hr',
      photoReq: 'No',
      idReq: 'No',
      vehicleReq: 'Mandatory if Vehicle',
      allowedGates: 'All Gates',
      status: 'Active',
    },
    {
      id: 'pol_4',
      type: 'Home Repair / Contractor',
      autoApprove: 'Resident Approval Required',
      maxDuration: '4-12 hr',
      photoReq: 'Mandatory',
      idReq: 'Mandatory',
      vehicleReq: 'Optional',
      allowedGates: 'Service Gate',
      status: 'Active',
    },
  ];

  // Policies State (Admin Configuration) — dynamic
  const [policies, setPolicies] = useState(defaultPolicies);
  const [editingPolicy, setEditingPolicy] = useState<(typeof defaultPolicies)[0] | null>(null);

  // New/Edit Policy Form State
  const [policyCategoryName, setPolicyCategoryName] = useState('');
  const [policyAutoApprove, setPolicyAutoApprove] = useState('Resident Approval Required');
  const [policyMaxDuration, setPolicyMaxDuration] = useState('0-4 hr');
  const [policyPhotoReq, setPolicyPhotoReq] = useState('Optional');
  const [policyIdReq, setPolicyIdReq] = useState('No');
  const [policyVehicleReq, setPolicyVehicleReq] = useState('Mandatory if Vehicle');
  const [policyAllowedGates, setPolicyAllowedGates] = useState('All Gates');

  // Delivery Partners State (Vendor Rules) — dynamic
  const defaultDeliveryPartners = [
    {
      id: 'dp-1',
      name: 'Amazon / ATS Logistics',
      type: 'E-Commerce Parcel',
      allowedGate: 'All Gates',
      hours: '08:00 AM - 09:00 PM',
      verification: 'Auto PIN OTP',
      push: 'Enabled',
      status: 'Active',
    },
    {
      id: 'dp-2',
      name: 'Swiggy / Instamart',
      type: 'Food & Quick Commerce',
      allowedGate: 'Main Gate Terminal',
      hours: '07:00 AM - 11:30 PM',
      verification: 'Resident Call Pre-Approved',
      push: 'Enabled',
      status: 'Active',
    },
    {
      id: 'dp-3',
      name: 'Zomato / Blinkit',
      type: 'Food & Quick Commerce',
      allowedGate: 'Main Gate Terminal',
      hours: '07:00 AM - 11:30 PM',
      verification: 'Resident Call Pre-Approved',
      push: 'Enabled',
      status: 'Active',
    },
    {
      id: 'dp-4',
      name: 'BlueDart / DHL Express',
      type: 'Courier & Documents',
      allowedGate: 'All Gates',
      hours: '09:00 AM - 07:00 PM',
      verification: 'ID + Waybill Verification',
      push: 'Disabled',
      status: 'Active',
    },
  ];

  const [deliveryPartners, setDeliveryPartners] = useState(defaultDeliveryPartners);
  const [editingDeliveryPartner, setEditingDeliveryPartner] = useState<(typeof defaultDeliveryPartners)[0] | null>(null);

  // Delivery Partner Form States
  const [dpName, setDpName] = useState('');
  const [dpType, setDpType] = useState('E-Commerce Parcel');
  const [dpCustomType, setDpCustomType] = useState('');
  const [dpAllowedGate, setDpAllowedGate] = useState('All Gates');
  const [dpOperatingHours, setDpOperatingHours] = useState('08:00 AM - 09:00 PM');
  const [dpVerification, setDpVerification] = useState('Auto PIN OTP');
  const [dpPushNotification, setDpPushNotification] = useState('Enabled');

  // New Guest Form State
  const [guestName, setGuestName] = useState('');
  const [guestFlat, setGuestFlat] = useState('');
  const [guestResidentId, setGuestResidentId] = useState('');
  const [guestPurpose, setGuestPurpose] = useState('Guest');
  const [guestPhone, setGuestPhone] = useState('');

  // FastGate Pass Form State
  const [passGuestName, setPassGuestName] = useState('');
  const [passGuestPhone, setPassGuestPhone] = useState('');
  const [passValidDays, setPassValidDays] = useState('7');
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic Gate Terminals list for selection
  const [availableGates, setAvailableGates] = useState<string[]>(['All Gates', 'Main Gate Terminal', 'Rear Exit Terminal', 'Service Gate Terminal']);

  const loadSupportingData = useCallback(async () => {
    if (!organizationId) return;
    try {
      const [flts, resList] = await Promise.all([
        getFlats().catch(() => []),
        getResidents().catch(() => []),
      ]);
      const safeFlts = Array.isArray(flts) ? flts : [];
      const safeRes = Array.isArray(resList) ? resList : [];
      setFlats(safeFlts);
      setResidents(safeRes);
      if (safeFlts.length > 0) {
        setGuestFlat(prev => prev || safeFlts[0].flat_identifier);
      }
      if (safeRes.length > 0) {
        setGuestResidentId(prev => prev || safeRes[0].id);
      }
    } catch {}
  }, [organizationId]);

  const loadDynamicGates = useCallback(() => {
    if (typeof window === 'undefined' || !organizationId) return;
    try {
      const storedGates = localStorage.getItem(`societyos_gates_${organizationId}`);
      if (storedGates) {
        const parsed = JSON.parse(storedGates);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed
            .filter((g: { name?: string; status?: string }) => g.status !== 'Inactive')
            .map((g: { name?: string }) => g.name?.trim())
            .filter(Boolean) as string[];
          if (names.length > 0) {
            setAvailableGates(['All Gates', ...Array.from(new Set(names))]);
            return;
          }
        }
      }
    } catch {}
    setAvailableGates(['All Gates', 'Main Gate Terminal', 'Rear Exit Terminal', 'Service Gate Terminal']);
  }, [organizationId]);

  const persistPolicies = (items: typeof defaultPolicies) => {
    setPolicies(items);
    if (typeof window !== 'undefined' && organizationId) {
      try {
        localStorage.setItem(`societyos_visitor_policies_${organizationId}`, JSON.stringify(items));
      } catch {}
    }
  };

  const persistDeliveryPartners = (items: typeof defaultDeliveryPartners) => {
    setDeliveryPartners(items);
    if (typeof window !== 'undefined' && organizationId) {
      try {
        localStorage.setItem(`societyos_delivery_partners_${organizationId}`, JSON.stringify(items));
      } catch {}
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && organizationId) {
      try {
        const stored = localStorage.getItem(`societyos_visitor_policies_${organizationId}`);
        if (stored) {
          setPolicies(JSON.parse(stored));
        } else {
          setPolicies(defaultPolicies);
          localStorage.setItem(`societyos_visitor_policies_${organizationId}`, JSON.stringify(defaultPolicies));
        }
      } catch {
        setPolicies(defaultPolicies);
      }

      try {
        const storedDp = localStorage.getItem(`societyos_delivery_partners_${organizationId}`);
        if (storedDp) {
          setDeliveryPartners(JSON.parse(storedDp));
        } else {
          setDeliveryPartners(defaultDeliveryPartners);
          localStorage.setItem(`societyos_delivery_partners_${organizationId}`, JSON.stringify(defaultDeliveryPartners));
        }
      } catch {
        setDeliveryPartners(defaultDeliveryPartners);
      }

      loadDynamicGates();
    }
  }, [organizationId, loadDynamicGates]);

  useEffect(() => {
    if (organizationId) {
      loadGuardData().catch(() => {});
      loadSupportingData().catch(() => {});
    }
  }, [organizationId, loadGuardData, loadSupportingData]);

  const handleLogGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      await logWalkInVisitor({
        name: guestName.trim(),
        phone: guestPhone.trim() || '0000000000',
        purpose: guestPurpose,
        flat: guestFlat,
        hostResidentId: guestResidentId || undefined,
      });

      showToast(`Guest ${guestName} entry registered with backend.`);
      setGuestName('');
      setGuestPhone('');
      setShowLogModal(false);
    } catch (err: unknown) {
      const msg = getUserFriendlyErrorMessage(err);
      setFormError(msg);
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passGuestName.trim() || isSubmittingPass || !organizationId) return;

    setIsSubmittingPass(true);
    try {
      // 1. Create visitor identity
      const visitor = await createVisitor({
        organization_id: organizationId,
        name: passGuestName.trim(),
        mobile: passGuestPhone.trim() || '0000000000',
        active: true,
      });

      // 2. Create visitor pass
      const days = parseInt(passValidDays, 10) || 7;
      const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await createPass({
        visitorId: visitor.id,
        validityStart: new Date().toISOString(),
        validityEnd: validUntil,
        issuer: 'Society Admin Console',
      });

      showToast(`Digital Pass issued to ${passGuestName}.`);
      setShowPassModal(false);
      setPassGuestName('');
      setPassGuestPhone('');
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to issue digital pass.'));
    } finally {
      setIsSubmittingPass(false);
    }
  };

  const handleOpenCreatePolicy = () => {
    loadDynamicGates();
    setEditingPolicy(null);
    setPolicyCategoryName('');
    setPolicyMaxDuration('0-4 hr');
    setPolicyAutoApprove('Resident Approval Required');
    setPolicyPhotoReq('Optional');
    setPolicyIdReq('No');
    setPolicyVehicleReq('Mandatory if Vehicle');
    setPolicyAllowedGates('All Gates');
    setShowPolicyModal(true);
  };

  const handleOpenEditPolicy = (policy: (typeof defaultPolicies)[0]) => {
    loadDynamicGates();
    setEditingPolicy(policy);
    setPolicyCategoryName(policy.type);
    setPolicyMaxDuration(policy.maxDuration || '0-4 hr');
    setPolicyAutoApprove(policy.autoApprove || 'Resident Approval Required');
    setPolicyPhotoReq(policy.photoReq || 'Optional');
    setPolicyIdReq(policy.idReq || 'No');
    setPolicyVehicleReq(policy.vehicleReq || 'Mandatory if Vehicle');
    setPolicyAllowedGates(policy.allowedGates || 'All Gates');
    setShowPolicyModal(true);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyCategoryName.trim()) {
      showToast('Please enter a category name.');
      return;
    }

    if (editingPolicy) {
      const updated = policies.map((item) =>
        item.id === editingPolicy.id
          ? {
              ...item,
              type: policyCategoryName.trim(),
              autoApprove: policyAutoApprove,
              maxDuration: policyMaxDuration,
              photoReq: policyPhotoReq,
              idReq: policyIdReq,
              vehicleReq: policyVehicleReq,
              allowedGates: policyAllowedGates.trim() || 'All Gates',
            }
          : item
      );
      persistPolicies(updated);
      showToast(`Visitor category policy "${policyCategoryName.trim()}" updated successfully.`);
    } else {
      const newPolicy = {
        id: `pol_${Date.now()}`,
        type: policyCategoryName.trim(),
        autoApprove: policyAutoApprove,
        maxDuration: policyMaxDuration,
        photoReq: policyPhotoReq,
        idReq: policyIdReq,
        vehicleReq: policyVehicleReq,
        allowedGates: policyAllowedGates.trim() || 'All Gates',
        status: 'Active',
      };
      const updated = [newPolicy, ...policies];
      persistPolicies(updated);
      showToast(`Visitor category policy "${newPolicy.type}" added successfully.`);
    }

    setShowPolicyModal(false);
    setEditingPolicy(null);
    setPolicyCategoryName('');
    setPolicyMaxDuration('0-4 hr');
    setPolicyAutoApprove('Resident Approval Required');
    setPolicyPhotoReq('Optional');
    setPolicyIdReq('No');
    setPolicyVehicleReq('Mandatory if Vehicle');
    setPolicyAllowedGates('All Gates');
  };

  const handleOpenCreateDeliveryPartner = () => {
    loadDynamicGates();
    setEditingDeliveryPartner(null);
    setDpName('');
    setDpType('E-Commerce Parcel');
    setDpCustomType('');
    setDpAllowedGate('All Gates');
    setDpOperatingHours('08:00 AM - 09:00 PM');
    setDpVerification('Auto PIN OTP');
    setDpPushNotification('Enabled');
    setShowDeliveryModal(true);
  };

  const handleOpenEditDeliveryPartner = (partner: (typeof defaultDeliveryPartners)[0]) => {
    loadDynamicGates();
    setEditingDeliveryPartner(partner);
    setDpName(partner.name);
    const standardTypes = ['E-Commerce Parcel', 'Food & Quick Commerce', 'Courier & Documents', 'Grocery Delivery', 'Medicine / Pharmacy'];
    if (standardTypes.includes(partner.type)) {
      setDpType(partner.type);
      setDpCustomType('');
    } else {
      setDpType('Other');
      setDpCustomType(partner.type);
    }
    setDpAllowedGate(partner.allowedGate || 'All Gates');
    setDpOperatingHours(partner.hours || '08:00 AM - 09:00 PM');
    setDpVerification(partner.verification || 'Auto PIN OTP');
    setDpPushNotification(partner.push || 'Enabled');
    setShowDeliveryModal(true);
  };

  const handleSaveDeliveryPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dpName.trim()) {
      showToast('Please enter company/partner name.');
      return;
    }

    const resolvedType = dpType === 'Other' ? (dpCustomType.trim() || 'Custom Delivery') : dpType;

    if (editingDeliveryPartner) {
      const updated = deliveryPartners.map((item) =>
        item.id === editingDeliveryPartner.id
          ? {
              ...item,
              name: dpName.trim(),
              type: resolvedType,
              allowedGate: dpAllowedGate,
              hours: dpOperatingHours,
              verification: dpVerification,
              push: dpPushNotification,
            }
          : item
      );
      persistDeliveryPartners(updated);
      showToast(`Delivery partner "${dpName.trim()}" updated successfully.`);
    } else {
      const newPartner = {
        id: `dp_${Date.now()}`,
        name: dpName.trim(),
        type: resolvedType,
        allowedGate: dpAllowedGate,
        hours: dpOperatingHours,
        verification: dpVerification,
        push: dpPushNotification,
        status: 'Active',
      };
      const updated = [newPartner, ...deliveryPartners];
      persistDeliveryPartners(updated);
      showToast(`Delivery partner "${newPartner.name}" added successfully.`);
    }

    setShowDeliveryModal(false);
    setEditingDeliveryPartner(null);
    setDpName('');
    setDpType('E-Commerce Parcel');
    setDpCustomType('');
    setDpAllowedGate('All Gates');
    setDpOperatingHours('08:00 AM - 09:00 PM');
    setDpVerification('Auto PIN OTP');
    setDpPushNotification('Enabled');
  };

  const requestedVisitors = visitors.filter((v) => v.status === 'requested');
  const approvedVisitors = visitors.filter((v) => v.status === 'approved');
  const checkedInVisitors = visitors.filter((v) => v.status === 'checked-in');
  const checkedOutVisitors = visitors.filter((v) => v.status === 'checked-out');

  return (
    <div className="admin-section active" id="section-visitors">
      <div className="section-header">
        <div>
          <h2>Security, Access Control & Visitors</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Live gate pipeline, category policies, delivery partner restrictions, and FastGate RFID passes.
          </p>
        </div>
        <div className="section-actions" id="visitors-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPolicyModal(true)}>
            + Add Policy
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowLogModal(true)}>
            + Log Guest Entry
          </button>
        </div>
      </div>

      {/* Subnav Bar */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          Live Visitor Pipeline
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          Visitor Policies
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivery')}
        >
          Delivery Policies
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'fastgate' ? 'active' : ''}`}
          onClick={() => setActiveTab('fastgate')}
        >
          FastGate Pass Management
        </button>
      </div>

      {/* Loading & Error Indicators */}
      {isLoading && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.875rem' }}>
          Loading live security and visitor data...
        </div>
      )}

      {error && !isLoading && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button className="btn btn-xs btn-ghost" onClick={() => loadGuardData()}>
            Retry Connection
          </button>
        </div>
      )}

      {/* TAB 1: Live Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="config-panel active" id="vistab-pipeline">
          <div className="pipeline-board">
            {/* Column 1: Requested */}
            <div className="pipeline-column">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--saffron)' }}></span>
                  Requested
                </div>
                <span className="badge badge-warning" id="count-requested">
                  {requestedVisitors.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requestedVisitors.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    {hasLoadedVisitors ? 'No pending requests' : 'Not loaded yet'}
                  </div>
                ) : (
                  requestedVisitors.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.875rem' }}>{v.name}</strong>
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                          {v.flat !== '—' ? `Flat ${v.flat}` : 'Unit —'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
                        {v.purpose} • {v.requestedAt || 'Just now'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-xs btn-primary"
                          style={{ flex: 1 }}
                          onClick={async () => {
                            await approveVisitor(v.id);
                            showToast(`Approved ${v.name}`);
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-xs btn-danger"
                          onClick={async () => {
                            await rejectVisitor(v.id);
                            showToast(`Denied entry to ${v.name}`);
                          }}
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Approved */}
            <div className="pipeline-column">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--pine)' }}></span>
                  Approved by Resident
                </div>
                <span className="badge badge-pine" id="count-approved">
                  {approvedVisitors.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {approvedVisitors.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    {hasLoadedVisitors ? 'No approved guests waiting' : 'Not loaded yet'}
                  </div>
                ) : (
                  approvedVisitors.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.875rem' }}>{v.name}</strong>
                        <span className="badge badge-pine" style={{ fontSize: '0.65rem' }}>
                          {v.flat !== '—' ? `Flat ${v.flat}` : 'Unit —'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
                        {v.passcode ? (
                          <>Passcode: <strong>{v.passcode}</strong> • </>
                        ) : null}
                        {v.purpose}
                      </div>
                      <button
                        className="btn btn-xs btn-primary"
                        style={{ width: '100%' }}
                        onClick={async () => {
                          await checkInVisitor(v.id);
                          showToast(`${v.name} checked in at Gate 1`);
                        }}
                      >
                        Check In at Gate
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Checked In */}
            <div className="pipeline-column">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--success)' }}></span>
                  Checked-in (Inside)
                </div>
                <span className="badge badge-success" id="count-checkedin">
                  {checkedInVisitors.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {checkedInVisitors.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    {hasLoadedVisitors ? 'No visitors currently inside' : 'Not loaded yet'}
                  </div>
                ) : (
                  checkedInVisitors.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.875rem' }}>{v.name}</strong>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                          Inside • {v.flat !== '—' ? `Flat ${v.flat}` : 'Unit —'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
                        Entry: {v.entryTime || 'Today'} • {v.purpose}
                      </div>
                      <button
                        className="btn btn-xs btn-ghost"
                        style={{ width: '100%', borderColor: 'var(--border-subtle)' }}
                        onClick={async () => {
                          await checkOutVisitor(v.id);
                          showToast(`${v.name} checked out.`);
                        }}
                      >
                        Record Exit & Check Out
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 4: Checked Out */}
            <div className="pipeline-column">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--neutral)' }}></span>
                  Checked-out (Exited)
                </div>
                <span className="badge badge-neutral" id="count-checkedout">
                  {checkedOutVisitors.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {checkedOutVisitors.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    No past checkout logs today
                  </div>
                ) : (
                  checkedOutVisitors.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: '#fafaf9',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        opacity: 0.85
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.8125rem', color: 'var(--neutral-dark)' }}>{v.name}</strong>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                          {v.flat !== '—' ? `Flat ${v.flat}` : 'Unit —'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                        Exited at {v.exitTime || 'Earlier'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Visitor Policies */}
      {activeTab === 'policies' && (
        <div className="config-panel active" id="vistab-policies">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Visitor Categories & Automated Verification Policies</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Configure auto-approval rules, max duration limits, and mandatory check-in credentials.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreatePolicy}>
              + Add Visitor Category
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Visitor Type</th>
                  <th>Auto Approval</th>
                  <th>Max Duration</th>
                  <th>Photo Req.</th>
                  <th>ID Req.</th>
                  <th>Vehicle Req.</th>
                  <th>Allowed Gates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.type}</strong>
                    </td>
                    <td>{p.autoApprove}</td>
                    <td>
                      <span className={`badge ${p.maxDuration === 'Skip' ? 'badge-neutral' : 'badge-pine'}`}>
                        {p.maxDuration}
                      </span>
                    </td>
                    <td>{p.photoReq}</td>
                    <td>{p.idReq}</td>
                    <td>{p.vehicleReq}</td>
                    <td>{p.allowedGates}</td>
                    <td>
                      <span className={`badge ${p.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-xs btn-ghost"
                          style={{ color: 'var(--brand, #10b981)', fontWeight: 600 }}
                          onClick={() => handleOpenEditPolicy(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            const updated = policies.map((item) =>
                              item.id === p.id
                                ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' }
                                : item
                            );
                            persistPolicies(updated);
                            showToast(`Policy for ${p.type} toggled to ${p.status === 'Active' ? 'Inactive' : 'Active'}.`);
                          }}
                        >
                          {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          style={{ color: '#ef4444' }}
                          onClick={() => {
                            if (!confirm(`Delete visitor category policy "${p.type}"?`)) return;
                            const updated = policies.filter((item) => item.id !== p.id);
                            persistPolicies(updated);
                            showToast(`Policy "${p.type}" deleted.`);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Delivery Policies */}
      {activeTab === 'delivery' && (
        <div className="config-panel active" id="vistab-delivery">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Authorized Delivery Partners & Vendor Rules</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Manage e-commerce and food delivery entry protocols, allowed gate checkpoints, and active hours.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreateDeliveryPartner}>
              + Add Delivery Partner
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Company / Partner</th>
                  <th>Delivery Type</th>
                  <th>Allowed Gate</th>
                  <th>Operating Window</th>
                  <th>Verification</th>
                  <th>Push Notification</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveryPartners.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.name}</strong>
                    </td>
                    <td>{d.type}</td>
                    <td>
                      <span className="badge badge-pine">{d.allowedGate}</span>
                    </td>
                    <td>{d.hours}</td>
                    <td>{d.verification}</td>
                    <td>{d.push}</td>
                    <td>
                      <span className={`badge ${d.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-xs btn-ghost"
                          style={{ color: 'var(--brand, #10b981)', fontWeight: 600 }}
                          onClick={() => handleOpenEditDeliveryPartner(d)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            const updated = deliveryPartners.map((item) =>
                              item.id === d.id
                                ? { ...item, status: item.status === 'Active' ? 'Disabled' : 'Active' }
                                : item
                            );
                            persistDeliveryPartners(updated);
                            showToast(`Partner ${d.name} is now ${d.status === 'Active' ? 'Disabled' : 'Active'}.`);
                          }}
                        >
                          {d.status === 'Active' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          style={{ color: '#ef4444' }}
                          onClick={() => {
                            if (!confirm(`Delete delivery partner rule "${d.name}"?`)) return;
                            const updated = deliveryPartners.filter((item) => item.id !== d.id);
                            persistDeliveryPartners(updated);
                            showToast(`Delivery partner "${d.name}" deleted.`);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FastGate Passes */}
      {activeTab === 'fastgate' && (
        <div className="config-panel active" id="vistab-fastgate">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Resident FastGate Digital RFID & QR Passes</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Manage instant contactless QR and RFID windshield passes issued to residents and frequent guests.
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setPassGuestName('');
                setPassGuestPhone('');
                setPassValidDays('7');
                setShowPassModal(true);
              }}
            >
              + Issue Pass
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Pass ID</th>
                  <th>Guest / Resident</th>
                  <th>Flat / Unit</th>
                  <th>Purpose</th>
                  <th>QR / RFID Token</th>
                  <th>Vehicle</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {preApprovedPasses.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--neutral)', fontSize: '0.875rem' }}>
                      No digital passes found for this organization.
                    </td>
                  </tr>
                ) : (
                  preApprovedPasses.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <code>{p.passCode || p.id.slice(0, 8).toUpperCase()}</code>
                      </td>
                      <td>
                        <strong>{p.guestName}</strong>
                      </td>
                      <td>{p.flat !== '—' ? `Flat ${p.flat}` : 'Unit —'}</td>
                      <td>{p.purpose}</td>
                      <td>
                        <code style={{ fontSize: '0.75rem', color: 'var(--pine)' }}>{p.qrToken}</code>
                      </td>
                      <td>{p.vehicleNo || '—'}</td>
                      <td>{p.validityDisplay || 'Active'}</td>
                      <td>
                        <span className={`badge badge-${p.status === 'Active' ? 'success' : 'neutral'}`}>{p.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => {
                              showToast(`Pass ${p.passCode || p.id} synced with gate terminals.`);
                            }}
                          >
                            Sync
                          </button>
                          <button
                            className="btn btn-xs btn-ghost"
                            style={{ color: '#ef4444' }}
                            onClick={async () => {
                              if (!confirm(`Revoke pass ${p.passCode || p.id}?`)) return;
                              try {
                                await revokePass(p.id);
                                showToast(`Pass revoked.`);
                              } catch (err: unknown) {
                                showToast(getUserFriendlyErrorMessage(err, 'Failed to revoke pass.'));
                              }
                            }}
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Log Guest Entry */}
      {showLogModal && (
        <div className="modal-overlay" id="modal-log-visitor">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Log Guest Entry at Gate</h3>
              <button className="modal-close-btn" onClick={() => setShowLogModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleLogGuestSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Visitor Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Vikram Seth"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Target Flat / Unit</label>
                    <select
                      className="form-select"
                      value={guestFlat}
                      onChange={(e) => setGuestFlat(e.target.value)}
                    >
                      {flats.length === 0 ? (
                        <option value="General">General / Common</option>
                      ) : (
                        flats.map((f) => (
                          <option key={f.id} value={f.flat_identifier}>
                            Flat {f.flat_identifier} ({f.flat_type || 'Standard'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Host Resident</label>
                    <select
                      className="form-select"
                      value={guestResidentId}
                      onChange={(e) => setGuestResidentId(e.target.value)}
                    >
                      {residents.length === 0 ? (
                        <option value="">No registered residents</option>
                      ) : (
                        residents.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name || 'Resident'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose of Visit</label>
                  <select
                    className="form-select"
                    value={guestPurpose}
                    onChange={(e) => setGuestPurpose(e.target.value)}
                  >
                    <option value="Guest">Personal Guest</option>
                    <option value="Delivery">Delivery / Courier</option>
                    <option value="Cab">Cab / Ride Pick/Drop</option>
                    <option value="Home Repair">Home Service / Contractor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+91 98765 43210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                  />
                </div>

                {formError && (
                  <div style={{ color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', marginTop: '8px' }}>
                    {formError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowLogModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Logging Entry...' : 'Log Entry & Open Barrier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Policy Add/Edit */}
      {showPolicyModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{editingPolicy ? 'Edit Visitor Category Policy' : '+ Add Visitor Category Policy'}</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowPolicyModal(false);
                  setEditingPolicy(null);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSavePolicy}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--neutral)' }}>
                  {editingPolicy
                    ? `Update verification rules for "${editingPolicy.type}". Changes will apply across Guard Gate terminals.`
                    : 'New visitor validation rules will automatically apply across Guard Gate terminals and WhatsApp webhooks.'}
                </p>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Real Estate Agent / Broker"
                    value={policyCategoryName}
                    onChange={(e) => setPolicyCategoryName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Auto Approval Rule</label>
                    <select
                      className="form-select"
                      value={policyAutoApprove}
                      onChange={(e) => setPolicyAutoApprove(e.target.value)}
                    >
                      <option value="Pre-Approved Entry">Pre-Approved Entry</option>
                      <option value="Resident Approval Required">Resident Approval Required</option>
                      <option value="Guard Discretion">Guard Discretion</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Allowed Duration (Hours) *</label>
                    <select
                      className="form-select"
                      value={policyMaxDuration}
                      onChange={(e) => setPolicyMaxDuration(e.target.value)}
                    >
                      <option value="0-4 hr">0-4 hr</option>
                      <option value="4-12 hr">4-12 hr</option>
                      <option value="12-24 hr">12-24 hr</option>
                      <option value="24 hr+">24 hr+</option>
                      <option value="Skip">Skip</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Photo Verification</label>
                    <select
                      className="form-select"
                      value={policyPhotoReq}
                      onChange={(e) => setPolicyPhotoReq(e.target.value)}
                    >
                      <option value="Optional">Optional</option>
                      <option value="Mandatory">Mandatory</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Govt ID Requirement</label>
                    <select
                      className="form-select"
                      value={policyIdReq}
                      onChange={(e) => setPolicyIdReq(e.target.value)}
                    >
                      <option value="No">No</option>
                      <option value="Mandatory">Mandatory</option>
                      <option value="Optional">Optional</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Vehicle Registration</label>
                    <select
                      className="form-select"
                      value={policyVehicleReq}
                      onChange={(e) => setPolicyVehicleReq(e.target.value)}
                    >
                      <option value="Mandatory if Vehicle">Mandatory if Vehicle</option>
                      <option value="Optional">Optional</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Allowed Gate Terminals</label>
                    <select
                      className="form-select"
                      value={availableGates.includes(policyAllowedGates) ? policyAllowedGates : 'Custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== 'Custom') {
                          setPolicyAllowedGates(val);
                        } else {
                          setPolicyAllowedGates('');
                        }
                      }}
                    >
                      {availableGates.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                      <option value="Custom">Other / Custom Terminal</option>
                    </select>
                    {(!availableGates.includes(policyAllowedGates) || policyAllowedGates === '') && (
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type custom allowed gate name..."
                        value={policyAllowedGates}
                        onChange={(e) => setPolicyAllowedGates(e.target.value)}
                        style={{ marginTop: '8px' }}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowPolicyModal(false);
                    setEditingPolicy(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingPolicy ? 'Update Category Policy' : 'Save Category Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: FastGate Pass Issue */}
      {showPassModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Issue FastGate Digital Pass</h3>
              <button className="modal-close-btn" onClick={() => setShowPassModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreatePassSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Visitor / Guest Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Sonia Kapadia"
                    value={passGuestName}
                    onChange={(e) => setPassGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 98765 43210"
                      value={passGuestPhone}
                      onChange={(e) => setPassGuestPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pass Validity Duration</label>
                    <select
                      className="form-select"
                      value={passValidDays}
                      onChange={(e) => setPassValidDays(e.target.value)}
                    >
                      <option value="1">1 Day</option>
                      <option value="3">3 Days</option>
                      <option value="7">7 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowPassModal(false)}
                  disabled={isSubmittingPass}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmittingPass || !passGuestName.trim()}
                >
                  {isSubmittingPass ? 'Issuing...' : 'Issue Digital Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Add/Edit Authorized Delivery Partner */}
      {showDeliveryModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{editingDeliveryPartner ? 'Edit Delivery Partner Policy' : '+ Add Authorized Delivery Partner'}</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowDeliveryModal(false);
                  setEditingDeliveryPartner(null);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveDeliveryPartner}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--neutral)' }}>
                  {editingDeliveryPartner
                    ? `Update security protocol and operating hours for "${editingDeliveryPartner.name}".`
                    : 'Configure authorized delivery fleet credentials, permitted gates, and resident alert rules.'}
                </p>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Company / Partner Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Swiggy Instamart / Zomato"
                    value={dpName}
                    onChange={(e) => setDpName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Delivery Type</label>
                    <select
                      className="form-select"
                      value={dpType}
                      onChange={(e) => setDpType(e.target.value)}
                    >
                      <option value="E-Commerce Parcel">E-Commerce Parcel</option>
                      <option value="Food & Quick Commerce">Food & Quick Commerce</option>
                      <option value="Courier & Documents">Courier & Documents</option>
                      <option value="Grocery Delivery">Grocery Delivery</option>
                      <option value="Medicine / Pharmacy">Medicine / Pharmacy</option>
                      <option value="Other">Other (Custom Type)</option>
                    </select>
                    {dpType === 'Other' && (
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type custom delivery type..."
                        value={dpCustomType}
                        onChange={(e) => setDpCustomType(e.target.value)}
                        style={{ marginTop: '8px' }}
                        autoFocus
                        required
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Allowed Gate Checkpoint</label>
                    <select
                      className="form-select"
                      value={dpAllowedGate}
                      onChange={(e) => setDpAllowedGate(e.target.value)}
                    >
                      {availableGates.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Operating Window</label>
                    <select
                      className="form-select"
                      value={dpOperatingHours}
                      onChange={(e) => setDpOperatingHours(e.target.value)}
                    >
                      <option value="06:00 AM - 11:00 PM">06:00 AM - 11:00 PM</option>
                      <option value="07:00 AM - 11:30 PM">07:00 AM - 11:30 PM</option>
                      <option value="08:00 AM - 09:00 PM">08:00 AM - 09:00 PM</option>
                      <option value="09:00 AM - 07:00 PM">09:00 AM - 07:00 PM</option>
                      <option value="24x7 Open">24x7 Round the Clock</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gate Verification Method</label>
                    <select
                      className="form-select"
                      value={dpVerification}
                      onChange={(e) => setDpVerification(e.target.value)}
                    >
                      <option value="Auto PIN OTP">Auto PIN OTP</option>
                      <option value="Resident Call Pre-Approved">Resident Call Pre-Approved</option>
                      <option value="ID + Waybill Verification">ID + Waybill Verification</option>
                      <option value="Guard Discretion">Guard Discretion</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Resident Push Notification</label>
                  <select
                    className="form-select"
                    value={dpPushNotification}
                    onChange={(e) => setDpPushNotification(e.target.value)}
                  >
                    <option value="Enabled">Enabled (Send notification on gate check-in)</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowDeliveryModal(false);
                    setEditingDeliveryPartner(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingDeliveryPartner ? 'Update Partner Rule' : 'Save Delivery Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
