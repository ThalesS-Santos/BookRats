import React from 'react';

import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

import { addAnnotation } from '../../src/core/api/books';
import { BOOK_STATUS } from '../../src/core/constants/bookStatus';
import { useMainStore } from '../../src/core/store';
import { useTimer } from '../../src/hooks/useTimer';
import { usePopupStore } from '../../src/store/usePopupStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import TimerScreen from '../../src/ui/screens/TimerScreen';
import * as Haptics from '../../src/utils/haptics';

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock('../../src/core/api/books');
jest.mock('../../src/core/store');
jest.mock('../../src/store/useThemeStore');
jest.mock('../../src/store/usePopupStore');
jest.mock('../../src/utils/haptics');
jest.mock('../../src/hooks/useTimer');

jest.mock('../../src/utils/time', () => ({
  formatTime: s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
}));

jest.mock('../../src/core/services/UserNormalizationService', () => ({
  UserNormalizationService: {
    normalizeDisplayName: user => user?.displayName || 'Leitor',
    normalizeUserAvatar: () => null,
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BOOK = {
  id: 'b1',
  title: 'Dom Casmurro',
  author: 'Machado de Assis',
  currentPage: 50,
  totalPages: 300,
  status: 'READING',
};

const MOCK_ROUTE = { params: { bookId: 'b1' } };
const MOCK_NAVIGATION = { navigate: jest.fn(), goBack: jest.fn() };

const mockUpdateProgress = jest.fn();
const mockUpdateReadingStatus = jest.fn();
const mockUpdateBook = jest.fn(() => Promise.resolve());
const mockShowPopup = jest.fn();
const mockSetIsActive = jest.fn();
const mockSetSeconds = jest.fn();

// ─── Store helper ──────────────────────────────────────────────────────────────
// TimerScreen calls useMainStore with selectors: state => state.books etc.
// mockImplementation applies each selector so components receive the right value.
const setupMainStore = (stateOverrides = {}) => {
  const state = {
    books: [BOOK],
    user: { uid: 'u1', displayName: 'Tester' },
    updateProgress: mockUpdateProgress,
    updateReadingStatus: mockUpdateReadingStatus,
    ...stateOverrides,
  };
  useMainStore.mockImplementation(selector =>
    typeof selector === 'function' ? selector(state) : state,
  );
  useMainStore.getState = () => ({ ...state, updateBook: mockUpdateBook });
};

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('TimerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useThemeStore.mockReturnValue({ isDarkMode: false });
    usePopupStore.mockReturnValue({ showPopup: mockShowPopup });
    setupMainStore();
    useTimer.mockReturnValue({
      seconds: 120,
      setSeconds: mockSetSeconds,
      isActive: true,
      setIsActive: mockSetIsActive,
    });
    addAnnotation.mockResolvedValue({ id: 'annot-1' });
  });

  // ── Null guard ───────────────────────────────────────────────────────────────

  it('returns null when the book is not found in the store', () => {
    setupMainStore({ books: [] });
    const { toJSON } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    expect(toJSON()).toBeNull();
  });

  // ── Timer view (initial state) ───────────────────────────────────────────────

  it('renders the book title and author', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    expect(getByText('Dom Casmurro')).toBeTruthy();
    expect(getByText('por Machado de Assis')).toBeTruthy();
  });

  it('shows the formatted timer value', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    // 120 seconds → "02:00"
    expect(getByText('02:00')).toBeTruthy();
  });

  it('shows "Lendo Agora" header when in timer view', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    expect(getByText('Lendo Agora')).toBeTruthy();
  });

  it('shows "Foco Ativo" badge when timer is running', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    expect(getByText('Foco Ativo')).toBeTruthy();
  });

  it('shows "Pausado" badge when timer is paused', () => {
    useTimer.mockReturnValue({
      seconds: 60,
      setSeconds: mockSetSeconds,
      isActive: false,
      setIsActive: mockSetIsActive,
    });
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    expect(getByText('Pausado')).toBeTruthy();
  });

  // ── Timer controls ───────────────────────────────────────────────────────────

  it('calls setIsActive(false) when "Finalizar" is pressed', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    expect(mockSetIsActive).toHaveBeenCalledWith(false);
  });

  it('switches to the finish form view after pressing "Finalizar"', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    expect(getByText('Sessão Finalizada')).toBeTruthy();
    expect(getByText('Belo Esforço!')).toBeTruthy();
  });

  it('calls Haptics.impactAsync when "Finalizar" is pressed', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('shows the reset confirm popup when the reset button is pressed', () => {
    const { getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByTestId('reset-btn'));
    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'confirm', title: 'Reiniciar?' }),
    );
  });

  it('calls setSeconds(0) via popup onConfirm when confirming reset', () => {
    const { getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByTestId('reset-btn'));
    const { onConfirm } = mockShowPopup.mock.calls[0][0];
    onConfirm();
    expect(mockSetSeconds).toHaveBeenCalledWith(0);
  });

  it('calls setIsActive(!isActive) when the pause/play button is pressed', () => {
    const { getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByTestId('pause-play-btn'));
    expect(mockSetIsActive).toHaveBeenCalledWith(false); // !isActive (was true)
  });

  it('navigates back when the back button (chevron) is pressed', () => {
    const { getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByTestId('back-btn'));
    expect(MOCK_NAVIGATION.goBack).toHaveBeenCalled();
  });

  // ── Finish form ──────────────────────────────────────────────────────────────

  it('shows the book total page count in the finish form', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    expect(getByText('LIVRO TEM 300 PÁGS')).toBeTruthy();
  });

  it('pre-fills the page input with the current page', () => {
    const { getByText, getByDisplayValue } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    expect(getByDisplayValue('50')).toBeTruthy();
  });

  it('shows session duration in the stats card', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    expect(getByText('Duração')).toBeTruthy();
    expect(getByText('02:00')).toBeTruthy();
  });

  it('returns to timer view when "Ainda não terminei, voltar ao foco" is pressed', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.press(getByText('Ainda não terminei, voltar ao foco'));
    expect(getByText('Lendo Agora')).toBeTruthy();
  });

  // ── Page input validation ────────────────────────────────────────────────────

  it('strips non-numeric characters from the page input', () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    const input = getByTestId('pages-read-input');
    fireEvent.changeText(input, 'abc12x');
    expect(input.props.value).toBe('12');
  });

  it('strips leading zeros from the page input', () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '007');
    expect(getByTestId('pages-read-input').props.value).toBe('7');
  });

  it('caps the page input at totalPages', () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '9999');
    expect(getByTestId('pages-read-input').props.value).toBe('300');
  });

  // ── Speed calculation ────────────────────────────────────────────────────────

  it('shows "---" when no pages were read (endPage = currentPage)', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    // default endPage = currentPage (50) → 0 pages read → "---"
    expect(getByText('---')).toBeTruthy();
  });

  it('shows "---" when session was shorter than 60 seconds', () => {
    useTimer.mockReturnValue({
      seconds: 30,
      setSeconds: mockSetSeconds,
      isActive: false,
      setIsActive: mockSetIsActive,
    });
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '100');
    expect(getByText('---')).toBeTruthy();
  });

  it('calculates reading speed correctly', () => {
    // 120 s = 2 min, read 60-50 = 10 pages → 5.0 pág/min
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '60');
    expect(getByText('5.0 pág/min')).toBeTruthy();
  });

  // ── handleSaveProgress — validation ─────────────────────────────────────────

  it('shows error popup when endPage is less than currentPage', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '10'); // < 50
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Valor Inválido' }),
    );
    expect(mockUpdateProgress).not.toHaveBeenCalled();
  });

  it('shows error popup when endPage equals currentPage (but not the last page)', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '50'); // = currentPage, not totalPages
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('does NOT navigate when validation fails', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '10');
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(MOCK_NAVIGATION.goBack).not.toHaveBeenCalled();
  });

  // ── handleSaveProgress — success path ───────────────────────────────────────

  it('calls updateProgress with correct args and navigates back on valid save', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '80');
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(mockUpdateProgress).toHaveBeenCalledWith('b1', 80, 120);
    expect(MOCK_NAVIGATION.goBack).toHaveBeenCalled();
  });

  it('calls Haptics.notificationAsync on successful save', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '80');
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it('does NOT call addAnnotation when annotation text is empty', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '80');
    // echo input left blank
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(addAnnotation).not.toHaveBeenCalled();
  });

  it('calls addAnnotation with correct payload when annotation is filled', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '80');
    fireEvent.changeText(getByTestId('echo-text-input'), 'Insight profundo');
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(addAnnotation).toHaveBeenCalledWith(
      'u1',
      'b1',
      80,
      'Insight profundo',
      true, // isPublic default
      expect.objectContaining({ displayName: 'Tester' }),
    );
  });

  it('still saves progress even when addAnnotation throws', async () => {
    addAnnotation.mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '80');
    fireEvent.changeText(getByTestId('echo-text-input'), 'Vai falhar');
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(mockUpdateProgress).toHaveBeenCalledWith('b1', 80, 120);
    expect(MOCK_NAVIGATION.goBack).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // ── forceComplete ("TERMINEI ESTA JORNADA!") ────────────────────────────────

  it('calls updateBook with READ status and totalPages on forceComplete', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '100');
    await act(async () => {
      fireEvent.press(getByText('TERMINEI ESTA JORNADA!'));
    });
    expect(mockUpdateBook).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({
        status: BOOK_STATUS.READ,
        currentPage: 300, // forced to totalPages
      }),
    );
  });

  it('shows a success popup on forceComplete', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '100');
    await act(async () => {
      fireEvent.press(getByText('TERMINEI ESTA JORNADA!'));
    });
    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Parabéns! 🎉',
      }),
    );
  });

  it('navigates back after forceComplete', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '100');
    await act(async () => {
      fireEvent.press(getByText('TERMINEI ESTA JORNADA!'));
    });
    expect(MOCK_NAVIGATION.goBack).toHaveBeenCalled();
  });

  it('does NOT call updateProgress on forceComplete (uses updateBook instead)', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '100');
    await act(async () => {
      fireEvent.press(getByText('TERMINEI ESTA JORNADA!'));
    });
    expect(mockUpdateProgress).not.toHaveBeenCalled();
  });

  // ── Privacy toggle ───────────────────────────────────────────────────────────

  it('shows "Público (Ecoando)" by default', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    expect(getByText('Público (Ecoando)')).toBeTruthy();
  });

  it('toggles to "Privado (Só Eu)" when the privacy toggle is pressed', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.press(getByText('Público (Ecoando)'));
    expect(getByText('Privado (Só Eu)')).toBeTruthy();
  });

  it('calls addAnnotation with isPublic=false when toggled to private', async () => {
    const { getByText, getByTestId } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.changeText(getByTestId('pages-read-input'), '80');
    fireEvent.changeText(getByTestId('echo-text-input'), 'Nota privada');
    fireEvent.press(getByText('Público (Ecoando)'));
    await act(async () => {
      fireEvent.press(getByText('Salvar Sessão'));
    });
    expect(addAnnotation).toHaveBeenCalledWith(
      'u1',
      'b1',
      80,
      'Nota privada',
      false,
      expect.any(Object),
    );
  });

  it('calls Haptics.impactAsync when the privacy toggle is pressed', () => {
    const { getByText } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Finalizar'));
    fireEvent.press(getByText('Público (Ecoando)'));
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  // ── Reading status side-effect ───────────────────────────────────────────────

  it('calls updateReadingStatus with book title when timer is active', () => {
    render(<TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />);
    expect(mockUpdateReadingStatus).toHaveBeenCalledWith('Dom Casmurro');
  });

  it('calls updateReadingStatus(null) when timer is not active', () => {
    useTimer.mockReturnValue({
      seconds: 60,
      setSeconds: mockSetSeconds,
      isActive: false,
      setIsActive: mockSetIsActive,
    });
    render(<TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />);
    expect(mockUpdateReadingStatus).toHaveBeenCalledWith(null);
  });

  it('calls updateReadingStatus(null) on unmount (cleanup)', () => {
    const { unmount } = render(
      <TimerScreen route={MOCK_ROUTE} navigation={MOCK_NAVIGATION} />,
    );
    unmount();
    const calls = mockUpdateReadingStatus.mock.calls;
    expect(calls[calls.length - 1]).toEqual([null]);
  });
});
