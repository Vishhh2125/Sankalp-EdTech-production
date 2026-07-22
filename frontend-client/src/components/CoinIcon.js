import React from 'react';
import { FontAwesome6 } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

/** App-wide coin icon (Font Awesome "naira-sign"). */
export default function CoinIcon({ size = 16, color, style }) {
  const { theme } = useTheme();
  const iconColor = color || theme.gold;
  return (
    <FontAwesome6 name="naira-sign" size={size} color={iconColor} style={style} />
  );
}
