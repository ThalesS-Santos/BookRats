import React, { useRef, useState, useEffect } from 'react';
import { View, Animated, PanResponder, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CommunityNote from './CommunityNote';
import * as Haptics from '../utils/haptics';

const EchoDeck = ({ echoes, onClap, COLORS, isDarkMode }) => {
  const { width } = Dimensions.get('window');
  const SWIPE_THRESHOLD = 0.4 * width;
  const SWIPE_OUT_DURATION = 250;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const position = useRef(new Animated.ValueXY()).current;
  const navigation = useNavigation();

  // Reset index when echoes change
  useEffect(() => {
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    position.setValue({ x: 0, y: 0 });
  }, [echoes]);

  const handleTap = () => {
    const currentEcho = echoes[currentIndexRef.current];
    if (currentEcho) {
      navigation.navigate('EchoDetail', { echoId: currentEcho.id, bookId: currentEcho.bookId, echo: currentEcho });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: 0 });
      },
      onPanResponderRelease: (event, gesture) => {
        if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          position.setValue({ x: 0, y: 0 }); 
          handleTap();
          return;
        }
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      }
    })
  ).current;

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? width * 1.5 : -width * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false
    }).start(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSwipeComplete();
    });
  };

  const onSwipeComplete = () => {
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(prev => {
      const nextIndex = prev < echoes.length - 1 ? prev + 1 : prev;
      currentIndexRef.current = nextIndex;
      return nextIndex;
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false
    }).start();
  };

  const renderCards = () => {
    if (currentIndex >= echoes.length) {
      return (
        <View style={styles.emptyContainer}>
          <CommunityNote 
            note={{
              userMetadata: { displayName: 'Fim do Baralho', photoURL: null },
              pageLocation: '-',
              text: 'Nenhum eco novo por enquanto. Deixe sua marca!',
              reactions: { claps: 0 },
              userId: '0',
              bookId: '0',
              id: 'empty'
            }} 
            onClap={() => {}} 
            COLORS={COLORS} 
            isDarkMode={isDarkMode} 
          />
        </View>
      );
    }

    const visibleCards = [];
    const maxVisible = Math.min(3, echoes.length - currentIndex);
    
    // We iterate backwards to manage correct layering if zIndex is tricky
    // offset 0 = Front card
    // offset 1 = Middle card
    // offset 2 = Last visible card
    for (let offset = maxVisible - 1; offset >= 0; offset--) {
      const globalIndex = currentIndex + offset;
      const item = echoes[globalIndex];

      if (offset === 0) {
        // Front Card Logic
        const rotate = position.x.interpolate({
          inputRange: [-width * 1.5, 0, width * 1.5],
          outputRange: ['-10deg', '0deg', '10deg']
        });

        const cardStyle = {
          ...position.getLayout(),
          transform: [{ rotate }],
          zIndex: 10
        };

        visibleCards.push(
          <Animated.View
            key={item.id}
            style={[styles.cardWrapper, cardStyle]}
            {...panResponder.panHandlers}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={handleTap}>
              <CommunityNote 
                note={item} 
                onClap={onClap} 
                COLORS={COLORS} 
                isDarkMode={isDarkMode} 
                isFrontCard={true} 
              />
            </TouchableOpacity>
          </Animated.View>
        );
      } else {
        // Background Cards (Fan Logic)
        // Card 1 starts at scale 0.94 and translateX -18
        // Card 2 starts at scale 0.88 and translateX -36
        const initialScale = 1 - offset * 0.06;
        const targetScale = 1 - (offset - 1) * 0.06;
        const initialTranslateX = offset * -18;
        const targetTranslateX = (offset - 1) * -18;

        const scale = position.x.interpolate({
          inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
          outputRange: [targetScale, initialScale, targetScale],
          extrapolate: 'clamp'
        });

        const translateX = position.x.interpolate({
          inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
          outputRange: [targetTranslateX, initialTranslateX, targetTranslateX],
          extrapolate: 'clamp'
        });

        const backgroundCardStyle = {
          transform: [{ scale }, { translateX }],
          zIndex: 10 - offset,
          opacity: 1 // Solid backgrounds as requested
        };

        visibleCards.push(
          <Animated.View
            key={item.id}
            style={[styles.cardWrapper, backgroundCardStyle]}
          >
             <CommunityNote 
               note={item} 
               onClap={onClap} 
               COLORS={COLORS} 
               isDarkMode={isDarkMode} 
               isFrontCard={false} 
               isBackgroundCard={true}
             />
          </Animated.View>
        );
      }
    }
    
    return visibleCards;
  };

  return (
    <View style={styles.container}>
      {renderCards()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  cardWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 288,
  },
  emptyContainer: {
    opacity: 0.5,
    transform: [{ scale: 0.95 }]
  }
});

export default React.memo(EchoDeck);
