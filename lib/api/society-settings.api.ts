import apiClient from './client';
export const CURRENCIES = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$' } as const;
export type CurrencyCode = keyof typeof CURRENCIES;
export type TemplateKey = 'visitorArrival' | 'maintenanceDue' | 'maintenanceOverdue' | 'notice';
export const TEMPLATE_VARIABLES: Record<TemplateKey, string[]> = {
  visitorArrival: ['resident_name', 'visitor_name', 'gate_name', 'flat_number', 'society_name'],
  maintenanceDue: ['resident_name', 'amount', 'due_date', 'flat_number', 'society_name'],
  maintenanceOverdue: ['resident_name', 'amount', 'due_date', 'flat_number', 'society_name'],
  notice: ['society_name', 'notice_title', 'notice_content'],
};
export interface EmergencyContact { id: string; name: string; phone: string; description: string; priority: 'Emergency' | 'Urgent' | 'Standard'; is24x7: boolean; residentVisible: boolean; guardVisible: boolean; active: boolean }
export interface BrandingSettings { campusImageFileId: string | null; campusTitle: string; campusDescription: string; accent: 'forest' | 'blue' | 'plum'; officePhone: string; officeEmail: string; officeHours: string; officeOpenTime?: string; officeCloseTime?: string }
export interface PublicSocietySettings { organizationId: string; name: string; address: string; profile: { registrationNumber: string; currencyCode: CurrencyCode }; branding: BrandingSettings; emergencyContacts: EmergencyContact[] }
export interface SocietySettings extends PublicSocietySettings { templates: Record<TemplateKey, string> }
export async function getSocietySettings(): Promise<SocietySettings> { return (await apiClient.get<SocietySettings>('/society-settings')).data; }
export async function getPublicSocietySettings(): Promise<PublicSocietySettings> { return (await apiClient.get<PublicSocietySettings>('/society-settings/public')).data; }
export async function saveSocietyProfile(settings: Pick<SocietySettings, 'name' | 'address' | 'profile'>): Promise<SocietySettings> { return (await apiClient.patch<SocietySettings>('/society-settings/profile', { name: settings.name, address: settings.address, ...settings.profile })).data; }
export async function saveBranding(branding: BrandingSettings): Promise<SocietySettings> { return (await apiClient.patch<SocietySettings>('/society-settings/branding', { ...branding, officeEmail: branding.officeEmail || null })).data; }
export async function saveTemplates(templates: SocietySettings['templates']): Promise<SocietySettings> { return (await apiClient.patch<SocietySettings>('/society-settings/templates', templates)).data; }
export async function saveEmergencyContact(contact: Omit<EmergencyContact, 'id'>, id?: string): Promise<SocietySettings> { return id ? (await apiClient.patch<SocietySettings>(`/society-settings/contacts/${id}`, contact)).data : (await apiClient.post<SocietySettings>('/society-settings/contacts', contact)).data; }
export async function deleteEmergencyContact(id: string): Promise<SocietySettings> { return (await apiClient.delete<SocietySettings>(`/society-settings/contacts/${id}`)).data; }
export async function uploadCampusImage(file: File): Promise<{ id: string }> { const form = new FormData(); form.append('file', file); return (await apiClient.post<{ id: string }>('/society-settings/campus-image', form)).data; }
export async function sendTemplateTest(template: TemplateKey, recipientNumber: string): Promise<{ accepted: boolean; messageId?: string }> { return (await apiClient.post('/society-settings/templates/test', { template, recipientNumber })).data; }
