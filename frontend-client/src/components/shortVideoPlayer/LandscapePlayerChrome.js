import { useTheme } from '../../context/ThemeContext';
import React from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import ProgressBar from './ProgressBar';
import { styles } from './styles';

export default function LandscapePlayerChrome({
  insets,
  item,
  controlsOpacity,
  showMainOverlay,
  controlsVisible,
  manuallyPaused,
  currentTime,
  duration,
  seekTo,
  handleScrubStart,
  handleScrubEnd,
  handleOttScrimPress,
  handlePlayPausePress,
  handleSkipBack,
  handleSkipForward,
  renderVolumeControl,
  qualityLabel,
  onQualityPress,
  playbackRate,
  showPlaybackSpeedControl,
  onSpeedPress,
  onExitLandscape,
}) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  const horizontalPad = Math.max(insets.left, insets.right, 16);

  return (
    <View style={styles.landscapeChromeRoot} pointerEvents="box-none">
      <Pressable
        style={styles.landscapeTapZone}
        onPress={handleOttScrimPress}
      />

      {controlsVisible ? (
        <View style={styles.ottDim} pointerEvents="none" />
      ) : manuallyPaused ? (
        <View style={styles.ottDimPaused} pointerEvents="none" />
      ) : null}

      <View
        style={[
          styles.landscapeTopBar,
          { paddingTop: Math.max(insets.top, 8), paddingHorizontal: horizontalPad },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.landscapeModeBtn}
          onPress={onExitLandscape}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="phone-rotate-portrait" size={20} color="#fff" />
          <Text style={styles.landscapeModeBtnText}>Portrait</Text>
        </Pressable>

        <View style={styles.landscapeTopActions}>
          {renderVolumeControl()}
          <Pressable
            style={[styles.speedChipTop, styles.qualityChipTop]}
            onPress={onQualityPress}
            hitSlop={10}
          >
            <Text style={styles.speedChipText}>{qualityLabel}</Text>
          </Pressable>
          {showPlaybackSpeedControl ? (
            <Pressable
              style={styles.speedChipTop}
              onPress={onSpeedPress}
              hitSlop={10}
            >
              <Text style={styles.speedChipText}>
                {playbackRate === 1 ? '1x' : `${playbackRate}x`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {(controlsVisible || manuallyPaused) ? (
        <Animated.View
          style={[styles.landscapeCenterWrap, { opacity: controlsOpacity }]}
          pointerEvents="box-none"
        >
          <View style={styles.ottSeekRow}>
            <Pressable style={styles.ottSeekBtn} onPress={handleSkipBack} hitSlop={12}>
              <MaterialCommunityIcons name="rewind" size={18} color="#fff" />
              <Text style={styles.ottSeekText}>10</Text>
            </Pressable>
            <Pressable
              style={styles.ottPlayPauseFab}
              onPress={handlePlayPausePress}
              hitSlop={16}
            >
              <Ionicons
                name={manuallyPaused ? 'play' : 'pause'}
                size={38}
                color="#fff"
                style={manuallyPaused ? styles.playIconNudge : undefined}
              />
            </Pressable>
            <Pressable style={styles.ottSeekBtn} onPress={handleSkipForward} hitSlop={12}>
              <Text style={styles.ottSeekText}>10</Text>
              <MaterialCommunityIcons name="fast-forward" size={18} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.landscapeBottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: horizontalPad,
            opacity: controlsOpacity,
          },
        ]}
        pointerEvents={showMainOverlay ? 'box-none' : 'none'}
      >
        <Text style={styles.landscapeTitle} numberOfLines={1}>
          {item.show_title}
          <Text style={styles.landscapeEpText}> · EP.{item.episode_num}</Text>
        </Text>
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seekTo}
          format="elapsedTotal"
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
        />
      </Animated.View>
    </View>
  );
}
