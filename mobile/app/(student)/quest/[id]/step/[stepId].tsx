// mobile/app/(student)/quest/[id]/step/[stepId].tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ MOCK DATA — for demo purposes only, no backend connection.
// Replace with real step-completion API calls once wired live.
interface MockStep {
  id: number;
  title: string;
  description: string;
  checklist: string[];
  rewardPoints: number;
  rewardBadge: boolean;
}

const MOCK_STEPS: MockStep[] = [
  {
    id: 1,
    title: 'Prepare the Table Surface',
    description: 'Start with a clean, level table. Place a tablecloth or placemat as the foundation.',
    checklist: ['Table is clean and dry', 'Tablecloth or placemat is laid flat'],
    rewardPoints: 30,
    rewardBadge: false,
  },
  {
    id: 2,
    title: 'Position the Dinner Plate',
    description: 'Place the dinner plate in the center, about 1 inch from the table edge.',
    checklist: ['Center the plate on placemat', 'Measure 1 inch from edge', 'Ensure plate is level'],
    rewardPoints: 50,
    rewardBadge: true,
  },
  {
    id: 3,
    title: 'Arrange the Utensils',
    description: 'Place fork on left, knife and spoon on right. Knife blade faces the plate.',
    checklist: ['Fork on the left side', 'Knife on right (blade facing plate)', 'Spoon outside of knife'],
    rewardPoints: 50,
    rewardBadge: true,
  },
  {
    id: 4,
    title: 'Position the Napkin',
    description: 'Place the napkin to the left of the fork, or fold decoratively on the plate.',
    checklist: ['Napkin placed neatly', 'Folded or styled decoratively'],
    rewardPoints: 40,
    rewardBadge: false,
  },
];

const GOLD = '#F5B921';
const CREAM = '#F5EDD8';
const BROWN = '#5C2C16';
const CARD_BROWN = '#4A2E1D';
const GREEN = '#22C55E';
const ORANGE = '#EA580C';

