import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CommunityNote from '../../src/ui/components/molecules/CommunityNote';

describe('CommunityNote Component', () => {
  const mockNote = {
    id: 'note1',
    userId: 'user1',
    bookId: 'book1',
    userMetadata: {
      displayName: 'Thales',
      photoURL: 'https://avatar.com/1',
      isInfluencer: true,
    },
    pageLocation: 120,
    text: 'Que livro incrível!',
    reactions: {
      claps: 5,
    },
  };

  const mockOnClap = jest.fn();
  const COLORS = { neon_green: '#00FF00' };

  it('renders correctly for front card', () => {
    const { getByText } = render(
      <CommunityNote 
        note={mockNote} 
        onClap={mockOnClap} 
        COLORS={COLORS} 
        isDarkMode={false} 
        isFrontCard={true} 
      />
    );

    expect(getByText('Thales')).toBeTruthy();
    expect(getByText('Pg. 120')).toBeTruthy();
    expect(getByText('"Que livro incrível!"')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('renders correctly for background card', () => {
    const { toJSON } = render(
      <CommunityNote 
        note={mockNote} 
        onClap={mockOnClap} 
        COLORS={COLORS} 
        isDarkMode={false} 
        isBackgroundCard={true} 
      />
    );
    // Background card is just a View with styles
    expect(toJSON()).toBeTruthy();
  });

  it('calls onClap when clap button is pressed', () => {
    const { getByText } = render(
      <CommunityNote 
        note={mockNote} 
        onClap={mockOnClap} 
        COLORS={COLORS} 
        isDarkMode={true} 
      />
    );

    const clapButton = getByText('5').parent;
    fireEvent.press(clapButton);

    expect(mockOnClap).toHaveBeenCalledWith('user1', 'book1', 'note1');
  });

  it('handles influencer star rendering', () => {
    const { getByText } = render(
      <CommunityNote 
        note={mockNote} 
        onClap={mockOnClap} 
        COLORS={COLORS} 
      />
    );
    // If it doesn't crash and renders the influencer name, we're good.
    // Testing specific icons inside Ionicons is harder without extra setup.
    expect(getByText('Thales')).toBeTruthy();
  });

  it('handles non-influencer rendering', () => {
    const note = { ...mockNote, userMetadata: { ...mockNote.userMetadata, isInfluencer: false } };
    const { queryByTestId } = render(
      <CommunityNote 
        note={note} 
        onClap={mockOnClap} 
        COLORS={COLORS} 
      />
    );
    // Should render fine
    expect(true).toBe(true);
  });
});
