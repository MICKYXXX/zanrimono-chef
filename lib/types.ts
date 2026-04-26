export type Difficulty = '簡単' | '普通' | '難しい';

export interface Recipe {
  name: string;
  description: string;
  cookTime: string;
  difficulty: Difficulty;
  usageRate: number;
  isRecommended: boolean;
  /** この料理で節約できる金額（円） */
  estimatedSaving: number;
  /** この料理で削減できる食品ロスの量（グラム） */
  lossReduction: number;
}

export interface DetailIngredient {
  name: string;
  amount: string;
  inFridge: boolean;
  weightGrams?: number;
}

export interface RecipeDetail extends Recipe {
  detailIngredients: DetailIngredient[];
  steps: string[];
}

export interface FavoriteRecipe extends RecipeDetail {
  id: string;
  savedAt: string; // ISO date string
}

export interface AchievementData {
  totalCooked: number;
  totalSavedYen: number;
  totalLossReduced: number; // grams
  streak: { count: number; lastDate: string };
  bestStreak: number;
  /** 調理完了日の履歴（YYYY-MM-DD 形式） */
  cookingHistory: string[];
}
