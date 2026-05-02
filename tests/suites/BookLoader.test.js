import React from 'react';
import { render, act } from '@testing-library/react-native';
import BookLoader from '../../src/ui/components/organisms/BookLoader';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Animated } from 'react-native';

jest.mock('../../src/store/useThemeStore');

describe('BookLoader Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useThemeStore.mockReturnValue({ isDarkMode: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing if isVisible is initially false', () => {
    const { toJSON } = render(<BookLoader isVisible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders and starts animation when isVisible is true', () => {
    const { getByTestId } = render(<BookLoader isVisible={true} />);
    expect(getByTestId('book-loader-container')).toBeTruthy();
  });

  it('hides and sets shouldRender to false after animation when isVisible becomes false', () => {
    const { queryByText, rerender } = render(<BookLoader isVisible={true} />);
    
    expect(queryByText(/SABIA QUE/)).toBeTruthy();

    act(() => {
      rerender(<BookLoader isVisible={false} />);
    });

    // Advance timers to trigger animation end callback
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(queryByText(/SABIA QUE/)).toBeNull();
  });

  it('renders correctly in dark mode', () => {
    useThemeStore.mockReturnValue({ isDarkMode: true });
    const { getByText } = render(<BookLoader isVisible={true} />);
    expect(getByText(/SABIA QUE/)).toBeTruthy();
  });
});
