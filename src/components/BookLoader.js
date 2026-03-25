import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width } = Dimensions.get('window');

const CURIOSITIES = [
  "The longest novel ever written, 'À la recherche du temps perdu', has over 1.2 million words.",
  "The first book ever printed with movable type was the Gutenberg Bible in 1455.",
  "The world's smallest book is 'Teeny Ted from Turnip Town', measuring 0.07mm x 0.10mm.",
  "Reading for just 6 minutes a day can reduce stress levels by 68%.",
  "The most expensive book ever sold was Leonardo da Vinci's 'Codex Leicester' for $30.8 million.",
  "The first novel ever written is widely considered to be 'The Tale of Genji' from 11th-century Japan.",
  "The Harvard Library has books bound in human skin.",
  "Bibliosmia is the word for the smell of old books.",
  "The longest book title ever has 26,021 characters.",
  "The world's largest library is the Library of Congress, with over 170 million items."
];

const BookLoader = ({ isVisible = true }) => {
  const [curiosity, setCuriosity] = useState("");
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  
  // Three distinct page animations for asymmetric flutter
  const page1Anim = useRef(new Animated.Value(0)).current;
  const page2Anim = useRef(new Animated.Value(0)).current;
  const page3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCuriosity(CURIOSITIES[Math.floor(Math.random() * CURIOSITIES.length)]);

    // Initial Fade In
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Subtle Book Pulse (Covers)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Curiosity Text Loop (5s)
    const textLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.delay(3400),
        Animated.timing(textOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );

    // Physics-based page loops with asymmetry
    const createPageAnimation = (anim, duration, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            easing: Easing.out(Easing.back(1.5)), // Overshoot flutter
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 100, // Snap back for the loop feel
            useNativeDriver: true,
          })
        ])
      );
    };

    const p1 = createPageAnimation(page1Anim, 850, 0);
    const p2 = createPageAnimation(page2Anim, 700, 200);   // Staggered delay
    const p3 = createPageAnimation(page3Anim, 950, 450);   // Different speed/delay

    pulse.start();
    textLoop.start();
    p1.start();
    p2.start();
    p3.start();

    return () => {
      pulse.stop();
      textLoop.stop();
      p1.stop();
      p2.stop();
      p3.stop();
    };
  }, [isVisible]);

  // Transform factory for realistic paper flutter
  const getPageTransform = (anim, maxRot = 180, skewMax = 15) => {
    // 1. RotateY (Main Flip)
    const rotateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `-${maxRot}deg`],
    });

    // 2. SkewX (Bending physics) - Peaks at 90 degrees (progress 0.5)
    const skewX = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', `${skewMax}deg`, '0deg'],
    });

    // 3. RotateZ (Wind turbulence) - Slight tilt
    const rotateZ = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '-5deg', '0deg'],
    });

    // 4. Opacity & Lighting
    const opacity = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.7, 1, 0.7],
    });

    // 5. Simulated Shadow (Dark overlay on internal fold)
    const shadowOpacity = anim.interpolate({
      inputRange: [0, 0.45, 0.5, 0.55, 1],
      outputRange: [0, 0.2, 0.5, 0.2, 0],
    });

    return { rotateY, skewX, rotateZ, opacity, shadowOpacity };
  };

  const Page = ({ anim, maxRot, zIndex }) => {
    const { rotateY, skewX, rotateZ, opacity, shadowOpacity } = useMemo(() => getPageTransform(anim, maxRot), [anim, maxRot]);
    
    return (
      <Animated.View 
        style={[
          styles.flippingPage, 
          {
            zIndex,
            opacity,
            transform: [
              { perspective: 1200 },
              { translateX: -27.5 }, // Shift pivot to spine
              { rotateY },
              { rotateZ },
              { skewX },
              { translateX: 27.5 }
            ]
          }
        ]}
      >
        {/* Internal Shadow Overlay for depth */}
        <Animated.View style={[styles.pageShadow, { opacity: shadowOpacity }]} />
      </Animated.View>
    );
  };

  if (!isVisible && fadeAnim._value === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        
        {/* Central Book - Wind Blown Area */}
        <Animated.View style={[styles.bookWrapper, { transform: [{ scale: pulseAnim }] }]}>
          
          {/* Static Elements: Covers & Spine */}
          <View style={[styles.cover, styles.leftCover]} />
          <View style={[styles.cover, styles.rightCover]} />
          <View style={styles.spine} />
          <View style={styles.pageStack} />

          {/* Asymmetric Fluttering Pages */}
          <Page anim={page1Anim} maxRot={185} zIndex={30} />
          <Page anim={page2Anim} maxRot={170} zIndex={20} />
          <Page anim={page3Anim} maxRot={195} zIndex={10} />

        </Animated.View>

        {/* Dynamic Atmospheric Curiosity */}
        <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
          <Text style={styles.curiosityTitle}>LITERARY INSIGHT</Text>
          <Text style={styles.curiosityText}>{curiosity}</Text>
        </Animated.View>
        
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '85%',
  },
  bookWrapper: {
    width: 140,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  cover: {
    position: 'absolute',
    width: 70,
    height: 90,
    borderWidth: 3,
    borderColor: '#22C55E',
    backgroundColor: '#1E293B', // Richer inner color
  },
  leftCover: {
    left: 0,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    borderRightWidth: 0,
  },
  rightCover: {
    right: 0,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    borderLeftWidth: 0,
  },
  spine: {
    position: 'absolute',
    width: 6,
    height: 94,
    backgroundColor: '#22C55E',
    borderRadius: 3,
    zIndex: 100,
  },
  pageStack: {
    width: 130,
    height: 80,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 2,
  },
  flippingPage: {
    position: 'absolute',
    left: 70, // Start from spine
    width: 65,
    height: 84,
    backgroundColor: '#1E293B',
    borderWidth: 0.5,
    borderColor: 'rgba(34, 197, 94, 0.6)',
    borderLeftWidth: 2,
    borderLeftColor: '#22C55E',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  pageShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  textContainer: {
    alignItems: 'center',
    minHeight: 80,
  },
  curiosityTitle: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 12,
    opacity: 0.9,
  },
  curiosityText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default BookLoader;
