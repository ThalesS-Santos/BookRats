import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing,
  interpolate,
  interpolateColor
} from 'react-native-reanimated';

// Reference Colors from the provided image
const BG_RED = '#BF616A'; // Reddish-pink background
const COVER_COLOR = '#EBCB8B'; // Beige/Yellow cover
const PAGE_COLOR = '#F0EAD6'; // Off-white/Beige page
const BORDER_COLOR = '#2E1D1D'; // Dark outline (simulated)
const SPINE_COLOR = '#434C5E'; // Dark gray/blue spine

const PAGE_WIDTH = 60;
const PAGE_HEIGHT = 85;
const BORDER_WIDTH = 3;

const CURIOSITIES = [
  "O livro mais longo já escrito tem mais de 1.2 milhão de palavras.",
  "A Bíblia de Gutenberg foi o primeiro livro impresso no mundo (1455).",
  "O menor livro do mundo mede apenas 0.07mm x 0.10mm.",
  "Ler por 6 minutos reduz o estresse em até 68%.",
  "Bibliosmia é o termo para o cheiro de livros antigos.",
  "A maior biblioteca do mundo é a de Washington, com 170 milhões de itens.",
  "Estudos mostram que quem lê vive, em média, 2 anos a mais."
];

const Page = ({ delay, zIndex }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = 0;
    rotation.value = withRepeat(
      withDelay(
        delay,
        withTiming(180, {
          duration: 1000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        })
      ),
      -1,
      false
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    // Dynamic Color Morph: Beige to Cover-Yellow at 90 deg
    const backgroundColor = interpolateColor(
      rotation.value,
      [89, 91],
      [PAGE_COLOR, COVER_COLOR]
    );

    // Windy Distortion: skew and rotateZ as it turns
    const skewX = interpolate(rotation.value, [0, 90, 180], [0, 10, 0]);
    const rotateZ = interpolate(rotation.value, [0, 90, 180], [0, -3, 0]);

    return {
      zIndex,
      backgroundColor,
      transform: [
        { perspective: 400 },
        { translateX: PAGE_WIDTH / 2 }, // Pivot at spine
        { rotateY: `${-rotation.value}deg` },
        { skewX: `${skewX}deg` },
        { rotateZ: `${rotateZ}deg` },
        { translateX: -PAGE_WIDTH / 2 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.page, animatedStyle]}>
        {/* Subtle page line for texture */}
        <View style={styles.pageDetail} />
    </Animated.View>
  );
};

export default function BookSwapLoader({ isVisible = true }) {
  const [curiosity, setCuriosity] = useState("");

  useEffect(() => {
    if (isVisible) {
      setCuriosity(CURIOSITIES[Math.floor(Math.random() * CURIOSITIES.length)]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* 3D Atmospheric Book Base */}
      <View style={styles.bookBase}>
        
        {/* Static Left Cover (Base) */}
        <View style={[styles.staticHalf, styles.leftCover]}>
            <View style={styles.coverDetail} />
        </View>

        {/* Right Stack (Base/Underneath pages) */}
        <View style={[styles.staticHalf, styles.rightStack]} />

        {/* Staggered Swapping Pages */}
        <Page delay={0} zIndex={30} />
        <Page delay={250} zIndex={20} />
        <Page delay={500} zIndex={10} />

        {/* Thick SPINE (Stands on top) */}
        <View style={styles.spine} />
      </View>

      {/* Retro Style Curiosity Text */}
      <View style={styles.textContainer}>
        <Text style={styles.pixelTag}>// DATOS CURIOSOS</Text>
        <Text style={styles.pixelText}>{curiosity}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_RED,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  bookBase: {
    width: PAGE_WIDTH * 2,
    height: PAGE_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // 3D Perspective Tilt from image
    transform: [
      { perspective: 800 },
      { rotateX: '15deg' },
      { rotateZ: '-5deg' },
    ],
    marginBottom: 60,
  },
  staticHalf: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    position: 'absolute',
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
  },
  leftCover: {
    left: 0,
    backgroundColor: COVER_COLOR,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderRightWidth: 0,
  },
  rightStack: {
    right: 0,
    backgroundColor: PAGE_COLOR,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderLeftWidth: 0,
    opacity: 0.8,
  },
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    position: 'absolute',
    right: 0,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    borderLeftWidth: 0,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backfaceVisibility: 'visible',
  },
  pageDetail: {
    position: 'absolute',
    top: 15,
    right: 8,
    width: 2,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  coverDetail: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 25,
    height: 2,
    backgroundColor: BORDER_COLOR,
    opacity: 0.5,
  },
  spine: {
    width: 8,
    height: PAGE_HEIGHT + 4,
    backgroundColor: SPINE_COLOR,
    borderRadius: 2,
    zIndex: 100,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  pixelTag: {
    color: BORDER_COLOR,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 12,
    opacity: 0.6,
  },
  pixelText: {
    color: BORDER_COLOR,
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    maxWidth: 260,
  },
});
