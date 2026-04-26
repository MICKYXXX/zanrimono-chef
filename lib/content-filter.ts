/**
 * コンテンツフィルタリングユーティリティ
 *
 * 入力食材の事前検査・API出力の事後検査を行い、
 * 不適切なコンテンツがアプリ内に表示されるのを防ぐ。
 */

// ─── ブロックワードリスト ──────────────────────────────────────────────────────

/** 小文字化して部分一致でチェックするワードリスト */
const BLOCKED_TERMS: string[] = [
  // 性的コンテンツ
  'sex', 'porn', 'erotic', 'nude', 'hentai',
  'セックス', 'エロ', 'ポルノ', 'ヌード', 'わいせつ', '性的',

  // 暴力・武器・爆発物
  'explosive', 'bomb',
  '爆発物', '爆弾', '火薬', '毒ガス',

  // 違法薬物
  'cocaine', 'heroin', 'marijuana', 'cannabis', 'methamphetamine',
  'lsd', 'mdma', 'crack', 'opium', 'fentanyl',
  '覚醒剤', '麻薬', 'コカイン', 'ヘロイン', 'マリファナ', '大麻',
  '阿片', '薬物', 'ドラッグ', '違法薬',

  // 危険物・非食品
  'bleach', 'poison', 'toxic', 'pesticide', 'insecticide',
  '農薬', '殺虫剤', '除草剤', '漂白剤', '洗剤', '界面活性剤',
  '消毒液', '毒薬', '毒物', '危険物', '化学薬品',

  // 差別的表現（代表的なもの）
  'racist', 'slur',
];

// ─── コア検査関数 ─────────────────────────────────────────────────────────────

/**
 * テキストに不適切な単語が含まれているか検査する。
 * 大文字小文字を無視した部分一致で判定する。
 */
export function containsBlockedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.some((term) => lower.includes(term));
}

// ─── 入力フィルタリング ───────────────────────────────────────────────────────

export interface FilterResult<T> {
  /** 安全と判断されたアイテム */
  safe: T[];
  /** 除外されたアイテムが1件以上あるか */
  hasBlocked: boolean;
}

/**
 * 食材リストをフィルタリングし、不適切な食材を除外する。
 * name プロパティを持つ任意の型に対応する。
 */
export function filterIngredients<T extends { name: string }>(
  ingredients: T[]
): FilterResult<T> {
  const safe: T[] = [];
  let hasBlocked = false;

  for (const ing of ingredients) {
    if (containsBlockedContent(ing.name)) {
      hasBlocked = true;
    } else {
      safe.push(ing);
    }
  }

  return { safe, hasBlocked };
}

// ─── 出力フィルタリング ───────────────────────────────────────────────────────

/**
 * レシピ概要リスト（index画面）をフィルタリングする。
 * name・description に不適切な単語を含むレシピを除外する。
 */
export function filterRecipes<T extends { name: string; description: string }>(
  recipes: T[]
): T[] {
  return recipes.filter(
    (r) => !containsBlockedContent(r.name) && !containsBlockedContent(r.description)
  );
}

/**
 * レシピ詳細の材料リストをフィルタリングする。
 * name に不適切な単語を含む材料を除外する。
 */
export function filterDetailIngredients<T extends { name: string }>(
  ingredients: T[]
): T[] {
  return ingredients.filter((ing) => !containsBlockedContent(ing.name));
}

/**
 * レシピ詳細の手順リストをフィルタリングする。
 * 不適切な単語を含む手順テキストを除外する。
 */
export function filterSteps(steps: string[]): string[] {
  return steps.filter((step) => !containsBlockedContent(step));
}
