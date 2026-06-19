/**
 * Stats Components — Unit Tests
 *
 * Covers all six stat-UI components:
 *   StatCard, BarChart, HeatCalendar, GenreBreakdown, LibrarySnapshot, SessionInsights
 *
 * None of these components access the store directly; they receive all data as props.
 * Animation start is called but transitions complete synchronously in the test environment.
 */

import React from 'react';

import { render } from '@testing-library/react-native';

import BarChart from '@ui/components/stats/BarChart';
import GenreBreakdown from '@ui/components/stats/GenreBreakdown';
import HeatCalendar from '@ui/components/stats/HeatCalendar';
import LibrarySnapshot from '@ui/components/stats/LibrarySnapshot';
import SessionInsights from '@ui/components/stats/SessionInsights';
import StatCard from '@ui/components/stats/StatCard';

// ── StatCard ─────────────────────────────────────────────────────────────────
describe('StatCard', () => {
  const base = {
    icon: 'book',
    label: 'Livros Lidos',
    rawValue: 0,
    accentColor: '#5B8C5A',
    isDarkMode: false,
  };

  it('renders without crashing', () => {
    const { getByText } = render(<StatCard {...base} />);
    expect(getByText('Livros Lidos')).toBeTruthy();
  });

  it('shows displayValue when provided (bypasses animation)', () => {
    const { getByText } = render(
      <StatCard {...base} rawValue={99} displayValue="99 pág/h" />,
    );
    expect(getByText('99 pág/h')).toBeTruthy();
  });

  it('shows em-dash displayValue for zero speed', () => {
    const { getByText } = render(
      <StatCard {...base} displayValue="—" />,
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('renders unit text when unit prop is provided', () => {
    const { getByText } = render(
      <StatCard {...base} rawValue={5} unit="dias" />,
    );
    expect(getByText('dias')).toBeTruthy();
  });

  it('does not render unit text when unit is omitted', () => {
    const { queryByText } = render(<StatCard {...base} />);
    expect(queryByText('dias')).toBeNull();
  });

  it('renders in dark mode without crashing', () => {
    const { getByText } = render(<StatCard {...base} isDarkMode={true} />);
    expect(getByText('Livros Lidos')).toBeTruthy();
  });

  it('renders with large rawValue', () => {
    const { getByText } = render(
      <StatCard {...base} rawValue={5000} displayValue="5K" />,
    );
    expect(getByText('5K')).toBeTruthy();
  });
});

// ── BarChart ──────────────────────────────────────────────────────────────────
describe('BarChart', () => {
  const baseData = [
    { label: 'Seg', shortLabel: 'S', pages: 10, key: '2026-06-12' },
    { label: 'Ter', shortLabel: 'T', pages: 30, key: '2026-06-13' },
    { label: 'Qua', shortLabel: 'Q', pages: 0,  key: '2026-06-14' },
  ];

  it('returns null for empty data array', () => {
    const { toJSON } = render(
      <BarChart data={[]} isDarkMode={false} accentColor="#5B8C5A" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('returns null when data is undefined', () => {
    const { toJSON } = render(
      <BarChart isDarkMode={false} accentColor="#5B8C5A" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders one bar wrapper per data item', () => {
    const { getAllByText } = render(
      <BarChart data={baseData} isDarkMode={false} accentColor="#5B8C5A" />,
    );
    // shortLabel is used for bar labels (BarChart uses shortLabel || label)
    expect(getAllByText('S')).toHaveLength(1);
    expect(getAllByText('T')).toHaveLength(1);
    expect(getAllByText('Q')).toHaveLength(1);
  });

  it('shows value label for non-zero bars', () => {
    const { getByText } = render(
      <BarChart data={baseData} isDarkMode={false} accentColor="#5B8C5A" />,
    );
    expect(getByText('10')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
  });

  it('does not show value label for zero-page bars', () => {
    const { queryByText } = render(
      <BarChart data={baseData} isDarkMode={false} accentColor="#5B8C5A" />,
    );
    // The zero bar (Qua) should NOT show a "0" value label
    expect(queryByText('0')).toBeNull();
  });

  it('formats pages >= 1000 as K notation', () => {
    const data = [{ label: 'Jan', shortLabel: 'J', pages: 1500, key: '2026-01-15' }];
    const { getByText } = render(
      <BarChart data={data} isDarkMode={false} accentColor="#5B8C5A" />,
    );
    expect(getByText('1.5K')).toBeTruthy();
  });

  it('renders without shortLabel (falls back to label)', () => {
    const data = [{ label: 'Jan/26', pages: 50, key: '2026-01-15' }];
    const { getByText } = render(
      <BarChart data={data} isDarkMode={false} accentColor="#5B8C5A" />,
    );
    expect(getByText('Jan/26')).toBeTruthy();
  });
});

// ── HeatCalendar ─────────────────────────────────────────────────────────────
describe('HeatCalendar', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <HeatCalendar data={{}} isDarkMode={false} />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('shows legend labels Menos and Mais', () => {
    const { getByText } = render(
      <HeatCalendar data={{}} isDarkMode={false} />,
    );
    expect(getByText('Menos')).toBeTruthy();
    expect(getByText('Mais')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    const { getByText } = render(
      <HeatCalendar data={{}} isDarkMode={true} />,
    );
    expect(getByText('Menos')).toBeTruthy();
  });

  it('handles null data gracefully', () => {
    const { toJSON } = render(
      <HeatCalendar data={null} isDarkMode={false} />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders with page data without crashing', () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayKey = `${y}-${m}-${d}`;

    const { getByText } = render(
      <HeatCalendar data={{ [todayKey]: 50 }} isDarkMode={false} />,
    );
    expect(getByText('Mais')).toBeTruthy();
  });
});

// ── GenreBreakdown ────────────────────────────────────────────────────────────
describe('GenreBreakdown', () => {
  const data = [
    { genre: 'Fantasia', count: 5 },
    { genre: 'Ficção Científica', count: 3 },
    { genre: 'Mistério', count: 1 },
  ];

  it('returns null when data is empty', () => {
    const { toJSON } = render(
      <GenreBreakdown data={[]} isDarkMode={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('returns null when data is undefined', () => {
    const { toJSON } = render(<GenreBreakdown isDarkMode={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders genre names', () => {
    const { getByText } = render(
      <GenreBreakdown data={data} isDarkMode={false} />,
    );
    expect(getByText('Fantasia')).toBeTruthy();
    expect(getByText('Ficção Científica')).toBeTruthy();
    expect(getByText('Mistério')).toBeTruthy();
  });

  it('renders genre counts', () => {
    const { getByText } = render(
      <GenreBreakdown data={data} isDarkMode={false} />,
    );
    expect(getByText('5')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    const { getByText } = render(
      <GenreBreakdown data={data} isDarkMode={true} />,
    );
    expect(getByText('Fantasia')).toBeTruthy();
  });
});

// ── LibrarySnapshot ───────────────────────────────────────────────────────────
describe('LibrarySnapshot', () => {
  const emptySnapshot = {
    reading: 0, read: 0, wantToRead: 0, dropped: 0, bought: 0, recommended: 0, total: 0,
  };
  const fullSnapshot = {
    reading: 3, read: 10, wantToRead: 5, dropped: 1, bought: 2, recommended: 0, total: 21,
  };

  it('shows empty message when all counts are 0', () => {
    const { getByText } = render(
      <LibrarySnapshot snapshot={emptySnapshot} isDarkMode={false} />,
    );
    expect(
      getByText(/Adicione livros à biblioteca para ver a distribuição/),
    ).toBeTruthy();
  });

  it('shows legend labels for active segments', () => {
    const { getByText } = render(
      <LibrarySnapshot snapshot={fullSnapshot} isDarkMode={false} />,
    );
    expect(getByText('Lendo')).toBeTruthy();
    expect(getByText('Lidos')).toBeTruthy();
    expect(getByText('Quero Ler')).toBeTruthy();
    expect(getByText('Abandonados')).toBeTruthy();
    expect(getByText('Comprados')).toBeTruthy();
  });

  it('shows total book count', () => {
    const { getByText } = render(
      <LibrarySnapshot snapshot={fullSnapshot} isDarkMode={false} />,
    );
    expect(getByText(/21 livros na biblioteca/)).toBeTruthy();
  });

  it('hides segments with count 0 from legend (recommended=0)', () => {
    const { queryByText } = render(
      <LibrarySnapshot snapshot={fullSnapshot} isDarkMode={false} />,
    );
    // recommended=0 so "Indicados" should not appear
    expect(queryByText('Indicados')).toBeNull();
  });

  it('renders in dark mode without crashing', () => {
    const { getByText } = render(
      <LibrarySnapshot snapshot={fullSnapshot} isDarkMode={true} />,
    );
    expect(getByText('Lidos')).toBeTruthy();
  });
});

// ── SessionInsights ───────────────────────────────────────────────────────────
describe('SessionInsights', () => {
  const metrics = {
    avgDuration: 1800,  // 30min
    maxDuration: 3600,  // 1h
    totalSessions: 5,
    totalTimeSeconds: 9000,
  };

  it('returns null when totalSessions is 0', () => {
    const { toJSON } = render(
      <SessionInsights
        metrics={{ ...metrics, totalSessions: 0 }}
        accentColor="#5B8C5A"
        isDarkMode={false}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('returns null when metrics is null', () => {
    const { toJSON } = render(
      <SessionInsights metrics={null} accentColor="#5B8C5A" isDarkMode={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('shows Sessão Média label', () => {
    const { getByText } = render(
      <SessionInsights metrics={metrics} accentColor="#5B8C5A" isDarkMode={false} />,
    );
    expect(getByText('Sessão Média')).toBeTruthy();
  });

  it('shows Recorde label', () => {
    const { getByText } = render(
      <SessionInsights metrics={metrics} accentColor="#5B8C5A" isDarkMode={false} />,
    );
    expect(getByText('Recorde')).toBeTruthy();
  });

  it('shows Sessões Total label', () => {
    const { getByText } = render(
      <SessionInsights metrics={metrics} accentColor="#5B8C5A" isDarkMode={false} />,
    );
    expect(getByText('Sessões Total')).toBeTruthy();
  });

  it('formats avgDuration with formatDuration (30min)', () => {
    const { getByText } = render(
      <SessionInsights metrics={metrics} accentColor="#5B8C5A" isDarkMode={false} />,
    );
    expect(getByText('30min')).toBeTruthy();
  });

  it('formats maxDuration with formatDuration (1h)', () => {
    const { getByText } = render(
      <SessionInsights metrics={metrics} accentColor="#5B8C5A" isDarkMode={false} />,
    );
    expect(getByText('1h')).toBeTruthy();
  });

  it('shows totalSessions as a plain string', () => {
    const { getByText } = render(
      <SessionInsights metrics={metrics} accentColor="#5B8C5A" isDarkMode={false} />,
    );
    expect(getByText('5')).toBeTruthy();
  });

  it('renders in dark mode without crashing', () => {
    const { getByText } = render(
      <SessionInsights metrics={metrics} accentColor="#5B8C5A" isDarkMode={true} />,
    );
    expect(getByText('Sessão Média')).toBeTruthy();
  });
});
