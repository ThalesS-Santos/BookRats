import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { COLORS } from '../constants/colors';

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

const PIXEL_BORDER = 3;

const BookLoader = ({ isVisible = true }) => {
  const { isDarkMode } = useThemeStore();
  const [curiosity, setCuriosity] = useState("");
  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  // Theme-based colors
  const BG_COLOR = isDarkMode ? COLORS.background.dark : COLORS.background.light;
  const ACCENT_COLOR = isDarkMode ? '#22C55E' : COLORS.primary.light; // Neon Green in dark, Sage in light
  const TEXT_MUTED = isDarkMode ? '#94A3B8' : '#64748B';

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
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: BG_COLOR }]}>
      <View style={styles.content}>
        
        {/* Pixel Art Book Drawing (Static) */}
        <View style={styles.pixelBookContainer}>
          
          {/* Main Book Outline */}
          <View style={[styles.bookOutline, { borderColor: ACCENT_COLOR }]}>
            {/* Left Page Grouping */}
            <View style={[styles.pixelPageBlock, styles.leftPage, { borderColor: ACCENT_COLOR }]}>
                <View style={[styles.pageInnerLine, { backgroundColor: `${ACCENT_COLOR}33` }]} />
                <View style={[styles.pageInnerLine, { top: 40, backgroundColor: `${ACCENT_COLOR}33` }]} />
            </View>

            {/* Right Page Grouping */}
            <View style={[styles.pixelPageBlock, styles.rightPage, { borderColor: ACCENT_COLOR }]}>
                <View style={[styles.pageInnerLine, { backgroundColor: `${ACCENT_COLOR}33` }]} />
                <View style={[styles.pageInnerLine, { top: 50, width: 40, backgroundColor: `${ACCENT_COLOR}33` }]} />
            </View>

            {/* Central Spine */}
            <View style={[styles.pixelSpine, { backgroundColor: ACCENT_COLOR }]} />
          </View>

          {/* Optional: Subtle 3D Depth block below (Bottom part of book) */}
          <View style={styles.bookBottom}>
            <View style={[styles.pixelBlock, { borderColor: ACCENT_COLOR }]} />
            <View style={[styles.pixelBlock, { borderColor: ACCENT_COLOR }]} />
          </View>
        </View>

        {/* Curiosity Message */}
        <View style={styles.textContainer}>
          <Text style={[styles.tagLine, { color: ACCENT_COLOR }]}>SABIA QUE?</Text>
          <Text style={[styles.messageText, { color: TEXT_MUTED }]}>{curiosity}</Text>
        </View>

      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pixelSpine: {
    width: 8,
    height: '100%',
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
  },
  rightPage: {
    borderLeftWidth: PIXEL_BORDER/2,
  },
  pageInnerLine: {
    width: '100%',
    height: 3,
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
    borderTopWidth: 0,
  },
  textContainer: {
    alignItems: 'center',
  },
  tagLine: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 15,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default BookLoader;
