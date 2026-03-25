import { create } from 'zustand';

export const usePopupStore = create((set) => ({
  visible: false,
  title: '',
  message: '',
  type: 'info', // 'info', 'error', 'success', 'confirm'
  onConfirm: null,
  onCancel: null,

  showPopup: ({ title, message, type = 'info', onConfirm, onCancel }) => set({
    visible: true,
    title,
    message,
    type,
    onConfirm,
    onCancel
  }),

  hidePopup: () => set({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null
  })
}));
