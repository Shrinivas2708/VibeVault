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
}

export function ProgressBar({
  position,
  duration,
  onSeek,
  large = false,
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
      setIsDragging(true);
      setScrubPosition(positionFromX(x));
    },
    [positionFromX],
  );

  const updateDrag = useCallback(
    (x: number) => {
      setScrubPosition(positionFromX(x));
    },
    [positionFromX],
  );

  const endDrag = useCallback(
    (x: number) => {
      setIsDragging(false);
      const clamped = Math.max(0, Math.min(safeDuration, positionFromX(x)));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSeek(clamped);
    },
    [onSeek, positionFromX, safeDuration],
  );

  const pan = Gesture.Pan()
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

  const gesture = Gesture.Race(pan, tap);

  return (
    <View className="gap-2">
      <GestureDetector gesture={gesture}>
        <View
          className={`justify-center ${large ? "h-6" : "h-3"}`}
          onLayout={onLayout}
        >
          <View className={`rounded-vault-pill bg-vault-surface-elevated ${large ? "h-1.5" : "h-1"}`}>
            <View
              className="h-full rounded-vault-pill bg-vault-accent"
              style={{
                width: `${ratio * 100}%`,
                shadowColor: "#1ed760",
                shadowOpacity: 0.45,
                shadowRadius: 6,
              }}
            />
          </View>
          {large ? (
            <View
              className="absolute h-3.5 w-3.5 -translate-x-1.5 rounded-full border-2 border-vault-background bg-vault-accent"
              style={{ left: `${ratio * 100}%` }}
            />
          ) : null}
        </View>
      </GestureDetector>

      <View className="flex-row justify-between">
        <Text className="font-inter text-xs text-vault-muted">
          {formatDuration(shownPosition * 1000)}
        </Text>
        <Text className="font-inter text-xs text-vault-muted">
          {formatDuration(safeDuration * 1000)}
        </Text>
      </View>
    </View>
  );
}
