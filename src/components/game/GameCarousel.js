import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { GameCard } from "./GameCard";
import { GameFocusOptions } from "./GameFocusOptions";
import { useResponsive } from "../../utils/useResponsive";

const DEFAULT_CARD_WIDTH = 200;
const GAP = 18;
const CLONE_SETS = 5;

export function GameCarousel({ games, onSelect, onFocus, style, cardWidth = DEFAULT_CARD_WIDTH }) {
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const currentIndexRef = useRef(0);
  const [activeRealIndex, setActiveRealIndex] = useState(0);
  const isJumping = useRef(false);
  const { width, vScale } = useResponsive();

  const screenWidth = width;
  const itemWidth = cardWidth + GAP;
  const sidePadding = (screenWidth - cardWidth) / 2;
  const imageHeight = vScale(220);

  const realCount = games.length;

  const loopData = useMemo(() => {
    if (realCount === 0) return [];
    const arr = [];
    for (let s = 0; s < CLONE_SETS; s++) {
      games.forEach((g, i) => {
        arr.push({ ...g, _loopKey: `${s}_${g.id}`, _realIndex: i });
      });
    }
    return arr;
  }, [games, realCount]);

  const middleSetStart = Math.floor(CLONE_SETS / 2) * realCount;

  const offsetForIndex = useCallback(
    (idx) => idx * itemWidth,
    [itemWidth]
  );

  // Jump to middle set on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (realCount > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      currentIndexRef.current = middleSetStart;
      setActiveRealIndex(0);
      const offset = offsetForIndex(middleSetStart);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset, animated: false });
        scrollX.setValue(offset);
      }, 100);
    }
  }, [realCount, middleSetStart, offsetForIndex]);

  // Silent jump when user scrolls near the edges
  const handleScrollEnd = useCallback(
    (e) => {
      if (realCount === 0 || isJumping.current) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / itemWidth);
      const loopTotal = realCount * CLONE_SETS;

      if (idx < realCount || idx >= loopTotal - realCount) {
        isJumping.current = true;
        const realIdx = ((idx % realCount) + realCount) % realCount;
        const correctedIdx = middleSetStart + realIdx;
        const correctedOffset = offsetForIndex(correctedIdx);

        currentIndexRef.current = correctedIdx;
        listRef.current?.scrollToOffset({ offset: correctedOffset, animated: false });
        scrollX.setValue(correctedOffset);

        setTimeout(() => {
          isJumping.current = false;
        }, 50);
      }
    },
    [realCount, itemWidth, middleSetStart, offsetForIndex]
  );

  // Update which game is focused as user scrolls
  const handleScroll = useCallback(
    (offsetX) => {
      if (realCount === 0 || isJumping.current) return;
      const idx = Math.round(offsetX / itemWidth);
      if (idx !== currentIndexRef.current) {
        currentIndexRef.current = idx;
        const realIdx = ((idx % realCount) + realCount) % realCount;
        setActiveRealIndex(realIdx);
        const game = games[realIdx];
        if (game && onFocus) {
          onFocus(game);
        }
      }
    },
    [realCount, itemWidth, games, onFocus]
  );

  return (
    <View style={[styles.container, { paddingVertical: vScale(4) }, style]}>
      <Animated.FlatList
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        snapToAlignment="start"
        decelerationRate={Platform.OS === "ios" ? 0 : "fast"}
        disableIntervalMomentum={true}
        data={loopData}
        keyExtractor={(item) => item._loopKey}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: (event) => handleScroll(event.nativeEvent.contentOffset.x),
          }
        )}
        renderItem={({ item, index }) => {
          const center = index * itemWidth;
          const inputRange = [center - itemWidth, center, center + itemWidth];
          const animScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
            extrapolate: "clamp",
          });
          const animOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: "clamp",
          });

          const isActive = item._realIndex === activeRealIndex;

          return (
            <Animated.View
              style={[
                styles.itemWrap,
                {
                  width: cardWidth,
                  marginRight: GAP,
                  transform: [{ scale: animScale }],
                  opacity: animOpacity,
                },
              ]}
            >
              <GameCard
                game={item}
                focused={isActive}
                onPress={() => onSelect(item)}
                cardWidth={cardWidth}
                imageHeight={imageHeight}
              />
              {isActive ? <GameFocusOptions onClose={() => {}} /> : null}
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  itemWrap: {},
});
