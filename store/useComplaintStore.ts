import { create } from 'zustand';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../types';
import { initialComplaints } from '../lib/mock-data';

const staffMap: Record<string, string> = {
  Plumbing: 'AquaFlow Plumbing AMC',
  Electrical: 'PowerVolt Electrical AMC',
  'Lift/Elevator': 'OTIS Elevator AMC',
  'Lift / Elevator': 'OTIS Elevator AMC',
  Security: 'Head Guard Deshmukh',
  'Security / CCTV': 'Head Guard Deshmukh',
  Parking: 'Security Supervisor',
  'Common Area': 'Voltas Cool Care & Facility Team',
  'Pest Control': 'Super Pest Shield'
};

interface ComplaintState {
  complaints: Complaint[];
  addComplaint: (data: {
    id?: string;
    title: string;
    category: string;
    description: string;
    priority: ComplaintPriority;
    status?: ComplaintStatus;
    createdAt?: string;
    flat?: string;
    raisedBy?: string;
    timeline?: any[];
  }) => Complaint;
  updateComplaintStatus: (id: string, status: ComplaintStatus) => void;
  deleteComplaint: (id: string) => void;
}

export const useComplaintStore = create<ComplaintState>((set) => ({
  complaints: initialComplaints,
  addComplaint: (data) => {
    const newComplaint: Complaint = {
      id: data.id || ('CMP-' + Math.floor(310 + Math.random() * 680)),
      title: data.title,
      category: data.category,
      status: data.status || 'open',
      flat: data.flat || 'A-101',
      raisedBy: data.raisedBy || 'Aarav Sharma',
      raisedAt: data.createdAt || 'Today, Just Now',
      createdAt: data.createdAt || 'Today, Just Now',
      priority: data.priority,
      description: data.description || 'Inspection requested by resident.',
      assignedStaff: staffMap[data.category] || 'Facility Supervisor',
      timeline: data.timeline || [
        { status: 'open', timestamp: 'Today', description: 'Ticket created' }
      ]
    };

    set((state) => ({
      complaints: [newComplaint, ...state.complaints]
    }));

    return newComplaint;
  },
  updateComplaintStatus: (id, status) =>
    set((state) => ({
      complaints: state.complaints.map((c) =>
        c.id === id ? { ...c, status } : c
      )
    })),
  deleteComplaint: (id) =>
    set((state) => ({
      complaints: state.complaints.filter((c) => c.id !== id)
    }))
}));
