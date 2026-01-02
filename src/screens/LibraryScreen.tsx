import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types';
import constitutionStructure from '../assets/constitution-structure.json';
import DatabaseService from '../db/database';
import Analytics from '../services/analytics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Part {
  id: string;
  partNumber: string;
  title: string;
  description: string;
  chapters?: string[];
  titles?: string[];
}

export default function LibraryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const [jumpToArticle, setJumpToArticle] = useState('');

  const parts: Part[] = constitutionStructure.parts;

  const handleJumpToArticle = async () => {
    if (!jumpToArticle.trim()) {
      Alert.alert('Invalid Input', 'Please enter an article number');
      return;
    }

    try {
      const article = await DatabaseService.getSectionByNumber(jumpToArticle.trim());
      if (article) {
        Analytics.trackJumpToArticle(jumpToArticle.trim(), true);
        navigation.navigate('Reader', { chunk_id: article.chunk_id });
        setJumpToArticle('');
      } else {
        Analytics.trackJumpToArticle(jumpToArticle.trim(), false);
        Alert.alert('Article Not Found', `No article found with number "${jumpToArticle}"`);
      }
    } catch (error) {
      console.error('[Library] Error jumping to article:', error);
      Analytics.trackError(error instanceof Error ? error : new Error(String(error)), {
        component: 'LibraryScreen',
        action: 'handleJumpToArticle',
        metadata: { article_number: jumpToArticle.trim() },
      });
      Alert.alert('Error', 'Failed to find article');
    }
  };

  const handlePartPress = (part: Part) => {
    navigation.navigate('PartContents', { part: part as any });
  };

  const renderPart = ({ item }: { item: Part }) => (
    <TouchableOpacity
      style={[styles.partCard, { backgroundColor: colors.surface }]}
      onPress={() => handlePartPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.partHeader}>
        <View style={[styles.partNumberBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.partNumberText, { color: '#FFFFFF' }]}>
            Part {item.partNumber}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </View>

      <Text style={[styles.partTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.partDescription, { color: colors.textSecondary }]}>
        {item.description}
      </Text>

      <View style={styles.partStats}>
        <View style={styles.stat}>
          <Ionicons name="document-text-outline" size={16} color={colors.accent} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.chapters ? `${item.chapters.length} Chapters` : `${item.titles?.length || 0} Titles`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Constitution</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Browse by Part
        </Text>
      </View>

      {/* Jump to Article Input */}
      <View style={[styles.jumpToArticle, { backgroundColor: colors.surface }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.jumpIcon} />
        <TextInput
          style={[styles.jumpInput, { color: colors.text }]}
          placeholder="Jump to article (e.g., 146, 212A)"
          placeholderTextColor={colors.textSecondary}
          value={jumpToArticle}
          onChangeText={setJumpToArticle}
          onSubmitEditing={handleJumpToArticle}
          returnKeyType="go"
          autoCapitalize="characters"
        />
        {jumpToArticle.length > 0 && (
          <TouchableOpacity onPress={handleJumpToArticle} style={styles.jumpButton}>
            <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={parts}
        renderItem={renderPart}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  jumpToArticle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  jumpIcon: {
    marginRight: 12,
  },
  jumpInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  jumpButton: {
    marginLeft: 8,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  partCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  partNumberBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  partNumberText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 28,
  },
  partDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  partStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
  },
});
