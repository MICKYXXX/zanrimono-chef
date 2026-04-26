import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlantIllustration } from '@/components/plant-illustration';
import { AppColors } from '@/constants/theme';
import { calcLossReduction, formatWeight } from '@/lib/food-weight';
import {
  PLANT_NAMES,
  getPlantLevel,
  getPlantXP,
  loadFavorites,
  recordCookingComplete,
  saveFavorite,
} from '@/lib/storage';
import { getNavStore } from '@/lib/store';
import type { AchievementData, FavoriteRecipe } from '@/lib/types';

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function CookingCompleteScreen() {
  const { recipeDetail } = getNavStore();
  const [achievements, setAchievements] = useState<AchievementData | null>(null);
  const [savedAsFavorite, setSavedAsFavorite] = useState(false);
  const recordedRef = useRef(false);

  // 調理完了を一度だけ記録
  useEffect(() => {
    if (!recordedRef.current) {
      recordedRef.current = true;
      // レシピの推定節約額・ロス削減量を計算（食材テーブル→AI値→デフォルトの優先順）
      const saving = recipeDetail?.estimatedSaving ?? 500;
      const loss = recipeDetail?.detailIngredients
        ? calcLossReduction(recipeDetail.detailIngredients)
        : 200;
      recordCookingComplete(saving, loss).then(setAchievements);
    }
    // すでにお気に入りに保存済みか確認
    if (recipeDetail) {
      loadFavorites().then((favs) => {
        setSavedAsFavorite(favs.some((f) => f.id === recipeDetail.name));
      });
    }
  }, [recipeDetail]);

  const handleSaveFavorite = useCallback(async () => {
    if (!recipeDetail || savedAsFavorite) return;
    const fav: FavoriteRecipe = {
      ...recipeDetail,
      id: recipeDetail.name, // 料理名をIDとして利用
      savedAt: new Date().toISOString(),
    };
    await saveFavorite(fav);
    setSavedAsFavorite(true);
    Alert.alert('保存しました', `「${recipeDetail.name}」をお気に入りに追加しました。`);
  }, [recipeDetail, savedAsFavorite]);

  const handleGoHome = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  const handleBackToRecipe = useCallback(() => {
    router.back();
  }, []);

  const handleSeeOtherRecipes = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  // 今回の料理の値
  const currentLoss = recipeDetail?.detailIngredients
    ? calcLossReduction(recipeDetail.detailIngredients)
    : 200;
  const currentSaving = recipeDetail?.estimatedSaving ?? 500;

  // 植物情報
  const totalCooked = achievements?.totalCooked ?? 1;
  const level = getPlantLevel(totalCooked) as 1 | 2 | 3 | 4 | 5;
  const xp = getPlantXP(totalCooked);
  const plantName = PLANT_NAMES[level - 1];
  const streak = achievements?.streak.count ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── ヘッダー ─── */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🎉</Text>
        <Text style={styles.headerTitle}>使い切り達成！</Text>
        <Text style={styles.headerSub}>ごちそうさまでした</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── 植物カード ─── */}
        <View style={styles.plantCard}>
          <View style={styles.plantIllustrationWrap}>
            <PlantIllustration level={level} size={120} />
          </View>

          <View style={styles.plantInfo}>
            <View style={styles.plantLevelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv {level}</Text>
              </View>
              <Text style={styles.plantName}>{plantName}</Text>
            </View>

            {/* XPバー */}
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${xp}%` }]} />
            </View>
            <Text style={styles.xpLabel}>
              {level < 5 ? `次のレベルまで ${100 - xp}%` : '最高レベル達成！'}
            </Text>
          </View>
        </View>

        {/* ─── 統計3点 ─── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="🗑️"
            value={formatWeight(currentLoss)}
            label="今回のロス削減"
            color={AppColors.green}
          />
          <StatCard
            icon="💰"
            value={`¥${currentSaving.toLocaleString()}`}
            label="今回の節約目安"
            color="#D4845A"
          />
          <StatCard
            icon="🔥"
            value={`${streak}日`}
            label="連続記録"
            color={AppColors.coral}
          />
        </View>

        <Disclaimer text="※ 節約金額・食品ロス削減量はAIによる推定値です。実際の値とは異なる場合があります。" />

        {/* ─── アクションボタン ─── */}
        <Pressable
          style={({ pressed }) => [styles.homeBtn, pressed && styles.pressed]}
          onPress={handleGoHome}
        >
          <Text style={styles.homeBtnText}>ホームへ戻る</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.backToRecipeBtn, pressed && styles.pressed]}
          onPress={handleBackToRecipe}
        >
          <Text style={styles.backToRecipeBtnText}>レシピに戻る</Text>
        </Pressable>

        <View style={styles.subButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.subBtn,
              savedAsFavorite && styles.subBtnSaved,
              pressed && styles.pressed,
            ]}
            onPress={handleSaveFavorite}
            disabled={savedAsFavorite}
          >
            <Text
              style={[
                styles.subBtnText,
                savedAsFavorite && styles.subBtnTextSaved,
              ]}
            >
              {savedAsFavorite ? '❤️ 保存済み' : '♡ お気に入りに保存'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.subBtn, pressed && styles.pressed]}
            onPress={handleSeeOtherRecipes}
          >
            <Text style={styles.subBtnText}>他のレシピを見る</Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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

// ─── 統計カードコンポーネント ─────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.green },

  // ヘッダー
  header: {
    backgroundColor: AppColors.green,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerEmoji: { fontSize: 40, marginBottom: 6 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },

  // スクロール
  scroll: { flex: 1, backgroundColor: AppColors.background },
  scrollContent: { padding: 16 },
  bottomSpacer: { height: 40 },

  // 植物カード
  plantCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  plantIllustrationWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantInfo: { flex: 1 },
  plantLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  levelBadge: {
    backgroundColor: AppColors.green,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  plantName: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  xpBarTrack: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: AppColors.green,
    borderRadius: 4,
  },
  xpLabel: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontWeight: '500',
  },

  // 統計行
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontWeight: '500',
  },

  // ホームボタン
  homeBtn: {
    backgroundColor: AppColors.green,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: AppColors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  homeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // レシピに戻るボタン
  backToRecipeBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#25A55F',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  backToRecipeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25A55F',
  },

  // サブボタン行
  subButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subBtn: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AppColors.green,
    backgroundColor: AppColors.surface,
  },
  subBtnSaved: {
    borderColor: AppColors.coral,
    backgroundColor: AppColors.coral + '10',
  },
  subBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.green,
  },
  subBtnTextSaved: {
    color: AppColors.coral,
  },

  pressed: { opacity: 0.72 },
});
