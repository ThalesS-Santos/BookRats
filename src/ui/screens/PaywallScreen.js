import React, { useEffect, useRef, useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@constants/colors';
import { useMainStore } from '@core/store';
import PlanCard from '@ui/components/molecules/PlanCard';
import { usePaywallPlans } from '@ui/hooks/usePaywallPlans';

import { usePopupStore } from '../../store/usePopupStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as Haptics from '../../utils/haptics';

/**
 * PaywallScreen — paywall próprio (substitui o template hospedado da
 * RevenueCatUI). Consome apenas dados do SDK core via `monetizationSlice`.
 *
 * ⚠️ Regra do projeto: nenhuma classe que dispare upgrade do css-interop
 * (`shadow-*`, `scale-*`, `translate-*`, `animate-*`, `transition-*`) pode
 * aparecer em branch condicional de `className`. Toda animação aqui é
 * Reanimated na prop `style`. Ver tests/suites/classNameStability.test.js.
 */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CTA_SPRING = { damping: 20, stiffness: 350 };

// ⚖️ Exigência de review das lojas (Apple/Google): o paywall precisa expor
// Termos de Uso e Política de Privacidade. Preencha antes de publicar — os
// links só são renderizados quando existem, para não virarem botões mortos.
const LEGAL_LINKS = {
  terms: null,
  privacy: null,
};

const BENEFITS = [
  { icon: 'library-outline', text: 'Biblioteca ativa sem limite de livros' },
  { icon: 'stats-chart-outline', text: 'Estatísticas avançadas de leitura' },
  { icon: 'ribbon-outline', text: 'Selo Pro exclusivo no perfil e no ranking' },
  { icon: 'sparkles-outline', text: 'Acesso antecipado a novos recursos' },
];

// Orbes de fundo: profundidade ambiente sem gradiente nativo (o projeto não
// tem expo-linear-gradient, e adicioná-lo exigiria um rebuild nativo).
const ORBS = [
  {
    size: SCREEN_WIDTH * 0.9,
    top: -SCREEN_WIDTH * 0.35,
    left: -SCREEN_WIDTH * 0.3,
    drift: 26,
    duration: 11000,
    delay: 0,
  },
  {
    size: SCREEN_WIDTH * 0.7,
    top: SCREEN_WIDTH * 0.55,
    left: SCREEN_WIDTH * 0.55,
    drift: -22,
    duration: 13000,
    delay: 900,
  },
  {
    size: SCREEN_WIDTH * 0.55,
    top: SCREEN_WIDTH * 1.35,
    left: -SCREEN_WIDTH * 0.15,
    drift: 18,
    duration: 15000,
    delay: 1800,
  },
];

function AmbientOrb({ size, top, left, drift, duration, delay, color }) {
  const progress = useSharedValue(0);
  const animRef = useRef({ progress });

  useEffect(() => {
    animRef.current.progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, drift]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -drift * 0.7]) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.08]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** Entrada escalonada reutilizável (fade + subida). */
function Reveal({ delay = 0, children, style: extraStyle }) {
  const progress = useSharedValue(0);
  const animRef = useRef({ progress });

  useEffect(() => {
    animRef.current.progress.value = withDelay(
      delay,
      withSpring(1, { damping: 20, stiffness: 110 }),
    );
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [22, 0]) }],
  }));

  return <Animated.View style={[extraStyle, style]}>{children}</Animated.View>;
}

