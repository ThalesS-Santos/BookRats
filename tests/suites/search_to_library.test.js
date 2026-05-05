import { useMainStore } from '@core/store';
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AddBookScreen from '@ui/screens/AddBookScreen';
import { NavigationContainer } from '@react-navigation/native';
import * as bookApi from '@core/api/books';
import { UserFactory } from '@tests/factories/UserFactory';

// Mock navigation
const mockNavigation = { 
  navigate: jest.fn(), 
  goBack: jest.fn(),
  setOptions: jest.fn()
};

/**
 * 🧪 Search to Library Integration Test
 * Validates the complete flow from typing a search query, 
 * selecting a result from MSW, and persisting it to the library.
 */
describe('Search to Library Flow Integration', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset Store State
    useMainStore.setState({ 
      user: UserFactory.create({ uid: 'test-user-123' }),
      books: [],
      loadingBooks: false
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Scenario 1: The Happy Path - Search, Select, and Persist with full metadata', async () => {
    // 1. Mock API response
    const apiSpy = jest.spyOn(bookApi, 'addBook').mockResolvedValue('new-book-id');
    
    const { getByPlaceholderText, getByText, findByText } = render(
      <NavigationContainer>
        <AddBookScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    // 2. Simulate Search Input
    const searchInput = getByPlaceholderText('Pesquisar por título...');
    fireEvent.changeText(searchInput, 'Dom Casmurro');

    // 3. Advance Timers to trigger Debounce (500ms)
    act(() => {
      jest.advanceTimersByTime(600);
    });

    // 4. Verify MSW Result rendered in SearchPreview (Titles are Uppercased in UI, but text remains same)
    const bookCard = await waitFor(() => getByText('DOM CASMURRO'));
    expect(bookCard).toBeTruthy();
    expect(getByText('Machado de Assis')).toBeTruthy();
    expect(getByText('Fiction')).toBeTruthy(); // Category Badge (Step 1.8)

    // 5. Select the book card
    fireEvent.press(bookCard);

    // 6. Verify Form Auto-population (including Synopsis logic)
    expect(getByText('Sinopse')).toBeTruthy();
    expect(getByText(/A clássica história de Bentinho e Capitu/)).toBeTruthy();
    
    // Check Title and Pages inputs
    const titleInput = getByPlaceholderText('Ex: Cem Anos de Solidão');
    const pagesInput = getByPlaceholderText('Páginas não informadas');
    
    expect(titleInput.props.value).toBe('Dom Casmurro');
    expect(pagesInput.props.value).toBe('371');

    // 7. Click "Adicionar à Estante"
    const addButton = getByText('Adicionar à Estante');
    fireEvent.press(addButton);

    // 8. Verify Data Integrity in API call (Step 1.8 fields + Etapa 2 Status)
    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith(
        'test-user-123',
        'Dom Casmurro',
        '371',
        'dom-casmurro-id',
        'A clássica história de Bentinho e Capitu.',
        expect.objectContaining({
          categories: ['Fiction'],
          language: 'pt',
          publishedDate: '1899'
        }),
        'quero_ler' // Formalized Status (Etapa 2)
      );
    });

    // 9. Verify navigation feedback
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('Scenario 2: Duplicate Prevention - Do not add if ID already in library', async () => {
    // Populate store with an existing book ID
    useMainStore.setState({ 
      books: [{ id: 'dom-casmurro-id', title: 'Dom Casmurro' }] 
    });

    const apiSpy = jest.spyOn(bookApi, 'addBook');

    const { getByPlaceholderText, getByText } = render(
      <NavigationContainer>
        <AddBookScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    // Search and select
    fireEvent.changeText(getByPlaceholderText('Pesquisar por título...'), 'Dom Casmurro');
    act(() => { jest.advanceTimersByTime(600); });
    
    const bookCard = await waitFor(() => getByText('DOM CASMURRO'));
    fireEvent.press(bookCard);

    // Try to add
    fireEvent.press(getByText('Adicionar à Estante'));

    // Should NOT call API because librarySlice integrity check prevents duplicates
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it('Scenario 3: UI Feedback - Show warning if book has no pages', async () => {
    // We can use a custom query to trigger a generic mock or just change text
    // The default mock in handlers.js has pages, but we can override if needed.
    // For simplicity, let's just test if the manual form allows empty pages warning
    const { getByPlaceholderText, getByText, queryByText } = render(
      <NavigationContainer>
        <AddBookScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    // Search for something that returns results but maybe we clear the page count manually
    fireEvent.changeText(getByPlaceholderText('Pesquisar por título...'), 'Dom Casmurro');
    act(() => { jest.advanceTimersByTime(600); });
    
    const bookCard = await waitFor(() => getByText('DOM CASMURRO'));
    fireEvent.press(bookCard);

    // Manually clear pages
    const pagesInput = getByPlaceholderText('Páginas não informadas');
    fireEvent.changeText(pagesInput, '');

    // Verify Warning Message (Step 1.8)
    expect(getByText(/Este livro não informou o total de páginas/)).toBeTruthy();
  });
});
