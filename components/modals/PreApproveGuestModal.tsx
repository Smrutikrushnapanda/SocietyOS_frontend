'use client';

import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { parseDate } from '@internationalized/date';
import { useResidentStore, useVisitorStore, useModalStore, useToastStore, useAuthStore } from '../../store';
import { Switch } from '../common/Switch';
import {
  IconUser,
  IconPackage,
  IconTaxi,
  IconWrench,
  IconShield,
  IconClose,
  IconPhone,
  IconCar,
  IconQrCode
} from '../common/Icons';
import { GuestPassDatePicker, GuestPassGateSelect } from './GuestPassControls';
import { localDateValue } from '../../lib/visitors/visit-window';
import styles from './PreApproveGuestModal.module.css';

const guestTypes = [
  { id: 'Family / Friend', icon: IconUser, label: 'Guest & Family' },
  { id: 'Home Delivery', icon: IconPackage, label: 'Delivery' },
  { id: 'Cab / Driver', icon: IconTaxi, label: 'Cab / Ride' },
  { id: 'Home Repair', icon: IconWrench, label: 'Service' },
  { id: 'Other', icon: IconShield, label: 'Other' }
];

const durationOptions = [
  { id: 'Next 4 Hours', label: '4 Hours' },
  { id: 'Today Full Day', label: 'Today' },
  { id: '2 Days Pass', label: '2 Days' },
  { id: 'Weekly Pass', label: '7 Days' }
];

