import React from 'react';

import { render } from '@testing-library/react-native';

import { LoadingScreen } from '@ui/components';

describe('Smoke Test', () => {
  it('should pass a basic truthy test', () => {
    expect(true).toBe(true);
  });

  it('should render LoadingScreen without crashing', () => {
    const { getByTestId } = render(<LoadingScreen />);
    // Basic render check - if it doesn't throw, it's operational for a smoke test
  });
});
