/**
 * StatsScreen — Integration Tests
 *
 * Tests the main statistics screen:
 * - Empty state when no books
 * - Period selector rendering and interaction
 * - KPI card labels present with book data
 * - Conditional section visibility based on data shape
 * - Dark mode rendering
 */

import React from 'react';

import { render, fireEvent } from '@testing-library/react-native';

import { BOOK_STATUS } from '@core/constants/bookStatus';
import { useMainStore } from '@core/store';

import StatsScreen from '@ui/screens/StatsScreen';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@core/store', () => ({
  useMainStore: jest.fn(),
}));

jest.mock('../../src/store/useThemeStore', () => ({
  useThemeStore: jest.fn(() => ({ isDarkMode: false })),
}));

const { useThemeStore } = require('../../src/store/useThemeStore');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LOG = {
  date: '2026-06-18',
  pagesRead: 30,
  timeSeconds: 1800,
  pagesPerHour: 60,
};

const READING_BOOK = {
  id: 'b1',
  title: 'The Midnight Library',
  status: BOOK_STATUS.READING,
  currentPage: 50,
  totalPages: 300,
  categories: ['Fiction'],
  logs: [LOG],
};

const READ_BOOK = {
  id: 'b2',
  title: 'Dune',
  status: BOOK_STATUS.READ,
  currentPage: 900,
  totalPages: 900,
  categories: ['Science Fiction', 'Fiction'],
  logs: [LOG],
};

const EMPTY_STATE = {
  books: [],
  streak: 0,
  totalPagesRead: 0,
  maxReadingSession: 0,
  totalBooksCompleted: 0,
};

const WITH_DATA_STATE = {
  books: [READING_BOOK, READ_BOOK],
  streak: 7,
  totalPagesRead: 450,
  maxReadingSession: 3600,
  totalBooksCompleted: 5,
};

