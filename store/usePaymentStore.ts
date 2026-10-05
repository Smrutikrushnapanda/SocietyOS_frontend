import { create } from 'zustand';
import { MaintenanceDue, InvoiceItem, PaymentReceipt, FlatDueRecord, LedgerTransaction } from '../types';
import { initialMaintenanceDue, initialInvoiceBreakdown } from '../lib/mock-data';

const initialDuesList: FlatDueRecord[] = [
  { flat: 'A-101', residentName: 'Aarav Sharma', billingPeriod: 'Sep 2026', amountDue: 4500, amountPaid: 4500, status: 'paid' },
  { flat: 'A-102', residentName: 'Priya Mukherjee', billingPeriod: 'Sep 2026', amountDue: 4500, amountPaid: 4500, status: 'paid' },
  { flat: 'A-201', residentName: 'Deepak Verma', billingPeriod: 'Sep 2026', amountDue: 5800, amountPaid: 5800, status: 'paid' },
  { flat: 'A-202', residentName: 'Ananya Iyer', billingPeriod: 'Sep 2026', amountDue: 5800, amountPaid: 5800, status: 'paid' },
  { flat: 'A-301', residentName: 'Vikram Mehta', billingPeriod: 'Sep 2026', amountDue: 4500, amountPaid: 0, status: 'unpaid' },
  { flat: 'A-302', residentName: 'Sunita Joshi', billingPeriod: 'Sep 2026', amountDue: 4500, amountPaid: 2000, status: 'partial' },
  { flat: 'B-303', residentName: 'Meera Rao', billingPeriod: 'Sep 2026', amountDue: 5800, amountPaid: 5800, status: 'paid' },
  { flat: 'B-501', residentName: 'Aditya Birla', billingPeriod: 'Sep 2026', amountDue: 8500, amountPaid: 8500, status: 'paid' }
];

const initialLedgerList: LedgerTransaction[] = [
  { date: '10 Sep 2026', reference: 'TXN-991204', type: 'credit', description: 'Maintenance Payment via UPI Auto-Pay', debit: undefined, credit: 4500, balance: 0, flat: 'A-101' },
  { date: '01 Sep 2026', reference: 'INV-SEP-101', type: 'debit', description: 'September 2026 Maintenance Assessment', debit: 4500, credit: undefined, balance: 4500, flat: 'A-101' },
  { date: '05 Aug 2026', reference: 'TXN-884920', type: 'credit', description: 'August Maintenance via PhonePe', debit: undefined, credit: 4500, balance: 0, flat: 'A-101' }
];

interface PaymentState {
  maintenanceDue: MaintenanceDue;
  invoiceBreakdown: InvoiceItem[];
  receipts: PaymentReceipt[];
  dues: FlatDueRecord[];
  ledger: LedgerTransaction[];
  whatsappBillingOptIn: boolean;
  toggleWhatsAppBilling: () => void;
  payWithUpi: (app: string) => PaymentReceipt;
  recordPayment: (flat: string, amount: number, method: string) => void;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  maintenanceDue: initialMaintenanceDue,
  invoiceBreakdown: initialInvoiceBreakdown,
  dues: initialDuesList,
  ledger: initialLedgerList,
  receipts: [
    {
      receiptNo: 'RCPT-2026-0819',
      flat: 'A-101',
      residentName: 'Aarav Sharma',
      amount: 4500,
      date: '2026-08-05',
      method: 'UPI (PhonePe)',
      period: 'August 2026',
      refNo: 'TXN-UPI-8849201'
    }
  ],
  whatsappBillingOptIn: true,
  toggleWhatsAppBilling: () =>
    set((state) => ({ whatsappBillingOptIn: !state.whatsappBillingOptIn })),

  payWithUpi: (app: string) => {
    const state = get();
    const currentDue = state.maintenanceDue;
    const amountToPay = currentDue.due - currentDue.paid;
    const receiptNo = 'RCPT-2026-09' + Math.floor(10 + Math.random() * 89);
    const refNo = 'TXN-UPI-' + Math.floor(100000 + Math.random() * 900000);

    const newReceipt: PaymentReceipt = {
      receiptNo,
      flat: currentDue.flat,
      residentName: 'Aarav Sharma',
      amount: amountToPay > 0 ? amountToPay : currentDue.due,
      date: new Date().toISOString().split('T')[0],
      method: `UPI (${app})`,
      period: currentDue.period,
      refNo
    };

    set({
      maintenanceDue: {
        ...currentDue,
        paid: currentDue.due,
        status: 'paid'
      },
      receipts: [newReceipt, ...state.receipts]
    });

    return newReceipt;
  },

  recordPayment: (flat: string, amount: number, method: string) => {
    set((state) => ({
      dues: state.dues.map((d) =>
        d.flat === flat ? { ...d, amountPaid: d.amountDue, status: 'paid' as const } : d
      ),
      ledger: [
        {
          date: 'Today',
          reference: 'TXN-ADMIN-' + Math.floor(1000 + Math.random() * 9000),
          type: 'credit',
          description: `Manual Payment Recorded (${method})`,
          credit: amount,
          balance: 0,
          flat
        },
        ...state.ledger
      ]
    }));
  }
}));
