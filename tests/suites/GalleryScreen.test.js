import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import GalleryScreen from '../../src/ui/screens/GalleryScreen';
import { useNavigation } from '@react-navigation/native';
import { useMainStore } from '../../src/core/store';
import { useThemeStore } from '../../src/store/useThemeStore';
import { getPublicEchoes, addRatClap } from '../../src/core/api/social';
import * as Haptics from '../../src/utils/haptics';
import { Animated } from 'react-native';

jest.mock('@react-navigation/native');
jest.mock('../../src/core/store');
jest.mock('../../src/store/useThemeStore');
jest.mock('../../src/core/api/social');
jest.mock('../../src/utils/haptics');

describe('GalleryScreen', () => {
  const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
  const mockRoute = {
    params: {
      bookId: 'b1',
      bookTitle: 'Test Book',
      userCurrentPage: 10
    }
  };
  const mockEchoes = [
    { id: 'e1', bookId: 'b1', text: 'Echo 1', reactions: { claps: 5 }, userMetadata: { displayName: 'User 1' } },
    { id: 'e2', bookId: 'b1', text: 'Echo 2', reactions: { claps: 2 }, userMetadata: { displayName: 'User 2' } },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue(mockNavigation);
    useMainStore.mockReturnValue({ user: { uid: 'u1', displayName: 'Tester' } });
    useThemeStore.mockReturnValue({ isDarkMode: false });
    getPublicEchoes.mockResolvedValue(mockEchoes);
  });

  it('renders loading state initially', () => {
    const { getByTestId } = render(<GalleryScreen route={mockRoute} />);
    expect(getByTestId('book-loader-container')).toBeTruthy();
  });

  it('renders echoes after loading', async () => {
    const { getByText, queryByTestId } = render(<GalleryScreen route={mockRoute} />);
    
    await waitFor(() => {
      expect(queryByTestId('book-loader-container')).toBeNull();
    });

    expect(getByText('Test Book')).toBeTruthy();
    expect(getByText('"Echo 1"')).toBeTruthy();
    expect(getByText('"Echo 2"')).toBeTruthy();
  });

  it('renders empty state if no echoes found', async () => {
    getPublicEchoes.mockResolvedValue([]);
    const { getByText } = render(<GalleryScreen route={mockRoute} />);
    
    await waitFor(() => {
      expect(getByText('Nenhum eco encontrado nesta parte do livro.')).toBeTruthy();
    });
  });

  it('handles fetch error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getPublicEchoes.mockRejectedValue(new Error('API Failure'));
    
    render(<GalleryScreen route={mockRoute} />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles back button press', async () => {
    const { getByTestId } = render(<GalleryScreen route={mockRoute} />);
    await waitFor(() => expect(getPublicEchoes).toHaveBeenCalled());
    
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('handles scroll haptics and index update', async () => {
    const { getByTestId } = render(<GalleryScreen route={mockRoute} />);
    await waitFor(() => expect(getPublicEchoes).toHaveBeenCalled());

    const flatList = getByTestId('echo-flatlist');
    
    // Trigger scroll
    fireEvent.scroll(flatList, {
      nativeEvent: {
        contentOffset: { y: 200 },
        layoutMeasurement: { height: 800, width: 400 },
        contentSize: { height: 2000, width: 400 }
      }
    });

    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('handles clapping on an echo', async () => {
    const { getByText } = render(<GalleryScreen route={mockRoute} />);
    await waitFor(() => expect(getPublicEchoes).toHaveBeenCalled());

    const clapButton = getByText('5'); // Initial claps of Echo 1
    fireEvent.press(clapButton);

    expect(getByText('6')).toBeTruthy(); // Optimistic update
    expect(addRatClap).toHaveBeenCalled();
  });

  it('navigates to EchoDetail on item press', async () => {
    const { getByText } = render(<GalleryScreen route={mockRoute} />);
    await waitFor(() => expect(getPublicEchoes).toHaveBeenCalled());

    fireEvent.press(getByText('"Echo 1"'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('EchoDetail', expect.objectContaining({
      echoId: 'e1'
    }));
  });
});
