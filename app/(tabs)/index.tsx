import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppColors } from '@/constants/theme';
import { filterIngredients, filterRecipes } from '@/lib/content-filter';
import {
  DEFAULT_PROFILE,
  UserProfile,
  loadProfile,
  profileToPromptText,
} from '@/lib/profile';
import { setNavStore } from '@/lib/store';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface Ingredient {
  id: string;
  name: string;
  amount: string;
}

interface Recipe {
  name: string;
  description: string;
  cookTime: string;
  difficulty: '簡単' | '普通' | '難しい';
  usageRate: number;
  isRecommended: boolean;
  estimatedSaving: number;
  lossReduction: number;
}

interface StreakData {
  count: number;
  lastDate: string; // YYYY-MM-DD
}

// ─── 定数 ────────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  INGREDIENTS: '@zanrimono/ingredients',
  STREAK: '@zanrimono/streak',
} as const;

const API_ENDPOINT =
  'https://dashing-crumble-cb48ca.netlify.app/api/chat';

const DIFFICULTY_COLORS: Record<Recipe['difficulty'], string> = {
  簡単: AppColors.green,
  普通: '#D4845A',
  難しい: AppColors.coral,
};

const DIFFICULTY_LABELS: Record<Recipe['difficulty'], string> = {
  簡単: 'かんたん',
  普通: 'ふつう',
  難しい: 'むずかしい',
};

// ─── 並べ替え ────────────────────────────────────────────────────────────────

type SortKey = 'recommended' | 'cookTime' | 'usageRate' | 'difficulty';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recommended',  label: 'おすすめ順' },
  { key: 'cookTime',     label: '調理時間が短い順' },
  { key: 'usageRate',    label: '使い切り率が高い順' },
  { key: 'difficulty',   label: '難易度が低い順' },
];

const DIFFICULTY_ORDER: Record<Recipe['difficulty'], number> = {
  簡単: 0,
  普通: 1,
  難しい: 2,
};

/**
 * 調理時間文字列を分単位の整数に変換する。
 *
 * 対応パターン：
 *   「20分」      → 20
 *   「1時間」     → 60
 *   「1時間30分」 → 90
 *   「約30分」    → 30
 *   「30〜40分」  → 30（範囲は先頭の小さい値を採用）
 */
function parseCookTimeMinutes(cookTime: string): number {
  // 時間部分：(\d+)時間
  const hourMatch = cookTime.match(/(\d+)\s*時間/);
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;

  // 分部分：範囲「30〜40分」には (\d+)(?:[〜~]\d+)?分 で先頭の数値を取る
  const minMatch = cookTime.match(/(\d+)(?:[〜~]\d+)?\s*分/);
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;

  const total = hours * 60 + mins;
  return total > 0 ? total : 999; // 解析不能な場合はソートで末尾へ
}

/**
 * usageRate を 0〜100 の範囲に正規化する。
 * API が 0〜1 の小数を返すケースにも対応する。
 */
function normalizeUsageRate(rate: number): number {
  return rate <= 1 ? rate * 100 : rate;
}

