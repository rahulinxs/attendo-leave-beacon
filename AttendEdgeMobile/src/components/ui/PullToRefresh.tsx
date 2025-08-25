import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StyleProp,
  ViewStyle,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../../theme';
import { ActivityIndicator } from 'react-native';
import Text from './Text';

const PULL_DOWN_DISTANCE = 100;
const REFRESH_HEIGHT = 60;

export interface PullToRefreshProps extends ScrollViewProps {
  onRefresh: () => Promise<void> | void;
  refreshing: boolean;
  refreshHeight?: number;
  pullDownDistance?: number;
  containerStyle?: StyleProp<ViewStyle>;
  refreshContainerStyle?: StyleProp<ViewStyle>;
  refreshIndicatorStyle?: StyleProp<ViewStyle>;
  refreshTextStyle?: StyleProp<ViewStyle>;
  refreshIndicatorColor?: string;
  refreshText?: string;
  pullDownText?: string;
  releaseText?: string;
  refreshingText?: string;
  showsVerticalScrollIndicator?: boolean;
  children: React.ReactNode;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  refreshing: externalRefreshing,
  refreshHeight = REFRESH_HEIGHT,
  pullDownDistance = PULL_DOWN_DISTANCE,
  containerStyle,
  refreshContainerStyle,
  refreshIndicatorStyle,
  refreshTextStyle,
  refreshIndicatorColor,
  refreshText,
  pullDownText = 'Pull down to refresh',
  releaseText = 'Release to refresh',
  refreshingText = 'Refreshing...',
  showsVerticalScrollIndicator = false,
  children,
  ...rest
}) => {
  const { colors } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const [contentOffset, setContentOffset] = useState({ x: 0, y: 0 });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [canRefresh, setCanRefresh] = useState(false);
  const [isManualScroll, setIsManualScroll] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const refreshing = externalRefreshing || internalRefreshing;

  // Handle the refresh action
  const handleRefresh = useCallback(async () => {
    setInternalRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } catch (error) {
      console.error('PullToRefresh error:', error);
    } finally {
      setInternalRefreshing(false);
    }
  }, [onRefresh]);

  // Handle scroll events
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setContentOffset({ x: event.nativeEvent.contentOffset.x, y: offsetY });
        
        // Check if user has scrolled down enough to enable refresh
        if (offsetY < -pullDownDistance && !isManualScroll) {
          setCanRefresh(true);
        } else if (offsetY > -pullDownDistance && isManualScroll) {
          setCanRefresh(false);
        }
      },
    }
  );

  // Handle scroll end
  const handleScrollEndDrag = () => {
    if (canRefresh && !refreshing) {
      handleRefresh();
    }
    setIsManualScroll(false);
  };

  // Handle scroll begin
  const handleScrollBeginDrag = () => {
    setIsManualScroll(true);
  };

  // Calculate the pull distance for the animation
  const pullDistance = scrollY.interpolate({
    inputRange: [-pullDownDistance * 2, -pullDownDistance, 0],
    outputRange: [refreshHeight, refreshHeight, 0],
    extrapolate: 'clamp',
  });

  // Calculate the opacity of the refresh indicator
  const refreshOpacity = scrollY.interpolate({
    inputRange: [-pullDownDistance, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Calculate the rotation of the refresh indicator
  const refreshRotation = scrollY.interpolate({
    inputRange: [-pullDownDistance, 0],
    outputRange: ['180deg', '0deg'],
    extrapolate: 'clamp',
  });

  // Determine the text to show based on the pull state
  const getRefreshText = () => {
    if (refreshing) return refreshingText;
    return contentOffset.y < -pullDownDistance ? releaseText : pullDownText;
  };

  // Auto-scroll to show refresh indicator when refreshing is true
  useEffect(() => {
    if (refreshing && !isManualScroll) {
      scrollViewRef.current?.scrollTo({ y: -pullDownDistance - 1, animated: true });
    } else if (!refreshing && contentOffset.y < 0) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [refreshing, contentOffset.y, isManualScroll, pullDownDistance]);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Refresh Indicator */}
      <Animated.View
        style={[
          styles.refreshContainer,
          {
            height: refreshHeight,
            opacity: refreshOpacity,
            transform: [{ translateY: pullDistance }],
          },
          refreshContainerStyle,
        ]}
        pointerEvents="none"
      >
        <View style={styles.refreshContent}>
          <Animated.View
            style={[
              styles.refreshIndicator,
              {
                transform: [{ rotate: refreshRotation }],
              },
              refreshIndicatorStyle,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color={refreshIndicatorColor || colors.primary}
              />
            ) : (
              <Animated.View style={{ transform: [{ rotate: '180deg' }] }}>
                <Text style={[styles.refreshText, { color: colors.textSecondary }, refreshTextStyle]}>
                  ↓
                </Text>
              </Animated.View>
            )}
          </Animated.View>
          {refreshText !== null && (
            <Text style={[styles.refreshText, { color: colors.textSecondary }, refreshTextStyle]}>
              {refreshText || getRefreshText()}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* ScrollView */}
      <Animated.ScrollView
        ref={scrollViewRef}
        {...rest}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleScrollEndDrag}
        scrollEnabled={!refreshing}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: headerHeight },
          rest.contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentOffset={contentOffset}
        overScrollMode="always"
        bounces={true}
        bouncesZoom={false}
        alwaysBounceVertical={!refreshing}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  refreshContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    overflow: 'hidden',
  },
  refreshContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  refreshIndicator: {
    marginRight: 8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PullToRefresh;
