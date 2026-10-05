export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface MaintenanceDue {
  flat: string;
  due: number;
  paid: number;
  period: string;
  dueDate: string;
  status: PaymentStatus;
}

export interface FlatDueRecord {
  flat: string;
  residentName: string;
  billingPeriod: string;
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
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
