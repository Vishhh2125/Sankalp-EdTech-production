import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PlaybackVolumeContext = createContext({
  volume: 1,
  muted: false,
  setVolume: () => {},
  toggleMuted: () => {},
});

function clampVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

export function PlaybackVolumeProvider({ children }) {
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);

  const setVolume = useCallback((next) => {
    const clamped = clampVolume(next);
    setVolumeState(clamped);
    setMuted(clamped === 0);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      volume,
      muted,
      setVolume,
      toggleMuted,
    }),
    [muted, setVolume, toggleMuted, volume]
  );

  return (
    <PlaybackVolumeContext.Provider value={value}>
      {children}
    </PlaybackVolumeContext.Provider>
  );
}

export function usePlaybackVolume() {
  return useContext(PlaybackVolumeContext);
}
