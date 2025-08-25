import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  StyleProp,
  ViewStyle,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
  ScrollView,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_HEADER_HEIGHT = 56;
const DEFAULT_SNAP_POINTS = [0.5, 0.85]; // Default snap points as fractions of screen height

type SnapPoint = number | string; // Can be a fraction (0-1) or pixel value

export interface BottomSheetProps {
  /**
   * Whether the bottom sheet is visible
   * @default false
   */
  visible?: boolean;
  /**
   * Callback when the bottom sheet is closed
   */
  onClose?: () => void;
  /**
   * Whether to show the handle
   * @default true
   */
  showHandle?: boolean;
  /**
   * Whether to close the bottom sheet when the backdrop is pressed
   * @default true
   */
  closeOnBackdropPress?: boolean;
  /**
   * Whether to close the bottom sheet when the back button is pressed (Android)
   * @default true
   */
  closeOnBackButtonPress?: boolean;
  /**
   * Whether to enable pan down to close gesture
   * @default true
   */
  enablePanDownToClose?: boolean;
  /**
   * Whether to enable keyboard handling
   * @default true
   */
  enableKeyboardHandling?: boolean;
  /**
   * The height of the header
   * @default 56
   */
  headerHeight?: number;
  /**
   * The initial snap point index
   * @default 0
   */
  initialSnapIndex?: number;
  /**
   * The snap points as an array of fractions (0-1) or pixel values
   * @example [0.3, 0.6, 0.9] or [200, 400, '100%']
   */
  snapPoints?: SnapPoint[];
  /**
   * The background color of the bottom sheet
   */
  backgroundColor?: string;
  /**
   * The background color of the backdrop
   * @default 'rgba(0, 0, 0, 0.5)'
   */
  backdropColor?: string;
  /**
   * Whether to show a blur effect on the backdrop (iOS only)
   * @default false
   */
  backdropBlur?: boolean;
  /**
   * The blur type for the backdrop (iOS only)
   * @default 'dark'
   */
  blurType?: 'light' | 'dark' | 'xlight' | 'dark' | 'default' | 'extraDark' | 'regular' | 'prominent' | 'transparent';
  /**
   * The blur amount for the backdrop (0-100, iOS only)
   * @default 10
   */
  blurAmount?: number;
  /**
   * The border radius of the bottom sheet
   * @default 20
   */
  borderRadius?: number;
  /**
   * The animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;
  /**
   * The header component to render
   */
  header?: React.ReactNode;
  /**
   * The footer component to render
   */
  footer?: React.ReactNode;
  /**
   * Custom style for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Custom style for the content container
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Custom style for the header container
   */
  headerContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Custom style for the footer container
   */
  footerContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Callback when the bottom sheet is opened
   */
  onOpen?: () => void;
  /**
   * Callback when the bottom sheet is closed
   */
  onCloseComplete?: () => void;
  /**
   * Callback when the snap point changes
   */
  onSnapToIndex?: (index: number) => void;
  /**
   * Test ID for testing
   */
  testID?: string;
  /**
   * Children to render inside the bottom sheet
   */
  children?: React.ReactNode;
}

export interface BottomSheetHandle {
  /**
   * Open the bottom sheet
   */
  open: () => void;
  /**
   * Close the bottom sheet
   */
  close: () => void;
  /**
   * Snap to a specific index
   */
  snapToIndex: (index: number) => void;
  /**
   * Get the current snap point index
   */
  getCurrentIndex: () => number;
}

