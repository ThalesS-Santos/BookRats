import React from 'react';

import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';

import Skeleton from '../../src/ui/components/atoms/Skeleton';

describe('Skeleton Component', () => {
  it('renders correctly with given props', () => {
    const { getByTestId } = render(
      <Skeleton
        width={100}
        height={50}
        borderRadius={10}
        testID="skeleton-id"
      />,
    );
    const skeleton = getByTestId('skeleton-id');

    // Check if the style props are passed correctly
    // Note: opacity is an Animated.Value, so we check others
    expect(skeleton.props.style).toEqual(
      expect.objectContaining({
        width: 100,
        height: 50,
        borderRadius: 10,
      }),
    );
  });

  it('renders children if provided', () => {
    const { getByTestId } = render(
      <Skeleton width={100} height={50}>
        <Skeleton width={10} height={10} testID="child-skeleton" />
      </Skeleton>,
    );
    expect(getByTestId('child-skeleton')).toBeTruthy();
    // In this case, we just check if it renders without crashing with children
    // The previous test already checks basic rendering
  });

  it('starts animation loop on mount', () => {
    const loopSpy = jest.spyOn(Animated, 'loop');
    const sequenceSpy = jest.spyOn(Animated, 'sequence');
    const timingSpy = jest.spyOn(Animated, 'timing');

    render(<Skeleton width={100} height={50} />);

    expect(loopSpy).toHaveBeenCalled();
    expect(sequenceSpy).toHaveBeenCalled();
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0.7,
        duration: 400,
      }),
    );
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0.3,
        duration: 400,
      }),
    );

    loopSpy.mockRestore();
    sequenceSpy.mockRestore();
    timingSpy.mockRestore();
  });
});
