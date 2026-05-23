import React from 'react';

import { render, fireEvent } from '@testing-library/react-native';

import { usePopupStore } from '../../src/store/usePopupStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import CustomPopup from '../../src/ui/components/molecules/CustomPopup';

jest.mock('../../src/store/usePopupStore');
jest.mock('../../src/store/useThemeStore');

describe('CustomPopup Component', () => {
  const mockHidePopup = jest.fn();
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useThemeStore.mockReturnValue({ isDarkMode: false });
  });

  it('renders null if not visible', () => {
    usePopupStore.mockReturnValue({ visible: false });
    const { toJSON } = render(<CustomPopup />);
    expect(toJSON()).toBeNull();
  });

  it('renders correctly with success type', () => {
    usePopupStore.mockReturnValue({
      visible: true,
      title: 'Sucesso',
      message: 'Operação concluída',
      type: 'success',
      hidePopup: mockHidePopup,
    });

    const { getByText } = render(<CustomPopup />);
    expect(getByText('Sucesso')).toBeTruthy();
    expect(getByText('Operação concluída')).toBeTruthy();
    expect(getByText('OK')).toBeTruthy();
  });

  it('renders correctly with error type', () => {
    usePopupStore.mockReturnValue({
      visible: true,
      title: 'Erro',
      message: 'Falhou',
      type: 'error',
      hidePopup: mockHidePopup,
    });

    const { getByText } = render(<CustomPopup />);
    expect(getByText('Erro')).toBeTruthy();
  });

  it('renders correctly with confirm type and handles cancel', () => {
    usePopupStore.mockReturnValue({
      visible: true,
      title: 'Confirmar',
      message: 'Tem certeza?',
      type: 'confirm',
      onCancel: mockOnCancel,
      hidePopup: mockHidePopup,
    });

    const { getByText, getAllByText } = render(<CustomPopup />);
    expect(getByText('Cancelar')).toBeTruthy();
    expect(getAllByText('Confirmar').length).toBe(2); // Title and Button

    fireEvent.press(getByText('Cancelar'));
    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockHidePopup).toHaveBeenCalled();
  });

  it('handles confirm without callback', () => {
    usePopupStore.mockReturnValue({
      visible: true,
      title: 'Info',
      message: 'Informação',
      type: 'info',
      hidePopup: mockHidePopup,
    });

    const { getByText } = render(<CustomPopup />);
    fireEvent.press(getByText('OK'));
    expect(mockHidePopup).toHaveBeenCalled();
  });

  it('handles confirm with callback', () => {
    usePopupStore.mockReturnValue({
      visible: true,
      title: 'Info',
      message: 'Informação',
      type: 'info',
      onConfirm: mockOnConfirm,
      hidePopup: mockHidePopup,
    });

    const { getByText } = render(<CustomPopup />);
    fireEvent.press(getByText('OK'));
    expect(mockOnConfirm).toHaveBeenCalled();
    expect(mockHidePopup).toHaveBeenCalled();
  });

  it('renders in dark mode', () => {
    useThemeStore.mockReturnValue({ isDarkMode: true });
    usePopupStore.mockReturnValue({
      visible: true,
      title: 'Dark',
      message: 'Dark mode',
      type: 'info',
      hidePopup: mockHidePopup,
    });

    const { getByText } = render(<CustomPopup />);
    expect(getByText('Dark')).toBeTruthy();
  });
});