const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(
  (
    {
      visible = false,
      onClose,
      showHandle = true,
      closeOnBackdropPress = true,
      closeOnBackButtonPress = true,
      enablePanDownToClose = true,
      enableKeyboardHandling = true,
      headerHeight = DEFAULT_HEADER_HEIGHT,
      initialSnapIndex = 0,
      snapPoints: customSnapPoints = DEFAULT_SNAP_POINTS,
      backgroundColor,
      backdropColor = 'rgba(0, 0, 0, 0.5)',
      backdropBlur = false,
      blurType = 'dark',
      blurAmount = 10,
      borderRadius = 20,
      animationDuration = 300,
      header,
      footer,
      style,
      contentContainerStyle,
      headerContainerStyle,
      footerContainerStyle,
      onOpen,
      onCloseComplete,
      onSnapToIndex,
      testID,
      children,
    },
    ref
  ) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [isVisible, setIsVisible] = useState(visible);
    const [contentHeight, setContentHeight] = useState(0);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(initialSnapIndex);
    const panY = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const containerRef = useRef<View>(null);
    const panResponder = useRef<PanResponder | null>(null);

    // Process snap points
    const snapPoints = useMemo(() => {
      return customSnapPoints.map(point => {
        if (typeof point === 'string' && point.endsWith('%')) {
          const percent = parseFloat(point) / 100;
          return SCREEN_HEIGHT * Math.min(Math.max(percent, 0), 1);
        }
        if (typeof point === 'number' && point <= 1) {
          return SCREEN_HEIGHT * Math.min(Math.max(point, 0), 1);
        }
        return Math.min(Number(point), SCREEN_HEIGHT);
      }).sort((a, b) => a - b); // Sort in ascending order
    }, [customSnapPoints]);

    // Calculate the max and min translateY values
    const maxTranslateY = useMemo(() => {
      return SCREEN_HEIGHT - snapPoints[0];
    }, [snapPoints]);

    const minTranslateY = useMemo(() => {
      return SCREEN_HEIGHT - snapPoints[snapPoints.length - 1];
    }, [snapPoints]);

    // Initialize pan responder
    useEffect(() => {
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to vertical swipes
          const { dy } = gestureState;
          return Math.abs(dy) > 5;
        },
        onPanResponderMove: (_, gestureState) => {
          const { dy } = gestureState;
          
          // Prevent dragging above the max translateY
          const newTranslateY = Math.max(
            minTranslateY,
            Math.min(maxTranslateY, translateY._value + dy)
          );
          
          // Update the animated value
          translateY.setValue(newTranslateY);
          
          // Update the pan responder's state
          panY.setValue(dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          const { dy, vy } = gestureState;
          
          // Calculate the closest snap point
          const currentPosition = SCREEN_HEIGHT - translateY._value;
          let closestSnapPoint = snapPoints[0];
          let smallestDiff = Infinity;
          
          snapPoints.forEach(point => {
            const diff = Math.abs(point - currentPosition);
            if (diff < smallestDiff) {
              smallestDiff = diff;
              closestSnapPoint = point;
            }
          });
          
          // If swiping down fast, close the bottom sheet if enabled
          if (enablePanDownToClose && (dy > 0 && vy > 0.5)) {
            close();
            return;
          }
          
          // Snap to the closest point
          const snapToY = SCREEN_HEIGHT - closestSnapPoint;
          const snapIndex = snapPoints.indexOf(closestSnapPoint);
          
          Animated.spring(translateY, {
            toValue: snapToY,
            useNativeDriver: true,
            bounciness: 0,
          }).start(() => {
            setCurrentIndex(snapIndex);
            if (onSnapToIndex) {
              onSnapToIndex(snapIndex);
            }
          });
          
          // Reset the panY value
          panY.setValue(0);
        },
      });
    }, [enablePanDownToClose, maxTranslateY, minTranslateY, onSnapToIndex, panY, snapPoints, translateY]);

    // Handle visibility changes
    useEffect(() => {
      if (visible) {
        open();
      } else {
        close();
      }
    }, [visible]);

    // Handle back button press (Android)
    useEffect(() => {
      if (!closeOnBackButtonPress || !isVisible) return;
      
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress
      );
      
      return () => backHandler.remove();
    }, [closeOnBackButtonPress, isVisible, onClose]);

    // Handle keyboard events
    useEffect(() => {
      if (!enableKeyboardHandling) return;
      
      const keyboardDidShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        handleKeyboardShow
      );
      
      const keyboardDidHideListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        handleKeyboardHide
      );
      
      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }, [enableKeyboardHandling]);

    // Handle back button press
    const handleBackPress = () => {
      if (onClose) {
        onClose();
        return true;
      }
      return false;
    };

    // Handle keyboard show
    const handleKeyboardShow = (e: any) => {
      const { height } = e.endCoordinates;
      setKeyboardHeight(height);
      
      // Adjust the bottom sheet position when keyboard appears
      if (currentIndex < snapPoints.length - 1) {
        snapToIndex(snapPoints.length - 1);
      }
    };

    // Handle keyboard hide
    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    // Open the bottom sheet
    const open = useCallback(() => {
      setIsVisible(true);
      
      // Reset the animated values
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      
      // Animate in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT - snapPoints[initialSnapIndex],
          duration: animationDuration,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(initialSnapIndex);
        if (onOpen) {
          onOpen();
        }
      });
    }, [
      animationDuration,
      backdropOpacity,
      initialSnapIndex,
      onOpen,
      snapPoints,
      translateY,
    ]);

    // Close the bottom sheet
    const close = useCallback(() => {
      // Animate out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: animationDuration,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
        if (onCloseComplete) {
          onCloseComplete();
        }
      });
      
      if (onClose) {
        onClose();
      }
    }, [
      animationDuration,
      backdropOpacity,
      onClose,
      onCloseComplete,
      translateY,
    ]);

    // Snap to a specific index
    const snapToIndex = useCallback(
      (index: number) => {
        if (index < 0 || index >= snapPoints.length) {
          console.warn(`Invalid snap index: ${index}. Must be between 0 and ${snapPoints.length - 1}`);
          return;
        }
        
        const snapToY = SCREEN_HEIGHT - snapPoints[index];
        
        Animated.spring(translateY, {
          toValue: snapToY,
          useNativeDriver: true,
          bounciness: 0,
        }).start(() => {
          setCurrentIndex(index);
          if (onSnapToIndex) {
            onSnapToIndex(index);
          }
        });
      },
      [onSnapToIndex, snapPoints, translateY]
    );

    // Get the current snap point index
    const getCurrentIndex = useCallback(() => {
      return currentIndex;
    }, [currentIndex]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      open,
      close,
      snapToIndex,
      getCurrentIndex,
    }));

    // Handle backdrop press
    const handleBackdropPress = () => {
      if (closeOnBackdropPress) {
        close();
      }
    };

    // Handle content layout
    const handleContentLayout = (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      setContentHeight(height);
    };

    // Don't render if not visible
    if (!isVisible) {
      return null;
    }

    // Calculate the bottom sheet height based on the current translateY
    const sheetHeight = SCREEN_HEIGHT - minTranslateY;
    
    // Calculate the dynamic padding bottom to account for keyboard and safe area
    const dynamicPaddingBottom = Math.max(
      insets.bottom,
      keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0
    );

    return (
      <View
        style={[StyleSheet.absoluteFill, styles.container]}
        pointerEvents="box-none"
        testID={testID}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
                backgroundColor: backdropColor,
              },
            ]}
          >
            {backdropBlur && Platform.OS === 'ios' && (
              <BlurView
                style={styles.blurView}
                blurType={blurType as any}
                blurAmount={blurAmount}
                reducedTransparencyFallbackColor={backdropColor}
              />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Bottom Sheet */}
        <Animated.View
          ref={containerRef}
          style={[
            styles.sheet,
            {
              backgroundColor: backgroundColor || colors.background,
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
              paddingBottom: dynamicPaddingBottom,
              transform: [{ translateY }],
              maxHeight: sheetHeight,
            },
            style,
          ]}
          {...(panResponder.current?.panHandlers || {})}
        >
          {/* Handle */}
          {showHandle && (
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>
          )}

          {/* Header */}
          {header && (
            <View
              style={[
                styles.headerContainer,
                { height: headerHeight },
                headerContainerStyle,
              ]}
            >
              {header}
            </View>
          )}

          {/* Content */}
          <View
            style={[
              styles.contentContainer,
              { flex: 1 },
              contentContainerStyle,
            ]}
            onLayout={handleContentLayout}
          >
            {children}
          </View>

          {/* Footer */}
          {footer && (
            <View
              style={[
                styles.footerContainer,
                { paddingBottom: insets.bottom },
                footerContainerStyle,
              ]}
            >
              {footer}
            </View>
          )}
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    overflow: 'hidden',
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerContainer: {
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  contentContainer: {
    width: '100%',
  },
  footerContainer: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default BottomSheet;
