import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, TabParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SearchScreen from '../screens/SearchScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ReaderScreen from '../screens/ReaderScreen';
import ArticleListScreen from '../screens/ArticleListScreen';
import PartsScreen from '../screens/PartsScreen';
import PartContentsScreen from '../screens/PartContentsScreen';
import ActsTiersScreen from '../screens/ActsTiersScreen';
import ActsListScreen from '../screens/ActsListScreen';
import ActPdfViewerScreen from '../screens/ActPdfViewerScreen';
import ChatScreen from '../screens/ChatScreen';
import FeedbackScreen from '../screens/FeedbackScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Library') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Bookmarks') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Bookmarks" component={BookmarksScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Parts" component={PartsScreen} />
      <Stack.Screen name="PartContents" component={PartContentsScreen} />
      <Stack.Screen name="ArticleList" component={ArticleListScreen} />
      <Stack.Screen name="Reader" component={ReaderScreen} />
      <Stack.Screen name="ActsTiers" component={ActsTiersScreen} />
      <Stack.Screen name="ActsList" component={ActsListScreen} />
      <Stack.Screen name="ActPdfViewer" component={ActPdfViewerScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
    </Stack.Navigator>
  );
}
