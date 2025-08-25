import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Easing, StyleProp, ViewStyle, Text } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useTheme } from '../../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface NetworkStatusProps {
  showWhenConnected?: boolean;
  position?: 'top' | 'bottom';
  message?: string;
  onlineMessage?: string;
  offlineMessage?: string;
  animationDuration?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle>;
  onlineBackgroundColor?: string;
  offlineBackgroundColor?: string;
  onlineTextColor?: string;
  offlineTextColor?: string;
  testID?: string;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showWhenConnected = false,
  position = 'top',
  message,
  onlineMessage = 'You are back online',
  offlineMessage = 'No internet connection',
  animationDuration = 300,
  style,
  textStyle,
  iconStyle,
  onlineBackgroundColor,
  offlineBackgroundColor,
  onlineTextColor,
  offlineTextColor,
  testID,
}) => {
  const { colors } = useTheme();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];
  const [prevConnectionStatus, setPrevConnectionStatus] = useState<boolean | null>(true);

  // Default colors from theme
  const defaultOnlineBg = colors.success;
  const defaultOfflineBg = colors.error;
  const defaultOnlineText = colors.white;
  const defaultOfflineText = colors.white;

  // Apply custom colors if provided, otherwise use theme colors
  const backgroundColor = isConnected
    ? onlineBackgroundColor || defaultOnlineBg
    : offlineBackgroundColor || defaultOfflineBg;
  
  const textColor = isConnected
    ? onlineTextColor || defaultOnlineText
    : offlineTextColor || defaultOfflineText;

  // Animation for sliding in/out
  const slideIn = () => {
    setIsVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: animationDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });
  };

  // Handle network state changes
  const handleConnectivityChange = (state: NetInfoState) => {
    const connected = state.isConnected && state.isInternetReachable !== false;
    
    // Only update if connection status has changed
    if (connected !== prevConnectionStatus) {
      setPrevConnectionStatus(connected);
      setIsConnected(connected);
      
      // Show the status bar if:
      // 1. We're offline, or
      // 2. We're online and showWhenConnected is true
      if (!connected || (connected && showWhenConnected)) {
        slideIn();
        
        // Auto-hide after 3 seconds if connected and showWhenConnected is true
        if (connected && showWhenConnected) {
          setTimeout(() => {
            slideOut();
          }, 3000);
        }
      } else {
        slideOut();
      }
    }
  };

  // Set up network status listener
  useEffect(() => {
    // Get initial network state
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    // Clean up listener on unmount
    return () => {
      unsubscribe();
    };
  }, [prevConnectionStatus]);

  // Don't render anything if not visible
  if (!isVisible) return null;

  // Determine the message to display
  const statusMessage = message || (isConnected ? onlineMessage : offlineMessage);
  const iconName = isConnected ? 'wifi' : 'wifi-off';

  // Position styles
  const positionStyle = position === 'top' ? styles.topContainer : styles.bottomContainer;

  return (
    <Animated.View
      style={[
        styles.container,
        positionStyle,
        { backgroundColor, transform: [{ translateY: slideAnim }] },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        <Icon 
          name={iconName} 
          size={20} 
          color={textColor} 
          style={[styles.icon, iconStyle]} 
        />
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {statusMessage}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: 12,
    zIndex: 1000,
    elevation: 1000,
  },
  topContainer: {
    top: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  bottomContainer: {
    bottom: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default NetworkStatus;
