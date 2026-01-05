import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types';
import Analytics from '../services/analytics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Google Form configuration
// Form URL: https://docs.google.com/forms/d/e/1FAIpQLSfMdaypPICKdWdkkoqUQ-zxZJuTfrTm8t9oY11b7YUNlEXwJQ/viewform
const GOOGLE_FORM_ID = '1FAIpQLSfMdaypPICKdWdkkoqUQ-zxZJuTfrTm8t9oY11b7YUNlEXwJQ';
const FORM_ENTRY_IDS = {
  rating: 'entry.457237106',      // 5-star rating (1-5)
  appWins: 'entry.1461279499',    // App wins text
  appLosses: 'entry.120530554',   // App losses text
};

export default function FeedbackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const [rating, setRating] = useState<number | null>(null);
  const [appWins, setAppWins] = useState('');
  const [appLosses, setAppLosses] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!rating) {
      Alert.alert('Rating Required', 'Please rate your experience before submitting.');
      return false;
    }
    if (!appWins.trim() && !appLosses.trim()) {
      Alert.alert('Feedback Required', 'Please tell us what you liked or what needs improvement.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Build form data for Google Forms submission
      const formData = new URLSearchParams();
      formData.append(FORM_ENTRY_IDS.rating, rating?.toString() || '');
      formData.append(FORM_ENTRY_IDS.appWins, appWins.trim());
      formData.append(FORM_ENTRY_IDS.appLosses, appLosses.trim());

      // Submit to Google Forms
      const submitUrl = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;

      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      // Google Forms returns a redirect (302) or HTML page on success
      // We consider it successful if we don't get a network error
      Analytics.trackEvent('feedback_submit', {
        channel: 'google_form_background',
        rating: rating,
        hasWins: appWins.trim().length > 0,
        hasLosses: appLosses.trim().length > 0,
      });

      // Clear form
      setRating(null);
      setAppWins('');
      setAppLosses('');

      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted. We appreciate you helping us improve Law Pal 🇬🇾!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('[FeedbackScreen] Error submitting feedback:', error);
      Alert.alert(
        'Submission Failed',
        'Unable to submit feedback. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Help us improve Law Pal 🇬🇾
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Your feedback helps us build a better app for everyone
          </Text>

          {/* Star Rating */}
          <Text style={[styles.label, { color: colors.text }]}>
            Rate your experience <Text style={styles.required}>*</Text>
          </Text>
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
                  size={36}
                  color={rating && value <= rating ? '#FFD700' : colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating && (
            <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent!'}
            </Text>
          )}

          {/* App Wins */}
          <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>
            What do you like about the app?
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Tell us what's working well..."
            placeholderTextColor={colors.textSecondary}
            multiline
            value={appWins}
            onChangeText={setAppWins}
            textAlignVertical="top"
          />

          {/* App Losses */}
          <Text style={[styles.label, { color: colors.text }]}>
            What needs improvement?
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Tell us what we can do better..."
            placeholderTextColor={colors.textSecondary}
            multiline
            value={appLosses}
            onChangeText={setAppLosses}
            textAlignVertical="top"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              isSubmitting && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
            Your feedback is anonymous and helps us improve the app.
          </Text>
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
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  required: {
    color: '#E74C3C',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  starButton: {
    padding: 6,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  input: {
    minHeight: 100,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
    lineHeight: 22,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
