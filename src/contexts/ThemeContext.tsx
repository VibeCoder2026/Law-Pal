import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONT_SIZES } from '../constants';

interface ThemeContextType {
  isDarkMode: boolean;
  fontSize: number;
  toggleDarkMode: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    accent: string;
    border: string;
    card: string;
    error: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Guyana flag colors: Red (#CE1126), Yellow (#FCD116), Green (#009E49), Black, White
const lightColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#4A5568',
  primary: '#009E49', // Guyana Green
  accent: '#CE1126', // Guyana Red
  border: '#E2E8F0',
  card: '#FFFFFF',
  error: '#CE1126',
};

const darkColors = {
  background: '#1A1A1A',
  surface: '#2D2D2D',
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
  primary: '#FCD116', // Guyana Yellow/Gold
  accent: '#CE1126', // Guyana Red
  border: '#404040',
  card: '#2D2D2D',
  error: '#FF5252',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [fontSize, setFontSize] = useState(FONT_SIZES.DEFAULT);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      const savedFontSize = await AsyncStorage.getItem('fontSize');

      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
      if (savedFontSize !== null) {
        setFontSize(parseInt(savedFontSize, 10));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const increaseFontSize = async () => {
    if (fontSize < FONT_SIZES.MAX) {
      const newSize = fontSize + 2;
      setFontSize(newSize);
      await AsyncStorage.setItem('fontSize', newSize.toString());
    }
  };

  const decreaseFontSize = async () => {
    if (fontSize > FONT_SIZES.MIN) {
      const newSize = fontSize - 2;
      setFontSize(newSize);
      await AsyncStorage.setItem('fontSize', newSize.toString());
    }
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        fontSize,
        toggleDarkMode,
        increaseFontSize,
        decreaseFontSize,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
