import React, { useState, useMemo, useCallback } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOOK_STATUS } from '@core/constants/bookStatus';
import { useMainStore } from '@core/store';
import {
  extractAllLogs,
  getPeriodCutoff,
  getPeriodDays,
  computeDailyPages,
  computeWeeklyPages,
  computeMonthlyPages,
  computeHeatMap,
  computeGenreDistribution,
  computeAverageSpeed,
  computeAvgPagesPerDay,
  computeSessionMetrics,
  computeProjections,
  computeDayOfWeekPattern,
  computeLibrarySnapshot,
  formatNumber,
  formatDuration,
  formatDate,
} from '@core/utils/statsCompute';

import { useThemeStore } from '../../store/useThemeStore';
import BarChart from '../components/stats/BarChart';
import GenreBreakdown from '../components/stats/GenreBreakdown';
import HeatCalendar from '../components/stats/HeatCalendar';
import LibrarySnapshot from '../components/stats/LibrarySnapshot';
import SessionInsights from '../components/stats/SessionInsights';
import StatCard from '../components/stats/StatCard';

const PERIODS = [
  { key: 'semana', label: 'Semana', days: 7, chartLabel: 'Últimos 7 dias' },
  { key: 'mes', label: 'Mês', days: 30, chartLabel: 'Últimas 4 semanas' },
  {
    key: 'trimestre',
    label: 'Trimestre',
    days: 90,
    chartLabel: 'Últimos 3 meses',
  },
  { key: 'todo', label: 'Tudo', days: 365, chartLabel: 'Últimos 12 meses' },
];

const ACCENT = '#5B8C5A';
const ACCENT_DARK = '#A7C9A7';

// --- Inline sub-components ---------------------------------------------------

