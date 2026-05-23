import React from 'react';

import { render, fireEvent } from '@testing-library/react-native';

import SearchPreview from '@ui/components/molecules/SearchPreview';

describe('SearchPreview Molecule (Gallery Layout)', () => {
  const mockResults = [
    {
      id: '1',
      title: 'O Nome do Vento',
      author: 'Patrick Rothfuss',
      thumbnail: { uri: 'https://example.com/cover1.jpg' },
    },
    {
      id: '2',
      title: 'O Temor do Sábio',
      author: 'Patrick Rothfuss',
      thumbnail: { uri: 'https://example.com/cover2.jpg' },
    },
  ];

  it('should render a list of cards correctly', () => {
    const { getByText, getAllByText } = render(
      <SearchPreview
        results={mockResults}
        onSelect={() => {}}
        loading={false}
        query="Rothfuss"
      />,
    );

    // Titles are Uppercased in the new layout
    expect(getByText('O NOME DO VENTO')).toBeTruthy();
    expect(getByText('O TEMOR DO SÁBIO')).toBeTruthy();
    expect(getAllByText('Patrick Rothfuss')).toHaveLength(2);
  });

  it('should trigger onSelect when a card is pressed', () => {
    const onSelectMock = jest.fn();
    const { getByTestId } = render(
      <SearchPreview
        results={mockResults}
        onSelect={onSelectMock}
        loading={false}
        query="Rothfuss"
      />,
    );

    fireEvent.press(getByTestId('search-result-1'));
    expect(onSelectMock).toHaveBeenCalledWith(mockResults[0]);
  });

  it('should show skeleton loaders while loading', () => {
    const { getByTestId } = render(
      <SearchPreview
        results={[]}
        onSelect={() => {}}
        loading={true}
        query="Rothfuss"
      />,
    );

    expect(getByTestId('search-loading-skeletons')).toBeTruthy();
  });

  it('should show empty state message when no results found', () => {
    const { getByText } = render(
      <SearchPreview
        results={[]}
        onSelect={() => {}}
        loading={false}
        query="Inexistente"
      />,
    );

    expect(getByText(/Nenhum título encontrado/)).toBeTruthy();
  });

  it('should render nothing if query is short and no results', () => {
    const { queryByText } = render(
      <SearchPreview
        results={[]}
        onSelect={() => {}}
        loading={false}
        query="Pa"
      />,
    );

    expect(queryByText(/Sugestões/)).toBeNull();
  });
});
