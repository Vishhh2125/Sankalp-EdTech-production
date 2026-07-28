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
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../constants/routes';

export default function AssignmentsTab({ assignments, loading, showId, onSubmissionSuccess }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const navigation = useNavigation();

  if (loading) {
    return (
      <View style={styles.stateBlock}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={styles.stateText}>Loading assignments...</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Assignments</Text>
      <Text style={styles.subtitle}>Complete assignments to track your progress.</Text>

      {assignments.length === 0 ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>No assignments available yet.</Text>
        </View>
      ) : (
        assignments.map((a, idx) => {
          const isLocked = a.is_locked;
          const submission = a.submission;
          const status = submission?.status;
          const letterGradeText = submission?.letter_grade ? submission.letter_grade.replace('GRADE_', 'Grade ') : null;

          let statusLabel = 'Pending';
          let statusStyle = styles.badgePending;
          if (isLocked) {
            statusLabel = 'Locked';
            statusStyle = styles.badgeLocked;
          } else if (status === 'GRADED_PASSED' || status === 'GRADED') {
            statusLabel = letterGradeText ? `Approved · ${letterGradeText}` : `Approved · ${submission?.score}`;
            statusStyle = styles.badgeGraded;
          } else if (status === 'NEEDS_REVISION') {
            statusLabel = letterGradeText ? `Needs Revision (${letterGradeText})` : 'Needs Revision';
            statusStyle = styles.badgeNeedsRevision;
          } else if (status === 'SUBMITTED') {
            statusLabel = 'Submitted';
            statusStyle = styles.badgeSubmitted;
          }

          const dueText = a.due_at
            ? `Due: ${new Date(a.due_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
            : a.min_passing_grade ? `Min Required: ${a.min_passing_grade.replace('GRADE_', 'Grade ')}` : null;

          return (
            <Pressable
              key={a.id}
              style={[
                styles.card,
                isLocked && styles.cardLocked,
              ]}
              onPress={() => {
                if (!isLocked) {
                  navigation.navigate(ROUTES.ASSIGNMENT_DETAIL, {
                    assignment: a,
                    showId,
                    onSubmitted: onSubmissionSuccess,
                  });
                }
              }}
              disabled={isLocked}
            >
              <View style={[styles.accentBar, isLocked && styles.accentBarLocked]} />
              <View style={styles.cardBody}>
                <Text style={styles.cardLabel}>Assignment {idx + 1}</Text>
                <Text style={[styles.cardTitle, isLocked && styles.textLocked]}>{a.title}</Text>
                {dueText && (
                  <Text style={styles.dueText}>{dueText}</Text>
                )}
              </View>
              <View style={styles.cardRight}>
                {isLocked ? (
                  <Ionicons name="lock-closed" size={16} color={theme.gray} />
                ) : null}
                <View style={[styles.badge, statusStyle]}>
                  <Text style={[styles.badgeText, isLocked && styles.badgeTextLocked]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const useStyles = (theme) => StyleSheet.create({
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
    overflow: 'hidden',
    minHeight: 76,
  },
  cardLocked: {
    opacity: 0.6,
  },
  accentBar: {
    width: 4,
    backgroundColor: theme.primary,
  },
  accentBarLocked: {
    backgroundColor: theme.darkGray,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
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
  dueText: {
    color: theme.gray,
    fontSize: 11,
    marginTop: 3,
  },
  cardRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 14,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePending: {
    backgroundColor: 'rgba(255,45,85,0.15)',
  },
  badgeSubmitted: {
    backgroundColor: 'rgba(52,199,89,0.15)',
  },
  badgeGraded: {
    backgroundColor: 'rgba(52,199,89,0.2)',
  },
  badgeNeedsRevision: {
    backgroundColor: 'rgba(255,149,0,0.2)',
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
});
