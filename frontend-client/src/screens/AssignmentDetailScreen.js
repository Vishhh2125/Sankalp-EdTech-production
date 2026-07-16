import React, { useState, useEffect } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { courseworkApi, formatFileSize } from '../services/courseworkApi';
import { downloadFile } from '../utils/fileDownloader';

const ANSWER_LIMIT = 1000;

function getFileNameFromUrl(url) {
  if (!url) return null;

  try {
    const lastPart = url.split('/').pop() || '';
    return decodeURIComponent(lastPart.split('?')[0]) || null;
  } catch {
    return url.split('/').pop() || null;
  }
}

export default function AssignmentDetailScreen({ route, navigation }) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  const assignment = route.params?.assignment;
  const [answerText, setAnswerText] = useState('');
  const [pickedFile, setPickedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(assignment?.submission || null);

  useEffect(() => {
    setSubmission(assignment?.submission || null);
    setAnswerText(assignment?.submission?.answer_text || '');
    setPickedFile(null);
  }, [assignment?.id, assignment?.submission]);

  const isGraded = submission?.status === 'GRADED';
  const currentAttachmentName = submission?.attachment_url ? getFileNameFromUrl(submission.attachment_url) : null;
  const canEdit = !isGraded;

  // Compute time remaining
  const dueAt = assignment.due_at ? new Date(assignment.due_at) : null;
  const now = new Date();
  let countdownLabel = null;
  if (dueAt && dueAt > now) {
    const diff = dueAt - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    countdownLabel = days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
  }

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/png',
          'image/jpeg',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        // Enforce 5MB limit
        if (file.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Maximum file size is 5MB.');
          return;
        }
        setPickedFile(file);
      }
    } catch (err) {
      console.error('Document picker error:', err);
    }
  };

  const handleSubmit = async () => {
    if (!answerText.trim() && !pickedFile && !submission?.attachment_url) {
      Alert.alert('Missing Content', 'Please write an answer or attach a file.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('answer_text', answerText.trim());

      if (pickedFile) {
        formData.append('attachment', {
          uri: pickedFile.uri,
          type: pickedFile.mimeType || 'application/octet-stream',
          name: pickedFile.name || 'attachment',
        });
      }

      const res = await courseworkApi.submitAssignment(assignment.id, formData);
      const updatedSubmission = res.data || null;

      setSubmission(updatedSubmission);
      setPickedFile(null);

      if (route.params?.onSubmitted) {
        route.params.onSubmitted(assignment.id, updatedSubmission);
      }

      Alert.alert('Success', 'Your assignment has been submitted!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      Alert.alert('Submission Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={appTheme.white} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Assignment {assignment.order_index || ''}
        </Text>
        {countdownLabel && (
          <View style={styles.countdownPill}>
            <Ionicons name="time-outline" size={12} color={appTheme.crimson} />
            <Text style={styles.countdownText}>{countdownLabel}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.assignmentTitle}>{assignment?.title}</Text>
        {assignment?.due_at && (
          <Text style={styles.dueLine}>
            Due: {new Date(assignment.due_at).toLocaleDateString(undefined, {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        )}

        {/* Problem Statement */}
        <Text style={styles.label}>Problem Statement</Text>
        <View style={styles.problemCard}>
          <Text style={styles.problemText}>
            {assignment.problem_statement || 'No problem statement provided.'}
          </Text>
        </View>

        {submission && isGraded ? (
          <View style={styles.submittedCard}>
            <Ionicons name="checkmark-circle" size={28} color={appTheme.green} />
            <Text style={styles.submittedTitle}>Assignment Graded</Text>
            {submission.score !== null && submission.score !== undefined ? (
              <Text style={styles.submittedScore}>
                Score: {submission.score}
              </Text>
            ) : null}
            {submission.feedback ? (
              <>
                <Text style={styles.feedbackLabel}>Feedback:</Text>
                <Text style={styles.feedbackText}>{submission.feedback}</Text>
              </>
            ) : null}
            {submission.answer_text ? (
              <View style={styles.answerPreviewCard}>
                <Text style={styles.feedbackLabel}>Saved Answer</Text>
                <Text style={styles.answerPreviewText}>{submission.answer_text}</Text>
              </View>
            ) : null}
            {submission.attachment_url ? (
              <Pressable
                style={styles.attachmentPill}
                onPress={() => downloadFile(submission.attachment_url, currentAttachmentName || 'Attachment')}
              >
                <Ionicons name="document-attach-outline" size={16} color={appTheme.white} />
                <Text style={styles.attachmentPillText} numberOfLines={1}>
                  {currentAttachmentName || 'Attachment'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            {/* Answer Input */}
            <Text style={styles.label}>Your Answer</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your answer here..."
                placeholderTextColor={appTheme.darkGray}
                multiline
                maxLength={ANSWER_LIMIT}
                value={answerText}
                onChangeText={setAnswerText}
                textAlignVertical="top"
                editable={canEdit}
              />
              <Text style={styles.charCount}>{answerText.length} / {ANSWER_LIMIT}</Text>
            </View>

            {/* File Upload */}
            <Text style={styles.label}>Attach (Optional)</Text>
            {submission?.attachment_url ? (
              <View style={styles.existingAttachmentCard}>
                <View style={styles.existingAttachmentRow}>
                  <Ionicons name="document-text-outline" size={20} color={appTheme.crimson} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.existingAttachmentLabel}>Current attachment</Text>
                    <Text style={styles.pickedName} numberOfLines={1}>{currentAttachmentName || 'Attachment'}</Text>
                    <Pressable onPress={() => downloadFile(submission.attachment_url, currentAttachmentName || 'Attachment')}>
                      <Text style={styles.openLinkText}>Open attachment</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.uploadArea,
                !canEdit && styles.uploadAreaDisabled,
                pressed && canEdit && styles.uploadAreaPressed,
              ]}
              onPress={canEdit ? handlePickFile : undefined}
              disabled={!canEdit}
            >
              {pickedFile ? (
                <View style={styles.pickedRow}>
                  <Ionicons name="document-attach" size={20} color={appTheme.crimson} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickedName} numberOfLines={1}>{pickedFile.name}</Text>
                    <Text style={styles.pickedSize}>{formatFileSize(pickedFile.size)}</Text>
                  </View>
                  <Pressable onPress={() => setPickedFile(null)}>
                    <Ionicons name="close-circle" size={20} color={appTheme.gray} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={28} color={appTheme.crimson} />
                  <Text style={styles.uploadLabel}>{canEdit ? 'Upload or Replace File' : 'Attachment Locked'}</Text>
                  <Text style={styles.uploadHint}>PPT, DOC, PDF, PNG, JPEG (Max 5MB)</Text>
                </>
              )}
            </Pressable>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                submitting && styles.submitBtnDisabled,
                !canEdit && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || !canEdit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={appTheme.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {submission ? 'Resubmit Assignment' : 'Submit Assignment'}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = (appTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.deepBlack,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.border,
  },
  headerTitle: {
    flex: 1,
    color: appTheme.white,
    fontSize: 17,
    fontWeight: '800',
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,45,85,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  countdownText: {
    color: appTheme.crimson,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  assignmentTitle: {
    color: appTheme.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  dueLine: {
    color: appTheme.gray,
    fontSize: 13,
    marginBottom: 20,
  },
  label: {
    color: appTheme.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 20,
  },
  problemCard: {
    backgroundColor: appTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.border,
    padding: 16,
  },
  problemText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 22,
  },
  inputWrap: {
    backgroundColor: appTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.border,
    padding: 14,
  },
  textInput: {
    color: appTheme.white,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 120,
  },
  charCount: {
    color: appTheme.darkGray,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  uploadArea: {
    backgroundColor: appTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.border,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadAreaPressed: {
    opacity: 0.85,
  },
  uploadAreaDisabled: {
    opacity: 0.55,
  },
  uploadLabel: {
    color: appTheme.crimson,
    fontSize: 14,
    fontWeight: '700',
  },
  uploadHint: {
    color: appTheme.darkGray,
    fontSize: 11,
  },
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  pickedName: {
    color: appTheme.white,
    fontSize: 13,
    fontWeight: '600',
  },
  pickedSize: {
    color: appTheme.gray,
    fontSize: 11,
    marginTop: 2,
  },
  existingAttachmentCard: {
    backgroundColor: appTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.border,
    padding: 14,
    marginBottom: 12,
  },
  existingAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  existingAttachmentLabel: {
    color: appTheme.gray,
    fontSize: 11,
    marginBottom: 3,
  },
  openLinkText: {
    color: appTheme.crimson,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: appTheme.crimson,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  submitBtnPressed: {
    opacity: 0.85,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: appTheme.white,
    fontSize: 16,
    fontWeight: '800',
  },
  submittedCard: {
    alignItems: 'center',
    backgroundColor: appTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.border,
    padding: 28,
    marginTop: 24,
    gap: 8,
  },
  submittedTitle: {
    color: appTheme.green,
    fontSize: 17,
    fontWeight: '800',
  },
  submittedScore: {
    color: appTheme.white,
    fontSize: 14,
    fontWeight: '700',
  },
  answerPreviewCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appTheme.border,
    padding: 14,
    marginTop: 6,
    gap: 6,
  },
  answerPreviewText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    lineHeight: 20,
  },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,45,85,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 10,
    maxWidth: '100%',
  },
  attachmentPillText: {
    color: appTheme.white,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  feedbackLabel: {
    color: appTheme.gray,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  feedbackText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
