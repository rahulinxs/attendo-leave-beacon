import React, {
  useRef,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  PanResponderInstance,
  I18nManager,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  GestureResponderEvent,
  PanResponderGestureState,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.3;
const BOUNCE_BACK_ANIMATION_DURATION = 300;
const SWIPE_OUT_ANIMATION_DURATION = 200;

type SwipeDirection = 'left' | 'right';

interface SwipeableActionProps {
  /**
   * Background color of the action
   */
  backgroundColor?: string;
  /**
   * Component to render as the action
   */
  component: ReactNode;
  /**
   * Callback when the action is pressed
   */
  onPress: () => void;
  /**
   * Width of the action
   * @default 80
   */
  width?: number;
  /**
   * Whether to close the swipeable after the action is pressed
   * @default true
   */
  closeOnPress?: boolean;
  /**
   * Style for the action container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Test ID for testing
   */
  testID?: string;
}

interface SwipeableProps {
  /**
   * Children to render inside the swipeable
   */
  children: ReactNode;
  /**
   * Left actions to show when swiped right
   */
  leftActions?: SwipeableActionProps[];
  /**
   * Right actions to show when swiped left
   */
  rightActions?: SwipeableActionProps[];
  /**
   * Callback when the swipeable is opened
   */
  onSwipeableOpen?: (direction: SwipeDirection) => void;
  /**
   * Callback when the swipeable is closed
   */
  onSwipeableClose?: (direction: SwipeDirection) => void;
  /**
   * Whether to disable the swipeable
   * @default false
   */
  disabled?: boolean;
  /**
   * Whether to allow only one swipeable to be open at a time
   * @default true
   */
  closeOnRowPress?: boolean;
  /**
   * Whether to close the swipeable when another one is opened
   * @default true
   */
  closeOnRowBeginSwipe?: boolean;
  /**
   * Threshold to trigger the swipe action (0-1)
   * @default 0.3
   */
  swipeThreshold?: number;
  /**
   * Friction for the swipe gesture
   * @default 1
   */
  friction?: number;
  /**
   * Style for the swipeable container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Style for the content container
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Test ID for testing
   */
  testID?: string;
}

// Context to manage currently opened swipeable
const SwipeableContext = React.createContext<{
  closeSwipeable: () => void;
  registerSwipeable: (id: string) => void;
  unregisterSwipeable: (id: string) => void;
} | null>(null);

// Provider to manage multiple swipeables
const SwipeableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openedSwipeableId, setOpenedSwipeableId] = useState<string | null>(null);

  const closeSwipeable = useCallback(() => {
    setOpenedSwipeableId(null);
  }, []);

  const registerSwipeable = useCallback((id: string) => {
    setOpenedSwipeableId(id);
  }, []);

  const unregisterSwipeable = useCallback((id: string) => {
    setOpenedSwipeableId((prevId) => (prevId === id ? null : prevId));
  }, []);

  return (
    <SwipeableContext.Provider
      value={{
        closeSwipeable,
        registerSwipeable,
        unregisterSwipeable,
      }}
    >
      {children}
    </SwipeableContext.Provider>
  );
};

// Hook to use the swipeable context
const useSwipeableContext = () => {
  const context = React.useContext(SwipeableContext);
  if (!context) {
    throw new Error('useSwipeableContext must be used within a SwipeableProvider');
  }
  return context;
};

