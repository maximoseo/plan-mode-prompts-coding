import { useState, useEffect } from 'react';

export type ToastVariant = 'default' | 'destructive' | 'success';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

let count = 0;

function genId(): string {
  count += 1;
  return `toast-${Date.now()}-${count}`;
}

const listeners: Set<() => void> = new Set();

let memoryState: ToastState = { toasts: [] };

function dispatch(action: (state: ToastState) => ToastState) {
  memoryState = action(memoryState);
  listeners.forEach((listener) => listener());
}

function addToast(toast: Omit<Toast, 'id'>): string {
  const id = genId();
  const duration = toast.duration ?? 5000;

  dispatch((state) => ({
    toasts: [...state.toasts, { ...toast, id }],
  }));

  if (duration > 0) {
    setTimeout(() => dismiss(id), duration);
  }

  return id;
}

function dismiss(toastId?: string) {
  dispatch((state) => ({
    toasts: state.toasts.filter(
      (t) => t.id !== toastId
    ),
  }));
}

export function toast(props: Omit<Toast, 'id'>) {
  return addToast(props);
}

export function useToast() {
  const [state, setState] = useState<ToastState>(memoryState);

  useEffect(() => {
    const handler = () => setState(memoryState);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  };
}
