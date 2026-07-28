import React, { useEffect, useRef } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { COLORS } from '@constants/colors';

/**
 * PlanCard — cartão de plano selecionável com profundidade real (perspective +
 * rotateX), usado pelo PaywallScreen.
 *
 * ⚠️ Toda animação vive na prop `style` via Reanimated, nunca em `className`.
 * Classes como `scale-*`/`shadow-*`/`translate-*` dentro de um branch condicional
 * de className disparam o upgrade-warning do css-interop e crasham o dev build
 * (ver tests/suites/classNameStability.test.js). Cores dependentes de estado
 * também são animadas aqui, com `interpolateColor`, e não trocando classes.
 *
 * ⚠️ Sem `shadow-*`/elevation: em elementos animados/pressionáveis a combinação
 * elevation + opacity renderiza como retângulo preto sólido no Android. A
 * profundidade vem de borda + camadas de fundo + o halo abaixo do cartão.
 */

// Distância do observador. Menor = perspectiva mais agressiva; 900 mantém o
// efeito perceptível sem distorcer o texto do cartão.
const PERSPECTIVE = 900;

const ENTRANCE_SPRING = { damping: 18, stiffness: 120, mass: 0.9 };
const SELECT_SPRING = { damping: 15, stiffness: 180 };
const PRESS_SPRING = { damping: 20, stiffness: 350 };

export default function PlanCard({
  plan,
  isSelected,
  onSelect,
  index = 0,
  disabled = false,
  isDarkMode,
}) {
  const enter = useSharedValue(0);
  const select = useSharedValue(isSelected ? 1 : 0);
  const press = useSharedValue(0);

  // Mutação via ref: a regra react-hooks/immutability rejeita escrever em
  // `sharedValue.value` direto de um handler. Mesmo idioma do BadgeUnlockPopup.
  const animRef = useRef({ enter, select, press });

  const idleBorder = isDarkMode ? COLORS.border.dark : COLORS.border.light;
  const accent = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;
  const surface = isDarkMode ? COLORS.card.dark : COLORS.card.light;

  // Entrada escalonada: o cartão "tomba" para a posição a partir de uma
  // inclinação em X, o que dá a leitura de profundidade sem sombra.
  useEffect(() => {
    animRef.current.enter.value = withDelay(
      120 + index * 90,
      withSpring(1, ENTRANCE_SPRING),
    );
  }, [index]);

  useEffect(() => {
    animRef.current.select.value = withSpring(
      isSelected ? 1 : 0,
      SELECT_SPRING,
    );
  }, [isSelected]);

  const cardStyle = useAnimatedStyle(() => {
    const tiltIn = interpolate(enter.value, [0, 1], [16, 0]);
    const tiltPress = interpolate(press.value, [0, 1], [0, 5]);
    const riseIn = interpolate(enter.value, [0, 1], [34, 0]);
    const liftSelected = interpolate(select.value, [0, 1], [0, -4]);
    const scale =
      interpolate(press.value, [0, 1], [1, 0.972]) *
      interpolate(select.value, [0, 1], [1, 1.016]);

    return {
      opacity: enter.value,
      borderColor: interpolateColor(select.value, [0, 1], [idleBorder, accent]),
      backgroundColor: interpolateColor(
        select.value,
        [0, 1],
        [surface, isDarkMode ? '#161C16' : '#EEF3EC'],
      ),
      transform: [
        { perspective: PERSPECTIVE },
        { translateY: riseIn + liftSelected },
        { rotateX: `${tiltIn + tiltPress}deg` },
        { scale },
      ],
    };
  });

  // Halo sob o cartão selecionado: substitui a sombra (proibida aqui) por uma
  // camada de cor com opacidade animada — seguro no Android.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(select.value, [0, 1], [0, 0.16]),
    transform: [{ scale: interpolate(select.value, [0, 1], [0.92, 1]) }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(select.value, [0, 1], [idleBorder, accent]),
  }));

  const indicatorFillStyle = useAnimatedStyle(() => ({
    opacity: select.value,
    transform: [{ scale: select.value }],
  }));

  const priceStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      select.value,
      [0, 1],
      [isDarkMode ? COLORS.text.dark : COLORS.text.light, accent],
    ),
  }));

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { backgroundColor: accent }, haloStyle]}
      />

      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected, disabled }}
        accessibilityLabel={`${plan.label}, ${plan.priceString}`}
        disabled={disabled}
        onPress={() => onSelect(plan.id)}
        onPressIn={() => {
          animRef.current.press.value = withSpring(1, PRESS_SPRING);
        }}
        onPressOut={() => {
          animRef.current.press.value = withSpring(0, PRESS_SPRING);
        }}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Realce superior: sugere luz vinda de cima, dando volume ao cartão. */}
          <View
            pointerEvents="none"
            style={[
              styles.topSheen,
              { backgroundColor: isDarkMode ? '#FFFFFF' : '#FFFFFF' },
            ]}
          />

          <Animated.View style={[styles.indicator, indicatorStyle]}>
            <Animated.View
              style={[
                styles.indicatorFill,
                { backgroundColor: accent },
                indicatorFillStyle,
              ]}>
              <Ionicons
                name="checkmark"
                size={13}
                color={isDarkMode ? COLORS.background.dark : '#FFFFFF'}
              />
            </Animated.View>
          </Animated.View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">
                {plan.label}
              </Text>

              {plan.isRecommended && (
                <View
                  style={styles.badge}
                  className="bg-primary/15 dark:bg-primary-dark/20">
                  <Text className="text-primary dark:text-primary-dark font-bold text-mini uppercase tracking-ultra">
                    Melhor valor
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-text-muted-light dark:text-text-muted-dark text-xs mt-0.5">
              {plan.tagline}
            </Text>

            {plan.savingsLabel && (
              <Text className="text-primary dark:text-primary-dark font-bold text-tiny mt-1">
                {plan.savingsLabel}
              </Text>
            )}
          </View>

          <Animated.Text
            style={[styles.price, priceStyle]}
            className="font-mono font-bold">
            {plan.priceString}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  halo: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 10,
    bottom: -6,
    borderRadius: 26,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    // Largura fixa: animar borderWidth causaria reflow a cada seleção.
    borderWidth: 2,
    overflow: 'hidden',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.06,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  indicatorFill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  price: {
    fontSize: 17,
    marginLeft: 10,
  },
});
