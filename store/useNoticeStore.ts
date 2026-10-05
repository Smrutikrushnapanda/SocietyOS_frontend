import { create } from 'zustand';
import { Notice } from '../types';
import { initialNotices } from '../lib/mock-data';

interface NoticeState {
  notices: Notice[];
  addNotice: (notice: Notice) => void;
  deleteNotice: (id: string) => void;
}

export const useNoticeStore = create<NoticeState>((set) => ({
  notices: initialNotices,
  addNotice: (notice) =>
    set((state) => ({ notices: [notice, ...state.notices] })),
  deleteNotice: (id) =>
    set((state) => ({ notices: state.notices.filter((n) => n.id !== id) }))
}));
