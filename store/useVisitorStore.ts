import { create } from 'zustand';
import { Visitor, PreApprovedPass, VisitorStatus } from '../types';
import { initialVisitors, initialPreApprovedPasses } from '../lib/mock-data';

interface VisitorState {
  visitors: Visitor[];
  preApprovedPasses: PreApprovedPass[];
  filter: string;
  setFilter: (filter: string) => void;
  approveVisitor: (id: string) => void;
  denyVisitor: (id: string) => void;
  rejectVisitor: (id: string) => void;
  checkInVisitor: (id: string) => void;
  checkOutVisitor: (id: string) => void;
  addVisitor: (visitor: Visitor) => void;
  createPreApprovedPass: (data: Partial<PreApprovedPass>) => PreApprovedPass;
  getPassByCodeOrName: (query: string) => PreApprovedPass | undefined;
}

export const useVisitorStore = create<VisitorState>((set, get) => ({
  visitors: initialVisitors,
  preApprovedPasses: initialPreApprovedPasses,
  filter: 'all',
  setFilter: (filter) => set({ filter }),
  
  approveVisitor: (id) =>
    set((state) => ({
      visitors: state.visitors.map((v) =>
        v.id === id
          ? { ...v, status: 'approved' as VisitorStatus, approvedAt: 'Just now' }
          : v
      )
    })),

  denyVisitor: (id) =>
    set((state) => ({
      visitors: state.visitors.map((v) =>
        v.id === id ? { ...v, status: 'denied' as VisitorStatus } : v
      )
    })),

  rejectVisitor: (id) =>
    set((state) => ({
      visitors: state.visitors.map((v) =>
        v.id === id ? { ...v, status: 'denied' as VisitorStatus } : v
      )
    })),

  checkInVisitor: (id) =>
    set((state) => ({
      visitors: state.visitors.map((v) =>
        v.id === id
          ? { ...v, status: 'checked-in' as VisitorStatus, entryTime: 'Just now', checkedInAt: 'Just now' }
          : v
      )
    })),

  checkOutVisitor: (id) =>
    set((state) => ({
      visitors: state.visitors.map((v) =>
        v.id === id
          ? { ...v, status: 'checked-out' as VisitorStatus, exitTime: 'Just now', checkedOutAt: 'Just now' }
          : v
      )
    })),

  addVisitor: (visitor) =>
    set((state) => ({
      visitors: [visitor, ...state.visitors]
    })),

  createPreApprovedPass: (data) => {
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const passCode = 'GP-' + codeNum;
    const startDate = data.startDate || new Date().toISOString().split('T')[0];
    const endDate = data.endDate || new Date().toISOString().split('T')[0];

    const newPass: PreApprovedPass = {
      id: passCode,
      passCode: passCode,
      guestName: data.guestName || 'Guest',
      phone: data.phone || '+91 98000 00000',
      purpose: data.purpose || 'Family / Friend',
      flat: data.flat || 'A-101',
      resident: data.resident || 'Aarav Sharma',
      startDate,
      startTime: data.startTime || '10:00 AM',
      endDate,
      endTime: data.endTime || '11:59 PM',
      validityDisplay:
        data.validityDisplay || `${startDate} to ${endDate}`,
      gate: data.gate || 'All Gates (Gate 01 & 02)',
      vehicleNo: data.vehicleNo || null,
      status: 'Active',
      createdAt: 'Just Now',
      qrToken: `SOC-PASS-${passCode}-${data.flat || 'A101'}-SEC99`
    };

    const newVisitor: Visitor = {
      id: 'VIS-' + Math.floor(1100 + Math.random() * 800),
      name: newPass.guestName,
      phone: newPass.phone,
      purpose: newPass.purpose,
      flat: newPass.flat,
      status: 'approved',
      requestedAt: 'Pre-Approved',
      approvedAt: 'Pre-Approved by Resident',
      vehicleNo: newPass.vehicleNo,
      notifiedViaWhatsApp: true,
      passCode: passCode,
      passcode: passCode
    };

    set((state) => ({
      preApprovedPasses: [newPass, ...state.preApprovedPasses],
      visitors: [newVisitor, ...state.visitors]
    }));

    return newPass;
  },

  getPassByCodeOrName: (query) => {
    const q = query.trim().toLowerCase();
    const state = get();
    return state.preApprovedPasses.find(
      (p) =>
        p.passCode.toLowerCase() === q ||
        p.guestName.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }
}));
