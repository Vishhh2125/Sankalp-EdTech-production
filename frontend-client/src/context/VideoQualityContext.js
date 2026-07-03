import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useNetInfo } from '@react-native-community/netinfo';

const STORAGE_KEY = 'video_quality_preference';

export const VIDEO_QUALITY_OPTIONS = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Balances quality and data based on your connection.',
  },
  {
    id: 'data_saver',
    label: 'Data Saver',
    description: 'Uses the least mobile data.',
  },
  {
    id: 'medium',
    label: 'Medium',
    description: 'Keeps video clear while limiting data.',
  },
  {
    id: 'high',
    label: 'High',
    description: 'Better quality with more data usage.',
  },
  {
    id: 'maximum',
    label: 'Maximum',
    description: 'Lets the player use the highest available quality.',
  },
];

const OPTION_IDS = new Set(VIDEO_QUALITY_OPTIONS.map((option) => option.id));

const BITRATE_BY_QUALITY = {
  data_saver: 900000,
  medium: 1600000,
  high: 3200000,
  maximum: 0,
};

const VideoQualityContext = createContext({
  quality: 'auto',
  setQuality: () => {},
  options: VIDEO_QUALITY_OPTIONS,
  maxBitRate: 0,
  isCellular: false,
  activeLabel: 'Auto',
});

function getAutoBitRate(isCellular) {
  return isCellular ? 1600000 : 0;
}

function getQualityLabel(quality) {
  return VIDEO_QUALITY_OPTIONS.find((option) => option.id === quality)?.label || 'Auto';
}

export function VideoQualityProvider({ children }) {
  const netInfo = useNetInfo();
  const [quality, setQualityState] = useState('auto');

  const isCellular = netInfo.type === 'cellular';

  useEffect(() => {
    let mounted = true;

    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (mounted && OPTION_IDS.has(stored)) {
          setQualityState(stored);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const setQuality = useCallback((next) => {
    if (!OPTION_IDS.has(next)) return;
    setQualityState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const maxBitRate = useMemo(() => {
    if (quality === 'auto') {
      return getAutoBitRate(isCellular);
    }

    return BITRATE_BY_QUALITY[quality] ?? 0;
  }, [isCellular, quality]);

  const value = useMemo(
    () => ({
      quality,
      setQuality,
      options: VIDEO_QUALITY_OPTIONS,
      maxBitRate,
      isCellular,
      activeLabel: getQualityLabel(quality),
    }),
    [isCellular, maxBitRate, quality, setQuality]
  );

  return (
    <VideoQualityContext.Provider value={value}>
      {children}
    </VideoQualityContext.Provider>
  );
}

export function useVideoQuality() {
  return useContext(VideoQualityContext);
}
