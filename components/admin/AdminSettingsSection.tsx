'use client';

import NextImage from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuthStore, useToastStore } from '../../store';
import { useSocietySettingsStore } from '../../store/useSocietySettingsStore';
import { CURRENCIES, TEMPLATE_VARIABLES, getSocietySettings, saveSocietyProfile, saveBranding, saveTemplates, saveEmergencyContact, deleteEmergencyContact, uploadCampusImage, sendTemplateTest, type EmergencyContact, type SocietySettings, type TemplateKey, type CurrencyCode } from '../../lib/api/society-settings.api';
import { getMaintenanceConfiguration, updateMaintenanceConfiguration, type BackendMaintenanceConfiguration, type UpdateMaintenanceConfigurationPayload } from '../../lib/api/maintenance.api';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import { DataTable, type DataColumn } from '../common/DataTable';
import { useCampusImage } from '../common/SocietySettings';

const TABS = [ { key: 'general', label: 'Society Profile' }, { key: 'emergency', label: 'Emergency & SOS' }, { key: 'billing', label: 'Billing Policy' }, { key: 'templates', label: 'WhatsApp Templates' }, { key: 'master', label: 'Master Settings' } ] as const;
type Tab = typeof TABS[number]['key'];
const TEMPLATE_LABELS: Record<TemplateKey, string> = { visitorArrival: 'Visitor check-in notification', maintenanceDue: 'New maintenance bill', maintenanceOverdue: 'Maintenance overdue reminder', notice: 'Society notice broadcast' };
const EMPTY_CONTACT: Omit<EmergencyContact, 'id'> = { name: '', phone: '', description: '', priority: 'Emergency', is24x7: true, residentVisible: true, guardVisible: true, active: true };
const DEFAULT_BILLING: UpdateMaintenanceConfigurationPayload = { base_maintenance_amount: 0, due_day_of_month: 10, late_charge_type: 'FIXED', late_charge_value: 0, late_charge_grace_days: 0, late_charge_frequency: 'ONCE', late_charge_start: 'FIRST_DAY' };
const SAMPLE_VALUES: Record<string, string> = { resident_name: 'Sample Resident', visitor_name: 'Sample Visitor', flat_number: 'A-101', gate_name: 'Main Gate', society_name: 'Your society', amount: '100.00', due_date: '10 Nov 2026', notice_title: 'Community update', notice_content: 'Water tank maintenance will take place tomorrow.' };
function templatePreview(template: string, name: string, currency: string): string { return template.replace(/\{([a-z_]+)\}/g, (_, key: string) => key === 'society_name' ? name : key === 'amount' ? `${currency}${SAMPLE_VALUES.amount}` : SAMPLE_VALUES[key] ?? `{${key}}`); }
function billingDraft(config: BackendMaintenanceConfiguration | null): UpdateMaintenanceConfigurationPayload {
  return config ? { base_maintenance_amount: Number(config.base_maintenance_amount), due_day_of_month: Number(config.due_day_of_month), late_charge_type: config.late_charge_type, late_charge_value: Number(config.late_charge_value), late_charge_grace_days: Number(config.late_charge_grace_days), late_charge_frequency: config.late_charge_frequency ?? 'ONCE', late_charge_start: config.late_charge_start ?? 'FIRST_DAY' } : { ...DEFAULT_BILLING };
}
export const AdminSettingsSection: React.FC = () => {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id);
  const permissions = useAuthStore(state => state.permissions);
  const canManage = permissions.includes('society:manage');
  const canManageBilling = permissions.includes('maintenance:manage');
  const canReadBilling = permissions.includes('maintenance:read');
  const { showToast } = useToastStore();
  const apply = useSocietySettingsStore(state => state.apply);
  const publicData = useSocietySettingsStore(state => state.data);
  const savedImage = useCampusImage(publicData?.branding.campusImageFileId);
  const [activeTab, setTab] = useState<Tab>('general');
  const [draft, setDraft] = useState<SocietySettings | null>(null);
  const [billing, setBilling] = useState<UpdateMaintenanceConfigurationPayload>({ ...DEFAULT_BILLING });
  const [billingError, setBillingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<(Omit<EmergencyContact, 'id'> & { id?: string }) | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('visitorArrival');
  const [recipient, setRecipient] = useState('');
  const [testing, setTesting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SocietySettings['templates'] | null>(null);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const load = useCallback(async () => {
    if (!organizationId) { setLoading(false); return; }
    const current = () => useAuthStore.getState().organizationId === organizationId && useAuthStore.getState().backendUser?.id === userId;
    setLoading(true); setError(null);
    try {
      const result = await getSocietySettings();
      if (!current()) return;
      setDraft(result); setSavedTemplates(result.templates); apply(result);
      if (canReadBilling) {
        try { const config = await getMaintenanceConfiguration(); if (current()) { setBilling(billingDraft(config)); setBillingError(null); } }
        catch (reason) { if (current()) setBillingError(getUserFriendlyErrorMessage(reason, 'Billing policy could not be loaded')); }
      }
    } catch (reason) { if (current()) setError(getUserFriendlyErrorMessage(reason, 'Settings could not be loaded')); }
    finally { if (current()) setLoading(false); }
  }, [organizationId, userId, canReadBilling, apply]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Load persisted settings and expose request state.
  useEffect(() => { void load(); }, [load]);

  function accept(result: SocietySettings) {
    setDraft(previous => previous ? { ...result, ...(activeTab === 'general' ? {} : { name: previous.name, address: previous.address, profile: previous.profile }), ...(activeTab === 'master' ? {} : { branding: previous.branding }), ...(activeTab === 'templates' ? {} : { templates: previous.templates }) } : result);
    setSavedTemplates(result.templates); apply(result);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true); setError(null);
    try {
      if (activeTab === 'general') accept(await saveSocietyProfile(draft));
      if (activeTab === 'templates') accept(await saveTemplates(draft.templates));
      if (activeTab === 'master') {
        let fileId = draft.branding.campusImageFileId;
        if (imageFile) fileId = (await uploadCampusImage(imageFile)).id;
        accept(await saveBranding({ ...draft.branding, campusImageFileId: fileId }));
        setImageFile(null); setImagePreview(null);
      }
      if (activeTab === 'billing') {
        if (billingError) throw new Error('Load billing policy successfully before saving');
        const result = await updateMaintenanceConfiguration(billing);
        setBilling(billingDraft(result));
      }
      showToast('Settings saved successfully.');
    } catch (reason) { setError(getUserFriendlyErrorMessage(reason, 'Unable to save settings')); }
    finally { setBusy(false); }
  }
  async function submitContact(event: React.FormEvent) {
    event.preventDefault(); if (!contact || busy) return;
    setBusy(true); setContactError(null);
    try { const { id, ...values } = contact; accept(await saveEmergencyContact(values, id)); setContact(null); showToast(id ? 'Emergency contact updated.' : 'Emergency contact added.'); }
    catch (reason) { setContactError(getUserFriendlyErrorMessage(reason, 'Unable to save emergency contact')); }
    finally { setBusy(false); }
  }
  async function removeContact(item: EmergencyContact) {
    if (busy || !window.confirm(`Remove ${item.name} from the emergency directory?`)) return;
    setBusy(true);
    try { accept(await deleteEmergencyContact(item.id)); showToast('Emergency contact removed.'); }
    catch (reason) { setError(getUserFriendlyErrorMessage(reason, 'Unable to remove contact')); }
    finally { setBusy(false); }
  }
  async function selectImage(file?: File) {
    setImageError(null);
    if (!file) return;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP image up to 2 MB.');
      const url = URL.createObjectURL(file);
      try {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => { const image = new Image(); image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error('Image could not be opened.')); image.src = url; });
        if (dimensions.width <= dimensions.height) throw new Error('Choose a horizontal image: width must be greater than height.');
        setImageFile(file); setImagePreview(url);
      } catch (reason) { URL.revokeObjectURL(url); throw reason; }
    } catch (reason) { setImageError(getUserFriendlyErrorMessage(reason, 'Image could not be selected')); }
  }
  async function testMessage() {
    if (testing || !savedTemplates || !draft || JSON.stringify(savedTemplates) !== JSON.stringify(draft.templates)) return;
    setTesting(true); setError(null);
    try { const result = await sendTemplateTest(selectedTemplate, recipient); showToast(result.messageId ? 'WhatsApp gateway accepted test message.' : 'Test message accepted.'); }
    catch (reason) { setError(getUserFriendlyErrorMessage(reason, 'WhatsApp test failed')); }
    finally { setTesting(false); }
  }
  if (!organizationId) return <div className="admin-section active"><div className="empty-state">Select a society to manage its settings.</div></div>;
  if (loading) return <div id="section-settings" className="admin-section active"><div className="card settings-empty" role="status">Loading society settings…</div></div>;
  if (!draft) return <div id="section-settings" className="admin-section active"><div className="card" role="alert"><p>{error || 'Settings unavailable.'}</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>Retry</button></div></div>;
  const currency = CURRENCIES[draft.profile.currencyCode];
  const templatesDirty = JSON.stringify(savedTemplates) !== JSON.stringify(draft.templates);
  const columns: DataColumn<EmergencyContact>[] = [
    { key: 'name', label: 'Service / Name', value: row => row.name, render: row => <strong>{row.name}</strong> },
    { key: 'phone', label: 'Phone', value: row => row.phone, render: row => <a href={`tel:${row.phone.replace(/[^+\d]/g, '')}`}>{row.phone}</a> },
    { key: 'description', label: 'Description', value: row => row.description },
    { key: 'priority', label: 'Priority', value: row => row.priority, render: row => <span className={`badge ${row.priority === 'Emergency' ? 'badge-danger' : row.priority === 'Urgent' ? 'badge-warning' : 'badge-neutral'}`}>{row.priority}</span> },
    { key: 'hours', label: '24×7', value: row => row.is24x7 ? 'Yes' : 'No' },
    { key: 'visibility', label: 'Visible to', value: row => [row.residentVisible ? 'Residents' : '', row.guardVisible ? 'Guards' : ''].filter(Boolean).join(', ') || 'Admins only' },
    { key: 'status', label: 'Status', value: row => row.active ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', value: () => '', sortable: false, render: row => canManage ? <div className="table-action-btns"><button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => { setContact({ ...row }); setContactError(null); }}>Edit</button><button className="btn btn-xs btn-danger" disabled={busy} onClick={() => void removeContact(row)}>Remove</button></div> : 'Read only' },
  ];
  return <div className="admin-section active" id="section-settings">
    <div className="section-header"><div><h2>Society Master Settings</h2><p>Personalize your society, publish useful contacts and manage billing policies.</p></div><span className="badge badge-pine">{draft.name}</span></div>
    <div className="module-subnav settings-tabs" role="tablist" aria-label="Settings sections">{TABS.map(tab => <button key={tab.key} role="tab" type="button" aria-selected={activeTab === tab.key} aria-controls={`settings-panel-${tab.key}`} className={`module-tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => { setTab(tab.key); setError(null); }}>{tab.label}</button>)}</div>
    {error && <div className="settings-error" role="alert">{error}</div>}
    {activeTab === 'emergency' ? <section id="settings-panel-emergency" role="tabpanel">
      <div className="settings-panel-heading"><div><h3>Emergency & SOS Helplines Directory</h3><p>Published contacts appear in Society Help & SOS for selected resident and guard audiences.</p></div>{canManage && <button className="btn btn-primary btn-sm" onClick={() => { setContact({ ...EMPTY_CONTACT }); setContactError(null); }}>+ Add Emergency Contact</button>}</div>
      <DataTable rows={draft.emergencyContacts} columns={columns} rowKey={row => row.id} label="Emergency contacts" />
    </section> : <form onSubmit={save} id={`settings-panel-${activeTab}`} role="tabpanel" className="settings-form">
      {activeTab === 'general' && <div className="card settings-card"><div className="settings-panel-heading"><div><h3>Society Identity & Legal Information</h3><p>Details used in society headers and outgoing messages.</p></div></div>
        <label className="settings-field">Registered Housing Society Name<input className="form-control" value={draft.name} required maxLength={255} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
        <div className="settings-form-grid"><label className="settings-field">Registration / License Number<input className="form-control" maxLength={150} value={draft.profile.registrationNumber} onChange={event => setDraft({ ...draft, profile: { ...draft.profile, registrationNumber: event.target.value } })} /></label><label className="settings-field">Currency Symbol<select className="form-select" value={draft.profile.currencyCode} onChange={event => setDraft({ ...draft, profile: { ...draft.profile, currencyCode: event.target.value as CurrencyCode } })}>{Object.entries(CURRENCIES).map(([code, symbol]) => <option key={code} value={code}>{symbol} — {code}</option>)}</select></label></div>
        <label className="settings-field">Official Society Address<textarea className="form-textarea" rows={3} maxLength={2000} value={draft.address} onChange={event => setDraft({ ...draft, address: event.target.value })} /></label>
      </div>}
      {activeTab === 'billing' && <div className="card settings-card"><div className="settings-panel-heading"><div><h3>Assessment & Late Fee Policy</h3><p>Maintenance amount equals base monthly amount × flat maintenance multiplier. Policy changes apply to newly generated bills.</p></div></div>
        {billingError ? <div role="alert"><p>{billingError}</p><button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>Retry billing policy</button></div> : <>
          <div className="settings-form-grid"><label className="settings-field">Base monthly maintenance ({currency})<input className="form-control" type="number" min={0} max={99999999} step="0.01" required value={billing.base_maintenance_amount} onChange={event => setBilling({ ...billing, base_maintenance_amount: Number(event.target.value) })} /></label><label className="settings-field">Due day of month<input className="form-control" type="number" min={1} max={31} required value={billing.due_day_of_month} onChange={event => setBilling({ ...billing, due_day_of_month: Number(event.target.value) })} /></label></div>
          <div className="settings-form-grid"><label className="settings-field">Payment grace period (days)<input className="form-control" type="number" min={0} max={365} required value={billing.late_charge_grace_days} onChange={event => setBilling({ ...billing, late_charge_grace_days: Number(event.target.value) })} /></label><label className="settings-field">Late fee type<select className="form-select" value={billing.late_charge_type} onChange={event => setBilling({ ...billing, late_charge_type: event.target.value as 'FIXED' | 'PERCENTAGE', late_charge_frequency: event.target.value === 'PERCENTAGE' ? 'ONCE' : billing.late_charge_frequency })}><option value="FIXED">Fixed amount</option><option value="PERCENTAGE">Percentage of maintenance</option></select></label></div>
          <div className="settings-form-grid"><label className="settings-field">{billing.late_charge_type === 'FIXED' ? `Late fee amount (${currency})` : 'Late fee (%)'}<input className="form-control" type="number" min={0} max={billing.late_charge_type === 'PERCENTAGE' ? 100 : 99999999} step="0.01" required value={billing.late_charge_value} onChange={event => setBilling({ ...billing, late_charge_value: Number(event.target.value) })} /></label><label className="settings-field">Charge frequency<select className="form-select" disabled={billing.late_charge_type === 'PERCENTAGE'} value={billing.late_charge_frequency} onChange={event => setBilling({ ...billing, late_charge_frequency: event.target.value as 'ONCE' | 'DAILY' | 'WEEKLY' })}><option value="ONCE">Once after grace period</option><option value="DAILY">Every overdue day</option><option value="WEEKLY">Every overdue week</option></select></label></div>
          {billing.late_charge_frequency === 'WEEKLY' && <label className="settings-field">First weekly charge<select className="form-select" value={billing.late_charge_start} onChange={event => setBilling({ ...billing, late_charge_start: event.target.value as 'FIRST_DAY' | 'AFTER_PERIOD' })}><option value="FIRST_DAY">First overdue day, then every 7 days</option><option value="AFTER_PERIOD">After each 7 full overdue days</option></select></label>}
          <div className="settings-info"><strong>Admin remains in control</strong><p>Fixed fees can accrue daily or weekly after grace period. Use Finance → Waive Late Charge to remove fees and choose whether future fees should stop for that bill. Original maintenance bill stays payable.</p></div>
        </>}
      </div>}
      {activeTab === 'templates' && <div className="settings-template-grid"><div className="card settings-card"><h3>Customize WhatsApp Message Copy</h3><p>Saved copy is used by visitor check-in, maintenance bill/overdue events, and published notices. Recipient preferences and WhatsApp category switches still apply.</p>
        <label className="settings-field">Message type<select className="form-select" value={selectedTemplate} onChange={event => setSelectedTemplate(event.target.value as TemplateKey)}>{Object.entries(TEMPLATE_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <label className="settings-field">Message text<textarea className="form-textarea settings-template-editor" rows={8} required maxLength={2000} value={draft.templates[selectedTemplate]} onChange={event => setDraft({ ...draft, templates: { ...draft.templates, [selectedTemplate]: event.target.value } })} /></label>
        <div className="settings-variable-list">{TEMPLATE_VARIABLES[selectedTemplate].map(variable => <button key={variable} type="button" className="btn btn-xs btn-ghost" onClick={() => setDraft({ ...draft, templates: { ...draft.templates, [selectedTemplate]: `${draft.templates[selectedTemplate]} {${variable}}` } })}>{`{${variable}}`}</button>)}</div>
        <p className="settings-note">Visitor copy is sent after check-in. Visitor approvals stay in the app; YES/NO WhatsApp replies are not processed.</p>
      </div><aside className="card settings-card"><h3>Message preview</h3><pre className="settings-message-preview">{templatePreview(draft.templates[selectedTemplate], draft.name, currency)}</pre><label className="settings-field">Send test to your WhatsApp number<input className="form-control" type="tel" value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="+91…" /></label><button type="button" className="btn btn-secondary btn-sm" disabled={testing || templatesDirty || !canManage || !/^(?:\+?91[ -]?)?[6-9]\d{9}$/.test(recipient)} onClick={() => void testMessage()}>{testing ? 'Sending test…' : 'Send Saved Template Test'}</button><p className="settings-note">{templatesDirty ? 'Save template changes before sending a test.' : 'Only the entered number receives a test. Gateway acceptance does not confirm handset delivery.'}</p><a className="btn btn-sm btn-ghost" href="/admin?section=whatsapp">Open WhatsApp connection & delivery settings</a></aside></div>}
      {activeTab === 'master' && <div className="card settings-card"><div className="settings-panel-heading"><div><h3>Branding & Resident Experience</h3><p>Give your society a recognizable campus page and a useful support directory.</p></div></div>
        <div className="settings-banner-preview">{imagePreview || savedImage ? <NextImage unoptimized width={1600} height={600} src={imagePreview || savedImage || ''} alt="Society campus banner preview" /> : <div>Your society campus banner</div>}<span>Horizontal campus banner</span></div>
        <label className="settings-field">Main campus image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void selectImage(event.target.files?.[0])} /></label><p className="settings-note">Landscape only. Recommended 1600 × 600 px; JPG, PNG or WebP, up to 2 MB. Saved image appears on Overview → Smart Living Campus.</p>{imageError && <p role="alert" className="settings-error">{imageError}</p>}
        {(draft.branding.campusImageFileId || imageFile) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImageFile(null); setImagePreview(null); setDraft({ ...draft, branding: { ...draft.branding, campusImageFileId: null } }); }}>Use default campus image</button>}
        <div className="settings-form-grid"><label className="settings-field">Campus heading<input className="form-control" required maxLength={100} value={draft.branding.campusTitle} onChange={event => setDraft({ ...draft, branding: { ...draft.branding, campusTitle: event.target.value } })} /></label><label className="settings-field">Brand accent<select className="form-select" value={draft.branding.accent} onChange={event => setDraft({ ...draft, branding: { ...draft.branding, accent: event.target.value as SocietySettings['branding']['accent'] } })}><option value="forest">Forest green</option><option value="blue">Ocean blue</option><option value="plum">Royal plum</option></select></label></div>
        <label className="settings-field">Campus welcome message<textarea className="form-textarea" rows={2} maxLength={300} value={draft.branding.campusDescription} onChange={event => setDraft({ ...draft, branding: { ...draft.branding, campusDescription: event.target.value } })} /></label>
        <div className="settings-form-grid"><label className="settings-field">Society office phone<input className="form-control" type="tel" inputMode="numeric" pattern="[0-9]{10}" minLength={10} maxLength={10} title="Enter exactly 10 digits" value={draft.branding.officePhone} onChange={event => setDraft({ ...draft, branding: { ...draft.branding, officePhone: event.target.value.replace(/[^0-9]/g, '').slice(0, 10) } })} /></label><label className="settings-field">Society office email<input className="form-control" type="email" maxLength={254} pattern="[^\s@]+@[^\s@]+\.[^\s@]+" title="Enter a valid email address, such as office@example.com" value={draft.branding.officeEmail} onChange={event => setDraft({ ...draft, branding: { ...draft.branding, officeEmail: event.target.value } })} /></label></div>
        <fieldset className="settings-office-hours"><legend>Office hours</legend>
          <div className="settings-form-grid"><label className="settings-field">Opening time<input className="form-control" type="time" value={draft.branding.officeOpenTime || ''} required={Boolean(draft.branding.officeCloseTime)} onChange={event => setDraft({ ...draft, branding: { ...draft.branding, officeHours: '', officeOpenTime: event.target.value } })} /></label><label className="settings-field">Closing time<input className="form-control" type="time" value={draft.branding.officeCloseTime || ''} required={Boolean(draft.branding.officeOpenTime)} onChange={event => setDraft({ ...draft, branding: { ...draft.branding, officeHours: '', officeCloseTime: event.target.value } })} /></label></div>
          <p className="settings-note">Dates are optional for regular office hours. Set both times to publish opening hours.</p>
          {draft.branding.officeHours && <p className="settings-note">Current office hours: {draft.branding.officeHours}</p>}
        </fieldset>
      </div>}
      <div className="settings-save-bar"><p>{activeTab === 'billing' ? 'Applies to new maintenance bills.' : 'Changes are shared across this society after saving.'}</p><button type="submit" className="btn btn-primary btn-sm" disabled={busy || (activeTab === 'billing' ? !canManageBilling || Boolean(billingError) : !canManage) || Boolean(imageError && activeTab === 'master')}>{busy ? 'Saving…' : 'Save Changes'}</button></div>
    </form>}
    {contact && <div className="modal-overlay"><div className="modal-dialog" role="dialog" aria-modal="true" aria-label={contact.id ? 'Edit Emergency Contact' : 'Add Emergency Contact'}><form onSubmit={submitContact}><div className="modal-header"><h3>{contact.id ? 'Edit' : 'Add'} Emergency Contact</h3><button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setContact(null)}>Close</button></div><div className="modal-body settings-contact-form">
      <label className="settings-field">Service / Contact Name<input className="form-control" required maxLength={150} value={contact.name} onChange={event => setContact({ ...contact, name: event.target.value })} /></label><div className="settings-form-grid"><label className="settings-field">Phone Number<input className="form-control" type="tel" required pattern="\+?[0-9][0-9 ()-]{1,28}[0-9]" value={contact.phone} onChange={event => setContact({ ...contact, phone: event.target.value })} /></label><label className="settings-field">Priority Level<select className="form-select" value={contact.priority} onChange={event => setContact({ ...contact, priority: event.target.value as EmergencyContact['priority'] })}><option>Emergency</option><option>Urgent</option><option>Standard</option></select></label></div>
      <label className="settings-field">Description<textarea className="form-textarea" rows={2} maxLength={500} value={contact.description} onChange={event => setContact({ ...contact, description: event.target.value })} /></label><div className="settings-checkboxes">{(['is24x7', 'residentVisible', 'guardVisible', 'active'] as const).map((key, index) => <label key={key}><input type="checkbox" checked={contact[key]} onChange={event => setContact({ ...contact, [key]: event.target.checked })} />{['Available 24×7', 'Visible to residents', 'Visible to guards', 'Active contact'][index]}</label>)}</div>{contactError && <p role="alert" className="settings-error">{contactError}</p>}
    </div><div className="modal-footer"><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setContact(null)}>Cancel</button><button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : contact.id ? 'Update Contact' : 'Add Helpline'}</button></div></form></div></div>}
  </div>;
};
