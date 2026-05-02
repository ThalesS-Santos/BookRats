import { usePopupStore } from '../../src/store/usePopupStore';

describe('usePopupStore', () => {
  it('shows a popup with default type info', () => {
    usePopupStore.getState().showPopup({
      title: 'Test Title',
      message: 'Test Message'
    });

    const state = usePopupStore.getState();
    expect(state.visible).toBe(true);
    expect(state.title).toBe('Test Title');
    expect(state.message).toBe('Test Message');
    expect(state.type).toBe('info');
  });

  it('shows a popup with custom type and callbacks', () => {
    const mockConfirm = jest.fn();
    const mockCancel = jest.fn();

    usePopupStore.getState().showPopup({
      title: 'Confirm Action',
      message: 'Are you sure?',
      type: 'confirm',
      onConfirm: mockConfirm,
      onCancel: mockCancel
    });

    const state = usePopupStore.getState();
    expect(state.visible).toBe(true);
    expect(state.type).toBe('confirm');
    expect(state.onConfirm).toBe(mockConfirm);
    expect(state.onCancel).toBe(mockCancel);
  });

  it('hides a popup and resets state', () => {
    usePopupStore.getState().showPopup({ title: 'T', message: 'M' });
    usePopupStore.getState().hidePopup();

    const state = usePopupStore.getState();
    expect(state.visible).toBe(false);
    expect(state.title).toBe('');
    expect(state.onConfirm).toBeNull();
  });
});
