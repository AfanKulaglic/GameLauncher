import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { GameCard } from "./GameCard";
import { GameFocusOptions } from "./GameFocusOptions";
import { GameOptionModal } from "./GameOptionModal";
import { useResponsive } from "../../utils/useResponsive";

const DEFAULT_CARD_WIDTH = 200;
const GAP = 18;
const CLONE_SETS = 5;

export function GameCarousel({
  games,
  onSelect,
  onFocus,
  style,
  cardWidth = DEFAULT_CARD_WIDTH,
  initialGameId,
  lastPlayedGameId,
  isHomeFocused,
}) {
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const currentIndexRef = useRef(0);
  const dragStartIndexRef = useRef(0);
  const [activeRealIndex, setActiveRealIndex] = useState(0);
  const [optionModal, setOptionModal] = useState({ visible: false, option: null });
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

  const initialRealIndex = useMemo(() => {
    if (!initialGameId) return 0;
    const idx = games.findIndex((g) => g.id === initialGameId);
    return idx >= 0 ? idx : 0;
  }, [games, initialGameId]);

  const offsetForIndex = useCallback(
    (idx) => idx * itemWidth,
    [itemWidth]
  );

  // Jump to middle set on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (realCount > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      const startIndex = middleSetStart + initialRealIndex;
      currentIndexRef.current = startIndex;
      setActiveRealIndex(initialRealIndex);
      const offset = offsetForIndex(startIndex);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset, animated: false });
        scrollX.setValue(offset);
      }, 100);

      if (games[initialRealIndex] && onFocus) {
        onFocus(games[initialRealIndex]);
      }
    }
  }, [realCount, middleSetStart, offsetForIndex, initialRealIndex, games, onFocus]);

  // If last played arrives later (after async history load), snap to it once.
  const lastAppliedInitialGameIdRef = useRef(null);
  useEffect(() => {
    if (!hasInitialized.current || !initialGameId || realCount === 0) return;
    if (lastAppliedInitialGameIdRef.current === initialGameId) return;

    const idx = games.findIndex((g) => g.id === initialGameId);
    if (idx < 0) return;

    const targetIndex = middleSetStart + idx;
    const targetOffset = offsetForIndex(targetIndex);
    currentIndexRef.current = targetIndex;
    setActiveRealIndex(idx);
    listRef.current?.scrollToOffset({ offset: targetOffset, animated: false });
    scrollX.setValue(targetOffset);
    lastAppliedInitialGameIdRef.current = initialGameId;

    if (games[idx] && onFocus) {
      onFocus(games[idx]);
    }
  }, [initialGameId, realCount, games, middleSetStart, offsetForIndex, onFocus, scrollX]);

  // Re-focus last played only once each time Home screen is re-focused (false→true).
  const prevFocusedRef = useRef(false);
  useEffect(() => {
    if (!isHomeFocused) {
      prevFocusedRef.current = false;
      return;
    }
    if (prevFocusedRef.current) return;          // already handled this focus
    prevFocusedRef.current = true;

    if (!hasInitialized.current || !initialGameId || realCount === 0) return;
    const idx = games.findIndex((g) => g.id === initialGameId);
    if (idx < 0) return;

    const targetIndex = middleSetStart + idx;
    const targetOffset = offsetForIndex(targetIndex);
    currentIndexRef.current = targetIndex;
    setActiveRealIndex(idx);
    listRef.current?.scrollToOffset({ offset: targetOffset, animated: false });
    scrollX.setValue(targetOffset);

    if (games[idx] && onFocus) {
      onFocus(games[idx]);
    }
  }, [isHomeFocused, initialGameId, realCount, games, middleSetStart, offsetForIndex, onFocus, scrollX]);

  // Silent jump when user scrolls near the edges
  const handleScrollEnd = useCallback(
    (e) => {
      if (realCount === 0 || isJumping.current) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / itemWidth);
      const dragStart = dragStartIndexRef.current;
      const clampedIdx = Math.max(dragStart - 1, Math.min(dragStart + 1, idx));
      const loopTotal = realCount * CLONE_SETS;

      let targetIdx = clampedIdx;

      if (targetIdx < realCount || targetIdx >= loopTotal - realCount) {
        isJumping.current = true;
        const realIdx = ((targetIdx % realCount) + realCount) % realCount;
        const correctedIdx = middleSetStart + realIdx;
        const correctedOffset = offsetForIndex(correctedIdx);

        currentIndexRef.current = correctedIdx;
        listRef.current?.scrollToOffset({ offset: correctedOffset, animated: false });
        scrollX.setValue(correctedOffset);

        setTimeout(() => {
          isJumping.current = false;
        }, 50);
      } else {
        if (targetIdx !== idx) {
          listRef.current?.scrollToOffset({ offset: offsetForIndex(targetIdx), animated: true });
        }
        currentIndexRef.current = targetIdx;
        const realIdx = ((targetIdx % realCount) + realCount) % realCount;
        setActiveRealIndex(realIdx);
        const game = games[realIdx];
        if (game && onFocus) {
          onFocus(game);
        }
      }
    },
    [realCount, itemWidth, middleSetStart, offsetForIndex, games, onFocus]
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
        decelerationRate="fast"
        disableIntervalMomentum={true}
        bounces={false}
        overScrollMode="never"
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        data={loopData}
        keyExtractor={(item) => item._loopKey}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
        onScrollBeginDrag={() => {
          dragStartIndexRef.current = currentIndexRef.current;
        }}
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
                isLastPlayed={item.id === lastPlayedGameId}
                hasLastPlayed={Boolean(lastPlayedGameId)}
                onPress={() => onSelect(item)}
                cardWidth={cardWidth}
                imageHeight={imageHeight}
              />
              {isActive ? <GameFocusOptions onClose={() => {}} onOptionPress={(opt) => setOptionModal({ visible: true, option: opt })} /> : null}
            </Animated.View>
          );
        }}
      />

      <GameOptionModal
        game={games[activeRealIndex]}
        option={optionModal.option}
        visible={optionModal.visible}
        onClose={() => setOptionModal({ visible: false, option: null })}
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
