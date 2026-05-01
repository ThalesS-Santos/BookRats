import { useMainStore } from '@core/store';
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import GalleryScreen from '@ui/screens/GalleryScreen';
import { NavigationContainer } from '@react-navigation/native';
import * as socialApi from '@core/api/social';
import { UserFactory } from '@tests/factories/UserFactory';
// Mock routing params
const mockRoute = {
  params: {
    bookId: '123',
    bookTitle: 'Cem Anos de Solidão',
    userCurrentPage: 50
  }
};

// Mock Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
        ...actualNav,
        useNavigation: () => ({
            navigate: mockNavigate,
            goBack: jest.fn(),
        }),
    };
});

describe('Gallery Screen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMainStore.setState({ user: UserFactory.create({ uid: 'test-user-123' }) });
  });

  const renderGallery = () => {
    return render(
      <NavigationContainer>
        <GalleryScreen route={mockRoute} />
      </NavigationContainer>
    );
  };

  it('Scenario 1: should mount correctly with book metadata and filter spoilers', async () => {
    const mockEchoes = [
        {
          id: 'echo-1',
          text: 'Este capítulo é simplesmente genial!',
          pageLocation: 10,
          userMetadata: { displayName: 'Gabriel' },
          reactions: { claps: 12 },
        },
        {
          id: 'echo-spoiler', // Should be filtered out by getPublicEchoes in api/social.js
          text: 'SPOILER: Não acredito que isso aconteceu!',
          pageLocation: 60,
        }
    ];

    const spy = jest.spyOn(socialApi, 'getPublicEchoes').mockResolvedValue(
        mockEchoes.filter(e => e.pageLocation <= mockRoute.params.userCurrentPage)
    );

    const { findByText, getByText, queryByText } = renderGallery();

    // Verify Title in Header (Waiting for loading to finish)
    expect(await findByText('Cem Anos de Solidão')).toBeTruthy();

    await waitFor(() => {
      // Echo 1 should be visible
      expect(getByText('"Este capítulo é simplesmente genial!"')).toBeTruthy();
      // Label should be visible
      expect(getByText('SOBRE ESTE LIVRO')).toBeTruthy();
      // Spoiler should NOT be visible
      expect(queryByText('"SPOILER: Não acredito que isso aconteceu!"')).toBeNull();
    });

    spy.mockRestore();
  });

  it('Scenario 2: should handle scroll events without crashing', async () => {
     const mockEchoes = Array.from({ length: 5 }).map((_, i) => ({
        id: `echo-${i}`,
        text: `Echo text ${i}`,
        pageLocation: 10,
        userMetadata: { displayName: `User ${i}` },
        reactions: { claps: i },
    }));
    jest.spyOn(socialApi, 'getPublicEchoes').mockResolvedValue(mockEchoes);

    const { getByTestId } = renderGallery();

    // Wait for data to load and FlatList to appear
    const flatList = await waitFor(() => getByTestId('echo-flatlist'));
    
    // Simulate Scroll
    fireEvent.scroll(flatList, {
      nativeEvent: {
        contentOffset: { y: 200 },
        contentSize: { height: 1000, width: 400 },
        layoutMeasurement: { height: 800, width: 400 },
      },
    });

    // Verify it's still there
    expect(flatList).toBeTruthy();
  });

  it('Scenario 3: should display empty state when no echoes are found', async () => {
    jest.spyOn(socialApi, 'getPublicEchoes').mockResolvedValue([]);

    const { getByText } = renderGallery();

    await waitFor(() => {
      expect(getByText('Nenhum eco encontrado nesta parte do livro.')).toBeTruthy();
    });
  });

  it('Scenario 4: should navigate to EchoDetail when a card is pressed', async () => {
    const mockEcho = {
        id: 'echo-123',
        bookId: '123',
        text: 'Teste de navegação',
        pageLocation: 20,
        userMetadata: { displayName: 'Tester' },
    };
    jest.spyOn(socialApi, 'getPublicEchoes').mockResolvedValue([mockEcho]);

    const { getByText } = renderGallery();

    // Wait for data
    const cardText = await waitFor(() => getByText('"Teste de navegação"'));
    
    // Press the card
    fireEvent.press(cardText);

    expect(mockNavigate).toHaveBeenCalledWith('EchoDetail', expect.objectContaining({
        echoId: 'echo-123'
    }));
  });
});