function SectionHeader({ title, subtitle, isDarkMode }) {
  const titleColor = isDarkMode ? '#E0E0E0' : '#1A1A1A';
  const subColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  return (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionTitle, { color: titleColor }]}>{title}</Text>
      {subtitle ? (
        <Text style={[s.sectionSub, { color: subColor }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function ProjectionCard({ item, accentColor, isDarkMode }) {
  const bg = isDarkMode ? '#000000' : '#FDFCF5';
  const border = isDarkMode ? '#262626' : '#E5E7EB';
  const titleColor = isDarkMode ? '#E0E0E0' : '#1A1A1A';
  const mutedColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const trackColor = isDarkMode ? '#262626' : '#E5E7EB';
  const pct = Math.min(1, item.progress);

  return (
    <View style={[s.projCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[s.projTitle, { color: titleColor }]} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={[s.projTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            s.projFill,
            { width: `${pct * 100}%`, backgroundColor: accentColor },
          ]}
        />
      </View>
      <View style={s.projMeta}>
        <Text style={[s.projPct, { color: accentColor }]}>
          {Math.round(pct * 100)}% concluído
        </Text>
        <Text style={[s.projEta, { color: mutedColor }]}>
          {item.daysLeft <= 1
            ? 'Quase lá!'
            : `~${item.daysLeft} dias · ${formatDate(item.finishDate)}`}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ isDarkMode }) {
  const color = isDarkMode ? '#9CA3AF' : '#6B7280';
  return (
    <View style={s.emptyContainer}>
      <Ionicons name="library-outline" size={52} color={color} />
      <Text style={[s.emptyTitle, { color }]}>Comece a ler</Text>
      <Text style={[s.emptySub, { color }]}>
        Adicione livros e registre sessões de leitura para ver suas estatísticas
        aqui.
      </Text>
    </View>
  );
}

// --- Main screen -------------------------------------------------------------

export default function StatsScreen() {
  const { isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState('mes');

  const books = useMainStore(state => state.books);
  const streak = useMainStore(state => state.streak);
  const totalPagesRead = useMainStore(state => state.totalPagesRead);
  const maxReadingSession = useMainStore(state => state.maxReadingSession);
  const totalBooksCompleted = useMainStore(state => state.totalBooksCompleted);

  const accent = isDarkMode ? ACCENT_DARK : ACCENT;

  const stats = useMemo(() => {
    const allLogs = extractAllLogs(books || []);
    const cutoff = getPeriodCutoff(selectedPeriod);
    const periodDays = getPeriodDays(selectedPeriod);
    const filteredLogs = allLogs.filter(
      l => new Date(l.date + 'T12:00:00') >= cutoff,
    );

    const readingBooks = (books || []).filter(
      b => b.status === BOOK_STATUS.READING,
    );

    const barData =
      selectedPeriod === 'semana'
        ? computeDailyPages(allLogs, 7)
        : selectedPeriod === 'mes'
          ? computeWeeklyPages(allLogs, 5)
          : selectedPeriod === 'trimestre'
            ? computeMonthlyPages(allLogs, 3)
            : computeMonthlyPages(allLogs, 12);

    const avgSpeed = computeAverageSpeed(filteredLogs);
    const avgPagesPerDay = computeAvgPagesPerDay(filteredLogs, periodDays);
    const sessionMetrics = computeSessionMetrics(allLogs);
    const heatData = computeHeatMap(allLogs, 56);
    const genreData = computeGenreDistribution(books || []);
    const librarySnapshot = computeLibrarySnapshot(books || []);
    const projections = computeProjections(readingBooks, avgPagesPerDay);
    const dowPattern = computeDayOfWeekPattern(allLogs);

    const periodPages = filteredLogs.reduce(
      (s, l) => s + (l.pagesRead || 0),
      0,
    );

    return {
      barData,
      avgSpeed,
      avgPagesPerDay,
      sessionMetrics,
      heatData,
      genreData,
      librarySnapshot,
      projections,
      dowPattern,
      periodPages,
      readingBooks,
      hasAnyLogs: allLogs.length > 0,
    };
  }, [books, selectedPeriod]);

  const onPeriodPress = useCallback(key => {
    setSelectedPeriod(key);
  }, []);

  const bg = isDarkMode ? '#000000' : '#FDFCF5';
  const textPrimary = isDarkMode ? '#E0E0E0' : '#1A1A1A';
  const textMuted = isDarkMode ? '#9CA3AF' : '#6B7280';
  const sectionBg = isDarkMode ? '#121212' : '#F5F3E7';
  const sectionBorder = isDarkMode ? '#262626' : '#E5E7EB';

  const activePeriod = PERIODS.find(p => p.key === selectedPeriod);

  const hasNoData = !books || books.length === 0;

  return (
    <View style={[s.root, { backgroundColor: bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}>
        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: textPrimary }]}>
            Estatísticas
          </Text>
          <Text style={[s.headerSub, { color: textMuted }]}>
            Sua jornada de leitura em números
          </Text>
        </View>

        {hasNoData ? (
          <EmptyState isDarkMode={isDarkMode} />
        ) : (
          <>
            {/* ── Period Selector ───────────────────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.periodRow}
              style={s.periodScroll}>
              {PERIODS.map(p => {
                const active = p.key === selectedPeriod;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => onPeriodPress(p.key)}
                    style={[
                      s.pill,
                      active
                        ? { backgroundColor: accent }
                        : {
                            backgroundColor: isDarkMode ? '#121212' : '#F5F3E7',
                          },
                    ]}>
                    <Text
                      style={[
                        s.pillText,
                        { color: active ? '#FFFFFF' : textMuted },
                      ]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── KPI Cards ─────────────────────────────────────────── */}
            <View style={s.kpiGrid}>
              <View style={s.kpiRow}>
                <StatCard
                  icon="book"
                  label="Livros Lidos"
                  rawValue={totalBooksCompleted || 0}
                  accentColor={accent}
                  isDarkMode={isDarkMode}
                />
                <View style={s.kpiGap} />
                <StatCard
                  icon="document-text"
                  label="Páginas Lidas"
                  rawValue={totalPagesRead || 0}
                  accentColor={accent}
                  isDarkMode={isDarkMode}
                />
              </View>
              <View style={[s.kpiRow, s.kpiRowGap]}>
                <StatCard
                  icon="flame"
                  label="Sequência Atual"
                  rawValue={streak || 0}
                  unit="dias"
                  accentColor="#D97706"
                  isDarkMode={isDarkMode}
                />
                <View style={s.kpiGap} />
                <StatCard
                  icon="speedometer"
                  label="Velocidade Média"
                  rawValue={stats.avgSpeed}
                  displayValue={stats.avgSpeed > 0 ? `${stats.avgSpeed}` : '—'}
                  unit={stats.avgSpeed > 0 ? 'pág/h' : undefined}
                  accentColor={accent}
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* ── Atividade de Leitura ──────────────────────────────── */}
            <View
              style={[
                s.section,
                { backgroundColor: sectionBg, borderColor: sectionBorder },
              ]}>
              <SectionHeader
                title="Atividade de Leitura"
                subtitle={activePeriod?.chartLabel}
                isDarkMode={isDarkMode}
              />
              {stats.periodPages === 0 && !stats.hasAnyLogs ? (
                <Text style={[s.noDataNote, { color: textMuted }]}>
                  Nenhuma sessão registrada neste período.
                </Text>
              ) : (
                <BarChart
                  data={stats.barData}
                  isDarkMode={isDarkMode}
                  accentColor={accent}
                />
              )}
            </View>

            {/* ── Calendário de Leitura ─────────────────────────────── */}
            <View
              style={[
                s.section,
                { backgroundColor: sectionBg, borderColor: sectionBorder },
              ]}>
              <SectionHeader
                title="Calendário de Leitura"
                subtitle="Últimas 8 semanas"
                isDarkMode={isDarkMode}
              />
              <HeatCalendar data={stats.heatData} isDarkMode={isDarkMode} />
            </View>

            {/* ── Padrão Semanal ────────────────────────────────────── */}
            {stats.hasAnyLogs && (
              <View
                style={[
                  s.section,
                  { backgroundColor: sectionBg, borderColor: sectionBorder },
                ]}>
                <SectionHeader
                  title="Padrão Semanal"
                  subtitle="Em qual dia você mais lê"
                  isDarkMode={isDarkMode}
                />
                <BarChart
                  data={stats.dowPattern}
                  isDarkMode={isDarkMode}
                  accentColor="#D97706"
                />
              </View>
            )}

            {/* ── Sua Biblioteca ────────────────────────────────────── */}
            <View
              style={[
                s.section,
                { backgroundColor: sectionBg, borderColor: sectionBorder },
              ]}>
              <SectionHeader
                title="Sua Biblioteca"
                subtitle={`${stats.librarySnapshot.total} livros catalogados`}
                isDarkMode={isDarkMode}
              />
              <LibrarySnapshot
                snapshot={stats.librarySnapshot}
                isDarkMode={isDarkMode}
              />
            </View>

            {/* ── Gêneros Favoritos ─────────────────────────────────── */}
            {stats.genreData.length > 0 && (
              <View
                style={[
                  s.section,
                  { backgroundColor: sectionBg, borderColor: sectionBorder },
                ]}>
                <SectionHeader
                  title="Gêneros Favoritos"
                  subtitle="Baseado nos livros lidos"
                  isDarkMode={isDarkMode}
                />
                <GenreBreakdown
                  data={stats.genreData}
                  isDarkMode={isDarkMode}
                />
              </View>
            )}

            {/* ── Sessões de Leitura ────────────────────────────────── */}
            {stats.sessionMetrics.totalSessions > 0 && (
              <View
                style={[
                  s.section,
                  { backgroundColor: sectionBg, borderColor: sectionBorder },
                ]}>
                <SectionHeader
                  title="Sessões de Leitura"
                  subtitle={`${stats.sessionMetrics.totalSessions} sessões registradas`}
                  isDarkMode={isDarkMode}
                />
                <SessionInsights
                  metrics={stats.sessionMetrics}
                  accentColor={accent}
                  isDarkMode={isDarkMode}
                />
                <View style={s.sessionExtra}>
                  <Ionicons name="time-outline" size={14} color={textMuted} />
                  <Text style={[s.sessionExtraText, { color: textMuted }]}>
                    Tempo total:{' '}
                    <Text style={{ color: textPrimary, fontWeight: '700' }}>
                      {formatDuration(stats.sessionMetrics.totalTimeSeconds)}
                    </Text>{' '}
                    lendo
                  </Text>
                </View>
                {maxReadingSession > 0 && (
                  <View style={[s.sessionExtra, { marginTop: 4 }]}>
                    <Ionicons name="trophy-outline" size={14} color="#D97706" />
                    <Text style={[s.sessionExtraText, { color: textMuted }]}>
                      Recorde de sessão:{' '}
                      <Text style={{ color: '#D97706', fontWeight: '700' }}>
                        {formatDuration(maxReadingSession)}
                      </Text>
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Projeção de Leitura ───────────────────────────────── */}
            {stats.readingBooks.length > 0 && (
              <View
                style={[
                  s.section,
                  { backgroundColor: sectionBg, borderColor: sectionBorder },
                ]}>
                <SectionHeader
                  title="Projeção de Leitura"
                  subtitle={
                    stats.projections.length > 0
                      ? `Ritmo atual: ${formatNumber(stats.avgPagesPerDay)} pág/dia`
                      : 'Registre sessões para ver previsões'
                  }
                  isDarkMode={isDarkMode}
                />
                {stats.projections.length > 0 ? (
                  <View style={s.projList}>
                    {stats.projections.map(item => (
                      <ProjectionCard
                        key={item.id}
                        item={item}
                        accentColor={accent}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </View>
                ) : (
                  <View
                    style={[
                      s.projEmpty,
                      { backgroundColor: isDarkMode ? '#000000' : '#FDFCF5' },
                    ]}>
                    <Ionicons
                      name="analytics-outline"
                      size={28}
                      color={textMuted}
                    />
                    <Text
                      style={[
                        s.noDataNote,
                        { color: textMuted, marginTop: 8 },
                      ]}>
                      Continue registrando sessões para ver quando vai terminar
                      seus livros.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// --- Styles ------------------------------------------------------------------

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500',
  },
  periodScroll: {
    marginBottom: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  kpiGrid: {
    marginBottom: 12,
    gap: 8,
  },
  kpiRow: {
    flexDirection: 'row',
  },
  kpiRowGap: {
    marginTop: 8,
  },
  kpiGap: {
    width: 8,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  noDataNote: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  sessionExtra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  sessionExtraText: {
    fontSize: 12,
    fontWeight: '500',
  },
  projList: {
    gap: 10,
  },
  projCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  projTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 20,
  },
  projTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  projFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  projMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  projPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  projEta: {
    fontSize: 11,
    fontWeight: '500',
  },
  projEmpty: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 260,
  },
});
