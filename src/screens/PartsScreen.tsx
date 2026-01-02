import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, ConstitutionPart } from '../types';
import constitutionStructure from '../assets/constitution-structure.json';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Parts'>;

export default function PartsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [parts, setParts] = useState<ConstitutionPart[]>([]);

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = () => {
    setParts(constitutionStructure.parts as ConstitutionPart[]);
  };

  const handlePartPress = (part: ConstitutionPart) => {
    navigation.navigate('PartContents', { part });
  };

  const renderPart = ({ item }: { item: ConstitutionPart }) => {
    const itemCount = item.chapters?.length || item.titles?.length || 0;
    const itemType = item.chapters ? 'chapters' : 'titles';

    return (
      <TouchableOpacity
        style={[styles.partCard, { backgroundColor: colors.surface }]}
        onPress={() => handlePartPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.partHeader}>
          <View style={[styles.partNumberBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.partNumber, { color: colors.primary }]}>
              Part {item.partNumber}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </View>

        <Text style={[styles.partTitle, { color: colors.text }]}>
          {item.title}
        </Text>

        <Text style={[styles.partDescription, { color: colors.textSecondary }]}>
          {item.description}
        </Text>

        <View style={styles.partFooter}>
          <View style={styles.contentInfo}>
            <Ionicons name="folder-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.contentText, { color: colors.textSecondary }]}>
              {itemCount} {itemType}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Constitution of Guyana
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Browse by parts
          </Text>
        </View>
      </View>

      <FlatList
        data={parts}
        renderItem={renderPart}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  partCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderRadius: 6,
  },
  partNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  partTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  partDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  partFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  contentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contentText: {
    fontSize: 13,
  },
});
