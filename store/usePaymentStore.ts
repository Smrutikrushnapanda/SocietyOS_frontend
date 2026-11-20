import { residentPreview } from '../lib/api/resident-feeds.api';
import { create } from 'zustand';
import {
  MaintenanceDue,
  InvoiceItem,
  PaymentReceipt,
  FlatDueRecord,
  LedgerTransaction,
} from '../types';
import {
  BackendMaintenanceDue,
  BackendPayment,
  BackendMaintenanceConfiguration,
  getMyMaintenanceDues,
  getOrganizationDues,
  getOrganizationPayments,
  getMaintenanceConfiguration,
  markDuePaid,
  markDueOverdue,
  waiveLateCharge,
  createPaymentRecord,
} from '../lib/api/maintenance.api';
import { ApiError } from '../lib/api/client';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';
import { useAuthStore } from './useAuthStore';

export interface PaymentState {
  // Resident view state
  maintenanceDue: MaintenanceDue | null;
  residentDues: BackendMaintenanceDue[];
  residentPayments: BackendPayment[];
  receipts: PaymentReceipt[];
  isLoadingResidentDues: boolean;
  isLoadingResidentPayments: boolean;
  residentError: string | null;
  hasLoadedResidentDues: boolean;
  hasLoadedResidentPayments: boolean;

  // Admin view state
  adminDues: BackendMaintenanceDue[];
  adminPayments: BackendPayment[];
  maintenanceConfig: BackendMaintenanceConfiguration | null;
  isLoadingAdminData: boolean;
  adminError: string | null;
  hasLoadedAdminData: boolean;

  // Invoice & Settings
  invoiceBreakdown: InvoiceItem[];
  dues: FlatDueRecord[];
  ledger: LedgerTransaction[];
  whatsappBillingOptIn: boolean;

  // Actions
  toggleWhatsAppBilling: () => void;
  loadResidentDues: () => Promise<void>;
  loadResidentPayments: () => Promise<void>;
  loadAdminFinance: () => Promise<void>;
  adminMarkDuePaid: (dueId: string) => Promise<void>;
  adminMarkDueOverdue: (dueId: string) => Promise<void>;
  adminWaiveLateCharge: (dueId: string, reason?: string, stopFutureCharges?: boolean) => Promise<void>;
  adminRecordPayment: (payload: {
    maintenance_due_id: string;
    amount: number;
    payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
    resident_id?: string;
    flat_id?: string;
  }) => Promise<void>;
  reset: () => void;
}

