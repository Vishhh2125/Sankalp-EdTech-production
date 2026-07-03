import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

const LandscapePlaybackContext = createContext(null);

export function LandscapePlaybackProvider({ children }) {
  const [isLandscape, setIsLandscape] = useState(false);

  const value = useMemo(
    () => ({ isLandscape, setIsLandscape }),
    [isLandscape]
  );

  return (
    <LandscapePlaybackContext.Provider value={value}>
      <PortraitOrientationGuard>{children}</PortraitOrientationGuard>
    </LandscapePlaybackContext.Provider>
  );
}

function PortraitOrientationGuard({ children }) {
  const { isLandscape } = useLandscapePlaybackContext();

  useEffect(() => {
    if (isLandscape) return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, [isLandscape]);

  return children;
}

export function useLandscapePlaybackContext() {
  const ctx = useContext(LandscapePlaybackContext);
  return ctx || { isLandscape: false, setIsLandscape: () => {} };
}
