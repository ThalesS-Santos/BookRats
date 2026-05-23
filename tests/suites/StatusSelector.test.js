import React from 'react';

import { render, fireEvent } from '@testing-library/react-native';

import { BOOK_STATUS } from '../../src/core/constants/bookStatus';
import StatusSelector from '../../src/ui/components/molecules/StatusSelector';

// Mock dependencies
jest.mock('../../src/store/useThemeStore', () => ({
  useThemeStore: () => ({ isDarkMode: false }),
}));

jest.mock('../../src/utils/haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

describe('StatusSelector Component', () => {
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders status chips correctly', () => {
    const { getByText } = render(
      <StatusSelector
        currentStatus={BOOK_STATUS.WANT_TO_READ}
        onStatusChange={mockOnStatusChange}
      />,
    );

    expect(getByText('Quero ler')).toBeTruthy();
    expect(getByText('Lendo')).toBeTruthy();
    expect(getByText('Lido')).toBeTruthy();
  });

  it('triggers onStatusChange when a new status is clicked', () => {
    const { getByText } = render(
      <StatusSelector
        currentStatus={BOOK_STATUS.WANT_TO_READ}
        onStatusChange={mockOnStatusChange}
      />,
    );

    const readingChip = getByText('Lendo');
    fireEvent.press(readingChip);

    expect(mockOnStatusChange).toHaveBeenCalledWith(BOOK_STATUS.READING);
  });

  it('does nothing when the currently active status is clicked', () => {
    const { getByText } = render(
      <StatusSelector
        currentStatus={BOOK_STATUS.WANT_TO_READ}
        onStatusChange={mockOnStatusChange}
      />,
    );

    const wantToReadChip = getByText('Quero ler');
    fireEvent.press(wantToReadChip);

    expect(mockOnStatusChange).not.toHaveBeenCalled();
  });
});
