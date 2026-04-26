import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { getNavStore } from '@/lib/store';

// ─── 定数 ────────────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS = {
  簡単: 'かんたん',
  普通: 'ふつう',
  難しい: 'むずかしい',
} as const;

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function KitchenNoteScreen() {
  const { recipeDetail } = getNavStore();
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(
    () => new Array(recipeDetail?.steps.length ?? 0).fill(false)
  );

  const completedCount = useMemo(
    () => checkedSteps.filter(Boolean).length,
    [checkedSteps]
  );

  const toggleStep = useCallback((index: number) => {
    setCheckedSteps((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleCookingComplete = useCallback(() => {
    router.push('/cooking-complete');
  }, []);

  if (!recipeDetail) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹ レシピ詳細へ</Text>
          </Pressable>
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>レシピが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  const diffLabel =
    DIFFICULTY_LABELS[recipeDetail.difficulty as keyof typeof DIFFICULTY_LABELS] ??
    recipeDetail.difficulty;

  const totalSteps = recipeDetail.steps.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── ヘッダー ─── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹ レシピ詳細へ</Text>
        </Pressable>

        <Text style={styles.headerLabel}>キッチンノート</Text>
        <Text style={styles.headerTitle}>{recipeDetail.name}</Text>

        <View style={styles.headerMeta}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>⏱ {recipeDetail.cookTime}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{diffLabel}</Text>
          </View>
          {/* 進捗ピル */}
          <View style={[styles.progressPill, completedCount === totalSteps && styles.progressPillDone]}>
            <Text style={[styles.progressText, completedCount === totalSteps && styles.progressTextDone]}>
              {completedCount} / {totalSteps} 完了
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 材料セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>材料</Text>
          <View style={styles.card}>
            {recipeDetail.detailIngredients.map((ing, i) => (
              <React.Fragment key={i}>
                <View style={styles.ingredientRow}>
                  <View
                    style={[
                      styles.fridgeDot,
                      { backgroundColor: ing.inFridge ? AppColors.green : '#CCCCCC' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.ingredientName,
                      !ing.inFridge && styles.ingredientNameMissing,
                    ]}
                  >
                    {ing.name}
                  </Text>
                  <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                  {ing.inFridge && (
                    <View style={styles.inFridgeBadge}>
                      <Text style={styles.inFridgeBadgeText}>✓ 冷蔵庫</Text>
                    </View>
                  )}
                </View>
                {i < recipeDetail.detailIngredients.length - 1 && (
                  <View style={styles.rowDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* 手順セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>手順</Text>
          <View style={styles.card}>
            {recipeDetail.steps.map((step, i) => {
              const done = checkedSteps[i] ?? false;
              return (
                <React.Fragment key={i}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.stepRow,
                      done && styles.stepRowDone,
                      pressed && styles.stepRowPressed,
                    ]}
                    onPress={() => toggleStep(i)}
                    accessibilityLabel={`手順${i + 1}: ${step}`}
                    accessibilityState={{ checked: done }}
                  >
                    {/* チェックサークル */}
                    <View
                      style={[
                        styles.stepCheck,
                        done && styles.stepCheckDone,
                      ]}
                    >
                      {done && <Text style={styles.stepCheckMark}>✓</Text>}
                      {!done && (
                        <Text style={styles.stepNumber}>{i + 1}</Text>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.stepText,
                        done && styles.stepTextDone,
                      ]}
                    >
                      {step}
                    </Text>
                  </Pressable>
                  {i < recipeDetail.steps.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ─── 調理完了ボタン（固定下部） ─── */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.completeBtn, pressed && styles.pressed]}
          onPress={handleCookingComplete}
        >
          <Text style={styles.completeBtnText}>
            {completedCount === totalSteps ? '🎉 調理完了！' : '調理完了'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.coral },

  // ヘッダー
  header: {
    backgroundColor: AppColors.coral,
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
  headerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  metaChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaChipText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  progressPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressPillDone: {
    backgroundColor: AppColors.green,
  },
  progressText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressTextDone: {
    color: '#FFFFFF',
  },

  // スクロール
  scroll: { flex: 1, backgroundColor: AppColors.background },
  scrollContent: { padding: 16 },
  bottomSpacer: { height: 100 },

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
  },
  inFridgeBadge: {
    backgroundColor: AppColors.green + '18',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inFridgeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.green,
  },

  // 手順行
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
    gap: 12,
  },
  stepRowDone: {
    opacity: 0.65,
  },
  stepRowPressed: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: -14,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  stepCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: AppColors.coral,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepCheckDone: {
    backgroundColor: AppColors.green,
    borderColor: AppColors.green,
  },
  stepCheckMark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.coral,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: AppColors.text,
    lineHeight: 20,
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
    color: AppColors.textTertiary,
  },

  // フッター・調理完了ボタン
  footer: {
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
  },
  completeBtn: {
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
  completeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // 空・センター
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  emptyText: {
    fontSize: 15,
    color: AppColors.textSecondary,
  },

  pressed: { opacity: 0.72 },
});