function sortRecipes(list: Recipe[], key: SortKey): Recipe[] {
  // スプレッドで新しい配列を作成し元の配列を変更しない
  const copy = [...list];

  let sorted: Recipe[];
  switch (key) {
    case 'recommended':
      sorted = copy.sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended));
      break;
    case 'cookTime':
      sorted = copy.sort(
        (a, b) => parseCookTimeMinutes(a.cookTime) - parseCookTimeMinutes(b.cookTime)
      );
      break;
    case 'usageRate':
      sorted = copy.sort(
        (a, b) => normalizeUsageRate(b.usageRate) - normalizeUsageRate(a.usageRate)
      );
      break;
    case 'difficulty':
      sorted = copy.sort(
        (a, b) =>
          (DIFFICULTY_ORDER[a.difficulty] ?? 99) - (DIFFICULTY_ORDER[b.difficulty] ?? 99)
      );
      break;
    default:
      sorted = copy;
  }

  // ─ デバッグログ ─
  console.log(
    `[Sort] key="${key}" count=${sorted.length}`,
    sorted.map((r) => {
      const value =
        key === 'cookTime'   ? `${parseCookTimeMinutes(r.cookTime)}分` :
        key === 'usageRate'  ? `${normalizeUsageRate(r.usageRate).toFixed(1)}%` :
        key === 'difficulty' ? r.difficulty :
        String(r.isRecommended);
      return `${r.name}(${value})`;
    })
  );

  return sorted;
}

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function HomeScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [streak, setStreak] = useState<StreakData>({ count: 0, lastDate: '' });
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('recommended');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const amountInputRef = useRef<TextInput>(null);

  const sortedRecipes = useMemo(() => sortRecipes(recipes, sortKey), [recipes, sortKey]);

  // 画面フォーカス時にプロフィールを再読み込み（プロフィール画面から戻ったときも反映）
  useFocusEffect(
    useCallback(() => {
      loadProfile().then(setProfile);
    }, [])
  );

  // ─── 永続化ロード ─────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [rawIng, rawStreak] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.INGREDIENTS),
          AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        ]);
        if (rawIng) setIngredients(JSON.parse(rawIng));
        if (rawStreak) setStreak(JSON.parse(rawStreak));
      } catch {
        // 読み込み失敗は無視
      }
    })();
  }, []);

  // ─── 食材の保存 ───────────────────────────────────────────────────────────

  const saveIngredients = useCallback(async (list: Ingredient[]) => {
    setIngredients(list);
    await AsyncStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(list));
  }, []);

  // ─── 食材追加 ────────────────────────────────────────────────────────────

  const handleAddIngredient = useCallback(async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const next = [
      ...ingredients,
      { id: uid(), name: trimmedName, amount: newAmount.trim() },
    ];
    await saveIngredients(next);
    setNewName('');
    setNewAmount('');
  }, [ingredients, newName, newAmount, saveIngredients]);

  // ─── 食材編集 ────────────────────────────────────────────────────────────

  const handleEditIngredient = useCallback(
    async (id: string, field: 'name' | 'amount', value: string) => {
      const next = ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      );
      await saveIngredients(next);
    },
    [ingredients, saveIngredients]
  );

  // ─── 食材削除 ────────────────────────────────────────────────────────────

  const handleDeleteIngredient = useCallback(
    async (id: string) => {
      const next = ingredients.filter((ing) => ing.id !== id);
      await saveIngredients(next);
    },
    [ingredients, saveIngredients]
  );

  // ─── 連続記録更新 ────────────────────────────────────────────────────────

  const bumpStreak = useCallback(async () => {
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let next: StreakData;
    if (streak.lastDate === today) {
      next = streak;
    } else if (streak.lastDate === yesterday) {
      next = { count: streak.count + 1, lastDate: today };
    } else {
      next = { count: 1, lastDate: today };
    }
    setStreak(next);
    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(next));
    return next;
  }, [streak]);

  // ─── API でレシピ取得（ストリーミング対応）────────────────────────────────

  const handleFetchRecipes = useCallback(async () => {
    if (ingredients.length === 0) {
      Alert.alert('食材を入力してください', '食材を1つ以上追加してからレシピを提案してもらいましょう。');
      return;
    }

    // ── 1. 入力フィルタリング ──────────────────────────────────────────────
    const { safe: safeIngredients, hasBlocked } = filterIngredients(ingredients);

    if (hasBlocked) {
      Alert.alert('入力エラー', '一般的な食材を入力してください。');
    }

    if (safeIngredients.length === 0) {
      return;
    }

    setLoading(true);
    setRecipes([]);

    const ingredientText = safeIngredients
      .map((i) => (i.amount ? `${i.name}（${i.amount}）` : i.name))
      .join('、');

    // ── 2. プロンプト（JSONLines形式で1件ずつ出力させる）────────────────
    const profileText = profileToPromptText(profile);
    const prompt = `以下の食材が冷蔵庫に残っています：${ingredientText}
${profileText ? '\n' + profileText + '\n' : ''}
これらの食材を使ったレシピを6件提案してください。
各レシピを以下のJSON形式で、1行に1件ずつ出力してください（JSONLines形式・余分なテキスト不要）：

{"name":"料理名","description":"料理の簡単な説明（1〜2文）","cookTime":"調理時間（例：20分）","difficulty":"簡単","usageRate":80,"isRecommended":false,"estimatedSaving":200,"lossReduction":300}

フィールドの説明：
- difficulty: "簡単" または "普通" または "難しい" のいずれか
- usageRate: 食材の使い切り率（0〜100の整数）
- isRecommended: 最もおすすめの1件のみtrue、残りはfalse
- estimatedSaving: 食材そのものの価格（円・100〜500の整数）
  目安：にんじん1本=80円、玉ねぎ1個=40円、じゃがいも1個=60円、たまご1個=20円
  豚こま100g=100円、鶏むね100g=80円、キャベツ1/4=50円、豆腐1丁=80円
- lossReduction: 使用する食材の重量（グラム・50〜500の整数）
  目安：にんじん1本=150g、玉ねぎ1個=200g、じゃがいも1個=150g、たまご1個=60g

【重要な制約】
入力された食材が一般的な料理の食材でない場合はレシピを提案しないでください。
性的・暴力的・不適切な内容を含むレシピや材料は絶対に出力しないでください。
一般的な家庭料理・レストラン料理のみを提案してください。`;

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // ── 3. レシピ1件を受信したら即座に追加 ──────────────────────────────
      let addedCount = 0;

      const appendRecipe = (line: string) => {
        const trimmed = line.trim().replace(/,$/, '');
        if (!trimmed || trimmed === '[' || trimmed === ']') return;
        try {
          const recipe = JSON.parse(trimmed) as Recipe;
          if (!recipe.name || !recipe.description) return;
          const [safe] = filterRecipes([recipe]);
          if (safe) {
            setRecipes((prev) => [...prev, safe]);
            addedCount++;
          }
        } catch {
          // 不完全な行はスキップ
        }
      };

      if (res.body) {
        // ストリーミング対応：SSEチャンクを逐次処理してレシピを1件ずつ表示
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        let contentAccum = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const sseLines = sseBuffer.split('\n');
          sseBuffer = sseLines.pop() ?? '';

          for (const sseLine of sseLines) {
            if (!sseLine.startsWith('data: ')) continue;
            const payload = sseLine.slice(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const chunk = JSON.parse(payload);
              const delta: string = chunk.choices?.[0]?.delta?.content ?? '';
              if (!delta) continue;

              contentAccum += delta;

              // 改行が来るたびに完成した行をパースして即追加
              const newlineIdx = contentAccum.lastIndexOf('\n');
              if (newlineIdx >= 0) {
                const completeLines = contentAccum.slice(0, newlineIdx).split('\n');
                contentAccum = contentAccum.slice(newlineIdx + 1);
                completeLines.forEach(appendRecipe);
              }
            } catch {
              // 壊れたSSEチャンクはスキップ
            }
          }
        }

        // 残余コンテンツをパース
        if (contentAccum.trim()) appendRecipe(contentAccum);

      } else {
        // ストリーミング非対応のフォールバック（一括受信）
        const data = await res.json();
        const content: string =
          data?.choices?.[0]?.message?.content ?? data?.content ?? '';
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          const parsed: Recipe[] = JSON.parse(arrayMatch[0]);
          filterRecipes(parsed).forEach((r) => {
            setRecipes((prev) => [...prev, r]);
            addedCount++;
          });
        } else {
          content.split('\n').forEach(appendRecipe);
        }
      }

      // ── 4. 結果チェック ─────────────────────────────────────────────────
      if (addedCount === 0) {
        Alert.alert('提案できませんでした', 'レシピを生成できませんでした。別の食材を試してください。');
        return;
      }

      await bumpStreak();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('エラー', `レシピの取得に失敗しました。\n${message}`);
    } finally {
      setLoading(false);
    }
  }, [ingredients, bumpStreak, profile]);

  // ─── レンダー ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTop}>今日の料理</Text>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>残りものシェフ</Text>
              {streak.count > 0 && (
                <View style={styles.streakPill}>
                  <Text style={styles.streakText}>🔥 {streak.count}日連続使い切り中</Text>
                </View>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.profileIconBtn, pressed && styles.pressed]}
              onPress={() => router.push('/profile')}
              accessibilityLabel="プロフィール"
            >
              <Svg width="22" height="22" viewBox="0 0 24 24">
                <Path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  fill="rgba(255,255,255,0.9)"
                />
              </Svg>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 食材入力エリア */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>今日の残り物</Text>

            <View style={styles.card}>
              {/* 列ヘッダー */}
              <View style={styles.tableHeader}>
                <Text style={[styles.colLabel, styles.colName]}>食材名</Text>
                <Text style={[styles.colLabel, styles.colAmount]}>量・個数</Text>
                <View style={styles.colDelete} />
              </View>

              <View style={styles.divider} />

              {/* 既存食材リスト */}
              {ingredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  onEdit={handleEditIngredient}
                  onDelete={handleDeleteIngredient}
                />
              ))}

              {/* 新規入力行 */}
              <View style={styles.newRow}>
                <TextInput
                  style={[styles.input, styles.colName]}
                  placeholder="食材を入力"
                  placeholderTextColor={AppColors.textTertiary}
                  value={newName}
                  onChangeText={setNewName}
                  returnKeyType="next"
                  onSubmitEditing={() => amountInputRef.current?.focus()}
                />
                <TextInput
                  ref={amountInputRef}
                  style={[styles.input, styles.colAmount]}
                  placeholder="量"
                  placeholderTextColor={AppColors.textTertiary}
                  value={newAmount}
                  onChangeText={setNewAmount}
                  returnKeyType="done"
                  onSubmitEditing={handleAddIngredient}
                />
                <Pressable
                  style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
                  onPress={handleAddIngredient}
                  accessibilityLabel="食材を追加"
                >
                  <Text style={styles.addBtnText}>＋</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* レシピ提案ボタン */}
          <Pressable
            style={({ pressed }) => [styles.fetchBtn, pressed && styles.pressed]}
            onPress={handleFetchRecipes}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.fetchBtnText}>レシピを提案してもらう</Text>
            )}
          </Pressable>

          {/* レシピカード一覧 */}
          <Disclaimer text="※ レシピはAIが生成しています。内容は参考情報としてご利用ください。" />

          {recipes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>提案レシピ</Text>

              {/* 並べ替えボタン */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sortBar}
                style={styles.sortBarWrap}
              >
                {SORT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.sortPill,
                      sortKey === opt.key && styles.sortPillActive,
                    ]}
                    onPress={() => {
                      console.log(`[Sort] button pressed: "${opt.key}"`);
                      setSortKey(opt.key);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortPillText,
                        sortKey === opt.key && styles.sortPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {sortedRecipes.map((recipe, index) => (
                <RecipeCard
                  key={index}
                  recipe={recipe}
                  onPress={() => {
                    setNavStore({
                      recipe,
                      fridgeIngredientNames: ingredients.map((i) => i.name),
                      recipeDetail: null,
                    });
                    router.push('/recipe-detail');
                  }}
                />
              ))}
            </View>
          )}

          {recipes.length > 0 && (
            <Disclaimer text="※ レシピはAIが生成しています。内容は参考情報としてご利用ください。" />
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── 免責事項コンポーネント ──────────────────────────────────────────────────

function Disclaimer({ text }: { text: string }) {
  return (
    <View style={{
      marginTop: 16,
      marginBottom: 16,
      paddingTop: 12,
      paddingHorizontal: 20,
      borderTopWidth: 0.5,
      borderTopColor: '#EEEEEE',
    }}>
      <Text style={{
        fontSize: 11,
        color: '#999999',
        textAlign: 'center',
        lineHeight: 16,
      }}>{text}</Text>
    </View>
  );
}

// ─── 食材行コンポーネント ─────────────────────────────────────────────────────

interface IngredientRowProps {
  ingredient: Ingredient;
  onEdit: (id: string, field: 'name' | 'amount', value: string) => void;
  onDelete: (id: string) => void;
}

function IngredientRow({ ingredient, onEdit, onDelete }: IngredientRowProps) {
  return (
    <View style={styles.ingredientRow}>
      <TextInput
        style={[styles.input, styles.colName]}
        value={ingredient.name}
        onChangeText={(v) => onEdit(ingredient.id, 'name', v)}
        placeholderTextColor={AppColors.textTertiary}
      />
      <TextInput
        style={[styles.input, styles.colAmount]}
        value={ingredient.amount}
        onChangeText={(v) => onEdit(ingredient.id, 'amount', v)}
        placeholder="—"
        placeholderTextColor={AppColors.textTertiary}
      />
      <Pressable
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
        onPress={() => onDelete(ingredient.id)}
        accessibilityLabel={`${ingredient.name}を削除`}
      >
        <Text style={styles.deleteBtnText}>✕</Text>
      </Pressable>
    </View>
  );
}

// ─── レシピカードコンポーネント ──────────────────────────────────────────────

function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress?: () => void }) {
  const diffColor = DIFFICULTY_COLORS[recipe.difficulty] ?? AppColors.textTertiary;
  const diffLabel = DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty;

  return (
    <Pressable
      style={({ pressed }) => [pressed && styles.pressed]}
      onPress={onPress}
    >
    <View style={[styles.recipeCard, recipe.isRecommended && styles.recipeCardRecommended]}>
      {/* 難易度ライン */}
      <View style={[styles.difficultyLine, { backgroundColor: diffColor }]} />

      <View style={styles.recipeBody}>
        {/* タイトル行 */}
        <View style={styles.recipeTitleRow}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          {recipe.isRecommended && (
            <View style={styles.recommendBadge}>
              <Text style={styles.recommendBadgeText}>おすすめ</Text>
            </View>
          )}
        </View>

        {/* 説明 */}
        <Text style={styles.recipeDesc}>{recipe.description}</Text>

        {/* メタ情報 */}
        <View style={styles.recipeMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>⏱</Text>
            <Text style={styles.metaText}>{recipe.cookTime}</Text>
          </View>
          <View style={styles.metaItem}>
            <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
            <Text style={[styles.metaText, { color: diffColor }]}>{diffLabel}</Text>
          </View>
          <View style={[styles.usageBadge, { backgroundColor: diffColor + '22' }]}>
            <Text style={[styles.usageBadgeText, { color: diffColor }]}>
              使い切り率 {recipe.usageRate}%
            </Text>
          </View>
        </View>

        {/* 使い切り率バー */}
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(recipe.usageRate, 100)}%`, backgroundColor: diffColor },
            ]}
          />
        </View>
      </View>
    </View>
    </Pressable>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.green },
  flex: { flex: 1, backgroundColor: AppColors.background },

  // ヘッダー
  header: {
    backgroundColor: AppColors.green,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTop: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
  },
  profileIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  streakPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // スクロール
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  bottomSpacer: { height: 32 },

  // セクション
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 8,
    marginLeft: 2,
    letterSpacing: 0.3,
  },

  // カード
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // テーブル
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  colLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8E8E8',
    marginBottom: 6,
  },

  // 列幅
  colName: { flex: 3 },
  colAmount: { flex: 2, marginLeft: 8 },
  colDelete: { width: 32, marginLeft: 8 },

  // 行
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
    paddingTop: 8,
  },

  // 入力
  input: {
    height: 36,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: AppColors.text,
    backgroundColor: '#FAFAFA',
  },

  // ＋ボタン
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 22,
  },

  // 削除ボタン
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteBtnText: {
    fontSize: 11,
    color: AppColors.textTertiary,
  },

  // レシピ提案ボタン
  fetchBtn: {
    backgroundColor: AppColors.coral,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: AppColors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fetchBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // レシピカード
  recipeCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeCardRecommended: {
    borderWidth: 2,
    borderColor: AppColors.coral,
  },
  difficultyLine: {
    height: 4,
  },
  recipeBody: {
    padding: 14,
  },
  recipeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  recipeName: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
    flex: 1,
  },
  recommendBadge: {
    backgroundColor: AppColors.coral,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recipeDesc: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: { fontSize: 12 },
  metaText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  usageBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  usageBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 使い切り率バー
  barTrack: {
    height: 5,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  // 並べ替えバー
  sortBarWrap: {
    marginBottom: 12,
  },
  sortBar: {
    gap: 8,
    paddingHorizontal: 2,
  },
  sortPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  sortPillActive: {
    backgroundColor: '#25A55F',
    borderColor: '#25A55F',
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888888',
  },
  sortPillTextActive: {
    color: '#FFFFFF',
  },

  pressed: { opacity: 0.75 },
});