export default function PaywallScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const { showPopup } = usePopupStore();

  // Seletores individuais e primitivos: seletores que montam objeto novo a cada
  // render causam loop de re-render no Zustand (ver histórico do projeto).
  const currentOffering = useMainStore(state => state.currentOffering);
  const offeringsLoading = useMainStore(state => state.offeringsLoading);
  const purchaseInProgress = useMainStore(state => state.purchaseInProgress);
  const restoreInProgress = useMainStore(state => state.restoreInProgress);
  const purchasePackage = useMainStore(state => state.purchasePackage);
  const restorePurchases = useMainStore(state => state.restorePurchases);
  const loadOfferings = useMainStore(state => state.loadOfferings);

  const { plans, defaultPlanId } = usePaywallPlans(currentOffering);

  // Guardamos só a escolha EXPLÍCITA do usuário; a seleção efetiva é derivada.
  // Evita um efeito de sincronização (que causaria render em cascata) e ainda
  // se recupera sozinha se as offerings recarregarem com outros identificadores.
  const [pickedPlanId, setPickedPlanId] = useState(null);
  const selectedPlanId = plans.some(p => p.id === pickedPlanId)
    ? pickedPlanId
    : defaultPlanId;

  const accent = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;
  const mutedColor = isDarkMode
    ? COLORS.text.muted.dark
    : COLORS.text.muted.light;

  // Offerings podem não estar carregadas se o login aconteceu antes desta tela
  // existir na árvore (ou se a primeira tentativa falhou por rede).
  useEffect(() => {
    if (!currentOffering && !offeringsLoading) loadOfferings();
  }, [currentOffering, offeringsLoading, loadOfferings]);

  const ctaPress = useSharedValue(0);
  const ctaRef = useRef({ ctaPress });
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ctaPress.value, [0, 1], [1, 0.96]) }],
  }));

  const busy = purchaseInProgress || restoreInProgress;
  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? null;

  const handleSelect = planId => {
    Haptics.selectionAsync();
    setPickedPlanId(planId);
  };

  const handlePurchase = async () => {
    if (!selectedPlan || busy) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const customerInfo = await purchasePackage(selectedPlan.pkg);

      // `null` = usuário fechou o fluxo nativo de pagamento. Não é erro.
      if (!customerInfo) return;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      showPopup({
        title: 'Compra não concluída',
        message:
          error?.userMessage ||
          'Não foi possível concluir a compra. Nenhuma cobrança foi feita.',
        type: 'error',
      });
    }
  };

  const handleRestore = async () => {
    if (busy) return;

    try {
      await restorePurchases();

      // O slice deriva `isPro` do CustomerInfo retornado; ler o estado após o
      // await evita duplicar aqui a regra de qual entitlement conta.
      if (useMainStore.getState().isPro) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showPopup({
          title: 'Assinatura restaurada',
          message: 'Seu acesso BookRats Pro foi reativado neste dispositivo.',
          type: 'success',
        });
        navigation.goBack();
        return;
      }

      showPopup({
        title: 'Nenhuma compra encontrada',
        message:
          'Não localizamos uma assinatura ativa nesta conta da loja. Verifique se está usando a mesma conta da compra original.',
        type: 'info',
      });
    } catch (error) {
      showPopup({
        title: 'Não foi possível restaurar',
        message: error?.userMessage || 'Tente novamente em instantes.',
        type: 'error',
      });
    }
  };

  const isEmpty = plans.length === 0;

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <View style={styles.orbLayer} pointerEvents="none">
        {ORBS.map((orb, i) => (
          <AmbientOrb key={i} {...orb} color={accent} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.closeRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
            <Ionicons name="close" size={20} color={mutedColor} />
          </Pressable>
        </View>

        <Reveal delay={0}>
          <Text className="text-primary dark:text-primary-dark font-bold text-mini uppercase tracking-mega mb-3">
            Assinatura
          </Text>
          <Text className="text-text-light dark:text-text-dark font-serif font-bold text-4xl">
            BookRats Pro
          </Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-base mt-2">
            Leve sua leitura ao próximo nível.
          </Text>
        </Reveal>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit, i) => (
            <Reveal
              key={benefit.icon}
              delay={150 + i * 70}
              style={styles.benefitRow}>
              <View
                style={styles.benefitIcon}
                className="bg-primary/10 dark:bg-primary-dark/15">
                <Ionicons name={benefit.icon} size={16} color={accent} />
              </View>
              <Text className="text-text-light dark:text-text-dark text-sm flex-1">
                {benefit.text}
              </Text>
            </Reveal>
          ))}
        </View>

        {offeringsLoading && isEmpty ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={accent} />
            <Text className="text-text-muted-light dark:text-text-muted-dark text-xs mt-3">
              Carregando planos…
            </Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.stateBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={26}
              color={mutedColor}
            />
            <Text className="text-text-muted-light dark:text-text-muted-dark text-sm mt-3 text-center">
              Não conseguimos carregar os planos agora.
            </Text>
            <Pressable
              onPress={loadOfferings}
              hitSlop={8}
              style={styles.retryButton}
              className="border border-primary dark:border-primary-dark">
              <Text className="text-primary dark:text-primary-dark font-bold text-xs">
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.plans}>
            {plans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={i}
                isSelected={plan.id === selectedPlanId}
                onSelect={handleSelect}
                disabled={busy}
                isDarkMode={isDarkMode}
              />
            ))}
          </View>
        )}

        {!isEmpty && (
          <Reveal delay={430}>
            <Animated.View style={ctaStyle}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Assinar agora"
                disabled={busy || !selectedPlan}
                onPress={handlePurchase}
                onPressIn={() => {
                  ctaRef.current.ctaPress.value = withSpring(1, CTA_SPRING);
                }}
                onPressOut={() => {
                  ctaRef.current.ctaPress.value = withSpring(0, CTA_SPRING);
                }}
                style={[
                  styles.cta,
                  { backgroundColor: accent, opacity: busy ? 0.7 : 1 },
                ]}>
                {purchaseInProgress ? (
                  <ActivityIndicator
                    size="small"
                    color={isDarkMode ? COLORS.background.dark : '#FFFFFF'}
                  />
                ) : (
                  <Text
                    style={[
                      styles.ctaLabel,
                      {
                        color: isDarkMode ? COLORS.background.dark : '#FFFFFF',
                      },
                    ]}>
                    Assinar Agora
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            <Text className="text-text-muted-light dark:text-text-muted-dark text-tiny text-center mt-3">
              O valor e a recorrência aparecem para confirmação antes da
              cobrança.
            </Text>

            <View style={styles.footer}>
              <Pressable onPress={handleRestore} disabled={busy} hitSlop={8}>
                {restoreInProgress ? (
                  <ActivityIndicator size="small" color={mutedColor} />
                ) : (
                  <Text className="text-text-muted-light dark:text-text-muted-dark text-xs underline">
                    Restaurar Compras
                  </Text>
                )}
              </Pressable>

              {LEGAL_LINKS.terms && (
                <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">
                  Termos de Uso
                </Text>
              )}
              {LEGAL_LINKS.privacy && (
                <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">
                  Política de Privacidade
                </Text>
              )}
            </View>
          </Reveal>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  orbLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    opacity: 0.07,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  closeRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefits: {
    marginTop: 28,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  plans: {
    marginBottom: 24,
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  cta: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
});
