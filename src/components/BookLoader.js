import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

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

// Native Colors (Site theme)
const DARK_BLUE = '#0F172A';
const NEON_GREEN = '#22C55E';
const PIXEL_BORDER = 3;

const BookLoader = ({ isVisible = true }) => {
  const [curiosity, setCuriosity] = useState("");
  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  useEffect(() => {
    setCuriosity(CURIOSITIES[Math.floor(Math.random() * CURIOSITIES.length)]);

    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  if (!isVisible && fadeAnim._value === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        
        {/* Pixel Art Book Drawing (Static) */}
        <View style={styles.pixelBookContainer}>
          
          {/* Main Book Outline */}
          <View style={styles.bookOutline}>
            {/* Left Page Grouping */}
            <View style={[styles.pixelPageBlock, styles.leftPage]}>
                <View style={styles.pageInnerLine} />
                <View style={[styles.pageInnerLine, { top: 40 }]} />
            </View>

            {/* Right Page Grouping */}
            <View style={[styles.pixelPageBlock, styles.rightPage]}>
                <View style={styles.pageInnerLine} />
                <View style={[styles.pageInnerLine, { top: 50, width: 40 }]} />
            </View>

            {/* Central Spine */}
            <View style={styles.pixelSpine} />
          </View>

          {/* Optional: Subtle 3D Depth block below (Bottom part of book) */}
          <View style={styles.bookBottom}>
            <View style={styles.pixelBlock} />
            <View style={styles.pixelBlock} />
          </View>
        </View>

        {/* Curiosity Message */}
        <View style={styles.textContainer}>
          <Text style={styles.tagLine}>SABIA QUE?</Text>
          <Text style={styles.messageText}>{curiosity}</Text>
        </View>

      </View>
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
    width: '85%',
  },
  pixelBookContainer: {
    width: 140,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  bookOutline: {
    width: 140,
    height: 100,
    borderWidth: PIXEL_BORDER,
    borderColor: NEON_GREEN,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pixelSpine: {
    width: 8,
    height: '100%',
    backgroundColor: NEON_GREEN,
    position: 'absolute',
    left: 66 - PIXEL_BORDER/2,
  },
  pixelPageBlock: {
    flex: 1,
    height: '100%',
    padding: 10,
  },
  leftPage: {
    borderRightWidth: PIXEL_BORDER/2,
    borderColor: NEON_GREEN,
  },
  rightPage: {
    borderLeftWidth: PIXEL_BORDER/2,
    borderColor: NEON_GREEN,
  },
  pageInnerLine: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    marginBottom: 5,
  },
  bookBottom: {
    flexDirection: 'row',
    marginTop: -PIXEL_BORDER,
    width: 130,
    height: 10,
    justifyContent: 'space-between',
  },
  pixelBlock: {
    width: 30,
    height: 6,
    borderWidth: PIXEL_BORDER,
    borderColor: NEON_GREEN,
    borderTopWidth: 0,
  },
  textContainer: {
    alignItems: 'center',
  },
  tagLine: {
    color: NEON_GREEN,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 15,
  },
  messageText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default BookLoader;
