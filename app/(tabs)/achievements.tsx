import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlantIllustration } from '@/components/plant-illustration';
import { AppColors } from '@/constants/theme';
import { formatWeight } from '@/lib/food-weight';
import {
  PLANT_DESCRIPTIONS,
  PLANT_NAMES,
  getCooksToNextLevel,
  getPlantLevel,
  getPlantXP,
  getThisMonthCount,
  loadAchievements,
} from '@/lib/storage';
import type { AchievementData } from '@/lib/types';

// ─── ステージ設定 ────────────────────────────────────────────────────────────

const STAGE_THRESHOLDS = [0, 3, 7, 12, 17] as const;

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function AchievementsScreen() {
  const [data, setData] = useState<AchievementData | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadAchievements().then(setData);
    }, [])
  );

  const totalCooked = data?.totalCooked ?? 0;
  const level = getPlantLevel(totalCooked) as 1 | 2 | 3 | 4 | 5;
  const xp = getPlantXP(totalCooked);
  const cooksToNext = getCooksToNextLevel(totalCooked);
  const streak = data?.streak.count ?? 0;
  const thisMonthCount = getThisMonthCount(data?.cookingHistory ?? []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── ヘッダー ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTop}>食品ロス削減の記録</Text>
        <Text style={styles.headerTitle}>実績</Text>
      </View>

      {/* ─── サマリーバー ─── */}
      <View style={styles.summaryBar}>
        <SummaryItem
          value={totalCooked.toString()}
          unit="回"
          label="使い切り"
          color={AppColors.green}
        />
        <View style={styles.summaryDivider} />
        <SummaryItem
          value={`¥${(data?.totalSavedYen ?? 0).toLocaleString()}`}
          unit=""
          label="累計節約"
          color="#D4845A"
        />
        <View style={styles.summaryDivider} />
        <SummaryItem
          value={streak.toString()}
          unit="日"
          label="連続記録"
          color={AppColors.coral}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── 成長ステージ ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>成長ステージ</Text>
          <View style={styles.stageCard}>
            <View style={styles.stageRow}>
              {([1, 2, 3, 4, 5] as const).map((lv) => (
                <StageItem key={lv} lv={lv} currentLevel={level} />
              ))}
            </View>
            {/* ステージ間の接続ライン */}
            <View style={styles.stageLine} />
          </View>
        </View>

        {/* ─── 現在のステージ詳細 ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>現在のステージ</Text>
          <View style={styles.currentStageCard}>
            {/* 植物イラスト */}
            <View style={styles.plantWrap}>
              <PlantIllustration level={level} size={150} />
            </View>

            {/* レベル・名前 */}
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv {level}</Text>
              </View>
              <Text style={styles.stageName}>{PLANT_NAMES[level - 1]}</Text>
            </View>

            {/* 説明 */}
            <Text style={styles.stageDesc}>{PLANT_DESCRIPTIONS[level - 1]}</Text>

            {/* プログレスバー */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>
                  {level < 5
                    ? `次のステージまで あと ${cooksToNext} 回`
                    : '最高ステージ達成！'}
                </Text>
                <Text style={styles.progressPercent}>{xp}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${xp}%` }]} />
              </View>
              {level < 5 && (
                <View style={styles.progressEdges}>
                  <Text style={styles.progressEdgeText}>
                    Lv{level}: {STAGE_THRESHOLDS[level - 1]}回
                  </Text>
                  <Text style={styles.progressEdgeText}>
                    Lv{level + 1}: {STAGE_THRESHOLDS[level as 1 | 2 | 3 | 4]}回
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ─── 累計記録グリッド ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>累計記録</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="🍳"
              value={totalCooked.toString()}
              unit="回"
              label="総使い切り回数"
              color={AppColors.green}
            />
            <StatCard
              icon="💰"
              value={`¥${(data?.totalSavedYen ?? 0).toLocaleString()}`}
              unit=""
              label="累計節約目安"
              color="#D4845A"
            />
            <StatCard
              icon="🗑️"
              value={formatWeight(data?.totalLossReduced ?? 0)}
              unit=""
              label="食品ロス削減量"
              color={AppColors.green}
            />
            <StatCard
              icon="📅"
              value={thisMonthCount.toString()}
              unit="回"
              label="今月の使い切り"
              color={AppColors.coral}
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── サマリーアイテム ─────────────────────────────────────────────────────────

function SummaryItem({
  value,
  unit,
  label,
  color,
}: {
  value: string;
  unit: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <View style={styles.summaryValueRow}>
        <Text style={[styles.summaryValue, { color }]}>{value}</Text>
        {unit ? <Text style={[styles.summaryUnit, { color }]}>{unit}</Text> : null}
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── ステージアイテム（横並び5個）────────────────────────────────────────────

function StageItem({ lv, currentLevel }: { lv: 1 | 2 | 3 | 4 | 5; currentLevel: number }) {
  const reached = currentLevel >= lv;
  const isCurrent = currentLevel === lv;

  return (
    <View style={styles.stageItem}>
      {/* 植物イラスト（小） */}
      <View style={[styles.stagePlantWrap, !reached && styles.stagePlantWrapLocked]}>
        <PlantIllustration level={lv} size={52} />
      </View>

      {/* レベルラベル */}
      <Text style={[styles.stageLvText, reached && styles.stageLvTextReached]}>
        Lv{lv}
      </Text>

      {/* ステータスインジケーター */}
      {reached && !isCurrent && (
        <View style={styles.stageIndicatorCheck}>
          <Text style={styles.stageIndicatorCheckText}>✓</Text>
        </View>
      )}
      {isCurrent && (
        <View style={styles.stageIndicatorCurrent} />
      )}
      {!reached && (
        <View style={styles.stageIndicatorLock}>
          <Text style={styles.stageIndicatorLockText}>🔒</Text>
        </View>
      )}
    </View>
  );
}

// ─── 統計カード ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  unit,
  label,
  color,
}: {
  icon: string;
  value: string;
  unit: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {unit ? <Text style={[styles.statUnit, { color }]}>{unit}</Text> : null}
      </View>
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
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTop: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // サマリーバー
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryLabel: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontWeight: '500',
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#D8D8D8',
    marginVertical: 4,
  },

  // スクロール
  scroll: { flex: 1, backgroundColor: AppColors.background },
  scrollContent: { padding: 16 },
  bottomSpacer: { height: 40 },

  // セクション
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 10,
    marginLeft: 2,
    letterSpacing: 0.3,
  },

  // 成長ステージカード
  stageCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    position: 'relative',
    zIndex: 1,
  },
  stageLine: {
    position: 'absolute',
    left: 32,
    right: 32,
    top: 42, // approx center of plant icons
    height: 2,
    backgroundColor: '#E8E8E8',
    zIndex: 0,
  },

  stageItem: {
    alignItems: 'center',
    width: 52,
    gap: 4,
  },
  stagePlantWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stagePlantWrapLocked: {
    opacity: 0.35,
  },
  stageLvText: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.textTertiary,
  },
  stageLvTextReached: {
    color: AppColors.green,
  },

  // ステータスインジケーター
  stageIndicatorCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageIndicatorCheckText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stageIndicatorCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.coral,
  },
  stageIndicatorLock: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageIndicatorLockText: {
    fontSize: 12,
  },

  // 現在のステージ詳細カード
  currentStageCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  plantWrap: {
    width: 150,
    height: 150,
    marginBottom: 14,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: AppColors.green,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stageName: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  stageDesc: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  // プログレスバー
  progressSection: { width: '100%' },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.green,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.green,
    borderRadius: 4,
  },
  progressEdges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressEdgeText: {
    fontSize: 10,
    color: AppColors.textTertiary,
  },

  // 統計グリッド（2×2）
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    borderTopWidth: 3,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: { fontSize: 26, marginBottom: 8 },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
