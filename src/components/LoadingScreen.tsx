import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const LEGAL_FACTS = [
  "The Constitution is the supreme law of Guyana.",
  "Guyana's Constitution was significantly reformed in 1980 and 2001.",
  "The Preamble recognizes the 'Co-operative Republic' status of Guyana.",
  "Fundamental rights are protected under Title 1 of the Constitution.",
  "The Golden Arrowhead flag was adopted on May 26, 1966.",
  "There are 65 members in the National Assembly of Guyana.",
  "Guyana has over 450 Acts of Parliament in its legal framework.",
  "The Criminal Law (Offences) Act covers most criminal offences.",
  "Marriage in Guyana is governed by the Marriage Act Cap 45:01.",
  "The Motor Vehicles Act regulates all road traffic in Guyana.",
  "Land ownership disputes fall under the Title to Land Act.",
  "Employment rights are protected by the Labour Act Cap 98:01.",
];

export default function LoadingScreen() {
  const { colors, isDarkMode } = useTheme();
  const [factIndex, setFactIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Cycle through facts every 3 seconds
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setFactIndex((prev) => (prev + 1) % LEGAL_FACTS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 3500);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="scale-outline" size={70} color={colors.primary} />
        </Animated.View>
        
        <Text style={[styles.title, { color: colors.text }]}>Law Pal 🇬🇾</Text>
        
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        
        <Animated.View style={[styles.factBox, { opacity: fadeAnim, backgroundColor: colors.surface }]}>
          <Text style={[styles.factLabel, { color: colors.primary }]}>DID YOU KNOW?</Text>
          <Text style={[styles.factText, { color: colors.text }]}>
            {LEGAL_FACTS[factIndex]}
          </Text>
        </Animated.View>
      </View>
      
      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        YOUR LEGAL REFERENCE FOR GUYANA
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: -1,
  },
  loader: {
    marginVertical: 30,
  },
  factBox: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  factLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  factText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
