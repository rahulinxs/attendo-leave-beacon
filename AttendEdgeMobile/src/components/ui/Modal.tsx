import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal as RNModal,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Platform,
  StatusBar,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import Text from './Text';
import Icon from 'react-native-vector-icons/Ionicons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ModalAnimationType = 'fade' | 'slide' | 'none';
type ModalPosition = 'center' | 'bottom' | 'top' | 'left' | 'right';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  closeOnBackButtonPress?: boolean;
  animationType?: ModalAnimationType;
  position?: ModalPosition;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<ViewStyle>;
  closeButtonStyle?: StyleProp<ViewStyle>;
  avoidKeyboard?: boolean;
  keyboardVerticalOffset?: number;
  statusBarTranslucent?: boolean;
  transparent?: boolean;
  fullScreen?: boolean;
  scrollable?: boolean;
  maxHeight?: number | string;
  testID?: string;
}

const Modal: React.FC<ModalProps> = ({
  visible = false,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnBackdropPress = true,
  closeOnBackButtonPress = true,
  animationType = 'fade',
  position = 'center',
  style,
  contentContainerStyle,
  headerStyle,
  titleStyle,
  closeButtonStyle,
  avoidKeyboard = false,
  keyboardVerticalOffset = 0,
  statusBarTranslucent = true,
  transparent = true,
  fullScreen = false,
  scrollable = false,
  maxHeight = '90%',
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(false);

  useEffect(() => {
    if (visible) {
      isMounted.current = true;
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (isMounted.current && !visible) {
          isMounted.current = false;
        }
      });
    }

    return () => {
      animatedValue.stopAnimation();
    };
  }, [visible, animatedValue]);

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const handleBackButtonPress = () => {
    if (closeOnBackButtonPress) {
      onClose();
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackButtonPress
      );
      return () => backHandler.remove();
    }
  }, []);

  const getAnimation = () => {
    if (animationType === 'none') return {};

    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });

    const translateX = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });

    switch (position) {
      case 'bottom':
        return {
          opacity: animationType === 'fade' ? opacity : 1,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [SCREEN_HEIGHT, 0],
              }),
            },
          ],
        };
      case 'top':
        return {
          opacity: animationType === 'fade' ? opacity : 1,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-SCREEN_HEIGHT, 0],
              }),
            },
          ],
        };
      case 'left':
        return {
          opacity: animationType === 'fade' ? opacity : 1,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-300, 0],
              }),
            },
          ],
        };
      case 'right':
        return {
          opacity: animationType === 'fade' ? opacity : 1,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
              }),
            },
          ],
        };
      case 'center':
      default:
        return {
          opacity,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        };
    }
  };

  const getPositionStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flex: fullScreen ? 1 : undefined,
      maxHeight: fullScreen ? '100%' : maxHeight,
      width: fullScreen ? '100%' : '90%',
      maxWidth: 500,
      backgroundColor: theme.colors.background,
      borderRadius: fullScreen ? 0 : theme.borderRadius.xl,
      overflow: 'hidden',
    };

    switch (position) {
      case 'bottom':
        return {
          ...baseStyle,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderTopLeftRadius: theme.borderRadius.xl,
          borderTopRightRadius: theme.borderRadius.xl,
          width: '100%',
          maxWidth: '100%',
        };
      case 'top':
        return {
          ...baseStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: theme.borderRadius.xl,
          borderBottomRightRadius: theme.borderRadius.xl,
          width: '100%',
          maxWidth: '100%',
        };
      case 'left':
        return {
          ...baseStyle,
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: theme.borderRadius.xl,
          borderBottomRightRadius: theme.borderRadius.xl,
          height: '100%',
          maxHeight: '100%',
        };
      case 'right':
        return {
          ...baseStyle,
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderTopLeftRadius: theme.borderRadius.xl,
          borderBottomLeftRadius: theme.borderRadius.xl,
          height: '100%',
          maxHeight: '100%',
        };
      case 'center':
      default:
        return {
          ...baseStyle,
          alignSelf: 'center',
          margin: theme.spacing.xl,
        };
    }
  };

  const renderHeader = () => {
    if (!title && !showCloseButton) return null;

    return (
      <View style={[styles.header, headerStyle]}>
        <View style={styles.titleContainer}>
          {title && (
            <Text variant="h6" style={[styles.title, titleStyle]}>
              {title}
            </Text>
          )}
        </View>
        {showCloseButton && (
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, closeButtonStyle]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContent = () => {
    const content = (
      <View style={[styles.content, contentContainerStyle]}>
        {children}
      </View>
    );

    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      );
    }

    return content;
  };

  if (!visible && !isMounted.current) return null;

  return (
    <RNModal
      visible={visible}
      transparent={transparent}
      animationType="none"
      statusBarTranslucent={statusBarTranslucent}
      onRequestClose={handleBackButtonPress}
      testID={testID}
    >
      <StatusBar
        translucent={statusBarTranslucent}
        backgroundColor={transparent ? 'transparent' : theme.colors.background}
        barStyle="dark-content"
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={avoidKeyboard}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.container,
            getPositionStyle(),
            style,
            getAnimation(),
          ]}
        >
          {renderHeader()}
          {renderContent()}
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  titleContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  closeButton: {
    padding: theme.spacing.xs,
    margin: -theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});

export default Modal;
