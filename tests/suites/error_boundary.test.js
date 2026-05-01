import React, { useEffect } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '@ui/components';
import { Logger } from '@core/services/Logger';

// 1. Mock the Logger to spy on its calls
jest.mock('@core/services/Logger', () => ({
  Logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }
}));

// 2. Suppress console.error inside jest to avoid polluting test output when the boundary catches it intentionally
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

describe('ErrorBoundary Resiliency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const ProblematicComponent = ({ shouldCrash }) => {
    useEffect(() => {
      if (shouldCrash) {
        throw new Error('Boom! Test exception');
      }
    }, [shouldCrash]);

    return <></>; // Normal render
  };

  it('should render children normally if no error occurs', () => {
    const { queryByText } = render(
      <ErrorBoundary>
        <ProblematicComponent shouldCrash={false} />
      </ErrorBoundary>
    );

    // It should not display the fallback UI
    expect(queryByText('Ops! Algo deu errado.')).toBeNull();
  });

  it('should catch error, render fallback UI, and call Logger.error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ProblematicComponent shouldCrash={true} />
      </ErrorBoundary>
    );

    // Fallback UI should be rendered
    expect(getByText('Ops! Algo deu errado.')).toBeTruthy();
    expect(getByText('Encontramos um problema inesperado e já fomos notificados. Tente recarregar a tela.')).toBeTruthy();

    // Logger should have been called
    expect(Logger.error).toHaveBeenCalledWith(
      'React ErrorBoundary Caught Exception',
      expect.any(Error),
      expect.objectContaining({ errorInfo: expect.anything() })
    );
  });

  it('should reset the state when "Tentar Novamente" is pressed', () => {
    const mockOnReset = jest.fn();

    const { getByText, queryByText } = render(
      <ErrorBoundary onReset={mockOnReset}>
        <ProblematicComponent shouldCrash={true} />
      </ErrorBoundary>
    );

    expect(getByText('Ops! Algo deu errado.')).toBeTruthy();

    // Trigger reset
    const resetButton = getByText('Tentar Novamente');
    fireEvent.press(resetButton);

    // The boundary itself clears its internal state. 
    // In our test, ProblematicComponent will immediately re-throw because shouldCrash is still true,
    // but we can verify that the custom onReset function was called.
    expect(mockOnReset).toHaveBeenCalled();
  });
});
