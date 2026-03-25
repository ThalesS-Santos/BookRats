import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width } = Dimensions.get('window');

const CURIOSITIES = [
  "O livro mais longo já escrito tem mais de 1.2 milhão de palavras.",
  "A Bíblia de Gutenberg foi o primeiro livro impresso no mundo (1455).",
  "O menor livro do mundo mede apenas 0.07mm x 0.10mm.",
  "Ler por 6 minutos reduz o estresse em até 68%.",
  "Bibliosmia é o termo para o cheiro de livros antigos.",
  "A maior biblioteca do mundo é a de Washington, com 170 milhões de itens.",
  "Antigamente, os livros eram guardados com a lombada para dentro.",
  "O primeiro romance foi 'A História de Genji', do Japão medieval.",
  "Estudos mostram que quem lê vive, em média, 2 anos a mais.",
  "Existem livros que foram encadernados em pele humana na antiguidade."
];

// Constants for Pixel Art Look
const PIXEL_BORDER = 3;
const NEON_GREEN = '#22C55E';
const DARK_BLUE = '#0F172A';
const PAGE_COLOR = 'rgba(34, 197, 94, 0.4)';

const BookLoader = ({ isVisible = true }) => {
  const [curiosity, setCuriosity] = useState("");
  
  // Base values
  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current; 
  const textOpacity = useRef(new Animated.Value(1)).current;
  
  // Staggered Page Anims
  const page1 = useRef(new Animated.Value(0)).current;
  const page2 = useRef(new Animated.Value(0)).current;
  const page3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCuriosity(CURIOSITIES[Math.floor(Math.random() * CURIOSITIES.length)]);

    // Fade In/Out logic
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Atmospheric "Hover" float
    const hover = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, {
          toValue: -10,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(hoverAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Curiosity text pulse
    const textPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0.5, duration: 2500, useNativeDriver: true }),
      ])
    );

    // Dynamic Page Flutters
    const animatePage = (val, delay, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: duration,
            easing: Easing.out(Easing.poly(3)), // Fast and decisive
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 10, // Quick reset for loop
            useNativeDriver: true,
          })
        ])
      );
    };

    const p1 = animatePage(page1, 0, 750);
    const p2 = animatePage(page2, 250, 600);
    const p3 = animatePage(page3, 500, 900);

    hover.start();
    textPulse.start();
    p1.start();
    p2.start();
    p3.start();

    return () => {
      hover.stop();
      textPulse.stop();
      p1.stop();
      p2.stop();
      p3.stop();
    };
  }, [isVisible]);

  const renderPixelPage = (anim, zIndex, offset) => {
    // Math for "The Fold": ScaleX + SkewX
    // Simulate rotation with scale and skew for pixel art feel
    const scaleX = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0, -1], // Flip from right to left
    });

    const skewX = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '15deg', '0deg'],
    });

    const rotateZ = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '-5deg', '0deg'],
    });

    // Shadow calculation: gets darker when past vertical
    const overlayOpacity = anim.interpolate({
      inputRange: [0, 0.45, 0.5, 0.55, 1],
      outputRange: [0, 0.1, 0.4, 0.2, 0],
    });

    return (
      <Animated.View 
        style={[
          styles.pixelPage,
          { 
            zIndex,
            opacity: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.8, 1, 0.8]
            }),
            transform: [
              { translateX: -30 }, // Fixed pivot to center spine
              { scaleX },
              { skewX },
              { rotateZ },
              { translateX: 30 }
            ]
          }
        ]}
      >
        <Animated.View style={[styles.pixelShadow, { opacity: overlayOpacity }]} />
      </Animated.View>
    );
  };

  if (!isVisible && fadeAnim._value === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.content, { transform: [{ translateY: hoverAnim }] }]}>
        
        {/* Pixel Book Structure */}
        <View style={styles.bookBase}>
          {/* Main Covers (Flat Pixel blocks) */}
          <View style={[styles.pixelCover, styles.leftCover]} />
          <View style={[styles.pixelCover, styles.rightCover]} />
          
          {/* Static Page Stack (visual depth) */}
          <View style={styles.pixelStack} />

          {/* Staggered Animated Pages */}
          {renderPixelPage(page1, 30, 0)}
          {renderPixelPage(page2, 20, 250)}
          {renderPixelPage(page3, 10, 500)}

          {/* Center Spine (Solid Pixel Bar) */}
          <View style={styles.pixelSpine} />
        </View>

        {/* Retro Style Curiosity Text */}
        <Animated.View style={[styles.curiosityContainer, { opacity: textOpacity }]}>
          <Text style={styles.pixelTag}>// DATOS CURIOSOS</Text>
          <Text style={styles.pixelText}>{curiosity}</Text>
        </Animated.View>

      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
  },
  bookBase: {
    width: 140,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  pixelCover: {
    position: 'absolute',
    width: 65,
    height: 90,
    backgroundColor: DARK_BLUE,
    borderWidth: PIXEL_BORDER,
    borderColor: NEON_GREEN,
  },
  leftCover: {
    left: 0,
    borderRightWidth: 0,
  },
  rightCover: {
    right: 0,
    borderLeftWidth: 0,
  },
  pixelStack: {
    width: 120,
    height: 75,
    backgroundColor: DARK_BLUE,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  pixelSpine: {
    position: 'absolute',
    width: 8,
    height: 100,
    backgroundColor: NEON_GREEN,
    zIndex: 50,
  },
  pixelPage: {
    position: 'absolute',
    left: 70, // Align with spine
    width: 60,
    height: 82,
    backgroundColor: DARK_BLUE,
    borderWidth: 2,
    borderColor: PAGE_COLOR,
    borderLeftWidth: PIXEL_BORDER,
    borderLeftColor: NEON_GREEN,
  },
  pixelShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  curiosityContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  pixelTag: {
    color: NEON_GREEN,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 15,
  },
  pixelText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    textTransform: 'uppercase', // Adds to the tech/retro feel
  },
});

export default BookLoader;
