import React from 'react';

import { render, fireEvent } from '@testing-library/react-native';

import ProgressBookCard from '../../src/ui/components/molecules/ProgressBookCard';

// Mock dependencies
jest.mock('@core/store', () => ({
  useMainStore: jest.fn(() => jest.fn()),
}));

jest.mock('../../src/store/useThemeStore', () => ({
  useThemeStore: () => ({ isDarkMode: false }),
}));

jest.mock('../../src/utils/haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 0,
    Medium: 1,
    Heavy: 2,
  },
}));

describe('ProgressBookCard Component', () => {
  const mockBook = {
    id: 'book1',
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    thumbnail: 'https://images.com/domcasmurro.jpg',
    currentPage: 50,
    totalPages: 200,
    status: 'reading',
  };

  const mockOnPress = jest.fn();
  const mockOnConfigPress = jest.fn();
  const mockOnCommunityPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders book details and progress percentage correctly', () => {
    const { getByText } = render(
      <ProgressBookCard
        book={mockBook}
        onPress={mockOnPress}
        onConfigPress={mockOnConfigPress}
        onCommunityPress={mockOnCommunityPress}
      />,
    );

    expect(getByText('Dom Casmurro')).toBeTruthy();
    expect(getByText('Machado de Assis')).toBeTruthy();
    expect(getByText('50 / 200 pgs')).toBeTruthy();
    expect(getByText('25%')).toBeTruthy();
  });

  it('handles books with missing author by showing fallback', () => {
    const bookNoAuthor = { ...mockBook, author: null };
    const { getByText } = render(
      <ProgressBookCard book={bookNoAuthor} onPress={mockOnPress} />,
    );

    expect(getByText('Autor Desconhecido')).toBeTruthy();
  });

  it('triggers onPress callback when card is pressed', () => {
    const { getByText } = render(
      <ProgressBookCard book={mockBook} onPress={mockOnPress} />,
    );

    const titleText = getByText('Dom Casmurro');
    fireEvent.press(titleText);

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('triggers onCommunityPress callback when share icon is pressed', () => {
    const { getByTestId } = render(
      <ProgressBookCard
        book={mockBook}
        onPress={mockOnPress}
        onConfigPress={mockOnConfigPress}
        onCommunityPress={mockOnCommunityPress}
      />,
    );

    const communityBtn = getByTestId('community-btn');
    fireEvent.press(communityBtn, { stopPropagation: jest.fn() });

    expect(mockOnCommunityPress).toHaveBeenCalled();
  });

  it('triggers onConfigPress callback when settings icon is pressed', () => {
    const { getByTestId } = render(
      <ProgressBookCard
        book={mockBook}
        onPress={mockOnPress}
        onConfigPress={mockOnConfigPress}
        onCommunityPress={mockOnCommunityPress}
      />,
    );

    const settingsBtn = getByTestId('settings-btn');
    fireEvent.press(settingsBtn, { stopPropagation: jest.fn() });

    expect(mockOnConfigPress).toHaveBeenCalled();
  });
});