export const PreApproveGuestModal: React.FC = () => {
  const { resident } = useResidentStore();
  const { preApproveVisit } = useVisitorStore();
  const { openModal, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const { organizationId } = useAuthStore();

  const [purpose, setPurpose] = useState('Family / Friend');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [duration, setDuration] = useState('Today Full Day');
  const [startDate, setStartDate] = useState(() => localDateValue());
  const [endDate, setEndDate] = useState(() => localDateValue());
  const [gate, setGate] = useState('All Society Gates');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const gatesList = useMemo(() => {
    let list: string[] = [];
    if (typeof window !== 'undefined' && organizationId) {
      try {
        const stored = localStorage.getItem(`societyos_gates_${organizationId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed
              .filter((g: { status?: string }) => g && g.status !== 'Inactive')
              .map((g: { name?: string; code?: string }) => g.name || g.code)
              .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
          }
        }
      } catch {
        // Fallback below
      }
    }
    return [...new Set(['All Society Gates', ...list])];
  }, [organizationId]);
  const selectedGate = gatesList.includes(gate) ? gate : gatesList[0];

  const handleDurationSelect = (dur: string) => {
    setDuration(dur);
    const today = localDateValue();
    setStartDate(today);
    if (dur === 'Next 4 Hours' || dur === 'Today Full Day') {
      setEndDate(dur === 'Next 4 Hours' ? localDateValue(new Date(Date.now() + 4 * 3600000)) : today);
    } else if (dur === '2 Days Pass') {
      setEndDate(parseDate(today).add({ days: 1 }).toString());
    } else if (dur === 'Weekly Pass') {
      setEndDate(parseDate(today).add({ days: 6 }).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const rawPhoneDigits = phone.replace(/\D/g, '');
    const cleanDigits = rawPhoneDigits.length > 10 ? rawPhoneDigits.slice(-10) : rawPhoneDigits;

    if (!trimmedName) {
      setErrorMsg('Please enter the guest full name.');
      return;
    }

    // 10-digit mobile number validation
    if (cleanDigits.length !== 10 || !/^[6-9]\d{9}$/.test(cleanDigits)) {
      setErrorMsg('Please enter a valid 10-digit mobile number (e.g. 9876543210).');
      return;
    }

    // Vehicle registration number plate validation (if entered)
    const cleanPlate = vehicle.replace(/[\s-]/g, '').toUpperCase();
    if (cleanPlate) {
      const plateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
      if (!plateRegex.test(cleanPlate)) {
        setErrorMsg('Invalid vehicle plate format. Example: MH02AB1234 or DL1CAB1234.');
        return;
      }
    }

    if (purpose === 'Other' && !otherPurpose.trim()) {
      setErrorMsg('Please specify the visitor purpose.');
      return;
    }

    if (startDate < localDateValue() || endDate < startDate) {
      setErrorMsg('Choose a date range starting today or later, with the end on or after the start.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const finalPurpose = purpose === 'Other' ? otherPurpose.trim() : purpose;
      const entry = startDate === localDateValue() ? new Date() : new Date(`${startDate}T00:00:00`);
      const end = duration === 'Next 4 Hours'
        ? new Date(entry.getTime() + 4 * 3600000)
        : new Date(`${parseDate(endDate).add({ days: 1 }).toString()}T00:00:00`);

      const visit = await preApproveVisit({
        name: trimmedName,
        mobile: cleanDigits,
        visit_purpose: finalPurpose,
        expected_entry_time: entry.toISOString(),
        validity_end: end.toISOString(),
        send_whatsapp: sendWhatsApp,
      });

      const { getVisitPass } = await import('../../lib/api/visitors.api');
      const passDetails = await getVisitPass(visit.id);
      const passCode = passDetails.passCode;
      const validityDisplay = `${new Date(passDetails.validityStart).toLocaleString()} – ${new Date(passDetails.validityEnd).toLocaleString()}`;

      showToast(`Visitor ${trimmedName} pre-approved successfully!`);

      // Open digital ticket pass modal with smooth bottom sheet
      openModal('qrPassCard', {
        id: passDetails.passId,
        visitId: visit.id,
        qrToken: passDetails.qrToken,
        qrImageData: passDetails.qrImageData,
        passCode,
        guestName: trimmedName,
        phone: cleanDigits,
        flat: resident?.flat && resident.flat !== 'No flat' ? resident.flat : 'Registered Unit',
        resident: resident?.name || 'Resident',
        validityDisplay,
        gate: selectedGate,
        vehicleNo: cleanPlate || 'Logged at Gate',
        category: finalPurpose,
        autoShare: sendWhatsApp,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pre-approve visitor. Please try again.';
      setErrorMsg(msg);
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mobile-modal-overlay" id="preapprove-modal" onClick={event => {
      if (event.target === event.currentTarget && !isSubmitting) closeModal();
    }}>
      <div className={clsx('mobile-bottom-sheet', styles.sheet)} role="dialog" aria-modal="true" aria-labelledby="guest-pass-title">
        <header className={styles.header}>
          <span className={styles.headerIcon}><IconShield size={22} /></span>
          <div className={styles.headerCopy}>
            <h3 id="guest-pass-title">Pre-approve Guest Pass</h3>
            <p>Plan a visit and share a digital entry pass.</p>
          </div>
          <button type="button" className={styles.close} onClick={closeModal} disabled={isSubmitting} aria-label="Close guest pass">
            <IconClose size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <fieldset className={styles.section} disabled={isSubmitting}>
              <legend className={styles.sectionTitle}>Visitor category</legend>
              <div className={styles.categories}>
                {guestTypes.map(item => {
                  const Icon = item.icon;
                  return <button key={item.id} type="button" aria-pressed={purpose === item.id}
                    className={clsx(styles.category, purpose === item.id && styles.categoryActive)} onClick={() => setPurpose(item.id)}>
                    <Icon size={16} />{item.label}
                  </button>;
                })}
              </div>
              {purpose === 'Other' && <label className={styles.field}>
                <span className={styles.label}>Visit purpose</span>
                <input className={styles.input} style={{ paddingLeft: 12 }} placeholder="e.g. Tutor or property inspection"
                  value={otherPurpose} onChange={event => setOtherPurpose(event.target.value)} required maxLength={255} />
              </label>}
            </fieldset>

            <fieldset className={styles.section} disabled={isSubmitting}>
              <legend className={styles.sectionTitle}>Guest details</legend>
              <label className={styles.field} htmlFor="guest-name-input">
                <span className={styles.label}>Full name</span>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><IconUser size={17} /></span>
                  <input className={styles.input} id="guest-name-input" placeholder="Guest's full name" value={name}
                    onChange={event => setName(event.target.value)} autoComplete="name" required maxLength={255} />
                </div>
              </label>
              <div className={styles.grid}>
                <label className={styles.field} htmlFor="guest-phone-input">
                  <span className={styles.label}>Mobile number</span>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}><IconPhone size={17} /></span>
                    <input className={styles.input} id="guest-phone-input" placeholder="10-digit number" type="tel" inputMode="numeric"
                      autoComplete="tel-national" maxLength={10} value={phone} required
                      onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} />
                  </div>
                </label>
                <label className={styles.field} htmlFor="guest-vehicle-input">
                  <span className={styles.label}>Vehicle <span className={styles.hint}>(optional)</span></span>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}><IconCar size={17} /></span>
                    <input className={styles.input} id="guest-vehicle-input" placeholder="MH02AB1234" value={vehicle}
                      onChange={event => setVehicle(event.target.value.toUpperCase())} maxLength={15} />
                  </div>
                </label>
              </div>
            </fieldset>

            <section className={styles.section} aria-labelledby="guest-visit-window">
              <h4 id="guest-visit-window" style={{ fontSize: '0.8125rem', margin: 0 }}>Visit dates</h4>
              <div className={styles.durations} aria-label="Quick visit duration">
                {durationOptions.map(option => <button key={option.id} type="button" disabled={isSubmitting}
                  className={clsx(styles.preset, duration === option.id && styles.presetActive)}
                  aria-pressed={duration === option.id} onClick={() => handleDurationSelect(option.id)}>{option.label}</button>)}
              </div>
              <div className={styles.grid}>
                <GuestPassDatePicker id="guest-start-date" label="Valid from" value={startDate} min={localDateValue()} disabled={isSubmitting}
                  onChange={date => { setStartDate(date); if (endDate < date) setEndDate(date); setDuration('Custom'); }} />
                <GuestPassDatePicker id="guest-end-date" label="Valid until" value={endDate} min={startDate} disabled={isSubmitting}
                  onChange={date => { setEndDate(date); setDuration('Custom'); }} />
              </div>
              <p className={styles.hint}>{duration === 'Next 4 Hours' ? 'Valid for four hours from now.' : 'Valid through the end of the selected date.'}</p>
            </section>

            <GuestPassGateSelect value={selectedGate} options={gatesList} disabled={isSubmitting} onChange={setGate} />

            <div className={styles.optIn}>
              <label htmlFor="guest-whatsapp-toggle">
                <strong>WhatsApp digital pass</strong>
                <p className={styles.hint}>Ask SocietyOS WhatsApp to send the pass. Manual sharing stays available.</p>
              </label>
              <Switch id="guest-whatsapp-toggle" aria-label="WhatsApp digital pass" checked={sendWhatsApp}
                disabled={isSubmitting} onChange={event => setSendWhatsApp(event.target.checked)} />
            </div>
            {errorMsg && <p className={styles.error} role="alert">{errorMsg}</p>}
          </div>

          <footer className={styles.actions}>
            <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="btn-submit-preapprove">
              <IconQrCode size={18} /><span>{isSubmitting ? 'Creating pass…' : 'Create guest pass'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
