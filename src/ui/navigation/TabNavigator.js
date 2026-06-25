/* eslint-disable react-hooks/immutability --
 * Os valores manipulados aqui são "shared values" do Reanimated, projetados
 * para serem mutados via `.value` (inclusive na UI thread, dentro de worklets).
 * A regra react-hooks/immutability (React Compiler) não entende esse modelo e
 * gera falsos positivos; ela fica desligada apenas neste arquivo de animação.
 */
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'react';

// ✅ Navegador de abas CUSTOMIZADO (TabRouter + useNavigationBuilder) com um
// pager horizontal movido por Reanimated. NÃO usa PagerView nativo — portanto
// não reintroduz o conflito React 19 concurrent + css-interop + PagerView que
// motivou a remoção do material-top-tabs. O NavigationContainer e todo o
// roteamento permanecem intactos: isto é apenas um navegador comum aninhado.
import { Ionicons } from '@expo/vector-icons';
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder,
} from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@constants/colors';
import { useMainStore } from '@core/store';
import { selectUnreadCount } from '@core/store/selectors';
import GroupsScreen from '@ui/screens/GroupsScreen';
import HomeScreen from '@ui/screens/HomeScreen';
import ProfileScreen from '@ui/screens/ProfileScreen';
import RankingScreen from '@ui/screens/RankingScreen';
import StatsScreen from '@ui/screens/StatsScreen';

import { useThemeStore } from '../../store/useThemeStore';

const TABS = [
  { name: 'Início', icon: 'book', component: HomeScreen },
  { name: 'Ranking', icon: 'trophy', component: RankingScreen },
  { name: 'Stats', icon: 'stats-chart', component: StatsScreen },
  { name: 'Social', icon: 'chatbubbles', component: GroupsScreen },
  { name: 'Perfil', icon: 'person', component: ProfileScreen },
];

// Mola de "snap" ao soltar o dedo — rápida mas suave (estilo Clash Royale).
const SNAP_SPRING = { damping: 24, stiffness: 220, mass: 0.5 };
// Curva do salto direto ao tocar numa aba (um único movimento contínuo).
const TAP_TIMING = { duration: 340, easing: Easing.out(Easing.cubic) };

