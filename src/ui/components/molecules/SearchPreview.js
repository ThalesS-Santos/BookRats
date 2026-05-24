import React from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, Image, FlatList } from 'react-native';

import Skeleton from '../atoms/Skeleton';

const CARD_WIDTH = 130;
const CARD_HEIGHT = 190;

/**
 * 📚 BookCard Sub-component
 * Stylized card for the bookstore/gallery feel.
 */
const BookCard = ({ book, onSelect }) => {
  return (
    <TouchableOpacity
      testID={`search-result-${book.id}`}
      activeOpacity={0.7}
      className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg overflow-hidden mr-4 border border-border-light/50 dark:border-border-dark/50"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      onPress={() => onSelect(book)}>
      {/* 80% Cover Art */}
      <View style={{ height: '75%' }}>
        <Image
          source={book.thumbnail}
          className="w-full h-full"
          resizeMode="cover"
        />

        {/* Category Badge (Step 1.8) */}
        {book.categories?.[0] && (
          <View className="absolute top-2 left-2 bg-primary/90 dark:bg-primary-dark/90 px-2 py-0.5 rounded-md shadow-sm">
            <Text className="text-white text-[8px] font-bold uppercase tracking-tighter">
              {book.categories[0].substring(0, 12)}
            </Text>
          </View>
        )}
      </View>

      {/* Stylized Footer Overlay */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-black/80 p-2 border-t border-border-light/20 dark:border-border-dark/20">
        <Text
          className="text-text-light dark:text-text-dark font-bold text-[10px]"
          numberOfLines={1}>
          {book.title.toUpperCase()}
        </Text>
        <Text
          className="text-text-muted-light dark:text-text-muted-dark text-[9px] mt-0.5"
          numberOfLines={1}>
          {book.author}
        </Text>
      </View>

      {/* Badge/Icon for selectability */}
      <View className="absolute top-2 right-2 bg-black/30 rounded-full p-1">
        <Ionicons name="add" size={14} color="white" />
      </View>
    </TouchableOpacity>
  );
};

/**
 * 🔍 SearchPreview Molecule (Gallery Layout)
 * Displays book results as a stylized horizontal gallery.
 */
const SearchPreview = ({ results, onSelect, loading, query }) => {
  // Show Skeleton shelf while loading
  if (loading) {
    return (
      <View className="flex-row py-4" testID="search-loading-skeletons">
        {[1, 2, 3].map(i => (
          <View key={i} className="mr-4">
            <Skeleton
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              borderRadius={12}
            />
          </View>
        ))}
      </View>
    );
  }

  // Empty State
  if (query.length > 2 && results.length === 0) {
    return (
      <View className="p-8 items-center bg-card-light dark:bg-card-dark rounded-2xl border border-dashed border-border-light dark:border-border-dark mt-2">
        <Ionicons name="book-outline" size={40} color="#94A3B8" />
        <Text className="text-text-muted-light dark:text-text-muted-dark mt-3 font-serif italic text-center">
          {`Nenhum título encontrado para "${query}"`}
        </Text>
      </View>
    );
  }

  if (results.length === 0) return null;

  return (
    <View className="mt-4">
      <View className="flex-row justify-between items-center mb-4 px-1">
        <Text className="text-text-muted-light dark:text-text-muted-dark font-bold text-xs uppercase tracking-widest">
          {'Sugestões da Nuvem'}
        </Text>
        <View className="bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-md">
          <Text className="text-primary dark:text-primary-light text-[9px] font-bold">
            {`${results.length} ENCONTRADOS`}
          </Text>
        </View>
      </View>

      <FlatList
        data={results}
        horizontal
        keyExtractor={item => item.id}
        renderItem={({ item }) => <BookCard book={item} onSelect={onSelect} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 4 }}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

export default React.memo(SearchPreview);
