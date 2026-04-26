import type { DetailIngredient } from './types';

export const FOOD_WEIGHT: Record<string, number> = {
  // 野菜
  'にんじん': 150, 'キャベツ': 1000, '玉ねぎ': 200,
  'じゃがいも': 150, '大根': 800, 'トマト': 150,
  'きゅうり': 100, 'なす': 80, 'ピーマン': 30,
  'ほうれん草': 200, 'ブロッコリー': 300, 'レタス': 300,
  'ごぼう': 180, 'れんこん': 150, 'さつまいも': 200,
  'かぼちゃ': 400, 'もやし': 200, 'ねぎ': 100,
  'しょうが': 20, 'にんにく': 10, 'パプリカ': 150,
  'アスパラガス': 20, 'セロリ': 80,
  // きのこ
  'しいたけ': 20, 'えのき': 100, 'しめじ': 100,
  'まいたけ': 100, 'エリンギ': 50,
  // 肉類
  '鶏むね肉': 250, '鶏もも肉': 250, '豚こま': 100,
  '豚ロース': 100, '牛こま': 100, 'ひき肉': 100,
  '鶏ひき肉': 100, 'ベーコン': 20, 'ソーセージ': 50,
  // 魚介
  '鮭': 80, 'サバ': 150, 'アジ': 100,
  'えび': 100, 'ホタテ': 50, 'ツナ缶': 70,
  'ちくわ': 30, 'かまぼこ': 100,
  // 卵・乳製品・豆腐
  'たまご': 60, '卵': 60, '豆腐': 300,
  '油揚げ': 30, '納豆': 50, '牛乳': 200,
  'チーズ': 20, 'バター': 10, 'ヨーグルト': 100,
  // 乾物・その他
  'こんにゃく': 250, '春雨': 50,
};

export function getWeightFromTable(name: string, qty: string): number | null {
  for (const key of Object.keys(FOOD_WEIGHT)) {
    if (name.includes(key) || key.includes(name)) {
      const num = parseFloat(qty) || 1;
      return FOOD_WEIGHT[key] * num;
    }
  }
  return null;
}

export function calcLossReduction(ingredients: DetailIngredient[]): number {
  let total = 0;
  for (const ing of ingredients) {
    if (!ing.inFridge) continue;
    const tableWeight = getWeightFromTable(ing.name, ing.amount);
    if (tableWeight !== null) {
      total += tableWeight;
    } else if (ing.weightGrams) {
      total += ing.weightGrams;
    } else {
      total += 100;
    }
  }
  return total;
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1).replace(/\.0$/, '')}kg`;
  }
  return `${grams}g`;
}
