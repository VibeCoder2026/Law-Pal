import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types';
import { FEEDBACK_EMAIL, FEEDBACK_WHATSAPP_NUMBER } from '../constants';
import Analytics from '../services/analytics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeedbackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');

  const feedbackMessage = useMemo(() => {
    const lines = [
      'Law Pal GY Feedback',
      `Rating: ${rating ?? 'Not provided'}`,
      contact.trim() ? `Contact: ${contact.trim()}` : 'Contact: Not provided',
      `Platform: ${Platform.OS} ${Platform.Version}`,
      '',
      'Message:',
      message.trim() || '(empty)',
    ];
    return lines.join('\n');
  }, [rating, contact, message]);

  const validateMessage = () => {
    if (!message.trim()) {
      Alert.alert('Add Feedback', 'Please enter your feedback before sending.');
      return false;
    }
    return true;
  };

  const isPlaceholderValue = (value: string) => {
    const lower = value.toLowerCase();
    return !value || lower.includes('your_') || lower.includes('your@');
  };

  const handleWhatsApp = async () => {
    if (!validateMessage()) return;
    if (isPlaceholderValue(FEEDBACK_WHATSAPP_NUMBER)) {
      Alert.alert(
        'WhatsApp Not Configured',
        'Set FEEDBACK_WHATSAPP_NUMBER in src/constants/index.ts to enable WhatsApp delivery.'
      );
      return;
    }

    const text = encodeURIComponent(feedbackMessage);
    const phone = FEEDBACK_WHATSAPP_NUMBER.replace(/[^\d]/g, '');
    const url = `https://wa.me/${phone}?text=${text}`;

    try {
      await Linking.openURL(url);
      Analytics.trackEvent('feedback_send', { channel: 'whatsapp' });
    } catch (error) {
      Alert.alert('WhatsApp Error', 'Unable to open WhatsApp. Try Share instead.');
    }
  };

  const handleEmail = async () => {
    if (!validateMessage()) return;
    if (isPlaceholderValue(FEEDBACK_EMAIL)) {
      Alert.alert(
        'Email Not Configured',
        'Set FEEDBACK_EMAIL in src/constants/index.ts to enable email delivery.'
      );
      return;
    }

    const subject = encodeURIComponent('Law Pal GY Feedback');
    const body = encodeURIComponent(feedbackMessage);
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;

    try {
      await Linking.openURL(url);
      Analytics.trackEvent('feedback_send', { channel: 'email' });
    } catch (error) {
      Alert.alert('Email Error', 'Unable to open email. Try Share instead.');
    }
  };

  const handleShare = async () => {
    if (!validateMessage()) return;
    try {
      await Share.share({
        title: 'Law Pal GY Feedback',
        message: feedbackMessage,
      });
      Analytics.trackEvent('feedback_send', { channel: 'share' });
    } catch (error) {
      Alert.alert('Share Error', 'Unable to open share sheet.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Send Feedback</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>Rate your experience</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setRating(value)}
                style={styles.starButton}
                accessibilityLabel={`Rate ${value} stars`}
              >
                <Ionicons
                  name={rating && value <= rating ? 'star' : 'star-outline'}
                  size={28}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>What should we improve?</Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
            placeholder="Tell us what you want next..."
            placeholderTextColor={colors.textSecondary}
            multiline
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: colors.text }]}>Contact (optional)</Text>
          <TextInput
            style={[styles.inputSmall, { color: colors.text, backgroundColor: colors.surface }]}
            placeholder="Email or phone (if you want a reply)"
            placeholderTextColor={colors.textSecondary}
            value={contact}
            onChangeText={setContact}
            autoCapitalize="none"
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Send via WhatsApp</Text>
            </TouchableOpacity>
            {!isPlaceholderValue(FEEDBACK_WHATSAPP_NUMBER) && (
              <Text style={[styles.caption, { color: colors.textSecondary }]}>
                WhatsApp delivers to {FEEDBACK_WHATSAPP_NUMBER}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleEmail}
            >
              <Ionicons name="mail-outline" size={18} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Send via Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={18} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  input: {
    minHeight: 140,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  inputSmall: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  caption: {
    fontSize: 13,
    textAlign: 'center',
  },
});