// ---------------------------------------------------------------------------
// Pager horizontal: todas as telas (carregadas) ficam numa fileira e um único
// valor compartilhado (translateX) controla a posição. O gesto acompanha o
// dedo em tempo real; ao soltar, faz snap para a página mais próxima.
// ---------------------------------------------------------------------------
function SwipePager({ state, descriptors, navigation }) {
  const { width } = useWindowDimensions();
  const routes = state.routes;
  const count = routes.length;
  const index = state.index;

  const translateX = useSharedValue(-index * width);
  const startX = useSharedValue(0);
  // Marca quando a mudança de índice veio do próprio gesto, para o efeito de
  // sincronização não disparar uma segunda animação concorrente.
  const fromGesture = useSharedValue(false);
  const prevIndexRef = useRef(index);

  // Janela de telas montadas (só cresce, nunca desmonta) — preserva o
  // comportamento "lazy" original: subscriptions do Firestore não são
  // recriadas. Começa com a tela atual e suas vizinhas (para swipe imediato).
  const [loaded, setLoaded] = useState(() => {
    const s = new Set([index]);
    if (index > 0) s.add(index - 1);
    if (index < count - 1) s.add(index + 1);
    return s;
  });

  // Expande a janela para cobrir o trajeto + vizinhos, garantindo que as
  // páginas intermediárias apareçam enquanto o pager desliza por elas.
  useEffect(() => {
    setLoaded(prev => {
      const lo = Math.min(prevIndexRef.current, index);
      const hi = Math.max(prevIndexRef.current, index);
      const next = new Set(prev);
      for (let i = lo; i <= hi; i++) next.add(i);
      if (index > 0) next.add(index - 1);
      if (index < count - 1) next.add(index + 1);
      return next;
    });
  }, [index, count]);

  // Anima até a página focada em mudanças externas (toque na aba / deep link).
  // Ignorado quando a mudança nasceu do gesto (a mola já está fazendo snap).
  useEffect(() => {
    const cameFromGesture = fromGesture.value;
    prevIndexRef.current = index;
    if (cameFromGesture) {
      fromGesture.value = false;
      return;
    }
    // Adia um frame para que as páginas intermediárias recém-montadas já
    // estejam no layout quando o deslize começar (sweep contínuo, sem parada).
    const id = requestAnimationFrame(() => {
      translateX.value = withTiming(-index * width, TAP_TIMING);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width]);

  const goTo = useCallback(
    target => {
      if (target !== state.index) {
        navigation.navigate(routes[target].name);
      }
    },
    [navigation, routes, state.index],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Só "reivindica" gestos claramente horizontais; cede à rolagem vertical.
        .activeOffsetX([-16, 16])
        .failOffsetY([-14, 14])
        .onBegin(() => {
          cancelAnimation(translateX);
          startX.value = translateX.value;
        })
        .onUpdate(e => {
          const min = -(count - 1) * width;
          let next = startX.value + e.translationX;
          // Resistência (rubber-band) nas bordas.
          if (next > 0) next = next * 0.3;
          else if (next < min) next = min + (next - min) * 0.3;
          translateX.value = next;
        })
        .onEnd(e => {
          // Projeta a posição final pela velocidade para um snap natural.
          const projected = translateX.value + e.velocityX * 0.12;
          let target = Math.round(-projected / width);
          if (target < 0) target = 0;
          if (target > count - 1) target = count - 1;

          fromGesture.value = true;
          translateX.value = withSpring(-target * width, {
            ...SNAP_SPRING,
            velocity: e.velocityX,
          });

          if (target !== index) {
            runOnJS(goTo)(target);
          } else {
            fromGesture.value = false;
          }
        }),
    // Recriado quando index/width mudam para capturar valores frescos no worklet.
    // (shared values são estáveis, por isso ficam fora da lista de dependências)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, count, index, goTo],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.row, { width: width * count }, animatedStyle]}>
        {routes.map((route, i) => (
          <View key={route.key} style={{ width }}>
            {loaded.has(i) ? descriptors[route.key].render() : null}
          </View>
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

// ---------------------------------------------------------------------------
// Barra de abas (inalterada na aparência). O toque apenas navega; a animação
// do salto (passando por todas as abas no caminho) é feita pelo pager.
// ---------------------------------------------------------------------------
function CustomTabBar({ state, navigation, isDarkMode }) {
  const activeColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;
  const inactiveColor = isDarkMode ? '#64748B' : '#94A3B8';
  const unreadCount = useMainStore(selectUnreadCount);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: isDarkMode
            ? COLORS.background.dark
            : COLORS.background.light,
          borderTopColor: isDarkMode ? COLORS.border.dark : '#F1F1E6',
        },
      ]}>
      <View
        style={[
          styles.tabBar,
          { height: 65 + insets.bottom, paddingBottom: insets.bottom },
        ]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tabConfig = TABS[index];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}>
              <View>
                <Ionicons name={tabConfig.icon} size={24} color={color} />
                {tabConfig.name === 'Perfil' && unreadCount > 0 && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: COLORS.neon_green,
                        shadowColor: COLORS.neon_green,
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.tabLabel, { color }]}>{tabConfig.name}</Text>
              {isFocused && (
                <View
                  style={[
                    styles.indicator,
                    { backgroundColor: COLORS.neon_green },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Navegador customizado: usa o TabRouter (mesmo roteamento de um tab navigator
// comum) e renderiza o pager + a barra de abas.
// ---------------------------------------------------------------------------
function SwipeTabNavigator({
  initialRouteName,
  children,
  screenOptions,
  tabBar,
}) {
  const { state, descriptors, navigation, NavigationContent } =
    useNavigationBuilder(TabRouter, {
      children,
      screenOptions,
      initialRouteName,
    });

  return (
    <NavigationContent>
      <View style={styles.container}>
        <SwipePager
          state={state}
          descriptors={descriptors}
          navigation={navigation}
        />
        {tabBar({ state, descriptors, navigation })}
      </View>
    </NavigationContent>
  );
}

const createSwipeTabNavigator = createNavigatorFactory(SwipeTabNavigator);
const SwipeTab = createSwipeTabNavigator();

export default function TabNavigator({ navigation, route }) {
  const { isDarkMode } = useThemeStore();

  // 🛰️ Tab Switch Listener (mantém saltos programáticos via params).
  useEffect(() => {
    const targetIdx = route.params?.tabIndex;
    if (
      typeof targetIdx === 'number' &&
      targetIdx >= 0 &&
      targetIdx < TABS.length
    ) {
      const routeName = TABS[targetIdx].name;
      navigation.navigate(routeName);
      navigation.setParams({ tabIndex: undefined });
    }
  }, [route.params?.tabIndex, navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SwipeTab.Navigator
      tabBar={props => <CustomTabBar {...props} isDarkMode={isDarkMode} />}
      initialRouteName="Início"
      screenOptions={{ headerShown: false }}>
      {TABS.map(tab => (
        <SwipeTab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
        />
      ))}
    </SwipeTab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark_blue,
    // Clipa as páginas que ficam fora da tela (à direita) durante o deslize.
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  tabBarContainer: {
    borderTopWidth: 1.5,
  },
  tabBar: {
    flexDirection: 'row',
    height: 65,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    top: -1.5,
    width: '60%',
    height: 3,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
