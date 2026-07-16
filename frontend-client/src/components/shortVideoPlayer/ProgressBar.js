import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, Text, useWindowDimensions, View } from 'react-native';

import { styles } from './styles';
import { formatTime } from './utils';

export default function ProgressBar({
  currentTime,
  duration,
  onSeek,
  format = 'remaining',
  onScrubStart,
  onScrubEnd,
}) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  const { width: windowWidth } = useWindowDimensions();
  const DEFAULT_TRACK_WIDTH = windowWidth - 32;

  const hitAreaRef = useRef(null);
  const trackWidthRef = useRef(DEFAULT_TRACK_WIDTH);
  const trackLeftRef = useRef(0);
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);
  const onScrubStartRef = useRef(onScrubStart);
  const onScrubEndRef = useRef(onScrubEnd);
  const activePageXRef = useRef(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  durationRef.current = duration;
  onSeekRef.current = onSeek;
  onScrubStartRef.current = onScrubStart;
  onScrubEndRef.current = onScrubEnd;

  const rawDisplayTime = scrubbing ? scrubTime : currentTime;
  const displayTime = duration > 0
    ? Math.max(0, Math.min(rawDisplayTime, duration))
    : Math.max(0, rawDisplayTime);
  const progress = duration > 0 ? Math.max(0, Math.min(displayTime / duration, 1)) : 0;
  const remaining = Math.max(0, duration - displayTime);

  const measureTrack = useCallback(() => {
    hitAreaRef.current?.measureInWindow((x, _y, width) => {
      if (width > 0) {
        trackLeftRef.current = x;
        trackWidthRef.current = width;
      }
    });
  }, []);

  const seekFromPageX = useCallback(
    (pageX) => {
      const w = trackWidthRef.current || DEFAULT_TRACK_WIDTH;
      const ratio = Math.max(0, Math.min(1, (pageX - trackLeftRef.current) / w));
      return ratio * durationRef.current;
    },
    []
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => durationRef.current > 0,
      onMoveShouldSetPanResponder: () => durationRef.current > 0,
      onPanResponderGrant: (evt) => {
        measureTrack();
        activePageXRef.current = evt.nativeEvent.pageX;
        const t = seekFromPageX(activePageXRef.current);
        setScrubbing(true);
        setScrubTime(t);
        onScrubStartRef.current?.();
      },
      onPanResponderMove: (_evt, gestureState) => {
        const pageX = gestureState.moveX || activePageXRef.current + gestureState.dx;
        activePageXRef.current = pageX;
        setScrubTime(seekFromPageX(pageX));
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const pageX = gestureState.moveX || activePageXRef.current;
        const t = seekFromPageX(pageX);
        setScrubbing(false);
        onScrubEndRef.current?.();
        onSeekRef.current?.(t);
      },
      onPanResponderTerminate: () => {
        setScrubbing(false);
        onScrubEndRef.current?.();
      },
    })
  ).current;

  return (
    <View style={styles.progressContainer}>
      <View
        ref={hitAreaRef}
        style={styles.progressBarHitArea}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) trackWidthRef.current = w;
          measureTrack();
        }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.progressBarTrack, scrubbing && styles.progressBarTrackScrubbing]}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          <View style={[styles.scrubberDot, scrubbing && styles.scrubberDotScrubbing, { left: `${progress * 100}%` }]} />
        </View>
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
        {format === 'elapsedTotal' ? (
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        ) : (
          <Text style={styles.timeText}>-{formatTime(remaining)}</Text>
        )}
      </View>
    </View>
  );
}
