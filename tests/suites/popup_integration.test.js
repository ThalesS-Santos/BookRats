import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { useMainStore } from '@core/store';
import { CustomPopup } from '@ui/components';
import AuthScreen from '@ui/screens/AuthScreen';

import { usePopupStore } from '../../src/store/usePopupStore';

// Wrapper for components using context
const componentWrapper = ({ children }) => (
  <NavigationContainer>{children}</NavigationContainer>
);

describe('Popup Integration Flow', () => {
  beforeEach(() => {
    // Isolated State Clean-up
    act(() => {
      usePopupStore.getState().hidePopup();
      useMainStore.setState({ loading: false, authError: null });
    });
    jest.clearAllMocks();
  });

  it('Scenario 1: should reactively display popup when store is triggered programmatically', async () => {
    const { findByText } = render(<CustomPopup />);

    act(() => {
      usePopupStore.getState().showPopup({
        title: 'Sucesso',
        message: 'Livro Adicionado!',
        type: 'success',
      });
    });

    expect(await findByText('Sucesso')).toBeTruthy();
    expect(await findByText('Livro Adicionado!')).toBeTruthy();
  });

  it('Scenario 2: should hide popup and update store when user presses "OK"', async () => {
    const { getByText, queryByText } = render(<CustomPopup />);

    act(() => {
      usePopupStore.getState().showPopup({
        title: 'Atenção',
        message: 'Deseja continuar?',
        type: 'info',
      });
    });

    const okButton = getByText('OK');
    fireEvent.press(okButton);

    // Assert UI disappearance
    await waitFor(() => {
      expect(queryByText('Atenção')).toBeNull();
    });

    // Assert Store state
    expect(usePopupStore.getState().visible).toBe(false);
  });

  it('Scenario 3: Cross-Component Integration (Auth Error Flow)', async () => {
    // Override Firebase to reject with a mapped error
    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/wrong-password',
      message: 'Firebase: Error (auth/wrong-password).',
    });

    const { getByPlaceholderText, getByText, findByText } = render(
      <NavigationContainer>
        <AuthScreen />
        <CustomPopup />
      </NavigationContainer>,
    );

    // Simulate failed login
    fireEvent.changeText(
      getByPlaceholderText('seu@email.com'),
      'test@bookrats.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrong-pass');
    fireEvent.press(getByText('Entrar'));

    // Assert the CustomPopup displays the correctly mapped message
    // mapped from 'auth/wrong-password' -> 'E-mail ou senha incorretos.'
    expect(await findByText('Erro no Login')).toBeTruthy();
    expect(await findByText('E-mail ou senha incorretos.')).toBeTruthy();
  });

  it('Scenario 4: Handling Overwrites (Consecutive Triggers)', async () => {
    const { findByText, queryByText } = render(<CustomPopup />);

    act(() => {
      usePopupStore.getState().showPopup({
        title: 'Primeiro Popup',
        message: 'Esta mensagem deve ser sobreposta',
      });
    });

    expect(await findByText('Primeiro Popup')).toBeTruthy();

    act(() => {
      usePopupStore.getState().showPopup({
        title: 'Segundo Popup',
        message: 'Nova mensagem visível',
      });
    });

    // Verify overwrite
    expect(await findByText('Segundo Popup')).toBeTruthy();
    expect(queryByText('Primeiro Popup')).toBeNull();
  });
});