const Swipeable: React.FC<SwipeableProps> & {
  Provider: typeof SwipeableProvider;
} = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeableOpen,
  onSwipeableClose,
  disabled = false,
  closeOnRowPress = true,
  closeOnRowBeginSwipe = true,
  swipeThreshold = SWIPE_THRESHOLD,
  friction = 1,
  style,
  contentContainerStyle,
  testID,
}) => {
  const { colors } = useTheme();
  const { closeSwipeable, registerSwipeable, unregisterSwipeable } = useSwipeableContext();
  const swipeableId = useRef(Date.now().toString()).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwiped, setIsSwiped] = useState(false);
  const swipeDirection = useRef<SwipeDirection | null>(null);
  const isSwiping = useRef(false);
  const initialLeft = useRef(0);
  const initialRight = useRef(0);
  const leftActionWidth = useRef(0);
  const rightActionWidth = useRef(0);

  // Calculate the total width of left and right actions
  useEffect(() => {
    leftActionWidth.current = leftActions.reduce(
      (total, action) => total + (action.width || 80),
      0
    );
    rightActionWidth.current = rightActions.reduce(
      (total, action) => total + (action.width || 80),
      0
    );
  }, [leftActions, rightActions]);

  // Handle layout changes
  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  // Animate the swipeable to a specific position
  const animateTo = useCallback(
    (toValue: number, callback?: () => void) => {
      Animated.spring(translateX, {
        toValue,
        useNativeDriver: true,
        friction,
        tension: 100,
      }).start(({ finished }) => {
        if (finished && callback) {
          callback();
        }
      });
    },
    [translateX, friction]
  );

  // Close the swipeable
  const close = useCallback(() => {
    if (isSwiped) {
      const direction = swipeDirection.current;
      animateTo(0, () => {
        setIsSwiped(false);
        swipeDirection.current = null;
        if (direction && onSwipeableClose) {
          onSwipeableClose(direction);
        }
        unregisterSwipeable(swipeableId);
      });
    }
  }, [animateTo, isSwiped, onSwipeableClose, swipeableId, unregisterSwipeable]);

  // Open the swipeable in a specific direction
  const open = useCallback(
    (direction: SwipeDirection) => {
      if (disabled) return;

      const toValue = direction === 'left' ? -rightActionWidth.current : leftActionWidth.current;
      
      if (onSwipeableOpen) {
        onSwipeableOpen(direction);
      }
      
      animateTo(toValue, () => {
        setIsSwiped(true);
        swipeDirection.current = direction;
        registerSwipeable(swipeableId);
      });
    },
    [animateTo, disabled, onSwipeableOpen, registerSwipeable, swipeableId]
  );

  // Toggle the swipeable
  const toggle = useCallback(
    (direction: SwipeDirection) => {
      if (isSwiped) {
        close();
      } else {
        open(direction);
      }
    },
    [close, isSwiped, open]
  );

  // Handle press on the row
  const handlePress = useCallback(() => {
    if (closeOnRowPress && isSwiped) {
      close();
    }
  }, [close, closeOnRowPress, isSwiped]);

  // Pan responder for handling swipe gestures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only activate if the gesture is mostly horizontal
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 2);
        },
        onPanResponderGrant: () => {
          isSwiping.current = true;
          if (closeOnRowBeginSwipe) {
            closeSwipeable();
          }
          translateX.setOffset(translateX._value);
          translateX.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          const { dx } = gestureState;
          const isSwipingLeft = dx < 0;
          const isSwipingRight = dx > 0;

          // Prevent swiping beyond the action widths
          if (
            (isSwipingLeft && rightActions.length === 0) ||
            (isSwipingRight && leftActions.length === 0)
          ) {
            return;
          }

          // Apply resistance when dragging beyond the action widths
          let newDx = dx;
          if (isSwipingLeft && -dx > rightActionWidth.current) {
            newDx = -rightActionWidth.current + (dx + rightActionWidth.current) * 0.3;
          } else if (isSwipingRight && dx > leftActionWidth.current) {
            newDx = leftActionWidth.current + (dx - leftActionWidth.current) * 0.3;
          }

          translateX.setValue(newDx);
        },
        onPanResponderRelease: (_, gestureState) => {
          isSwiping.current = false;
          const { dx, vx } = gestureState;
          const isSwipingLeft = dx < 0;
          const isSwipingRight = dx > 0;

          // Reset the offset
          translateX.flattenOffset();

          // Check if the swipe was significant enough to trigger an action
          const swipeThresholdPx = containerWidth * swipeThreshold;
          const isFastSwipe = Math.abs(vx) > 0.5;
          const isFarEnough = Math.abs(dx) > swipeThresholdPx;

          if (isFastSwipe || isFarEnough) {
            if (isSwipingLeft) {
              open('left');
            } else if (isSwipingRight) {
              open('right');
            } else {
              close();
            }
          } else {
            close();
          }
        },
        onPanResponderTerminate: () => {
          isSwiping.current = false;
          close();
        },
      }),
    [
      close,
      closeOnRowBeginSwipe,
      closeSwipeable,
      containerWidth,
      disabled,
      leftActions.length,
      open,
      rightActions.length,
      swipeThreshold,
      translateX,
    ]
  );

  // Render action buttons
  const renderActions = (actions: SwipeableActionProps[], direction: 'left' | 'right') => {
    return (
      <View
        style={[
          styles.actionsContainer,
          direction === 'left' ? styles.leftActions : styles.rightActions,
        ]}
      >
        {actions.map((action, index) => {
          const actionWidth = action.width || 80;
          const isLast = index === actions.length - 1;
          
          return (
            <TouchableWithoutFeedback
              key={index}
              onPress={() => {
                action.onPress();
                if (action.closeOnPress !== false) {
                  close();
                }
              }}
              testID={action.testID}
            >
              <View
                style={[
                  styles.action,
                  {
                    width: actionWidth,
                    backgroundColor: action.backgroundColor || colors.background,
                    borderRightWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderRightColor: colors.border,
                  },
                  action.style,
                ]}
              >
                {action.component}
              </View>
            </TouchableWithoutFeedback>
          );
        })}
      </View>
    );
  };

  // Calculate the transform for the content
  const contentTransform = [
    {
      translateX: translateX.interpolate({
        inputRange: [-rightActionWidth.current, 0, leftActionWidth.current],
        outputRange: [
          -rightActionWidth.current,
          0,
          leftActionWidth.current,
        ],
        extrapolate: 'clamp',
      }),
    },
  ];

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <View style={[styles.actionsContainer, styles.leftActions]}>
          {leftActions.map((action, index) => {
            const actionWidth = action.width || 80;
            return (
              <View
                key={`left-${index}`}
                style={[
                  styles.action,
                  {
                    width: actionWidth,
                    backgroundColor: action.backgroundColor || colors.background,
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <View style={[styles.actionsContainer, styles.rightActions]}>
          {rightActions.map((action, index) => {
            const actionWidth = action.width || 80;
            return (
              <View
                key={`right-${index}`}
                style={[
                  styles.action,
                  {
                    width: actionWidth,
                    backgroundColor: action.backgroundColor || colors.background,
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {/* Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          { transform: contentTransform },
          contentContainerStyle,
        ]}
        {...panResponder.panHandlers}
        onLayout={handleLayout}
      >
        <TouchableWithoutFeedback onPress={handlePress}>
          <View style={styles.content}>{children}</View>
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Actual Actions (positioned absolutely) */}
      <View style={styles.absoluteActions} pointerEvents="box-none">
        {leftActions.length > 0 && (
          <Animated.View
            style={[
              styles.actionsAbsolute,
              styles.leftActions,
              {
                opacity: translateX.interpolate({
                  inputRange: [0, leftActionWidth.current * 0.5, leftActionWidth.current],
                  outputRange: [0, 0.5, 1],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            {renderActions(leftActions, 'left')}
          </Animated.View>
        )}

        {rightActions.length > 0 && (
          <Animated.View
            style={[
              styles.actionsAbsolute,
              styles.rightActions,
              {
                opacity: translateX.interpolate({
                  inputRange: [-rightActionWidth.current, -rightActionWidth.current * 0.5, 0],
                  outputRange: [1, 0.5, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            {renderActions(rightActions, 'right')}
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  contentContainer: {
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 0,
  },
  leftActions: {
    left: 0,
  },
  rightActions: {
    right: 0,
  },
  action: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  absoluteActions: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});

// Add Provider as a static property
Swipeable.Provider = SwipeableProvider;

export default Swipeable;
