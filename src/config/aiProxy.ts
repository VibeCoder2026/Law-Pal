import Constants from 'expo-constants';

const proxyUrl =
  Constants.expoConfig?.extra?.AI_PROXY_URL ||
  process.env.EXPO_PUBLIC_AI_PROXY_URL ||
  process.env.AI_PROXY_URL ||
  '';

export const AI_PROXY_URL = proxyUrl;
