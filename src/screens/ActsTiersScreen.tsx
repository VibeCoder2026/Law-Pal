import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, Tier } from '../types';
import DatabaseService from '../db/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ActsTiersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const db = DatabaseService;
      if (!db.db) {
        console.warn('[ActsTiers] Database not initialized');
        return;
      }

      // Get tiers with document counts
      const tiersData = await db.db.getAllAsync<Tier>(
        `SELECT
          t.id,
          t.name,
          t.description,
          t.priority,
          t.icon,
          t.is_priority,
          COUNT(d.id) as document_count
        FROM tiers t
        LEFT JOIN documents d ON d.tier_id = t.id
        GROUP BY t.id
        ORDER BY t.priority ASC`
      );

      setTiers(tiersData);
    } catch (error) {
      console.error('[ActsTiers] Error loading tiers:', error);
      setTiers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTierPress = (tier: Tier) => {
    // Navigate to tier Acts list
    navigation.navigate('ActsList', { tier_id: tier.id, tier_name: tier.name });
  };

  const renderTier = ({ item }: { item: Tier }) => {
    // Icon mapping for tiers
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      'tier-a-rights': 'shield-checkmark',
      'tier-b-work-money': 'cash',
      'tier-c-family-safety': 'people',
      'tier-d-land-housing': 'home',
      'tier-e-democracy-gov': 'business',
      'tier-f-digital-life': 'phone-portrait',
      'tier-g-finance-tax': 'calculator',
      'tier-h-health-education': 'school',
      'tier-i-environment-resources': 'leaf',
      'tier-j-transport-immigration': 'airplane',
      'tier-k-indigenous-special': 'globe',
      'tier-l-legal-profession': 'hammer',
      'tier-z-other': 'documents',
    };

    const iconName = iconMap[item.id] || 'document-text';

    return (
      <TouchableOpacity
        style={[styles.tierCard, { backgroundColor: colors.surface }]}
        onPress={() => handleTierPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={iconName} size={32} color={colors.primary} />
        </View>

        <View style={styles.tierInfo}>
          <Text style={[styles.tierName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.tierDescription, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
          <Text style={[styles.tierCount, { color: colors.primary }]}>
            {item.document_count || 0} Acts
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Acts & Statutes</Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Loading tiers...
          </Text>
        </View>
      ) : tiers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No Acts available
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Acts will appear here once imported
          </Text>
        </View>
      ) : (
        <FlatList
          data={tiers}
          renderItem={renderTier}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 14,
    marginBottom: 6,
  },
  tierCount: {
    fontSize: 14,
    fontWeight: '500',
  },
});
