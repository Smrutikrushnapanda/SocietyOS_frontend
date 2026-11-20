export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface MaintenanceDue {
  id?: string;
  flat: string;
  due: number;
  paid: number;
  period: string;
  dueDate: string;
  status: PaymentStatus;
  originalAmount?: number;
  lateCharge?: number;
  lateChargeWaived?: number;
  backendStatus?: 'PENDING' | 'OVERDUE' | 'PAID';
}

export interface FlatDueRecord {
  id?: string;
  flat: string;
  residentName: string;
  billingPeriod: string;
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
  lateCharge?: number;
}

export interface LedgerTransaction {
  date: string;
  reference: string;
  type: 'credit' | 'debit';
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
  flat?: string;
  status?: string;
}

export interface InvoiceItem {
  title: string;
  amount: number;
}

export interface PaymentReceipt {
  receiptNo: string;
  flat: string;
  residentName: string;
  amount: number;
  date: string;
  method: string;
  period: string;
  refNo: string;
}
