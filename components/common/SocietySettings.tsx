'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocietySettingsStore } from '../../store/useSocietySettingsStore';
export function SocietySettingsBootstrap() {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id);
  const roles = useAuthStore(state => state.roles.join(','));
  const load = useSocietySettingsStore(state => state.load);
  useEffect(() => { void load(); }, [organizationId, userId, roles, load]);
  return null;
}
export function useCampusImage(fileId: string | null | undefined): string | null {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id ?? state.user?.id);
  const sessionVersion = useAuthStore(state => state.sessionVersion);
  const image = useSocietySettingsStore(state => state.campusImage);
  const loadImage = useSocietySettingsStore(state => state.loadCampusImage);
  useEffect(() => { if (fileId && organizationId) void loadImage(fileId); }, [fileId, organizationId, userId, sessionVersion, loadImage]);
  return image?.fileId === fileId ? image?.url ?? null : null;
}
export function SocietyDirectoryButton() {
  const settings = useSocietySettingsStore(state => state.data);
  const [open, setOpen] = useState(false);
  const roles = useAuthStore(state => state.roles);
  if (!settings) return null;
  const contacts = settings.emergencyContacts.filter(contact => contact.active && (roles.includes('RESIDENT') ? contact.residentVisible : roles.includes('GUARD') ? contact.guardVisible : true));
  return <>
    <button className="btn btn-sm btn-ghost society-help-button" onClick={() => setOpen(true)}>Society Help & SOS</button>
    {open && <div className="modal-overlay" onClick={() => setOpen(false)}><div className="modal-dialog" role="dialog" aria-modal="true" aria-label="Society Help and SOS" onClick={event => event.stopPropagation()}>
      <div className="modal-header"><h3>Society Help & SOS</h3><button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close society help">Close</button></div>
      <div className="modal-body">
        {settings.branding.officePhone && <p>Society office: <a href={`tel:${settings.branding.officePhone.replace(/[^+\d]/g, '')}`}>{settings.branding.officePhone}</a></p>}
        {settings.branding.officeEmail && <p><a href={`mailto:${settings.branding.officeEmail}`}>{settings.branding.officeEmail}</a></p>}
        {settings.branding.officeOpenTime && settings.branding.officeCloseTime && <p>Office hours: {settings.branding.officeOpenTime} – {settings.branding.officeCloseTime}</p>}
        {!settings.branding.officeOpenTime && settings.branding.officeHours && <p>Office hours: {settings.branding.officeHours}</p>}
        {contacts.length === 0 && <p>No emergency contacts published by society administration.</p>}
        {contacts.map(contact => <div className="card" key={contact.id}><strong>{contact.name}</strong><p>{contact.description}</p><p>{contact.priority} {contact.is24x7 ? '· 24×7' : ''}</p><a className="btn btn-primary btn-sm" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>Call {contact.phone}</a></div>)}
      </div>
    </div></div>}
  </>;
}
