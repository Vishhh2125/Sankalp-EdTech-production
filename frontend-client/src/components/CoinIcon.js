import React from 'react';
import { FontAwesome6 } from '@expo/vector-icons';

import { theme } from '../constants/theme';

/** App-wide coin icon (Font Awesome "naira-sign"). */
export default function CoinIcon({ size = 16, color = theme.gold, style }) {
  return (
    <FontAwesome6 name="naira-sign" size={size} color={color} style={style} />
  );
}