function mockStore(state) {
  useMainStore.mockImplementation(selector => selector(state));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StatsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useThemeStore.mockReturnValue({ isDarkMode: false });
  });

  // ── Header ─────────────────────────────────────────────────────────────────
  describe('Header', () => {
    it('renders the screen title "Estatísticas"', () => {
      mockStore(EMPTY_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Estatísticas')).toBeTruthy();
    });

    it('renders subtitle "Sua jornada de leitura em números"', () => {
      mockStore(EMPTY_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Sua jornada de leitura em números')).toBeTruthy();
    });
  });

  // ── Empty State ─────────────────────────────────────────────────────────────
  describe('Empty State', () => {
    it('shows empty state when books array is empty', () => {
      mockStore(EMPTY_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Comece a ler')).toBeTruthy();
    });

    it('shows empty state description text', () => {
      mockStore(EMPTY_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(
        getByText(
          /Adicione livros e registre sessões de leitura para ver suas estatísticas aqui/,
        ),
      ).toBeTruthy();
    });

    it('does NOT show period selector when books is empty', () => {
      mockStore(EMPTY_STATE);
      const { queryByText } = render(<StatsScreen />);
      expect(queryByText('Semana')).toBeNull();
    });

    it('does NOT show KPI labels when books is empty', () => {
      mockStore(EMPTY_STATE);
      const { queryByText } = render(<StatsScreen />);
      expect(queryByText('Livros Lidos')).toBeNull();
    });
  });

  // ── Period Selector ─────────────────────────────────────────────────────────
  describe('Period Selector', () => {
    it('shows all 4 period pills', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Semana')).toBeTruthy();
      expect(getByText('Mês')).toBeTruthy();
      expect(getByText('Trimestre')).toBeTruthy();
      expect(getByText('Tudo')).toBeTruthy();
    });

    it('changes active period when a pill is pressed', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);

      // Press "Semana"
      fireEvent.press(getByText('Semana'));

      // "Atividade de Leitura" subtitle changes to reflect the selected period
      expect(getByText('Últimos 7 dias')).toBeTruthy();
    });

    it('default period is Mês (shows Últimas 4 semanas)', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Últimas 4 semanas')).toBeTruthy();
    });

    it('Trimestre period shows Últimos 3 meses', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      fireEvent.press(getByText('Trimestre'));
      expect(getByText('Últimos 3 meses')).toBeTruthy();
    });
  });

  // ── KPI Cards ───────────────────────────────────────────────────────────────
  describe('KPI Cards', () => {
    it('renders "Livros Lidos" KPI label', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Livros Lidos')).toBeTruthy();
    });

    it('renders "Páginas Lidas" KPI label', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Páginas Lidas')).toBeTruthy();
    });

    it('renders "Sequência Atual" KPI label', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Sequência Atual')).toBeTruthy();
    });

    it('renders "Velocidade Média" KPI label', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Velocidade Média')).toBeTruthy();
    });
  });

  // ── Sections always present when books exist ────────────────────────────────
  describe('Static sections (always rendered with books)', () => {
    it('renders "Atividade de Leitura" section title', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Atividade de Leitura')).toBeTruthy();
    });

    it('renders "Calendário de Leitura" section', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Calendário de Leitura')).toBeTruthy();
    });

    it('renders "Sua Biblioteca" section', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Sua Biblioteca')).toBeTruthy();
    });
  });

  // ── Conditional sections ────────────────────────────────────────────────────
  describe('Conditional sections', () => {
    it('shows "Padrão Semanal" when books have logs', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Padrão Semanal')).toBeTruthy();
    });

    it('hides "Padrão Semanal" when there are no logs', () => {
      mockStore({
        ...WITH_DATA_STATE,
        books: [{ ...READING_BOOK, logs: [] }, { ...READ_BOOK, logs: [] }],
      });
      const { queryByText } = render(<StatsScreen />);
      expect(queryByText('Padrão Semanal')).toBeNull();
    });

    it('shows "Gêneros Favoritos" when READ books have categories', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Gêneros Favoritos')).toBeTruthy();
    });

    it('hides "Gêneros Favoritos" when no read books with categories', () => {
      mockStore({
        ...WITH_DATA_STATE,
        books: [{ ...READING_BOOK, logs: [] }], // no READ books
      });
      const { queryByText } = render(<StatsScreen />);
      expect(queryByText('Gêneros Favoritos')).toBeNull();
    });

    it('shows "Sessões de Leitura" when there are session logs', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Sessões de Leitura')).toBeTruthy();
    });

    it('hides "Sessões de Leitura" when books have no logs', () => {
      mockStore({
        ...WITH_DATA_STATE,
        books: [{ ...READ_BOOK, logs: [] }],
      });
      const { queryByText } = render(<StatsScreen />);
      expect(queryByText('Sessões de Leitura')).toBeNull();
    });

    it('shows "Projeção de Leitura" section when there are READING books', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Projeção de Leitura')).toBeTruthy();
    });

    it('hides "Projeção de Leitura" when no books are READING', () => {
      mockStore({
        ...WITH_DATA_STATE,
        books: [READ_BOOK],
      });
      const { queryByText } = render(<StatsScreen />);
      expect(queryByText('Projeção de Leitura')).toBeNull();
    });
  });

  // ── Projeção subtitle ───────────────────────────────────────────────────────
  describe('Projection subtitle', () => {
    it('shows "Registre sessões" hint when avgPagesPerDay is too low', () => {
      // READING book with no logs → avgPagesPerDay = 0 → hint shown instead of projections
      mockStore({
        ...WITH_DATA_STATE,
        books: [{ ...READING_BOOK, logs: [] }],
      });
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Projeção de Leitura')).toBeTruthy();
      expect(getByText('Registre sessões para ver previsões')).toBeTruthy();
    });
  });

  // ── Dark mode ───────────────────────────────────────────────────────────────
  describe('Dark mode', () => {
    it('renders in dark mode without crashing', () => {
      mockStore(WITH_DATA_STATE);
      useThemeStore.mockReturnValue({ isDarkMode: true });
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Estatísticas')).toBeTruthy();
    });

    it('empty state renders in dark mode', () => {
      mockStore(EMPTY_STATE);
      useThemeStore.mockReturnValue({ isDarkMode: true });
      const { getByText } = render(<StatsScreen />);
      expect(getByText('Comece a ler')).toBeTruthy();
    });
  });

  // ── Library subtitle ────────────────────────────────────────────────────────
  describe('Library subtitle', () => {
    it('shows total book count in Sua Biblioteca subtitle', () => {
      mockStore(WITH_DATA_STATE);
      const { getByText } = render(<StatsScreen />);
      expect(getByText('2 livros catalogados')).toBeTruthy();
    });
  });
});
