import { formatDuration } from "@vibevault/utils";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

interface ProgressBarProps {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  large?: boolean;
  compact?: boolean;
}

export function ProgressBar({
  position,
  duration,
  onSeek,
  large = false,
  compact = false,
}: ProgressBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  const safeDuration = duration > 0 ? duration : 0;
  const shownPosition = isDragging ? scrubPosition : position;
  const ratio =
    safeDuration > 0
      ? Math.min(1, Math.max(0, shownPosition / safeDuration))
      : 0;

  const onLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const positionFromX = useCallback(
    (x: number) => {
      if (barWidth <= 0 || safeDuration <= 0) {
        return 0;
      }
      const nextRatio = Math.max(0, Math.min(1, x / barWidth));
      return nextRatio * safeDuration;
    },
    [barWidth, safeDuration],
  );

  const beginDrag = useCallback(
    (x: number) => {
      if (safeDuration <= 0) return;
      setIsDragging(true);
      setScrubPosition(positionFromX(x));
    },
    [positionFromX, safeDuration],
  );

  const updateDrag = useCallback(
    (x: number) => {
      setScrubPosition(positionFromX(x));
    },
    [positionFromX],
  );

  const endDrag = useCallback(
    (x: number) => {
      if (safeDuration <= 0) {
        setIsDragging(false);
        return;
      }
      setIsDragging(false);
      const clamped = Math.max(0, Math.min(safeDuration, positionFromX(x)));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSeek(clamped);
    },
    [onSeek, positionFromX, safeDuration],
  );

  const pan = Gesture.Pan()
    .minDistance(0)
    .activeOffsetX([-4, 4])
    .onBegin((event) => {
      runOnJS(beginDrag)(event.x);
    })
    .onUpdate((event) => {
      runOnJS(updateDrag)(event.x);
    })
    .onEnd((event) => {
      runOnJS(endDrag)(event.x);
    });

  const tap = Gesture.Tap().onEnd((event) => {
    runOnJS(endDrag)(event.x);
  });

  const gesture = Gesture.Exclusive(pan, tap);
  const trackHeight = large ? 4 : compact ? 3 : 4;
  const touchHeight = large ? 36 : compact ? 24 : 28;
  const showThumb = large || compact || isDragging;

  return (
    <View className={compact ? "" : "gap-2"}>
      <GestureDetector gesture={gesture}>
        <View
          className="justify-center"
          onLayout={onLayout}
          style={{ height: touchHeight }}
        >
          <View
            className="rounded-vault-pill bg-vault-surface-elevated"
            style={{ height: trackHeight }}
          >
            <View
              className="h-full rounded-vault-pill bg-vault-accent"
              style={{
                width: `${ratio * 100}%`,
                shadowColor: large ? "#1ed760" : "transparent",
                shadowOpacity: large ? 0.45 : 0,
                shadowRadius: large ? 6 : 0,
              }}
            />
          </View>
          {showThumb ? (
            <View
              className={`absolute rounded-full border-2 border-vault-background bg-vault-accent ${
                large ? "h-4 w-4 -translate-x-2" : "h-3 w-3 -translate-x-1.5"
              }`}
              style={{ left: `${ratio * 100}%`, top: (touchHeight - (large ? 16 : 12)) / 2 }}
            />
          ) : null}
        </View>
      </GestureDetector>

      {compact ? null : (
        <View className="flex-row justify-between">
          <Text className="font-inter text-xs text-vault-muted">
            {formatDuration(shownPosition * 1000)}
          </Text>
          <Text className="font-inter text-xs text-vault-muted">
            {formatDuration(safeDuration * 1000)}
          </Text>
        </View>
      )}
    </View>
  );
}