function formatPeriod(dateStr?: string | Date): string {
  if (!dateStr) return 'Current';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function formatDate(dateStr?: string | Date): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  maintenanceDue: null,
  residentDues: [],
  residentPayments: [],
  receipts: [],
  isLoadingResidentDues: false,
  isLoadingResidentPayments: false,
  residentError: null,
  hasLoadedResidentDues: false,
  hasLoadedResidentPayments: false,

  adminDues: [],
  adminPayments: [],
  maintenanceConfig: null,
  isLoadingAdminData: false,
  adminError: null,
  hasLoadedAdminData: false,

  invoiceBreakdown: [],
  dues: [],
  ledger: [],
  whatsappBillingOptIn: true,

  toggleWhatsAppBilling: () =>
    set((state) => ({ whatsappBillingOptIn: !state.whatsappBillingOptIn })),

  loadResidentDues: async () => {
    set({ isLoadingResidentDues: true, residentError: null });
    try {
      const backendDues = await getMyMaintenanceDues();
      // Primary due is the active/unpaid due or the latest due
      const primaryDue =
        backendDues.find((d) => d.status === 'PENDING' || d.status === 'OVERDUE') ??
        backendDues[0] ??
        null;

      let mappedDue: MaintenanceDue | null = null;
      let breakdown: InvoiceItem[] = [];

      if (primaryDue) {
        const totalPayable = Number(primaryDue.calculated_amount) + Number(primaryDue.late_charge) - Number(primaryDue.late_charge_waived);
        const isPaid = primaryDue.status === 'PAID';
        const paidAmount = isPaid ? totalPayable : 0;

        mappedDue = {
          id: primaryDue.id,
          flat: primaryDue.flat_id ? `Flat ${primaryDue.flat_id.slice(0, 5)}` : 'Assigned Unit',
          due: totalPayable,
          paid: paidAmount,
          period: formatPeriod(primaryDue.billing_period_start),
          dueDate: formatDate(primaryDue.due_date),
          status: isPaid ? 'paid' : (primaryDue.status === 'OVERDUE' ? 'unpaid' : 'unpaid'),
          originalAmount: Number(primaryDue.calculated_amount),
          lateCharge: Number(primaryDue.late_charge),
          lateChargeWaived: Number(primaryDue.late_charge_waived),
          backendStatus: primaryDue.status,
        };

        breakdown = [
          {
            title: 'Base Maintenance Charge',
            amount: Number(primaryDue.base_maintenance_amount) || Number(primaryDue.calculated_amount),
          },
        ];
        if (Number(primaryDue.late_charge) > 0) {
          breakdown.push({
            title: 'Late Payment Surcharge',
            amount: Number(primaryDue.late_charge),
          });
        }
        if (Number(primaryDue.late_charge_waived) > 0) {
          breakdown.push({
            title: 'Late Charge Waived',
            amount: -Number(primaryDue.late_charge_waived),
          });
        }
      }

      set({
        residentDues: backendDues,
        maintenanceDue: mappedDue,
        invoiceBreakdown: breakdown,
        isLoadingResidentDues: false,
        hasLoadedResidentDues: true,
      });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.backendMessage || 'Failed to load maintenance dues.'
          : err instanceof Error
          ? err.message
          : 'Failed to load maintenance dues.';
      set({
        residentDues: [],
        maintenanceDue: null,
        invoiceBreakdown: [],
        residentError: message,
        isLoadingResidentDues: false,
        hasLoadedResidentDues: true,
      });
    }
  },

  loadResidentPayments: async () => {
    set({ isLoadingResidentPayments: true, residentError: null });
    try {
      const payments = await residentPreview<BackendPayment>('/maintenance/payments/my/page');
      const receipts: PaymentReceipt[] = payments.map((p) => ({
        receiptNo: `RCPT-${p.id.slice(0, 8).toUpperCase()}`,
        flat: p.flat_id ? `Flat ${p.flat_id.slice(0, 5)}` : 'Assigned Unit',
        residentName: 'Self',
        amount: Number(p.amount),
        date: formatDate(p.payment_date),
        method: p.payment_method,
        period: formatPeriod(p.payment_date),
        refNo: p.transaction_id || `INT-${p.id.slice(0, 8).toUpperCase()}`,
      }));

      set({
        residentPayments: payments,
        receipts,
        isLoadingResidentPayments: false,
        hasLoadedResidentPayments: true,
      });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.backendMessage || 'Failed to load payment history.'
          : err instanceof Error
          ? err.message
          : 'Failed to load payment history.';
      set({
        residentError: message,
        isLoadingResidentPayments: false,
        hasLoadedResidentPayments: true,
      });
    }
  },

  loadAdminFinance: async () => {
    set({ isLoadingAdminData: true, adminError: null });
    try {
      const [dues, payments, config] = await Promise.all([
        getOrganizationDues().catch(() => [] as BackendMaintenanceDue[]),
        getOrganizationPayments().catch(() => [] as BackendPayment[]),
        getMaintenanceConfiguration().catch(() => null),
      ]);

      const flatDuesList: FlatDueRecord[] = dues.map((d) => {
        const total = Number(d.calculated_amount) + Number(d.late_charge) - Number(d.late_charge_waived);
        const isPaid = d.status === 'PAID';
        return {
          id: d.id,
          flat: d.flat_id ? d.flat_id.slice(0, 6) : 'Unit',
          residentName: 'Resident',
          billingPeriod: formatPeriod(d.billing_period_start),
          amountDue: total,
          amountPaid: isPaid ? total : 0,
          status: isPaid ? 'paid' : 'unpaid',
          lateCharge: Math.max(0, Number(d.late_charge) - Number(d.late_charge_waived)),
        };
      });

      const ledgerList: LedgerTransaction[] = payments.map((p) => ({
        date: formatDate(p.payment_date),
        reference: p.transaction_id || `TXN-${p.id.slice(0, 8).toUpperCase()}`,
        type: 'credit',
        description: `Payment via ${p.payment_method} (${p.payment_status})`,
        credit: Number(p.amount),
        balance: 0,
        flat: p.flat_id ? p.flat_id.slice(0, 6) : undefined,
        status: p.payment_status,
      }));

      set({
        adminDues: dues,
        adminPayments: payments,
        maintenanceConfig: config,
        dues: flatDuesList,
        ledger: ledgerList,
        isLoadingAdminData: false,
        hasLoadedAdminData: true,
      });
    } catch (err: unknown) {
      const message = getUserFriendlyErrorMessage(err, 'Failed to load finance data.');
      set({
        adminError: message,
        isLoadingAdminData: false,
        hasLoadedAdminData: true,
      });
    }
  },

  adminMarkDuePaid: async (dueId: string) => {
    await markDuePaid(dueId);
    await get().loadAdminFinance();
  },

  adminMarkDueOverdue: async (dueId: string) => {
    await markDueOverdue(dueId);
    await get().loadAdminFinance();
  },

  adminWaiveLateCharge: async (dueId: string, reason?: string, stopFutureCharges = true) => {
    await waiveLateCharge(dueId, { reason, stop_future_charges: stopFutureCharges });
    await get().loadAdminFinance();
  },

  adminRecordPayment: async (payload) => {
    const orgId = typeof window !== 'undefined' ? (window as any).__ACTIVE_ORG_ID__ || '' : '';
    await createPaymentRecord({
      organization_id: orgId,
      ...payload,
    });
    await get().loadAdminFinance();
  },

  reset: () =>
    set({
      residentDues: [],
      residentPayments: [],
      adminDues: [],
      adminPayments: [],
      maintenanceConfig: null,
      isLoadingResidentDues: false,
      isLoadingResidentPayments: false,
      isLoadingAdminData: false,
      residentError: null,
      adminError: null,
      hasLoadedResidentDues: false,
      hasLoadedResidentPayments: false,
      hasLoadedAdminData: false,
    }),
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId) {
      usePaymentStore.getState().reset();
    }
  });
}