export default function QuestStepScreen() {
  const router = useRouter();
  const { id, stepId } = useLocalSearchParams<{ id: string; stepId: string }>();

  // Find the starting step index from the route param, default to 0 if not found.
  const initialIndex = Math.max(
    0,
    MOCK_STEPS.findIndex((s) => String(s.id) === String(stepId))
  );

  const [currentIndex, setCurrentIndex] = useState(initialIndex === -1 ? 0 : initialIndex);
  const [isQuestComplete, setIsQuestComplete] = useState(false);
  // Per-step checklist state, keyed by step index so progress isn't lost
  // when navigating back to a previous step.
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean[]>>({});

  const currentStep = MOCK_STEPS[currentIndex];
  const checkedItems = checkedMap[currentIndex] || currentStep.checklist.map(() => false);
  const allChecked = checkedItems.every(Boolean);
  const isLastStep = currentIndex === MOCK_STEPS.length - 1;

  // Progress = how many steps are fully behind us, plus partial credit
  // for the current step's checklist completion — mirrors the mockup's
  // percentages (32%, 58%, 98%) climbing smoothly rather than jumping
  // in big chunks only at step boundaries.
  const completedStepsWeight = currentIndex + (allChecked ? 1 : 0);
  const percent = isQuestComplete
    ? 100
    : Math.min(98, Math.round((completedStepsWeight / MOCK_STEPS.length) * 100));

  function toggleCheck(itemIndex: number) {
    setCheckedMap((prev) => {
      const current = prev[currentIndex] || currentStep.checklist.map(() => false);
      const updated = [...current];
      updated[itemIndex] = !updated[itemIndex];
      return { ...prev, [currentIndex]: updated };
    });
  }

  function handleBack() {
    if (currentIndex === 0) {
      router.back();
      return;
    }
    setCurrentIndex((prev) => prev - 1);
  }

  function handleProceed() {
    if (!allChecked) return;
    if (isLastStep) {
      setIsQuestComplete(true);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  }

  return (
    <View style={styles.screen}>
      {/* ---------------- Header: same pattern as Home/Quests screens ---------------- */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color={BROWN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeSmall}>Welcome back,</Text>
            <Text style={styles.welcomeName}>Hannah!</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dateText}>Monday, 23 July</Text>
            <Text style={styles.classText}>TLE1 - B</Text>
          </View>
          <Ionicons name="notifications" size={20} color={BROWN} style={{ marginLeft: 8 }} />
        </View>

        <View style={styles.currentQuestCard}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.questTitle}>One Course Meal Prep</Text>
            <Text style={styles.questMode}>Group Quest</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isQuestComplete ? (
          // ---------------- All Steps Completed ----------------
          <View style={styles.completeCard}>
            <Text style={styles.completeLabel}>Congratulations!</Text>
            <Text style={styles.completeTitle}>All Steps{'\n'}Completed!</Text>
            <Text style={styles.completeBody}>
              You have completed all steps for this quest! You're all set for the practical activity.
            </Text>
            <Text style={styles.completeBody}>
              Your group leader will submit your group's final output on the day of the activity. Keep it up and
              good luck!
            </Text>
          </View>
        ) : (
          // ---------------- Current step card ----------------
          <View style={styles.stepCard}>
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepLabel}>Step {currentIndex + 1}</Text>
              {allChecked && <Ionicons name="checkmark-circle" size={18} color={GREEN} />}
            </View>

            <View style={styles.stepBodyRow}>
              <View style={styles.stepImagePlaceholder}>
                <Ionicons name="image-outline" size={22} color="#B08968" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.stepTitle}>{currentStep.title}</Text>
                <Text style={styles.stepDescription}>{currentStep.description}</Text>
              </View>
            </View>

            {currentStep.checklist.length > 0 && (
              <>
                <Text style={styles.checklistLabel}>Checklist:</Text>
                {currentStep.checklist.map((item, idx) => {
                  const checked = checkedItems[idx];
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.checklistRow}
                      onPress={() => toggleCheck(idx)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={[styles.checklistText, checked && styles.checklistTextChecked]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={handleBack}>
                <Text style={styles.backToStepText}>
                  {currentIndex === 0 ? 'Back to Overview' : `Back to Step ${currentIndex}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.proceedButton, !allChecked && styles.proceedButtonDisabled]}
                onPress={handleProceed}
                disabled={!allChecked}
              >
                <Text style={styles.proceedButtonText}>
                  {isLastStep ? 'Complete Quest' : 'Proceed to Next Step'}
                </Text>
              </TouchableOpacity>
            </View>

            {allChecked && (
              <View style={styles.rewardsRow}>
                <Text style={styles.rewardsLabel}>Rewards Earned:</Text>
                <View style={styles.rewardsIcons}>
                  {currentStep.rewardBadge && (
                    <View style={styles.badgePill}>
                      <Ionicons name="ribbon" size={16} color="#fff" />
                    </View>
                  )}
                  <View style={styles.pointsPill}>
                    <Text style={styles.pointsPillText}>+{currentStep.rewardPoints}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ---------------- Visual-only bottom tab bar, matches app-wide style ---------------- */}
      {/* Static for demo purposes — this screen sits outside the real tab
          navigator, so this bar is presentational only, not functional routing. */}
      <View style={styles.tabBar}>
        <TabIcon icon="restaurant-outline" label="Quests" />
        <TabIcon icon="ribbon-outline" label="Submissions" />
        <TabIcon icon="home-outline" label="Home" />
        <TabIcon icon="bar-chart" label="Progress" active />
        <TabIcon icon="person-outline" label="Profile" />
      </View>
    </View>
  );
}

function TabIcon({ icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <View style={styles.tabIconWrapper}>
      <Ionicons name={icon} size={20} color={active ? ORANGE : '#B8A671'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  header: {
    backgroundColor: GOLD, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  welcomeSmall: { fontSize: 12, color: BROWN, opacity: 0.8 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: BROWN },
  dateText: { fontSize: 11, color: BROWN, fontWeight: '600' },
  classText: { fontSize: 11, color: BROWN, fontWeight: '700', marginTop: 2 },

  currentQuestCard: { backgroundColor: CARD_BROWN, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#8a5a3a', alignItems: 'center', justifyContent: 'center' },
  questTitle: { color: ORANGE, fontSize: 15, fontWeight: '800' },
  questMode: { color: '#fbbf24', fontSize: 11, fontStyle: 'italic', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  percentText: { color: '#fff', fontSize: 10, marginTop: 3, fontStyle: 'italic' },

  scrollContent: { padding: 20, paddingBottom: 20 },

  stepCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: ORANGE, padding: 18 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  stepLabel: { fontSize: 13, fontWeight: '700', color: '#8A6A2A' },

  stepBodyRow: { flexDirection: 'row', marginBottom: 18 },
  stepImagePlaceholder: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#EADEC9',
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { fontSize: 16, fontWeight: '800', color: ORANGE, marginBottom: 4 },
  stepDescription: { fontSize: 12, color: '#666', lineHeight: 17 },

  checklistLabel: { fontSize: 14, fontWeight: '800', color: BROWN, marginBottom: 10 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D8C9A3',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: ORANGE, borderColor: ORANGE },
  checklistText: { fontSize: 13, color: BROWN, fontWeight: '600', flex: 1 },
  checklistTextChecked: { color: ORANGE },

  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  backToStepText: { fontSize: 13, fontWeight: '700', color: BROWN },
  proceedButton: { backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  proceedButtonDisabled: { backgroundColor: '#D8D8D8' },
  proceedButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  rewardsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  rewardsLabel: { fontSize: 13, fontWeight: '800', color: BROWN },
  rewardsIcons: { flexDirection: 'row', gap: 8 },
  badgePill: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F5B921', alignItems: 'center', justifyContent: 'center' },
  pointsPill: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pointsPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  completeCard: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: ORANGE,
    padding: 28, alignItems: 'center',
  },
  completeLabel: { fontSize: 14, fontWeight: '700', color: GREEN, marginBottom: 6 },
  completeTitle: { fontSize: 24, fontWeight: '900', color: ORANGE, textAlign: 'center', marginBottom: 16, lineHeight: 30 },
  completeBody: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 19, marginBottom: 10 },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#F5EAD1', paddingVertical: 10,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, justifyContent: 'space-around',
  },
  tabIconWrapper: { alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10, color: '#B8A671', fontWeight: '600' },
  tabLabelActive: { color: ORANGE, fontWeight: '800' },
});