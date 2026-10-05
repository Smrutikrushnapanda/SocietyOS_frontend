import { create } from 'zustand';
import { PreApprovedPass, PaymentReceipt } from '../types';

export type ModalType =
  | 'qrGatePass'
  | 'preApproveGuest'
  | 'qrPassCard'
  | 'raiseComplaint'
  | 'amenitiesBooking'
  | 'upiPayment'
  | 'receipt'
  | 'notifications'
  | 'profileSettings'
  | 'residentDocuments'
  | null;

interface ModalState {
  activeModal: ModalType;
  qrPassData: PreApprovedPass | null;
  receiptData: PaymentReceipt | null;
  openModal: (modal: ModalType, payload?: any) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  activeModal: null,
  qrPassData: null,
  receiptData: null,
  openModal: (modal, payload) => {
    if (modal === 'qrPassCard') {
      set({ activeModal: modal, qrPassData: payload || null });
    } else if (modal === 'receipt') {
      set({ activeModal: modal, receiptData: payload || null });
    } else {
      set({ activeModal: modal });
    }
  },
  closeModal: () =>
    set({
      activeModal: null,
      qrPassData: null,
      receiptData: null
    })
}));
