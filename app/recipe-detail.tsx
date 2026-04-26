import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { filterDetailIngredients, filterSteps } from '@/lib/content-filter';
import { getNavStore, setNavStore } from '@/lib/store';
import type { DetailIngredient, RecipeDetail } from '@/lib/types';

// ─── 定数 ────────────────────────────────────────────────────────────────────

const API_ENDPOINT =
  'https://dashing-crumble-cb48ca.netlify.app/.netlify/functions/chat';

const DIFFICULTY_COLORS = {
  簡単: AppColors.green,
  普通: '#D4845A',
  難しい: AppColors.coral,
} as const;

const DIFFICULTY_LABELS = {
  簡単: 'かんたん',
  普通: 'ふつう',
  難しい: 'むずかしい',
} as const;

// ─── メインコンポーネント ─────────────────────────────────────────────────────

type LoadState = 'loading' | 'error' | 'loaded';

export default function RecipeDetailScreen() {
  const { recipe, fridgeIngredientNames, recipeDetail: preloaded } = getNavStore();

  // お気に入りからの遷移時はプリロードされたデータを使う
  const hasPreloaded =
    !!preloaded &&
    Array.isArray(preloaded.detailIngredients) &&
    preloaded.detailIngredients.length > 0;

  const [loadState, setLoadState] = useState<LoadState>(
    hasPreloaded ? 'loaded' : 'loading'
  );
  const [detail, setDetail] = useState<{
    detailIngredients: DetailIngredient[];
    steps: string[];
  } | null>(
    hasPreloaded
      ? { detailIngredients: preloaded!.detailIngredients, steps: preloaded!.steps }
      : null
  );
  const fetchedRef = useRef(hasPreloaded);

  const fetchDetail = useCallback(async () => {
    if (!recipe) {
      setLoadState('error');
      return;
    }
    setLoadState('loading');
    setDetail(null);

    const fridgeText =
      fridgeIngredientNames.length > 0
        ? fridgeIngredientNames.join('、')
        : '特になし';

    // ── 2. プロンプトへの安全指示追加 ─────────────────────────────────────
    const prompt = `レシピ「${recipe.name}」の詳細情報を教えてください。
現在冷蔵庫にある食材：${fridgeText}

以下のJSON形式のみで返してください（余分なテキストは不要）：
{
  "ingredients": [
    { "name": "食材名", "amount": "分量（例：2個、100g）", "inFridge": true, "weightGrams": 150 }
  ],
  "steps": [
    "手順1の説明",
    "手順2の説明"
  ]
}

inFridgeは冷蔵庫にある食材の場合はtrue、ない場合はfalseです。
各食材のweightGramsフィールドに実際の使用重量をグラム数で返してください。日本の一般的なスーパーで売られているサイズを基準にしてください。
手順は4〜6ステップで具体的に書いてください。

【重要な制約】
性的・暴力的・不適切な内容を含む材料名や手順は絶対に出力しないでください。
一般的な家庭料理・レストラン料理の材料と手順のみを出力してください。`;

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const content: string =
        data?.choices?.[0]?.message?.content ?? data?.content ?? '';

      // JSONオブジェクトを抽出
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('JSON not found');

      const parsed = JSON.parse(match[0]);

      // ── 3. 出力フィルタリング ────────────────────────────────────────────
      const safeIngredients = filterDetailIngredients(
        (parsed.ingredients ?? []) as DetailIngredient[]
      );
      const safeSteps = filterSteps(parsed.steps ?? []);

      setDetail({
        detailIngredients: safeIngredients,
        steps: safeSteps,
      });
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }, [recipe, fridgeIngredientNames]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchDetail();
    }
  }, [fetchDetail]);

  const handleOpenKitchenNote = useCallback(() => {
    if (!recipe || !detail) return;
    const full: RecipeDetail = {
      ...recipe,
      detailIngredients: detail.detailIngredients,
      steps: detail.steps,
    };
    setNavStore({ recipeDetail: full });
    router.push('/kitchen-note');
  }, [recipe, detail]);

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹ 提案一覧へ</Text>
          </Pressable>
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>レシピが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  const diffColor =
    DIFFICULTY_COLORS[recipe.difficulty as keyof typeof DIFFICULTY_COLORS] ??
    AppColors.textTertiary;
  const diffLabel =
    DIFFICULTY_LABELS[recipe.difficulty as keyof typeof DIFFICULTY_LABELS] ??
    recipe.difficulty;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── ヘッダー ─── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹ 提案一覧へ</Text>
        </Pressable>

        {recipe.isRecommended && (
          <View style={styles.recommendBadge}>
            <Text style={styles.recommendBadgeText}>⭐ おすすめ</Text>
          </View>
        )}

        <Text style={styles.headerTitle}>{recipe.name}</Text>
        <Text style={styles.headerDesc}>{recipe.description}</Text>
      </View>

      {/* ─── メタ情報バー ─── */}
      <View style={styles.metaBar}>
        <MetaItem icon="⏱" label={recipe.cookTime} />
        <MetaDivider />
        <MetaItem
          icon="●"
          label={diffLabel}
          labelColor={diffColor}
          iconColor={diffColor}
        />
        <MetaDivider />
        <MetaItem icon="♻" label={`使い切り ${recipe.usageRate}%`} labelColor={AppColors.green} />
      </View>

      {/* ─── コンテンツ ─── */}
      {loadState === 'loading' && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={AppColors.green} />
          <Text style={styles.loadingText}>材料と手順を取得中...</Text>
        </View>
      )}

      {loadState === 'error' && (
        <View style={styles.centerBox}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>読み込みに失敗しました</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
            onPress={() => {
              fetchedRef.current = false;
              fetchDetail();
            }}
          >
            <Text style={styles.retryBtnText}>再試行</Text>
          </Pressable>
        </View>
      )}

      {loadState === 'loaded' && detail && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 材料セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>材料</Text>
            <View style={styles.card}>
              {detail.detailIngredients.map((ing, i) => (
                <IngredientItem key={i} ingredient={ing} isLast={i === detail.detailIngredients.length - 1} />
              ))}
              {detail.detailIngredients.length === 0 && (
                <Text style={styles.emptyText}>材料情報がありません</Text>
              )}
            </View>
          </View>

          {/* 作り方セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>作り方</Text>
            <View style={styles.card}>
              {detail.steps.map((step, i) => (
                <StepItem key={i} number={i + 1} text={step} isLast={i === detail.steps.length - 1} />
              ))}
            </View>
          </View>

          {/* キッチンノートボタン */}
          <Pressable
            style={({ pressed }) => [styles.noteBtn, pressed && styles.pressed]}
            onPress={handleOpenKitchenNote}
          >
            <Text style={styles.noteBtnText}>📒 キッチンノートを開く</Text>
          </Pressable>

          <Disclaimer text="※ 材料・手順はAIが生成しています。アレルギーや体調に合わせてご判断ください。" />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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

// ─── サブコンポーネント ─────────────────────────────────────────────────────

function MetaItem({
  icon,
  label,
  labelColor = AppColors.textSecondary,
  iconColor = AppColors.textTertiary,
}: {
  icon: string;
  label: string;
  labelColor?: string;
  iconColor?: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaIcon, { color: iconColor }]}>{icon}</Text>
      <Text style={[styles.metaLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function MetaDivider() {
  return <View style={styles.metaDivider} />;
}

function IngredientItem({
  ingredient,
  isLast,
}: {
  ingredient: DetailIngredient;
  isLast: boolean;
}) {
  return (
    <>
      <View style={styles.ingredientRow}>
        <View
          style={[
            styles.fridgeDot,
            { backgroundColor: ingredient.inFridge ? AppColors.green : '#CCCCCC' },
          ]}
        />
        <Text
          style={[
            styles.ingredientName,
            !ingredient.inFridge && styles.ingredientNameMissing,
          ]}
        >
          {ingredient.name}
        </Text>
        <Text style={styles.ingredientAmount}>{ingredient.amount}</Text>
        {ingredient.inFridge && (
          <Text style={styles.inFridgeLabel}>冷蔵庫にあり</Text>
        )}
      </View>
      {!isLast && <View style={styles.rowDivider} />}
    </>
  );
}

function StepItem({
  number,
  text,
  isLast,
}: {
  number: number;
  text: string;
  isLast: boolean;
}) {
  return (
    <>
      <View style={styles.stepRow}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </View>
        <Text style={styles.stepText}>{text}</Text>
      </View>
      {!isLast && <View style={styles.rowDivider} />}
    </>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.green },

  // ヘッダー
  header: {
    backgroundColor: AppColors.green,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 10,
  },
  backText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  recommendBadge: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.coral,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  recommendBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  headerDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },

  // メタバー
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  metaIcon: { fontSize: 13 },
  metaLabel: { fontSize: 13, fontWeight: '500' },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#D8D8D8',
  },

  // スクロール
  scroll: { flex: 1, backgroundColor: AppColors.background },
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EEEEEE',
  },

  // 材料行
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 8,
  },
  fridgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: AppColors.text,
    fontWeight: '500',
  },
  ingredientNameMissing: {
    color: AppColors.textTertiary,
  },
  ingredientAmount: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginRight: 4,
  },
  inFridgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.green,
    backgroundColor: AppColors.green + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // 手順行
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AppColors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: AppColors.text,
    lineHeight: 20,
  },

  // キッチンノートボタン
  noteBtn: {
    backgroundColor: AppColors.coral,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  noteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ローディング・エラー
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
  errorEmoji: { fontSize: 40 },
  errorText: {
    fontSize: 15,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  retryBtn: {
    marginTop: 4,
    backgroundColor: AppColors.green,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 13,
    color: AppColors.textTertiary,
    paddingVertical: 12,
    textAlign: 'center',
  },

  pressed: { opacity: 0.72 },
});
