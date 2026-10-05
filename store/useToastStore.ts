import { create } from 'zustand';

interface ToastState {
  message: string | null;
  visible: boolean;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  visible: false,
  showToast: (message: string) => {
    set({ message, visible: true });
    setTimeout(() => {
      set({ visible: false });
    }, 2800);
  },
  hideToast: () => set({ visible: false })
}));
