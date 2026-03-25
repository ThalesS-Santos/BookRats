import React, { useEffect, useState, useRef } from 'react';
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
  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pageFlipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Set a random curiosity
    setCuriosity(CURIOSITIES[Math.floor(Math.random() * CURIOSITIES.length)]);

    // Initial Fade In
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Pulse animation
    const pulseSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Page flip animation
    const flipSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(pageFlipAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    );

    pulseSequence.start();
    flipSequence.start();

    return () => {
      pulseSequence.stop();
      flipSequence.stop();
    };
  }, [isVisible]);

  const getPageStyle = (index) => {
    // Standard Animated API doesn't have % in interpolate output, so we work around it
    const rotateY = pageFlipAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '-180deg', '0deg'],
    });

    // Stagger effect is harder with basic Animated, so we can use a simpler approach
    // or just leave it as one main flipping page to keep it clean and robust.
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: rotateY }
      ],
      // Standard Animated API doesn't support transformOrigin easily, 
      // but in standard transform we pivot on the center. 
      // To pivot on the left, we need to shift the center.
      // But standard View transformOrigin is experimental. 
      // Alternate: use translateX/Y to simulate pivot.
    };
  };

  if (!isVisible && fadeAnim._value === 0) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.content}>
        {/* Book Container */}
        <Animated.View 
          style={[
            styles.bookWrapper, 
            { 
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.1],
                outputRange: [0.8, 1]
              })
            }
          ]}
        >
          {/* Left Cover */}
          <View style={[styles.cover, styles.leftCover]} />
          
          {/* Right Cover */}
          <View style={[styles.cover, styles.rightCover]} />

          {/* Static Pages (the stack) */}
          <View style={styles.pageStack} />

          {/* Flipping Page */}
          <Animated.View 
            style={[
              styles.flippingPage, 
              {
                transform: [
                  { perspective: 1000 },
                  { translateX: -27.5 }, // Half width to shift pivot
                  { rotateY: pageFlipAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ['0deg', '-180deg', '0deg']
                  })},
                  { translateX: 27.5 }
                ]
              }
            ]} 
          />
          
          {/* Spine Detail */}
          <View style={styles.spine} />
        </Animated.View>

        {/* Curiosity Text */}
        <View style={styles.textContainer}>
          <Text style={styles.curiosityTitle}>DID YOU KNOW?</Text>
          <Text style={styles.curiosityText}>{curiosity}</Text>
        </View>
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
    width: '80%',
  },
  bookWrapper: {
    width: 120,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  cover: {
    position: 'absolute',
    width: 60,
    height: 80,
    borderWidth: 2,
    borderColor: '#22C55E',
    backgroundColor: '#0F172A',
  },
  leftCover: {
    left: 0,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderRightWidth: 0,
  },
  rightCover: {
    right: 0,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderLeftWidth: 0,
  },
  pageStack: {
    width: 110,
    height: 70,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#22C55E55',
    borderRadius: 2,
  },
  flippingPage: {
    position: 'absolute',
    left: 60,
    width: 55,
    height: 74,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderLeftWidth: 1,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  spine: {
    position: 'absolute',
    width: 4,
    height: 80,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  curiosityTitle: {
    color: '#22C55E',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
    opacity: 0.8,
  },
  curiosityText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default BookLoader;
