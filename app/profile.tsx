import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ALLERGY_OPTIONS,
  COOKING_TIME_OPTIONS,
  DEFAULT_PROFILE,
  GENRE_OPTIONS,
  SKILL_OPTIONS,
  SPICY_OPTIONS,
  STYLE_OPTIONS,
  TASTE_OPTIONS,
  UserProfile,
  Allergy,
  loadProfile,
  saveProfile,
} from '@/lib/profile';

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  const update = async (patch: Partial<UserProfile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    await saveProfile(next);
  };

  const toggleAllergy = async (allergy: Allergy) => {
    const current = profile.allergies;
    const next = current.includes(allergy)
      ? current.filter((a) => a !== allergy)
      : [...current, allergy];
    await update({ allergies: next });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── ヘッダー ─── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹ 戻る</Text>
        </Pressable>
        <Text style={styles.headerTitle}>プロフィール</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ─── コンテンツ ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileSection
          title="料理スキル"
          options={SKILL_OPTIONS}
          selected={profile.skill}
          onSelect={(v) => update({ skill: v as UserProfile['skill'] })}
        />
        <ProfileSection
          title="調理時間の目安"
          options={COOKING_TIME_OPTIONS}
          selected={profile.cookingTime}
          onSelect={(v) => update({ cookingTime: v as UserProfile['cookingTime'] })}
        />
        <ProfileSection
          title="味の好み（濃さ）"
          options={TASTE_OPTIONS}
          selected={profile.taste}
          onSelect={(v) => update({ taste: v as UserProfile['taste'] })}
        />
        <ProfileSection
          title="辛さの好み"
          options={SPICY_OPTIONS}
          selected={profile.spicy}
          onSelect={(v) => update({ spicy: v as UserProfile['spicy'] })}
        />
        <ProfileSection
          title="食事スタイル"
          options={STYLE_OPTIONS}
          selected={profile.style}
          onSelect={(v) => update({ style: v as UserProfile['style'] })}
        />
        <ProfileSection
          title="好きなジャンル"
          options={GENRE_OPTIONS}
          selected={profile.genre}
          onSelect={(v) => update({ genre: v as UserProfile['genre'] })}
        />

        {/* アレルギー（複数選択） */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>避けたい食材</Text>
          <Text style={styles.sectionHint}>複数選択可・タップで切り替え</Text>
          <View style={styles.optionsWrap}>
            {/* 「なし」ボタン */}
            <Pressable
              style={[
                styles.optionCard,
                profile.allergies.length === 0 && styles.optionCardSelected,
              ]}
              onPress={() => update({ allergies: [] })}
            >
              <Text style={styles.optionEmoji}>✅</Text>
              <Text
                style={[
                  styles.optionLabel,
                  profile.allergies.length === 0 && styles.optionLabelSelected,
                ]}
              >
                なし
              </Text>
            </Pressable>
            {ALLERGY_OPTIONS.map((opt) => {
              const selected = profile.allergies.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.optionCard, selected && styles.optionCardSelected]}
                  onPress={() => toggleAllergy(opt.value)}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text
                    style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── プロフィールセクション ───────────────────────────────────────────────────

function ProfileSection({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: { value: string; label: string; emoji: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionsWrap}>
        {options.map((opt) => {
          const isSelected = opt.value === selected;
          return (
            <Pressable
              key={opt.value}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => onSelect(opt.value)}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text
                style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const GREEN  = '#25A55F';
const BG     = '#F5F5F7';
const SEL_BG = '#E8F5EE';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GREEN },

  header: {
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
    minWidth: 60,
  },
  backText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerSpacer: { minWidth: 60 },

  scroll: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16 },
  bottomSpacer: { height: 32 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444444',
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 10,
  },

  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  optionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DEDEDE',
    minWidth: 72,
    gap: 4,
  },
  optionCardSelected: {
    backgroundColor: SEL_BG,
    borderColor: GREEN,
  },
  optionEmoji: { fontSize: 20 },
  optionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  optionLabelSelected: { color: GREEN },

  pressed: { opacity: 0.72 },
});
