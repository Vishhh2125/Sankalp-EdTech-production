import React from 'react';
import { FontAwesome6 } from '@expo/vector-icons';

import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

/** App-wide coin icon (Font Awesome "coins"). */
export default function CoinIcon({ size = 16, color = theme.gold, style }) {
  return (
    <FontAwesome6 name="naira-sign" size={size} color={color} style={style} />
  );
}
