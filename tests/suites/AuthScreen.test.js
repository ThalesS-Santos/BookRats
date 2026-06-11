import React from 'react';

import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import * as Google from 'expo-auth-session/providers/google';

import { useMainStore } from '../../src/core/store';
import { usePopupStore } from '../../src/store/usePopupStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import AuthScreen from '../../src/ui/screens/AuthScreen';

jest.mock('../../src/core/store');
jest.mock('../../src/store/useThemeStore');
jest.mock('../../src/store/usePopupStore');
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(),
}));

describe('AuthScreen', () => {
  const mockSignIn = jest.fn();
  const mockSignUp = jest.fn();
  const mockSignInWithGoogle = jest.fn();
  const mockShowPopup = jest.fn();
  const mockPromptAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useMainStore.mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
      signInWithGoogle: mockSignInWithGoogle,
      loading: false,
      authError: null,
    });
    useThemeStore.mockReturnValue({ isDarkMode: false });
    usePopupStore.mockReturnValue({ showPopup: mockShowPopup });
    Google.useIdTokenAuthRequest.mockReturnValue([
      { request: {} },
      null,
      mockPromptAsync,
    ]);
  });

  it('renders correctly in login mode', () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);
    expect(getByText('Bem-vindo de volta, leitor!')).toBeTruthy();
    expect(getByPlaceholderText('seu@email.com')).toBeTruthy();
    expect(getByText('Entrar')).toBeTruthy();
  });

  it('does not trigger Google prompt while request is not ready', () => {
    Google.useIdTokenAuthRequest.mockReturnValue([null, null, mockPromptAsync]);
    const { getByText } = render(<AuthScreen />);
    fireEvent.press(getByText('Google'));
    expect(mockPromptAsync).not.toHaveBeenCalled();
  });

  it('toggles to register mode', () => {
    const { getByText } = render(<AuthScreen />);
    fireEvent.press(getByText('Cadastre-se'));
    expect(getByText('Comece sua jornada literária')).toBeTruthy();
    expect(getByText('Criar Conta')).toBeTruthy();
    expect(getByText(/Ao criar uma conta/)).toBeTruthy();
  });

  it('shows and hides password', () => {
    const { getByTestId, getByPlaceholderText } = render(<AuthScreen />);
    const passwordInput = getByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInput, 'secret123');

    expect(passwordInput.props.secureTextEntry).toBe(true);

    const toggleButton = getByTestId('password-toggle');
    fireEvent.press(toggleButton);
    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('validates email on auth', async () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);
    fireEvent.changeText(
      getByPlaceholderText('seu@email.com'),
      'invalid-email',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), '123456');

    fireEvent.press(getByText('Entrar'));
    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Por favor, insira um e-mail válido.',
      }),
    );
  });

  it('validates password length on auth', async () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);
    fireEvent.changeText(
      getByPlaceholderText('seu@email.com'),
      'test@test.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), '12345');

    fireEvent.press(getByText('Entrar'));
    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'A senha deve ter pelo menos 6 caracteres.',
      }),
    );
  });

  it('calls signIn in login mode', async () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);
    fireEvent.changeText(
      getByPlaceholderText('seu@email.com'),
      'test@test.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), '123456');

    fireEvent.press(getByText('Entrar'));
    expect(mockSignIn).toHaveBeenCalledWith('test@test.com', '123456');
  });

  it('calls signUp in register mode', async () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);
    fireEvent.press(getByText('Cadastre-se'));

    fireEvent.changeText(getByPlaceholderText('seu@email.com'), 'new@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');

    fireEvent.press(getByText('Criar Conta'));
    expect(mockSignUp).toHaveBeenCalledWith('new@test.com', 'password123');
  });

  it('calls promptAsync for Google login', () => {
    const { getByText } = render(<AuthScreen />);
    fireEvent.press(getByText('Google'));
    expect(mockPromptAsync).toHaveBeenCalled();
  });

  it('handles Google success response', async () => {
    Google.useIdTokenAuthRequest.mockReturnValue([
      { request: {} },
      { type: 'success', params: { id_token: 'fake-token' } },
      mockPromptAsync,
    ]);

    render(<AuthScreen />);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledWith('fake-token');
    });
  });

  it('does not call Google sign-in when response is not success', async () => {
    Google.useIdTokenAuthRequest.mockReturnValue([
      { request: {} },
      { type: 'cancel' },
      mockPromptAsync,
    ]);

    render(<AuthScreen />);

    await waitFor(() => {
      expect(mockSignInWithGoogle).not.toHaveBeenCalled();
    });
  });

  it('renders loading state', () => {
    useMainStore.mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
      signInWithGoogle: mockSignInWithGoogle,
      loading: true,
      authError: null,
    });

    const { getByTestId } = render(<AuthScreen />);
    // BookLoader is inside the button. It has testID="book-loader-container" from previous edit.
    expect(getByTestId('book-loader-container')).toBeTruthy();
  });

  it('validates on register mode before sign-up', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AuthScreen />,
    );
    fireEvent.press(getByText('Cadastre-se'));
    fireEvent.changeText(getByPlaceholderText('seu@email.com'), 'bad');
    fireEvent.changeText(getByTestId('password-input'), '123456');

    fireEvent.press(getByText('Criar Conta'));

    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Aviso',
      }),
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('renders in dark mode', () => {
    useThemeStore.mockReturnValue({ isDarkMode: true });
    const { getByText } = render(<AuthScreen />);
    expect(getByText(/BOOK/)).toBeTruthy();
  });
});
