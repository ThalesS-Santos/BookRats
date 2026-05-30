import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { useMainStore } from '@core/store';
import { CustomPopup } from '@ui/components';
import AuthScreen from '@ui/screens/AuthScreen';

// Mocking Navigation as required by components using useNavigation or similar context
const componentWrapper = ({ children }) => (
  <NavigationContainer>
    {children}
    <CustomPopup />
  </NavigationContainer>
);

describe('Auth Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure store is not in loading state so buttons are rendered
    useMainStore.setState({ loading: false, user: null, authError: null });
  });

  it('Scenario 1: should trigger successful login flow when credentials are valid', async () => {
    const { getByPlaceholderText, getByText } = render(<AuthScreen />, {
      wrapper: componentWrapper,
    });

    const emailInput = getByPlaceholderText('seu@email.com');
    const passwordInput = getByPlaceholderText('••••••••');
    const loginButton = getByText('Entrar');

    fireEvent.changeText(emailInput, 'test@bookrats.com');
    fireEvent.changeText(passwordInput, 'password123');

    await act(async () => {
      fireEvent.press(loginButton);
    });

    // Verify if Firebase Auth was called correctly
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@bookrats.com',
      'password123',
    );
  });

  it('Scenario 2: should hide "Entrar" text and show loading indicator during authentication', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <AuthScreen />,
      { wrapper: componentWrapper },
    );

    fireEvent.changeText(
      getByPlaceholderText('seu@email.com'),
      'test@bookrats.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');

    // Trigger auth
    fireEvent.press(getByText('Entrar'));

    // Assert that the button text "Entrar" disappears because loading: true triggers BookLoader
    await waitFor(() => {
      expect(queryByText('Entrar')).toBeNull();
    });
  });

  it('Scenario 3: should display CustomPopup with the safe mapped error message on authentication failure', async () => {
    // Override the firebase mock to reject with a specific code
    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/wrong-password',
      message: 'Firebase: Error (auth/wrong-password).',
    });

    const { getByPlaceholderText, getByText, findByText } = render(
      <AuthScreen />,
      { wrapper: componentWrapper },
    );

    fireEvent.changeText(
      getByPlaceholderText('seu@email.com'),
      'test@bookrats.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrong-pass');

    fireEvent.press(getByText('Entrar'));

    // Check if CustomPopup shows the title from store AND the mapped message from errorMapper
    expect(await findByText('Erro no Login')).toBeTruthy();

    // Using waitFor to ensure UI update is complete
    await waitFor(() => {
      expect(
        getByText(
          'E-mail não cadastrado ou senha incorreta. Se não tem uma conta, cadastre-se!',
        ),
      ).toBeTruthy();
    });
  });

  it('UX Validation: should not trigger API call with invalid email or short password', async () => {
    const { getByPlaceholderText, getByText } = render(<AuthScreen />, {
      wrapper: componentWrapper,
    });

    // Case 1: Invalid email
    fireEvent.changeText(
      getByPlaceholderText('seu@email.com'),
      'invalid-email',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), '123456');
    fireEvent.press(getByText('Entrar'));

    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();

    // Case 2: Short password
    fireEvent.changeText(
      getByPlaceholderText('seu@email.com'),
      'test@valid.com',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), '123');
    fireEvent.press(getByText('Entrar'));

    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });
});
