import React from 'react';

import { render } from '@testing-library/react-native';
import { Image } from 'expo-image';

import FastAvatar from '../../src/ui/components/atoms/FastAvatar';

// We mock Image from expo-image to check props
jest.mock('expo-image', () => ({
  Image: jest.fn(() => null),
}));

describe('FastAvatar Component', () => {
  it('renders with default size and fallback avatar when source is missing', () => {
    render(<FastAvatar />);
    expect(Image).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.anything(),
        placeholder: expect.anything(),
      }),
      undefined, // RNTL sends undefined as second arg to functional component mocks usually
    );
  });

  it('renders with custom source and size', () => {
    render(
      <FastAvatar source="https://test.com/img.png" size={60} border={true} />,
    );
    expect(Image).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { uri: 'https://test.com/img.png' },
      }),
      undefined,
    );
  });

  it('renders online indicator when isOnline is true', () => {
    const { UNSAFE_getAllByProps } = render(<FastAvatar isOnline={true} />);

    // Check if the online indicator View exists
    const indicators = UNSAFE_getAllByProps({
      className:
        'absolute bottom-0.5 right-0.5 bg-green-500 border-2 border-white dark:border-surface-dark',
    });
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('handles image error by showing placeholder (covered by expo-image internals usually, but we test prop passing)', () => {
    render(<FastAvatar source={null} />);
    expect(Image).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.anything(),
      }),
      undefined,
    );
  });
});
