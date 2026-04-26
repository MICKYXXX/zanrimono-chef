import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AchievementData, FavoriteRecipe } from './types';

export const STORAGE_KEYS = {
  INGREDIENTS: '@zanrimono/ingredients',
  STREAK: '@zanrimono/streak',
  FAVORITES: '@zanrimono/favorites',
  ACHIEVEMENTS: '@zanrimono/achievements',
} as const;

const DEFAULT_ACHIEVEMENTS: AchievementData = {
  totalCooked: 0,
  totalSavedYen: 0,
  totalLossReduced: 0,
  streak: { count: 0, lastDate: '' },
  bestStreak: 0,
  cookingHistory: [],
};

// ─── お気に入り ───────────────────────────────────────────────────────────────

export async function loadFavorites(): Promise<FavoriteRecipe[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveFavorite(recipe: FavoriteRecipe): Promise<void> {
  const existing = await loadFavorites();
  const deduped = existing.filter((f) => f.id !== recipe.id);
  await AsyncStorage.setItem(
    STORAGE_KEYS.FAVORITES,
    JSON.stringify([recipe, ...deduped])
  );
}

export async function removeFavorite(id: string): Promise<void> {
  const existing = await loadFavorites();
  await AsyncStorage.setItem(
    STORAGE_KEYS.FAVORITES,
    JSON.stringify(existing.filter((f) => f.id !== id))
  );
}

// ─── 実績 ──────────────────────────────────────────────────────────────────────

export async function loadAchievements(): Promise<AchievementData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!raw) return DEFAULT_ACHIEVEMENTS;
    const parsed = JSON.parse(raw) as Partial<AchievementData>;
    // 旧データとの互換性
    return {
      ...DEFAULT_ACHIEVEMENTS,
      ...parsed,
      bestStreak: parsed.bestStreak ?? parsed.streak?.count ?? 0,
      cookingHistory: parsed.cookingHistory ?? [],
    };
  } catch {
    return DEFAULT_ACHIEVEMENTS;
  }
}

export async function recordCookingComplete(
  estimatedSaving: number,
  lossReduction: number,
): Promise<AchievementData> {
  const [prev, rawStreak] = await Promise.all([
    loadAchievements(),
    AsyncStorage.getItem(STORAGE_KEYS.STREAK),
  ]);
  const streak: { count: number; lastDate: string } = rawStreak
    ? JSON.parse(rawStreak)
    : { count: 0, lastDate: '' };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const next: AchievementData = {
    totalCooked: prev.totalCooked + 1,
    totalSavedYen: prev.totalSavedYen + estimatedSaving,
    totalLossReduced: prev.totalLossReduced + lossReduction,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak.count),
    cookingHistory: [...prev.cookingHistory, today],
  };
  await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(next));
  return next;
}

// ─── 植物レベル ─────────────────────────────────────────────────────────────

/**
 * Lv1〜5 のレベルアップ閾値（累計調理回数）
 * index = lv - 1
 */
const LEVEL_THRESHOLDS = [0, 3, 7, 12, 17] as const;

export const PLANT_NAMES = ['発芽', '葉が出る', 'つぼみ', '開花', '結実'] as const;

export const PLANT_DESCRIPTIONS = [
  '小さな芽が土から顔を出しました。食品ロス削減の第一歩！',
  '葉っぱが2枚に育ちました。3回の使い切りを達成！',
  'コーラル色のつぼみが膨らんできました。7回の使い切りを達成！',
  '美しい花が咲き誇っています。12回の使い切りを達成！',
  '実がたくさんなりました！17回の使い切りを達成。最高レベル！',
] as const;

export function getPlantLevel(totalCooked: number): 1 | 2 | 3 | 4 | 5 {
  if (totalCooked >= 17) return 5;
  if (totalCooked >= 12) return 4;
  if (totalCooked >= 7) return 3;
  if (totalCooked >= 3) return 2;
  return 1;
}

/** 現在レベル内のXP進捗（0〜100） */
export function getPlantXP(totalCooked: number): number {
  const lv = getPlantLevel(totalCooked);
  if (lv >= 5) return 100;
  const start: number = LEVEL_THRESHOLDS[lv - 1];
  const end: number = LEVEL_THRESHOLDS[lv as 1 | 2 | 3 | 4];
  return Math.round(((totalCooked - start) / (end - start)) * 100);
}

/** 次のレベルに必要な残り回数 */
export function getCooksToNextLevel(totalCooked: number): number {
  const lv = getPlantLevel(totalCooked);
  if (lv >= 5) return 0;
  const nextThreshold: number = LEVEL_THRESHOLDS[lv as 1 | 2 | 3 | 4];
  return nextThreshold - totalCooked;
}

/** 今月（当月）の調理完了回数 */
export function getThisMonthCount(cookingHistory: string[]): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return cookingHistory.filter((d) => d.startsWith(prefix)).length;
}
