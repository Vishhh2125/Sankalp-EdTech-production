import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { ROUTES } from '../../constants/routes';

export default function QuizTab({ quizzes, loading, showId, onAttemptCompleted }) {
  const navigation = useNavigation();

  if (loading) {
    return (
      <View style={styles.stateBlock}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={styles.stateText}>Loading quizzes...</Text>
      </View>
    );
  }

  const totalQuizzes = quizzes.length;
  const completed = quizzes.filter((q) => q.attempt).length;
  const progressPct = totalQuizzes > 0 ? Math.round((completed / totalQuizzes) * 100) : 0;

  return (
    <View>
      <Text style={styles.sectionTitle}>Quiz</Text>
      <Text style={styles.subtitle}>Test your knowledge and track your score.</Text>

      {quizzes.length === 0 ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>No quizzes available yet.</Text>
        </View>
      ) : (
        <>
          {quizzes.map((q, idx) => {
            const isLocked = q.is_locked;
            const isCompleted = !!q.attempt;
            const questionCount = q.question_count || 0;

            let statusLabel = 'Pending';
            let statusStyle = styles.badgePending;
            if (isLocked) {
              statusLabel = 'Locked';
              statusStyle = styles.badgeLocked;
            } else if (isCompleted) {
              statusLabel = `${q.attempt.score}/${questionCount}`;
              statusStyle = styles.badgeCompleted;
            }

            return (
              <Pressable
                key={q.id}
                style={[styles.card, isLocked && styles.cardLocked]}
                onPress={() => {
                  if (!isLocked && !isCompleted) {
                    navigation.navigate(ROUTES.QUIZ_TAKING, {
                      quiz: q,
                      showId,
                      onAttemptCompleted,
                    });
                  }
                }}
                disabled={isLocked}
              >
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>Quiz {idx + 1}</Text>
                  <Text style={[styles.cardTitle, isLocked && styles.textLocked]}>
                    {q.title}
                  </Text>
                  <Text style={styles.questionCount}>{questionCount} Questions</Text>
                </View>

                <View style={styles.cardRight}>
                  <View style={[styles.badge, statusStyle]}>
                    <Text style={[styles.badgeText, isLocked && styles.badgeTextLocked, isCompleted && styles.badgeTextCompleted]}>
                      {statusLabel}
                    </Text>
                  </View>
                  {isLocked ? (
                    <Ionicons name="lock-closed" size={14} color={theme.gray} />
                  ) : !isCompleted ? (
                    <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          {/* Progress Section */}
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPct}>{progressPct}%</Text>
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressLabel}>
                  Complete quizzes to{'\n'}unlock your progress.
                </Text>
                <Text style={styles.progressCount}>
                  {completed} / {totalQuizzes} Quizzes Completed
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.white,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.gray,
    fontSize: 13,
    marginBottom: 18,
  },
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  stateText: {
    color: theme.gray,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
    padding: 14,
    alignItems: 'center',
  },
  cardLocked: {
    opacity: 0.6,
  },
  cardBody: {
    flex: 1,
  },
  cardLabel: {
    color: theme.gray,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  cardTitle: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '700',
  },
  textLocked: {
    color: theme.gray,
  },
  questionCount: {
    color: theme.gray,
    fontSize: 11,
    marginTop: 3,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePending: {
    backgroundColor: 'rgba(255,45,85,0.15)',
  },
  badgeCompleted: {
    backgroundColor: 'rgba(52,199,89,0.15)',
  },
  badgeLocked: {
    backgroundColor: 'rgba(142,142,147,0.1)',
  },
  badgeText: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextLocked: {
    color: theme.gray,
  },
  badgeTextCompleted: {
    color: theme.green,
  },
  progressCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginTop: 10,
  },
  progressTitle: {
    color: theme.white,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPct: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  progressMeta: {
    flex: 1,
  },
  progressLabel: {
    color: theme.gray,
    fontSize: 12,
    lineHeight: 17,
  },
  progressCount: {
    color: theme.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
});
