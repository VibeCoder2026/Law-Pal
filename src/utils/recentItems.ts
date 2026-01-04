import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG, STORAGE_KEYS } from '../constants';
import { RecentItem, ActReadingProgress } from '../types';

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getRecentItems = async (): Promise<RecentItem[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_ITEMS);
  const items = parseJson<RecentItem[]>(raw, []);
  return Array.isArray(items) ? items : [];
};

export const addRecentItem = async (item: RecentItem): Promise<RecentItem[]> => {
  const current = await getRecentItems();
  const dedupeKey = `${item.doc_id}:${item.chunk_id}`;
  const nextItem = {
    ...item,
    timestamp: item.timestamp || Date.now(),
  };

  const filtered = current.filter(
    (existing) => `${existing.doc_id}:${existing.chunk_id}` !== dedupeKey
  );

  const updated = [nextItem, ...filtered].slice(0, APP_CONFIG.UI.RECENT_ITEMS_LIMIT);
  await AsyncStorage.setItem(STORAGE_KEYS.RECENT_ITEMS, JSON.stringify(updated));
  return updated;
};

export const clearRecentItems = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_ITEMS);
};

export const getActProgressMap = async (): Promise<Record<string, ActReadingProgress>> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACT_READING_PROGRESS);
  const map = parseJson<Record<string, ActReadingProgress>>(raw, {});
  return map && typeof map === 'object' ? map : {};
};

export const setActReadingProgress = async (pdfKey: string, page: number): Promise<void> => {
  if (!pdfKey || page <= 0) return;
  const map = await getActProgressMap();
  map[pdfKey] = {
    page,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.ACT_READING_PROGRESS, JSON.stringify(map));
};

export const getActLastPage = async (pdfKey: string): Promise<number | null> => {
  const map = await getActProgressMap();
  const entry = map[pdfKey];
  if (!entry || typeof entry.page !== 'number' || entry.page <= 0) return null;
  return entry.page;
};
