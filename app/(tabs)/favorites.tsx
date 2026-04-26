import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { STORAGE_KEYS, loadFavorites, removeFavorite } from '@/lib/storage';
import { setNavStore } from '@/lib/store';
import type { FavoriteRecipe } from '@/lib/types';

const DIFFICULTY_LABELS = {
  簡単: 'かんたん',
  普通: 'ふつう',
  難しい: 'むずかしい',
} as const;

const DIFFICULTY_COLORS = {
  簡単: AppColors.green,
  普通: '#D4845A',
  難しい: AppColors.coral,
} as const;

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);

  const reload = useCallback(async () => {
    const favs = await loadFavorites();
    setFavorites(favs);
  }, []);

  // 画面フォーカス時に毎回リロード
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleTap = useCallback(async (recipe: FavoriteRecipe) => {
    // 現在の冷蔵庫食材を取得
    const rawIng = await AsyncStorage.getItem(STORAGE_KEYS.INGREDIENTS);
    const fridgeNames: string[] = rawIng
      ? (JSON.parse(rawIng) as { name: string }[]).map((i) => i.name)
      : [];

    setNavStore({
      recipe,
      fridgeIngredientNames: fridgeNames,
      recipeDetail: recipe, // detailIngredients + steps 込み → API呼び出しをスキップ
    });
    router.push('/recipe-detail');
  }, []);

  const handleRemove = useCallback(
    (recipe: FavoriteRecipe) => {
      Alert.alert(
        'お気に入りを削除',
        `「${recipe.name}」をお気に入りから削除しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              await removeFavorite(recipe.id);
              reload();
            },
          },
        ]
      );
    },
    [reload]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── ヘッダー ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTop}>保存したレシピ</Text>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>お気に入り</Text>
          {favorites.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{favorites.length}件</Text>
            </View>
          )}
        </View>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyTitle}>まだお気に入りがありません</Text>
          <Text style={styles.emptySub}>
            調理完了後に「お気に入りに保存」すると{'\n'}ここに表示されます
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {favorites.map((fav) => (
            <FavoriteCard
              key={fav.id}
              recipe={fav}
              onTap={handleTap}
              onRemove={handleRemove}
            />
          ))}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── お気に入りカード ─────────────────────────────────────────────────────────

interface CardProps {
  recipe: FavoriteRecipe;
  onTap: (r: FavoriteRecipe) => void;
  onRemove: (r: FavoriteRecipe) => void;
}

function FavoriteCard({ recipe, onTap, onRemove }: CardProps) {
  const diffColor =
    DIFFICULTY_COLORS[recipe.difficulty as keyof typeof DIFFICULTY_COLORS] ??
    AppColors.textTertiary;
  const diffLabel =
    DIFFICULTY_LABELS[recipe.difficulty as keyof typeof DIFFICULTY_LABELS] ??
    recipe.difficulty;

  const savedDate = new Date(recipe.savedAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onTap(recipe)}
    >
      {/* 難易度カラーライン */}
      <View style={[styles.diffLine, { backgroundColor: diffColor }]} />

      <View style={styles.cardBody}>
        {/* タイトル行 */}
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{recipe.name}</Text>
          <Pressable
            style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
            onPress={() => onRemove(recipe)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="お気に入りから削除"
          >
            <Text style={styles.removeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* 説明 */}
        <Text style={styles.cardDesc} numberOfLines={2}>{recipe.description}</Text>

        {/* メタ情報バー */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>⏱ {recipe.cookTime}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: diffColor + '18' }]}>
            <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
            <Text style={[styles.metaChipText, { color: diffColor }]}>{diffLabel}</Text>
          </View>
          <View style={styles.metaSpacer} />
          <Text style={styles.savedDateText}>📅 {savedDate}</Text>
        </View>

        {/* 材料チップ */}
        {recipe.detailIngredients.length > 0 && (
          <View style={styles.ingRow}>
            {recipe.detailIngredients.slice(0, 4).map((ing, i) => (
              <View
                key={i}
                style={[styles.ingChip, ing.inFridge && styles.ingChipFridge]}
              >
                <Text
                  style={[styles.ingChipText, ing.inFridge && styles.ingChipTextFridge]}
                >
                  {ing.name}
                </Text>
              </View>
            ))}
            {recipe.detailIngredients.length > 4 && (
              <View style={styles.ingChip}>
                <Text style={styles.ingChipText}>
                  +{recipe.detailIngredients.length - 4}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 詳細を見る矢印 */}
        <View style={styles.detailHint}>
          <Text style={styles.detailHintText}>詳細を見る →</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.green },

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
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // 空状態
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: AppColors.background,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: AppColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // スクロール
  scroll: { flex: 1, backgroundColor: AppColors.background },
  scrollContent: { padding: 16 },
  bottomSpacer: { height: 32 },

  // カード
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: { opacity: 0.88 },
  diffLine: { height: 4 },
  cardBody: { padding: 14 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
    marginRight: 8,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnPressed: { backgroundColor: '#EDEDED' },
  removeBtnText: { fontSize: 11, color: AppColors.textTertiary },

  cardDesc: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaChipText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  diffDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaSpacer: { flex: 1 },
  savedDateText: {
    fontSize: 11,
    color: AppColors.textTertiary,
  },

  ingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  ingChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ingChipFridge: { backgroundColor: AppColors.green + '14' },
  ingChipText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  ingChipTextFridge: { color: AppColors.green },

  detailHint: { alignItems: 'flex-end' },
  detailHintText: {
    fontSize: 12,
    color: AppColors.green,
    fontWeight: '600',
  },
});
