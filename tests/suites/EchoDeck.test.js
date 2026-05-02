import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import EchoDeck from '../../src/ui/components/organisms/EchoDeck';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from '../../src/utils/haptics';
import { Animated, PanResponder, Dimensions } from 'react-native';

jest.mock('@react-navigation/native');
jest.mock('../../src/utils/haptics');

describe('EchoDeck Component', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockEchoes = [
    { id: '1', bookId: 'b1', text: 'Note 1', userMetadata: { displayName: 'A' }, reactions: { claps: 1 }, pageLocation: 10 },
    { id: '2', bookId: 'b1', text: 'Note 2', userMetadata: { displayName: 'B' }, reactions: { claps: 2 }, pageLocation: 20 },
    { id: '3', bookId: 'b1', text: 'Note 3', userMetadata: { displayName: 'C' }, reactions: { claps: 3 }, pageLocation: 30 },
  ];
  const mockOnClap = jest.fn();
  const COLORS = { neon_green: '#00FF00' };

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue(mockNavigation);
    jest.useFakeTimers();
    Dimensions.get = jest.fn().mockReturnValue({ width: 400, height: 800 });
    
    jest.spyOn(Animated, 'timing').mockReturnValue({
      start: (cb) => cb && cb({ finished: true })
    });
    jest.spyOn(Animated, 'spring').mockReturnValue({
      start: (cb) => cb && cb({ finished: true })
    });

    jest.spyOn(PanResponder, 'create').mockImplementation((config) => ({
      panHandlers: config
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders front card correctly', () => {
    const { getByText, queryByText } = render(
      <EchoDeck echoes={mockEchoes} onClap={mockOnClap} COLORS={COLORS} isDarkMode={false} />
    );

    expect(getByText('"Note 1"')).toBeTruthy();
    expect(queryByText('"Note 2"')).toBeNull();
  });

  it('renders empty message when no echoes provided', () => {
    const { getByText } = render(
      <EchoDeck echoes={[]} onClap={mockOnClap} COLORS={COLORS} isDarkMode={false} />
    );
    expect(getByText('Fim do Baralho')).toBeTruthy();
  });

  it('handles tap on front card', () => {
    const { getByText } = render(
      <EchoDeck echoes={mockEchoes} onClap={mockOnClap} COLORS={COLORS} isDarkMode={false} />
    );

    const frontCardText = getByText('"Note 1"');
    fireEvent.press(frontCardText);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('EchoDetail', expect.objectContaining({
      echoId: '1'
    }));
  });

  it('resets index when echoes prop changes', () => {
    const { getByText, rerender } = render(
      <EchoDeck echoes={mockEchoes} onClap={mockOnClap} COLORS={COLORS} isDarkMode={false} />
    );

    expect(getByText('"Note 1"')).toBeTruthy();

    const newEchoes = [{ id: 'new', bookId: 'b1', text: 'New Note', userMetadata: { displayName: 'New' }, reactions: { claps: 0 }, pageLocation: 5 }];
    
    act(() => {
      rerender(<EchoDeck echoes={newEchoes} onClap={mockOnClap} COLORS={COLORS} isDarkMode={false} />);
    });

    expect(getByText('"New Note"')).toBeTruthy();
  });

  it('handles PanResponder callbacks (swipe and tap)', () => {
    const { getByTestId } = render(
      <EchoDeck echoes={mockEchoes} onClap={mockOnClap} COLORS={COLORS} isDarkMode={false} />
    );
    
    const frontCard = getByTestId('front-card');
    const handlers = frontCard.props;
    const mockEvent = { nativeEvent: {} };
    
    act(() => {
      handlers.onPanResponderMove(mockEvent, { dx: 50, dy: 0 });
    });

    act(() => {
      handlers.onPanResponderRelease(mockEvent, { dx: 5, dy: 5 });
    });
    expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    
    act(() => {
      handlers.onPanResponderRelease(mockEvent, { dx: 300, dy: 0 });
    });
    expect(Haptics.impactAsync).toHaveBeenCalled();
    
    act(() => {
      handlers.onPanResponderRelease(mockEvent, { dx: -300, dy: 0 });
    });

    act(() => {
      handlers.onPanResponderRelease(mockEvent, { dx: 20, dy: 0 });
    });
    
    expect(handlers.onMoveShouldSetPanResponder(null, { dx: 15, dy: 0 })).toBe(true);
    expect(handlers.onMoveShouldSetPanResponder(null, { dx: 5, dy: 0 })).toBe(false);
    expect(handlers.onMoveShouldSetPanResponder(null, { dx: 15, dy: 20 })).toBe(false);
  });

  it('covers handleTap empty branch by tapping after swiping last card', () => {
    const singleEcho = [mockEchoes[0]];
    const { getByTestId } = render(
      <EchoDeck echoes={singleEcho} onClap={mockOnClap} COLORS={COLORS} isDarkMode={false} />
    );
    
    const handlers = getByTestId('front-card').props;
    
    // Swipe the last card
    act(() => {
      handlers.onPanResponderRelease({ nativeEvent: {} }, { dx: 300, dy: 0 });
    });

    // Even though the card is unmounted, we can still call the handler we captured
    // This will trigger handleTap while currentIndex is 1, hitting the "if (currentEcho)" else branch
    act(() => {
      handlers.onPanResponderRelease({ nativeEvent: {} }, { dx: 2, dy: 2 });
    });

    expect(mockNavigation.navigate).toHaveBeenCalledTimes(0);
  });
});
