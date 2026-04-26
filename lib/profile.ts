import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export type Skill       = 'none' | 'beginner' | 'normal' | 'advanced';
export type CookingTime = 'none' | '15min' | '30min' | 'flexible';
export type Taste       = 'none' | 'light' | 'normal' | 'rich';
export type Spicy       = 'none' | 'dislike' | 'normal' | 'like';
export type MealStyle   = 'none' | 'single' | 'family' | 'healthy';
export type Genre       = 'none' | 'japanese' | 'western' | 'chinese';
export type Allergy     = 'egg' | 'dairy' | 'wheat' | 'seafood';

export interface UserProfile {
  skill:       Skill;
  cookingTime: CookingTime;
  taste:       Taste;
  spicy:       Spicy;
  style:       MealStyle;
  genre:       Genre;
  allergies:   Allergy[];
}

// ─── デフォルト値 ─────────────────────────────────────────────────────────────

export const DEFAULT_PROFILE: UserProfile = {
  skill:       'none',
  cookingTime: 'none',
  taste:       'none',
  spicy:       'none',
  style:       'none',
  genre:       'none',
  allergies:   [],
};

// ─── 選択肢定義 ───────────────────────────────────────────────────────────────

export const SKILL_OPTIONS: { value: Skill; label: string; emoji: string }[] = [
  { value: 'none',     label: '指定なし', emoji: '—'  },
  { value: 'beginner', label: '初心者',   emoji: '🔰' },
  { value: 'normal',   label: 'ふつう',   emoji: '🍳' },
  { value: 'advanced', label: '得意',     emoji: '👨‍🍳' },
];

export const COOKING_TIME_OPTIONS: { value: CookingTime; label: string; emoji: string }[] = [
  { value: 'none',     label: '指定なし',       emoji: '—'  },
  { value: '15min',    label: '15分以内',        emoji: '⚡' },
  { value: '30min',    label: '30分以内',        emoji: '🕐' },
  { value: 'flexible', label: '時間をかけてOK',  emoji: '☕' },
];

export const TASTE_OPTIONS: { value: Taste; label: string; emoji: string }[] = [
  { value: 'none',   label: '指定なし', emoji: '—'  },
  { value: 'light',  label: '薄味',     emoji: '🌿' },
  { value: 'normal', label: 'ふつう',   emoji: '🍽' },
  { value: 'rich',   label: '濃い味',   emoji: '🍖' },
];

export const SPICY_OPTIONS: { value: Spicy; label: string; emoji: string }[] = [
  { value: 'none',    label: '指定なし', emoji: '—'  },
  { value: 'dislike', label: '苦手',     emoji: '😅' },
  { value: 'normal',  label: 'ふつう',   emoji: '🌶' },
  { value: 'like',    label: '好き',     emoji: '🔥' },
];

export const STYLE_OPTIONS: { value: MealStyle; label: string; emoji: string }[] = [
  { value: 'none',    label: '指定なし',   emoji: '—'    },
  { value: 'single',  label: '一人暮らし', emoji: '🏠'   },
  { value: 'family',  label: '家族向け',   emoji: '👨‍👩‍👧' },
  { value: 'healthy', label: '健康重視',   emoji: '🥗'   },
];

export const GENRE_OPTIONS: { value: Genre; label: string; emoji: string }[] = [
  { value: 'none',     label: '指定なし', emoji: '—'  },
  { value: 'japanese', label: '和食',     emoji: '🍱' },
  { value: 'western',  label: '洋食',     emoji: '🍝' },
  { value: 'chinese',  label: '中華',     emoji: '🥟' },
];

export const ALLERGY_OPTIONS: { value: Allergy; label: string; emoji: string }[] = [
  { value: 'egg',     label: '卵',     emoji: '🥚' },
  { value: 'dairy',   label: '乳製品', emoji: '🥛' },
  { value: 'wheat',   label: '小麦',   emoji: '🌾' },
  { value: 'seafood', label: '魚介',   emoji: '🦐' },
];

// ─── ラベルマップ ─────────────────────────────────────────────────────────────

export const SKILL_LABELS: Record<Skill, string> = {
  none: '指定なし', beginner: '初心者', normal: 'ふつう', advanced: '得意',
};
export const COOKING_TIME_LABELS: Record<CookingTime, string> = {
  none: '指定なし', '15min': '15分以内', '30min': '30分以内', flexible: '時間をかけてOK',
};
export const TASTE_LABELS: Record<Taste, string> = {
  none: '指定なし', light: '薄味', normal: 'ふつう', rich: '濃い味',
};
export const SPICY_LABELS: Record<Spicy, string> = {
  none: '指定なし', dislike: '苦手', normal: 'ふつう', like: '好き',
};
export const STYLE_LABELS: Record<MealStyle, string> = {
  none: '指定なし', single: '一人暮らし', family: '家族向け', healthy: '健康重視',
};
export const GENRE_LABELS: Record<Genre, string> = {
  none: '指定なし', japanese: '和食', western: '洋食', chinese: '中華',
};
export const ALLERGY_LABELS: Record<Allergy, string> = {
  egg: '卵', dairy: '乳製品', wheat: '小麦', seafood: '魚介',
};

// ─── ストレージキー ───────────────────────────────────────────────────────────

const PROFILE_KEY = '@zanrimono/profile';

// ─── ストレージ操作 ───────────────────────────────────────────────────────────

export async function loadProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ─── プロンプト変換 ───────────────────────────────────────────────────────────

export function profileToPromptText(profile: UserProfile): string {
  const lines: string[] = [];

  if (profile.skill       !== 'none') lines.push(`- 料理スキル：${SKILL_LABELS[profile.skill]}`);
  if (profile.cookingTime !== 'none') lines.push(`- 調理時間の目安：${COOKING_TIME_LABELS[profile.cookingTime]}`);
  if (profile.taste       !== 'none') lines.push(`- 味の好み：${TASTE_LABELS[profile.taste]}`);
  if (profile.spicy       !== 'none') lines.push(`- 辛さ：${SPICY_LABELS[profile.spicy]}`);
  if (profile.style       !== 'none') lines.push(`- 食事スタイル：${STYLE_LABELS[profile.style]}`);
  if (profile.genre       !== 'none') lines.push(`- 好きなジャンル：${GENRE_LABELS[profile.genre]}`);

  if (profile.allergies.length > 0) {
    const allergyText = profile.allergies.map((a) => ALLERGY_LABELS[a]).join('・');
    lines.push(`- アレルギー・避けたい食材：${allergyText}（必ず除外してください）`);
  }

  if (lines.length === 0) return '';

  return `ユーザーの好み：\n${lines.join('\n')}\n上記を考慮してレシピを提案してください。`;
}
