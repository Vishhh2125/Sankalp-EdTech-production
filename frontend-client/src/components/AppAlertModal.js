import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { alertService } from '../services/alertService';
import { useTheme } from '../context/ThemeContext';

export default function AppAlertModal() {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  const [visible, setVisible] = useState(false);
  const [alertData, setAlertData] = useState(null);

  useEffect(() => {
    const unsubscribe = alertService.subscribe((data) => {
      setAlertData(data);
      setVisible(true);
    });
    return unsubscribe;
  }, []);

  if (!visible || !alertData) {
    return null;
  }

  const { title, message, buttons } = alertData;

  const handleClose = () => {
    setVisible(false);
    setAlertData(null);
  };

  const handleButtonPress = (onPress) => {
    handleClose();
    if (onPress) {
      setTimeout(() => onPress(), 50);
    }
  };

  // Determine icon based on title text keywords
  const getHeaderIcon = () => {
    const lowerTitle = (title || '').toLowerCase();
    if (lowerTitle.includes('success') || lowerTitle.includes('claimed') || lowerTitle.includes('purchased')) {
      return { name: 'checkmark-circle-outline', color: theme.green || '#16A34A' };
    }
    if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('missing')) {
      return { name: 'alert-circle-outline', color: theme.red || '#DC2626' };
    }
    if (lowerTitle.includes('large') || lowerTitle.includes('required') || lowerTitle.includes('unanswered')) {
      return { name: 'warning-outline', color: theme.gold || '#D4A600' };
    }
    return { name: 'information-circle-outline', color: theme.primary };
  };

  const iconInfo = getHeaderIcon();

  // Normalize buttons argument
  const normalizedButtons =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: 'OK', style: 'default' }];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        if (alertData.options?.cancelable !== false) {
          handleClose();
        }
      }}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          if (alertData.options?.cancelable !== false) {
            handleClose();
          }
        }}
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <Ionicons name={iconInfo.name} size={32} color={iconInfo.color} />
          </View>

          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View
            style={[
              styles.buttonsRow,
              normalizedButtons.length > 2 && styles.buttonsColumn,
            ]}
          >
            {normalizedButtons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              let btnStyle = styles.primaryBtn;
              let textStyle = styles.primaryBtnText;

              if (isCancel) {
                btnStyle = styles.cancelBtn;
                textStyle = styles.cancelBtnText;
              } else if (isDestructive) {
                btnStyle = styles.destructiveBtn;
                textStyle = styles.destructiveBtnText;
              }

              return (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.btnBase,
                    btnStyle,
                    pressed && styles.btnPressed,
                    normalizedButtons.length === 1 && styles.singleBtn,
                    normalizedButtons.length === 2 && { flex: 1 },
                  ]}
                  onPress={() => handleButtonPress(btn.onPress)}
                >
                  <Text style={textStyle}>{btn.text || 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = (theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
    },
    iconCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: theme.deepBlack || theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.white,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: theme.gray,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
    },
    buttonsColumn: {
      flexDirection: 'column',
    },
    btnBase: {
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    singleBtn: {
      minWidth: 130,
      paddingHorizontal: 28,
    },
    btnPressed: {
      opacity: 0.85,
    },
    primaryBtn: {
      backgroundColor: theme.primary,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    cancelBtn: {
      backgroundColor: theme.deepBlack || theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cancelBtnText: {
      color: theme.gray,
      fontSize: 15,
      fontWeight: '700',
    },
    destructiveBtn: {
      backgroundColor: theme.red || '#DC2626',
    },
    destructiveBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
