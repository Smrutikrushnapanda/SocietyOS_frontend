import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'loading' | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  title?: string;
}

interface ToastState {
  message: string | null;
  title: string | null;
  type: ToastType;
  visible: boolean;
  duration: number;
  showToast: (
    message: string,
    typeOrOptions?: ToastType | ToastOptions,
    duration?: number,
  ) => void;
  hideToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function inferType(message: string): ToastType {
  const m = (message || '').toLowerCase();
  if (
    m.includes('fail') ||
    m.includes('error') ||
    m.includes('cannot') ||
    m.includes('denied') ||
    m.includes('reject') ||
    m.includes('invalid') ||
    m.includes('required') ||
    m.includes('forbidden') ||
    m.includes('please ') ||
    m.includes('not found')
  ) {
    return 'error';
  }
  if (
    m.includes('loading') ||
    m.includes('saving') ||
    m.includes('uploading') ||
    m.includes('generating') ||
    m.includes('processing') ||
    m.includes('creating...') ||
    m.includes('updating...')
  ) {
    return 'loading';
  }
  return 'success';
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  title: null,
  type: 'success',
  visible: false,
  duration: 3800,
  showToast: (
    message: string,
    typeOrOptions?: ToastType | ToastOptions,
    durationParam?: number,
  ) => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    let resolvedType: ToastType;
    let resolvedDuration = durationParam ?? 3800;
    let resolvedTitle: string | null = null;

    if (typeof typeOrOptions === 'string') {
      resolvedType = typeOrOptions;
    } else if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
      resolvedType = typeOrOptions.type ?? inferType(message);
      if (typeOrOptions.duration !== undefined) resolvedDuration = typeOrOptions.duration;
      if (typeOrOptions.title !== undefined) resolvedTitle = typeOrOptions.title;
    } else {
      resolvedType = inferType(message);
    }

    set({
      message,
      title: resolvedTitle,
      type: resolvedType,
      visible: true,
      duration: resolvedDuration,
    });

    // Loading toasts stay visible until explicitly hidden/replaced unless duration is specified
    const hasExplicitDuration =
      durationParam !== undefined ||
      (typeof typeOrOptions === 'object' && typeOrOptions?.duration !== undefined);

    if (resolvedType !== 'loading' || hasExplicitDuration) {
      toastTimer = setTimeout(() => {
        set({ visible: false });
        toastTimer = null;
      }, resolvedDuration);
    }
  },
  hideToast: () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    set({ visible: false });
  },
}));

export const toast = {
  success: (msg: string, duration?: number) =>
    useToastStore.getState().showToast(msg, 'success', duration),
  error: (msg: string, duration?: number) =>
    useToastStore.getState().showToast(msg, 'error', duration),
  loading: (msg: string) =>
    useToastStore.getState().showToast(msg, 'loading'),
  info: (msg: string, duration?: number) =>
    useToastStore.getState().showToast(msg, 'info', duration),
  hide: () =>
    useToastStore.getState().hideToast(),
};
