import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { courseworkApi } from '../services/courseworkApi';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizTakingScreen({ route, navigation }) {
  const quiz = route.params?.quiz;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({}); // { questionId: optionId }
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null); // After submission
  const scrollRef = useRef(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const res = await courseworkApi.getQuizQuestions(quiz.id);
      setQuestions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load quiz questions.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIdx];
  const progressPct = totalQuestions > 0 ? ((currentIdx + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIdx === totalQuestions - 1;

  const handleSelectOption = (optionId) => {
    if (results) return; // No changes after submission
    setSelectedOptions(prev => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(prev => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrevious = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleSubmitQuiz = async () => {
    // Validate all questions answered
    const unanswered = questions.filter(q => !selectedOptions[q.id]);
    if (unanswered.length > 0) {
      Alert.alert(
        'Unanswered Questions',
        `You have ${unanswered.length} unanswered question(s). Please answer all questions before submitting.`
      );
      return;
    }

    Alert.alert(
      'Submit Quiz',
      'Are you sure you want to submit? You cannot retake this quiz.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const answers = questions.map(q => ({
                question_id: q.id,
                selected_option_id: selectedOptions[q.id],
              }));

              const res = await courseworkApi.submitQuizAttempt(quiz.id, answers);
              setResults(res.data);
              if (route.params?.onAttemptCompleted) {
                route.params.onAttemptCompleted(quiz.id, {
                  id: res.data?.id,
                  score: res.data?.score ?? 0,
                  total_questions: res.data?.total_questions ?? questions.length,
                  completed_at: res.data?.completed_at || new Date().toISOString(),
                });
              }
              setCurrentIdx(0);
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            } catch (err) {
              const msg = err.response?.data?.message || err.message;
              Alert.alert('Submission Failed', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.crimson} />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  // ─── RESULTS VIEW ───
  if (results) {
    const totalQuestionsCount = results.total_questions || totalQuestions || 0;
    const rawScore = results.score || 0;
    const scorePct = totalQuestionsCount > 0 ? Math.round((rawScore / totalQuestionsCount) * 100) : 0;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.white} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Quiz Results</Text>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Score Summary */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Your Score</Text>
            <Text style={styles.scorePct}>
              {rawScore} / {totalQuestionsCount}
            </Text>
            <Text style={styles.scoreSubtext}>
              {scorePct}% correct
            </Text>
          </View>

          {/* Per-question review */}
          {results.results?.map((r, idx) => {
            const q = questions[idx];
            if (!q) return null;
            const isCorrect = r.is_correct;
            const selectedOption = r.options?.find((opt) => opt.id === r.selected_option_id);

            return (
              <View key={q.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewQNum}>Q{idx + 1}</Text>
                  <View style={[styles.reviewBadge, isCorrect ? styles.reviewCorrect : styles.reviewWrong]}>
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={isCorrect ? theme.green : theme.red}
                    />
                    <Text style={[styles.reviewBadgeText, { color: isCorrect ? theme.green : theme.red }]}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reviewQuestion}>{q.question_text}</Text>

                {/* Show correct answer label */}
                {r.correct_option_text && (
                  <Text style={styles.correctAnswerText}>
                    Correct Answer: {r.correct_option_text}
                  </Text>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <View style={styles.explanationCard}>
                    <Ionicons name="bulb" size={16} color={theme.crimson} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.explanationLabel}>Explanation</Text>
                      <Text style={styles.explanationText}>{q.explanation}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <Pressable
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─── QUESTION VIEW ───
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.white} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Quiz {quiz.order_index}: {quiz.title}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Question {currentIdx + 1} of {totalQuestions}</Text>
        <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentQuestion && (
          <>
            {/* Question Card */}
            <View style={styles.questionCard}>
              <View style={styles.questionTopRow}>
                <Text style={styles.questionLabel}>Question</Text>
                <View style={styles.markBadge}>
                  <Text style={styles.markText}>1 Mark</Text>
                </View>
              </View>
              <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
              <Text style={styles.chooseHint}>Choose the best answer</Text>
              {selectedOptions[currentQuestion.id] ? (
                <View style={styles.explanationCardInline}>
                  <Ionicons name="bulb-outline" size={16} color={theme.crimson} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.explanationLabelInline}>Explanation</Text>
                    <Text style={styles.explanationTextInline}>
                      {currentQuestion.explanation || 'No explanation provided.'}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Options */}
            {currentQuestion.options?.map((opt, optIdx) => {
              const isSelected = selectedOptions[currentQuestion.id] === opt.id;

              return (
                <Pressable
                  key={opt.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => handleSelectOption(opt.id)}
                >
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                    {OPTION_LETTERS[optIdx] || optIdx + 1}
                  </Text>
                  <Text style={styles.optionText}>{opt.option_text}</Text>
                </Pressable>
              );
            })}
          </>
        )}

      </ScrollView>

      <View style={styles.bottomNav}>
        <Pressable
          style={[styles.navBtn, styles.prevBtn]}
          disabled={currentIdx === 0}
          onPress={handlePrevious}
        >
          <Ionicons name="arrow-back" size={16} color={currentIdx === 0 ? theme.darkGray : theme.white} />
          <Text style={[styles.prevBtnText, currentIdx === 0 && { color: theme.darkGray }]}>Previous</Text>
        </Pressable>

        {isLastQuestion ? (
          <Pressable
            style={[styles.navBtn, styles.submitQuizBtn]}
            onPress={handleSubmitQuiz}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.white} />
            ) : (
              <>
                <Text style={styles.submitQuizBtnText}>Submit Quiz</Text>
                <Ionicons name="checkmark" size={16} color={theme.white} />
              </>
            )}
          </Pressable>
        ) : (
          <Pressable style={[styles.navBtn, styles.nextBtn]} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Next Question</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.deepBlack,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: theme.gray,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    flex: 1,
    color: theme.white,
    fontSize: 17,
    fontWeight: '800',
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  progressLabel: {
    color: theme.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  progressPct: {
    color: theme.gray,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.crimson,
    borderRadius: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    marginBottom: 16,
  },
  questionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionLabel: {
    color: theme.crimson,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  markBadge: {
    backgroundColor: 'rgba(255,45,85,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  markText: {
    color: theme.crimson,
    fontSize: 10,
    fontWeight: '700',
  },
  questionText: {
    color: theme.white,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 25,
    marginBottom: 8,
  },
  chooseHint: {
    color: theme.gray,
    fontSize: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: theme.crimson,
    backgroundColor: 'rgba(255,45,85,0.06)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.darkGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.crimson,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.crimson,
  },
  optionLetter: {
    color: theme.gray,
    fontSize: 14,
    fontWeight: '800',
    width: 20,
  },
  optionLetterSelected: {
    color: theme.crimson,
  },
  optionText: {
    color: theme.white,
    fontSize: 14,
    flex: 1,
    lineHeight: 21,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
  },
  prevBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  prevBtnText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    backgroundColor: theme.crimson,
  },
  nextBtnText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '800',
  },
  submitQuizBtn: {
    backgroundColor: theme.crimson,
  },
  submitQuizBtnText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '800',
  },
  // ── Results Styles ──
  scoreCard: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 28,
    marginBottom: 20,
    gap: 6,
  },
  scoreLabel: {
    color: theme.gray,
    fontSize: 13,
    fontWeight: '600',
  },
  scorePct: {
    fontSize: 42,
    fontWeight: '900',
  },
  scoreSubtext: {
    color: theme.gray,
    fontSize: 13,
  },
  reviewCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewQNum: {
    color: theme.gray,
    fontSize: 12,
    fontWeight: '800',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reviewCorrect: {
    backgroundColor: 'rgba(52,199,89,0.1)',
  },
  reviewWrong: {
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewQuestion: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 6,
  },
  selectedAnswerText: {
    color: theme.gray,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  correctAnswerText: {
    color: theme.green,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  explanationCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,45,85,0.06)',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  explanationLabel: {
    color: theme.crimson,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  explanationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  explanationCardInline: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,45,85,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.18)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  explanationLabelInline: {
    color: theme.crimson,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  explanationTextInline: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 19,
  },
  doneBtn: {
    backgroundColor: theme.crimson,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  doneBtnText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
